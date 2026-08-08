# Dewiride Invoice Generator

A free invoice generator that runs entirely in the browser. Fill in a form,
watch the preview, download a PDF. Nothing is uploaded anywhere — invoices are
built client-side and never leave the device.

Live at **[invoice.dewiride.com](https://invoice.dewiride.com)**.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (**Pages Router**), statically exported |
| UI | React 19, Tailwind CSS v4 (CSS-first config) |
| PDF | `@react-pdf/renderer`, loaded on demand |
| Hosting | Azure Static Web Apps |
| Tests | Playwright + axe-core |

## Getting started

```bash
npm ci
npm run dev          # http://localhost:3000
```

Node 20.9+ is required (Next 16). CI pins Node 22.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Static export into `out/` |
| `npm run preview` | Serve the built export on :3000 |
| `npm test` | Playwright suite against the export, desktop + mobile |
| `npm run lint` / `lint:fix` | ESLint 9 (flat config) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run size` | First-paint JS, parsed from the exported HTML |
| `npm run check:contrast` | Every colour pair against WCAG AA, both themes |
| `npm run build:fonts` | Rebuild the PDF font subsets |
| `npm run build:icons` | Rebuild favicons and PWA icons from `logo.svg` |
| `npm run build:og` | Rebuild the social preview image |

The last three write committed assets. They only need running after a brand or
currency change, so neither the app build nor CI needs network access.

## Things worth knowing before you change something

**The PDF engine must stay lazy.** `@react-pdf/renderer` pulls in yoga-layout,
pdfkit and fontkit — about 1.5 MB, roughly 80% of what first paint used to
cost. It is reachable only through `await import('./InvoicePdfRenderer')` inside
a click handler. `eslint.config.mjs` forbids importing it anywhere else, and CI
fails if it appears in `index.html`.

**Saved data is a store, not component state.** `src/utils/savedData.ts` is
exposed through `useSyncExternalStore` (`src/hooks/useSavedData.ts`). Its server
snapshot is empty, which is what the static export prerenders, so there is no
hydration workaround. A write anywhere re-renders every reader — including
across browser tabs.

**Colour lives in tokens.** `src/styles/globals.css` declares the palette as
custom properties; `npm run check:contrast` parses that file and asserts every
pair used in the UI against AA in both themes. Add a token, add its pair. Note
that in Tailwind v4 the `--text-*` namespace means *font size*, which is why
foreground tokens are `--fg` / `--fg-muted`.

**Dark mode is a class, not a media query.** The media query cannot express
"light on a dark-preference OS". A blocking inline script in `_document.tsx`
resolves the preference before first paint.

**The PDF embeds a font subset.** The built-in Helvetica has no glyph for ₹, ₩,
₪ and most currency signs. `scripts/build-pdf-fonts.mjs` subsets Noto Sans down
to ~61 KB per weight, derives the character set from what `Intl` actually emits
for all 153 supported currencies, and fails if any would render blank. Five
currencies whose symbols sit in non-Latin blocks (AFN, AMD, BDT, KHR, THB) show
their ISO code by design.

**Currency formatting is pinned to one locale.** An invoice has to read the same
for sender and recipient, so it cannot follow the viewer's machine — nor the
currency's home locale, which makes `ar-KW` emit Arabic numerals.

**`distDir` must stay unset.** Next 16 writes dev output, a lockfile and build
manifests into `distDir`; pointing it at `out/` would publish them to the CDN.

## Layout

```
src/
├── components/
│   ├── a11y/            LiveRegion (announcements), Modal (native <dialog>)
│   ├── fields.tsx       Labelled form primitives
│   ├── icons.tsx        Every SVG in the app
│   ├── InvoiceForm      The editor
│   ├── InvoicePreview   Live preview ("paper", stays light in dark mode)
│   ├── InvoicePDF       @react-pdf document — a separate rendering engine
│   └── InvoicePdfRenderer  The lazy boundary. Never import this statically.
├── hooks/useSavedData   useSyncExternalStore bindings
├── types/invoice.ts     InvoiceData, and getReadiness()
└── utils/               savedData, currency, totals, theme, analytics
```

`InvoicePDF.tsx` does not read the DOM and is unaffected by any CSS change. If
you restyle the preview, restyle the PDF to match, or they will drift.

## Accessibility

The suite runs axe over the home page in both themes, the legal pages, and the
dialog and combobox while open — the states a static crawl never reaches. It
also covers keyboard-only operation, the dialog focus trap, the combobox
keyboard map, the heading outline and live-region announcements.

`tests/agentic.spec.ts` drives the page using only roles and labels, with no CSS
selectors, and completes and downloads an invoice that way. It is the check that
the page stays usable by a screen reader or an automated agent.

Current Lighthouse: **95 / 100 / 100 / 100** mobile, **100 / 100 / 100 / 100**
desktop.

## Deployment

Pushing to `main` triggers `.github/workflows/azure-static-web-apps-*.yml`,
which typechecks, lints, checks contrast, builds, runs the tests, asserts on the
export, then uploads. The build runs in the workflow rather than in Oryx, which
infers its own Node version.
