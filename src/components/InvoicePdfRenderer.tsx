// The lazy boundary around the PDF engine.
//
// @react-pdf/renderer pulls in yoga-layout, pdfkit, fontkit, png-js, crypto-js
// and pako -- about 1.5 MB of JavaScript that is worthless until someone
// actually clicks Download. This module is the ONLY place besides InvoicePDF
// that may reference the engine, and nothing may import it statically.
//
// Reach it exclusively through `await import('./InvoicePdfRenderer')` from
// inside an event handler. A static import anywhere puts the whole engine back
// on the critical path, so eslint.config.mjs enforces this with
// no-restricted-imports.
//
// Both the `pdf` function and the InvoicePDF component are funnelled through
// this one module deliberately: InvoicePDF already imports the engine
// statically, so importing the two separately would emit two chunks that each
// drag it in.
import { pdf } from '@react-pdf/renderer';
import InvoicePDF from './InvoicePDF';
import type { InvoiceData } from './InvoiceForm';

export async function renderInvoicePdfBlob(data: InvoiceData): Promise<Blob> {
  return pdf(<InvoicePDF data={data} />).toBlob();
}
