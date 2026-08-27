import React, { useCallback, useEffect, useRef, useState } from 'react';
import InvoiceForm from './InvoiceForm';
import InvoicePreview from './InvoicePreview';
import DownloadPDFButton from './DownloadPDFButton';
import SavedDataManager from './SavedDataManager';
import InvoiceHistoryManager from './InvoiceHistoryManager';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import { LiveRegionProvider } from './a11y/LiveRegion';
import { buttonClass } from './fields';
import { DatabaseIcon, DocumentIcon } from './icons';
import { useInvoiceHistory } from '../hooks/useInvoiceHistory';
import { saveInvoice, suggestNextInvoiceNumber } from '../utils/invoiceHistory';
import { saveFromCompany, saveItemDescription, saveToCompany } from '../utils/savedData';
import {
  trackFormProgress,
  trackInvoiceGenerated,
  trackSavedDataManagerOpened,
} from '../utils/analytics';
import { formatCurrency } from '../utils/currency';
import { DEFAULT_DOCUMENT_TYPE, DocumentTypeId, getDocumentType } from '../utils/documents';
import { computeTotals } from '../utils/totals';
import {
  InvoiceData,
  createEmptyInvoice,
  getReadiness,
  normaliseInvoice,
  todayIso,
} from '../types/invoice';

const AUTOSAVE_DELAY_MS = 2000;

/**
 * How a page preconfigures the editor.
 *
 * Two kinds of setting, with different rules, because conflating them makes
 * the tool obnoxious:
 *
 * - `docType` is **page identity**. /quotation-format/ produces a quotation,
 *   whatever the restored draft last said, so arriving there with an invoice
 *   half-typed re-heads it as a quotation rather than ignoring the page you
 *   asked for. The one exception is opening something from the history, which
 *   is an explicit "restore this exact document" and keeps what was saved.
 * - `defaults` is a **starting point**, applied only when there is no draft to
 *   restore. Forcing INR on someone who deliberately chose USD, every time
 *   they read a guide, would be a bug.
 */
export interface StudioConfig {
  docType?: DocumentTypeId;
  defaults?: Partial<Pick<InvoiceData, 'currency' | 'tax' | 'template' | 'paymentTerms' | 'notes'>>;
  /** Overrides the one-line note under the editor heading. */
  editorHint?: string;
}

interface InvoiceStudioProps {
  config?: StudioConfig;
  /** The page's h1 and standfirst, above the editor. */
  hero: React.ReactNode;
  /** Page prose, rendered below the editor and above the footer. */
  children?: React.ReactNode;
}

/**
 * The editor, the live preview, the download, and everything that persists
 * them. Every page that offers the tool renders this; the page itself supplies
 * only its <Head>, its hero and its prose.
 *
 * It was the body of index.tsx, where a landing page could not reach it
 * without duplicating 300 lines of state -- and a landing page that duplicates
 * the tool badly, or ships copy with no tool at all, is exactly the thin page
 * Google issues manual actions for.
 */
const InvoiceStudio: React.FC<InvoiceStudioProps> = ({ config = {}, hero, children }) => {
  /*
    Captured on the first render and never re-read. The preset describes the
    page, and the page does not change while it is open -- whereas depending on
    the caller's object identity would reset a half-typed invoice every time
    the parent happened to re-render with a fresh literal.

    useState rather than useRef: this value is read during render, which is
    exactly what a ref is not for.
  */
  const [preset] = useState(config);
  const docTypeId = preset.docType ?? DEFAULT_DOCUMENT_TYPE;
  const docType = getDocumentType(docTypeId);

  const [invoice, setInvoice] = useState<InvoiceData>(createEmptyInvoice);
  const [showSavedDataManager, setShowSavedDataManager] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');

  const history = useInvoiceHistory();

  const saveTimeouts = useRef<{
    fromCompany?: ReturnType<typeof setTimeout>;
    toCompany?: ReturnType<typeof setTimeout>;
    items: Map<string, ReturnType<typeof setTimeout>>;
  }>({ items: new Map() });

  // Restores the draft, applies the page's preset, and defaults the date to
  // today.
  //
  // All of it has to happen after mount rather than in the useState
  // initialiser: this is a static export, so an initialiser runs at build time
  // as well, and it would bake the build date into the HTML and then mismatch
  // on hydration.
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

    const base = restored ?? { ...createEmptyInvoice(), ...preset.defaults };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvoice({
      ...base,
      // Only fills an empty date, so a draft the user deliberately cleared or
      // set is never overwritten.
      invoiceDate: base.invoiceDate || todayIso(),
      docType: preset.docType ?? base.docType,
    });
  }, [preset]);

  /**
   * Continues the user's own numbering sequence on a fresh document.
   *
   * Runs separately from the restore above because it depends on IndexedDB,
   * which resolves later. It only ever fills a blank field -- a number the
   * user typed, or one restored from a draft, is never overwritten.
   */
  useEffect(() => {
    const suggestion = suggestNextInvoiceNumber(docTypeId);
    if (!suggestion) return;
    // Same exception as the restore above: the source is asynchronous storage,
    // so the value cannot exist at first render. The functional update is what
    // makes it safe -- a number typed while IndexedDB was still loading wins,
    // because the guard is evaluated against the state at apply time rather
    // than against the stale value this effect closed over.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInvoice((current) =>
      current.invoiceNumber.trim() ? current : { ...current, invoiceNumber: suggestion },
    );
    // Keyed on the store snapshot, not on the field: re-running on every
    // keystroke in the number input would be pure churn.
  }, [history, docTypeId]);

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

  /**
   * Replaces the editor contents with a saved invoice.
   *
   * A complete invoice on screen is saved before being replaced, so opening
   * something from the history can never silently discard finished work. An
   * incomplete one is not, because hoarding half-typed scratch drafts is what
   * makes a history list useless.
   *
   * Note what is *not* overridden here: the saved document keeps its own type.
   * Reopening a quotation must not re-head it as an invoice merely because it
   * was reopened from a page that produces invoices.
   */
  const handleLoadFromHistory = useCallback((next: InvoiceData) => {
    setInvoice((current) => {
      if (getReadiness(current).complete) void saveInvoice(current);
      return next;
    });
  }, []);

  const { total } = computeTotals(invoice);
  const readiness = getReadiness(invoice);
  const noun = docType.noun.toLowerCase();

  return (
    <LiveRegionProvider>
      <a
        href="#invoice-editor"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-fg"
      >
        Skip to the {noun} editor
      </a>

      <SiteHeader>
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          className={`${buttonClass.secondary} px-3 py-2`}
          data-testid="open-history"
        >
          <DocumentIcon className="size-4" />
          <span className="hidden sm:inline">
            Saved invoices{history.length ? ` (${history.length})` : ''}
          </span>
          <span className="sr-only sm:hidden">
            Saved invoices{history.length ? ` (${history.length})` : ''}
          </span>
        </button>
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
        <div className="py-8 sm:py-12">{hero}</div>

        {/*
          Mobile gets a segmented control between editing and preview. Both
          panels stay mounted (hidden, not unmounted), so focus, scroll position
          and the form's store subscriptions survive a switch -- and the full
          document is still there for crawlers.
        */}
        <div className="mb-4 lg:hidden">
          <div
            role="tablist"
            aria-label={`${docType.noun} editor view`}
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

        {/* Everything the page is about lives in the landmark, the prose
            included -- children used to render after </main>, which left the
            body copy of a guide outside the only landmark a screen-reader user
            would think to jump to. */}
        <main>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8">
          <section
            id="panel-edit"
            role="tabpanel"
            aria-labelledby="tab-edit"
            className={`card p-4 sm:p-6 ${mobileView === 'edit' ? '' : 'max-lg:hidden'}`}
          >
            <h2 id="invoice-editor" className="mb-1 text-lg font-semibold tracking-tight text-fg">
              Create your {noun}
            </h2>
            <p className="text-sm text-fg-muted">
              {preset.editorHint ?? 'Everything stays in your browser. Nothing is uploaded.'}
            </p>

            {/*
              Readiness, stated rather than implied. The data attribute gives an
              automated agent a deterministic "am I done?" without re-deriving
              the rule, and role=status means a screen-reader user hears it
              change instead of having to hunt for the empty field.
            */}
            <p
              role="status"
              data-testid="invoice-readiness"
              data-invoice-complete={readiness.complete}
              className={`mb-5 mt-3 rounded-lg border px-3 py-2 text-sm ${
                readiness.complete
                  ? 'border-border bg-brand-subtle text-brand-text'
                  : 'border-border bg-surface-sunken text-fg-muted'
              }`}
            >
              {readiness.complete
                ? 'Ready to download.'
                : `Still needed: ${readiness.missing.join(', ')}.`}
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
                <h2 className="text-lg font-semibold tracking-tight text-fg">
                  {docType.noun} preview
                </h2>
                <p className="mt-0.5 text-xs text-fg-muted">This is how your PDF will look.</p>
              </div>
              <div className="hidden lg:block">
                <DownloadPDFButton data={invoice} />
              </div>
            </div>
            <InvoicePreview data={invoice} />
          </section>
          </div>

          {children}
        </main>
      </div>

      {/*
        The download CTA used to sit below a long preview on mobile, so reaching
        it meant scrolling past the whole invoice. Here it is always one tap
        away, with the running total for context.
      */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
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

      <SiteFooter />

      <SavedDataManager
        isOpen={showSavedDataManager}
        onClose={() => setShowSavedDataManager(false)}
      />

      <InvoiceHistoryManager
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onLoad={handleLoadFromHistory}
      />
    </LiveRegionProvider>
  );
};

export default InvoiceStudio;
