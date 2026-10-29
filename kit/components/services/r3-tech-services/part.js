VFKit.register('r3-tech-services', root => {
  root.classList.add('is-js');
  const items = [...root.querySelectorAll('.r3sv__item')];
  const panes = [...root.querySelectorAll('.r3sv__pane')];
  const home = root.querySelector('.r3sv__panes');
  const narrow = matchMedia('(max-width: 899px)');
  let cur = 0;
  function show(i, fromUser) {
    cur = i;
    items.forEach((b, k) => b.setAttribute('aria-expanded', String(k === i)));
    panes.forEach((p, k) => p.classList.toggle('is-on', k === i));
    // на телефоне описание встаёт сразу под выбранной строкой
    const pane = panes[i];
    if (narrow.matches) items[i].closest('li').appendChild(pane);
    else if (pane.parentElement !== home) panes.forEach(p => home.appendChild(p));
    if (fromUser && narrow.matches) pane.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  items.forEach((b, i) => b.addEventListener('click', () => show(i, true)));
  narrow.addEventListener?.('change', () => show(cur));
  show(0);
  root.querySelectorAll('.r3sv__book').forEach(b => b.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('vf:book', { cancelable: true, detail: { symptom: b.dataset.symptom } }));
  }));
});
