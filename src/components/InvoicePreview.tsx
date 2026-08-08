import React from 'react';
import { InvoiceData } from '../types/invoice';
import { formatCurrency } from '../utils/currency';
import { computeTotals, lineTotal } from '../utils/totals';

interface InvoicePreviewProps {
  data: InvoiceData;
}

const Placeholder: React.FC<{ children: string }> = ({ children }) => (
  <span className="italic text-slate-400">{children}</span>
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
      <div className="flex items-start justify-between gap-4 border-b-2 border-[#2563eb] pb-4">
        <p className="text-2xl font-bold tracking-wide text-[#1f2937]">INVOICE</p>
        <dl className="text-right text-xs">
          <dt className="text-slate-500">Invoice number</dt>
          <dd className="mb-1.5 font-semibold text-[#1f2937]">
            {data.invoiceNumber || <Placeholder>Not set</Placeholder>}
          </dd>
          <dt className="text-slate-500">Invoice date</dt>
          <dd className="mb-1.5 font-semibold text-[#1f2937]">
            {data.invoiceDate || <Placeholder>Not set</Placeholder>}
          </dd>
          <dt className="text-slate-500">Due date</dt>
          <dd className="font-semibold text-[#1f2937]">
            {data.dueDate || <Placeholder>Not set</Placeholder>}
          </dd>
        </dl>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[
          { title: 'Bill from', name: data.fromName, address: data.fromAddress },
          { title: 'Bill to', name: data.toName, address: data.toAddress },
        ].map(({ title, name, address }) => (
          <div key={title} className="rounded-lg bg-[#f8fafc] p-4">
            <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-[#2563eb]">
              {title}
            </p>
            <p className="mt-2 text-sm font-semibold break-words text-[#1f2937]">
              {name || <Placeholder>Not set</Placeholder>}
            </p>
            <p className="mt-1 whitespace-pre-line break-words text-xs leading-relaxed text-slate-500">
              {address}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-xs">
          <caption className="sr-only">Invoice line items</caption>
          <thead>
            <tr className="bg-[#1f2937] text-[0.6875rem] uppercase tracking-wide text-white">
              <th scope="col" className="p-2.5 text-left font-bold">Description</th>
              <th scope="col" className="p-2.5 text-center font-bold">Qty</th>
              <th scope="col" className="p-2.5 text-right font-bold">Price</th>
              <th scope="col" className="p-2.5 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-[#f8fafc]' : 'bg-white'}>
                <td className="p-2.5 align-top break-words text-slate-700">
                  {item.description || <Placeholder>Item description</Placeholder>}
                </td>
                <td className="p-2.5 text-center align-top tabular text-slate-700">
                  {item.quantity}
                </td>
                <td className="p-2.5 text-right align-top tabular text-slate-700">
                  {formatCurrency(item.price, data.currency)}
                </td>
                <td className="p-2.5 text-right align-top tabular text-slate-700">
                  {formatCurrency(lineTotal(item), data.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex justify-end">
        <dl className="w-full max-w-64 text-sm">
          <div className="flex justify-between rounded bg-[#f8fafc] px-3 py-1.5">
            <dt className="text-slate-500">Subtotal</dt>
            <dd className="font-semibold tabular text-slate-700">
              {formatCurrency(subtotal, data.currency)}
            </dd>
          </div>
          <div className="mt-1 flex justify-between rounded bg-[#f8fafc] px-3 py-1.5">
            <dt className="text-slate-500">Tax ({data.tax}%)</dt>
            <dd className="font-semibold tabular text-slate-700">
              {formatCurrency(taxAmount, data.currency)}
            </dd>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-md bg-[#2563eb] px-3 py-2.5 text-white">
            <dt className="text-xs font-bold uppercase tracking-wide">Total</dt>
            <dd className="text-base font-bold tabular" data-testid="preview-total">
              {formatCurrency(total, data.currency)}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-6 border-t border-slate-200 pt-4 text-center text-[0.6875rem] text-slate-400">
        Thank you for your business!
      </p>
    </div>
  );
};

export default InvoicePreview;
