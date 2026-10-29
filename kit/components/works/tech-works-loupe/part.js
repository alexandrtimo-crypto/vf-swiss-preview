/* «Под микроскопом»: световой стол со снимками, параллакс слоёв, круглая лупа ×2.6.
   По клику — событие vf:viewer { items:[{src,alt}], index } (его ловит оверлей-просмотрщик);
   если просмотрщика на странице нет — снимок открывается в новой вкладке. */
VFKit.register('tech-works-loupe', root => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const table = root.querySelector('.table'), loupe = root.querySelector('.loupe');
  const photos = [...root.querySelectorAll('.ph img')];
  const Z = 2.6, LR = 125;
  let hot = null;
  const hide = () => { if (hot) { hot.parentElement.classList.remove('hot'); hot = null; } loupe.classList.remove('on'); removeEventListener('scroll', hide); };
  function moveLoupe(e) {
    if (!hot) return;
    const r = hot.getBoundingClientRect(), rx = e.clientX - r.left, ry = e.clientY - r.top;
    loupe.style.left = e.clientX + 'px'; loupe.style.top = e.clientY + 'px';
    loupe.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`;
    loupe.style.backgroundPosition = `${-(rx * Z - LR)}px ${-(ry * Z - LR)}px`;
  }
  const items = photos.map(img => ({ src: img.dataset.full || img.currentSrc || img.src, alt: img.alt }));
  photos.forEach((img, i) => {
    img.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse') return;
      hot = img; loupe.style.backgroundImage = `url("${img.dataset.full}")`;
      loupe.classList.add('on'); img.parentElement.classList.add('hot'); moveLoupe(e);
      addEventListener('scroll', hide, { passive: true }); // глобальный слушатель живёт только пока лупа видна
    });
    img.addEventListener('pointermove', moveLoupe);
    img.addEventListener('pointerleave', hide);
    img.addEventListener('click', () => {
      const ev = new CustomEvent('vf:viewer', { detail: { items, index: i }, cancelable: true });
      document.dispatchEvent(ev);
      if (!ev.defaultPrevented) window.open(items[i].src, '_blank', 'noopener');
    });
  });

  // параллакс слоёв: только пока стол на экране
  let raf = 0;
  function frame() {
    const r = table.getBoundingClientRect();
    table.style.setProperty('--py', ((r.top + r.height / 2 - innerHeight / 2) * (innerWidth < 820 ? -.035 : -.12)).toFixed(1));
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (raf || RM) return; raf = requestAnimationFrame(frame); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? start() : stop())), { rootMargin: '80px' }).observe(table);
});
