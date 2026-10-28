/**
 * Keyboard control as data: the desktop shortcuts, their on-screen legend and
 * the category stepping shared by "[" / "]" and the arrow keys on the
 * category chips. No DOM here; main.js feeds in the key presses.
 */
import { CATEGORIES } from './units.js';

const KEY_ACTIONS = Object.freeze({
  '/': 'focusQuery',
  s: 'swap',
  f: 'favorite',
  t: 'toggleTable',
  '[': 'previousCategory',
  ']': 'nextCategory',
});
const CHIP_STEPS = Object.freeze({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 });

/** Key caps (space separated) and i18n keys of the on-screen shortcut legend. */
export const SHORTCUT_HINTS = Object.freeze([
  Object.freeze({ keys: '/', label: 'kbdQuery' }),
  Object.freeze({ keys: 'S', label: 'kbdSwap' }),
  Object.freeze({ keys: 'F', label: 'kbdFavorite' }),
  Object.freeze({ keys: 'T', label: 'kbdTable' }),
  Object.freeze({ keys: '[ ]', label: 'kbdCategory' }),
]);

/**
 * The action a key press triggers. Shortcuts are single keys, so they stay off
 * while a text field or select has focus, with Ctrl, Cmd or Alt held (AltGr is
 * fine: it types "[" on many layouts) and on auto-repeat.
 * @param {{key: string, ctrlKey?: boolean, metaKey?: boolean, altKey?: boolean,
 *   altGraph?: boolean, repeat?: boolean}} press the KeyboardEvent fields
 * @param {boolean} typing whether focus is in a text field or select
 * @returns {string|null} 'focusQuery', 'swap', 'favorite', 'toggleTable',
 *   'previousCategory', 'nextCategory' or null
 */
export function shortcutAction(press, typing) {
  const modified = press.metaKey || ((press.ctrlKey || press.altKey) && !press.altGraph);
  if (typing || modified || press.repeat || typeof press.key !== 'string') return null;
  const key = press.key.toLowerCase();
  return Object.hasOwn(KEY_ACTIONS, key) ? KEY_ACTIONS[key] : null;
}

/**
 * The category `step` places away from `id` in display order, wrapping around.
 * @param {string} id current category id
 * @param {number} step 1 for the next category, -1 for the previous one
 * @returns {string}
 */
export function adjacentCategory(id, step) {
  const count = CATEGORIES.length;
  const index = CATEGORIES.findIndex((category) => category.id === id);
  return CATEGORIES[(((index + step) % count) + count) % count].id;
}

/**
 * Where an arrow, Home or End key moves the selection in the category chips.
 * @param {string} key KeyboardEvent.key
 * @param {string} id the selected category
 * @returns {string|null} the category to select, or null for any other key
 */
export function chipKeyTarget(key, id) {
  if (key === 'Home') return CATEGORIES[0].id;
  if (key === 'End') return CATEGORIES.at(-1).id;
  return Object.hasOwn(CHIP_STEPS, key) ? adjacentCategory(id, CHIP_STEPS[key]) : null;
}
