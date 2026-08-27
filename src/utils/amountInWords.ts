/**
 * The amount in words.
 *
 * Rule 46 does not require it, but every Indian accountant expects it and its
 * absence is the first thing that makes an invoice look home-made. It is also
 * the reason a cheque cannot be altered by adding a digit, which is the point.
 *
 * Two numbering systems, because "1,18,000" and "118,000" are read out loud
 * differently:
 *
 *   INR    -> Rupees One Lakh Eighteen Thousand and Fifty Paise Only
 *   others -> USD One Thousand Two Hundred Thirty-Four and 56/100 Only
 *
 * Rupees get real words on both halves because that is the audience this tool
 * is built for and "Paise" is unambiguous. Everything else gets the ISO code
 * and a fraction, because English has no reliable rule for either half: the
 * minor unit is cents, pence, øre or fils depending on the currency, and the
 * major unit does not pluralise predictably -- it is Dollars and Euros but Yen,
 * Yuan, Won, Baht and Rand, and a naive trailing "s" prints "Japanese Yens" on
 * someone's invoice. A code cannot be wrong, and the digits beside it already
 * carry the symbol.
 */
import { currencyFractionDigits } from './currency';

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

/** 0-99. Hyphenated, which is how English writes them. */
const underHundred = (n: number): string => {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = ONES[n % 10];
  return ones ? `${tens}-${ones}` : tens;
};

/** 0-999. */
const underThousand = (n: number): string => {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(underHundred(rest));
  return parts.join(' ');
};

/**
 * Indian grouping: thousand, lakh (10^5), crore (10^7), and then crore again.
 * Recursing at a crore is what lets "one lakh crore" come out right instead of
 * needing a name for every power.
 */
const indianWords = (n: number): string => {
  if (n === 0) return '';
  if (n >= 1e7) {
    const crores = Math.floor(n / 1e7);
    return [`${indianWords(crores)} Crore`, indianWords(n % 1e7)].filter(Boolean).join(' ');
  }
  if (n >= 1e5) {
    const lakhs = Math.floor(n / 1e5);
    return [`${underHundred(lakhs)} Lakh`, indianWords(n % 1e5)].filter(Boolean).join(' ');
  }
  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    return [`${underHundred(thousands)} Thousand`, underThousand(n % 1000)]
      .filter(Boolean)
      .join(' ');
  }
  return underThousand(n);
};

const SCALES = [
  { value: 1e12, name: 'Trillion' },
  { value: 1e9, name: 'Billion' },
  { value: 1e6, name: 'Million' },
  { value: 1e3, name: 'Thousand' },
] as const;

/** Short-scale grouping in threes, as used everywhere outside South Asia. */
const westernWords = (n: number): string => {
  if (n === 0) return '';
  for (const { value, name } of SCALES) {
    if (n >= value) {
      const count = Math.floor(n / value);
      return [`${westernWords(count)} ${name}`, westernWords(n % value)].filter(Boolean).join(' ');
    }
  }
  return underThousand(n);
};

/**
 * Beyond this the words stop being useful and floating point stops being able
 * to represent whole rupees exactly, so say so rather than printing something
 * confidently wrong.
 */
const MAX_AMOUNT = Number.MAX_SAFE_INTEGER / 100;

export const amountInWords = (amount: number, currency: string): string => {
  if (!Number.isFinite(amount)) return '';
  const negative = amount < 0;
  const value = Math.abs(amount);
  if (value > MAX_AMOUNT) return '';

  const digits = currencyFractionDigits(currency);
  const factor = 10 ** digits;
  // Round once, in minor units, so 0.615 cannot print as "Sixty-One Paise"
  // while the totals column shows 0.62.
  const minor = Math.round(value * factor + Math.abs(value * factor) * Number.EPSILON);
  const whole = Math.floor(minor / factor);
  const fraction = minor % factor;

  const spell = currency === 'INR' ? indianWords : westernWords;
  const words = whole === 0 ? 'Zero' : spell(whole);

  const parts = [currency === 'INR' ? 'Rupees' : currency, words];
  if (fraction > 0) {
    parts.push(
      'and',
      currency === 'INR'
        ? `${indianWords(fraction)} Paise`
        : `${String(fraction).padStart(digits, '0')}/${factor}`,
    );
  }
  parts.push('Only');

  return `${negative ? 'Minus ' : ''}${parts.join(' ')}`;
};
