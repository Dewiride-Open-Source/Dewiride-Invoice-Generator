# Contributing

Thanks for looking. This is a small, opinionated codebase — a few of its
constraints are load-bearing in ways that are not obvious from a diff, so this
document is mostly about those rather than about code style.

Start with the **"Things worth knowing before you change something"** section of
[the README](README.md). It is not background reading; most of it exists because
something broke.

## Getting set up

```bash
npm ci
npm run dev            # http://localhost:3000
npx playwright install # once, for the test suite
```

Node 20.9+ (Next 16). CI pins Node 22.

## Before you open a pull request

```bash
npm run typecheck
npm run lint
npm run check:contrast
npm run build
npm run check:sitemap
npm run size
npm test
```

All of these run in CI and all of them block a merge. Running them locally first
is faster than finding out from the workflow.

`npm test` needs a build first — it runs Playwright against the real static
export in `out/`, on desktop and mobile, not against a dev server.

## The five constraints

**1. The PDF engine and the QR encoder stay out of first paint.**
`@react-pdf/renderer` is about 1.5 MB. It is reachable only through
`await import('./InvoicePdfRenderer')` inside a click handler, and `uqr` only
through `await import('../utils/qr')` or the `useQrCode` hook. `eslint.config.mjs`
forbids importing either anywhere else, and `scripts/measure-first-paint.mjs`
greps the chunks the exported HTML actually references for a string out of each.
A convenient static import will fail CI, and it should.

**2. First-paint JS has a fixed gzip ceiling.** The budget lives in the
[CI workflow](.github/workflows/azure-static-web-apps-mango-dune-074690a00.yml)
with a comment recording every raise and why. Bundle size is never one bad
commit, it is fifty reasonable ones. If your change needs the ceiling raised,
raise it in the diff with a line explaining what bought the space — do not
quietly make it fit.

**3. All invoice arithmetic lives in `src/utils/totals.ts`.** Not in a component,
not in the PDF, not in the preview. Those three used to hold their own copies of
the same three lines, which is how the screen and the paper end up disagreeing.
The same applies to `src/utils/gst.ts` for which tax applies, and
`src/utils/documents.ts` for what distinguishes the four document types.

**4. Nothing is uploaded, ever.** There is no backend. A change that introduces
a network call carrying invoice content — directly or through a dependency —
is out of scope for this project regardless of how useful the feature is.

**5. Every control needs a unique accessible name inside its landmark.**
`tests/agentic.spec.ts` fills in and downloads an invoice using roles and labels
only, with no CSS selectors, and it will fail if two controls in the same
landmark answer to the same name. `tests/a11y.spec.ts` runs axe over every
published page in both themes. Both are treated as correctness tests, not
lint.

## Tests

A change to behaviour needs a test that fails without it. Two things about the
suite that are worth knowing before you write one:

- **Assert against the artefact, not the intention.** `tests/gst.spec.ts` reads
  the PDF bytes and counts pages; `tests/payment.spec.ts` rasterises the QR the
  app draws and decodes it, because "a square appeared" is not the assertion
  that matters when the thing carries money.
- **Prove the guard bites.** If you add a test for an invariant, break the
  invariant on purpose once and check that your test — and ideally only your
  test — goes red. A guard nobody has seen fail is a guard nobody knows works.

## Changes to the tax and legal content

This is the part where a well-meaning PR can do real damage. People act on what
these pages say.

- **Cite the provision.** Rule 46(b), Rule 55, Section 15(3) — the rule number,
  not "as per GST rules".
- **Prefer primary sources.** cbic.gov.in, the Gazette notification, the NPCI
  specification. Secondary reproductions on tax-news sites are often accurate
  and are sometimes months out of date; if a primary source was not available
  to you, say so in the PR.
- **Rates and thresholds change.** A rate correction should say which
  notification changed it and when it took effect, so the next person can check
  whether it has moved again.
- **Do not upgrade "Rule 46 format" to "GST compliant".** Compliance depends on
  the sender's registration, rates and filings, none of which this tool can see.
  The distinction is deliberate throughout the UI and the copy, and it is a real
  liability question, not pedantry.

## Adding a page

Pages are explicit files in `src/pages/`, not a `[slug]` route over a data
module — see the *Pages* section of the README for why. A new page needs:

- Its own genuinely distinct material. Four URLs funnelling to the same
  download with a swapped heading is the shape search engines issue manual
  actions over, and it would undo the ranking work of every other page.
- An entry in `src/data/site-nav.ts`, so the footer and related-links block pick
  it up. An orphaned page does not rank.
- A unique title, description and canonical. `tests/seo.spec.ts` asserts this,
  along with the rule that only the tool pages claim to be the tool.
- A line in `public/llms.txt`.

The sitemap is generated from `out/`, so it picks the page up on its own.

## Commit messages and pull requests

Conventional-commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`), a subject
that says what changed, and a body that says why if the why is not obvious.

In the PR, please say what you did to check it beyond the suite passing —
"rendered a three-line GST invoice and counted the pages" is worth more than a
green tick.

## Scope

Reasonable things to send: bug fixes, accessibility improvements, currency and
locale correctness, tax-content corrections with a citation, PDF layout fixes,
performance.

Things to open an issue about first, before writing code: a new document type, a
new page, anything that adds a dependency, anything that adds a network call,
and anything that would raise the size budget.

## Code of conduct

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Licence

Contributions are licensed under the [MIT Licence](LICENSE), the same as the
rest of the project.
