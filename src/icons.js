/**
 * Icon outlines on a 24 × 24 grid, drawn with round 2 px strokes
 * (see .icon in style.css). Each icon is a list of SVG path strings.
 */
const paths = (...list) => Object.freeze(list);

export const ICONS = Object.freeze({
  copy: paths(
    'M10 8h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z',
    'M16 4.6V4a1 1 0 0 0-1-1H5a2 2 0 0 0-2 2v10a1 1 0 0 0 1 1h.6',
  ),
  swap: paths('M4 8h15', 'M15 4l4 4-4 4', 'M20 16H5', 'M9 12l-4 4 4 4'),
  sign: paths('M12 3.5v12', 'M6 9.5h12', 'M6 20h12'),
  star: paths('M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z'),
  reset: paths('M3.5 12a8.5 8.5 0 1 0 2.5-6', 'M3.5 3.5V8.5h5'),
  search: paths('M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20.5 20.5l-5-5'),
  arrow: paths('M5 12h14', 'M13 6l6 6-6 6'),
  alert: paths('M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z', 'M12 8v4.5', 'M12 16h.01'),
  check: paths('M5 12.5l4.5 4.5L19 7.5'),
  chevron: paths('M6 9l6 6 6-6'),
});
