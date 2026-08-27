import { DEFAULT_CURRENCY, isSupportedCurrency } from '../utils/currency';
import { isGstCurrency } from '../utils/gst';
import { isStoredImage } from '../utils/image';
import { DEFAULT_TEMPLATE, TemplateId, isTemplateId } from '../utils/templates';

export interface InvoiceItem {
  /**
   * Stable per-row identity. Previously rows were keyed by array index, which
   * meant removing a row re-associated every later row's React state, label
   * ids and focus target with the wrong item.
   */
  id: string;
  description: string;
  quantity: number;
  price: number;
  /**
   * Percentage off this line, 0-100.
   *
   * A percentage rather than an amount, because it survives a change of
   * quantity: "10% off" stays 10% off when three units become thirty, whereas
   * a flat 500 silently becomes a rounding error. Rule 46 requires a discount
   * to be shown on the face of the invoice and deducted before tax, which is
   * what utils/totals.ts does with it.
   */
  discount: number;
  /**
   * HSN (goods) or SAC (services) code. Rule 46 requires it on a GST invoice;
   * how many digits depends on the supplier's turnover, so this is a free-text
   * field rather than a validated one.
   */
  hsnSac: string;
}

/**
 * How the sender wants to be paid.
 *
 * Grouped rather than flattened onto InvoiceData because these seven fields are
 * one decision -- they are shown together, printed together, and are together
 * the difference between an invoice and a document that merely states a debt.
 *
 * All optional. An invoice with no payment block is still a valid invoice, so
 * none of this appears in getReadiness().
 */
export interface PaymentDetails {
  /** The account holder, when it differs from the trading name. */
  accountName: string;
  bankName: string;
  accountNumber: string;
  /** India. */
  ifsc: string;
  /** International wires. */
  swift: string;
  iban: string;
  /** India. Drives the UPI QR -- see src/utils/upi.ts. */
  upiId: string;
}

export interface InvoiceData {
  fromName: string;
  fromAddress: string;
  toName: string;
  toAddress: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  tax: number;
  currency: string;
  /**
   * A PNG or JPEG data URI, or ''. Always produced by prepareImage, which caps
   * the size; never a remote URL, so the PDF and the preview stay offline.
   */
  logo: string;
  payment: PaymentDetails;
  /**
   * Freight or delivery, added after tax. See utils/totals.ts -- this is a
   * simplification, and a deliberate one.
   */
  shipping: number;
  /** Free text printed under the totals. */
  notes: string;
  /** "Net 30", or whatever the arrangement is. Printed beside the notes. */
  paymentTerms: string;
  /** The supplier's GSTIN. Its presence is what makes this a tax invoice. */
  supplierGstin: string;
  buyerGstin: string;
  /** GST state code the supply is made *from*. See utils/gst.ts. */
  supplierState: string;
  /** GST state code the supply is made *to*. Drives CGST+SGST vs IGST. */
  placeOfSupply: string;
  /** A data URI, as for `logo`. Rule 46 wants a signature on a tax invoice. */
  signature: string;
  /** Which design the preview and the PDF draw. See utils/templates.ts. */
  template: TemplateId;
}

export const createEmptyPayment = (): PaymentDetails => ({
  accountName: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  swift: '',
  iban: '',
  upiId: '',
});

/**
 * Print order and labels, defined once. The preview and the PDF both render
 * from this, so a label cannot say "IFSC" on screen and "IFSC code" on paper.
 */
const PAYMENT_FIELD_LABELS: readonly (readonly [keyof PaymentDetails, string])[] = [
  ['accountName', 'Account holder'],
  ['bankName', 'Bank'],
  ['accountNumber', 'Account number'],
  ['ifsc', 'IFSC'],
  ['swift', 'SWIFT / BIC'],
  ['iban', 'IBAN'],
  ['upiId', 'UPI ID'],
];

export interface PaymentRow {
  key: keyof PaymentDetails;
  label: string;
  value: string;
}

/** The filled-in payment fields, in print order. Blank fields are dropped. */
export const paymentRows = (payment: PaymentDetails): PaymentRow[] =>
  PAYMENT_FIELD_LABELS.map(([key, label]) => ({ key, label, value: payment[key].trim() })).filter(
    (row) => row.value.length > 0,
  );

export const createItem = (): InvoiceItem => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`,
  description: '',
  quantity: 1,
  price: 0,
  discount: 0,
  hsnSac: '',
});

/** Local calendar date as yyyy-mm-dd, which is what <input type="date"> wants. */
export const todayIso = (): string => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export const createEmptyInvoice = (): InvoiceData => ({
  fromName: '',
  fromAddress: '',
  toName: '',
  toAddress: '',
  invoiceNumber: '',
  invoiceDate: '',
  dueDate: '',
  items: [createItem()],
  tax: 0,
  currency: DEFAULT_CURRENCY,
  logo: '',
  payment: createEmptyPayment(),
  shipping: 0,
  notes: '',
  paymentTerms: '',
  supplierGstin: '',
  buyerGstin: '',
  supplierState: '',
  placeOfSupply: '',
  signature: '',
  template: DEFAULT_TEMPLATE,
});

/**
 * Coerces whatever came out of sessionStorage into a usable invoice. The draft
 * survives deploys, so a restored object may predate the current shape or have
 * been edited by hand.
 */
export const normaliseInvoice = (raw: unknown): InvoiceData => {
  const base = createEmptyInvoice();
  if (typeof raw !== 'object' || raw === null) return base;
  const draft = raw as Partial<InvoiceData>;

  const rawItems: unknown[] = Array.isArray(draft.items) ? (draft.items as unknown[]) : [];
  const items = rawItems.length
    ? rawItems
        .filter((item): item is Partial<InvoiceItem> => typeof item === 'object' && item !== null)
        .map((item) => ({
          ...createItem(),
          ...(typeof item.id === 'string' ? { id: item.id } : {}),
          description: typeof item.description === 'string' ? item.description : '',
          quantity: Number.isFinite(item.quantity) ? Number(item.quantity) : 1,
          price: Number.isFinite(item.price) ? Number(item.price) : 0,
          discount: Number.isFinite(item.discount) ? Number(item.discount) : 0,
          hsnSac: typeof item.hsnSac === 'string' ? item.hsnSac : '',
        }))
    : [];

  const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);

  // Not merely coerced: validated. A history export is a file the user can
  // edit, so this is the boundary where a `logo` of "https://tracker.example/x"
  // or an SVG carrying markup has to be dropped rather than rendered.
  const rawPayment = (
    typeof draft.payment === 'object' && draft.payment !== null ? draft.payment : {}
  ) as Partial<PaymentDetails>;
  const payment = createEmptyPayment();
  for (const key of Object.keys(payment) as (keyof PaymentDetails)[]) {
    payment[key] = str(rawPayment[key]);
  }

  return {
    fromName: str(draft.fromName),
    fromAddress: str(draft.fromAddress),
    toName: str(draft.toName),
    toAddress: str(draft.toAddress),
    invoiceNumber: str(draft.invoiceNumber),
    invoiceDate: str(draft.invoiceDate),
    dueDate: str(draft.dueDate),
    items: items.length ? items : base.items,
    tax: Number.isFinite(draft.tax) ? Number(draft.tax) : 0,
    currency:
      typeof draft.currency === 'string' && isSupportedCurrency(draft.currency)
        ? draft.currency
        : base.currency,
    logo: isStoredImage(draft.logo) ? draft.logo : '',
    signature: isStoredImage(draft.signature) ? draft.signature : '',
    payment,
    shipping: Number.isFinite(draft.shipping) ? Number(draft.shipping) : 0,
    notes: str(draft.notes),
    paymentTerms: str(draft.paymentTerms),
    // Upper-cased on the way in as well as in the form: a GSTIN restored from
    // a hand-edited export has not been through the input's onChange.
    supplierGstin: str(draft.supplierGstin).toUpperCase(),
    buyerGstin: str(draft.buyerGstin).toUpperCase(),
    supplierState: str(draft.supplierState),
    placeOfSupply: str(draft.placeOfSupply),
    // A design that was renamed or removed falls back rather than rendering a
    // colourless invoice from an id nothing recognises.
    template: isTemplateId(draft.template) ? draft.template : DEFAULT_TEMPLATE,
  };
};

export interface InvoiceReadiness {
  complete: boolean;
  /** Human-readable names of what is still required, in form order. */
  missing: string[];
}

/**
 * What still has to be filled in before the invoice is worth sending.
 *
 * Exposed in the UI as a status line and as a `data-invoice-complete`
 * attribute. The attribute is not decoration: an automated agent driving this
 * page otherwise has no deterministic way to tell "finished" from "half-filled"
 * short of re-implementing this rule, and a screen-reader user has no way to
 * tell at all.
 */
export const getReadiness = (data: InvoiceData): InvoiceReadiness => {
  const missing: string[] = [];
  if (!data.fromName.trim()) missing.push('your business name');
  if (!data.toName.trim()) missing.push('client name');
  if (!data.invoiceNumber.trim()) missing.push('invoice number');
  if (!data.invoiceDate) missing.push('invoice date');
  if (!data.items.some((item) => item.description.trim() && item.quantity > 0 && item.price > 0)) {
    missing.push('at least one item with a quantity and price');
  }
  // Only once a GSTIN says this is a tax invoice. Until then the two state
  // fields are irrelevant and demanding them would block every ordinary
  // invoice on a question that does not apply to it.
  if (isGstCurrency(data.currency) && data.supplierGstin.trim()) {
    if (!data.supplierState.trim()) missing.push('the state you supply from');
    if (!data.placeOfSupply.trim()) missing.push('place of supply');
  }
  return { complete: missing.length === 0, missing };
};
