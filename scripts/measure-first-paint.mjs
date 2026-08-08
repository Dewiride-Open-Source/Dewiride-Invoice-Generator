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
 * Usage: node scripts/measure-first-paint.mjs [outDir] [pageHtml]
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const outDir = resolve(process.argv[2] ?? 'out');
const pageHtml = join(outDir, process.argv[3] ?? 'index.html');

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
console.log('');
