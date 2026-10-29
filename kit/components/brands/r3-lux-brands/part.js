VFKit.register('r3-lux-brands', root => {
  const box = root.querySelector('[data-box]');
  if (window.R3E) R3E.blank(box, { band: 13, style: 'weave', rosette: 3, rr: 8, wl: 15, view: true, stagger: 40 });
});
