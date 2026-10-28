import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { PARSE_ERRORS, parseQuery } from '../src/parser.js';

function assertClose(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) <= 1e-12 * Math.abs(expected), `${label}: got ${actual}, expected ${expected}`);
}

/** Parses `text` and checks category, units and the converted result. */
function expectConversion(text, { lang = 'en', category, from, to, value, result }) {
  const parsed = parseQuery(text, { lang });
  assert.equal(parsed.ok, true, `${text}: ${parsed.code}`);
  assert.equal(parsed.category, category, text);
  assert.equal(parsed.from, from, text);
  assert.equal(parsed.to, to, text);
  if (value !== undefined) assertClose(parsed.value, value, `${text} (value)`);
  if (result !== undefined) assertClose(parsed.result, result, `${text} (result)`);
  return parsed;
}

describe('DONE: parser examples from the spec', () => {
  test('5 ft 3 in to cm', () => {
    const parsed = expectConversion('5 ft 3 in to cm', { category: 'length', from: 'ft', to: 'cm', value: 5.25, result: 160.02 });
    assert.deepEqual(parsed.parts, [{ value: 5, unit: 'ft' }, { value: 3, unit: 'in' }]);
  });

  test('72 F in C', () => {
    expectConversion('72 F in C', { category: 'temperature', from: 'F', to: 'C', value: 72, result: 200 / 9 });
  });

  test('1.5 GiB to MB', () => {
    expectConversion('1.5 GiB to MB', { category: 'data', from: 'GiB', to: 'MB', value: 1.5, result: 1610.612736 });
  });

  test('Turkish decimal commas: 2,5 kg', () => {
    const parsed = expectConversion('2,5 kg', { lang: 'tr', category: 'mass', from: 'kg', to: null, value: 2.5 });
    assert.equal(parsed.result, null);
    expectConversion('2,5 kg kaç lb', { lang: 'tr', category: 'mass', from: 'kg', to: 'lb', result: 5.511556554621939 });
    expectConversion('1,5 GiB to MB', { lang: 'tr', category: 'data', from: 'GiB', to: 'MB', result: 1610.612736 });
    expectConversion('2,5 kg', { lang: 'en', category: 'mass', from: 'kg', to: null, value: 2.5 });
  });

  test('thousands separators follow the language', () => {
    expectConversion('1,500 g to kg', { lang: 'en', category: 'mass', from: 'g', to: 'kg', value: 1500, result: 1.5 });
    expectConversion('1.500 g to kg', { lang: 'tr', category: 'mass', from: 'g', to: 'kg', value: 1500, result: 1.5 });
  });

  test('10 L/100 km to mpg is 23.5215', () => {
    const parsed = expectConversion('10 L/100 km to mpg', { category: 'fuel', from: 'l_100km', to: 'mpg_us' });
    assert.equal(parsed.result.toFixed(4), '23.5215');
  });
});

describe('parser: more ways to write a conversion', () => {
  const cases = [
    [`5'3" to cm`, 'length', 'ft', 'cm', 160.02],
    ['5 ft. 3 in. to cm', 'length', 'ft', 'cm', 160.02],
    ['5ft to cm', 'length', 'ft', 'cm', 152.4],
    ['5 ft in', 'length', 'ft', 'in', 60],
    ['1 in in mm', 'length', 'in', 'mm', 25.4],
    ['3 İNÇ to cm', 'length', 'in', 'cm', 7.62],
    ['1 nautical mile = ? m', 'length', 'nmi', 'm', 1852],
    ['72° F in C', 'temperature', 'F', 'C', 200 / 9],
    ['72 °F → °C', 'temperature', 'F', 'C', 200 / 9],
    ['20 °C to K', 'temperature', 'C', 'K', 293.15],
    ['kg to lb', 'mass', 'kg', 'lb', 2.2046226218487757],
    ['100 km/h kaç mph', 'speed', 'km_h', 'mph', 62.1371192237334],
    ['-1 h 30 min to min', 'time', 'h', 'min', -90],
    ['2 h 20 min to min', 'time', 'h', 'min', 140],
    ['1 Mb to kB', 'data', 'Mbit', 'kB', 125],
    ['1 MB to kb', 'data', 'MB', 'kbit', 8000],
    ['1013 mb to hPa', 'pressure', 'mbar', 'hPa', 1013],
    ['30 inHg to hPa', 'pressure', 'inHg', 'hPa', 1015.9165921023],
    ['1 Cal to kJ', 'energy', 'kcal', 'kJ', 4.184],
    [`30° 15' to deg`, 'angle', 'deg', 'deg', 30.25],
    ['100 sq ft to m2', 'area', 'ft2', 'm2', 9.290304],
    ['1 dönüm to m2', 'area', 'daa', 'm2', 1000],
    ['1 1/2 cups to ml', 'cooking', 'cup', 'ml', 354.88235475],
    ['½ cup in tbsp', 'cooking', 'cup', 'tbsp', 8],
    ['1 T to tsp', 'cooking', 'tbsp', 'tsp', 3],
    ['1 su bardağı to ml', 'cooking', 'water_glass', 'ml', 200],
    ["5 ft'i cm'ye çevir", 'length', 'ft', 'cm', 152.4],
    ["5 ft cm'ye", 'length', 'ft', 'cm', 152.4],
    ['convert 5 ft to cm', 'length', 'ft', 'cm', 152.4],
  ];
  for (const [text, category, from, to, result] of cases) {
    test(text, () => expectConversion(text, { category, from, to, result }));
  }
});

describe('DONE: parser rejects nonsense with an error code', () => {
  const cases = [
    ['', 'EMPTY'],
    ['   ', 'EMPTY'],
    ['convert', 'EMPTY'],
    ['1.2.3 m', 'BAD_NUMBER'],
    ['1/0 m', 'BAD_NUMBER'],
    ['5', 'MISSING_UNIT'],
    ['5 ft 3', 'MISSING_UNIT'],
    ['5 to cm', 'MISSING_UNIT'],
    ['5 foo', 'UNKNOWN_UNIT', 'foo'],
    ['hello world', 'UNKNOWN_UNIT', 'hello'],
    ['5 ft to parsecs', 'UNKNOWN_UNIT', 'parsecs'],
    ['5 ft to', 'MISSING_TARGET'],
    ['5 kg to cm', 'INCOMPATIBLE_UNITS'],
    ['5 °C 3 °F', 'BAD_COMPOUND'],
    ['5 ft to cm m', 'TRAILING_INPUT', 'm'],
  ];
  for (const [text, code, token] of cases) {
    test(`"${text}" → ${code}`, () => {
      const parsed = parseQuery(text);
      assert.equal(parsed.ok, false);
      assert.equal(parsed.code, code);
      if (token !== undefined) assert.equal(parsed.token, token);
    });
  }

  test('every error code is listed and reachable', () => {
    const reached = new Set(cases.map(([, code]) => code));
    assert.deepEqual([...reached].sort(), [...PARSE_ERRORS].sort());
  });

  test('non-string input is treated as empty', () => {
    assert.deepEqual(parseQuery(null), { ok: false, code: 'EMPTY' });
    assert.deepEqual(parseQuery(undefined), { ok: false, code: 'EMPTY' });
  });
});
