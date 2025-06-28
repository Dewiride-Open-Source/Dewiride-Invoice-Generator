import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function downloadInvoiceAsPDF(elementId: string, fileName = 'invoice.pdf') {
  const input = document.getElementById(elementId);
  if (!input) return;
  // Save original styles
  const originalBg = input.style.backgroundColor;
  const originalColor = input.style.color;
  // Force supported colors for html2canvas
  input.style.backgroundColor = '#fff';
  input.style.color = '#111';
  // Render to canvas
  const canvas = await html2canvas(input, { scale: 2 });
  // Restore original styles
  input.style.backgroundColor = originalBg;
  input.style.color = originalColor;
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  pdf.save(fileName);
}
