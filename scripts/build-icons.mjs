#!/usr/bin/env node
/**
 * Rasterises every PNG icon from public/logo.svg.
 *
 * The favicons, apple-touch-icon and PWA icons previously carried the old mark
 * and were maintained by hand, so they drifted from the logo. Generating them
 * keeps one source of truth.
 *
 * Run `npm run build:icons` after a brand change. Output is committed so
 * neither the app build nor CI needs a browser.
 */
import { chromium } from '@playwright/test';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const svg = readFileSync(join(publicDir, 'logo.svg'), 'utf8');

/**
 * `padded` renders the mark on its own brand-blue field with the glyph inset,
 * which is what maskable PWA icons need: Android crops them to a circle or
 * squircle, and anything in the outer 10% can be clipped away.
 */
const TARGETS = [
  { file: 'favicon-16x16.png', size: 16 },
  { file: 'favicon-32x32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180, padded: true },
  { file: 'android-chrome-192x192.png', size: 192, padded: true },
  { file: 'android-chrome-512x512.png', size: 512, padded: true },
  // Raster copy of the mark for JSON-LD ImageObject and og:logo -- crawlers
  // want a bitmap there, not an SVG.
  { file: 'logo.png', size: 512, padded: true },
  // Sources for the multi-resolution favicon.ico assembled below.
  { file: '.ico-16.png', size: 16, padded: true },
  { file: '.ico-32.png', size: 32, padded: true },
  { file: '.ico-48.png', size: 48, padded: true },
];

const browser = await chromium.launch();

for (const { file, size, padded } of TARGETS) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });

  await page.setContent(
    `<body style="margin:0;width:${size}px;height:${size}px;${
      padded ? 'background:#2563eb;display:grid;place-items:center' : ''
    }">
       <div style="width:${padded ? Math.round(size * 0.66) : size}px;
                   height:${padded ? Math.round(size * 0.66) : size}px">${
                     padded ? svg.replace(/<rect[^>]*\/>/, '') : svg
                   }</div>
     </body>`,
  );

  const buffer = await page.screenshot({ type: 'png', omitBackground: !padded });
  writeFileSync(join(publicDir, file), buffer);
  console.log(`  ${file.padEnd(28)} ${size}x${size}  ${(buffer.length / 1024).toFixed(1)} KB`);
  await page.close();
}

await browser.close();

/**
 * Assemble favicon.ico by hand.
 *
 * An .ico is just a small header plus a directory of embedded images, and
 * Windows/Chrome accept PNG payloads, so the three renders above can be packed
 * directly. Doing it here means the .ico cannot drift from the SVG -- the old
 * one still carried the previous mark.
 */
{
  const entries = [16, 32, 48].map((size) => ({
    size,
    data: readFileSync(join(publicDir, `.ico-${size}.png`)),
  }));

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const directory = [];
  for (const { size, data } of entries) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width  (0 means 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    directory.push(entry);
    offset += data.length;
  }

  writeFileSync(
    join(publicDir, 'favicon.ico'),
    Buffer.concat([header, ...directory, ...entries.map((e) => e.data)]),
  );
  for (const { size } of entries) unlinkSync(join(publicDir, `.ico-${size}.png`));
  console.log(`  favicon.ico                  16/32/48 multi-resolution`);
}

console.log('');
