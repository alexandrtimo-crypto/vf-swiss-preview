VFKit.register('pm-lux-booking', root => {
  const form = root.querySelector('form');
  const done = root.querySelector('[data-done]');
  if (!form) return;
  form.noValidate = true;
  const f = n => form.elements[n];
  if (window.VFLead && f('phone')) VFLead.bindPhone(f('phone'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Открыть заявку из любого места страницы: vf:book { symptom }
  document.addEventListener('vf:book', e => {
    e.preventDefault();
    const s = e.detail && e.detail.symptom;
    if (s && f('description') && !f('description').value.trim()) f('description').value = s + '. ';
    if (s && f('topic')) f('topic').value = s;
    root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => f('name') && f('name').focus({ preventScroll: true }), reduce ? 0 : 500);
  });

  const setErr = (name, msg) => {
    const el = f(name); const box = root.querySelector(`[data-err="${name}"]`);
    if (el && el.setAttribute) { msg ? el.setAttribute('aria-invalid', 'true') : el.removeAttribute('aria-invalid'); }
    if (box) { box.textContent = msg || ''; box.hidden = false; }
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    ['name', 'phone', 'consent'].forEach(n => setErr(n, ''));
    if (f('website') && f('website').value) { form.hidden = true; done.hidden = false; return; } // honeypot
    const data = {
      name: f('name').value.trim(),
      phone: f('phone').value.trim(),
      contact: (form.querySelector('[name="contact"]:checked') || {}).value || 'call',
      brand: f('brand') ? f('brand').value.trim() : '',
      description: f('description') ? f('description').value.trim() : '',
      photos: [],
    };
    let res = { ok: true };
    if (!data.name) res = { ok: false, field: 'name', message: 'Напишите, как к вам обращаться.' };
    else if (data.phone.replace(/\D/g, '').length < 11) res = { ok: false, field: 'phone', message: 'Номер неполный: нужно 10 цифр после +7.' };
    else if (!f('consent').checked) res = { ok: false, field: 'consent', message: 'Отметьте согласие на обработку данных — без него заявку не принять.' };
    if (res.ok && window.VFLead) res = VFLead.validateLead(data) || { ok: true };
    if (!res.ok) { setErr(res.field, res.message); const el = f(res.field); el && el.focus && el.focus(); return; }
    form.hidden = true; done.hidden = false; done.focus();
  });
});
