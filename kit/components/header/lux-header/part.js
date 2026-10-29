// Шапка: прячется на первом экране. Сигнал даёт первый экран событием vf:hero { over };
// если такого первого экрана нет — появляется после прокрутки на 60% высоты окна.
VFKit.register('lux-header', root => {
  const bar = root.querySelector('.bar');
  bar.style.transition = 'none';
  root.classList.add('is-js');
  void bar.offsetWidth;
  bar.style.transition = '';

  let driven = false;
  const set = on => bar.classList.toggle('is-on', !!on);
  document.addEventListener('vf:hero', e => { driven = true; set(e.detail && e.detail.over); });
  const fallback = () => { if (!driven) set(scrollY > innerHeight * .6); };
  addEventListener('scroll', fallback, { passive: true });
  fallback();

  root.querySelectorAll('[data-book]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: { from: 'lux-header', focus: a.dataset.book === 'focus' } }));
  }));
});
