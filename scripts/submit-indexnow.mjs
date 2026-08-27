#!/usr/bin/env node
/**
 * Tells Bing (and Yandex, Seznam, Naver) that the site changed, instead of
 * waiting to be crawled.
 *
 * Worth the moving part for one reason beyond Bing itself: ChatGPT's search is
 * Bing-backed, so how quickly a page enters that index is how quickly it can be
 * cited by an assistant -- which is a real acquisition channel for "best free
 * invoice generator, no signup" and one this project is otherwise well set up
 * for (see public/llms.txt). Google does not participate in IndexNow; nothing
 * here substitutes for Search Console.
 *
 * Ownership is proved by hosting the key at a public URL on the same host --
 * that is the whole protocol, there is nothing to register and no account. So
 * KEY below is deliberately committed and deliberately public. It is not a
 * credential: possessing it lets you tell Bing that invoice.dewiride.com
 * changed, and nothing else.
 *
 * The URLs come from the generated sitemap, so a page cannot be exported,
 * listed and then silently left out of this. Every URL is submitted on each
 * deploy rather than only the changed ones: the export carries no record of
 * the previous build to diff against, and at a dozen pages the distinction
 * costs Bing nothing. If this ever grows to a few hundred pages, narrow it to
 * the routes whose sources changed in the pushed range.
 *
 * Usage:
 *   node scripts/submit-indexnow.mjs              # submit out/sitemap.xml
 *   node scripts/submit-indexnow.mjs --dry-run    # print the payload, send nothing
 *   node scripts/submit-indexnow.mjs path/to/out
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const KEY = '65765648a421a8fcb1522ff0a0998507';
const SITE_URL = 'https://invoice.dewiride.com';
const HOST = new URL(SITE_URL).host;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const dryRun = process.argv.includes('--dry-run');
const outDir = resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'out');

/**
 * A submission with an unreachable key file is rejected with a 403, which in a
 * post-deploy step means a red X on an otherwise successful release. Checking
 * that the file is in the export is the difference between failing here, with
 * the fix in the message, and failing at the API with a status code.
 */
const keyFile = join(outDir, `${KEY}.txt`);
if (!existsSync(keyFile)) {
  console.error(
    `::error::${KEY}.txt is not in the export. IndexNow proves ownership by ` +
      `fetching ${SITE_URL}/${KEY}.txt, so the file must live in public/ and ` +
      `contain exactly the key.`,
  );
  process.exit(1);
}
if (readFileSync(keyFile, 'utf8').trim() !== KEY) {
  console.error(`::error::public/${KEY}.txt does not contain the key this script submits.`);
  process.exit(1);
}

const sitemap = join(outDir, 'sitemap.xml');
if (!existsSync(sitemap)) {
  console.error('::error::no sitemap.xml in the export. Run `npm run build` first.');
  process.exit(1);
}

const urlList = [...readFileSync(sitemap, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1])
  // Every URL in one submission must belong to the declared host, or the whole
  // batch is rejected as 422 rather than partially accepted.
  .filter((url) => {
    try {
      return new URL(url).host === HOST;
    } catch {
      return false;
    }
  });

if (urlList.length === 0) {
  console.error('::error::sitemap.xml listed no URLs for this host. Refusing to submit nothing.');
  process.exit(1);
}

const payload = { host: HOST, key: KEY, keyLocation: `${SITE_URL}/${KEY}.txt`, urlList };

console.log(`IndexNow: ${urlList.length} URLs for ${HOST}`);
for (const url of urlList) console.log(`  ${url}`);

if (dryRun) {
  console.log('\n--dry-run: nothing was sent.');
  process.exit(0);
}

/**
 * Never fails the workflow. This runs after the deploy has already succeeded,
 * so the site is live either way; a search engine being slow to hear about it
 * is not a reason to mark the release broken. Every outcome is logged as a
 * warning so it is still visible in the run summary.
 */
const warn = (message) => {
  console.log(`::warning::IndexNow: ${message}`);
  process.exit(0);
};

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15_000);

try {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });

  // 200 accepted, 202 accepted but the key is still being validated -- both
  // mean the submission landed. The rest are documented failures worth naming,
  // because "IndexNow returned 403" on its own sends the next person reading
  // this log to the wrong place.
  const explain =
    {
      400: 'bad request -- the payload shape is wrong',
      403: `key rejected -- ${SITE_URL}/${KEY}.txt was not reachable or did not match`,
      422: 'a URL did not belong to the declared host, or the key does not match the host',
      429: 'rate limited -- too many submissions',
    }[response.status] ?? `unexpected status ${response.status}`;

  if (response.status === 200 || response.status === 202) {
    console.log(`\nSubmitted: HTTP ${response.status}.`);
  } else {
    warn(explain);
  }
} catch (error) {
  warn(error.name === 'AbortError' ? 'the endpoint did not respond within 15s' : String(error));
} finally {
  clearTimeout(timeout);
}
