'use strict';
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-copy-link]');
  if (!button) return;
  const output = button.parentElement.querySelector('.copy-link-result');
  const url = window.location.href.split('#')[0];
  try {
    if (!navigator.clipboard || !window.isSecureContext) throw Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url);
    output.textContent = 'Link copied.';
  } catch (_) {
    output.textContent = 'Select and copy the link shown below.';
    const input = document.createElement('input');
    input.type = 'text';
    input.readOnly = true;
    input.value = url;
    input.setAttribute('aria-label', 'Publication link');
    input.className = 'copy-link-fallback';
    output.replaceChildren('Copy this link: ', input);
    input.focus();
    input.select();
  }
});
