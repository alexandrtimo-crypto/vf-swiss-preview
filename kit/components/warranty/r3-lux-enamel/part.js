VFKit.register('r3-lux-enamel', root => {
  const E = window.R3E; if (!E) return;
  const host = root.querySelector('[data-ros]');
  const r = E.rosetteSvg({ preset: 1, copiesScale: 2.4, opScale: 0.7, ring: true });
  E.mount(host, r.svg, { px: 0.6 });
  E.etchOnView(r.svg, root, { duration: 2400, stagger: 12, from: 'center' });
});
