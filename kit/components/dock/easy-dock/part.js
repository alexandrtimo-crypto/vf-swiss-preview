// easy-dock: «Записаться» шлёт vf:book; панель уезжает, пока открыто окно поверх страницы (vf:overlay)
VFKit.register('easy-dock', root => {
  root.querySelector('[data-book]').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: { from: 'dock' } }));
  });
  const sync = () => root.classList.toggle('is-away', !!document.body.dataset.vfModals);
  document.addEventListener('vf:overlay', sync);
  sync();
});
