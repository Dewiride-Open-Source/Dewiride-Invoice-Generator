import React from 'react';
import { InvoiceData } from './InvoiceForm';
import { formatCurrency } from '../utils/currency';

interface InvoicePreviewProps {
  data: InvoiceData;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data }) => {
  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxAmount = subtotal * (data.tax / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="invoice-preview text-gray-900">
      <div className="invoice-header flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold">Invoice</h2>
        <div className="text-right">
          <div><span className="font-semibold">Invoice #:</span> {data.invoiceNumber}</div>
          <div><span className="font-semibold">Date:</span> {data.invoiceDate}</div>
          <div><span className="font-semibold">Due:</span> {data.dueDate}</div>
        </div>
      </div>
      <div className="addresses flex justify-between gap-8 mb-4">
        <div>
          <div className="font-semibold">From:</div>
          <div>{data.fromName}</div>
          <div style={{ whiteSpace: 'pre-line' }}>{data.fromAddress}</div>
        </div>
        <div>
          <div className="font-semibold">To:</div>
          <div>{data.toName}</div>
          <div style={{ whiteSpace: 'pre-line' }}>{data.toAddress}</div>
        </div>
      </div>
      <table className="preview-items-table w-full border text-sm mb-2">
        <thead className="bg-gray-100">
          <tr>
            <th className="font-semibold p-2 text-left">Description</th>
            <th className="font-semibold p-2 text-right">Quantity</th>
            <th className="font-semibold p-2 text-right">Price</th>
            <th className="font-semibold p-2 text-right">Line Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx} className="even:bg-gray-50">
              <td className="p-2">{item.description}</td>
              <td className="p-2 text-right">{item.quantity}</td>
              <td className="p-2 text-right">{formatCurrency(item.price, data.currency)}</td>
              <td className="p-2 text-right">{formatCurrency(item.quantity * item.price, data.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="totals mt-4">
        <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(subtotal, data.currency)}</span></div>
        <div className="flex justify-between"><span>Tax ({data.tax}%):</span> <span>{formatCurrency(taxAmount, data.currency)}</span></div>
        <div className="total flex justify-between font-bold text-lg mt-2"><span>Total:</span> <span>{formatCurrency(total, data.currency)}</span></div>
      </div>
    </div>
  );
};

export default InvoicePreview;
