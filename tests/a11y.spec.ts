import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility.
 *
 * The interactive states matter most here. A static crawl of the page never
 * opens the dialog or the combobox, and those two components carried the worst
 * defects: a modal with no focus trap that Tab walked straight out of, and a
 * listbox that could not be dismissed from the keyboard at all.
 */


/** A 64x64 two-tone PNG, matching tests/payment.spec.ts. */
const LOGO_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAeklEQVR42u3asQ0AIAgEQGZxOLd2FnUH' +
    'CqIcydcfriTEmGtncicyqe4PAAAAAAAAAAAAAAAAAAAAoCHA6wtk+wEAAAAAAAAAAAAAAAAAAICOAC5C' +
    'AAAAAAAAAAAAAAAAAAAAgP8AFyEAAAAAAAAAAAAAAAAAAADge4ADAK4KhuMH6sMAAAAASUVORK5CYII=',
  'base64',
);

const analyse = (page: Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

/**
 * Reports the offending selector and axe's own explanation, not just the rule
 * id -- a bare "color-contrast: 1 node" tells you nothing about which node.
 */
const expectNoViolations = (results: Awaited<ReturnType<typeof analyse>>) => {
  const summary = results.violations.flatMap((v) =>
    v.nodes.map((n) => {
      const why = [...n.any, ...n.all]
        .map((c) => c.message)
        .filter(Boolean)
        .join('; ');
      return `${v.id} (${v.impact}) at ${n.target.join(' ')}\n    ${why}\n    ${n.html.slice(0, 120)}`;
    }),
  );
  expect(summary, `\n${summary.join('\n')}\n`).toEqual([]);
};

test.beforeEach(async ({ page }) => {
  /**
   * Every control carries `transition-colors`, so for 150ms after the theme
   * toggle the whole page is mid-blend -- and axe, which reads computed
   * colours, then measures a colour that exists on no frame a user would see.
   * It reported 1.4:1 on every input at once, which is the signature of that
   * race rather than of a real defect.
   *
   * Reduced motion makes the app's own prefers-reduced-motion block collapse
   * those transitions to 0.01ms, so the measurement is of a settled page. It
   * is also a setting plenty of real users have on.
   *
   * emulateMedia rather than `test.use({ reducedMotion })`: the fixture did
   * not reach the page here -- matchMedia still reported no-preference.
   */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
});

test('the home page has no violations', async ({ page }) => {
  expectNoViolations(await analyse(page));
});

test('the home page has no violations in dark mode', async ({ page }) => {
  await page.getByRole('radio', { name: /dark theme/i }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expectNoViolations(await analyse(page));
});

test('the saved-data dialog has no violations', async ({ page }) => {
  await page.getByTestId('open-saved-data').click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  expectNoViolations(await analyse(page));
});

test('the saved-invoices dialog has no violations, empty and populated', async ({ page }) => {
  // Empty state first: it renders entirely different markup from the list.
  await page.getByTestId('open-history').click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  expectNoViolations(await analyse(page));
  await page.getByRole('button', { name: /^done$/i }).click();

  // Then with a row in it, which is where the per-invoice controls live.
  await page.getByLabel('Your business name').fill('Acme Consulting Pvt Ltd');
  await page.getByLabel('Your address').fill('12 MG Road, Bengaluru 560001');
  await page.getByLabel('Client name').fill('Globex Corporation');
  await page.getByLabel('Client address').fill('900 Market Street, San Francisco');
  await page.getByLabel('Invoice number').fill('INV-2026-042');
  await page.getByLabel('Description', { exact: true }).fill('Platform engineering retainer');
  await page.getByLabel('Quantity').fill('2');
  await page.getByLabel('Unit price').fill('50000');
  await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /download as pdf/i }).first().click(),
  ]);

  await page.getByTestId('open-history').click();
  await expect(page.getByTestId('history-list')).toBeVisible();
  expectNoViolations(await analyse(page));
});

test('the delete-everything confirmation has no violations', async ({ page }) => {
  // Two <dialog> elements open at once: the list, and the confirm on top of
  // it. Stacking them is exactly where focus and naming tend to break.
  await page.getByLabel('Your business name').fill('Acme Consulting Pvt Ltd');
  await page.getByLabel('Your address').fill('12 MG Road, Bengaluru 560001');
  await page.getByLabel('Client name').fill('Globex Corporation');
  await page.getByLabel('Invoice number').fill('INV-2026-042');
  await page.getByLabel('Description', { exact: true }).fill('Retainer');
  await page.getByLabel('Unit price').fill('50000');
  await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /download as pdf/i }).first().click(),
  ]);

  await page.getByTestId('open-history').click();
  await page.getByRole('button', { name: /^clear all$/i }).click();
  await expect(page.getByRole('dialog', { name: /delete every saved invoice/i })).toBeVisible();
  expectNoViolations(await analyse(page));
});

test('the payment block and its QR have no violations, in both themes', async ({ page }) => {
  // The QR is a graphic that carries information, the logo is user-supplied
  // content in a page we do not control the colours of, and the payment fields
  // are the first inputs in this app whose labels are not unique words.
  await page.getByTestId('logo-input').setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: LOGO_PNG,
  });
  await page.getByLabel('Your business name').fill('Acme Consulting Pvt Ltd');
  await page.getByLabel('Account holder').fill('Acme Consulting Pvt Ltd');
  await page.getByLabel('Bank name').fill('HDFC Bank, Koramangala');
  await page.getByLabel('Account number').fill('50100123456789');
  await page.getByLabel('IFSC code').fill('HDFC0001234');
  await page.getByLabel('UPI ID').fill('acme.traders@okicici');

  const tab = page.getByRole('tab', { name: 'Preview' });
  if (await tab.isVisible()) await tab.click();
  await expect(page.getByTestId('preview-upi-qr')).toBeVisible();

  expectNoViolations(await analyse(page));

  await page.getByRole('radio', { name: /dark theme/i }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expectNoViolations(await analyse(page));
});

test('the logo picker names itself, and its error, to a screen reader', async ({ page }) => {
  const input = page.getByTestId('logo-input');

  // The lint rule that checks this cannot resolve a htmlFor built from useId,
  // so it is suppressed at the call site. This is the assertion that replaces
  // it: the accessible name has to be real.
  await expect(input).toHaveAccessibleName('Business logo');
  await expect(input).toHaveAccessibleDescription(/PNG, JPEG or WebP/);

  await input.setInputFiles({
    name: 'invoice.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  });

  // The rejection has to reach the field itself, not only the live region --
  // someone tabbing back to the input later must still be told why it is empty.
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toHaveAccessibleDescription(/Choose a PNG, JPEG or WebP image/);
  expectNoViolations(await analyse(page));
});

test('the GST fields and the tax invoice have no violations, in both themes', async ({ page }) => {
  // Two state pickers whose options are near-identical strings, a GSTIN field
  // that goes aria-invalid, a scrollable table, and a second image picker --
  // all of it new, and none of it covered by a crawl of the default page.
  await page.getByLabel('Your business name').fill('Acme Consulting Pvt Ltd');
  await page.getByLabel('Client name').fill('Globex Manufacturing Pvt Ltd');
  await page.getByLabel('Your GSTIN').fill('29AAPFU0939F1ZR');
  await page.getByLabel('Client GSTIN').fill('27BBBCD1234E1Z5');
  await page.getByTestId('place-of-supply').selectOption('27');
  await page.getByLabel('Description', { exact: true }).fill('Platform engineering retainer');
  await page.getByLabel('HSN / SAC').fill('998314');
  await page.getByLabel('Discount (%)').fill('10');
  await page.getByLabel('Unit price').fill('100000');
  await page.getByLabel('Tax rate (%)').fill('18');
  await page.getByLabel('Shipping or freight').fill('750');
  await page.getByLabel('Payment terms').fill('Net 30');
  await page.getByLabel('Notes').fill('Please quote the invoice number with your payment.');
  await page.getByTestId('signature-input').setInputFiles({
    name: 'signature.png',
    mimeType: 'image/png',
    buffer: LOGO_PNG,
  });

  const tab = page.getByRole('tab', { name: 'Preview' });
  if (await tab.isVisible()) await tab.click();
  await expect(page.getByTestId('preview-heading')).toHaveText('TAX INVOICE');

  expectNoViolations(await analyse(page));

  await page.getByRole('radio', { name: /dark theme/i }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expectNoViolations(await analyse(page));
});

test('the state pickers and the signature name themselves distinctly', async ({ page }) => {
  // Two selects offering the same 37 options are exactly the case where a
  // shared or missing label leaves someone unable to tell which is which.
  await expect(page.getByTestId('supplier-state')).toHaveAccessibleName('You supply from');
  await expect(page.getByTestId('place-of-supply')).toHaveAccessibleName('Place of supply');
  await expect(page.getByTestId('place-of-supply')).toHaveAccessibleDescription(
    /It decides CGST \+ SGST or IGST/,
  );

  // Same suppressed lint rule as the logo picker; same real assertion instead.
  await expect(page.getByTestId('signature-input')).toHaveAccessibleName('Signature');
  await expect(page.getByTestId('signature-input')).toHaveAccessibleDescription(
    /authorised signatory/i,
  );

  const gstin = page.getByLabel('Your GSTIN');
  await gstin.fill('29AAPFU0993F1ZR');
  await gstin.blur();
  await expect(gstin).toHaveAttribute('aria-invalid', 'true');
  await expect(gstin).toHaveAccessibleDescription(/does not check out/);
});

test('the about page has no violations', async ({ page }) => {
  await page.goto('/about/');
  expectNoViolations(await analyse(page));
});

test('the combobox has no violations when open', async ({ page }) => {
  // The combobox only renders once something is saved.
  await page.locator('input[name="from-name"]').fill('Acme Consulting');
  await page.locator('textarea[name="from-address"]').fill('12 MG Road');
  await expect(page.getByRole('combobox', { name: /saved businesses/i })).toBeVisible({ timeout: 8_000 });

  await page.getByRole('combobox', { name: /saved businesses/i }).click();
  await expect(page.getByRole('listbox')).toBeVisible();
  expectNoViolations(await analyse(page));
});

test('privacy and terms have no violations', async ({ page }) => {
  for (const path of ['/privacy/', '/terms/']) {
    await page.goto(path);
    expectNoViolations(await analyse(page));
  }
});

test('the whole flow is operable from the keyboard alone', async ({ page }) => {
  // The skip link is the first stop and must be reachable.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /skip to the invoice editor/i })).toBeFocused();

  // Every control must be reachable by tabbing; nothing may be a keyboard trap.
  const reachable = new Set<string>();
  for (let i = 0; i < 60; i += 1) {
    await page.keyboard.press('Tab');
    const id = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      return el.getAttribute('name') ?? el.getAttribute('aria-label') ?? el.tagName;
    });
    if (id) reachable.add(id);
  }

  for (const name of ['from-name', 'to-name', 'invoice-number', 'currency', 'tax']) {
    expect([...reachable], `${name} should be tabbable`).toContain(name);
  }
});

test('the dialog traps focus and Escape closes it', async ({ page }) => {
  await page.getByTestId('open-saved-data').click();
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible();

  // Tab several full laps. Focus must never reach a control on the page
  // behind the dialog. Chrome parks activeElement on <body> for one step at
  // the wrap-around point, which is the cycle working, not a leak -- so the
  // assertion is about background controls specifically.
  const visited: string[] = [];
  for (let i = 0; i < 15; i += 1) {
    await page.keyboard.press('Tab');
    const escaped = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const dialog = document.querySelector('dialog[open]');
      if (dialog?.contains(el)) return null;
      return el.getAttribute('data-testid') ?? el.tagName;
    });
    if (escaped) visited.push(escaped);
  }
  expect(visited, `focus reached background controls: ${visited.join(', ')}`).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('the combobox is fully keyboard operable', async ({ page }) => {
  await page.locator('input[name="from-name"]').fill('Acme Consulting');
  await page.locator('textarea[name="from-address"]').fill('12 MG Road, Bengaluru');
  const combobox = page.getByRole('combobox', { name: /saved businesses/i });
  await expect(combobox).toBeVisible({ timeout: 8_000 });

  // Down opens it, and focus lands on the search field.
  await combobox.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect(combobox).toHaveAttribute('aria-expanded', 'true');

  // Arrow keys drive aria-activedescendant rather than moving DOM focus.
  await page.keyboard.press('ArrowDown');
  const active = await page
    .getByRole('searchbox')
    .or(page.locator('input[aria-controls]'))
    .first()
    .getAttribute('aria-activedescendant');
  expect(active).toBeTruthy();

  // Escape closes it and returns focus to the trigger.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(combobox).toBeFocused();

  // Enter on an active option applies it.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('input[name="from-name"]')).toHaveValue('Acme Consulting');
});

test('headings form a single sensible outline', async ({ page }) => {
  const levels = await page.evaluate(() =>
    [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1])),
  );

  expect(levels.filter((l) => l === 1)).toHaveLength(1);
  expect(levels[0]).toBe(1);
  // No level may be skipped on the way down.
  for (let i = 1; i < levels.length; i += 1) {
    expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
  }
});

test('state changes are announced', async ({ page }) => {
  // The download button owns a second polite region for PDF progress, so scope
  // to the app-wide announcer.
  const liveRegion = page.locator('[aria-live="polite"][aria-atomic="true"]');
  await expect(liveRegion).toHaveCount(1);

  await page.getByRole('button', { name: /add item/i }).click();
  await expect(liveRegion).toContainText('Item 2 added');

  await page.getByTestId('item-2-remove').click();
  await expect(liveRegion).toContainText('Item 2 removed');
});
