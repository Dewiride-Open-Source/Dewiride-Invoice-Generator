/**
 * Structured data, in one place.
 *
 * It used to live entirely in _document, which meant every node was emitted on
 * every page: /privacy/ and /terms/ each carried a WebApplication claiming to
 * be the tool at https://invoice.dewiride.com/, plus a HowTo listing invoice
 * steps those pages do not contain. Structured data has to describe the page
 * it is on -- four URLs all asserting they are the same primary entity is a
 * well-known way to have the markup ignored, and it would have multiplied
 * across every landing page added later.
 *
 * So: site-wide identity (WebSite, Organization) is emitted from _document,
 * and page-specific nodes are emitted by the page that is actually about them.
 *
 * Note what stays absent: no aggregateRating, no self-authored Review, and no
 * SearchAction for a site search that does not exist.
 */

export const SITE_URL = 'https://invoice.dewiride.com';
export const OG_IMAGE = `${SITE_URL}/og-image.png`;
export const LOGO = `${SITE_URL}/logo.png`;

/**
 * The X handle is @dewiridetech, not @dewiride.
 *
 * sameAs and the twitter:site/creator tags previously both claimed @dewiride,
 * which is not an account this company controls. Search engines use sameAs to
 * resolve which real-world entity a site belongs to, so naming the wrong
 * profile weakens the association rather than strengthening it, and card
 * attribution credited the wrong account on every share.
 */
export const X_HANDLE = '@dewiridetech';

/** Every profile here must be one Dewiride actually controls. */
export const SOCIAL_PROFILES = [
  'https://x.com/dewiridetech',
  'https://www.linkedin.com/company/dewiride-technologies',
  'https://github.com/dewiridetechnologies',
  // Where the open-source projects live, this one included. Listed separately
  // from the company org because they are two accounts, and sameAs is a claim
  // about accounts rather than about repositories.
  'https://github.com/Dewiride-Open-Source',
  'https://www.youtube.com/@Dewiride',
];

/**
 * Build date, not a hand-edited literal -- dateModified sat at a hardcoded
 * '2026-08-09' and was already stale.
 *
 * Injected by next.config.ts rather than computed here. This module is
 * imported by both _document (server-only) and index (client), and a
 * `new Date()` at module scope would evaluate at build time in one and at
 * page-load time in the other, so the two would disagree and hydration would
 * mismatch. An inlined build constant is identical in both.
 */
export const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE ?? '2026-01-01';

export const ORGANISATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organisation`,
  name: 'Dewiride Technologies Private Limited',
  url: 'https://dewiride.com',
  logo: { '@type': 'ImageObject', url: LOGO },
  sameAs: SOCIAL_PROFILES,
};

/**
 * The site as an entity, distinct from the application it hosts. Emitted on
 * every page, because it is true on every page.
 */
export const WEB_SITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: 'Dewiride Invoice Generator',
  alternateName: 'Dewiride Invoice',
  url: SITE_URL,
  inLanguage: 'en',
  publisher: ORGANISATION,
};

/** The tool itself. Emitted only by the page that is the tool. */
export const WEB_APPLICATION = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  '@id': `${SITE_URL}/#webapp`,
  name: 'Dewiride Invoice Generator',
  alternateName: 'Free Invoice Maker by Dewiride Technologies',
  description:
    'Free professional invoice generator by Dewiride Technologies for creating and downloading PDF invoices online. Built for freelancers, small businesses and entrepreneurs.',
  url: SITE_URL,
  isPartOf: { '@id': `${SITE_URL}/#website` },
  sameAs: ['https://dewiride.com', ...SOCIAL_PROFILES],
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Invoice Generator',
  operatingSystem: 'Web Browser',
  browserRequirements: 'Requires JavaScript. Requires HTML5.',
  datePublished: '2025-06-28',
  dateModified: BUILD_DATE,
  author: ORGANISATION,
  publisher: ORGANISATION,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  featureList: [
    'Professional PDF invoice generation',
    'Multiple currency support',
    'Real-time invoice preview',
    'No registration required',
    'Free to use',
    'Session data persistence',
    'Mobile responsive design',
    'Light and dark themes',
    'Tax calculation support',
    'Instant PDF download',
  ],
  screenshot: OG_IMAGE,
  isAccessibleForFree: true,
};

/**
 * The steps, which exist on the home page and nowhere else.
 *
 * Google dropped HowTo rich results entirely in 2023, so this produces no
 * SERP change. It is kept because it still describes the page accurately for
 * anything else parsing the document -- but it must not be claimed by pages
 * that do not contain the steps.
 */
export const HOW_TO = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Create an Invoice Online with Dewiride Technologies',
  description:
    "Step-by-step guide to creating professional invoices using Dewiride's free online invoice generator",
  image: OG_IMAGE,
  totalTime: 'PT5M',
  estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
  supply: [
    { '@type': 'HowToSupply', name: 'Business Information' },
    { '@type': 'HowToSupply', name: 'Client Information' },
    { '@type': 'HowToSupply', name: 'Invoice Items' },
  ],
  step: [
    {
      '@type': 'HowToStep',
      name: 'Enter Business Details',
      text: "Fill in your business name and address in the 'From' section",
    },
    {
      '@type': 'HowToStep',
      name: 'Add Client Information',
      text: "Enter your client's name and address in the 'To' section",
    },
    {
      '@type': 'HowToStep',
      name: 'Add Invoice Details',
      text: 'Set invoice number, date, and due date',
    },
    {
      '@type': 'HowToStep',
      name: 'Add Items',
      text: 'Add items with descriptions, quantities, and prices',
    },
    {
      '@type': 'HowToStep',
      name: 'Download PDF',
      text: "Click 'Download PDF' to get your professional invoice",
    },
  ],
};

/**
 * Breadcrumbs for subpages. The home page is the root of the trail and does
 * not get one.
 *
 * This is the one piece of structured data on these pages that still produces
 * a visible SERP change: FAQPage rich results were restricted to authoritative
 * health and government sites in 2023, and HowTo results were dropped.
 */
export const breadcrumbs = (title: string, path: string) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Invoice generator', item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: title, item: `${SITE_URL}${path}` },
  ],
});

/**
 * Structured data that belongs to one route, emitted from _document.
 *
 * These nodes are inert metadata: nothing on the client reads them, and
 * nothing about hydration depends on them. Putting them in a page's own
 * <Head> is the idiomatic place, but next/head re-renders on the client, so
 * every byte of JSON would also ship in the JS bundle -- measured at +1.3 KB
 * gzip for these two alone. _document is server-only, so emitting them here
 * costs the client nothing while still keeping each node on the one page it
 * actually describes.
 *
 * That distinction matters more as pages are added: thirty landing pages each
 * carrying their own schema through next/head is thirty copies in the bundle.
 * Add the route here instead.
 *
 * Keyed by the Next route (__NEXT_DATA__.page), not the exported URL, so there
 * is no trailing slash.
 */
export const ROUTE_SCHEMA: Record<string, readonly unknown[]> = {
  '/': [WEB_APPLICATION, HOW_TO],
};

/** Serialised for dangerouslySetInnerHTML, which is how JSON-LD is embedded. */
export const jsonLd = (node: unknown) => ({ __html: JSON.stringify(node) });
