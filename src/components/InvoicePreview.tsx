import React from 'react';
import { InvoiceData, paymentRows } from '../types/invoice';
import { useQrCode } from '../hooks/useQrCode';
import { amountInWords } from '../utils/amountInWords';
import { formatCurrency } from '../utils/currency';
import { stateLabel } from '../utils/gst';
import { getTemplate } from '../utils/templates';
import { computeTotals, lineDiscount, lineTotal } from '../utils/totals';
import { invoiceUpiLink } from '../utils/upi';

interface InvoicePreviewProps {
  data: InvoiceData;
}

/**
 * Empty-field hint. Uses the paper-fg-muted token (5.4:1 on the sheet, 5.2:1
 * on the address cards); the slate-400 tint it replaced sat at 2.5:1.
 */
const Placeholder: React.FC<{ children: string }> = ({ children }) => (
  <span className="italic text-paper-fg-muted">{children}</span>
);

const cell = 'p-2.5 align-top text-paper-fg';
/** Money and codes never wrap: "-\u20B925,000.00" split over two lines reads as two figures. */
const numericCell = `${cell} whitespace-nowrap tabular`;

/**
 * A live preview of the generated PDF.
 *
 * The `paper` class keeps this light in dark mode. That is deliberate: the
 * panel represents a printed document, and rendering a dark version of a page
 * that will print white would misrepresent the output.
 *
 * Every number here comes from computeTotals, and every optional block is
 * rendered on the same condition the PDF uses, so what is on screen is what
 * comes out of the file.
 */
const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data }) => {
  const totals = computeTotals(data);
  const template = getTemplate(data.template);
  const payment = paymentRows(data.payment);
  const upiLink = invoiceUpiLink(data);
  const qr = useQrCode(upiLink);

  const isTaxInvoice = totals.treatment !== 'none';
  // A dead column is worse than a missing one: it takes width from the
  // description on every invoice to serve the ones that filled it in.
  const showHsn = data.items.some((item) => item.hsnSac.trim());
  const showDiscount = totals.discount > 0;
  const words = totals.total > 0 ? amountInWords(totals.total, data.currency) : '';
  const closing = Boolean(data.notes.trim() || data.paymentTerms.trim() || data.signature);

  /*
    The design, applied by redefining the tokens the sheet already draws from.
    Everything below keeps using `text-paper-accent` and `bg-paper-header`
    exactly as it did -- which is the reason four designs cost four palettes
    rather than four components, and the reason none of them can drift out of
    step with the layout.
  */
  const palette = {
    '--paper-accent': template.palette.accent,
    '--paper-accent-fg': template.palette.accentFg,
    '--paper-header': template.palette.header,
    '--paper-header-fg': template.palette.headerFg,
    '--paper-sunken': template.palette.sunken,
    '--paper-total': template.palette.total,
    '--paper-total-fg': template.palette.totalFg,
    '--paper-radius': `${template.radius}px`,
  } as React.CSSProperties;

  /** Unfilled designs draw a hairline where a filled one draws a background. */
  const block = template.filled
    ? 'bg-paper-sunken'
    : 'border border-paper-border bg-transparent';
  const totalsRow = template.filled ? 'bg-paper-sunken' : 'border-b border-paper-border';

  return (
    <div
      className="paper invoice-preview p-5 sm:p-6"
      style={palette}
      data-testid="invoice-preview"
      data-template={template.id}
    >
      {/*
        Inside a band, the body tokens reverse rather than every element
        acquiring a conditional colour class. That is not tidiness: the first
        version set the colour on the <dl> and was silently overridden by the
        explicit text-paper-fg on each <dd>, so the labels printed dark on
        indigo -- and the PDF, which reverses them properly, disagreed with the
        preview. Redefining the token catches the placeholders too.
      */}
      <div
        className={`flex items-start justify-between gap-4 ${
          template.bandHeader
            ? 'rounded-[var(--paper-radius)] bg-paper-accent p-4'
            : 'border-b-2 border-paper-accent pb-4'
        }`}
        style={
          template.bandHeader
            ? ({
                '--paper-fg': template.palette.accentFg,
                '--paper-fg-muted': template.palette.accentFg,
              } as React.CSSProperties)
            : undefined
        }
      >
        <div className="min-w-0">
          {data.logo && (
            /*
              The white plate is not decoration. A band design puts the logo on
              a solid accent block, and most logos are a single dark or brand
              colour -- a blue mark on indigo is simply not there.
            */
            <span
              className={
                template.bandHeader
                  ? 'mb-3 inline-block rounded bg-white p-1.5'
                  : 'mb-3 inline-block'
              }
            >
              {/*
                A capped local data URI, drawn at its display size. next/image
                exists to resize and cache network images; there is no network
                here, and in a static export it would only add a wrapper.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.logo}
                alt={data.fromName ? `${data.fromName} logo` : 'Your business logo'}
                className="block max-h-14 max-w-40 object-contain object-left"
                data-testid="preview-logo"
              />
            </span>
          )}
          {/* "Tax invoice" is the heading Rule 46 names, and it is what makes
              the document recognisable to the client's accountant. It appears
              only once a GSTIN says the invoice actually carries GST. */}
          <p className="text-2xl font-bold tracking-wide text-paper-fg" data-testid="preview-heading">
            {isTaxInvoice ? 'TAX INVOICE' : 'INVOICE'}
          </p>
        </div>
        <dl className={`shrink-0 text-right text-xs ${template.bandHeader ? '[&_dt]:opacity-80' : ''}`}>
          <dt className="text-paper-fg-muted">Invoice number</dt>
          <dd className="mb-1.5 font-semibold text-paper-fg">
            {data.invoiceNumber || <Placeholder>Not set</Placeholder>}
          </dd>
          <dt className="text-paper-fg-muted">Invoice date</dt>
          <dd className="mb-1.5 font-semibold text-paper-fg">
            {data.invoiceDate || <Placeholder>Not set</Placeholder>}
          </dd>
          <dt className="text-paper-fg-muted">Due date</dt>
          <dd className="font-semibold text-paper-fg">
            {data.dueDate || <Placeholder>Not set</Placeholder>}
          </dd>
        </dl>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[
          {
            title: 'Bill from',
            name: data.fromName,
            address: data.fromAddress,
            gstin: data.supplierGstin,
            stateLine: data.supplierState ? `State: ${stateLabel(data.supplierState)}` : '',
          },
          {
            title: 'Bill to',
            name: data.toName,
            address: data.toAddress,
            gstin: data.buyerGstin,
            // Place of supply is a fact about the recipient, so it reads here
            // rather than in the header. Mirrors InvoicePDF exactly -- the two
            // had drifted, with the preview showing it in the header and the
            // PDF in this block.
            stateLine: data.placeOfSupply
              ? `Place of supply: ${stateLabel(data.placeOfSupply)}`
              : '',
          },
        ].map(({ title, name, address, gstin, stateLine }) => (
          <div key={title} className={`rounded-[var(--paper-radius)] p-4 ${block}`}>
            <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-paper-accent">
              {title}
            </p>
            <p className="mt-2 text-sm font-semibold break-words text-paper-fg">
              {name || <Placeholder>Not set</Placeholder>}
            </p>
            <p className="mt-1 whitespace-pre-line break-words text-xs leading-relaxed text-paper-fg-muted">
              {address}
            </p>
            {isTaxInvoice && gstin.trim() && (
              <p className="mt-1.5 text-xs text-paper-fg">
                <span className="text-paper-fg-muted">GSTIN </span>
                <span className="font-semibold">{gstin}</span>
              </p>
            )}
            {isTaxInvoice && stateLine && (
              <p className="text-xs text-paper-fg-muted" data-testid={`preview-state-${title.replace(' ', '-').toLowerCase()}`}>
                {stateLine}
              </p>
            )}
          </div>
        ))}
      </div>

      {/*
        Scrollable, not clipped.

        Six columns do not fit a phone, and the wrapper used to be
        overflow-hidden -- so on a 412px screen the Disc. and Amount columns
        were simply cut off the right-hand edge with nothing to indicate they
        existed. tabIndex makes the scroller reachable by keyboard, which is
        what axe's scrollable-region-focusable rule is for and what a
        keyboard-only user needs in order to reach the amounts at all.
      */}
      <div
        className="mt-5 overflow-x-auto rounded-[var(--paper-radius)] border border-paper-border"
        tabIndex={0}
        role="region"
        aria-label="Invoice line items, scrollable"
      >
        <table className="w-full text-xs">
          <caption className="sr-only">Invoice line items</caption>
          <thead>
            <tr
              className={`bg-paper-header text-[0.6875rem] uppercase tracking-wide text-paper-header-fg ${
                template.filled ? '' : 'border-b-2 border-paper-fg'
              }`}
            >
              <th scope="col" className="p-2.5 text-left font-bold">Description</th>
              {showHsn && (
                <th scope="col" className="whitespace-nowrap p-2.5 text-left font-bold">HSN/SAC</th>
              )}
              <th scope="col" className="p-2.5 text-center font-bold">Qty</th>
              <th scope="col" className="p-2.5 text-right font-bold">Price</th>
              {showDiscount && (
                <th scope="col" className="p-2.5 text-right font-bold">Disc.</th>
              )}
              <th scope="col" className="p-2.5 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr
                key={item.id}
                className={
                  template.filled && index % 2 === 0 ? 'bg-paper-sunken' : 'bg-transparent'
                }
              >
                <td className={`${cell} min-w-32 break-words`}>
                  {item.description || <Placeholder>Item description</Placeholder>}
                </td>
                {showHsn && <td className={numericCell}>{item.hsnSac}</td>}
                <td className={`${numericCell} text-center`}>{item.quantity}</td>
                <td className={`${numericCell} text-right`}>
                  {formatCurrency(item.price, data.currency)}
                </td>
                {showDiscount && (
                  <td className={`${numericCell} text-right`}>
                    {item.discount > 0
                      ? `−${formatCurrency(lineDiscount(item, data.currency), data.currency)}`
                      : ''}
                  </td>
                )}
                <td className={`${numericCell} text-right`}>
                  {formatCurrency(lineTotal(item, data.currency), data.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex justify-end">
        <dl className="w-full max-w-72 text-sm">
          {/*
            With no discount, "Subtotal" and "Taxable value" are the same
            number and printing both is padding. So the single row takes
            whichever name is meaningful, and the three-row form only appears
            once there is a deduction to show between them.
          */}
          <div className={`flex justify-between rounded px-3 py-1.5 ${totalsRow}`}>
            <dt className="text-paper-fg-muted">{showDiscount || !isTaxInvoice ? 'Subtotal' : 'Taxable value'}</dt>
            <dd className="font-semibold tabular text-paper-fg">
              {formatCurrency(totals.subtotal, data.currency)}
            </dd>
          </div>
          {showDiscount && (
            <>
              <div className={`mt-1 flex justify-between rounded px-3 py-1.5 ${totalsRow}`}>
                <dt className="text-paper-fg-muted">Discount</dt>
                <dd className="font-semibold tabular text-paper-fg" data-testid="preview-discount">
                  −{formatCurrency(totals.discount, data.currency)}
                </dd>
              </div>
              <div className={`mt-1 flex justify-between rounded px-3 py-1.5 ${totalsRow}`}>
                <dt className="text-paper-fg-muted">Taxable value</dt>
                <dd className="font-semibold tabular text-paper-fg" data-testid="preview-taxable">
                  {formatCurrency(totals.taxable, data.currency)}
                </dd>
              </div>
            </>
          )}
          {totals.taxLines.map((line) => (
            <div
              key={line.key}
              className={`mt-1 flex justify-between rounded px-3 py-1.5 ${totalsRow}`}
            >
              <dt className="text-paper-fg-muted">{line.label}</dt>
              <dd
                className="font-semibold tabular text-paper-fg"
                data-testid={`preview-tax-${line.key}`}
              >
                {formatCurrency(line.amount, data.currency)}
              </dd>
            </div>
          ))}
          {totals.shipping > 0 && (
            <div className={`mt-1 flex justify-between rounded px-3 py-1.5 ${totalsRow}`}>
              <dt className="text-paper-fg-muted">Shipping</dt>
              <dd className="font-semibold tabular text-paper-fg" data-testid="preview-shipping">
                {formatCurrency(totals.shipping, data.currency)}
              </dd>
            </div>
          )}
          <div
            className={`mt-2 flex items-center justify-between px-3 py-2.5 bg-paper-total text-paper-total-fg ${
              template.filled
                ? 'rounded-[var(--paper-radius)]'
                : 'border-t-2 border-paper-fg pt-2.5'
            }`}
          >
            <dt className="text-xs font-bold uppercase tracking-wide">Total</dt>
            <dd className="text-base font-bold tabular" data-testid="preview-total">
              {formatCurrency(totals.total, data.currency)}
            </dd>
          </div>
        </dl>
      </div>

      {words && (
        <p className="mt-3 text-xs text-paper-fg" data-testid="preview-amount-words">
          <span className="text-paper-fg-muted">Amount in words: </span>
          <span className="font-semibold">{words}</span>
        </p>
      )}

      {(payment.length > 0 || qr) && (
        <section
          aria-label="Payment details"
          className="mt-5 flex flex-wrap items-start justify-between gap-4 rounded-lg border border-paper-border p-4"
          data-testid="preview-payment"
        >
          {/*
            min-w, not min-w-0: with the QR beside it this column would
            otherwise shrink to a few characters wide and break "Acme
            Consulting Pvt Ltd" mid-word down a ~5rem strip. A real minimum
            makes flex-wrap move the QR to its own line instead, which is what
            should happen on a phone.
          */}
          {payment.length > 0 && (
            <div className="min-w-[15rem] flex-1">
              <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-paper-accent">
                Payment details
              </p>
              <dl className="mt-2 space-y-1 text-xs">
                {payment.map(({ key, label, value }) => (
                  <div key={key} className="flex gap-2">
                    <dt className="w-24 shrink-0 text-paper-fg-muted">{label}</dt>
                    <dd className="min-w-0 break-words font-medium text-paper-fg">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {qr && upiLink && (
            <figure
              className="mx-auto shrink-0 text-center"
              data-testid="preview-upi-qr"
              data-upi-link={upiLink}
            >
              {/*
                Drawn as a path in module space, so it stays crisp at any size
                and matches the PDF exactly -- both come out of toQrPath.
                role="img" with a label, because the graphic carries meaning a
                blind user would otherwise have no route to; the UPI ID is
                already printed as text above.
              */}
              <svg
                viewBox={`0 0 ${qr.size} ${qr.size}`}
                className="size-24 bg-white"
                role="img"
                aria-label={`UPI payment QR code for ${formatCurrency(totals.total, data.currency)}`}
              >
                <path d={qr.path} fill="#000000" />
              </svg>
              <figcaption className="mt-1 text-[0.625rem] text-paper-fg-muted">
                Scan to pay by UPI
              </figcaption>
            </figure>
          )}
        </section>
      )}

      {closing && (
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4" data-testid="preview-closing">
          <div className="min-w-[15rem] flex-1 space-y-2 text-xs">
            {data.paymentTerms.trim() && (
              <p>
                <span className="text-paper-fg-muted">Payment terms: </span>
                <span className="font-medium text-paper-fg">{data.paymentTerms}</span>
              </p>
            )}
            {data.notes.trim() && (
              <p className="whitespace-pre-line break-words text-paper-fg-muted">{data.notes}</p>
            )}
          </div>
          {data.signature && (
            <figure className="shrink-0 text-center" data-testid="preview-signature">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.signature}
                alt={data.fromName ? `Signature for ${data.fromName}` : 'Signature'}
                className="mx-auto max-h-12 max-w-40 object-contain"
              />
              <figcaption className="mt-1 border-t border-paper-border pt-1 text-[0.625rem] text-paper-fg-muted">
                Authorised signatory
                {data.fromName ? (
                  <span className="block font-semibold text-paper-fg">{data.fromName}</span>
                ) : null}
              </figcaption>
            </figure>
          )}
        </div>
      )}

      <p className="mt-6 border-t border-paper-border pt-4 text-center text-[0.6875rem] text-paper-fg-muted">
        Thank you for your business!
      </p>
    </div>
  );
};

export default InvoicePreview;
