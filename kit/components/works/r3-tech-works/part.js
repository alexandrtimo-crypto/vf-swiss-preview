VFKit.register('r3-tech-works', root => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const vids = [...root.querySelectorAll('video')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && !reduce.matches) e.target.play().catch(() => {}); else e.target.pause();
    }), { threshold: 0.35 });
    vids.forEach(v => io.observe(v));
  }
  const btns = [...root.querySelectorAll('.r3wk__open')];
  const items = btns.map(b => ({ type: b.dataset.type, src: b.dataset.src, alt: b.dataset.alt, poster: b.querySelector('video')?.getAttribute('poster') || '' }));
  btns.forEach((b, i) => b.addEventListener('click', () => {
    const ev = new CustomEvent('vf:view', { cancelable: true, detail: { items, index: i, opener: b } });
    document.dispatchEvent(ev);
    if (!ev.defaultPrevented) window.open(items[i].src, '_blank', 'noopener');
  }));
});
