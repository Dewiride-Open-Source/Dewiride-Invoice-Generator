import { test, expect, Download, Page } from '@playwright/test';
import { inflateSync } from 'node:zlib';
import { InvoiceData, createEmptyInvoice, normaliseInvoice } from '../src/types/invoice';
import { DEFAULT_TEMPLATE, TEMPLATES, getTemplate, isTemplateId } from '../src/utils/templates';

/**
 * Invoice designs.
 *
 * A design is a palette, applied by the preview as CSS custom properties and by
 * the PDF as a generated StyleSheet. The risk this file exists for is that the
 * two disagree -- that the sheet on screen is not the file that downloads --
 * so the assertions check the chosen colours reach both.
 */

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
  supplierGstin: '29AAPFU0939F1ZR',
  supplierState: '29',
  placeOfSupply: '27',
  items: [
    { id: 'a', description: 'Platform engineering retainer', quantity: 1, price: 100000, discount: 0, hsnSac: '998314' },
  ],
  ...over,
});

const seed = async (page: Page, data: Partial<InvoiceData>) => {
  await page.addInitScript((value) => {
    sessionStorage.setItem('invoice-data', JSON.stringify(value));
  }, invoice(data) as unknown as Record<string, unknown>);
  await page.goto('/');
  await expect(page.getByTestId('invoice-number')).toHaveValue('INV-2026-042');
};

const showPreview = async (page: Page) => {
  const tab = page.getByRole('tab', { name: 'Preview' });
  if (await tab.isVisible()) await tab.click();
};

/** #0f766e -> "0.058823529411764705 0.4627450980392157 0.43137254901960786". */
const pdfColour = (hex: string): string =>
  [1, 3, 5]
    .map((i) => String(parseInt(hex.slice(i, i + 2), 16) / 255))
    .join(' ');

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

const pdfText = (pdf: Buffer): string => {
  const parts: string[] = [];
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
      parts.push(inflateSync(pdf.subarray(from, end)).toString('latin1'));
    } catch {
      // Fonts and images are not Flate text.
    }
    index = end + 'endstream'.length;
  }
  return parts.join('\n');
};

test('an unknown design falls back rather than rendering a colourless invoice', () => {
  expect(getTemplate('nonsense').id).toBe(DEFAULT_TEMPLATE);
  expect(getTemplate('').id).toBe(DEFAULT_TEMPLATE);
  expect(isTemplateId('classic')).toBe(true);
  expect(isTemplateId('retired-design')).toBe(false);
  expect(normaliseInvoice({ template: 'retired-design' }).template).toBe(DEFAULT_TEMPLATE);
  expect(normaliseInvoice({ template: 'modern' }).template).toBe('modern');
  // An invoice saved before designs existed opens on the default.
  expect(normaliseInvoice({ fromName: 'A' }).template).toBe(DEFAULT_TEMPLATE);
});

test('every design declares a full palette', () => {
  expect(TEMPLATES.length).toBeGreaterThanOrEqual(3);
  const ids = new Set(TEMPLATES.map((t) => t.id));
  expect(ids.size).toBe(TEMPLATES.length);
  for (const template of TEMPLATES) {
    for (const [key, value] of Object.entries(template.palette)) {
      expect(value, `${template.id}.${key}`).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(template.name.length, template.id).toBeGreaterThan(0);
    expect(template.summary.length, template.id).toBeGreaterThan(0);
  }
});

test('picking a design repaints the preview', async ({ page }) => {
  await seed(page, {});
  await showPreview(page);
  const preview = page.getByTestId('invoice-preview');
  await expect(preview).toHaveAttribute('data-template', 'classic');

  const accentOf = () =>
    preview.evaluate((el) => getComputedStyle(el).getPropertyValue('--paper-accent').trim());
  expect(await accentOf()).toBe('#2563eb');

  const tab = page.getByRole('tab', { name: 'Edit' });
  if (await tab.isVisible()) await tab.click();
  await page.getByTestId('template-modern').check();

  await showPreview(page);
  await expect(preview).toHaveAttribute('data-template', 'modern');
  expect(await accentOf()).toBe('#0f766e');
});

test('the chosen design survives a reload', async ({ page }) => {
  await seed(page, { template: 'bold' });
  await expect(page.getByTestId('template-bold')).toBeChecked();
  await page.reload();
  await expect(page.getByTestId('template-bold')).toBeChecked();
  await showPreview(page);
  await expect(page.getByTestId('invoice-preview')).toHaveAttribute('data-template', 'bold');
});

test('each design names itself distinctly to a screen reader', async ({ page }) => {
  await seed(page, {});
  const group = page.getByRole('radiogroup', { name: 'Invoice design' });
  await expect(group).toBeVisible();

  const names = new Set<string>();
  for (const template of TEMPLATES) {
    const radio = page.getByTestId(`template-${template.id}`);
    // The name is the design's name alone; the summary is a description, so a
    // screen reader announces "Modern" rather than "Modern, Teal throughout,
    // softly rounded."
    await expect(radio).toHaveAccessibleName(template.name);
    await expect(radio).toHaveAccessibleDescription(template.summary);
    names.add(template.name);
  }
  expect(names.size).toBe(TEMPLATES.length);
});

for (const template of TEMPLATES) {
  test(`the ${template.id} design reaches the PDF, not just the screen`, async ({ page }) => {
    await seed(page, { template: template.id });
    const pdf = pdfText(await downloadPdf(page));

    // The accent is drawn somewhere -- as the header rule, the band, or the
    // section labels. Its presence is what proves the picker changed the file
    // and not only the preview beside it.
    expect(pdf, `${template.id} accent missing from the PDF`).toContain(
      pdfColour(template.palette.accent),
    );
    expect(pdf, `${template.id} total bar missing from the PDF`).toContain(
      pdfColour(template.palette.total),
    );
    // One page: the design changes colours, never the amount of content.
    expect(pdf.match(/595\.280029 841\.890015 re/g) ?? []).toHaveLength(1);
  });
}

test('place of supply reads in the Bill To block, on screen as in the PDF', async ({ page }) => {
  // These two had drifted: the preview showed it in the header stack while the
  // PDF showed it under the recipient, so the document on screen was not the
  // document that downloaded.
  await seed(page, {});
  await showPreview(page);
  await expect(page.getByTestId('preview-state-bill-to')).toHaveText(
    'Place of supply: Maharashtra (27)',
  );
  await expect(page.getByTestId('preview-state-bill-from')).toHaveText('State: Karnataka (29)');
  await expect(page.getByTestId('invoice-preview')).not.toContainText('Place of supply\nNot set');
});
