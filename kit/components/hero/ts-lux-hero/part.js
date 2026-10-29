VFKit.register('ts-lux-hero', root => {
  root.classList.add('is-js');
  const v = root.querySelector('video');
  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  if (v) {
    if (rm.matches) { v.removeAttribute('autoplay'); v.pause(); }
    else { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    document.addEventListener('visibilitychange', () => { if (rm.matches) return; document.hidden ? v.pause() : v.play().catch(() => {}); });
  }
  root.querySelector('[data-book]')?.addEventListener('click', e => {
    const ev = new CustomEvent('vf:book', { detail: {}, cancelable: true });
    document.dispatchEvent(ev);
    if (ev.defaultPrevented) e.preventDefault();
  });
});
