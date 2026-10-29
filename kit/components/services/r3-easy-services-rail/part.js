// Бирка услуги → в заявку: событие vf:book с текстом услуги
VFKit.register('r3-easy-services-rail', root => {
  root.querySelectorAll('[data-symptom]').forEach(btn => btn.addEventListener('click', () => {
    btn.classList.remove('is-taken'); void btn.offsetWidth; btn.classList.add('is-taken');
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: { from: 'r3-easy-services-rail', symptom: btn.dataset.symptom } }));
  }));
});
