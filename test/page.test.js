import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { STRINGS } from '../src/i18n.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const html = read('index.html');
const css = read('style.css');
const sources = readdirSync(new URL('src/', root))
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({ name, text: read(`src/${name}`) }));
// Modules the tests import directly: no DOM, no window, so they load under Node.
const PURE_MODULES = [
  'convert.js',
  'i18n.js',
  'icons.js',
  'labels.js',
  'lookup.js',
  'model.js',
  'numbers.js',
  'parser.js',
  'shortcuts.js',
  'storage.js',
  'units.js',
];
const SITE = 'https://celaldrg.github.io/unit-converter/';

function matches(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

function withoutComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('index.html', () => {
  test('has the document basics', () => {
    assert.match(html, /^<!doctype html>/i);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<meta charset="utf-8">/i);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
    assert.match(html, /<title>Unit Converter<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]{50,}">/);
    assert.match(html, /<script type="module" src="src\/main\.js"><\/script>/);
    assert.match(html, /<link rel="stylesheet" href="style\.css">/);
  });

  test('asks for viewport-fit only if the CSS uses the safe areas', () => {
    assert.equal(html.includes('viewport-fit'), css.includes('safe-area-inset'));
  });

  test('has Open Graph tags pointing at the published site', () => {
    assert.match(html, /<meta property="og:title" content="[^"]+">/);
    assert.match(html, /<meta property="og:description" content="[^"]+">/);
    assert.ok(html.includes(`<meta property="og:url" content="${SITE}">`));
    assert.ok(html.includes(`<meta property="og:image" content="${SITE}docs/screenshot.png">`));
  });

  test('has an inline SVG favicon and loads nothing from other sites', () => {
    assert.match(html, /<link rel="icon" href="data:image\/svg\+xml,[^"]+">/);
    for (const url of matches(html, /<(?:script|link|img|iframe)\b[^>]*?(?:src|href)="([^"]+)"/g)) {
      assert.ok(!/^(https?:)?\/\//.test(url), url);
    }
  });

  test('every id is unique and every id reference points at an element', () => {
    const ids = matches(html, /\sid="([^"]+)"/g);
    assert.equal(new Set(ids).size, ids.length);
    const references = [
      ...matches(html, /\sfor="([^"]+)"/g),
      ...matches(html, /aria-(?:labelledby|describedby|controls)="([^"]+)"/g).flatMap((list) => list.split(' ')),
    ];
    for (const id of references) assert.ok(ids.includes(id), id);
  });

  test('every translated slot names a string that exists', () => {
    const keys = matches(html, /data-i18n(?:-[a-z]+)?="([^"]+)"/g);
    assert.ok(keys.length > 20);
    for (const key of keys) assert.ok(Object.hasOwn(STRINGS.en, key), key);
  });

  test('every element the view looks up is in the page', () => {
    const view = read('src/view.js');
    const wanted = matches(view, /byId\('([^']+)'\)/g);
    assert.ok(wanted.length > 20);
    for (const id of wanted) assert.ok(html.includes(` id="${id}"`), id);
  });

  test('links the footer to the source repository', () => {
    assert.match(html, /MIT · <a href="https:\/\/github\.com\/celaldrg\/unit-converter"/);
  });
});

describe('source rules', () => {
  test('no HTML injection, eval, string code, document.write or console output', () => {
    const banned = [
      /\.innerHTML\b/,
      /\.outerHTML\b/,
      /insertAdjacentHTML/,
      /\beval\s*\(/,
      /\bnew\s+Function\b/,
      /set(?:Timeout|Interval)\s*\(\s*['"`]/,
      /document\.write/,
      /\bconsole\./,
    ];
    for (const { name, text } of sources) {
      const code = withoutComments(text);
      for (const pattern of banned) assert.ok(!pattern.test(code), `${name}: ${pattern}`);
    }
  });

  test('makes no network requests and imports only local modules', () => {
    for (const { name, text } of sources) {
      const code = withoutComments(text);
      assert.ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(code), name);
      for (const path of matches(code, /\bfrom\s+'([^']+)'/g)) assert.match(path, /^\.\/[\w-]+\.js$/, `${name}: ${path}`);
    }
  });

  test('only storage.js touches localStorage', () => {
    for (const { name, text } of sources) {
      if (name !== 'storage.js') assert.ok(!withoutComments(text).includes('localStorage'), name);
    }
  });

  test('logic modules stay free of the DOM', () => {
    for (const { name, text } of sources.filter((source) => PURE_MODULES.includes(source.name))) {
      assert.ok(!/\b(?:document|window|navigator)\b/.test(withoutComments(text)), name);
    }
  });

  test('every exported function has a JSDoc comment', () => {
    for (const { name, text } of sources) {
      const lines = text.split('\n');
      lines.forEach((line, index) => {
        const exported = /^export (?:async )?function (\w+)/.exec(line);
        if (exported) assert.match(lines[index - 1] ?? '', /\*\/\s*$/, `${name}: ${exported[1]}`);
      });
    }
  });
});
