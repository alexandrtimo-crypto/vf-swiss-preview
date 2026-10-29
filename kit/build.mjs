// VF kit: каталог элементов, сборка по рецепту, превью
//   node kit/build.mjs --index                 → kit/index.json (каталог для конструктора)
//   node kit/build.mjs kit/recipes/lux.json    → kit/dist/lux/ (index.html, style.css, app.js, runtime.js)
//   node kit/build.mjs --thumbs [id…]          → thumb.jpg у компонентов (нужен сервер v2 на :8765)
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assemble, SLOTS } from './assemble.mjs';

const V2 = join(dirname(fileURLToPath(import.meta.url)), '..');
const KIT = join(V2, 'kit');
const read = async p => { try { return await readFile(join(V2, p), 'utf8'); } catch { return null; } };
const fontsOf = css => (css.match(/\/\*\s*fonts:\s*([^*]+)\*\//)?.[1] || '').split(';').map(s => s.trim()).filter(Boolean);
const titleOf = (css, id) => css.match(/\/\*\s*title:\s*([^*]+)\*\//)?.[1].trim() || id;

async function buildIndex() {
  const components = [];
  for (const slot of await readdir(join(KIT, 'components')).catch(() => [])) {
    for (const id of await readdir(join(KIT, 'components', slot)).catch(() => [])) {
      const meta = JSON.parse(await read(`kit/components/${slot}/${id}/meta.json`) || 'null');
      if (!meta) continue;
      components.push({ ...meta, id, slot, hasJs: existsSync(join(KIT, 'components', slot, id, 'part.js')), thumb: existsSync(join(KIT, 'components', slot, id, 'thumb.jpg')) ? `kit/components/${slot}/${id}/thumb.jpg` : null });
    }
  }
  components.sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) || a.id.localeCompare(b.id));
  const list = async (dir, ext) => Promise.all((await readdir(join(KIT, dir)).catch(() => [])).filter(f => f.endsWith(ext)).map(async f => {
    const css = await read(`kit/${dir}/${f}`); const id = f.slice(0, -ext.length);
    return { id, title: titleOf(css, id), fonts: fontsOf(css) };
  }));
  const recipes = await Promise.all((await readdir(join(KIT, 'recipes')).catch(() => [])).filter(f => f.endsWith('.json')).map(async f => JSON.parse(await read(`kit/recipes/${f}`))));
  const index = { slots: SLOTS, tokens: await list('tokens', '.css'), buttons: await list('elements/buttons', '.css'), fields: await list('elements/fields', '.css'), icons: await list('elements/icons', '.css'), sounds: (await readdir(join(KIT, 'sounds'), { withFileTypes: true }).catch(() => [])).filter(d => d.isDirectory()).map(d => ({ id: d.name, title: `Звуки · ${d.name}` })), components, recipes };
  await writeFile(join(KIT, 'index.json'), JSON.stringify(index, null, 1));
  console.log(`index.json: ${components.length} компонентов, тем ${index.tokens.length}, кнопок ${index.buttons.length}, полей ${index.fields.length}, иконок ${index.icons.length}, рецептов ${recipes.length}`);
  return index;
}

async function buildRecipe(path) {
  const index = await buildIndex();
  const recipe = JSON.parse(await readFile(path, 'utf8'));
  const out = await assemble(recipe, index, read, { inline: false });
  if (out.missing.length) console.warn('нет компонентов:', out.missing.join(', '));
  const dir = join(KIT, 'dist', recipe.name);
  await mkdir(dir, { recursive: true });
  await Promise.all([
    writeFile(join(dir, 'index.html'), out.html),
    writeFile(join(dir, 'style.css'), out.css),
    writeFile(join(dir, 'app.js'), out.js),
    writeFile(join(dir, 'runtime.js'), out.runtime),
  ]);
  console.log(`собрано: kit/dist/${recipe.name}/ (${recipe.parts.length} элементов)`);
}

async function buildThumbs(only) {
  const index = await buildIndex();
  const tmp = join(KIT, '.tmp', String(process.pid)); await mkdir(tmp, { recursive: true }); // своя папка: несколько сборок параллельно
  for (const c of index.components.filter(c => !only.length || only.includes(c.id))) {
    const tokens = index.tokens.find(t => t.id === c.vision) ? c.vision : index.tokens[0]?.id;
    const recipe = { name: c.id, title: c.title, tokens, buttons: index.buttons.find(b => b.id.startsWith(c.vision))?.id, fields: index.fields.find(f => f.id.startsWith(c.vision))?.id, parts: [c.id] };
    const { html } = await assemble(recipe, index, read);
    await writeFile(join(tmp, `${c.id}.html`), html);
    const png = join(tmp, `${c.id}.png`);
    execFileSync('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=3000', '--window-size=1440,900', `--user-data-dir=${join(tmp, 'profile')}`, `--screenshot=${png}`, `http://127.0.0.1:8765/kit/.tmp/${process.pid}/${c.id}.html`], { stdio: 'ignore' });
    execFileSync('convert', [png, '-resize', '720x450^', '-gravity', 'north', '-extent', '720x450', '-quality', '78', join(KIT, 'components', c.slot, c.id, 'thumb.jpg')]);
    console.log('превью:', c.id);
  }
  await rm(tmp, { recursive: true, force: true });
  await buildIndex();
}

const args = process.argv.slice(2);
if (args[0] === '--index') await buildIndex();
else if (args[0] === '--thumbs') await buildThumbs(args.slice(1));
else if (args[0]) await buildRecipe(args[0]);
else console.log('node kit/build.mjs --index | --thumbs [id…] | kit/recipes/<имя>.json');
