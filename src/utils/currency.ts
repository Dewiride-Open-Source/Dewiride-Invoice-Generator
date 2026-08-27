/**
 * Currency support.
 *
 * This used to be a seven-entry map in which only USD mapped to a symbol --
 * everything else fell through to its own three-letter code, so the form
 * offered "INR (₹)" and the invoice then printed "INR 1,234.00". The
 * workaround existed because @react-pdf's built-in Helvetica has no glyph for
 * ₹, €, ₩ and the rest. The PDF now embeds a subset of Noto Sans (see
 * scripts/build-pdf-fonts.mjs), so real symbols render and the workaround is
 * gone.
 *
 * Formatting is delegated to Intl.NumberFormat, which knows things a hand-rolled
 * regex cannot: JPY and KRW have no minor unit, KWD and BHD have three decimal
 * places, and grouping is not universally three digits (en-IN groups as
 * 1,23,456). The previous implementation hard-coded two decimals and Western
 * grouping for every currency on earth.
 */

export interface Currency {
  code: string;
  name: string;
}

/**
 * All formatting is done against one locale rather than each currency's home
 * locale.
 *
 * An invoice has to read identically for the sender and the recipient, so the
 * output cannot depend on the viewer's machine. It also cannot depend on the
 * currency's own locale: ar-KW renders "١٬٢٣٤٫٥٠٠ د.ك."، which switches script
 * mid-document and uses glyphs the embedded PDF font does not carry.
 *
 * en-US keeps digits and grouping constant while Intl still applies each
 * currency's own minor-unit rules -- JPY prints no decimals, KWD prints three --
 * and falls back to the ISO code where a currency has no Latin symbol.
 *
 * Rupees are the one exception, and they earn it. India does not group in
 * threes: 1033640 is written 10,33,640 and read "ten lakh thirty-three
 * thousand". The amount in words on a rupee invoice already spells it that way
 * (see utils/amountInWords.ts), so formatting the digits en-US produced a
 * document that contradicted itself -- "Twelve Lakh" beside "1,206,998.40".
 *
 * en-IN is picked per currency, never per viewer, so the output is still the
 * same on the sender's machine and the recipient's. It is not applied to
 * anything else: en-IN groups dollars in the Indian style too, which would be
 * wrong on a US invoice.
 */
const localeFor = (code: string): string => (code === 'INR' ? 'en-IN' : 'en-US');

/**
 * ISO 4217 currencies in active circulation. Symbols are not stored: Intl
 * resolves the correct one per currency, and keeping our own table would drift.
 */
export const CURRENCIES: readonly Currency[] = [
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'AFN', name: 'Afghan Afghani' },
  { code: 'ALL', name: 'Albanian Lek' },
  { code: 'AMD', name: 'Armenian Dram' },
  { code: 'ANG', name: 'Netherlands Antillean Guilder' },
  { code: 'AOA', name: 'Angolan Kwanza' },
  { code: 'ARS', name: 'Argentine Peso' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'AWG', name: 'Aruban Florin' },
  { code: 'AZN', name: 'Azerbaijani Manat' },
  { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark' },
  { code: 'BBD', name: 'Barbadian Dollar' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'BGN', name: 'Bulgarian Lev' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'BIF', name: 'Burundian Franc' },
  { code: 'BMD', name: 'Bermudan Dollar' },
  { code: 'BND', name: 'Brunei Dollar' },
  { code: 'BOB', name: 'Bolivian Boliviano' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'BSD', name: 'Bahamian Dollar' },
  { code: 'BTN', name: 'Bhutanese Ngultrum' },
  { code: 'BWP', name: 'Botswanan Pula' },
  { code: 'BYN', name: 'Belarusian Ruble' },
  { code: 'BZD', name: 'Belize Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CDF', name: 'Congolese Franc' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CLP', name: 'Chilean Peso' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'COP', name: 'Colombian Peso' },
  { code: 'CRC', name: 'Costa Rican Colón' },
  { code: 'CUP', name: 'Cuban Peso' },
  { code: 'CVE', name: 'Cape Verdean Escudo' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'DJF', name: 'Djiboutian Franc' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'DOP', name: 'Dominican Peso' },
  { code: 'DZD', name: 'Algerian Dinar' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'ERN', name: 'Eritrean Nakfa' },
  { code: 'ETB', name: 'Ethiopian Birr' },
  { code: 'EUR', name: 'Euro' },
  { code: 'FJD', name: 'Fijian Dollar' },
  { code: 'FKP', name: 'Falkland Islands Pound' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'GEL', name: 'Georgian Lari' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'GIP', name: 'Gibraltar Pound' },
  { code: 'GMD', name: 'Gambian Dalasi' },
  { code: 'GNF', name: 'Guinean Franc' },
  { code: 'GTQ', name: 'Guatemalan Quetzal' },
  { code: 'GYD', name: 'Guyanaese Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'HNL', name: 'Honduran Lempira' },
  { code: 'HTG', name: 'Haitian Gourde' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'ILS', name: 'Israeli New Shekel' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'IQD', name: 'Iraqi Dinar' },
  { code: 'IRR', name: 'Iranian Rial' },
  { code: 'ISK', name: 'Icelandic Króna' },
  { code: 'JMD', name: 'Jamaican Dollar' },
  { code: 'JOD', name: 'Jordanian Dinar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'KGS', name: 'Kyrgystani Som' },
  { code: 'KHR', name: 'Cambodian Riel' },
  { code: 'KMF', name: 'Comorian Franc' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'KYD', name: 'Cayman Islands Dollar' },
  { code: 'KZT', name: 'Kazakhstani Tenge' },
  { code: 'LAK', name: 'Laotian Kip' },
  { code: 'LBP', name: 'Lebanese Pound' },
  { code: 'LKR', name: 'Sri Lankan Rupee' },
  { code: 'LRD', name: 'Liberian Dollar' },
  { code: 'LSL', name: 'Lesotho Loti' },
  { code: 'LYD', name: 'Libyan Dinar' },
  { code: 'MAD', name: 'Moroccan Dirham' },
  { code: 'MDL', name: 'Moldovan Leu' },
  { code: 'MGA', name: 'Malagasy Ariary' },
  { code: 'MKD', name: 'Macedonian Denar' },
  { code: 'MMK', name: 'Myanmar Kyat' },
  { code: 'MNT', name: 'Mongolian Tugrik' },
  { code: 'MOP', name: 'Macanese Pataca' },
  { code: 'MRU', name: 'Mauritanian Ouguiya' },
  { code: 'MUR', name: 'Mauritian Rupee' },
  { code: 'MVR', name: 'Maldivian Rufiyaa' },
  { code: 'MWK', name: 'Malawian Kwacha' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'MZN', name: 'Mozambican Metical' },
  { code: 'NAD', name: 'Namibian Dollar' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'NIO', name: 'Nicaraguan Córdoba' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'NPR', name: 'Nepalese Rupee' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'PAB', name: 'Panamanian Balboa' },
  { code: 'PEN', name: 'Peruvian Sol' },
  { code: 'PGK', name: 'Papua New Guinean Kina' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'PYG', name: 'Paraguayan Guarani' },
  { code: 'QAR', name: 'Qatari Rial' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'RSD', name: 'Serbian Dinar' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'RWF', name: 'Rwandan Franc' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'SBD', name: 'Solomon Islands Dollar' },
  { code: 'SCR', name: 'Seychellois Rupee' },
  { code: 'SDG', name: 'Sudanese Pound' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'SHP', name: 'St. Helena Pound' },
  { code: 'SLE', name: 'Sierra Leonean Leone' },
  { code: 'SOS', name: 'Somali Shilling' },
  { code: 'SRD', name: 'Surinamese Dollar' },
  { code: 'SSP', name: 'South Sudanese Pound' },
  { code: 'STN', name: 'São Tomé & Príncipe Dobra' },
  { code: 'SVC', name: 'Salvadoran Colón' },
  { code: 'SZL', name: 'Swazi Lilangeni' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'TJS', name: 'Tajikistani Somoni' },
  { code: 'TMT', name: 'Turkmenistani Manat' },
  { code: 'TND', name: 'Tunisian Dinar' },
  { code: 'TOP', name: 'Tongan Paʻanga' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'TTD', name: 'Trinidad & Tobago Dollar' },
  { code: 'TWD', name: 'New Taiwan Dollar' },
  { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'UAH', name: 'Ukrainian Hryvnia' },
  { code: 'UGX', name: 'Ugandan Shilling' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'UYU', name: 'Uruguayan Peso' },
  { code: 'UZS', name: 'Uzbekistani Som' },
  { code: 'VES', name: 'Venezuelan Bolívar' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'VUV', name: 'Vanuatu Vatu' },
  { code: 'WST', name: 'Samoan Tala' },
  { code: 'XAF', name: 'Central African CFA Franc' },
  { code: 'XCD', name: 'East Caribbean Dollar' },
  { code: 'XOF', name: 'West African CFA Franc' },
  { code: 'XPF', name: 'CFP Franc' },
  { code: 'YER', name: 'Yemeni Rial' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'ZMW', name: 'Zambian Kwacha' },
  { code: 'ZWG', name: 'Zimbabwe Gold' },
];

/** Offered first in the picker; the rest follow alphabetically. */
export const POPULAR_CURRENCY_CODES = [
  'INR',
  'USD',
  'EUR',
  'GBP',
  'AUD',
  'CAD',
  'SGD',
  'AED',
  'JPY',
  'CHF',
] as const;

export const DEFAULT_CURRENCY = 'INR';

/**
 * Currencies rendered as an ISO code rather than a symbol.
 *
 * Their symbols (؋ ֏ ৳ ៛ ฿) belong to Arabic, Armenian, Bengali, Khmer and Thai
 * script blocks, which the embedded Noto Sans Latin face does not contain --
 * they would print as blank boxes in the PDF. Bundling five more script fonts
 * to serve five currencies is not a trade worth making, and "THB 1,234.50" is
 * unambiguous.
 *
 * scripts/build-pdf-fonts.mjs asserts that this list exactly matches what the
 * font cannot render, so it cannot silently drift.
 */
export const CODE_ONLY_CURRENCIES = new Set(['AFN', 'AMD', 'BDT', 'KHR', 'THB']);

const CURRENCY_BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export const isSupportedCurrency = (code: string): boolean => CURRENCY_BY_CODE.has(code);

export const getCurrency = (code: string): Currency =>
  CURRENCY_BY_CODE.get(code) ?? { code, name: code };

// Intl.NumberFormat construction is comparatively expensive and these are
// rebuilt on every keystroke across the preview and the PDF, so cache them.
const formatterCache = new Map<string, Intl.NumberFormat>();

const getFormatter = (code: string): Intl.NumberFormat => {
  const cached = formatterCache.get(code);
  if (cached) return cached;

  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(localeFor(code), {
      style: 'currency',
      currency: code,
      currencyDisplay: CODE_ONLY_CURRENCIES.has(code) ? 'code' : 'narrowSymbol',
    });
  } catch {
    // An unknown code, or an engine without narrowSymbol support. Falling back
    // to the code keeps the number readable instead of throwing mid-render.
    formatter = new Intl.NumberFormat(localeFor(code), {
      style: 'currency',
      currency: isSupportedCurrency(code) ? code : 'USD',
      currencyDisplay: 'code',
    });
  }

  formatterCache.set(code, formatter);
  return formatter;
};

/**
 * Formats an amount with the correct symbol, grouping and minor-unit digits
 * for the currency -- e.g. ₹1,23,456.00, ¥1,235 (no decimals), KD 1.234
 * (three decimals).
 */
export const formatCurrency = (amount: number, currency: string): string => {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return getFormatter(currency).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

/** The symbol alone, for compact contexts such as input adornments. */
export const getCurrencySymbol = (currency: string): string => {
  try {
    const parts = getFormatter(currency).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
};

/**
 * How many decimal places this currency actually has: 2 for INR and USD, 0 for
 * JPY, 3 for KWD. Intl already knows, so this asks it rather than assuming two.
 */
const fractionDigitCache = new Map<string, number>();

export const currencyFractionDigits = (code: string): number => {
  const cached = fractionDigitCache.get(code);
  if (cached !== undefined) return cached;
  let digits = 2;
  try {
    digits = getFormatter(code).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    // Keep the two-decimal default.
  }
  fractionDigitCache.set(code, digits);
  return digits;
};

/**
 * Rounds to the currency's smallest real unit.
 *
 * Load-bearing on a tax invoice, not cosmetic. Without it the figures printed
 * in the line-item column are rounded for display while the subtotal sums the
 * unrounded ones, so a column of prices can visibly fail to add up -- and a
 * CGST/SGST split computed from unrounded halves can miss the total by a
 * paisa, which is exactly the kind of discrepancy a tax return is checked for.
 *
 * The epsilon nudge is not superstition: 1.005 * 100 is 100.49999999999999 in
 * binary floating point, so Math.round alone rounds a half down.
 */
export const roundMoney = (amount: number, currency: string): number => {
  if (!Number.isFinite(amount)) return 0;
  const factor = 10 ** currencyFractionDigits(currency);
  const scaled = amount * factor;
  return Math.round(scaled + Math.sign(scaled) * Math.abs(scaled) * Number.EPSILON) / factor;
};
