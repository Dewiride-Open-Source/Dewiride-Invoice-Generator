#!/usr/bin/env node
/**
 * Renders public/og-image.png, the 1200x630 card used for social previews.
 *
 * This asset was referenced from six places -- og:image, twitter:image, two
 * JSON-LD blocks and the web manifest -- but never actually existed. Azure's
 * navigationFallback answered the 404 with the HTML of the 404 page, so the URL
 * returned HTTP 200 with content-type text/html and every share preview was
 * silently broken. (The fallback is now a proper responseOverrides 404.)
 *
 * Generated from markup rather than hand-drawn so it stays in step with the
 * design tokens. Run `npm run build:og` after a brand change; the PNG is
 * committed, so neither the app build nor CI needs a browser.
 */
import { chromium } from '@playwright/test';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const logo = readFileSync(join(root, 'public', 'logo.svg')).toString('base64');

const html = `<!doctype html>
<html>
<head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    font-family: Inter, -apple-system, system-ui, sans-serif;
    background: #f1f5f9;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 64px 72px;
    position: relative; overflow: hidden;
  }
  body::after {
    content: ''; position: absolute; right: -180px; top: -180px;
    width: 620px; height: 620px; border-radius: 50%;
    background: radial-gradient(circle, rgba(37,99,235,.14), rgba(37,99,235,0) 70%);
  }
  .brand { display: flex; align-items: center; gap: 14px; }
  .brand img { width: 44px; height: 44px; }
  .brand span { font-size: 26px; font-weight: 600; color: #0f172a; letter-spacing: -.01em; }
  .brand span em { font-style: normal; color: #51607a; }
  h1 {
    font-size: 76px; line-height: 1.03; font-weight: 800;
    color: #0f172a; letter-spacing: -.035em; max-width: 720px;
  }
  h1 b { color: #1d4ed8; font-weight: 800; }
  p { margin-top: 22px; font-size: 27px; line-height: 1.4; color: #51607a; max-width: 660px; }
  .row { display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; }
  ul { display: flex; gap: 12px; list-style: none; flex-wrap: wrap; }
  li {
    font-size: 19px; font-weight: 500; color: #1d4ed8;
    background: #eff6ff; border: 1px solid #dbeafe;
    padding: 9px 17px; border-radius: 999px;
  }
  .url { font-size: 23px; font-weight: 600; color: #0f172a; }
  .sheet {
    position: absolute; right: 64px; bottom: 92px; width: 336px;
    background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
    box-shadow: 0 30px 60px -25px rgba(15,23,42,.4); padding: 22px; z-index: 2;
  }
  .sheet .top { display:flex; justify-content:space-between; align-items:flex-start;
    border-bottom: 2px solid #2563eb; padding-bottom: 12px; }
  .sheet .top strong { font-size: 22px; letter-spacing: .04em; color: #1f2937; }
  .sheet .top span { font-size: 11px; color: #64748b; text-align: right; line-height: 1.5; }
  .sheet .bar { height: 9px; border-radius: 4px; background: #f1f5f9; margin-top: 13px; }
  .sheet .bar.s { width: 58%; }
  .sheet .total {
    margin-top: 18px; background: #2563eb; color: #fff; border-radius: 8px;
    padding: 11px 15px; display: flex; justify-content: space-between; align-items: center;
  }
  .sheet .total span { font-size: 11px; font-weight: 700; letter-spacing: .09em; }
  .sheet .total b { font-size: 18px; }
</style></head>
<body>
  <div class="brand">
    <img src="data:image/svg+xml;base64,${logo}" alt="">
    <span>Dewiride <em>Invoice</em></span>
  </div>

  <div>
    <h1>Free <b>Invoice</b><br>Generator</h1>
    <p>Create and download professional PDF invoices in seconds. No signup, 150+ currencies.</p>
  </div>

  <div class="row">
    <ul>
      <li>100% free</li><li>No registration</li><li>150+ currencies</li><li>Instant PDF</li>
    </ul>
    <div class="url">invoice.dewiride.com</div>
  </div>

  <div class="sheet">
    <div class="top">
      <strong>INVOICE</strong>
      <span>INV-2026-042<br>9 Aug 2026</span>
    </div>
    <div class="bar"></div><div class="bar s"></div><div class="bar"></div><div class="bar s"></div>
    <div class="total"><span>TOTAL</span><b>&#8377;4,42,500</b></div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const buffer = await page.screenshot({ type: 'png' });
await browser.close();

const output = join(root, 'public', 'og-image.png');
writeFileSync(output, buffer);
console.log(`  public/og-image.png written (1200x630, ${(buffer.length / 1024).toFixed(1)} KB)`);
