/**
 * Indian GST: state codes, GSTIN validation, and which tax applies.
 *
 * Deliberately free of any dependency on InvoiceData -- the classifier takes
 * the four fields it needs structurally, so this module is also usable by the
 * standalone GST calculator page without dragging the invoice model in.
 *
 * The arithmetic is NOT here. Every number an invoice prints comes out of
 * utils/totals.ts, which is the single source of truth for it.
 *
 * A note on what this does and does not claim: the checksum below proves a
 * GSTIN is well-formed, not that it is registered, active, or the payer's.
 * Only the GST portal can tell you that.
 */

/**
 * GST state codes as used in the first two digits of a GSTIN.
 *
 * 25 (Daman and Diu) and 28 (undivided Andhra Pradesh) are deliberately
 * absent: both were retired when the states merged and split respectively, so
 * offering them in a picker would put a dead code on a new invoice. Old GSTINs
 * carrying them still validate -- isValidGstin checks the checksum, not
 * membership of this list.
 */
export interface IndianState {
  /** Two-digit GST state code. */
  code: string;
  name: string;
}

export const INDIAN_STATES: readonly IndianState[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

const STATE_BY_CODE = new Map(INDIAN_STATES.map((state) => [state.code, state]));

/** "Karnataka (29)", or '' for an unknown or empty code. */
export const stateName = (code: string): string => STATE_BY_CODE.get(code.trim())?.name ?? '';

export const stateLabel = (code: string): string => {
  const name = stateName(code);
  return name ? `${name} (${code.trim()})` : '';
};

/**
 * 15 characters: 2 state + 10 PAN + 1 entity number + 'Z' + 1 checksum.
 */
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const CHECKSUM_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * The GSTIN check digit, computed the way the GST portal does: weight
 * alternate characters by 1 and 2, fold each product back into base 36 by
 * adding its quotient to its remainder, and take the complement of the sum.
 *
 * Worth the twenty lines. A transposed pair of digits in a fifteen-character
 * number is invisible to a human proof-reader and passes any regex, and a
 * wrong GSTIN on a tax invoice is the client's problem to discover, months
 * later, when their input credit is denied.
 */
const checksumChar = (first14: string): string => {
  let sum = 0;
  for (let index = 0; index < first14.length; index += 1) {
    const value = CHECKSUM_ALPHABET.indexOf(first14[index]);
    if (value < 0) return '';
    const product = value * (index % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHECKSUM_ALPHABET[(36 - (sum % 36)) % 36];
};

export const isValidGstin = (value: string): boolean => {
  const gstin = value.trim().toUpperCase();
  if (!GSTIN_PATTERN.test(gstin)) return false;
  return checksumChar(gstin.slice(0, 14)) === gstin[14];
};

/** The state code a GSTIN declares, or '' if it is not well-formed enough to say. */
export const gstinStateCode = (value: string): string => {
  const gstin = value.trim().toUpperCase();
  if (!/^[0-9]{2}/.test(gstin)) return '';
  const code = gstin.slice(0, 2);
  return STATE_BY_CODE.has(code) ? code : '';
};

/**
 * Which tax an invoice carries.
 *
 * 'none' is not an error state -- it is every invoice that is not an Indian
 * GST invoice, which is most of them, and it prints a single "Tax" line
 * exactly as the tool always has.
 */
export type TaxTreatment = 'none' | 'cgst-sgst' | 'igst';

export interface TaxTreatmentInput {
  currency: string;
  supplierGstin: string;
  supplierState: string;
  placeOfSupply: string;
}

/**
 * Section 8 of the IGST Act in one line: supply within a state is a CGST +
 * SGST supply, supply across states is an IGST supply.
 *
 * Gated on INR because GST is levied in rupees; an export invoiced in dollars
 * is zero-rated and carries no split, so showing one would be wrong.
 *
 * Falls back to 'none' when the GSTIN is present but the states are not, so a
 * half-filled form prints a plain tax line rather than guessing at a split.
 * getReadiness() is what tells the user to finish it.
 */
export const taxTreatment = ({
  currency,
  supplierGstin,
  supplierState,
  placeOfSupply,
}: TaxTreatmentInput): TaxTreatment => {
  if (currency !== 'INR' || !supplierGstin.trim()) return 'none';
  const from = supplierState.trim();
  const to = placeOfSupply.trim();
  if (!from || !to) return 'none';
  return from === to ? 'cgst-sgst' : 'igst';
};

/** Whether the GST-specific fields are worth showing at all. */
export const isGstCurrency = (currency: string): boolean => currency === 'INR';

// --- Rule 46(b): the serial number ----------------------------------------

/**
 * "A consecutive serial number not exceeding sixteen characters, in one or
 * multiple series, containing alphabets or numerals or special characters-
 * hyphen or dash and slash symbolised as '-' and '/' respectively, and any
 * combination thereof, unique for a financial year." -- Rule 46(b), CGST
 * Rules 2017.
 *
 * Two things about that sentence catch people out, and neither is caught by
 * any accounting tool or rejected by the GST portal at the point of issue:
 * only *two* punctuation marks are legal, and sixteen characters counts the
 * hyphens and slashes too. "INV#0001" and "DEWIRIDE/2026-27/00001" both look
 * entirely normal and are both breaches.
 */
export const INVOICE_NUMBER_MAX_LENGTH = 16;

const LEGAL_INVOICE_NUMBER_CHAR = /[A-Za-z0-9/-]/;

const describeChar = (char: string): string => {
  if (char === ' ') return 'the space';
  if (char === '_') return 'the underscore';
  if (char === '.') return 'the full stop';
  if (char === '#') return 'the hash';
  return `"${char}"`;
};

/**
 * What is wrong with this document number under Rule 46(b), or '' if nothing
 * is.
 *
 * Reported rather than enforced. The rule binds a GST tax invoice, and this
 * tool also produces quotations, proformas and invoices for businesses with
 * no Indian registration at all -- so rewriting what someone typed, or
 * refusing it, would be answering a question they did not ask.
 */
export const invoiceNumberIssue = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.length > INVOICE_NUMBER_MAX_LENGTH) {
    return `Rule 46(b) caps a tax invoice number at ${INVOICE_NUMBER_MAX_LENGTH} characters, counting hyphens and slashes. This one is ${trimmed.length}.`;
  }

  const illegal = [...new Set(trimmed.split('').filter((char) => !LEGAL_INVOICE_NUMBER_CHAR.test(char)))];
  if (illegal.length) {
    return `Rule 46(b) allows letters, digits, hyphen and slash only. Remove ${illegal
      .map(describeChar)
      .join(', ')}.`;
  }

  return '';
};
