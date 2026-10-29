// Циферблат-селектор услуг: заводная головка, наведение, перетаскивание мышью по кругу, свайп, стрелки.
VFKit.register('lux-services', root => {
  root.classList.add('is-js');
  const dial = root.querySelector('.dial');
  const inputs = Array.from(dial.querySelectorAll('.dial__in'));
  let cur = Math.max(0, inputs.findIndex(i => i.checked)), angle = cur * 60;
  function setSvc(i, fromInput) {
    i = (i + 6) % 6;
    let d = i - cur; if (d > 3) d -= 6; if (d < -3) d += 6;
    angle += d * 60; cur = i;
    dial.style.setProperty('--a', angle + 'deg');
    if (!fromInput) inputs[i].checked = true;
  }
  dial.style.setProperty('--a', angle + 'deg');
  inputs.forEach((inp, i) => inp.addEventListener('change', () => setSvc(i, true)));
  const crown = dial.querySelector('.dial__crown');
  crown.addEventListener('click', () => { setSvc(cur + 1); crown.classList.toggle('is-turn'); });
  root.querySelectorAll('.dial__arrow').forEach(b => b.addEventListener('click', () => setSvc(cur + +b.dataset.step)));
  // наведение на отметку (мышь)
  dial.querySelectorAll('.dial__opt').forEach((l, i) => l.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setSvc(i); }));
  // перетаскивание мышью по кругу и свайп пальцем
  let drag = null;
  dial.addEventListener('pointerdown', e => {
    if (e.target.closest('.dial__crown')) return;
    drag = { x: e.clientX, y: e.clientY, type: e.pointerType, moved: false };
  });
  dial.addEventListener('pointermove', e => {
    if (!drag || drag.type !== 'mouse') return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
    drag.moved = true;
    const r = dial.getBoundingClientRect();
    const a = (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI + 360) % 360;
    const i = Math.round(a / 60) % 6;
    if (i !== cur) setSvc(i);
  });
  const endDrag = e => {
    if (!drag) return;
    if (drag.type !== 'mouse') {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.2) setSvc(cur + (dx < 0 ? 1 : -1));
    }
    drag = null;
  };
  dial.addEventListener('pointerup', endDrag);
  dial.addEventListener('pointercancel', () => { drag = null; });
  dial.addEventListener('dragstart', e => e.preventDefault());
});
