// Đấu trường: trận đấu theo lượt tự động, dựng cảnh 3D riêng.
import * as THREE from 'three';
import { DRAGONS, DRAGON_BY_ID, ELEMENTS, RARITY, dragonStage } from './data.js';
import { buildDragon, animateDragon, mat, part, SPH, CYL, disposeObject } from './dragon3d.js';
import * as G from './game.js';
import { rewardText, fmt } from './game.js';
import { sfx } from './sound.js';

export function dragonStats(type, level, boss = 1) {
  const m = RARITY[DRAGON_BY_ID[type].rarity].mul;
  return { hp: Math.round((60 + level * 22) * m * boss), atk: Math.round((9 + level * 3.2) * m) };
}

export function elemMul(atk, def) {
  const A = DRAGON_BY_ID[atk].el, D = DRAGON_BY_ID[def].el;
  if (A.some(a => D.some(d => ELEMENTS[a].strong.includes(d)))) return 1.5;
  if (D.some(d => A.some(a => ELEMENTS[d].strong.includes(a)))) return 0.7;
  return 1;
}

function rng(seed) { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }

export function enemiesFor(stage) {
  const r = rng(stage * 977 + 13);
  const pool = DRAGONS.filter(d => d.rarity !== 'event' && (d.rarity !== 'legend' || stage >= 20)).sort((a, b) => a.income - b.income);
  const count = Math.min(3, 1 + Math.floor(stage / 4));
  const boss = stage % 5 === 0;
  const lvl = Math.max(1, Math.round(stage * 0.85));
  const list = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.min(pool.length - 1, Math.floor(stage * 0.9 + r() * 4));
    const d = pool[Math.max(0, idx - Math.floor(r() * 4))];
    const isBoss = boss && i === count - 1;
    list.push({ type: d.id, level: lvl + (isBoss ? 2 : 0), boss: isBoss });
  }
  return list;
}

export const teamPower = arr => arr.reduce((s, d) => { const st = dragonStats(d.type, d.level, d.boss ? 1.6 : 1); return s + st.hp * 0.3 + st.atk * 3; }, 0);

const sleep = ms => new Promise(r => setTimeout(r, ms));

export function startBattle(stage, teamIds, onClose) {
  const root = document.getElementById('battle');
  root.classList.remove('hidden');
  root.innerHTML = `
    <div class="b-head"><b>⚔️ Ải ${stage}${stage % 5 === 0 ? ' · Trùm' : ''}</b><button class="btn small" id="bFast">Tốc độ ×1</button></div>
    <div class="b-stage"><canvas></canvas><div class="b-ov"></div></div>
    <div class="b-log"></div>
    <div class="b-result hidden"></div>`;
  const canvas = root.querySelector('canvas'), ov = root.querySelector('.b-ov'), logEl = root.querySelector('.b-log');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5d9a0);
  scene.add(new THREE.HemisphereLight(0xfff6e0, 0x9a7a50, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(-4, 10, 6); scene.add(sun);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 6.5, 11); camera.lookAt(0, 0.8, 0);
  scene.add(part(CYL, mat(0xe8cf98), [8, 0.3, 5], [0, -0.15, 0]));
  scene.add(part(CYL, mat(0xc8b890), [8.4, 0.2, 5.4], [0, -0.3, 0]));
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    scene.add(part(CYL, mat(0xb8a070), [0.3, 2.4, 0.3], [Math.sin(a) * 8.2, 1, Math.cos(a) * 5.2 - 1]));
  }

  const fit = () => {
    const w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  fit(); window.addEventListener('resize', fit);

  const mk = (d, side, i, n) => {
    const st = dragonStats(d.type, d.level, d.boss ? 1.6 : 1);
    const g = buildDragon(DRAGON_BY_ID[d.type].look, Math.max(1, dragonStage(d.level)));
    const lanes = n === 1 ? [0] : n === 2 ? [-1.4, 1.4] : [-2.2, 0, 2.2];
    const home = new THREE.Vector3(side * (2.6 + Math.abs(lanes[i]) * 0.35), 0, lanes[i]);
    g.position.copy(home); g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    if (d.boss) g.scale.multiplyScalar(1.35);
    scene.add(g);
    const hp = document.createElement('div'); hp.className = 'b-hp ' + (side < 0 ? 'me' : 'foe');
    hp.innerHTML = `<span>${d.name || DRAGON_BY_ID[d.type].name} <small>Lv${d.level}</small></span><div class="bar"><i></i></div>`;
    ov.appendChild(hp);
    return { ...d, ...st, max: st.hp, g, home, side, hpEl: hp, alive: true, phase: Math.random() * 9 };
  };
  const team = teamIds.map(id => G.dragonById(id)).filter(Boolean);
  const mine = team.map((d, i) => mk({ type: d.type, level: d.level, name: d.name }, -1, i, team.length));
  const foes = enemiesFor(stage).map((d, i, arr) => mk(d, 1, i, arr.length));
  const all = [...mine, ...foes];

  let fast = 1, closed = false;
  root.querySelector('#bFast').onclick = e => { fast = fast === 1 ? 3 : 1; e.target.textContent = `Tốc độ ×${fast}`; };
  const wait = ms => sleep(ms / fast);
  const tween = (ms, fn) => new Promise(res => {
    const t0 = performance.now(), dur = ms / fast;
    const step = () => { const p = Math.min(1, (performance.now() - t0) / dur); fn(p); if (p < 1 && !closed) requestAnimationFrame(step); else res(); };
    step();
  });
  const log = (txt) => { const p = document.createElement('div'); p.innerHTML = txt; logEl.prepend(p); };

  const v = new THREE.Vector3();
  let raf;
  const loop = () => {
    if (closed) return;
    raf = requestAnimationFrame(loop);
    const t = performance.now() / 1000;
    for (const a of all) {
      if (a.alive) animateDragon(a.g, t, 1.4, a.phase);
      v.copy(a.g.position); v.y += 2.3 * (a.boss ? 1.3 : 1); v.project(camera);
      a.hpEl.style.transform = `translate(${((v.x * 0.5 + 0.5) * canvas.clientWidth).toFixed(0)}px, ${((-v.y * 0.5 + 0.5) * canvas.clientHeight).toFixed(0)}px) translate(-50%,-100%)`;
      a.hpEl.querySelector('i').style.width = `${Math.max(0, a.hp / a.max * 100)}%`;
      a.hpEl.style.opacity = a.alive ? 1 : 0.35;
    }
    renderer.render(scene, camera);
  };
  loop();

  const floatDmg = (target, text, cls) => {
    const el = document.createElement('div'); el.className = 'float ' + cls; el.textContent = text; ov.appendChild(el);
    v.copy(target.g.position); v.y += 1.6; v.project(camera);
    const x = (v.x * 0.5 + 0.5) * canvas.clientWidth, y = (-v.y * 0.5 + 0.5) * canvas.clientHeight;
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%,-100%)`;
    tween(900, p => { el.style.transform = `translate(${x}px, ${y - p * 50}px) translate(-50%,-100%)`; el.style.opacity = 1 - p * p; }).then(() => el.remove());
  };

  async function attack(a, d) {
    const mul = elemMul(a.type, d.type);
    const dmg = Math.max(1, Math.round(a.atk * mul * (0.85 + Math.random() * 0.3)));
    const crit = Math.random() < 0.1;
    const total = crit ? Math.round(dmg * 1.6) : dmg;
    const from = a.home.clone();
    await tween(220, p => { a.g.position.x = from.x - a.side * Math.sin(p * Math.PI / 2) * 0.9; });
    const col = ELEMENTS[DRAGON_BY_ID[a.type].el[0]].color;
    const ball = part(SPH, mat(col, col, 1.2), 0.32); scene.add(ball);
    const s = a.g.position.clone().add(new THREE.Vector3(0, 1.1, 0)), e = d.g.position.clone().add(new THREE.Vector3(0, 0.9, 0));
    sfx('whoosh');
    await tween(300, p => { ball.position.lerpVectors(s, e, p); ball.position.y += Math.sin(p * Math.PI) * 1.2; ball.scale.setScalar(0.32 + p * 0.15); });
    scene.remove(ball);
    sfx('hit');
    d.hp = Math.max(0, d.hp - total);
    floatDmg(d, `-${fmt(total)}${crit ? '!' : ''}`, mul > 1 ? 'crit' : mul < 1 ? 'weak' : 'dmg');
    const dh = d.home.clone();
    tween(240, p => { d.g.position.x = dh.x + Math.sin(p * Math.PI * 4) * 0.15 * (1 - p); });
    tween(260, p => { a.g.position.x = from.x - a.side * (1 - p) * 0.9; });
    const nameA = a.name || DRAGON_BY_ID[a.type].name, nameD = d.name || DRAGON_BY_ID[d.type].name;
    log(`<b class="${a.side < 0 ? 'me' : 'foe'}">${nameA}</b> tấn công ${nameD}: <b>-${fmt(total)}</b>${mul > 1 ? ' <i class="good">khắc hệ!</i>' : mul < 1 ? ' <i class="bad">bị kháng</i>' : ''}${crit ? ' <i class="good">chí mạng!</i>' : ''}`);
    await wait(280);
    if (d.hp <= 0) {
      d.alive = false;
      log(`${nameD} đã kiệt sức.`);
      await tween(400, p => { d.g.scale.setScalar((d.boss ? 1.35 : 1) * Math.max(0.02, 1 - p) * d.g.userData.baseScale); d.g.position.y = -p * 0.5; });
      d.g.visible = false;
    }
  }

  all.forEach(a => { a.g.userData.baseScale = a.g.scale.x / (a.boss ? 1.35 : 1); });

  async function run() {
    await wait(600);
    let round = 0;
    while (round++ < 60 && !closed) {
      const order = [];
      for (let i = 0; i < 3; i++) { if (mine[i]?.alive) order.push(mine[i]); if (foes[i]?.alive) order.push(foes[i]); }
      for (const a of order) {
        if (closed || !a.alive) continue;
        const enemies = (a.side < 0 ? foes : mine).filter(x => x.alive);
        if (!enemies.length) break;
        await attack(a, enemies[0]);
        if (!foes.some(f => f.alive) || !mine.some(m => m.alive)) break;
      }
      if (!foes.some(f => f.alive) || !mine.some(m => m.alive)) break;
    }
    if (closed) return;
    const win = !foes.some(f => f.alive) && mine.some(m => m.alive);
    const res = G.battleResult(stage, win);
    sfx(win ? 'win' : 'lose');
    const box = root.querySelector('.b-result');
    box.classList.remove('hidden');
    box.innerHTML = `<div class="b-card ${win ? 'win' : 'lose'}">
      <h2>${win ? '🏆 Chiến thắng!' : '💫 Thất bại'}</h2>
      <p>${win ? (res.first ? 'Vượt ải lần đầu – nhận thêm đá quý!' : 'Đội rồng của bạn thật mạnh mẽ.') : 'Hãy cho rồng ăn để lên cấp, hoặc chọn rồng khắc hệ đối thủ.'}</p>
      <p class="rw">${rewardText(res.reward)}${res.tokens ? ` &nbsp;+${res.tokens} điểm sự kiện` : ''}</p>
      <button class="btn big" id="bClose">Đóng</button></div>`;
    box.querySelector('#bClose').onclick = close;
  }

  function close() {
    closed = true; cancelAnimationFrame(raf);
    window.removeEventListener('resize', fit);
    all.forEach(a => disposeObject(a.g));
    renderer.dispose(); renderer.forceContextLoss?.();
    root.classList.add('hidden'); root.innerHTML = '';
    onClose?.();
  }

  run();
}
