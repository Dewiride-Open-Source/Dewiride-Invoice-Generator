
import React, { useState, useEffect } from 'react';
import InvoiceForm, { InvoiceData } from '../components/InvoiceForm';
import InvoicePreview from '../components/InvoicePreview';
import DownloadPDFButton from '../components/DownloadPDFButtonNew';

const defaultInvoice: InvoiceData = {
  fromName: '',
  fromAddress: '',
  toName: '',
  toAddress: '',
  invoiceNumber: '',
  invoiceDate: '',
  dueDate: '',
  items: [
    { description: '', quantity: 1, price: 0 },
  ],
  tax: 0,
  currency: 'INR',
};

export default function Home() {
  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('invoice-data');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return defaultInvoice;
  });

  useEffect(() => {
    sessionStorage.setItem('invoice-data', JSON.stringify(invoice));
  }, [invoice]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Invoice Generator</h1>
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl">
        <div className="flex-1 bg-white rounded shadow p-4">
          <InvoiceForm data={invoice} onChange={setInvoice} />
        </div>
        <div className="flex-1 bg-white rounded shadow p-4">
          <div id="invoice-preview-pdf">
            <InvoicePreview data={invoice} />
          </div>
          <div className="mt-4 flex justify-end">
            <DownloadPDFButton data={invoice} />
          </div>
        </div>
      </div>
    </div>
  );
}
