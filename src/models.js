// Mô hình 3D của công trình, dựng từ hình khối cơ bản.
import * as THREE from 'three';
import { ELEMENTS, CELL, BUILDING_BY_ID } from './data.js';
import { mat, part, SPH, CONE, CYL, OCT, BOX, buildEgg } from './dragon3d.js';

const HEMI = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
const DODE = new THREE.DodecahedronGeometry(1);
const TORUS = new THREE.TorusGeometry(1, 0.12, 8, 28);
const M = (c, e = 0, ei = 0.5, x) => mat(c, e, ei, x);

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function platform(g, r = 2.7, color = 0xcdbf9e) {
  g.add(part(CYL, M(0x8a7a60), [r + 0.12, 0.1, r + 0.12], [0, 0.05, 0]));
  g.add(part(CYL, M(color), [r, 0.2, r], [0, 0.12, 0]));
}

function levelMarks(g, level, r = 2.45) {
  if (level < 2) return;
  const gold = M(0xf5c030, 0xf5a000, 0.35);
  const pos = level >= 3 ? [[-1, 1], [1, 1], [-1, -1], [1, -1]] : [[-1, 1], [1, 1]];
  for (const [sx, sz] of pos) {
    g.add(part(CYL, gold, [0.12, 0.5, 0.12], [sx * r * 0.7, 0.45, sz * r * 0.7]));
    g.add(part(SPH, gold, 0.17, [sx * r * 0.7, 0.78, sz * r * 0.7]));
  }
  if (level >= 3) {
    const gem = part(OCT, M(0x6ff0ff, 0x3ad0ff, 0.9), [0.22, 0.32, 0.22], [0, 3.1, 0]);
    gem.userData.spin = 1; g.add(gem);
  }
}

const HAB = {
  fire(g, anim) {
    g.add(part(CONE, M(0x6b3a2a), [1.45, 1.6, 1.45], [0, 1.0, 0]));
    g.add(part(CYL, M(0xff7a1a, 0xff5a1a, 0.9), [0.34, 0.06, 0.34], [0, 1.78, 0]));
    const lava = part(SPH, M(0xffa030, 0xff6a10, 1), [0.3, 0.2, 0.3], [0, 1.82, 0]); g.add(lava);
    g.add(part(SPH, M(0x1a0f0a), [0.5, 0.42, 0.3], [0, 0.45, 1.0]));
    const fl = [];
    for (let i = 0; i < 4; i++) {
      const a = i * 1.6, f = part(CONE, M(0xff6a1a, 0xff4a10, 1), [0.14, 0.38, 0.14], [Math.sin(a) * 1.9, 0.42, Math.cos(a) * 1.9]);
      g.add(f); fl.push(f);
    }
    anim.push(t => fl.forEach((f, i) => f.scale.y = 0.38 + Math.sin(t * 7 + i) * 0.12));
    anim.push(t => lava.scale.setScalar(0.3 + Math.sin(t * 3) * 0.04));
  },
  plant(g) {
    g.add(part(CYL, M(0x8a5a30), [0.42, 1.7, 0.42], [0, 1.0, 0]));
    for (const [x, y, z, s] of [[0, 2.5, 0, 1.25], [0.8, 2.0, 0.3, 0.85], [-0.8, 2.1, -0.2, 0.9], [0.1, 2.0, -0.9, 0.8]]) {
      g.add(part(SPH, M(0x4fb83e), s, [x, y, z]));
    }
    g.add(part(BOX, M(0x6a4020), [0.5, 0.8, 0.12], [0, 0.6, 0.4]));
    for (const [x, z] of [[1.8, 0.9], [-1.7, 1.2], [1.5, -1.5]]) {
      g.add(part(CYL, M(0xf4ecd8), [0.09, 0.2, 0.09], [x, 0.35, z]));
      g.add(part(SPH, M(0xe8403a), [0.3, 0.17, 0.3], [x, 0.55, z]));
    }
  },
  water(g, anim) {
    const w = part(CYL, M(0x3da5ff, 0x2a80d0, 0.35, { transparent: true, opacity: 0.88 }), [2.1, 0.12, 2.1], [0, 0.26, 0]);
    g.add(w);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      g.add(part(SPH, M(0x9aa6ae), [0.42, 0.28, 0.42], [Math.sin(a) * 2.2, 0.3, Math.cos(a) * 2.2]));
    }
    for (const [x, z] of [[0.9, 0.5], [-1.0, -0.6], [0.2, -1.2]]) g.add(part(CYL, M(0x4fb83e), [0.34, 0.03, 0.34], [x, 0.34, z]));
    g.add(part(SPH, M(0x8a96a0), [0.7, 0.9, 0.7], [0, 0.8, 0]));
    g.add(part(SPH, M(0x8a96a0), [0.5, 0.6, 0.5], [0.3, 1.4, 0.1]));
    const col = part(CYL, M(0xaee4ff, 0x6ac0ff, 0.5, { transparent: true, opacity: 0.8 }), [0.12, 0.5, 0.12], [0.3, 1.9, 0.1]);
    g.add(col);
    anim.push(t => { w.position.y = 0.26 + Math.sin(t * 2) * 0.01; col.scale.y = 0.5 + Math.sin(t * 4) * 0.08; });
  },
  earth(g) {
    g.add(part(DODE, M(0x8a6a48), [1.2, 1.1, 1.2], [0, 1.0, 0]));
    g.add(part(DODE, M(0x9a7a56), [0.7, 0.7, 0.7], [0.9, 0.7, 0.5]));
    const r = seeded(7);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + 0.3, s = 0.28 + r() * 0.25;
      g.add(part(DODE, M(0x7a5c3c), [s, s * 0.8, s], [Math.sin(a) * 2.1, 0.3 + s * 0.4, Math.cos(a) * 2.1]));
    }
    for (const [x, z, h] of [[-0.6, 0.9, 0.7], [0.1, 1.1, 0.5], [-1.1, 0.2, 0.55]]) {
      g.add(part(OCT, M(0xffc84a, 0xe8a010, 0.5), [0.14, h * 0.5, 0.14], [x, 0.3 + h * 0.4, z]));
    }
  },
  lightning(g, anim) {
    g.add(part(CYL, M(0x4a4e6a), [0.4, 2.4, 0.4], [0, 1.4, 0]));
    for (const y of [0.9, 1.6, 2.3]) {
      const t = part(TORUS, M(0xffd23d, 0xf5b800, 0.6), [0.55, 0.55, 0.55], [0, y, 0], [Math.PI / 2, 0, 0]); g.add(t);
    }
    const orb = part(SPH, M(0xfff27a, 0xffe040, 1.2), 0.45, [0, 2.95, 0]); g.add(orb);
    const orbs = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      g.add(part(CYL, M(0x4a4e6a), [0.14, 0.6, 0.14], [sx * 1.9, 0.5, sz * 1.9]));
      const o = part(SPH, M(0xfff27a, 0xffe040, 1), 0.2, [sx * 1.9, 1.0, sz * 1.9]); g.add(o); orbs.push(o);
    }
    anim.push(t => { orb.scale.setScalar(0.45 + Math.sin(t * 6) * 0.07); orbs.forEach((o, i) => o.scale.setScalar(0.2 + Math.max(0, Math.sin(t * 5 + i * 1.5)) * 0.08)); });
  },
  ice(g) {
    platform(g, 2.6, 0xeaf6ff);
    g.add(part(HEMI, M(0xf4faff), [1.4, 1.1, 1.4], [0, 0.22, 0]));
    g.add(part(BOX, M(0x2a4a6a), [0.55, 0.65, 0.4], [0, 0.55, 1.35]));
    const r = seeded(11);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + 0.5, h = 0.8 + r() * 0.8;
      g.add(part(OCT, M(0xa8e6ff, 0x6ac8ff, 0.4, { transparent: true, opacity: 0.85 }), [0.28, h, 0.28], [Math.sin(a) * 2.0, 0.2 + h * 0.8, Math.cos(a) * 2.0]));
    }
  },
  light(g, anim) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(part(CYL, M(0xfdf4dc), [0.22, 1.7, 0.22], [sx * 1.4, 1.05, sz * 1.4]));
    g.add(part(BOX, M(0xf5c030, 0xe0a010, 0.3), [3.6, 0.22, 3.6], [0, 2.0, 0]));
    g.add(part(CONE, M(0xf5c030, 0xe0a010, 0.3), [2.5, 0.9, 2.5], [0, 2.55, 0], [0, Math.PI / 4, 0]));
    const orb = part(SPH, M(0xfffbd0, 0xffe880, 1.1), 0.42, [0, 1.15, 0]); g.add(orb);
    anim.push(t => { orb.position.y = 1.15 + Math.sin(t * 1.6) * 0.14; });
  },
  dark(g, anim) {
    g.add(part(CYL, M(0x2a2048), [2.0, 0.25, 2.0], [0, 0.3, 0]));
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      g.add(part(CONE, M(0x4a3a8c, 0x3a2a7a, 0.4), [0.22, 1.9, 0.22], [Math.sin(a) * 1.7, 1.2, Math.cos(a) * 1.7]));
    }
    const moon = part(TORUS, M(0xe8d8ff, 0xb090ff, 0.9), [0.8, 0.8, 0.8], [0, 1.7, 0], [0, 0, 0]); g.add(moon);
    const orbs = [];
    for (let i = 0; i < 3; i++) { const o = part(SPH, M(0xc09aff, 0x9a6aff, 1), 0.2); g.add(o); orbs.push(o); }
    anim.push(t => {
      orbs.forEach((o, i) => { const a = t * 0.9 + i * 2.1; o.position.set(Math.sin(a) * 1.0, 1.0 + Math.sin(t * 2 + i) * 0.2, Math.cos(a) * 1.0); });
      moon.rotation.y = t * 0.6;
    });
  },
};

export function makeConstruction(w, d) {
  const g = new THREE.Group(), W = w * CELL * 0.8, D = d * CELL * 0.8;
  g.add(part(BOX, M(0x9a7a50), [W, 0.3, D], [0, 0.15, 0]));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(part(CYL, M(0x8a5a30), [0.09, 1.6, 0.09], [sx * W / 2.2, 0.9, sz * D / 2.2]));
  g.add(part(BOX, M(0xe8c070), [W * 0.8, 0.12, 0.12], [0, 1.5, D / 2.2]));
  g.add(part(BOX, M(0xe8c070), [0.12, 0.12, D * 0.8], [W / 2.2, 1.2, 0]));
  g.add(part(BOX, M(0xb8884a), [0.7, 0.55, 0.7], [-W / 4, 0.57, 0]));
  g.add(part(BOX, M(0xb8884a), [0.55, 0.45, 0.55], [W / 5, 0.52, D / 5]));
  const sign = part(BOX, M(0xf5c030), [0.7, 0.5, 0.08], [0, 2.0, D / 2.2], [0, 0, 0.1]); g.add(sign);
  g.userData.anim = [t => { sign.rotation.z = Math.sin(t * 2) * 0.12; }];
  return g;
}

function cropMesh(id, s = 1) {
  const g = new THREE.Group();
  const stem = M(0x3f9a3a);
  switch (id) {
    case 'berry':
      g.add(part(SPH, stem, [0.3, 0.24, 0.3], [0, 0.22, 0]));
      for (const [x, z] of [[0.18, 0.1], [-0.15, 0.14], [0.02, -0.2]]) g.add(part(SPH, M(0x4a6aff, 0x2a3ad0, 0.3), 0.1, [x, 0.38, z]));
      break;
    case 'shroom':
      g.add(part(CYL, M(0xf4ecd8), [0.1, 0.22, 0.1], [0, 0.22, 0]));
      g.add(part(HEMI, M(0xe8403a), [0.32, 0.26, 0.32], [0, 0.4, 0]));
      g.add(part(SPH, M(0xffffff), 0.05, [0.12, 0.62, 0.08])); g.add(part(SPH, M(0xffffff), 0.05, [-0.1, 0.6, -0.1]));
      break;
    case 'gourd':
      g.add(part(SPH, M(0xf08a1a), [0.36, 0.28, 0.36], [0, 0.3, 0]));
      g.add(part(CYL, stem, [0.05, 0.1, 0.05], [0, 0.6, 0]));
      break;
    case 'star':
      g.add(part(CYL, stem, [0.05, 0.3, 0.05], [0, 0.3, 0]));
      g.add(part(OCT, M(0xffe14f, 0xffc010, 0.9), [0.26, 0.26, 0.12], [0, 0.75, 0]));
      break;
    default: break;
  }
  g.scale.setScalar(s);
  return g;
}

function farm(g, st) {
  g.add(part(BOX, M(0x8a5a30), [3.9, 0.22, 3.9], [0, 0.11, 0]));
  const plots = [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]];
  for (const [x, z] of plots) g.add(part(BOX, M(0x5a3a22), [1.55, 0.1, 1.55], [x, 0.24, z]));
  if (st && st.crop) {
    const k = st.state === 'ready' ? 1 : 0.3 + 0.55 * Math.min(1, st.progress || 0);
    for (const [x, z] of plots) {
      const c = cropMesh(st.crop.id, k); c.position.set(x, 0.28, z); g.add(c);
      if (st.state === 'ready') {
        for (const [dx, dz] of [[0.4, 0.4], [-0.4, -0.4]]) { const c2 = cropMesh(st.crop.id, k * 0.9); c2.position.set(x + dx, 0.28, z + dz); g.add(c2); }
      }
    }
  }
  const wood = M(0xb8884a);
  for (let i = -3; i <= 3; i++) {
    g.add(part(BOX, wood, [0.1, 0.35, 0.1], [i * 0.62, 0.35, 1.95])); g.add(part(BOX, wood, [0.1, 0.35, 0.1], [i * 0.62, 0.35, -1.95]));
    g.add(part(BOX, wood, [0.1, 0.35, 0.1], [1.95, 0.35, i * 0.62])); g.add(part(BOX, wood, [0.1, 0.35, 0.1], [-1.95, 0.35, i * 0.62]));
  }
}

function hatchery(g, level, anim) {
  platform(g, 2.7);
  g.add(part(CYL, M(0xe8dcc0), [1.8, 1.5, 1.8], [0, 0.95, 0]));
  g.add(part(HEMI, M(0xe8603a), [2.0, 1.4, 2.0], [0, 1.7, 0]));
  g.add(part(BOX, M(0x5a3a22), [0.8, 1.0, 0.3], [0, 0.7, 1.75]));
  g.add(part(SPH, M(0xffe9a0, 0xffc040, 0.9), [0.22, 0.28, 0.1], [-1.15, 1.2, 1.4]));
  g.add(part(SPH, M(0xffe9a0, 0xffc040, 0.9), [0.22, 0.28, 0.1], [1.15, 1.2, 1.4]));
  const egg = buildEgg({ c1: 0xffd24f, c2: 0xfff4d0, c3: 0xe8603a }); egg.scale.setScalar(0.9); egg.position.y = 3.0; g.add(egg);
  anim.push(t => { egg.rotation.y = t * 0.8; egg.position.y = 3.0 + Math.sin(t * 2) * 0.06; });
  for (let i = 1; i < level; i++) {
    const a = i === 1 ? 2.2 : -2.2;
    g.add(part(CYL, M(0xb8884a), [0.55, 0.2, 0.55], [Math.sin(a) * 2.2, 0.28, Math.cos(a) * 2.2]));
    const e = buildEgg({ c1: 0xff9a7a, c2: 0xfff0e0, c3: 0xe8603a }); e.scale.setScalar(0.45); e.position.set(Math.sin(a) * 2.2, 0.36, Math.cos(a) * 2.2); g.add(e);
  }
}

function breeding(g, anim) {
  g.add(part(CYL, M(0x8a7a60), [2.82, 0.1, 2.82], [0, 0.05, 0]));
  g.add(part(CYL, M(0x7ad65a), [2.7, 0.2, 2.7], [0, 0.12, 0]));
  const white = M(0xfdf4f4);
  g.add(part(CYL, white, [0.2, 1.8, 0.2], [-1.2, 1.1, 0]));
  g.add(part(CYL, white, [0.2, 1.8, 0.2], [1.2, 1.1, 0]));
  g.add(part(TORUS, white, [1.2, 1.2, 1.2], [0, 2.0, 0], [0, 0, 0]));
  const pink = M(0xff5a8a, 0xff2a6a, 0.6);
  const heart = new THREE.Group();
  heart.add(part(SPH, pink, 0.36, [-0.24, 0.12, 0])); heart.add(part(SPH, pink, 0.36, [0.24, 0.12, 0]));
  heart.add(part(CONE, pink, [0.5, 0.7, 0.36], [0, -0.22, 0], [0, 0, Math.PI]));
  heart.position.set(0, 3.2, 0); g.add(heart);
  anim.push(t => { heart.position.y = 3.2 + Math.sin(t * 2) * 0.1; heart.rotation.y = Math.sin(t) * 0.6; heart.scale.setScalar(1 + Math.sin(t * 4) * 0.05); });
  const r = seeded(21), cols = [0xff8fb8, 0xffe14f, 0xffffff, 0xb08fff];
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = 1.4 + r() * 1.1;
    g.add(part(SPH, M(cols[i % 4]), 0.12, [Math.sin(a) * d, 0.34, Math.cos(a) * d]));
  }
  for (const s of [-1, 1]) g.add(part(BOX, M(0xb8884a), [0.9, 0.3, 0.35], [s * 1.6, 0.4, 1.7]));
}

function arena(g, anim) {
  g.add(part(CYL, M(0x8a7a60), [2.85, 0.1, 2.85], [0, 0.05, 0]));
  g.add(part(CYL, M(0xe8cf98), [2.5, 0.16, 2.5], [0, 0.14, 0]));
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 1.5, 28, 1, true), mat(0xc8b890, 0, 0, { side: THREE.DoubleSide }));
  wall.position.y = 0.85; g.add(wall);
  g.add(part(TORUS, M(0xf5c030, 0xe0a010, 0.3), [2.7, 2.7, 2.7], [0, 1.6, 0], [Math.PI / 2, 0, 0]));
  const flags = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    g.add(part(CYL, M(0xb8a070), [0.2, 1.7, 0.2], [Math.sin(a) * 2.7, 0.95, Math.cos(a) * 2.7]));
    if (i % 2 === 0) {
      const f = part(BOX, M(i % 4 === 0 ? 0xe83a3a : 0x3a6ae8), [0.5, 0.35, 0.05], [Math.sin(a) * 2.7, 2.1, Math.cos(a) * 2.7], [0, a, 0]);
      g.add(f); flags.push(f);
    }
  }
  g.add(part(BOX, M(0xd0d0d8), [0.1, 1.2, 0.05], [0, 0.9, 0], [0, 0, 0.7]));
  g.add(part(BOX, M(0xd0d0d8), [0.1, 1.2, 0.05], [0, 0.9, 0], [0, 0, -0.7]));
  anim.push(t => flags.forEach((f, i) => { f.rotation.z = Math.sin(t * 3 + i) * 0.12; }));
}

function altar(g, anim, banners) {
  g.add(part(BOX, M(0xb89a6a), [3.8, 0.3, 3.8], [0, 0.15, 0]));
  g.add(part(BOX, M(0xd8bc88), [3.2, 0.3, 3.2], [0, 0.45, 0]));
  const red = M(0xd63a2a);
  g.add(part(CYL, red, [0.14, 2.2, 0.14], [-1.2, 1.6, -1.0])); g.add(part(CYL, red, [0.14, 2.2, 0.14], [1.2, 1.6, -1.0]));
  g.add(part(BOX, red, [3.0, 0.2, 0.3], [0, 2.8, -1.0]));
  g.add(part(BOX, M(0xf5c030), [3.4, 0.12, 0.45], [0, 3.0, -1.0]));
  const lantern = part(SPH, M(0xff6a3a, 0xff4a1a, 0.9), [0.34, 0.44, 0.34], [0, 2.3, -1.0]); g.add(lantern);
  const flags = [];
  for (const [x, z] of [[-1.5, 1.3], [1.5, 1.3]]) {
    g.add(part(CYL, M(0xb8884a), [0.07, 1.4, 0.07], [x, 1.2, z]));
    const bm = new THREE.MeshStandardMaterial({ color: 0xff4f8b, roughness: 0.6, side: THREE.DoubleSide });
    banners.push(bm);
    const f = part(BOX, bm, [0.8, 0.5, 0.04], [x + 0.4, 1.7, z]); g.add(f); flags.push(f);
  }
  anim.push(t => { lantern.rotation.z = Math.sin(t * 1.5) * 0.1; flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 3 + i) * 0.25; }); });
}

const DECO = {
  deco_tree(g) { g.add(part(CYL, M(0x8a5a30), [0.12, 0.5, 0.12], [0, 0.5, 0])); g.add(part(SPH, M(0x4fb83e), [0.55, 0.55, 0.55], [0, 1.15, 0])); g.add(part(SPH, M(0x62cc4e), 0.38, [0.25, 1.5, 0.1])); },
  deco_pine(g) { g.add(part(CYL, M(0x6a4020), [0.1, 0.35, 0.1], [0, 0.35, 0])); for (let i = 0; i < 3; i++) g.add(part(CONE, M(0x2f8a4a), [0.55 - i * 0.12, 0.7, 0.55 - i * 0.12], [0, 0.85 + i * 0.45, 0])); },
  deco_flower(g) { g.add(part(CYL, M(0x7a5a30), [0.7, 0.1, 0.7], [0, 0.1, 0])); const c = [0xff8fb8, 0xffe14f, 0xff6a6a, 0xb08fff]; for (let i = 0; i < 6; i++) { const a = i * 1.05; g.add(part(SPH, M(c[i % 4]), 0.1, [Math.sin(a) * 0.35, 0.3, Math.cos(a) * 0.35])); } },
  deco_rock(g) { g.add(part(DODE, M(0x8f9aa4), [0.5, 0.4, 0.45], [0, 0.4, 0])); g.add(part(DODE, M(0xa0aab2), [0.28, 0.24, 0.28], [0.4, 0.25, 0.2])); },
  deco_lamp(g, a) { g.add(part(CYL, M(0x8f9aa4), [0.14, 0.6, 0.14], [0, 0.6, 0])); const l = part(BOX, M(0xffe9a0, 0xffc040, 1), [0.3, 0.3, 0.3], [0, 1.35, 0]); g.add(l); g.add(part(CONE, M(0x6a7a84), [0.3, 0.2, 0.3], [0, 1.6, 0], [0, Math.PI / 4, 0])); a.push(t => { l.material.emissiveIntensity = 0.9; }); },
  deco_bench(g) { g.add(part(BOX, M(0xb8884a), [0.9, 0.12, 0.35], [0, 0.4, 0])); g.add(part(BOX, M(0xb8884a), [0.9, 0.35, 0.08], [0, 0.65, -0.15])); for (const s of [-1, 1]) g.add(part(BOX, M(0x6a4020), [0.1, 0.4, 0.3], [s * 0.38, 0.2, 0])); },
  deco_fountain(g, a) {
    g.add(part(CYL, M(0xc8d0d8), [1.5, 0.35, 1.5], [0, 0.18, 0])); g.add(part(CYL, M(0x3da5ff, 0x2a80d0, 0.4), [1.3, 0.1, 1.3], [0, 0.38, 0]));
    g.add(part(CYL, M(0xc8d0d8), [0.25, 0.8, 0.25], [0, 0.8, 0])); g.add(part(CYL, M(0xc8d0d8), [0.7, 0.12, 0.7], [0, 1.2, 0]));
    const j = part(CYL, M(0xaee4ff, 0x6ac0ff, 0.6, { transparent: true, opacity: 0.8 }), [0.07, 0.5, 0.07], [0, 1.5, 0]); g.add(j);
    a.push(t => { j.scale.y = 0.5 + Math.sin(t * 5) * 0.12; });
  },
  deco_windmill(g, a) {
    g.add(part(CONE, M(0xf0e4cc), [0.9, 2.4, 0.9], [0, 1.3, 0])); g.add(part(CONE, M(0xc84a3a), [1.0, 0.7, 1.0], [0, 2.8, 0]));
    const hub = new THREE.Group(); hub.position.set(0, 2.5, 0.55); g.add(hub);
    for (let i = 0; i < 4; i++) hub.add(part(BOX, M(0xfdf4dc), [0.28, 1.3, 0.04], [Math.sin(i * Math.PI / 2) * 0.7, Math.cos(i * Math.PI / 2) * 0.7, 0], [0, 0, -i * Math.PI / 2]));
    a.push(t => { hub.rotation.z = t * 1.2; });
  },
  deco_statue(g) { g.add(part(BOX, M(0xa0aab2), [0.7, 0.4, 0.7], [0, 0.2, 0])); g.add(part(SPH, M(0xb8c2ca), [0.28, 0.4, 0.34], [0, 0.75, 0])); g.add(part(SPH, M(0xb8c2ca), 0.2, [0, 1.2, 0.2])); g.add(part(CONE, M(0xb8c2ca), [0.06, 0.2, 0.06], [0.1, 1.4, 0.1])); g.add(part(CONE, M(0xb8c2ca), [0.06, 0.2, 0.06], [-0.1, 1.4, 0.1])); },
  deco_flag(g, a) { g.add(part(CYL, M(0xb8884a), [0.06, 1.1, 0.06], [0, 1.1, 0])); const f = part(BOX, M(0xe83a6a), [0.7, 0.45, 0.04], [0.38, 1.8, 0]); g.add(f); a.push(t => { f.rotation.y = Math.sin(t * 3) * 0.3; }); },
  deco_evlantern(g, a) { g.add(part(CYL, M(0x6a3a22), [0.07, 1.0, 0.07], [0, 1.0, 0])); const l = part(SPH, M(0xff4a2a, 0xff2a10, 1), [0.32, 0.4, 0.32], [0, 2.0, 0]); g.add(l); g.add(part(BOX, M(0xf5c030), [0.18, 0.06, 0.18], [0, 2.4, 0])); a.push(t => { l.rotation.z = Math.sin(t * 2) * 0.06; }); },
  deco_evtree(g, a) {
    g.add(part(CYL, M(0x8a5a30), [0.3, 1.3, 0.3], [0, 0.85, 0])); g.add(part(SPH, M(0xff9ec4), [1.2, 1.0, 1.2], [0, 2.2, 0]));
    const ls = []; for (let i = 0; i < 8; i++) { const o = part(SPH, M(0xfff0a0, 0xffd040, 1), 0.1, [Math.sin(i * 0.9) * 1.1, 1.8 + (i % 3) * 0.4, Math.cos(i * 0.9) * 1.1]); g.add(o); ls.push(o); }
    a.push(t => ls.forEach((o, i) => o.scale.setScalar(0.1 + Math.max(0, Math.sin(t * 3 + i)) * 0.05)));
  },
};

// Trả về nhóm 3D đặt tại tâm chân đế của công trình; userData.anim = mảng hàm (t)
export function makeBuilding(b, ctx = {}) {
  const def = BUILDING_BY_ID[b.type];
  const g = new THREE.Group();
  const anim = [], banners = [];
  const built = ctx.built !== false;
  if (!built) {
    const c = makeConstruction(def.w, def.d); c.userData.anim.forEach(f => anim.push(f)); g.add(c);
  } else switch (def.kind) {
    case 'habitat': {
      platform(g, 2.7, 0xcdbf9e);
      if (def.el === 'ice') g.children.length = 0;
      HAB[def.el](g, anim);
      levelMarks(g, b.level);
      break;
    }
    case 'farm': farm(g, ctx.farm); break;
    case 'hatchery': hatchery(g, b.level, anim); break;
    case 'breeding': breeding(g, anim); break;
    case 'arena': arena(g, anim); break;
    case 'altar': altar(g, anim, banners); break;
    case 'deco': (DECO[def.id] || (() => {}))(g, anim); break;
    default: break;
  }
  g.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    if (o.userData.spin) anim.push(t => { o.rotation.y = t * 1.5; });
  });
  g.userData.anim = anim; g.userData.banners = banners;
  return g;
}
