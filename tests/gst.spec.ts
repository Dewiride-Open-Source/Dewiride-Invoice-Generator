import { test, expect, Download, Page } from '@playwright/test';
import { inflateSync } from 'node:zlib';
import { InvoiceData, createEmptyInvoice, getReadiness, normaliseInvoice } from '../src/types/invoice';
import { amountInWords } from '../src/utils/amountInWords';
import { formatCurrency, roundMoney } from '../src/utils/currency';
import { gstinStateCode, isValidGstin, taxTreatment } from '../src/utils/gst';
import { computeTotals, lineDiscount, lineTotal } from '../src/utils/totals';

/**
 * GST: the split, the discount, the rounding, and the amount in words.
 *
 * The arithmetic tests here are the important ones. A wrong CGST/SGST split or
 * a subtotal that misses the printed column by a paisa is not a cosmetic bug on
 * a tax invoice -- it is the client's input credit, and it surfaces months
 * later when someone reconciles a return. So these assert exact figures rather
 * than "a number appeared".
 */

/** A valid GSTIN for Karnataka (29). The final character is a real checksum. */
const KA_GSTIN = '29AAPFU0939F1ZR';
/** Maharashtra (27). */
const MH_GSTIN = '27BBBCD1234E1Z5';

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
  items: [
    { id: 'a', description: 'Platform engineering retainer', quantity: 1, price: 100000, discount: 0, hsnSac: '998314' },
  ],
  ...over,
});

const gstInvoice = (over: Partial<InvoiceData> = {}) =>
  invoice({ supplierGstin: KA_GSTIN, supplierState: '29', placeOfSupply: '29', ...over });

// --------------------------------------------------------------------------
// Rounding
// --------------------------------------------------------------------------

test('roundMoney rounds to the currency\'s own minor unit', () => {
  expect(roundMoney(1234.5678, 'INR')).toBe(1234.57);
  expect(roundMoney(1234.5678, 'USD')).toBe(1234.57);
  // No minor unit at all.
  expect(roundMoney(1234.5678, 'JPY')).toBe(1235);
  // Three of them.
  expect(roundMoney(1234.5678, 'KWD')).toBe(1234.568);
});

test('roundMoney rounds a half up even where binary floating point does not', () => {
  // 1.005 * 100 is 100.49999999999999, so Math.round alone gives 1.00.
  expect(roundMoney(1.005, 'INR')).toBe(1.01);
  expect(roundMoney(8.615, 'INR')).toBe(8.62);
  expect(roundMoney(-1.005, 'INR')).toBe(-1.01);
  expect(roundMoney(Number.NaN, 'INR')).toBe(0);
});

// --------------------------------------------------------------------------
// The split
// --------------------------------------------------------------------------

test('a supply within the state is CGST + SGST at half the rate each', () => {
  const totals = computeTotals(gstInvoice());
  expect(totals.treatment).toBe('cgst-sgst');
  expect(totals.taxLines.map((line) => line.label)).toEqual(['CGST (9%)', 'SGST (9%)']);
  expect(totals.taxLines.map((line) => line.amount)).toEqual([9000, 9000]);
  expect(totals.taxAmount).toBe(18000);
  expect(totals.total).toBe(118000);
});

test('a supply across states is IGST at the full rate', () => {
  const totals = computeTotals(gstInvoice({ placeOfSupply: '27' }));
  expect(totals.treatment).toBe('igst');
  expect(totals.taxLines).toHaveLength(1);
  expect(totals.taxLines[0].label).toBe('IGST (18%)');
  expect(totals.taxLines[0].amount).toBe(18000);
  expect(totals.total).toBe(118000);
});

test('the two halves are each computed at half the rate, not by halving one total', () => {
  // 5% on 8,333.33 is 416.6665. Halving the rounded total (416.67) would give
  // 208.33 and 208.34 -- two different figures for two identical levies.
  const totals = computeTotals(
    gstInvoice({ tax: 5, items: [{ id: 'a', description: 'x', quantity: 1, price: 8333.33, discount: 0, hsnSac: '' }] }),
  );
  const [cgst, sgst] = totals.taxLines;
  expect(cgst.amount).toBe(208.33);
  expect(sgst.amount).toBe(cgst.amount);
  expect(totals.taxAmount).toBe(416.66);
  // And the printed figures still add up to the printed total.
  expect(totals.taxable + cgst.amount + sgst.amount).toBeCloseTo(totals.total, 10);
});

test('an odd rate still splits into halves that read as halves', () => {
  const totals = computeTotals(gstInvoice({ tax: 5 }));
  expect(totals.taxLines.map((l) => l.label)).toEqual(['CGST (2.5%)', 'SGST (2.5%)']);
});

test('no GSTIN means a plain tax line, exactly as before', () => {
  const totals = computeTotals(invoice());
  expect(totals.treatment).toBe('none');
  expect(totals.taxLines).toEqual([{ key: 'tax', label: 'Tax (18%)', rate: 18, amount: 18000 }]);
});

test('GST is not applied to an invoice denominated in another currency', () => {
  // An export invoiced in dollars is zero-rated; printing a CGST split on it
  // would be a claim about a tax that is not being charged.
  const totals = computeTotals(gstInvoice({ currency: 'USD' }));
  expect(totals.treatment).toBe('none');
  expect(totals.taxLines[0].label).toBe('Tax (18%)');
});

test('a GSTIN with no states yet falls back to a plain line rather than guessing', () => {
  expect(taxTreatment({ currency: 'INR', supplierGstin: KA_GSTIN, supplierState: '', placeOfSupply: '29' })).toBe('none');
  expect(taxTreatment({ currency: 'INR', supplierGstin: KA_GSTIN, supplierState: '29', placeOfSupply: '' })).toBe('none');
});

// --------------------------------------------------------------------------
// Discount and shipping
// --------------------------------------------------------------------------

test('a discount comes off before tax and shipping goes on after it', () => {
  const totals = computeTotals(
    gstInvoice({
      shipping: 500,
      items: [{ id: 'a', description: 'x', quantity: 2, price: 50000, discount: 10, hsnSac: '' }],
    }),
  );
  expect(totals.subtotal).toBe(100000);
  expect(totals.discount).toBe(10000);
  expect(totals.taxable).toBe(90000);
  expect(totals.taxAmount).toBe(16200);
  expect(totals.shipping).toBe(500);
  // 90,000 + 16,200 + 500. Shipping is not taxed -- see the note in totals.ts.
  expect(totals.total).toBe(106700);
});

test('a discount of 100% zeroes the line but leaves it on the invoice', () => {
  const totals = computeTotals(
    invoice({ items: [{ id: 'a', description: 'Goodwill credit', quantity: 1, price: 5000, discount: 100, hsnSac: '' }] }),
  );
  expect(totals.subtotal).toBe(5000);
  expect(totals.discount).toBe(5000);
  expect(totals.taxable).toBe(0);
  expect(totals.total).toBe(0);
});

test('a negative shipping charge cannot be used as an untaxed discount', () => {
  const totals = computeTotals(invoice({ shipping: -5000 }));
  expect(totals.shipping).toBe(0);
  expect(totals.total).toBe(118000);
});

test('a rate outside 0-100 is clamped rather than trusted', () => {
  expect(computeTotals(invoice({ tax: -5 })).taxAmount).toBe(0);
  expect(computeTotals(invoice({ tax: 400 })).taxAmount).toBe(100000);
  expect(computeTotals(invoice({ tax: Number.NaN })).taxAmount).toBe(0);
});

test('the printed line column adds up to the printed subtotal, to the paisa', () => {
  // Prices that do not land on a whole paisa. Summing first and rounding for
  // display is what makes a column of figures fail its own arithmetic.
  const items = [
    { id: 'a', description: 'a', quantity: 3, price: 10.335, discount: 0, hsnSac: '' },
    { id: 'b', description: 'b', quantity: 7, price: 1.115, discount: 0, hsnSac: '' },
    { id: 'c', description: 'c', quantity: 11, price: 0.615, discount: 3, hsnSac: '' },
  ];
  const data = invoice({ items, tax: 18 });
  const totals = computeTotals(data);

  const printedLines = items.reduce((sum, item) => sum + lineTotal(item, 'INR'), 0);
  const printedDiscounts = items.reduce((sum, item) => sum + lineDiscount(item, 'INR'), 0);
  expect(roundMoney(printedLines, 'INR')).toBe(totals.subtotal);
  expect(roundMoney(printedDiscounts, 'INR')).toBe(totals.discount);
  expect(roundMoney(totals.subtotal - totals.discount, 'INR')).toBe(totals.taxable);
  expect(roundMoney(totals.taxable + totals.taxAmount + totals.shipping, 'INR')).toBe(totals.total);
});

test('a currency with no minor unit never prints a fraction of one', () => {
  const totals = computeTotals(
    invoice({ currency: 'JPY', tax: 10, items: [{ id: 'a', description: 'x', quantity: 3, price: 333, discount: 0, hsnSac: '' }] }),
  );
  expect(totals.subtotal).toBe(999);
  expect(totals.taxAmount).toBe(100);
  expect(totals.total).toBe(1099);
  expect(formatCurrency(totals.total, 'JPY')).toBe('¥1,099');
});

// --------------------------------------------------------------------------
// GSTIN
// --------------------------------------------------------------------------

test('a GSTIN is validated by its checksum, not just its shape', () => {
  expect(isValidGstin(KA_GSTIN)).toBe(true);
  expect(isValidGstin(MH_GSTIN)).toBe(true);
  expect(isValidGstin('27AAPFU0939F1ZV')).toBe(true);
  expect(isValidGstin('24AAACC1206D1ZM')).toBe(true);
  // Lower case is a typing habit, not an error.
  expect(isValidGstin('29aapfu0939f1zr')).toBe(true);
  expect(isValidGstin('  29AAPFU0939F1ZR  ')).toBe(true);
});

test('a GSTIN with a transposed pair fails, which is the whole point of the checksum', () => {
  // 0939 -> 0993. Correct shape, correct length, wrong number -- and invisible
  // to a human proof-reader.
  expect(isValidGstin('29AAPFU0993F1ZR')).toBe(false);
  // Right digits, wrong check character.
  expect(isValidGstin('29AAPFU0939F1ZS')).toBe(false);
  expect(isValidGstin('')).toBe(false);
  expect(isValidGstin('29AAPFU0939F1Z')).toBe(false);
  expect(isValidGstin('29AAPFU0939F1YR')).toBe(false);
});

test('a GSTIN declares its own state', () => {
  expect(gstinStateCode(KA_GSTIN)).toBe('29');
  expect(gstinStateCode(MH_GSTIN)).toBe('27');
  // 25 was retired when Daman and Diu merged, so it is not offered.
  expect(gstinStateCode('25AAPFU0939F1ZR')).toBe('');
  expect(gstinStateCode('nonsense')).toBe('');
});

// --------------------------------------------------------------------------
// Amount in words
// --------------------------------------------------------------------------

test('rupees are spelled in lakhs and crores', () => {
  expect(amountInWords(118000, 'INR')).toBe('Rupees One Lakh Eighteen Thousand Only');
  expect(amountInWords(374532, 'INR')).toBe(
    'Rupees Three Lakh Seventy-Four Thousand Five Hundred Thirty-Two Only',
  );
  expect(amountInWords(10000000, 'INR')).toBe('Rupees One Crore Only');
  expect(amountInWords(112233445, 'INR')).toBe(
    'Rupees Eleven Crore Twenty-Two Lakh Thirty-Three Thousand Four Hundred Forty-Five Only',
  );
  expect(amountInWords(0, 'INR')).toBe('Rupees Zero Only');
  expect(amountInWords(1, 'INR')).toBe('Rupees One Only');
});

test('paise are spelled out too, and rounded the same way the totals are', () => {
  expect(amountInWords(1206998.4, 'INR')).toBe(
    'Rupees Twelve Lakh Six Thousand Nine Hundred Ninety-Eight and Forty Paise Only',
  );
  expect(amountInWords(0.05, 'INR')).toBe('Rupees Zero and Five Paise Only');
  expect(amountInWords(99.999, 'INR')).toBe('Rupees One Hundred Only');
});

test('other currencies are spelled in millions, with the fraction as a fraction', () => {
  expect(amountInWords(1234.56, 'USD')).toBe(
    'USD One Thousand Two Hundred Thirty-Four and 56/100 Only',
  );
  expect(amountInWords(2000000, 'USD')).toBe('USD Two Million Only');
  // No minor unit, so no fraction clause at all.
  expect(amountInWords(1099, 'JPY')).toBe('JPY One Thousand Ninety-Nine Only');
  // Three of them.
  expect(amountInWords(12.345, 'KWD')).toBe('KWD Twelve and 345/1000 Only');
});

test('a currency name is never pluralised by guesswork', () => {
  // "Japanese Yens" is what a trailing "s" produces, and it is on the face of
  // an invoice. Yen, Yuan, Won, Baht and Rand are all invariant; the ISO code
  // sidesteps every one of them.
  for (const code of ['JPY', 'CNY', 'KRW', 'THB', 'ZAR', 'VND']) {
    expect(amountInWords(5, code)).not.toContain('s ');
    expect(amountInWords(5, code).startsWith(`${code} `)).toBe(true);
  }
});

test('the words and the digits describe the same number', () => {
  const totals = computeTotals(gstInvoice({ tax: 18, shipping: 1234.55 }));
  expect(formatCurrency(totals.total, 'INR')).toBe('₹1,19,234.55');
  expect(amountInWords(totals.total, 'INR')).toBe(
    'Rupees One Lakh Nineteen Thousand Two Hundred Thirty-Four and Fifty-Five Paise Only',
  );
});

// --------------------------------------------------------------------------
// Restoring a draft
// --------------------------------------------------------------------------

test('a hand-edited draft cannot smuggle bad values into the new fields', () => {
  const restored = normaliseInvoice({
    supplierGstin: 29,
    buyerGstin: '27bbbcd1234e1z5',
    supplierState: { code: '29' },
    placeOfSupply: '27',
    shipping: 'lots',
    notes: null,
    paymentTerms: 'Net 30',
    signature: 'https://tracker.example/pixel.png',
    items: [{ description: 'x', quantity: 2, price: 10, discount: 'half', hsnSac: 998314 }],
  });

  expect(restored.supplierGstin).toBe('');
  // Upper-cased on the way in, because a restored value never passed onChange.
  expect(restored.buyerGstin).toBe('27BBBCD1234E1Z5');
  expect(restored.supplierState).toBe('');
  expect(restored.placeOfSupply).toBe('27');
  expect(restored.shipping).toBe(0);
  expect(restored.notes).toBe('');
  expect(restored.paymentTerms).toBe('Net 30');
  // A remote URL in an <img> would phone home the moment a draft was opened.
  expect(restored.signature).toBe('');
  expect(restored.items[0].discount).toBe(0);
  expect(restored.items[0].hsnSac).toBe('');
});

test('an invoice saved before GST existed still opens, and still totals', () => {
  const legacy = { fromName: 'A', toName: 'B', invoiceNumber: 'INV-1', invoiceDate: '2026-01-01', tax: 18, currency: 'INR', items: [{ description: 'x', quantity: 1, price: 1000 }] };
  const restored = normaliseInvoice(legacy);
  expect(restored.supplierGstin).toBe('');
  expect(restored.items[0].discount).toBe(0);
  expect(computeTotals(restored).total).toBe(1180);
});

test('readiness asks for the states only once a GSTIN says it needs them', () => {
  const ready = gstInvoice();
  expect(getReadiness(ready).complete).toBe(true);

  // No GSTIN: the states are irrelevant and must not block an ordinary invoice.
  expect(getReadiness(invoice()).complete).toBe(true);

  const halfDone = gstInvoice({ supplierState: '', placeOfSupply: '' });
  const readiness = getReadiness(halfDone);
  expect(readiness.complete).toBe(false);
  expect(readiness.missing).toContain('the state you supply from');
  expect(readiness.missing).toContain('place of supply');
});

// --------------------------------------------------------------------------
// In the browser
// --------------------------------------------------------------------------

/**
 * Puts a whole invoice on the page without typing it.
 *
 * addInitScript rather than goto-then-evaluate-then-reload. The obvious version
 * of this races and loses: `load` fires before React hydrates, so the draft
 * written after goto() is overwritten by the app's own persist effect a moment
 * later, and the reload then restores an empty invoice. A test that goes
 * straight to Download from there gets a PDF of nothing -- which still renders,
 * still downloads, and quietly asserts nothing at all. The value assertion
 * below is the guard against that happening again.
 */
const seed = async (page: Page, data: Partial<InvoiceData>) => {
  await page.addInitScript((value) => {
    sessionStorage.setItem('invoice-data', JSON.stringify(value));
  }, gstInvoice(data) as unknown as Record<string, unknown>);
  await page.goto('/');
  await expect(page.getByTestId('invoice-number')).toHaveValue('INV-2026-042');
};

/** On mobile the preview lives behind a tab; on desktop both panels are shown. */
const showPreview = async (page: Page) => {
  const tab = page.getByRole('tab', { name: 'Preview' });
  if (await tab.isVisible()) await tab.click();
};

/** The other half of the same switch: on mobile the form hides behind Edit. */
const showEditor = async (page: Page) => {
  const tab = page.getByRole('tab', { name: 'Edit' });
  if (await tab.isVisible()) await tab.click();
};

test('filling in the GST fields turns the invoice into a tax invoice and splits the tax', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();

  await page.getByLabel('Your business name').fill('Acme Consulting Pvt Ltd');
  await page.getByLabel('Client name').fill('Globex Manufacturing Pvt Ltd');
  await page.getByLabel('Invoice number').fill('INV-2026-042');
  await page.getByLabel('Description', { exact: true }).fill('Platform engineering retainer');
  await page.getByLabel('Quantity').fill('1');
  await page.getByLabel('Unit price').fill('100000');
  await page.getByLabel('Tax rate (%)').fill('18');

  await showPreview(page);
  await expect(page.getByTestId('preview-heading')).toHaveText('INVOICE');

  // The GSTIN alone is what makes it a tax invoice -- and it fills in the state
  // it already declares, rather than asking for it twice.
  await showEditor(page);
  await page.getByLabel('Your GSTIN').fill(KA_GSTIN);
  await expect(page.getByTestId('supplier-state')).toHaveValue('29');

  await page.getByTestId('place-of-supply').selectOption('29');
  await showPreview(page);
  await expect(page.getByTestId('preview-heading')).toHaveText('TAX INVOICE');
  await expect(page.getByTestId('preview-tax-cgst')).toHaveText('₹9,000.00');
  await expect(page.getByTestId('preview-tax-sgst')).toHaveText('₹9,000.00');
  await expect(page.getByTestId('preview-total')).toHaveText('₹1,18,000.00');

  // Same numbers, different state: one line of IGST instead of two halves.
  await showEditor(page);
  await page.getByTestId('place-of-supply').selectOption('27');
  await showPreview(page);
  await expect(page.getByTestId('preview-tax-igst')).toHaveText('₹18,000.00');
  await expect(page.getByTestId('preview-tax-cgst')).toHaveCount(0);
  await expect(page.getByTestId('preview-total')).toHaveText('₹1,18,000.00');
});

test('the form says in words which tax the invoice will carry', async ({ page }) => {
  await seed(page, {});
  await expect(page.getByTestId('tax-treatment')).toContainText('Same state');
  await expect(page.getByTestId('tax-treatment')).toContainText('CGST 9% + SGST 9%');

  await page.getByTestId('place-of-supply').selectOption('27');
  await expect(page.getByTestId('tax-treatment')).toContainText('IGST 18%');
});

test('a mistyped GSTIN is flagged on blur, not on every keystroke', async ({ page }) => {
  await seed(page, { supplierGstin: '' });
  const field = page.getByLabel('Your GSTIN');
  await field.fill('29AAPFU0993F1ZR');
  // Still focused: a half-typed GSTIN is unfinished, not wrong.
  await expect(page.getByText('That GSTIN does not check out.')).toHaveCount(0);

  await field.blur();
  await expect(page.getByText('That GSTIN does not check out.')).toBeVisible();
  await expect(field).toHaveAttribute('aria-invalid', 'true');

  await field.fill(KA_GSTIN);
  await expect(page.getByText('That GSTIN does not check out.')).toHaveCount(0);
});

test('a discount adds a column and comes off before the tax', async ({ page }) => {
  await seed(page, {
    items: [{ id: 'a', description: 'Retainer', quantity: 2, price: 50000, discount: 10, hsnSac: '998314' }],
  });
  await showPreview(page);
  await expect(page.getByTestId('preview-discount')).toHaveText('−₹10,000.00');
  await expect(page.getByTestId('preview-taxable')).toHaveText('₹90,000.00');
  await expect(page.getByTestId('preview-tax-cgst')).toHaveText('₹8,100.00');
  await expect(page.getByTestId('preview-total')).toHaveText('₹1,06,200.00');
});

test('with no discount there is no discount column and no redundant taxable row', async ({
  page,
}) => {
  await seed(page, {});
  await showPreview(page);
  await expect(page.getByTestId('preview-discount')).toHaveCount(0);
  await expect(page.getByTestId('preview-taxable')).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Disc.' })).toHaveCount(0);
  // HSN is filled in on this fixture, so that column does appear.
  await expect(page.getByRole('columnheader', { name: 'HSN/SAC' })).toBeVisible();
});

test('the amount in words restates the total', async ({ page }) => {
  await seed(page, { shipping: 1234.55 });
  await showPreview(page);
  await expect(page.getByTestId('preview-total')).toHaveText('₹1,19,234.55');
  await expect(page.getByTestId('preview-amount-words')).toContainText(
    'Rupees One Lakh Nineteen Thousand Two Hundred Thirty-Four and Fifty-Five Paise Only',
  );
});

test('notes, terms and a signature print at the foot of the invoice', async ({ page }) => {
  await seed(page, {
    paymentTerms: 'Net 30 — due within 30 days',
    notes: 'Please quote the invoice number with your payment.',
  });
  await showPreview(page);
  const closing = page.getByTestId('preview-closing');
  await expect(closing).toContainText('Net 30 — due within 30 days');
  await expect(closing).toContainText('Please quote the invoice number');
});

test('the line-item table can be reached on a narrow screen', async ({ page }) => {
  // Six columns do not fit a phone. The wrapper used to be overflow-hidden, so
  // the Amount column was simply cut off with nothing to say it existed.
  await seed(page, {
    items: [{ id: 'a', description: 'Platform engineering retainer', quantity: 2, price: 50000, discount: 10, hsnSac: '998314' }],
  });
  await showPreview(page);

  const region = page.getByRole('region', { name: 'Invoice line items, scrollable' });
  await expect(region).toHaveAttribute('tabindex', '0');

  const { scrollWidth, clientWidth } = await region.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  if (scrollWidth > clientWidth) {
    // Overflowing: prove it actually scrolls rather than clipping.
    await region.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    await expect
      .poll(() => region.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
  }
  // Either way the last column is in the DOM and readable.
  await expect(page.getByRole('columnheader', { name: 'Amount' })).toBeVisible();
});

// --------------------------------------------------------------------------
// The PDF
// --------------------------------------------------------------------------

const downloadPdf = async (page: Page): Promise<Buffer> => {
  const [file]: [Download, unknown] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /download as pdf/i }).first().click(),
  ]);
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
};

/**
 * The inflated content stream of each page.
 *
 * Drawing operators are plain ASCII once the Flate wrapper comes off. The text
 * is not searchable -- the embedded font is subset, so strings are re-encoded
 * to glyph indices -- which is why the assertions below are about shapes.
 */
const pageStreams = (pdf: Buffer): string[] => {
  const streams: string[] = [];
  let index = 0;
  while (index < pdf.length) {
    const start = pdf.indexOf('stream', index);
    if (start < 0) break;
    let from = start + 'stream'.length;
    if (pdf[from] === 0x0d) from += 1;
    if (pdf[from] === 0x0a) from += 1;
    const end = pdf.indexOf('endstream', from);
    if (end < 0) break;
    try {
      streams.push(inflateSync(pdf.subarray(from, end)).toString('latin1'));
    } catch {
      // Fonts and images are not Flate text; skip them.
    }
    index = end + 'endstream'.length;
  }
  return streams.filter((stream) => stream.includes('595.280029 841.890015 re'));
};

/**
 * Pages carrying the table's header row.
 *
 * Matched by the header's own background: the only 45pt-tall bar filled with
 * #1f2937 on the page. The labels themselves cannot be searched for.
 */
const HEADER_BAR =
  /0\.12156862745098039 0\.1607843137254902 0\.21568627450980393 scn\n[\d.]+ [\d.]+ [\d.]+ 45 re\nf/;

const pagesWithTableHeader = (pdf: Buffer): number =>
  pageStreams(pdf).filter((stream) => HEADER_BAR.test(stream)).length;

test('a long invoice repeats the table header on every page of the table', async ({ page }) => {
  // The defect this replaces: page two opened with six unlabelled columns of
  // numbers, which is the one thing a line-item table exists to prevent.
  await seed(page, {
    items: Array.from({ length: 26 }, (_, index) => ({
      id: `i${index}`,
      description: `Sprint ${index + 1} — engineering, review and deployment support`,
      quantity: (index % 4) + 1,
      price: 12500 + index * 310,
      discount: index % 5 === 0 ? 5 : 0,
      hsnSac: `99831${index % 5}`,
    })),
  });

  const pdf = await downloadPdf(page);
  const pages = pageStreams(pdf);
  expect(pages.length).toBeGreaterThan(2);
  // Every page except the last, which carries only the totals and the footer.
  expect(pagesWithTableHeader(pdf)).toBe(pages.length - 1);
});

/**
 * The totals rows: 24pt-tall bars filled #f8fafc.
 *
 * Distinguishable from the other things drawn in that colour by height alone --
 * an address card is 146.9pt tall and a line-item row 48pt.
 */
const TOTALS_ROW =
  /0\.9725490196078431 0\.9803921568627451 0\.9882352941176471 scn\n[\d.]+ [\d.]+ [\d.]+ 24 re/g;

const totalsRowsPerPage = (pdf: Buffer): number[] =>
  pageStreams(pdf).map((stream) => (stream.match(TOTALS_ROW) ?? []).length);

test('the totals are never split across a page break', async ({ page }) => {
  // Five items is the adversarial length: the table ends close enough to the
  // foot of page one that the totals have to move, and without wrap={false}
  // they moved a row at a time -- subtotal and discount on one sheet, the tax
  // and the total on the next, which is the one place on an invoice that has
  // to be read as a single column. (Verified by mutation: removing the guard
  // turns the 0,5 below into 1,3.)
  await seed(page, {
    shipping: 750,
    paymentTerms: 'Net 30',
    notes: 'Please quote the invoice number with your payment.',
    payment: {
      accountName: 'Acme Consulting Pvt Ltd',
      bankName: 'ICICI Bank',
      accountNumber: '004205001234',
      ifsc: 'ICIC0000042',
      swift: '',
      iban: '',
      upiId: 'acme.traders@okicici',
    },
    items: Array.from({ length: 5 }, (_, index) => ({
      id: `i${index}`,
      description: `Sprint ${index + 1} — engineering, review and deployment support`,
      quantity: (index % 4) + 1,
      price: 12500 + index * 310,
      discount: index % 5 === 0 ? 5 : 0,
      hsnSac: `99831${index % 5}`,
    })),
  });

  const pdf = await downloadPdf(page);
  const perPage = totalsRowsPerPage(pdf);
  // Subtotal, discount, taxable value, CGST, SGST, shipping -- all six, on one
  // page, with none of them stranded on the other side of the break.
  expect(perPage.filter((count) => count > 0)).toEqual([6]);
  expect(pagesWithTableHeader(pdf)).toBe(1);
});

test('an invoice with none of the new fields is still a single page', async ({ page }) => {
  // The guard on everything above: an ordinary invoice must not have grown.
  await page.addInitScript((value) => {
    sessionStorage.setItem('invoice-data', JSON.stringify(value));
  }, invoice({
    payment: {
      accountName: 'Acme Consulting Pvt Ltd',
      bankName: 'ICICI Bank, Indiranagar',
      accountNumber: '004205001234',
      ifsc: 'ICIC0000042',
      swift: 'ICICINBBCTS',
      iban: '',
      upiId: 'acme.traders@okicici',
    },
  }) as unknown as Record<string, unknown>);
  await page.goto('/');
  await expect(page.getByTestId('invoice-number')).toHaveValue('INV-2026-042');

  const pdf = await downloadPdf(page);
  expect(pageStreams(pdf)).toHaveLength(1);
});
