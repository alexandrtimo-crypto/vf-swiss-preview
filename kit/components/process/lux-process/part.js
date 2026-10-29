// Мастерство: по мере прокрутки фраз кадры сменяются круглой маской, справа — шкала «запаса хода».
VFKit.register('lux-process', root => {
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('is-js');
  if (motion) root.classList.add('is-motion');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const imgs = Array.from(root.querySelectorAll('.craft__img'));
  const lines = Array.from(root.querySelectorAll('.craft__line'));
  const stage = root.querySelector('.craft__reserve');
  let lastActive = -1, ticking = false;

  function update() {
    ticking = false;
    const vh = innerHeight, cr = root.getBoundingClientRect();
    if (cr.top < vh && cr.bottom > 0) {
      let active = -1;
      lines.forEach((l, i) => { if (l.getBoundingClientRect().top < vh * .62) active = i; });
      active = Math.max(0, active);
      if (active !== lastActive) {
        imgs.forEach((img, i) => img.classList.toggle('is-on', i <= active));
        lastActive = active;
      }
      stage.style.setProperty('--cp', clamp(-cr.top / Math.max(1, cr.height - vh)).toFixed(4));
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  addEventListener('load', update);
  update();
});
