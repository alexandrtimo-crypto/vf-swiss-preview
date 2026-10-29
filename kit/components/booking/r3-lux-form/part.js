VFKit.register('r3-lux-form', root => {
  const E = window.R3E;
  const form = root.querySelector('.r3lf__blank');
  const inner = form.querySelector('.r3lf__in');
  const done = form.querySelector('.r3lf__done');
  const err = form.querySelector('.r3lf__err');
  const no = form.querySelector('[data-no]');
  const el = form.elements;
  const desc = el.description;
  const consentLabel = el.consent.closest('label');
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sound = name => document.dispatchEvent(new CustomEvent('vf:sound', { detail: { name } }));
  if (E) E.blank(form, { band: 16, rosette: 0, rr: 11, view: true, stagger: 70 });
  if (window.VFLead) VFLead.bindPhone(el.phone);

  const fname = form.querySelector('.r3lf__fname');
  const showFiles = () => { const n = el.photos.files.length; fname.textContent = n === 0 ? 'Файл не выбран' : n === 1 ? el.photos.files[0].name : `Выбрано фото: ${n}`; };
  el.photos.addEventListener('change', showFiles);
  // быстрые варианты дописывают описание
  root.querySelectorAll('.r3lf__chips button').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    sound('tick');
    const t = b.textContent.trim();
    const parts = desc.value.split(/\s*;\s*/).filter(Boolean).filter(x => x !== t);
    if (on) parts.unshift(t);
    desc.value = parts.join('; ');
  }));

  function clear() { err.hidden = true; form.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid')); consentLabel.classList.remove('is-bad'); }
  form.addEventListener('input', clear);
  function fail(field, message) {
    err.textContent = message; err.hidden = false;
    sound('error');
    const f = el[field] && el[field].focus ? el[field] : el.phone;
    if (field === 'consent') consentLabel.classList.add('is-bad'); else f.setAttribute('aria-invalid', 'true');
    f.focus();
  }
  form.addEventListener('submit', e => {
    e.preventDefault(); clear();
    if (el.website.value) return; // ловушка для ботов
    const data = { name: el.name.value.trim(), phone: el.phone.value, contact: el.contact.value || 'call', brand: el.brand.value.trim(), description: desc.value.trim(), photos: [...(el.photos.files || [])] };
    const digits = data.phone.replace(/\D/g, '');
    if (!digits) return fail('phone', 'Введите телефон — по нему мастер свяжется с вами.');
    if (digits.length < 11) return fail('phone', 'Номер неполный: нужно 10 цифр после +7.');
    if (!el.consent.checked) return fail('consent', 'Отметьте согласие на обработку данных — без него заявку не принять.');
    const v = window.VFLead ? VFLead.validateLead(data) : { ok: true };
    if (!v.ok) return fail(v.field || 'phone', v.message || 'Проверьте заявку.');
    no.textContent = '№ ' + String(Math.floor(1000000 + Math.random() * 8999999)).replace(/(\d{3})(\d{4})/, '$1 $2');
    form.querySelector('[data-via]').textContent = data.contact === 'telegram' ? 'в Telegram' : 'по телефону';
    inner.hidden = true; done.hidden = false; done.focus({ preventScroll: true });
    form.classList.remove('is-stamped'); void form.offsetWidth; form.classList.add('is-stamped');
    sound('stamp');
  });
  function reset() {
    form.reset(); showFiles(); no.textContent = '№ ———'; form.classList.remove('is-stamped');
    root.querySelectorAll('.r3lf__chips button').forEach(b => b.setAttribute('aria-pressed', 'false'));
    done.hidden = true; inner.hidden = false;
  }
  form.querySelector('.r3lf__again').addEventListener('click', () => { reset(); el.phone.focus(); });

  // «Записаться» из любого места страницы: прокрутка сюда, подстановка услуги
  document.addEventListener('vf:book', e => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    if (inner.hidden) reset();
    const s = e.detail && e.detail.symptom;
    if (s && !desc.value.includes(s)) desc.value = desc.value ? `${s}; ${desc.value}` : s;
    form.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'center' });
    form.classList.remove('is-flash'); void form.offsetWidth; form.classList.add('is-flash');
    setTimeout(() => (el.name.value ? el.phone : el.name).focus({ preventScroll: true }), reduce() ? 0 : 650);
  });
});
