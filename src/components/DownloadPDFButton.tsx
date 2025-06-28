import React from 'react';
import { downloadInvoiceAsPDF } from '../utils/pdf';

interface DownloadPDFButtonProps {
  targetId: string;
}

const DownloadPDFButton: React.FC<DownloadPDFButtonProps> = ({ targetId }) => {
  return (
    <button
      type="button"
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
      onClick={() => downloadInvoiceAsPDF(targetId)}
    >
      Download as PDF
    </button>
  );
};

export default DownloadPDFButton;
