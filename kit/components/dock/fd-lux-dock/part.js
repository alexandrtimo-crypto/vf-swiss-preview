VFKit.register('fd-lux-dock', root => {
  root.querySelector('[data-book]').addEventListener('click', e => {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: {} }));
  });
});
