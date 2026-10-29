// Личный кабинет клиента: открывается по QR с карточки /k/<токен>
(() => {
  const view = document.getElementById('view');
  const dock = document.getElementById('dock');
  const { esc, dmy } = Docs;
  const token = window.VF_DEMO ? new URLSearchParams(location.search).get('t') || '' : location.pathname.split('/k/')[1]?.split(/[/?#]/)[0] || '';
  const STEPS = [['priem', 'Принят'], ['diag', 'Диагностика'], ['work', 'Ремонт'], ['done', 'Выдан']];
  const STATE = {
    priem: 'Часы приняты в мастерскую. Мастер скоро проведёт бесплатную диагностику.',
    diag: 'Идёт диагностика. Стоимость и срок согласуем с вами до начала работ.',
    work: 'Часы в работе у мастера.',
    done: 'Ремонт завершён, часы выданы. Действует гарантия.',
  };

  const toast = text => { const t = document.getElementById('toast'); t.textContent = text; t.classList.add('is-on'); setTimeout(() => t.classList.remove('is-on'), 2600); };
  const maskPhone = p => (p || '').replace(/(\d{2})-(\d{2})$/, '**-$2').replace(/\) (\d{3})/, ') ***');
  const watchTitle = o => [o.watch.brand, o.watch.model].filter(Boolean).join(' ') || 'Ваши часы';

  function contacts(s) {
    const tel = (s.phone || '').replace(/[^\d+]/g, '');
    dock.innerHTML = `${tel ? `<a class="btn" href="tel:${esc(tel)}">Позвонить</a>` : ''}
      ${s.telegram ? `<a class="btn btn--gold" href="${esc(Docs.telegramUrl(s.telegram))}" target="_blank" rel="noopener">Написать в Telegram</a>` : ''}`;
  }

  function orderCard(o, s, i) {
    const idx = STEPS.findIndex(([id]) => id === o.status);
    const issued = o.issued ? new Date(o.issued) : null;
    const months = Number(o.warrantyMonths ?? s.warrantyMonths) || 0;
    let warranty = '';
    if (o.status === 'done' && issued && months) {
      const until = new Date(issued); until.setMonth(until.getMonth() + months);
      const left = Math.max(0, Math.min(1, (until - Date.now()) / (until - issued)));
      warranty = `<div class="warranty"><span class="hint" style="margin:0">Гарантия ${months} мес.</span><br><b>${left > 0 ? 'действует до ' + dmy(until) : 'истекла ' + dmy(until)}</b>
        <div class="warranty__bar"><i style="width:${Math.round(left * 100)}%"></i></div></div>`;
    }
    const facts = [
      `Принят <b>${dmy(new Date(o.created))}</b>`,
      o.due && o.status !== 'done' ? `Готовность ориентировочно <b>${dmy(new Date(o.due))}</b>` : '',
      issued && o.status === 'done' ? `Выдан <b>${dmy(issued)}</b>` : '',
    ].filter(Boolean);
    return `<article class="watch">
      <div class="watch__top"><span class="watch__name">${esc(watchTitle(o))}</span><span class="watch__num">${esc(o.num)}</span></div>
      <div class="track" role="img" aria-label="Этап: ${STEPS[idx]?.[1] || ''}">
        <span class="track__fill" style="width:${idx * 25}%"></span>
        ${STEPS.map(([, label], j) => `<span class="track__step ${j < idx ? 'is-past' : ''} ${j === idx ? 'is-now' : ''}">${label}</span>`).join('')}
      </div>
      <p class="state">${STATE[o.status] || ''}</p>
      <div class="facts">${facts.map(f => `<span>${f}</span>`).join('')}</div>
      ${warranty}
      <p class="hint" style="margin:14px 0 0">Документы, PDF</p><div class="docs-row" style="margin-top:8px">
        <button class="btn" data-doc="intake" data-i="${i}">Акт приёма</button>
        ${o.status === 'done' && o.works?.length ? `<button class="btn btn--gold" data-doc="act" data-i="${i}">Акт и гарантия</button>` : ''}
      </div>
    </article>`;
  }

  // PDF тем же шаблоном, что у мастера: лист рисуется вне экрана и кладётся в A4
  async function pdf(type, o, s) {
    if (!window.html2pdf) throw new Error('модуль PDF ещё загружается');
    const el = document.createElement('div');
    el.className = 'docs pdf-stage';
    el.innerHTML = Docs.render(type, o, s, 1, 'color', true);
    document.body.append(el);
    Docs.mountQr(el);
    await document.fonts.ready;
    await Promise.all([...el.querySelectorAll('img')].map(i => (i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
    try {
      return await html2pdf().set({ margin: 0, image: { type: 'jpeg', quality: 0.94 }, html2canvas: { scale: 2.4, useCORS: true, backgroundColor: '#ffffff', logging: false }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } })
        .from(el.querySelector('.sheet')).output('blob');
    } finally { el.remove(); }
  }

  // Доступ к данным: на сервере — запросы к /api/k/<токен>, в демо — та же логика в localStorage (store-demo.js)
  const post = (action, body) => fetch(`/api/k/${encodeURIComponent(token)}/${action}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
    .then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || `Ошибка ${r.status}`); return d; });
  const api = window.Store?.cabinetByToken
    ? { get: () => Store.cabinetByToken(token), activate: b => Store.cabinetActivate(token, b), login: pw => Store.cabinetLogin(token, pw), logout: () => Store.cabinetLogout(token), password: b => Store.cabinetPassword(token, b) }
    : { get: () => fetch('/api/k/' + encodeURIComponent(token), { credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
        activate: b => post('activate', b), login: pw => post('login', { password: pw }), logout: () => post('logout'), password: b => post('password', b) };

  const eye = `<button type="button" class="eye" aria-label="Показать пароль">Показать</button>`;
  const bindEye = root => root.querySelectorAll('.eye').forEach(b => b.addEventListener('click', () => {
    const inp = b.parentElement.querySelector('input'); const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password'; b.textContent = show ? 'Скрыть' : 'Показать';
  }));

  // Первый вход (или после сброса мастером): как к вам обращаться и новый пароль
  function activation(data, s) {
    const reset = data.state === 'reset';
    view.innerHTML = `<section class="card auth"><img src="${Docs.ASSETS}logo-color.png" alt="VF swiss">
      <h1 class="hello">${reset ? 'Новый пароль' : 'Добро пожаловать'}</h1>
      <p class="hint">Карточка ${esc(data.code)}. ${reset ? 'Мастер сбросил доступ: введите код, который он вам назвал, и придумайте новый пароль.' : 'Придумайте пароль: он защитит ваши данные, если карточка потеряется. Мастер ваш пароль не видит.'}</p>
      <form id="act" class="auth__form" autocomplete="on">
        <label class="f"><span>Как к вам обращаться</span><input name="name" autocomplete="given-name" maxlength="60" required placeholder="Например, Иван"></label>
        ${reset ? '<label class="f"><span>Код от мастера</span><input name="pin" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" required placeholder="6 цифр"></label>' : ''}
        <label class="f f--eye"><span>Новый пароль <small>не короче 6 знаков</small></span><input name="password" type="password" minlength="6" maxlength="100" autocomplete="new-password" required>${eye}</label>
        <p class="auth__err" id="err" role="alert"></p>
        <button class="btn btn--gold btn--wide" id="go">Активировать кабинет</button>
      </form></section>`;
    bindEye(view);
    view.querySelector('#act').onsubmit = async e => {
      e.preventDefault();
      const f = e.target, go = f.querySelector('#go'), err = f.querySelector('#err');
      go.disabled = true; err.textContent = '';
      try { await api.activate({ name: f.name.value.trim(), password: f.password.value, pin: f.pin ? f.pin.value.trim() : undefined }); toast('Кабинет активирован'); await load(); }
      catch (x) { err.textContent = x.message; go.disabled = false; }
    };
  }

  // Повторный вход: только пароль. Без него данные клиента не отдаются
  function loginForm(data, s) {
    const tel = (s.phone || '').replace(/[^\d+]/g, '');
    view.innerHTML = `<section class="card auth"><img src="${Docs.ASSETS}logo-color.png" alt="VF swiss">
      <h1 class="hello">Личный кабинет</h1>
      <p class="hint">Карточка ${esc(data.code)}. Введите пароль, который вы задали при первом входе.</p>${data.demoHint ? `<p class="hint"><b>${esc(data.demoHint)}</b></p>` : ''}
      <form id="login" class="auth__form">
        <label class="f f--eye"><span>Пароль</span><input name="password" type="password" autocomplete="current-password" required>${eye}</label>
        <p class="auth__err" id="err" role="alert"></p>
        <button class="btn btn--gold btn--wide" id="go">Войти</button>
      </form>
      <p class="hint" style="margin-top:14px">Забыли пароль? ${tel ? `Позвоните в мастерскую: <a href="tel:${esc(tel)}">${esc(s.phone)}</a>.` : 'Свяжитесь с мастерской.'} Мастер сбросит доступ после проверки, что карточка ваша.</p></section>`;
    bindEye(view);
    view.querySelector('#login').onsubmit = async e => {
      e.preventDefault();
      const f = e.target, go = f.querySelector('#go'), err = f.querySelector('#err');
      go.disabled = true; err.textContent = '';
      try { await api.login(f.password.value); await load(); }
      catch (x) { err.textContent = x.message; go.disabled = false; f.password.select(); }
    };
  }

  function account() {
    return `<section class="card acc"><h3>Доступ</h3>
      <details><summary>Сменить пароль</summary>
        <form id="chg" class="auth__form">
          <label class="f f--eye"><span>Старый пароль</span><input name="old" type="password" autocomplete="current-password" required>${eye}</label>
          <label class="f f--eye"><span>Новый пароль <small>не короче 6 знаков</small></span><input name="password" type="password" minlength="6" autocomplete="new-password" required>${eye}</label>
          <p class="auth__err" id="cerr" role="alert"></p>
          <button class="btn btn--wide">Сохранить пароль</button>
        </form></details>
      <button class="btn btn--wide" id="out" type="button" style="margin-top:10px">Выйти</button></section>`;
  }

  async function load() {
    if (!token) { view.innerHTML = '<div class="empty">Ссылка неполная. Отсканируйте QR на карточке ещё раз.</div>'; return; }
    const data = await api.get();
    if (!data) { view.innerHTML = '<div class="empty">Кабинет не найден. Проверьте QR или позвоните в мастерскую.</div>'; return; }
    const s = { ...Docs.DEFAULTS, ...data.settings };
    document.getElementById('code').textContent = data.code;
    contacts(s);
    if (!data.authed) { return data.state === 'active' ? loginForm(data, s) : activation(data, s); }

    const name = data.name || (data.client?.name || '').split(' ')[0];
    if (!data.active) {
      view.innerHTML = `<h1 class="hello">${name ? `Здравствуйте, ${esc(name)}` : 'Ваш кабинет'}</h1>
        <section class="card inactive"><p class="hint">Карточка ${esc(data.code)} активирована. Покажите её мастеру, когда будете сдавать часы, — здесь появятся статус ремонта, документы и гарантия.</p>
        <p class="hint">${esc(s.address)}</p></section>${account()}`;
    } else {
      view.innerHTML = `<h1 class="hello">${name ? `Здравствуйте, ${esc(name)}` : 'Ваш кабинет'}</h1>
        <p class="hint">${data.client?.phone ? `Телефон ${esc(maskPhone(data.client.phone))} · ` : ''}карточка ${esc(data.code)}</p>
        ${data.orders.length ? data.orders.map((o, i) => orderCard(o, s, i)).join('') : '<div class="empty">Заказов пока нет. Они появятся здесь, как только мастер примет часы.</div>'}${account()}`;
    }
    bindEye(view);
    view.querySelector('#out').onclick = async () => { await api.logout().catch(() => {}); await load(); };
    view.querySelector('#chg').onsubmit = async e => {
      e.preventDefault();
      const f = e.target, err = f.querySelector('#cerr'); err.textContent = '';
      try { await api.password({ old: f.old.value, password: f.password.value }); f.reset(); f.closest('details').open = false; toast('Пароль изменён'); }
      catch (x) { err.textContent = x.message; }
    };

    view.onclick = async e => {
      const b = e.target.closest('[data-doc]'); if (!b) return;
      const o = data.orders[+b.dataset.i]; const label = b.textContent;
      b.disabled = true; b.textContent = 'Готовлю…';
      try {
        const blob = await pdf(b.dataset.doc, o, s);
        const name = `${Docs.TYPES[b.dataset.doc].file}_${o.num}.pdf`;
        const url = URL.createObjectURL(blob);
        // Скачивание после долгого ожидания телефоны часто блокируют, поэтому даём настоящие ссылки: касание по ним срабатывает всегда
        const box = document.createElement('div'); box.className = 'docs-row'; box.style.marginTop = '8px';
        box.innerHTML = `<a class="btn btn--gold" href="${url}" target="_blank" rel="noopener">Открыть PDF</a><a class="btn" href="${url}" download="${esc(name)}">Сохранить</a>`;
        b.after(box); b.remove();
        toast('PDF готов');
        return;
      } catch (err) { toast('Не получилось: ' + err.message); }
      b.disabled = false; b.textContent = label;
    };
  }

  load();
})();
