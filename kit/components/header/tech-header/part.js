// Шапка: живые часы МСК, «Заявка» → событие vf:book, «К содержанию» → первый слот после шапки
VFKit.register('tech-header', root => {
  // Иконка вкладки: у собранной страницы своей нет (head делает ядро) — добавляем, только если её нет совсем
  if (!document.querySelector('link[rel~="icon"]')) {
    const ic = document.createElement('link'); ic.rel = 'icon';
    ic.href = "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%2713%27 fill=%27none%27 stroke=%27%236ff2d0%27 stroke-width=%273%27/%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%274%27 fill=%27%236ff2d0%27/%3E%3C/svg%3E";
    document.head.appendChild(ic);
  }
  const clock = root.querySelector('.clock');
  const msk = () => { const d = new Date(); return new Date(d.getTime() + (d.getTimezoneOffset() + 180) * 60000); };
  const tick = () => { const d = msk(); clock.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':'); };
  if (clock) { tick(); setInterval(tick, 1000); }
  root.querySelectorAll('[data-book]').forEach(a => a.addEventListener('click', e => {
    const ev = new CustomEvent('vf:book', { detail: {}, cancelable: true });
    document.dispatchEvent(ev);
    if (document.querySelector('[data-slot="booking"]')) e.preventDefault(); // иначе — обычный переход по якорю
  }));
  const skip = root.querySelector('.skip');
  skip?.addEventListener('click', e => {
    let next = root.nextElementSibling;
    while (next && !next.matches('[data-part]:not([data-slot="overlay"])')) next = next.nextElementSibling;
    if (!next) return;
    e.preventDefault();
    if (!next.hasAttribute('tabindex')) next.setAttribute('tabindex', '-1');
    next.focus(); next.scrollIntoView();
  });
});
