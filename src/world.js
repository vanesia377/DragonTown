// Cảnh 3D chính: đảo, công trình, rồng đi dạo, camera, đặt công trình, thời tiết theo sự kiện.
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { GRID, CELL, BUILDING_BY_ID, DRAGON_BY_ID, CROP_BY_ID, dragonStage } from './data.js';
import * as G from './game.js';
import * as EV from './events.js';
import { S, bus, now } from './state.js';
import { buildDragon, animateDragon, mat, part, SPH, CONE, CYL } from './dragon3d.js';
import { makeBuilding } from './models.js';

const HALF = GRID * CELL / 2;
const THEME_ENV = {
  none:      { sky: 0x9edcff, fog: 0xc4e9ff, amb: 0xffffff, ambI: 0.75, sun: 0xffffff, sunI: 2.2, water: 0x34b8e8, snow: 0, fx: null },
  summer:    { sky: 0x78e0ff, fog: 0xbcf2ff, amb: 0xfff8e0, ambI: 0.85, sun: 0xfff0c0, sunI: 2.5, water: 0x14c8c0, snow: 0, fx: { type: 'sparkle', color: 0xfff2a0 } },
  midautumn: { sky: 0x2a2150, fog: 0x4a3a78, amb: 0xffc890, ambI: 0.6, sun: 0xffb070, sunI: 1.2, water: 0x23406a, snow: 0, fx: { type: 'firefly', color: 0xffc060 } },
  spring:    { sky: 0xc8e8ff, fog: 0xf0e0ff, amb: 0xfff0f4, ambI: 0.85, sun: 0xffffff, sunI: 2.0, water: 0x4ac8e8, snow: 0, fx: { type: 'petal', color: 0xff9ec4 } },
  spooky:    { sky: 0x1a0f32, fog: 0x2c1850, amb: 0x9a7ad0, ambI: 0.55, sun: 0x9a80ff, sunI: 0.9, water: 0x2a2060, snow: 0, fx: { type: 'spore', color: 0xb06aff } },
  winter:    { sky: 0xd6ecfa, fog: 0xe8f4fb, amb: 0xdfefff, ambI: 0.9, sun: 0xffffff, sunI: 1.6, water: 0x5ab0d8, snow: 0.8, fx: { type: 'snow', color: 0xffffff } },
};

export function createWorld(container, labelsEl) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  const dom = renderer.domElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(THEME_ENV.none.sky);
  scene.fog = new THREE.Fog(THEME_ENV.none.fog, 70, 190);

  const camera = new THREE.PerspectiveCamera(40, 1, 1, 400);
  camera.position.set(0, 32, 36);
  const controls = new MapControls(camera, dom);
  controls.enableDamping = true; controls.dampingFactor = 0.12;
  controls.minDistance = 14; controls.maxDistance = 75;
  controls.maxPolarAngle = 1.22; controls.minPolarAngle = 0.35;
  controls.target.set(0, 0, 0);

  const amb = new THREE.HemisphereLight(0xffffff, 0x88a070, 0.75); scene.add(amb);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-26, 40, 22);
  sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536);
  Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 5, far: 120 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  scene.add(sun);

  // ---------- Đảo ----------
  const grassTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = GRID * 16;
    const x = c.getContext('2d');
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
      x.fillStyle = (i + j) % 2 ? '#7fd458' : '#74c94f'; x.fillRect(i * 16, j * 16, 16, 16);
    }
    for (let k = 0; k < 900; k++) {
      x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,60,0,0.07)';
      x.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 3);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  })();
  const N = GRID * CELL + 3;
  const shape = new THREE.Shape(), R = 7, h = N / 2;
  shape.moveTo(-h + R, -h); shape.lineTo(h - R, -h); shape.quadraticCurveTo(h, -h, h, -h + R);
  shape.lineTo(h, h - R); shape.quadraticCurveTo(h, h, h - R, h); shape.lineTo(-h + R, h);
  shape.quadraticCurveTo(-h, h, -h, h - R); shape.lineTo(-h, -h + R); shape.quadraticCurveTo(-h, -h, -h + R, -h);
  const islandGeo = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false });
  islandGeo.rotateX(-Math.PI / 2); islandGeo.translate(0, -3, 0);
  const island = new THREE.Mesh(islandGeo, [mat(0x7fd458), mat(0x9a6a3e)]);
  island.receiveShadow = true; scene.add(island);
  const topMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(GRID * CELL, GRID * CELL), topMat);
  top.rotation.x = -Math.PI / 2; top.position.y = 0.01; top.receiveShadow = true; scene.add(top);
  const snow = new THREE.Mesh(new THREE.PlaneGeometry(N, N), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  snow.rotation.x = -Math.PI / 2; snow.position.y = 0.04; snow.visible = false; scene.add(snow);

  const waterTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(120,200,235,0.55)'; x.lineWidth = 3;
    for (let i = 0; i < 26; i++) { const px = Math.random() * 256, py = Math.random() * 256; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 14, py - 8, px + 30, py); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 26); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const waterMat = new THREE.MeshStandardMaterial({ color: THEME_ENV.none.water, map: waterTex, roughness: 0.25, metalness: 0.1 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.y = -1.6; water.receiveShadow = true; scene.add(water);

  const clouds = new THREE.Group(); scene.add(clouds);
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group(), a = i / 9 * Math.PI * 2 + 0.3, r = 70 + (i % 3) * 14;
    for (let k = 0; k < 4; k++) c.add(part(SPH, mat(0xffffff, 0xffffff, 0.25, { transparent: true, opacity: 0.92 }), [3 + k % 2, 1.6, 2.4], [k * 2.4 - 3.5, (k % 2) * 0.6, 0]));
    c.position.set(Math.sin(a) * r, 22 + (i % 3) * 3, Math.cos(a) * r); clouds.add(c);
  }

  // Ô khoá + cây hoang
  let locked = null, wild = null;
  const wildMats = [mat(0x2f8a4a), mat(0x3a9a3a), mat(0x6a4020)];
  function rebuildTerrain() {
    if (locked) { scene.remove(locked); locked.dispose?.(); }
    if (wild) scene.remove(wild);
    const cells = [];
    for (let x = 0; x < GRID; x++) for (let z = 0; z < GRID; z++) if (!G.cellUnlocked(x, z)) cells.push([x, z]);
    const geo = new THREE.PlaneGeometry(CELL, CELL); geo.rotateX(-Math.PI / 2);
    locked = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0x1c3a18, transparent: true, opacity: 0.5, depthWrite: false }), Math.max(1, cells.length));
    const m4 = new THREE.Matrix4();
    cells.forEach(([x, z], i) => { m4.setPosition((x + 0.5) * CELL - HALF, 0.06, (z + 0.5) * CELL - HALF); locked.setMatrixAt(i, m4); });
    locked.count = cells.length; scene.add(locked);
    wild = new THREE.Group();
    let seed = 99;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (const [x, z] of cells) {
      if (rnd() > 0.42) continue;
      const t = new THREE.Group(), s = 0.8 + rnd() * 0.9;
      t.add(part(CYL, wildMats[2], [0.14, 0.7, 0.14], [0, 0.4, 0]));
      if (rnd() < 0.5) t.add(part(SPH, wildMats[1], [0.6, 0.55, 0.6], [0, 1.2, 0]));
      else { t.add(part(CONE, wildMats[0], [0.6, 1.1, 0.6], [0, 1.2, 0])); t.add(part(CONE, wildMats[0], [0.45, 0.8, 0.45], [0, 1.8, 0])); }
      t.scale.setScalar(s);
      t.position.set((x + 0.2 + rnd() * 0.6) * CELL - HALF, 0, (z + 0.2 + rnd() * 0.6) * CELL - HALF);
      t.traverse(o => { if (o.isMesh) o.castShadow = true; });
      wild.add(t);
    }
    scene.add(wild);
    const ext = G.unlockedHalf() * CELL;
    bounds = Math.min(HALF, ext + 4);
  }
  let bounds = HALF;

  // ---------- Công trình ----------
  const bMap = new Map();
  const bubbles = new Map();
  const cellCenter = (b) => {
    const d = BUILDING_BY_ID[b.type];
    return new THREE.Vector3((b.x + d.w / 2) * CELL - HALF, 0, (b.z + d.d / 2) * CELL - HALF);
  };
  const bKey = (b) => {
    let k = `${b.type}|${b.level}|${G.isBuilt(b) ? 1 : 0}|${b.x},${b.z}`;
    if (BUILDING_BY_ID[b.type].kind === 'farm') {
      const f = G.farmState(b);
      k += `|${f.state}|${f.crop ? f.crop.id : ''}|${Math.floor((f.progress || 0) * 3)}`;
    }
    return k;
  };
  function syncBuildings() {
    const ids = new Set(S.s.buildings.map(b => b.id));
    for (const [id, o] of bMap) {
      if (!ids.has(id)) { scene.remove(o.g); bMap.delete(id); removeBubble(id); }
    }
    for (const b of S.s.buildings) {
      const key = bKey(b);
      let o = bMap.get(b.id);
      if (o && o.key === key) continue;
      const def = BUILDING_BY_ID[b.type];
      if (o) scene.remove(o.g);
      const g = makeBuilding(b, { built: G.isBuilt(b), farm: def.kind === 'farm' ? G.farmState(b) : null });
      g.position.copy(cellCenter(b));
      g.userData.kind = 'building'; g.userData.bid = b.id;
      scene.add(g);
      const hide = o && o.g.visible === false;
      if (hide) g.visible = false;
      bMap.set(b.id, { g, key, bid: b.id });
      applyThemeToBanners();
    }
    syncDragons();
  }

  // ---------- Rồng ----------
  const dMap = new Map();
  function syncDragons() {
    const ids = new Set(S.s.dragons.map(d => d.id));
    for (const [id, o] of dMap) if (!ids.has(id)) { scene.remove(o.g); dMap.delete(id); }
    const byHab = {};
    for (const d of S.s.dragons) {
      const hab = G.buildingById(d.habitatId);
      if (!hab || !G.isBuilt(hab)) { const o = dMap.get(d.id); if (o) { scene.remove(o.g); dMap.delete(d.id); } continue; }
      (byHab[d.habitatId] ||= []).push(d);
      const stage = dragonStage(d.level), key = `${d.type}|${stage}`;
      let o = dMap.get(d.id);
      if (o && o.key !== key) { scene.remove(o.g); o = null; dMap.delete(d.id); }
      if (!o) {
        const g = buildDragon(DRAGON_BY_ID[d.type].look, stage);
        g.userData.kind = 'dragon'; g.userData.did = d.id;
        scene.add(g);
        o = { g, key, ang: Math.random() * 6.28, tAng: 0, rad: 1.9, wait: Math.random() * 3, dir: 1, phase: Math.random() * 10, jump: 0, hab: d.habitatId };
        o.tAng = o.ang;
        dMap.set(d.id, o);
      }
      o.hab = d.habitatId;
    }
    // chia đều góc xuất phát cho rồng cùng khu
    for (const hid in byHab) byHab[hid].forEach((d, i) => { const o = dMap.get(d.id); if (o && o.fresh === undefined) { o.ang = o.tAng = i * (Math.PI * 2 / Math.max(2, byHab[hid].length)); o.fresh = false; } });
  }

  // ---------- Bong bóng trạng thái (HTML) ----------
  function removeBubble(id) { const e = bubbles.get(id); if (e) { e.el.remove(); bubbles.delete(id); } }
  function bubbleFor(b) {
    const def = BUILDING_BY_ID[b.type];
    if (!G.isBuilt(b)) return { h: `🔨 ${EV.fmtDuration(b.readyAt - now())}`, cls: '' };
    if (def.kind === 'habitat') {
      const i = G.habitatInfo(b);
      if (i.stored >= 1) return { h: `🪙 ${G.fmt(i.stored)}`, cls: i.full ? 'full' : 'ready' };
      if (!i.dragons.length) return { h: '➕ Thêm rồng', cls: 'hint' };
      return null;
    }
    if (def.kind === 'farm') {
      const f = G.farmState(b);
      if (f.state === 'ready') return { h: `${f.crop.icon} Thu hoạch`, cls: 'ready' };
      if (f.state === 'growing') return { h: `${f.crop.icon} ${EV.fmtDuration(f.left)}`, cls: '' };
      return { h: '🌱 Gieo hạt', cls: 'hint' };
    }
    if (def.kind === 'hatchery') {
      const ready = S.s.eggs.filter(e => now() >= e.end).length;
      if (ready) return { h: `🥚 ${ready} trứng nở!`, cls: 'ready' };
      const next = S.s.eggs.reduce((m, e) => Math.min(m, e.end), Infinity);
      return next < Infinity ? { h: `🥚 ${EV.fmtDuration(next - now())}`, cls: '' } : { h: '🥚 Mua trứng', cls: 'hint' };
    }
    if (def.kind === 'breeding') {
      const i = G.breedInfo();
      if (i.state === 'done') return { h: '💕 Trứng lai!', cls: 'ready' };
      if (i.state === 'busy') return { h: `💕 ${EV.fmtDuration(i.left)}`, cls: '' };
      return null;
    }
    if (def.kind === 'altar') {
      const ev = EV.activeEvent();
      if (!ev) return null;
      const p = EV.progress(ev);
      const claimable = ev.milestones.some((m, i) => p.total >= m.need && !p.claimed.includes(i));
      return { h: `${EV.THEMES[ev.theme]?.icon || '🎉'} ${claimable ? 'Nhận quà!' : 'Sự kiện'}`, cls: claimable ? 'ready' : 'event' };
    }
    return null;
  }
  function updateBubbles() {
    for (const b of S.s.buildings) {
      const info = bubbleFor(b);
      let e = bubbles.get(b.id);
      if (!info) { if (e) removeBubble(b.id); continue; }
      if (!e) {
        const el = document.createElement('div'); el.className = 'bubble';
        el.addEventListener('click', ev => { ev.stopPropagation(); bus.emit('pick:building', b.id); });
        labelsEl.appendChild(el); e = { el, h: '', cls: '' }; bubbles.set(b.id, e);
      }
      if (e.h !== info.h) { e.el.textContent = info.h; e.h = info.h; }
      if (e.cls !== info.cls) { e.el.className = 'bubble ' + info.cls; e.cls = info.cls; }
    }
  }
  const _v = new THREE.Vector3();
  function project(v, out) {
    _v.copy(v).project(camera);
    out.x = (_v.x * 0.5 + 0.5) * dom.clientWidth; out.y = (-_v.y * 0.5 + 0.5) * dom.clientHeight; out.vis = _v.z < 1 && _v.z > -1;
  }
  const _p = { x: 0, y: 0, vis: true }, _w = new THREE.Vector3();
  function positionBubbles() {
    for (const [id, e] of bubbles) {
      const o = bMap.get(id); if (!o) continue;
      const b = G.buildingById(id);
      const d = BUILDING_BY_ID[b.type];
      _w.copy(o.g.position); _w.y = d.kind === 'habitat' || d.kind === 'hatchery' ? 4.2 : d.kind === 'farm' ? 2.2 : 4.4;
      project(_w, _p);
      e.el.style.transform = `translate(${_p.x.toFixed(1)}px, ${_p.y.toFixed(1)}px) translate(-50%,-100%)`;
      e.el.style.display = _p.vis && o.g.visible ? '' : 'none';
    }
  }

  // chữ bay
  const floats = [];
  function floatText(target, text, cls = '') {
    let pos;
    if (typeof target === 'string') { const o = bMap.get(target) || dMap.get(target); if (!o) return; pos = o.g.position.clone(); pos.y += 3; }
    else pos = target.clone();
    const el = document.createElement('div'); el.className = 'float ' + cls; el.textContent = text; labelsEl.appendChild(el);
    floats.push({ el, pos, t: 0 });
  }
  function updateFloats(dt) {
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.t += dt;
      project(f.pos, _p);
      f.el.style.transform = `translate(${_p.x.toFixed(1)}px, ${(_p.y - f.t * 55).toFixed(1)}px) translate(-50%,-100%)`;
      f.el.style.opacity = String(Math.max(0, 1 - (f.t - 0.9) / 0.6));
      if (f.t > 1.5) { f.el.remove(); floats.splice(i, 1); }
    }
  }

  // ---------- Thời tiết / chủ đề sự kiện ----------
  let theme = 'none', fx = null;
  const dotTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c);
  })();
  function setTheme(name) {
    theme = THEME_ENV[name] ? name : 'none';
    const e = THEME_ENV[theme];
    scene.background.set(e.sky); scene.fog.color.set(e.fog);
    amb.color.set(e.amb); amb.intensity = e.ambI; sun.color.set(e.sun); sun.intensity = e.sunI;
    waterMat.color.set(e.water);
    snow.visible = e.snow > 0; snow.material.opacity = e.snow;
    if (fx) { scene.remove(fx.pts); fx.pts.geometry.dispose(); fx = null; }
    if (e.fx) {
      const n = e.fx.type === 'snow' ? 700 : 360, pos = new Float32Array(n * 3), vel = [];
      for (let i = 0; i < n; i++) {
        pos.set([(Math.random() - 0.5) * 90, Math.random() * 34, (Math.random() - 0.5) * 90], i * 3);
        vel.push(Math.random());
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const size = { snow: 0.45, petal: 0.55, sparkle: 0.5, firefly: 0.5, spore: 0.6 }[e.fx.type];
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: dotTex, color: e.fx.color, size, transparent: true, depthWrite: false, opacity: 0.95, blending: e.fx.type === 'snow' || e.fx.type === 'petal' ? THREE.NormalBlending : THREE.AdditiveBlending }));
      pts.frustumCulled = false; scene.add(pts); fx = { pts, vel, type: e.fx.type };
    }
    applyThemeToBanners();
  }
  function applyThemeToBanners() {
    const col = { none: 0xff4f8b, summer: 0x19b3a6, midautumn: 0xe8643a, spring: 0xe85a8f, spooky: 0x8a4fd0, winter: 0x3d8bd8 }[theme];
    for (const o of bMap.values()) o.g.userData.banners?.forEach(m => m.color.set(col));
  }
  function updateFx(t, dt) {
    if (!fx) return;
    const p = fx.pts.geometry.attributes.position, a = p.array;
    for (let i = 0; i < fx.vel.length; i++) {
      const k = fx.vel[i], j = i * 3;
      switch (fx.type) {
        case 'snow': a[j + 1] -= (1.5 + k * 1.5) * dt; a[j] += Math.sin(t + i) * 0.4 * dt; break;
        case 'petal': a[j + 1] -= (0.9 + k) * dt; a[j] += (1.2 + Math.sin(t * 0.7 + i)) * dt; a[j + 2] += Math.cos(t * 0.5 + i) * 0.6 * dt; break;
        case 'spore': a[j + 1] += (0.5 + k * 0.8) * dt; a[j] += Math.sin(t * 0.6 + i) * 0.5 * dt; break;
        case 'firefly': a[j] += Math.sin(t * 0.8 + i * 3) * 1.1 * dt; a[j + 1] += Math.cos(t * 0.6 + i) * 0.8 * dt; a[j + 2] += Math.sin(t * 0.5 + i * 2) * 1.1 * dt; break;
        default: a[j + 1] += (0.4 + k * 0.7) * dt; a[j] += Math.sin(t + i) * 0.3 * dt;
      }
      if (a[j + 1] < 0) a[j + 1] = 34; if (a[j + 1] > 36) a[j + 1] = 0.5;
      if (a[j] > 45) a[j] = -45; if (a[j] < -45) a[j] = 45;
    }
    p.needsUpdate = true;
  }

  // ---------- Đặt công trình ----------
  let placing = null;
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
  function pointerNdc(e) { const r = dom.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
  function ghostMaterials(root) {
    root.traverse(o => {
      if (o.isMesh) {
        o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
        o.material.transparent = true; o.material.opacity = 0.72; o.castShadow = false;
      }
    });
  }
  function placeAt(cx, cz) {
    const def = BUILDING_BY_ID[placing.typeId];
    cx = Math.max(0, Math.min(GRID - def.w, cx)); cz = Math.max(0, Math.min(GRID - def.d, cz));
    placing.x = cx; placing.z = cz;
    placing.ghost.position.set((cx + def.w / 2) * CELL - HALF, 0, (cz + def.d / 2) * CELL - HALF);
    placing.valid = G.canPlace(placing.typeId, cx, cz, placing.moveId || null);
    placing.pad.material.color.set(placing.valid ? 0x3dff6a : 0xff3a3a);
    bus.emit('placement', placing.valid);
  }
  function startPlacement(typeId, opts = {}) {
    cancelPlacement(true);
    const def = BUILDING_BY_ID[typeId];
    const ghost = makeBuilding({ type: typeId, level: 1 }, { built: true });
    ghostMaterials(ghost);
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(def.w * CELL, def.d * CELL), new THREE.MeshBasicMaterial({ color: 0x3dff6a, transparent: true, opacity: 0.45, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2; pad.position.y = 0.08; ghost.add(pad);
    scene.add(ghost);
    placing = { typeId, moveId: opts.moveId || null, ghost, pad, x: 0, z: 0, valid: false };
    if (opts.moveId) { const o = bMap.get(opts.moveId); if (o) o.g.visible = false; }
    controls.enablePan = false; controls.enableRotate = false;
    const near = opts.near || { x: Math.round(controls.target.x / CELL + GRID / 2), z: Math.round(controls.target.z / CELL + GRID / 2) };
    const spot = G.findSpot(typeId, opts.moveId || null, near) || { x: near.x, z: near.z };
    placeAt(spot.x, spot.z);
  }
  function cancelPlacement(silent) {
    if (!placing) return;
    scene.remove(placing.ghost);
    if (placing.moveId) { const o = bMap.get(placing.moveId); if (o) o.g.visible = true; }
    placing = null; controls.enablePan = true; controls.enableRotate = true;
    if (!silent) bus.emit('placement', null);
  }
  function confirmPlacement() {
    if (!placing) return { ok: false, msg: '' };
    if (!placing.valid) return { ok: false, msg: 'Không thể đặt ở đây' };
    const { typeId, moveId, x, z } = placing;
    const res = moveId ? G.moveBuilding(moveId, x, z) : G.buyBuilding(typeId, x, z);
    if (res.ok) { cancelPlacement(true); bus.emit('placement', null); syncBuildings(); }
    return res;
  }
  function onPlaceMove(e) {
    if (!placing) return;
    pointerNdc(e); ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(ground, hit)) return;
    const def = BUILDING_BY_ID[placing.typeId];
    placeAt(Math.round((hit.x + HALF) / CELL - def.w / 2), Math.round((hit.z + HALF) / CELL - def.d / 2));
  }

  // ---------- Chọn đối tượng ----------
  let down = null;
  dom.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; if (placing) onPlaceMove(e); });
  dom.addEventListener('pointermove', e => { if (placing && (e.buttons || e.pointerType === 'mouse')) onPlaceMove(e); });
  dom.addEventListener('pointerup', e => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
    down = null;
    if (placing || moved > 7 || dt > 600) return;
    pointerNdc(e); ray.setFromCamera(ndc, camera);
    const roots = [...[...dMap.values()].map(o => o.g), ...[...bMap.values()].map(o => o.g)];
    const hits = ray.intersectObjects(roots, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.kind) o = o.parent;
      if (!o) continue;
      if (o.userData.kind === 'dragon') { const d = dMap.get(o.userData.did); if (d) d.jump = 0.001; bus.emit('pick:dragon', o.userData.did); return; }
      if (o.userData.kind === 'building') { bus.emit('pick:building', o.userData.bid); return; }
    }
  });

  // ---------- Camera ----------
  let fly = null;
  function flyTo(x, z) {
    const to = new THREE.Vector3(x, 0, z), off = camera.position.clone().sub(controls.target);
    fly = { from: controls.target.clone(), to, off, t: 0 };
  }
  function focusBuilding(id) { const o = bMap.get(id); if (o) flyTo(o.g.position.x, o.g.position.z); }

  // ---------- Vòng lặp ----------
  function resize() {
    const w = container.clientWidth || window.innerWidth, h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(container);

  const clock = new THREE.Clock();
  let acc = 0, acc2 = 0, running = true;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, clock.getDelta()), t = clock.elapsedTime;
    if (fly) {
      fly.t = Math.min(1, fly.t + dt * 2.2); const k = 1 - Math.pow(1 - fly.t, 3);
      controls.target.lerpVectors(fly.from, fly.to, k); camera.position.copy(controls.target).add(fly.off);
      if (fly.t >= 1) fly = null;
    }
    controls.update();
    const tx = THREE.MathUtils.clamp(controls.target.x, -bounds, bounds), tz = THREE.MathUtils.clamp(controls.target.z, -bounds, bounds);
    if (tx !== controls.target.x || tz !== controls.target.z) {
      camera.position.x += tx - controls.target.x; camera.position.z += tz - controls.target.z; controls.target.x = tx; controls.target.z = tz;
    }
    for (const o of bMap.values()) if (o.g.visible) for (const f of o.g.userData.anim) f(t);
    if (placing) for (const f of placing.ghost.userData.anim) f(t);
    for (const [id, o] of dMap) updateDragon(id, o, t, dt);
    water.material.map.offset.set(t * 0.012, t * 0.008);
    clouds.children.forEach((c, i) => { c.position.x += Math.sin(i) * 0.4 * dt + 0.3 * dt; if (c.position.x > 95) c.position.x = -95; });
    updateFx(t, dt);
    acc += dt; acc2 += dt;
    if (acc > 0.5) { acc = 0; updateBubbles(); }
    if (acc2 > 1) { acc2 = 0; syncBuildings(); }
    positionBubbles(); updateFloats(dt);
    renderer.render(scene, camera);
  }
  function updateDragon(id, o, t, dt) {
    const hab = G.buildingById(o.hab); const bo = hab && bMap.get(hab.id);
    if (!bo) return;
    const c = bo.g.position;
    if (o.jump > 0) { o.jump += dt * 2.2; if (o.jump >= 1) o.jump = 0; }
    if (o.wait > 0) { o.wait -= dt; }
    else {
      let diff = o.tAng - o.ang;
      if (Math.abs(diff) < 0.04) { o.wait = 1.5 + Math.random() * 3.5; o.tAng = o.ang + (Math.random() - 0.5) * 3.2; o.rad = 1.75 + Math.random() * 0.6; }
      else { const step = Math.sign(diff) * Math.min(Math.abs(diff), dt * 0.42); o.ang += step; o.dir = Math.sign(diff); }
    }
    const x = c.x + Math.sin(o.ang) * o.rad, z = c.z + Math.cos(o.ang) * o.rad;
    o.g.position.set(x, 0.1 + (o.jump ? Math.abs(Math.sin(o.jump * Math.PI)) * 0.9 : 0), z);
    const hx = Math.cos(o.ang) * o.dir, hz = -Math.sin(o.ang) * o.dir;
    const want = o.wait > 0 ? Math.atan2(camera.position.x - x, camera.position.z - z) : Math.atan2(hx, hz);
    let d = want - o.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    o.g.rotation.y += d * Math.min(1, dt * 4);
    animateDragon(o.g, t, o.wait > 0 ? 1 : 1.6, o.phase);
  }

  resize();
  rebuildTerrain();
  syncBuildings();
  frame();
  bus.on('buildings', syncBuildings);
  bus.on('dragons', syncDragons);
  bus.on('expand', rebuildTerrain);

  return {
    renderer, scene, camera, controls,
    syncBuildings, syncDragons, rebuildTerrain, setTheme, floatText, flyTo, focusBuilding,
    startPlacement, cancelPlacement, confirmPlacement, isPlacing: () => !!placing, updateBubbles,
    buildingPos: id => bMap.get(id)?.g.position.clone(),
    dragonPos: id => dMap.get(id)?.g.position.clone(),
    stop() { running = false; },
  };
}
