// VF swiss · Документы: карточка заказа от приёмки до выдачи и печать документов
(() => {
  const view = document.getElementById('view');
  const { esc } = Docs;
  const STEPS = [
    { id: 'priem', label: 'Приёмка' },
    { id: 'diag', label: 'Диагностика' },
    { id: 'work', label: 'Ремонт' },
    { id: 'done', label: 'Выдача' },
  ];
  const STATUS = Object.fromEntries(STEPS.map(s => [s.id, s.label]));
  const QUICK_WORKS = ['Диагностика', 'Полное обслуживание механизма', 'Полировка корпуса и браслета', 'Замена элемента питания', 'Проверка герметичности', 'Замена стекла', 'Замена ремешка'];
  const PREFS_KEY = 'vf-docs-prefs';

  let settings, order, saveTimer;

  const toast = (text, ms = 2200) => {
    const t = document.getElementById('toast');
    t.textContent = text; t.classList.add('is-on');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('is-on'), ms);
  };
  const prefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; } };
  const setPref = (k, v) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs(), [k]: v })); } catch {} };

  function formatPhone(value) {
    let d = value.replace(/\D/g, '');
    if (d.startsWith('8') || d.startsWith('7')) d = d.slice(1);
    d = d.slice(0, 10);
    if (!d) return '';
    let r = '+7 (' + d.slice(0, 3);
    if (d.length > 3) r += ') ' + d.slice(3, 6);
    if (d.length > 6) r += '-' + d.slice(6, 8);
    if (d.length > 8) r += '-' + d.slice(8, 10);
    return r;
  }

  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const set = (obj, path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((o, k) => (o[k] ??= {}), obj)[last] = v; };
  const total = o => o.works.reduce((s, r) => s + (Number(r.qty) || 1) * (Number(r.price) || 0), 0);
  const watchTitle = o => [o.watch.brand, o.watch.model].filter(Boolean).join(' ') || 'Часы не указаны';
  // заказы, созданные до появления отчества и пунктов осмотра, дополняем пустыми полями
  const norm = o => { if (!o) return o; o.client = { patronymic: '', email: '', owner: '', ...o.client }; o.inspect ??= {}; return o; };
  const toLocalDate = iso => (iso ? iso.slice(0, 10) : '');

  // ---------- Сохранение ----------
  function scheduleSave() {
    const s = document.querySelector('.saved');
    if (s) { s.textContent = 'Сохраняю…'; s.classList.remove('is-on'); }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await Store.saveOrder(order);
      const s2 = document.querySelector('.saved');
      if (s2) { s2.textContent = '✓ Сохранено'; s2.classList.add('is-on'); }
    }, 400);
  }

  // ---------- Главный экран ----------
  async function renderHome() {
    const orders = await Store.listOrders();
    view.innerHTML = `
      <button class="new-order" id="new"><span class="new-order__plus">+</span><span><b>Принять часы</b><span>Новая карточка заказа и акт приёма</span></span></button>
      <a class="btn btn--wide cabs-link" href="#/cabinets">Карточки-кабинеты клиентов</a>
      ${orders.length ? '<input class="search" id="q" type="search" placeholder="Поиск: номер, имя, телефон, марка, карточка">' : ''}
      <div class="orders" id="list"></div>`;
    const list = document.getElementById('list');
    const draw = q => {
      q = (q || '').toLowerCase().trim();
      const items = orders.filter(o => !q || [o.num, Docs.fullName(o.client), o.client.phone, o.watch.brand, o.watch.model, o.watch.serial, o.cabinet?.code].join(' ').toLowerCase().includes(q));
      list.innerHTML = items.length ? items.map(o => `
        <a class="order-card" href="#/order/${o.id}">
          <span class="order-card__num">${esc(o.num)} · ${Docs.dmy(new Date(o.created))}${o.cabinet ? ` · <span class="nowrap">${esc(o.cabinet.code)}</span>` : ''}</span>
          <span class="chip chip--${o.status}">${STATUS[o.status]}</span>
          <span class="order-card__who">${esc(Docs.fullName(o.client)) || 'Клиент без имени'}</span><span></span>
          <span class="order-card__what">${esc(watchTitle(o))}${o.works.length ? ` · ${total(o).toLocaleString('ru-RU')} ₽` : ''}</span>
        </a>`).join('')
        : `<div class="empty">${orders.length ? 'Ничего не найдено' : 'Заказов пока нет. Нажмите «Принять часы», когда клиент принесёт часы.'}</div>`;
    };
    draw();
    document.getElementById('q')?.addEventListener('input', e => draw(e.target.value));
    document.getElementById('new').onclick = async () => { const o = await Store.newOrder(); location.hash = `#/order/${o.id}`; };
  }

  // ---------- Карточка заказа ----------
  const inp = (path, label, attrs = '', cls = '') =>
    `<label class="f ${cls}"><span>${label}</span><input data-path="${path}" value="${esc(get(order, path))}" ${attrs}></label>`;
  const area = (path, label, ph = '', cls = 'f--wide') =>
    `<label class="f ${cls}"><span>${label}</span><textarea data-path="${path}" placeholder="${esc(ph)}">${esc(get(order, path))}</textarea></label>`;

  // Выбор галочками: один вариант (single) или несколько; «без дефектов» исключает остальные
  const chip = (on, text, attrs) => `<button type="button" class="chip-opt${on ? ' is-on' : ''}" aria-pressed="${on}" ${attrs}>${esc(text)}</button>`;
  const inspectGroup = g => {
    const cur = order.inspect[g.id] || [];
    return `<div class="insp" data-g="${g.id}"><h4>${g.label}</h4><div class="chips">${g.opts.map((t, i) => chip(cur.includes(t), t, `data-i="${i}"`)).join('')}</div></div>`;
  };

  function workRow(r, i) {
    return `<div class="work" data-i="${i}">
      <label class="f f--name"><span>Работа или деталь</span><input data-w="name" value="${esc(r.name)}" placeholder="Например, замена стекла"></label>
      <label class="f"><span>Тип</span><select data-w="kind"><option value="work"${r.kind !== 'part' ? ' selected' : ''}>Работа</option><option value="part"${r.kind === 'part' ? ' selected' : ''}>Деталь</option></select></label>
      <label class="f"><span>Кол-во</span><input data-w="qty" type="number" min="1" inputmode="numeric" value="${esc(r.qty || 1)}"></label>
      <label class="f"><span>Цена, ₽</span><input data-w="price" type="number" min="0" step="50" inputmode="decimal" value="${esc(r.price || '')}"></label>
      <button class="work__del" data-del="${i}" aria-label="Удалить строку">✕</button>
    </div>`;
  }

  async function renderOrder(id) {
    order = norm(await Store.getOrder(id));
    if (!order) { location.hash = '#/'; return; }
    const stepIdx = STEPS.findIndex(s => s.id === order.status);
    const wm = order.warrantyMonths ?? settings.warrantyMonths;
    view.innerHTML = `
      <div class="order-head"><h2>${esc(order.num)}</h2><span class="saved is-on">✓ Сохранено</span></div>
      <div class="steps" role="group" aria-label="Этап заказа">
        ${STEPS.map((s, i) => `<button class="step ${i < stepIdx ? 'is-past' : ''} ${i === stepIdx ? 'is-now' : ''}" data-step="${s.id}" aria-pressed="${i === stepIdx}">${s.label}</button>`).join('')}
      </div>

      <section class="card cab" id="cab">${cabinetBlock()}</section>

      <section class="card"><h3>Клиент</h3><div class="fields">
        ${inp('client.name', 'Фамилия и имя', 'autocomplete="off" placeholder="Петров Иван"')}
        ${inp('client.patronymic', 'Отчество', 'autocomplete="off" placeholder="Сергеевич"')}
        ${inp('client.phone', 'Телефон', 'type="tel" inputmode="tel" placeholder="+7 (___) ___-__-__"')}
        ${inp('client.email', 'Email', 'type="email" inputmode="email" autocomplete="off" placeholder="необязательно"')}
        <div class="f f--wide"><span>Кто сдаёт часы</span><div class="chips" id="owner">
          ${chip(order.client.owner === 'owner', 'Владелец часов', 'data-v="owner"')}${chip(order.client.owner === 'other', 'Не являюсь владельцем часов', 'data-v="other"')}</div></div>
        <div class="f f--wide"><span>Как связаться</span><div class="seg" id="contact">
          <button type="button" data-v="call" class="${order.client.contact !== 'telegram' ? 'is-on' : ''}">Звонок</button>
          <button type="button" data-v="telegram" class="${order.client.contact === 'telegram' ? 'is-on' : ''}">Telegram</button></div></div>
      </div></section>

      <section class="card"><h3>Часы</h3><div class="fields">
        ${inp('watch.brand', 'Марка', 'list="brands" placeholder="Rolex"')}
        ${inp('watch.model', 'Модель', 'placeholder="Submariner Date"')}
        ${inp('watch.ref', 'Референс', 'placeholder="126610LN"')}
        ${inp('watch.serial', 'Серийный номер', 'placeholder="Номер корпуса"')}
        <div class="f f--wide"><span>Тип механизма</span><div class="chips" id="movement">
          ${Docs.MOVEMENTS.map(t => chip(order.watch.movement === t || (t === 'иной' && order.watch.movement && !Docs.MOVEMENTS.includes(order.watch.movement)), t, `data-v="${t}"`)).join('')}</div></div>
        ${inp('watch.material', 'Материал корпуса / браслета', 'placeholder="Сталь, браслет Oyster"')}
        ${inp('watch.kit', 'Комплектность', 'placeholder="Часы, коробка, документы, 2 звена"', 'f--wide')}
        
        <div class="f f--wide"><span>Фото при приёмке <small>(попадут в акт приёма, до 4)</small></span>
          <div class="photos" id="photos">${order.photos.map((p, i) => `<div class="photo"><img src="${p}" alt="Фото ${i + 1}"><button data-ph="${i}" aria-label="Удалить фото">✕</button></div>`).join('')}
            <label class="photo-add">＋<br>Фото<input type="file" accept="image/*" capture="environment" multiple id="photoIn"></label></div>
        </div>
      </div></section>

      <section class="card" id="inspect"><h3>Осмотр при приёме <small>отмечайте пальцем, как в бумажном акте</small></h3>
        ${Docs.INSPECT.map(inspectGroup).join('')}
        ${area('watch.condition', 'Примечание к осмотру', 'Если нужно, опишите подробнее')}
      </section>

      <section class="card"><h3>Неисправность и оценка</h3><div class="fields">
        ${area('issue', 'Со слов клиента', 'Остановились после падения, отстают на 2 минуты в сутки')}
        ${inp('estimate', 'Предварительная оценка', 'placeholder="после бесплатной диагностики"')}
        ${inp('due', 'Ориентировочный срок', 'type="date"')}
      </div></section>

      <section class="card"><h3>Работы и детали <small>для акта</small></h3>
        <div class="quick" id="quick">${QUICK_WORKS.map(w => `<button type="button">${w}</button>`).join('')}</div>
        <div class="works" id="works">${order.works.map(workRow).join('')}</div>
        <button class="btn btn--ghost btn--wide" id="addWork" style="margin-top:10px">＋ Добавить строку</button>
        <div class="sum"><span>Итого</span><b id="sum">${total(order).toLocaleString('ru-RU')} ₽</b></div>
      </section>

      <section class="card"><h3>Выдача и гарантия</h3><div class="fields">
        <label class="f"><span>Дата выдачи</span><input type="date" id="issued" value="${toLocalDate(order.issued)}"></label>
        <label class="f"><span>Гарантия, месяцев</span><input type="number" min="0" max="60" id="wm" value="${esc(wm)}"></label>
        ${inp('conditionOut', 'Отметка при выдаче (необязательно)', 'placeholder="Ход проверен на таймграфере"', 'f--wide')}
      </div></section>

      <div class="danger-zone"><button class="btn btn--danger" id="del">Удалить заказ</button></div>
      <datalist id="brands">${['Rolex', 'Patek Philippe', 'Audemars Piguet', 'Vacheron Constantin', 'Breguet', 'Cartier', 'Breitling', 'Franck Muller', 'Blancpain', 'Omega', 'IWC', 'Jaeger-LeCoultre', 'Panerai', 'Tudor', 'TAG Heuer', 'Hublot', 'Longines'].map(b => `<option value="${b}">`).join('')}</datalist>

      <nav class="dock" aria-label="Документы">
        <a class="btn" href="#/doc/${order.id}/intake">Акт приёма</a>
        <a class="btn btn--gold" href="#/doc/${order.id}/act">Акт работ</a>
      </nav>`;
    bindOrder();
    if (order.cabinet) Store.lookupCabinet(order.cabinet.code).then(c => {
      const el = document.getElementById('cabstate'); if (!el) return;
      el.textContent = c.state === 'active' ? `Клиент вошёл в кабинет${c.display_name ? ` («${c.display_name}»)` : ''}` : c.state === 'reset' ? 'Доступ сброшен: клиент ждёт нового пароля' : 'Клиент ещё не активировал кабинет (задаёт имя и пароль по QR)';
    }).catch(() => {});
  }

  const cabinetUrl = token => Docs.cabUrl((settings.publicUrl || location.origin).replace(/\/$/, ''), token);

  function cabinetBlock() {
    const c = order.cabinet;
    if (c) return `<h3>Кабинет клиента</h3>
      <div class="cab__row"><span class="cab__code">${esc(c.code)}</span>
        <span class="cab__text">Клиент видит статус ремонта, акт приёма, акт работ и гарантию по QR на своей карточке.<br><b id="cabstate" class="cab__state"></b></span>
        <a class="btn" href="${esc(cabinetUrl(c.token))}" target="_blank" rel="noopener">Открыть кабинет</a></div>`;
    return `<h3>Кабинет клиента</h3>
      <p class="hint">Выдайте клиенту карточку с QR и отсканируйте её — заказ появится в его кабинете. Постоянный клиент — отсканируйте его карточку, данные подставятся сами.</p>
      <div class="cab__row">
        <button class="btn btn--gold" id="scan" type="button">Сканировать карточку</button>
        <input id="cabq" class="cab__input" placeholder="или номер, например 123" inputmode="numeric" autocomplete="off">
        <button class="btn" id="cabgo" type="button">Привязать</button>
      </div>`;
  }

  async function attachCabinet(q) {
    if (!q) return;
    const c = await Store.lookupCabinet(q);
    const owner = c.bound && c.client?.name;
    if (owner && order.client.name && owner !== order.client.name &&
        !confirm(`Карточка ${c.code} уже выдана клиенту «${owner}». Всё равно привязать этот заказ к ней?`)) return;
    if (c.bound && c.client && !order.client.name) order.client = { ...order.client, ...c.client };
    await Store.bindCabinet(c.code, order.client);
    order.cabinet = { code: c.code, token: c.token };
    await Store.saveOrder(order);
    toast(owner ? `Постоянный клиент: ${owner} · ${c.code}` : `Карточка ${c.code} привязана`);
    renderOrder(order.id);
  }

  function bindOrder() {
    const cabErr = err => toast(err.message || String(err), 3500);
    view.querySelector('#scan')?.addEventListener('click', () => scanQr().then(attachCabinet).catch(cabErr));
    view.querySelector('#cabgo')?.addEventListener('click', () => attachCabinet(view.querySelector('#cabq').value.trim()).catch(cabErr));
    view.querySelector('#cabq')?.addEventListener('keydown', e => { if (e.key === 'Enter') view.querySelector('#cabgo').click(); });

    view.querySelectorAll('[data-path]').forEach(el => {
      const ev = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(ev, () => {
        if (el.dataset.path === 'client.phone') el.value = formatPhone(el.value);
        set(order, el.dataset.path, el.value);
        scheduleSave();
      });
    });

    view.querySelector('#owner').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      order.client.owner = order.client.owner === b.dataset.v ? '' : b.dataset.v;
      view.querySelectorAll('#owner .chip-opt').forEach(x => { const on = x.dataset.v === order.client.owner; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
      scheduleSave();
    });
    view.querySelector('#movement').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      order.watch.movement = order.watch.movement === b.dataset.v ? '' : b.dataset.v;
      view.querySelectorAll('#movement .chip-opt').forEach(x => { const on = x.dataset.v === order.watch.movement; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
      scheduleSave();
    });
    view.querySelector('#inspect').addEventListener('click', e => {
      const b = e.target.closest('.chip-opt'); if (!b) return;
      const grp = Docs.INSPECT.find(g => g.id === b.closest('.insp').dataset.g), text = grp.opts[+b.dataset.i];
      let cur = order.inspect[grp.id] || [];
      if (cur.includes(text)) cur = cur.filter(x => x !== text);
      else cur = text === Docs.OK ? [Docs.OK] : [...cur.filter(x => x !== Docs.OK), text];
      order.inspect[grp.id] = cur;
      b.closest('.chips').querySelectorAll('.chip-opt').forEach((x, i) => { const on = cur.includes(grp.opts[i]); x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
      scheduleSave();
    });

    view.querySelector('#contact').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      order.client.contact = b.dataset.v;
      view.querySelectorAll('#contact button').forEach(x => x.classList.toggle('is-on', x === b));
      scheduleSave();
    });

    view.querySelector('.steps').addEventListener('click', e => {
      const b = e.target.closest('[data-step]'); if (!b || b.dataset.step === order.status) return;
      order.status = b.dataset.step;
      order.history.push({ at: new Date().toISOString(), status: order.status });
      if (order.status === 'done' && !order.issued) order.issued = new Date().toISOString();
      const i = STEPS.findIndex(s => s.id === order.status);
      view.querySelectorAll('.step').forEach((el, j) => { el.className = `step ${j < i ? 'is-past' : ''} ${j === i ? 'is-now' : ''}`; el.setAttribute('aria-pressed', j === i); });
      if (order.status === 'done') view.querySelector('#issued').value = toLocalDate(order.issued);
      scheduleSave();
    });

    // Работы
    const works = view.querySelector('#works');
    const redrawWorks = () => { works.innerHTML = order.works.map(workRow).join(''); updateSum(); };
    const updateSum = () => { view.querySelector('#sum').textContent = `${total(order).toLocaleString('ru-RU')} ₽`; };
    const addWork = name => { order.works.push({ name, kind: 'work', qty: 1, price: '' }); redrawWorks(); scheduleSave(); works.querySelector('.work:last-child [data-w="' + (name ? 'price' : 'name') + '"]')?.focus(); };
    view.querySelector('#addWork').onclick = () => addWork('');
    view.querySelector('#quick').addEventListener('click', e => { const b = e.target.closest('button'); if (b) addWork(b.textContent); });
    works.addEventListener('input', e => {
      const row = e.target.closest('.work'); const k = e.target.dataset.w; if (!row || !k) return;
      order.works[+row.dataset.i][k] = e.target.value; updateSum(); scheduleSave();
    });
    works.addEventListener('change', e => { if (e.target.dataset.w === 'kind') { order.works[+e.target.closest('.work').dataset.i].kind = e.target.value; scheduleSave(); } });
    works.addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (b) { order.works.splice(+b.dataset.del, 1); redrawWorks(); scheduleSave(); } });

    view.querySelector('#issued').addEventListener('input', e => { order.issued = e.target.value ? new Date(e.target.value + 'T12:00').toISOString() : ''; scheduleSave(); });
    view.querySelector('#wm').addEventListener('input', e => { order.warrantyMonths = e.target.value === '' ? null : Number(e.target.value); scheduleSave(); });

    // Фото: сжимаем до 1000 px, чтобы карточки не раздувались
    view.querySelector('#photoIn').addEventListener('change', async e => {
      for (const file of [...e.target.files].slice(0, 4 - order.photos.length)) order.photos.push(await shrink(file));
      // сначала сохраняем: экран перерисуется из сохранённого заказа, иначе фото и недавние правки пропадут
      clearTimeout(saveTimer); await Store.saveOrder(order); renderOrder(order.id);
    });
    view.querySelector('#photos').addEventListener('click', e => {
      const b = e.target.closest('[data-ph]'); if (!b) return;
      order.photos.splice(+b.dataset.ph, 1); scheduleSave(); b.parentElement.remove();
    });

    view.querySelector('#del').onclick = async () => {
      if (!confirm(`Удалить заказ ${order.num} без возможности восстановления?`)) return;
      await Store.deleteOrder(order.id); toast('Заказ удалён'); location.hash = '#/';
    };
  }

  function shrink(file, max = 1000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // ---------- Документ ----------
  async function renderDoc(id, type) {
    order = norm(await Store.getOrder(id));
    if (!order || !Docs.TYPES[type]) { location.hash = '#/'; return; }
    const p = prefs();
    let mode = p.mode || 'color', copies = p.copies || 1;
    const t = Docs.TYPES[type];
    view.innerHTML = `
      <div class="order-head"><h2>${t.title}</h2><a class="saved" href="#/order/${order.id}">← к заказу ${esc(order.num)}</a></div>
      <div class="doc-tools">
        <div class="f"><span>Печать</span><div class="seg" id="mode"><button data-v="color">Цветная</button><button data-v="bw">Чёрно-белая</button></div></div>
        <div class="f"><span>Экземпляры</span><div class="seg" id="copies"><button data-v="1">Один лист</button><button data-v="2">Два: клиенту и нам</button></div></div>
      </div>
      <section class="card ready" id="ready" aria-live="polite">
        <b class="ready__st">Готовлю PDF…</b>
        <div class="ready__row" id="rbtns" hidden>
          <a class="btn btn--gold" id="ropen" target="_blank" rel="noopener">Открыть</a>
          <a class="btn" id="rsave">Сохранить</a>
          <button class="btn" id="rshare" type="button" hidden>Отправить</button>
        </div>
        <p class="hint" id="rhint"></p>
      </section>
      <div class="preview" id="preview"></div>
      <nav class="dock">
        <button class="btn" id="print">Печать</button>
        <button class="btn btn--gold" id="pdf">Скачать PDF</button>
      </nav>`;

    const preview = view.querySelector('#preview');
    let draw = () => {
      preview.className = `preview docs docs--${mode}`;
      preview.innerHTML = Docs.render(type, order, settings, copies, mode);
      Docs.mountQr(preview);
      fit();
      view.querySelectorAll('#mode button').forEach(b => b.classList.toggle('is-on', b.dataset.v === mode));
      view.querySelectorAll('#copies button').forEach(b => b.classList.toggle('is-on', +b.dataset.v === copies));
    };
    // Лист A4 масштабируется под ширину экрана
    const fit = () => {
      const w = preview.clientWidth - 24;
      const k = Math.min(1, w / (210 * 96 / 25.4));
      preview.querySelectorAll('.sheet').forEach(s => { s.style.zoom = k; });
    };
    view.querySelector('#mode').onclick = e => { const b = e.target.closest('button'); if (b) { mode = b.dataset.v; setPref('mode', mode); draw(); } };
    view.querySelector('#copies').onclick = e => { const b = e.target.closest('button'); if (b) { copies = +b.dataset.v; setPref('copies', copies); draw(); } };
    window.onresize = fit;
    draw();

    const fileName = () => `${t.file}_${order.num}${order.client.name ? '_' + order.client.name.split(' ')[0] : ''}${mode === 'bw' ? '_чб' : ''}.pdf`;
    const opts = () => ({ type, mode, copies });

    // PDF готовится заранее, пока человек смотрит лист: телефоны разрешают скачивание и «Поделиться» только сразу после касания,
    // поэтому к моменту нажатия файл уже должен лежать в памяти
    const ready = view.querySelector('#ready');
    const rst = ready.querySelector('.ready__st');
    const hintBox = view.querySelector('#rhint');
    let built = null, seq = 0, timer = 0, chain = Promise.resolve();
    const app = inAppBrowser();
    const kb = n => (n > 1048576 ? (n / 1048576).toFixed(1) + ' МБ' : Math.round(n / 1024) + ' КБ');
    const paintHint = () => {
      hintBox.innerHTML = app
        ? `<b>Вы открыли страницу внутри приложения (${esc(app)}).</b> Скачивание файлов там часто не работает. Откройте эту страницу в Chrome или Safari: меню ⋮ → «Открыть в браузере». <button class="linkbtn" id="copylink" type="button">Скопировать ссылку</button>`
        : 'Файл не открылся? Нажмите «Сохранить» и откройте его из загрузок, либо «Печать» → «Сохранить как PDF».';
      hintBox.querySelector('#copylink')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); toast('Ссылка скопирована'); } catch { toast('Скопируйте адрес из строки браузера'); } });
    };
    paintHint();
    function paintReady() {
      ready.dataset.state = 'ok';
      rst.textContent = `PDF готов · ${built.name} · ${kb(built.blob.size)}`;
      const open = view.querySelector('#ropen'), save = view.querySelector('#rsave'), sh = view.querySelector('#rshare');
      open.href = built.url; save.href = built.url; save.download = built.name;
      view.querySelector('#rbtns').hidden = false;
      const file = new File([built.blob], built.name, { type: 'application/pdf' });
      sh.hidden = !navigator.canShare?.({ files: [file] });
      sh.onclick = () => navigator.share({ files: [file], title: built.name }).catch(() => {});  // вызывается прямо по касанию, без ожидания
    }
    function rebuild(now) {
      clearTimeout(timer);
      const my = ++seq;
      ready.dataset.state = 'busy'; rst.textContent = 'Готовлю PDF…'; view.querySelector('#rbtns').hidden = true;
      timer = setTimeout(() => {
        chain = chain.then(async () => {
          if (my !== seq) return;
          try {
            const blob = await makePdf(opts());
            if (my !== seq) return;
            if (built?.url) URL.revokeObjectURL(built.url);
            built = { blob, url: URL.createObjectURL(blob), name: fileName() };
            paintReady();
          } catch (err) {
            console.error(err);
            if (my !== seq) return;
            built = null; ready.dataset.state = 'err';
            rst.innerHTML = `Не получилось подготовить PDF: ${esc(err.message || err)}. <button class="linkbtn" id="retry" type="button">Повторить</button>`;
            rst.querySelector('#retry').onclick = () => rebuild(true);
          }
        });
      }, now ? 0 : 450);
    }
    // перерисовка листа (режим печати, число экземпляров) заново готовит файл
    const draw0 = draw;
    draw = () => { draw0(); rebuild(); };
    rebuild();

    view.querySelector('#pdf').onclick = () => {
      if (!built) { toast('PDF ещё готовится, через пару секунд появятся кнопки'); return; }
      const a = document.createElement('a'); a.href = built.url; a.download = built.name; document.body.append(a); a.click(); a.remove();
      toast('PDF готов — если файл не появился, нажмите «Сохранить» выше');
    };
    view.querySelector('#print').onclick = () => printDoc(opts());

  }

  // Встроенные браузеры приложений (Telegram, Instagram и др.) часто не умеют сохранять файлы
  function inAppBrowser() {
    const ua = navigator.userAgent;
    if (/Telegram/i.test(ua)) return 'Telegram';
    if (/Instagram/i.test(ua)) return 'Instagram';
    if (/FBAN|FBAV/i.test(ua)) return 'Facebook';
    if (/VKClient|VK\//i.test(ua)) return 'VK';
    if (/; wv\)/.test(ua)) return 'встроенный браузер';
    return '';
  }

  async function withBusy(sel, fn) {
    const b = view.querySelector(sel); const label = b.textContent;
    b.disabled = true; b.textContent = 'Готовлю…';
    try { await fn(); } catch (err) { console.error(err); toast('Не получилось: ' + (err.message || err)); }
    finally { b.disabled = false; b.textContent = label; }
  }

  // Листы рисуются вне экрана в натуральную величину и по одному кладутся в PDF
  async function stage({ type, mode, copies }, cls) {
    const el = document.createElement('div');
    el.className = `docs docs--${mode} ${cls}`;
    el.innerHTML = Docs.render(type, order, settings, copies, mode, cls === 'pdf-stage');
    document.body.appendChild(el);
    Docs.mountQr(el);
    await document.fonts.ready;
    await Promise.all([...el.querySelectorAll('img')].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    return el;
  }

  async function makePdf(o) {
    if (!window.html2pdf) throw new Error('модуль PDF ещё загружается, попробуйте через секунду');
    const el = await stage(o, 'pdf-stage');
    try {
      const sheets = [...el.querySelectorAll('.sheet')];
      const cfg = { margin: 0, image: { type: 'jpeg', quality: 0.94 }, html2canvas: { scale: 2.4, useCORS: true, backgroundColor: '#ffffff', logging: false }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
      let worker = html2pdf().set(cfg).from(sheets[0]).toPdf();
      for (const s of sheets.slice(1)) worker = worker.get('pdf').then(pdf => pdf.addPage()).from(s).toContainer().toCanvas().toPdf();
      return await worker.output('blob');
    } finally { el.remove(); }
  }

  async function printDoc(o) {
    const el = await stage(o, 'print-root');
    window.addEventListener('afterprint', () => el.remove(), { once: true });
    window.print();
  }

  // ---------- Сканер QR (камера + jsQR) ----------
  const loadScript = src => new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Не загрузился модуль сканера')); document.head.append(s); });

  async function scanQr() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Камера недоступна в этом браузере — введите номер карточки');
    if (!window.jsQR) await loadScript(new URL('vendor/jsQR.js', document.baseURI).href);
    const dlg = document.createElement('dialog');
    dlg.className = 'scan';
    dlg.innerHTML = '<div class="scan__frame"><video playsinline muted></video><i></i></div><p>Наведите камеру на QR карточки клиента</p><button class="btn btn--wide" type="button">Отмена</button>';
    document.body.append(dlg); dlg.showModal();
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); }
    catch { dlg.remove(); throw new Error('Нет доступа к камере — введите номер карточки'); }
    const video = dlg.querySelector('video');
    video.srcObject = stream; await video.play();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    return new Promise(resolve => {
      let done = false;
      const stop = v => { if (done) return; done = true; stream.getTracks().forEach(t => t.stop()); dlg.close(); dlg.remove(); resolve(v); };
      dlg.querySelector('button').onclick = () => stop(null);
      dlg.addEventListener('cancel', () => stop(null));
      const tick = () => {
        if (done) return;
        if (video.readyState >= 2) {
          const k = Math.min(1, 640 / video.videoWidth);
          canvas.width = video.videoWidth * k; canvas.height = video.videoHeight * k;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const r = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          if (r?.data) return stop(r.data);
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  // ---------- Вход мастера ----------
  function renderLogin() {
    view.innerHTML = `<section class="card login"><h3>Вход для мастерской</h3>
      <form id="login" class="fields"><label class="f f--wide"><span>Пароль</span><input type="password" name="pw" autocomplete="current-password" required></label>
      <button class="btn btn--gold btn--wide f--wide">Войти</button></form></section>`;
    view.querySelector('#login').onsubmit = async e => {
      e.preventDefault();
      try { await Store.login(e.target.pw.value); route(); }
      catch (err) { toast(err.message); }
    };
    view.querySelector('input').focus();
  }
  window.addEventListener('vf:login', () => { if (!view.querySelector('#login')) renderLogin(); });

  // ---------- Карточки-кабинеты ----------
  async function renderCabinets() {
    const cabs = await Store.listCabinets();
    const used = cabs.filter(c => c.bound_at).length;
    const firstFree = cabs.find(c => !c.bound_at)?.code.slice(2) || '1';
    view.innerHTML = `
      <div class="order-head"><h2>Карточки клиентов</h2><a class="saved" href="#/">← к заказам</a></div>
      <p class="hint">Выдано ${used} из ${cabs.length}. Каждая карточка — личный кабинет: клиент сканирует QR и видит свои ремонты, документы и гарантию.</p>
      <section class="card"><h3>Печать карточек</h3><div class="fields">
        <label class="f"><span>С номера</span><input id="from" type="number" min="1" max="${cabs.length}" value="${+firstFree}"></label>
        <label class="f"><span>По номер</span><input id="to" type="number" min="1" max="${cabs.length}" value="${Math.min(cabs.length, +firstFree + 49)}"></label>
        <a class="btn btn--gold btn--wide f--wide" id="printCards" href="#">Открыть лист печати (10 карточек на A4)</a>
      </div></section>
      <input class="search" id="q" type="search" placeholder="Поиск: номер карточки или имя">
      <div class="cabs" id="cabs"></div>`;
    const list = view.querySelector('#cabs');
    const draw = q => {
      q = (q || '').toLowerCase().trim();
      const seenAt = v => { const d = new Date(typeof v === 'string' && !/Z|\+/.test(v) ? v + 'Z' : v); return isNaN(d) ? '' : `${Docs.dmy(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
      const STATE_TXT = { active: 'клиент вошёл в кабинет', reset: 'доступ сброшен, ждёт нового пароля', new: 'клиент ещё не активировал' };
      list.innerHTML = cabs.slice().sort((x, y) => (y.bound_at ? 1 : 0) - (x.bound_at ? 1 : 0) || x.code.localeCompare(y.code)).filter(c => !q || c.code.toLowerCase().includes(q) || (c.client?.name || '').toLowerCase().includes(q) || (c.display_name || '').toLowerCase().includes(q)).map(c => c.bound_at || c.state !== 'new'
        ? `<div class="cab-tile is-bound" data-state="${c.state}"><a href="${esc(cabinetUrl(c.token))}" target="_blank" rel="noopener"><b>${c.code}</b><span>${esc(c.client?.name || c.display_name || 'без имени')}</span>${c.display_name ? `<small>обращаться: ${esc(c.display_name)}</small>` : ''}<small>${c.orders} зак. · ${STATE_TXT[c.state]}</small>${c.last_seen ? `<small>заходил ${esc(seenAt(c.last_seen))}</small>` : ''}</a>${c.state === 'new' ? '' : `<button class="cab-reset" type="button" data-reset="${c.code}">Сбросить доступ</button>`}</div>`
        : `<div class="cab-tile"><b>${c.code}</b><span>свободна</span></div>`).join('');
    };
    draw();
    view.querySelector('#q').oninput = e => draw(e.target.value);
    list.addEventListener('click', async e => {
      const b = e.target.closest('[data-reset]'); if (!b) return;
      if (!confirm(`Сбросить доступ к кабинету ${b.dataset.reset}? Клиент потеряет вход и сможет задать новый пароль только по коду, который вы ему назовёте. Делайте это, когда убедились, что карточка его.`)) return;
      try {
        const { pin } = await Store.resetCabinet(b.dataset.reset);
        alert(`Код для клиента: ${pin}\n\nНазовите его клиенту. Он отсканирует QR, введёт этот код и придумает новый пароль. Код показывается один раз.`);
        renderCabinets();
      } catch (err) { toast(err.message || String(err), 3500); }
    });
    view.querySelector('#printCards').onclick = e => { e.preventDefault(); location.hash = `#/cards/${view.querySelector('#from').value}/${view.querySelector('#to').value}`; };
  }

  async function renderCards(from, to) {
    const cabs = (await Store.listCabinets()).slice(Math.max(0, from - 1), Math.max(from, to));
    const base = (settings.publicUrl || location.origin).replace(/\/$/, '');
    const local = !window.VF_DEMO && /localhost|127\.0\.0\.1|\[::1\]/.test(base);
    view.innerHTML = `
      <div class="order-head"><h2>Карточки ${cabs[0]?.code}–${cabs.at(-1)?.code}</h2><a class="saved" href="#/cabinets">← к карточкам</a></div>
      ${local ? `<p class="warn">QR ведут на ${esc(base)} — это адрес для проверки. Перед печатью тиража укажите настоящий адрес сайта в «Настройках», иначе QR не откроются у клиентов.</p>` : ''}
      <p class="hint">Формат визитки 90×50 мм, 10 штук на лист A4. Печатайте с масштабом 100%.</p>
      <div class="preview docs" id="preview">${Docs.cards(cabs, settings, base)}</div>
      <nav class="dock"><button class="btn btn--gold" id="print">Печать</button></nav>`;
    const preview = view.querySelector('#preview');
    Docs.mountQr(preview);
    const fit = () => { const k = Math.min(1, (preview.clientWidth - 24) / (210 * 96 / 25.4)); preview.querySelectorAll('.sheet').forEach(s => { s.style.zoom = k; }); };
    fit(); window.onresize = fit;
    view.querySelector('#print').onclick = () => {
      const el = document.createElement('div');
      el.className = 'docs print-root';
      el.innerHTML = Docs.cards(cabs, settings, base);
      document.body.append(el); Docs.mountQr(el);
      window.addEventListener('afterprint', () => el.remove(), { once: true });
      setTimeout(() => window.print(), 150);
    };
  }

  // ---------- Настройки ----------
  async function renderSettings() {
    const s = settings;
    const row = (k, label, attrs = '', cls = '') => `<label class="f ${cls}"><span>${label}</span><input data-k="${k}" value="${esc(s[k])}" ${attrs}></label>`;
    const box = (k, label, cls = 'f--wide') => `<label class="f ${cls}"><span>${label}</span><textarea data-k="${k}" rows="5">${esc(s[k])}</textarea></label>`;
    view.innerHTML = `
      <div class="order-head"><h2>Настройки</h2><a class="saved" href="#/">← к заказам</a></div>
      <section class="card"><h3>Шапка документов</h3><div class="fields">
        ${row('company', 'Название')}
        ${row('master', 'Подпись исполнителя: «ИП …»', 'placeholder="Голосов В. А."')}
        ${box('legal', 'Реквизиты: ИП/ООО, ИНН, ОГРН')}
        ${row('address', 'Адрес', '', 'f--wide')}
        ${row('phone', 'Телефон')}
        ${row('telegram', 'Telegram для QR: @имя, номер или ссылка')}
        ${row('publicUrl', 'Адрес сайта для QR кабинетов', 'placeholder="https://vf-swiss.ru"', 'f--wide')}
      </div></section>
      <section class="card"><h3>Тексты <small>черновик — проверить у юриста</small></h3><div class="fields">
        ${row('warrantyMonths', 'Гарантия по умолчанию, месяцев', 'type="number" min="0" max="60"')}
        ${box('warrantyText', 'Условия гарантии (в акте)')}
        ${box('diagText', 'Дополнительная информация (в акте приёма)')}
        ${box('photoText', 'Про фото-видео фиксацию (в акте приёма)')}
      </div></section>
      <section class="card"><h3>Резервная копия</h3>
        <p class="hint">Заказы хранятся только в этом браузере. Раз в неделю сохраняйте копию в файл — её можно открыть на другом устройстве.</p>
        <div class="doc-tools"><button class="btn" id="exp">Сохранить копию</button><label class="btn">Загрузить копию<input type="file" accept="application/json" id="imp" hidden></label></div>
      </section>
      <section class="card"><h3>Ярлык на телефон</h3>
        <p class="hint">Android, Chrome: меню ⋮ → «Добавить на главный экран». iPhone, Safari: «Поделиться» → «На экран Домой».</p>
      </section>`;
    view.querySelectorAll('[data-k]').forEach(el => el.addEventListener('input', async () => {
      settings[el.dataset.k] = el.type === 'number' ? Number(el.value) : el.value;
      await Store.saveSettings(settings);
    }));
    view.querySelector('#exp').onclick = async () => {
      const blob = new Blob([JSON.stringify(await Store.exportAll(), null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `vf-docs-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      toast('Копия сохранена');
    };
    view.querySelector('#imp').onchange = async e => {
      try { const n = await Store.importAll(JSON.parse(await e.target.files[0].text())); settings = await Store.getSettings(); toast(`Загружено заказов: ${n}`); }
      catch (err) { toast(err.message); }
    };
  }

  // ---------- Маршруты ----------
  async function route() {
    clearTimeout(saveTimer);
    if (order) await Store.saveOrder(order).catch(() => {});
    window.onresize = null;
    try { if (!(await Store.me()).admin) { order = null; return renderLogin(); } }
    catch { view.innerHTML = '<div class="empty">Нет связи с сервером мастерской. Проверьте интернет и обновите страницу.</div>'; return; }
    settings = await Store.getSettings();
    const [, page, id, type] = (location.hash || '#/').split('/');
    if (page === 'order') await renderOrder(id);
    else if (page === 'cabinets') await renderCabinets();
    else if (page === 'cards') await renderCards(+id || 1, +type || 50);
    else if (page === 'doc') await renderDoc(id, type);
    else if (page === 'settings') await renderSettings();
    else { order = null; await renderHome(); }
    window.scrollTo(0, 0);
  }
  // Текущее время в шапке (для актов и звонков клиентам)
  const clock = document.getElementById('clock');
  const tick = () => { const d = new Date(); clock.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; clock.dateTime = d.toISOString(); };
  tick(); setInterval(tick, 15000);
  window.addEventListener('hashchange', route);
  route();
})();
