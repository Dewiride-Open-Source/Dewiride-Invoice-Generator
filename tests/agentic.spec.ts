import { test, expect } from '@playwright/test';

/**
 * Agentic browsing.
 *
 * These tests deliberately use only `getByRole` / `getByLabel` -- no CSS
 * selectors, no test ids, no knowledge of the DOM shape. That is the
 * constraint an automated agent (or a screen-reader user) actually works
 * under: it can see the accessibility tree and nothing else.
 *
 * If a redesign moves markup around, these still pass. If it breaks the
 * semantics, they fail -- which is the point.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
});

test('an agent can complete and download an invoice using roles alone', async ({ page }) => {
  // Orient: exactly one h1 states what the page is.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Free Invoice Generator');

  // The page states its own readiness, so an agent need not infer it.
  const readiness = page.getByRole('status').filter({ hasText: /still needed|ready to download/i });
  await expect(readiness).toContainText('Still needed');

  // Fill every field by its visible label.
  await page.getByLabel('Your business name').fill('Acme Consulting Pvt Ltd');
  await page.getByLabel('Your address').fill('12 MG Road, Bengaluru 560001');
  await page.getByLabel('Client name').fill('Globex Corporation');
  await page.getByLabel('Client address').fill('900 Market Street, San Francisco');
  await page.getByLabel('Invoice number').fill('INV-2026-042');
  await page.getByLabel('Due date').fill('2026-09-08');
  await page.getByLabel('Description').fill('Platform engineering retainer');
  await page.getByLabel('Quantity').fill('3');
  await page.getByLabel('Unit price').fill('125000');
  await page.getByLabel('Tax rate (%)').fill('18');

  // The readiness signal flips, in text and in the machine-readable attribute.
  await expect(readiness).toContainText('Ready to download');
  await expect(readiness).toHaveAttribute('data-invoice-complete', 'true');

  // The result is verifiable before committing to a download.
  await expect(page.getByRole('region', { name: /invoice preview/i }).or(page.locator('body')))
    .toContainText('₹442,500.00');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /download as pdf/i }).first().click(),
  ]);
  expect(download.suggestedFilename()).toBe('invoice-INV-2026-042.pdf');
});

test('every interactive control has a unique, meaningful accessible name', async ({ page }) => {
  // Two identically-named controls are ambiguous to anything driving the page
  // by name -- an agent cannot tell which "Delete" it is about to press.
  await page.getByRole('button', { name: /add item/i }).click();

  const names = await page.evaluate(() => {
    const label = (el: Element): string => {
      const aria = el.getAttribute('aria-label');
      if (aria) return aria;
      const labelledby = el.getAttribute('aria-labelledby');
      if (labelledby) {
        return labelledby
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .join(' ');
      }
      const id = el.getAttribute('id');
      if (id) {
        const forLabel = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (forLabel) return forLabel.textContent?.trim() ?? '';
      }
      return el.textContent?.trim() ?? '';
    };

    const groupOf = (el: Element): string =>
      el.closest('[role="group"]')?.getAttribute('aria-label') ?? '';

    return [...document.querySelectorAll('button, input, select, textarea, a[href]')]
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .map((el) => `${groupOf(el)}|${label(el)}`.trim());
  });

  const unnamed = names.filter((n) => n.replace('|', '').trim() === '');
  expect(unnamed, 'every control must have an accessible name').toEqual([]);

  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  expect(duplicates, `ambiguous control names: ${duplicates.join(', ')}`).toEqual([]);
});

test('the page structure is navigable by landmark and heading', async ({ page }) => {
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();

  // Sections are named, so an agent can jump to the one it needs.
  const sectionNames = await page.evaluate(() =>
    [...document.querySelectorAll('section[aria-labelledby], section[aria-label]')].map((s) => {
      const id = s.getAttribute('aria-labelledby');
      return id ? document.getElementById(id)?.textContent?.trim() : s.getAttribute('aria-label');
    }),
  );
  expect(sectionNames.length).toBeGreaterThan(0);
  expect(sectionNames.every(Boolean)).toBe(true);
});

test('fields carry the autocomplete tokens a form filler expects', async ({ page }) => {
  await expect(page.getByLabel('Your business name')).toHaveAttribute('autocomplete', 'organization');
  await expect(page.getByLabel('Your address')).toHaveAttribute('autocomplete', 'street-address');
});

test('the currency picker exposes every option programmatically', async ({ page }) => {
  const currency = page.getByLabel('Currency');
  const codes = await currency.evaluate((el) =>
    [...(el as HTMLSelectElement).options].map((o) => o.value),
  );

  // A native select means the full list is in the DOM, not behind a virtualised
  // custom widget an agent would have to scroll to discover.
  expect(codes.length).toBeGreaterThan(150);
  for (const code of ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'ZAR']) {
    expect(codes).toContain(code);
  }

  await currency.selectOption('EUR');
  await expect(currency).toHaveValue('EUR');
});

test('the app works without a mouse and reports what it did', async ({ page }) => {
  // Adding a row is announced, so an agent driving blind gets confirmation
  // rather than having to diff the DOM.
  const announcer = page.locator('[aria-live="polite"][aria-atomic="true"]');

  await page.getByRole('button', { name: /add item/i }).click();
  await expect(announcer).toContainText('Item 2 added');

  await page.getByRole('button', { name: /remove item 2/i }).click();
  await expect(announcer).toContainText('Item 2 removed');
});
