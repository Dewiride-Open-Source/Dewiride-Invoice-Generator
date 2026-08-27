# Security policy

## Reporting a vulnerability

Open a private
[security advisory](https://github.com/Dewiride-Open-Source/Dewiride-Invoice-Generator/security/advisories/new)
on this repository, or email **support@dewiride.com** with `SECURITY` in the
subject line. Please do not open a public issue for anything exploitable.

Include what you did, what happened, and which browser and version. A short
reproduction beats a long description. We aim to acknowledge within three
working days.

There is no bug bounty. We will credit you in the fix commit unless you would
rather we did not.

## What the threat model actually is

This is worth stating plainly, because it changes what counts as a
vulnerability here.

**There is no server.** The site is a static export behind a CDN. There is no
database, no account system, no session, no API that accepts invoice data, and
no server-side rendering at request time. Nothing you type is transmitted
anywhere — there is nothing to transmit it to. So the classic web
vulnerabilities (SQL injection, IDOR, broken auth, SSRF) have no surface here,
and a report of one is almost certainly a misunderstanding of the architecture.

**Everything sensitive is local to one browser.** Drafts live in
`sessionStorage`, autocomplete data in `localStorage`, and finished documents in
IndexedDB. Someone with access to the machine and the browser profile has the
data. That is a property of the design, not a defect: the alternative is
uploading invoices to us, which is the thing this tool exists not to do.

**What we do consider a vulnerability:**

- **Stored XSS through the import path.** `src/utils/invoiceHistory.ts` accepts a
  JSON export the user may have edited by hand or received from someone else.
  `normaliseInvoice()` in `src/types/invoice.ts` is the boundary that has to
  reject it, and `isStoredImage()` in `src/utils/image.ts` is why a `logo` can
  only ever be a size-capped PNG or JPEG data URI — never a remote URL that
  would phone home, never an SVG that could carry markup. A way through either
  is a real finding.
- **Data leaving the device.** Any code path, including one introduced by a
  dependency, that sends invoice content, names, addresses or amounts to any
  host. The analytics script is deliberately limited to page views and
  non-identifying aggregates; anything beyond that is a bug.
- **A malicious or compromised dependency**, particularly one that reaches the
  PDF chunk, since it runs against the full contents of a document.
- **A crafted input that corrupts a generated document**, for example one that
  makes the printed figures disagree with the arithmetic, or that injects
  content into a PDF the sender did not intend to send. This is a financial
  document; a wrong number is a security problem, not a cosmetic one.
- **A UPI link that does not encode what the UI showed.** `src/utils/upi.ts`
  percent-encodes to RFC 3986 rather than to what `encodeURIComponent` happens
  to escape, because an under-encoded `&` truncates the link and the payer's app
  then displays a different amount. Anything that reintroduces that class of bug
  carries money.

**What we do not:** the absence of a login, the fact that data persists in the
browser after use (there is a visible control to erase it), missing security
headers that a static CDN cannot meaningfully enforce, or automated-scanner
output with no working reproduction against the deployed site.

## Notes for anyone auditing the deployment

The repository is public and the CI workflow is part of it, so it is worth
saying plainly what is and is not in there.

Nothing in this repository is a credential. The workflow references
`AZURE_STATIC_WEB_APPS_API_TOKEN_...`, `GOOGLE_SITE_VERIFICATION` and
`BING_SITE_VERIFICATION` by name; the values are GitHub Actions secrets and are
never readable from the repository. `public/staticwebapp.config.json` holds
cache rules and response headers, all of which are already visible in any
response from the site. The analytics site id and the GA measurement id are
compiled into `_document` and therefore into the HTML of a live public website
— publishing the source exposes neither of them for the first time.

The IndexNow key at `public/<key>.txt` is deliberately public. Hosting it *is*
the ownership proof; possessing it lets you tell Bing that this host changed,
and nothing else.

Two properties of the workflow are load-bearing and should be treated as part
of the security posture rather than as configuration:

- It triggers on **`pull_request`, never `pull_request_target`.** A fork's pull
  request runs code the fork controls, `package.json` scripts included. Under
  `pull_request` that code is given no secrets and a read-only token. Under
  `pull_request_target` it would run in this repository's context with access to
  the deployment token.
- The deploy steps are **skipped for pull requests from forks** rather than
  attempted and failed. Every check before them still runs, so an outside
  contributor gets the full suite.

Keep GitHub's default requirement that a maintainer approve workflow runs from
first-time contributors.

## Supported versions

The deployed site at <https://invoice.dewiride.com> is the only supported
version. Fixes land on `main` and deploy from there; there are no maintained
release branches.
