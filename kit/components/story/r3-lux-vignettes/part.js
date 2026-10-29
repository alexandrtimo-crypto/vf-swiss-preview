VFKit.register('r3-lux-vignettes', root => {
  const E = window.R3E; if (!E) return;
  root.querySelectorAll('.r3lv__f').forEach((fig, i) => {
    const shape = fig.dataset.shape, aspect = parseFloat(fig.dataset.aspect) || 1;
    const fw = fig.querySelector('.r3lv__fw'), ph = fig.querySelector('.r3lv__ph'), host = fig.querySelector('[data-fr]');
    fw.style.setProperty('--asp', aspect);
    const kind = shape === 'circle' ? 'oval' : shape;
    const fr = E.frameSvg({ aspect, shape: kind, band: shape === 'chamfer' ? 34 : 40, f: [34, 28, 40, 30][i % 4], m: [4, 3, 4, 3][i % 4], seed: i, text: E.MICRO });
    E.mount(host, fr.svg, { px: 0.7, fs: 4.2 });
    ph.style.inset = `${fr.inset.y}% ${fr.inset.x}%`;
    ph.style.clipPath = fr.clip || 'none';
    ph.style.borderRadius = fr.radius;
    E.etchOnView(fr.svg, fig, { duration: 2200, stagger: 160 });
  });
});
