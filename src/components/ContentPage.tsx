import React from 'react';
import Head from 'next/head';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import { SITE_URL, breadcrumbs, jsonLd } from '../utils/schema';

interface ContentPageProps {
  /** Breadcrumb label. Short. */
  title: string;
  metaTitle: string;
  description: string;
  path: `/${string}/`;
  hero: React.ReactNode;
  /** Extra JSON-LD nodes, typically the page's FAQPage. */
  schema?: readonly unknown[];
  children: React.ReactNode;
}

/**
 * The shell for every page that is not the invoice studio: the standalone
 * calculators, and the reference pages.
 *
 * Not every page should carry the editor. A page about what Rule 46 requires
 * is a reference someone reads, and a page answering "what is 18% of 45,000"
 * wants three inputs rather than a full invoice. Bolting the studio onto both
 * would make them two more URLs funnelling to one download, which is the shape
 * of thing search engines issue manual actions over. They link to the
 * generator instead.
 */
const ContentPage: React.FC<ContentPageProps> = ({
  title,
  metaTitle,
  description,
  path,
  hero,
  schema = [],
  children,
}) => (
  <>
    <Head>
      <title>{metaTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content={description} />
      <link rel="canonical" href={`${SITE_URL}${path}`} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={`${SITE_URL}${path}`} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(breadcrumbs(title, path))}
      />
      {schema.map((node, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(node)} />
      ))}
    </Head>

    <SiteHeader />

    <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
      <div className="py-8 sm:py-12">{hero}</div>
      <main>{children}</main>
    </div>

    <SiteFooter />
  </>
);

export default ContentPage;
