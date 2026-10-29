VFKit.register('pm-lux-process', root => {
  root.querySelectorAll('[data-book]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('vf:book', { detail: { symptom: 'Диагностика' }, cancelable: true }));
  }));
  const steps = [...root.querySelectorAll('.pm-lux-process__steps li')];
  const imgs = [...root.querySelectorAll('.pm-lux-process__frame img')];
  const count = root.querySelector('[data-count]');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { root.classList.add('is-static'); }
  if (!('IntersectionObserver' in window)) return;
  const set = i => {
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    imgs.forEach((m, k) => m.classList.toggle('is-on', k === i));
    if (count) count.textContent = String(i + 1).padStart(2, '0');
  };
  set(0);
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) set(steps.indexOf(en.target)); }), { rootMargin: '-40% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));
});
