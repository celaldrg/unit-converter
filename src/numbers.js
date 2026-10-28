/**
 * Locale-aware number parsing and formatting for English and Turkish.
 *
 * English writes 1,234.5 and Turkish writes 1.234,5. Parsing is lenient where
 * the text is unambiguous: "2,5" is 2.5 and "2.5" is 2.5 in both languages.
 * A single separator followed by exactly three digits is read as the
 * language's thousands separator ("1,500" is 1500 in English, "1.500" is 1500
 * in Turkish).
 */

const SEPARATORS = Object.freeze({
  en: Object.freeze({ group: ',', decimal: '.' }),
  tr: Object.freeze({ group: '.', decimal: ',' }),
});
const SCI_MAX = 15; // decimal exponents from here up use scientific notation
const SCI_MIN = -6; // decimal exponents below this use scientific notation
const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const NBSP = String.fromCharCode(0x00a0); // no-break space: "160.02 cm" never wraps
const MINUS_SIGN = String.fromCharCode(0x2212); // the typographic minus used in display mode
const TIGHT_SYMBOLS = new Set(['°', '′', '″']); // written without a space: 90°, 5′
const FRACTION_RE = /^(\d+)\/(\d+)$/;
const DECIMAL_RE = /^([\d.,]+?)(?:[eE]([+-]?\d+))?$/;
const LEADING_GROUP_RE = /^[1-9]\d{0,2}$/;
const GROUP_RE = /^\d{3}$/;

function separatorsFor(lang) {
  return SEPARATORS[lang] ?? SEPARATORS.en;
}

function countOf(text, char) {
  return text.split(char).length - 1;
}

/** Joins "1,234,567"-style groups, or returns null when the grouping is malformed. */
function ungroup(text, separator) {
  const groups = text.split(separator);
  const valid = LEADING_GROUP_RE.test(groups[0]) && groups.slice(1).every((group) => GROUP_RE.test(group));
  return valid ? groups.join('') : null;
}

/** Rewrites the digits-and-separators body of a number as "1234.5", or null. */
function canonicalBody(body, lang) {
  const dots = countOf(body, '.');
  const commas = countOf(body, ',');
  if (dots === 0 && commas === 0) return body;
  if (dots > 0 && commas > 0) {
    const decimal = body.lastIndexOf('.') > body.lastIndexOf(',') ? '.' : ',';
    if (countOf(body, decimal) !== 1) return null;
    const [intPart, fracPart] = body.split(decimal);
    const digits = ungroup(intPart, decimal === '.' ? ',' : '.');
    return digits === null || !/^\d*$/.test(fracPart) ? null : `${digits}.${fracPart}`;
  }
  const separator = dots > 0 ? '.' : ',';
  if (dots + commas > 1) return ungroup(body, separator);
  const [intPart, fracPart] = body.split(separator);
  const isGrouping = separator === separatorsFor(lang).group && LEADING_GROUP_RE.test(intPart) && GROUP_RE.test(fracPart);
  return isGrouping ? intPart + fracPart : `${intPart || '0'}.${fracPart}`;
}

/**
 * Parses a number typed by a person: signs, decimal commas or points, thousands
 * separators, exponents ("1.5e3") and simple fractions ("3/4").
 * @param {string} text
 * @param {'en'|'tr'} [lang='en'] decides what an ambiguous separator means
 * @returns {number} the value, or NaN when the text is not a finite number
 */
export function parseNumber(text, lang = 'en') {
  let body = String(text).trim().replaceAll(MINUS_SIGN, '-');
  let sign = 1;
  if (body.startsWith('-') || body.startsWith('+')) {
    sign = body.startsWith('-') ? -1 : 1;
    body = body.slice(1);
  }
  const fraction = FRACTION_RE.exec(body);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? NaN : (sign * Number(fraction[1])) / denominator;
  }
  const decimal = DECIMAL_RE.exec(body);
  if (!decimal || !/\d/.test(decimal[1])) return NaN;
  const canonical = canonicalBody(decimal[1], lang);
  if (canonical === null) return NaN;
  const value = sign * Number(decimal[2] === undefined ? canonical : `${canonical}e${decimal[2]}`);
  return Number.isFinite(value) ? value : NaN;
}

/**
 * Adds a leading minus to typed number text, or takes it away: "40" ↔ "-40",
 * "+2" → "-2", "" → "-". The rest of the text stays as typed. This is the ±
 * button, for phone number pads that have no minus key.
 * @param {string} text
 * @returns {string}
 */
export function toggleSign(text) {
  const body = String(text).trim();
  if (body.startsWith('-') || body.startsWith(MINUS_SIGN)) return body.slice(1);
  return `-${body.startsWith('+') ? body.slice(1) : body}`;
}

function toSuperscript(exponent) {
  return String(exponent)
    .replace('-', '⁻')
    .replace(/\d/g, (digit) => SUPERSCRIPT_DIGITS[Number(digit)]);
}

function groupThousands(digits, separator) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Formats a number with a limited count of significant digits.
 *
 * "display" mode groups thousands, uses a true minus sign and writes very
 * large or small numbers as "1.6 × 10⁻¹⁹". "input" mode gives text that
 * parseNumber reads back in the same language: no grouping, "1.6e-19".
 * @param {number} value
 * @param {object} [options]
 * @param {'en'|'tr'} [options.lang='en']
 * @param {number} [options.digits=10] significant digits, 1 to 17
 * @param {'display'|'input'} [options.mode='display']
 * @returns {string} "" for NaN or a non-number, "∞" for infinities
 */
export function formatNumber(value, { lang = 'en', digits = 10, mode = 'display' } = {}) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  const display = mode !== 'input';
  const sign = value < 0 ? (display ? MINUS_SIGN : '-') : '';
  if (!Number.isFinite(value)) return `${sign}∞`;
  if (value === 0) return '0';
  const { group, decimal } = separatorsFor(lang);
  const precision = Math.min(Math.max(Math.round(digits), 1), 17);
  const magnitude = Math.abs(value);
  const [mantissa, exponentText] = magnitude.toExponential(precision - 1).split('e');
  const exponent = Number(exponentText);
  if (exponent >= SCI_MAX || exponent < SCI_MIN) {
    // Trim the zero padding as text: parsing the mantissa again would round a 17-digit one twice.
    const trimmed = mantissa.includes('.') ? mantissa.replace(/\.?0+$/, '') : mantissa;
    const significand = trimmed.replace('.', decimal);
    return display
      ? `${sign}${significand}${NBSP}×${NBSP}10${toSuperscript(exponent)}`
      : `${sign}${significand}e${exponent}`;
  }
  const [intPart, fracPart] = String(Number(magnitude.toPrecision(precision))).split('.');
  const integer = display ? groupThousands(intPart, group) : intPart;
  return `${sign}${integer}${fracPart ? decimal + fracPart : ''}`;
}

/**
 * Formats a value followed by its unit symbol ("160.02 cm", "90°").
 * @param {number} value
 * @param {string} symbol
 * @param {object} [options] same as formatNumber; display mode joins with a no-break space
 * @returns {string} "" when the value is NaN
 */
export function formatQuantity(value, symbol, options = {}) {
  const number = formatNumber(value, options);
  if (!number) return '';
  if (TIGHT_SYMBOLS.has(symbol)) return number + symbol;
  return `${number}${options.mode === 'input' ? ' ' : NBSP}${symbol}`;
}
