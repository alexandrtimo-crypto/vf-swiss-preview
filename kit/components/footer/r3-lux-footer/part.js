VFKit.register('r3-lux-footer', root => {
  const mark = root.querySelector('[data-mark]');
  if (mark && window.R3E) R3E.mount(mark, R3E.rosetteSvg({ preset: 3, ring: true, copiesScale: 1.1 }).svg, { px: 0.5 });
});
