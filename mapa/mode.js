// VF kit · режим погружения. Анимации и звук включаются отдельно; «лёгкий режим» = оба выключены (слабые устройства, экономия трафика).
// Выбор анимаций хранится в 'vf-motion' ('on' | 'off'). Пока выбора нет, лёгкий режим включается сам, если система просит меньше движения
// (prefers-reduced-motion), включена экономия трафика или у устройства ≤2 ГБ памяти. Ссылка с ?mode=lite или ?mode=full задаёт выбор явно.
// Как работает «выкл»: правила @media (prefers-reduced-motion: reduce) всех компонентов включаются принудительно, matchMedia для них
// отвечает «reduce», видео с автозапуском останавливаются. Это тот же путь, что у людей с настройкой «уменьшить движение», он проверен в каждом компоненте.
// Подключать в самом начале <body>, до скриптов компонентов. Переключение применяется после перезагрузки страницы (JS компонентов читает настройку при старте).
(() => {
  if (window.VFMode) return;
  const KEY = 'vf-motion';
  const doc = document.documentElement;
  const native = window.matchMedia.bind(window);
  let stored = null;
  try {
    const q = new URLSearchParams(location.search).get('mode');
    if (q === 'lite' || q === 'full') localStorage.setItem(KEY, q === 'lite' ? 'off' : 'on');
    stored = localStorage.getItem(KEY);
  } catch {}
  const sys = native('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection;
  const weak = !!(conn && conn.saveData) || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  const auto = !stored && !!(sys || weak);
  const lite = stored ? stored === 'off' : auto;
  doc.dataset.motion = lite ? 'off' : 'on';
  doc.dataset.motionAuto = auto ? 'yes' : 'no';

  const RE_REDUCE = /\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/g;
  const RE_NOPREF = /\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)/g;

  if (lite) {
    // JS компонентов: matchMedia('(prefers-reduced-motion: …)') отвечает так, будто движение отключено
    window.matchMedia = q => {
      const m = native(q);
      if (typeof q !== 'string' || !/prefers-reduced-motion/.test(q)) return m;
      const val = RE_REDUCE.test(q) && !/not\s+all/.test(q); RE_REDUCE.lastIndex = 0;
      return new Proxy(m, { get: (t, p) => (p === 'matches' ? val : typeof t[p] === 'function' ? t[p].bind(t) : t[p]) });
    };
    // CSS компонентов: условия reduced-motion становятся всегда истинными, no-preference — всегда ложными
    const flip = () => {
      const walk = rules => { for (const r of rules) { if (r.cssRules) { if (r.media && !r.__vf) { const t = r.media.mediaText; if (RE_REDUCE.test(t) || RE_NOPREF.test(t)) { r.media.mediaText = t.replace(RE_REDUCE, '(min-width: 0px)').replace(RE_NOPREF, '(min-width: 99999px)'); r.__vf = 1; } RE_REDUCE.lastIndex = RE_NOPREF.lastIndex = 0; } walk(r.cssRules); } } };
      for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} }
    };
    flip();
    // Видео с автозапуском: стоп, пока человек сам не нажмёт
    const stopVideos = () => document.querySelectorAll('video').forEach(v => {
      if (v.dataset.vfLite) return; v.dataset.vfLite = '1';
      v.autoplay = false; v.removeAttribute('autoplay'); v.preload = 'metadata'; v.pause();
      v.addEventListener('play', e => { if (!v.dataset.vfUser) v.pause(); });
      v.addEventListener('click', () => { v.dataset.vfUser = '1'; });
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { flip(); stopVideos(); }); else stopVideos();
    window.addEventListener('load', () => { flip(); stopVideos(); });
  }

  const emit = () => document.dispatchEvent(new CustomEvent('vf:mode', { detail: api.state() }));
  const paint = () => {
    document.querySelectorAll('[data-motion-toggle]').forEach(b => { b.setAttribute('aria-pressed', !lite); b.dataset.state = lite ? 'off' : 'on'; b.dataset.auto = auto ? 'yes' : 'no'; });
  };
  const api = {
    get motion() { return !lite; },
    get auto() { return auto; },
    get sound() { return !!(window.VFSound && window.VFSound.enabled); },
    get ambient() { return !!(window.VFSound && window.VFSound.ambientOn); },
    state() { return { motion: !lite, sound: api.sound, ambient: api.ambient, auto, lite: lite && !api.sound }; },
    // Анимации: применяется после перезагрузки (небольшая пауза, чтобы успел прозвучать подтверждающий сигнал)
    setMotion(on, delay = 120) {
      if (on === !lite) return;
      try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {}
      setTimeout(() => { const u = new URL(location.href); u.searchParams.delete('mode'); location.replace(u.toString()); }, delay);
    },
    setSound(on) { if (window.VFSound) { window.VFSound.set(on); if (!on) window.VFSound.ambient(false); } emit(); },
    // «Включить погружение»: звук + тихий фон + анимации. «Лёгкий режим»: всё выключено.
    setImmersive(on) {
      if (window.VFSound) { window.VFSound.set(on); window.VFSound.ambient(on); }
      emit();
      api.setMotion(on, on ? 700 : 120);
    },
  };
  window.VFMode = api;

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-motion-toggle]');
    if (t) api.setMotion(lite);
  });
  document.addEventListener('vf:mode', paint);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint); else paint();
})();
