/* «Путь часов»: закреплённый циферблат, стрелка шагами проходит 6 станций при прокрутке; станции нажимаются. */
VFKit.register('tech-process-dial', root => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2, NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const ticksG = $('.dial-ticks'), stG = $('.dial-stations'), arc = $('.dial-arc'), handG = $('.dial-hand'), dial = $('.dial');
  const ticks = [];
  for (let i = 0; i < 120; i++) {
    const a = i / 120 * TAU, big = i % 20 === 0, r0 = big ? 246 : 250, r1 = 258;
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', (Math.sin(a) * r0).toFixed(2)); l.setAttribute('y1', (-Math.cos(a) * r0).toFixed(2));
    l.setAttribute('x2', (Math.sin(a) * r1).toFixed(2)); l.setAttribute('y2', (-Math.cos(a) * r1).toFixed(2));
    if (big) l.classList.add('big');
    ticksG.appendChild(l); ticks.push(l);
  }
  const stDots = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU, c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', (Math.sin(a) * 236).toFixed(2)); c.setAttribute('cy', (-Math.cos(a) * 236).toFixed(2)); c.setAttribute('r', 9);
    stG.appendChild(c); stDots.push(c);
  }
  const ARC = TAU * 236;
  arc.style.strokeDasharray = `${ARC}`; arc.style.strokeDashoffset = `${ARC}`;
  const stBtns = $$('.stations button'), stLis = $$('.stations li');
  const dialCenter = $('.dial-center'), dialName = $('.dial-name'), dialSub = $('.dial-sub');
  let stage = 0, litN = -1, swapTO = 0;
  function setStage(i) {
    if (i === stage) return; stage = i;
    dialCenter.classList.add('swap'); clearTimeout(swapTO);
    swapTO = setTimeout(() => { dialName.innerHTML = stBtns[i].innerHTML; dialSub.innerHTML = stBtns[i].dataset.sub; dialCenter.classList.remove('swap'); }, RM ? 0 : 220);
    stLis.forEach((li, k) => { li.classList.toggle('past', k < i); li.classList.toggle('cur', k === i); });
  }
  function setHand(ang) {
    handG.setAttribute('transform', `rotate(${ang.toFixed(2)})`);
    arc.style.strokeDashoffset = (ARC * (1 - ang / 360)).toFixed(1);
    const n = Math.floor(ang / 3);
    if (n !== litN) { litN = n; ticks.forEach((t, k) => t.classList.toggle('lit', k <= n)); }
    stDots.forEach((c, k) => c.classList.toggle('on', ang >= k * 60 - .5));
  }
  const P_OF = i => .04 + i / 5 * .86;
  function prUpdate(p) {
    const u = clamp((p - .04) / .86) * 5, i = Math.min(5, Math.floor(u)), f = u - i;
    const pos = i + smooth(.4, .9, f);
    setHand(pos * 60);
    setStage(Math.min(5, Math.round(pos)));
  }
  function placeStations() {
    const D = dial.offsetWidth, k = D / 600, R = 284 * k;
    stLis.forEach((li, i) => {
      const a = i / 6 * TAU, x = Math.sin(a) * R, y = -Math.cos(a) * R, b = li.firstElementChild;
      const tx = x > 20 ? '0%' : x < -20 ? '-100%' : '-50%', ty = Math.abs(x) <= 20 ? (y < 0 ? '-100%' : '0%') : '-50%';
      b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.transform = `translate(${tx},${ty})`;
    });
  }
  stBtns.forEach((b, i) => b.addEventListener('click', () => {
    if (RM) { setHand(i * 60); setStage(i); return; }
    const top = root.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + P_OF(i) * (root.offsetHeight - innerHeight) + 4, behavior: 'smooth' });
  }));
  stLis[0].classList.add('cur'); setHand(0);
  placeStations();
  let rz = 0;
  new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(placeStations, 120); }).observe(dial);

  const progress = () => { const r = root.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
  let raf = 0;
  const frame = () => { prUpdate(progress()); raf = requestAnimationFrame(frame); };
  const start = () => { if (raf || RM) return; raf = requestAnimationFrame(frame); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? start() : stop())), { rootMargin: '80px' }).observe(root);
});
