/**
 * Tiny DOM builders. Text always goes in through textContent or attributes,
 * never through HTML parsing.
 */
import { ICONS } from './icons.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Creates an HTML element.
 * @param {string} tag
 * @param {Record<string, string|number|boolean|null|undefined>} [attributes] `text` sets the
 *   text content; false, null and undefined are skipped and true sets an empty attribute
 * @param {...(Node|string)} children
 * @returns {HTMLElement}
 */
export function h(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === false || value === null || value === undefined) continue;
    if (name === 'text') node.textContent = String(value);
    else node.setAttribute(name, value === true ? '' : String(value));
  }
  node.append(...children);
  return node;
}

/**
 * Creates an inline SVG icon from ICONS, hidden from assistive technology.
 * @param {string} name a key of ICONS
 * @returns {SVGSVGElement}
 */
export function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `icon icon-${name}`);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const outline of ICONS[name]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', outline);
    svg.append(path);
  }
  return svg;
}

/**
 * Replaces every [data-icon] placeholder inside `root` with its icon.
 * @param {ParentNode} root
 */
export function fillIcons(root) {
  for (const slot of root.querySelectorAll('[data-icon]')) slot.replaceWith(icon(slot.getAttribute('data-icon')));
}
