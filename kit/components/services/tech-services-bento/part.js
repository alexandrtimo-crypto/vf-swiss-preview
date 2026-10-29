/* Услуги — плитки-виджеты. Каждая плитка инициализируется отдельно и только если она есть в разметке:
   лишний <article data-tile> можно удалить из part.html — JS не упадёт (сетку grid-template-areas поправьте в part.css). */
VFKit.register('tech-services-bento', root => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const TAU = Math.PI * 2;
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const cs = getComputedStyle(root);
  const probe = document.createElement('canvas').getContext('2d');
  const rgb = (v, fb) => { probe.fillStyle = fb; probe.fillStyle = (v || '').trim() || fb; const s = probe.fillStyle; return s[0] === '#' ? [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)).join(',') : (s.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).join(','); };
  const LUME = rgb(cs.getPropertyValue('--vf-accent'), '#6ff2d0');
  const TINT = rgb(cs.getPropertyValue('--vf-tint') || cs.getPropertyValue('--vf-text'), '#d6ecf0');
  const SURF = rgb(cs.getPropertyValue('--vf-bg-2'), '#0a0e11');
  const TEXT = rgb(cs.getPropertyValue('--vf-text'), '#eaf1f2');

  // видимость плиток (анимации только на экране)
  const vis = new Map();
  const io = new IntersectionObserver(es => es.forEach(e => vis.set(e.target, e.isIntersecting)), { rootMargin: '80px' });
  const watch = el => { if (el) { vis.set(el, false); io.observe(el); } return el; };

  $$('.tile').forEach(t => t.addEventListener('pointermove', e => {
    const r = t.getBoundingClientRect(); t.style.setProperty('--mx', e.clientX - r.left + 'px'); t.style.setProperty('--my', e.clientY - r.top + 'px');
  }, { passive: true }));

  /* диагностика: осциллограмма + щуп */
  const diagTile = watch($('.t-diag'));
  let drawDiag = null, DG = null;
  if (diagTile) {
    const cv = diagTile.querySelector('.diag-c');
    DG = { cv, g: cv.getContext('2d'), w: 0, h: 0 };
    DG.fit = () => { const r = cv.getBoundingClientRect(); DG.w = r.width; DG.h = r.height; cv.width = Math.max(1, Math.round(r.width * DPR)); cv.height = Math.max(1, Math.round(r.height * DPR)); };
    DG.fit();
    const probeP = { on: false, x: 0 };
    cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); probeP.on = true; probeP.x = e.clientX - r.left; });
    cv.addEventListener('pointerleave', () => { probeP.on = false; });
    const sig = (u, k0) => {
      let v = 0; const sp = 130;
      const k = Math.floor(u / sp);
      for (let kk = k - 1; kk <= k; kk++) {
        const d = u - kk * sp, amp = .8 + .4 * hash(kk + k0);
        if (d >= 0) v += Math.exp(-d / 9) * Math.sin(d * .85) * amp;
        const d2 = d - 34; if (d2 >= 0) v += .55 * Math.exp(-d2 / 7) * Math.sin(d2 * 1.1) * amp;
        const d3 = d - 70; if (d3 >= 0) v += .3 * Math.exp(-d3 / 6) * Math.sin(d3 * 1.3);
      }
      return v;
    };
    drawDiag = t => {
      const g = DG.g, W = DG.w, H = DG.h;
      g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
      const mid = H * .42, A = H * .16, off = t * 110;
      g.strokeStyle = `rgba(${TINT},.05)`; g.lineWidth = 1;
      for (let y = mid % 28; y < H; y += 28) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(W, y + .5); g.stroke(); }
      for (let x = (-off % 28 + 28) % 28; x < W; x += 28) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, H); g.stroke(); }
      const path = () => { g.beginPath(); for (let x = 0; x <= W; x += 2) { const y = mid - sig(x + off, 3) * A; x ? g.lineTo(x, y) : g.moveTo(x, y); } };
      path(); g.strokeStyle = `rgba(${LUME},.14)`; g.lineWidth = 7; g.stroke();
      g.strokeStyle = `rgba(${LUME},.95)`; g.lineWidth = 1.5; g.stroke();
      const fade = g.createLinearGradient(0, 0, W, 0); fade.addColorStop(0, `rgba(${SURF},.95)`); fade.addColorStop(.18, `rgba(${SURF},0)`);
      g.fillStyle = fade; g.fillRect(0, 0, W, H);
      if (probeP.on) {
        const y = mid - sig(probeP.x + off, 3) * A;
        g.strokeStyle = `rgba(${TEXT},.35)`; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(probeP.x + .5, 0); g.lineTo(probeP.x + .5, H); g.stroke(); g.setLineDash([]);
        g.strokeStyle = `rgba(${LUME},1)`; g.lineWidth = 1.5; g.beginPath(); g.arc(probeP.x, y, 9, 0, TAU); g.stroke();
        g.fillStyle = '#eafff9'; g.beginPath(); g.arc(probeP.x, y, 3, 0, TAU); g.fill();
      }
    };
  }

  /* механизм: видео играет только в зоне видимости */
  const mechTile = $('.t-mech'), mechV = $('.mech-v');
  if (mechTile && mechV) {
    const play = () => { const p = mechV.play(); if (p) p.catch(() => {}); };
    new IntersectionObserver(es => es.forEach(e => { if (RM) return; if (e.isIntersecting) play(); else mechV.pause(); }), { threshold: .25 }).observe(mechTile);
    mechTile.addEventListener('click', () => { if (mechV.paused) play(); else mechV.pause(); });
  }

  /* стекло: блик за курсором, сам по себе — когда курсора нет */
  const glassTile = watch($('.t-glass'));
  let glassHover = false;
  if (glassTile) {
    glassTile.addEventListener('pointermove', e => {
      glassHover = true; const r = glassTile.getBoundingClientRect();
      glassTile.style.setProperty('--px', ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3));
      glassTile.style.setProperty('--py', ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3));
    });
    glassTile.addEventListener('pointerleave', () => { glassHover = false; });
  }

  /* элемент питания */
  const battTile = $('.t-batt');
  if (battTile) new IntersectionObserver(es => es.forEach(e => battTile.classList.toggle('play', e.isIntersecting && !RM)), { threshold: .3 }).observe(battTile);

  /* полировка: царапины и ползунок */
  const pol = $('.t-polish'), polRange = $('.pol-range');
  if (pol && polRange) {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let s = '';
    for (let i = 0; i < 110; i++) {
      const x = rnd() * 640, y = rnd() * 320, len = 20 + rnd() * 160, a = (rnd() < .8 ? (rnd() - .5) * .5 : rnd() * 3.14);
      s += `<line x1='${x.toFixed(1)}' y1='${y.toFixed(1)}' x2='${(x + Math.cos(a) * len).toFixed(1)}' y2='${(y + Math.sin(a) * len).toFixed(1)}' stroke='white' stroke-opacity='${(.08 + rnd() * .35).toFixed(2)}' stroke-width='${(.4 + rnd() * 1.1).toFixed(2)}'/>`;
    }
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='320' preserveAspectRatio='none'>${s}</svg>`;
    pol.style.setProperty('--scratch', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
    polRange.addEventListener('input', () => pol.style.setProperty('--v', polRange.value));
    pol.addEventListener('pointermove', e => {
      const r = pol.getBoundingClientRect(); pol.style.setProperty('--gx', e.clientX - r.left + 'px'); pol.style.setProperty('--gy', e.clientY - r.top + 'px');
    });
  }

  /* ремешки */
  const strapW = $('.strap-w'), seg = $('.seg');
  if (strapW && seg) {
    const bs = [...seg.querySelectorAll('button')];
    bs.forEach((b, i) => b.addEventListener('click', () => {
      bs.forEach(x => x.setAttribute('aria-checked', String(x === b)));
      seg.style.setProperty('--i', i);
      strapW.dataset.m = b.dataset.m;
      strapW.classList.remove('swap'); void strapW.offsetWidth; strapW.classList.add('swap');
    }));
    seg.addEventListener('keydown', e => {
      const i = bs.findIndex(b => b.getAttribute('aria-checked') === 'true');
      const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
      if (n === null) return; e.preventDefault(); const b = bs[(n + bs.length) % bs.length]; b.click(); b.focus();
    });
  }

  /* бренды: барабан */
  const BRANDS = ['Rolex', 'Patek Philippe', 'Audemars Piguet', 'Vacheron Constantin', 'Breguet', 'Cartier', 'Breitling', 'Franck Muller', 'Blancpain', 'и другие'];
  const drumIn = $('.drum-in'), brandTile = watch($('.t-brand'));
  let bi = 0, drumT = 0;
  function nextBrand() {
    drumIn.classList.add('out');
    setTimeout(() => {
      bi = (bi + 1) % BRANDS.length; drumIn.textContent = BRANDS[bi];
      drumIn.classList.toggle('end', bi === BRANDS.length - 1);
      $$('.drum-dots i').forEach((d, k) => d.classList.toggle('on', k === bi));
      drumIn.classList.remove('out'); drumIn.classList.add('in'); void drumIn.offsetWidth; drumIn.classList.remove('in');
    }, 230);
  }
  if (brandTile && drumIn) $('.drum').addEventListener('click', () => { nextBrand(); drumT = performance.now() + 2500; });

  /* общий цикл — только пока секция на экране */
  let raf = 0;
  function frame(now) {
    const t = now / 1000;
    if (drawDiag && vis.get(diagTile)) drawDiag(t);
    if (glassTile && vis.get(glassTile) && !glassHover) {
      glassTile.style.setProperty('--px', Math.sin(t * .7).toFixed(3)); glassTile.style.setProperty('--py', (Math.cos(t * .5) * .4).toFixed(3));
    }
    if (brandTile && drumIn && vis.get(brandTile) && now > drumT) { drumT = now + 1700; nextBrand(); }
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (raf || RM) return; raf = requestAnimationFrame(frame); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? start() : stop())), { rootMargin: '80px' }).observe(root);
  if (DG) {
    let rz = 0;
    new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => { DG.fit(); if (RM) drawDiag(1.13); }, 120); }).observe(diagTile);
    if (RM) drawDiag(1.13);
  }
});
