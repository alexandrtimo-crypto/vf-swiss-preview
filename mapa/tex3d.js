// Здания в текстуре: каркас домов из OpenStreetMap (контур + высота), на крыши и стены натянут спутниковый снимок.
// Подключается к MapLibre как слой "custom": карта даёт матрицу камеры, здесь только геометрия и шейдер.
// Снимки собираются в одну большую текстуру из тех же тайлов, что и подложка (браузер берёт их из кеша).
(function () {
  const { default: earcut } = window.earcut;
  const D2R = Math.PI / 180;
  const merc = (lon, lat) => { const s = Math.sin(lat * D2R); return [(lon + 180) / 360, 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)]; };
  const mUnit = lat => 1 / (40075016.686 * Math.cos(lat * D2R));          // метр в единицах меркатора

  const VS = `#version 300 es
  precision highp float;
  uniform mat4 u_m; uniform float u_mu;
  in vec3 a_p; in vec2 a_uv; in vec3 a_n; in float a_h; in float a_f;
  out vec2 v_uv; out vec3 v_n; out float v_h; out float v_f; out float v_w; out float v_z;
  void main() { v_z = a_p.z * u_mu; v_uv = a_uv; v_n = a_n; v_h = a_h; v_f = a_f; gl_Position = u_m * vec4(a_p, 1.0); v_w = gl_Position.w; }`;

  const FS = `#version 300 es
  precision highp float;
  uniform sampler2D u_lo; uniform sampler2D u_hi;
  uniform vec4 u_hib;            // окно подробного снимка в координатах общего: x0, y0, ширина, высота
  uniform float u_mix; uniform float u_hiOn; uniform vec3 u_sun; uniform float u_fogK;
  in vec2 v_uv; in vec3 v_n; in float v_h; in float v_f; in float v_w; in float v_z;
  out vec4 o;
  void main() {
    if (v_f > 1.5) { float a = 0.5 * pow(1.0 - v_h, 1.25); o = vec4(0.02, 0.03, 0.04, a); return; }     // тень у основания
    vec3 tex = texture(u_lo, v_uv).rgb;
    vec2 hu = (v_uv - u_hib.xy) / u_hib.zw;
    float inside = step(0.0, hu.x) * step(hu.x, 1.0) * step(0.0, hu.y) * step(hu.y, 1.0);
    float edge = smoothstep(0.0, 0.04, min(min(hu.x, 1.0 - hu.x), min(hu.y, 1.0 - hu.y)));
    tex = mix(tex, texture(u_hi, hu).rgb, inside * edge * u_hiOn);
    float l = dot(tex, vec3(0.299, 0.587, 0.114));
    tex = mix(vec3(l), tex, 0.8) * vec3(0.95, 0.98, 1.04);
    vec3 glass = mix(vec3(0.075, 0.1, 0.125), vec3(0.19, 0.245, 0.3), v_h);
    vec3 base = mix(glass, tex, u_mix);
    float wall = 1.0 - clamp(v_n.z, 0.0, 1.0);
    float lit = mix(1.0, 0.46 + 0.62 * max(dot(v_n, u_sun), 0.0), wall);
    float ao = mix(1.0, mix(0.42, 1.0, v_h), wall);
    float fl = fract(v_z / 3.3);                                  // ряды окон: тёмная полоса на каждом этаже
    vec3 c = base * lit * ao * mix(1.0, 0.82, wall * step(0.3, fl) * step(fl, 0.76));
    if (v_f > 0.5) c = mix(vec3(0.88, 0.28, 0.36), vec3(1.0, 0.45, 0.52), wall * v_h) * mix(0.62, 1.0, lit * ao);
    float fog = smoothstep(0.55, 1.0, v_w * u_fogK);
    o = vec4(mix(c, vec3(0.043, 0.059, 0.075), fog), 1.0);
  }`;

  const compile = (gl, type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };

  // загрузка тайлов в одну текстуру: поток из нескольких запросов, провал — исключение
  async function mosaic(tpl, Z, x0, y0, nx, ny, onProgress) {
    const cv = document.createElement('canvas'); cv.width = nx * 256; cv.height = ny * 256;
    const g = cv.getContext('2d'); g.fillStyle = '#0b0f13'; g.fillRect(0, 0, cv.width, cv.height);
    const jobs = []; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) jobs.push([i, j]);
    let done = 0, fail = 0, next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const [i, j] = jobs[next++];
        try {
          const r = await fetch(tpl.replace('{z}', Z).replace('{x}', x0 + i).replace('{y}', y0 + j), { mode: 'cors' });
          if (!r.ok) throw new Error(r.status);
          g.drawImage(await createImageBitmap(await r.blob()), i * 256, j * 256);
        } catch { fail++; }
        onProgress && onProgress(++done / jobs.length);
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    if (fail > jobs.length * 0.25) throw new Error('снимки не загрузились: ' + fail + ' из ' + jobs.length);
    return cv;
  }

  // opts: area (GeoJSON зданий), T [lon,lat], targetId, tiles (шаблон), lean [x, y] метры сдвига крыши на метр высоты
  function create(opts) {
    const { area, T, targetId, tiles } = opts;
    const Z = 17, ZH = 18, HR = 230;                                   // общий снимок z17, подробный z18 в радиусе HR метров от цели
    const O = merc(T[0], T[1]), U = mUnit(T[1]);
    const lean = opts.lean || [0, 0];                                   // [восток, юг] в метрах на метр высоты
    const S = { ready: false, enabled: false, mix: 0, hiOn: 0, error: null, lean };

    // границы общего снимка по всем зданиям
    let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
    const rings = area.features.map(f => ({ id: f.properties.id, h: f.properties.h, ring: f.geometry.coordinates[0].slice(0, -1).map(([lo, la]) => merc(lo, la)) }));
    for (const b of rings) for (const [x, y] of b.ring) { mnx = Math.min(mnx, x); mny = Math.min(mny, y); mxx = Math.max(mxx, x); mxy = Math.max(mxy, y); }
    const N = 2 ** Z, mUnitM = U;                                       // метров в единице меркатора = 1/U
    const pad = 40 * U;
    const x0 = Math.floor((mnx - pad) * N), y0 = Math.floor((mny - pad) * N), nx = Math.floor((mxx + pad) * N) - x0 + 1, ny = Math.floor((mxy + pad) * N) - y0 + 1;
    const uvLo = (x, y) => [(x * N - x0) / nx, (y * N - y0) / ny];
    S.mosaic = { Z, x0, y0, nx, ny };

    // ───── геометрия
    const V = [], I = [], SH = [];                                       // вершины (10 чисел), индексы корпусов, индексы теней
    let vc = 0;
    const push = (px, py, pz, u, v, nx_, ny_, nz_, h, f) => { V.push(px, py, pz, u, v, nx_, ny_, nz_, h, f); return vc++; };
    for (const b of rings) {
      const { ring, h } = b, n = ring.length; if (n < 3) continue;
      let A = 0, cx = 0, cy = 0; for (let i = 0; i < n; i++) { const [ax, ay] = ring[i], [bx, by] = ring[(i + 1) % n]; A += ax * by - bx * ay; cx += ax; cy += ay; } cx /= n; cy /= n;
      const out = A > 0 ? 1 : -1, tgt = b.id === targetId ? 1 : 0;
      const hm = h * U;
      const sh = [lean[0] * h * U, lean[1] * h * U];                    // сдвиг крыши на снимке относительно основания
      // точка отсчёта снимка для вершины: слегка внутрь контура и со сдвигом на высоту
      const samp = ([x, y]) => { const dx = cx - x, dy = cy - y, d = Math.hypot(dx, dy) || 1, k = Math.min(0.18, 1.5 * U / d); return uvLo(x + dx * k + sh[0], y + dy * k + sh[1]); };
      // крыша
      const flat = []; ring.forEach(([x, y]) => flat.push((x - O[0]) / U, (y - O[1]) / U));
      const tri = earcut(flat);
      const base = vc;
      ring.forEach(p => { const [u, v] = samp(p); push(p[0] - O[0], p[1] - O[1], hm, u, v, 0, 0, 1, 1, tgt); });
      for (const t of tri) I.push(base + t);
      // стены и тень у основания
      for (let i = 0; i < n; i++) {
        const a = ring[i], c = ring[(i + 1) % n], dx = c[0] - a[0], dy = c[1] - a[1], d = Math.hypot(dx, dy) || 1;
        const nxn = (dy / d) * out, nyn = (-dx / d) * out;
        const ua = samp(a), uc = samp(c);
        const i0 = push(a[0] - O[0], a[1] - O[1], hm, ua[0], ua[1], nxn, nyn, 0, 1, tgt), i1 = push(c[0] - O[0], c[1] - O[1], hm, uc[0], uc[1], nxn, nyn, 0, 1, tgt);
        const i2 = push(a[0] - O[0], a[1] - O[1], 0, ua[0], ua[1], nxn, nyn, 0, 0, tgt), i3 = push(c[0] - O[0], c[1] - O[1], 0, uc[0], uc[1], nxn, nyn, 0, 0, tgt);
        I.push(i0, i1, i2, i1, i3, i2);
        if (h >= 8 && (sh[0] || sh[1]) && (nxn * sh[0] + nyn * sh[1]) > 0) {      // тень только с той стороны, куда «упал» дом на снимке
          const j0 = push(a[0] - O[0], a[1] - O[1], 0.03 * U, 0, 0, 0, 0, 1, 0, 2), j1 = push(c[0] - O[0], c[1] - O[1], 0.03 * U, 0, 0, 0, 0, 1, 0, 2);
          const j2 = push(a[0] - O[0] + sh[0], a[1] - O[1] + sh[1], 0.03 * U, 0, 0, 0, 0, 1, 1, 2), j3 = push(c[0] - O[0] + sh[0], c[1] - O[1] + sh[1], 0.03 * U, 0, 0, 0, 0, 1, 1, 2);
          SH.push(j0, j1, j2, j1, j3, j2);
        }
      }
    }
    const nOpaque = I.length;
    const idx = new Uint32Array(I.length + SH.length); idx.set(I); idx.set(SH, I.length);
    const verts = new Float32Array(V);
    S.stats = { vertices: vc, triangles: (I.length + SH.length) / 3, buildings: rings.length, mosaic: `${nx}×${ny} тайлов z${Z}` };

    // ───── слой MapLibre
    let gl, prog, vao, bufV, bufI, texLo, texHi, loc;
    const hiBox = (() => {                                              // окно подробного снимка (в координатах общего)
      const r = HR * U, a = merc(T[0], T[1]); const xA = a[0] - r, xB = a[0] + r, yA = a[1] - r, yB = a[1] + r, M = 2 ** ZH;
      const hx0 = Math.floor(xA * M), hy0 = Math.floor(yA * M), hnx = Math.floor(xB * M) - hx0 + 1, hny = Math.floor(yB * M) - hy0 + 1;
      const tl = uvLo(hx0 / M, hy0 / M), br = uvLo((hx0 + hnx) / M, (hy0 + hny) / M);
      return { hx0, hy0, hnx, hny, b: [tl[0], tl[1], br[0] - tl[0], br[1] - tl[1]] };
    })();
    const upload = (tex, cv) => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const an = gl.getExtension('EXT_texture_filter_anisotropic'); if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    };
    let pending = { lo: null, hi: null }, map, t0 = 0;

    const layer = {
      id: 'bld-tex', type: 'custom', renderingMode: '3d',
      onAdd(m, g) {
        map = m; gl = g;
        try {
          prog = gl.createProgram(); gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
          if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
          loc = { m: gl.getUniformLocation(prog, 'u_m'), mu: gl.getUniformLocation(prog, 'u_mu'), lo: gl.getUniformLocation(prog, 'u_lo'), hi: gl.getUniformLocation(prog, 'u_hi'), hib: gl.getUniformLocation(prog, 'u_hib'), mix: gl.getUniformLocation(prog, 'u_mix'), hiOn: gl.getUniformLocation(prog, 'u_hiOn'), sun: gl.getUniformLocation(prog, 'u_sun'), fogK: gl.getUniformLocation(prog, 'u_fogK') };
          vao = gl.createVertexArray(); gl.bindVertexArray(vao);
          bufV = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufV); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
          const attr = [['a_p', 3, 0], ['a_uv', 2, 3], ['a_n', 3, 5], ['a_h', 1, 8], ['a_f', 1, 9]];
          for (const [name, size, off] of attr) { const l = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 40, off * 4); }
          bufI = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufI); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
          gl.bindVertexArray(null);
          texLo = gl.createTexture(); texHi = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, texLo); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 28, 34, 255]));
          gl.bindTexture(gl.TEXTURE_2D, texHi); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 28, 34, 255]));
          S.ready = true;
        } catch (e) { S.error = e; console.error('здания в текстуре:', e); S.onFail && S.onFail(); }
      },
      render(g, args) {
        if (!S.ready || !S.enabled) return;
        if (pending.lo) { upload(texLo, pending.lo); pending.lo = null; t0 = performance.now(); S.loaded = true; }
        if (pending.hi) { upload(texHi, pending.hi); pending.hi = null; S.hiLoaded = true; S.hiT0 = performance.now(); }
        const now = performance.now();
        if (S.loaded) { S.mix = Math.min(1, (now - t0) / 1400); S.mix = 1 - Math.pow(1 - S.mix, 3); }
        S.hiOn = S.hiLoaded ? Math.min(1, (now - S.hiT0) / 900) : 0;
        if ((S.loaded && S.mix < 1) || (S.hiLoaded && S.hiOn < 1)) map.triggerRepaint();   // перерисовка только пока идёт проявление текстуры
        const P = args.defaultProjectionData ? args.defaultProjectionData.mainMatrix : args.modelViewProjectionMatrix;
        const m = new Float32Array(P);                                    // перенос начала координат считаем в double, чтобы не терять точность
        const t = [0, 1, 2, 3].map(r => P[r] * O[0] + P[4 + r] * O[1] + P[12 + r]); m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; m[15] = t[3];
        g.useProgram(prog); g.bindVertexArray(vao);
        g.uniformMatrix4fv(loc.m, false, m);
        g.uniform1f(loc.mu, 1 / U); g.uniform1f(loc.mix, S.mix); g.uniform1f(loc.hiOn, S.hiOn); g.uniform3f(loc.sun, -0.58, 0.52, 0.62); g.uniform4f(loc.hib, ...hiBox.b); g.uniform1f(loc.fogK, S.fogK || 0);
        g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, texLo); g.uniform1i(loc.lo, 0);
        g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, texHi); g.uniform1i(loc.hi, 1);
        g.activeTexture(g.TEXTURE0);
        g.disable(g.CULL_FACE); g.enable(g.DEPTH_TEST);
        g.drawElements(g.TRIANGLES, nOpaque, g.UNSIGNED_INT, 0);
        if (SH.length) { g.enable(g.BLEND); g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA); g.depthMask(false); g.drawElements(g.TRIANGLES, SH.length, g.UNSIGNED_INT, nOpaque * 4); g.depthMask(true); g.disable(g.BLEND); }
        g.bindVertexArray(null);
      },
      onRemove() { try { gl.deleteBuffer(bufV); gl.deleteBuffer(bufI); gl.deleteTexture(texLo); gl.deleteTexture(texHi); gl.deleteProgram(prog); } catch {} },
    };

    // снимки грузим после добавления слоя; пока их нет, дома стеклянные, потом плавно «проявляются»
    S.layer = layer;
    S.load = async (onProgress) => {
      try {
        const lo = await mosaic(tiles, Z, x0, y0, nx, ny, p => onProgress && onProgress(p * 0.8));
        pending.lo = lo; S.canvas = lo; map && map.triggerRepaint();
        mosaic(tiles, ZH, hiBox.hx0, hiBox.hy0, hiBox.hnx, hiBox.hny, p => onProgress && onProgress(0.8 + p * 0.2)).then(hi => { pending.hi = hi; S.canvasHi = hi; map && map.triggerRepaint(); }).catch(() => {});
        return true;
      } catch (e) { S.error = e; return false; }
    };
    S.setEnabled = on => { S.enabled = !!on; map && map.triggerRepaint(); };
    return S;
  }
  window.VFTex3D = { create };
})();
