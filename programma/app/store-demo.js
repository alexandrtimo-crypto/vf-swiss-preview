// Демо-хранилище для показа без сервера (GitHub Pages): тот же интерфейс, что у store.js, данные — в localStorage браузера.
// Приложение мастера и кабинет клиента лежат на одном адресе и видят одну базу: изменения в заказе сразу видны в кабинете.
window.Store = (() => {
  const KEY = 'vf-demo-v1';
  const TOTAL = 500;
  const DAY = 864e5;
  const ago = d => new Date(Date.now() - d * DAY).toISOString();
  const ahead = d => new Date(Date.now() + d * DAY).toISOString().slice(0, 10);
  const photo = n => `${window.VF_DEMO.root}app/assets/demo/${n}.webp`;
  const code = n => `K-${String(n).padStart(4, '0')}`;
  const tokenOf = n => `demo${String(n).padStart(4, '0')}`;

  function seed() {
    const order = (num, created, status, cab, client, watch, extra) => ({
      id: 'demo-' + num, num: `VF-2026-${String(num).padStart(4, '0')}`, created: ago(created), status,
      cabinet: cab ? { code: code(cab), token: tokenOf(cab) } : null,
      client, watch, photos: [], issue: '', estimate: '', due: '', works: [], warrantyMonths: null, issued: '', conditionOut: '',
      history: [{ at: ago(created), status: 'priem' }], ...extra,
    });
    const andrey = { name: 'Андрей Петров', phone: '+7 (916) 123-45-67', contact: 'tg' };
    const maria = { name: 'Мария Соколова', phone: '+7 (925) 765-43-21', contact: 'call' };
    const orders = [
      order(1, 24, 'done', 1, andrey,
        { brand: 'Rolex', model: 'Datejust 41', ref: '126333', serial: '7K2…', movement: 'Автоподзавод, кал. 3235', material: 'Сталь и жёлтое золото', kit: 'Часы, коробка', condition: 'Потёртости на браслете, царапина на безеле в районе 2 часов' },
        { photos: [photo('a'), photo('b')], issue: 'Отстают на 40 секунд в сутки, дата переключается не в полночь', estimate: '28 000 – 35 000 ₽', due: ahead(-10),
          works: [{ name: 'Полное техническое обслуживание механизма', kind: 'work', qty: 1, price: 24000 },
                  { name: 'Комплект уплотнителей', kind: 'part', qty: 1, price: 3500 },
                  { name: 'Полировка корпуса и браслета', kind: 'work', qty: 1, price: 6500 }],
          issued: ago(9), conditionOut: 'Ход +2 с/сутки, водозащита проверена' }),
      order(2, 6, 'work', 1, andrey,
        { brand: 'Omega', model: 'Speedmaster Professional', ref: '310.30.42.50.01.001', serial: '', movement: 'Ручной завод, кал. 3861', material: 'Сталь', kit: 'Часы', condition: 'Без видимых повреждений' },
        { photos: [photo('c')], issue: 'Хронограф не сбрасывается в ноль', estimate: '15 000 – 22 000 ₽', due: ahead(8),
          works: [{ name: 'Ремонт узла хронографа', kind: 'work', qty: 1, price: 16000 }] }),
      order(3, 1, 'diag', 3, maria,
        { brand: 'Cartier', model: 'Tank Française', ref: 'WSTA0005', serial: '', movement: 'Кварц', material: 'Сталь', kit: 'Часы, документы', condition: 'Мелкие волосяные царапины на стекле' },
        { photos: [photo('d')], issue: 'Остановились, замена батарейки не помогла', estimate: 'после диагностики', due: ahead(5) }),
    ];
    return { seq: 3, settings: {}, orders, bound: { [code(1)]: andrey, [code(3)]: maria } };
  }

  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { db = seed(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* приватный режим: работаем в памяти */ } };
  const clone = v => JSON.parse(JSON.stringify(v));
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
      client: { name: '', phone: '', contact: 'call' },
      watch: { brand: '', model: '', ref: '', serial: '', movement: '', material: '', kit: '', condition: '' },
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
  async function lookupCabinet(q) {
    const n = find(q);
    if (!n) throw Object.assign(new Error('Такой карточки нет'), { status: 404 });
    const c = code(n);
    return { code: c, token: tokenOf(n), bound: !!db.bound[c], client: clone(db.bound[c] || null) };
  }
  async function bindCabinet(c, client) {
    if (!db.bound[c]) { db.bound[c] = clone(client || {}); save(); }
    return { ok: true, code: c, token: tokenOf(+c.slice(2)) };
  }
  async function listCabinets() {
    return Array.from({ length: TOTAL }, (_, i) => {
      const c = code(i + 1);
      return { code: c, token: tokenOf(i + 1), client: clone(db.bound[c] || null), bound_at: db.bound[c] ? 1 : null, orders: db.orders.filter(o => o.cabinet?.code === c).length };
    });
  }

  // То, что видит клиент по QR (как cabinet_public на сервере): без истории и служебного
  async function cabinetByToken(token) {
    const n = find(token);
    if (!n) return null;
    const c = code(n);
    const s = await getSettings();
    return {
      code: c, active: !!db.bound[c], client: clone(db.bound[c] || null), settings: s,
      orders: db.bound[c] ? clone(db.orders.filter(o => o.cabinet?.code === c)).sort((a, b) => b.created.localeCompare(a.created)).map(({ history, ...o }) => o) : [],
    };
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

  return { me, login, getSettings, saveSettings, listOrders, getOrder, saveOrder, deleteOrder, newOrder, lookupCabinet, bindCabinet, listCabinets, cabinetByToken, exportAll, importAll, DEFAULT_SETTINGS };
})();
