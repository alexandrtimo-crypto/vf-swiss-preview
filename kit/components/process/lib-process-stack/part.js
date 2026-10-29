// Источник: ScrollStack (React Bits, MIT + Commons Clause) — переписано на vanilla: нативный скролл, sticky + масштаб/затемнение предыдущих листов, без Lenis.
VFKit.register('lib-process-stack', root => {
  const sheets = [...root.querySelectorAll('.lps__sheet')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const n = sheets.length;
  let raf = 0, visible = true;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function update() {
    raf = 0;
    if (reduce.matches) { sheets.forEach(s => { s.style.transform = ''; s.querySelector('.lps__shade').style.setProperty('--dim', 0); }); return; }
    // прогресс перекрытия каждого листа следующим: 0 — следующий ещё внизу, 1 — лёг на место
    for (let i = 0; i < n - 1; i++) {
      const cur = sheets[i], nxt = sheets[i + 1];
      const h = cur.offsetHeight || 1;
      const stickTop = parseFloat(getComputedStyle(nxt).top) || 0;
      const p = clamp(1 - (nxt.getBoundingClientRect().top - stickTop) / h, 0, 1);
      cur.__p = p;
    }
    for (let i = 0; i < n; i++) {
      let buried = 0;
      for (let j = i; j < n - 1; j++) buried += sheets[j].__p || 0;
      sheets[i].style.transform = buried ? `scale(${(1 - buried * .035).toFixed(4)})` : '';
      sheets[i].querySelector('.lps__shade').style.setProperty('--dim', Math.min(.45, buried * .16).toFixed(3));
    }
  }
  const req = () => { if (!raf && visible) raf = requestAnimationFrame(update); };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req);
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { visible = en.isIntersecting; req(); }, { rootMargin: '200px' }).observe(root);
  update();
  if (window.VFMotion) VFMotion.scan(root);
});
