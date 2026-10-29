// easy-story: просмотр историй. Открывается vf:story { group, slide? }; сообщает vf:story-seen { group }. Демо: ?demo=story.
VFKit.register('easy-story', root => {
  const ID = 'easy-story';
  const $ = (s, r = root) => r.querySelector(s);
  const DEMO = new URLSearchParams(location.search).get('demo');
  const M = '{{media}}/';
  const STORIES = [
    { t: 'Механизм', s: [
      { v: M + 'vid/ex_4.mp4', p: M + 'vid/ex_4.webp', c: 'Механизм на верстаке мастера' },
      { i: M + 'img/ex_3.webp', c: 'Ремонт и обслуживание механизма' },
      { i: M + 'img/ex_2.webp', c: 'Ювелирная точность — в каждой мелочи' }] },
    { t: 'Разбор', s: [
      { i: M + 'img/ex_19.webp', c: 'Полная разборка: каждая деталь на виду' },
      { i: M + 'img/ex_5.webp', c: 'Механизм в разборе' },
      { v: M + 'vid/ex_9.mp4', p: M + 'vid/ex_9.webp', c: 'Обслуживание механизма' }] },
    { t: 'Проверка', s: [
      { i: M + 'img/ex_33.webp', c: 'Таймграфер проверяет точность хода' },
      { i: M + 'img/ex_32.webp', c: 'Под микроскопом видно каждое колесо', blur: 1 }] },
    { t: 'Стекло', s: [
      { v: M + 'vid/ex_16.mp4', p: M + 'vid/ex_16.webp', c: 'Замена стекла' },
      { v: M + 'vid/ex_10.mp4', p: M + 'vid/ex_10.webp', c: 'Сапфировые, минеральные и нестандартные стёкла' }] },
    { t: 'Браслеты', s: [
      { i: M + 'img/ex_12.webp', c: 'Ремешки и браслеты' },
      { i: M + 'img/ex_13.webp', c: 'Браслет в работе' },
      { v: M + 'vid/ex_14.mp4', p: M + 'vid/ex_14.webp', c: 'Ремешки меняем и изготавливаем' }] },
    { t: 'Работы', s: [
      { i: M + 'img/face_2.webp', c: 'Работы мастерской' },
      { i: M + 'img/face_1.webp', c: 'Работы мастерской' },
      { v: M + 'vid/ex_18.mp4', p: M + 'vid/ex_18.webp', c: 'Работы мастерской' },
      { i: M + 'img/face_4.webp', c: 'Работы мастерской' }] }
  ];

  const modal = {
    list: () => (document.body.dataset.vfModals || '').split(' ').filter(Boolean),
    set(l) {
      if (l.length) document.body.dataset.vfModals = l.join(' '); else delete document.body.dataset.vfModals;
      document.body.style.overflow = l.length ? 'hidden' : '';
      document.dispatchEvent(new CustomEvent('vf:overlay', { detail: { id: ID, open: l.includes(ID) } }));
    },
    open() { modal.set([...modal.list().filter(x => x !== ID), ID]); },
    close() { modal.set(modal.list().filter(x => x !== ID)); },
    top: () => modal.list().slice(-1)[0] === ID
  };

  const story = root, bars = $('.story__bars'), media = $('.story__media'), cap = $('.story__cap'), closeBtn = $('[data-close]');
  let g = 0, si = 0, timer = 0, t0 = 0, dur = 5000, paused = false, pausedAt = 0, vid = null, opener = null;

  function openStory(group, slide = 0) {
    if (story.hidden) { opener = document.activeElement; story.hidden = false; modal.open(); }
    show(group, slide);
    closeBtn.focus({ preventScroll: true });
  }
  function closeStory() {
    cancelAnimationFrame(timer); if (vid) vid.pause();
    media.innerHTML = '';
    story.hidden = true; modal.close();
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  }
  function show(group, slide) {
    g = group; si = slide;
    const G = STORIES[g], S = G.s[si];
    document.dispatchEvent(new CustomEvent('vf:story-seen', { detail: { group: g } }));
    $('.story__title').textContent = G.t;
    bars.innerHTML = G.s.map((_, i) => `<span class="${i < si ? 'done' : ''}"><i></i></span>`).join('');
    cancelAnimationFrame(timer); if (vid) vid.pause(); vid = null;
    media.innerHTML = '';
    if (S.v) {
      vid = document.createElement('video');
      Object.assign(vid, { src: S.v, poster: S.p, muted: true, playsInline: true, autoplay: !DEMO, preload: 'auto' });
      vid.setAttribute('playsinline', ''); vid.setAttribute('aria-label', S.c);
      media.appendChild(vid);
      dur = 8000;
      vid.addEventListener('loadedmetadata', () => { dur = Math.min(12, vid.duration || 8) * 1000; });
      vid.play && vid.play().catch(() => {});
    } else {
      const im = new Image(); im.src = S.i; im.alt = S.c;
      if (S.blur) im.style.filter = 'blur(1.2px) saturate(1.1)';
      media.appendChild(im); dur = 5000;
    }
    cap.textContent = S.c;
    cap.style.animation = 'none'; void cap.offsetWidth; cap.style.animation = '';
    t0 = performance.now(); paused = false;
    if (DEMO === 'story') { $('i', bars.children[si]).style.width = '45%'; return; }
    tick();
  }
  function tick() {
    timer = requestAnimationFrame(now => {
      if (paused) return tick();
      const p = vid && vid.duration ? vid.currentTime / Math.min(12, vid.duration) : (now - t0) / dur;
      const bar = bars.children[si] && $('i', bars.children[si]);
      if (bar) bar.style.width = Math.min(100, p * 100) + '%';
      if (p >= 1) return go(1);
      tick();
    });
  }
  function go(d) {
    const G = STORIES[g];
    if (si + d >= 0 && si + d < G.s.length) return show(g, si + d);
    if (d > 0 && g + 1 < STORIES.length) return show(g + 1, 0);
    if (d < 0 && g > 0) return show(g - 1, STORIES[g - 1].s.length - 1);
    if (d < 0) return show(g, 0);
    closeStory();
  }
  root.querySelectorAll('[data-go]').forEach(el => {
    el.addEventListener('click', () => go(+el.dataset.go));
    // удержание = пауза
    el.addEventListener('pointerdown', () => { paused = true; pausedAt = performance.now(); if (vid) vid.pause(); });
    el.addEventListener('pointerup', () => { if (paused) { t0 += performance.now() - pausedAt; paused = false; if (vid) vid.play().catch(() => {}); } });
  });
  closeBtn.addEventListener('click', closeStory);
  story.addEventListener('click', e => { if (e.target === story) closeStory(); });
  // свайп вниз — закрыть
  let sy0 = null;
  story.addEventListener('touchstart', e => { sy0 = e.touches[0].clientY; }, { passive: true });
  story.addEventListener('touchend', e => { if (sy0 != null && e.changedTouches[0].clientY - sy0 > 90) closeStory(); sy0 = null; });
  document.addEventListener('keydown', e => {
    if (story.hidden || !modal.top()) return;
    if (e.key === 'Escape') closeStory();
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'Tab') {
      const f = [...story.querySelectorAll('button')].filter(x => x.offsetParent !== null);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('vf:story', e => {
    const d = e.detail || {};
    const grp = Math.max(0, Math.min(STORIES.length - 1, +d.group || 0));
    e.preventDefault();
    openStory(grp, +d.slide || 0);
  });

  if (DEMO === 'story') openStory(1, 0);
});
