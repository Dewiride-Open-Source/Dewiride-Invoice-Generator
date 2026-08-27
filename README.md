# Dewiride Invoice Generator

A free invoice generator that runs entirely in the browser. Fill in a form,
watch the preview, download a PDF. Nothing is uploaded anywhere — invoices are
built client-side and never leave the device.

On a rupee invoice it produces a tax invoice in the **Rule 46 format**: both
GSTINs, place of supply, HSN/SAC codes, the taxable value after discount, the
CGST + SGST or IGST split, the amount in words, and a UPI QR the client can
scan. Whether a particular invoice is *compliant* also depends on the sender's
registration and filings, which is a distinction the UI states rather than
glosses over.

The same editor produces four documents — **invoice, proforma invoice,
quotation and delivery challan** — and there are three standalone tools (GST
calculator, UPI QR builder, amount-in-words converter) alongside a set of
reference pages.

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
| `npm run check:sitemap` | Asserts the sitemap matches the exported routes |
| `npm run build:fonts` | Rebuild the PDF font subsets |
| `npm run build:icons` | Rebuild favicons and PWA icons from `logo.svg` |
| `npm run build:og` | Rebuild the social preview image |

The last three write committed assets. They only need running after a brand or
currency change, so neither the app build nor CI needs network access.

## Things worth knowing before you change something

**The PDF engine and the QR encoder must stay lazy.** `@react-pdf/renderer`
pulls in yoga-layout, pdfkit and fontkit — about 1.5 MB, roughly 80% of what
first paint used to cost. It is reachable only through
`await import('./InvoicePdfRenderer')` inside a click handler. `uqr`, the QR
encoder, is ~27 KB behind `src/utils/qr.ts` and is reached with
`await import('../utils/qr')` (or the `useQrCode` hook); `InvoicePDF` may import
it directly, because it already lives in the lazy chunk. `eslint.config.mjs`
forbids importing either anywhere else, and `measure-first-paint.mjs` greps the
chunks the exported HTML actually references for a string literal out of each —
the gzip budget alone would never notice 10 KB of encoder.

**Saved data is a store, not component state.** `src/utils/savedData.ts` is
exposed through `useSyncExternalStore` (`src/hooks/useSavedData.ts`). Its server
snapshot is empty, which is what the static export prerenders, so there is no
hydration workaround. A write anywhere re-renders every reader — including
across browser tabs.

**Saved invoices live in IndexedDB, and follow the same store shape.**
`src/utils/invoiceHistory.ts` mirrors `savedData.ts` — module-level store, empty
server snapshot, stable snapshot identity — but the backing store is
asynchronous, so reads are served from an in-memory array loaded once on first
`subscribe`. Before that resolves the snapshot is empty, which is exactly what
the export prerenders, so hydration still matches. Cross-tab sync needs an
explicit `BroadcastChannel`, because IndexedDB has no `storage` event.
Downloading a PDF saves the invoice; nothing else does.

**Structured data is emitted from `_document`, not from a page's `<Head>`.**
`src/utils/schema.ts` holds every JSON-LD node, and `ROUTE_SCHEMA` maps a Next
route to the nodes that are true for it. Two reasons: `next/head` re-renders on
the client, so routing JSON through a page ships it in the bundle (+1.3 KB gzip
for `WebApplication` and `HowTo` alone, and a landing page would each carry
their own copy); and a node emitted globally means every URL claims to be the
same primary entity, which is how markup gets discarded. CI greps the chunks for
`applicationSubCategory` to keep it that way. Add a page's schema to
`ROUTE_SCHEMA`, not to its `<Head>`.

**The sitemap is generated, not written.** `scripts/build-sitemap.mjs` runs after
`next build` and derives every URL from `out/` itself, so a new page cannot be
forgotten. `lastmod` is the last commit date, not the build clock, so rebuilding
an unchanged commit does not claim every page changed. `npm run check:sitemap`
asserts it matches the export.

**First-paint JS has a hard ceiling.** `node scripts/measure-first-paint.mjs
--budget=152` fails CI above 152 KB gzip (150.8 KB today). Bundle growth is
never one bad commit, it is fifty reasonable ones. Anything large should be
lazily imported the way the PDF engine is; raising the number should be a
deliberate line in a diff. The same script fails if a module on the forbidden
list reaches a first-paint chunk.

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

**The UPI QR is built locally, and only for rupees.** `src/utils/upi.ts` turns
an invoice into an NPCI deep link (`upi://pay?pa=…&am=…&cu=INR`), percent-encoded
to RFC 3986 rather than to what `encodeURIComponent` happens to escape — an
under-encoded `&` in a business name truncates the link and the payer's app then
shows the wrong amount. It returns `null` for a non-`INR` invoice or a
malformed VPA, and that `null` is what decides whether a QR is drawn at all. The
preview and the PDF render the same path from the same `toQrPath`, so they
cannot disagree. `tests/payment.spec.ts` rasterises the QR the app draws and
decodes it, because "a square appeared" is not the assertion that matters when
the thing carries money.

**Uploaded images are re-encoded before they are stored.** `src/utils/image.ts`
rasterises whatever was picked — logo or signature — down to 512px and steps
through PNG → JPEG until the data URI fits `MAX_IMAGE_BYTES` (128 KB). The cap
is load-bearing, not tidiness: both images are part of `InvoiceData`, so they
are re-serialised into `sessionStorage` on every keystroke and stored again for
every saved invoice. `isStoredImage` is the read boundary — only a capped PNG or
JPEG data URI is ever rendered, so a hand-edited history export cannot smuggle
in a remote URL or an SVG.

**All invoice arithmetic lives in `src/utils/totals.ts`, and rounds at every
boundary.** Each printed figure is rounded to the currency's own minor unit
before it is summed, so the column of line amounts adds up to the subtotal on
the same page. Summing at full precision and rounding only for display is what
makes a printed invoice fail its own arithmetic by a paisa. CGST and SGST are
each computed at half the rate against the taxable value rather than by halving
one total, which is both what the statute describes and what guarantees the two
printed halves are equal and sum to the tax line.

Two rules the arithmetic encodes: a **discount comes off before tax**, which GST
requires; **shipping goes on after it**, which is a simplification. Where
freight forms part of a composite supply it is taxable at the rate of the
principal supply — the field's own hint says to enter it as a line item in that
case.

**Which tax an invoice carries is decided in `src/utils/gst.ts`.** Same state →
CGST + SGST at half the rate each; different states → IGST at the full rate;
anything that is not a rupee invoice with a GSTIN → a single plain `Tax` line,
exactly as before. GSTINs are validated by their **checksum**, not just their
shape: a transposed pair of digits passes any regex, is invisible to a human
proof-reader, and surfaces months later as the client's denied input credit.
Entering a GSTIN also fills in the state it already declares.

**The amount in words uses two numbering systems.** Rupees are spelled in lakhs
and crores with paise written out; everything else gets the ISO code, short-scale
words and the minor unit as a fraction. The code rather than the currency's name
because English does not pluralise them predictably — it is Dollars and Euros
but Yen, Yuan, Won, Baht and Rand, and a trailing "s" prints "Japanese Yens" on
someone's invoice. For the same reason rupee amounts are formatted `en-IN`
(₹10,33,640.00) while every other currency is `en-US`: the words already say
"Ten Lakh", and grouping the digits in threes made the document contradict
itself.

**An invoice design is a palette, not a second set of components.**
`src/utils/templates.ts` holds four of them. The preview already drew its
colours from the `--paper-*` custom properties, so applying a design is a matter
of redefining those on the preview root — every `text-paper-accent` and
`bg-paper-header` below it follows — and the PDF builds its StyleSheet from the
same object. That is why four designs cost about 1 KB gzip and four palettes
rather than four components, and why none of them can drift out of step with
the layout. One structural switch (`filled`) turns backgrounds into rules, and
one (`bandHeader`) puts the header inside a solid block.

Two traps worth knowing if you add a design. A band header has to reverse the
body **tokens**, not set a colour on the container — the first version did the
latter and was silently overridden by the explicit `text-paper-fg` on each
value, so the labels printed dark on indigo while the PDF reversed them
correctly. And a band needs a white plate behind the logo: most logos are a
single brand colour, and a blue mark on an indigo block is simply not there.

`check-contrast.mjs` reads the hex values straight out of the TypeScript and
runs every design's pairs against AA, so a new palette cannot ship white-on-teal
at 3:1.

**Three things in the PDF must never split across a page break**, and each broke
before it was guarded: the **totals** (`wrap={false}` — subtotal and discount
were landing on one sheet with the tax and the total on the next), the **amount
in words** (grouped with the totals — it was arriving alone at the top of a page,
restating a total that was not there), and each **line-item row**. The **table
header** carries `fixed`, so it repeats on continuation pages instead of opening
page two with six unlabelled columns of numbers. `tests/gst.spec.ts` asserts all
of this against the PDF bytes — the text cannot be searched, because the
embedded font is subset and strings are re-encoded to glyph indices, so the
assertions match the shapes that are drawn.

**The PDF footer is pinned, not flowed.** It sits `position: 'absolute'` inside
the page's bottom padding with `fixed`, so it repeats on every page and cannot
be pushed onto one of its own — which is exactly what happened when the payment
block filled the sheet. The vertical budget is tight: A4 less 42pt of padding
leaves ~700pt, and a one-line invoice with a logo and payment details uses
almost all of it. `tests/payment.spec.ts` asserts the page count.

**Currency formatting is pinned per currency, never per viewer.** An invoice has
to read the same for sender and recipient, so it cannot follow the viewer's
machine — nor the currency's home locale, which makes `ar-KW` emit Arabic
numerals. Rupees use `en-IN` for Indian grouping; everything else uses `en-US`.

**`distDir` must stay unset.** Next 16 writes dev output, a lockfile and build
manifests into `distDir`; pointing it at `out/` would publish them to the CDN.

## Layout

```
src/
├── components/
│   ├── a11y/            LiveRegion (announcements), Modal (native <dialog>)
│   ├── fields.tsx       Labelled form primitives
│   ├── icons.tsx        Every SVG in the app
│   ├── InvoiceStudio    Editor + preview + download + persistence. Every page
│   │                     that offers the tool renders this one component.
│   ├── InvoiceForm      The editor
│   ├── ImageField       Logo and signature picker; resizing lives in utils/image
│   ├── TemplatePicker   The four invoice designs
│   ├── InvoicePreview   Live preview ("paper", stays light in dark mode)
│   ├── InvoicePDF       @react-pdf document — a separate rendering engine
│   ├── InvoicePdfRenderer  The lazy boundary. Never import this statically.
│   ├── SavedDataManager    Businesses/clients/items kept for autocomplete
│   ├── InvoiceHistoryManager  Saved invoices: open, copy, export, import
│   ├── ContentPage      Shell for pages that are not the studio
│   ├── Article          Long-form prose styling, FAQ list, FAQPage JSON-LD
│   ├── SiteHeader / SiteFooter / RelatedLinks   Chrome and internal linking
│   └── tools/           GstCalculator, UpiQrTool, AmountWordsTool
├── data/site-nav.ts     Every published page, once. Footer, related links
│                         and llms.txt all read from here.
├── hooks/               useSyncExternalStore bindings (saved data, history),
│                         useQrCode (loads the encoder on demand)
├── types/invoice.ts     InvoiceData, normaliseInvoice(), getReadiness()
└── utils/               savedData, invoiceHistory, schema, currency, totals,
                         gst, documents, amountInWords, upi, qr, image,
                         templates, theme, analytics
```

### Pages

`src/pages/` is flat and explicit rather than a `[slug]` route over a data
file. Each guide holds its own prose, so a page's copy ships in that page's
chunk and nowhere else — one data module holding eight pages of copy would put
all eight in every one of their bundles. The templated approach is the right
one when the profession pages arrive; it is the wrong one for eight pages of
genuinely different material.

Two pages deliberately carry **no editor**: `/gst-invoice-format/` is a
reference, and the three `/tools/` pages are single-purpose calculators. Four
URLs funnelling to one download with a swapped heading is the shape of thing
search engines issue manual actions over, so a page either has something of its
own to say or it links to the page that does.

`InvoicePDF.tsx` does not read the DOM and is unaffected by any CSS change. If
you restyle the preview, restyle the PDF to match, or they will drift.

### Four documents, one editor

`src/utils/documents.ts` holds the table. An invoice, a proforma, a quotation
and a delivery challan are the same line-item table wrapped in four different
legal meanings, and the differences that matter are encoded rather than left to
the page:

- **Only an invoice becomes a `TAX INVOICE`.** Every other type's `taxHeading`
  equals its `heading`, so a GSTIN on a quotation does not print those two
  words. That is a rule, not an oversight waiting to be tidied up.
- **A document that does not ask for money gets no payment QR.**
  `invoiceUpiLink` returns null for a quotation and a challan, in one place, so
  the preview and the PDF cannot disagree.
- Each type carries its own field labels (`Valid until`, not `Due date`), its
  own file-name stem, its own disclaimer printed under the totals, and **its own
  running number series** — every number a quotation spends leaves a gap in a
  tax-invoice series that Rule 46(b) requires to be consecutive.

A page declares its type through `<InvoiceStudio config={...} />`. `docType` is
page identity and always wins over the restored draft; `defaults` is a starting
point and applies only when there is no draft. Opening something from the
history keeps the type it was saved with.

### The vertical rhythm in the PDF is load-bearing

The totals block and the amount in words are one `wrap={false}` unit, so they
either fit below the table or the whole group moves to the next sheet. It was
missing by about seven points, which put an ordinary three-line invoice on two
pages with the first two-thirds empty. The gaps were retuned to buy that back,
and `tests/gst.spec.ts` asserts both directions: a three-line invoice stays on
one page, and a five-line one still does not split its totals. Both are
mutation-verified.

## Accessibility

The suite runs axe over every published page in both themes, the dialog and
combobox while open, and a filled-in tax invoice — the states a static crawl
never reaches. It also covers keyboard-only operation, the dialog
focus trap, the combobox keyboard map, the heading outline and live-region
announcements.

Two things the linters cannot see and the tests assert instead: the file inputs'
accessible names, because `jsx-a11y` cannot follow a `htmlFor` built from
`useId`; and that every field hint is actually wired into `aria-describedby`,
which `SelectField` and `TextAreaField` did not do until a hint became
load-bearing ("It decides CGST + SGST or IGST", on a select whose 37 options are
near-identical strings).

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
