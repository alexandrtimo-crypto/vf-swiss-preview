VFKit.register('ts-lux-header', root => {
  const menu = root.querySelector('.menu');
  root.querySelectorAll('.menu a').forEach(a => a.addEventListener('click', () => { menu.open = false; }));
  root.querySelector('[data-book]')?.addEventListener('click', e => {
    const ev = new CustomEvent('vf:book', { detail: {}, cancelable: true });
    document.dispatchEvent(ev);
    if (ev.defaultPrevented) e.preventDefault();
  });
});
