VFKit.register('r3-lux-serials', root => {
  const E = window.R3E; if (!E) return;
  const wrap = root.querySelector('.r3ls__wrap');
  const svg = root.querySelector('[data-thread]');
  const nos = [...root.querySelectorAll('.r3ls__no')];
  let key = '', first = true;
  // нить через центры номеров: плавная кривая (Катмулл — Ром) и плетёная лента вдоль неё
  const curve = pts => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let t = 0; t < 1; t += 0.05) {
        const t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  function build() {
    const wr = wrap.getBoundingClientRect();
    const vertical = matchMedia('(max-width: 980px)').matches;
    const pts = nos.map(n => { const r = n.getBoundingClientRect(); return vertical ? [r.left - wr.left + r.width / 2, r.top - wr.top + r.height / 2] : [r.left - wr.left + r.width / 2, r.top - wr.top + r.height / 2]; });
    const k = pts.map(p => p.map(Math.round)).join() + wr.width + wr.height;
    if (k === key) return; key = k;
    const w = Math.round(wr.width), h = Math.round(wr.height);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('width', w); svg.setAttribute('height', h);
    // нить заходит чуть левее первого номера и правее последнего
    const a = pts[0], b = pts[pts.length - 1];
    const path = [[a[0] - (vertical ? 0 : 60), a[1] - (vertical ? 40 : 0)], ...pts, [b[0] + (vertical ? 0 : 90), b[1] + (vertical ? 40 : 0)]];
    const wv = E.weaveOpen(curve(path), { wl: 26, amp: 4.6, m: 3, mod: 0.3, taper: 60, step: 2 });
    svg.style.strokeWidth = '0.8'; svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    svg.innerHTML = wv.lines.map(l => `<path data-etch pathLength="1" stroke-opacity=".8" d="${E.pathD(l, false)}"/>`).join('');
    if (first) { first = false; E.etchOnView(svg, root, { duration: 2800, stagger: 220, ease: 'inOutQuad' }); }
  }
  const go = () => requestAnimationFrame(build);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go);
  if ('ResizeObserver' in window) new ResizeObserver(go).observe(wrap);
});
