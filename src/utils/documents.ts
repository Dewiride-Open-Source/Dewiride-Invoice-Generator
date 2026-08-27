/**
 * What kind of document is being produced.
 *
 * An invoice, a proforma invoice, a quotation and a delivery challan are the
 * same table of line items wrapped in four different legal meanings. Only one
 * of them creates a tax liability, only two of them ask for money, and calling
 * any of the other three a "tax invoice" is a real error rather than a
 * cosmetic one:
 *
 * - A **proforma invoice** is an offer. No GST is payable on it, it must not be
 *   entered in the books as a sale, and the recipient cannot claim input tax
 *   credit against it. It converts into a tax invoice when the supply happens.
 * - A **quotation** is an offer too, but a commercial rather than a shipping
 *   one, and it expires. Its date field is a validity date, not a payment due
 *   date.
 * - A **delivery challan** (CGST Rule 55) accompanies goods that move without
 *   a supply taking place -- job work, goods on approval, transport in
 *   batches. It is not a demand for payment.
 *
 * So `taxHeading` differs from `heading` for exactly one of the four. That is
 * not an oversight to be tidied up later: it is the rule.
 */

export type DocumentTypeId = 'invoice' | 'proforma' | 'quotation' | 'delivery-challan';

export interface DocumentType {
  id: DocumentTypeId;
  /** Printed at the top of the preview and the PDF. */
  heading: string;
  /**
   * The heading once a supplier GSTIN is present. Identical to `heading` for
   * everything except an invoice -- adding a GSTIN to a quotation does not
   * make it a tax invoice, and printing that word would misrepresent the
   * document to whoever receives it.
   */
  taxHeading: string;
  /** The word for it in running text, the file name and the UPI note. */
  noun: string;
  /** Form label. "Invoice number" is wrong on a challan. */
  numberLabel: string;
  /** Form label. A quotation has a validity date, not a payment due date. */
  dueDateLabel: string;
  /** Printed date label on the document itself. */
  dueDatePrintLabel: string;
  /**
   * Whether this document asks to be paid. A "scan to pay" QR on a goods
   * movement note is not a small styling difference; it invites someone to
   * transfer money against a document that is not a demand for it.
   */
  requestsPayment: boolean;
  /**
   * Printed under the totals, where the document's status is not obvious from
   * its heading alone. Absent for an ordinary invoice, which needs no caveat.
   */
  disclaimer?: string;
  /** Download file name stem. */
  fileStem: string;
}

const TYPES: readonly DocumentType[] = [
  {
    id: 'invoice',
    heading: 'INVOICE',
    taxHeading: 'TAX INVOICE',
    noun: 'Invoice',
    numberLabel: 'Invoice number',
    dueDateLabel: 'Due date',
    dueDatePrintLabel: 'Due date',
    requestsPayment: true,
    fileStem: 'invoice',
  },
  {
    id: 'proforma',
    heading: 'PROFORMA INVOICE',
    taxHeading: 'PROFORMA INVOICE',
    noun: 'Proforma',
    numberLabel: 'Proforma number',
    dueDateLabel: 'Valid until',
    dueDatePrintLabel: 'Valid until',
    requestsPayment: true,
    disclaimer:
      'This is a proforma invoice, not a tax invoice. No GST is payable against this document and no input tax credit may be claimed on it. A tax invoice will be issued when the supply is made.',
    fileStem: 'proforma-invoice',
  },
  {
    id: 'quotation',
    heading: 'QUOTATION',
    taxHeading: 'QUOTATION',
    noun: 'Quotation',
    numberLabel: 'Quotation number',
    dueDateLabel: 'Valid until',
    dueDatePrintLabel: 'Valid until',
    requestsPayment: false,
    disclaimer:
      'This is a quotation, not a tax invoice. Prices hold until the date shown above and no tax is payable against this document.',
    fileStem: 'quotation',
  },
  {
    id: 'delivery-challan',
    heading: 'DELIVERY CHALLAN',
    taxHeading: 'DELIVERY CHALLAN',
    noun: 'Challan',
    numberLabel: 'Challan number',
    dueDateLabel: 'Date of dispatch',
    dueDatePrintLabel: 'Dispatched',
    requestsPayment: false,
    disclaimer:
      'Issued under Rule 55 of the CGST Rules for the movement of goods. This is not a tax invoice and is not a demand for payment.',
    fileStem: 'delivery-challan',
  },
];

const BY_ID = new Map(TYPES.map((type) => [type.id, type]));

export const DOCUMENT_TYPES = TYPES;
export const DEFAULT_DOCUMENT_TYPE: DocumentTypeId = 'invoice';

export const isDocumentTypeId = (value: unknown): value is DocumentTypeId =>
  typeof value === 'string' && BY_ID.has(value as DocumentTypeId);

/** Falls back rather than rendering an untitled document from an unknown id. */
export const getDocumentType = (id: string): DocumentType =>
  BY_ID.get(id as DocumentTypeId) ?? BY_ID.get(DEFAULT_DOCUMENT_TYPE)!;

/**
 * The heading to print. `isTaxInvoice` means a supplier GSTIN is present --
 * see src/utils/gst.ts -- which upgrades an invoice and nothing else.
 */
export const documentHeading = (type: DocumentType, isTaxInvoice: boolean): string =>
  isTaxInvoice ? type.taxHeading : type.heading;
