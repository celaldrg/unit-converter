/**
 * Clipboard writes, with a fallback for browsers without the async Clipboard API.
 */

/**
 * Copies text to the clipboard.
 * @param {string} text
 * @returns {Promise<boolean>} whether the text was copied
 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyThroughSelection(text);
  }
}

/** Older browsers: select the text in a hidden text area and run the copy command. */
function copyThroughSelection(text) {
  const focused = document.activeElement;
  const buffer = document.createElement('textarea');
  buffer.value = text;
  buffer.setAttribute('readonly', '');
  buffer.className = 'clipboard-buffer';
  document.body.append(buffer);
  buffer.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  buffer.remove();
  if (focused instanceof HTMLElement) focused.focus();
  return copied;
}
