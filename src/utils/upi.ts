/**
 * UPI payment links.
 *
 * A UPI QR code is nothing more than this deep link, encoded. Scanning it opens
 * the payer's UPI app with the payee, amount and reference already filled in --
 * which is the difference between "please transfer to A/C 50100..." and one tap.
 *
 * The format is NPCI's UPI Linking Specification:
 *
 *   upi://pay?pa=<vpa>&pn=<payee>&am=<amount>&cu=INR&tn=<note>
 *
 * Every value is percent-encoded to RFC 3986, not merely to what
 * encodeURIComponent does by default -- see `rfc3986` below. An under-encoded
 * `&` or `#` in a business name silently truncates the link, and the payer's
 * app then shows the wrong payee or no amount at all.
 *
 * Nothing here talks to a network. The link is built locally and rendered
 * locally; no VPA, amount or invoice number leaves the browser.
 */
import { InvoiceData } from '../types/invoice';
import { getDocumentType } from './documents';
import { computeTotals } from './totals';

/** UPI settles in rupees only. A EUR invoice gets no QR, deliberately. */
export const UPI_CURRENCY = 'INR';

/**
 * NPCI caps the payee name and transaction note at 50 characters. Longer
 * values are not an error in the spec, but PSP apps truncate them
 * inconsistently, so we truncate once, here, and both the PDF and the preview
 * show what the payer will actually see.
 */
const MAX_PAYEE_NAME = 50;
const MAX_NOTE = 50;

/**
 * Deliberately permissive. A virtual payment address is `handle@psp` --
 * `9876543210@ybl`, `acme.traders@okicici`, `merchant-01@paytm` -- and there is
 * no published list of valid PSP suffixes. This rejects the mistakes people
 * actually make (an email-style address with spaces, a bare phone number, a
 * missing @) without second-guessing a bank that launches a new handle.
 */
const UPI_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,255}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export const isValidUpiId = (value: string): boolean => UPI_ID_PATTERN.test(value.trim());

/**
 * encodeURIComponent leaves `!`, `'`, `(`, `)` and `*` alone: they are legal in
 * a URI but they are sub-delimiters, not unreserved characters, so a strict
 * parser on the PSP side may treat them as structure. Business names contain
 * all five ("Smith & Sons (Pvt) Ltd"), so they are escaped explicitly.
 */
const rfc3986 = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

export interface UpiLinkInput {
  upiId: string;
  /** The payee shown in the payer's app. Omitted from the link when blank. */
  payeeName?: string;
  /** Omitted when not a positive, finite number, so the payer types it in. */
  amount?: number;
  note?: string;
  currency: string;
}

/**
 * Returns null rather than a broken link when a QR would be wrong: a
 * non-rupee invoice, or a UPI ID that is not one. Callers use the null to
 * decide whether to render a QR at all, so there is exactly one place that
 * knows the rules.
 */
export const buildUpiLink = ({
  upiId,
  payeeName = '',
  amount,
  note = '',
  currency,
}: UpiLinkInput): string | null => {
  const vpa = upiId.trim();
  if (currency !== UPI_CURRENCY || !isValidUpiId(vpa)) return null;

  const params = [`pa=${rfc3986(vpa)}`];

  const name = payeeName.trim().slice(0, MAX_PAYEE_NAME);
  if (name) params.push(`pn=${rfc3986(name)}`);

  // Fixed to two decimals: UPI expects a plain decimal amount, so neither
  // locale grouping ("1,234.50") nor a bare integer is acceptable.
  if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
    params.push(`am=${amount.toFixed(2)}`);
  }

  params.push(`cu=${UPI_CURRENCY}`);

  const reference = note.trim().slice(0, MAX_NOTE);
  if (reference) params.push(`tn=${rfc3986(reference)}`);

  return `upi://pay?${params.join('&')}`;
};

/**
 * The link for a given invoice, so the preview and the PDF cannot disagree
 * about the amount being requested. The note carries the document number,
 * which is what lets the sender reconcile the payment against it.
 *
 * Returns null for a document that is not a demand for payment. A quotation
 * has not been agreed yet and a delivery challan is a movement note, so a
 * "scan to pay" code on either invites a transfer against a document that
 * does not ask for one -- see src/utils/documents.ts.
 */
export const invoiceUpiLink = (data: InvoiceData): string | null => {
  const docType = getDocumentType(data.docType);
  if (!docType.requestsPayment) return null;

  const reference = data.invoiceNumber.trim();
  return buildUpiLink({
    upiId: data.payment.upiId,
    payeeName: data.fromName,
    amount: computeTotals(data).total,
    note: reference ? `${docType.noun} ${reference}` : '',
    currency: data.currency,
  });
};
