import React, { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import InvoiceForm from '../components/InvoiceForm';
import InvoicePreview from '../components/InvoicePreview';
import DownloadPDFButton from '../components/DownloadPDFButton';
import SavedDataManager from '../components/SavedDataManager';
import SiteHeader from '../components/SiteHeader';
import { LiveRegionProvider } from '../components/a11y/LiveRegion';
import { buttonClass } from '../components/fields';
import { BoltIcon, CurrencyIcon, DatabaseIcon, DocumentIcon, FreeIcon } from '../components/icons';
import { saveFromCompany, saveItemDescription, saveToCompany } from '../utils/savedData';
import {
  trackFormProgress,
  trackInvoiceGenerated,
  trackSavedDataManagerOpened,
} from '../utils/analytics';
import { computeTotals } from '../utils/totals';
import { formatCurrency } from '../utils/currency';
import { InvoiceData, createEmptyInvoice, normaliseInvoice, todayIso } from '../types/invoice';

const SITE_URL = 'https://invoice.dewiride.com';
const AUTOSAVE_DELAY_MS = 2000;

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
  ['Set Currency & Tax', 'Choose your preferred currency and add tax percentage if applicable.'],
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
  const [invoice, setInvoice] = useState<InvoiceData>(createEmptyInvoice);
  const [showSavedDataManager, setShowSavedDataManager] = useState(false);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');

  const saveTimeouts = useRef<{
    fromCompany?: ReturnType<typeof setTimeout>;
    toCompany?: ReturnType<typeof setTimeout>;
    items: Map<string, ReturnType<typeof setTimeout>>;
  }>({ items: new Map() });

  // Restores the draft and defaults the invoice date to today.
  //
  // Both have to happen after mount rather than in the useState initialiser:
  // this is a static export, so an initialiser runs at build time as well, and
  // it would bake the build date into the HTML and then mismatch on hydration.
  useEffect(() => {
    const saved = sessionStorage.getItem('invoice-data');
    let restored: InvoiceData | null = null;
    if (saved) {
      try {
        restored = normaliseInvoice(JSON.parse(saved));
      } catch {
        // Unparseable draft: fall through to a fresh invoice.
      }
    }

    const base = restored ?? createEmptyInvoice();
    // Only fill an empty date, so a draft the user deliberately cleared or set
    // is never overwritten.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvoice(base.invoiceDate ? base : { ...base, invoiceDate: todayIso() });
  }, []);

  useEffect(() => {
    sessionStorage.setItem('invoice-data', JSON.stringify(invoice));
  }, [invoice]);

  useEffect(() => {
    const timeouts = saveTimeouts.current;
    return () => {
      if (timeouts.fromCompany) clearTimeout(timeouts.fromCompany);
      if (timeouts.toCompany) clearTimeout(timeouts.toCompany);
      timeouts.items.forEach(clearTimeout);
    };
  }, []);

  /**
   * Debounced writes into the saved-data store. Without the delay, every
   * keystroke would persist a half-typed company name.
   */
  const autoSave = useCallback((next: InvoiceData, previous: InvoiceData) => {
    const schedule = (key: 'fromCompany' | 'toCompany', changed: boolean, run: () => void) => {
      if (!changed) return;
      clearTimeout(saveTimeouts.current[key]);
      saveTimeouts.current[key] = setTimeout(run, AUTOSAVE_DELAY_MS);
    };

    if (next.fromName.trim() && next.fromAddress.trim()) {
      schedule(
        'fromCompany',
        previous.fromName.trim() !== next.fromName.trim() ||
          previous.fromAddress.trim() !== next.fromAddress.trim(),
        () => saveFromCompany(next.fromName, next.fromAddress),
      );
    }

    if (next.toName.trim() && next.toAddress.trim()) {
      schedule(
        'toCompany',
        previous.toName.trim() !== next.toName.trim() ||
          previous.toAddress.trim() !== next.toAddress.trim(),
        () => saveToCompany(next.toName, next.toAddress),
      );
    }

    for (const item of next.items) {
      if (item.description.trim().length < 3) continue;
      const before = previous.items.find((i) => i.id === item.id);
      const changed =
        !before ||
        before.description.trim() !== item.description.trim() ||
        (before.price !== item.price && item.price > 0);
      if (!changed) continue;

      clearTimeout(saveTimeouts.current.items.get(item.id));
      saveTimeouts.current.items.set(
        item.id,
        setTimeout(() => {
          saveItemDescription(item.description, item.price > 0 ? item.price : undefined);
          saveTimeouts.current.items.delete(item.id);
        }, AUTOSAVE_DELAY_MS),
      );
    }
  }, []);

  const handleInvoiceChange = useCallback(
    (next: InvoiceData) => {
      autoSave(next, invoice);
      setInvoice(next);

      const hasParties = (d: InvoiceData) =>
        Boolean(d.fromName && d.fromAddress && d.toName && d.toAddress);
      const hasMeta = (d: InvoiceData) => Boolean(d.invoiceNumber && d.invoiceDate && d.dueDate);
      const hasItems = (d: InvoiceData) =>
        d.items.some((item) => item.description && item.quantity > 0 && item.price > 0);
      const complete = (d: InvoiceData) =>
        hasParties(d) && Boolean(d.invoiceNumber && d.invoiceDate) && hasItems(d);

      if (hasParties(next) && !hasParties(invoice)) trackFormProgress('basic_info');
      if (hasMeta(next) && !hasMeta(invoice)) trackFormProgress('invoice_details');
      if (hasItems(next) && !hasItems(invoice)) trackFormProgress('items_added');

      if (complete(next) && !complete(invoice)) {
        trackFormProgress('complete');
        trackInvoiceGenerated(next.currency, next.items.length, computeTotals(next).total);
      }
    },
    [autoSave, invoice],
  );

  const { total } = computeTotals(invoice);

  return (
    <LiveRegionProvider>
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
        />
      </Head>

      <a
        href="#invoice-editor"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-fg"
      >
        Skip to the invoice editor
      </a>

      <SiteHeader>
        <button
          type="button"
          onClick={() => {
            setShowSavedDataManager(true);
            trackSavedDataManagerOpened();
          }}
          className={`${buttonClass.secondary} px-3 py-2`}
          data-testid="open-saved-data"
        >
          <DatabaseIcon className="size-4" />
          <span className="hidden sm:inline">Saved data</span>
          <span className="sr-only sm:hidden">Manage saved data</span>
        </button>
      </SiteHeader>

      {/* pb-24 clears the sticky mobile action bar so the footer stays reachable. */}
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:pb-16">
        <div className="py-8 sm:py-12">
          <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            Free Invoice Generator
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-fg-muted">
            Create professional invoices in minutes with Dewiride Technologies&rsquo; free online
            invoice generator. Generate, customise, and download PDF invoices instantly with
            multiple currency support. Perfect for freelancers, small businesses, and entrepreneurs.
            No registration required.
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
        </div>

        {/*
          Mobile gets a segmented control between editing and preview. Both
          panels stay mounted (hidden, not unmounted), so focus, scroll position
          and the form's store subscriptions survive a switch -- and the full
          document is still there for crawlers.
        */}
        <div className="mb-4 lg:hidden">
          <div
            role="tablist"
            aria-label="Invoice editor view"
            className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-sunken p-1"
          >
            {(['edit', 'preview'] as const).map((view) => (
              <button
                key={view}
                type="button"
                role="tab"
                id={`tab-${view}`}
                aria-selected={mobileView === view}
                aria-controls={`panel-${view}`}
                onClick={() => setMobileView(view)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  mobileView === view ? 'bg-surface text-fg shadow-card' : 'text-fg-muted'
                }`}
              >
                {view === 'edit' ? 'Edit' : 'Preview'}
              </button>
            ))}
          </div>
        </div>

        <main className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8">
          <section
            id="panel-edit"
            role="tabpanel"
            aria-labelledby="tab-edit"
            className={`card p-4 sm:p-6 ${mobileView === 'edit' ? '' : 'max-lg:hidden'}`}
          >
            <h2 id="invoice-editor" className="mb-1 text-lg font-semibold tracking-tight text-fg">
              Create your invoice
            </h2>
            <p className="mb-5 text-sm text-fg-muted">
              Everything stays in your browser. Nothing is uploaded.
            </p>
            <InvoiceForm data={invoice} onChange={handleInvoiceChange} />
          </section>

          <section
            id="panel-preview"
            role="tabpanel"
            aria-labelledby="tab-preview"
            className={`card p-4 sm:p-5 lg:sticky lg:top-24 ${
              mobileView === 'preview' ? '' : 'max-lg:hidden'
            }`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-fg">Invoice preview</h2>
                <p className="mt-0.5 text-xs text-fg-muted">This is how your PDF will look.</p>
              </div>
              <div className="hidden lg:block">
                <DownloadPDFButton data={invoice} />
              </div>
            </div>
            <InvoicePreview data={invoice} />
          </section>
        </main>

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
      </div>

      {/*
        The download CTA used to sit below a long preview on mobile, so reaching
        it meant scrolling past the whole invoice. Here it is always one tap
        away, with the running total for context.
      */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-fg-muted">
              Total
            </p>
            <p className="truncate text-base font-bold tabular text-fg" data-testid="sticky-total">
              {formatCurrency(total, invoice.currency)}
            </p>
          </div>
          <DownloadPDFButton data={invoice} className={`${buttonClass.primary} shrink-0`} />
        </div>
      </div>

      <footer className="border-t border-border bg-surface-sunken">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
          <p className="text-sm text-fg-muted">
            © 2026 Dewiride Technologies Private Limited. Free online invoice maker for businesses
            worldwide.
          </p>
          <nav aria-label="Footer" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link href="/privacy" className="inline-flex min-h-6 items-center py-1 text-brand-text underline underline-offset-4">
              Privacy Policy
            </Link>
            <Link href="/terms" className="inline-flex min-h-6 items-center py-1 text-brand-text underline underline-offset-4">
              Terms of Service
            </Link>
            <a
              href="https://dewiride.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-6 items-center py-1 text-brand-text underline underline-offset-4"
            >
              Dewiride Technologies
            </a>
          </nav>
        </div>
      </footer>

      <SavedDataManager
        isOpen={showSavedDataManager}
        onClose={() => setShowSavedDataManager(false)}
      />
    </LiveRegionProvider>
  );
}
