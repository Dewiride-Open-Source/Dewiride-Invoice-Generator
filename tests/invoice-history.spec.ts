import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { MAX_INVOICE_NUMBER_LENGTH, nextInvoiceNumber } from '../src/utils/invoiceHistory';

/**
 * Saved invoices.
 *
 * Each test gets its own browser context, so IndexedDB starts empty and no
 * cleanup is needed between them -- which also means anything that leaks
 * across tests here is a real bug, not a fixture artefact.
 */

const fill = async (page: Page, invoiceNumber: string, client = 'Globex Corporation') => {
  await page.getByLabel('Your business name').fill('Acme Consulting Pvt Ltd');
  await page.getByLabel('Your address').fill('12 MG Road, Bengaluru 560001');
  await page.getByLabel('Client name').fill(client);
  await page.getByLabel('Client address').fill('900 Market Street, San Francisco');
  await page.getByLabel('Invoice number').fill(invoiceNumber);
  // exact: once an item description has been saved, the autocomplete
  // combobox alongside it is labelled "Saved descriptions for item 1: ...",
  // which substring-matches "Description" and makes the plain locator
  // ambiguous on the second invoice.
  await page.getByLabel('Description', { exact: true }).fill('Platform engineering retainer');
  await page.getByLabel('Quantity').fill('2');
  await page.getByLabel('Unit price').fill('50000');
};

const download = async (page: Page) => {
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /download as pdf/i }).first().click(),
  ]);
  return file;
};

const openHistory = async (page: Page) => {
  await page.getByTestId('open-history').click();
  await expect(page.getByRole('dialog', { name: /saved invoices/i })).toBeVisible();
};

/**
 * The numbering rule, exercised directly.
 *
 * These cases are cheap here and expensive through the UI, and the padding and
 * length rules are exactly the kind of thing that looks right in one example
 * and is wrong in the next.
 */
test.describe('invoice numbering', () => {
  test('continues the sequence the user is already using', () => {
    expect(nextInvoiceNumber('INV-2026-042')).toBe('INV-2026-043');
    expect(nextInvoiceNumber('INV-001')).toBe('INV-002');
    expect(nextInvoiceNumber('7')).toBe('8');
    expect(nextInvoiceNumber('2026/INV/9')).toBe('2026/INV/10');
  });

  test('preserves zero-padding until the number genuinely outgrows it', () => {
    expect(nextInvoiceNumber('INV-009')).toBe('INV-010');
    // 099 -> 100 has to widen; padStart must not truncate it back to 00.
    expect(nextInvoiceNumber('INV-099')).toBe('INV-100');
    expect(nextInvoiceNumber('INV-99')).toBe('INV-100');
  });

  test('increments the last run of digits, not the first', () => {
    // A financial year in the prefix must not be advanced by a year.
    expect(nextInvoiceNumber('2026-INV-007')).toBe('2026-INV-008');
    expect(nextInvoiceNumber('INV-2026-007-A')).toBe('INV-2026-008-A');
  });

  test('never exceeds the 16-character GST limit, and never truncates', () => {
    // Rolling over adds a digit: 999999999999 -> 1000000000000 needs 17.
    const atLimit = 'INV-999999999999';
    expect(atLimit).toHaveLength(MAX_INVOICE_NUMBER_LENGTH);
    // Returning the input unchanged is safe; truncating would silently produce
    // some other invoice's number.
    expect(nextInvoiceNumber(atLimit)).toBe(atLimit);
    expect(nextInvoiceNumber(atLimit).length).toBeLessThanOrEqual(MAX_INVOICE_NUMBER_LENGTH);

    // Widening within the limit is still allowed.
    expect(nextInvoiceNumber('INVOICE-20269999')).toBe('INVOICE-20270000');
  });

  test('handles the degenerate inputs', () => {
    expect(nextInvoiceNumber('')).toBe('');
    expect(nextInvoiceNumber('   ')).toBe('');
    expect(nextInvoiceNumber('DRAFT')).toBe('DRAFT-1');
    // A name already at the limit cannot take a suffix either.
    expect(nextInvoiceNumber('ABCDEFGHIJKLMNOP')).toBe('ABCDEFGHIJKLMNOP');
  });
});

test.describe('saved invoices', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('starts empty, and says so rather than looking broken', async ({ page }) => {
    await openHistory(page);
    await expect(page.getByText(/no saved invoices yet/i)).toBeVisible();
    await expect(page.getByTestId('history-list')).toHaveCount(0);
  });

  test('downloading a PDF saves the invoice', async ({ page }) => {
    await fill(page, 'INV-2026-042');
    await download(page);

    await openHistory(page);
    const row = page.getByTestId('history-list').getByRole('listitem');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('INV-2026-042');
    await expect(row).toContainText('Globex Corporation');
    await expect(row).toContainText('₹1,00,000.00');
  });

  test('a saved invoice survives a reload and reopens into the form', async ({ page }) => {
    await fill(page, 'INV-2026-042');
    await download(page);

    // Drop the draft so what comes back demonstrably comes from IndexedDB and
    // not from the sessionStorage copy.
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await expect(page.getByLabel('Client name')).toHaveValue('');

    await openHistory(page);
    await page.getByRole('button', { name: /^open invoice INV-2026-042$/i }).click();

    await expect(page.getByLabel('Invoice number')).toHaveValue('INV-2026-042');
    await expect(page.getByLabel('Client name')).toHaveValue('Globex Corporation');
    await expect(page.getByLabel('Unit price')).toHaveValue('50000');
  });

  test('copying yields the next number, today, and a cleared due date', async ({ page }) => {
    await fill(page, 'INV-2026-042');
    await page.getByLabel('Due date').fill('2026-01-31');
    await download(page);

    await openHistory(page);
    await page.getByRole('button', { name: /copy invoice INV-2026-042/i }).click();

    await expect(page.getByLabel('Invoice number')).toHaveValue('INV-2026-043');
    const today = new Date();
    const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
    await expect(page.getByLabel('Invoice date')).toHaveValue(iso);
    // Carrying the old due date over would create an already-overdue invoice.
    await expect(page.getByLabel('Due date')).toHaveValue('');
    // The copy is editable content, not a reference to the original.
    await expect(page.getByLabel('Client name')).toHaveValue('Globex Corporation');
  });

  test('a fresh invoice continues the numbering automatically', async ({ page }) => {
    await fill(page, 'INV-2026-042');
    await download(page);

    // A genuinely new visit: no draft, but the history is still there.
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();

    await expect(page.getByLabel('Invoice number')).toHaveValue('INV-2026-043');
  });

  test('a number the user typed is never overwritten by the suggestion', async ({ page }) => {
    await fill(page, 'INV-2026-042');
    await download(page);
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();

    await page.getByLabel('Invoice number').fill('CUSTOM-1');
    // The store re-emits on every write; the guard has to hold afterwards too.
    await page.waitForTimeout(300);
    await expect(page.getByLabel('Invoice number')).toHaveValue('CUSTOM-1');
  });

  test('re-saving the same number corrects the entry instead of duplicating it', async ({
    page,
  }) => {
    await fill(page, 'INV-2026-042');
    await download(page);

    await page.getByLabel('Client name').fill('Initech');
    await download(page);

    await openHistory(page);
    const rows = page.getByTestId('history-list').getByRole('listitem');
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText('Initech');
  });

  test('deleting removes one invoice and leaves the rest', async ({ page }) => {
    await fill(page, 'INV-2026-042');
    await download(page);
    await fill(page, 'INV-2026-043', 'Initech');
    await download(page);

    await openHistory(page);
    const rows = page.getByTestId('history-list').getByRole('listitem');
    await expect(rows).toHaveCount(2);

    await page.getByRole('button', { name: /delete invoice INV-2026-042/i }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText('INV-2026-043');
  });

  test('clear all requires confirmation and then empties the list', async ({ page }) => {
    await fill(page, 'INV-2026-042');
    await download(page);

    await openHistory(page);
    await page.getByRole('button', { name: /^clear all$/i }).click();

    const confirm = page.getByRole('dialog', { name: /delete every saved invoice/i });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: /yes, delete all/i }).click();

    await expect(page.getByText(/no saved invoices yet/i)).toBeVisible();
  });

  test('opening a complete invoice does not discard the finished one on screen', async ({
    page,
  }) => {
    await fill(page, 'INV-2026-042');
    await download(page);

    // A second, complete invoice that was never downloaded.
    await fill(page, 'INV-2026-099', 'Umbrella Corp');

    await openHistory(page);
    await page.getByRole('button', { name: /^open invoice INV-2026-042$/i }).click();
    await expect(page.getByLabel('Client name')).toHaveValue('Globex Corporation');

    // The one that was replaced should have been saved on its way out.
    await openHistory(page);
    await expect(page.getByTestId('history-list')).toContainText('INV-2026-099');
    await expect(page.getByTestId('history-list')).toContainText('Umbrella Corp');
  });

  test('export produces a file that imports back cleanly, and idempotently', async ({ page }) => {
    await fill(page, 'INV-2026-042');
    await download(page);

    await openHistory(page);
    const [file] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /^export$/i }).click(),
    ]);
    expect(file.suggestedFilename()).toMatch(/^invoice-history-\d{4}-\d{2}-\d{2}\.json$/);

    const path = await file.path();
    const payload = JSON.parse(readFileSync(path!, 'utf8'));
    expect(payload.version).toBe(1);
    expect(payload.invoices).toHaveLength(1);
    expect(payload.invoices[0].invoice.invoiceNumber).toBe('INV-2026-042');

    // Importing the same file must not double the list.
    await page.getByTestId('history-import').setInputFiles(path);
    await expect(page.getByTestId('history-list').getByRole('listitem')).toHaveCount(1);
  });

  test('importing a file that is not a history is reported, not swallowed', async ({ page }) => {
    await openHistory(page);
    await page.getByTestId('history-import').setInputFiles({
      name: 'not-a-history.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"hello":"world"}'),
    });
    // Scoped to the dialog: an assertive announce() renders a second
    // role="alert" in the page-level live region.
    await expect(
      page.getByRole('dialog', { name: /saved invoices/i }).getByRole('alert'),
    ).toContainText(/does not look like an exported/i);
  });

  test('the history rows are excluded from click analytics', async ({ page }) => {
    await fill(page, 'INV-2026-042');
    await download(page);
    await openHistory(page);

    // Every control in a row is named after user content ("Open invoice
    // INV-2026-042"), and the tracker reports accessible names. The row
    // carries the opt-out so nothing inside it is ever reported.
    const row = page.getByTestId('history-list').getByRole('listitem').first();
    await expect(row).toHaveAttribute('data-dw-ignore', 'true');
  });
});
