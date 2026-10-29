// VF kit · r3-lux · гравюра. Генерирует гильоше кодом (SVG): розетки (гипотрохоиды/эпитрохоиды, сотни тонких линий),
// плетёные рамки по контуру (овал, круг, прямоугольник со срезанными углами), микротекст по контуру.
// «Вытравливание» — рисование линий Anime.js (VFMotion.anime()); без JS, при reduced-motion и при ошибке загрузки гравюра видна готовой.
// Подключается: "needs": ["kit/lib/motion.js", "kit/lib/r3lux-engrave.js"].  Цвет линий — currentColor.
window.R3E = window.R3E || (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;
  let uid = 0;
  const r1 = n => Math.round(n * 10) / 10;
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const pathD = (pts, close) => {
    let s = 'M' + r1(pts[0][0]) + ' ' + r1(pts[0][1]);
    for (let i = 1; i < pts.length; i++) s += ' ' + r1(pts[i][0]) + ' ' + r1(pts[i][1]);
    return close ? s + 'Z' : s;
  };
  const E = 'data-etch pathLength="1"'; // метка линии, которую рисует etch()

  // ── Трохоиды: одна кривая нормирована на радиус rad ──
  function trochoid(R, r, d, rad, kind) {
    const g = gcd(R, r), turns = r / g, k = R / g;
    const n = Math.min(900, Math.max(260, Math.round(34 * k * turns)));
    const epi = kind === 'epi';
    const A = epi ? R + r : R - r;
    const ext = Math.abs(A) + d;
    const sc = rad / ext, pts = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * TAU * turns;
      const q = (A / r) * t;
      pts.push(epi
        ? [A * Math.cos(t) - d * Math.cos(q), A * Math.sin(t) - d * Math.sin(q)]
        : [A * Math.cos(t) + d * Math.cos(q), A * Math.sin(t) - d * Math.sin(q)]);
    }
    return { pts: pts.map(p => [p[0] * sc, p[1] * sc]), k };
  }

  // ── Розетка: слои (R, r, d, kind, rad, copies, op); копии кривой повёрнуты внутри одного сектора симметрии ──
  // Возвращает { defs, body, lines } — строки SVG-разметки (внутри viewBox вокруг cx, cy)
  function rosette({ cx = 500, cy = 500, layers, sw = 0.6 }) {
    const id = 'r3e' + (++uid);
    let defs = '', body = '', lines = 0;
    layers.forEach((L, li) => {
      const t = trochoid(L.R, L.r, L.d, L.rad, L.kind);
      const pid = id + 'p' + li;
      defs += `<path id="${pid}" pathLength="1" d="${pathD(t.pts.map(p => [p[0] + cx, p[1] + cy]), true)}"/>`;
      const n = L.copies || 24, step = 360 / (t.k * n);
      let g = `<g stroke-opacity="${L.op ?? 0.8}">`;
      for (let i = 0; i < n; i++) g += `<use data-etch href="#${pid}" transform="rotate(${r1(i * step * 10) / 10} ${cx} ${cy})"/>`;
      body += g + '</g>';
      lines += n;
    });
    return { defs, body, lines };
  }

  // ── Контуры: равномерно по длине дуги ──
  function resample(poly, N) {
    const m = poly.length, segs = [];
    let L = 0;
    for (let i = 0; i < m; i++) { const a = poly[i], b = poly[(i + 1) % m]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push(l); L += l; }
    const out = [];
    let si = 0, acc = 0;
    for (let i = 0; i < N; i++) {
      const s = (i / N) * L;
      while (acc + segs[si] < s && si < m - 1) { acc += segs[si]; si++; }
      const a = poly[si], b = poly[(si + 1) % m], u = segs[si] ? (s - acc) / segs[si] : 0;
      out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
    }
    return { pts: out, len: L };
  }
  const ellipsePoly = (cx, cy, rx, ry, n = 360) => Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * TAU - Math.PI / 2), cy + ry * Math.sin((i / n) * TAU - Math.PI / 2)]);
  const rectPoly = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const archPoly = (x, y, w, h, n = 120) => {
    const r = w / 2, pts = [[x, y + h], [x, y + r]];
    for (let i = 1; i < n; i++) { const a = Math.PI + (i / n) * Math.PI; pts.push([x + r + r * Math.cos(a), y + r + r * Math.sin(a)]); }
    pts.push([x + w, y + r], [x + w, y + h]);
    return pts;
  };
  const chamferPoly = (x, y, w, h, c) => [[x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c]];

  function normals(pts) {
    const n = pts.length;
    let area = 0;
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    const sg = area > 0 ? 1 : -1, w = 3;
    return pts.map((_, i) => {
      const a = pts[(i - w + n) % n], b = pts[(i + w) % n];
      const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
      return [(sg * ty) / l, (-sg * tx) / l];
    });
  }
  // сдвиг контура по нормали (внешняя сторона — положительное d)
  function offsetPts(base, nrm, d) { return base.map((p, i) => [p[0] + nrm[i][0] * d, p[1] + nrm[i][1] * d]); }

  // Открытая линия (нить): равномерная выборка и плетёная лента вдоль неё; на концах амплитуда сходит на нет
  function weaveOpen(poly, { wl = 24, amp = 4, m = 3, mod = 0.25, f2 = 3, phase = 0, step = 2, taper = 40 } = {}) {
    const segs = []; let L = 0;
    for (let i = 0; i < poly.length - 1; i++) { const l = Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1]); segs.push(l); L += l; }
    const N = Math.max(4, Math.round(L / step)), pts = [];
    let si = 0, acc = 0;
    for (let i = 0; i <= N; i++) {
      const sd = (i / N) * L;
      while (acc + segs[si] < sd && si < segs.length - 1) { acc += segs[si]; si++; }
      const a = poly[si], b = poly[si + 1], u = segs[si] ? (sd - acc) / segs[si] : 0;
      pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
    }
    const nrm = pts.map((_, i) => { const a = pts[Math.max(0, i - 2)], b = pts[Math.min(N, i + 2)]; const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; return [ty / l, -tx / l]; });
    const lines = [];
    for (let k = 0; k < m; k++) {
      lines.push(pts.map((p, i) => {
        const sd = (i / N) * L, tp = Math.min(1, sd / taper, (L - sd) / taper);
        const env = (1 + mod * Math.sin((TAU * f2 * sd) / L + k)) * tp;
        const o = amp * env * Math.sin((TAU * sd) / wl + phase + (TAU * k) / m);
        return [p[0] + nrm[i][0] * o, p[1] + nrm[i][1] * o];
      }));
    }
    return { lines, len: L };
  }

  // ── Плетёная лента по контуру: m волн со сдвигом фаз, частота f, амплитуда amp, плавающая огибающая ──
  function weave(poly, { f = 40, amp = 8, m = 4, N = 900, mod = 0.3, f2 = 7, center = 0, phase = 0, wl = 0 }) {
    const { pts, len } = resample(poly, N), nrm = normals(pts);
    if (wl) f = Math.max(2, Math.round(len / wl)); // длина волны в единицах контура — число волн целое, лента замыкается без шва
    const out = [];
    for (let k = 0; k < m; k++) {
      const line = pts.map((p, i) => {
        const s = i / N;
        const env = 1 + mod * Math.sin(TAU * f2 * s + k * 0.9);
        const o = center + amp * env * Math.sin(TAU * f * s + phase + (TAU * k) / m);
        return [p[0] + nrm[i][0] * o, p[1] + nrm[i][1] * o];
      });
      out.push(line);
    }
    return { lines: out, len, base: pts, nrm };
  }
  const weaveSvg = (w, op = 0.85, extra = '') => w.lines.map(l => `<path ${E} ${extra} stroke-opacity="${op}" d="${pathD(l, true)}"/>`).join('');
  const ruleSvg = (pts, op = 1, extra = '') => `<path ${E} ${extra} stroke-opacity="${op}" d="${pathD(pts, true)}"/>`;

  // ── Микротекст по контуру (путь — с id). Размер шрифта — переменная --r3e-fs (единицы viewBox), число повторов и подгонку делает fitMicro() ──
  const MICRO = 'VF SWISS · ПЕТРОВКА 23/10 · ДИАГНОСТИКА БЕСПЛАТНО · ';
  const microText = (pathId, unit, extra = '') => `<text class="r3e-micro" ${extra}><textPath href="#${pathId}" data-unit="${unit}">${unit}</textPath></text>`;
  function fitMicro(svg) {
    svg.querySelectorAll('.r3e-micro').forEach(t => {
      const tp = t.querySelector('textPath'); if (!tp) return;
      const path = svg.querySelector(tp.getAttribute('href')); if (!path) return;
      try {
        const unit = tp.dataset.unit;
        tp.removeAttribute('textLength'); tp.textContent = unit;
        const one = t.getComputedTextLength(), len = path.getTotalLength();
        if (!one || !len) return;
        const n = Math.max(1, Math.round(len / one));
        tp.textContent = unit.repeat(n);
        tp.setAttribute('textLength', r1(len - 0.5)); tp.setAttribute('lengthAdjust', 'spacing');
      } catch (e) {}
    });
  }
  // толщина линии и кегль микротекста в экранных пикселях (viewBox масштабируется вместе с картинкой)
  function fit(svg, { px = 0.6, fs = 5 } = {}) {
    const w = svg.getBoundingClientRect().width; if (!w) return;
    const k = svg.viewBox.baseVal.width / w;
    svg.style.strokeWidth = String(Math.round(px * k * 100) / 100);
    svg.style.setProperty('--r3e-fs', Math.round(fs * k * 100) / 100 + 'px');
    fitMicro(svg);
  }
  // вставляет svg в контейнер и подгоняет под размер; следит за изменением размера
  function mount(host, svg, o = {}) {
    host.appendChild(svg);
    fit(svg, o);
    if ('ResizeObserver' in window) { let w0 = svg.getBoundingClientRect().width; new ResizeObserver(() => { const w = svg.getBoundingClientRect().width; if (Math.abs(w - w0) > 1) { w0 = w; fit(svg, o); } }).observe(svg); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fit(svg, o));
    return svg;
  }
  if (!document.getElementById('r3e-style')) {
    const st = document.createElement('style'); st.id = 'r3e-style';
    st.textContent = '.r3e-micro{font-family:var(--vf-font-text,sans-serif);font-weight:600;letter-spacing:.14em;font-size:var(--r3e-fs,6px)}.r3e{display:block;overflow:visible}';
    document.head.appendChild(st);
  }

  // ── Разметка контейнера svg ──
  const svgEl = (w, h, inner, cls = '') => {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', `0 0 ${w} ${h}`);
    s.setAttribute('class', 'r3e ' + cls);
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1');
    s.innerHTML = inner;
    return s;
  };

  // ── Вытравливание: рисование линий ──
  const reduced = () => !window.VFMotion || (window.VFMotion.reduced ? window.VFMotion.reduced() : matchMedia('(prefers-reduced-motion: reduce)').matches);
  const hide = els => els.forEach(e => { e.style.strokeDasharray = '1'; e.style.strokeDashoffset = '1'; });
  const clear = els => els.forEach(e => { e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; });
  function run(els, o = {}) {
    if (!els.length) return Promise.resolve();
    hide(els);
    const bail = setTimeout(() => clear(els), (o.duration || 2400) + (o.stagger || 14) * els.length + 4000);
    return window.VFMotion.anime().then(a => new Promise(res => {
      a.animate(els, {
        strokeDashoffset: [1, 0],
        duration: o.duration || 2400,
        delay: a.stagger(o.stagger ?? 14, { from: o.from || 'first' }),
        ease: o.ease || 'outExpo',
        onComplete: () => { clearTimeout(bail); clear(els); res(); },
      });
    })).catch(() => { clearTimeout(bail); clear(els); });
  }
  const linesOf = svg => [...svg.querySelectorAll('[data-etch]')];
  // сразу (первый экран) или когда сцена входит в кадр; возвращает Promise
  function etch(svg, o = {}) {
    if (reduced()) return Promise.resolve();
    return run(linesOf(svg), o);
  }
  function etchOnView(svg, host, o = {}) {
    if (reduced() || !('IntersectionObserver' in window)) return;
    const r = host.getBoundingClientRect();
    if (r.top < innerHeight * 0.9 && r.bottom > 0) { etch(svg, o); return; }
    const els = linesOf(svg); hide(els); // пока вне кадра — спрятана (если анимация не взлетит, clear() вернёт линии)
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect(); run(els, o);
    }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(host);
  }

  // ── Готовые узоры ──
  // Наборы слоёв розетки (rad — доля внешнего радиуса). 0 — первый экран (лепестковое кольцо), 1 — эмаль, дальше — малые «серийные» розетки
  const PRESETS = [
    [{ R: 5, r: 3, d: 4.2, kind: 'hypo', rad: 1, copies: 14, op: 0.85 }, { R: 7, r: 3, d: 5, kind: 'hypo', rad: 0.72, copies: 12, op: 0.8 }, { R: 9, r: 5, d: 7.4, kind: 'hypo', rad: 0.5, copies: 9, op: 0.7 }],
    [{ R: 10, r: 3, d: 6.5, kind: 'epi', rad: 1, copies: 7, op: 0.9 }, { R: 7, r: 2, d: 3, kind: 'hypo', rad: 0.6, copies: 12, op: 0.75 }],
    [{ R: 7, r: 2, d: 5.5, kind: 'hypo', rad: 1, copies: 10, op: 0.9 }],
    [{ R: 11, r: 3, d: 7, kind: 'hypo', rad: 1, copies: 8, op: 0.9 }],
    [{ R: 13, r: 5, d: 8, kind: 'hypo', rad: 1, copies: 6, op: 0.9 }, { R: 9, r: 4, d: 5, kind: 'hypo', rad: 0.7, copies: 8, op: 0.8 }, { R: 5, r: 2, d: 2.4, kind: 'hypo', rad: 0.38, copies: 10, op: 0.8 }],
    [{ R: 6, r: 1, d: 4.8, kind: 'hypo', rad: 1, copies: 12, op: 0.9 }],
    [{ R: 9, r: 2, d: 7, kind: 'hypo', rad: 1, copies: 8, op: 0.9 }, { R: 5, r: 2, d: 3, kind: 'hypo', rad: 0.64, copies: 10, op: 0.8 }],
  ];
  // Розетка во весь квадрат: ring — кольцевая лента снаружи
  function rosetteSvg({ size = 1000, preset = 0, ring = true, sw = 0.7, copiesScale = 1, opScale = 1 } = {}) {
    const c = size / 2, R0 = size * (ring ? 0.435 : 0.47);
    const P = PRESETS[preset % PRESETS.length].map(l => ({ ...l, rad: l.rad * R0, copies: Math.max(5, Math.round(l.copies * copiesScale)), op: l.op * opScale }));
    const ro = rosette({ cx: c, cy: c, layers: P, sw });
    let body = ro.body, defs = ro.defs, lines = ro.lines;
    if (ring) {
      const poly = ellipsePoly(c, c, size * 0.468, size * 0.468);
      const w = weave(poly, { f: 56, amp: size * 0.011, m: 3, N: 1100, mod: 0.35, f2: 5 });
      body += `<g>${weaveSvg(w, 0.9)}${ruleSvg(offsetPts(w.base, w.nrm, size * 0.024), 0.95)}${ruleSvg(offsetPts(w.base, w.nrm, -size * 0.024), 0.95)}</g>`;
      lines += w.lines.length + 2;
    }
    return { svg: svgEl(size, size, `<defs>${defs}</defs>${body}`, 'r3e-ros'), lines };
  }

  // Рамка-гравюра вокруг фото: shape 'oval' | 'circle' | 'chamfer'; размер — по соотношению сторон aspect (w/h), ширина 1000
  function frameSvg({ aspect = 1, shape = 'oval', band = 40, f = 36, m = 4, sw = 1, micro = true, text = MICRO, seed = 0 } = {}) {
    const W = 1000, H = r1(W / aspect), pad = band + 4;
    let poly;
    if (shape === 'chamfer') poly = chamferPoly(pad, pad, W - pad * 2, H - pad * 2, Math.min(W, H) * 0.14);
    else if (shape === 'arch') poly = archPoly(pad, pad, W - pad * 2, H - pad * 2);
    else poly = ellipsePoly(W / 2, H / 2, W / 2 - pad, H / 2 - pad, 480);
    const wv = weave(poly, { f, amp: band * 0.34, m, N: 1000, mod: 0.3, f2: 5 + seed, phase: seed });
    const rules = [offsetPts(wv.base, wv.nrm, band * 0.52), offsetPts(wv.base, wv.nrm, band * 0.64), offsetPts(wv.base, wv.nrm, -band * 0.52), offsetPts(wv.base, wv.nrm, -band * 0.64)];
    let defs = '', mt = '';
    if (micro) {
      const mp = offsetPts(wv.base, wv.nrm, band * 0.8);
      defs = `<path id="r3e-mt${++uid}" d="${pathD(mp, true)}"/>`;
      mt = microText('r3e-mt' + uid, text, 'fill="currentColor" stroke="none" opacity=".85"');
    }
    const inner = `<defs>${defs}</defs><g>${weaveSvg(wv, 0.9)}${rules.map((r, i) => ruleSvg(r, i % 2 ? 0.6 : 1)).join('')}</g>${mt}`;
    // посадка фото внутрь внутренней линейки: отступы в процентах и контур среза
    const d = pad + band * 0.64 + 2, iw = W - 2 * d, ih = H - 2 * d;
    const c0 = Math.min(W - 2 * pad, H - 2 * pad) * 0.14, ci = Math.max(4, c0 - 0.586 * (band * 0.64 + 2));
    const cx = r1((ci / iw) * 100), cy = r1((ci / ih) * 100);
    const clip = shape === 'chamfer' ? `polygon(${cx}% 0,${100 - cx}% 0,100% ${cy}%,100% ${100 - cy}%,${100 - cx}% 100%,${cx}% 100%,0 ${100 - cy}%,0 ${cy}%)` : '';
    const vy = r1(((iw / 2) / ih) * 100);
    const radius = shape === 'arch' ? `50% 50% 0 0 / ${vy}% ${vy}% 0 0` : shape === 'chamfer' ? '0' : '50%';
    return { svg: svgEl(W, H, inner, 'r3e-frame'), W, H, radius, lines: wv.lines.length + 4, inset: { x: r1((d / W) * 100), y: r1((d / H) * 100) }, clip };
  }

  // Бланк: рамка в пикселях контейнера — внешняя и внутренняя линейки, между ними микротекст, угловые розетки
  function blankSvg(w, h, o = {}) {
    const { band = 14, text = MICRO, corner = true, sw = 0.8, style = 'micro', cut = 0, rosette: rp = 0, rr = 11 } = o;
    const id = 'r3e-b' + (++uid);
    const q = 0.5, i = band + 0.5, m = band / 2 + 0.5;
    const poly = (k, c) => (c ? chamferPoly(k, k, w - 2 * k, h - 2 * k, Math.max(2, c - k * 0.58)) : rectPoly(k, k, w - 2 * k, h - 2 * k));
    const outer = pathD(poly(q, cut), true), inner = pathD(poly(i, cut), true);
    let mid = '';
    if (style === 'weave') {
      const wv = weave(poly(m, cut), { wl: o.wl || 15, amp: band * 0.2, m: 3, N: Math.max(300, Math.round((2 * (w + h)) / 2.2)), mod: 0.25, f2: 3 });
      mid = wv.lines.map(l => `<path ${E} stroke-opacity=".8" d="${pathD(l, true)}"/>`).join('');
    } else {
      mid = `<path id="${id}" d="${pathD(poly(m, cut), true)}" stroke="none"/>${microText(id, text, 'fill="currentColor" stroke="none" opacity=".7"')}`;
    }
    let cs = '';
    if (corner && !cut) {
      [[band, band], [w - band, band], [w - band, h - band], [band, h - band]].forEach(([x, y]) => {
        const ro = rosette({ cx: x, cy: y, layers: [{ ...PRESETS[rp % PRESETS.length][0], rad: rr, copies: 7, op: 0.9 }] });
        cs += `<circle cx="${x}" cy="${y}" r="${rr + 2}" stroke="none" style="fill:var(--r3e-paper,#e6ece4)"/><defs>${ro.defs}</defs><g stroke-width="${o.cw || 0.5}">${ro.body}</g>`;
      });
    }
    const inn = `<g><path ${E} d="${outer}"/><path ${E} d="${inner}"/></g>${mid}${cs}`;
    const s = svgEl(w, h, inn, 'r3e-blank');
    s.setAttribute('width', w); s.setAttribute('height', h);
    s.style.strokeWidth = String(sw); s.style.setProperty('--r3e-fs', (o.fs || 5.2) + 'px');
    return s;
  }
  // Вешает рамку-бланк на контейнер (position: relative); пересобирает при изменении размера; первый раз вытравливает
  function blank(host, o = {}) {
    let cur = null, first = true, lastW = 0, lastH = 0;
    const holder = document.createElement('span');
    holder.className = 'r3e-blank-host'; holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;color:inherit';
    host.prepend(holder);
    const build = () => {
      const w = Math.round(host.clientWidth), h = Math.round(host.clientHeight);
      if (!w || !h || (w === lastW && h === lastH)) return;
      lastW = w; lastH = h;
      const s = blankSvg(w, h, o);
      holder.replaceChildren(s);
      fitMicro(s);
      if (first) { first = false; const eo = { duration: 1800, stagger: o.stagger ?? 90 }; if (o.view) etchOnView(s, host, eo); else etch(s, eo); }
      cur = s;
    };
    const fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
    fonts.then(() => { build(); if ('ResizeObserver' in window) new ResizeObserver(build).observe(host); });
    return { rebuild() { lastW = 0; build(); } };
  }

  return { PRESETS, weaveOpen, rectPoly, archPoly, fit, mount, rosette, rosetteSvg, frameSvg, blankSvg, blank, weave, weaveSvg, ruleSvg, ellipsePoly, chamferPoly, offsetPts, resample, pathD, microText, fitMicro, svgEl, etch, etchOnView, MICRO, NS, E };
})();
