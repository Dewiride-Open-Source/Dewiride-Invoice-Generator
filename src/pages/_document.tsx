import { Html, Head, Main, NextScript } from 'next/document';
import { THEME_INIT_SCRIPT } from '../utils/theme';

const SITE_URL = 'https://invoice.dewiride.com';
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const LOGO = `${SITE_URL}/logo.png`;

const ORGANISATION = {
  '@type': 'Organization',
  name: 'Dewiride Technologies Private Limited',
  url: 'https://dewiride.com',
  logo: { '@type': 'ImageObject', url: LOGO },
};

/**
 * Structured data.
 *
 * Note what is deliberately absent: this used to declare an aggregateRating of
 * 4.8 from 1250 ratings plus a review by "Small Business Owner", duplicated
 * across two blocks. None of that was real. Self-serving review markup
 * violates Google's structured-data policy and risks a manual action, so it is
 * gone. What remains describes the product truthfully.
 */
const WEB_APPLICATION = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Dewiride Invoice Generator',
  alternateName: 'Free Invoice Maker by Dewiride Technologies',
  description:
    'Free professional invoice generator by Dewiride Technologies for creating and downloading PDF invoices online. Built for freelancers, small businesses and entrepreneurs.',
  url: SITE_URL,
  sameAs: [
    'https://dewiride.com',
    'https://twitter.com/dewiride',
    'https://linkedin.com/company/dewiride-technologies',
  ],
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Invoice Generator',
  operatingSystem: 'Web Browser',
  browserRequirements: 'Requires JavaScript. Requires HTML5.',
  softwareVersion: '2.0',
  datePublished: '2025-06-28',
  dateModified: '2026-08-09',
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

const HOW_TO = {
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

export default function Document() {
  return (
    <Html lang="en" data-scroll-behavior="smooth">
      <Head>
        {/*
          Must run before the first paint, ahead of React and ahead of
          next/script, or a dark-mode visitor sees a white flash. This is the
          one legitimate use of a blocking inline script on this page.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />

        <meta
          name="description"
          content="Free professional invoice generator by Dewiride Technologies. Create, customise and download PDF invoices instantly. No registration required. Multiple currencies supported."
        />
        <meta name="author" content="Dewiride Technologies Private Limited" />
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />

        {/* Open Graph. Per-page titles/descriptions are set in each page's Head. */}
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="Dewiride Invoice Generator - a free online invoice maker showing the editor and live preview"
        />
        <meta property="og:site_name" content="Dewiride Technologies Invoice Generator" />
        <meta property="og:locale" content="en_US" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@dewiride" />
        <meta name="twitter:creator" content="@dewiride" />
        <meta name="twitter:image" content={OG_IMAGE} />
        <meta
          name="twitter:image:alt"
          content="Dewiride Invoice Generator - a free online invoice maker showing the editor and live preview"
        />

        {/* Matches the light and dark canvas tokens so the browser chrome blends in. */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f1f5f9" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#080c14" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Dewiride Invoice" />
        <meta name="format-detection" content="telephone=no" />

        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        {/* Modern browsers prefer the vector; the ICO/PNGs above cover the rest. */}
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* manifest.json is the complete one; site.webmanifest was an empty-name stub. */}
        <link rel="manifest" href="/manifest.json" />

        {/*
          dns-prefetch rather than preconnect: GA now loads afterInteractive, so
          opening a TLS connection during initial parse would just compete with
          critical resources. The old preconnects to fonts.googleapis.com are
          gone entirely -- next/font self-hosts, so nothing is ever requested
          from Google Fonts.
        */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEB_APPLICATION) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(HOW_TO) }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
