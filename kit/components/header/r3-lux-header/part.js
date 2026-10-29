VFKit.register('r3-lux-header', root => {
  // гильоше-эмблема: малая розетка с кольцом
  const mark = root.querySelector('[data-mark]');
  if (mark && window.R3E) {
    const r = R3E.rosetteSvg({ preset: 3, ring: true, copiesScale: 0.8 });
    R3E.mount(mark, r.svg, { px: 0.5 });
  }
  root.querySelector('.r3lh__book')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: {} }));
  });
});
