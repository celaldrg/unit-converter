import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, getCategory, getUnit } from '../src/units.js';

const SPEC_ORDER = [
  'length', 'area', 'volume', 'mass', 'temperature', 'speed', 'time',
  'data', 'pressure', 'energy', 'power', 'angle', 'fuel', 'cooking',
];

test('the 14 categories follow the spec order', () => {
  assert.deepEqual(CATEGORIES.map((category) => category.id), SPEC_ORDER);
});

test('the catalogue holds 136 units', () => {
  assert.equal(CATEGORIES.reduce((sum, category) => sum + category.units.length, 0), 136);
});

test('every category has names, one base unit and two distinct default units', () => {
  for (const category of CATEGORIES) {
    const ids = category.units.map((unit) => unit.id);
    assert.ok(category.name.en && category.name.tr, category.id);
    assert.equal(new Set(ids).size, ids.length, `${category.id}: duplicate unit id`);
    assert.equal(category.units.filter((unit) => unit.factor === 1).length, 1, `${category.id}: base`);
    assert.equal(getUnit(category.id, category.base).factor, 1, `${category.id}: base factor`);
    const [from, to] = category.defaults;
    assert.ok(getUnit(category.id, from) && getUnit(category.id, to) && from !== to, `${category.id}: defaults`);
  }
});

test('every unit has a symbol, English and Turkish names and exactly one way to convert', () => {
  for (const category of CATEGORIES) {
    for (const unit of category.units) {
      const label = `${category.id}/${unit.id}`;
      assert.ok(unit.symbol && unit.name.en && unit.name.tr, label);
      const linear = Number.isFinite(unit.factor) && unit.factor > 0;
      const paired = typeof unit.toBase === 'function' && typeof unit.fromBase === 'function';
      assert.ok(linear !== paired, label);
    }
  }
});

test('affine and inverse units carry function pairs that undo each other', () => {
  const paired = [['temperature', 'F'], ['temperature', 'K'], ['temperature', 'R'], ['fuel', 'l_100km']];
  for (const [categoryId, unitId] of paired) {
    const unit = getUnit(categoryId, unitId);
    for (const value of [-40, 0.5, 37, 1000]) {
      const back = unit.toBase(unit.fromBase(value));
      assert.ok(Math.abs(back - value) <= 1e-12 * Math.abs(value), `${unitId}: ${value} → ${back}`);
    }
  }
});

test('defining constants are exact', () => {
  const exact = [
    ['length', 'in', 0.0254], ['length', 'ft', 0.3048], ['length', 'yd', 0.9144],
    ['length', 'mi', 1609.344], ['length', 'nmi', 1852],
    ['area', 'ft2', 0.09290304], ['area', 'ac', 4046.8564224], ['area', 'daa', 1000],
    ['volume', 'gal_us', 3.785411784], ['volume', 'gal_uk', 4.54609], ['volume', 'in3', 0.016387064],
    ['mass', 'lb', 0.45359237], ['mass', 'oz', 0.028349523125], ['mass', 'ozt', 0.0311034768],
    ['time', 'mo', 2629746], ['time', 'yr', 31556952],
    ['data', 'bit', 0.125], ['data', 'GB', 1e9], ['data', 'GiB', 1073741824],
    ['pressure', 'atm', 101325], ['pressure', 'bar', 1e5], ['pressure', 'at', 98066.5],
    ['pressure', 'mmHg', 133.322387415],
    ['energy', 'cal', 4.184], ['energy', 'kcal', 4184], ['energy', 'BTU', 1055.05585262],
    ['energy', 'eV', 1.602176634e-19],
    ['power', 'PS', 735.49875],
    ['cooking', 'cup', 0.2365882365], ['cooking', 'water_glass', 0.2],
  ];
  for (const [categoryId, unitId, factor] of exact) {
    assert.equal(getUnit(categoryId, unitId).factor, factor, `${categoryId}/${unitId}`);
  }
});

test('volume and cooking share the same millilitre, litre and US measures', () => {
  for (const id of ['ml', 'l', 'floz_us', 'pt_us', 'qt_us']) {
    assert.equal(getUnit('volume', id), getUnit('cooking', id), id);
  }
});

test('the catalogue is frozen', () => {
  assert.ok(Object.isFrozen(CATEGORIES));
  for (const category of CATEGORIES) {
    assert.ok(Object.isFrozen(category) && Object.isFrozen(category.units), category.id);
    for (const unit of category.units) {
      assert.ok(Object.isFrozen(unit) && Object.isFrozen(unit.name), `${category.id}/${unit.id}`);
    }
  }
});

test('getCategory and getUnit return undefined for unknown ids', () => {
  assert.equal(getCategory('mass').id, 'mass');
  assert.equal(getUnit('mass', 'kg').symbol, 'kg');
  assert.equal(getCategory('nope'), undefined);
  assert.equal(getUnit('length', 'kg'), undefined);
  assert.equal(getUnit('nope', 'm'), undefined);
  assert.equal(getUnit('length', undefined), undefined);
});
