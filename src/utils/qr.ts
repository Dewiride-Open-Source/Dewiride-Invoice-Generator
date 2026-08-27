/**
 * QR encoding, behind a lazy boundary.
 *
 * `uqr` is ~27 KB of encoder that is worthless to the 99% of visitors who never
 * enter a UPI ID, so it must never reach first paint. Two importers are
 * allowed, and both already sit behind a dynamic import:
 *
 *   - InvoicePDF.tsx, which lives inside the PDF chunk and renders synchronously
 *   - useQrCode.ts, which reaches this module with `await import('../utils/qr')`
 *
 * eslint.config.mjs enforces that with no-restricted-imports, and
 * scripts/measure-first-paint.mjs greps the chunks the exported HTML actually
 * references for uqr's alphanumeric charset table. The ESLint rule catches the
 * mistake in the editor; the grep catches it if the rule is ever relaxed.
 *
 * The output is an SVG path rather than a raster. It is the one representation
 * both consumers can use -- @react-pdf draws it with <Path>, the preview drops
 * it into an <svg> -- so the QR in the PDF and the QR on screen are generated
 * from the same string by the same code, and it stays sharp at any zoom or
 * print resolution, which a canvas PNG would not.
 */
import { encode } from 'uqr';

/**
 * The four-module quiet zone the QR specification requires. Scanners use it to
 * find the symbol's edges; without it, a code printed flush against invoice
 * text is measurably harder to read.
 */
const QUIET_ZONE_MODULES = 4;

export interface QrPath {
  /** Width and height in modules, quiet zone included. Use as the viewBox. */
  size: number;
  /** SVG path data covering every dark module, in that same module space. */
  path: string;
}

/**
 * Error correction level M: ~15% of the symbol can be damaged and still decode.
 * L makes a smaller code but leaves no margin for a smudged print or a phone
 * camera at an angle, and this is a code someone will scan off paper to send
 * money.
 */
const ERROR_CORRECTION = 'M' as const;

export const toQrPath = (text: string): QrPath => {
  const { size, data } = encode(text, { ecc: ERROR_CORRECTION, border: QUIET_ZONE_MODULES });

  // Horizontal runs are merged into one rectangle each. A 33-module code has
  // ~550 dark modules; emitting a subpath per module makes a ~9 KB `d`
  // attribute that is then embedded in the PDF and re-parsed on every render.
  let path = '';
  for (let y = 0; y < size; y += 1) {
    const row = data[y];
    let x = 0;
    while (x < size) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      let run = 1;
      while (x + run < size && row[x + run]) run += 1;
      path += `M${x} ${y}h${run}v1h-${run}z`;
      x += run;
    }
  }

  return { size, path };
};
