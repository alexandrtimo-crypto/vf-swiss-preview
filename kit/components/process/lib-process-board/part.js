// Источник: SplitFlapText (React Bits, MIT + Commons Clause) — переписано на vanilla: плитки из двух половин и двух створок, WAAPI вместо React state.
// Табло перещёлкивает статусы демо-заказа; статус можно выбрать кнопкой; reduced-motion — без перещёлкивания.
VFKit.register('lib-process-board', root => {
  const board = root.querySelector('.lpb__board'), now = root.querySelector('.lpb__now');
  const chips = [...root.querySelectorAll('.lpb__chip')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const words = ['ПРИНЯТ', 'ДИАГНОСТИКА', 'РЕМОНТ', 'ПРОВЕРКА', 'ГОТОВ'];
  const W = 11, GLYPHS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ';
  const pad = w => w.padEnd(W, ' ');
  const tiles = [];
  for (let k = 0; k < W; k++) {
    const t = document.createElement('span');
    t.className = 'sf';
    t.innerHTML = '<span class="sf__h sf__a"><i></i></span><span class="sf__h sf__b"><i></i></span><span class="sf__h sf__fa"><i></i></span><span class="sf__h sf__fb"><i></i></span>';
    board.appendChild(t);
    const o = { el: t, a: t.querySelector('.sf__a i'), b: t.querySelector('.sf__b i'), fa: t.querySelector('.sf__fa'), fb: t.querySelector('.sf__fb'), ch: ' ', busy: 0 };
    o.fai = o.fa.firstChild; o.fbi = o.fb.firstChild;
    tiles.push(o);
  }
  const set = (o, c) => { o.a.textContent = o.b.textContent = o.fai.textContent = o.fbi.textContent = c === ' ' ? ' ' : c; o.ch = c; };
  tiles.forEach(o => set(o, ' '));

  // один щелчок плитки: верхняя створка падает, нижняя встаёт
  async function flip(o, c, ms) {
    o.a.textContent = c === ' ' ? ' ' : c; o.fai.textContent = o.b.textContent;
    o.fbi.textContent = o.a.textContent;
    o.fa.style.display = o.fb.style.display = 'block';
    const half = ms / 2;
    await o.fa.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }], { duration: half, easing: 'ease-in', fill: 'forwards' }).finished;
    await o.fb.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }], { duration: half, easing: 'ease-out', fill: 'forwards' }).finished;
    o.b.textContent = o.a.textContent; o.ch = c;
    o.fa.style.display = o.fb.style.display = 'none';
    o.fa.getAnimations().forEach(a => a.cancel()); o.fb.getAnimations().forEach(a => a.cancel());
  }
  let token = 0, idx = -1;
  async function show(i, instant) {
    if (i === idx) return;
    idx = i; const my = ++token;
    chips.forEach((c, k) => c.setAttribute('aria-current', k === i ? 'true' : 'false'));
    now.textContent = 'Статус демо-заказа: ' + chips[i].textContent.toLowerCase();
    const target = pad(words[i]);
    if (instant || reduce.matches) { tiles.forEach((o, k) => set(o, target[k])); return; }
    await Promise.all(tiles.map(async (o, k) => {
      if (o.ch === target[k]) return;
      await new Promise(r => setTimeout(r, k * 45));
      const n = 4 + (k % 3);
      for (let s = 0; s < n; s++) {
        if (my !== token) return;
        await flip(o, GLYPHS[Math.floor(Math.random() * GLYPHS.length)], 70);
      }
      if (my === token) await flip(o, target[k], 70);
    }));
  }

  // автоперещёлкивание, пока табло на экране; нажатие на статус останавливает его
  let timer = 0, visible = false, userStopped = false;
  const tick = () => { clearTimeout(timer); if (visible && !userStopped && !reduce.matches) timer = setTimeout(() => { show((idx + 1) % words.length); tick(); }, 3200); };
  chips.forEach((c, k) => c.addEventListener('click', () => { userStopped = true; clearTimeout(timer); show(k); }));
  show(0, true);
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { visible = en.isIntersecting; tick(); }, { threshold: .4 }).observe(board);
  else visible = true;
  if (window.VFMotion) VFMotion.scan(root);
});
