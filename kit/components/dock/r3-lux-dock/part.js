VFKit.register('r3-lux-dock', root => {
  root.querySelector('.r3lk__book').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: {} }));
  });
  // пока на экране полный бланк записи, док уходит вниз и не закрывает поля (на первом экране док виден всегда)
  if (!('IntersectionObserver' in window)) return;
  const seen = new Set();
  const io = new IntersectionObserver(list => {
    list.forEach(en => { if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target); });
    root.classList.toggle('is-away', seen.size > 0);
  }, { threshold: 0.35 });
  document.querySelectorAll('[data-slot="booking"] form').forEach(f => io.observe(f));
});
