import { InvoiceData, InvoiceItem } from '../types/invoice';
import { roundMoney } from './currency';
import { TaxTreatment, taxTreatment } from './gst';

/** One line of tax, already labelled. */
export interface TaxLine {
  /** Stable React key and test hook: 'cgst' | 'sgst' | 'igst' | 'tax'. */
  key: string;
  /** "CGST (9%)". Built here so the preview and the PDF cannot word it differently. */
  label: string;
  rate: number;
  amount: number;
}

export interface InvoiceTotals {
  /** Sum of the line amounts, before discount. */
  subtotal: number;
  /** Sum of the line discounts, as a positive number. */
  discount: number;
  /** What tax is charged on: subtotal - discount. */
  taxable: number;
  /** Sum of taxLines. */
  taxAmount: number;
  taxLines: TaxLine[];
  shipping: number;
  total: number;
  treatment: TaxTreatment;
}

/**
 * The single source of truth for invoice arithmetic. The same three lines used
 * to be copy-pasted into InvoicePreview, InvoicePDF, the download button and
 * the page's analytics, which meant the screen, the PDF and the tracked value
 * could drift apart.
 *
 * Two rules govern everything below.
 *
 * **Round at every boundary.** Each figure an invoice prints is rounded to the
 * currency's smallest real unit before it is summed, so the column of numbers
 * on the page adds up to the total on the page. Summing first and rounding for
 * display is what makes a printed invoice fail its own arithmetic by a paisa.
 *
 * **Discount before tax, shipping after.** The first is required -- GST is
 * charged on the value net of any discount shown on the invoice. The second is
 * a simplification: where freight is part of a composite supply, GST law says
 * it is taxable at the rate of the principal supply, so an invoice that
 * charges shipping on a taxable supply should really tax it too. The UI says
 * so at the field, and the disclaimer says so on the page.
 */
const clampRate = (rate: number): number =>
  Number.isFinite(rate) ? Math.min(100, Math.max(0, rate)) : 0;

const finite = (value: number): number => (Number.isFinite(value) ? value : 0);

/** Quantity x price, before any discount, at full precision. */
const gross = (item: InvoiceItem): number => finite(item.quantity) * finite(item.price);

/** What the Amount column prints: quantity x price, rounded. */
export const lineTotal = (item: InvoiceItem, currency: string): number =>
  roundMoney(gross(item), currency);

/** What the Discount column prints, as a positive number. */
export const lineDiscount = (item: InvoiceItem, currency: string): number =>
  roundMoney((gross(item) * clampRate(item.discount)) / 100, currency);

/** "18", "2.5" -- never "2.50" or "18.00". */
export const formatRate = (rate: number): string => String(Number(rate.toFixed(3)));

/**
 * The tax lines for an invoice.
 *
 * CGST and SGST are each computed at half the rate against the taxable value,
 * rather than by halving one total. That is what the statute says happens --
 * two levies of half the rate each -- and it means the two printed halves are
 * each independently correct, and the tax total is by construction their sum.
 *
 * Exported because the standalone GST calculator needs the same split. A
 * second implementation of it living on /tools/gst-calculator/ would be free
 * to disagree with the invoices this site produces, which is the one thing a
 * tax calculator must never do.
 */
export const buildTaxLines = (
  taxable: number,
  rate: number,
  treatment: TaxTreatment,
  currency: string,
): TaxLine[] => {
  const at = (percent: number) => roundMoney((taxable * percent) / 100, currency);

  if (treatment === 'cgst-sgst') {
    const half = rate / 2;
    return [
      { key: 'cgst', label: `CGST (${formatRate(half)}%)`, rate: half, amount: at(half) },
      { key: 'sgst', label: `SGST (${formatRate(half)}%)`, rate: half, amount: at(half) },
    ];
  }
  if (treatment === 'igst') {
    return [{ key: 'igst', label: `IGST (${formatRate(rate)}%)`, rate, amount: at(rate) }];
  }
  return [{ key: 'tax', label: `Tax (${formatRate(rate)}%)`, rate, amount: at(rate) }];
};

export const computeTotals = (data: InvoiceData): InvoiceTotals => {
  const currency = data.currency;
  const subtotal = roundMoney(
    data.items.reduce((sum, item) => sum + lineTotal(item, currency), 0),
    currency,
  );
  const discount = roundMoney(
    data.items.reduce((sum, item) => sum + lineDiscount(item, currency), 0),
    currency,
  );
  const taxable = roundMoney(subtotal - discount, currency);

  const rate = clampRate(data.tax);
  const treatment = taxTreatment(data);
  const taxLines = buildTaxLines(taxable, rate, treatment, currency);
  const taxAmount = roundMoney(
    taxLines.reduce((sum, line) => sum + line.amount, 0),
    currency,
  );

  // Negative shipping would be a discount by another name, and one that
  // escapes the pre-tax deduction the discount column is for.
  const shipping = roundMoney(Math.max(0, finite(data.shipping)), currency);

  return {
    subtotal,
    discount,
    taxable,
    taxAmount,
    taxLines,
    shipping,
    total: roundMoney(taxable + taxAmount + shipping, currency),
    treatment,
  };
};
