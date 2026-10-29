VFKit.register('pm-lux-hero', root => {
  root.querySelectorAll('[data-book]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('vf:book', { detail: {}, cancelable: true }));
  }));
});
