VFKit.register('r3-tech-viewer', root => {
  const dlg = root.querySelector('.r3vw__dlg');
  const box = root.querySelector('.r3vw__media');
  const cap = root.querySelector('.r3vw__cap');
  let items = [], i = 0, opener = null, x0 = null;
  function render() {
    const it = items[i];
    box.textContent = '';
    let m;
    if (it.type === 'vid') {
      m = document.createElement('video');
      Object.assign(m, { src: it.src, muted: true, loop: true, playsInline: true, controls: true, autoplay: !matchMedia('(prefers-reduced-motion: reduce)').matches });
      if (it.poster) m.poster = it.poster;
      m.setAttribute('aria-label', it.alt);
    } else {
      m = document.createElement('img'); m.src = it.src; m.alt = it.alt;
    }
    box.appendChild(m);
    cap.textContent = `${it.alt} — ${i + 1} из ${items.length}`;
  }
  const go = d => { i = (i + d + items.length) % items.length; render(); };
  document.addEventListener('vf:view', e => {
    if (!e.detail?.items?.length) return;
    e.preventDefault();
    items = e.detail.items; i = e.detail.index || 0; opener = e.detail.opener || null;
    render(); dlg.showModal();
  });
  root.querySelector('.r3vw__prev').addEventListener('click', () => go(-1));
  root.querySelector('.r3vw__next').addEventListener('click', () => go(1));
  root.querySelector('.r3vw__close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); });
  dlg.addEventListener('close', () => { box.textContent = ''; opener?.focus(); });
  dlg.addEventListener('pointerdown', e => { x0 = e.clientX; });
  dlg.addEventListener('pointerup', e => { if (x0 !== null && Math.abs(e.clientX - x0) > 50) go(e.clientX < x0 ? 1 : -1); x0 = null; });
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.classList.contains('r3vw__stage')) dlg.close(); });
});
