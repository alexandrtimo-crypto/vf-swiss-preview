// Сертификат-предмет: наклон в 3D за курсором, пальцем или гироскопом; блик следует за наклоном.
VFKit.register('lux-warranty', root => {
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('is-js');
  if (motion) root.classList.add('is-motion');
  if (!motion) return;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const cert = root.querySelector('.cert');
  function tilt(nx, ny) {
    cert.style.setProperty('--ry', (nx * 18).toFixed(2) + 'deg');
    cert.style.setProperty('--rx', (-ny * 14).toFixed(2) + 'deg');
    cert.style.setProperty('--mx', (50 + nx * 90).toFixed(1) + '%');
    cert.style.setProperty('--my', (50 + ny * 90).toFixed(1) + '%');
  }
  root.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' && !e.target.closest('.cert')) return;
    const r = cert.getBoundingClientRect();
    tilt(clamp((e.clientX - r.left - r.width / 2) / r.width, -.8, .8), clamp((e.clientY - r.top - r.height / 2) / r.height, -.8, .8));
  });
  root.addEventListener('pointerleave', () => tilt(0, 0));
  cert.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') setTimeout(() => tilt(0, 0), 900); });
  let inView = false;
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { inView = en.isIntersecting; }).observe(root);
  addEventListener('deviceorientation', e => {
    if (!inView || e.gamma == null || e.beta == null) return;
    tilt(clamp(e.gamma / 35, -.7, .7), clamp((e.beta - 50) / 35, -.7, .7));
  });
});
