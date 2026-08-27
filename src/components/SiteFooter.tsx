import React from 'react';
import Link from 'next/link';
import { COMPANY_LINKS, GROUP_LABELS, NavGroup, linksIn } from '../data/site-nav';

/**
 * The site footer, on every page.
 *
 * It used to be inline in index.tsx, which meant /privacy/, /terms/ and
 * /about/ had no footer at all -- so the only route out of those pages was the
 * back button, and the only internal links on the site were the four in the
 * home page's footer.
 *
 * It also carries the hub. A published page that nothing links to is crawled
 * late and ranks poorly no matter how good it is, and tests/seo.spec.ts
 * asserts that every route in the sitemap is reachable from here.
 */
const linkClass =
  'inline-flex min-h-6 items-center py-1 text-brand-text underline underline-offset-4';

const Column: React.FC<{ group: NavGroup }> = ({ group }) => (
  <div>
    <h2 className="text-xs font-semibold uppercase tracking-wide text-fg">{GROUP_LABELS[group]}</h2>
    <ul className="mt-3 space-y-1 text-sm">
      {linksIn(group).map(({ path, label }) => (
        <li key={path}>
          <Link href={path} className={linkClass}>
            {label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

const SiteFooter: React.FC = () => (
  <footer className="mt-16 border-t border-border bg-surface-sunken">
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <nav aria-label="Footer" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-fg">
            Dewiride Invoice
          </h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-fg-muted">
            A free invoice generator that runs entirely in your browser. No account, no invoice
            limit, and nothing uploaded to a server.
          </p>
          <Link href="/" className={`${linkClass} mt-2`}>
            Create an invoice
          </Link>
        </div>

        <Column group="formats" />
        <Column group="tools" />

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-fg">Company</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {COMPANY_LINKS.map(({ href, label, external }) => (
              <li key={href}>
                {external ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {label}
                  </a>
                ) : (
                  <Link href={href} className={linkClass}>
                    {label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <p className="mt-10 border-t border-border pt-6 text-sm text-fg-muted">
        © 2026 Dewiride Technologies Private Limited. Free online invoice maker for businesses
        worldwide.
      </p>
    </div>
  </footer>
);

export default SiteFooter;
