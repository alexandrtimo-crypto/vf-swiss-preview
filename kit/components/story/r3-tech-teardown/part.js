VFKit.register('r3-tech-teardown', root => {
  const plate = root.querySelector('.r3td__plate');
  const set = n => {
    plate.classList.toggle('has-on', !!n);
    root.querySelectorAll('[data-n]').forEach(el => el.classList.toggle('is-on', !!n && el.dataset.n === n));
  };
  root.querySelectorAll('.r3td__b').forEach(b => {
    b.addEventListener('mouseenter', () => set(b.dataset.n));
    b.addEventListener('focus', () => set(b.dataset.n));
    b.addEventListener('click', () => set(b.dataset.n));
    b.addEventListener('mouseleave', () => { if (document.activeElement !== b) set(''); });
    b.addEventListener('blur', () => set(''));
  });
  root.querySelectorAll('.r3td__legend li').forEach(li => {
    li.addEventListener('mouseenter', () => set(li.dataset.n));
    li.addEventListener('mouseleave', () => set(''));
  });
});
