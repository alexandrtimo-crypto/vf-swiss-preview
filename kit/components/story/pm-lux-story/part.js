VFKit.register('pm-lux-story', root => {
  root.querySelectorAll('[data-book]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('vf:book', { detail: { symptom: 'Диагностика' }, cancelable: true }));
  }));
});
