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

  async function play(name, { volume = 0.6, rate = 1 } = {}) {
    if (!on || !name) return;
    const a = ac(); if (a.state === 'suspended') await a.resume().catch(() => {});
    const buf = await load(name);
    if (!buf) return synth(name, volume);
    const src = a.createBufferSource(), g = a.createGain();
    src.buffer = buf; src.playbackRate.value = rate * (0.97 + Math.random() * 0.06); // живой разброс
    g.gain.value = volume;
    src.connect(g).connect(a.destination); src.start();
  }

  // iPhone глушит веб-звук беззвучным переключателем, пока страница не «играет медиа»: переводим сессию в playback
  // и один раз проигрываем тишину (после жеста пользователя)
  let unlocked = false;
  function unlock() {
    if (unlocked) return; unlocked = true;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    try {
      const n = 4410, b = new DataView(new ArrayBuffer(44 + n * 2));
      const w = (o, t) => [...t].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
      b.setUint32(24, 44100, true); b.setUint32(28, 88200, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, 'data'); b.setUint32(40, n * 2, true);
      const a = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
      a.play().catch(() => {});
    } catch {}
  }

  function set(state, silent = false) {
    on = state;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch {}
    document.querySelectorAll('[data-sound-toggle]').forEach(b => { b.setAttribute('aria-pressed', on); b.dataset.state = on ? 'on' : 'off'; });
    if (on) unlock();
    if (on && !silent) play('success', { volume: 0.7 });   // слышимое подтверждение: звук включён
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

  // Фон: тихое тиканье часов («тик-так» из набора звуков), пока включены звук и фон. Запоминается отдельно от звука.
  let ambOn = false, ambTimer = null, tock = false;
  try { ambOn = localStorage.getItem('vf-ambient') === 'on'; } catch {}
  const ambTick = () => { if (!on || !ambOn || document.hidden) return; play('tick', { volume: 0.14, rate: tock ? 0.82 : 1 }); tock = !tock; };
  function ambient(state) {
    ambOn = !!state;
    try { localStorage.setItem('vf-ambient', ambOn ? 'on' : 'off'); } catch {}
    clearInterval(ambTimer); if (ambOn) ambTimer = setInterval(ambTick, 1000);
  }
  if (ambOn) ambTimer = setInterval(ambTick, 1000);

  window.VFSound = { play, set, ambient, get enabled() { return on; }, get ambientOn() { return ambOn; } };
})();
