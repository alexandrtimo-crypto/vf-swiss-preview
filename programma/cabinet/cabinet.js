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

  async function load() {
    if (!token) { view.innerHTML = '<div class="empty">Ссылка неполная. Отсканируйте QR на карточке ещё раз.</div>'; return; }
    // В демо кабинет читает ту же базу браузера, что и приложение мастера (store-demo.js)
    const data = window.Store?.cabinetByToken ? await Store.cabinetByToken(token)
      : await fetch('/api/k/' + encodeURIComponent(token)).then(r => (r.ok ? r.json() : null)).catch(() => null);
    if (!data) { view.innerHTML = '<div class="empty">Кабинет не найден. Проверьте QR или позвоните в мастерскую.</div>'; return; }
    const s = { ...Docs.DEFAULTS, ...data.settings };
    document.getElementById('code').textContent = data.code;
    contacts(s);

    if (!data.active) {
      view.innerHTML = `<section class="card inactive"><img src="${Docs.ASSETS}logo-color.png" alt="VF swiss">
        <h2>Карточка ${esc(data.code)}</h2>
        <p class="hint">Кабинет ещё не активирован. Покажите эту карточку мастеру, когда будете сдавать часы, — здесь появятся статус ремонта, документы и гарантия.</p>
        <p class="hint">${esc(s.address)}</p></section>`;
      return;
    }

    const name = (data.client?.name || '').split(' ')[0];
    view.innerHTML = `<h1 class="hello">${name ? `Здравствуйте, ${esc(name)}` : 'Ваш кабинет'}</h1>
      <p class="hint">${data.client?.phone ? `Телефон ${esc(maskPhone(data.client.phone))} · ` : ''}карточка ${esc(data.code)}</p>
      ${data.orders.length ? data.orders.map((o, i) => orderCard(o, s, i)).join('') : '<div class="empty">Заказов пока нет. Они появятся здесь, как только мастер примет часы.</div>'}`;

    view.addEventListener('click', async e => {
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
    });
  }


  load();
})();
