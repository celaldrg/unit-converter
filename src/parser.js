/**
 * Free-text conversion parser: "5 ft 3 in to cm", "72 F in C", "1.5 GiB to MB",
 * "2,5 kg kaç lb", "1 1/2 cups to ml", "5'3\"".
 *
 * Grammar (whitespace separated, numbers may touch their unit: "5ft"):
 *   query    = quantity [separator] [target] filler*
 *   quantity = (number unit)+ | unit            a bare unit means 1 of it
 *   number   = decimal | fraction | integer fraction
 */
import { CATEGORIES, getCategory } from './units.js';
import { convert } from './convert.js';
import { findUnits, fold } from './lookup.js';
import { parseNumber } from './numbers.js';

/** Every error code parseQuery can return. */
export const PARSE_ERRORS = Object.freeze([
  'EMPTY', // nothing to parse
  'BAD_NUMBER', // "1.2.3 m"
  'MISSING_UNIT', // "5" or "5 to cm"
  'UNKNOWN_UNIT', // "5 parsecs"
  'MISSING_TARGET', // "5 ft to"
  'INCOMPATIBLE_UNITS', // "5 kg to cm"
  'BAD_COMPOUND', // "5 °C 3 °F": only additive categories can be summed
  'TRAILING_INPUT', // "5 ft to cm please"
]);

const SEPARATORS = new Set(['to', 'in', 'into', 'as', 'kac']); // folded, so "kaç" is "kac"
// Skipped at either end: "convert 5 ft to cm", "5 ft'i cm'ye çevir", "100 km/h kaç mph eder".
const FILLERS = new Set(['convert', 'cevir', 'eder', 'yapar', 'cinsinden', 'olarak']);
const MAX_PHRASE_TOKENS = 4; // longest alias: "pounds per square inch"
const VULGAR_FRACTIONS = Object.freeze({
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
});
const NUMBER_PREFIX_RE = /^[+-]?(?:\d+\/\d+|(?:\d[\d.,]*|[.,]\d+)(?:[eE][+-]?\d+)?)/;
const INTEGER_RE = /^[+-]?\d+$/;
const FRACTION_RE = /^\d+\/\d+$/;

/** Rewrites typographic shortcuts into plain, space separated text. */
function normalize(text) {
  return text
    .replace(/−/g, '-') // typographic minus sign → hyphen-minus
    .replace(/->|=>|[→⇒=]/g, ' to ')
    .replace(/[?!]/g, ' ')
    .replace(/[½⅓⅔¼¾⅛⅜⅝⅞]/g, (char) => ` ${VULGAR_FRACTIONS[char]} `)
    .replace(/º/g, '°')
    .replace(/(\d)\s*(''|′′|["'′″’”])/g, '$1 $2 ') // 5'3" → 5 ' 3 "
    .replace(/°\s+([cfkr])(?![a-z])/gi, '°$1') // 72° F → 72°F
    .replace(/\s+/g, ' ')
    .trim();
}

/** Splits text into number and word tokens; "5ft" becomes "5" + "ft". */
function tokenize(text) {
  const tokens = [];
  for (const chunk of text.split(' ').filter(Boolean)) {
    const number = NUMBER_PREFIX_RE.exec(chunk)?.[0];
    if (!number) {
      tokens.push({ type: 'word', text: chunk });
      continue;
    }
    tokens.push({ type: 'number', text: number });
    if (number.length < chunk.length) tokens.push({ type: 'word', text: chunk.slice(number.length) });
  }
  return tokens;
}

function failure(code, token) {
  return token === undefined ? { ok: false, code } : { ok: false, code, token };
}

function isSeparator(token) {
  return token?.type === 'word' && SEPARATORS.has(fold(token.text));
}

function isFiller(token) {
  return token?.type === 'word' && FILLERS.has(fold(token.text));
}

/** Reads a number token, joining "1 1/2" into 1.5. */
function readNumber(tokens, start, lang) {
  const text = tokens[start].text;
  const value = parseNumber(text, lang);
  const next = tokens[start + 1];
  if (INTEGER_RE.test(text) && next?.type === 'number' && FRACTION_RE.test(next.text)) {
    const sign = text.startsWith('-') ? -1 : 1;
    return { value: value + sign * parseNumber(next.text, lang), next: start + 2 };
  }
  return { value, next: start + 1 };
}

/** Matches the longest unit phrase starting at `start`. */
function matchUnit(tokens, start) {
  for (let length = Math.min(MAX_PHRASE_TOKENS, tokens.length - start); length > 0; length -= 1) {
    const phrase = tokens.slice(start, start + length).map((token) => token.text).join(' ');
    const candidates = findUnits(phrase);
    if (candidates.length > 0) return { candidates, next: start + length };
  }
  return null;
}

/** Reads "5 ft 3 in" (or a bare "kg"); returns parts with unresolved candidates. */
function readQuantity(tokens, lang) {
  if (tokens[0].type === 'word') {
    const unit = matchUnit(tokens, 0);
    if (!unit) return failure('UNKNOWN_UNIT', tokens[0].text);
    return { parts: [{ value: 1, candidates: unit.candidates }], next: unit.next };
  }
  const parts = [];
  let position = 0;
  while (tokens[position]?.type === 'number') {
    const number = readNumber(tokens, position, lang);
    if (Number.isNaN(number.value)) {
      return failure('BAD_NUMBER', tokens.slice(position, number.next).map((token) => token.text).join(' '));
    }
    const unit = matchUnit(tokens, number.next);
    if (!unit) {
      const token = tokens[number.next];
      const unknown = token?.type === 'word' && !isSeparator(token);
      return unknown ? failure('UNKNOWN_UNIT', token.text) : failure('MISSING_UNIT');
    }
    parts.push({ value: number.value, candidates: unit.candidates });
    position = unit.next;
  }
  return { parts, next: position };
}

/** Reads the optional "[to] unit" tail. */
function readTarget(tokens, start) {
  if (start >= tokens.length) return { candidates: null };
  let position = start;
  const isLast = position === tokens.length - 1;
  if (isSeparator(tokens[position])) {
    if (!isLast) position += 1;
    else if (findUnits(tokens[position].text).length === 0) return failure('MISSING_TARGET');
  }
  const unit = matchUnit(tokens, position);
  if (!unit) return failure('UNKNOWN_UNIT', tokens[position].text);
  position = unit.next;
  while (isFiller(tokens[position])) position += 1;
  if (position < tokens.length) {
    return failure('TRAILING_INPUT', tokens.slice(position).map((token) => token.text).join(' '));
  }
  return { candidates: unit.candidates };
}

/**
 * Picks the category every phrase can belong to, preferring exact matches and
 * then the catalogue order.
 */
function resolveCategory(groups) {
  let best = null;
  for (const category of CATEGORIES) {
    let score = 0;
    for (const candidates of groups) {
      const ranks = candidates.filter((candidate) => candidate.category === category.id).map((c) => c.rank);
      score = ranks.length > 0 ? score + Math.min(...ranks) : Infinity;
      if (score === Infinity) break;
    }
    if (score < (best?.score ?? Infinity)) best = { id: category.id, score };
  }
  return best?.id ?? null;
}

function pickUnit(candidates, categoryId) {
  return candidates.find((candidate) => candidate.category === categoryId).unit;
}

/**
 * Parses a free-text conversion request.
 * @param {string} text e.g. "5 ft 3 in to cm"
 * @param {object} [options]
 * @param {'en'|'tr'} [options.lang='en'] decides how "1,500" or "1.500" is read
 * @returns {{ok: true, category: string, from: string, to: string|null, value: number,
 *   parts: {value: number, unit: string}[], result: number|null}
 *   | {ok: false, code: string, token?: string}}
 *   `value` is the whole quantity expressed in `from` (the first part's unit);
 *   `to` and `result` are null when the text names no target unit.
 */
export function parseQuery(text, { lang = 'en' } = {}) {
  const tokens = tokenize(normalize(String(text ?? '')));
  while (isFiller(tokens[0])) tokens.shift();
  if (tokens.length === 0) return failure('EMPTY');
  const quantity = readQuantity(tokens, lang);
  if (quantity.ok === false) return quantity;
  const target = readTarget(tokens, quantity.next);
  if (target.ok === false) return target;

  const groups = quantity.parts.map((part) => part.candidates);
  if (target.candidates) groups.push(target.candidates);
  const categoryId = resolveCategory(groups);
  if (!categoryId) return failure('INCOMPATIBLE_UNITS');
  if (quantity.parts.length > 1 && !getCategory(categoryId).additive) return failure('BAD_COMPOUND');

  const parts = quantity.parts.map((part) => ({ value: part.value, unit: pickUnit(part.candidates, categoryId) }));
  const from = parts[0].unit;
  const sign = parts[0].value < 0 ? -1 : 1; // "-1 h 30 min" is -1.5 h
  const value = parts
    .slice(1)
    .reduce((sum, part) => sum + sign * convert(part.value, categoryId, part.unit, from), parts[0].value);
  const to = target.candidates ? pickUnit(target.candidates, categoryId) : null;
  return {
    ok: true,
    category: categoryId,
    from,
    to,
    value,
    parts,
    result: to === null ? null : convert(value, categoryId, from, to),
  };
}
