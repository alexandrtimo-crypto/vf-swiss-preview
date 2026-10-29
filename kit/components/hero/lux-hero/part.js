// Первый экран: прокрутка (sticky) сжимает видео в арочное окно, по бокам проступает заголовок.
// Сообщает шапке, что первый экран пройден: событие vf:hero { over }.
VFKit.register('lux-hero', root => {
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('is-js');
  if (motion) root.classList.add('is-motion');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const pin = root.querySelector('.hero__pin'), win = root.querySelector('.hero__win'), video = root.querySelector('.hero__video');
  let vw = innerWidth, vh = innerHeight, W = 0, H = 0, over = null, ticking = false;

  if (!motion) { video.removeAttribute('autoplay'); video.pause(); }

  function measure() {
    vw = innerWidth; vh = innerHeight;
    if (vw >= 700) { W = Math.min(vw * .3, vh * .48); H = Math.min(vh * .72, W * 1.55); }
    else { W = vw * .7; H = Math.min(vh * .48, W * 1.42); }
    pin.style.setProperty('--W', W + 'px');
    pin.style.setProperty('--H', H + 'px');
    over = null; // заново сообщить состояние
    update();
  }

  function update() {
    ticking = false;
    const hr = root.getBoundingClientRect();
    let on;
    if (motion) {
      const p = clamp(-hr.top / Math.max(1, hr.height - vh));
      const e = ease(clamp(p / .72));
      const t = lerp(0, (vh - H) / 2, e), s = lerp(0, (vw - W) / 2, e);
      const rt = lerp(0, W / 2, e), rb = lerp(0, 2, e);
      win.style.clipPath = `inset(${t}px ${s}px ${t}px ${s}px round ${rt}px ${rt}px ${rb}px ${rb}px)`;
      video.style.transform = `scale(${lerp(1.06, 1.1, e)})`;
      pin.style.setProperty('--room', e.toFixed(3));
      pin.style.setProperty('--c-o', (1 - clamp(p / .26)).toFixed(3));
      pin.style.setProperty('--c-y', (-p * 140).toFixed(1) + 'px');
      pin.style.setProperty('--c-s', (1 - p * .12).toFixed(3));
      const fl = ease(clamp((p - .42) / .4));
      pin.style.setProperty('--fl-o', fl.toFixed(3));
      pin.style.setProperty('--fl-x', ((1 - fl) * 60).toFixed(1) + 'px');
      pin.style.setProperty('--cue', (1 - clamp(p / .08)).toFixed(3));
      on = p > .92 || hr.bottom < vh * .5;
    } else {
      on = hr.bottom < vh * .6;
    }
    if (on !== over) {
      over = on;
      document.dispatchEvent(new CustomEvent('vf:hero', { detail: { over: on } }));
    }
  }

  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  measure();

  // видео играет только в кадре
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && motion) video.play().catch(() => {});
      else video.pause();
    }, { threshold: .15 }).observe(video);
  }
});
