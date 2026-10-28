/**
 * Converter state for the UI: category, the two linked inputs, the smart query
 * line, the all-units table, favorites and recent conversions.
 *
 * The side changed last ("active") is the source of truth: its number is kept
 * at full precision and its text stays exactly as typed, while the other side
 * is always derived from it, so swapping or changing units never drifts.
 * The model is pure: the UI saves getSnapshot() through storage.js and passes
 * it back to createConverter() on the next visit.
 */
import { getCategory, getUnit } from './units.js';
import { convert, convertAll } from './convert.js';
import { formatNumber, parseNumber, toggleSign } from './numbers.js';
import { parseQuery } from './parser.js';

/** Most favorite unit pairs kept. */
export const MAX_FAVORITES = 12;
/** Most recent conversions kept. */
export const MAX_RECENTS = 8;
const INPUT_DIGITS = 10;
const NO_DIGITS_YET_RE = /^\s*[-+−]?\s*$/; // blank, or only the sign of a number still being typed
const DEMO_FAVORITES = Object.freeze([
  { category: 'length', from: 'ft', to: 'cm' },
  { category: 'temperature', from: 'F', to: 'C' },
  { category: 'cooking', from: 'cup', to: 'ml' },
]);
const DEMO_QUERIES = Object.freeze(['100 km/h to mph', '1.5 GiB to MB', '72 F in C', '5 ft 3 in to cm']);

function normalizeLang(lang) {
  return lang === 'tr' ? 'tr' : 'en';
}

function textKey(side) {
  return side === 'from' ? 'fromText' : 'toText';
}

function otherSide(side) {
  return side === 'from' ? 'to' : 'from';
}

function formatInput(value, lang) {
  return formatNumber(value, { lang, digits: INPUT_DIGITS, mode: 'input' });
}

/** The default unit to pair with `from`: the category's other default. */
function defaultTarget(category, from) {
  const [first, second] = category.defaults;
  return from === first ? second : first;
}

function samePair(a, b) {
  return a.category === b.category && a.from === b.from && a.to === b.to;
}

function isValidPair(entry) {
  return Boolean(entry && getUnit(entry.category, entry.from) && getUnit(entry.category, entry.to));
}

/** Keeps valid, distinct {category, from, to[, value]} entries, at most `limit` of them. */
function sanitizeList(list, limit, withValue) {
  const clean = [];
  for (const entry of Array.isArray(list) ? list : []) {
    if (clean.length === limit) break;
    if (!isValidPair(entry) || (withValue && !Number.isFinite(entry.value))) continue;
    if (clean.some((known) => samePair(known, entry))) continue;
    const pair = { category: entry.category, from: entry.from, to: entry.to };
    clean.push(withValue ? { ...pair, value: entry.value } : pair);
  }
  return clean;
}

/** The active side's number at full precision; NaN while its text is blank or invalid. */
function activeNumber(state) {
  return state.active === 'from' ? state.value : state.result;
}

/** Stores the active side's number and derives the other side's text from it. */
function settle(state, number) {
  const source = state.active;
  const target = otherSide(source);
  const derived = Number.isNaN(number) ? NaN : convert(number, state.category, state[source], state[target]);
  state[textKey(target)] = formatInput(derived, state.lang);
  state.value = source === 'from' ? number : derived;
  state.result = source === 'from' ? derived : number;
}

/** Puts a number in the "from" field: shown rounded, kept at full precision. */
function putValue(state, number) {
  state.active = 'from';
  state.fromText = formatInput(number, state.lang);
  state.inputError = null;
  settle(state, number);
}

/** After the units change, the number shown in the "from" field stays and the other side follows. */
function keepFromNumber(state) {
  if (state.active === 'from') settle(state, state.value);
  else putValue(state, state.value);
}

/**
 * Creates a converter model.
 * @param {object} [saved] usually a stored getSnapshot(); anything that is not an object counts as {}
 * @param {'en'|'tr'} [saved.lang='en']
 * @param {string} [saved.category='length']
 * @param {string} [saved.from] defaults to the category's first default unit
 * @param {string} [saved.to] defaults to the category's other default unit
 * @param {number} [saved.value=1] starting amount in `from`
 * @param {boolean} [saved.tableOpen=true] whether the all-units table is shown
 * @param {object[]} [saved.favorites] saved {category, from, to} pairs; invalid entries are dropped
 * @param {object[]} [saved.recents] saved {category, from, to, value} entries; invalid entries are dropped
 * @returns {object} model with getState(), getTable(), getSnapshot(), previewQuery() and the
 *   actions below; every action returns getState()
 */
export function createConverter(saved = {}) {
  const options = saved !== null && typeof saved === 'object' ? saved : {};
  const category = getCategory(options.category) ?? getCategory('length');
  const from = getUnit(category.id, options.from) ? options.from : category.defaults[0];
  const state = {
    lang: normalizeLang(options.lang),
    category: category.id,
    from,
    to: getUnit(category.id, options.to) ? options.to : defaultTarget(category, from),
    active: 'from',
    fromText: '',
    toText: '',
    value: NaN,
    result: NaN,
    inputError: null,
    query: '',
    queryResult: null,
    tableOpen: options.tableOpen !== false,
    favorites: sanitizeList(options.favorites, MAX_FAVORITES, false),
    recents: sanitizeList(options.recents, MAX_RECENTS, true),
  };
  putValue(state, Number.isFinite(options.value) ? options.value : 1);

  /**
   * A detached copy of the state, plus `favorite` (whether the current pair is starred).
   * `value` is in `from` units, `result` in `to` units; both are NaN while the input is blank or invalid.
   */
  function getState() {
    return structuredClone({ ...state, favorite: state.favorites.some((pair) => samePair(pair, state)) });
  }

  /** The createConverter() options that restore this session; JSON-safe, for storage.js. */
  function getSnapshot() {
    return structuredClone({
      lang: state.lang,
      category: state.category,
      from: state.from,
      to: state.to,
      value: Number.isFinite(state.value) ? state.value : 1,
      tableOpen: state.tableOpen,
      favorites: state.favorites,
      recents: state.recents,
    });
  }

  /**
   * Rows for the all-units table: the current amount in every unit of the category.
   * `text` is for display, `copyText` is plain text a clipboard paste can use.
   */
  function getTable() {
    const values = Number.isNaN(state.value) ? null : convertAll(state.value, state.category, state.from);
    return getCategory(state.category).units.map((unit, row) => {
      const value = values ? values[row].value : NaN;
      return {
        id: unit.id,
        symbol: unit.symbol,
        name: unit.name[state.lang],
        value,
        text: formatNumber(value, { lang: state.lang }),
        copyText: formatInput(value, state.lang),
        isFrom: unit.id === state.from,
        isTo: unit.id === state.to,
      };
    });
  }

  /** Switches the language and rewrites the active number with that language's separators. */
  function setLang(lang) {
    const next = normalizeLang(lang);
    if (next === state.lang) return getState();
    const number = activeNumber(state);
    state.lang = next;
    if (!Number.isNaN(number)) state[textKey(state.active)] = formatInput(number, next);
    settle(state, number);
    return getState();
  }

  /** Selects a category with its default units; the number in the "from" field carries over. */
  function setCategory(id) {
    const next = getCategory(id);
    if (!next || next.id === state.category) return getState();
    state.category = next.id;
    [state.from, state.to] = next.defaults;
    keepFromNumber(state);
    return getState();
  }

  /** Picks the unit of one side; the number changed last stays as it is. */
  function setUnit(side, unitId) {
    if ((side === 'from' || side === 'to') && getUnit(state.category, unitId)) {
      state[side] = unitId;
      settle(state, activeNumber(state));
    }
    return getState();
  }

  /**
   * Handles typing in either linked input; text that is not a number sets
   * `inputError`. Blank text, or a lone "-" before the digits, is no error.
   */
  function setText(side, text) {
    if (side !== 'from' && side !== 'to') return getState();
    const typed = String(text ?? '');
    const unfinished = NO_DIGITS_YET_RE.test(typed);
    const number = unfinished ? NaN : parseNumber(typed, state.lang);
    state.active = side;
    state[textKey(side)] = typed;
    state.inputError = !unfinished && Number.isNaN(number) ? 'BAD_NUMBER' : null;
    settle(state, number);
    return getState();
  }

  /** The ± button: puts a minus in front of one side's text or takes it away, as if typed there. */
  function negate(side) {
    if (side !== 'from' && side !== 'to') return getState();
    return setText(side, toggleSign(state[textKey(side)]));
  }

  /** Swaps the two units together with their numbers. */
  function swap() {
    const number = activeNumber(state);
    [state.from, state.to] = [state.to, state.from];
    [state.fromText, state.toText] = [state.toText, state.fromText];
    state.active = otherSide(state.active);
    settle(state, number);
    return getState();
  }

  /**
   * The unit a successful parse converts to: the one it names, else the current
   * "to" unit when it fits, else the category's other default.
   */
  function targetOf(parsed) {
    if (parsed.to) return parsed.to;
    const keepTo = parsed.category === state.category && state.to !== parsed.from;
    return keepTo ? state.to : defaultTarget(getCategory(parsed.category), parsed.from);
  }

  /**
   * What applyQuery(text) would do, without changing anything: the failed
   * parse as it is, or the parse with `to` and `result` always filled in.
   * The UI uses it for the live preview under the smart input line.
   * @param {string} text
   * @returns {object} a parseQuery() result
   */
  function previewQuery(text) {
    const parsed = parseQuery(String(text ?? ''), { lang: state.lang });
    if (!parsed.ok) return parsed;
    const to = targetOf(parsed);
    return { ...parsed, to, result: convert(parsed.value, parsed.category, parsed.from, to) };
  }

  /**
   * Parses the smart input line ("5 ft 3 in to cm") and, when it parses, applies
   * it to the inputs. A failed parse keeps the current conversion and leaves the
   * error in `queryResult`. Blank text clears `queryResult`.
   */
  function applyQuery(text) {
    state.query = String(text ?? '');
    if (state.query.trim() === '') {
      state.queryResult = null;
      return getState();
    }
    const parsed = parseQuery(state.query, { lang: state.lang });
    state.queryResult = parsed;
    if (!parsed.ok) return getState();
    const to = targetOf(parsed);
    state.category = parsed.category;
    state.from = parsed.from;
    state.to = to;
    putValue(state, parsed.value);
    return getState();
  }

  /** Stars or un-stars the current unit pair (newest first, at most MAX_FAVORITES). */
  function toggleFavorite() {
    const index = state.favorites.findIndex((pair) => samePair(pair, state));
    if (index >= 0) state.favorites.splice(index, 1);
    else {
      const pair = { category: state.category, from: state.from, to: state.to };
      state.favorites = [pair, ...state.favorites].slice(0, MAX_FAVORITES);
    }
    return getState();
  }

  /**
   * Opens a favorite or recent entry. An entry with a finite `value` also sets
   * the number; otherwise the number in the "from" field carries over.
   */
  function usePair(entry) {
    if (!isValidPair(entry)) return getState();
    state.category = entry.category;
    state.from = entry.from;
    state.to = entry.to;
    if (Number.isFinite(entry.value)) putValue(state, entry.value);
    else keepFromNumber(state);
    return getState();
  }

  /** Records the current conversion at the top of the recents (one entry per unit pair). */
  function commitRecent() {
    if (!Number.isFinite(state.value)) return getState();
    const entry = { category: state.category, from: state.from, to: state.to, value: state.value };
    state.recents = [entry, ...state.recents.filter((known) => !samePair(known, entry))].slice(0, MAX_RECENTS);
    return getState();
  }

  /** Forgets every recent conversion. */
  function clearRecents() {
    state.recents = [];
    return getState();
  }

  /** Shows or hides the all-units table. */
  function toggleTable() {
    state.tableOpen = !state.tableOpen;
    return getState();
  }

  /** Back to 1 in the category's default units, with an empty query line. */
  function reset() {
    [state.from, state.to] = getCategory(state.category).defaults;
    state.query = '';
    state.queryResult = null;
    putValue(state, 1);
    return getState();
  }

  return {
    getState,
    getSnapshot,
    getTable,
    previewQuery,
    setLang,
    setCategory,
    setUnit,
    setText,
    negate,
    swap,
    applyQuery,
    toggleFavorite,
    usePair,
    commitRecent,
    clearRecents,
    toggleTable,
    reset,
  };
}

/**
 * Builds the deterministic "?demo" state used for the README screenshot:
 * length, 5 ft 3 in converted to centimetres with the all-units table open,
 * three favorites and four recents.
 * @param {object} [options] same as createConverter (e.g. {lang: 'tr'}); favorites, recents and tableOpen are replaced
 * @returns {object} a converter model
 */
export function createDemoConverter(options = {}) {
  const model = createConverter({ ...options, favorites: DEMO_FAVORITES, recents: [], tableOpen: true });
  for (const query of DEMO_QUERIES) {
    model.applyQuery(query);
    model.commitRecent();
  }
  return model;
}
