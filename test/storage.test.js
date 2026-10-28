import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, save } from '../src/storage.js';

/** A Storage-like stand-in, so the tests never touch a real localStorage. */
function memoryStore() {
  const items = new Map();
  return {
    items,
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
  };
}

const brokenStore = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
};

test('save and load round-trip JSON under the app prefix', () => {
  const store = memoryStore();
  const favorites = [{ category: 'length', from: 'ft', to: 'cm' }];
  assert.equal(save('favorites', favorites, store), true);
  assert.equal(store.items.get('unit-converter:favorites'), JSON.stringify(favorites));
  assert.deepEqual(load('favorites', [], store), favorites);
});

test('a missing key returns the fallback', () => {
  assert.deepEqual(load('recents', [], memoryStore()), []);
  assert.equal(load('lang', 'en', memoryStore()), 'en');
});

test('corrupt JSON returns the fallback', () => {
  const store = memoryStore();
  store.setItem('unit-converter:state', '{not json');
  assert.deepEqual(load('state', { ok: true }, store), { ok: true });
});

test('blocked or full storage never throws', () => {
  assert.equal(load('state', 'fallback', brokenStore), 'fallback');
  assert.equal(save('state', { a: 1 }, brokenStore), false);
});

test('no storage at all reads the fallback and reports writes as failed', () => {
  assert.equal(load('state', 'fallback', null), 'fallback');
  assert.equal(save('state', { a: 1 }, null), false);
});
