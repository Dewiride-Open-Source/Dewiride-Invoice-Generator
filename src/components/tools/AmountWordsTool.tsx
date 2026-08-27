import React, { useState } from 'react';
import Link from 'next/link';
import { NumberField, SelectField } from '../fields';
import { MAX_AMOUNT, amountInWords } from '../../utils/amountInWords';
import { CURRENCIES, POPULAR_CURRENCY_CODES, formatCurrency } from '../../utils/currency';

/**
 * A rupee figure, written out.
 *
 * Uses the same amountInWords the PDF uses, so what this page shows is exactly
 * what would be printed under the totals of an invoice for the same amount --
 * including the Indian lakh/crore grouping for INR and the ISO code for
 * everything else.
 */
const AmountWordsTool: React.FC = () => {
  const [amount, setAmount] = useState(118050.5);
  const [currency, setCurrency] = useState('INR');

  const clean = Number.isFinite(amount) ? Math.max(0, Math.min(MAX_AMOUNT, amount)) : 0;
  const words = amountInWords(clean, currency);
  const tooLarge = Number.isFinite(amount) && amount > MAX_AMOUNT;

  const popular = CURRENCIES.filter((entry) =>
    (POPULAR_CURRENCY_CODES as readonly string[]).includes(entry.code),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="words-inputs" className="card p-5 sm:p-6">
        <h2 id="words-inputs" className="text-lg font-semibold tracking-tight text-fg">
          The amount
        </h2>
        <div className="mt-5 space-y-5">
          <NumberField
            label="Amount"
            value={amount}
            onValueChange={setAmount}
            min={0}
            step={0.01}
            data-testid="words-amount"
          />
          <SelectField
            label="Currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            hint="Rupees are written in the Indian system — lakh and crore. Every other currency uses thousand, million and billion."
            data-testid="words-currency"
          >
            <optgroup label="Popular">
              {popular.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.code} — {entry.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="All currencies">
              {CURRENCIES.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.code} — {entry.name}
                </option>
              ))}
            </optgroup>
          </SelectField>
          {tooLarge && (
            <p role="alert" className="text-sm text-danger-text" data-testid="words-too-large">
              That is larger than this converter handles. Amounts above{' '}
              {formatCurrency(MAX_AMOUNT, currency)} cannot be represented exactly in JavaScript
              down to the paisa, so it would round somewhere you could not see.
            </p>
          )}
        </div>
      </section>

      <section
        aria-labelledby="words-result"
        className="card p-5 sm:p-6 lg:sticky lg:top-24"
        data-testid="words-result"
      >
        <h2 id="words-result" className="text-lg font-semibold tracking-tight text-fg">
          In words
        </h2>
        <p className="mt-5 text-2xl font-bold tabular tracking-tight text-fg">
          {formatCurrency(clean, currency)}
        </p>
        <p
          role="status"
          aria-live="polite"
          className="mt-3 rounded-lg bg-surface-sunken p-4 text-base font-semibold leading-relaxed text-fg"
          data-testid="words-output"
        >
          {words}
        </p>
        <p className="mt-5 border-t border-border pt-4 text-sm text-fg-muted">
          Every invoice this site generates prints this line under the totals automatically.{' '}
          <Link href="/" className="text-brand-text underline underline-offset-4">
            Make an invoice
          </Link>
          .
        </p>
      </section>
    </div>
  );
};

export default AmountWordsTool;
