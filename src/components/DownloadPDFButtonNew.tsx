import React from 'react';
import { pdf } from '@react-pdf/renderer';
import InvoicePDF from './InvoicePDF';
import { InvoiceData } from './InvoiceForm';

interface DownloadPDFButtonProps {
  data: InvoiceData;
}

const DownloadPDFButton: React.FC<DownloadPDFButtonProps> = ({ data }) => {
  const downloadPDF = async () => {
    const blob = await pdf(<InvoicePDF data={data} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${data.invoiceNumber || 'draft'}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
      onClick={downloadPDF}
    >
      Download as PDF
    </button>
  );
};

export default DownloadPDFButton;
