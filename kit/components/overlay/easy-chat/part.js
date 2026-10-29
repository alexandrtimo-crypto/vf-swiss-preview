// easy-chat: чат-помощник. Слушает vf:chat { symptom | question [, land] | ask }, vf:book (запись в чате),
// vf:lead (заявка, отправленная формой). «Заполнить формой» → vf:book { form: true, lead, consent }.
// Демо: ?demo=chat | book | done.
VFKit.register('easy-chat', root => {
  'use strict';
  const ID = 'easy-chat';
  const $ = (s, r = root) => r.querySelector(s);
  const $$ = (s, r = root) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEMO = new URLSearchParams(location.search).get('demo');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const emit = (name, detail) => { const ev = new CustomEvent(name, { cancelable: true, detail }); document.dispatchEvent(ev); return ev; };

  const TG = 'https://t.me/VFswissboutique';
  const PHONE = '8 (965) 171-69-96';
  const BRANDS = ['Rolex', 'Patek Philippe', 'Audemars Piguet', 'Vacheron Constantin', 'Breguet', 'Cartier', 'Breitling', 'Franck Muller', 'Blancpain'];
  const IC = (window.VFIcons && window.VFIcons.easy) || { ui: {}, tiles: {} };
  const ICON = { call: IC.ui.call || '', tg: IC.ui.tg || '', cam: IC.ui.cam || '', ok: IC.ui.ok || '' };

  /* ---------- данные: плитки ---------- */
  const TILES = {
    stop: { t: 'Остановились', d: 'Часы остановились', c: 'var(--vf-easy-sun, #FFD25E)', say: [
      'Понимаю, неприятно. У кварцевых часов причина часто в элементе питания, у механических — механизму может быть нужно обслуживание.',
      'Гадать не будем: мастер посмотрит часы на <b>бесплатной диагностике</b> и скажет, что именно случилось.'] },
    drift: { t: 'Отстают или спешат', d: 'Часы отстают или спешат', c: 'var(--vf-easy-sky, #9FD8FF)', say: [
      'Проверим ход на таймграфере — он точно покажет, насколько часы ошибаются.',
      'Дальше станет ясно, что нужно: настройка или обслуживание механизма. Диагностика — <b>бесплатно</b>.'] },
    glass: { t: 'Разбито стекло', d: 'Разбито или поцарапано стекло', c: 'var(--vf-easy-coral, #FFA98F)', say: [
      'Заменим стекло: ставим сапфировые, минеральные и нестандартные стёкла.',
      'Пока стекло с трещиной, лучше часы не носить. Принесите — посмотрим на <b>бесплатной диагностике</b>.'] },
    polish: { t: 'Нужна полировка', d: 'Нужна полировка', c: 'var(--vf-easy-lilac, #C8B6FF)', say: [
      'Полировка вернёт часам внешний вид.',
      'Покажите часы мастеру — он посмотрит корпус и браслет и скажет, что можно сделать. Осмотр <b>бесплатный</b>.'] },
    strap: { t: 'Ремешок или браслет', d: 'Ремешок или браслет', c: 'var(--vf-easy-mint, #8EE0B8)', say: [
      'Меняем и изготавливаем ремешки — подберём под стиль и модель часов.',
      'С браслетом тоже поможем: сначала посмотрим, что с ним. Диагностика — <b>бесплатно</b>.'] },
    battery: { t: 'Батарейка', d: 'Замена элемента питания', c: 'var(--vf-easy-pink, #FFC2DA)', say: [
      'Заменим элемент питания по регламенту — так, чтобы корпус остался <b>герметичным</b>.',
      'Герметичность проверяем на специальном тестере.'] },
    service: { t: 'Плановое обслуживание', d: 'Плановое обслуживание', c: 'var(--vf-easy-lime, #B9E37A)', say: [
      'Комплексный сервис: полная разборка и настройка механизма.',
      'Работаем с оригинальными комплектующими. Сначала — <b>бесплатная диагностика</b>.'] },
    unknown: { t: 'Не знаю — посмотрите', d: 'Нужна диагностика', c: 'var(--vf-surface, #fff)', say: [
      'Ничего страшного — для этого и есть диагностика.',
      'Она <b>бесплатная</b>: мастер посмотрит часы на таймграфере и под микроскопом и расскажет, что с ними.'] }
  };

  /* ---------- данные: вопросы (только известные факты) ---------- */
  const FAQ = [
    { q: 'Сколько стоит диагностика?', a: ['Нисколько — диагностика <b>бесплатная</b>. После неё вы сами решаете, делать ли ремонт.'] },
    { q: 'Сколько стоит ремонт?', a: ['Честно: точную цену назовём <b>после бесплатной диагностики</b> — она зависит от того, что именно с часами.', 'Цену и срок говорим до начала работ.'] },
    { q: 'Сколько по времени?', a: ['Срок тоже назовём <b>после диагностики</b> — когда станет ясно, что нужно сделать.'] },
    { q: 'Какая гарантия?', a: ['Гарантия — <b>до двух лет</b>.', 'Подробные условия уточним у мастера.'] },
    { q: 'Детали оригинальные?', a: ['Да, работаем с <b>оригинальными комплектующими</b>.'] },
    { q: 'С какими марками работаете?', a: ['Rolex, Patek Philippe, Audemars Piguet, Vacheron Constantin, Breguet, Cartier, Breitling, Franck Muller, Blancpain <b>и другие</b>.', 'Не нашли свою марку — спросите, уточним у мастера.'] },
    { q: 'Поменяете батарейку?', a: ['Да. Меняем элемент питания по регламенту, с <b>сохранением герметичности</b> корпуса.'] },
    { q: 'Какое стекло поставите?', a: ['Сапфировые, минеральные и <b>нестандартные</b> стёкла.'] },
    { q: 'Сделаете ремешок?', a: ['Да: меняем и <b>изготавливаем</b> ремешки, подбираем под стиль и модель.'] },
    { q: 'Чем проверяете часы?', a: ['Таймграфер, микроскоп и тестер герметичности.'] },
    { q: 'Где вы находитесь?', a: ['Москва, <b>Петровка, 23/10, стр. 5</b>.'] },
    { q: 'Когда вы открыты?', a: ['Часы приёма уточним у мастера — проще всего позвонить: <b>' + PHONE + '</b>.'] },
    { q: 'Можно без записи?', a: ['Это уточним у мастера. Надёжнее оставить заявку — мы перезвоним или напишем.'] },
    { q: 'Полируете корпус?', a: ['Да, полировка — одна из наших услуг. Что можно сделать именно с вашими часами, мастер скажет на <b>бесплатной диагностике</b>.'] }
  ];
  const KEYS = [
    [/диагност/i, 0], [/цен|стои|сколько.*руб|прайс|дорог/i, 1], [/срок|долго|врем|дн[ея]|быстр/i, 2],
    [/гарант/i, 3], [/оригин|детал|запчаст|комплект/i, 4], [/марк|бренд|rolex|patek|cartier|breguet|omega/i, 5],
    [/батар|элемент пит|аккум/i, 6], [/стекл|сапфир/i, 7], [/ремеш|браслет/i, 8], [/провер|таймграф|микроскоп|оборуд/i, 9],
    [/адрес|где|наход|метро|доех|как найти/i, 10], [/работ.*час|откры|график|выходн|суббот|воскрес/i, 11], [/запис/i, -1], [/полир/i, 13]
  ];

  /* ---------- окно поверх страницы: общий список открытых окон и блокировка прокрутки ---------- */
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

  /* ===================================================================
     ЧАТ
     =================================================================== */
  const chat = root, panel = $('.chat__panel'), log = $('.chat__log'), actions = $('.chat__actions');
  const composer = $('.chat__composer'), say = $('.chat__say'), photoIn = $('.chat__photo'), hp = $('.hp', composer);
  $('.chat__ava').innerHTML = IC.master || '';
  let lastFocus = null;
  let busy = Promise.resolve();
  const lead = { name: '', phone: '', contact: '', brand: '', description: '', photos: [] };
  let step = null; // name | phone | contact | brand | photo | review | done
  let started = false;
  let consent = false;
  const fast = () => DEMO === 'chat' || DEMO === 'book' || DEMO === 'done';
  let phoneMode = false;
  // два поля: текстовое и телефонное (с маской VFLead.bindPhone)
  const tel = document.createElement('input');
  tel.type = 'tel'; tel.className = 'vf-input chat__say'; tel.inputMode = 'tel'; tel.autocomplete = 'tel'; tel.placeholder = '+7 (___) ___-__-__'; tel.hidden = true;
  tel.setAttribute('aria-label', 'Телефон');
  say.after(tel);
  if (window.VFLead) VFLead.bindPhone(tel);
  const txt = say;
  const field = () => (phoneMode ? tel : txt);
  const isOpen = () => chat.classList.contains('open');

  // «Заполнить формой» — только если на странице есть компонент заявки
  const hasForm = () => !!document.querySelector('[data-slot="booking"]');
  const toFormBtn = $('.chat__toform');
  if (!hasForm()) toFormBtn.hidden = true;

  function setComposer({ mode = 'text', placeholder = 'Напишите вопрос…', off = false, ac = 'off' } = {}) {
    phoneMode = mode === 'tel';
    tel.hidden = !phoneMode; txt.hidden = phoneMode;
    txt.placeholder = placeholder; txt.autocomplete = ac;
    txt.disabled = tel.disabled = off;
    composer.classList.toggle('is-off', off);
    $('.send', composer).disabled = off;
    if (!off && isOpen() && matchMedia('(hover: hover)').matches) setTimeout(() => field().focus({ preventScroll: true }), 50);
  }

  function scrollLog() { requestAnimationFrame(() => log.scrollTo({ top: log.scrollHeight, behavior: RM ? 'auto' : 'smooth' })); }
  function add(el) { log.appendChild(el); scrollLog(); return el; }
  function msg(html, who = 'bot') {
    const d = document.createElement('div');
    d.className = 'msg msg--' + who;
    d.innerHTML = html;
    return add(d);
  }
  function typingDelay(html) { if (fast()) return 0; if (RM) return 250; return Math.min(1500, 450 + html.replace(/<[^>]+>/g, '').length * 11); }
  function queue(fn) { busy = busy.then(fn).catch(err => console.warn(err)); return busy; }
  async function botNow(html) {
    const d = typingDelay(html);
    if (d) {
      const t = document.createElement('div');
      t.className = 'typing'; t.setAttribute('aria-label', 'печатает…');
      t.innerHTML = '<i></i><i></i><i></i>';
      add(t); await sleep(d); t.remove();
    }
    return msg(html, 'bot');
  }
  const bot = (...lines) => queue(async () => { for (const l of lines) await botNow(l); });

  function setActions(nodes) {
    actions.innerHTML = '';
    nodes.forEach(n => actions.appendChild(n));
    actions.classList.toggle('has', nodes.length > 0);
    scrollLog();
  }
  // быстрый ответ: кнопка .vf-btn--sm; cls: 'primary' | 'sun' | 'xs' (через пробел)
  const CHIP = { primary: 'vf-btn--primary', sun: 'is-sun', xs: 'is-xs' };
  function chip(label, fn, cls = '') {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'vf-btn vf-btn--sm ' + cls.split(' ').filter(Boolean).map(c => CHIP[c]).join(' '); b.innerHTML = label;
    b.addEventListener('click', () => { setActions([]); fn(); });
    return b;
  }
  const mainReplies = () => setActions([
    chip('Записаться', () => { me('Записаться'); startBooking(); }, 'primary'),
    chip('Сколько стоит?', () => askFaq(1, true)),
    chip('Сколько по времени?', () => askFaq(2, true)),
    chip('Другой вопрос', () => { me('Другой вопрос'); other(); })
  ]);
  const me = (html) => msg(html, 'me');

  function greetIfNew() {
    if (started) return;
    started = true;
    msg('Здравствуйте! Я помощник мастерской VF swiss. Подскажу, что делать с часами, и запишу на бесплатную диагностику.', 'bot');
  }

  /* открыть / закрыть */
  function openChat() {
    if (isOpen()) return;
    lastFocus = document.activeElement;
    chat.hidden = false;
    modal.open();
    requestAnimationFrame(() => requestAnimationFrame(() => chat.classList.add('open')));
    setTimeout(() => (matchMedia('(hover: hover)').matches ? field() : $('.iconbtn[data-close]')).focus({ preventScroll: true }), RM ? 0 : 380);
  }
  function closeChat() {
    chat.classList.remove('open');
    modal.close();
    setTimeout(() => { if (!isOpen()) chat.hidden = true; }, RM ? 0 : 450);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  $$('[data-close]').forEach(b => b.addEventListener('click', closeChat));
  document.addEventListener('keydown', e => {
    if (!isOpen() || !modal.top()) return;
    if (e.key === 'Escape') closeChat();
    if (e.key === 'Tab') trap(e, panel);
  });
  function trap(e, box) {
    const f = $$('button:not([disabled]), input:not([hidden]):not([disabled]):not(.hp):not([type=file]), textarea, a[href], [tabindex="0"]', box).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* сценарий: плитка */
  function fromTile(id) {
    const T = TILES[id];
    lead.description = T.d;
    openChat();
    greetIfNew();
    const ill = IC.tiles[id];
    const icon = ill ? ill.replace('<svg ', `<svg style="--c:${T.c}" `) : '';
    setActions([]);
    queue(async () => { await sleep(fast() ? 0 : (RM ? 0 : 350)); me(icon + esc(T.t)); });
    bot(...T.say, 'Цену и срок назовём после диагностики, до начала работ. Чем помочь дальше?');
    queue(async () => mainReplies());
  }

  /* сценарий: вопрос; land(target) — «полёт» пузыря из облака вопросов (если есть) */
  function askFaq(i, viaChip = false, land = null) {
    const f = FAQ[i];
    openChat(); greetIfNew(); setActions([]);
    queue(async () => {
      const anim = typeof land === 'function' && !RM && !fast();
      if (!viaChip && anim) await sleep(420);
      const m = me(esc(f.q));
      if (anim) {
        m.style.visibility = 'hidden';
        log.scrollTop = log.scrollHeight;
        try { await land(m); } finally { m.style.visibility = ''; }
      }
    });
    bot(...f.a);
    queue(async () => setActions([
      chip('Записаться', () => { me('Записаться'); startBooking(); }, 'primary'),
      chip('Другой вопрос', () => { me('Другой вопрос'); other(); })
    ]));
  }
  function other() {
    bot('Спрашивайте — напишите своими словами или выберите:');
    queue(async () => setActions([
      ...[0, 3, 5, 10, 11].map(i => chip(esc(FAQ[i].q), () => askFaq(i, true))),
      chip(ICON.tg.replace('viewBox', 'width="22" height="22" viewBox') + 'Написать в Telegram', () => window.open(TG, '_blank', 'noopener'), 'sun')
    ]));
  }

  /* сценарий: запись прямо в чате */
  function startBooking() {
    openChat(); greetIfNew(); setActions([]);
    lead.name = lead.name || '';
    if (lead.name) { bot(`Записываю вас, ${esc(lead.name)}! Какой у вас телефон?`); queue(async () => askPhone()); return; }
    bot('Отлично! Запишу на бесплатную диагностику — это 4 коротких вопроса.', 'Как вас зовут?');
    queue(async () => {
      step = 'name';
      setComposer({ placeholder: 'Ваше имя', ac: 'given-name' });
      setActions(hasForm() ? [chip('Лучше заполню формой', () => openForm())] : []);
    });
  }
  function askPhone() {
    step = 'phone';
    setComposer({ mode: 'tel' });
    setActions([]);
  }
  function askContact() {
    step = 'contact';
    setComposer({ off: true, placeholder: 'Выберите вариант выше' });
    const mk = (val, label, icon, cls) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'bigpick ' + cls; b.innerHTML = icon + label;
      b.addEventListener('click', () => {
        lead.contact = val; setActions([]);
        me(label);
        askBrand();
      });
      return b;
    };
    setActions([mk('call', 'Позвоните мне', ICON.call, 'bigpick--call'), mk('telegram', 'Напишите в Telegram', ICON.tg, 'bigpick--tg')]);
  }
  function askBrand() {
    bot('Какая марка у часов? Можно пропустить.');
    queue(async () => {
      step = 'brand';
      setComposer({ placeholder: 'Марка часов' });
      setActions([...BRANDS.slice(0, 6).map(b => chip(b, () => { lead.brand = b; me(b); askPhoto(); }, 'xs')),
        chip('Пропустить', () => { me('Пропустить'); askPhoto(); }, 'xs sun')]);
    });
  }
  const photoButtons = () => [
    chip(ICON.cam.replace('viewBox', 'width="24" height="24" viewBox') + 'Добавить фото', () => { photoIn.click(); askPhotoAgain(); }, 'sun'),
    chip('Без фото', () => { me('Без фото'); review(); })
  ];
  function askPhoto() {
    bot('Если хотите, пришлите фото часов — мастеру будет проще. Это по желанию.');
    queue(async () => {
      step = 'photo';
      setComposer({ off: true, placeholder: 'Добавьте фото или пропустите' });
      setActions(photoButtons());
    });
  }
  function askPhotoAgain() {
    // если окно выбора закрыли без файлов — вернём кнопки
    setTimeout(() => { if (step === 'photo' && !actions.children.length) setActions(photoButtons()); }, 600);
  }
  photoIn.addEventListener('change', () => {
    const files = [...photoIn.files].filter(f => f.type.startsWith('image/')).slice(0, 5);
    if (!files.length) { if (step === 'photo') setActions(photoButtons()); return; }
    lead.photos = files;
    const m = me(`${files.length} фото`);
    const box = document.createElement('div'); box.className = 'msg__photos';
    files.forEach(f => { const i = new Image(); i.alt = ''; i.src = URL.createObjectURL(f); box.appendChild(i); });
    m.appendChild(box); scrollLog();
    review();
  });

  function summaryChips(d) {
    const parts = [d.name, d.phone, d.contact === 'telegram' ? 'Telegram' : (d.contact === 'call' ? 'Звонок' : ''), d.brand, d.description, d.photos && d.photos.length ? d.photos.length + ' фото' : ''].filter(Boolean);
    return '<div class="review__chips">' + parts.map(p => `<span>${esc(p)}</span>`).join('') + '</div>';
  }
  function review() {
    step = 'review';
    setComposer({ off: true, placeholder: 'Проверьте заявку' });
    bot('Почти готово! Проверьте, всё ли верно:');
    queue(async () => {
      const r = document.createElement('div');
      r.className = 'review';
      r.innerHTML = `<h4>Заявка на диагностику</h4>${summaryChips(lead)}
        <label class="toggle"><input type="checkbox" role="switch" ${consent ? 'checked' : ''}><span class="toggle__ui" aria-hidden="true"></span><span>Согласен на обработку персональных данных</span></label>
        <button class="vf-btn vf-btn--primary" type="button">Отправить заявку</button>`;
      const sw = $('input', r);
      sw.addEventListener('change', () => { consent = sw.checked; });
      $('.vf-btn', r).addEventListener('click', () => submitLead({ ...lead, website: hp.value }, sw, r));
      add(r);
    });
  }

  function submitLead(data, sw, host) {
    if (data.website) { done(data); return; } // ловушка для ботов: молча «принимаем»
    const clean = { name: data.name, phone: data.phone, contact: data.contact, brand: data.brand, description: data.description, photos: data.photos || [] };
    const res = window.VFLead ? VFLead.validateLead(clean) : { ok: true };
    if (!res.ok) {
      bot(esc(res.message || 'Проверьте, пожалуйста, заявку.'));
      if (res.field === 'name') queue(async () => { step = 'name'; setComposer({ placeholder: 'Ваше имя' }); });
      else if (res.field === 'phone') queue(async () => askPhone());
      return;
    }
    if (!sw.checked) {
      const ui = sw.nextElementSibling;
      ui.classList.remove('shake'); void ui.offsetWidth; ui.classList.add('shake');
      bot('Включите, пожалуйста, согласие на обработку данных — без него не можем принять заявку.');
      return;
    }
    $('.vf-btn', host).disabled = true; sw.disabled = true;
    done(clean);
  }

  function done(d) {
    step = 'done';
    setActions([]);
    setComposer({ placeholder: 'Напишите вопрос…' });
    queue(async () => {
      const t = document.createElement('div');
      t.className = 'ticket';
      t.innerHTML = `${ICON.ok}<h4>Заявка принята (прототип)</h4>
        <p>${d.contact === 'telegram' ? 'Напишем вам в Telegram' : 'Перезвоним вам'}, чтобы договориться о бесплатной диагностике.</p>
        ${summaryChips(d)}
        <p class="ticket__note">Это прототип: заявка никуда не отправлена.</p>`;
      add(t);
      if (!RM) confetti(t);
    });
    bot('Спасибо! Если удобнее — звоните: <b>' + PHONE + '</b>.');
    queue(async () => setActions([
      chip('Другой вопрос', () => { me('Другой вопрос'); other(); }),
      chip('Закрыть чат', () => closeChat())
    ]));
  }
  function confetti(host) {
    const cols = ['var(--vf-accent, #F0533F)', 'var(--vf-easy-sun, #FFD25E)', 'var(--vf-easy-sky, #9FD8FF)', 'var(--vf-easy-mint, #8EE0B8)', 'var(--vf-easy-lilac, #C8B6FF)', 'var(--vf-easy-pink, #FFC2DA)'];
    for (let i = 0; i < 26; i++) {
      const c = document.createElement('i');
      c.className = 'confetti';
      c.style.background = cols[i % cols.length];
      c.style.setProperty('--x', (Math.random() * 300 - 150) + 'px');
      c.style.setProperty('--y', (Math.random() * -160 - 30) + 'px');
      c.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      host.appendChild(c);
      setTimeout(() => c.remove(), 1200);
    }
  }

  /* свободный вопрос (из поля ввода или из чужого компонента) */
  function freeQuestion(v) {
    me(esc(v)); setActions([]);
    const hit = KEYS.find(([re]) => re.test(v));
    if (hit && hit[1] === -1) { startBooking(); return; }
    if (hit) { bot(...FAQ[hit[1]].a); queue(async () => mainReplies()); return; }
    if (!lead.description || lead.description === 'Нужна диагностика') lead.description = v.slice(0, 300);
    bot('Хороший вопрос — уточним у мастера. Оставьте заявку, и он ответит сам, или напишите нам в Telegram.');
    queue(async () => setActions([
      chip('Записаться', () => { me('Записаться'); startBooking(); }, 'primary'),
      chip(ICON.tg.replace('viewBox', 'width="22" height="22" viewBox') + 'Telegram', () => window.open(TG, '_blank', 'noopener'), 'sun')
    ]));
  }

  /* ввод в чат */
  composer.addEventListener('submit', e => {
    e.preventDefault();
    const f = field();
    const v = f.value.trim();
    if (!v) { f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); return; }
    f.value = '';
    if (step === 'name') {
      if (v.length < 2 || /\d/.test(v)) { me(esc(v)); bot('Кажется, это не похоже на имя. Как к вам обращаться?'); return; }
      lead.name = v.slice(0, 60);
      me(esc(lead.name)); setActions([]);
      bot(`Приятно познакомиться, ${esc(lead.name)}! Какой у вас телефон?`);
      queue(async () => askPhone());
      return;
    }
    if (step === 'phone') {
      const digits = v.replace(/\D/g, '');
      me(esc(v));
      if (digits.length < 11) { bot('Кажется, в номере не хватает цифр. Проверьте, пожалуйста.'); return; }
      lead.phone = v;
      bot('Записал! Как вам удобнее, чтобы мы связались?');
      queue(async () => askContact());
      return;
    }
    if (step === 'brand') {
      lead.brand = v.slice(0, 60); me(esc(lead.brand)); setActions([]);
      askPhoto();
      return;
    }
    freeQuestion(v);
  });

  /* ---------- та же заявка одной карточкой — в компоненте заявки (vf:book { form: true }) ---------- */
  function openForm() {
    openChat();
    emit('vf:book', { form: true, from: ID, lead: { ...lead }, consent });
  }
  toFormBtn.addEventListener('click', openForm);

  /* ---------- связи с другими компонентами ---------- */
  document.addEventListener('vf:chat', e => {
    e.preventDefault();
    const d = e.detail || {};
    if (d.symptom && TILES[d.symptom]) return fromTile(d.symptom);
    if (d.ask) { openChat(); greetIfNew(); me('Хочу спросить'); other(); return; }
    const q = d.question || d.label || '';
    if (q) {
      const i = FAQ.findIndex(f => f.q === q);
      if (i >= 0) return askFaq(i, false, d.land);
      openChat(); greetIfNew(); freeQuestion(q); return;
    }
    openChat(); greetIfNew();
  });
  document.addEventListener('vf:book', e => {
    const d = e.detail || {};
    if (d.form) return; // форма одной карточкой — дело компонента заявки
    e.preventDefault();
    if (step && step !== 'done' && started) { openChat(); return; }
    openChat(); greetIfNew(); startBooking();
  });
  // заявка отправлена формой: итог показываем в чате
  document.addEventListener('vf:lead', e => {
    const d = e.detail || {};
    e.preventDefault();
    openChat(); greetIfNew();
    if (d.website) { done(d); return; }
    Object.assign(lead, { name: d.name, phone: d.phone, contact: d.contact, brand: d.brand, description: d.description, photos: d.photos || [] });
    consent = true; setActions([]);
    me('Отправил заявку формой');
    done(lead);
  });

  /* ---------- демо-режимы для скриншотов ---------- */
  if (DEMO === 'chat') { fromTile('stop'); }
  if (DEMO === 'book') {
    fromTile('glass');
    queue(async () => { setActions([]); me('Записаться'); });
    queue(async () => { started = true; });
    bot('Отлично! Запишу на бесплатную диагностику — это 4 коротких вопроса.', 'Как вас зовут?');
    queue(async () => { lead.name = 'Анна'; me('Анна'); });
    bot('Приятно познакомиться, Анна! Какой у вас телефон?');
    queue(async () => { lead.phone = '+7 (900) 000-00-00'; me(lead.phone); });
    bot('Записал! Как вам удобнее, чтобы мы связались?');
    queue(async () => askContact());
  }
  if (DEMO === 'done') {
    Object.assign(lead, { name: 'Анна', phone: '+7 (900) 000-00-00', contact: 'telegram', brand: 'Cartier', description: 'Разбито или поцарапано стекло' });
    openChat(); greetIfNew(); consent = true;
    review();
    queue(async () => { const r = $$('.review', log).pop() || log.lastElementChild; const sw = $('input', r); if (sw) { sw.checked = true; } done({ ...lead, photos: [] }); });
  }
});
