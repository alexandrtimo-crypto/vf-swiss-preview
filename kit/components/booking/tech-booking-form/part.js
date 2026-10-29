/* Заявка-прибор: одно поле на шаг, кольцо прогресса 1/6…6/6, VFLead.validateLead, honeypot, без реальной отправки.
   Ловит vf:book { symptom?, brand? }: прокручивает к себе и подставляет данные. */
VFKit.register('tech-booking-form', root => {
  const TAU = Math.PI * 2, NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const form = $('.form'), steps = $$('.step'), prevB = $('.prev'), nextB = $('.next'), submitB = $('.submit');
  const err = $('.form > .form-err'), ringFg = $('.ring-fg'), ringNum = $('.ring-num'), done = $('.done');
  const RC = TAU * 96;
  ringFg.style.strokeDasharray = RC;
  (() => { const g = $('.ring-ticks'); for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, l = document.createElementNS(NS, 'line'), r0 = i % 10 ? 104 : 102; l.setAttribute('x1', Math.sin(a) * r0); l.setAttribute('y1', -Math.cos(a) * r0); l.setAttribute('x2', Math.sin(a) * 108); l.setAttribute('y2', -Math.cos(a) * 108); g.appendChild(l); } })();
  const phoneInp = form.elements.phone, photosInp = form.elements.photos, brandInp = form.elements.brand, descInp = form.elements.description;
  const consent = form.elements.consent, dropTxt = $('.drop-txt'), DROP0 = '+ Фото часов — по желанию';
  if (window.VFLead) VFLead.bindPhone(phoneInp);
  submitB.disabled = false;
  let cur = 0;
  const FIELD_STEP = { name: 0, phone: 1, contact: 2, brand: 3, description: 4, photos: 4, consent: 5 };
  function collect() {
    const fd = new FormData(form);
    return {
      name: (fd.get('name') || '').trim(), phone: (fd.get('phone') || '').trim(), contact: fd.get('contact') === 'telegram' ? 'telegram' : 'call',
      brand: (fd.get('brand') || '').trim(), description: (fd.get('description') || '').trim(), photos: Array.from(photosInp.files || []),
    };
  }
  function setRing(frac, label) { ringFg.style.strokeDashoffset = (RC * (1 - frac)).toFixed(1); ringNum.textContent = label; }
  function show(i, focus) {
    cur = clamp(i, 0, steps.length - 1);
    steps.forEach((s, k) => s.classList.toggle('on', k === cur));
    prevB.hidden = cur === 0; nextB.hidden = cur === steps.length - 1;
    setRing((cur + 1) / steps.length, `${cur + 1}/${steps.length}`);
    err.textContent = '';
    if (cur === steps.length - 1) buildSummary();
    if (focus) { const f = steps[cur].querySelector('input:not([type=hidden]):not([tabindex="-1"]),textarea'); if (f) f.focus({ preventScroll: true }); }
  }
  function buildSummary() {
    const d = collect(), sm = $('.summary'); sm.innerHTML = '';
    const items = [d.name, d.phone, d.contact === 'telegram' ? 'Telegram' : 'Звонок', d.brand, d.photos.length ? `фото: ${d.photos.length}` : ''].filter(Boolean);
    items.forEach(t => { const s = document.createElement('span'); s.textContent = t; sm.appendChild(s); });
  }
  function fail(r) {
    const st = FIELD_STEP[r.field] ?? cur;
    show(st, false);
    err.textContent = r.message || 'Проверьте поле';
    const el = form.elements[r.field];
    const node = el && (el.length && !el.tagName ? el[0] : el);
    if (node && node.setAttribute) { node.setAttribute('aria-invalid', 'true'); node.focus({ preventScroll: true }); }
  }
  function check(upTo) {
    if (!window.VFLead) return true;
    const r = VFLead.validateLead(collect());
    if (r && r.ok === false && (FIELD_STEP[r.field] ?? 0) <= upTo) { fail(r); return false; }
    return true;
  }
  nextB.addEventListener('click', () => { if (check(cur)) show(cur + 1, true); });
  prevB.addEventListener('click', () => show(cur - 1, true));
  form.addEventListener('input', e => { if (e.target.getAttribute) e.target.removeAttribute('aria-invalid'); err.textContent = ''; });
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && cur < steps.length - 1) { e.preventDefault(); nextB.click(); }
  });
  $$('.chips button').forEach(b => b.addEventListener('click', () => {
    brandInp.value = b.textContent; $$('.chips button').forEach(x => x.classList.toggle('on', x === b));
  }));
  photosInp.addEventListener('change', e => { const n = e.target.files.length; dropTxt.textContent = n ? `Выбрано фото: ${n}` : DROP0; });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const ok = () => { form.classList.add('sent'); setRing(1, '✓'); done.focus(); };
    if (form.elements.website.value) { ok(); return; }
    if (!check(99)) return;
    if (!consent.checked) { show(5, false); err.textContent = 'Нужно согласие на обработку персональных данных.'; consent.focus(); return; }
    ok();
  });
  $('.again').addEventListener('click', () => { form.reset(); form.classList.remove('sent'); $$('.chips button').forEach(x => x.classList.remove('on')); dropTxt.textContent = DROP0; show(0, true); });
  show(0, false);

  // связь с другими элементами: «Записаться/Заявка» где угодно на странице
  document.addEventListener('vf:book', e => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    const d = e.detail || {};
    if (d.brand) brandInp.value = d.brand;
    if (d.symptom) descInp.value = d.symptom;
    root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
});
