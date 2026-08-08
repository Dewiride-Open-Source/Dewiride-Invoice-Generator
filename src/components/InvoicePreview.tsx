import React from 'react';
import { InvoiceData } from '../types/invoice';
import { formatCurrency } from '../utils/currency';
import { computeTotals, lineTotal } from '../utils/totals';

interface InvoicePreviewProps {
  data: InvoiceData;
}

/**
 * Empty-field hint. Uses the paper-fg-muted token (5.4:1 on the sheet, 5.2:1
 * on the address cards); the slate-400 tint it replaced sat at 2.5:1.
 */
const Placeholder: React.FC<{ children: string }> = ({ children }) => (
  <span className="italic text-paper-fg-muted">{children}</span>
);

/**
 * A live preview of the generated PDF.
 *
 * The `paper` class keeps this light in dark mode. That is deliberate: the
 * panel represents a printed document, and rendering a dark version of a page
 * that will print white would misrepresent the output.
 */
const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data }) => {
  const { subtotal, taxAmount, total } = computeTotals(data);

  return (
    <div className="paper invoice-preview p-5 sm:p-6" data-testid="invoice-preview">
      <div className="flex items-start justify-between gap-4 border-b-2 border-paper-accent pb-4">
        <p className="text-2xl font-bold tracking-wide text-paper-fg">INVOICE</p>
        <dl className="text-right text-xs">
          <dt className="text-paper-fg-muted">Invoice number</dt>
          <dd className="mb-1.5 font-semibold text-paper-fg">
            {data.invoiceNumber || <Placeholder>Not set</Placeholder>}
          </dd>
          <dt className="text-paper-fg-muted">Invoice date</dt>
          <dd className="mb-1.5 font-semibold text-paper-fg">
            {data.invoiceDate || <Placeholder>Not set</Placeholder>}
          </dd>
          <dt className="text-paper-fg-muted">Due date</dt>
          <dd className="font-semibold text-paper-fg">
            {data.dueDate || <Placeholder>Not set</Placeholder>}
          </dd>
        </dl>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[
          { title: 'Bill from', name: data.fromName, address: data.fromAddress },
          { title: 'Bill to', name: data.toName, address: data.toAddress },
        ].map(({ title, name, address }) => (
          <div key={title} className="rounded-lg bg-paper-sunken p-4">
            <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-paper-accent">
              {title}
            </p>
            <p className="mt-2 text-sm font-semibold break-words text-paper-fg">
              {name || <Placeholder>Not set</Placeholder>}
            </p>
            <p className="mt-1 whitespace-pre-line break-words text-xs leading-relaxed text-paper-fg-muted">
              {address}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-paper-border">
        <table className="w-full text-xs">
          <caption className="sr-only">Invoice line items</caption>
          <thead>
            <tr className="bg-paper-header text-[0.6875rem] uppercase tracking-wide text-paper-header-fg">
              <th scope="col" className="p-2.5 text-left font-bold">Description</th>
              <th scope="col" className="p-2.5 text-center font-bold">Qty</th>
              <th scope="col" className="p-2.5 text-right font-bold">Price</th>
              <th scope="col" className="p-2.5 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-paper-sunken' : 'bg-white'}>
                <td className="p-2.5 align-top break-words text-paper-fg">
                  {item.description || <Placeholder>Item description</Placeholder>}
                </td>
                <td className="p-2.5 text-center align-top tabular text-paper-fg">
                  {item.quantity}
                </td>
                <td className="p-2.5 text-right align-top tabular text-paper-fg">
                  {formatCurrency(item.price, data.currency)}
                </td>
                <td className="p-2.5 text-right align-top tabular text-paper-fg">
                  {formatCurrency(lineTotal(item), data.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex justify-end">
        <dl className="w-full max-w-64 text-sm">
          <div className="flex justify-between rounded bg-paper-sunken px-3 py-1.5">
            <dt className="text-paper-fg-muted">Subtotal</dt>
            <dd className="font-semibold tabular text-paper-fg">
              {formatCurrency(subtotal, data.currency)}
            </dd>
          </div>
          <div className="mt-1 flex justify-between rounded bg-paper-sunken px-3 py-1.5">
            <dt className="text-paper-fg-muted">Tax ({data.tax}%)</dt>
            <dd className="font-semibold tabular text-paper-fg">
              {formatCurrency(taxAmount, data.currency)}
            </dd>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-md bg-paper-accent px-3 py-2.5 text-white">
            <dt className="text-xs font-bold uppercase tracking-wide">Total</dt>
            <dd className="text-base font-bold tabular" data-testid="preview-total">
              {formatCurrency(total, data.currency)}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-6 border-t border-paper-border pt-4 text-center text-[0.6875rem] text-paper-fg-muted">
        Thank you for your business!
      </p>
    </div>
  );
};

export default InvoicePreview;
