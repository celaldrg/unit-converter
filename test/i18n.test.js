import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, STRINGS, nextLanguage, t } from '../src/i18n.js';
import { PARSE_ERRORS } from '../src/parser.js';

function placeholders(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

test('English and Turkish have the same keys, all filled in', () => {
  assert.deepEqual(LANGUAGES, ['en', 'tr']);
  assert.deepEqual(Object.keys(STRINGS.tr).sort(), Object.keys(STRINGS.en).sort());
  for (const lang of LANGUAGES) {
    for (const [key, text] of Object.entries(STRINGS[lang])) {
      assert.ok(typeof text === 'string' && text.trim() !== '', `${lang}.${key}`);
    }
  }
});

test('both languages use the same placeholders in every string', () => {
  for (const key of Object.keys(STRINGS.en)) {
    assert.deepEqual(placeholders(STRINGS.tr[key]), placeholders(STRINGS.en[key]), key);
  }
});

test('every parser error code has a message in both languages', () => {
  for (const code of PARSE_ERRORS) {
    for (const lang of LANGUAGES) assert.ok(STRINGS[lang][`error.${code}`], `${lang}: ${code}`);
  }
});

test('t fills placeholders and falls back to English, then to the key', () => {
  assert.equal(t('en', 'appTitle'), 'Unit Converter');
  assert.equal(t('tr', 'appTitle'), 'Birim Çevirici');
  assert.equal(t('en', 'error.UNKNOWN_UNIT', { token: 'foo' }), 'Unknown unit “foo”.');
  assert.equal(t('tr', 'copyValue', { value: '160,02' }), '160,02 kopyala');
  assert.equal(t('en', 'copyValue'), 'Copy {value}');
  assert.equal(t('de', 'reset'), 'Reset');
  assert.equal(t('en', 'no.such.key'), 'no.such.key');
});

test('the language toggle flips between English and Turkish', () => {
  assert.equal(nextLanguage('en'), 'tr');
  assert.equal(nextLanguage('tr'), 'en');
  assert.equal(nextLanguage(undefined), 'tr');
  assert.equal(STRINGS.en.langToggle, 'TR');
  assert.equal(STRINGS.tr.langToggle, 'EN');
});
