import React, { useId, useState } from 'react';
import Link from 'next/link';
import { NumberField } from '../fields';
import { formatCurrency, roundMoney } from '../../utils/currency';
import { buildTaxLines } from '../../utils/totals';

type Direction = 'exclusive' | 'inclusive';
type Scope = 'intra' | 'inter';

const CURRENCY = 'INR';

/**
 * The rates actually in force, as combined GST.
 *
 * Not the 5/12/18/28 every other calculator still shows. Notification
 * 09/2025-Central Tax (Rate), effective 22 September 2025, carries seven
 * schedules of central tax -- 0.125, 0.75, 1.5, 2.5, 9, 14 and 20 per cent --
 * which double to these totals on an intra-State supply. 28% went with the
 * omission of Schedule VII on 1 February 2026, and 12% survives only for the
 * brick entries notified separately by 14/2025-CT(R).
 *
 * A free numeric input sits alongside, because the schedule moves and a fixed
 * list quietly becomes the wrong answer.
 */
const QUICK_RATES = [0, 0.25, 1.5, 3, 5, 12, 18, 40];

const Choice = <T extends string>({
  name,
  legend,
  value,
  onChange,
  options,
}: {
  name: string;
  legend: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; hint: string }[];
}) => {
  const id = useId();
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-fg">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          /*
            Named and described by the two spans rather than by the label's
            concatenated text: a screen reader then announces "No — add GST,
            radio" with "The amount is the taxable value" as the description,
            instead of running the two together. Same reason TemplatePicker
            does it -- and it satisfies the a11y rule honestly rather than
            with a suppression.
          */
          <label
            key={option.value}
            className={`flex cursor-pointer gap-2.5 rounded-lg border p-3 transition-colors ${
              value === option.value
                ? 'border-brand bg-brand-subtle'
                : 'border-border bg-surface hover:bg-surface-sunken'
            }`}
          >
            <input
              type="radio"
              name={`${name}-${id}`}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-labelledby={`${id}-${option.value}-label`}
              aria-describedby={`${id}-${option.value}-hint`}
              className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
              data-testid={`${name}-${option.value}`}
            />
            <span className="min-w-0">
              <span
                id={`${id}-${option.value}-label`}
                className="block text-sm font-medium text-fg"
              >
                {option.label}
              </span>
              <span id={`${id}-${option.value}-hint`} className="block text-xs text-fg-muted">
                {option.hint}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};

/**
 * Add GST to an amount, or take it back out of one.
 *
 * Every number here comes from the same buildTaxLines the invoices use, so the
 * calculator and a generated tax invoice cannot disagree about what 18% of
 * 45,000 splits into. A second implementation would have been half the code
 * and exactly the wrong trade.
 */
const GstCalculator: React.FC = () => {
  const [amount, setAmount] = useState(10000);
  const [rate, setRate] = useState(18);
  const [direction, setDirection] = useState<Direction>('exclusive');
  const [scope, setScope] = useState<Scope>('intra');

  const entered = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const clampedRate = Math.min(100, Math.max(0, Number.isFinite(rate) ? rate : 0));

  // Exclusive: what you typed is the taxable value.
  // Inclusive: the taxable value is what the rate was applied *to*, so it is
  // recovered by dividing rather than by subtracting a percentage -- taking
  // 18% off a GST-inclusive 1,180 gives 967.60, not 1,000.
  const taxable =
    direction === 'exclusive'
      ? roundMoney(entered, CURRENCY)
      : roundMoney((entered * 100) / (100 + clampedRate), CURRENCY);

  const lines = buildTaxLines(
    taxable,
    clampedRate,
    scope === 'intra' ? 'cgst-sgst' : 'igst',
    CURRENCY,
  );
  const tax = roundMoney(
    lines.reduce((sum, line) => sum + line.amount, 0),
    CURRENCY,
  );
  const total = roundMoney(taxable + tax, CURRENCY);

  // Each component is rounded to the paisa independently, so on small
  // inclusive amounts the parts can add back to a paisa either side of what
  // was typed. Saying so is better than silently forcing the total to match.
  const drift = direction === 'inclusive' ? roundMoney(total - entered, CURRENCY) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="gst-inputs" className="card p-5 sm:p-6">
        <h2 id="gst-inputs" className="text-lg font-semibold tracking-tight text-fg">
          Your figures
        </h2>

        <div className="mt-5 space-y-5">
          <NumberField
            label="Amount (₹)"
            value={amount}
            onValueChange={setAmount}
            min={0}
            step={0.01}
            data-testid="gst-amount"
          />

          <div>
            <NumberField
              label="GST rate (%)"
              value={rate}
              onValueChange={setRate}
              min={0}
              max={100}
              step={0.01}
              data-testid="gst-rate"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_RATES.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setRate(quick)}
                  aria-pressed={clampedRate === quick}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    clampedRate === quick
                      ? 'border-brand bg-brand text-brand-fg'
                      : 'border-border-strong bg-surface text-fg hover:bg-surface-sunken'
                  }`}
                  data-testid={`gst-rate-${quick}`}
                >
                  {quick}%
                </button>
              ))}
            </div>
          </div>

          <Choice
            name="direction"
            legend="Is GST already in that amount?"
            value={direction}
            onChange={setDirection}
            options={[
              {
                value: 'exclusive',
                label: 'No — add GST',
                hint: 'The amount is the taxable value.',
              },
              {
                value: 'inclusive',
                label: 'Yes — take GST out',
                hint: 'The amount is what the customer pays.',
              },
            ]}
          />

          <Choice
            name="scope"
            legend="Where is the supply going?"
            value={scope}
            onChange={setScope}
            options={[
              {
                value: 'intra',
                label: 'Within the same state',
                hint: 'CGST + SGST, half the rate each.',
              },
              {
                value: 'inter',
                label: 'To another state',
                hint: 'IGST, at the full rate.',
              },
            ]}
          />
        </div>
      </section>

      <section
        aria-labelledby="gst-result"
        className="card p-5 sm:p-6 lg:sticky lg:top-24"
        data-testid="gst-result"
      >
        <h2 id="gst-result" className="text-lg font-semibold tracking-tight text-fg">
          The split
        </h2>

        {/*
          role=status on the wrapper, not on the <dl>.

          An ARIA role replaces an element's implicit one, so role="status" on
          the list itself stopped it being a list -- and every <dt> and <dd>
          inside was then an orphan with no <dl> parent. Announcing the result
          and describing it as a set of term/value pairs are two different
          jobs and need two different elements.
        */}
        <div role="status" aria-live="polite" className="mt-5">
        <dl className="space-y-1">
          <div className="flex justify-between rounded-lg bg-surface-sunken px-3 py-2">
            <dt className="text-sm text-fg-muted">Taxable value</dt>
            <dd className="text-sm font-semibold tabular text-fg" data-testid="gst-taxable">
              {formatCurrency(taxable, CURRENCY)}
            </dd>
          </div>
          {lines.map((line) => (
            <div
              key={line.key}
              className="flex justify-between rounded-lg bg-surface-sunken px-3 py-2"
            >
              <dt className="text-sm text-fg-muted">{line.label}</dt>
              <dd
                className="text-sm font-semibold tabular text-fg"
                data-testid={`gst-line-${line.key}`}
              >
                {formatCurrency(line.amount, CURRENCY)}
              </dd>
            </div>
          ))}
          <div className="flex justify-between rounded-lg bg-surface-sunken px-3 py-2">
            <dt className="text-sm text-fg-muted">Total GST</dt>
            <dd className="text-sm font-semibold tabular text-fg" data-testid="gst-tax">
              {formatCurrency(tax, CURRENCY)}
            </dd>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-lg bg-brand px-3 py-3 text-brand-fg">
            <dt className="text-xs font-bold uppercase tracking-wide">Total payable</dt>
            <dd className="text-base font-bold tabular" data-testid="gst-total">
              {formatCurrency(total, CURRENCY)}
            </dd>
          </div>
        </dl>
        </div>

        {drift !== 0 && (
          <p className="mt-3 text-xs leading-relaxed text-fg-muted" data-testid="gst-drift">
            The parts add back to {formatCurrency(total, CURRENCY)} rather than the{' '}
            {formatCurrency(entered, CURRENCY)} you entered. Each component is rounded to the
            paisa on its own, and on small amounts those roundings do not always cancel.
          </p>
        )}

        <p className="mt-5 border-t border-border pt-4 text-sm text-fg-muted">
          Need this on a document?{' '}
          <Link
            href="/gst-invoice-generator/"
            className="text-brand-text underline underline-offset-4"
          >
            Make a GST invoice
          </Link>{' '}
          with the same split, your GSTIN and the place of supply on it.
        </p>
      </section>
    </div>
  );
};

export default GstCalculator;
