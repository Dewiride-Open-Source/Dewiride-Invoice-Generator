import { test, expect, Page } from '@playwright/test';

/**
 * The three standalone tools.
 *
 * The calculator's assertions are exact figures rather than "a number
 * appeared", for the same reason the invoice arithmetic tests are: a GST
 * calculator that is wrong by a rupee is worse than no calculator, because it
 * is believed.
 */

// --------------------------------------------------------------------------
// GST calculator
// --------------------------------------------------------------------------

const calculator = async (page: Page) => {
  await page.goto('/tools/gst-calculator/');
  await expect(page.getByTestId('gst-amount')).toBeVisible();
};

test('adding GST to an amount splits it into halves that add up', async ({ page }) => {
  await calculator(page);

  await page.getByTestId('gst-amount').fill('10000');
  await page.getByTestId('gst-rate').fill('18');

  await expect(page.getByTestId('gst-taxable')).toHaveText('₹10,000.00');
  await expect(page.getByTestId('gst-line-cgst')).toHaveText('₹900.00');
  await expect(page.getByTestId('gst-line-sgst')).toHaveText('₹900.00');
  await expect(page.getByTestId('gst-tax')).toHaveText('₹1,800.00');
  await expect(page.getByTestId('gst-total')).toHaveText('₹11,800.00');
});

test('an inter-state supply is one line of IGST, not two halves', async ({ page }) => {
  await calculator(page);
  await page.getByTestId('gst-amount').fill('10000');
  await page.getByTestId('gst-rate').fill('18');
  await page.getByTestId('scope-inter').check();

  await expect(page.getByTestId('gst-line-igst')).toHaveText('₹1,800.00');
  await expect(page.getByTestId('gst-line-cgst')).toHaveCount(0);
  await expect(page.getByTestId('gst-total')).toHaveText('₹11,800.00');
});

test('removing GST divides, as Rule 35 says, rather than subtracting a percentage', async ({
  page,
}) => {
  await calculator(page);
  await page.getByTestId('gst-amount').fill('11800');
  await page.getByTestId('gst-rate').fill('18');
  await page.getByTestId('direction-inclusive').check();

  // Rule 35: 11,800 x 9 / 118 per head. Subtracting 18% instead would give a
  // taxable value of 9,676 and tax of 2,124 -- wrong by 324 rupees.
  await expect(page.getByTestId('gst-taxable')).toHaveText('₹10,000.00');
  await expect(page.getByTestId('gst-line-cgst')).toHaveText('₹900.00');
  await expect(page.getByTestId('gst-line-sgst')).toHaveText('₹900.00');
  await expect(page.getByTestId('gst-total')).toHaveText('₹11,800.00');
});

test('the quick rates are the ones actually in force', async ({ page }) => {
  await calculator(page);
  // 12% survives only for bricks and 28% went on 1 February 2026, but both are
  // still on invoices being reconciled, so they stay reachable. What must not
  // appear is a chip presenting the withdrawn structure as current.
  await expect(page.getByTestId('gst-rate-40')).toBeVisible();
  await expect(page.getByTestId('gst-rate-5')).toBeVisible();
  await expect(page.getByTestId('gst-rate-28')).toHaveCount(0);

  await page.getByTestId('gst-rate-5').click();
  await expect(page.getByTestId('gst-rate')).toHaveValue('5');
});

test('rounding drift on an inclusive amount is reported, not hidden', async ({ page }) => {
  await calculator(page);
  await page.getByTestId('gst-amount').fill('1');
  await page.getByTestId('gst-rate').fill('18');
  await page.getByTestId('direction-inclusive').check();

  // 1.00 inclusive at 18% recovers a taxable 0.85 and two halves of 0.08, which
  // add back to 1.01. Forcing that to 1.00 would mean one of the printed
  // figures being wrong instead.
  await expect(page.getByTestId('gst-drift')).toBeVisible();
  await expect(page.getByTestId('gst-drift')).toContainText('₹1.01');
});

// --------------------------------------------------------------------------
// Amount in words
// --------------------------------------------------------------------------

test('rupees are written in the Indian system, with the figures grouped to match', async ({
  page,
}) => {
  await page.goto('/tools/amount-in-words/');

  await page.getByTestId('words-amount').fill('118050.50');
  await expect(page.getByTestId('words-output')).toHaveText(
    'Rupees One Lakh Eighteen Thousand Fifty and Fifty Paise Only',
  );
  // The figure above it has to be grouped the same way the words are, or the
  // page says two different things at once.
  await expect(page.getByTestId('words-result')).toContainText('₹1,18,050.50');
});

test('a non-rupee amount uses the ISO code and the currency\'s own minor unit', async ({ page }) => {
  await page.goto('/tools/amount-in-words/');
  await page.getByTestId('words-amount').fill('1234.56');
  await page.getByTestId('words-currency').selectOption('USD');
  await expect(page.getByTestId('words-output')).toHaveText(
    'USD One Thousand Two Hundred Thirty-Four and 56/100 Only',
  );

  // "Japanese Yens" is what a naive plural produces, and the yen has no minor
  // unit at all, so "and 56/100" would be wrong for it too.
  await page.getByTestId('words-currency').selectOption('JPY');
  const yen = await page.getByTestId('words-output').textContent();
  expect(yen).toContain('JPY');
  expect(yen).not.toContain('Yens');
  expect(yen).not.toContain('/100');
});

// --------------------------------------------------------------------------
// UPI QR
// --------------------------------------------------------------------------

test('the UPI tool builds a link and shows the string inside the code', async ({ page }) => {
  await page.goto('/tools/upi-qr-generator/');
  await expect(page.getByTestId('upi-tool-qr')).toHaveCount(0);

  await page.getByTestId('upi-tool-id').fill('acme@okhdfcbank');
  await expect(page.getByTestId('upi-tool-qr')).toBeVisible();
  // Shown, not hidden: a QR is opaque, and printing the link is the only way
  // anyone can check what they are about to put on a counter.
  await expect(page.getByTestId('upi-tool-link')).toHaveText(
    'upi://pay?pa=acme%40okhdfcbank&cu=INR',
  );

  // NPCI marks the payee name mandatory, so its absence is called out.
  await expect(page.getByTestId('upi-tool-no-name')).toBeVisible();
  await page.getByTestId('upi-tool-name').fill("Smith & Sons (Pvt) Ltd");
  await expect(page.getByTestId('upi-tool-no-name')).toHaveCount(0);

  // Percent-encoded to RFC 3986, including the sub-delimiters
  // encodeURIComponent leaves alone. An unencoded & truncates the link and the
  // payer's app then shows the wrong payee.
  await expect(page.getByTestId('upi-tool-link')).toContainText(
    'pn=Smith%20%26%20Sons%20%28Pvt%29%20Ltd',
  );
});

test('the amount is left editable unless it is deliberately locked', async ({ page }) => {
  await page.goto('/tools/upi-qr-generator/');
  await page.getByTestId('upi-tool-id').fill('acme@okhdfcbank');

  // No am= by default: a static counter QR with an amount baked in charges
  // every later customer the same figure.
  await expect(page.getByTestId('upi-tool-link')).not.toContainText('am=');

  await page.getByTestId('upi-tool-fix-amount').check();
  await page.getByTestId('upi-tool-amount').fill('4800');
  await expect(page.getByTestId('upi-tool-link')).toContainText('am=4800.00');
});

test('a mistyped UPI ID is flagged on blur and produces no code', async ({ page }) => {
  await page.goto('/tools/upi-qr-generator/');
  const field = page.getByTestId('upi-tool-id');

  await field.fill('acme');
  // Not while typing: "acme@" is a half-finished address, not a mistake.
  await expect(field).not.toHaveAttribute('aria-invalid', 'true');
  await field.blur();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('upi-tool-qr')).toHaveCount(0);
});

// --------------------------------------------------------------------------
// The tools are the page, not decoration on it
// --------------------------------------------------------------------------

test('every published page carries either the editor or a working tool', async ({ page }) => {
  const withStudio = [
    '/',
    '/gst-invoice-generator/',
    '/proforma-invoice-format/',
    '/quotation-format/',
    '/delivery-challan-format/',
  ];
  for (const route of withStudio) {
    await page.goto(route);
    // A landing page that ships copy and no tool is the thin doorway page the
    // whole content plan is written to avoid.
    await expect(page.getByTestId('invoice-readiness'), route).toBeVisible();
  }

  for (const [route, testId] of [
    ['/tools/gst-calculator/', 'gst-result'],
    ['/tools/upi-qr-generator/', 'upi-tool-result'],
    ['/tools/amount-in-words/', 'words-result'],
  ]) {
    await page.goto(route);
    await expect(page.getByTestId(testId), route).toBeVisible();
  }
});
