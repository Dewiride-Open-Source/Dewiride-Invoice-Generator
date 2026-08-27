import React from 'react';
import Link from 'next/link';
import { SITE_LINKS } from '../data/site-nav';

interface RelatedLinksProps {
  /** The page rendering this, so it never links to itself. */
  currentPath?: string;
  title?: string;
  headingId?: string;
}

/**
 * In-content links between the guides and the tools.
 *
 * The footer already lists everything, but a link inside the body of a page is
 * followed by readers and weighed more heavily by crawlers than one in
 * boilerplate that repeats on every page. These eight pages only work as a set
 * -- someone reading about proforma invoices frequently wants the quotation
 * page next -- so the set has to be visible from inside each of them.
 */
const RelatedLinks: React.FC<RelatedLinksProps> = ({
  currentPath,
  title = 'More invoice formats and free tools',
  headingId = 'related-heading',
}) => {
  const links = SITE_LINKS.filter((link) => link.path !== currentPath);

  return (
    <section aria-labelledby={headingId} className="card mt-8 p-6 sm:p-10">
      <h2 id={headingId} className="text-2xl font-bold tracking-tight text-fg">
        {title}
      </h2>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2">
        {links.map(({ path, label, blurb }) => (
          <li key={path} className="rounded-card border border-border bg-surface-sunken p-5">
            <h3 className="text-base font-semibold">
              <Link href={path} className="text-brand-text underline underline-offset-4">
                {label}
              </Link>
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{blurb}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default RelatedLinks;
