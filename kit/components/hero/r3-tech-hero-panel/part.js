VFKit.register('r3-tech-hero-panel', root => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 900px) and (min-height: 600px)');
  const pin = root.querySelector('.r3hp__pin');
  const win = root.querySelector('.r3hp__win');
  const video = root.querySelector('.r3hp__vid');
  const clamp = v => Math.min(1, Math.max(0, v));
  const hh = () => parseFloat(getComputedStyle(root).getPropertyValue('--hh')) || 64;
  let raf = 0;

  // «Снять панель»: прогресс прокрутки через сцену → --p (винты, рамка, раскрытие считает CSS)
  function update() {
    raf = 0;
    if (reduce.matches) { root.style.setProperty('--p', '0'); return; }
    let p;
    if (root.classList.contains('is-pinned')) {
      const r = root.getBoundingClientRect();
      const range = r.height - pin.offsetHeight;
      p = range > 0 ? (hh() - r.top) / range : 0;
    } else {
      const r = win.getBoundingClientRect();
      p = (hh() + 16 - r.top) / (r.height * 0.95);
    }
    root.style.setProperty('--p', clamp(p).toFixed(4));
  }
  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  function setup() { root.classList.toggle('is-pinned', wide.matches && !reduce.matches); update(); }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', setup);
  wide.addEventListener?.('change', setup);
  reduce.addEventListener?.('change', setup);
  setup();

  // видео играет только в зоне видимости и без «уменьшить движение»
  if (video && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !reduce.matches) video.play().catch(() => {}); else video.pause();
    }, { threshold: 0.15 }).observe(video);
  }

  // карта-наряд
  const form = root.querySelector('.r3hp__card');
  const inner = form.querySelector('.r3hp__card-in');
  const done = form.querySelector('.r3hp__done');
  const err = form.querySelector('.r3hp__err');
  const phone = form.elements.phone;
  const consent = form.elements.consent;
  if (window.VFLead) VFLead.bindPhone(phone);
  const clearErr = () => { err.hidden = true; phone.removeAttribute('aria-invalid'); consent.closest('label').classList.remove('is-bad'); };
  phone.addEventListener('input', clearErr);
  consent.addEventListener('change', clearErr);
  function fail(field, message) {
    err.textContent = message; err.hidden = false;
    const el = form.elements[field] || phone;
    if (field === 'consent') consent.closest('label').classList.add('is-bad'); else el.setAttribute('aria-invalid', 'true');
    el.focus();
  }
  form.addEventListener('submit', e => {
    e.preventDefault(); clearErr();
    const fd = new FormData(form);
    const data = { name: '', phone: String(fd.get('phone') || ''), contact: fd.get('contact') || 'call', brand: String(fd.get('brand') || '').trim(), description: '', photos: [] };
    if (!fd.get('website')) {
      const digits = data.phone.replace(/\D/g, '');
      if (!digits) return fail('phone', 'Введите телефон — по нему мастер свяжется с вами.');
      if (digits.length < 11) return fail('phone', 'Номер неполный: нужно 10 цифр после +7.');
      if (!consent.checked) return fail('consent', 'Отметьте согласие на обработку данных — без него заявку не принять.');
      const v = window.VFLead ? VFLead.validateLead(data) : { ok: true };
      if (!v.ok) return fail(v.field || 'phone', v.message || 'Проверьте заявку.');
    }
    inner.hidden = true; done.hidden = false; done.focus();
  });
  form.querySelector('.r3hp__again').addEventListener('click', () => {
    form.reset(); done.hidden = true; inner.hidden = false; phone.focus();
  });
});
