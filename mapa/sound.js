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
          const r = await fetch(`../kit/sounds/${PACK()}/${name}.${ext}`);
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

  // Фон: ход механических часов, пока включены звук и фон. Запоминается отдельно от звука.
  // Это не «тик-так» из набора звуков, а синтез хода калибра 28 800 полуколебаний в час (8 ударов в секунду): на каждый удар
  // два коротких щелчка анкерной вилки (импульс и «падение»), металлический звон тонких деталей и глухой отклик корпуса.
  // Удары чуть различаются по высоте, поэтому слышно не «тик-так», а ровный сухой ход. Файлов не нужно, буфер считается один раз.
  const BPS = 8;
  let ambOn = false, ambTimer = null, beatBufs = null, nextBeat = 0, beatN = 0;
  try { ambOn = localStorage.getItem('vf-ambient') === 'on'; } catch {}
  function makeBeats() {
    const a = ac(), sr = a.sampleRate, len = Math.round(sr * 0.07);
    const noise = () => Math.random() * 2 - 1;
    const click = (out, at, amp, f0, q, tau) => {                 // шумовой удар через резонатор: сухой щелчок с «цветом» f0
      const th = 2 * Math.PI * f0 / sr, r = 1 - Math.PI * f0 / (q * sr), c1 = 2 * r * Math.cos(th), c2 = -r * r;
      let y1 = 0, y2 = 0;
      for (let i = Math.round(at * sr); i < out.length; i++) {
        const t = (i / sr) - at, x = noise() * Math.exp(-t / tau);
        const y = c1 * y1 + c2 * y2 + x * 0.05; y2 = y1; y1 = y; out[i] += y * amp;
      }
    };
    const ring = (out, at, amp, f, tau) => { for (let i = Math.round(at * sr); i < out.length; i++) { const t = i / sr - at; out[i] += amp * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / tau); } };
    return [1, 0.93].map((k, n) => {                              // два чуть разных удара: «правый» и «левый» ход вилки
      const d = new Float32Array(len);
      click(d, 0, n ? 0.8 : 1, 4300 * k, 2.2, 0.0011);              // импульс: палета входит в зуб
      click(d, 0.0085 + n * 0.0012, n ? 0.42 : 0.55, 2900 * k, 1.8, 0.0014);   // «падение»: зуб падает на палету
      ring(d, 0.0003, 0.07, 6100 * k, 0.0045); ring(d, 0.0003, 0.045, 9300 * k, 0.003);   // звон тонких деталей
      ring(d, 0.0006, 0.1, 1450 * k, 0.012);                        // отклик платины
      ring(d, 0.0007, 0.16, 210 * k, 0.009);                        // глухой удар корпуса
      let peak = 0; for (const v of d) peak = Math.max(peak, Math.abs(v));
      for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] / peak * 1.1) * 0.8;
      const b = a.createBuffer(1, len, sr); b.copyToChannel(d, 0); return b;
    });
  }
  function ambPump() {
    if (!ambOn) return;
    if (!on || document.hidden || !ctx || ctx.state !== 'running') { nextBeat = 0; return; }
    if (!beatBufs) beatBufs = makeBeats();
    const t = ctx.currentTime;
    if (!nextBeat || nextBeat < t - 0.05) nextBeat = t + 0.03;
    while (nextBeat < t + 0.25) {                                    // планируем на 250 мс вперёд: ход ровный, даже если вкладка тормозит
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = beatBufs[beatN++ & 1]; g.gain.value = 0.34 * (0.94 + Math.random() * 0.1);
      src.connect(g).connect(ctx.destination); src.start(nextBeat);
      nextBeat += 1 / BPS;
    }
  }
  function ambient(state) {
    ambOn = !!state;
    try { localStorage.setItem('vf-ambient', ambOn ? 'on' : 'off'); } catch {}
    clearInterval(ambTimer); nextBeat = 0;
    if (ambOn) { if (on && !ctx) ac(); ambTimer = setInterval(ambPump, 80); }
  }
  if (ambOn) ambTimer = setInterval(ambPump, 80);

  window.VFSound = { play, set, ambient, beats: () => (beatBufs ||= makeBeats()), get enabled() { return on; }, get ambientOn() { return ambOn; } };
})();
