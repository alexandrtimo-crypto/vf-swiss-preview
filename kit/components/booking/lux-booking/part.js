// Заявка-приглашение (прототип, ничего не отправляет): VFLead.validateLead, согласие, ловушка для ботов.
// Слушает vf:book (прокрутка к себе, detail.symptom → описание); шлёт vf:dock { hide }, пока на экране кнопка отправки.
VFKit.register('lux-booking', root => {
  root.classList.add('is-js');
  const $ = s => root.querySelector(s);
  const form = $('.invite__form'), done = $('.invite__done'), err = $('.invite__err');
  const phone = $('[name="phone"]'), photos = $('[name="photos"]'), fileLabel = $('.invite__file-label');
  if (window.VFLead && VFLead.bindPhone) VFLead.bindPhone(phone);
  photos.addEventListener('change', () => {
    const n = photos.files.length;
    fileLabel.textContent = n ? `Фото: ${n}` : 'Приложить фото';
  });
  const fieldMap = { name: '[name="name"]', phone: '[name="phone"]', brand: '[name="brand"]', description: '[name="description"]', photos: '[name="photos"]', contact: 'input[name="contact"]' };
  function finish() { form.hidden = true; done.hidden = false; done.focus(); }
  form.addEventListener('submit', e => {
    e.preventDefault();
    err.textContent = '';
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    const fd = new FormData(form);
    if ((fd.get('website') || '').trim()) return finish(); // ловушка для ботов
    const data = {
      name: (fd.get('name') || '').trim(),
      phone: (fd.get('phone') || '').trim(),
      contact: fd.get('contact') === 'telegram' ? 'telegram' : 'call',
      brand: (fd.get('brand') || '').trim(),
      description: (fd.get('description') || '').trim(),
      photos: Array.from(photos.files || [])
    };
    const res = window.VFLead ? VFLead.validateLead(data) : { ok: true };
    if (!res || !res.ok) {
      const el = form.querySelector(fieldMap[res && res.field] || fieldMap.name);
      const det = el.closest('details'); if (det) det.open = true;
      el.setAttribute('aria-invalid', 'true');
      err.textContent = (res && res.message) || 'Проверьте, пожалуйста, поля.';
      el.focus();
      return;
    }
    const consent = $('[name="consent"]');
    if (!consent.checked) {
      err.textContent = 'Отметьте согласие на обработку персональных данных.';
      consent.setAttribute('aria-invalid', 'true');
      consent.focus();
      return;
    }
    finish();
  });

  // «Записаться» из любого компонента
  document.addEventListener('vf:book', e => {
    e.preventDefault();
    const d = e.detail || {};
    if (d.symptom) {
      const desc = $('[name="description"]');
      if (desc && !desc.value) desc.value = d.symptom;
      $('.invite__more').open = true;
    }
    root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (d.focus && !form.hidden) setTimeout(() => $('[name="name"]').focus({ preventScroll: true }), 400);
  });

  // не перекрывать кнопку отправки плавающей связью
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      document.dispatchEvent(new CustomEvent('vf:dock', { detail: { hide: en.isIntersecting, from: 'lux-booking' } }));
    }, { threshold: .1 }).observe($('.invite__send'));
  }
});
