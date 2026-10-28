/**
 * Draws the converter state into the page skeleton of index.html. Every
 * visible string comes from i18n.js or the unit data. Lists and table rows are
 * rebuilt only when their content changes, so focus stays on the control a
 * person just used.
 */
import { CATEGORIES, getCategory } from './units.js';
import { t } from './i18n.js';
import { SHORTCUT_HINTS } from './shortcuts.js';
import { fillIcons, h, icon } from './dom.js';
import { copyLabel, formulaLabel, pairSymbols, pairTitle, queryStatus, recentQuantities, unitLabel } from './labels.js';

const TOAST_MS = 1600;
const SIDES = Object.freeze(['from', 'to']);
const STATUS_ICONS = Object.freeze({ preview: 'arrow', error: 'alert' });
// Static markup names its strings in these attributes; each says where the text goes.
const STRING_SLOTS = Object.freeze({
  'data-i18n': (node, text) => {
    node.textContent = text;
  },
  'data-i18n-aria': (node, text) => node.setAttribute('aria-label', text),
  'data-i18n-title': (node, text) => node.setAttribute('title', text),
  'data-i18n-placeholder': (node, text) => node.setAttribute('placeholder', text),
});

function byId(id) {
  return document.getElementById(id);
}

function findRefs() {
  return {
    chips: byId('chips'),
    queryForm: byId('query-form'),
    queryInput: byId('query-input'),
    queryStatus: byId('query-status'),
    categoryTitle: byId('category-title'),
    formula: byId('formula'),
    star: byId('star-btn'),
    swap: byId('swap-btn'),
    from: { input: byId('from-input'), unit: byId('from-unit'), sign: byId('from-sign'), copy: byId('from-copy'), error: byId('from-error') },
    to: { input: byId('to-input'), unit: byId('to-unit'), sign: byId('to-sign'), copy: byId('to-copy'), error: byId('to-error') },
    favorites: byId('favorites'),
    recents: byId('recents'),
    recentsTitle: byId('recents-title'),
    clearRecents: byId('clear-recents'),
    tableToggle: byId('table-toggle'),
    tableToggleText: byId('table-toggle-text'),
    tableWrap: byId('table-wrap'),
    tableBody: byId('table-body'),
    reset: byId('reset-btn'),
    lang: byId('lang-btn'),
    kbdHints: byId('kbd-hints'),
    toast: byId('toast'),
  };
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function samePair(a, b) {
  return a.category === b.category && a.from === b.from && a.to === b.to;
}

function shortcutHint({ keys, label }, lang) {
  const caps = keys.split(' ').map((key) => h('kbd', { text: key }));
  return h('span', { class: 'hint' }, ...caps, h('span', { text: t(lang, label) }));
}

function renderStrings(refs, lang) {
  document.documentElement.lang = lang;
  document.title = t(lang, 'appTitle');
  for (const [attribute, apply] of Object.entries(STRING_SLOTS)) {
    for (const node of document.querySelectorAll(`[${attribute}]`)) apply(node, t(lang, node.getAttribute(attribute)));
  }
  // The visible "TR" / "EN" starts the accessible name.
  refs.lang.setAttribute('aria-label', `${t(lang, 'langToggle')} – ${t(lang, 'langToggleLabel')}`);
  refs.kbdHints.replaceChildren(...SHORTCUT_HINTS.map((hint) => shortcutHint(hint, lang)));
}

function buildChips(container) {
  const chips = new Map();
  for (const category of CATEGORIES) {
    const chip = h('button', { type: 'button', class: 'chip', role: 'radio', 'data-category': category.id });
    chips.set(category.id, chip);
  }
  container.replaceChildren(...chips.values());
  return chips;
}

/** Scrolls the chip row sideways (only) so the chip sits in the middle. */
function revealChip(container, chip, smooth) {
  if (container.scrollWidth <= container.clientWidth) return;
  const left = chip.offsetLeft - (container.clientWidth - chip.offsetWidth) / 2;
  container.scrollTo({ left, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
}

function renderChips(container, chips, state, drawn) {
  for (const [id, chip] of chips) {
    if (drawn.lang !== state.lang) chip.textContent = getCategory(id).name[state.lang];
    const checked = id === state.category;
    chip.setAttribute('aria-checked', String(checked));
    chip.tabIndex = checked ? 0 : -1;
  }
  if (drawn.category !== state.category) revealChip(container, chips.get(state.category), drawn.category !== null);
}

function renderQuery(refs, state, preview) {
  const status = queryStatus(refs.queryInput.value, preview, state);
  const glyph = STATUS_ICONS[status.kind];
  refs.queryStatus.className = `query-status is-${status.kind}`;
  refs.queryStatus.replaceChildren(...(glyph ? [icon(glyph)] : []), h('span', { text: status.text }));
  refs.queryInput.setAttribute('aria-invalid', String(status.kind === 'error'));
}

function renderSide(parts, side, state, row, rebuildOptions) {
  if (rebuildOptions) {
    const options = getCategory(state.category).units.map((unit) =>
      h('option', { value: unit.id, text: unitLabel(unit, state.lang) }),
    );
    parts.unit.replaceChildren(...options);
  }
  parts.unit.value = state[side];
  const text = side === 'from' ? state.fromText : state.toText;
  if (parts.input.value !== text) parts.input.value = text;
  const invalid = state.inputError !== null && state.active === side;
  parts.input.setAttribute('aria-invalid', String(invalid));
  parts.error.hidden = !invalid;
  parts.error.textContent = invalid ? t(state.lang, `error.${state.inputError}`) : '';
  parts.copy.disabled = row.copyText === '';
  parts.copy.setAttribute('aria-label', copyLabel(row, state.lang));
}

function renderConverter(refs, state, table, drawn) {
  refs.categoryTitle.textContent = getCategory(state.category).name[state.lang];
  refs.formula.textContent = formulaLabel(state);
  const starLabel = t(state.lang, state.favorite ? 'favoriteRemove' : 'favoriteAdd');
  refs.star.setAttribute('aria-pressed', String(state.favorite));
  refs.star.setAttribute('aria-label', starLabel);
  refs.star.setAttribute('title', starLabel);
  const unitsKey = `${state.category}|${state.lang}`;
  const rows = { from: table.find((row) => row.isFrom), to: table.find((row) => row.isTo) };
  for (const side of SIDES) renderSide(refs[side], side, state, rows[side], drawn.units !== unitsKey);
  drawn.units = unitsKey;
}

function favoriteButton(pair, index, lang) {
  const symbols = pairSymbols(pair);
  return h(
    'button',
    { type: 'button', class: 'fav', 'data-index': index, title: pairTitle(pair, lang) },
    icon('star'),
    h('span', { text: symbols.from }),
    h('span', { class: 'arrow', text: '→' }),
    h('span', { text: symbols.to }),
  );
}

function renderFavorites(refs, state, drawn) {
  const key = JSON.stringify([state.lang, state.favorites]);
  if (drawn.favorites !== key) {
    drawn.favorites = key;
    const items = state.favorites.map((pair, index) => favoriteButton(pair, index, state.lang));
    refs.favorites.replaceChildren(
      ...(items.length > 0 ? items : [h('p', { class: 'empty', text: t(state.lang, 'favoritesEmpty') })]),
    );
  }
  for (const button of refs.favorites.querySelectorAll('[data-index]')) {
    const pair = state.favorites[Number(button.getAttribute('data-index'))];
    button.setAttribute('aria-current', String(samePair(pair, state)));
  }
}

function recentItem(entry, index, lang) {
  const quantities = recentQuantities(entry, lang);
  const button = h(
    'button',
    { type: 'button', class: 'recent', 'data-index': index, title: pairTitle(entry, lang) },
    h('span', { class: 'recent-from', text: quantities.from }),
    h('span', { class: 'arrow', text: '→' }),
    h('span', { class: 'recent-to', text: quantities.to }),
  );
  return h('li', {}, button);
}

function renderRecents(refs, state, drawn) {
  const key = JSON.stringify([state.lang, state.recents]);
  if (drawn.recents === key) return;
  drawn.recents = key;
  refs.clearRecents.hidden = state.recents.length === 0;
  const items = state.recents.map((entry, index) => recentItem(entry, index, state.lang));
  refs.recents.replaceChildren(
    ...(items.length > 0 ? items : [h('li', { class: 'empty', text: t(state.lang, 'recentsEmpty') })]),
  );
}

function buildRow(row, lang) {
  const name = h(
    'button',
    { type: 'button', class: 'unit-name', 'data-unit': row.id, 'aria-label': t(lang, 'useAsTarget', { unit: row.name }) },
    h('span', { class: 'name', text: row.name }),
    h('span', { class: 'sym', text: row.symbol }),
    h('span', { class: 'tag tag-from', text: t(lang, 'from'), hidden: true }),
    h('span', { class: 'tag tag-to', text: t(lang, 'to'), hidden: true }),
  );
  const copy = h('button', { type: 'button', class: 'icon-btn copy-btn', 'data-copy': row.id, title: t(lang, 'copy') }, icon('copy'));
  return h('tr', {}, h('th', { scope: 'row' }, name), h('td', { class: 'num' }), h('td', { class: 'copy-cell' }, copy));
}

function updateRow(tableRow, row, lang) {
  tableRow.classList.toggle('is-from', row.isFrom);
  tableRow.classList.toggle('is-to', row.isTo);
  tableRow.querySelector('.tag-from').hidden = !row.isFrom;
  tableRow.querySelector('.tag-to').hidden = !row.isTo;
  tableRow.cells[1].textContent = row.text;
  const copy = tableRow.querySelector('.copy-btn');
  copy.disabled = row.copyText === '';
  copy.setAttribute('aria-label', copyLabel(row, lang));
}

function renderTable(refs, state, table, drawn) {
  refs.tableWrap.hidden = !state.tableOpen;
  refs.tableToggle.setAttribute('aria-expanded', String(state.tableOpen));
  refs.tableToggleText.textContent = t(state.lang, state.tableOpen ? 'tableHide' : 'tableShow');
  const key = `${state.category}|${state.lang}`;
  if (drawn.rows !== key) {
    drawn.rows = key;
    refs.tableBody.replaceChildren(...table.map((row) => buildRow(row, state.lang)));
  }
  table.forEach((row, index) => updateRow(refs.tableBody.rows[index], row, state.lang));
}

/**
 * Connects to the page skeleton: fills in the icons, builds the category chips
 * and returns the drawing functions.
 * @returns {{refs: object, render: Function, focusChip: Function, spinSwap: Function, showToast: Function}}
 */
export function createView() {
  fillIcons(document.body);
  const refs = findRefs();
  const chips = buildChips(refs.chips);
  const drawn = { lang: null, category: null, units: null, favorites: null, recents: null, rows: null };
  let swapTurns = 0;
  let toastTimer = 0;

  /**
   * Brings the page in line with the model.
   * @param {object} state model.getState()
   * @param {object[]} table model.getTable()
   * @param {object} preview model.previewQuery() of the smart input's current text
   */
  function render(state, table, preview) {
    if (drawn.lang !== state.lang) renderStrings(refs, state.lang);
    renderChips(refs.chips, chips, state, drawn);
    renderQuery(refs, state, preview);
    renderConverter(refs, state, table, drawn);
    renderFavorites(refs, state, drawn);
    renderRecents(refs, state, drawn);
    renderTable(refs, state, table, drawn);
    drawn.lang = state.lang;
    drawn.category = state.category;
  }

  /**
   * Moves keyboard focus to a category chip.
   * @param {string} id category id
   */
  function focusChip(id) {
    chips.get(id)?.focus();
  }

  /** Turns the swap arrows half a turn. */
  function spinSwap() {
    swapTurns += 1;
    refs.swap.style.setProperty('--turns', `${swapTurns * 180}deg`);
  }

  /**
   * Shows a short message at the bottom of the screen; screen readers hear it too.
   * @param {string} text
   * @param {boolean} ok false styles it as a failure
   */
  function showToast(text, ok) {
    refs.toast.replaceChildren(icon(ok ? 'check' : 'alert'), h('span', { text }));
    refs.toast.classList.toggle('is-error', !ok);
    refs.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => refs.toast.classList.remove('is-visible'), TOAST_MS);
  }

  return { refs, render, focusChip, spinSwap, showToast };
}
