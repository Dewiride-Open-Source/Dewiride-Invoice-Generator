import React, { useCallback, useRef, useState } from 'react';
import { InvoiceData } from '../types/invoice';
import { trackPDFDownload } from '../utils/analytics';
import { getDocumentType } from '../utils/documents';
import { saveInvoice } from '../utils/invoiceHistory';
import { computeTotals } from '../utils/totals';

interface DownloadPDFButtonProps {
  data: InvoiceData;
  className?: string;
}

const DEFAULT_CLASS =
  'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold ' +
  'disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-2';

const DownloadPDFButton: React.FC<DownloadPDFButtonProps> = ({ data, className = DEFAULT_CLASS }) => {
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle');
  // Holds the in-flight import so hovering, focusing and clicking in quick
  // succession all share one network request rather than racing.
  const enginePromise = useRef<Promise<typeof import('./InvoicePdfRenderer')> | null>(null);

  const loadEngine = useCallback(() => {
    enginePromise.current ??= import('./InvoicePdfRenderer');
    return enginePromise.current;
  }, []);

  // Warm the chunk on intent rather than on mount. Someone who tabs to or hovers
  // over the button is very likely to press it, and this hides most of the
  // download behind their reaction time -- without costing anything to the
  // visitors who never go near it.
  const prefetch = useCallback(() => {
    void loadEngine().catch(() => {
      // Swallowed on purpose: a failed prefetch must not surface as an error.
      // The click path retries and reports properly.
      enginePromise.current = null;
    });
  }, [loadEngine]);

  const downloadPDF = useCallback(async () => {
    setStatus('working');
    let url: string | undefined;
    try {
      const { renderInvoicePdfBlob } = await loadEngine();
      const blob = await renderInvoicePdfBlob(data);

      url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // quotation-Q-2026-004.pdf, not invoice-Q-2026-004.pdf. The file name
      // is what the recipient sees in their downloads folder and what they
      // search for eighteen months later.
      link.download = `${getDocumentType(data.docType).fileStem}-${data.invoiceNumber || 'draft'}.pdf`;
      // Firefox ignores click() on an element that isn't in the document.
      document.body.appendChild(link);
      link.click();
      link.remove();

      setStatus('idle');
      trackPDFDownload(data.currency, computeTotals(data).total);

      // Downloading is the moment an invoice stops being a draft, so this is
      // where it earns a place in the history. Saving on every keystroke would
      // fill the list with abandoned scratch invoices instead.
      //
      // Deliberately not awaited: the download has already happened, and a
      // storage failure must not surface as a PDF failure. The store reports
      // its own unavailability through the history dialog.
      void saveInvoice(data).catch((error) => {
        console.warn('Invoice downloaded but could not be saved to history.', error);
      });
    } catch (error) {
      // Retry from scratch next time; a rejected import() stays rejected.
      enginePromise.current = null;
      setStatus('error');
      console.error('Failed to generate invoice PDF', error);
    } finally {
      // Safari can still be reading the blob when the synchronous click
      // returns, so revoking immediately produces an empty download.
      const objectUrl = url;
      if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    }
  }, [data, loadEngine]);

  const working = status === 'working';

  return (
    <div>
      <button
        type="button"
        className={className}
        onClick={downloadPDF}
        onPointerEnter={prefetch}
        onFocus={prefetch}
        disabled={working}
        aria-busy={working}
      >
        {working && (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {working ? 'Preparing PDF…' : 'Download as PDF'}
      </button>

      <div role="status" aria-live="polite" className="sr-only">
        {working ? 'Preparing your PDF invoice.' : ''}
      </div>
      {status === 'error' && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          Sorry, the PDF could not be generated. Please try again.
        </p>
      )}
    </div>
  );
};

export default DownloadPDFButton;
