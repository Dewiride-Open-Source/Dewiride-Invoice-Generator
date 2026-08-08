#!/usr/bin/env node
/**
 * Validates every foreground/background pair the design system actually uses,
 * in both themes, against WCAG AA.
 *
 * Colour is a correctness concern here, not taste: the previous palette had
 * five pairs below 4.5:1, including a focus indicator at 1.06:1. Keeping this
 * check in the repo means a future palette tweak fails loudly instead of
 * silently regressing.
 */
import { readFileSync } from 'node:fs';

const srgb = (hex) => {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
};

const luminance = (hex) => {
  const [r, g, b] = srgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

/** Pull the token values straight out of globals.css so this can never drift. */
function readTokens(css, selector) {
  const block = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 's'));
  if (!block) throw new Error(`No ${selector} block found in globals.css`);
  const tokens = {};
  for (const [, name, value] of block[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens[name] = value;
  }
  return tokens;
}

const css = readFileSync(new URL('../src/styles/globals.css', import.meta.url), 'utf8');
const light = readTokens(css, ':root');
const dark = readTokens(css, '\\.dark');

// [foreground, background, minimum, label]
// 3.0 is the AA floor for large text (>=24px, or >=18.66px bold) and for
// non-text UI components such as borders and focus rings (SC 1.4.11).
const PAIRS = [
  ['fg', 'canvas', 4.5, 'body text on page'],
  ['fg', 'surface', 4.5, 'body text on card'],
  ['fg', 'surface-sunken', 4.5, 'body text on inset panel'],
  ['fg-muted', 'canvas', 4.5, 'secondary text on page'],
  ['fg-muted', 'surface', 4.5, 'secondary text on card'],
  ['fg-muted', 'surface-sunken', 4.5, 'secondary text on inset panel'],
  ['brand-fg', 'brand', 4.5, 'primary button label'],
  ['brand-fg', 'brand-hover', 4.5, 'primary button label (hover)'],
  ['brand-text', 'surface', 4.5, 'link on card'],
  ['brand-text', 'brand-subtle', 4.5, 'badge text'],
  ['success-fg', 'success', 4.5, 'success button label'],
  ['danger-fg', 'danger', 4.5, 'danger button label'],
  ['danger-text', 'surface', 4.5, 'destructive link on card'],
  ['danger-text', 'danger-subtle', 4.5, 'destructive text on tint'],
  ['ring', 'canvas', 3.0, 'focus ring on page'],
  ['ring', 'surface', 3.0, 'focus ring on card'],
  ['border-strong', 'surface', 3.0, 'input border on card'],
  ['border-strong', 'surface-sunken', 3.0, 'input border on inset panel'],

  // The invoice preview is always light, so these are theme-independent -- but
  // they are what the user actually reads, and what the PDF mirrors.
  ['paper-fg', 'paper', 4.5, 'invoice text on the sheet'],
  ['paper-fg', 'paper-sunken', 4.5, 'invoice text on an address card'],
  ['paper-fg-muted', 'paper', 4.5, 'invoice hint on the sheet'],
  ['paper-fg-muted', 'paper-sunken', 4.5, 'invoice hint on an address card'],
  ['paper-accent', 'paper', 4.5, 'invoice section label'],
  ['paper-accent', 'paper-sunken', 4.5, 'invoice section label on a card'],
  ['paper-accent-fg', 'paper-accent', 4.5, 'invoice total bar'],
  ['paper-header-fg', 'paper-header', 4.5, 'invoice table header'],
];

let failures = 0;
for (const [themeName, tokens] of [['light', light], ['dark', dark]]) {
  console.log(`\n  ${themeName.toUpperCase()}`);
  for (const [fg, bg, min, label] of PAIRS) {
    // `.dark` only redeclares what changes; anything it omits (the paper scale,
    // for instance) still resolves to the :root value at runtime.
    const fgHex = tokens[fg] ?? light[fg];
    const bgHex = tokens[bg] ?? light[bg];
    if (!fgHex || !bgHex) {
      console.log(`    MISSING  --${fg} / --${bg}`);
      failures++;
      continue;
    }
    const r = ratio(fgHex, bgHex);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(
      `    ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)}:1 (min ${min})  ${label}` +
        `  [${fgHex} on ${bgHex}]`,
    );
  }
}

console.log(failures ? `\n  ${failures} pair(s) below AA\n` : '\n  All pairs meet WCAG AA\n');
process.exit(failures ? 1 : 0);
