// Ателье: на широком экране вертикальная прокрутка двигает ленту вбок (с параллаксом в кадрах),
// на телефоне и при reduced-motion — нативный свайп, стрелки и полоса прогресса.
VFKit.register('lux-story', root => {
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('is-js');
  if (motion) root.classList.add('is-motion');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const track = root.querySelector('.atelier__track');
  const frames = Array.from(track.querySelectorAll('.frame'));
  let vw = innerWidth, vh = innerHeight, pinH = false, trackW = 0, ticking = false;

  function measure() {
    vw = innerWidth; vh = innerHeight;
    pinH = motion && vw >= 900;
    root.classList.toggle('is-pin', pinH);
    if (pinH) {
      track.style.transform = '';
      trackW = frames.reduce((s, f) => s + f.offsetWidth, 0);
      root.style.height = (trackW - vw + vh) + 'px';
    } else {
      root.style.height = '';
      track.style.transform = '';
      frames.forEach(f => f.style.removeProperty('--fx'));
    }
    update();
  }

  function update() {
    ticking = false;
    if (!pinH) return;
    const r = root.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - vh));
    const x = p * (trackW - vw);
    track.style.transform = `translate3d(${-x}px,0,0)`;
    root.style.setProperty('--ap', p.toFixed(4));
    if (r.top < vh && r.bottom > 0) {
      let left = 0;
      for (const f of frames) {
        f.style.setProperty('--fx', clamp((left - x) / vw, -1.6, 1.6).toFixed(4));
        left += f.offsetWidth;
      }
    }
  }

  track.addEventListener('scroll', () => {
    if (pinH) return;
    const max = track.scrollWidth - track.clientWidth;
    root.style.setProperty('--ap', max > 0 ? (track.scrollLeft / max).toFixed(4) : 0);
  }, { passive: true });
  root.querySelectorAll('.atelier__nav button').forEach(b => b.addEventListener('click', () => {
    track.scrollBy({ left: +b.dataset.dir * track.clientWidth, behavior: motion ? 'smooth' : 'auto' });
  }));
  root.querySelectorAll('[data-book]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: { from: 'lux-story' } }));
  }));

  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  measure();

  // видео в кадре: загрузка и показ только на экране
  if ('IntersectionObserver' in window) {
    const vio = new IntersectionObserver(entries => entries.forEach(en => {
      const v = en.target;
      if (en.isIntersecting && motion) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); }
      else v.pause();
    }), { threshold: .15 });
    root.querySelectorAll('[data-lazy-video]').forEach(v => vio.observe(v));
  }
});
