// easy-faq: облако вопросов. Нажатие шлёт vf:chat { question, land } — land(target) анимирует «полёт» пузыря в чат.
VFKit.register('easy-faq', root => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FAQ = [
    { q: 'Сколько стоит диагностика?', c: 'var(--vf-easy-sun, #FFD25E)', big: 1 },
    { q: 'Сколько стоит ремонт?', c: 'var(--vf-surface, #fff)' },
    { q: 'Сколько по времени?', c: 'var(--vf-easy-sky, #9FD8FF)' },
    { q: 'Какая гарантия?', c: 'var(--vf-easy-mint, #8EE0B8)', big: 1 },
    { q: 'Детали оригинальные?', c: 'var(--vf-surface, #fff)' },
    { q: 'С какими марками работаете?', c: 'var(--vf-easy-lilac, #C8B6FF)' },
    { q: 'Поменяете батарейку?', c: 'var(--vf-easy-pink, #FFC2DA)' },
    { q: 'Какое стекло поставите?', c: 'var(--vf-surface, #fff)' },
    { q: 'Сделаете ремешок?', c: 'var(--vf-easy-lime, #B9E37A)' },
    { q: 'Чем проверяете часы?', c: 'var(--vf-surface, #fff)' },
    { q: 'Где вы находитесь?', c: 'var(--vf-easy-coral, #FFA98F)', big: 1 },
    { q: 'Когда вы открыты?', c: 'var(--vf-surface, #fff)' },
    { q: 'Можно без записи?', c: 'var(--vf-easy-sun, #FFD25E)' },
    { q: 'Полируете корпус?', c: 'var(--vf-surface, #fff)' }
  ];
  const qs = root.querySelector('.qs');
  const ROWS = 4;
  const rows = Array.from({ length: ROWS }, () => { const r = document.createElement('div'); r.className = 'qrow'; qs.appendChild(r); return r; });

  // «полёт» пузыря-вопроса к сообщению в чате; вызывает чат, когда сообщение уже на месте
  const fly = src => target => new Promise(res => {
    const a = src.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const c = src.cloneNode(true);
    c.className = 'q flyer'; c.style.cssText += `;left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px;animation:none;translate:none;transform:none;`;
    root.appendChild(c);
    src.classList.add('gone');
    c.getBoundingClientRect();
    const sx = b.width / a.width, sy = b.height / a.height;
    c.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${sx}, ${sy})`;
    c.style.background = 'var(--vf-text, #2A211C)'; c.style.color = 'transparent';
    setTimeout(() => {
      c.remove();
      src.classList.remove('gone'); src.classList.add('asked');
      res();
    }, 620);
  });

  FAQ.forEach((f, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'q' + (f.big ? ' q--big' : '');
    b.textContent = f.q;
    const r = ((i * 37) % 7 - 3) * 0.9;
    b.style.cssText = `--c:${f.c};--r:${r}deg;--y:${((i * 53) % 5 - 2) * 3}px;--d:${4 + (i % 4)}s;--dl:${-(i * 0.7)}s`;
    b.addEventListener('click', () => document.dispatchEvent(new CustomEvent('vf:chat', { cancelable: true, detail: { question: f.q, land: fly(b) } })));
    rows[i % ROWS].appendChild(b);
  });
  root.querySelector('.cloud__own').addEventListener('click', () => document.dispatchEvent(new CustomEvent('vf:chat', { cancelable: true, detail: { ask: true } })));

  // на телефоне облако один раз «покачивается» вбок — подсказка, что его можно листать
  if (!RM && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting || qs.scrollWidth <= qs.clientWidth + 4) return;
      io.disconnect();
      qs.scrollTo({ left: 90, behavior: 'smooth' });
      setTimeout(() => qs.scrollTo({ left: 0, behavior: 'smooth' }), 700);
    }, { threshold: .6 });
    io.observe(qs);
  }
});
