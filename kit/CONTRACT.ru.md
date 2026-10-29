# VF kit — контракт элементов

Цель: каждый элемент сайта лежит отдельно и имеет варианты. Сайт собирается по «рецепту» — какие варианты в каком порядке — в конструкторе (`/kit/konstruktor/`) или командой `node kit/build.mjs kit/recipes/<имя>.json`. Варианты разных видений можно смешивать.

## Структура
```
kit/
  tokens/<id>.css               — тема: цвета, шрифты, радиусы (общие имена --vf-*)
  elements/buttons/<id>.css     — шаблон кнопок (.vf-btn …)
  elements/fields/<id>.css      — шаблон полей формы (.vf-field …)
  elements/icons/<id>.css       — набор иконок (.vf-i .vf-i--<имя>), выбирается в рецепте полем icons
  fonts/<семейство>/*.woff2     — локальные шрифты (OFL), подключение — kit/fonts/fonts.css (общий, добавляется в каждую сборку)
  components/<slot>/<id>/
    part.html                   — разметка, один корневой элемент с data-part="<id>"
    part.css                    — стили, все селекторы внутри корня [data-part="<id>"] или его класса
    part.js                     — необязательно: VFKit.register('<id>', root => { … })
    meta.json                   — { id, slot, title, vision, description, fonts: [...], needs: [...] }
    thumb.jpg                   — превью 720×450 (делает build.mjs --thumbs)
  recipes/<имя>.json            — { name, title, tokens, buttons, fields, parts: ["<id>", …] }
  runtime.js, assemble.mjs, build.mjs, konstruktor/
```
`id` компонента: `<видение>-<слот>[-вариант]`, латиница, например `lux-hero`, `tech-services-bento`, `easy-chat`.

## Слоты (порядок по умолчанию)
`header` · `hero` · `story` (о мастерской/ателье) · `services` · `process` · `works` · `brands` · `warranty` · `faq` · `booking` (заявка) · `contacts` · `footer` · `dock` (плавающая панель связи) · `overlay` (чат, просмотрщик — то, что открывается поверх).

## Правила компонента
1. **Цвета и шрифты — только через общие токены**, чтобы компонент работал в любой теме:
   `--vf-bg --vf-bg-2 --vf-surface --vf-text --vf-text-2 --vf-muted --vf-line --vf-accent --vf-accent-2 --vf-on-accent --vf-danger --vf-font-display --vf-font-text --vf-font-mono --vf-radius --vf-radius-lg --vf-ease`.
   Особые цвета своего видения — с запасным значением: `var(--vf-metal, #b9a77c)`. Свои внутренние переменные можно объявлять на корне компонента.
2. **Кнопки** — классы `.vf-btn`, `.vf-btn--primary`, `.vf-btn--ghost`, `.vf-btn--sm`. Поля формы — `.vf-field` (обёртка label+input), `.vf-input`. Внешний вид задаёт выбранный шаблон из `elements/`, компонент добавляет только раскладку (ширину, отступы).
3. **Изоляция:** никаких глобальных селекторов (`body`, `h2`, `*`) в part.css, кроме `@keyframes` с префиксом id и `@media`. JS работает только внутри `root`, глобальные слушатели снимает сам; несколько компонентов на странице не мешают друг другу.
4. **Связи между компонентами** — через события `document.dispatchEvent(new CustomEvent('vf:<имя>', { detail }))`: например `vf:book` (открыть заявку, detail.symptom), `vf:chat` (открыть чат с вопросом). Если адресата нет на странице — ничего не ломается, по умолчанию прокрутка к `[data-slot="booking"]`.
5. **Медиа** — путь `{{media}}/img/…`, `{{media}}/vid/…` (сборщик подставит). Заявка — `{{shared}}/lead.js` указывается в `needs`, вызов `VFLead.validateLead`, никакой реальной отправки.
6. **reduced-motion и без JS** — как в исходных сайтах: контент виден.
7. Корень: `<section data-part="lux-hero" data-slot="hero" class="lux-hero">…</section>`.

## Шрифты и иконки (с 29.10)
8. **Шрифты — локальные**, без Google CDN: семейства из `kit/fonts/fonts.css` (Golos Text, Onest, Unbounded, PT Serif, PT Root UI, Involve — у всех кириллица). Тема пишет `--vf-font-display: 'Onest', …` и не указывает `/* fonts: */`. Google Fonts — только если нужного семейства нет локально.
9. **Иконки** — только `<i class="vf-i vf-i--<имя>" aria-hidden="true"></i>` (размер — `font-size`, цвет — `color`). Имена — словарь `kit/icons/names.json` (phone, telegram, map-pin, route, copy, clock, shield-check, wrench, search, microscope, droplet, battery, watch, sparkles, camera, upload, check, close, arrow-right, chevron-down, menu, qr-code, file-text, user, message, info, alert, gauge, award, ruble…). Набор (Tabler / Lucide / Gravity) выбирает рецепт: `"icons": "tabler"`. Эмодзи и символы Юникода вместо иконок запрещены.
10. **Звук** — слой `kit/lib/sound.js` (`needs`), по умолчанию выключен; включает посетитель элементом `lib-sound-toggle`. Звук только в ответ на действие: `data-sound="click|tick|wind|stamp|tear|paper|success|error|toggle"` или событие `vf:sound` { name }. Пак (`mechanical` / `glass` / `zen`, CC0 из UI SFX) выбирает рецепт полем `sounds`. Без автозапуска, без фоновой музыки.
