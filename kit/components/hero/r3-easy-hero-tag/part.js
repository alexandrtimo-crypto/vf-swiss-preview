// Бирка-заявка: маска телефона, проверка, отрыв корешка. Ничего не отправляется (прототип).
VFKit.register('r3-easy-hero-tag', root => {
  const form = root.querySelector('.r3h__tag');
  const phone = form.querySelector('[name="phone"]');
  const phoneErr = form.querySelector('#r3h-phone-err');
  const consent = form.querySelector('[name="consent"]');
  const consentErr = form.querySelector('#r3h-consent-err');
  const send = form.querySelector('.r3h__send');
  const more = form.querySelector('.r3h__more');
  const desc = form.querySelector('[name="description"]');
  const stub = form.querySelector('.r3h__stub');
  const idle = stub.querySelector('.r3h__stub-idle');
  const done = stub.querySelector('.r3h__stub-done');
  const msg = stub.querySelector('.r3h__stub-msg');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  if (window.VFLead) VFLead.bindPhone(phone);

  const via = () => form.querySelector('[name="contact"]:checked')?.value || 'call';
  const syncSend = () => { send.textContent = via() === 'telegram' ? 'Жду сообщения' : 'Жду звонка'; };
  form.querySelectorAll('[name="contact"]').forEach(r => r.addEventListener('change', syncSend));
  syncSend();

  const setErr = (input, box, text) => {
    box.textContent = text || '';
    if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  };
  phone.addEventListener('input', () => { if (phone.getAttribute('aria-invalid')) setErr(phone, phoneErr, ''); });
  consent.addEventListener('change', () => { if (consent.checked) setErr(consent, consentErr, ''); });

  form.querySelectorAll('[data-stub]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const digits = phone.value.replace(/\D/g, '');
    let bad = null;
    if (!digits.length) { setErr(phone, phoneErr, 'Впишите номер — по нему мастер перезвонит или напишет.'); bad = bad || phone; }
    else if (digits.length < 11) { setErr(phone, phoneErr, `Не хватает цифр: в номере ${digits.length - 1} из 10 после +7.`); bad = bad || phone; }
    else setErr(phone, phoneErr, '');
    if (!consent.checked) { setErr(consent, consentErr, 'Отметьте согласие — без него мы не можем связаться с вами.'); bad = bad || consent; }
    else setErr(consent, consentErr, '');

    const data = {
      name: '', phone: phone.value, contact: via(),
      brand: form.querySelector('[name="brand"]').value.trim(),
      description: desc.value.trim(), photos: [],
    };
    if (!bad && window.VFLead) {
      const r = VFLead.validateLead(data);
      if (r && r.ok === false) {
        if (r.field === 'phone') { setErr(phone, phoneErr, r.message); bad = phone; }
        else { setErr(consent, consentErr, r.message); bad = consent; }
      }
    }
    if (bad) { bad.focus(); return; }

    // honeypot заполнен — молча показываем то же подтверждение, ничего не делаем
    const how = data.contact === 'telegram'
      ? `Мастер напишет в Telegram на номер ${data.phone}.`
      : `Мастер перезвонит на ${data.phone}.`;
    msg.textContent = `${how} Ничего не отправлено — это прототип сайта.`;
    idle.hidden = true; done.hidden = false;
    form.classList.remove('is-torn'); void form.offsetWidth;
    form.classList.add('is-torn');
    stub.focus({ preventScroll: true });
    if (!reduce.matches) stub.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  stub.querySelector('.r3h__again').addEventListener('click', () => {
    form.classList.remove('is-torn');
    done.hidden = true; idle.hidden = false;
    phone.focus(); phone.select();
  });

  // «Записаться» из других частей страницы: бирка в центр, курсор в телефон
  const onBook = e => {
    e.preventDefault();
    const s = e.detail && e.detail.symptom;
    if (s) { more.open = true; desc.value = s; }
    form.scrollIntoView({ block: 'center', behavior: reduce.matches ? 'auto' : 'smooth' });
    setTimeout(() => phone.focus({ preventScroll: true }), reduce.matches ? 0 : 450);
  };
  document.addEventListener('vf:book', onBook);

  // Сигнал для панели связи: бирка ушла за верх экрана
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([en]) => {
      const over = !en.isIntersecting && en.boundingClientRect.top < 0;
      document.dispatchEvent(new CustomEvent('vf:hero', { detail: { over } }));
    });
    io.observe(send);
  }
});
