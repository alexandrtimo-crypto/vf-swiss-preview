// VF kit · общий слой движения. Источники: идеи Magnet и GlareHover (React Bits, MIT + Commons Clause, переписаны на vanilla),
// Anime.js 4.5.0 (MIT) и AutoAnimate 0.10.0 (MIT) подгружаются с jsDelivr по требованию.
// Подключается в meta.json компонента: "needs": ["/kit/lib/motion.js"]. Поведения — по атрибутам:
//   data-magnet · data-glare · data-reveal · data-autoanimate.  Всё отключается при prefers-reduced-motion: reduce.
window.VFMotion = window.VFMotion || (() => {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  const reduced = () => mq.matches;
  const load = (src) => new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error('не загрузилось: ' + src));
    document.head.appendChild(s);
  });

  let animeP, autoP;
  // Promise с глобальным anime (v4: anime.animate, anime.createTimeline, anime.spring…)
  const anime = () => animeP || (animeP = window.anime && window.anime.animate
    ? Promise.resolve(window.anime)
    : load('https://cdn.jsdelivr.net/npm/animejs@4.5.0/dist/bundles/anime.umd.min.js').then(() => window.anime));
  // Вешает AutoAnimate на контейнер; возвращает Promise (ошибка загрузки не ломает страницу)
  const autoAnimate = (el, opts) => {
    if (reduced()) return Promise.resolve(null);
    autoP = autoP || import('https://cdn.jsdelivr.net/npm/@formkit/auto-animate@0.10.0/index.mjs');
    return autoP.then(m => m.default(el, opts || { duration: 240, easing: 'ease-out' })).catch(() => null);
  };

  const style = document.createElement('style');
  style.id = 'vfm-style';
  style.textContent = `
.vfm-hide { opacity: 0; translate: 0 16px; filter: blur(4px); }
.vfm-in { transition: opacity .7s cubic-bezier(.22,1,.36,1), translate .7s cubic-bezier(.22,1,.36,1), filter .7s cubic-bezier(.22,1,.36,1); }
.vfm-magnet-on { transition: translate .5s cubic-bezier(.22,1,.36,1); }
.vfm-glare { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; pointer-events: none; z-index: 2; }
.vfm-glare::before { content: ''; position: absolute; inset: 0;
  background: linear-gradient(-50deg, transparent 38%, var(--vf-glare, rgba(255,255,255,.35)) 50%, transparent 62%) no-repeat;
  background-size: 300% 300%; background-position: -100% -100%; transition: background-position 0s; }
.vfm-glare.is-on::before { background-position: 100% 100%; transition: background-position .8s cubic-bezier(.22,1,.36,1); }
`;
  document.head.appendChild(style);

  // ── Magnet: элемент слегка тянется к курсору в радиусе (только pointer: fine) ──
  const magnets = new Set();
  let magRaf = 0, mx = 0, my = 0, magBound = false;
  const magStep = () => {
    magRaf = 0;
    magnets.forEach(el => {
      const r = el.getBoundingClientRect();
      const pad = +(el.dataset.magnet) || 56;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = mx - cx, dy = my - cy;
      const near = Math.abs(dx) < r.width / 2 + pad && Math.abs(dy) < r.height / 2 + pad;
      el.style.translate = near ? `${(dx * .22).toFixed(1)}px ${(dy * .22).toFixed(1)}px` : '';
    });
  };
  const magnet = el => {
    if (reduced() || !fine.matches) return;
    el.classList.add('vfm-magnet-on');
    magnets.add(el);
    if (magBound) return;
    magBound = true;
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; if (!magRaf) magRaf = requestAnimationFrame(magStep); }, { passive: true });
    document.addEventListener('pointerleave', () => { magnets.forEach(m => { m.style.translate = ''; }); });
  };

  // ── GlareHover: блик проходит по поверхности при наведении ──
  const glare = el => {
    if (reduced()) return;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const g = document.createElement('span');
    g.className = 'vfm-glare'; g.setAttribute('aria-hidden', 'true');
    el.appendChild(g);
    el.addEventListener('pointerenter', () => { g.classList.remove('is-on'); void g.offsetWidth; g.classList.add('is-on'); });
    el.addEventListener('pointerleave', () => g.classList.remove('is-on'));
  };

  // ── Reveal: одна схема появления (opacity + 16px вверх + blur→0), без каскадов ──
  let io;
  const reveal = el => {
    if (reduced() || !('IntersectionObserver' in window)) return;
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight * .92 && r.bottom > 0) return; // уже на экране — не прячем
    io = io || new IntersectionObserver(list => list.forEach(en => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      en.target.classList.add('vfm-in');
      requestAnimationFrame(() => en.target.classList.remove('vfm-hide'));
    }), { rootMargin: '0px 0px -8% 0px' });
    el.classList.add('vfm-hide');
    io.observe(el);
  };

  const scan = (root = document) => {
    const each = (sel, fn) => root.querySelectorAll(sel).forEach(el => { const k = '__vfm_' + sel; if (el[k]) return; el[k] = 1; fn(el); });
    each('[data-magnet]', magnet);
    each('[data-glare]', glare);
    each('[data-reveal]', reveal);
    each('[data-autoanimate]', el => autoAnimate(el));
  };
  // сборщик ставит скрипты в конец body: к DOMContentLoaded вся разметка уже есть
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan());
  else scan();

  return { anime, autoAnimate, scan, reduced, load };
})();
