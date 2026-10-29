// Шаблоны документов A4: квитанция о приёме и акт выполненных работ
window.Docs = (() => {
  const DEFAULTS = {
    company: 'VF swiss',
    legal: 'ИП Голосов Владислав Александрович\nИНН 332913314576',   // из акта, который прислал владелец
    address: 'г. Москва, ул. Петровка 23/10 стр. 5, этаж 3, офис 1',
    phone: '+7 965 171 69 96',
    telegram: '@VFswissboutique',
    master: 'Голосов В. А.',
    warrantyMonths: 24,
    warrantyText:
      'Гарантия распространяется на выполненные работы и детали, установленные Исполнителем. ' +
      'Гарантия не распространяется на механические повреждения, следы вскрытия или ремонта третьими лицами, ' +
      'последствия попадания влаги при нарушении правил эксплуатации, естественный износ ремешков, браслетов и покрытий. ' +
      'Для гарантийного обращения сохраните этот акт.',
    intakeText:
      'Стоимость и срок ремонта определяются после диагностики и согласовываются с Клиентом до начала работ. ' +
      'Изделие выдаётся по предъявлении акта приёма. ' +
      'Клиент подтверждает, что описание внешнего вида и комплектности изделия указано верно.',
    diagText:
      'Часы принимаются для проведения диагностики и последующего технического обслуживания. Перечень работ, сроки, стоимость согласовываются ' +
      'после оценки технического состояния изделия, оставленного на диагностику. Диагностика проводится в течение 3-х (трёх) рабочих дней.',
    photoText: 'В момент приёма часов выполняется фото-видео фиксация, данные отправляются в мессенджер клиенту.',
    logo: '',
    publicUrl: '',
  };
  // Пункты предварительного осмотра как в акте владельца (его образец: «Акт приёма-передачи часов на диагностику»)
  const MOVEMENTS = ['механический', 'автоподзавод', 'кварцевый', 'иной'];
  const INSPECT = [
    { id: 'corpus', label: 'Корпус', opts: ['царапины/вмятины', 'был удар', 'корпус разбит', 'есть следы вскрытия', 'без дефектов'] },
    { id: 'glass', label: 'Стекло', opts: ['царапины', 'сколы', 'разбито', 'трещины на стекле', 'утеряно', 'не оригинал', 'без дефектов'] },
    { id: 'bezel', label: 'Безель/рант', opts: ['царапины/вмятины', 'стёрто покрытие PVD', 'утерян', 'не крутится', 'без дефектов'] },
    { id: 'dial', label: 'Циферблат/стрелки', opts: ['царапины на стрелках', 'следы попадания влаги/коррозия', 'без дефектов'] },
    { id: 'strap', label: 'Браслет/ремень', opts: ['разбито звено', 'царапины и глубокие вмятины', 'браслет сломан', 'ремешок с трещинами', 'отсутствует винт', 'ремень не оригинал', 'ремня/браслета нет', 'без дефектов'] },
    { id: 'clasp', label: 'Клипса', opts: ['царапины/вмятины', 'стёрто покрытие', 'сломана', 'утеряна', 'не оригинал', 'утеряна часть раскладной клипсы', 'деформирована', 'нет винта/штифта/втулки', 'без дефектов'] },
    { id: 'crown', label: 'Головка/кнопки', opts: ['утеряна головка', 'сломан переводной вал, обломок внутри головки', 'утеряна кнопка хронографа', 'головка не закручивается', 'не работает кнопка', 'без дефектов'] },
    { id: 'work', label: 'Работоспособность', opts: ['часы не работают', 'был удар', 'часы уронили', 'часы отстают', 'влага внутри механизма', 'часы спешат', 'часы не обслуживали больше 5 лет', 'без дефектов'] },
  ];
  const OK = 'без дефектов';
  // Абсолютный путь: документы рисуются и в приложении, и в кабинете /k/…; в демо (GitHub Pages) всё лежит в подпапке
  const DEMO = window.VF_DEMO || null;
  const ASSETS = DEMO ? DEMO.root + 'app/assets/' : '/app/assets/';
  const cabUrl = (base, token) => (DEMO ? `${DEMO.root}cabinet/?t=${token}` : `${base}/k/${token}`);
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nl = s => esc(s).replace(/\n/g, '<br>');
  const asDate = v => (v ? new Date(v) : null);
  const dmy = d => (d ? `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}` : '');
  const longDate = d => (d ? `«${String(d.getDate()).padStart(2, '0')}» ${MONTHS[d.getMonth()]} ${d.getFullYear()} г.` : '«___» ____________ 20__ г.');
  const money = n => Number(n || 0).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const hm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const fullName = c => [c?.name, c?.patronymic].map(x => (x || '').trim()).filter(Boolean).join(' ');
  // «Заказчик» в сохранённых раньше текстах настроек → «Клиент»
  const cl = t => String(t ?? '').replace(/Заказчиком/g, 'Клиентом').replace(/Заказчика/g, 'Клиента').replace(/Заказчику/g, 'Клиенту').replace(/Заказчик/g, 'Клиент');
  const blank = (v, w = 40) => (v ? esc(v) : `<span class="d-blank" style="width:${w}mm"></span>`);

  // Сумма прописью: 12 500 → «Двенадцать тысяч пятьсот рублей 00 копеек»
  function rublesInWords(sum) {
    const ones = [['', 'один', 'два'], ['', 'одна', 'две']];
    const base = ['', '', '', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
    const plural = (n, f) => { const a = n % 100, b = n % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b > 1 && b < 5 ? f[1] : f[2]; };
    const triad = (n, fem) => {
      const w = [hundreds[Math.floor(n / 100)]];
      const t = n % 100;
      if (t >= 10 && t < 20) w.push(teens[t - 10]);
      else { w.push(tens[Math.floor(t / 10)]); const o = t % 10; w.push(o < 3 ? ones[fem ? 1 : 0][o] : base[o]); }
      return w.filter(Boolean).join(' ');
    };
    const rub = Math.floor(sum), kop = Math.round((sum - rub) * 100);
    const groups = [
      [1e9, ['миллиард', 'миллиарда', 'миллиардов'], false],
      [1e6, ['миллион', 'миллиона', 'миллионов'], false],
      [1e3, ['тысяча', 'тысячи', 'тысяч'], true],
    ];
    let rest = rub; const parts = [];
    for (const [div, forms, fem] of groups) {
      const g = Math.floor(rest / div); rest %= div;
      if (g) parts.push(triad(g, fem), plural(g, forms));
    }
    if (rest) parts.push(triad(rest, false));
    let text = parts.join(' ').trim() || 'ноль';
    text = text[0].toUpperCase() + text.slice(1);
    return `${text} ${plural(rub, ['рубль', 'рубля', 'рублей'])} ${String(kop).padStart(2, '0')} ${plural(kop, ['копейка', 'копейки', 'копеек'])}`;
  }

  function telegramUrl(v) {
    v = (v || '').trim();
    if (!v) return '';
    if (/^https?:\/\//.test(v)) return v;
    if (v.startsWith('@')) return `https://t.me/${v.slice(1)}`;
    const d = v.replace(/\D/g, '');
    if (d.length >= 10) return `https://t.me/+${d.length === 11 && d[0] === '8' ? '7' + d.slice(1) : d}`;
    return `https://t.me/${v}`;
  }

  // Логотип владельца: цветной для цветной печати, серый для ч/б
  function emblem(settings) {
    if (settings.logo) return `<div class="d-emblem"><img src="${settings.logo}" alt="VF swiss"></div>`;
    return `<div class="d-emblem"><img class="for-color" src="${ASSETS}logo-color.png" alt="VF swiss"><img class="for-bw" src="${ASSETS}logo-bw.png" alt="VF swiss"></div>`;
  }

  function header(settings) {
    const tg = telegramUrl(settings.telegram);
    return `<header class="d-head">
      ${emblem(settings)}
      <div class="d-brand">
        <div class="d-kicker">Швейцарский часовой сервис</div>
        <div class="d-name">VF SWISS</div>
      </div>
      <div class="d-contacts">
        ${settings.legal ? `<div class="d-legal">${nl(settings.legal)}</div>` : ''}
        <div>${esc(settings.address)}</div>
        <div>${esc(settings.phone)}</div>
        <div>${esc(settings.telegram)}</div>
      </div>
      ${tg ? `<div class="d-qr" data-qr="${esc(tg)}"></div>` : ''}
    </header>`;
  }

  const field = (label, value, cls = '') => `<div class="d-f ${cls}"><span>${label}</span><b>${value || '<i class="d-dash">—</i>'}</b></div>`;
  const cb = (on, text) => `<span class="d-cb${on ? ' is-on' : ''}"><i></i>${esc(text)}</span>`;
  const chosen = (o, id) => (o.inspect && Array.isArray(o.inspect[id]) ? o.inspect[id] : []);

  function watchBlock(o, withCondition) {
    const w = o.watch;
    return `<section class="d-sec">
      <h3>Изделие</h3>
      <div class="d-grid">
        ${field('Марка', esc(w.brand))}${field('Модель', esc(w.model))}${field('Референс', esc(w.ref))}
        ${field('Номер корпуса', esc(w.serial))}${field('Механизм', esc(w.movement))}${field('Материал', esc(w.material))}
        ${field('Комплектность', esc(w.kit), 'd-f--wide')}
        ${withCondition ? field('Внешний вид при приёмке', nl(w.condition), 'd-f--wide') : ''}
      </div>
    </section>`;
  }

  function parties(o, settings) {
    const c = o.client;
    const how = c.contact === 'telegram' ? 'Telegram' : 'звонок';
    return `<section class="d-parties">
      <div><h3>Исполнитель</h3><p><b>${esc(settings.company)}</b>${settings.legal ? `<br>${nl(settings.legal)}` : ''}<br>${esc(settings.address)}</p></div>
      <div><h3>Клиент</h3><p><b>${blank(fullName(c), 60)}</b><br>Тел.: ${blank(c.phone, 40)}${c.email ? `<br>Email: ${esc(c.email)}` : ''}<br>Связь: ${how}</p></div>
    </section>`;
  }

  // Блок клиента: реквизиты исполнителя уже в шапке, поэтому здесь только клиент (и пометка «владелец», если это акт приёма)
  function clientBlock(o, ownerRow) {
    const c = o.client, owner = c.owner || '';
    return `<section class="d-client">
      <div><h3>Клиент</h3><p><b>${blank(fullName(c), 70)}</b><br>Тел.: ${blank(c.phone, 40)}<br>Email: ${c.email ? esc(c.email) : blank('', 44)}</p></div>
      <div class="d-owner">${ownerRow ? cb(owner === 'owner', 'Владелец часов') + cb(owner === 'other', 'Не являюсь владельцем часов') : ''}<span>Связь: ${c.contact === 'telegram' ? 'Telegram' : 'звонок'}</span></div>
    </section>`;
  }

  // Подписи: ФИО и подпись клиента, ниже подпись исполнителя и место для печати; дата и время
  function signs(o, settings, dateLabel, date) {
    const exec = settings.master ? `ИП ${esc(settings.master.replace(/^ИП\s+/i, ''))}` : 'Исполнитель';
    return `<section class="d-signs">
      <div class="d-sg"><span>ФИО клиента</span><b>${esc(fullName(o.client))}</b></div>
      <div class="d-sg"><span>Подпись клиента</span><b></b></div>
      <div class="d-sg"><span>${exec}</span><b></b></div>
      <div class="d-mp"><em>М.П.</em></div>
      <div class="d-sg d-sg--wide"><span>${dateLabel}</span><b>${date}</b></div>
    </section>`;
  }

  const baseUrl = settings => (settings.publicUrl || location.origin).replace(/\/$/, '');
  const cabinetBlock = (o, settings) => (o.cabinet ? `<section class="d-cab">
      <div class="d-qr d-qr--cab" data-qr="${esc(cabUrl(baseUrl(settings), o.cabinet.token))}"></div>
      <div><h3>Личный кабинет ${esc(o.cabinet.code)}</h3><p>Статус ремонта, документы и гарантия — по этому QR или по QR на вашей карточке клиента.</p></div>
    </section>` : '');

  const copyLabel = copy => (copy ? `<div class="d-copy">${copy}</div>` : '');
  const when = d => `${longDate(d)}, ${hm(d)}`;

  // Акт приёма-передачи часов на диагностику: пункты как в образце владельца, отмечаются галочками
  function intake(o, settings, copy) {
    const created = asDate(o.created);
    const mv = o.watch.movement || '';
    const owner = o.client.owner || '';
    const rows = INSPECT.map(g => `<div class="d-insp"><b>${g.label}</b>${g.opts.map(t => cb(chosen(o, g.id).includes(t), t)).join('')}</div>`).join('');
    return `<article class="sheet is-compact is-intake">
      ${header(settings)}
      <div class="d-title">
        <h1>Акт приёма-передачи часов на диагностику</h1>
        <p>№ ${esc(o.num)} · ${when(created)}</p>${copyLabel(copy)}
      </div>
      ${clientBlock(o, true)}
      <section class="d-sec">
        <h3>Описание часов</h3>
        <div class="d-grid d-grid--4">
          ${field('Бренд', esc(o.watch.brand))}${field('Модель', esc(o.watch.model))}${field('Референс', esc(o.watch.ref))}${field('Серийный номер', esc(o.watch.serial))}
        </div>
        <div class="d-line-cb"><b>Тип механизма</b>${MOVEMENTS.map(t => cb(mv === t || (t === 'иной' && mv && !MOVEMENTS.includes(mv)), t)).join('')}</div>
        ${o.watch.kit || o.watch.material ? `<div class="d-grid d-grid--2">${field('Материал', esc(o.watch.material))}${field('Комплектность', esc(o.watch.kit))}</div>` : ''}
      </section>
      <section class="d-sec d-sec--insp">
        <h3>Предварительный осмотр часов в момент приёма на диагностику</h3>
        ${rows}
        ${o.watch.condition ? `<p class="d-text d-text--s"><b>Примечание:</b> ${nl(o.watch.condition)}</p>` : ''}
        ${o.issue ? `<p class="d-text d-text--s"><b>Со слов клиента:</b> ${nl(o.issue)}</p>` : ''}
      </section>
      ${o.photos?.length ? `<section class="d-sec"><div class="d-photos">${o.photos.slice(0, 4).map(src => `<img src="${src}" alt="">`).join('')}</div></section>` : ''}
      <section class="d-note"><h3>Дополнительная информация</h3><p>${nl(cl(settings.diagText || DEFAULTS.diagText))}</p><p>${nl(cl(settings.photoText || DEFAULTS.photoText))}</p></section>
      ${cabinetBlock(o, settings)}
      ${signs(o, settings, 'Дата приёма часов', when(created))}
      <footer class="d-foot">Точность. Качество. Надёжность.</footer>
    </article>`;
  }

  function act(o, settings, copy) {
    const issued = asDate(o.issued) || new Date();
    const months = Number(o.warrantyMonths ?? settings.warrantyMonths) || 0;
    const until = new Date(issued); until.setMonth(until.getMonth() + months);
    const rows = o.works.filter(r => r.name);
    const total = rows.reduce((s, r) => s + (Number(r.qty) || 1) * (Number(r.price) || 0), 0);
    const now = new Date();
    const today = issued.toDateString() === now.toDateString();
    const stamp = today ? `${longDate(issued)}, ${hm(now)}` : longDate(issued);
    return `<article class="sheet is-compact">
      ${header(settings)}
      <div class="d-title">
        <h1>Акт выполненных работ</h1>
        <p>№ ${esc(o.num)} от ${stamp} · к акту приёма от ${dmy(asDate(o.created))}</p>${copyLabel(copy)}
      </div>
      ${clientBlock(o, false)}
      ${watchBlock(o, false)}
      <section class="d-sec">
        <h3>Наименование работ и запчастей</h3>
        <table class="d-works">
          <thead><tr><th>№</th><th>Наименование</th><th>Кол-во</th><th>Цена, ₽</th><th>Сумма, ₽</th></tr></thead>
          <tbody>${rows.length ? rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}${r.kind === 'part' ? ' <i>деталь</i>' : ''}</td><td>${Number(r.qty) || 1}</td><td>${money(r.price)}</td><td>${money((Number(r.qty) || 1) * (Number(r.price) || 0))}</td></tr>`).join('')
            : '<tr><td colspan="5" class="d-empty">Работы не указаны</td></tr>'}</tbody>
        </table>
        <div class="d-total"><span>Итого к оплате</span><b>${money(total)} ₽</b></div>
        <p class="d-words">${rublesInWords(total)}</p>
      </section>
      <section class="d-warranty">
        <div class="d-warranty__badge"><b>${months}</b><span>мес.<br>гарантии</span></div>
        <div><h3>Гарантия до ${dmy(until)}</h3><p>${nl(cl(settings.warrantyText))}</p></div>
      </section>
      <p class="d-confirm">Работы выполнены в полном объёме. Изделие получено, внешний вид, комплектность и работоспособность проверены в присутствии Исполнителя${o.conditionOut ? ` (${esc(o.conditionOut)})` : ''}. Претензий к объёму, качеству и срокам работ Клиент не имеет.</p>
      ${cabinetBlock(o, settings)}
      ${signs(o, settings, 'Дата выдачи', stamp)}
      <footer class="d-foot">Точность. Качество. Надёжность.</footer>
    </article>`;
  }

  const TYPES = {
    intake: { title: 'Акт приёма-передачи на диагностику', file: 'Акт_приёма', render: intake },
    act: { title: 'Акт выполненных работ', file: 'Акт', render: act },
  };

  // Две копии: для клиента и для мастерской
  function render(type, o, settings, copies, mode = 'color', pdf = false) {
    const t = TYPES[type];
    const cls = `sheet${mode === 'bw' ? ' is-bw' : ''}${pdf ? ' is-pdf' : ''}`;
    return (copies === 2
      ? t.render(o, settings, 'Экземпляр клиента') + t.render(o, settings, 'Экземпляр Исполнителя')
      : t.render(o, settings, '')).replace(/class="sheet( [^"]*)?"/g, (m, extra) => `class="${cls}${extra || ''}"`);
  }

  function cards(cabs, settings, base) {
    const card = c => `<div class="vcard">
      <img class="vcard__logo" src="${ASSETS}logo-color.png" alt="">
      <div class="vcard__txt">
        <div class="vcard__kicker">Личный кабинет клиента</div>
        <div class="vcard__name">VF SWISS</div>
        <div class="vcard__sub">Статус ремонта · Документы · Гарантия</div>
        <div class="vcard__code">${esc(c.code)}</div>
      </div>
      <div class="vcard__qr" data-qr="${esc(cabUrl(base, c.token))}"></div>
    </div>`;
    const pages = [];
    for (let i = 0; i < cabs.length; i += 10) pages.push(`<article class="sheet sheet--cards">${cabs.slice(i, i + 10).map(card).join('')}</article>`);
    return pages.join('');
  }

  // QR-коды рисуются после вставки разметки в страницу
  function mountQr(root) {
    root.querySelectorAll('[data-qr]').forEach(el => {
      el.innerHTML = '';
      if (!window.QRCode) return;
      new QRCode(el, { text: el.dataset.qr, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.M, colorDark: '#000', colorLight: '#fff' });
      // qrcodejs подставляет <img> позже и пустым: на медленном телефоне PDF мог уйти без QR. Заменяем холст готовой картинкой сразу
      const c = el.querySelector('canvas');
      if (c) { const im = new Image(); im.alt = ''; im.src = c.toDataURL('image/png'); el.replaceChildren(im); }
    });
  }

  return { DEFAULTS, INSPECT, MOVEMENTS, OK, fullName, TYPES, render, cards, mountQr, rublesInWords, telegramUrl, dmy, esc, cabUrl, ASSETS };
})();
