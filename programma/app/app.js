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
      <button class="new-order" id="new"><span class="new-order__plus">+</span><span><b>Принять часы</b><span>Новая карточка заказа и квитанция</span></span></button>
      <a class="btn btn--wide cabs-link" href="#/cabinets">Карточки-кабинеты клиентов</a>
      ${orders.length ? '<input class="search" id="q" type="search" placeholder="Поиск: номер, имя, телефон, марка, карточка">' : ''}
      <div class="orders" id="list"></div>`;
    const list = document.getElementById('list');
    const draw = q => {
      q = (q || '').toLowerCase().trim();
      const items = orders.filter(o => !q || [o.num, o.client.name, o.client.phone, o.watch.brand, o.watch.model, o.watch.serial, o.cabinet?.code].join(' ').toLowerCase().includes(q));
      list.innerHTML = items.length ? items.map(o => `
        <a class="order-card" href="#/order/${o.id}">
          <span class="order-card__num">${esc(o.num)} · ${Docs.dmy(new Date(o.created))}${o.cabinet ? ` · <span class="nowrap">${esc(o.cabinet.code)}</span>` : ''}</span>
          <span class="chip chip--${o.status}">${STATUS[o.status]}</span>
          <span class="order-card__who">${esc(o.client.name) || 'Клиент без имени'}</span><span></span>
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
    order = await Store.getOrder(id);
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
        ${inp('client.name', 'Имя и фамилия', 'autocomplete="off" placeholder="Иван Петров"')}
        ${inp('client.phone', 'Телефон', 'type="tel" inputmode="tel" placeholder="+7 (___) ___-__-__"')}
        <div class="f f--wide"><span>Как связаться</span><div class="seg" id="contact">
          <button type="button" data-v="call" class="${order.client.contact !== 'telegram' ? 'is-on' : ''}">Звонок</button>
          <button type="button" data-v="telegram" class="${order.client.contact === 'telegram' ? 'is-on' : ''}">Telegram</button></div></div>
      </div></section>

      <section class="card"><h3>Часы</h3><div class="fields">
        ${inp('watch.brand', 'Марка', 'list="brands" placeholder="Rolex"')}
        ${inp('watch.model', 'Модель', 'placeholder="Submariner Date"')}
        ${inp('watch.ref', 'Референс', 'placeholder="126610LN"')}
        ${inp('watch.serial', 'Номер корпуса', 'placeholder="Серийный номер"')}
        <label class="f"><span>Механизм</span><select data-path="watch.movement">
          ${['', 'Механика, ручной завод', 'Механика, автоподзавод', 'Кварц', 'Хронограф'].map(v => `<option${order.watch.movement === v ? ' selected' : ''}>${v}</option>`).join('')}
        </select></label>
        ${inp('watch.material', 'Материал корпуса / браслета', 'placeholder="Сталь, браслет Oyster"')}
        ${inp('watch.kit', 'Комплектность', 'placeholder="Часы, коробка, документы, 2 звена"', 'f--wide')}
        ${area('watch.condition', 'Внешний вид при приёмке', 'Царапины на безеле, потёртости браслета, стекло без сколов, часы идут / стоят')}
        <div class="f f--wide"><span>Фото при приёмке <small>(попадут в квитанцию, до 4)</small></span>
          <div class="photos" id="photos">${order.photos.map((p, i) => `<div class="photo"><img src="${p}" alt="Фото ${i + 1}"><button data-ph="${i}" aria-label="Удалить фото">✕</button></div>`).join('')}
            <label class="photo-add">＋<br>Фото<input type="file" accept="image/*" capture="environment" multiple id="photoIn"></label></div>
        </div>
      </div></section>

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
        <a class="btn" href="#/doc/${order.id}/intake">Квитанция</a>
        <a class="btn btn--gold" href="#/doc/${order.id}/act">Акт работ</a>
      </nav>`;
    bindOrder();
  }

  const cabinetUrl = token => Docs.cabUrl((settings.publicUrl || location.origin).replace(/\/$/, ''), token);

  function cabinetBlock() {
    const c = order.cabinet;
    if (c) return `<h3>Кабинет клиента</h3>
      <div class="cab__row"><span class="cab__code">${esc(c.code)}</span>
        <span class="cab__text">Клиент видит статус ремонта, квитанцию, акт и гарантию по QR на своей карточке.</span>
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
      scheduleSave(); renderOrder(order.id);
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
    order = await Store.getOrder(id);
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
      <div class="preview" id="preview"></div>
      <nav class="dock">
        <button class="btn" id="print">Печать</button>
        <button class="btn" id="share" hidden>Отправить</button>
        <button class="btn btn--gold" id="pdf">Скачать PDF</button>
      </nav>`;

    const preview = view.querySelector('#preview');
    const draw = () => {
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
    view.querySelector('#pdf').onclick = () => withBusy('#pdf', async () => {
      const blob = await makePdf(opts());
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = fileName(); a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 30000);
      toast('PDF готов');
    });
    view.querySelector('#print').onclick = () => printDoc(opts());

    const share = view.querySelector('#share');
    if (navigator.canShare?.({ files: [new File([''], 'x.pdf', { type: 'application/pdf' })] })) {
      share.hidden = false;
      share.onclick = () => withBusy('#share', async () => {
        const file = new File([await makePdf(opts())], fileName(), { type: 'application/pdf' });
        await navigator.share({ files: [file], title: file.name }).catch(() => {});
      });
    }
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
    await new Promise(r => setTimeout(r, 60)); // qrcodejs подставляет <img> асинхронно
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
    if (!window.jsQR) await loadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js');
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
      list.innerHTML = cabs.filter(c => !q || c.code.toLowerCase().includes(q) || (c.client?.name || '').toLowerCase().includes(q)).map(c => c.bound_at
        ? `<a class="cab-tile is-bound" href="${esc(cabinetUrl(c.token))}" target="_blank" rel="noopener"><b>${c.code}</b><span>${esc(c.client?.name || 'без имени')}</span><small>${c.orders} зак.</small></a>`
        : `<div class="cab-tile"><b>${c.code}</b><span>свободна</span></div>`).join('');
    };
    draw();
    view.querySelector('#q').oninput = e => draw(e.target.value);
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
        ${row('master', 'Мастер (для подписи)', 'placeholder="Владислав …"')}
        ${box('legal', 'Реквизиты: ИП/ООО, ИНН, ОГРН')}
        ${row('address', 'Адрес', '', 'f--wide')}
        ${row('phone', 'Телефон')}
        ${row('telegram', 'Telegram для QR: @имя, номер или ссылка')}
        ${row('publicUrl', 'Адрес сайта для QR кабинетов', 'placeholder="https://vf-swiss.ru"', 'f--wide')}
      </div></section>
      <section class="card"><h3>Тексты <small>черновик — проверить у юриста</small></h3><div class="fields">
        ${row('warrantyMonths', 'Гарантия по умолчанию, месяцев', 'type="number" min="0" max="60"')}
        ${box('warrantyText', 'Условия гарантии (в акте)')}
        ${box('intakeText', 'Условия приёма (в квитанции)')}
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
  window.addEventListener('hashchange', route);
  route();
})();
