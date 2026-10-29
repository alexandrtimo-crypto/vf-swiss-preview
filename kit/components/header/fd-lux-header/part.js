VFKit.register('fd-lux-header', root => {
  root.querySelectorAll('[data-book]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: {} }));
  }));
});
