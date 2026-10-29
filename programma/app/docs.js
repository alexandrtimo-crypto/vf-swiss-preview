// Шаблоны документов A4: квитанция о приёме и акт выполненных работ
window.Docs = (() => {
  const DEFAULTS = {
    company: 'VF swiss',
    legal: '',               // ИП / ООО, ИНН, ОГРН — заполняет владелец
    address: 'Москва, ул. Петровка, 23/10 стр. 5',
    phone: '8 (965) 171-69-96',
    telegram: '@VFswissboutique',
    master: '',
    warrantyMonths: 24,
    warrantyText:
      'Гарантия распространяется на выполненные работы и детали, установленные Исполнителем. ' +
      'Гарантия не распространяется на механические повреждения, следы вскрытия или ремонта третьими лицами, ' +
      'последствия попадания влаги при нарушении правил эксплуатации, естественный износ ремешков, браслетов и покрытий. ' +
      'Для гарантийного обращения сохраните этот акт.',
    intakeText:
      'Стоимость и срок ремонта определяются после диагностики и согласовываются с Заказчиком до начала работ. ' +
      'Диагностика — бесплатно. Изделие выдаётся по предъявлении этой квитанции. ' +
      'Заказчик подтверждает, что описание внешнего вида и комплектности изделия указано верно.',
    logo: '',
    publicUrl: '',
  };
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
    return `<div class="d-emblem"><img class="for-color" src="${ASSETS}logo-color.png" alt="VF swiss"><img class="for-bw" src="${ASSETS}logo-gray.png" alt="VF swiss"></div>`;
  }

  function header(settings) {
    const tg = telegramUrl(settings.telegram);
    return `<header class="d-head">
      ${emblem(settings)}
      <div class="d-brand">
        <div class="d-kicker">Швейцарский часовой сервис</div>
        <div class="d-name">VF SWISS</div>
        <div class="d-tag">Ремонт · Реставрация · Полировка</div>
      </div>
      <div class="d-contacts">
        <div>${esc(settings.address)}</div>
        <div>${esc(settings.phone)}</div>
        <div>${esc(settings.telegram)}</div>
      </div>
      ${tg ? `<div class="d-qr" data-qr="${esc(tg)}"></div>` : ''}
    </header>`;
  }

  const field = (label, value, cls = '') => `<div class="d-f ${cls}"><span>${label}</span><b>${value || '<i class="d-dash">—</i>'}</b></div>`;

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

  function parties(o, settings, clientLabel) {
    const c = o.client;
    const how = c.contact === 'telegram' ? 'Telegram' : 'звонок';
    return `<section class="d-parties">
      <div><h3>Исполнитель</h3><p><b>${esc(settings.company)}</b>${settings.legal ? `<br>${nl(settings.legal)}` : ''}<br>${esc(settings.address)}</p></div>
      <div><h3>${clientLabel}</h3><p><b>${blank(c.name, 60)}</b><br>Тел.: ${blank(c.phone, 40)}<br>Связь: ${how}</p></div>
    </section>`;
  }

  function signs(left, right, settings, o) {
    return `<section class="d-signs">
      <div><span class="d-line"></span><small>${left}${settings.master ? ` · ${esc(settings.master)}` : ''}</small><em>М.П.</em></div>
      <div><span class="d-line"></span><small>${right}${o.client.name ? ` · ${esc(o.client.name)}` : ''}</small></div>
    </section>`;
  }

  const baseUrl = settings => (settings.publicUrl || location.origin).replace(/\/$/, '');
  const cabinetBlock = (o, settings) => (o.cabinet ? `<section class="d-cab">
      <div class="d-qr d-qr--cab" data-qr="${esc(cabUrl(baseUrl(settings), o.cabinet.token))}"></div>
      <div><h3>Личный кабинет ${esc(o.cabinet.code)}</h3><p>Статус ремонта, документы и гарантия — по этому QR или по QR на вашей карточке клиента.</p></div>
    </section>` : '');

  const copyLabel = copy => (copy ? `<div class="d-copy">${copy}</div>` : '');

  function intake(o, settings, copy) {
    const created = asDate(o.created);
    return `<article class="sheet">
      ${header(settings)}
      <div class="d-title">
        <h1>Квитанция о приёме в ремонт</h1>
        <p>№ ${esc(o.num)} от ${longDate(created)}</p>${copyLabel(copy)}
      </div>
      ${parties(o, settings, 'Заказчик')}
      ${watchBlock(o, true)}
      <section class="d-sec">
        <h3>Со слов Заказчика</h3>
        <p class="d-text">${o.issue ? nl(o.issue) : '<span class="d-blank d-blank--full"></span>'}</p>
        <div class="d-grid d-grid--2">
          ${field('Предварительная оценка', esc(o.estimate) || 'после бесплатной диагностики')}
          ${field('Ориентировочный срок', o.due ? dmy(asDate(o.due)) : 'сообщим после диагностики')}
        </div>
      </section>
      ${o.photos?.length ? `<section class="d-sec"><h3>Фото при приёмке</h3><div class="d-photos">${o.photos.slice(0, 4).map(src => `<img src="${src}" alt="">`).join('')}</div></section>` : ''}
      <section class="d-note"><h3>Условия</h3><p>${nl(settings.intakeText)}</p></section>
      ${cabinetBlock(o, settings)}
      ${signs('Изделие принял', 'Изделие сдал, с описанием согласен', settings, o)}
      <footer class="d-foot">Точность. Качество. Надёжность.</footer>
    </article>`;
  }

  function act(o, settings, copy) {
    const issued = asDate(o.issued) || new Date();
    const months = Number(o.warrantyMonths ?? settings.warrantyMonths) || 0;
    const until = new Date(issued); until.setMonth(until.getMonth() + months);
    const rows = o.works.filter(r => r.name);
    const total = rows.reduce((s, r) => s + (Number(r.qty) || 1) * (Number(r.price) || 0), 0);
    return `<article class="sheet">
      ${header(settings)}
      <div class="d-title">
        <h1>Акт выполненных работ</h1>
        <p>№ ${esc(o.num)} от ${longDate(issued)} · к квитанции от ${dmy(asDate(o.created))}</p>${copyLabel(copy)}
      </div>
      ${parties(o, settings, 'Заказчик')}
      ${watchBlock(o, false)}
      <section class="d-sec">
        <h3>Выполненные работы и установленные детали</h3>
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
        <div><h3>Гарантия до ${dmy(until)}</h3><p>${nl(settings.warrantyText)}</p></div>
      </section>
      <p class="d-confirm">Работы выполнены в полном объёме. Изделие получено, внешний вид, комплектность и работоспособность проверены в присутствии Исполнителя${o.conditionOut ? ` (${esc(o.conditionOut)})` : ''}. Претензий к объёму, качеству и срокам работ Заказчик не имеет.</p>
      ${cabinetBlock(o, settings)}
      ${signs('Работы сдал', 'Работы принял, изделие получил', settings, o)}
      <footer class="d-foot">Точность. Качество. Надёжность.</footer>
    </article>`;
  }

  const TYPES = {
    intake: { title: 'Квитанция о приёме', file: 'Квитанция', render: intake },
    act: { title: 'Акт выполненных работ', file: 'Акт', render: act },
  };

  // Две копии: для Заказчика и для мастерской
  function render(type, o, settings, copies, mode = 'color', pdf = false) {
    const t = TYPES[type];
    const cls = `sheet${mode === 'bw' ? ' is-bw' : ''}${pdf ? ' is-pdf' : ''}`;
    return (copies === 2
      ? t.render(o, settings, 'Экземпляр Заказчика') + t.render(o, settings, 'Экземпляр Исполнителя')
      : t.render(o, settings, '')).replace(/class="sheet"/g, `class="${cls}"`);
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

  return { DEFAULTS, TYPES, render, cards, mountQr, rublesInWords, telegramUrl, dmy, esc, cabUrl, ASSETS };
})();
