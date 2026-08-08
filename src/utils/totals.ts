import { InvoiceData, InvoiceItem } from '../types/invoice';

export interface InvoiceTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export const lineTotal = (item: InvoiceItem): number => item.quantity * item.price;

/**
 * The single source of truth for invoice arithmetic. The same three lines used
 * to be copy-pasted into InvoicePreview, InvoicePDF, the download button and
 * the page's analytics, which meant the screen, the PDF and the tracked value
 * could drift apart.
 */
export const computeTotals = (data: InvoiceData): InvoiceTotals => {
  const subtotal = data.items.reduce((sum, item) => sum + lineTotal(item), 0);
  const taxAmount = subtotal * (data.tax / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
};
