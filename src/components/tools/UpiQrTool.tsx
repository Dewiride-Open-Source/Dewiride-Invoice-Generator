import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { NumberField, TextField, buttonClass } from '../fields';
import { useQrCode } from '../../hooks/useQrCode';
import { formatCurrency } from '../../utils/currency';
import { buildUpiLink, isValidUpiId } from '../../utils/upi';

/** Rendered at 8x module size: big enough to print, small enough to email. */
const PNG_SCALE = 8;

/**
 * A UPI QR from a VPA, an optional amount and an optional note.
 *
 * The link is built by the same buildUpiLink the invoices use, so a QR
 * downloaded here and a QR printed on an invoice are byte-identical for the
 * same inputs. Nothing is sent anywhere: the encoder runs in the browser and
 * the VPA never leaves it.
 */
const UpiQrTool: React.FC = () => {
  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [note, setNote] = useState('');
  const [fixAmount, setFixAmount] = useState(false);
  const [amount, setAmount] = useState(0);
  const [touched, setTouched] = useState(false);

  const trimmed = upiId.trim();
  const valid = isValidUpiId(trimmed);

  const link = buildUpiLink({
    upiId: trimmed,
    payeeName,
    amount: fixAmount ? amount : undefined,
    note,
    currency: 'INR',
  });

  const qr = useQrCode(link);

  const downloadPng = useCallback(() => {
    if (!qr) return;
    const canvas = document.createElement('canvas');
    canvas.width = qr.size * PNG_SCALE;
    canvas.height = qr.size * PNG_SCALE;
    const context = canvas.getContext('2d');
    if (!context) return;

    // A QR with a transparent background is unscannable the moment it lands on
    // anything dark, so the white is painted rather than assumed.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(PNG_SCALE, PNG_SCALE);
    context.fillStyle = '#000000';
    context.fill(new Path2D(qr.path));

    const anchor = document.createElement('a');
    anchor.href = canvas.toDataURL('image/png');
    anchor.download = `upi-qr-${trimmed.replace(/[^a-zA-Z0-9]+/g, '-')}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, [qr, trimmed]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="upi-inputs" className="card p-5 sm:p-6">
        <h2 id="upi-inputs" className="text-lg font-semibold tracking-tight text-fg">
          Who is being paid
        </h2>
        <div className="mt-5 space-y-5">
          <TextField
            label="UPI ID"
            name="upi-id"
            autoComplete="off"
            spellCheck={false}
            placeholder="yourname@okhdfcbank"
            value={upiId}
            onChange={(event) => setUpiId(event.target.value)}
            // On blur, never while typing: "acme@" is a half-finished address,
            // not a mistake, and flagging it mid-keystroke trains people to
            // ignore the message that matters.
            onBlur={() => setTouched(true)}
            error={touched && trimmed && !valid ? 'That does not look like a UPI ID.' : undefined}
            hint="The address money is sent to — handle@bank. Nothing is verified against a bank; check it against your own app."
            data-testid="upi-tool-id"
          />
          <TextField
            label="Payee name"
            name="payee-name"
            autoComplete="off"
            placeholder="Acme Traders"
            value={payeeName}
            onChange={(event) => setPayeeName(event.target.value)}
            hint="NPCI marks this mandatory in the link spec, so fill it in even though most apps now display the bank-registered name instead. Up to 50 characters."
            data-testid="upi-tool-name"
          />
          <TextField
            label="Payment note"
            name="upi-note"
            autoComplete="off"
            placeholder="Invoice INV-2026-042"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            hint="Carried into the payer's statement, which is what lets you reconcile it later."
            data-testid="upi-tool-note"
          />

          <div className="rounded-lg border border-border bg-surface-sunken p-4">
            {/* Named and described by the two spans, as in GstCalculator:
                the name stays "Ask for a specific amount" rather than the
                whole paragraph running on after it. */}
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={fixAmount}
                onChange={(event) => setFixAmount(event.target.checked)}
                aria-labelledby="upi-fix-amount-label"
                aria-describedby="upi-fix-amount-hint"
                className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
                data-testid="upi-tool-fix-amount"
              />
              <span className="min-w-0">
                <span id="upi-fix-amount-label" className="block text-sm font-medium text-fg">
                  Ask for a specific amount
                </span>
                <span id="upi-fix-amount-hint" className="block text-xs text-fg-muted">
                  Leave this off for a QR you can reuse — the payer types the amount. Turn it on
                  for a one-off request against a particular bill.
                </span>
              </span>
            </label>
            {fixAmount && (
              <div className="mt-4">
                <NumberField
                  label="Amount (₹)"
                  value={amount}
                  onValueChange={setAmount}
                  min={0}
                  step={0.01}
                  data-testid="upi-tool-amount"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="upi-result"
        className="card p-5 sm:p-6 lg:sticky lg:top-24"
        data-testid="upi-tool-result"
      >
        <h2 id="upi-result" className="text-lg font-semibold tracking-tight text-fg">
          Your QR code
        </h2>

        {qr && link ? (
          <div className="mt-5" data-upi-link={link}>
            <svg
              viewBox={`0 0 ${qr.size} ${qr.size}`}
              className="mx-auto block size-56 rounded-lg bg-white p-2"
              role="img"
              aria-label={
                fixAmount && amount > 0
                  ? `UPI payment QR code for ${formatCurrency(amount, 'INR')}`
                  : 'UPI payment QR code'
              }
              data-testid="upi-tool-qr"
            >
              <path d={qr.path} fill="#000000" />
            </svg>

            <button
              type="button"
              onClick={downloadPng}
              className={`${buttonClass.primary} mt-5 w-full`}
              data-testid="upi-tool-download"
            >
              Download PNG
            </button>

            {!payeeName.trim() && (
              <p
                className="mt-4 rounded-lg border border-border bg-surface-sunken p-3 text-xs leading-relaxed text-fg-muted"
                data-testid="upi-tool-no-name"
              >
                This QR has no <code>pn</code> tag. NPCI&rsquo;s linking specification marks the
                payee name mandatory in both static and dynamic mode, so add one before you print
                this.
              </p>
            )}

            <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-fg-muted">
              The link inside it
            </h3>
            {/* Shown, not hidden. A QR is opaque: printing the link it encodes
                is the only way someone can check what they are about to put on
                a counter or an invoice. */}
            <p
              className="mt-2 break-all rounded-lg bg-surface-sunken p-3 font-mono text-xs text-fg"
              data-testid="upi-tool-link"
            >
              {link}
            </p>
          </div>
        ) : (
          <p className="mt-5 rounded-lg bg-surface-sunken p-4 text-sm text-fg-muted">
            Enter a UPI ID above and the code appears here. Nothing is sent anywhere — the QR is
            built in this browser.
          </p>
        )}

        <p className="mt-5 border-t border-border pt-4 text-sm text-fg-muted">
          Want the QR on the invoice itself?{' '}
          <Link
            href="/gst-invoice-generator/"
            className="text-brand-text underline underline-offset-4"
          >
            Add your UPI ID to an invoice
          </Link>{' '}
          and it is printed on the PDF with the invoice total already filled in.
        </p>
      </section>
    </div>
  );
};

export default UpiQrTool;
