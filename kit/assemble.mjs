// Сборка страницы из рецепта. Работает и в Node (build.mjs), и в браузере (конструктор):
// read(path) возвращает текст файла относительно корня v2/ или null, если файла нет.

export const SLOTS = ['header', 'hero', 'story', 'services', 'process', 'works', 'brands', 'warranty', 'faq', 'booking', 'contacts', 'footer', 'dock', 'overlay'];

export async function assemble(recipe, index, read, { media = '/media', shared = '/shared', inline = true } = {}) {
  const byId = Object.fromEntries(index.components.map(c => [c.id, c]));
  const parts = recipe.parts.map(id => byId[id]).filter(Boolean);
  const missing = recipe.parts.filter(id => !byId[id]);
  const sub = s => (s || '').replaceAll('{{media}}', media).replaceAll('{{shared}}', shared);

  const files = await Promise.all(parts.map(async c => ({
    c,
    html: sub(await read(`kit/components/${c.slot}/${c.id}/part.html`)),
    css: sub(await read(`kit/components/${c.slot}/${c.id}/part.css`)),
    js: c.hasJs === false ? '' : sub(await read(`kit/components/${c.slot}/${c.id}/part.js`)),
  })));

  const base = [
    recipe.tokens && await read(`kit/tokens/${recipe.tokens}.css`),
    recipe.buttons && await read(`kit/elements/buttons/${recipe.buttons}.css`),
    recipe.fields && await read(`kit/elements/fields/${recipe.fields}.css`),
    // В файле пути относительные (для <link>), при вставке в страницу — от корня v2
    recipe.icons && (await read(`kit/elements/icons/${recipe.icons}.css`))?.replace(/url\("\.\.\/\.\.\/icons\//g, 'url("/kit/icons/'),
    // В файле пути относительные (для <link>), при вставке в страницу — от корня v2
    (await read('kit/fonts/fonts.css'))?.replace(/url\('(?!\/|https?:)/g, "url('/kit/fonts/"),
  ].filter(Boolean).join('\n');

  const fonts = [...new Set([...(index.tokens.find(t => t.id === recipe.tokens)?.fonts || []), ...parts.flatMap(c => c.fonts || [])])];
  // Путь зависимости: '{{shared}}/…' или путь от корня v2 (ведущий слэш допускается)
  const needs = [...new Set(parts.flatMap(c => c.needs || []).map(n => n.startsWith('{{shared}}') ? n : n.replace(/^\/+/, '')))];
  const css = [base, ...files.map(f => `/* ── ${f.c.id} ── */\n${f.css || ''}`)].join('\n\n');
  const js = files.filter(f => f.js).map(f => `/* ── ${f.c.id} ── */\n;(() => {\n${f.js}\n})();`).join('\n\n');
  const runtime = await read('kit/runtime.js');
  const needScripts = await Promise.all(needs.map(async n => ({ n, src: await read(n.replace('{{shared}}', 'shared')) })));

  const fontLink = fonts.length
    ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts.map(f => 'family=' + f.replace(/ /g, '+')).join('&')}&display=swap">`
    : '';
  const scriptTag = (src, code) => (inline ? `<script>\n${code}\n</script>` : `<script src="${src}"></script>`);

  const html = `<!doctype html>
<html lang="ru" data-recipe="${esc(recipe.name || '')}"${recipe.sounds ? ` data-sound-pack="${esc(recipe.sounds)}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<link rel="icon" href="/kit/icons/favicon.png">
<title>${esc(recipe.title || 'VF swiss')}</title>
${fontLink}
${inline ? `<style>\n${css}\n</style>` : '<link rel="stylesheet" href="style.css">'}
</head>
<body class="vf-page">
${files.map(f => f.html).join('\n')}
${scriptTag('runtime.js', runtime)}
${needScripts.map(({ n, src }) => scriptTag(n.startsWith('{{shared}}') ? n.replace('{{shared}}', shared) : '/' + n, src)).join('\n')}
${scriptTag('app.js', js)}
<script>VFKit.boot();</script>
</body>
</html>`;
  return { html, css, js, runtime, missing, fonts };
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
