// VF kit · звуковой слой. По умолчанию ВЫКЛЮЧЕН: включает посетитель (переключатель [data-sound-toggle]),
// выбор запоминается. Звук только в ответ на действие: [data-sound="click|tick|wind|stamp|tear|paper|success|error"].
// Файлы — kit/sounds/<имя>.{ogg,mp3} (CC0, источники — kit/sounds/SOURCES.md); если файла нет — короткий синтез Web Audio.
(() => {
  if (window.VFSound) return;
  const KEY = 'vf-sound';
  const PACK = () => document.documentElement.dataset.soundPack || 'mechanical';
  let ctx = null, on = false;
  const buffers = new Map();
  try { on = localStorage.getItem(KEY) === 'on'; } catch {}

  const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

  async function load(name) {
    if (buffers.has(name)) return buffers.get(name);
    const p = (async () => {
      for (const ext of ['ogg', 'mp3']) {
        try {
          const r = await fetch(`/kit/sounds/${PACK()}/${name}.${ext}`);
          if (r.ok) return await ac().decodeAudioData(await r.arrayBuffer());
        } catch {}
      }
      return null;
    })();
    buffers.set(name, p);
    return p;
  }

  // Синтез на случай отсутствия файла: короткий механический щелчок/тик
  function synth(name, gain) {
    const a = ac(), t = a.currentTime;
    const freq = { tick: 3200, click: 1800, wind: 900, stamp: 140, tear: 600, paper: 500, success: 880, error: 220 }[name] || 1500;
    const len = name === 'stamp' ? 0.12 : name === 'success' ? 0.18 : 0.035;
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = name === 'stamp' || name === 'error' ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (name === 'success') osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + len);
    g.gain.setValueAtTime(gain * 0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(g).connect(a.destination);
    osc.start(t); osc.stop(t + len + 0.02);
  }

  async function play(name, { volume = 0.35, rate = 1 } = {}) {
    if (!on || !name) return;
    const a = ac(); if (a.state === 'suspended') await a.resume().catch(() => {});
    const buf = await load(name);
    if (!buf) return synth(name, volume);
    const src = a.createBufferSource(), g = a.createGain();
    src.buffer = buf; src.playbackRate.value = rate * (0.97 + Math.random() * 0.06); // живой разброс
    g.gain.value = volume;
    src.connect(g).connect(a.destination); src.start();
  }

  function set(state, silent = false) {
    on = state;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {}
    document.querySelectorAll('[data-sound-toggle]').forEach(b => { b.setAttribute('aria-pressed', on); b.dataset.state = on ? 'on' : 'off'; });
    if (on && !silent) play('click');
  }

  // Делегирование: звук по атрибуту на любом элементе, без правки компонентов
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-sound-toggle]');
    if (t) { set(!on); return; }
    const s = e.target.closest('[data-sound]');
    if (s) play(s.dataset.sound);
  });
  // События компонентов: vf:sound { detail: { name } } — например, отрыв талона или штамп после анимации
  document.addEventListener('vf:sound', e => play(e.detail?.name, e.detail));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => set(on, true)); else set(on, true);

  window.VFSound = { play, set, get enabled() { return on; } };
})();
