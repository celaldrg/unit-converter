import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, formatQuantity, parseNumber, toggleSign } from '../src/numbers.js';

const NBSP = String.fromCharCode(0x00a0);
const MINUS = String.fromCharCode(0x2212);

describe('parseNumber', () => {
  test('reads English numbers', () => {
    const cases = [
      ['5', 5], ['2.5', 2.5], ['-3.75', -3.75], ['+2', 2], [`${MINUS}4`, -4], ['.5', 0.5], ['  42  ', 42],
      ['1,500', 1500], ['12,345', 12345], ['1,234,567.89', 1234567.89], ['1.500', 1.5],
      ['1e3', 1000], ['1.5E-3', 0.0015], ['3/4', 0.75], ['-1/2', -0.5],
    ];
    for (const [text, expected] of cases) assert.equal(parseNumber(text, 'en'), expected, text);
  });

  test('reads Turkish numbers with decimal commas', () => {
    const cases = [
      ['2,5', 2.5], ['-0,25', -0.25], [',5', 0.5], ['1.500', 1500], ['1.234.567,89', 1234567.89],
      ['1,500', 1.5], ['1,5e3', 1500], ['3/4', 0.75],
    ];
    for (const [text, expected] of cases) assert.equal(parseNumber(text, 'tr'), expected, text);
  });

  test('accepts the other language when the text is unambiguous', () => {
    assert.equal(parseNumber('2,5', 'en'), 2.5);
    assert.equal(parseNumber('2.5', 'tr'), 2.5);
    assert.equal(parseNumber('1.234,5', 'en'), 1234.5);
    assert.equal(parseNumber('1,234.5', 'tr'), 1234.5);
    assert.equal(parseNumber('0,001', 'en'), 0.001);
    assert.equal(parseNumber('1234,567', 'en'), 1234.567);
  });

  test('defaults to English', () => {
    assert.equal(parseNumber('1,500'), 1500);
    assert.equal(parseNumber('1,500', 'xx'), 1500);
  });

  test('returns NaN for anything that is not a finite number', () => {
    const bad = ['', '   ', 'abc', '.', '1.2.3', '1,23,4', '1.,5', '--5', '1e', '1/0', '5 kg', '1 000', '0x10',
      'NaN', 'Infinity', '1e999'];
    for (const text of bad) {
      assert.ok(Number.isNaN(parseNumber(text, 'en')), `en: ${text}`);
      assert.ok(Number.isNaN(parseNumber(text, 'tr')), `tr: ${text}`);
    }
  });
});

describe('formatNumber', () => {
  test('English display: thousands commas, decimal point, true minus sign', () => {
    assert.equal(formatNumber(1234567.891), '1,234,567.891');
    assert.equal(formatNumber(160.02), '160.02');
    assert.equal(formatNumber(-3.75), `${MINUS}3.75`);
    assert.equal(formatNumber(1 / 3), '0.3333333333');
    assert.equal(formatNumber(2 / 3), '0.6666666667');
    assert.equal(formatNumber(123456789012345), '123,456,789,000,000');
  });

  test('Turkish display: thousands dots and decimal comma', () => {
    assert.equal(formatNumber(1234567.891, { lang: 'tr' }), '1.234.567,891');
    assert.equal(formatNumber(2.5, { lang: 'tr' }), '2,5');
    assert.equal(formatNumber(-0.25, { lang: 'tr' }), `${MINUS}0,25`);
    assert.equal(formatNumber(1600200000, { lang: 'tr' }), '1.600.200.000');
  });

  test('very large and very small values use scientific notation', () => {
    assert.equal(formatNumber(1e15), `1${NBSP}×${NBSP}10¹⁵`);
    assert.equal(formatNumber(6.02214076e23), `6.02214076${NBSP}×${NBSP}10²³`);
    assert.equal(formatNumber(1.602176634e-19), `1.602176634${NBSP}×${NBSP}10⁻¹⁹`);
    assert.equal(formatNumber(1.602176634e-19, { lang: 'tr' }), `1,602176634${NBSP}×${NBSP}10⁻¹⁹`);
    assert.equal(formatNumber(1e-7), `1${NBSP}×${NBSP}10⁻⁷`);
    assert.equal(formatNumber(0.000001), '0.000001');
  });

  test('rounding to significant digits happens before the notation is chosen', () => {
    assert.equal(formatNumber(999999.99999), '1,000,000');
    assert.equal(formatNumber(999999999999999.9), `1${NBSP}×${NBSP}10¹⁵`);
  });

  test('digits sets the significant digits, clamped to 1–17', () => {
    assert.equal(formatNumber(Math.PI, { digits: 3 }), '3.14');
    assert.equal(formatNumber(Math.PI, { digits: 0 }), '3');
    assert.equal(formatNumber(Math.PI, { digits: 99 }), String(Math.PI));
  });

  test('input mode is plain text that parseNumber reads back', () => {
    assert.equal(formatNumber(1234567.891, { mode: 'input' }), '1234567.891');
    assert.equal(formatNumber(1234567.891, { lang: 'tr', mode: 'input' }), '1234567,891');
    assert.equal(formatNumber(-3.75, { mode: 'input' }), '-3.75');
    assert.equal(formatNumber(1.602176634e-19, { mode: 'input' }), '1.602176634e-19');
    assert.equal(formatNumber(-1e20, { mode: 'input' }), '-1e20');
    assert.equal(formatNumber(1.5e-7, { lang: 'tr', mode: 'input' }), '1,5e-7');
  });

  test('format → parse round trip in both languages', () => {
    const values = [0.1, 1 / 3, -42.5, 1234567.891, 1500, 1.602176634e-19, 6.02214076e23];
    for (const lang of ['en', 'tr']) {
      for (const value of values) {
        const text = formatNumber(value, { lang, mode: 'input', digits: 17 });
        assert.equal(parseNumber(text, lang), value, `${lang}: ${text}`);
      }
    }
  });

  test('17-digit scientific input text parses back to the same double', () => {
    // Re-rounding the mantissa used to change the last digit of values like the first one.
    let seed = 7;
    const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const values = [-7.692195654381066e-13];
    for (let i = 0; i < 2000; i++) values.push((next() - 0.5) * 10 ** Math.floor(next() * 60 - 30));
    for (const lang of ['en', 'tr']) {
      for (const value of values) {
        const text = formatNumber(value, { lang, mode: 'input', digits: 17 });
        assert.equal(parseNumber(text, lang), value, `${lang}: ${text}`);
      }
    }
  });

  test('zero, NaN, infinities and non-numbers', () => {
    assert.equal(formatNumber(0), '0');
    assert.equal(formatNumber(-0), '0');
    assert.equal(formatNumber(NaN), '');
    assert.equal(formatNumber('5'), '');
    assert.equal(formatNumber(undefined), '');
    assert.equal(formatNumber(Infinity), '∞');
    assert.equal(formatNumber(-Infinity), `${MINUS}∞`);
    assert.equal(formatNumber(-Infinity, { mode: 'input' }), '-∞');
  });
});

describe('toggleSign', () => {
  test('adds a minus or takes it away, keeping the rest as typed', () => {
    const cases = [
      ['40', '-40'], ['-40', '40'], [`${MINUS}40`, '40'], ['+2', '-2'], ['2,5', '-2,5'], ['1,234.5', '-1,234.5'],
      ['1.5e-7', '-1.5e-7'], ['3/4', '-3/4'], ['  7 ', '-7'], ['', '-'], ['-', ''], ['0', '-0'],
    ];
    for (const [text, expected] of cases) assert.equal(toggleSign(text), expected, text);
  });

  test('toggling twice gives back the number, and the result parses in both languages', () => {
    for (const lang of ['en', 'tr']) {
      for (const text of ['40', '-3,75', '1.500', '+12']) {
        const flipped = toggleSign(text);
        assert.equal(parseNumber(flipped, lang), -parseNumber(text, lang), `${lang}: ${text}`);
        assert.equal(parseNumber(toggleSign(flipped), lang), parseNumber(text, lang), `${lang}: ${flipped}`);
      }
    }
  });
});

describe('formatQuantity', () => {
  test('joins number and symbol with a no-break space in display mode', () => {
    assert.equal(formatQuantity(160.02, 'cm'), `160.02${NBSP}cm`);
    assert.equal(formatQuantity(2.5, 'kg', { lang: 'tr' }), `2,5${NBSP}kg`);
    assert.equal(formatQuantity(22, '°C'), `22${NBSP}°C`);
  });

  test('degree, arcminute and arcsecond symbols sit right after the number', () => {
    assert.equal(formatQuantity(90, '°'), '90°');
    assert.equal(formatQuantity(5, '′'), '5′');
    assert.equal(formatQuantity(30, '″'), '30″');
  });

  test('input mode uses a plain space; NaN gives an empty string', () => {
    assert.equal(formatQuantity(1.5, 'kg', { mode: 'input' }), '1.5 kg');
    assert.equal(formatQuantity(NaN, 'cm'), '');
  });
});
