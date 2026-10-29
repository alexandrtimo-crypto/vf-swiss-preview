// easy-contacts: «Скопировать адрес» с тостом
VFKit.register('easy-contacts', root => {
  const toast = root.querySelector('.easy-contacts__toast');
  let t = 0;
  const say = text => { toast.textContent = text; toast.classList.add('on'); clearTimeout(t); t = setTimeout(() => toast.classList.remove('on'), 2200); };
  root.querySelector('[data-copy]').addEventListener('click', async () => {
    const a = 'Москва, Петровка, 23/10, стр. 5';
    try { await navigator.clipboard.writeText(a); }
    catch { const ta = document.createElement('textarea'); ta.value = a; root.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove(); }
    say('Адрес скопирован');
  });
});
