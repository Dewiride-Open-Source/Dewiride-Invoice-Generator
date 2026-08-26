import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteHeader from './SiteHeader';
import { buttonClass } from './fields';
import { SITE_URL, breadcrumbs, jsonLd } from '../utils/schema';

interface LegalPageProps {
  title: string;
  metaTitle: string;
  description: string;
  path: `/${string}/`;
  /** Omitted on pages where a revision date carries no meaning. */
  lastUpdated?: string;
  children: React.ReactNode;
}

const LegalPage: React.FC<LegalPageProps> = ({
  title,
  metaTitle,
  description,
  path,
  lastUpdated,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbs(title, path))} />
    </Head>

    <SiteHeader />

    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/" className="inline-flex min-h-6 items-center py-1 text-sm text-brand-text underline underline-offset-4">
        ← Back to the invoice generator
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h1>
      {lastUpdated && <p className="mt-2 text-sm text-fg-muted">Last updated: {lastUpdated}</p>}

      <div
        className="
          mt-10 space-y-4 text-sm leading-relaxed text-fg-muted
          [&_a]:text-brand-text [&_a]:underline [&_a]:underline-offset-4
          [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-fg
          [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-fg
          [&_li]:mt-1.5
          [&_strong]:font-semibold [&_strong]:text-fg
          [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6
        "
      >
        {children}
      </div>

      <div className="mt-12 border-t border-border pt-8">
        <Link href="/" className={buttonClass.primary}>
          Start creating invoices
        </Link>
      </div>
    </main>
  </>
);

export default LegalPage;
