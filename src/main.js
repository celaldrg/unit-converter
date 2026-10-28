/**
 * Entry point: creates the converter model, wires every control to it and
 * stores the session through storage.js. "?demo" opens a fixed showcase state
 * (used for the README screenshot) and leaves the saved session alone.
 */
import { createConverter, createDemoConverter } from './model.js';
import { nextLanguage, t } from './i18n.js';
import { load, save } from './storage.js';
import { adjacentCategory, chipKeyTarget, shortcutAction } from './shortcuts.js';
import { copyText } from './clipboard.js';
import { enableDragScroll } from './dragscroll.js';
import { createView } from './view.js';

const STATE_KEY = 'state';
const demo = new URLSearchParams(window.location.search).has('demo');
const model = demo ? createDemoConverter() : createConverter(load(STATE_KEY, {}));
const view = createView();
const { refs } = view;

/** Redraws the page from the model and stores the session (never in demo mode). */
function update() {
  view.render(model.getState(), model.getTable(), model.previewQuery(refs.queryInput.value));
  if (!demo) save(STATE_KEY, model.getSnapshot());
}

/** Runs a model action, then redraws. */
function run(action) {
  action();
  update();
}

async function copyValue(text) {
  if (!text) return;
  const copied = await copyText(text);
  view.showToast(t(model.getState().lang, copied ? 'copied' : 'copyFailed'), copied);
}

/** The plain number shown on one side of the converter, ready for the clipboard. */
function sideCopyText(side) {
  const row = model.getTable().find((entry) => (side === 'from' ? entry.isFrom : entry.isTo));
  return row ? row.copyText : '';
}

function selectCategory(id, focusChip) {
  run(() => model.setCategory(id));
  if (focusChip) view.focusChip(id);
}

function wireChips() {
  refs.chips.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-category]');
    if (chip) selectCategory(chip.getAttribute('data-category'), false);
  });
  refs.chips.addEventListener('keydown', (event) => {
    const target = chipKeyTarget(event.key, model.getState().category);
    if (!target) return;
    event.preventDefault();
    selectCategory(target, true);
  });
  enableDragScroll(refs.chips);
}

function wireSide(side) {
  const { input, unit, sign, copy } = refs[side];
  input.addEventListener('input', () => run(() => model.setText(side, input.value)));
  input.addEventListener('change', () => run(() => model.commitRecent()));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') run(() => model.commitRecent());
  });
  unit.addEventListener('change', () => run(() => model.setUnit(side, unit.value)));
  // A mouse or touch press on ± leaves the caret in the field, so typing can go on.
  sign.addEventListener('mousedown', (event) => event.preventDefault());
  sign.addEventListener('click', () => run(() => model.negate(side)));
  copy.addEventListener('click', () => {
    run(() => model.commitRecent());
    copyValue(sideCopyText(side));
  });
}

function wireConverter() {
  wireSide('from');
  wireSide('to');
  refs.swap.addEventListener('click', () => {
    view.spinSwap();
    run(() => model.swap());
  });
  refs.star.addEventListener('click', () => run(() => model.toggleFavorite()));
}

function wireQuery() {
  refs.queryForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const state = model.applyQuery(refs.queryInput.value);
    if (state.queryResult?.ok) {
      model.commitRecent();
      // On phones, close the keyboard so the converted numbers come into view.
      if (window.matchMedia('(pointer: coarse)').matches) refs.queryInput.blur();
    }
    update();
  });
  refs.queryInput.addEventListener('input', update);
  refs.queryInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || refs.queryInput.value === '') return;
    refs.queryInput.value = '';
    run(() => model.applyQuery(''));
  });
}

/** Clicking an entry of the favorites or recents list opens that conversion. */
function wireList(list, field) {
  list.addEventListener('click', (event) => {
    const item = event.target.closest('[data-index]');
    if (item) run(() => model.usePair(model.getState()[field][Number(item.getAttribute('data-index'))]));
  });
}

function wireLists() {
  wireList(refs.favorites, 'favorites');
  wireList(refs.recents, 'recents');
  refs.clearRecents.addEventListener('click', () => {
    run(() => model.clearRecents());
    refs.recentsTitle.focus(); // the Clear button hides itself
  });
}

function wireTable() {
  refs.tableToggle.addEventListener('click', () => run(() => model.toggleTable()));
  refs.tableBody.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const unit = button.getAttribute('data-unit');
    // "Convert to" the unit already on the "from" side means turning the pair around.
    if (unit && unit === model.getState().from) refs.swap.click();
    else if (unit) run(() => model.setUnit('to', unit));
    else copyValue(model.getTable().find((row) => row.id === button.getAttribute('data-copy'))?.copyText);
  });
}

function wireHeader() {
  refs.reset.addEventListener('click', () => {
    refs.queryInput.value = '';
    run(() => model.reset());
  });
  refs.lang.addEventListener('click', () => run(() => model.setLang(nextLanguage(model.getState().lang))));
}

function focusQuery() {
  refs.queryInput.focus();
  refs.queryInput.select();
}

const SHORTCUT_RUNNERS = Object.freeze({
  focusQuery,
  swap: () => refs.swap.click(),
  favorite: () => run(() => model.toggleFavorite()),
  toggleTable: () => run(() => model.toggleTable()),
  previousCategory: () => stepCategory(-1),
  nextCategory: () => stepCategory(1),
});

function stepCategory(step) {
  const inChips = refs.chips.contains(document.activeElement);
  selectCategory(adjacentCategory(model.getState().category, step), inChips);
}

function wireShortcuts() {
  document.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const typing = Boolean(target?.closest('input, select, textarea, [contenteditable="true"]'));
    const press = {
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      altGraph: event.getModifierState('AltGraph'),
      repeat: event.repeat,
    };
    const action = shortcutAction(press, typing);
    if (!action) return;
    event.preventDefault();
    SHORTCUT_RUNNERS[action]();
  });
}

refs.queryInput.value = model.getState().query;
wireChips();
wireConverter();
wireQuery();
wireLists();
wireTable();
wireHeader();
wireShortcuts();
update();
