import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  copyLabel,
  formulaLabel,
  pairSymbols,
  pairTitle,
  queryStatus,
  recentQuantities,
  unitLabel,
} from '../src/labels.js';
import { createConverter } from '../src/model.js';
import { CATEGORIES, getUnit } from '../src/units.js';
import { t } from '../src/i18n.js';

const NBSP = String.fromCharCode(0xa0);

/** Writes the no-break spaces of a label as plain spaces, for readable expectations. */
function plain(text) {
  return text.replaceAll(NBSP, ' ');
}

describe('unitLabel', () => {
  test('adds the symbol after the name', () => {
    assert.equal(unitLabel(getUnit('length', 'ft'), 'en'), 'Foot (ft)');
    assert.equal(unitLabel(getUnit('length', 'ft'), 'tr'), 'Fit (ft)');
    assert.equal(unitLabel(getUnit('temperature', 'F'), 'en'), 'Fahrenheit (°F)');
  });

  test('keeps the bare name when it already reads as the symbol', () => {
    assert.equal(unitLabel(getUnit('data', 'bit'), 'en'), 'Bit');
    assert.equal(unitLabel(getUnit('pressure', 'bar'), 'en'), 'Bar');
    assert.equal(unitLabel(getUnit('cooking', 'tea_glass'), 'tr'), 'Çay bardağı');
    assert.equal(unitLabel(getUnit('cooking', 'tea_glass'), 'en'), 'Turkish tea glass (çay bardağı)');
  });

  test('merges a qualifier such as (UK) into one pair of brackets', () => {
    assert.equal(unitLabel(getUnit('volume', 'floz_uk'), 'en'), 'Fluid ounce (UK, fl oz)');
    assert.equal(unitLabel(getUnit('volume', 'floz_uk'), 'tr'), 'Sıvı ons (İng., fl oz)');
    assert.equal(unitLabel(getUnit('volume', 'gal_us'), 'tr'), 'Galon (ABD, gal)');
  });

  test('gives every unit a distinct, bracket-balanced label in both languages', () => {
    for (const category of CATEGORIES) {
      for (const lang of ['en', 'tr']) {
        const labels = category.units.map((unit) => unitLabel(unit, lang));
        assert.equal(new Set(labels).size, labels.length, `${category.id} ${lang}`);
        for (const label of labels) {
          assert.equal(label.split('(').length, label.split(')').length, label);
          assert.ok(!label.includes('()') && !label.includes(', )'), label);
        }
      }
    }
  });
});

describe('pair labels', () => {
  test('pairSymbols and pairTitle name both units', () => {
    const pair = { category: 'temperature', from: 'F', to: 'C' };
    assert.deepEqual(pairSymbols(pair), { from: '°F', to: '°C' });
    assert.equal(pairTitle({ category: 'length', from: 'ft', to: 'cm' }, 'en'), 'Foot → Centimetre');
    assert.equal(pairTitle({ category: 'length', from: 'ft', to: 'cm' }, 'tr'), 'Fit → Santimetre');
  });

  test('recentQuantities shows both sides, short, with no-break spaces', () => {
    const entry = { category: 'length', from: 'ft', to: 'cm', value: 5.25 };
    const quantities = recentQuantities(entry, 'en');
    assert.deepEqual(quantities, { from: `5.25${NBSP}ft`, to: `160.02${NBSP}cm` });
    const temperature = recentQuantities({ category: 'temperature', from: 'F', to: 'C', value: 72 }, 'tr');
    assert.deepEqual(temperature, { from: `72${NBSP}°F`, to: `22,2222${NBSP}°C` });
    const data = recentQuantities({ category: 'data', from: 'GiB', to: 'MB', value: 1.5 }, 'en');
    assert.equal(plain(data.to), '1,610.61 MB');
  });

  test('formulaLabel expresses one unit in the other', () => {
    assert.equal(plain(formulaLabel({ category: 'length', from: 'ft', to: 'cm', lang: 'en' })), '1 ft = 30.48 cm');
    assert.equal(plain(formulaLabel({ category: 'temperature', from: 'C', to: 'F', lang: 'tr' })), '1 °C = 33,8 °F');
  });

  test('copyLabel names the value a copy button puts on the clipboard', () => {
    const model = createConverter();
    model.applyQuery('5 ft 3 in to cm');
    const row = model.getTable().find((entry) => entry.isTo);
    assert.equal(plain(copyLabel(row, 'en')), 'Copy 160.02 cm');
    assert.equal(plain(copyLabel(row, 'tr')), '160,02 cm kopyala');
  });
});

describe('queryStatus', () => {
  test('shows a live preview while the text parses', () => {
    const model = createConverter();
    const text = '5 ft 3 in to cm';
    const status = queryStatus(text, model.previewQuery(text), model.getState());
    assert.equal(status.kind, 'preview');
    assert.equal(plain(status.text), '5 ft 3 in = 160.02 cm');
  });

  test('the preview names the unit a query without a target converts to', () => {
    const model = createConverter({ lang: 'tr' });
    const status = queryStatus('2 kg', model.previewQuery('2 kg'), model.getState());
    assert.equal(status.kind, 'preview');
    assert.equal(plain(status.text), '2 kg = 4,409245244 lb');
  });

  test('shows the usage hint for blank or unfinished text', () => {
    const model = createConverter();
    const hint = { kind: 'hint', text: t('en', 'queryHint') };
    assert.deepEqual(queryStatus('', model.previewQuery(''), model.getState()), hint);
    assert.deepEqual(queryStatus('5 kg to', model.previewQuery('5 kg to'), model.getState()), hint);
  });

  test('shows the error of a submitted query until the text changes', () => {
    const model = createConverter();
    model.applyQuery('5 zz');
    const state = model.getState();
    assert.deepEqual(queryStatus('5 zz', model.previewQuery('5 zz'), state), {
      kind: 'error',
      text: 'Unknown unit “zz”.',
    });
    assert.equal(queryStatus('5 zz to', model.previewQuery('5 zz to'), state).kind, 'hint');
    model.setLang('tr');
    const turkish = queryStatus('5 zz', model.previewQuery('5 zz'), model.getState());
    assert.equal(turkish.text, t('tr', 'error.UNKNOWN_UNIT', { token: 'zz' }));
  });

  test('an error without a token never prints a placeholder', () => {
    const model = createConverter();
    model.applyQuery('5 kg to cm');
    const status = queryStatus('5 kg to cm', model.previewQuery('5 kg to cm'), model.getState());
    assert.equal(status.kind, 'error');
    assert.equal(status.text, t('en', 'error.INCOMPATIBLE_UNITS'));
    assert.ok(!status.text.includes('{'));
  });
});
