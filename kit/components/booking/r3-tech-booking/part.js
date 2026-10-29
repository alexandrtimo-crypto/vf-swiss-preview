VFKit.register('r3-tech-booking', root => {
  const form = root.querySelector('.r3bk__card');
  const inner = form.querySelector('.r3bk__in');
  const done = form.querySelector('.r3bk__done');
  const err = form.querySelector('.r3bk__err');
  const el = form.elements;
  const desc = el.description;
  const consentLabel = el.consent.closest('label');
  if (window.VFLead) VFLead.bindPhone(el.phone);
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const fname = form.querySelector('.r3bk__fname');
  const showFiles = () => { const n = el.photos.files.length; fname.textContent = n === 0 ? 'Файл не выбран' : n === 1 ? el.photos.files[0].name : `Выбрано фото: ${n}`; };
  el.photos.addEventListener('change', showFiles);
  // быстрые варианты дописывают описание
  root.querySelectorAll('.r3bk__chips button').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    const t = b.textContent.trim();
    const parts = desc.value.split(/\s*;\s*/).filter(Boolean).filter(x => x !== t);
    if (on) parts.unshift(t);
    desc.value = parts.join('; ');
  }));

  function clear() { err.hidden = true; form.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid')); consentLabel.classList.remove('is-bad'); }
  form.addEventListener('input', clear);
  function fail(field, message) {
    err.textContent = message; err.hidden = false;
    const f = el[field] && el[field].focus ? el[field] : el.phone;
    if (field === 'consent') consentLabel.classList.add('is-bad'); else f.setAttribute('aria-invalid', 'true');
    f.focus();
  }
  form.addEventListener('submit', e => {
    e.preventDefault(); clear();
    const data = { name: el.name.value.trim(), phone: el.phone.value, contact: el.contact.value || 'call', brand: el.brand.value.trim(), description: desc.value.trim(), photos: [...(el.photos.files || [])] };
    if (!el.website.value) {
      const digits = data.phone.replace(/\D/g, '');
      if (!digits) return fail('phone', 'Введите телефон — по нему мастер свяжется с вами.');
      if (digits.length < 11) return fail('phone', 'Номер неполный: нужно 10 цифр после +7.');
      if (!el.consent.checked) return fail('consent', 'Отметьте согласие на обработку данных — без него заявку не принять.');
      const v = window.VFLead ? VFLead.validateLead(data) : { ok: true };
      if (!v.ok) return fail(v.field || 'phone', v.message || 'Проверьте заявку.');
    }
    form.querySelector('.r3bk__done-via').textContent = data.contact === 'telegram' ? 'в Telegram' : 'по телефону';
    inner.hidden = true; done.hidden = false; done.focus();
  });
  form.querySelector('.r3bk__again').addEventListener('click', () => {
    form.reset(); showFiles(); root.querySelectorAll('.r3bk__chips button').forEach(b => b.setAttribute('aria-pressed', 'false'));
    done.hidden = true; inner.hidden = false; el.phone.focus();
  });

  // «Заявка» из любого места страницы: прокрутка сюда, подстановка работы
  document.addEventListener('vf:book', e => {
    e.preventDefault();
    if (inner.hidden) { done.hidden = true; inner.hidden = false; }
    const s = e.detail && e.detail.symptom;
    if (s && !desc.value.includes(s)) desc.value = desc.value ? `${s}; ${desc.value}` : s;
    form.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
    form.classList.remove('is-flash'); void form.offsetWidth; form.classList.add('is-flash');
    setTimeout(() => (el.name.value ? el.phone : el.name).focus({ preventScroll: true }), reduce() ? 0 : 600);
  });
});
