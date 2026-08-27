#!/usr/bin/env node
/**
 * Measures the JavaScript a modern browser actually downloads on first paint.
 *
 * Next.js 16 dropped the "First Load JS" table from `next build`, so this is
 * our size signal. It parses the exported HTML rather than guessing from the
 * chunk directory, because only the scripts referenced by the page count --
 * lazily-imported chunks (notably the ~1.5 MB PDF engine) sit on disk but must
 * never appear here.
 *
 * It also proves that specific heavy modules are absent from those scripts.
 * See FORBIDDEN_MODULES.
 *
 * Usage:
 *   node scripts/measure-first-paint.mjs [outDir] [pageHtml]
 *   node scripts/measure-first-paint.mjs --budget=145   # fail above 145 KB gzip
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const positional = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const outDir = resolve(positional[0] ?? 'out');
const pageHtml = join(outDir, positional[1] ?? 'index.html');

/**
 * A ceiling, in KB gzip, for the JavaScript a first paint downloads.
 *
 * Bundle growth is never one bad commit; it is fifty reasonable ones. Without
 * a number in CI the only signal is someone happening to read this table, and
 * the whole point of the lazy PDF import is undone by a slow drift nobody
 * measured.
 */
const budgetArg = process.argv.find((arg) => arg.startsWith('--budget='));
const budgetKb = budgetArg ? Number(budgetArg.split('=')[1]) : null;

/**
 * Modules that must never reach first paint, each identified by a string
 * literal from its own source. Literals are used because they survive
 * minification intact, where identifiers and file paths do not.
 *
 * The gzip budget alone does not cover this. The PDF engine is 1.5 MB and
 * would blow any budget the moment it regressed, but the QR encoder is ~10 KB
 * minified -- small enough to slip under the ceiling and sit there unnoticed
 * on every page load, for a feature most visitors never touch. This makes that
 * specific regression loud instead of quiet.
 */
const FORBIDDEN_MODULES = [
  {
    // uqr's alphanumeric-mode charset table, on the encode path.
    marker: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:',
    name: 'the QR encoder (uqr)',
    fix: 'Reach src/utils/qr through `await import(...)`, or use the useQrCode hook.',
  },
  {
    // fontkit's error text, pulled in by @react-pdf via pdfkit.
    marker: 'Unknown font format',
    name: 'the PDF engine (fontkit)',
    fix: 'Reach the engine through `await import("./InvoicePdfRenderer")`.',
  },
];

if (!existsSync(pageHtml)) {
  console.error(`No export found at ${pageHtml}. Run \`npm run build\` first.`);
  process.exit(1);
}

const html = readFileSync(pageHtml, 'utf8');

// Scripts a modern browser skips. `nomodule` is the legacy polyfill bundle.
const scriptTags = html.match(/<script\b[^>]*>/g) ?? [];
const modernSrcs = [];
const skippedSrcs = [];
for (const tag of scriptTags) {
  const src = tag.match(/\ssrc="([^"]+)"/)?.[1];
  if (!src || !src.startsWith('/')) continue;
  (/\bnomodule\b/i.test(tag) ? skippedSrcs : modernSrcs).push(src);
}

const measure = (srcs) =>
  srcs.map((src) => {
    const file = join(outDir, src.replace(/^\//, '').split('?')[0]);
    if (!existsSync(file)) return { src, raw: 0, gzip: 0, missing: true };
    const buf = readFileSync(file);
    return { src, raw: buf.length, gzip: gzipSync(buf).length };
  });

const modern = measure(modernSrcs).sort((a, b) => b.raw - a.raw);
const skipped = measure(skippedSrcs);

const sum = (rows, k) => rows.reduce((n, r) => n + r[k], 0);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const cssHrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
const css = measure(cssHrefs.filter((h) => h.startsWith('/')));

console.log(`\nFirst-paint JS for ${pageHtml.replace(outDir, 'out')}\n`);
console.log('  ' + 'chunk'.padEnd(52) + 'raw'.padStart(12) + 'gzip'.padStart(12));
console.log('  ' + '-'.repeat(76));
for (const r of modern) {
  const name = r.src.replace('/_next/static/', '').padEnd(52);
  console.log(`  ${name}${kb(r.raw).padStart(12)}${kb(r.gzip).padStart(12)}${r.missing ? '  MISSING' : ''}`);
}
console.log('  ' + '-'.repeat(76));
console.log(
  '  ' + `TOTAL (${modern.length} chunks)`.padEnd(52) +
  kb(sum(modern, 'raw')).padStart(12) + kb(sum(modern, 'gzip')).padStart(12),
);
if (css.length) {
  console.log('  ' + 'CSS'.padEnd(52) + kb(sum(css, 'raw')).padStart(12) + kb(sum(css, 'gzip')).padStart(12));
}
if (skipped.length) {
  console.log('  ' + `(nomodule, legacy only)`.padEnd(52) + kb(sum(skipped, 'raw')).padStart(12) + kb(sum(skipped, 'gzip')).padStart(12));
}

// The PDF engine must exist on disk but must NOT be referenced by the HTML.
// This is the guard that keeps a stray static import from silently re-adding
// ~1.5 MB to every page load.
const referenced = new Set(modernSrcs);
let pdfChunkBytes = 0;
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith('.js') && statSync(p).size > 150_000) {
      const url = '/' + p.slice(outDir.length + 1);
      if (!referenced.has(url)) pdfChunkBytes += statSync(p).size;
    }
  }
};
try {
  walk(join(outDir, '_next', 'static'));
  if (pdfChunkBytes) {
    console.log(`\n  Lazy chunks on disk but not referenced: ${kb(pdfChunkBytes)} (good -- these load on demand)`);
  }
} catch {
  /* directory layout differs; the totals above are the signal that matters */
}

// Grep the scripts the page actually references. Checking index.html itself
// would prove nothing: it contains <script src> URLs, not module code.
const violations = [];
for (const src of modernSrcs) {
  const file = join(outDir, src.replace(/^\//, '').split('?')[0]);
  if (!existsSync(file)) continue;
  const code = readFileSync(file, 'utf8');
  for (const { marker, name, fix } of FORBIDDEN_MODULES) {
    if (code.includes(marker)) violations.push({ src, name, fix });
  }
}

if (violations.length) {
  console.error('');
  for (const { src, name, fix } of violations) {
    console.error(`::error::${name} is in ${src}, which first paint downloads. ${fix}`);
  }
  process.exit(1);
}
console.log(`  No forbidden modules in the ${modernSrcs.length} first-paint scripts.`);

if (budgetKb !== null) {
  const totalKb = sum(modern, 'gzip') / 1024;
  if (!Number.isFinite(budgetKb)) {
    console.error(`::error::--budget needs a number, got "${budgetArg}"`);
    process.exit(1);
  }
  if (totalKb > budgetKb) {
    console.error(
      `::error::first-paint JS is ${totalKb.toFixed(1)} KB gzip, over the ${budgetKb} KB budget. ` +
        'Either make the addition lazy, or raise the budget deliberately in the workflow.',
    );
    process.exit(1);
  }
  console.log(`  Within budget: ${totalKb.toFixed(1)} KB / ${budgetKb} KB gzip\n`);
}
console.log('');
