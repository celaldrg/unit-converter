/**
 * Interface text built from the unit data: select options, favorite and recent
 * entries, copy-button labels, the "1 ft = 30.48 cm" line and the status line
 * under the smart input. Pure functions, so they are tested without a browser.
 */
import { getUnit } from './units.js';
import { convert } from './convert.js';
import { fold } from './lookup.js';
import { formatQuantity } from './numbers.js';
import { t } from './i18n.js';

const LIST_DIGITS = 6; // favorites and recents stay short
const QUALIFIED_NAME_RE = /^(.+?)\s*\(([^()]+)\)$/; // "Fluid ounce (UK)" → "Fluid ounce", "UK"
const QUALIFIER_TAIL_RE = /\s*\([^()]*\)$/; // the " (UK)" of "fl oz (UK)"

function symbolOf(categoryId, unitId) {
  return getUnit(categoryId, unitId).symbol;
}

/**
 * Text of a unit option: "Foot (ft)", "Fluid ounce (UK, fl oz)", or the bare
 * name when it already reads as the symbol ("Bar", "Çay bardağı").
 * @param {object} unit a unit from CATEGORIES
 * @param {'en'|'tr'} lang
 * @returns {string}
 */
export function unitLabel(unit, lang) {
  const name = unit.name[lang] ?? unit.name.en;
  if (fold(name) === fold(unit.symbol)) return name;
  const qualified = QUALIFIED_NAME_RE.exec(name);
  if (!qualified) return `${name} (${unit.symbol})`;
  return `${qualified[1]} (${qualified[2]}, ${unit.symbol.replace(QUALIFIER_TAIL_RE, '')})`;
}

/**
 * The symbols of a unit pair.
 * @param {{category: string, from: string, to: string}} pair
 * @returns {{from: string, to: string}} e.g. {from: 'ft', to: 'cm'}
 */
export function pairSymbols(pair) {
  return { from: symbolOf(pair.category, pair.from), to: symbolOf(pair.category, pair.to) };
}

/**
 * The full unit names of a pair, for tooltips.
 * @param {{category: string, from: string, to: string}} pair
 * @param {'en'|'tr'} lang
 * @returns {string} e.g. "Foot → Centimetre"
 */
export function pairTitle(pair, lang) {
  const name = (unitId) => getUnit(pair.category, unitId).name[lang];
  return `${name(pair.from)} → ${name(pair.to)}`;
}

/**
 * A recent conversion as two short quantities.
 * @param {{category: string, from: string, to: string, value: number}} entry
 * @param {'en'|'tr'} lang
 * @returns {{from: string, to: string}} e.g. {from: '5.25 ft', to: '160.02 cm'}
 */
export function recentQuantities(entry, lang) {
  const options = { lang, digits: LIST_DIGITS };
  const result = convert(entry.value, entry.category, entry.from, entry.to);
  return {
    from: formatQuantity(entry.value, symbolOf(entry.category, entry.from), options),
    to: formatQuantity(result, symbolOf(entry.category, entry.to), options),
  };
}

/**
 * One unit of the current pair expressed in the other.
 * @param {{category: string, from: string, to: string, lang: 'en'|'tr'}} state
 * @returns {string} e.g. "1 ft = 30.48 cm"
 */
export function formulaLabel({ category, from, to, lang }) {
  const one = formatQuantity(1, symbolOf(category, from), { lang });
  return `${one} = ${formatQuantity(convert(1, category, from, to), symbolOf(category, to), { lang })}`;
}

/**
 * Accessible label of a copy button for a table row.
 * @param {{value: number, symbol: string}} row a model.getTable() row
 * @param {'en'|'tr'} lang
 * @returns {string} e.g. "Copy 160.02 cm"
 */
export function copyLabel(row, lang) {
  return t(lang, 'copyValue', { value: formatQuantity(row.value, row.symbol, { lang }) });
}

function previewLabel(preview, lang) {
  const quantity = preview.parts
    .map((part) => formatQuantity(part.value, symbolOf(preview.category, part.unit), { lang }))
    .join(' ');
  return `${quantity} = ${formatQuantity(preview.result, symbolOf(preview.category, preview.to), { lang })}`;
}

/**
 * The line under the smart input: a live preview once the text parses, the
 * error of the query that was just submitted (until the text changes), or
 * else the usage hint.
 * @param {string} text current text of the smart input
 * @param {object} preview model.previewQuery(text)
 * @param {{lang: 'en'|'tr', query: string, queryResult: object|null}} state model.getState()
 * @returns {{kind: 'hint'|'preview'|'error', text: string}}
 */
export function queryStatus(text, preview, state) {
  const { lang, query, queryResult } = state;
  if (preview.ok) return { kind: 'preview', text: previewLabel(preview, lang) };
  if (queryResult?.ok === false && query === text) {
    return { kind: 'error', text: t(lang, `error.${queryResult.code}`, { token: queryResult.token ?? '' }) };
  }
  return { kind: 'hint', text: t(lang, 'queryHint') };
}
