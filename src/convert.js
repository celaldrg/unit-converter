/**
 * Conversion engine: moves numbers between units of one category through the
 * category's base unit.
 */
import { getCategory, getUnit } from './units.js';

function requireUnit(categoryId, unitId) {
  const unit = getUnit(categoryId, unitId);
  if (!unit) throw new RangeError(`Unknown unit "${unitId}" in category "${categoryId}"`);
  return unit;
}

function toBase(value, unit) {
  return unit.toBase ? unit.toBase(value) : value * unit.factor;
}

function fromBase(value, unit) {
  return unit.fromBase ? unit.fromBase(value) : value / unit.factor;
}

/**
 * Converts a value between two units of the same category.
 * @param {number} value amount in the `fromId` unit
 * @param {string} categoryId e.g. "length"
 * @param {string} fromId source unit id, e.g. "mi"
 * @param {string} toId target unit id, e.g. "km"
 * @returns {number} amount in the `toId` unit
 * @throws {RangeError} when the category or a unit is unknown
 */
export function convert(value, categoryId, fromId, toId) {
  const from = requireUnit(categoryId, fromId);
  const to = requireUnit(categoryId, toId);
  if (from === to) return value;
  if (from.factor !== undefined && to.factor !== undefined) return (value * from.factor) / to.factor;
  return fromBase(toBase(value, from), to);
}

/**
 * Converts a value into every unit of its category, in display order.
 * @param {number} value amount in the `fromId` unit
 * @param {string} categoryId
 * @param {string} fromId
 * @returns {{id: string, value: number}[]}
 * @throws {RangeError} when the category or the unit is unknown
 */
export function convertAll(value, categoryId, fromId) {
  requireUnit(categoryId, fromId);
  return getCategory(categoryId).units.map((unit) => ({
    id: unit.id,
    value: convert(value, categoryId, fromId, unit.id),
  }));
}
