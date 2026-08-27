import { test, expect, Download, Page } from '@playwright/test';
import { inflateSync } from 'node:zlib';
import jsQR from 'jsqr';
import { normaliseInvoice } from '../src/types/invoice';
import { MAX_IMAGE_BYTES, isStoredImage } from '../src/utils/image';
import { buildUpiLink, isValidUpiId } from '../src/utils/upi';

/**
 * Getting paid: the logo, the bank block and the UPI QR.
 *
 * The QR is the part that carries money, so it is not enough to assert that a
 * square appeared. The test below rasterises the QR the app actually rendered
 * and decodes it, so what is proven is what a payer's phone would read.
 */

/** A 64x64 two-tone PNG. Small enough to inline, distinctive on a screenshot. */
const LOGO_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAeklEQVR42u3asQ0AIAgEQGZxOLd2FnUH' +
    'CqIcydcfriTEmGtncicyqe4PAAAAAAAAAAAAAAAAAAAAoCHA6wtk+wEAAAAAAAAAAAAAAAAAAICOAC5C' +
    'AAAAAAAAAAAAAAAAAAAAgP8AFyEAAAAAAAAAAAAAAAAAAADge4ADAK4KhuMH6sMAAAAASUVORK5CYII=',
  'base64',
);

const fillInvoice = async (page: Page) => {
  await page.getByLabel('Your business name').fill('Acme Consulting Pvt Ltd');
  await page.getByLabel('Your address').fill('12 MG Road, Bengaluru 560001');
  await page.getByLabel('Client name').fill('Globex Corporation');
  await page.getByLabel('Client address').fill('900 Market Street, San Francisco');
  await page.getByLabel('Invoice number').fill('INV-2026-042');
  await page.getByLabel('Description', { exact: true }).fill('Platform engineering retainer');
  await page.getByLabel('Quantity').fill('2');
  await page.getByLabel('Unit price').fill('50000');
};

/** On mobile the preview lives behind a tab; on desktop both panels are shown. */
const showPreview = async (page: Page) => {
  const tab = page.getByRole('tab', { name: 'Preview' });
  if (await tab.isVisible()) await tab.click();
};

const storedInvoice = (page: Page) =>
  page.evaluate(() => JSON.parse(sessionStorage.getItem('invoice-data') ?? '{}'));

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

/** Page count, from the /Count entry of the PDF's page-tree node. */
const pageCount = (pdf: Buffer): number => {
  const match = pdf.toString('latin1').match(/\/Count (\d+)/);
  expect(match, 'no /Count in the PDF page tree').not.toBeNull();
  return Number(match![1]);
};

/**
 * Closepath operators across every content stream.
 *
 * The visible text cannot be searched -- the embedded font is subset, so the
 * strings are re-encoded to glyph indices. Drawing operators are not: they are
 * plain ASCII in the (deflated) content stream, and the QR is several hundred
 * separate rectangles, so this counts it directly rather than inferring it
 * from the file size.
 */
const closepathOps = (pdf: Buffer): number => {
  let content = '';
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
      content += inflateSync(pdf.subarray(from, end)).toString('latin1');
    } catch {
      // Embedded font programs are not deflated content streams.
    }
    index = end + 'endstream'.length;
  }
  return (content.match(/(^|\s)h(\s|$)/g) ?? []).length;
};

// ---------------------------------------------------------------------------
// The UPI link. Pure functions, so these are unit tests: no browser needed.
// ---------------------------------------------------------------------------

test.describe('the UPI link', () => {
  test('percent-encodes to RFC 3986, not just to encodeURIComponent', () => {
    const link = buildUpiLink({
      upiId: 'acme@okhdfcbank',
      // Every character encodeURIComponent leaves alone but RFC 3986 reserves,
      // plus the & that would truncate the link if it slipped through raw.
      payeeName: "Smith & Sons (Pvt) Ltd *!'",
      amount: 118000,
      currency: 'INR',
    });

    expect(link).toBe(
      'upi://pay?pa=acme%40okhdfcbank&pn=Smith%20%26%20Sons%20%28Pvt%29%20Ltd%20%2A%21%27&am=118000.00&cu=INR',
    );
    // pa, pn, am, cu and nothing else: the payee name must not be able to
    // introduce a parameter of its own.
    expect(link!.split('&')).toHaveLength(4);
  });

  test('states the amount as a plain two-decimal number', () => {
    const of = (amount: number) =>
      buildUpiLink({ upiId: 'a@ybl', amount, currency: 'INR' })?.match(/am=([^&]*)/)?.[1];

    expect(of(1234.5)).toBe('1234.50');
    expect(of(1234)).toBe('1234.00');
    // Locale grouping here would be read as a different amount, or rejected.
    expect(of(1234567.89)).toBe('1234567.89');
    // A rupee-and-paisa total that floating point cannot represent exactly.
    expect(of(0.1 + 0.2)).toBe('0.30');
  });

  test('omits what it does not have rather than sending a blank', () => {
    const link = buildUpiLink({ upiId: 'acme@ybl', payeeName: '   ', currency: 'INR' });
    // No pn=, no am=, no tn= -- a payer can still scan it and type the amount.
    expect(link).toBe('upi://pay?pa=acme%40ybl&cu=INR');
  });

  test('truncates the payee name and note to the 50 characters UPI carries', () => {
    const link = buildUpiLink({
      upiId: 'a@ybl',
      payeeName: 'N'.repeat(80),
      note: 'X'.repeat(80),
      amount: 10,
      currency: 'INR',
    })!;
    expect(link).toContain(`pn=${'N'.repeat(50)}&`);
    expect(link).toContain(`tn=${'X'.repeat(50)}`);
  });

  test('refuses to produce a link that would be wrong', () => {
    // UPI settles in rupees. A dollar amount in a UPI QR would be paid as
    // rupees, silently, at roughly a ninetieth of the invoice.
    expect(buildUpiLink({ upiId: 'a@ybl', amount: 100, currency: 'USD' })).toBeNull();
    expect(buildUpiLink({ upiId: 'not-a-upi-id', amount: 100, currency: 'INR' })).toBeNull();
    expect(buildUpiLink({ upiId: '', amount: 100, currency: 'INR' })).toBeNull();
    // A negative or non-finite total drops the amount, not the whole link.
    expect(buildUpiLink({ upiId: 'a@ybl', amount: -5, currency: 'INR' })).toBe(
      'upi://pay?pa=a%40ybl&cu=INR',
    );
    expect(buildUpiLink({ upiId: 'a@ybl', amount: NaN, currency: 'INR' })).toBe(
      'upi://pay?pa=a%40ybl&cu=INR',
    );
  });

  test('accepts the shapes real VPAs take, and rejects the usual mistakes', () => {
    for (const valid of [
      '9876543210@ybl',
      'acme.traders@okicici',
      'merchant-01@paytm',
      'jagdish_k@okaxis',
      ' padded@upi ',
    ]) {
      expect(isValidUpiId(valid), valid).toBe(true);
    }
    for (const invalid of [
      'acme@',
      '@ybl',
      'acme',
      'acme@@ybl',
      'acme name@ybl',
      'acme@1bank',
      'acme@ybl extra',
      '',
    ]) {
      expect(isValidUpiId(invalid), invalid).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// The stored logo. The validator is a trust boundary: a history export is a
// file the user can hand-edit before importing it back.
// ---------------------------------------------------------------------------

test.describe('the stored logo', () => {
  test('only a capped PNG or JPEG data URI is ever accepted back', () => {
    expect(isStoredImage('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isStoredImage('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true);

    // @react-pdf decodes PNG and JPEG only; a stored WebP would print nothing.
    expect(isStoredImage('data:image/webp;base64,UklGRg==')).toBe(false);
    // SVG can carry markup, so it is never stored, only accepted as an upload
    // and rasterised.
    expect(isStoredImage('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBe(false);
    // A remote URL would turn an offline invoice into a tracking beacon that
    // fires every time the preview renders.
    expect(isStoredImage('https://tracker.example/pixel.png')).toBe(false);
    expect(isStoredImage('javascript:alert(1)')).toBe(false);
    expect(isStoredImage('data:image/png;base64,<script>')).toBe(false);
    expect(isStoredImage('')).toBe(false);
    expect(isStoredImage(null)).toBe(false);

    const oversized = `data:image/png;base64,${'A'.repeat(MAX_IMAGE_BYTES)}`;
    expect(isStoredImage(oversized)).toBe(false);
  });

  test('normaliseInvoice drops a logo it would not accept', () => {
    expect(normaliseInvoice({ logo: 'https://tracker.example/pixel.png' }).logo).toBe('');
    expect(normaliseInvoice({ logo: 'data:image/svg+xml;base64,PHN2Zz4=' }).logo).toBe('');
    expect(normaliseInvoice({ logo: 42 }).logo).toBe('');
    expect(normaliseInvoice({ logo: 'data:image/png;base64,iVBORw0KGgo=' }).logo).toBe(
      'data:image/png;base64,iVBORw0KGgo=',
    );
  });

  test('normaliseInvoice fills in a missing payment block rather than crashing', () => {
    expect(normaliseInvoice({}).payment.upiId).toBe('');
    expect(normaliseInvoice({ payment: 'nonsense' }).payment.ifsc).toBe('');
    expect(normaliseInvoice({ payment: { upiId: 'a@ybl', bogus: 1 } }).payment.upiId).toBe('a@ybl');
    expect(normaliseInvoice({ payment: { accountNumber: 12345 } }).payment.accountNumber).toBe('');
  });
});

// ---------------------------------------------------------------------------
// In the browser.
// ---------------------------------------------------------------------------

test.describe('the payment block', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('what is typed into the bank fields is what the invoice prints', async ({ page }) => {
    await fillInvoice(page);
    await page.getByLabel('Account holder').fill('Acme Consulting Pvt Ltd');
    await page.getByLabel('Bank name').fill('HDFC Bank, Koramangala');
    await page.getByLabel('Account number').fill('50100123456789');
    await page.getByLabel('IFSC code').fill('hdfc0001234');
    await showPreview(page);

    const block = page.getByTestId('preview-payment');
    await expect(block).toBeVisible();
    await expect(block).toContainText('Acme Consulting Pvt Ltd');
    await expect(block).toContainText('HDFC Bank, Koramangala');
    await expect(block).toContainText('50100123456789');
    // IFSC and SWIFT are uppercase by definition; typing them in lower case is
    // not a mistake worth making the user correct.
    await expect(block).toContainText('HDFC0001234');

    // Fields left blank do not print an empty row.
    await expect(block).not.toContainText('IBAN');
    await expect(block).not.toContainText('SWIFT');
  });

  test('there is no payment block until there is something to put in it', async ({ page }) => {
    await fillInvoice(page);
    await showPreview(page);
    await expect(page.getByTestId('preview-payment')).toHaveCount(0);
  });

  test('the UPI QR decodes to the link the invoice is asking to be paid', async ({ page }) => {
    await fillInvoice(page);
    await page.getByLabel('Tax rate (%)').fill('18');
    await page.getByLabel('UPI ID').fill('acme.traders@okicici');
    await showPreview(page);

    const qr = page.getByTestId('preview-upi-qr');
    await expect(qr).toBeVisible();

    // 2 x 50,000 = 100,000, +18% = 118,000.
    const expected =
      'upi://pay?pa=acme.traders%40okicici&pn=Acme%20Consulting%20Pvt%20Ltd&am=118000.00&cu=INR&tn=Invoice%20INV-2026-042';
    await expect(qr).toHaveAttribute('data-upi-link', expected);

    // The attribute above only says what we intended. This rasterises the
    // vector the app actually drew and reads it back the way a phone would,
    // which is the only assertion that would survive a bug in toQrPath.
    const { size, bits } = await qr.evaluate(async (node) => {
      const source = node.querySelector('svg')!;
      const clone = source.cloneNode(true) as SVGSVGElement;
      const edge = 220;
      clone.setAttribute('width', String(edge));
      clone.setAttribute('height', String(edge));

      const image = new Image();
      // Not btoa: the label carries a rupee sign, which is outside Latin-1.
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        new XMLSerializer().serializeToString(clone),
      )}`;
      await image.decode();

      const canvas = document.createElement('canvas');
      canvas.width = edge;
      canvas.height = edge;
      const context = canvas.getContext('2d')!;
      // The white behind the code is a CSS background on the live element and
      // does not survive serialisation, so it is painted here instead.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, edge, edge);
      context.drawImage(image, 0, 0, edge, edge);

      // One character per pixel rather than 190k array entries over the wire.
      const { data } = context.getImageData(0, 0, edge, edge);
      let out = '';
      for (let i = 0; i < data.length; i += 4) out += data[i] < 128 ? '1' : '0';
      return { size: edge, bits: out };
    });

    const pixels = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < size * size; i += 1) {
      const value = bits[i] === '1' ? 0 : 255;
      pixels.set([value, value, value, 255], i * 4);
    }

    expect(jsQR(pixels, size, size)?.data).toBe(expected);
  });

  test('a one-line invoice with a logo and payment details stays on one page', async ({ page }) => {
    // It did not, before the footer stopped being part of the flow: the
    // payment block filled the sheet and "Thank you for your business!" was
    // pushed onto a second page on its own.
    await fillInvoice(page);
    await page.getByLabel('Tax rate (%)').fill('18');
    await page.getByLabel('Account holder').fill('Acme Consulting Pvt Ltd');
    await page.getByLabel('Bank name').fill('HDFC Bank, Koramangala');
    await page.getByLabel('Account number').fill('50100123456789');
    await page.getByLabel('IFSC code').fill('HDFC0001234');
    await page.getByLabel('UPI ID').fill('acme.traders@okicici');
    await page.getByTestId('logo-input').setInputFiles({
      name: 'acme-logo.png',
      mimeType: 'image/png',
      buffer: LOGO_PNG,
    });
    await expect(page.getByTestId('logo-thumbnail')).toBeVisible();

    expect(pageCount(await downloadPdf(page))).toBe(1);
  });

  test('the QR is drawn into the PDF, not only into the preview', async ({ page }) => {
    await fillInvoice(page);
    const withoutQr = closepathOps(await downloadPdf(page));

    await page.getByLabel('UPI ID').fill('acme.traders@okicici');
    await showPreview(page);
    await expect(page.getByTestId('preview-upi-qr')).toBeVisible();
    const withQr = closepathOps(await downloadPdf(page));

    // A QR is several hundred rectangles. Anything less than a hundred more
    // than the baseline means the code did not reach the page.
    expect(withQr - withoutQr).toBeGreaterThan(100);
  });

  test('a non-rupee invoice gets the bank details but no QR', async ({ page }) => {
    await fillInvoice(page);
    await page.getByLabel('UPI ID').fill('acme.traders@okicici');
    await page.getByLabel('Currency').selectOption('USD');
    await showPreview(page);

    await expect(page.getByTestId('preview-payment')).toContainText('acme.traders@okicici');
    await expect(page.getByTestId('preview-upi-qr')).toHaveCount(0);
  });

  test('a half-typed UPI ID is not an error, but a finished wrong one is', async ({ page }) => {
    const field = page.getByLabel('UPI ID');
    const error = page.getByText(/does not look like a UPI ID/);

    await field.fill('acme@');
    await expect(error).toHaveCount(0);

    await field.blur();
    await expect(error).toBeVisible();
    await expect(field).toHaveAttribute('aria-invalid', 'true');

    await field.fill('acme@okicici');
    await expect(error).toHaveCount(0);
  });

  test('the QR encoder is not on the critical path', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (r) => {
      if (r.resourceType() === 'script') scripts.push(r.url());
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    const onLoad = scripts.length;

    await fillInvoice(page);
    await page.getByLabel('UPI ID').fill('acme.traders@okicici');
    await showPreview(page);
    await expect(page.getByTestId('preview-upi-qr')).toBeVisible();

    expect(scripts.length).toBeGreaterThan(onLoad);
  });
});

test.describe('the logo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('a picked file reaches the thumbnail, the preview and the draft', async ({ page }) => {
    await page.getByTestId('logo-input').setInputFiles({
      name: 'acme-logo.png',
      mimeType: 'image/png',
      buffer: LOGO_PNG,
    });

    await expect(page.getByTestId('logo-thumbnail')).toBeVisible();
    await showPreview(page);
    await expect(page.getByTestId('preview-logo')).toBeVisible();

    const stored = await storedInvoice(page);
    expect(isStoredImage(stored.logo)).toBe(true);
    expect(stored.logo.length).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
  });

  test('the alt text names the business once it is known', async ({ page }) => {
    await page.getByTestId('logo-input').setInputFiles({
      name: 'acme-logo.png',
      mimeType: 'image/png',
      buffer: LOGO_PNG,
    });
    await page.getByLabel('Your business name').fill('Acme Consulting Pvt Ltd');
    await showPreview(page);

    await expect(page.getByAltText('Acme Consulting Pvt Ltd logo')).toBeVisible();
  });

  test('removing it clears the preview and the draft, and returns focus', async ({ page }) => {
    const input = page.getByTestId('logo-input');
    await input.setInputFiles({ name: 'acme-logo.png', mimeType: 'image/png', buffer: LOGO_PNG });
    await expect(page.getByTestId('logo-thumbnail')).toBeVisible();

    await page.getByTestId('logo-remove').click();

    await expect(page.getByTestId('logo-thumbnail')).toHaveCount(0);
    await expect(page.getByTestId('preview-logo')).toHaveCount(0);
    expect((await storedInvoice(page)).logo).toBe('');
    // The Remove button has just unmounted; focus must not be left on <body>.
    await expect(input).toBeFocused();
  });

  test('a file that is not an image is refused, with a reason', async ({ page }) => {
    await page.getByTestId('logo-input').setInputFiles({
      name: 'invoice.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 not an image'),
    });

    // Scoped to the field's own message: announce() puts the same words into
    // the page-level live region, so role=alert alone matches twice.
    await expect(page.getByTestId('logo-error')).toContainText('Choose a PNG, JPEG or WebP image');
    await expect(page.getByTestId('logo-thumbnail')).toHaveCount(0);
    expect((await storedInvoice(page)).logo).toBe('');
  });

  test('a WebP upload is stored as something the PDF can actually draw', async ({ page }) => {
    // @react-pdf decodes PNG and JPEG. WebP is a reasonable thing to upload in
    // 2026 and has to be converted rather than rejected.
    const webp = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 96;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#2266dd';
      context.fillRect(0, 0, 96, 96);
      return canvas.toDataURL('image/webp');
    });
    test.skip(!webp.startsWith('data:image/webp'), 'this browser cannot encode WebP');

    await page.getByTestId('logo-input').setInputFiles({
      name: 'logo.webp',
      mimeType: 'image/webp',
      buffer: Buffer.from(webp.split(',')[1], 'base64'),
    });

    await expect(page.getByTestId('logo-thumbnail')).toBeVisible();
    expect((await storedInvoice(page)).logo).toMatch(/^data:image\/png;base64,/);
  });

  test('an image too detailed for PNG falls back to JPEG rather than blowing the cap', async ({
    page,
  }) => {
    // Random noise is incompressible, so a 1200px PNG of it is megabytes. This
    // is the case the encoding ladder exists for.
    const noise = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1200;
      const context = canvas.getContext('2d')!;
      const image = context.createImageData(1200, 1200);
      // A fixed sequence, not Math.random: a flaky size is not worth the
      // realism, and this is just as incompressible.
      let seed = 1;
      for (let i = 0; i < image.data.length; i += 4) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        image.data.set([seed % 256, (seed >> 8) % 256, (seed >> 16) % 256, 255], i);
      }
      context.putImageData(image, 0, 0);
      return canvas.toDataURL('image/png');
    });

    await page.getByTestId('logo-input').setInputFiles({
      name: 'noise.png',
      mimeType: 'image/png',
      buffer: Buffer.from(noise.split(',')[1], 'base64'),
    });

    await expect(page.getByTestId('logo-thumbnail')).toBeVisible();
    const stored = await storedInvoice(page);
    expect(stored.logo).toMatch(/^data:image\/jpeg;base64,/);
    expect(stored.logo.length).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
  });

  test('the logo and payment details survive a save and reopen', async ({ page }) => {
    await fillInvoice(page);
    await page.getByLabel('UPI ID').fill('acme.traders@okicici');
    await page.getByLabel('IFSC code').fill('HDFC0001234');
    await page.getByTestId('logo-input').setInputFiles({
      name: 'acme-logo.png',
      mimeType: 'image/png',
      buffer: LOGO_PNG,
    });
    await expect(page.getByTestId('logo-thumbnail')).toBeVisible();

    const saved = (await storedInvoice(page)).logo;

    // Downloading is what commits an invoice to the history.
    await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /download as pdf/i }).first().click(),
    ]);

    // The save is deliberately not awaited by the download handler, so wait for
    // the count in the header rather than reloading into a race the product
    // does not actually have -- a person cannot reload inside an IndexedDB
    // transaction, but a test can.
    await expect(page.getByTestId('open-history')).toContainText('(1)');

    await page.reload();
    await page.getByTestId('open-history').click();
    await page.getByRole('button', { name: /^open/i }).first().click();

    expect((await storedInvoice(page)).logo).toBe(saved);
    await expect(page.getByLabel('UPI ID')).toHaveValue('acme.traders@okicici');
    await expect(page.getByLabel('IFSC code')).toHaveValue('HDFC0001234');
  });
});
