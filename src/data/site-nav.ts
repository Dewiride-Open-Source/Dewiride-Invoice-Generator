/**
 * Every page this site publishes, in one list.
 *
 * The footer, the related-links block at the foot of each guide, and
 * public/llms.txt all read from here. Three hand-maintained copies of the same
 * list is how a page ends up published, sitemapped and linked from nowhere --
 * and an orphaned page is crawled late and ranks poorly, which defeats the
 * point of having written it.
 *
 * Deliberately small: labels and one-line blurbs only. The prose for each page
 * lives in that page's own module so it ships in that page's chunk and nowhere
 * else. A single data file holding eight pages of copy would put all eight in
 * every one of their bundles.
 */

export type NavGroup = 'formats' | 'tools';

export interface SiteLink {
  path: `/${string}/`;
  /** Footer label. Short -- it sits in a column. */
  label: string;
  /** One line, used in the related-links block and llms.txt. */
  blurb: string;
  group: NavGroup;
}

export const SITE_LINKS: readonly SiteLink[] = [
  {
    path: '/gst-invoice-format/',
    label: 'GST invoice format',
    blurb:
      'Every particular Rule 46 requires on a tax invoice, and what happens when one is missing.',
    group: 'formats',
  },
  {
    path: '/gst-invoice-generator/',
    label: 'GST invoice generator',
    blurb:
      'Make a GST tax invoice with the CGST/SGST or IGST split worked out. No account, no invoice limit.',
    group: 'formats',
  },
  {
    path: '/proforma-invoice-format/',
    label: 'Proforma invoice format',
    blurb: 'An offer, not a tax invoice: no GST payable and no input tax credit against it.',
    group: 'formats',
  },
  {
    path: '/quotation-format/',
    label: 'Quotation format',
    blurb: 'Quote a price with a validity date, and know when a quotation becomes a contract.',
    group: 'formats',
  },
  {
    path: '/delivery-challan-format/',
    label: 'Delivery challan format',
    blurb: 'Rule 55: moving goods without a supply, in triplicate, with the right markings.',
    group: 'formats',
  },
  {
    path: '/tools/gst-calculator/',
    label: 'GST calculator',
    blurb: 'Add GST to an amount, or pull the GST back out of a GST-inclusive one.',
    group: 'tools',
  },
  {
    path: '/tools/upi-qr-generator/',
    label: 'UPI QR generator',
    blurb:
      'A scannable UPI QR from a VPA and an amount, built to the NPCI link format in your browser.',
    group: 'tools',
  },
  {
    path: '/tools/amount-in-words/',
    label: 'Amount in words',
    blurb:
      'A rupee figure written out in the Indian system, with paise, ready for a cheque or an invoice.',
    group: 'tools',
  },
];

export const GROUP_LABELS: Record<NavGroup, string> = {
  formats: 'Invoice formats',
  tools: 'Free tools',
};

export const linksIn = (group: NavGroup): readonly SiteLink[] =>
  SITE_LINKS.filter((link) => link.group === group);

/** Everything except the page asking, so a page never links to itself. */
export const relatedTo = (path: string, limit = 4): readonly SiteLink[] =>
  SITE_LINKS.filter((link) => link.path !== path).slice(0, limit);

/** Legal and company pages, kept apart from the content columns. */
export const COMPANY_LINKS: readonly { href: string; label: string; external?: boolean }[] = [
  { href: '/about/', label: 'About' },
  { href: '/privacy/', label: 'Privacy policy' },
  { href: '/terms/', label: 'Terms of service' },
  { href: 'https://dewiride.com', label: 'Dewiride Technologies', external: true },
];
