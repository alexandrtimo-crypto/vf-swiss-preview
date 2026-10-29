VFKit.register('r3-easy-brands', root => {
  root.querySelector('.r3br__ask').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: { from: 'r3-easy-brands', symptom: 'Вопрос про марку часов' } }));
  });
});
