// Как пройти: карта-диорама (MapLibre, объёмные здания) или схема (SVG) в лёгком режиме и без WebGL.
// Данные: OpenStreetMap, пешие маршруты посчитаны заранее (data/routes.json). Сайт ни к чему внешнему не обращается.
(async () => {
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const json = u => fetch(u).then(r => { if (!r.ok) throw new Error(u + ': ' + r.status); return r.json(); });
  const q = new URLSearchParams(location.search);
  const app = $('app'), sheet = $('sheet');
  if (window.self !== window.top) $('back').hidden = true;      // внутри страницы библиотеки кнопка «Обзор» не нужна
  const lite = window.VFMode ? !window.VFMode.motion : false;
  const glOk = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  const view = q.get('view') === 'svg' ? 'svg' : q.get('view') === 'gl' ? 'gl' : (glOk && !lite && window.maplibregl ? 'gl' : 'svg');
  const fast = q.has('fast') || lite;
  app.dataset.view = view;

  const [rd, svgText] = await Promise.all([json('data/routes.json'), fetch('data/static-map.svg').then(r => r.text())]);
  // Спутниковая подложка: источник заменяем одной строкой. Лицензию на публичное использование Esri World Imagery владельцу сайта нужно уточнить.
  const SAT = window.VF_SAT || { tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], attribution: 'Снимки © Esri, Maxar, Earthstar Geographics', maxzoom: 19 };
  const T = rd.target;                                   // [lon, lat] здания 23/10 с5
  const R = rd.routes;
  const sound = n => { try { window.VFSound && window.VFSound.play(n); } catch {} };

  // ───────── варианты: по одному (самому быстрому) на группу станций
  const best = new Map();
  R.forEach((r, i) => { const b = best.get(r.group); if (b == null || r.duration < R[b].duration) best.set(r.group, i); });
  const order = [...best.values()].sort((a, b) => R[a].duration - R[b].duration);
  const mins = r => Math.max(1, Math.round(r.duration / 60));
  const short = r => r.label.replace(/\s*\(центр станции\)/, '').replace(/^Пушкинская\/Тверская/, 'Пушкинская / Тверская');
  const isCenter = r => /центр станции/.test(r.label);

  $('opts').innerHTML = order.map(i => { const r = R[i]; return `<button class="opt" type="button" role="radio" aria-checked="false" data-i="${i}">
      <b>${esc(short(r))}</b><span>${r.distance} м${isCenter(r) ? ' · от центра станции' : ''}</span><em>${mins(r)} мин<small>пешком</small></em></button>`; }).join('');

  // ───────── шаги маршрута словами (по данным роутера)
  const MOD = { left: 'налево', right: 'направо', 'slight left': 'чуть левее', 'slight right': 'чуть правее', 'sharp left': 'резко налево', 'sharp right': 'резко направо', straight: 'прямо', uturn: 'разворот' };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function steps(r) {
    const out = [];
    for (const s of r.steps) {
      if (s.type === 'arrive') continue;
      const name = s.name || 'пешеходная дорожка';
      let act = 'Дальше';
      if (s.type === 'depart') act = isCenter(r) ? 'От станции идите' : 'От выхода идите';
      else if (s.type === 'turn' || s.type === 'end of road') act = cap(MOD[s.mod] || 'поверните');
      else if (s.type === 'fork') act = 'На развилке ' + (MOD[s.mod] || 'прямо');
      else if (s.type === 'roundabout' || s.type === 'rotary') act = 'Через площадь';
      else if (s.type === 'new name' || s.type === 'continue') act = 'Прямо';
      const last = out.at(-1);
      if (last && last.name === name && (s.type === 'continue' || s.type === 'new name')) { last.dist += s.dist; continue; }
      if (s.dist < 3 && out.length) continue;
      out.push({ act, name, dist: s.dist });
    }
    return out;
  }
  const FROMLL = r => `${r.from[1]},${r.from[0]}`;
  const links = r => [
    ['Маршрут в Яндекс.Картах', `https://yandex.ru/maps/?rtext=${FROMLL(r)}~${T[1]},${T[0]}&rtt=pd`],
    ['Маршрут в Google Maps', `https://www.google.com/maps/dir/?api=1&origin=${FROMLL(r)}&destination=${T[1]},${T[0]}&travelmode=walking`],
    ['Точка в 2ГИС', `https://2gis.ru/moscow?m=${T[0]},${T[1]}%2F17`],
  ];

  let cur = -1, onSelect = () => {};
  function select(i, opt = {}) {
    cur = i; const r = R[i];
    document.querySelectorAll('.opt').forEach(b => b.setAttribute('aria-checked', String(+b.dataset.i === i)));
    $('route').hidden = false;
    $('route-t').textContent = short(r);
    $('route-m').textContent = `≈ ${mins(r)} мин · ${r.distance} м`;
    $('chk').innerHTML = r.check ? `<b>Сверено с 2ГИС</b> (пешком): ${r.check.min} мин, около ${r.check.m} м.` : 'Считано по данным OpenStreetMap, в 2ГИС не сверено.';
    $('steps').innerHTML = steps(r).map(s => `<li>${esc(s.act)} · ${esc(s.name)} <small>${s.dist} м</small></li>`).join('') + `<li>Вы на месте: Петровка, 23/10, стр. 5. <small>Вход уточняйте на месте</small></li>`;
    $('links').innerHTML = links(r).map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`).join('');
    $('note').textContent = `Пеший путь рассчитан по данным OpenStreetMap (база от ${String(rd.meta?.osm || '24.07.2026').slice(0, 10)}), время при обычном шаге. ${isCenter(r) ? 'Маршрут считается от центра станции, выходы смотрите на месте. ' : ''}Названия улиц подставлены по ближайшим линиям карты, ориентируйтесь по схеме. Последние метры и вход в офис уточняются на месте.`;
    onSelect(i, opt);
  }
  $('opts').addEventListener('click', e => { const b = e.target.closest('.opt'); if (b) { sound('click'); select(+b.dataset.i); } });
  const sheetH = () => (innerWidth < 900 ? sheet.getBoundingClientRect().height : 0);

  // ───────── схема (SVG)
  function initSvg() {
    $('svgmap').hidden = false; $('map').hidden = true;
    $('svgmap').innerHTML = svgText + '<span class="attr">© участники OpenStreetMap</span>';
    const svg = $('svgmap').querySelector('svg');
    const keep = new Set(order);
    svg.querySelectorAll('.m-rt, .m-mk').forEach(el => { if (!keep.has(+el.dataset.i)) el.remove(); });
    const base = svg.getAttribute('viewBox').split(' ').map(Number);
    const paths = [...svg.querySelectorAll('.m-rt')];
    const setVB = (x, y, w, h) => svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    const fitTo = (i, animate) => {
      const p = svg.querySelector(`.m-rt[data-i="${i}"]`), b = p.getBBox();
      const pad = 70; let x = Math.min(b.x, -20) - pad, y = Math.min(b.y, -20) - pad, x2 = Math.max(b.x + b.width, 20) + pad, y2 = Math.max(b.y + b.height, 20) + pad;
      const h = sheetH(), box = svg.getBoundingClientRect();
      if (h && box.height > h + 140) { const k = (y2 - y) / (box.height - h - 70); y2 += k * (h + 40); }  // освободить место под шторку
      const cur0 = svg.getAttribute('viewBox').split(' ').map(Number);
      if (!animate || fast) return setVB(x, y, x2 - x, y2 - y);
      const t0 = performance.now(), D = 900;
      (function step(t) { const k = Math.max(0, Math.min(1, (t - t0) / D)), e = 1 - Math.pow(1 - k, 3); setVB(cur0[0] + (x - cur0[0]) * e, cur0[1] + (y - cur0[1]) * e, cur0[2] + (x2 - x - cur0[2]) * e, cur0[3] + (y2 - y - cur0[3]) * e); if (k < 1) requestAnimationFrame(step); })(t0);
    };
    onSelect = (i, o) => {
      paths.forEach(p => p.classList.toggle('is-on', +p.dataset.i === i));
      svg.querySelectorAll('.m-mk').forEach(m => m.classList.toggle('is-on', +m.dataset.i === i));
      fitTo(i, !o.instant);
    };
    svg.querySelectorAll('.m-mk').forEach(m => m.addEventListener('click', () => { sound('click'); select(+m.dataset.i); }));
    return async function play() {
      if (fast) { select(order[0], { instant: true }); return; }
      setVB(...base); paths.forEach(p => { p.classList.remove('is-on'); const L = p.getTotalLength(); p.style.transition = 'none'; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
      sound('wind'); await sleep(300);
      for (const i of order) { const p = svg.querySelector(`.m-rt[data-i="${i}"]`); p.style.transition = 'stroke-dashoffset .7s ease'; p.style.strokeDashoffset = 0; sound('tick'); await sleep(420); }
      await sleep(500); paths.forEach(p => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; p.style.transition = ''; });
      select(order[0]);
    };
  }

  // ───────── объёмная карта (MapLibre)
  async function initGl() {
    const area = await json('data/area.json');
    const tid = area.meta.target.buildingId;
    const empty = { type: 'FeatureCollection', features: [] };
    const allFC = { type: 'FeatureCollection', features: R.map((r, i) => ({ type: 'Feature', properties: { i }, geometry: { type: 'LineString', coordinates: r.geometry } })).filter(f => best.has(R[f.properties.i].group) && order.includes(f.properties.i)) };
    const style = {
      version: 8, name: 'vf-diorama',
      sky: { 'sky-color': '#0b0f13', 'horizon-color': '#1b2631', 'fog-color': '#0b0f13', 'sky-horizon-blend': 0.5, 'horizon-fog-blend': 0.85, 'fog-ground-blend': 0.6 },
      light: { anchor: 'viewport', color: '#dfe9ff', intensity: 0.38, position: [1.2, 205, 42] },
      sources: { sat: { type: 'raster', tiles: SAT.tiles, tileSize: 256, maxzoom: SAT.maxzoom, attribution: SAT.attribution }, green: { type: 'geojson', data: area.green }, water: { type: 'geojson', data: area.water }, roads: { type: 'geojson', data: area.roads }, bld: { type: 'geojson', data: area.buildings }, rtAll: { type: 'geojson', data: allFC }, rtOn: { type: 'geojson', data: empty } },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#0b0f13' } },
        { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-brightness-max': 0.8, 'raster-saturation': -0.18, 'raster-contrast': 0.1 } },
        { id: 'green', type: 'fill', source: 'green', paint: { 'fill-color': '#12201a' } },
        { id: 'water', type: 'fill', source: 'water', paint: { 'fill-color': '#0e1e2b' } },
        { id: 'r-minor', type: 'line', source: 'roads', filter: ['==', ['get', 'cls'], 'minor'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#25303a', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.6, 18, 4] } },
        { id: 'r-ped', type: 'line', source: 'roads', filter: ['==', ['get', 'cls'], 'ped'], paint: { 'line-color': '#2d3b46', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.4, 18, 2] } },
        { id: 'r-major', type: 'line', source: 'roads', filter: ['==', ['get', 'cls'], 'major'], layout: { 'line-cap': 'round' }, paint: { 'line-color': '#34434f', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 1.2, 18, 9] } },
        { id: 'rt-all', type: 'line', source: 'rtAll', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffe6bd', 'line-opacity': 0, 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 1.4, 18, 4] } },
        { id: 'bld', type: 'fill-extrusion', source: 'bld', filter: ['!=', ['get', 'id'], tid], paint: { 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.94, 'fill-extrusion-vertical-gradient': true, 'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'h'], 0, '#151c22', 20, '#1c262e', 60, '#2a3743'] } },
        { id: 'bld-target', type: 'fill-extrusion', source: 'bld', filter: ['==', ['get', 'id'], tid], paint: { 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-opacity': 1, 'fill-extrusion-color': '#e0475b' } },
        { id: 'rt-case', type: 'line', source: 'rtOn', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#05080b', 'line-opacity': 0, 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 9, 18, 20] } },
        { id: 'rt-glow', type: 'line', source: 'rtOn', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffe6bd', 'line-opacity': 0.55, 'line-blur': 7, 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 10, 18, 28] } },
        { id: 'rt-line', type: 'line', source: 'rtOn', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fff3dc', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 3.4, 18, 8.5] } },
      ],
    };
    const map = new maplibregl.Map({ container: 'map', style, center: T, zoom: 16, pitch: 60, bearing: -20, attributionControl: false, fadeDuration: 220, maxPitch: 80, cooperativeGestures: false });
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '© участники OpenStreetMap' }), 'bottom-right');
    window.__map = map; map.on('idle', () => { window.__idle = true; });
    await new Promise(r => map.once('load', r));

    // здания в текстуре: каркас из OSM, на крыши и стены натянут снимок (tex3d.js); без WebGL2/снимков остаются стеклянные коробки
    let tex = null;
    if (window.VFTex3D && window.earcut) {
      try {
        const lean = (q.get('lean') || window.VF_LEAN || '0,0').split(',').map(Number);
        tex = VFTex3D.create({ area: area.buildings, T, targetId: tid, tiles: SAT.tiles[0], lean });
        map.addLayer(tex.layer, 'rt-case'); window.__tex = tex;
      } catch (e) { console.error('здания в текстуре:', e); tex = null; }
    }

    // вид карты: гибрид (снимки + здания в текстуре) или схема
    const toast = t => { const el = $('toast'); el.textContent = t; el.hidden = false; setTimeout(() => { el.hidden = true; }, 5000); };
    let hybrid = true;
    const look = q.get('look') || 'b';
    const RASTER = { a: { 'raster-brightness-max': 0.62, 'raster-saturation': -0.4, 'raster-contrast': 0.16 }, b: { 'raster-brightness-max': 0.7, 'raster-saturation': -0.3, 'raster-contrast': 0.14 }, c: { 'raster-brightness-max': 0.95, 'raster-saturation': -0.05, 'raster-contrast': 0.05 } }[look] || {};
    function setBase(h) {
      hybrid = h; const vis = (id, on) => map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
      vis('sat', h); vis('green', !h); vis('water', !h);
      for (const [k, v] of Object.entries(RASTER)) map.setPaintProperty('sat', k, v);
      const roadsOn = h && look !== 'c';
      for (const [id, c0, c1] of [['r-minor', '#25303a', '#ffffff'], ['r-ped', '#2d3b46', '#ffffff'], ['r-major', '#34434f', '#ffffff']]) { map.setPaintProperty(id, 'line-color', h ? c1 : c0); map.setPaintProperty(id, 'line-opacity', h ? (roadsOn ? 0.18 : 0) : 1); }
      // гибрид: дома рисует tex3d (текстура со снимка); если слой не поднялся, остаётся прозрачное стекло
      const texOn = !!(h && tex && !tex.error);
      if (tex) tex.setEnabled(texOn);
      vis('bld', !texOn); vis('bld-target', !texOn);
      if (h) {
        map.setFilter('bld', ['!=', ['get', 'id'], tid]);
        map.setPaintProperty('bld', 'fill-extrusion-opacity', 0.2);
        map.setPaintProperty('bld', 'fill-extrusion-color', '#b6d0ea');
      } else {
        map.setFilter('bld', ['!=', ['get', 'id'], tid]); map.setPaintProperty('bld', 'fill-extrusion-opacity', 0.94);
        map.setPaintProperty('bld', 'fill-extrusion-color', ['interpolate', ['linear'], ['get', 'h'], 0, '#151c22', 20, '#1c262e', 60, '#2a3743']);
      }
      map.setPaintProperty('rt-case', 'line-opacity', h ? 0.7 : 0);
      document.querySelectorAll('#base button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.b === 'hybrid') === h)));
    }
    let satOk = 0, satErr = 0;
    map.on('data', e => { if (e.sourceId === 'sat' && e.tile) satOk++; });
    map.on('error', e => { if (e.sourceId === 'sat' && ++satErr >= 4 && !satOk && hybrid) { setBase(false); toast('Спутниковые снимки не загрузились, показана схема.'); } });
    document.querySelectorAll('#base button').forEach(b => b.addEventListener('click', () => { sound('click'); setBase(b.dataset.b === 'hybrid'); }));
    setBase(q.get('base') !== 'scheme');
    if (tex) { tex.onFail = () => setBase(hybrid); tex.load().then(ok => { if (!ok) { setBase(hybrid); toast('Снимки для зданий не загрузились, показаны упрощённые дома.'); } }); }

    // подписи улиц вдоль выбранного маршрута
    let lbs = [];
    const nearIdx = (g, at) => { let b = 0, bd = 1e9; g.forEach((c, i) => { const d = (c[0] - at[0]) ** 2 + (c[1] - at[1]) ** 2; if (d < bd) { bd = d; b = i; } }); return b; };
    function labelsFor(r) {
      lbs.forEach(m => m.remove()); lbs = []; const seen = new Set();
      r.steps.forEach((s, k) => {
        if (!s.name || s.dist < 60 || seen.has(s.name) || lbs.length >= 5) return; seen.add(s.name);
        const a = nearIdx(r.geometry, s.at), b = r.steps[k + 1] ? nearIdx(r.geometry, r.steps[k + 1].at) : r.geometry.length - 1, mid = r.geometry[(a + b) >> 1];
        const el = document.createElement('div'); el.className = 'lb'; el.textContent = s.name;
        lbs.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(mid).addTo(map));
      });
    }

    // маркеры
    const marks = [];
    for (const i of order) {
      const r = R[i], el = document.createElement('button'); el.type = 'button'; el.className = 'mk';
      el.innerHTML = `<i>М</i><span>${esc(short(r).replace(', выход ', ' · '))}</span>`;
      el.addEventListener('click', () => { sound('click'); select(i); });
      new maplibregl.Marker({ element: el, anchor: 'top' }).setLngLat(r.from).addTo(map);
      marks.push([i, el]);
    }
    const pin = document.createElement('div'); pin.className = 'pin'; pin.innerHTML = '<span>VF swiss</span><i></i>';
    new maplibregl.Marker({ element: pin, anchor: 'bottom' }).setLngLat(T).addTo(map);

    const lineOf = (r, k) => { const g = r.geometry, n = g.length - 1, f = k * n, a = Math.floor(f), c = g.slice(0, a + 1); if (a < n) { const t = f - a; c.push([g[a][0] + (g[a + 1][0] - g[a][0]) * t, g[a][1] + (g[a + 1][1] - g[a][1]) * t]); } return { type: 'Feature', geometry: { type: 'LineString', coordinates: c } }; };
    const boundsOf = r => { const b = new maplibregl.LngLatBounds(T, T); r.geometry.forEach(p => b.extend(p)); return b; };
    let anim = 0;
    onSelect = (i, o) => {
      const r = R[i]; marks.forEach(([j, el]) => { el.dataset.on = j === i ? '1' : '0'; }); labelsFor(r);
      map.setPaintProperty('rt-all', 'line-opacity', 0.2);
      const my = ++anim, t0 = performance.now(), D = fast || o.instant ? 1 : 900;
      (function step(t) { if (my !== anim) return; const k = Math.max(0, Math.min(1, (t - t0) / D)); map.getSource('rtOn').setData(lineOf(r, k)); if (k < 1) requestAnimationFrame(step); })(t0);
      map.fitBounds(boundsOf(r), { padding: { top: 90, left: 50, right: 50, bottom: sheetH() + 40 }, pitch: 60, bearing: -18, duration: fast || o.instant ? 0 : 1500, maxZoom: 17.4, essential: true });
    };
    return async function play() {
      if (fast) { select(order[0], { instant: true }); return; }
      const veil = $('veil');
      map.getSource('rtOn').setData(empty); map.setPaintProperty('rt-all', 'line-opacity', 0);
      map.jumpTo({ center: [T[0] + 0.00005, T[1] - 0.00012], zoom: 19.4, pitch: 77, bearing: 24 });
      veil.classList.add('is-on'); sound('wind'); await sleep(600); veil.classList.remove('is-on');
      map.flyTo({ center: [T[0] - 0.0009, T[1] + 0.0003], zoom: 15.9, pitch: 60, bearing: -20, duration: 4300, curve: 1.3, essential: true });
      await new Promise(r => map.once('moveend', r));
      map.setPaintProperty('rt-all', 'line-opacity', 0.2);
      for (const i of order) { map.getSource('rtOn').setData(empty); const r = R[i], t0 = performance.now(); sound('tick'); await new Promise(res => (function s(t) { const k = Math.max(0, Math.min(1, (t - t0) / 650)); map.getSource('rtOn').setData(lineOf(r, k)); k < 1 ? requestAnimationFrame(s) : res(); })(t0)); }
      select(order[0]);
    };
  }

  let play;
  try { play = view === 'gl' ? await initGl() : initSvg(); }
  catch (err) { console.error('карта:', err); app.dataset.view = 'svg'; play = initSvg(); }
  if (!q.has('noplay')) await play(); else select(order[0], { instant: true });
  if (!fast) { $('replay').hidden = false; $('replay').onclick = () => play(); }
  window.__mapa = { select, order, view: app.dataset.view };
  document.documentElement.dataset.ready = '1';
})();
