import { test, expect, Page } from '@playwright/test';

/**
 * The core authoring flow: fill an invoice, watch the preview, download a PDF.
 */

const fillInvoice = async (page: Page) => {
  await page.locator('input[name="from-name"]').fill('Acme Consulting Pvt Ltd');
  await page.locator('textarea[name="from-address"]').fill('12 MG Road\nBengaluru 560001');
  await page.locator('input[name="to-name"]').fill('Globex Corporation');
  await page.locator('textarea[name="to-address"]').fill('900 Market St\nSan Francisco');
  await page.locator('input[name="invoice-number"]').fill('INV-2026-042');
  await page.locator('input[name="due-date"]').fill('2026-09-08');
  await page.locator('input[name="item-1-description"]').fill('Platform engineering retainer');
  await page.locator('input[name="item-1-quantity"]').fill('3');
  await page.locator('input[name="item-1-price"]').fill('125000');
  await page.locator('input[name="tax"]').fill('18');
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
});

test('the invoice date defaults to today', async ({ page }) => {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate(),
  ).padStart(2, '0')}`;
  await expect(page.locator('input[name="invoice-date"]')).toHaveValue(iso);
});

test('the preview totals update as the form is filled', async ({ page }) => {
  await fillInvoice(page);
  // 3 x 125000 = 375000, +18% tax = 442500
  await expect(page.getByTestId('preview-total')).toHaveText('₹442,500.00');
});

test('every currency formats with its own symbol and minor units', async ({ page }) => {
  await fillInvoice(page);
  const total = page.getByTestId('preview-total');

  await page.locator('select[name="currency"]').selectOption('USD');
  await expect(total).toHaveText('$442,500.00');

  // JPY has no minor unit.
  await page.locator('select[name="currency"]').selectOption('JPY');
  await expect(total).toHaveText('¥442,500');

  // KWD has three.
  await page.locator('select[name="currency"]').selectOption('KWD');
  await expect(total).toHaveText('KWD 442,500.000');

  // THB's symbol is outside the embedded font, so it shows the ISO code.
  await page.locator('select[name="currency"]').selectOption('THB');
  await expect(total).toHaveText('THB 442,500.00');
});

test('line items can be added and removed, and the last one cannot', async ({ page }) => {
  const descriptions = page.locator('input[name$="-description"][name^="item-"]');
  await expect(descriptions).toHaveCount(1);
  await expect(page.getByTestId('item-1-remove')).toBeDisabled();

  await page.getByRole('button', { name: /add item/i }).click();
  await expect(descriptions).toHaveCount(2);
  await expect(page.getByTestId('item-1-remove')).toBeEnabled();

  await page.getByTestId('item-2-remove').click();
  await expect(descriptions).toHaveCount(1);
  await expect(page.getByTestId('item-1-remove')).toBeDisabled();
});

test('clearing a number field does not trap a zero in it', async ({ page }) => {
  const price = page.locator('input[name="item-1-price"]');
  await price.fill('500');
  await price.fill('');
  // The field stays visually empty while focused rather than snapping to "0".
  await expect(price).toHaveValue('');
  await price.fill('750');
  await expect(price).toHaveValue('750');
});

test('the PDF downloads, is valid, and embeds the Unicode font', async ({ page }) => {
  await fillInvoice(page);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /download as pdf/i }).click(),
  ]);

  expect(download.suggestedFilename()).toBe('invoice-INV-2026-042.pdf');

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const pdf = Buffer.concat(chunks);

  expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  expect(pdf.length).toBeGreaterThan(2000);
  // Without the embedded subset, ₹ and friends print as blank boxes.
  expect(pdf.toString('latin1')).toContain('NotoSans');
});

test('the PDF engine is not on the critical path', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url());
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  const onLoad = scripts.length;

  await page.getByRole('button', { name: /download as pdf/i }).click();
  await page.waitForEvent('download');

  // The engine is ~1.5 MB; it must arrive only after the click.
  expect(scripts.length).toBeGreaterThan(onLoad);
});
