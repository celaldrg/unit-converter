import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { SHORTCUT_HINTS, adjacentCategory, chipKeyTarget, shortcutAction } from '../src/shortcuts.js';
import { CATEGORIES } from '../src/units.js';
import { LANGUAGES, STRINGS } from '../src/i18n.js';

const FIRST = CATEGORIES[0].id;
const LAST = CATEGORIES.at(-1).id;

describe('shortcutAction', () => {
  test('maps the single-key shortcuts, in either case', () => {
    assert.equal(shortcutAction({ key: '/' }, false), 'focusQuery');
    assert.equal(shortcutAction({ key: 's' }, false), 'swap');
    assert.equal(shortcutAction({ key: 'S' }, false), 'swap');
    assert.equal(shortcutAction({ key: 'f' }, false), 'favorite');
    assert.equal(shortcutAction({ key: 't' }, false), 'toggleTable');
    assert.equal(shortcutAction({ key: '[' }, false), 'previousCategory');
    assert.equal(shortcutAction({ key: ']' }, false), 'nextCategory');
  });

  test('ignores other keys, including inherited object property names', () => {
    for (const key of ['a', 'Enter', 'Escape', ' ', 'toString', 'constructor', '__proto__']) {
      assert.equal(shortcutAction({ key }, false), null, key);
    }
    assert.equal(shortcutAction({ key: undefined }, false), null);
  });

  test('stays off while typing, with Ctrl, Cmd or Alt held and on auto-repeat', () => {
    assert.equal(shortcutAction({ key: 's' }, true), null);
    assert.equal(shortcutAction({ key: 's', ctrlKey: true }, false), null);
    assert.equal(shortcutAction({ key: 's', metaKey: true }, false), null);
    assert.equal(shortcutAction({ key: 'f', altKey: true }, false), null);
    assert.equal(shortcutAction({ key: 't', repeat: true }, false), null);
  });

  test('allows AltGr, which types the brackets on many keyboard layouts', () => {
    const altGraph = { ctrlKey: true, altKey: true, altGraph: true };
    assert.equal(shortcutAction({ key: '[', ...altGraph }, false), 'previousCategory');
    assert.equal(shortcutAction({ key: ']', ...altGraph }, false), 'nextCategory');
    assert.equal(shortcutAction({ key: ']', ...altGraph, metaKey: true }, false), null);
  });

  test('every legend entry names real shortcuts and a translated label', () => {
    assert.ok(SHORTCUT_HINTS.length > 0);
    for (const hint of SHORTCUT_HINTS) {
      for (const key of hint.keys.split(' ')) assert.ok(shortcutAction({ key }, false), key);
      for (const lang of LANGUAGES) assert.ok(STRINGS[lang][hint.label], `${lang}.${hint.label}`);
    }
  });
});

describe('category stepping', () => {
  test('adjacentCategory moves through the display order and wraps around', () => {
    assert.equal(adjacentCategory(FIRST, 1), CATEGORIES[1].id);
    assert.equal(adjacentCategory(CATEGORIES[1].id, -1), FIRST);
    assert.equal(adjacentCategory(FIRST, -1), LAST);
    assert.equal(adjacentCategory(LAST, 1), FIRST);
  });

  test('chipKeyTarget follows the arrow keys, Home and End', () => {
    assert.equal(chipKeyTarget('ArrowRight', FIRST), CATEGORIES[1].id);
    assert.equal(chipKeyTarget('ArrowDown', FIRST), CATEGORIES[1].id);
    assert.equal(chipKeyTarget('ArrowLeft', FIRST), LAST);
    assert.equal(chipKeyTarget('ArrowUp', LAST), CATEGORIES.at(-2).id);
    assert.equal(chipKeyTarget('Home', LAST), FIRST);
    assert.equal(chipKeyTarget('End', FIRST), LAST);
  });

  test('chipKeyTarget ignores every other key', () => {
    for (const key of ['Enter', ' ', 'Tab', 'a', 'toString']) assert.equal(chipKeyTarget(key, FIRST), null, key);
  });
});
