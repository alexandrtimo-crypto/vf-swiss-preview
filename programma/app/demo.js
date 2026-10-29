// Демо-режим: подключается раньше остальных скриптов. root — папка, где лежат app/ и cabinet/.
window.VF_DEMO = { root: new URL('../', document.currentScript.src).href };
document.addEventListener('DOMContentLoaded', () => {
  const bar = document.createElement('div');
  bar.className = 'demo-bar';
  bar.innerHTML = `<a href="${VF_DEMO.root}../">← Обзор</a><span>Демо: данные хранятся только в этом браузере</span><button type="button">Сбросить</button>`;
  bar.querySelector('button').onclick = () => { if (confirm('Вернуть демо-данные к началу? Ваши изменения удалятся.')) VF_DEMO.reset(); };
  document.body.prepend(bar);
});
