// easy-hero: «Что с часами?» — плитки-наклейки. Нажатие шлёт vf:chat { symptom, label }.
VFKit.register('easy-hero', root => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ICONS = (window.VFIcons && window.VFIcons.easy) || { tiles: {} };
  // рисунки из элемента «Иконки · легко»
  root.querySelectorAll('[data-icon]').forEach(slot => {
    const key = slot.dataset.icon;
    const svg = key === 'master' ? ICONS.master : ICONS.tiles[key];
    if (!svg) return;
    if (key === 'master') { slot.innerHTML = svg; return; }
    const t = document.createElement('template');
    t.innerHTML = svg;
    slot.replaceWith(t.content.firstElementChild);
  });
  root.querySelectorAll('.tile').forEach(t => {
    t.addEventListener('pointerdown', () => t.classList.add('is-press'));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => t.addEventListener(ev, () => setTimeout(() => t.classList.remove('is-press'), 260)));
    t.addEventListener('click', () => setTimeout(() => {
      document.dispatchEvent(new CustomEvent('vf:chat', { cancelable: true, detail: { symptom: t.dataset.tile, label: t.querySelector('.tile__t').textContent } }));
    }, RM ? 0 : 180));
  });
});
