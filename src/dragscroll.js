/**
 * Lets a mouse drag a sideways scroller, such as the category chips in a
 * narrow window. Touch and pen already scroll it natively. A real drag
 * swallows the click that ends it, so the chip under the pointer is not picked.
 */
const DRAG_THRESHOLD = 6; // px a press may wobble and still count as a click

/**
 * Turns on mouse drag scrolling for an element with overflow-x: auto.
 * @param {HTMLElement} scroller
 */
export function enableDragScroll(scroller) {
  let drag = null;
  let dragged = false;

  const stop = () => {
    drag = null;
    scroller.classList.remove('is-dragging');
  };

  scroller.addEventListener('pointerdown', (event) => {
    dragged = false;
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    if (scroller.scrollWidth <= scroller.clientWidth) return;
    drag = { id: event.pointerId, x: event.clientX, left: scroller.scrollLeft };
  });

  scroller.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (event.buttons === 0) {
      stop();
      return;
    }
    const distance = event.clientX - drag.x;
    if (!dragged && Math.abs(distance) < DRAG_THRESHOLD) return;
    if (!dragged) {
      dragged = true;
      scroller.setPointerCapture(event.pointerId);
      scroller.classList.add('is-dragging');
    }
    scroller.scrollLeft = drag.left - distance;
  });

  scroller.addEventListener('pointerup', stop);
  scroller.addEventListener('pointercancel', stop);
  scroller.addEventListener('lostpointercapture', stop);

  scroller.addEventListener(
    'click',
    (event) => {
      if (!dragged || event.detail === 0) return; // detail 0: a keyboard click
      dragged = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );
}
