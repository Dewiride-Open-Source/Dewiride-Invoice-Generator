import { Html, Head, Main, NextScript, type DocumentProps } from 'next/document';
import { GA_INIT_SCRIPT } from '../utils/analytics';
import { OG_IMAGE, ROUTE_SCHEMA, WEB_SITE, X_HANDLE, jsonLd } from '../utils/schema';
import { THEME_INIT_SCRIPT } from '../utils/theme';

const DEWIRIDE_ANALYTICS_SITE_ID = '01a03f20-4189-7402-8f04-98a0e1eebb99';

/**
 * Search-engine ownership verification.
 *
 * Supplied at build time so the codes are not committed. Set
 * NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION / NEXT_PUBLIC_BING_SITE_VERIFICATION in
 * the CI environment. Absent, neither tag renders -- an empty content
 * attribute verifies nothing and still ships bytes.
 */
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const BING_SITE_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

/**
 * Only site-wide identity is emitted here, because _document renders into
 * every page.
 *
 * WebApplication and HowTo used to sit here too, which meant /privacy/ and
 * /terms/ each carried a node claiming to be the tool at the site root, plus
 * invoice-creation steps those pages do not contain. Both now live on the home
 * page -- see src/utils/schema.ts.
 */

export default function Document({ __NEXT_DATA__ }: DocumentProps) {
  // Route-specific structured data, so /privacy/ never claims to be the tool.
  const routeSchema = ROUTE_SCHEMA[__NEXT_DATA__.page] ?? [];


  return (
    <Html lang="en" data-scroll-behavior="smooth">
      <Head>
        {/*
          Must run before the first paint, ahead of React and ahead of
          next/script, or a dark-mode visitor sees a white flash. This is the
          one legitimate use of a blocking inline script on this page.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />

        {/*
          Just the gtag queue, so events fired before the library arrives are
          buffered rather than dropped. The library itself is loaded on idle in
          _app -- see GA_INIT_SCRIPT for why.
        */}
        <script dangerouslySetInnerHTML={{ __html: GA_INIT_SCRIPT }} />

        {/*
          Dewiride's own analytics. First-party, small, and deferred, so it
          runs after parsing without competing with the critical path. This
          sits alongside GA rather than replacing it.
        */}
        <script
          defer
          src="https://analytics.dewiride.com/dw.js"
          data-site={DEWIRIDE_ANALYTICS_SITE_ID}
        />

        <meta
          name="description"
          content="Free professional invoice generator by Dewiride Technologies. Create, customise and download PDF invoices instantly. No registration required. Multiple currencies supported."
        />
        <meta name="author" content="Dewiride Technologies Private Limited" />
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />

        {GOOGLE_SITE_VERIFICATION && (
          <meta name="google-site-verification" content={GOOGLE_SITE_VERIFICATION} />
        )}
        {BING_SITE_VERIFICATION && <meta name="msvalidate.01" content={BING_SITE_VERIFICATION} />}

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
        <meta name="twitter:site" content={X_HANDLE} />
        <meta name="twitter:creator" content={X_HANDLE} />
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

        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(WEB_SITE)} />
        {routeSchema.map((node, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={jsonLd(node)}
          />
        ))}
      </Head>
      <body>
        {/* Pageview fallback for visitors without JavaScript. */}
        <noscript>
          {/* A tracking pixel, not content: next/image would rewrite it
              through the optimiser and defeat the point. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://analytics.dewiride.com/collect/pixel.gif?site=${DEWIRIDE_ANALYTICS_SITE_ID}`}
            referrerPolicy="no-referrer-when-downgrade"
            alt=""
            width="1"
            height="1"
            style={{ position: 'absolute' }}
          />
        </noscript>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
