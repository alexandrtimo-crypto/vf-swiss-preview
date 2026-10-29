VFKit.register('pm-lux-header', root => {
  root.querySelectorAll('[data-book]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('vf:book', { detail: {}, cancelable: true }));
  }));
  // Текущая глава подсвечивается в навигации (nav-state-active)
  const links = [...root.querySelectorAll('.pm-lux-header__nav a')];
  const targets = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (!('IntersectionObserver' in window) || !targets.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id)));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  targets.forEach(t => io.observe(t));
});
