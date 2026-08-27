import { test, expect, Page } from '@playwright/test';
import { InvoiceData, createEmptyInvoice, normaliseInvoice } from '../src/types/invoice';
import {
  DOCUMENT_TYPES,
  DocumentTypeId,
  documentHeading,
  getDocumentType,
} from '../src/utils/documents';
import { invoiceNumberIssue } from '../src/utils/gst';
import { invoiceUpiLink } from '../src/utils/upi';

/**
 * Four documents out of one editor.
 *
 * The property these tests exist to protect is narrow and important: a GSTIN
 * upgrades an invoice to a TAX INVOICE and upgrades nothing else. A quotation
 * that prints those two words because someone filled in a GSTIN is not a
 * styling bug -- it misrepresents an offer as a tax document to whoever
 * receives it, and it is exactly the failure a shared component invites.
 */

const KA_GSTIN = '29AAPFU0939F1ZR';

const invoice = (over: Partial<InvoiceData> = {}): InvoiceData => ({
  ...createEmptyInvoice(),
  fromName: 'Acme Consulting Pvt Ltd',
  fromAddress: '12 MG Road, Bengaluru 560001',
  toName: 'Globex Manufacturing Pvt Ltd',
  toAddress: '900 Andheri Kurla Road, Mumbai 400059',
  invoiceNumber: 'INV-2026-042',
  invoiceDate: '2026-08-27',
  dueDate: '2026-09-26',
  tax: 18,
  supplierGstin: KA_GSTIN,
  supplierState: '29',
  placeOfSupply: '29',
  items: [
    {
      id: 'a',
      description: 'Platform engineering retainer',
      quantity: 1,
      price: 100000,
      discount: 0,
      hsnSac: '998314',
    },
  ],
  ...over,
});

// --------------------------------------------------------------------------
// The type table
// --------------------------------------------------------------------------

test('an unrecognised document type falls back rather than rendering untitled', () => {
  expect(getDocumentType('not-a-type').id).toBe('invoice');
  expect(getDocumentType('').heading).toBe('INVOICE');
  expect(normaliseInvoice({ docType: 'wat' }).docType).toBe('invoice');
  expect(normaliseInvoice({ docType: 'quotation' }).docType).toBe('quotation');
});

test('only an invoice becomes a tax invoice', () => {
  for (const type of DOCUMENT_TYPES) {
    if (type.id === 'invoice') {
      expect(documentHeading(type, false)).toBe('INVOICE');
      expect(documentHeading(type, true)).toBe('TAX INVOICE');
      continue;
    }
    // A GSTIN on a quotation does not make the quotation a tax invoice, and
    // the heading must not claim it does.
    expect(type.taxHeading, `${type.id} taxHeading`).toBe(type.heading);
    expect(documentHeading(type, true)).not.toContain('TAX INVOICE');
  }
});

test('every document that is not an invoice says on its face what it is not', () => {
  for (const type of DOCUMENT_TYPES) {
    if (type.id === 'invoice') {
      expect(type.disclaimer).toBeUndefined();
    } else {
      expect(type.disclaimer, `${type.id} disclaimer`).toBeTruthy();
      expect(type.disclaimer).toContain('not a tax invoice');
    }
  }
});

test('a document that does not ask for money carries no payment QR', () => {
  const withUpi = { payment: { ...createEmptyInvoice().payment, upiId: 'acme@okhdfcbank' } };

  // A quotation has not been agreed and a challan is a movement note. A
  // "scan to pay" code on either invites a transfer against a document that
  // is not a demand for one.
  expect(invoiceUpiLink(invoice({ ...withUpi, docType: 'quotation' }))).toBeNull();
  expect(invoiceUpiLink(invoice({ ...withUpi, docType: 'delivery-challan' }))).toBeNull();

  expect(invoiceUpiLink(invoice({ ...withUpi, docType: 'invoice' }))).toContain('pa=acme%40okhdfcbank');
  // The note names the document, so the payer's statement reconciles against
  // the right one.
  expect(invoiceUpiLink(invoice({ ...withUpi, docType: 'invoice' }))).toContain(
    'tn=Invoice%20INV-2026-042',
  );
  expect(invoiceUpiLink(invoice({ ...withUpi, docType: 'proforma' }))).toContain(
    'tn=Proforma%20INV-2026-042',
  );
});

// --------------------------------------------------------------------------
// Rule 46(b)
// --------------------------------------------------------------------------

test('Rule 46(b) rejects the characters people actually use', () => {
  expect(invoiceNumberIssue('')).toBe('');
  expect(invoiceNumberIssue('INV-2026-042')).toBe('');
  expect(invoiceNumberIssue('ACME/2026-27/1')).toBe('');
  expect(invoiceNumberIssue('inv1')).toBe('');

  // Only hyphen and slash are legal punctuation.
  expect(invoiceNumberIssue('INV#0001')).toContain('hyphen and slash');
  expect(invoiceNumberIssue('INV_2026_01')).toContain('underscore');
  expect(invoiceNumberIssue('INV 001')).toContain('space');
  expect(invoiceNumberIssue('ACME.2026.001')).toContain('full stop');

  // Sixteen characters counts the punctuation: this one is twenty-one.
  expect(invoiceNumberIssue('DEWIRIDE/2026-27/00001')).toContain('16 characters');
  // Exactly at the limit is fine.
  expect(invoiceNumberIssue('ABCDEFGH12345678')).toBe('');
});

// --------------------------------------------------------------------------
// The pages
// --------------------------------------------------------------------------

const showPreview = async (page: Page) => {
  const tab = page.getByRole('tab', { name: 'Preview' });
  if (await tab.isVisible()) await tab.click();
};

const showEditor = async (page: Page) => {
  const tab = page.getByRole('tab', { name: 'Edit' });
  if (await tab.isVisible()) await tab.click();
};

/**
 * Seeds the draft before the app boots.
 *
 * addInitScript rather than goto-then-evaluate: the app's own persist effect
 * runs on mount and would overwrite a value written after navigation, which
 * silently turned an earlier version of these tests into assertions about an
 * empty invoice.
 */
const seed = async (page: Page, path: string, data: Partial<InvoiceData> = {}) => {
  const seeded = invoice(data);
  await page.addInitScript((value) => {
    sessionStorage.setItem('invoice-data', JSON.stringify(value));
  }, seeded);
  await page.goto(path);
  // Guard, not decoration: without it a failed seed leaves an empty invoice
  // that still renders, and every assertion below passes vacuously.
  await expect(page.getByTestId('invoice-number')).toHaveValue(seeded.invoiceNumber);
};

/**
 * The message wired to the field itself.
 *
 * Not getByText: three of these pages discuss Rule 46(b) in their body copy,
 * so a text match finds the prose and passes whether or not the field is
 * flagged. The accessible description is what a screen-reader user actually
 * gets, which makes it both the precise locator and the thing worth asserting.
 */
const numberFieldError = async (page: Page) => {
  const field = page.getByTestId('invoice-number');
  const invalid = await field.getAttribute('aria-invalid');
  if (invalid !== 'true') return '';
  return (await field.evaluate((el) => {
    const id = el.getAttribute('aria-describedby');
    return id ? (document.getElementById(id)?.textContent ?? '') : '';
  })) as string;
};

const PAGES: readonly { path: string; docType: DocumentTypeId; heading: string }[] = [
  { path: '/', docType: 'invoice', heading: 'TAX INVOICE' },
  { path: '/gst-invoice-generator/', docType: 'invoice', heading: 'TAX INVOICE' },
  { path: '/proforma-invoice-format/', docType: 'proforma', heading: 'PROFORMA INVOICE' },
  { path: '/quotation-format/', docType: 'quotation', heading: 'QUOTATION' },
  { path: '/delivery-challan-format/', docType: 'delivery-challan', heading: 'DELIVERY CHALLAN' },
];

for (const { path, docType, heading } of PAGES) {
  test(`${path} produces a ${docType}, whatever the restored draft said`, async ({ page }) => {
    // The seeded draft is an invoice with a GSTIN on it. The page's own type
    // has to win, or the preset is decorative.
    await seed(page, path, { docType: 'invoice' });
    await showPreview(page);
    await expect(page.getByTestId('preview-heading')).toHaveText(heading);

    const type = getDocumentType(docType);
    if (type.disclaimer) {
      await expect(page.getByTestId('preview-doc-disclaimer')).toContainText('not a tax invoice');
    } else {
      await expect(page.getByTestId('preview-doc-disclaimer')).toHaveCount(0);
    }
  });
}

test('a UPI ID puts a QR on an invoice and on a proforma, and on nothing else', async ({ page }) => {
  const withUpi = { payment: { ...createEmptyInvoice().payment, upiId: 'acme@okhdfcbank' } };

  for (const path of ['/gst-invoice-generator/', '/proforma-invoice-format/']) {
    await seed(page, path, withUpi);
    await showPreview(page);
    await expect(page.getByTestId('preview-upi-qr'), `${path} should show a QR`).toBeVisible();
  }

  for (const path of ['/quotation-format/', '/delivery-challan-format/']) {
    await seed(page, path, withUpi);
    await showPreview(page);
    await expect(page.getByTestId('preview-upi-qr'), `${path} must not show a QR`).toHaveCount(0);
  }
});

test('the fields are labelled for the document being made', async ({ page }) => {
  await seed(page, '/quotation-format/');
  await showEditor(page);
  // "Due date" on a quotation is wrong: a quote is not asking to be paid, it
  // is stating how long the price holds.
  await expect(page.getByLabel('Valid until')).toBeVisible();
  await expect(page.getByLabel('Quotation number')).toBeVisible();
  await expect(page.getByLabel('Due date')).toHaveCount(0);

  await seed(page, '/delivery-challan-format/');
  await showEditor(page);
  await expect(page.getByLabel('Challan number')).toBeVisible();
  await expect(page.getByLabel('Date of dispatch')).toBeVisible();
});

test('the PDF is named for the document it contains', async ({ page }) => {
  await seed(page, '/quotation-format/', { invoiceNumber: 'QTN-2026-004' });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.getByRole('button', { name: /download as pdf/i }).first().click(),
  ]);
  // Not invoice-QTN-2026-004.pdf. The file name is what the recipient sees in
  // their downloads folder eighteen months later.
  expect(download.suggestedFilename()).toBe('quotation-QTN-2026-004.pdf');
});

test('a tax invoice number that breaches Rule 46(b) is flagged where it is typed', async ({
  page,
}) => {
  await seed(page, '/gst-invoice-generator/');
  await showEditor(page);

  const field = page.getByTestId('invoice-number');

  await field.fill('INV#0001');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  expect(await numberFieldError(page)).toContain('letters, digits, hyphen and slash');

  await field.fill('DEWIRIDE/2026-27/00001');
  expect(await numberFieldError(page)).toContain('16 characters');

  await field.fill('INV-2026-042');
  expect(await numberFieldError(page)).toBe('');
});

test('Rule 46(b) is not applied to documents it does not govern', async ({ page }) => {
  // A US invoice numbered ACME_2026.001 is perfectly fine, and flagging it
  // would be inventing a rule.
  await seed(page, '/', { supplierGstin: '', currency: 'USD' });
  await showEditor(page);
  await page.getByTestId('invoice-number').fill('ACME_2026.001');
  expect(await numberFieldError(page)).toBe('');

  // Nor to a quotation, which is not a tax invoice however registered you are.
  await seed(page, '/quotation-format/');
  await showEditor(page);
  await page.getByTestId('invoice-number').fill('QTN#0001');
  expect(await numberFieldError(page)).toBe('');
});

test('each document type keeps its own number series', async ({ page }) => {
  await seed(page, '/gst-invoice-generator/', { invoiceNumber: 'INV-2026-042' });
  await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.getByRole('button', { name: /download as pdf/i }).first().click(),
  ]);

  // Downloading saved INV-2026-042 to history. A second invoice continues that
  // series...
  await page.addInitScript(() => sessionStorage.removeItem('invoice-data'));
  await page.goto('/gst-invoice-generator/');
  await expect(page.getByTestId('invoice-number')).toHaveValue('INV-2026-043');

  // ...but a quotation must not, because every number spent on one leaves a
  // gap in a tax invoice series that is required to be consecutive.
  await page.goto('/quotation-format/');
  await expect(page.getByTestId('invoice-number')).toHaveValue('');
});
