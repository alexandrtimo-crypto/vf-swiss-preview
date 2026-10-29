/* --- Общий процедурный механизм tech (canvas 2D, аксонометрия: каждый слой — плоскость на своей высоте z).
   Этот блок одинаков в tech-hero и tech-story-explode; на странице создаётся один раз (window.VFTechMech). --- */
const techMech = root => window.VFTechMech || (window.VFTechMech = (() => {
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  // цвета и шрифты темы → для canvas
  const cs = getComputedStyle(root);
  const probe = document.createElement('canvas').getContext('2d');
  const rgb = (v, fb) => {
    probe.fillStyle = fb; probe.fillStyle = (v || '').trim() || fb; const s = probe.fillStyle;
    if (s[0] === '#') return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)).join(',');
    return (s.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).join(',');
  };
  const LUME = rgb(cs.getPropertyValue('--vf-accent'), '#6ff2d0');
  const TINT = rgb(cs.getPropertyValue('--vf-tint') || cs.getPropertyValue('--vf-text'), '#d6ecf0');
  const FONT_TEXT = cs.getPropertyValue('--vf-font-text').trim() || 'sans-serif';
  const FONT_MONO = cs.getPropertyValue('--vf-font-mono').trim() || 'monospace';
  function msk() { const d = new Date(); return new Date(d.getTime() + (d.getTimezoneOffset() + 180) * 60000); }

  const G = { barrel: [-48, 32, 32], center: [0, 0, 26], third: [30, -28, 18], fourth: [58, -2, 16], escape: [55, 32, 13], pallet: [38, 49], bal: [18, 66, 27] };
  const F = 2.5; // частота баланса, Гц (визуально)
  function mstate(t) {
    const ph = t * F;
    const beats = Math.floor(ph * 2);
    const fr = ph * 2 - beats;
    const k = 1 - Math.pow(1 - clamp(fr * 6), 3);
    const cur = (beats % 2 ? -1 : 1) * 0.12;
    const barrel = -0.12 * t;
    const center = -barrel * 32 / 26;
    const third = -center * 26 / 18;
    const fourth = -third * 18 / 16;
    return { t, bal: 3.3 * Math.sin(TAU * ph), esc: -(beats + k) * (TAU / 30), pal: lerp(-cur, cur, k), barrel, center, third, fourth, beat: beats, glow: Math.max(0, 1 - fr * 2.5) };
  }

  let LW = 1; // толщина 1 css-px в локальных единицах
  const gradCache = new WeakMap();
  function metal(g, r, kind) {
    let m = gradCache.get(g); if (!m) { m = new Map(); gradCache.set(g, m); }
    const key = kind + r; if (m.has(key)) return m.get(key);
    const gr = g.createLinearGradient(-r, -r, r, r);
    const S = kind === 'warm' ? ['#efe5cc', '#8e8167', '#dcd0b1', '#5d5442'] : ['#f1f6f7', '#7d898e', '#cfd8db', '#3b4448'];
    S.forEach((c, i) => gr.addColorStop(i / (S.length - 1), c));
    m.set(key, gr); return gr;
  }
  function ring(g, r, col, w) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
  function screw(g, x, y, r, a) {
    const sg = g.createRadialGradient(x - r * .4, y - r * .4, 0, x, y, r);
    sg.addColorStop(0, '#9fc0dc'); sg.addColorStop(.55, '#3d5f80'); sg.addColorStop(1, '#16222e');
    g.fillStyle = sg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = r * .32; g.beginPath();
    g.moveTo(x + Math.cos(a) * r * .8, y + Math.sin(a) * r * .8); g.lineTo(x - Math.cos(a) * r * .8, y - Math.sin(a) * r * .8); g.stroke();
  }
  function jewel(g, x, y, r, a = 1) {
    const jg = g.createRadialGradient(x, y, 0, x, y, r * 3.4);
    jg.addColorStop(0, `rgba(240,255,252,${a})`);
    jg.addColorStop(.16, `rgba(${LUME},${.95 * a})`);
    jg.addColorStop(.38, `rgba(${LUME},${.22 * a})`);
    jg.addColorStop(1, `rgba(${LUME},0)`);
    g.fillStyle = jg; g.beginPath(); g.arc(x, y, r * 3.4, 0, TAU); g.fill();
  }

  /* заранее отрисованные статичные слои */
  const UNITS = 280;
  const RES = Math.min(1700, Math.ceil(3.4 * DPR * UNITS));
  function off(draw) {
    const c = document.createElement('canvas'); c.width = c.height = RES;
    const g = c.getContext('2d'); g.setTransform(RES / UNITS, 0, 0, RES / UNITS, RES / 2, RES / 2); draw(g); return c;
  }
  function drawPlate(g) {
    const gr = g.createRadialGradient(-30, -40, 10, 0, 0, 104);
    gr.addColorStop(0, '#222a2f'); gr.addColorStop(1, '#0b0f11');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 100, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(0, 0, 97, 0, TAU); g.clip();
    for (let y = -100, row = 0; y <= 100; y += 8.5, row++) {
      for (let x = -100 + (row % 2) * 5; x <= 100; x += 10) {
        const pg = g.createRadialGradient(x - 1.6, y - 1.6, 0, x, y, 6.8);
        pg.addColorStop(0, 'rgba(225,238,242,.13)'); pg.addColorStop(.6, 'rgba(225,238,242,.035)'); pg.addColorStop(1, 'rgba(225,238,242,0)');
        g.fillStyle = pg; g.beginPath(); g.arc(x, y, 6.8, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(225,238,242,.06)'; g.lineWidth = .35; g.stroke();
      }
    }
    g.restore();
    for (const [x, y, r] of [G.barrel, G.bal]) {
      g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.arc(x, y, r + 3, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(225,238,242,.12)'; g.lineWidth = .5; g.stroke();
    }
    ring(g, 100, 'rgba(225,238,242,.5)', .8); ring(g, 96.5, 'rgba(225,238,242,.16)', .4);
    for (const k of ['barrel', 'center', 'third', 'fourth', 'escape', 'bal']) { const [x, y] = G[k]; g.fillStyle = '#040607'; g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); }
    for (const a of [.35, 2.3, 3.9, 5.3]) screw(g, Math.cos(a) * 90, Math.sin(a) * 90, 3.4, a * 2);
    g.textAlign = 'center';
    g.fillStyle = 'rgba(225,238,242,.32)'; g.font = `600 7px ${FONT_TEXT}`; g.fillText('VF swiss', -24, -74);
    g.fillStyle = 'rgba(225,238,242,.2)'; g.font = `3.6px ${FONT_MONO}`; g.fillText('MOSCOW · PETROVKA 23/10', -24, -67);
  }
  const BR = [
    { pts: [[-48, 32], [-76, -26]], w: 30, caps: [[-48, 32, 37]] },
    { pts: [[-26, -64], [0, 0], [30, -28], [58, -2]], w: 19, caps: [[0, 0, 13], [30, -28, 11], [58, -2, 10]] },
    { pts: [[55, 32], [38, 49], [64, 58]], w: 11, caps: [[55, 32, 8]] },
    { pts: [[18, 66], [-22, 88]], w: 19, caps: [[18, 66, 13]] },
  ];
  const JEWELS = [G.center, G.third, G.fourth, G.escape, G.pallet, G.bal];
  const BSCREWS = [[-76, -26], [-26, -64], [-22, 88], [64, 58], [-30, 52]];
  function bridgeShape(g, extra) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const b of BR) {
      g.lineWidth = b.w + extra; g.beginPath();
      b.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      for (const [x, y, r] of b.caps) { g.beginPath(); g.arc(x, y, r + extra / 2, 0, TAU); g.fill(); }
    }
  }
  function plateClip(g) { g.globalCompositeOperation = 'destination-in'; g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, 99, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; }
  function drawBridgeFill(g) {
    g.fillStyle = g.strokeStyle = '#4d5c63'; bridgeShape(g, 0);
    g.globalCompositeOperation = 'source-atop';
    const lg = g.createLinearGradient(-100, -100, 100, 100); lg.addColorStop(0, '#5d6c73'); lg.addColorStop(.45, '#1b2327'); lg.addColorStop(.7, '#38444a'); lg.addColorStop(1, '#11171a');
    g.fillStyle = lg; g.fillRect(-140, -140, 280, 280);
    g.save(); g.rotate(-.55);
    for (let x = -160; x < 160; x += 9) {
      const sg = g.createLinearGradient(x, 0, x + 9, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.13)'); sg.addColorStop(1, 'rgba(0,0,0,.2)');
      g.fillStyle = sg; g.fillRect(x, -160, 9, 320);
    }
    g.restore();
    g.globalCompositeOperation = 'destination-out';
    for (const [x, y] of JEWELS) { g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    plateClip(g);
  }
  function drawBridgeEdge(g) {
    g.fillStyle = g.strokeStyle = 'rgba(214,236,240,.75)'; bridgeShape(g, 1.2);
    g.globalCompositeOperation = 'destination-out'; bridgeShape(g, 0); g.globalCompositeOperation = 'source-over';
    plateClip(g);
    for (const [x, y] of JEWELS) { g.strokeStyle = 'rgba(230,244,246,.8)'; g.lineWidth = .7; g.beginPath(); g.arc(x, y, 5.4, 0, TAU); g.stroke(); }
    BSCREWS.forEach(([x, y], i) => screw(g, x, y, 3.3, i * 1.3));
  }
  function drawGlassRing(g) {
    const cg = g.createRadialGradient(-40, -50, 10, 0, 0, 120);
    cg.addColorStop(0, 'rgba(190,240,245,.12)'); cg.addColorStop(.7, 'rgba(190,240,245,.03)'); cg.addColorStop(1, 'rgba(190,240,245,.07)');
    g.fillStyle = cg; g.beginPath(); g.arc(0, 0, 118, 0, TAU); g.arc(0, 0, 103, 0, TAU, true); g.fill('evenodd');
    g.fillStyle = 'rgba(190,240,245,.022)'; g.beginPath(); g.arc(0, 0, 103, 0, TAU); g.fill();
    ring(g, 118, 'rgba(225,240,242,.65)', .8); ring(g, 103, 'rgba(225,240,242,.25)', .4);
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * TAU, big = i % 5 === 0;
      g.strokeStyle = big ? 'rgba(235,245,246,.8)' : 'rgba(235,245,246,.35)'; g.lineWidth = big ? 1 : .45;
      const r0 = big ? 105 : 108.5;
      g.beginPath(); g.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0); g.lineTo(Math.sin(a) * 115, -Math.cos(a) * 115); g.stroke();
    }
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4; jewel(g, Math.sin(a) * 110.5, -Math.cos(a) * 110.5, 1.6, .9); }
    const sg = g.createLinearGradient(-90, -90, 40, 40);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.4, 'rgba(255,255,255,.09)'); sg.addColorStop(.46, 'rgba(255,255,255,0)');
    g.fillStyle = sg; g.beginPath(); g.arc(0, 0, 117, 0, TAU); g.fill();
  }
  let IMG = {};
  function prerender() { IMG = { plate: off(drawPlate), bfill: off(drawBridgeFill), bedge: off(drawBridgeEdge), glass: off(drawGlassRing) }; }
  prerender();
  const ready = (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { prerender(); });
  const blit = (g, c) => g.drawImage(c, -UNITS / 2, -UNITS / 2, UNITS, UNITS);

  /* живые детали */
  function gear(g, x, y, r, n, ang, o = {}) {
    const spokes = o.spokes ?? 5, th = o.th ?? (r > 20 ? 2.6 : 2), rim = o.rim ?? 3, hub = o.hub ?? Math.max(2.4, r * .2);
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath();
    const rr = r - th, w = TAU / n;
    for (let i = 0; i < n; i++) {
      const a = i * w;
      const P = [[rr, a], [r, a + .22 * w], [r, a + .5 * w], [rr, a + .72 * w]];
      P.forEach(([R, A], j) => (i === 0 && j === 0 ? g.moveTo(Math.cos(A) * R, Math.sin(A) * R) : g.lineTo(Math.cos(A) * R, Math.sin(A) * R)));
    }
    g.closePath();
    if (spokes) {
      const ri = rr - rim, sw = Math.max(1.1, r * .07);
      for (let i = 0; i < spokes; i++) {
        const a = i / spokes * TAU, b = (i + 1) / spokes * TAU;
        g.moveTo(Math.cos(a + sw / ri) * ri, Math.sin(a + sw / ri) * ri);
        g.arc(0, 0, ri, a + sw / ri, b - sw / ri);
        g.arc(0, 0, hub, b - sw / hub, a + sw / hub, true); g.closePath();
      }
    }
    g.fillStyle = metal(g, r, o.kind || 'warm'); g.fill('evenodd');
    g.strokeStyle = 'rgba(255,250,235,.4)'; g.lineWidth = LW * .8; g.stroke();
    if (o.cover) {
      g.fillStyle = metal(g, rr - 2, 'warm'); g.beginPath(); g.arc(0, 0, rr - 1.5, 0, TAU); g.fill();
      for (let k = 4; k < rr - 2; k += 2.2) ring(g, k, 'rgba(60,50,30,.18)', .35);
    }
    if (o.pinion) { g.fillStyle = '#2a3135'; g.beginPath(); g.arc(0, 0, o.pinion, 0, TAU); g.fill(); g.strokeStyle = 'rgba(230,240,242,.55)'; g.lineWidth = LW * .8; g.stroke(); }
    g.fillStyle = '#0b0e10'; g.beginPath(); g.arc(0, 0, 1.5, 0, TAU); g.fill();
    g.restore();
  }
  function escapeWheel(g, ang) {
    const [x, y, r] = G.escape;
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath();
    const n = 15, w = TAU / n, rr = r * .66;
    for (let i = 0; i < n; i++) {
      const a = i * w;
      const P = [[rr, a], [r * .97, a + .3 * w], [r, a + .44 * w], [r * .88, a + .52 * w], [rr, a + .64 * w]];
      P.forEach(([R, A], j) => (i === 0 && j === 0 ? g.moveTo(Math.cos(A) * R, Math.sin(A) * R) : g.lineTo(Math.cos(A) * R, Math.sin(A) * R)));
    }
    g.closePath();
    const ri = rr - 1.6, hub = 2.4, sw = 1;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU, b = (i + 1) / 4 * TAU;
      g.moveTo(Math.cos(a + sw / ri) * ri, Math.sin(a + sw / ri) * ri);
      g.arc(0, 0, ri, a + sw / ri, b - sw / ri); g.arc(0, 0, hub, b - sw / hub, a + sw / hub, true); g.closePath();
    }
    g.fillStyle = metal(g, r, 'cool'); g.fill('evenodd');
    g.strokeStyle = 'rgba(240,250,252,.5)'; g.lineWidth = LW * .8; g.stroke();
    g.restore();
  }
  function palletFork(g, ang) {
    const [px, py] = G.pallet, [ex, ey] = G.escape, [bx, by] = G.bal;
    const ae = Math.atan2(ey - py, ex - px), ab = Math.atan2(by - py, bx - px);
    g.save(); g.translate(px, py); g.rotate(ang);
    const L = 17, a1 = ae - .5, a2 = ae + .5, Lb = 20;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = metal(g, 20, 'cool'); g.lineWidth = 2.8;
    g.beginPath(); g.moveTo(Math.cos(a1) * L, Math.sin(a1) * L); g.lineTo(0, 0); g.lineTo(Math.cos(a2) * L, Math.sin(a2) * L);
    g.moveTo(0, 0); g.lineTo(Math.cos(ab) * Lb, Math.sin(ab) * Lb); g.stroke();
    g.lineWidth = 1.4; g.beginPath();
    const hx = Math.cos(ab) * Lb, hy = Math.sin(ab) * Lb;
    g.moveTo(hx + Math.cos(ab + 1.9) * 3, hy + Math.sin(ab + 1.9) * 3); g.lineTo(hx, hy); g.lineTo(hx + Math.cos(ab - 1.9) * 3, hy + Math.sin(ab - 1.9) * 3); g.stroke();
    for (const a of [a1, a2]) jewel(g, Math.cos(a) * L, Math.sin(a) * L, 1.3, .9);
    g.fillStyle = '#0b0e10'; g.beginPath(); g.arc(0, 0, 1.5, 0, TAU); g.fill();
    g.restore();
  }
  function balanceWheel(g, ang, glow) {
    const [x, y, r] = G.bal;
    g.save(); g.translate(x, y);
    g.beginPath();
    const turns = 9, N = turns * 40;
    for (let i = 0; i <= N; i++) {
      const u = i / N, th = u * turns * TAU + ang * (1 - u) * .85, R = 3.4 + 13 * u;
      const px = Math.cos(th) * R, py = Math.sin(th) * R;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.strokeStyle = 'rgba(205,228,234,.6)'; g.lineWidth = Math.max(.3, LW * .8); g.stroke();
    g.rotate(ang);
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.arc(0, 0, r - 3.2, 0, TAU, true);
    g.fillStyle = metal(g, r, 'warm'); g.fill('evenodd');
    g.fillRect(-r + 2, -1.3, 2 * r - 4, 2.6);
    g.strokeStyle = 'rgba(255,250,235,.45)'; g.lineWidth = LW * .8; g.stroke();
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU;
      g.fillStyle = '#cdbf9c'; g.beginPath(); g.arc(Math.cos(a) * (r + .8), Math.sin(a) * (r + .8), 1.05, 0, TAU); g.fill();
    }
    g.fillStyle = metal(g, 5, 'cool'); g.beginPath(); g.arc(0, 0, 4.2, 0, TAU); g.fill();
    jewel(g, 0, 4.2, .9, .8);
    if (glow > 0) {
      g.strokeStyle = `rgba(${LUME},${.5 * glow})`; g.lineWidth = 2.4; g.beginPath(); g.arc(0, 0, r + 2.4, 0, TAU); g.stroke();
    }
    g.restore();
  }
  function ratchet(g, ang) {
    const [x, y] = G.barrel;
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath();
    const n = 44, R = 24, rr = 22;
    for (let i = 0; i < n; i++) { const a = i / n * TAU, b = (i + .85) / n * TAU; i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); g.lineTo(Math.cos(b) * R, Math.sin(b) * R); }
    g.closePath(); g.fillStyle = metal(g, 24, 'cool'); g.fill();
    g.strokeStyle = 'rgba(240,250,252,.45)'; g.lineWidth = LW * .8; g.stroke();
    g.strokeStyle = 'rgba(20,30,34,.18)'; g.lineWidth = .3; g.beginPath();
    for (let i = 0; i < 90; i++) { const a = i / 90 * TAU; g.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); g.lineTo(Math.cos(a) * 21, Math.sin(a) * 21); }
    g.stroke();
    screw(g, 0, 0, 4.2, 0.6);
    g.restore();
  }
  function hand(g, a, L, w) {
    g.save(); g.rotate(a);
    g.beginPath(); g.moveTo(-w, 7); g.lineTo(-w * .75, -L * .9); g.lineTo(0, -L); g.lineTo(w * .75, -L * .9); g.lineTo(w, 7); g.closePath();
    g.fillStyle = 'rgba(8,12,14,.75)'; g.fill(); g.strokeStyle = 'rgba(238,246,247,.9)'; g.lineWidth = LW * 1.1; g.stroke();
    g.fillStyle = `rgba(${LUME},.9)`; g.fillRect(-w * .32, -L * .84, w * .64, L * .56);
    g.restore();
  }
  const LAYERS = [
    (g) => blit(g, IMG.plate),
    (g, s) => {
      gear(g, G.barrel[0], G.barrel[1], 32, 76, s.barrel, { spokes: 0, cover: true });
      gear(g, 0, 0, 26, 64, s.center, { pinion: 4.5 });
      gear(g, 30, -28, 18, 48, s.third, { pinion: 3.6 });
      gear(g, 58, -2, 16, 42, s.fourth, { pinion: 3.2, spokes: 4 });
    },
    (g, s) => { escapeWheel(g, s.esc); palletFork(g, s.pal); },
    (g, s) => balanceWheel(g, s.bal, s.glow),
    (g, s) => {
      g.globalAlpha *= .88; blit(g, IMG.bfill); g.globalAlpha /= .88;
      blit(g, IMG.bedge); ratchet(g, s.barrel * 1.0);
      for (const [x, y] of JEWELS) jewel(g, x, y, 1.9, .95);
    },
    (g) => {
      blit(g, IMG.glass);
      const d = msk(); const sec = d.getSeconds() + d.getMilliseconds() / 1000, min = d.getMinutes() + sec / 60, hr = d.getHours() % 12 + min / 60;
      hand(g, hr / 12 * TAU, 56, 3.4); hand(g, min / 60 * TAU, 86, 2.5);
      g.save(); g.rotate(sec / 60 * TAU); g.strokeStyle = `rgba(${LUME},.95)`; g.lineWidth = Math.max(.5, LW * 1.2);
      g.beginPath(); g.moveTo(0, 18); g.lineTo(0, -98); g.stroke(); g.fillStyle = `rgba(${LUME},1)`; g.beginPath(); g.arc(0, 0, 2.2, 0, TAU); g.fill(); g.restore();
      g.fillStyle = '#0b0e10'; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill();
    },
  ];
  function proj(V, z, lx, ly) {
    const c = Math.cos(V.theta), s = Math.sin(V.theta);
    const x1 = lx * c - ly * s, y1 = lx * s + ly * c;
    return [V.cx + z * V.ox * V.s + x1 * V.s, V.cy - z * Math.sin(V.phi) * V.s + y1 * V.s * Math.cos(V.phi)];
  }
  function renderMech(C, V, st) {
    const g = C.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, C.cv.width, C.cv.height);
    LW = 1 / V.s;
    const cp = Math.cos(V.phi), sp = Math.sin(V.phi);
    const set = z => g.setTransform(DPR * V.s, 0, 0, DPR * V.s * cp, DPR * (V.cx + z * V.ox * V.s), DPR * (V.cy - z * sp * V.s));
    set(V.z[0] - 8);
    const sh = g.createRadialGradient(0, 10, 70, 0, 10, 150); sh.addColorStop(0, 'rgba(0,0,0,.75)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.beginPath(); g.arc(0, 10, 150, 0, TAU); g.fill();
    if (V.halo) {
      const hg = g.createRadialGradient(0, 0, 96, 0, 0, 160); hg.addColorStop(0, `rgba(${LUME},.16)`); hg.addColorStop(1, `rgba(${LUME},0)`);
      g.fillStyle = hg; g.beginPath(); g.arc(0, 0, 160, 0, TAU); g.fill();
    }
    if (V.e > .02) {
      const a = proj(V, V.z[0] - 20, 0, 0), b = proj(V, V.z[5] + 40, 0, 0);
      g.setTransform(DPR, 0, 0, DPR, 0, 0); g.setLineDash([3, 5]); g.strokeStyle = `rgba(${LUME},${.45 * V.e})`; g.lineWidth = 1;
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.setLineDash([]);
    }
    for (let i = 0; i < 6; i++) {
      set(V.z[i]); g.rotate(V.theta);
      if (V.e > .05) {
        const on = V.hi === i;
        g.setLineDash(on ? [] : [3, 4]);
        g.strokeStyle = `rgba(${LUME},${(on ? .75 : .2) * V.e})`; g.lineWidth = LW * (on ? 1.6 : 1);
        g.beginPath(); g.arc(0, 0, 127, 0, TAU); g.stroke(); g.setLineDash([]);
        if (on) { g.strokeStyle = `rgba(${LUME},${.12 * V.e})`; g.lineWidth = 7; g.beginPath(); g.arc(0, 0, 127, 0, TAU); g.stroke(); }
      }
      g.globalAlpha = V.hi >= 0 && V.hi !== i ? .62 : 1;
      LAYERS[i](g, st, V);
      g.globalAlpha = 1;
    }
  }
  function mkCanvas(cv) {
    const C = { cv, g: cv.getContext('2d'), w: 0, h: 0 };
    C.fit = () => { const r = cv.getBoundingClientRect(); C.w = r.width; C.h = r.height; cv.width = Math.max(1, Math.round(r.width * DPR)); cv.height = Math.max(1, Math.round(r.height * DPR)); };
    C.fit(); return C;
  }
  return { DPR, TAU, LUME, TINT, FONT_TEXT, FONT_MONO, clamp, lerp, ease, smooth, hash, msk, G, F, JEWELS, mstate, proj, renderMech, mkCanvas, ready };
})());

/* --- Сцена «Разбор»: закреплённый механизм раскладывается по оси z на 6 слоёв, выноски по одной --- */
VFKit.register('tech-story-explode', root => {
  const M = techMech(root);
  const { DPR, TAU, LUME, clamp, lerp, ease, G, JEWELS, mstate, proj, renderMech, mkCanvas } = M;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const XP = mkCanvas(root.querySelector('.xp-canvas'));
  const tags = [...root.querySelectorAll('.xp-tags li')].map(el => ({ el, L: +el.dataset.layer, h: 0, w: 0 }));
  const xpFinal = root.querySelector('.xp-final');
  const xpRuler = root.querySelector('.ruler-xp');
  const measureTags = () => tags.forEach(t => { t.h = t.el.offsetHeight; t.w = t.el.offsetWidth; });

  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPtr = e => { if (e.pointerType !== 'mouse') return; ptr.tx = e.clientX / innerWidth * 2 - 1; ptr.ty = e.clientY / innerHeight * 2 - 1; };

  function candidates(L, V) {
    const pts = [];
    const rim = r => { for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } };
    if (L === 0) rim(100);
    if (L === 5) rim(118);
    if (L === 1) pts.push([G.barrel[0], G.barrel[1]], [0, 0], [G.third[0], G.third[1]], [G.fourth[0], G.fourth[1]]);
    if (L === 2) pts.push([G.escape[0], G.escape[1]], [G.pallet[0], G.pallet[1]]);
    if (L === 3) { const c = Math.cos(-V.theta), s = Math.sin(-V.theta); pts.push([G.bal[0] + c * 27, G.bal[1] + s * 27], [G.bal[0] - c * 27, G.bal[1] - s * 27]); }
    if (L === 4) JEWELS.forEach(([x, y]) => pts.push([x, y]));
    return pts;
  }
  function xpView(p) {
    const W = XP.w, H = XP.h, mob = W < 820;
    const k1 = ease(clamp(p / .2)), e = ease(clamp((p - .08) / .42));
    const phi = lerp(.48, mob ? 1.02 : 1.1, k1);
    const theta = -.72 + p * .45 + ptr.x * .1;
    const s = mob ? (W * .33) / 118 : Math.min(H * .24, W * .17) / 118;
    const top = mob ? 196 : 104, bot = mob ? H - 150 : H - 120, Ah = bot - top;
    const cp = Math.cos(phi), sp = Math.sin(phi);
    const zmax = Math.max(60, (Ah / s - 2 * 122 * cp) / sp);
    const step = lerp(6, zmax / 5, e);
    const z = [0, 1, 2, 3, 4, 5].map(i => i * step);
    const stackH = 2 * 122 * cp * s + 5 * step * sp * s;
    const cy = top + (Ah - stackH) / 2 + 122 * cp * s + 5 * step * sp * s;
    const cx = mob ? W * .6 : W * .56;
    return { cx, cy, s, phi, theta, ox: 0, z, e, hi: -1, halo: false, mob };
  }
  function renderXp(p, st) {
    const V = xpView(p);
    const thr = i => .3 + i * .085;
    let act = -1;
    tags.forEach((t, i) => { if (p > thr(i)) act = i; });
    const fin = p > .86;
    V.hi = act >= 0 && !fin ? tags[act].L : -1;
    renderMech(XP, V, st);
    if (xpRuler) xpRuler.style.setProperty('--k', V.e.toFixed(3));
    const g = XP.g; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    const lastB = { L: V.mob ? 190 : 330, R: 90 };
    tags.forEach((t, i) => {
      const on = i <= act;
      const side = V.mob ? 'L' : (i % 2 ? 'L' : 'R');
      const z = V.z[t.L];
      let best = null;
      for (const [lx, ly] of candidates(t.L, V)) {
        const q = proj(V, z, lx, ly);
        if (!best || (side === 'L' ? q[0] < best[0] : q[0] > best[0])) best = q;
      }
      const [ax, ay] = best;
      const ly = Math.max(ay, lastB[side] + t.h / 2 + 12);
      lastB[side] = ly + t.h / 2;
      const R = 122 * V.s;
      const lx = V.mob ? 12 : side === 'R' ? Math.min(XP.w - t.w - 24, V.cx + R + 70) : Math.max(24, V.cx - R - 70 - t.w);
      t.el.style.transform = `translate(${lx.toFixed(1)}px,${(ly - t.h / 2).toFixed(1)}px)`;
      t.el.classList.toggle('left', side === 'L' && !V.mob);
      t.el.classList.toggle('on', on);
      t.el.classList.toggle('act', i === act && !fin);
      if (on) {
        const ex = side === 'L' ? lx + t.w + 10 : lx - 10, bx = side === 'L' ? ex + 26 : ex - 26;
        g.strokeStyle = `rgba(${LUME},${i === act && !fin ? .9 : .38})`; g.lineWidth = 1;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, ly); g.lineTo(ex, ly); g.stroke();
        const jg = g.createRadialGradient(ax, ay, 0, ax, ay, 10); jg.addColorStop(0, `rgba(${LUME},.9)`); jg.addColorStop(1, `rgba(${LUME},0)`);
        g.fillStyle = jg; g.beginPath(); g.arc(ax, ay, 10, 0, TAU); g.fill();
        g.fillStyle = '#eafff9'; g.beginPath(); g.arc(ax, ay, 2.4, 0, TAU); g.fill();
      }
    });
    xpFinal?.classList.toggle('on', fin);
  }
  const progress = () => { const r = root.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
  const staticDraw = () => { renderXp(.84, mstate(1.13)); tags.forEach(x => x.el.classList.add('on')); };

  let raf = 0;
  function frame(now) {
    const t = now / 1000;
    if (COARSE) { ptr.tx = Math.sin(t * .35) * .55; ptr.ty = Math.sin(t * .27) * .35; }
    ptr.x += (ptr.tx - ptr.x) * .06; ptr.y += (ptr.ty - ptr.y) * .06;
    renderXp(progress(), mstate(t));
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (raf || RM) return; addEventListener('pointermove', onPtr, { passive: true }); raf = requestAnimationFrame(frame); };
  const stop = () => { if (!raf) return; cancelAnimationFrame(raf); raf = 0; removeEventListener('pointermove', onPtr); };
  new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? start() : stop())), { rootMargin: '80px' }).observe(root);

  measureTags();
  let rz = 0;
  new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => { XP.fit(); measureTags(); if (RM) staticDraw(); }, 120); }).observe(root.querySelector('.xp-pin'));
  if (RM) { staticDraw(); M.ready.then(staticDraw); }
});
