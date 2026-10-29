// Хранилище заказов, настроек и кабинетов на сервере мастерской (server/server.py)
window.Store = (() => {
  async function api(method, path, body) {
    const res = await fetch('/api/' + path, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== 'login') { window.dispatchEvent(new Event('vf:login')); }
    if (!res.ok) throw Object.assign(new Error(data.error || `Ошибка сервера ${res.status}`), { status: res.status });
    return data;
  }

  const DEFAULT_SETTINGS = Docs.DEFAULTS;

  const me = () => api('GET', 'me');
  // Бесплатный хостинг усыпляет сервис после 15 минут тишины и сбрасывает базу: пока страница открыта и видна, раз в 4 минуты будим его
  setInterval(() => { if (!document.hidden) fetch('/api/me', { credentials: 'same-origin' }).catch(() => {}); }, 240000);
  const login = password => api('POST', 'login', { password });

  const getSettings = async () => ({ ...DEFAULT_SETTINGS, ...(await api('GET', 'settings')) });
  const saveSettings = s => api('PUT', 'settings', s);

  const listOrders = () => api('GET', 'orders');
  const getOrder = id => api('GET', 'orders/' + encodeURIComponent(id)).catch(e => (e.status === 404 ? null : Promise.reject(e)));
  const saveOrder = o => api('PUT', 'orders/' + encodeURIComponent(o.id), o);
  const deleteOrder = id => api('DELETE', 'orders/' + encodeURIComponent(id));

  async function newOrder() {
    const now = new Date().toISOString();
    const { num } = await api('POST', 'number');
    const o = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
      num,
      created: now,
      status: 'priem',
      cabinet: null,         // { code: 'K-0001', token } после привязки карточки
      client: { name: '', patronymic: '', phone: '', email: '', owner: '', contact: 'call' },
      watch: { brand: '', model: '', ref: '', serial: '', movement: '', material: '', kit: '', condition: '' },
      inspect: {},        // пункты осмотра: { corpus: ['царапины/вмятины'], … }
      photos: [],
      issue: '',
      estimate: '',
      due: '',
      works: [],
      warrantyMonths: null,  // null — из настроек
      issued: '',
      conditionOut: '',
      history: [{ at: now, status: 'priem' }],
    };
    await saveOrder(o);
    return o;
  }

  // Кабинеты: q — содержимое QR (ссылка /k/…), номер «K-0123» или просто «123»
  const lookupCabinet = q => api('POST', 'cabinets/lookup', { q });
  const bindCabinet = (code, client) => api('POST', 'cabinets/bind', { code, client });
  const listCabinets = () => api('GET', 'cabinets');
  const resetCabinet = code => api('POST', 'cabinets/reset', { code });

  async function exportAll() {
    return { app: 'vf-docs', version: 2, exported: new Date().toISOString(), settings: await getSettings(), orders: await listOrders() };
  }

  async function importAll(data) {
    if (data?.app !== 'vf-docs' || !Array.isArray(data.orders)) throw new Error('Это не резервная копия VF документов');
    if (data.settings) await saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    for (const o of data.orders) await saveOrder(o);
    return data.orders.length;
  }

  return { me, login, getSettings, saveSettings, listOrders, getOrder, saveOrder, deleteOrder, newOrder, lookupCabinet, bindCabinet, listCabinets, resetCabinet, exportAll, importAll, DEFAULT_SETTINGS };
})();
