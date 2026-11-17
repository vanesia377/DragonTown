// Mô hình rồng dựng từ hình khối cơ bản (procedural) + ảnh chân dung render sẵn cho UI.
import * as THREE from 'three';
import { DRAGON_BY_ID } from './data.js';

export const SPH = new THREE.SphereGeometry(1, 20, 14);
export const CONE = new THREE.ConeGeometry(1, 1, 14);
export const CYL = new THREE.CylinderGeometry(1, 1, 1, 22);
export const OCT = new THREE.OctahedronGeometry(1);
export const BOX = new THREE.BoxGeometry(1, 1, 1);
const SHARED = new Set([SPH, CONE, CYL, OCT, BOX]);

const matCache = new Map();
export function mat(color, emissive = 0, ei = 0.4, extra = {}) {
  const key = `${color}|${emissive}|${ei}|${JSON.stringify(extra)}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...extra });
    if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = ei; }
    matCache.set(key, m);
  }
  return m;
}
const dbl = (c, e = 0, ei = 0.3) => mat(c, e, ei, { side: THREE.DoubleSide });

export function part(geo, m, s, p = [0, 0, 0], r = [0, 0, 0]) {
  const o = new THREE.Mesh(geo, m);
  const sc = Array.isArray(s) ? s : [s, s, s];
  o.scale.set(sc[0], sc[1], sc[2]);
  o.position.set(p[0], p[1], p[2]);
  o.rotation.set(r[0], r[1], r[2]);
  return o;
}

function polyGeo(points) {
  const sh = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  const g = new THREE.ShapeGeometry(sh);
  g.rotateX(-Math.PI / 2);          // nằm ngang, sải ra +x, cánh quét về sau
  return g;
}
const BAT = [[0, 0], [0.12, 0.5], [0.5, 0.66], [0.46, 0.34], [0.84, 0.4], [0.7, 0.08], [0.98, -0.08], [0.6, -0.22], [0.1, -0.26]];
const FAN = [[0, 0], [0.2, 0.46], [0.46, 0.52], [0.7, 0.4], [0.86, 0.1], [0.8, -0.24], [0.4, -0.3]];
let BAT_G, FAN_G;

function makeWing(kind, m1, m2, m3) {
  const w = new THREE.Group();
  w.add(part(CYL, m1, [0.045, 0.42, 0.045], [0.2, 0, 0], [0, 0, Math.PI / 2]));
  const wm = dbl(m2.color.getHex(), m2.emissive ? m2.emissive.getHex() : 0, m2.emissiveIntensity || 0);
  switch (kind) {
    case 'bat':
      BAT_G ||= polyGeo(BAT);
      w.add(new THREE.Mesh(BAT_G, wm)); break;
    case 'fin':
      FAN_G ||= polyGeo(FAN);
      w.add(new THREE.Mesh(FAN_G, wm)); break;
    case 'small':
      BAT_G ||= polyGeo(BAT);
      { const s = new THREE.Mesh(BAT_G, wm); s.scale.setScalar(0.5); w.add(s); } break;
    case 'feather':
      for (let i = 0; i < 4; i++) w.add(part(SPH, m2, [0.42 - i * 0.04, 0.025, 0.09], [0.4, 0, -0.11 * i], [0, -0.14 * i, 0]));
      break;
    case 'leaf':
      for (let i = 0; i < 3; i++) w.add(part(SPH, m2, [0.36, 0.03, 0.15], [0.38, 0, -0.17 * i], [0, -0.3 * i, 0]));
      break;
    case 'crystal':
      for (let i = 0; i < 3; i++) w.add(part(OCT, m2, [0.38, 0.04, 0.1], [0.4, 0, -0.17 * i], [0, -0.28 * i, 0]));
      break;
    default: break;
  }
  return w;
}

function addHorns(head, kind, m1, m2, m3) {
  const g = new THREE.Group(); head.add(g);
  for (const s of [-1, 1]) {
    switch (kind) {
      case 'cone': g.add(part(CONE, m3, [0.075, 0.32, 0.075], [s * 0.14, 0.3, -0.08], [-0.5, 0, -s * 0.3])); break;
      case 'leaf': g.add(part(SPH, m2, [0.07, 0.22, 0.04], [s * 0.15, 0.34, -0.05], [-0.3, 0, -s * 0.6])); break;
      case 'bolt':
        g.add(part(CONE, m3, [0.055, 0.22, 0.055], [s * 0.13, 0.32, -0.04], [-0.3, 0, -s * 0.5]));
        g.add(part(CONE, m3, [0.045, 0.2, 0.045], [s * 0.22, 0.46, -0.1], [-0.5, 0, s * 0.3])); break;
      case 'crystal': g.add(part(OCT, m3, [0.06, 0.24, 0.06], [s * 0.14, 0.36, -0.05], [-0.3, 0, -s * 0.3])); break;
      case 'antler':
        g.add(part(CYL, m3, [0.03, 0.2, 0.03], [s * 0.14, 0.38, -0.06], [-0.3, 0, -s * 0.35]));
        g.add(part(CONE, m3, [0.03, 0.14, 0.03], [s * 0.22, 0.5, -0.1], [-0.4, 0, -s * 0.8]));
        g.add(part(CONE, m3, [0.03, 0.14, 0.03], [s * 0.1, 0.55, -0.12], [-0.6, 0, s * 0.2])); break;
      case 'curl': {
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 8, 16, Math.PI * 1.35), m3);
        t.position.set(s * 0.15, 0.3, -0.04); t.rotation.set(0, s * 0.4, s > 0 ? 0.3 : Math.PI - 0.3 + 0.4);
        g.add(t); break;
      }
      default: break;
    }
  }
  if (kind === 'fin') g.add(part(CONE, m2, [0.03, 0.36, 0.24], [0, 0.34, -0.06], [-0.4, 0, 0]));
  return g;
}

function addTailTip(seg, kind, m1, m2, m3) {
  const tip = new THREE.Group(); tip.position.z = -0.14; seg.add(tip);
  switch (kind) {
    case 'flame':
      tip.add(part(CONE, mat(0xff7a1a, 0xff5a10, 0.9), [0.12, 0.34, 0.12], [0, 0.14, -0.04]));
      tip.add(part(CONE, mat(0xffe27a, 0xffd040, 1), [0.07, 0.2, 0.07], [0, 0.1, -0.04])); break;
    case 'leaf': tip.add(part(SPH, m2, [0.1, 0.03, 0.26], [0, 0, -0.16])); break;
    case 'fin': tip.add(part(SPH, m2, [0.03, 0.2, 0.22], [0, 0, -0.14])); break;
    case 'club':
      tip.add(part(SPH, m3, [0.2, 0.2, 0.2], [0, 0, -0.12]));
      tip.add(part(CONE, m1, [0.05, 0.12, 0.05], [0, 0.2, -0.12]));
      break;
    case 'bolt':
      tip.add(part(CONE, m3, [0.09, 0.3, 0.09], [0, 0, -0.14], [-Math.PI / 2, 0, 0]));
      tip.add(part(CONE, m3, [0.07, 0.22, 0.07], [0.08, 0.05, -0.3], [-Math.PI / 2, 0, -0.6])); break;
    case 'crystal': tip.add(part(OCT, m3, [0.1, 0.1, 0.24], [0, 0, -0.14])); break;
    case 'spade': tip.add(part(OCT, m3, [0.2, 0.04, 0.2], [0, 0, -0.14])); break;
    default: break;
  }
}

const STAGE_SCALE = [0.62, 0.86, 1.15];

export function buildDragon(look, stage = 2) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const gl = look.glow || 0;
  const m1 = mat(look.c1, gl, 0.25), m2 = mat(look.c2, gl, 0.2), m3 = mat(look.c3, gl, 0.3);
  const white = mat(0xffffff, 0, 0), black = mat(0x16161f, 0, 0, { roughness: 0.25 });

  body.add(part(SPH, m1, [0.5, 0.45, 0.66], [0, 0.62, 0]));
  body.add(part(SPH, m2, [0.4, 0.33, 0.5], [0, 0.52, 0.1]));
  body.add(part(SPH, m1, [0.21, 0.26, 0.23], [0, 0.88, 0.5]));      // cổ
  for (let i = 0; i < 4; i++) {                                     // gai lưng
    const z = 0.36 - i * 0.25, y = 0.62 + 0.45 * Math.sqrt(Math.max(0, 1 - (z / 0.66) ** 2));
    body.add(part(CONE, m3, [0.07, 0.15 + stage * 0.03, 0.07], [0, y + 0.02, z], [-0.25, 0, 0]));
  }

  const head = new THREE.Group();
  head.position.set(0, 1.02, 0.64); head.scale.setScalar([1.32, 1.14, 1][stage]);
  head.add(part(SPH, m1, [0.3, 0.27, 0.3]));
  head.add(part(SPH, m2, [0.17, 0.12, 0.19], [0, -0.07, 0.27]));
  for (const s of [-1, 1]) {
    head.add(part(SPH, white, 0.092, [s * 0.145, 0.06, 0.2]));
    head.add(part(SPH, black, 0.055, [s * 0.15, 0.06, 0.275]));
    head.add(part(SPH, white, 0.018, [s * 0.165, 0.085, 0.322]));
    head.add(part(SPH, black, 0.022, [s * 0.065, -0.045, 0.43]));
    head.add(part(SPH, mat(0xff9a9a), [0.05, 0.03, 0.02], [s * 0.2, -0.05, 0.2]));
  }
  const horns = addHorns(head, look.horn, m1, m2, m3);
  horns.scale.setScalar([0.75, 1, 1.25][stage]);
  body.add(head);

  // đuôi (chuỗi khớp để lắc)
  const tail = [];
  const root = new THREE.Group(); root.position.set(0, 0.55, -0.5); root.rotation.x = 0.28; body.add(root);
  let parent = root;
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Group(); seg.position.z = i ? -0.2 : -0.12;
    const r = 0.22 * (1 - i * 0.14);
    seg.add(part(SPH, i % 2 ? m1 : m1, r));
    parent.add(seg); tail.push(seg); parent = seg;
  }
  addTailTip(parent, look.tail, m1, m2, m3);

  // chân
  for (const [x, z] of [[-0.28, 0.36], [0.28, 0.36], [-0.3, -0.3], [0.3, -0.3]]) {
    body.add(part(SPH, m1, [0.13, 0.2, 0.14], [x, 0.2, z]));
    body.add(part(SPH, m3, [0.14, 0.07, 0.19], [x, 0.04, z + 0.04]));
  }

  // cánh
  const wings = [];
  for (const side of [-1, 1]) {
    const w = makeWing(look.wing, m1, m2, m3);
    const holder = new THREE.Group();
    holder.position.set(side * 0.3, 0.9, 0.02);
    w.scale.set(side * [0.6, 0.85, 1.1][stage], 1, [0.6, 0.85, 1.1][stage]);
    holder.add(w); body.add(holder);
    wings.push({ g: holder, side });
  }

  g.scale.setScalar(STAGE_SCALE[stage]);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  g.userData.parts = { body, head, tail, wings };
  return g;
}

export function animateDragon(g, t, speed = 1, phase = 0) {
  const p = g.userData.parts;
  if (!p) return;
  const tt = t * speed + phase;
  p.body.position.y = Math.sin(tt * 2.4) * 0.03;
  p.head.rotation.x = Math.sin(tt * 1.7) * 0.07;
  p.head.rotation.y = Math.sin(tt * 0.9) * 0.15;
  for (const w of p.wings) w.g.rotation.z = w.side * (0.3 + Math.sin(tt * 3.4) * 0.2);
  p.tail.forEach((s, i) => { s.rotation.y = Math.sin(tt * 2 - i * 0.7) * 0.24; });
}

export function disposeObject(o) {
  o.traverse(c => { if (c.isMesh && c.geometry && !SHARED.has(c.geometry)) c.geometry.dispose?.(); });
}

// ---------- Trứng ----------
let EGG_G;
export function buildEgg(look) {
  if (!EGG_G) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI, y = 0.55 - 0.55 * Math.cos(a);
      pts.push(new THREE.Vector2(0.46 * Math.sin(a) * (1.12 - 0.3 * (y / 1.1)), y));
    }
    EGG_G = new THREE.LatheGeometry(pts, 24);
  }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(EGG_G, mat(look.c2, 0, 0, { roughness: 0.35 })));
  const spotMat = mat(look.c1), spot2 = mat(look.c3);
  const spots = [[0.3, 0.2, 0], [0.55, 1.5, 1], [0.7, 2.7, 0], [0.45, 3.9, 1], [0.8, 5.0, 0], [0.25, 5.6, 1], [0.62, 0.9, 1]];
  for (const [yn, ang, k] of spots) {
    const y = yn * 1.1, a = Math.acos(1 - y / 0.55);
    const r = 0.46 * Math.sin(a) * (1.12 - 0.3 * (y / 1.1));
    const s = part(SPH, k ? spot2 : spotMat, [0.11, 0.11, 0.05], [Math.sin(ang) * r * 0.97, y, Math.cos(ang) * r * 0.97]);
    s.rotation.y = ang; g.add(s);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- Chân dung (ảnh PNG cho giao diện) ----------
let PR;
function portraitRig() {
  if (PR) return PR;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(200, 200);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8a70, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0); sun.position.set(3, 5, 4); scene.add(sun);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  PR = { renderer, scene, camera };
  return PR;
}
const pCache = new Map();
function snap(key, make, cam) {
  if (pCache.has(key)) return pCache.get(key);
  const { renderer, scene, camera } = portraitRig();
  const obj = make();
  scene.add(obj);
  camera.position.set(...cam.pos); camera.lookAt(...cam.look);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(obj); disposeObject(obj);
  pCache.set(key, url);
  return url;
}
export { snap as snapshot };
export function portrait(typeId, stage = 2) {
  const def = DRAGON_BY_ID[typeId];
  return snap(`d${typeId}${stage}`, () => {
    const d = buildDragon(def.look, stage); d.rotation.y = 0.65; return d;
  }, { pos: [0, 1.35, 4.6], look: [0, 0.78, 0] });
}
export function eggPortrait(typeId) {
  const def = DRAGON_BY_ID[typeId];
  return snap(`e${typeId}`, () => { const e = buildEgg(def.look); e.rotation.y = 0.4; return e; },
    { pos: [0, 0.9, 3.0], look: [0, 0.52, 0] });
}
