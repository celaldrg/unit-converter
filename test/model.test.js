import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_FAVORITES, MAX_RECENTS, createConverter, createDemoConverter } from '../src/model.js';
import { CATEGORIES } from '../src/units.js';

/** Every ordered unit pair, enough to overflow the favorites and recents lists. */
function manyPairs(count) {
  const pairs = [];
  for (const category of CATEGORIES) {
    for (const from of category.units) {
      for (const to of category.units) {
        if (from !== to && pairs.length < count) pairs.push({ category: category.id, from: from.id, to: to.id });
      }
    }
  }
  return pairs;
}

describe('createConverter', () => {
  test('starts at 1 m → ft in English with the table open', () => {
    const state = createConverter().getState();
    assert.equal(state.lang, 'en');
    assert.equal(state.category, 'length');
    assert.equal(state.from, 'm');
    assert.equal(state.to, 'ft');
    assert.equal(state.active, 'from');
    assert.equal(state.fromText, '1');
    assert.equal(state.toText, '3.280839895');
    assert.equal(state.value, 1);
    assert.equal(state.result, 1 / 0.3048);
    assert.equal(state.inputError, null);
    assert.equal(state.query, '');
    assert.equal(state.queryResult, null);
    assert.equal(state.tableOpen, true);
    assert.deepEqual(state.favorites, []);
    assert.deepEqual(state.recents, []);
    assert.equal(state.favorite, false);
  });

  test('takes saved options and falls back on invalid ones', () => {
    const state = createConverter({ lang: 'tr', category: 'mass', from: 'lb', value: 2.5, tableOpen: false }).getState();
    assert.equal(state.lang, 'tr');
    assert.equal(state.from, 'lb');
    assert.equal(state.to, 'kg');
    assert.equal(state.fromText, '2,5');
    assert.equal(state.tableOpen, false);
    const fallback = createConverter({ lang: 'de', category: 'nope', from: 'x', to: 'y', value: NaN }).getState();
    assert.equal(fallback.lang, 'en');
    assert.equal(fallback.category, 'length');
    assert.equal(fallback.from, 'm');
    assert.equal(fallback.to, 'ft');
    assert.equal(fallback.fromText, '1');
    assert.equal(createConverter({ category: 'length', from: 'ft' }).getState().to, 'm');
  });

  test('drops invalid, duplicate and surplus saved favorites and recents', () => {
    const pair = { category: 'length', from: 'm', to: 'ft' };
    const state = createConverter({
      favorites: [pair, { ...pair }, { category: 'nope', from: 'm', to: 'ft' }, { category: 'mass', from: 'kg', to: 'cm' }, null, 'junk'],
      recents: [{ ...pair, value: 2 }, { ...pair, value: 3 }, { category: 'mass', from: 'kg', to: 'lb', value: null }],
    }).getState();
    assert.deepEqual(state.favorites, [pair]);
    assert.deepEqual(state.recents, [{ ...pair, value: 2 }]);
    assert.equal(state.favorite, true);
    assert.deepEqual(createConverter({ favorites: 'junk', recents: {} }).getState().favorites, []);
    const crowded = createConverter({ favorites: manyPairs(30), recents: manyPairs(30).map((p) => ({ ...p, value: 1 })) });
    assert.equal(crowded.getState().favorites.length, MAX_FAVORITES);
    assert.equal(crowded.getState().recents.length, MAX_RECENTS);
  });

  test('a stored session that is not an object (e.g. JSON "null") starts fresh', () => {
    const fresh = createConverter().getState();
    for (const saved of [null, 'junk', 42, true]) {
      assert.deepEqual(createConverter(saved).getState(), fresh, String(saved));
    }
  });
});

describe('linked inputs', () => {
  test('typing on the "from" side updates the "to" side', () => {
    const state = createConverter().setText('from', '5.25');
    assert.equal(state.toText, '17.22440945');
    assert.equal(state.value, 5.25);
  });

  test('Turkish input uses decimal commas both ways', () => {
    const state = createConverter({ lang: 'tr' }).setText('from', '2,5');
    assert.equal(state.value, 2.5);
    assert.equal(state.toText, '8,202099738');
  });

  test('typing on the "to" side updates the "from" side', () => {
    const state = createConverter().setText('to', '10');
    assert.equal(state.active, 'to');
    assert.equal(state.toText, '10');
    assert.equal(state.fromText, '3.048');
    assert.equal(state.value, 3.048);
    assert.equal(state.result, 10);
  });

  test('text that is not a number is kept and flagged; blank text is not an error', () => {
    const model = createConverter();
    let state = model.setText('from', '12abc');
    assert.equal(state.fromText, '12abc');
    assert.equal(state.inputError, 'BAD_NUMBER');
    assert.equal(state.toText, '');
    assert.ok(Number.isNaN(state.value) && Number.isNaN(state.result));
    state = model.setText('from', '  ');
    assert.equal(state.inputError, null);
    assert.equal(state.toText, '');
  });

  test('a lone sign is a number still being typed, not an error', () => {
    const model = createConverter();
    for (const text of ['-', ' + ', '−']) {
      const state = model.setText('from', text);
      assert.equal(state.fromText, text);
      assert.equal(state.inputError, null, text);
      assert.equal(state.toText, '');
    }
    assert.equal(model.setText('from', '-40').toText, '-131.2335958');
  });

  test('negate flips the sign of one side, which becomes the side typed last', () => {
    const model = createConverter({ category: 'temperature' });
    model.setText('from', '40');
    let state = model.negate('from');
    assert.equal(state.fromText, '-40');
    assert.equal(state.toText, '-40');
    assert.equal(state.value, -40);
    state = model.negate('from');
    assert.equal(state.fromText, '40');
    assert.equal(state.toText, '104');
    state = model.negate('to');
    assert.equal(state.active, 'to');
    assert.equal(state.toText, '-104');
    assert.equal(state.fromText, '-75.55555556');
    assert.deepEqual(model.negate('middle'), state);
  });

  test('negate keeps Turkish decimal commas and starts a number in an empty field', () => {
    const model = createConverter({ lang: 'tr', category: 'temperature' });
    model.setText('from', '2,5');
    assert.equal(model.negate('from').toText, '27,5');
    model.setText('from', '');
    const state = model.negate('from');
    assert.equal(state.fromText, '-');
    assert.equal(state.inputError, null);
    assert.equal(model.setText('from', '-40').toText, '-40');
  });

  test('changing a unit keeps the number typed last', () => {
    const model = createConverter();
    assert.equal(model.setUnit('to', 'cm').toText, '100');
    model.setText('to', '50');
    const state = model.setUnit('from', 'mm');
    assert.equal(state.toText, '50');
    assert.equal(state.fromText, '500');
    assert.equal(model.setUnit('to', 'kg').to, 'cm');
    assert.equal(model.setUnit('middle', 'm').from, 'mm');
  });

  test('swap exchanges units and numbers, and swapping twice restores the state', () => {
    const model = createConverter();
    model.setUnit('to', 'cm');
    const before = model.getState();
    const swapped = model.swap();
    assert.equal(swapped.from, 'cm');
    assert.equal(swapped.to, 'm');
    assert.equal(swapped.fromText, '100');
    assert.equal(swapped.toText, '1');
    assert.equal(swapped.active, 'to');
    assert.deepEqual(model.swap(), before);
  });

  test('a new category keeps the number from the "from" field', () => {
    const model = createConverter();
    let state = model.setCategory('temperature');
    assert.equal(state.from, 'C');
    assert.equal(state.to, 'F');
    assert.equal(state.fromText, '1');
    assert.equal(state.toText, '33.8');
    model.setText('to', '212');
    state = model.setCategory('length');
    assert.equal(state.active, 'from');
    assert.equal(state.fromText, '100');
    assert.equal(model.setCategory('nope').category, 'length');
    assert.deepEqual(model.setCategory('length'), state);
  });

  test('switching language rewrites the active number with the new separators', () => {
    const model = createConverter();
    model.setText('from', '1,234.5');
    let state = model.setLang('tr');
    assert.equal(state.lang, 'tr');
    assert.equal(state.fromText, '1234,5');
    assert.equal(state.toText, '4050,19685');
    assert.equal(state.value, 1234.5);
    model.setText('from', 'abc');
    state = model.setLang('en');
    assert.equal(state.fromText, 'abc');
    assert.equal(state.inputError, 'BAD_NUMBER');
  });
});

describe('smart input line', () => {
  test('applies a full query to the inputs', () => {
    const model = createConverter();
    const state = model.applyQuery('5 ft 3 in to cm');
    assert.equal(state.query, '5 ft 3 in to cm');
    assert.equal(state.queryResult.ok, true);
    assert.equal(state.category, 'length');
    assert.equal(state.from, 'ft');
    assert.equal(state.to, 'cm');
    assert.equal(state.fromText, '5.25');
    assert.equal(state.toText, '160.02');
    assert.equal(model.applyQuery('72 F in C').toText, '22.22222222');
  });

  test('keeps full precision behind a rounded "from" field', () => {
    const state = createConverter().applyQuery('1 1/3 cup to ml');
    assert.equal(state.fromText, '1.333333333');
    assert.equal(state.toText, '315.450982');
    assert.equal(state.value, 4 / 3);
  });

  test('a query without a target keeps a sensible "to" unit', () => {
    const model = createConverter();
    let state = model.applyQuery('3 km');
    assert.equal(state.from, 'km');
    assert.equal(state.to, 'ft');
    assert.equal(state.toText, '9842.519685');
    state = model.applyQuery('2 ft');
    assert.equal(state.to, 'm');
    state = model.applyQuery('2 kg');
    assert.equal(state.category, 'mass');
    assert.equal(state.to, 'lb');
  });

  test('Turkish queries read decimal commas', () => {
    const state = createConverter({ lang: 'tr' }).applyQuery('2,5 kg kaç lb');
    assert.equal(state.fromText, '2,5');
    assert.equal(state.toText, '5,511556555');
  });

  test('a failed query reports its error and keeps the conversion', () => {
    const model = createConverter();
    const before = model.getState();
    const state = model.applyQuery('5 kg to cm');
    assert.deepEqual(state.queryResult, { ok: false, code: 'INCOMPATIBLE_UNITS' });
    assert.equal(state.toText, before.toText);
    assert.equal(model.applyQuery('   ').queryResult, null);
  });

  test('previewQuery shows what applyQuery would do and changes nothing', () => {
    const model = createConverter();
    const before = model.getState();
    const preview = model.previewQuery('5 ft 3 in to cm');
    assert.equal(preview.ok, true);
    assert.equal(preview.from, 'ft');
    assert.equal(preview.to, 'cm');
    assert.ok(Math.abs(preview.result - 160.02) < 1e-9);
    assert.deepEqual(model.getState(), before);
    const applied = model.applyQuery('5 ft 3 in to cm');
    assert.equal(applied.result, preview.result);
  });

  test('previewQuery fills in the target of a query that names none', () => {
    const model = createConverter();
    const preview = model.previewQuery('3 km');
    assert.equal(preview.to, 'ft');
    assert.equal(preview.result, 3000 / 0.3048);
    assert.equal(model.previewQuery('2 kg').to, 'lb');
    assert.equal(model.applyQuery('3 km').to, preview.to);
  });

  test('previewQuery passes failed parses through, blank text included', () => {
    const model = createConverter();
    assert.deepEqual(model.previewQuery('5 kg to cm'), { ok: false, code: 'INCOMPATIBLE_UNITS' });
    assert.equal(model.previewQuery('').ok, false);
    assert.equal(model.previewQuery(undefined).ok, false);
    assert.equal(model.getState().queryResult, null);
  });
});

describe('favorites and recents', () => {
  test('toggleFavorite stars and un-stars the current pair, newest first, capped', () => {
    const model = createConverter();
    let state = model.toggleFavorite();
    assert.equal(state.favorite, true);
    assert.deepEqual(state.favorites, [{ category: 'length', from: 'm', to: 'ft' }]);
    state = model.toggleFavorite();
    assert.equal(state.favorite, false);
    assert.deepEqual(state.favorites, []);
    for (const pair of manyPairs(MAX_FAVORITES + 2)) {
      model.usePair(pair);
      state = model.toggleFavorite();
    }
    assert.equal(state.favorites.length, MAX_FAVORITES);
    assert.deepEqual(state.favorites[0], manyPairs(MAX_FAVORITES + 2).at(-1));
  });

  test('usePair opens an entry, with its value when it has one', () => {
    const model = createConverter();
    model.setText('from', '3');
    let state = model.usePair({ category: 'temperature', from: 'F', to: 'C' });
    assert.equal(state.category, 'temperature');
    assert.equal(state.fromText, '3');
    state = model.usePair({ category: 'mass', from: 'lb', to: 'kg', value: 10 });
    assert.equal(state.fromText, '10');
    assert.equal(state.toText, '4.5359237');
    assert.deepEqual(model.usePair({ category: 'mass', from: 'lb', to: 'parsec' }), state);
    model.setText('to', '1');
    assert.equal(model.usePair({ category: 'length', from: 'm', to: 'cm' }).fromText, '2.204622622');
  });

  test('commitRecent keeps one entry per pair, newest first, capped', () => {
    const model = createConverter();
    model.commitRecent();
    model.setText('from', '2');
    let state = model.commitRecent();
    assert.deepEqual(state.recents, [{ category: 'length', from: 'm', to: 'ft', value: 2 }]);
    for (const pair of manyPairs(MAX_RECENTS + 3)) {
      model.usePair({ ...pair, value: 7 });
      state = model.commitRecent();
    }
    assert.equal(state.recents.length, MAX_RECENTS);
    model.setText('from', 'abc');
    assert.deepEqual(model.commitRecent().recents, state.recents);
    assert.deepEqual(model.clearRecents().recents, []);
  });
});

describe('table, snapshot and reset', () => {
  test('getTable lists the amount in every unit of the category', () => {
    const rows = createConverter().getTable();
    assert.equal(rows.length, 11);
    const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
    assert.equal(byId.m.isFrom, true);
    assert.equal(byId.ft.isTo, true);
    assert.equal(byId.cm.text, '100');
    assert.equal(byId.nm.text, '1,000,000,000');
    assert.equal(byId.nm.copyText, '1000000000');
    assert.equal(byId.km.value, 0.001);
    assert.equal(byId.in.name, 'Inch');
    assert.equal(byId.in.symbol, 'in');
  });

  test('getTable follows the language and an invalid input', () => {
    const model = createConverter({ lang: 'tr' });
    const rows = model.getTable();
    assert.equal(rows.find((row) => row.id === 'cm').name, 'Santimetre');
    assert.equal(rows.find((row) => row.id === 'nm').text, '1.000.000.000');
    model.setText('from', 'x');
    assert.ok(model.getTable().every((row) => row.text === '' && Number.isNaN(row.value)));
  });

  test('toggleTable shows and hides the table', () => {
    const model = createConverter();
    assert.equal(model.toggleTable().tableOpen, false);
    assert.equal(model.toggleTable().tableOpen, true);
  });

  test('getSnapshot restores the session through createConverter', () => {
    const model = createConverter({ lang: 'tr' });
    model.applyQuery('72 F in C');
    model.toggleFavorite();
    model.commitRecent();
    model.toggleTable();
    const snapshot = model.getSnapshot();
    assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot);
    const restored = createConverter(snapshot).getState();
    const original = model.getState();
    for (const key of ['lang', 'category', 'from', 'to', 'fromText', 'toText', 'tableOpen', 'favorites', 'recents']) {
      assert.deepEqual(restored[key], original[key], key);
    }
    model.setText('from', '');
    assert.equal(model.getSnapshot().value, 1);
  });

  test('reset returns to 1 in the default units and keeps favorites', () => {
    const model = createConverter();
    model.applyQuery('2 kg to oz');
    model.toggleFavorite();
    const state = model.reset();
    assert.equal(state.category, 'mass');
    assert.equal(state.from, 'kg');
    assert.equal(state.to, 'lb');
    assert.equal(state.fromText, '1');
    assert.equal(state.query, '');
    assert.equal(state.queryResult, null);
    assert.equal(state.favorites.length, 1);
  });

  test('getState returns a detached copy', () => {
    const model = createConverter();
    const state = model.getState();
    state.favorites.push({ category: 'length', from: 'm', to: 'cm' });
    state.from = 'km';
    assert.deepEqual(model.getState().favorites, []);
    assert.equal(model.getState().from, 'm');
  });
});

describe('?demo state', () => {
  test('converts 5 ft 3 in to centimetres with the table open', () => {
    const model = createDemoConverter();
    const state = model.getState();
    assert.equal(state.category, 'length');
    assert.equal(state.from, 'ft');
    assert.equal(state.to, 'cm');
    assert.equal(state.fromText, '5.25');
    assert.equal(state.toText, '160.02');
    assert.equal(state.query, '5 ft 3 in to cm');
    assert.equal(state.tableOpen, true);
    assert.equal(state.favorite, true);
    assert.equal(state.favorites.length, 3);
    assert.deepEqual(
      state.recents.map((entry) => `${entry.value} ${entry.from}→${entry.to}`),
      ['5.25 ft→cm', '72 F→C', '1.5 GiB→MB', '100 km_h→mph'],
    );
    const table = Object.fromEntries(model.getTable().map((row) => [row.id, row.text]));
    assert.equal(table.in, '63');
    assert.equal(table.yd, '1.75');
    assert.equal(table.m, '1.6002');
  });

  test('is deterministic, ignores saved lists and honours the language', () => {
    assert.deepEqual(createDemoConverter().getState(), createDemoConverter().getState());
    const state = createDemoConverter({ lang: 'tr', recents: [{ category: 'mass', from: 'kg', to: 'lb', value: 1 }], tableOpen: false }).getState();
    assert.equal(state.fromText, '5,25');
    assert.equal(state.toText, '160,02');
    assert.equal(state.recents.length, 4);
    assert.equal(state.tableOpen, true);
  });
});
