// Конструктор: рецепт → предпросмотр. Сборка та же, что у build.mjs (assemble.mjs)
import { assemble } from '../assemble.mjs';

const $ = id => document.getElementById(id);
// Корень v2 относительно конструктора (kit/konstruktor/) — работает и из подпапки хостинга
const ROOT = new URL('../../', location.href);
const abs = s => s && s.replace(/(["'(`])\/(kit|media|shared)\//g, `$1${ROOT.href}$2/`);
const read = async p => { const r = await fetch(new URL(p, ROOT), { cache: 'no-store' }); return r.ok ? abs(await r.text()) : null; };
const SLOT_RU = { header: 'Шапка', hero: 'Первый экран', story: 'О мастерской', services: 'Услуги', process: 'Процесс', works: 'Работы', brands: 'Бренды', warranty: 'Гарантия', faq: 'Вопросы', booking: 'Заявка', contacts: 'Контакты', footer: 'Подвал', dock: 'Панель связи', overlay: 'Поверх страницы' };
const KEY = 'vf-kit-recipe';

let index, recipe, width = 1440, timer;

const opt = (v, label, sel) => `<option value="${v}"${v === sel ? ' selected' : ''}>${label}</option>`;
const byId = id => index.components.find(c => c.id === id);
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(recipe)); } catch {} };

function drawControls() {
  $('recipe').innerHTML = opt('', '— текущий —', '') + index.recipes.map(r => opt(r.name, r.title || r.name, '')).join('');
  $('tokens').innerHTML = index.tokens.map(t => opt(t.id, t.title, recipe.tokens)).join('');
  $('buttons').innerHTML = opt('', 'нет', recipe.buttons || '') + index.buttons.map(t => opt(t.id, t.title, recipe.buttons)).join('');
  $('fields').innerHTML = opt('', 'нет', recipe.fields || '') + index.fields.map(t => opt(t.id, t.title, recipe.fields)).join('');
  $('sounds').innerHTML = opt('', 'без звука', recipe.sounds || '') + (index.sounds || []).map(t => opt(t.id, t.title, recipe.sounds)).join('');
  $('icons').innerHTML = opt('', 'нет', recipe.icons || '') + (index.icons || []).map(t => opt(t.id, t.title, recipe.icons)).join('');
  $('slots').innerHTML = recipe.parts.map((id, i) => {
    const c = byId(id); if (!c) return `<div class="slot"><span></span><span class="warn">нет элемента ${id}</span><div class="ops"><button data-del="${i}">✕</button></div></div>`;
    const variants = index.components.filter(x => x.slot === c.slot);
    return `<div class="slot">
      ${c.thumb ? `<img src="${ROOT.href}${c.thumb}" alt="">` : '<span></span>'}
      <div><b>${SLOT_RU[c.slot] || c.slot}</b><select data-i="${i}">${variants.map(v => opt(v.id, `${v.title} · ${v.vision}`, id)).join('')}</select></div>
      <div class="ops"><button data-up="${i}" title="Выше">↑</button><button data-down="${i}" title="Ниже">↓</button><button data-del="${i}" title="Убрать">✕</button></div>
    </div>`;
  }).join('');
  $('add').innerHTML = opt('', '— выберите —', '') + index.slots.map(s => {
    const list = index.components.filter(c => c.slot === s);
    return list.length ? `<optgroup label="${SLOT_RU[s] || s}">${list.map(c => opt(c.id, `${c.title} · ${c.vision}`, '')).join('')}</optgroup>` : '';
  }).join('');
}

function changed() { save(); drawControls(); schedule(); }
function schedule() { clearTimeout(timer); timer = setTimeout(render, 250); }

async function render() {
  const t0 = performance.now();
  const out = await assemble(recipe, index, read, { media: ROOT.href + 'media', shared: ROOT.href + 'shared' });
  $('warn').hidden = !out.missing.length;
  $('warn').textContent = out.missing.length ? 'Нет элементов: ' + out.missing.join(', ') : '';
  $('preview').srcdoc = out.html;
  $('info').textContent = `${recipe.parts.length} элементов · ${Math.round(out.html.length / 1024)} КБ · ${Math.round(performance.now() - t0)} мс`;
  fit();
}

function fit() {
  const stage = $('stage'), frame = $('frame');
  const avail = stage.clientWidth - 32;
  const k = Math.min(1, avail / width);
  frame.style.width = width + 'px';
  frame.style.height = Math.round((stage.clientHeight - 32) / k) + 'px';
  frame.style.transform = `scale(${k})`;
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

function bind() {
  $('recipe').onchange = e => { const r = index.recipes.find(x => x.name === e.target.value); if (r) { recipe = structuredClone(r); recipe.name = 'my-' + r.name; changed(); } };
  for (const k of ['tokens', 'buttons', 'fields', 'icons', 'sounds']) $(k).onchange = e => { recipe[k] = e.target.value || null; changed(); };
  $('slots').addEventListener('change', e => { const i = e.target.dataset.i; if (i != null) { recipe.parts[+i] = e.target.value; changed(); } });
  $('slots').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const p = recipe.parts;
    if (b.dataset.del != null) p.splice(+b.dataset.del, 1);
    if (b.dataset.up != null && +b.dataset.up > 0) { const i = +b.dataset.up; [p[i - 1], p[i]] = [p[i], p[i - 1]]; }
    if (b.dataset.down != null && +b.dataset.down < p.length - 1) { const i = +b.dataset.down; [p[i + 1], p[i]] = [p[i], p[i + 1]]; }
    changed();
  });
  $('add').onchange = e => {
    const c = byId(e.target.value); if (!c) return;
    // Новый элемент встаёт по порядку слотов
    const order = index.slots.indexOf(c.slot);
    const at = recipe.parts.findIndex(id => index.slots.indexOf(byId(id)?.slot) > order);
    recipe.parts.splice(at < 0 ? recipe.parts.length : at, 0, c.id);
    changed();
  };
  $('device').onclick = e => { const b = e.target.closest('button'); if (!b) return; width = +b.dataset.w; $('device').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); fit(); };
  $('reload').onclick = render;
  window.addEventListener('resize', fit);
  $('dlRecipe').onclick = () => download(`${recipe.name || 'recipe'}.json`, JSON.stringify(recipe, null, 2), 'application/json');
  $('dlHtml').onclick = async () => {
    const out = await assemble(recipe, index, read, { media: ROOT.href + 'media', shared: ROOT.href + 'shared' });
    download(`${recipe.name || 'vf-site'}.html`, out.html, 'text/html');
  };
  $('copyCmd').onclick = async () => {
    const cmd = `cat > kit/recipes/${recipe.name}.json <<'EOF'\n${JSON.stringify(recipe, null, 2)}\nEOF\nnode kit/build.mjs kit/recipes/${recipe.name}.json`;
    try { await navigator.clipboard.writeText(cmd); $('info').textContent = 'Команда скопирована'; } catch { download('build.sh', cmd, 'text/plain'); }
  };
}

index = await (await fetch(new URL('kit/index.json', ROOT), { cache: 'no-store' })).json();
let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY)); } catch {}
recipe = saved || structuredClone(index.recipes[0] || { name: 'my-site', title: 'VF swiss', tokens: index.tokens[0]?.id, parts: [] });
drawControls(); bind(); render();
