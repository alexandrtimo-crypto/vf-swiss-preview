VFKit.register('r3-lux-denominations', root => {
  const E = window.R3E;
  root.querySelectorAll('.r3ld__c').forEach((c, i) => {
    // нажатие на купон — «записаться» с названием услуги
    const go = c.querySelector('.r3ld__go');
    const book = () => document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: { symptom: go.dataset.symptom } }));
    go.addEventListener('click', e => { e.stopPropagation(); book(); });
    c.addEventListener('click', e => { if (!e.target.closest('a,button')) { document.dispatchEvent(new CustomEvent('vf:sound', { detail: { name: 'click' } })); book(); } });
    if (!E) return;
    // своя гравированная рамка и розетка у каждого купона
    const host = c.querySelector('[data-fr]');
    const opts = { band: c.dataset.style === 'weave' ? 12 : 13, style: c.dataset.style, cut: +c.dataset.cut, rosette: +c.dataset.rosette, rr: 9, wl: 13 + (i % 3) * 2, fs: 4.8 };
    let first = true;
    const build = () => {
      const w = Math.round(c.clientWidth), h = Math.round(c.clientHeight);
      if (!w || !h) return;
      if (host.__w === w && host.__h === h) return;
      host.__w = w; host.__h = h;
      const s = E.blankSvg(w, h, opts);
      host.replaceChildren(s);
      E.fitMicro(s);
      if (first) { first = false; E.etchOnView(s, c, { duration: 1700, stagger: 130 }); }
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
      build();
      if ('ResizeObserver' in window) new ResizeObserver(build).observe(c);
    });
  });
});
