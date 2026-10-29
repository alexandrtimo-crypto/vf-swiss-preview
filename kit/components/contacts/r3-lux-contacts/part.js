VFKit.register('r3-lux-contacts', root => {
  const btn = root.querySelector('[data-copy]');
  const t = root.querySelector('[data-copy-t]');
  const addr = 'Москва, Петровка, 23/10 стр. 5';
  let timer;
  const say = msg => { t.textContent = msg; clearTimeout(timer); timer = setTimeout(() => { t.textContent = 'Скопировать адрес'; }, 2200); };
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(addr); say('Адрес скопирован'); }
    catch (e) {
      // запасной путь: выделение и копирование
      const ta = document.createElement('textarea'); ta.value = addr; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); say('Адрес скопирован'); } catch (_) { say('Не удалось скопировать'); }
      ta.remove();
    }
  });
  btn.setAttribute('aria-live', 'polite');
});
