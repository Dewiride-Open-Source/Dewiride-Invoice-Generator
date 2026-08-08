import { test, expect, Page } from '@playwright/test';

/**
 * The saved-data persistence contract.
 *
 * These lists are backed by localStorage and surfaced through
 * useSyncExternalStore. The behaviours worth protecting are the ones that used
 * to depend on a refreshTrigger counter being relayed through props: a write
 * anywhere must re-render every reader, with no reload and no manual plumbing.
 */

const KEYS = [
  'invoice_from_companies',
  'invoice_to_companies',
  'invoice_item_descriptions',
] as const;

const readKey = (page: Page, key: string) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]'), key);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
});

test('a fresh browser shows no saved-options dropdown', async ({ page }) => {
  await expect(page.getByRole('combobox', { name: /saved businesses/i })).toHaveCount(0);
});

test('debounced autosave persists a company and re-renders the form', async ({ page }) => {
  await page.locator('input[name="from-name"]').fill('Acme Consulting');
  await page.locator('textarea[name="from-address"]').fill('12 MG Road, Bengaluru');

  // The autosave debounce is 2s; poll rather than sleeping a fixed amount.
  await expect
    .poll(() => readKey(page, 'invoice_from_companies'), { timeout: 8_000 })
    .toHaveLength(1);

  // The store must push the new entry into the form with no reload.
  await expect(page.getByRole('combobox', { name: /saved businesses/i })).toBeVisible();
});

test('an item description is saved on blur, with its price', async ({ page }) => {
  await page.locator('input[name="item-1-description"]').fill('Platform retainer');
  await page.locator('input[name="item-1-price"]').fill('50000');
  await page.locator('input[name="invoice-number"]').click(); // blur

  await expect
    .poll(() => readKey(page, 'invoice_item_descriptions'), { timeout: 8_000 })
    .toMatchObject([{ description: 'Platform retainer', defaultPrice: 50000 }]);
});

test('the draft survives a page reload', async ({ page }) => {
  await page.locator('input[name="invoice-number"]').fill('INV-777');
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('invoice-data'))).toContain('INV-777');

  await page.reload();
  await expect(page.locator('input[name="invoice-number"]')).toHaveValue('INV-777');
});

test('selecting a saved company fills both name and address', async ({ page }) => {
  await page.locator('input[name="from-name"]').fill('Acme Consulting');
  await page.locator('textarea[name="from-address"]').fill('12 MG Road, Bengaluru');
  await expect(page.getByRole('combobox', { name: /saved businesses/i })).toBeVisible({ timeout: 8_000 });

  await page.locator('input[name="from-name"]').fill('');
  await page.locator('textarea[name="from-address"]').fill('');

  await page.getByRole('combobox', { name: /saved businesses/i }).click();
  await page.getByRole('option', { name: /Acme Consulting/ }).first().click();

  await expect(page.locator('input[name="from-name"]')).toHaveValue('Acme Consulting');
  await expect(page.locator('textarea[name="from-address"]')).toHaveValue('12 MG Road, Bengaluru');
});

test('deleting in the manager updates every reader immediately', async ({ page }) => {
  await page.locator('input[name="from-name"]').fill('Acme Consulting');
  await page.locator('textarea[name="from-address"]').fill('12 MG Road, Bengaluru');
  await expect.poll(() => readKey(page, 'invoice_from_companies'), { timeout: 8_000 }).toHaveLength(1);

  await page.getByTestId('open-saved-data').click();
  await expect(page.getByRole('tab', { name: /Your businesses \(1\)/ })).toBeVisible();

  await page.getByRole('button', { name: /delete .*Acme Consulting/i }).click();

  await expect(page.getByRole('tab', { name: /Your businesses \(0\)/ })).toBeVisible();
  expect(await readKey(page, 'invoice_from_companies')).toHaveLength(0);
});

test('clear all wipes every key and hides its own button', async ({ page }) => {
  await page.locator('input[name="from-name"]').fill('Acme Consulting');
  await page.locator('textarea[name="from-address"]').fill('12 MG Road, Bengaluru');
  await expect.poll(() => readKey(page, 'invoice_from_companies'), { timeout: 8_000 }).toHaveLength(1);

  await page.getByTestId('open-saved-data').click();
  await page.getByRole('button', { name: /^Clear all data$/i }).click();
  await page.getByRole('button', { name: /^Yes, clear everything$/i }).click();

  for (const key of KEYS) {
    expect(await readKey(page, key)).toHaveLength(0);
  }
  await expect(page.getByRole('button', { name: /^Clear all data$/i })).toHaveCount(0);
});

test('corrupt or hand-edited storage degrades gracefully', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('invoice_from_companies', '{"not":"an array"}');
    localStorage.setItem('invoice_to_companies', '[{"id":1,"name":null,"lastUsed":"garbage"}]');
    localStorage.setItem('invoice_item_descriptions', 'not json at all');
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.reload();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Invoice Generator');
  await expect(page.getByRole('combobox', { name: /saved businesses/i })).toHaveCount(0);
  expect(errors).toEqual([]);
});
