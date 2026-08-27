/**
 * The images an invoice carries -- the business logo and the signature --
 * resized in the browser and stored as data URIs.
 *
 * They travel with the invoice: into sessionStorage as part of the draft,
 * into IndexedDB as part of the history, and into the PDF as embedded
 * images. That is what makes the size cap load-bearing rather than tidy -- an
 * uncapped 4 MB phone photo would be re-serialised into sessionStorage on
 * every keystroke and stored again for every invoice ever saved.
 *
 * So whatever the user picks is rasterised down to a fixed edge and re-encoded
 * until it fits MAX_IMAGE_BYTES, and rejected with a real message if it cannot.
 *
 * Output is always PNG or JPEG. @react-pdf decodes only those two -- a WebP
 * data URI is accepted as input, because canvas can read it, but never stored.
 */

/**
 * 512px on the longest edge. A logo prints about 40mm wide on A4, which is
 * ~470px at 300dpi, so this is sharp at print resolution and nothing beyond it
 * is visible. A signature prints smaller still.
 */
const MAX_EDGE = 512;

/**
 * Cap on the stored data URI, not the source file. A 512px logo is typically
 * 15-60 KB; 128 KB leaves room for detailed marks while bounding the history
 * store, which keeps up to 500 invoices -- and an invoice can carry two of
 * these, so the real per-invoice ceiling is 256 KB.
 */
export const MAX_IMAGE_BYTES = 128 * 1024;

/** Rejected before decoding, so a mis-picked video never reaches a canvas. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** What the file picker offers. Kept in step with ACCEPTED_IMAGE_TYPES. */
export const IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(',');

/**
 * Guards what is *read back* -- from a restored draft, from the history store,
 * or from a hand-edited history export, which is a file the user can craft.
 * Only a base64 PNG or JPEG data URI within the cap is ever rendered, so a
 * remote URL cannot be smuggled into an <img> to phone home, and an SVG (which
 * can carry markup) cannot be stored at all.
 */
const STORED_IMAGE_PATTERN = /^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;

export const isStoredImage = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= MAX_IMAGE_BYTES &&
  STORED_IMAGE_PATTERN.test(value);

/**
 * Tried in order; the first result inside the cap wins.
 *
 * PNG first because most logos are flat-colour marks with transparency, which
 * PNG stores losslessly and small. A photographic or gradient-heavy logo blows
 * the cap as PNG, so the fallbacks re-encode as JPEG -- compositing onto white,
 * since the invoice is a white sheet -- and then step the size down.
 */
const ENCODINGS = [
  { edge: MAX_EDGE, type: 'image/png' as const, quality: undefined },
  { edge: MAX_EDGE, type: 'image/jpeg' as const, quality: 0.9 },
  { edge: 384, type: 'image/jpeg' as const, quality: 0.82 },
  { edge: 256, type: 'image/jpeg' as const, quality: 0.75 },
];

/** Message is shown to the user verbatim, so it says what to do next. */
export class ImageError extends Error {}

const decode = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageError('That image could not be read. Try a different file.'));
    };
    image.src = url;
  });

const render = (
  image: HTMLImageElement,
  { edge, type, quality }: (typeof ENCODINGS)[number],
): string | null => {
  // Only ever downscale. Upscaling a 64px favicon to 512 would quadruple the
  // stored bytes to show the same blur.
  const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  if (type === 'image/jpeg') {
    // JPEG has no alpha channel. Without this, transparent pixels come out
    // black rather than as the paper behind them.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(image, 0, 0, width, height);

  try {
    return canvas.toDataURL(type, quality);
  } catch {
    // A tainted canvas cannot happen here (the source is a local file), but
    // toDataURL also throws on some memory-constrained mobile browsers.
    return null;
  }
};

/**
 * Turns a picked file into a storable data URI, or throws an ImageError whose
 * message is fit to show the user.
 */
export const prepareImage = async (file: File): Promise<string> => {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ImageError('Choose a PNG, JPEG or WebP image.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageError(
      `That file is ${Math.round(file.size / 1024 / 1024)} MB. Choose an image under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
    );
  }

  const image = await decode(file);
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new ImageError('That image could not be read. Try a different file.');
  }

  for (const encoding of ENCODINGS) {
    const result = render(image, encoding);
    if (result && isStoredImage(result)) return result;
  }

  throw new ImageError(
    'That image is too detailed to embed in a PDF. Try a simpler one, or export it smaller.',
  );
};
