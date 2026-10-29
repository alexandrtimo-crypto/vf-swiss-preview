VFKit.register('fd-lux-services', root => {
  root.querySelectorAll('[data-symptom]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: { symptom: a.dataset.symptom } }));
  }));
});
