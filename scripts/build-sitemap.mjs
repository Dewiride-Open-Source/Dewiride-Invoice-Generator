#!/usr/bin/env node
/**
 * Generates sitemap.xml from the export that was actually produced.
 *
 * The previous sitemap was hand-written in public/ with three URLs and a
 * hardcoded lastmod. That works exactly until someone adds a page, which is
 * the point of the content work this script exists to support -- a sitemap
 * that has to be remembered is a sitemap that goes stale.
 *
 * Routes are read from out/ rather than from a route table, because out/ is
 * what ships. A page that failed to export cannot be listed, and a page that
 * exported cannot be forgotten.
 *
 * `lastmod` is the date of the last commit, not the build clock. Rebuilding
 * the same commit twice must not claim every page changed, or the signal
 * degrades into noise and crawlers learn to ignore it.
 *
 * Usage:
 *   node scripts/build-sitemap.mjs            # write out/sitemap.xml
 *   node scripts/build-sitemap.mjs --check    # verify it matches the export
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const SITE_URL = 'https://invoice.dewiride.com';
const outDir = resolve(process.argv.find((a) => !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1]) ?? 'out');
const check = process.argv.includes('--check');

/**
 * Routes that are not the product. Everything else defaults to 0.8/monthly,
 * so a new landing page is listed correctly without touching this file.
 */
const OVERRIDES = {
  '/': { priority: '1.0', changefreq: 'weekly' },
  // The two pages the India-first content is actually aimed at.
  '/gst-invoice-generator/': { priority: '0.9', changefreq: 'weekly' },
  '/gst-invoice-format/': { priority: '0.9', changefreq: 'monthly' },
  '/about/': { priority: '0.5', changefreq: 'yearly' },
  '/privacy/': { priority: '0.3', changefreq: 'yearly' },
  '/terms/': { priority: '0.3', changefreq: 'yearly' },
};

/** Exported paths that must never be advertised to a crawler. */
const EXCLUDED = new Set(['/404/']);

if (!existsSync(outDir)) {
  console.error(`No export found at ${outDir}. Run \`next build\` first.`);
  process.exit(1);
}

/**
 * Every index.html under out/ is one route. `trailingSlash: true` in
 * next.config.ts is why they are all directories with an index.html rather
 * than sibling .html files -- and why every URL below ends in a slash.
 */
function collectRoutes(dir, routes = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // _next holds build output, not pages.
    if (entry.isDirectory() && entry.name !== '_next') {
      collectRoutes(join(dir, entry.name), routes);
    } else if (entry.isFile() && entry.name === 'index.html') {
      const rel = relative(outDir, dir).split(sep).filter(Boolean).join('/');
      routes.push(rel ? `/${rel}/` : '/');
    }
  }
  return routes;
}

/**
 * The commit date, so an unchanged commit rebuilt tomorrow keeps today's
 * lastmod. Falls back to the build date outside a git checkout (a CI export
 * from a tarball, say), which is the best available answer there.
 */
function lastModified() {
  if (process.env.SOURCE_DATE_EPOCH) {
    return new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString().slice(0, 10);
  }
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

const escape = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const routes = collectRoutes(outDir)
  .filter((route) => !EXCLUDED.has(route))
  .sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));

if (routes.length === 0) {
  console.error('No routes found in the export. Refusing to write an empty sitemap.');
  process.exit(1);
}

const lastmod = lastModified();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map((route) => {
    const { priority = '0.8', changefreq = 'monthly' } = OVERRIDES[route] ?? {};
    return [
      '  <url>',
      `    <loc>${escape(SITE_URL + route)}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      '  </url>',
    ].join('\n');
  })
  .join('\n')}
</urlset>
`;

const target = join(outDir, 'sitemap.xml');

if (check) {
  if (!existsSync(target)) {
    console.error('::error::sitemap.xml is missing from the export');
    process.exit(1);
  }
  const listed = new Set([...readFileSync(target, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  const missing = routes.filter((route) => !listed.has(SITE_URL + route));
  const extra = [...listed].filter((loc) => !routes.includes(loc.replace(SITE_URL, '')));

  if (missing.length || extra.length) {
    for (const route of missing) console.error(`::error::exported but not in sitemap: ${route}`);
    for (const loc of extra) console.error(`::error::in sitemap but not exported: ${loc}`);
    process.exit(1);
  }
  console.log(`sitemap.xml lists all ${routes.length} exported routes.`);
} else {
  writeFileSync(target, xml);
  console.log(`sitemap.xml -> ${routes.length} routes, lastmod ${lastmod}`);
  for (const route of routes) console.log(`  ${route}`);
}
