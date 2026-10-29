// Нижняя панель (телефон): «Заявка» → событие vf:book
VFKit.register('tech-dock', root => {
  root.querySelectorAll('[data-book]').forEach(a => a.addEventListener('click', e => {
    document.dispatchEvent(new CustomEvent('vf:book', { detail: {}, cancelable: true }));
    if (document.querySelector('[data-slot="booking"]')) e.preventDefault();
  }));
});
