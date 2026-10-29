// Остановки печатаются по очереди, когда путь попадает в экран. Без JS и при reduced-motion всё видно сразу.
VFKit.register('r3-easy-process-card', root => {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tag = root.querySelector('.r3pc__tag');
  root.classList.add('is-armed');
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    root.classList.add('is-run'); io.disconnect();
  }, { threshold: 0.2 });
  io.observe(tag);
});
