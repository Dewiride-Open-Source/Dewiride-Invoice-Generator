## What this changes

<!-- And why, if the why is not obvious from the diff. -->

## How you checked it

<!--
Beyond the suite going green. "Rendered a three-line GST invoice and counted the
pages" is worth more than a tick, because the interesting failures here are in
the artefact rather than in the code.
-->

## Checklist

- [ ] `npm run typecheck`, `npm run lint`, `npm run check:contrast`, `npm run build`, `npm run check:sitemap`, `npm run size` and `npm test` all pass locally
- [ ] Behaviour change comes with a test that fails without it — and I have broken the invariant once to watch that test go red
- [ ] No new static import of `@react-pdf/renderer` or `uqr` (they stay behind `await import`)
- [ ] Arithmetic changes are in `src/utils/totals.ts`, not in a component
- [ ] No new network call carrying invoice content — nothing is uploaded, ever
- [ ] New controls have a unique accessible name inside their landmark
- [ ] If this raises the first-paint budget, the raise is in this diff with a line saying what bought the space

### If this touches the tax or legal copy

- [ ] The provision is cited by number
- [ ] The source is linked, and I have said whether it is primary or a reproduction
- [ ] A rate or threshold change names the notification and the date it took effect
- [ ] Nothing was upgraded from "Rule 46 format" to "GST compliant"
