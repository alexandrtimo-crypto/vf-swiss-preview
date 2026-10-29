VFKit.register('fd-lux-hero', root => {
  // минутная дорожка безеля: 60 рисок, каждая пятая длиннее
  const svg = root.querySelector('.fd-lux-hero__track');
  const NS = 'http://www.w3.org/2000/svg';
  const ring = document.createElementNS(NS, 'circle');
  ring.setAttribute('cx', 100); ring.setAttribute('cy', 100); ring.setAttribute('r', 99.2);
  svg.appendChild(ring);
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, h = i % 5 === 0;
    const r1 = h ? 92.5 : 95, r2 = 98;
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', (100 + r1 * Math.sin(a)).toFixed(2)); l.setAttribute('y1', (100 - r1 * Math.cos(a)).toFixed(2));
    l.setAttribute('x2', (100 + r2 * Math.sin(a)).toFixed(2)); l.setAttribute('y2', (100 - r2 * Math.cos(a)).toFixed(2));
    if (h) l.setAttribute('class', 'h');
    l.style.setProperty('--i', i);
    svg.appendChild(l);
  }
  const v = root.querySelector('video');
  if (v && !matchMedia('(prefers-reduced-motion: reduce)').matches) { v.play().catch(() => {}); }
  root.querySelectorAll('[data-book]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: {} }));
  }));
});
