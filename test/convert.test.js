import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, getCategory } from '../src/units.js';
import { convert, convertAll } from '../src/convert.js';

const SAMPLES = [1, 0.5, -3.75, 42, 1234.5678, 98765.4321];
const ROUND_TRIP_TOLERANCE = 1e-9;
// Close to zero no relative bound can hold for the offset units: 1e-6 °C is
// 273.150001 K, where a double resolves only about 6e-14, so the trip back is
// off by up to 7e-8 relative (via °R). That is floating-point rounding, not a
// conversion error, so these values are held to an absolute bound instead.
const NEAR_ZERO_SAMPLES = [0, 1e-6, -2.5e-9];
const NEAR_ZERO_TOLERANCE = 1e-12;

function assertClose(actual, expected, label) {
  const error = Math.abs(actual - expected);
  assert.ok(error <= 1e-12 * Math.abs(expected), `${label}: got ${actual}, expected ${expected}`);
}

/** Calls check(value, there, back, label) for a value sent A → B → A over every unit pair. */
function forEachRoundTrip(category, values, check) {
  for (const from of category.units) {
    for (const to of category.units) {
      for (const value of values) {
        const there = convert(value, category.id, from.id, to.id);
        const back = convert(there, category.id, to.id, from.id);
        check(value, back, `${value} ${from.id} → ${there} ${to.id} → ${back}`);
      }
    }
  }
}

describe('DONE: every unit pair round-trips within 1e-9 relative error', () => {
  for (const category of CATEGORIES) {
    test(`${category.id} (${category.units.length ** 2} pairs × ${SAMPLES.length} values)`, () => {
      forEachRoundTrip(category, SAMPLES, (value, back, label) => {
        assert.ok(Math.abs(back - value) / Math.abs(value) <= ROUND_TRIP_TOLERANCE, label);
      });
    });
  }
});

describe('round trips near zero stay within 1e-12 absolute error', () => {
  for (const category of CATEGORIES) {
    test(category.id, () => {
      forEachRoundTrip(category, NEAR_ZERO_SAMPLES, (value, back, label) => {
        assert.ok(Math.abs(back - value) <= NEAR_ZERO_TOLERANCE, label);
      });
    });
  }
});

describe('DONE: known values', () => {
  test('1 mile = 1.609344 km', () => {
    assert.equal(convert(1, 'length', 'mi', 'km'), 1.609344);
  });
  test('100 °C = 212 °F', () => {
    assert.equal(convert(100, 'temperature', 'C', 'F'), 212);
  });
  test('0 K = −273.15 °C', () => {
    assert.equal(convert(0, 'temperature', 'K', 'C'), -273.15);
  });
  test('1 GiB = 1.073741824 GB', () => {
    assert.equal(convert(1, 'data', 'GiB', 'GB'), 1.073741824);
  });
  test('1 atm = 101325 Pa', () => {
    assert.equal(convert(1, 'pressure', 'atm', 'Pa'), 101325);
  });
  test('10 L/100 km = 23.5215 mpg (US) to 4 decimals', () => {
    assert.equal(convert(10, 'fuel', 'l_100km', 'mpg_us').toFixed(4), '23.5215');
  });
});

test('more reference values in every category', () => {
  const cases = [
    [1, 'length', 'in', 'cm', 2.54], [1, 'length', 'ft', 'in', 12], [1, 'length', 'mi', 'ft', 5280],
    [1, 'length', 'km', 'mi', 0.621371192237334], [1, 'length', 'nmi', 'm', 1852],
    [1, 'area', 'ac', 'ft2', 43560], [1, 'area', 'mi2', 'ac', 640], [1, 'area', 'ha', 'daa', 10],
    [1, 'area', 'm2', 'ft2', 10.763910416709722],
    [1, 'volume', 'gal_us', 'in3', 231], [1, 'volume', 'gal_us', 'floz_us', 128],
    [1, 'volume', 'bbl', 'gal_us', 42], [1, 'volume', 'gal_uk', 'pt_uk', 8],
    [1, 'mass', 'lb', 'oz', 16], [1, 'mass', 'st', 'lb', 14], [1, 'mass', 'ton_us', 'lb', 2000],
    [1, 'mass', 'ton_uk', 'lb', 2240], [1, 'mass', 'ozt', 'g', 31.1034768], [1, 'mass', 'ct', 'g', 0.2],
    [-40, 'temperature', 'C', 'F', -40], [0, 'temperature', 'C', 'K', 273.15],
    [0, 'temperature', 'C', 'R', 491.67], [212, 'temperature', 'F', 'C', 100],
    [0, 'temperature', 'K', 'F', -459.67], [23.5, 'temperature', 'C', 'K', 296.65],
    [1, 'speed', 'kn', 'km_h', 1.852], [1, 'speed', 'mph', 'km_h', 1.609344], [36, 'speed', 'km_h', 'm_s', 10],
    [1, 'time', 'd', 's', 86400], [1, 'time', 'wk', 'h', 168], [1, 'time', 'yr', 'd', 365.2425],
    [1, 'time', 'yr', 'mo', 12],
    [1, 'data', 'B', 'bit', 8], [1, 'data', 'GB', 'Mbit', 8000], [1, 'data', 'TiB', 'GiB', 1024],
    [1, 'data', 'GB', 'GiB', 0.9313225746154785], [1, 'data', 'Gibit', 'MiB', 128],
    [1, 'pressure', 'bar', 'kPa', 100], [1, 'pressure', 'atm', 'torr', 760], [1, 'pressure', 'atm', 'bar', 1.01325],
    [1, 'pressure', 'psi', 'Pa', 6894.757293168361], [1, 'pressure', 'inHg', 'mmHg', 25.4],
    [1, 'energy', 'kWh', 'MJ', 3.6], [1, 'energy', 'kcal', 'kJ', 4.184], [1, 'energy', 'ft_lbf', 'J', 1.3558179483314004],
    [1, 'power', 'hp', 'W', 745.6998715822702], [1, 'power', 'PS', 'W', 735.49875],
    [1, 'power', 'btu_h', 'W', 0.29307107017222],
    [1, 'angle', 'turn', 'rad', 2 * Math.PI], [1, 'angle', 'deg', 'arcsec', 3600], [1, 'angle', 'rad', 'deg', 180 / Math.PI],
    [1, 'angle', 'mrad', 'rad', 0.001], [1, 'angle', 'grad', 'deg', 0.9],
    [5, 'fuel', 'km_l', 'l_100km', 20], [100, 'fuel', 'l_100km', 'km_l', 1], [1, 'fuel', 'mpg_uk', 'mpg_us', 0.83267418462899],
    [1, 'cooking', 'cup', 'tbsp', 16], [1, 'cooking', 'cup', 'tsp', 48], [1, 'cooking', 'tbsp', 'tsp', 3],
    [1, 'cooking', 'cup', 'ml', 236.5882365], [1, 'cooking', 'water_glass', 'tea_glass', 2],
  ];
  for (const [value, categoryId, from, to, expected] of cases) {
    assertClose(convert(value, categoryId, from, to), expected, `${value} ${from} → ${to}`);
  }
});

test('converting to the same unit returns the value unchanged', () => {
  assert.equal(convert(0.1, 'length', 'm', 'm'), 0.1);
  assert.equal(convert(-7, 'temperature', 'F', 'F'), -7);
});

test('fuel economy is inverse: zero consumption is infinite distance and back', () => {
  assert.equal(convert(0, 'fuel', 'l_100km', 'mpg_us'), Infinity);
  assert.equal(convert(Infinity, 'fuel', 'km_l', 'l_100km'), 0);
  assert.ok(convert(5, 'fuel', 'l_100km', 'km_l') > convert(10, 'fuel', 'l_100km', 'km_l'));
});

test('convertAll lists the value in every unit of the category, in display order', () => {
  const rows = convertAll(1, 'length', 'm');
  assert.deepEqual(rows.map((row) => row.id), getCategory('length').units.map((unit) => unit.id));
  assert.equal(rows.find((row) => row.id === 'm').value, 1);
  assert.equal(rows.find((row) => row.id === 'cm').value, 100);
  assert.equal(rows.find((row) => row.id === 'km').value, 0.001);
  const temperatures = Object.fromEntries(convertAll(100, 'temperature', 'C').map((row) => [row.id, row.value]));
  assert.deepEqual(temperatures, { C: 100, F: 212, K: 373.15, R: 671.67 });
});

test('unknown categories and units throw a RangeError', () => {
  assert.throws(() => convert(1, 'length', 'm', 'kg'), RangeError);
  assert.throws(() => convert(1, 'length', 'parsec', 'm'), RangeError);
  assert.throws(() => convert(1, 'nope', 'm', 'm'), RangeError);
  assert.throws(() => convertAll(1, 'length', 'kg'), RangeError);
  assert.throws(() => convertAll(1, 'nope', 'm'), RangeError);
});
