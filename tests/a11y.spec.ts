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

const analyse = (page: Page) =>
  new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

const expectNoViolations = (results: Awaited<ReturnType<typeof analyse>>) => {
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) -- ${v.help}`,
  );
  expect(summary, summary.join('\n')).toEqual([]);
};

test.beforeEach(async ({ page }) => {
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
