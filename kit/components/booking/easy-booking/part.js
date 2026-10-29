// easy-booking: заявка одной карточкой.
// Открывается: vf:book { form: true, lead?, consent? } (из чата) или vf:book без формы, если его никто не перехватил (нет чата).
// Готовую заявку отдаёт событием vf:lead { name, phone, contact, brand, description, photos, website };
// если событие никто не перехватил — показывает свою квитанцию. Демо: ?demo=form.
VFKit.register('easy-booking', root => {
  const ID = 'easy-booking';
  const $ = (s, r = root) => r.querySelector(s);
  const $$ = (s, r = root) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEMO = new URLSearchParams(location.search).get('demo');
  const IC = (window.VFIcons && window.VFIcons.easy && window.VFIcons.easy.ui) || {};

  const modal = {
    list: () => (document.body.dataset.vfModals || '').split(' ').filter(Boolean),
    set(l) {
      if (l.length) document.body.dataset.vfModals = l.join(' '); else delete document.body.dataset.vfModals;
      document.body.style.overflow = l.length ? 'hidden' : '';
      document.dispatchEvent(new CustomEvent('vf:overlay', { detail: { id: ID, open: l.includes(ID) } }));
    },
    open() { modal.set([...modal.list().filter(x => x !== ID), ID]); },
    close() { modal.set(modal.list().filter(x => x !== ID)); },
    top: () => modal.list().slice(-1)[0] === ID
  };

  const panel = $('.booking__panel');
  const formHTML = panel.innerHTML;
  let form, lastFocus = null;

  function bind() {
    form = $('form.lead', panel);
    if (window.VFLead) VFLead.bindPhone(form.phone);
    const n = $('.photo__n', form);
    form.photos.addEventListener('change', () => { const k = form.photos.files.length; n.textContent = k ? `${Math.min(k, 5)} фото` : ''; });
    // иконки вместо эмодзи
    $$('[data-icon]', form).forEach(s => { if (IC[s.dataset.icon]) s.insertAdjacentHTML('afterbegin', IC[s.dataset.icon]); });
    $$('[data-close]', panel).forEach(b => b.addEventListener('click', close));
    form.addEventListener('submit', submit);
  }
  bind();
  $$('.booking__backdrop[data-close]').forEach(b => b.addEventListener('click', close));

  const isOpen = () => !root.hidden;
  function open(d = {}) {
    if (!form || !form.isConnected) { panel.innerHTML = formHTML; bind(); }
    const over = !!d.from && d.from !== 'dock';
    root.classList.toggle('is-over', over);
    $('[data-close]', form).setAttribute('aria-label', over ? 'Вернуться в чат' : 'Закрыть заявку');
    const l = d.lead || {};
    form.name.value = l.name || ''; form.phone.value = l.phone || ''; form.brand.value = l.brand || ''; form.description.value = l.description || '';
    if (l.contact) form.contact.value = l.contact;
    form.consent.checked = !!d.consent;
    $('.lead__err', form).textContent = '';
    if (!isOpen()) lastFocus = document.activeElement;
    root.hidden = false;
    modal.open();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
    setTimeout(() => (l.name ? form.phone : form.name).focus({ preventScroll: true }), RM ? 0 : 300);
  }
  function close() {
    root.classList.remove('open');
    modal.close();
    root.hidden = true;
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
  }

  function formError(name, message) {
    const err = $('.lead__err', form);
    err.textContent = message || 'Проверьте поле';
    $$('[aria-invalid]', form).forEach(x => x.removeAttribute('aria-invalid'));
    const el = form.elements[name];
    if (el && el.focus) { el.setAttribute('aria-invalid', 'true'); el.focus(); }
  }
  function submit(e) {
    e.preventDefault();
    $('.lead__err', form).textContent = '';
    const data = {
      name: form.name.value.trim(), phone: form.phone.value.trim(), contact: form.contact.value,
      brand: form.brand.value.trim(), description: form.description.value.trim(),
      photos: [...form.photos.files].slice(0, 5), website: form.website.value
    };
    if (!data.website) {
      if (!data.name) return formError('name', 'Как к вам обращаться?');
      if (data.phone.replace(/\D/g, '').length < 11) return formError('phone', 'В номере не хватает цифр.');
      const res = window.VFLead ? VFLead.validateLead({ name: data.name, phone: data.phone, contact: data.contact, brand: data.brand, description: data.description, photos: data.photos }) : { ok: true };
      if (!res.ok) return formError(res.field, res.message);
      if (!form.consent.checked) { const ui = form.consent.nextElementSibling; ui.classList.remove('shake'); void ui.offsetWidth; ui.classList.add('shake'); return formError('consent', 'Включите согласие на обработку данных — без него не можем принять заявку.'); }
    }
    const ev = new CustomEvent('vf:lead', { cancelable: true, detail: data });
    close();
    document.dispatchEvent(ev);
    if (!ev.defaultPrevented) ticket(data); // чата нет — квитанция здесь же
  }
  function ticket(d) {
    panel.innerHTML = `<div class="ticket" role="status">${IC.ok || ''}<h4>Заявка принята (прототип)</h4>
      <p>${d.contact === 'telegram' ? 'Напишем вам в Telegram' : 'Перезвоним вам'}, чтобы договориться о бесплатной диагностике.</p>
      <p class="ticket__note">Это прототип: заявка никуда не отправлена.</p>
      <button class="vf-btn vf-btn--ghost" type="button" data-close>Закрыть</button></div>`;
    root.classList.remove('is-over');
    if (!isOpen()) lastFocus = document.activeElement;
    root.hidden = false; modal.open();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
    const b = $('[data-close]', panel); b.addEventListener('click', close); b.focus({ preventScroll: true });
  }

  document.addEventListener('vf:book', e => {
    const d = e.detail || {};
    if (d.form) { e.preventDefault(); open(d); return; }
    // обычное «Записаться»: если чат его не перехватил — открываем форму
    setTimeout(() => { if (!e.defaultPrevented) open(d); }, 0);
  });
  document.addEventListener('keydown', e => {
    if (!isOpen() || !modal.top()) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = $$('button:not([disabled]), input:not([hidden]):not([disabled]):not(.hp), textarea, a[href]', panel).filter(x => x.offsetParent !== null || x.type === 'radio' || x.type === 'checkbox' || x.type === 'file');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  if (DEMO === 'form') open({});
});
