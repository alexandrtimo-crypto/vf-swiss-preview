// Демо-хранилище для показа без сервера (GitHub Pages): тот же интерфейс, что у store.js, данные — в localStorage браузера.
// Приложение мастера и кабинет клиента лежат на одном адресе и видят одну базу: изменения в заказе сразу видны в кабинете.
window.Store = (() => {
  const KEY = 'vf-demo-v3';
  const TOTAL = 500;
  const DAY = 864e5;
  const ago = d => new Date(Date.now() - d * DAY).toISOString();
  const ahead = d => new Date(Date.now() + d * DAY).toISOString().slice(0, 10);
  const photo = n => `${window.VF_DEMO.root}app/assets/demo/${n}.webp`;
  const code = n => `K-${String(n).padStart(4, '0')}`;
  const tokenOf = n => `demo${String(n).padStart(4, '0')}`;

  const OK = 'без дефектов';
  function seed() {
    const order = (num, created, status, cab, client, watch, extra) => ({
      id: 'demo-' + num, num: `VF-2026-${String(num).padStart(4, '0')}`, created: ago(created), status,
      cabinet: cab ? { code: code(cab), token: tokenOf(cab) } : null,
      client, watch, inspect: {}, photos: [], issue: '', estimate: '', due: '', works: [], warrantyMonths: null, issued: '', conditionOut: '',
      history: [{ at: ago(created), status: 'priem' }], ...extra,
    });
    const andrey = { name: 'Петров Андрей', patronymic: 'Сергеевич', phone: '+7 (916) 123-45-67', email: 'a.petrov@example.com', owner: 'owner', contact: 'telegram' };
    const maria = { name: 'Соколова Мария', patronymic: 'Игоревна', phone: '+7 (925) 765-43-21', email: '', owner: 'owner', contact: 'call' };
    const orders = [
      order(1, 24, 'done', 1, andrey,
        { brand: 'Rolex', model: 'Datejust 41', ref: '126333', serial: '7K2…', movement: 'автоподзавод', material: 'Сталь и жёлтое золото', kit: 'Часы, коробка', condition: 'Потёртости на браслете, царапина на безеле в районе 2 часов' },
        { inspect: { corpus: ['царапины/вмятины'], glass: [OK], bezel: ['царапины/вмятины'], dial: [OK], strap: ['царапины и глубокие вмятины'], clasp: [OK], crown: [OK], work: ['часы отстают', 'часы не обслуживали больше 5 лет'] }, photos: [photo('a'), photo('b')], issue: 'Отстают на 40 секунд в сутки, дата переключается не в полночь', estimate: '28 000 – 35 000 ₽', due: ahead(-10),
          works: [{ name: 'Полное техническое обслуживание механизма', kind: 'work', qty: 1, price: 24000 },
                  { name: 'Комплект уплотнителей', kind: 'part', qty: 1, price: 3500 },
                  { name: 'Полировка корпуса и браслета', kind: 'work', qty: 1, price: 6500 }],
          issued: ago(9), conditionOut: 'Ход +2 с/сутки, водозащита проверена' }),
      order(2, 6, 'work', 1, andrey,
        { brand: 'Omega', model: 'Speedmaster Professional', ref: '310.30.42.50.01.001', serial: '', movement: 'механический', material: 'Сталь', kit: 'Часы', condition: 'Без видимых повреждений' },
        { inspect: { corpus: [OK], glass: [OK], bezel: [OK], dial: [OK], strap: [OK], clasp: [OK], crown: ['не работает кнопка'], work: ['часы не работают'] }, photos: [photo('c')], issue: 'Хронограф не сбрасывается в ноль', estimate: '15 000 – 22 000 ₽', due: ahead(8),
          works: [{ name: 'Ремонт узла хронографа', kind: 'work', qty: 1, price: 16000 }] }),
      order(3, 1, 'diag', 3, maria,
        { brand: 'Cartier', model: 'Tank Française', ref: 'WSTA0005', serial: '', movement: 'кварцевый', material: 'Сталь', kit: 'Часы, документы', condition: 'Мелкие волосяные царапины на стекле' },
        { inspect: { corpus: [OK], glass: ['царапины'], bezel: [OK], dial: [OK], strap: ['ремешок с трещинами'], clasp: [OK], crown: [OK], work: ['часы не работают', 'часы не обслуживали больше 5 лет'] }, photos: [photo('d')], issue: 'Остановились, замена батарейки не помогла', estimate: 'после диагностики', due: ahead(5) }),
    ];
    // демо-кабинеты K-0001 и K-0003 уже активированы с паролем demo1234, остальные карточки «новые»
    const cabs = { [code(1)]: { name: 'Андрей', hash: '00e1eb9eb814fe7c742d483a985cf958a980dc358cdd75c8f36612fce7cfafef', activated: ago(24) }, [code(3)]: { name: 'Мария', hash: '00e1eb9eb814fe7c742d483a985cf958a980dc358cdd75c8f36612fce7cfafef', activated: ago(1) } };
    return { seq: 3, settings: {}, orders, bound: { [code(1)]: andrey, [code(3)]: maria }, cabs, sess: {} };
  }

  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { db = seed(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* приватный режим: работаем в памяти */ } };
  const clone = v => JSON.parse(JSON.stringify(v));
  db.cabs ??= {}; db.sess ??= {};
  save();

  const DEFAULT_SETTINGS = Docs.DEFAULTS;
  const me = async () => ({ admin: true });
  const login = async () => ({ ok: true });
  const getSettings = async () => ({ ...DEFAULT_SETTINGS, ...db.settings });
  const saveSettings = async s => { db.settings = clone(s); save(); return { ok: true }; };

  const listOrders = async () => clone(db.orders).sort((a, b) => b.created.localeCompare(a.created));
  const getOrder = async id => clone(db.orders.find(o => o.id === id) || null);
  async function saveOrder(o) {
    o = { ...clone(o), updated: new Date().toISOString() };
    const i = db.orders.findIndex(x => x.id === o.id);
    if (i < 0) db.orders.push(o); else db.orders[i] = o;
    if (o.cabinet?.code && db.bound[o.cabinet.code]) db.bound[o.cabinet.code] = clone(o.client);
    save();
    return { ok: true, updated: o.updated };
  }
  const deleteOrder = async id => { db.orders = db.orders.filter(o => o.id !== id); save(); return { ok: true }; };

  async function newOrder() {
    const now = new Date().toISOString();
    const o = {
      id: 'demo-' + Date.now().toString(36), num: `VF-${new Date().getFullYear()}-${String(++db.seq).padStart(4, '0')}`,
      created: now, status: 'priem', cabinet: null,
      client: { name: '', patronymic: '', phone: '', email: '', owner: '', contact: 'call' },
      watch: { brand: '', model: '', ref: '', serial: '', movement: '', material: '', kit: '', condition: '' },
      inspect: {},
      photos: [], issue: '', estimate: '', due: '', works: [], warrantyMonths: null, issued: '', conditionOut: '',
      history: [{ at: now, status: 'priem' }],
    };
    await saveOrder(o);
    return o;
  }

  // Как на сервере: q — ссылка из QR, номер «K-0123» или просто «123»
  function find(q) {
    q = String(q || '').trim();
    const t = q.includes('t=') ? new URLSearchParams(q.split('?')[1]).get('t') : q.includes('/k/') ? q.split('/k/').pop().replace(/\/$/, '') : q;
    let n = /^demo\d{4}$/.test(t) ? +t.slice(4) : NaN;
    if (isNaN(n)) { const c = q.toUpperCase().replace(/\s/g, ''); n = /^\d+$/.test(c) ? +c : /^K-\d+$/.test(c) ? +c.slice(2) : NaN; }
    return n >= 1 && n <= TOTAL ? n : null;
  }
  const cabState = c => (db.cabs[c]?.hash ? 'active' : db.cabs[c]?.pin ? 'reset' : 'new');
  async function lookupCabinet(q) {
    const n = find(q);
    if (!n) throw Object.assign(new Error('Такой карточки нет'), { status: 404 });
    const c = code(n);
    return { code: c, token: tokenOf(n), bound: !!db.bound[c], state: cabState(c), display_name: db.cabs[c]?.name || null, client: clone(db.bound[c] || null) };
  }
  async function bindCabinet(c, client) {
    if (!db.bound[c]) { db.bound[c] = clone(client || {}); save(); }
    return { ok: true, code: c, token: tokenOf(+c.slice(2)) };
  }
  async function listCabinets() {
    return Array.from({ length: TOTAL }, (_, i) => {
      const c = code(i + 1);
      return { code: c, token: tokenOf(i + 1), client: clone(db.bound[c] || null), bound_at: db.bound[c] ? 1 : null, state: cabState(c), display_name: db.cabs[c]?.name || null,
        activated_at: db.cabs[c]?.activated || null, last_seen: db.cabs[c]?.seen || null, orders: db.orders.filter(o => o.cabinet?.code === c).length };
    });
  }

  // Доступ клиента, как на сервере: без пароля видны только номер карточки и контакты мастерской
  const sha = async v => { try { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vf-demo:' + v)))].map(x => x.toString(16).padStart(2, '0')).join(''); } catch { return 'plain:' + v; } };
  const fails = {};
  const must = (c, token) => { const n = find(token); if (!n) throw new Error('Кабинет не найден'); return code(n); };
  async function cabinetByToken(token) {
    const n = find(token);
    if (!n) return null;
    const c = code(n), st = cabState(c), s = await getSettings();
    if (st === 'active' && db.sess[c]) {
      db.cabs[c].seen = new Date().toISOString(); save();
      return {
        code: c, state: 'active', authed: true, name: db.cabs[c].name, active: !!db.bound[c], client: clone(db.bound[c] || null), settings: s,
        orders: db.bound[c] ? clone(db.orders.filter(o => o.cabinet?.code === c)).sort((a, b) => b.created.localeCompare(a.created)).map(({ history, ...o }) => o) : [],
      };
    }
    return { code: c, state: st, authed: false, demoHint: c === 'K-0001' || c === 'K-0003' ? 'Демо: пароль demo1234' : '', settings: Object.fromEntries(['company', 'address', 'phone', 'telegram'].map(k => [k, s[k]]).filter(([, v]) => v)) };
  }
  async function cabinetActivate(token, b) {
    const c = must(null, token), st = cabState(c);
    if (st === 'active') throw new Error('Кабинет уже активирован. Войдите по паролю.');
    if (st === 'reset' && String(b.pin || '').trim() !== db.cabs[c].pin) throw new Error('Неверный код от мастера');
    const name = String(b.name || '').trim(), pw = String(b.password || '');
    if (!name || name.length > 60) throw new Error('Напишите, как к вам обращаться (до 60 знаков)');
    if (pw.length < 6) throw new Error('Пароль должен быть не короче 6 знаков');
    db.cabs[c] = { name, hash: await sha(pw), activated: new Date().toISOString(), seen: new Date().toISOString() };
    db.sess[c] = true; save();
    return { ok: true };
  }
  async function cabinetLogin(token, pw) {
    const c = must(null, token);
    if (cabState(c) !== 'active') throw new Error('Кабинет ещё не активирован');
    if ((fails[c] || 0) >= 5) throw new Error('Слишком много попыток. Обновите страницу позже.');
    if ((await sha(String(pw))) !== db.cabs[c].hash) { fails[c] = (fails[c] || 0) + 1; throw new Error('Неверный пароль'); }
    delete fails[c]; db.sess[c] = true; save();
    return { ok: true };
  }
  async function cabinetLogout(token) { delete db.sess[must(null, token)]; save(); return { ok: true }; }
  async function cabinetPassword(token, b) {
    const c = must(null, token);
    if (!db.sess[c]) throw new Error('Нужен вход');
    if ((await sha(String(b.old || ''))) !== db.cabs[c].hash) throw new Error('Старый пароль неверный');
    if (String(b.password || '').length < 6) throw new Error('Пароль должен быть не короче 6 знаков');
    db.cabs[c].hash = await sha(b.password); save();
    return { ok: true };
  }
  async function resetCabinet(c) {
    const pin = String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
    db.cabs[c] = { pin }; delete db.sess[c]; save();
    return { ok: true, pin };
  }

  async function exportAll() {
    return { app: 'vf-docs', version: 2, exported: new Date().toISOString(), settings: await getSettings(), orders: await listOrders() };
  }
  async function importAll(data) {
    if (data?.app !== 'vf-docs' || !Array.isArray(data.orders)) throw new Error('Это не резервная копия VF документов');
    if (data.settings) await saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    for (const o of data.orders) await saveOrder(o);
    return data.orders.length;
  }

  window.VF_DEMO.reset = () => { try { localStorage.removeItem(KEY); } catch { /* нет доступа */ } location.reload(); };

  return { me, login, getSettings, saveSettings, listOrders, getOrder, saveOrder, deleteOrder, newOrder, lookupCabinet, bindCabinet, listCabinets, cabinetByToken, cabinetActivate, cabinetLogin, cabinetLogout, cabinetPassword, resetCabinet, exportAll, importAll, DEFAULT_SETTINGS };
})();
