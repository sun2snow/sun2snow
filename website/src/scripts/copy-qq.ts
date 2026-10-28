export {};

const button = document.querySelector<HTMLButtonElement>('[data-copy-qq]');
const status = document.querySelector<HTMLElement>('#qq-copy-status');
const number = document.querySelector<HTMLElement>('#qq-number');

// HTTP/older-browser fallback. Never claim success unless the copy command succeeds.
function legacyCopy(value: string): boolean {
  const field = document.createElement('textarea');
  const previousFocus = document.activeElement;
  field.value = value;
  field.readOnly = true;
  field.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none;';
  document.body.append(field);
  try {
    field.focus();
    field.select();
    return document.execCommand('copy');
  } finally {
    field.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
  }
}

if (button && status && number) {
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  status.textContent = '';
  button.hidden = false;
  button.addEventListener('click', async () => {
    const value = button.dataset.copyQq;
    if (!value) return;
    clearTimeout(resetTimer);
    const restoreFocus = document.activeElement === button;
    button.disabled = true;
    status.textContent = '';
    try {
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else if (!legacyCopy(value)) {
        throw new Error('Clipboard unavailable');
      }
      button.textContent = 'Copied';
      resetTimer = setTimeout(() => { button.textContent = 'Copy'; }, 2000);
    } catch {
      button.textContent = 'Retry';
      status.textContent = 'Could not copy automatically. Select the QQ number and copy it manually.';
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(number);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } finally {
      button.disabled = false;
      if (restoreFocus && document.activeElement === document.body) button.focus({ preventScroll: true });
    }
  });
}
