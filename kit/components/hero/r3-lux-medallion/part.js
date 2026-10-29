VFKit.register('r3-lux-medallion', root => {
  const E = window.R3E;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── гравюра: розетка вытравливается при загрузке, потом рамка медальона и бланка ──
  if (E) {
    const rosHost = root.querySelector('[data-ros]');
    const ros = E.rosetteSvg({ preset: 0, copiesScale: 2.3, opScale: 0.9 });
    E.mount(rosHost, ros.svg, { px: 0.55 });
    const frHost = root.querySelector('[data-fr]');
    const fr = E.frameSvg({ aspect: 0.82, shape: 'oval', band: 44, f: 34, m: 4, seed: 1 });
    E.mount(frHost, fr.svg, { px: 0.7, fs: 4.2 });
    // фото — внутри внутренней линейки рамки
    const ph = root.querySelector('.r3lm__ph');
    ph.style.inset = `${fr.inset.y}% ${fr.inset.x}%`;
    E.etch(ros.svg, { duration: 2800, stagger: 22, from: 'first' });
    setTimeout(() => E.etch(fr.svg, { duration: 1800, stagger: 120 }), 500);
  }
  // бланк: микротекстовая рамка
  const form = root.querySelector('.r3lm__blank');
  if (E) E.blank(form, { band: 14 });

  // ── бланк записи ──
  const inner = form.querySelector('.r3lm__in');
  const done = form.querySelector('.r3lm__done');
  const err = form.querySelector('.r3lm__err');
  const no = form.querySelector('[data-no]');
  const phone = form.elements.phone;
  const consent = form.elements.consent;
  const consentLabel = consent.closest('label');
  if (window.VFLead) VFLead.bindPhone(phone);
  const clearErr = () => { err.hidden = true; phone.removeAttribute('aria-invalid'); consentLabel.classList.remove('is-bad'); };
  phone.addEventListener('input', clearErr);
  consent.addEventListener('change', clearErr);
  function fail(field, message) {
    err.textContent = message; err.hidden = false;
    document.dispatchEvent(new CustomEvent('vf:sound', { detail: { name: 'error' } }));
    if (field === 'consent') { consentLabel.classList.add('is-bad'); consent.focus(); }
    else { phone.setAttribute('aria-invalid', 'true'); phone.focus(); }
  }
  form.addEventListener('submit', e => {
    e.preventDefault(); clearErr();
    const fd = new FormData(form);
    const data = { name: '', phone: String(fd.get('phone') || ''), contact: 'call', brand: '', description: '', photos: [] };
    if (fd.get('website')) return; // ловушка для ботов
    const digits = data.phone.replace(/\D/g, '');
    if (!digits) return fail('phone', 'Введите телефон — по нему мастер свяжется с вами.');
    if (digits.length < 11) return fail('phone', 'Номер неполный: нужно 10 цифр после +7.');
    if (!consent.checked) return fail('consent', 'Отметьте согласие на обработку данных — без него заявку не принять.');
    const v = window.VFLead ? VFLead.validateLead(data) : { ok: true };
    if (!v.ok) return fail(v.field || 'phone', v.message || 'Проверьте заявку.');
    // бланк заполнен: номер бордо и тиснёная печать
    no.textContent = '№ ' + String(Math.floor(1000000 + Math.random() * 8999999)).replace(/(\d{3})(\d{4})/, '$1 $2');
    inner.hidden = true; done.hidden = false; done.focus({ preventScroll: true });
    form.classList.remove('is-stamped'); void form.offsetWidth; form.classList.add('is-stamped');
    document.dispatchEvent(new CustomEvent('vf:sound', { detail: { name: 'stamp' } }));
  });
  form.querySelector('.r3lm__again').addEventListener('click', () => {
    form.reset(); no.textContent = '№ ———'; form.classList.remove('is-stamped');
    done.hidden = true; inner.hidden = false; phone.focus();
  });

  // «Записаться» из шапки: пока бланк на первом экране — заполняем его, а не прокручиваем к нижнему
  document.addEventListener('vf:book', e => {
    if (e.defaultPrevented || (e.detail && e.detail.symptom)) return; // выбор услуги всегда ведёт к полному бланку
    const r = form.getBoundingClientRect();
    if (r.top > innerHeight * 0.85 || r.bottom < 80) return;
    e.preventDefault();
    if (inner.hidden) { done.hidden = true; inner.hidden = false; no.textContent = '№ ———'; form.classList.remove('is-stamped'); }
    phone.focus({ preventScroll: true });
  });
});
