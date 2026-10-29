// Собирает наборы иконок для kit: kit/icons/<набор>/<имя>.svg + kit/elements/icons/<набор>.css
// node kit/icons/build-icons.mjs  (исходники — tools/libs/icons/<набор>, скачанные npm-пакеты)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(KIT, '../../tools/libs/icons');
const names = JSON.parse(readFileSync(join(KIT, 'icons/names.json'), 'utf8'));
const SETS = {
  tabler:  { title: 'Иконки · Tabler (MIT, линия 2px)', prefer: ['outline'], license: 'MIT © Paweł Kuna (tabler-icons)' },
  lucide:  { title: 'Иконки · Lucide (ISC, тонкая линия)', prefer: ['icons'], license: 'ISC © Lucide Contributors' },
  gravity: { title: 'Иконки · Gravity UI (MIT, строгие)', prefer: ['svgs'], license: 'MIT © YANDEX LLC (gravity-ui/icons)' },
};

function indexSvgs(dir, prefer) {
  const map = new Map();
  const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith('.svg')) {
    const k = basename(f, '.svg'); const better = prefer.some(x => p.includes(`/${x}/`));
    if (!map.has(k) || better) map.set(k, p); } } };
  walk(dir); return map;
}

for (const [set, cfg] of Object.entries(SETS)) {
  let svgs; try { svgs = indexSvgs(join(SRC, set), cfg.prefer); } catch { console.log(`${set}: нет исходников`); continue; }
  const out = join(KIT, 'icons', set); mkdirSync(out, { recursive: true });
  const css = [`/* title: ${cfg.title} */`, `/* ${cfg.license}. Сборка: kit/icons/build-icons.mjs */`,
    '.vf-i { display: inline-block; width: 1em; height: 1em; flex: none; vertical-align: -0.125em; background-color: currentColor; -webkit-mask: var(--vf-i) center / contain no-repeat; mask: var(--vf-i) center / contain no-repeat; }'];
  const missing = [];
  for (const [name, alts] of Object.entries(names)) {
    const hit = (alts[set] || []).find(a => svgs.has(a));
    if (!hit) { missing.push(name); continue; }
    copyFileSync(svgs.get(hit), join(out, `${name}.svg`));
    css.push(`.vf-i--${name} { --vf-i: url("/kit/icons/${set}/${name}.svg"); }`);
  }
  writeFileSync(join(KIT, 'elements/icons', `${set}.css`), css.join('\n') + '\n');
  console.log(`${set}: ${Object.keys(names).length - missing.length}/${Object.keys(names).length}${missing.length ? ' · нет: ' + missing.join(', ') : ''}`);
}
