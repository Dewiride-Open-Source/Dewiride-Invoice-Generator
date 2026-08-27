import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import { proseClass } from './Article';
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

      <div className={`mt-10 ${proseClass}`}>
        {children}
      </div>

      <div className="mt-12 border-t border-border pt-8">
        <Link href="/" className={buttonClass.primary}>
          Start creating invoices
        </Link>
      </div>
    </main>

    {/* These pages used to have no footer at all, so the only way out of
        /privacy/ was the back button. */}
    <SiteFooter />
  </>
);

export default LegalPage;
