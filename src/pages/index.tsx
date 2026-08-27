import React from 'react';
import Head from 'next/head';
import InvoiceStudio from '../components/InvoiceStudio';
import RelatedLinks from '../components/RelatedLinks';
import { BoltIcon, CurrencyIcon, DocumentIcon, FreeIcon } from '../components/icons';
import { SITE_URL, jsonLd } from '../utils/schema';

const FEATURES = [
  {
    Icon: FreeIcon,
    title: '100% Free',
    body: 'No hidden fees, no subscriptions, no limits. Create unlimited professional invoices completely free.',
  },
  {
    Icon: DocumentIcon,
    title: 'Professional PDF',
    body: 'Download high-quality PDF invoices with professional formatting ready to send to your clients.',
  },
  {
    Icon: CurrencyIcon,
    title: 'Multiple Currencies',
    body: 'Support for USD, EUR, GBP, INR, and more currencies for global business operations.',
  },
  {
    Icon: BoltIcon,
    title: 'Instant Generation',
    body: 'Create and download your invoice in seconds. Real-time preview as you type.',
  },
] as const;

const STEPS = [
  [
    'Enter Your Business Details',
    'Fill in your company name, address, and contact information in the “From” section.',
  ],
  ['Add Client Information', 'Enter your client’s name and billing address in the “To” section.'],
  ['Set Invoice Details', 'Add invoice number, date, and due date for payment.'],
  [
    'Add Items & Services',
    'List your products or services with descriptions, quantities, and prices.',
  ],
  [
    'Set Currency & Tax',
    'Choose your currency and tax rate. On a rupee invoice, add your GSTIN and the place of supply and the CGST/SGST or IGST split is worked out for you.',
  ],
  ['Download PDF', 'Click “Download PDF” to get your professional invoice ready to send.'],
] as const;

/**
 * FAQ copy is defined once and drives both the visible list and the FAQPage
 * JSON-LD. The two used to be maintained separately and had already drifted --
 * the fourth question in the structured data did not match the fourth question
 * on the page, which is exactly the mismatch Google penalises.
 */
const FAQS = [
  {
    q: 'Is the invoice generator really free to use?',
    a: 'Yes, our invoice generator is completely free with no hidden costs, subscriptions, or limits. You can create unlimited professional invoices without any charges.',
  },
  {
    q: 'What currencies does the invoice generator support?',
    a: 'We support multiple currencies including USD (US Dollar), EUR (Euro), GBP (British Pound), INR (Indian Rupee), and many more to accommodate global business needs.',
  },
  {
    q: 'Do I need to create an account or register?',
    a: 'No registration is required. You can start creating professional invoices immediately without providing any personal information or creating an account.',
  },
  {
    q: 'Does this create a GST-compliant invoice?',
    a: 'It produces a tax invoice in the Rule 46 format: your GSTIN and your client’s, place of supply, HSN or SAC codes, the taxable value after any discount, and the CGST + SGST or IGST split worked out from your state and the place of supply, with the total written out in words. Whether a particular invoice is compliant also depends on your own registration and filings, so check anything unusual with your accountant.',
  },
  {
    q: 'Can I create a proforma invoice, a quotation or a delivery challan?',
    a: 'Yes. The same editor produces all four documents, each with the correct heading and its own caveats printed on it — a proforma and a quotation both state that they are not tax invoices, and a delivery challan cites Rule 55. Pick the format you need from the links at the foot of this page.',
  },
  {
    q: 'Is my invoice data saved automatically?',
    a: 'Yes. Your invoice is saved in your browser session so you will not lose progress if you refresh the page, and the businesses, clients and item descriptions you reuse are stored locally for autocomplete. Nothing is ever uploaded to a server.',
  },
] as const;

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

export default function Home() {
  return (
    <>
      <Head>
        <title>Free Invoice Generator — Create Professional PDF Invoices Online | Dewiride</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Generate professional invoices instantly with Dewiride's free online invoice maker. Create, customise and download PDF invoices with multiple currencies. No registration required."
        />
        <link rel="canonical" href={`${SITE_URL}/`} />
        <meta
          property="og:title"
          content="Free Invoice Generator — Create Professional PDF Invoices Online"
        />
        <meta
          property="og:description"
          content="Generate professional invoices instantly. Free, no registration, multiple currencies, instant PDF download."
        />
        <meta property="og:url" content={`${SITE_URL}/`} />
        {/*
          Only the FAQ node lives here. It is derived from FAQS, which renders
          the visible list and therefore ships to the client regardless.
          WebApplication and HowTo are emitted from _document (see
          ROUTE_SCHEMA) so their JSON stays out of the bundle entirely.
        */}
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(FAQ_SCHEMA)} />
      </Head>

      <InvoiceStudio
        hero={
          <>
            <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
              Free Invoice Generator
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-fg-muted">
              Create professional invoices in minutes with Dewiride Technologies&rsquo; free online
              invoice generator. Generate, customise, and download PDF invoices instantly with
              multiple currency support. Perfect for freelancers, small businesses, and
              entrepreneurs. No registration required.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-muted">
              {[
                '100% free forever',
                'No registration',
                'Multiple currencies',
                'Professional PDF output',
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <FreeIcon className="size-4 text-brand-text" />
                  {item}
                </li>
              ))}
            </ul>
          </>
        }
      >
        <section aria-labelledby="why-heading" className="card mt-12 p-6 sm:p-10">
          <h2 id="why-heading" className="text-2xl font-bold tracking-tight text-fg">
            Why choose Dewiride Technologies&rsquo; free invoice generator?
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-card border border-border bg-surface-sunken p-5">
                <span className="mb-3.5 inline-grid size-11 place-items-center rounded-xl bg-brand-subtle text-brand-text">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-base font-semibold text-fg">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="how-heading" className="card mt-8 p-6 sm:p-10">
          <h2 id="how-heading" className="text-2xl font-bold tracking-tight text-fg">
            How to create an invoice online
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-2">
            {STEPS.map(([title, body], index) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-brand-fg">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-fg">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-fg-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <RelatedLinks />

        <section aria-labelledby="faq-heading" className="card mt-8 p-6 sm:p-10">
          <h2 id="faq-heading" className="text-2xl font-bold tracking-tight text-fg">
            Frequently asked questions
          </h2>
          <dl className="mt-8 space-y-6">
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <dt className="text-sm font-semibold text-fg">{q}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-fg-muted">{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </InvoiceStudio>
    </>
  );
}
