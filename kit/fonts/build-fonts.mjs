// Генерирует kit/fonts/fonts.css по файлам в kit/fonts/<семейство>/ (woff2 Fontsource, ttf/woff2 с GitHub)
// node kit/fonts/build-fonts.mjs
import { readdirSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const RANGES = {
  cyrillic: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116, U+20BD',
  latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
};
// Имя в CSS и диапазон насыщенности вариативных версий
const FAMILIES = {
  'golos-text': { name: 'Golos Text', wght: '400 900' },
  'onest': { name: 'Onest', wght: '100 900' },
  'unbounded': { name: 'Unbounded', wght: '200 900' },
  'pt-serif': { name: 'PT Serif' },
  'pt-root-ui': { name: 'PT Root UI', wght: '300 700' },
  'involve': { name: 'Involve', wght: '400 700' },
};
const css = ['/* Локальные шрифты kit (SIL OFL 1.1, лицензии — в папках семейств). Генерация: kit/fonts/build-fonts.mjs */'];

for (const [dir, fam] of Object.entries(FAMILIES)) {
  let files; try { files = readdirSync(join(DIR, dir)).filter(f => /\.(woff2|ttf)$/i.test(f) && statSync(join(DIR, dir, f)).size > 1000); } catch { continue; }
  const woff2 = files.filter(f => f.endsWith('.woff2'));
  const list = woff2.length ? woff2 : files;
  for (const f of list) {
    const subset = /-cyrillic-/.test(f) ? 'cyrillic' : /-latin-/.test(f) ? 'latin' : null;
    const italic = /italic|oblique/i.test(f);
    const variable = /wght|\[|variable|VF/i.test(f);
    const weight = variable ? (fam.wght || '100 900') : (f.match(/-(\d{3})-/)?.[1] || (/bold/i.test(f) ? '700' : /medium/i.test(f) ? '500' : /semibold/i.test(f) ? '600' : /light/i.test(f) ? '300' : '400'));
    const format = f.endsWith('.woff2') ? 'woff2' : 'truetype';
    css.push(`@font-face { font-family: '${fam.name}'; font-style: ${italic ? 'italic' : 'normal'}; font-weight: ${weight}; font-display: swap; src: url('${dir}/${f}') format('${format}');${subset ? ` unicode-range: ${RANGES[subset]};` : ''} }`);
  }
  console.log(`${fam.name}: ${list.length} файлов`);
}
writeFileSync(join(DIR, 'fonts.css'), css.join('\n') + '\n');
