/**
 * The only door to localStorage. Every read and write is wrapped in try/catch,
 * so private mode, blocked storage or a full quota never break the app: reads
 * fall back, writes report false.
 */

const PREFIX = 'unit-converter:';

/** window.localStorage when the browser allows it, otherwise null (looked up per call, never at import). */
function browserStore() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Reads a JSON value.
 * @param {string} key name without the app prefix
 * @param {*} fallback returned when the value is missing, unreadable or storage is blocked
 * @param {Storage|null} [store] storage to use; defaults to localStorage
 * @returns {*}
 */
export function load(key, fallback, store = browserStore()) {
  try {
    const raw = store?.getItem(PREFIX + key);
    return raw === null || raw === undefined ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Writes a JSON value.
 * @param {string} key name without the app prefix
 * @param {*} value anything JSON can hold
 * @param {Storage|null} [store] storage to use; defaults to localStorage
 * @returns {boolean} whether the value was stored
 */
export function save(key, value, store = browserStore()) {
  try {
    if (!store) return false;
    store.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
