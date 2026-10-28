import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES } from '../src/units.js';
import { findUnits, fold } from '../src/lookup.js';

function first(phrase) {
  const [hit] = findUnits(phrase);
  return hit && `${hit.category}/${hit.unit}/${hit.rank}`;
}

test('fold ignores case, diacritics, compatibility forms and extra spaces', () => {
  assert.equal(fold('İnç'), 'inc');
  assert.equal(fold('  Su   Bardağı '), 'su bardagi');
  assert.equal(fold('IŞIK'), 'isik');
  assert.equal(fold('m²'), 'm2');
  assert.equal(fold('℃'), '°c');
  assert.equal(fold('KiLo'), 'kilo');
});

test('every symbol, name and alias finds its own unit first within its category', () => {
  for (const category of CATEGORIES) {
    for (const unit of category.units) {
      const phrases = [unit.symbol, unit.name.en, unit.name.tr, ...(unit.aliases ?? []), ...(unit.exactAliases ?? [])];
      for (const phrase of phrases) {
        const hit = findUnits(phrase).find((candidate) => candidate.category === category.id);
        assert.equal(hit?.unit, unit.id, `${category.id}/${unit.id}: "${phrase}"`);
        assert.ok(hit.rank <= 1, `${category.id}/${unit.id}: "${phrase}" needed a fallback`);
      }
    }
  }
});

test('case-exact aliases tell bits from bytes and milli from mega', () => {
  assert.equal(first('Mb'), 'data/Mbit/0');
  assert.equal(first('MB'), 'data/MB/1');
  assert.equal(first('kb'), 'data/kbit/0');
  assert.equal(first('kB'), 'data/kB/1');
  assert.equal(first('b'), 'data/bit/0');
  assert.equal(first('B'), 'data/B/1');
  assert.equal(first('mW'), 'power/mW/0');
  assert.deepEqual(findUnits('MW').map((hit) => hit.unit), ['MW']);
  assert.equal(first('Cal'), 'energy/kcal/0');
  assert.equal(first('cal'), 'energy/cal/1');
  assert.equal(first('NM'), 'length/nmi/0');
  assert.equal(first('nm'), 'length/nm/1');
});

test('one phrase can name units in several categories, in catalogue order', () => {
  assert.deepEqual(findUnits("'").map((hit) => `${hit.category}/${hit.unit}`), ['length/ft', 'angle/arcmin']);
  assert.deepEqual(findUnits('ml').map((hit) => hit.category), ['volume', 'cooking']);
  assert.deepEqual(findUnits('mb').map((hit) => `${hit.category}/${hit.unit}`), ['data/MB', 'pressure/mbar']);
});

test('plurals, trailing dots and Turkish suffixes fall back to the bare unit', () => {
  assert.equal(first('miles'), 'length/mi/2');
  assert.equal(first('inches'), 'length/in/2');
  assert.equal(first('cups'), 'cooking/cup/2');
  assert.equal(first('Grams'), 'mass/g/2');
  assert.equal(first('ft.'), 'length/ft/2');
  assert.equal(first("cm'ye"), 'length/cm/2');
  assert.equal(first('kg’dan'), 'mass/kg/2');
});

test('unknown phrases find nothing', () => {
  assert.deepEqual(findUnits('parsec'), []);
  assert.deepEqual(findUnits(''), []);
  assert.deepEqual(findUnits('to'), []);
});
