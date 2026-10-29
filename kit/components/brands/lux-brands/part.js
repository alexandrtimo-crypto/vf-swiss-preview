// Бренды: бегущие строки (только при разрешённом движении) и кнопка паузы.
VFKit.register('lux-brands', root => {
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('is-js');
  if (motion) root.classList.add('is-motion');
  const btn = root.querySelector('.houses__pause');
  btn.addEventListener('click', () => {
    const p = root.classList.toggle('is-paused');
    btn.setAttribute('aria-pressed', p);
    btn.textContent = p ? 'Продолжить строку' : 'Остановить строку';
  });
});
