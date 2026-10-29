// easy-works: кружки-сторис и видео-окно. Нажатие шлёт vf:story { group };
// если просмотрщика сторис на странице нет — кружок ведёт на файл (обычная ссылка).
VFKit.register('easy-works', root => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rings = [...root.querySelectorAll('.ring')];
  root.querySelectorAll('[data-story]').forEach(a => a.addEventListener('click', e => {
    const ev = new CustomEvent('vf:story', { cancelable: true, detail: { group: +a.dataset.story } });
    document.dispatchEvent(ev);
    if (ev.defaultPrevented) e.preventDefault();
  }));
  // просмотрщик сообщает, какие истории уже показаны
  const onSeen = e => { const r = rings[e.detail && e.detail.group]; if (r) r.classList.add('seen'); };
  document.addEventListener('vf:story-seen', onSeen);
  // видео-окно играет только на экране
  const hv = root.querySelector('.window video');
  if (hv && !RM && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { if (en.isIntersecting) { hv.preload = 'auto'; hv.play().catch(() => {}); } else hv.pause(); }, { threshold: .3 }).observe(hv);
  }
});
