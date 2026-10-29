VFKit.register('r3-tech-header', root => {
  root.querySelector('.r3h__book')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: {} }));
  });
});
