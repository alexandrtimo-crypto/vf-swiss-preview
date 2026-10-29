// Источник: DomeGallery (React Bits, MIT + Commons Clause) — переписано на vanilla: pointer events вместо @use-gesture, без полёта плитки при открытии.
// Купол из фото работ: перетаскивание, инерция, горизонтальное колесо/трекпад, стрелки; клик/Enter — фото крупно в <dialog>.
VFKit.register('lib-works-dome', root => {
  const $ = s => root.querySelector(s);
  const stage = $('.lwd__stage'), sphere = $('.lwd__sphere');
  const srcs = [...root.querySelectorAll('.lwd__src img')].map(i => ({ s: i.getAttribute('src'), f: i.dataset.full, a: i.alt }));
  const dlg = $('.lwd__dlg'), dImg = dlg.querySelector('img'), dCap = $('.lwd__cap');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  root.classList.add('is-js');

  let tiles = [], R = 600, rotY = 0, rotX = 0, vel = 0, raf = 0, drag = null, moved = false, idle = true, visible = true, current = 0;
  const wrap = a => ((a + 180) % 360 + 360) % 360 - 180;

  // тайлы: колонки по кругу, соседние колонки сдвинуты по высоте на полплитки (кирпичная кладка)
  function build() {
    const narrow = stage.clientWidth < 640;
    const cols = narrow ? 9 : 12, rows = 2;
    const n = Math.min(srcs.length, cols * rows);
    sphere.textContent = '';
    tiles = [];
    const stepY = 360 / cols, stepP = narrow ? 40 : 36;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const i = c * rows + r;
      if (i >= n) break;
      const pitch = (r - .5) * stepP + (c % 2 ? -stepP / 4 : stepP / 4);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'lwd__tile'; b.tabIndex = -1; b.dataset.i = i; b.setAttribute('aria-label', srcs[i].a + ' — открыть');
      b.style.setProperty('--yaw', c * stepY + 'deg'); b.style.setProperty('--pitch', -pitch + 'deg');
      const im = new Image(); im.src = srcs[i].s; im.alt = ''; im.width = 420; im.height = 560; im.draggable = false;
      b.appendChild(im); sphere.appendChild(b);
      tiles.push({ el: b, yaw: c * stepY, pitch: -pitch, i });
    }
    size();
  }
  function size() {
    const w = stage.clientWidth, h = stage.clientHeight;
    R = Math.round(clamp(Math.min(w * .62, h * 1.05), 330, 760));
    stage.style.setProperty('--r', R + 'px');
    const cols = stage.clientWidth < 640 ? 9 : 12;
    const th = R * (w < 640 ? .6 : .56), tw = Math.min(th * .8, R * 2 * Math.sin(Math.PI / cols) * .92);
    sphere.style.setProperty('--r', R + 'px'); sphere.style.setProperty('--tw', tw + 'px'); sphere.style.setProperty('--th', th + 'px');
    paint();
  }
  const paint = () => { sphere.style.transform = `translateZ(${-R}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`; };
  let lastW = 0;
  new ResizeObserver(() => { const w = stage.clientWidth; if (!lastW || (w < 640) !== (lastW < 640)) { lastW = w; build(); } else { lastW = w; size(); } }).observe(stage);

  // кадр: инерция и медленное вращение в покое
  let last = 0;
  function frame(t) {
    raf = 0;
    const dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
    if (!drag) {
      if (Math.abs(vel) > .02) { rotY = wrap(rotY + vel * dt); vel *= Math.exp(-dt * 3.2); }
      else if (idle && visible && !reduce.matches && !dlg.open) rotY = wrap(rotY - 2.2 * dt);
      rotX *= Math.exp(-dt * 1.2);
      paint();
    }
    if (drag || Math.abs(vel) > .02 || (idle && visible && !reduce.matches && !dlg.open)) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  // перетаскивание
  const degPerPx = () => 57.3 / R * .85;
  stage.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, ry: rotY, rx: rotX, lx: e.clientX, lt: performance.now() };
    moved = false; vel = 0; idle = false;
  });
  stage.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) > 6) { moved = true; stage.classList.add('is-drag'); try { stage.setPointerCapture(e.pointerId); } catch {} }
    if (!moved) return;
    const now = performance.now(), dt = (now - drag.lt) / 1000;
    if (dt > 0) vel = vel * .5 + ((e.clientX - drag.lx) * degPerPx() / dt) * .5;
    drag.lx = e.clientX; drag.lt = now;
    rotY = wrap(drag.ry + dx * degPerPx());
    rotX = clamp(drag.rx - dy * degPerPx() * .4, -8, 8);
    paint();
  });
  const end = e => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const wasMoved = moved;
    drag = null; stage.classList.remove('is-drag');
    if (!wasMoved) { vel = 0; return; }
    if (reduce.matches) vel = 0;
    setTimeout(() => { moved = false; }, 0);
    setTimeout(() => { idle = true; kick(); }, 2500);
    kick();
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  // горизонтальное колесо/трекпад вращает; вертикальный скролл страницы не перехватываем
  stage.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    idle = false; vel = clamp(vel - e.deltaX * degPerPx() * 8, -140, 140);
    clearTimeout(stage.__t); stage.__t = setTimeout(() => { idle = true; kick(); }, 2500);
    kick();
  }, { passive: false });

  // клавиши: стрелки — поворот, Enter — центральное фото
  const front = () => {
    let best = 0, bd = 1e9;
    tiles.forEach((t, k) => { const d = Math.abs(wrap(t.yaw + rotY)) + Math.abs(t.pitch + rotX) * 0.6; if (d < bd) { bd = d; best = k; } });
    return tiles[best] ? tiles[best].i : 0;
  };
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); idle = false;
      vel = clamp(vel + (e.key === 'ArrowLeft' ? 70 : -70), -140, 140); kick();
      clearTimeout(stage.__t); stage.__t = setTimeout(() => { idle = true; kick(); }, 4000);
    } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(front()); }
  });
  stage.addEventListener('click', e => {
    const t = e.target.closest('.lwd__tile');
    if (t && !moved) open(+t.dataset.i);
  });

  // диалог
  function open(i) {
    current = (i + srcs.length) % srcs.length;
    const s = srcs[current];
    dImg.src = s.f || s.s; dImg.alt = s.a;
    dCap.textContent = `Работа мастерской, ${current + 1} из ${srcs.length}`;
    if (!dlg.open) dlg.showModal();
    kick();
  }
  $('.lwd__x').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.classList.contains('lwd__fig')) dlg.close(); });
  dlg.addEventListener('close', () => { idle = true; kick(); stage.focus({ preventScroll: true }); });
  root.querySelector('.lwd__nav--prev').addEventListener('click', () => open(current - 1));
  root.querySelector('.lwd__nav--next').addEventListener('click', () => open(current + 1));
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') open(current - 1);
    else if (e.key === 'ArrowRight') open(current + 1);
  });

  // вращение только пока купол на экране
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }, { threshold: .15 }).observe(stage);
  if (window.VFMotion) VFMotion.scan(root);
  kick();
});
