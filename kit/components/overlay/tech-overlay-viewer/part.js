/* Полноэкранный просмотрщик снимков. Слушает vf:viewer { items:[{src,alt}], index }.
   Касание — увеличить в точке, листание свайпом или стрелками. */
VFKit.register('tech-overlay-viewer', root => {
  const vImg = root.querySelector('.viewer-img'), vScroll = root.querySelector('.viewer-scroll');
  let list = [], vi = 0;
  function setViewer(i) {
    if (!list.length) return;
    vi = (i + list.length) % list.length;
    vImg.src = list[vi].src; vImg.alt = list[vi].alt || ''; root.classList.remove('zoom');
  }
  document.addEventListener('vf:viewer', e => {
    const d = e.detail || {};
    if (!Array.isArray(d.items) || !d.items.length) return;
    e.preventDefault();
    list = d.items; setViewer(d.index || 0);
    if (typeof root.showModal === 'function') { if (!root.open) root.showModal(); } else root.setAttribute('open', '');
  });
  vImg.addEventListener('click', e => {
    if (root.classList.contains('zoom')) { root.classList.remove('zoom'); return; }
    const r = vImg.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    root.classList.add('zoom');
    requestAnimationFrame(() => {
      const W = vImg.offsetWidth, H = vImg.offsetHeight;
      vScroll.scrollLeft = fx * W - vScroll.clientWidth / 2; vScroll.scrollTop = fy * H - vScroll.clientHeight / 2;
    });
  });
  const close = () => { if (typeof root.close === 'function') root.close(); else root.removeAttribute('open'); };
  root.querySelector('.v-close').addEventListener('click', close);
  root.querySelector('.v-prev').addEventListener('click', () => setViewer(vi - 1));
  root.querySelector('.v-next').addEventListener('click', () => setViewer(vi + 1));
  root.addEventListener('keydown', e => { if (e.key === 'ArrowRight') setViewer(vi + 1); if (e.key === 'ArrowLeft') setViewer(vi - 1); });
  let tx0 = null;
  vScroll.addEventListener('touchstart', e => { tx0 = root.classList.contains('zoom') ? null : e.touches[0].clientX; }, { passive: true });
  vScroll.addEventListener('touchend', e => {
    if (tx0 === null) return; const dx = e.changedTouches[0].clientX - tx0;
    if (Math.abs(dx) > 60) setViewer(vi + (dx < 0 ? 1 : -1)); tx0 = null;
  });
});
