import React, { useRef, useState } from 'react';
import Modal from './a11y/Modal';
import { buttonClass } from './fields';
import { DocumentIcon, DownloadIcon, TrashIcon, WarningIcon } from './icons';
import { useAnnounce } from './a11y/LiveRegion';
import { InvoiceData, createItem, todayIso } from '../types/invoice';
import {
  SavedInvoice,
  clearHistory,
  deleteInvoice,
  exportHistory,
  importHistory,
  nextInvoiceNumber,
} from '../utils/invoiceHistory';
import { useHistoryStatus, useInvoiceHistory } from '../hooks/useInvoiceHistory';
import { formatCurrency } from '../utils/currency';
import { computeTotals } from '../utils/totals';

interface InvoiceHistoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Loads an invoice into the editor. The caller decides what to do with the draft. */
  onLoad: (invoice: InvoiceData) => void;
}

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * A copy, ready to be edited: next number in the sequence, dated today, and
 * with fresh line-item ids so the form's per-row state cannot be shared
 * between the original and the duplicate.
 *
 * The due date is cleared rather than carried over. A duplicate of last
 * month's invoice with last month's due date is already overdue the moment it
 * is created, which is worse than an empty field the readiness line asks for.
 */
const duplicateOf = (invoice: InvoiceData): InvoiceData => ({
  ...invoice,
  invoiceNumber: nextInvoiceNumber(invoice.invoiceNumber),
  invoiceDate: todayIso(),
  dueDate: '',
  items: invoice.items.map((item) => ({ ...item, id: createItem().id })),
});

const InvoiceHistoryManager: React.FC<InvoiceHistoryManagerProps> = ({
  isOpen,
  onClose,
  onLoad,
}) => {
  const invoices = useInvoiceHistory();
  const status = useHistoryStatus();
  const announce = useAnnounce();

  const [confirmingClear, setConfirmingClear] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = (entry: SavedInvoice, asCopy: boolean) => {
    const invoice = asCopy ? duplicateOf(entry.invoice) : entry.invoice;
    onLoad(invoice);
    onClose();
    announce(
      asCopy
        ? `Copied to a new invoice, numbered ${invoice.invoiceNumber || 'not set'}.`
        : `Opened invoice ${invoice.invoiceNumber || 'with no number'}.`,
    );
  };

  const handleDelete = async (entry: SavedInvoice) => {
    await deleteInvoice(entry.id);
    announce(`Invoice ${entry.invoice.invoiceNumber || 'without a number'} deleted.`);
  };

  const handleExport = () => {
    const blob = new Blob([exportHistory()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-history-${todayIso()}.json`;
    // Firefox ignores click() on an element that is not in the document.
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    announce(`Exported ${invoices.length} invoices.`);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset immediately so re-picking the same file fires change again.
    event.target.value = '';
    if (!file) return;

    setImportError(null);
    try {
      const { added, skipped } = await importHistory(await file.text());
      announce(
        added
          ? `Imported ${added} invoices${skipped ? `, skipped ${skipped} already present` : ''}.`
          : 'Nothing new to import; every invoice in that file is already here.',
        'assertive',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'That file could not be read.';
      setImportError(message);
      announce(message, 'assertive');
    }
  };

  const confirmClear = async () => {
    await clearHistory();
    setConfirmingClear(false);
    announce('All saved invoices cleared.', 'assertive');
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Saved invoices"
        description="Invoices you have saved in this browser. They are never uploaded, so exporting is the only way to move them to another device."
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={invoices.length === 0}
                className={`${buttonClass.secondary} px-3 py-2`}
              >
                <DownloadIcon className="size-4" />
                Export
              </button>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className={`${buttonClass.secondary} px-3 py-2`}
              >
                Import
              </button>
              {invoices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmingClear(true)}
                  className={`${buttonClass.dangerGhost} px-3 py-2`}
                >
                  Clear all
                </button>
              )}
            </div>
            {/* ml-auto, not just justify-between: once the action group wraps
                to its own line on a narrow screen, a lone flex item sits at
                the start of the new line and Done ends up under Export. */}
            <button type="button" onClick={onClose} className={`${buttonClass.primary} ml-auto`}>
              Done
            </button>
          </div>
        }
      >
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          onChange={handleImport}
          className="sr-only"
          aria-label="Choose an exported invoice history file"
          data-testid="history-import"
        />

        {importError && (
          <p role="alert" className="mb-4 rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger-text">
            {importError}
          </p>
        )}

        {status === 'unavailable' ? (
          <p className="rounded-card border border-dashed border-border py-10 text-center text-sm text-fg-muted">
            This browser will not let the page store data, so invoices cannot be saved here.
            Everything else still works &mdash; download the PDF before you leave the page.
          </p>
        ) : status === 'loading' ? (
          <p className="rounded-card border border-dashed border-border py-10 text-center text-sm text-fg-muted">
            Loading your saved invoices&hellip;
          </p>
        ) : invoices.length === 0 ? (
          <p className="rounded-card border border-dashed border-border py-10 text-center text-sm text-fg-muted">
            No saved invoices yet. Downloading a PDF saves the invoice here automatically, so you
            can reopen or duplicate it later.
          </p>
        ) : (
          <ul className="space-y-2" data-testid="history-list">
            {invoices.map((entry) => {
              const { invoice } = entry;
              const label = invoice.invoiceNumber || 'Untitled invoice';
              return (
                <li
                  key={entry.id}
                  /* Every control in this row is named after the user's own
                     invoice ("Open INV-2026-042", "Delete ... for Globex"),
                     and the analytics tracker reports the accessible name of
                     whatever was clicked. Ignoring the row keeps invoice
                     numbers and client names off the wire, including for
                     anything added inside it later. */
                  data-dw-ignore
                  className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{label}</p>
                    <p className="truncate text-xs text-fg-muted">
                      {invoice.toName || 'No client'} &middot; saved {formatDate(entry.savedAt)}
                    </p>
                  </div>

                  <p className="text-sm font-semibold tabular text-fg">
                    {formatCurrency(computeTotals(invoice).total, invoice.currency)}
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => load(entry, false)}
                      className={`${buttonClass.secondary} px-3 py-2`}
                    >
                      Open
                      <span className="sr-only"> invoice {label}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => load(entry, true)}
                      className={`${buttonClass.secondary} px-3 py-2`}
                    >
                      <DocumentIcon className="size-4" />
                      Copy
                      <span className="sr-only"> invoice {label} to a new invoice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(entry)}
                      className={buttonClass.iconDanger}
                    >
                      <TrashIcon className="size-4" />
                      {/* Names the specific invoice, so a screen reader is not
                          offered a column of identical "Delete" buttons. */}
                      <span className="sr-only">Delete invoice {label}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>

      <Modal
        isOpen={confirmingClear}
        onClose={() => setConfirmingClear(false)}
        title="Delete every saved invoice?"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className={buttonClass.secondary}
            >
              Cancel
            </button>
            <button type="button" onClick={() => void confirmClear()} className={buttonClass.danger}>
              Yes, delete all {invoices.length}
            </button>
          </div>
        }
      >
        <div className="flex gap-4">
          <WarningIcon className="size-8 shrink-0 text-danger-text" />
          <div>
            <p className="text-sm text-fg-muted">
              This permanently deletes all {invoices.length} saved invoices from this browser.
            </p>
            <p className="mt-4 text-sm font-medium text-danger-text">
              This cannot be undone, and there is no copy on a server to restore from.
            </p>
            <p className="mt-2 text-sm text-fg-muted">
              Export them first if you might want them later. Your current invoice is not affected.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default InvoiceHistoryManager;
