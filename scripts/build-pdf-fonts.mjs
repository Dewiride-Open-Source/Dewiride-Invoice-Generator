#!/usr/bin/env node
/**
 * Builds the subset fonts embedded in generated PDFs.
 *
 * The PDF needs a Unicode font: @react-pdf's built-in Helvetica uses
 * WinAnsiEncoding, which has no glyph for the rupee, won, shekel, dong and most
 * other currency signs. Those rendered as blanks, which is why the app used to
 * print "INR 1,234.00" instead of "₹1,234.00".
 *
 * Full Noto Sans is ~557 KB per weight. Since the font is fetched at PDF
 * generation time, shipping 1.1 MB would add seconds to the first download on a
 * phone. Subsetting to the ranges an invoice can actually contain brings that
 * down by well over 90%.
 *
 * Run `npm run build:fonts` after changing the ranges below. The output is
 * committed so neither the app build nor CI needs network access.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import subsetFont from 'subset-font';
import * as fontkit from 'fontkit';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Sources live outside public/ deliberately: everything under public/ is
// deployed, and the full faces are 1.1 MB of dead weight on the CDN.
const sourceDir = join(root, 'assets', 'fonts');
const outputDir = join(root, 'public', 'fonts');

/** Static TTF instances of Noto Sans, resolved from the Google Fonts CSS API. */
const SOURCES = {
  Regular:
    'https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d.ttf',
  Bold: 'https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyAaBN9d.ttf',
};

async function ensureSource(weight) {
  const path = join(sourceDir, `NotoSans-${weight}.ttf`);
  if (existsSync(path)) return path;

  mkdirSync(sourceDir, { recursive: true });
  console.log(`  downloading NotoSans-${weight}...`);
  const response = await fetch(SOURCES[weight]);
  if (!response.ok) throw new Error(`Failed to download NotoSans-${weight}: ${response.status}`);
  writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  return path;
}

/** Codepoint ranges kept in the subset. */
const RANGES = [
  [0x0020, 0x007e], // Basic Latin
  [0x00a0, 0x00ff], // Latin-1 Supplement: accented names, £ ¥ ¢ ¤ §
  [0x0100, 0x017f], // Latin Extended-A: European names
  [0x0180, 0x024f], // Latin Extended-B
  [0x2010, 0x205e], // General punctuation: dashes, quotes, bullets
  [0x20a0, 0x20bf], // Currency Symbols block: ₹ ₩ ₪ ₫ ₽ ₺ ₴ ₦ ₱ ₡ ₸ ₮ ₾ ₼ €
  [0x2116, 0x2116], // Numero sign
  [0x2190, 0x2193], // Arrows
  [0x2212, 0x2212], // Minus sign
  [0x25a0, 0x25a1], // Geometric shapes used as fallbacks
];

/**
 * Currency symbols are derived from what Intl actually emits for every
 * supported code, rather than hand-listed.
 *
 * Most land in the Currency Symbols block above, but not all -- ฿ (U+0E3F) is
 * in Thai and ៛ (U+17DB) is in Khmer. Reading the codes straight out of
 * currency.ts means adding a currency can never silently produce a blank glyph
 * in the PDF.
 */
function currencyCharacters() {
  const source = readFileSync(join(root, 'src', 'utils', 'currency.ts'), 'utf8');
  const codes = [...source.matchAll(/\{ code: '([A-Z]{3})'/g)].map((m) => m[1]);
  if (codes.length < 50) {
    throw new Error(`Only found ${codes.length} currency codes in currency.ts -- parser out of date?`);
  }

  const codeOnly = new Set(
    (readFileSync(join(root, 'src', 'utils', 'currency.ts'), 'utf8').match(
      /CODE_ONLY_CURRENCIES = new Set\(\[([^\]]*)\]/,
    )?.[1] ?? '')
      .split(',')
      .map((s) => s.trim().replace(/'/g, ''))
      .filter(Boolean),
  );

  const characters = new Set();
  for (const code of codes) {
    for (const display of codeOnly.has(code) ? ['code'] : ['narrowSymbol', 'code']) {
      try {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: code,
          currencyDisplay: display,
        }).format(-1234567.891);
        for (const char of formatted) characters.add(char);
      } catch {
        // Unknown to this ICU build; the app falls back to the code, which is
        // already covered by Basic Latin.
      }
    }
  }
  console.log(`  ${codes.length} currencies -> ${characters.size} distinct characters`);
  return [...characters].join('');
}

const text =
  RANGES.flatMap(([start, end]) => {
    const chars = [];
    for (let cp = start; cp <= end; cp += 1) chars.push(String.fromCodePoint(cp));
    return chars;
  }).join('') + currencyCharacters();

const WEIGHTS = ['Regular', 'Bold'];
let totalBefore = 0;
let totalAfter = 0;

mkdirSync(outputDir, { recursive: true });

for (const weight of WEIGHTS) {
  const source = await ensureSource(weight);

  const original = readFileSync(source);
  const subset = await subsetFont(original, text, { targetFormat: 'truetype' });
  const target = join(outputDir, `NotoSans-${weight}.subset.ttf`);
  writeFileSync(target, subset);

  totalBefore += original.length;
  totalAfter += subset.length;
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  console.log(
    `  NotoSans-${weight}: ${kb(original.length)} -> ${kb(subset.length)} ` +
      `(-${(100 - (subset.length / original.length) * 100).toFixed(1)}%)`,
  );
}

console.log(
  `\n  Total ${(totalBefore / 1024).toFixed(1)} KB -> ${(totalAfter / 1024).toFixed(1)} KB`,
);

// Verify, rather than assume. A currency whose symbol the font cannot render
// prints as a blank box in the PDF, which is the exact class of bug this whole
// script exists to remove -- so fail the build instead of shipping it.
{
  const source = readFileSync(join(root, 'src', 'utils', 'currency.ts'), 'utf8');
  const codes = [...source.matchAll(/\{ code: '([A-Z]{3})'/g)].map((m) => m[1]);
  const codeOnly = new Set(
    (source.match(/CODE_ONLY_CURRENCIES = new Set\(\[([^\]]*)\]/)?.[1] ?? '')
      .split(',')
      .map((c) => c.trim().replace(/'/g, ''))
      .filter(Boolean),
  );

  const unrenderable = new Set();
  for (const weight of WEIGHTS) {
    const font = fontkit.openSync(join(outputDir, `NotoSans-${weight}.subset.ttf`));
    for (const code of codes) {
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
        currencyDisplay: codeOnly.has(code) ? 'code' : 'narrowSymbol',
      }).format(-1234.5);
      for (const char of formatted) {
        if (!font.hasGlyphForCodePoint(char.codePointAt(0))) unrenderable.add(`${code} (${char})`);
      }
    }
  }

  if (unrenderable.size) {
    console.error(
      `\n  FAIL: ${unrenderable.size} currencies would print blank glyphs:\n` +
        `    ${[...unrenderable].join(', ')}\n` +
        `  Add them to CODE_ONLY_CURRENCIES in src/utils/currency.ts, or embed a font that covers them.\n`,
    );
    process.exit(1);
  }

  console.log(`  Verified all ${codes.length} currencies render (${codeOnly.size} shown as ISO code)\n`);
}
