VFKit.register('r3-tech-process', root => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 900px) and (min-height: 600px)');
  const pin = root.querySelector('.r3pr__pin');
  const track = root.querySelector('.r3pr__track');
  const hh = () => parseFloat(getComputedStyle(root).getPropertyValue('--hh')) || 64;
  let shift = 0, raf = 0;
  // Закреплённая лента: вертикальная прокрутка двигает фюзеляж вбок
  function setup() {
    const on = wide.matches && !reduce.matches;
    root.classList.toggle('is-pinned', on);
    if (!on) { root.style.height = ''; root.style.setProperty('--x', '0px'); return; }
    shift = Math.max(0, track.scrollWidth - pin.clientWidth);
    root.style.height = `${pin.offsetHeight + shift}px`;
    update();
  }
  function update() {
    raf = 0;
    if (!root.classList.contains('is-pinned')) return;
    const top = root.getBoundingClientRect().top - hh();
    root.style.setProperty('--x', `${Math.min(shift, Math.max(0, -top)).toFixed(1)}px`);
  }
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  addEventListener('resize', setup);
  reduce.addEventListener?.('change', setup);
  root.querySelectorAll('img').forEach(img => img.complete || img.addEventListener('load', setup, { once: true }));
  setup();
  root.querySelector('.r3pr__book').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: {} }));
  });
});
