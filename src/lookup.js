/**
 * Unit name index for the free-text parser: maps symbols, names and aliases to
 * the units they can mean. One phrase may name units in several categories
 * ("'" is a foot or an arcminute); the parser settles that from context.
 */
import { CATEGORIES } from './units.js';

const RANK_EXACT = 0; // case-exact symbol or alias
const RANK_LOOSE = 1; // case- and diacritic-insensitive match
const RANK_FALLBACK = 2; // matched after trimming a plural or a Turkish suffix

let index = null;

/**
 * Folds text for forgiving comparison: compatibility forms, no diacritics,
 * lower case, single spaces ("İnç" → "inc", "m²" → "m2", "℃" → "°c").
 * @param {string} text
 * @returns {string}
 */
export function fold(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '') // combining marks left over by NFKD
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/\s+/g, ' ')
    .trim();
}

function addRef(map, key, ref) {
  const refs = map.get(key) ?? [];
  if (!refs.some((known) => known.category === ref.category && known.unit === ref.unit)) refs.push(ref);
  map.set(key, refs);
}

function buildIndex() {
  const exact = new Map();
  const loose = new Map();
  for (const category of CATEGORIES) {
    for (const unit of category.units) {
      const ref = { category: category.id, unit: unit.id };
      if (unit.caseSensitive) addRef(exact, unit.symbol, ref);
      else addRef(loose, fold(unit.symbol), ref);
      for (const alias of unit.exactAliases ?? []) addRef(exact, alias, ref);
      for (const alias of [unit.name.en, unit.name.tr, ...(unit.aliases ?? [])]) addRef(loose, fold(alias), ref);
    }
  }
  return { exact, loose };
}

function collect(found, refs, rank) {
  for (const ref of refs ?? []) {
    if (!found.some((known) => known.category === ref.category && known.unit === ref.unit)) {
      found.push({ ...ref, rank });
    }
  }
}

/** Forgiving variants of a folded key: "cm'ye" → "cm", "ft." → "ft", "miles" → "mile", "inches" → "inch". */
function fallbackKeys(key) {
  const bare = key.replace(/['’]\p{L}+$/u, '').replace(/[.,;:]$/, '');
  return [bare, bare.replace(/s$/, ''), bare.replace(/es$/, '')].filter((variant) => variant && variant !== key);
}

/**
 * Finds every unit a phrase can name, best matches first.
 * @param {string} phrase one or more words, e.g. "GiB", "sq ft", "su bardağı"
 * @returns {{category: string, unit: string, rank: number}[]} empty when nothing matches
 */
export function findUnits(phrase) {
  index ??= buildIndex();
  const text = String(phrase).replace(/\s+/g, ' ').trim();
  const key = fold(text);
  const found = [];
  collect(found, index.exact.get(text), RANK_EXACT);
  collect(found, index.loose.get(key), RANK_LOOSE);
  for (const variant of fallbackKeys(key)) {
    if (found.length > 0) break;
    collect(found, index.loose.get(variant), RANK_FALLBACK);
  }
  return found;
}
