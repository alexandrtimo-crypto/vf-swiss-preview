// Плавающая связь: закрывается после выбора; прячется по событию vf:dock { hide } (например, пока видна кнопка заявки).
VFKit.register('lux-dock', root => {
  root.classList.add('is-js');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('is-motion');
  root.querySelectorAll('.reach__menu a').forEach(a => a.addEventListener('click', () => { root.open = false; }));
  document.addEventListener('vf:dock', e => {
    const hide = !!(e.detail && e.detail.hide);
    root.classList.toggle('is-hidden', hide);
    if (hide) root.open = false;
  });
});
