// Giao diện: HUD, các bảng chức năng, hộp thoại, thông báo.
import {
  ELEMENTS, RARITY, DRAGONS, DRAGON_BY_ID, BUILDINGS, BUILDING_BY_ID, CROPS, HABITAT_LEVELS, HATCHERY_LEVELS,
  LOGIN_REWARDS, GEM_EXCHANGE, STAGE_NAMES, MAX_DRAGON_LEVEL, FEEDS_PER_LEVEL, BREED_MIN_LEVEL, CELL,
  xpNeed, feedCost, dragonIncome, dragonStage,
} from './data.js';
import * as G from './game.js';
import * as EV from './events.js';
import { S, bus, now, exportSave, importSave, resetSave, save } from './state.js';
import { portrait, eggPortrait, snapshot } from './dragon3d.js';
import { makeBuilding } from './models.js';
import { sfx, setSound } from './sound.js';
import { startBattle, enemiesFor, teamPower, elemMul } from './battle.js';

const { fmt, rewardText } = G;
const fmtD = EV.fmtDuration;
let world;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Mảnh HTML dùng chung ----------
const chip = el => `<span class="el" style="--c:#${ELEMENTS[el].color.toString(16).padStart(6, '0')}" title="${ELEMENTS[el].name}">${ELEMENTS[el].icon} ${ELEMENTS[el].name}</span>`;
const chips = def => def.el.map(chip).join('');
const rar = r => `<span class="rar" style="--c:${RARITY[r].color}">${RARITY[r].name}</span>`;
const dImg = (type, stage = 2, cls = '') => `<img class="pt ${cls}" src="${portrait(type, stage)}" alt="">`;
const eImg = (type, cls = '') => `<img class="pt egg ${cls}" src="${eggPortrait(type)}" alt="">`;
function bImg(typeId) {
  const def = BUILDING_BY_ID[typeId];
  const url = snapshot('b' + typeId, () => makeBuilding({ type: typeId, level: 1 }, { built: true }),
    { pos: [0, def.w * 2.3 + 2.4, def.w * 3.0 + 3.6], look: [0, 0.75 + def.w * 0.15, 0] });
  return `<img class="pt bimg" src="${url}" alt="">`;
}
const attrs = data => Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
const btn = (act, label, data = {}, cls = '') => `<button class="btn ${cls}" data-act="${act}" ${attrs(data)}>${label}</button>`;
const tm = end => `<b class="tm" data-end="${end}" ${end <= now() ? 'data-x="1"' : ''}>${fmtD(end - now())}</b>`;
const pbar = (start, end, cls = '') => {
  const p = Math.min(1, Math.max(0, (now() - start) / (end - start)));
  return `<div class="bar ${cls}"><i data-start="${start}" data-end="${end}" ${end <= now() ? 'data-x="1"' : ''} style="width:${(p * 100).toFixed(1)}%"></i></div>`;
};
const bar = (p, cls = '') => `<div class="bar ${cls}"><i style="width:${(Math.min(1, Math.max(0, p)) * 100).toFixed(1)}%"></i></div>`;
const tabs = (cur, list, act = 'tab') => `<div class="tabs">${list.map(([k, l]) => `<button class="tab ${k === cur ? 'on' : ''}" data-act="${act}" data-k="${k}">${l}</button>`).join('')}</div>`;
const empty = t => `<div class="empty">${t}</div>`;

// ---------- Thông báo ----------
export function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type; el.innerHTML = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 2400);
  setTimeout(() => el.remove(), 2900);
}
function result(res, okMsg, sound = 'good') {
  if (!res.ok) { if (res.msg) { toast(res.msg, 'err'); sfx('error'); } return false; }
  if (okMsg) toast(okMsg, 'ok');
  sfx(sound);
  return true;
}
function ask(msg, onYes, yes = 'Đồng ý') {
  const box = $('#confirm');
  box.innerHTML = `<div class="cbox"><p>${msg}</p><div class="row end">${btn('cNo', 'Huỷ', {}, 'ghost')}${btn('cYes', yes, {}, 'warn')}</div></div>`;
  box.classList.remove('hidden');
  confirmCb = onYes;
}
let confirmCb = null;

// ---------- Hộp thoại ----------
let cur = null;
const PANELS = {};
export function open(name, params = {}) {
  cur = { name, params };
  $('#modal').classList.remove('hidden');
  $('#mBody').scrollTop = 0;
  paint();
}
export function close() {
  cur = null;
  $('#modal').classList.add('hidden');
  $('#mBody').innerHTML = '';
}
function paint() {
  if (!cur) return;
  const P = PANELS[cur.name];
  const html = P.render(cur.params);
  if (html == null) { close(); return; }
  const body = $('#mBody'), sc = body.scrollTop;
  body.innerHTML = html; body.scrollTop = sc;
  $('#mTitle').innerHTML = typeof P.title === 'function' ? P.title(cur.params) : P.title;
  $('#modal').querySelector('.mcard').className = 'mcard ' + (P.cls || '');
}
let paintQueued = false;
function schedulePaint() {
  if (!cur || PANELS[cur.name].live === false || paintQueued) return;
  paintQueued = true;
  requestAnimationFrame(() => { paintQueued = false; paint(); });
}

// ---------- Hành động ----------
const A = {};
const go = (name, params) => () => open(name, params);

A.close = () => close();
A.open = d => open(d.p, d.id ? { id: d.id } : {});
A.cNo = () => { $('#confirm').classList.add('hidden'); confirmCb = null; };
A.cYes = () => { $('#confirm').classList.add('hidden'); const f = confirmCb; confirmCb = null; f?.(); };

// =====================================================================
// CỬA HÀNG
// =====================================================================
let shopTab = 'eggs';
A.tab = d => { if (cur.name === 'shop') shopTab = d.k; else if (cur.name === 'quests') questTab = d.k; else if (cur.name === 'book') bookTab = d.k; paint(); };

PANELS.shop = {
  title: '🛒 Cửa hàng', cls: 'wide',
  render() {
    const s = S.s;
    let h = tabs(shopTab, [['eggs', '🥚 Trứng rồng'], ['habitat', '🏠 Khu ở'], ['build', '🌾 Vườn'], ['deco', '🌳 Trang trí'], ['land', '🗺️ Mở đảo'], ['gems', '💎 Đổi đá quý']]);
    h += '<div class="grid">';
    if (shopTab === 'eggs') {
      for (const def of DRAGONS.filter(d => d.price != null)) {
        const c = G.eggBuyable(def), lockLv = Math.max(...def.el.map(e => ELEMENTS[e].unlock));
        h += `<div class="card ${s.level < lockLv ? 'locked' : ''}">${eImg(def.id)}
          <div class="cb"><h4>${def.name}</h4><div>${chips(def)} ${rar(def.rarity)}</div>
          <p>🪙 ${def.income}/phút · ⏱ ${fmtD(def.hatch * 1000)}</p></div>
          ${s.level < lockLv ? `<div class="lock">🔒 Cấp ${lockLv}</div>` : btn('buyEgg', `🪙 ${fmt(def.price)}`, { id: def.id }, c.ok ? '' : 'dim')}</div>`;
      }
    } else if (shopTab === 'habitat' || shopTab === 'build') {
      const kinds = shopTab === 'habitat' ? ['habitat'] : ['farm'];
      for (const def of BUILDINGS.filter(b => kinds.includes(b.kind))) {
        const c = G.canBuy(def), locked = (def.level || 1) > s.level;
        const cnt = def.kind === 'habitat' ? G.countKind('habitat') : G.countKind('farm');
        h += `<div class="card ${locked ? 'locked' : ''}">${bImg(def.id)}
          <div class="cb"><h4>${def.name}</h4><p>${def.desc}</p>
          <p>⏱ Xây ${fmtD(def.time * 1000)}${def.cap ? ` · Kho ${fmt(def.cap)} 🪙` : ''} · Đã có ${cnt}/${G.limitOf(def)}</p></div>
          ${locked ? `<div class="lock">🔒 Cấp ${def.level}</div>` : btn('build', `🪙 ${fmt(def.cost)}`, { id: def.id }, c.ok ? '' : 'dim')}</div>`;
      }
      if (shopTab === 'build') {
        const hl = G.hatchery().level, nx = HATCHERY_LEVELS[hl];
        h += `<div class="card">${bImg('hatchery')}<div class="cb"><h4>Nâng cấp Lò Ấp Trứng</h4>
          <p>Cấp ${hl} · ấp ${HATCHERY_LEVELS[hl - 1].slots} trứng cùng lúc${nx ? ` → ${nx.slots} trứng (cần cấp ${nx.level})` : ''}</p></div>
          ${nx ? btn('upHatch', `🪙 ${fmt(nx.cost)}`) : '<div class="lock">Tối đa</div>'}</div>`;
      }
    } else if (shopTab === 'deco') {
      for (const def of BUILDINGS.filter(b => b.kind === 'deco')) {
        const bag = s.decoBag[def.id] || 0;
        if (def.eventOnly && !bag) continue;
        const locked = !bag && (def.level || 1) > s.level, c = G.canBuy(def);
        const price = bag ? `🎁 Đặt (${bag})` : def.gems ? `💎 ${def.gems}` : `🪙 ${fmt(def.cost)}`;
        h += `<div class="card ${locked ? 'locked' : ''}">${bImg(def.id)}<div class="cb"><h4>${def.name}</h4><p>+${def.xp} ⭐ kinh nghiệm${def.eventOnly ? ' · Quà sự kiện' : ''}</p></div>
          ${locked ? `<div class="lock">🔒 Cấp ${def.level}</div>` : btn('build', price, { id: def.id }, bag || c.ok ? '' : 'dim')}</div>`;
      }
    } else if (shopTab === 'land') {
      const nx = G.expandInfo();
      h += `<div class="card wide"><div class="ci big">🗺️</div><div class="cb"><h4>Mở rộng đảo</h4>
        <p>Hiện tại: ${G.unlockedHalf() * 2}×${G.unlockedHalf() * 2} ô.</p>
        ${nx ? `<p>Lần tiếp theo: ${nx.half * 2}×${nx.half * 2} ô · cần cấp ${nx.level}</p>` : '<p>Đảo đã đạt kích thước tối đa!</p>'}</div>
        ${nx ? btn('expand', `🪙 ${fmt(nx.cost)}`, {}, s.level >= nx.level && s.gold >= nx.cost ? '' : 'dim') : ''}</div>`;
    } else if (shopTab === 'gems') {
      GEM_EXCHANGE.forEach((ex, i) => {
        h += `<div class="card"><div class="ci big">${ex.gold ? '🪙' : '🍖'}</div><div class="cb"><h4>${ex.gold ? fmt(ex.gold) + ' vàng' : fmt(ex.food) + ' thức ăn'}</h4><p>Đổi ngay</p></div>
          ${btn('exchange', `💎 ${ex.gems}`, { i }, s.gems >= ex.gems ? '' : 'dim')}</div>`;
      });
    }
    return h + '</div>';
  },
};
A.buyEgg = d => {
  const r = G.buyEgg(d.id);
  if (result(r, r.where === 'hatchery' ? `🥚 Trứng đã vào Lò Ấp!` : `🥚 Lò ấp đầy – trứng được cất vào túi`, 'coin')) paint();
};
A.build = d => {
  const def = BUILDING_BY_ID[d.id];
  if (!(S.s.decoBag[d.id] > 0)) { const c = G.canBuy(def); if (!c.ok) return result(c); }
  close();
  world.startPlacement(d.id);
};
A.expand = () => {
  const nx = G.expandInfo();
  if (!nx) return;
  ask(`Mở rộng đảo với giá <b>${fmt(nx.cost)} 🪙</b>?`, () => { if (result(G.expand(), '🗺️ Đảo đã được mở rộng!', 'level')) paint(); });
};
A.exchange = d => { if (result(G.exchangeGems(+d.i), 'Đổi thành công!', 'coin')) paint(); };
A.upHatch = () => { if (result(G.upgradeHatchery(), '🥚 Lò ấp đã được nâng cấp!', 'level')) paint(); };

// =====================================================================
// KHU Ở & RỒNG
// =====================================================================
function dragonRow(d, showHab = false) {
  const def = DRAGON_BY_ID[d.type], st = dragonStage(d.level), max = d.level >= MAX_DRAGON_LEVEL;
  const fc = feedCost(d.level);
  const hab = showHab ? G.buildingById(d.habitatId) : null;
  return `<div class="drow">${dImg(d.type, st)}
    <div class="cb"><h4>${esc(d.name)} <button class="link" data-act="rename" data-id="${d.id}">✏️</button></h4>
    <div>${chips(def)} ${rar(def.rarity)}</div>
    <p>Cấp <b>${d.level}</b> · ${STAGE_NAMES[st]} · 🪙 ${fmt(dragonIncome(d.type, d.level))}/phút${hab ? ` · ${BUILDING_BY_ID[hab.type].name}` : ''}</p>
    ${max ? '<p class="good">Đã đạt cấp tối đa</p>' : bar(d.feeds / FEEDS_PER_LEVEL, 'feed')}</div>
    <div class="col">${max ? '' : btn('feed', `🍖 ${fmt(fc)}`, { id: d.id }, S.s.food >= fc ? 'green' : 'dim')}
    ${btn('moveDragon', 'Chuyển', { id: d.id }, 'ghost small')}${btn('sellDragon', 'Bán', { id: d.id }, 'ghost small')}</div></div>`;
}

PANELS.habitat = {
  title: p => { const b = G.buildingById(p.id); return b ? `${ELEMENTS[BUILDING_BY_ID[b.type].el].icon} ${BUILDING_BY_ID[b.type].name} <small>Cấp ${b.level}</small>` : ''; },
  render(p) {
    const b = G.buildingById(p.id); if (!b) return null;
    if (!G.isBuilt(b)) return underConstruction(b);
    const i = G.habitatInfo(b), up = G.upgradeCost(b);
    let h = `<div class="hab-top">
      <div><p>Rồng: <b>${i.dragons.length}/${i.slots}</b> · Thu nhập: <b>${fmt(i.rate)} 🪙/phút</b></p>
      <p>Kho vàng: <b class="live-gold" data-hab="${b.id}">${fmt(i.stored)}</b> / ${fmt(i.cap)}</p>${bar(i.stored / i.cap, 'gold')}</div>
      <div class="col">${btn('collect', '🪙 Thu vàng', { id: b.id }, i.stored >= 1 ? 'gold' : 'dim')}
      ${up != null ? btn('upHab', `⬆️ Nâng cấp 🪙${fmt(up)}`, { id: b.id }, S.s.gold >= up ? '' : 'dim') : '<span class="muted">Cấp tối đa</span>'}</div></div>`;
    h += i.dragons.map(d => dragonRow(d)).join('');
    for (let k = i.dragons.length; k < i.slots; k++) {
      h += `<div class="drow emptyslot"><div class="ci">＋</div><div class="cb"><p>Ô trống – ấp trứng rồng hệ ${ELEMENTS[i.def.el].name} để ở đây.</p></div>${btn('open', 'Mua trứng', { p: 'shop' }, 'small')}</div>`;
    }
    h += buildingTools(b);
    return h;
  },
};
function buildingTools(b) {
  const def = BUILDING_BY_ID[b.type];
  return `<div class="row tools">${btn('moveB', '✥ Di chuyển', { id: b.id }, 'ghost small')}${def.unique ? '' : btn('sellB', '🗑 Bán', { id: b.id }, 'ghost small')}</div>`;
}
function underConstruction(b) {
  const def = BUILDING_BY_ID[b.type];
  return `<div class="center">${bImg(b.type)}<p>Đang xây dựng… còn ${tm(b.readyAt)}</p>${pbar(b.readyAt - def.time * 1000, b.readyAt)}
    <p>${btn('skip', `⚡ Xong ngay 💎${G.skipCost(b.readyAt - now())}`, { k: 'build', id: b.id }, 'gem')}</p></div>${buildingTools(b)}`;
}

A.collect = d => {
  const b = G.buildingById(d.id), r = G.collect(b);
  if (!r.ok) return result(r);
  sfx('coin'); world.floatText(b.id, `+${fmt(r.amount)} 🪙`, 'gold');
  if (r.tokens) setTimeout(() => world.floatText(b.id, `+${r.tokens} ${EV.activeEvent()?.tokenIcon || ''}`, 'token'), 250);
  paint();
};
A.upHab = d => { if (result(G.upgradeHabitat(G.buildingById(d.id)), '⬆️ Đã nâng cấp khu ở!', 'level')) paint(); };
A.feed = d => {
  const r = G.feed(d.id);
  if (!r.ok) return result(r);
  sfx(r.leveled ? 'level' : 'pet');
  const dd = G.dragonById(d.id);
  if (r.leveled) {
    toast(`🎉 ${esc(dd.name)} lên cấp ${r.level}!`, 'ok');
    if ([4, 10].includes(r.level)) toast(`✨ ${esc(dd.name)} đã lớn thành ${STAGE_NAMES[dragonStage(r.level)]}!`, 'ok');
  }
  const pos = world.dragonPos(d.id); if (pos) { pos.y += 2; world.floatText(pos, r.leveled ? '⬆️ Lên cấp!' : '🍖', 'gold'); }
  paint();
};
A.rename = d => {
  const dd = G.dragonById(d.id); if (!dd) return;
  const n = prompt('Đặt tên mới cho rồng:', dd.name);
  if (n) { G.renameDragon(d.id, n); paint(); }
};
A.sellDragon = d => {
  const dd = G.dragonById(d.id); if (!dd) return;
  ask(`Bán <b>${esc(dd.name)}</b> (cấp ${dd.level}) với giá <b>${fmt(G.sellValue(dd))} 🪙</b>?`, () => {
    if (result(G.sellDragon(d.id), 'Đã bán rồng', 'coin')) paint();
  }, 'Bán');
};
A.moveDragon = d => {
  const dd = G.dragonById(d.id);
  const back = cur ? { ...cur } : null;
  open('pickHab', { mode: 'move', dragonId: d.id, type: dd.type, back });
};
A.moveB = d => {
  close();
  world.startPlacement(G.buildingById(d.id).type, { moveId: d.id });
};
A.sellB = d => {
  const b = G.buildingById(d.id), def = BUILDING_BY_ID[b.type];
  ask(`Bán <b>${def.name}</b>? Bạn nhận lại ${fmt(Math.round((def.cost || 0) * 0.25))} 🪙.`, () => { if (result(G.sellBuilding(d.id), 'Đã bán công trình', 'coin')) close(); }, 'Bán');
};
A.skip = d => {
  const r = G.skip(d.k, d.id);
  if (result(r, `⚡ Đã tăng tốc (−${r.cost || 0} 💎)`, 'good')) paint();
};

PANELS.dragons = {
  title: '🐉 Rồng của tôi', cls: 'wide',
  render() {
    const list = S.s.dragons.slice().sort((a, b) => b.level - a.level);
    const total = list.reduce((s, d) => s + dragonIncome(d.type, d.level), 0);
    let h = `<p class="sum">Tổng cộng <b>${list.length}</b> rồng · Thu nhập <b>${fmt(total)} 🪙/phút</b> · Thức ăn: <b>${fmt(S.s.food)} 🍖</b></p>`;
    if (!list.length) h += empty('Bạn chưa có rồng nào. Hãy mua trứng trong Cửa hàng và ấp nở ở Lò Ấp Trứng!');
    return h + list.map(d => dragonRow(d, true)).join('');
  },
};

PANELS.pickHab = {
  title: 'Chọn khu ở',
  render(p) {
    const def = DRAGON_BY_ID[p.type];
    const habs = G.habitatsFor(p.type).filter(h => !(p.mode === 'move' && G.dragonById(p.dragonId)?.habitatId === h.id));
    let h = `<p>Rồng <b>${def.name}</b> có thể sống ở khu: ${chips(def)}</p>`;
    if (!habs.length) h += empty(`Không còn khu ở phù hợp còn chỗ trống. Hãy xây hoặc nâng cấp Khu ${def.el.map(e => ELEMENTS[e].name).join(' / ')}.`) + `<div class="center">${btn('shopHab', '🏠 Tới cửa hàng')}</div>`;
    for (const b of habs) {
      const i = G.habitatInfo(b);
      h += `<div class="drow">${bImg(b.type)}<div class="cb"><h4>${i.def.name} <small>Cấp ${b.level}</small></h4><p>Rồng ${i.dragons.length}/${i.slots} · ${fmt(i.rate)} 🪙/phút</p></div>${btn('chooseHab', 'Chọn', { id: b.id })}</div>`;
    }
    if (p.back) h += `<div class="row tools">${btn('pickBack', '← Quay lại', {}, 'ghost small')}</div>`;
    return h;
  },
};
A.shopHab = () => { shopTab = 'habitat'; open('shop'); };
A.pickBack = () => { const b = cur.params.back; if (b) open(b.name, b.params); else close(); };
A.chooseHab = d => {
  const p = cur.params;
  if (p.mode === 'move') {
    if (result(G.moveDragon(p.dragonId, d.id), 'Đã chuyển rồng', 'good')) { if (p.back) open(p.back.name, p.back.params); else close(); }
  } else if (p.mode === 'hatch') doHatch(p.eggId, d.id);
};

// =====================================================================
// VƯỜN
// =====================================================================
PANELS.farm = {
  title: '🌾 Vườn Thức Ăn',
  render(p) {
    const b = G.buildingById(p.id); if (!b) return null;
    if (!G.isBuilt(b)) return underConstruction(b);
    const f = G.farmState(b);
    let h = '';
    if (f.state === 'ready') {
      h += `<div class="center"><div class="ci big">${f.crop.icon}</div><p><b>${f.crop.name}</b> đã chín!</p>${btn('harvest', `Thu hoạch +${fmt(Math.round(f.crop.food * EV.bonus('food')))} 🍖`, { id: b.id }, 'green big')}</div>`;
    } else if (f.state === 'growing') {
      h += `<div class="center"><div class="ci big">${f.crop.icon}</div><p>Đang trồng <b>${f.crop.name}</b> – còn ${tm(b.crop.end)}</p>${pbar(b.crop.start, b.crop.end, 'green')}
        <p>${btn('skip', `⚡ Chín ngay 💎${G.skipCost(f.left)}`, { k: 'farm', id: b.id }, 'gem')}</p></div>`;
    } else {
      h += '<p>Chọn loại cây để gieo:</p><div class="grid">';
      for (const c of CROPS) {
        const locked = c.level > S.s.level;
        h += `<div class="card ${locked ? 'locked' : ''}"><div class="ci big">${c.icon}</div><div class="cb"><h4>${c.name}</h4>
          <p>⏱ ${fmtD(c.time * 1000)} · +${fmt(c.food)} 🍖 · +${c.xp} ⭐</p></div>
          ${locked ? `<div class="lock">🔒 Cấp ${c.level}</div>` : btn('plant', `🪙 ${fmt(c.cost)}`, { id: b.id, c: c.id }, S.s.gold >= c.cost ? '' : 'dim')}</div>`;
      }
      h += '</div>';
      if (b.lastCrop) h += `<div class="row">${btn('plantAll', `🔁 Trồng lại ${CROPS.find(c => c.id === b.lastCrop).name} cho mọi vườn trống`, { c: b.lastCrop }, 'ghost small')}</div>`;
    }
    return h + buildingTools(b);
  },
};
A.plant = d => { if (result(G.plant(G.buildingById(d.id), d.c), null, 'click')) { world.floatText(d.id, '🌱', ''); close(); } };
A.plantAll = d => {
  let n = 0;
  for (const b of S.s.buildings) if (b.type === 'farm' && G.isBuilt(b) && !b.crop && G.plant(b, d.c).ok) n++;
  toast(n ? `🌱 Đã gieo ${n} vườn` : 'Không gieo được thêm (hết vườn trống hoặc thiếu vàng)', n ? 'ok' : 'err');
  close();
};
A.harvest = d => doHarvest(G.buildingById(d.id)) && close();
function doHarvest(b) {
  const r = G.harvest(b);
  if (!r.ok) return result(r);
  sfx('coin'); world.floatText(b.id, `+${fmt(r.amount)} 🍖`, 'food');
  if (r.tokens) setTimeout(() => world.floatText(b.id, `+${r.tokens} ${EV.activeEvent()?.tokenIcon || ''}`, 'token'), 250);
  return true;
}

// =====================================================================
// LÒ ẤP TRỨNG
// =====================================================================
PANELS.hatchery = {
  title: () => `🥚 Lò Ấp Trứng <small>Cấp ${G.hatchery().level}</small>`,
  render() {
    const s = S.s, slots = G.hatcherySlots();
    let h = '<div class="slots">';
    for (let i = 0; i < slots; i++) {
      const e = s.eggs[i];
      if (!e) { h += `<div class="slot emptyslot"><div class="ci big">＋</div><p>Ô trống</p>${btn('open', 'Mua trứng', { p: 'shop' }, 'small')}</div>`; continue; }
      const def = DRAGON_BY_ID[e.type], ready = now() >= e.end;
      h += `<div class="slot ${ready ? 'ready' : ''}">${eImg(e.type, ready ? 'wobble' : '')}<h4>${def.name}</h4><div>${chips(def)}</div>
        ${ready ? btn('hatch', '🐣 Nở ngay', { id: e.id }, 'green') : `<p>Còn ${tm(e.end)}</p>${pbar(e.start, e.end)}${btn('skip', `⚡ 💎${G.skipCost(e.end - now())}`, { k: 'egg', id: e.id }, 'gem small')}`}</div>`;
    }
    h += '</div>';
    const nx = HATCHERY_LEVELS[G.hatchery().level];
    if (nx) h += `<div class="row">${btn('upHatch', `⬆️ Nâng cấp lò (${nx.slots} ô) 🪙${fmt(nx.cost)} · cấp ${nx.level}`, {}, s.gold >= nx.cost && s.level >= nx.level ? '' : 'dim')}</div>`;
    if (s.eggBag.length) {
      h += `<h3>Túi trứng (${s.eggBag.length})</h3><div class="slots">`;
      s.eggBag.forEach((t, i) => { h += `<div class="slot small">${eImg(t)}<p>${DRAGON_BY_ID[t].name}</p>${btn('bagEgg', 'Đưa vào lò', { i }, s.eggs.length < slots ? 'small' : 'small dim')}</div>`; });
      h += '</div>';
    }
    return h;
  },
};
A.bagEgg = d => { if (result(G.bagToHatchery(+d.i), null, 'click')) paint(); };
A.hatch = d => {
  const e = S.s.eggs.find(x => x.id === d.id); if (!e) return;
  const habs = G.habitatsFor(e.type), def = DRAGON_BY_ID[e.type];
  if (!habs.length) {
    toast(`Cần một Khu ${def.el.map(x => ELEMENTS[x].name).join(' hoặc ')} còn chỗ trống (đã xây xong)!`, 'err'); sfx('error');
    shopTab = 'habitat'; open('shop'); return;
  }
  if (habs.length === 1) doHatch(e.id, habs[0].id);
  else open('pickHab', { mode: 'hatch', eggId: e.id, type: e.type, back: { name: 'hatchery', params: {} } });
};
function doHatch(eggId, habId) {
  const r = G.hatch(eggId, habId);
  if (!r.ok) return result(r);
  sfx('hatch');
  world.focusBuilding(habId);
  open('reveal', { type: r.dragon.type, isNew: r.isNew, id: r.dragon.id, tokens: r.tokens });
}
PANELS.reveal = {
  title: '🐣 Trứng đã nở!', cls: 'reveal', live: false,
  render(p) {
    const def = DRAGON_BY_ID[p.type];
    return `<div class="center"><div>${dImg(p.type, 0, 'huge pop')}</div>
      ${p.isNew ? '<div class="newtag">LOÀI MỚI! ×2 kinh nghiệm</div>' : ''}
      <h2>${def.name}</h2><div>${chips(def)} ${rar(def.rarity)}</div><p class="desc">${def.desc}</p>
      ${p.tokens ? `<p>+${p.tokens} ${EV.activeEvent()?.tokenIcon || ''} điểm sự kiện</p>` : ''}
      <div class="row center">${btn('open', '🥚 Lò ấp', { p: 'hatchery' }, 'ghost')}${btn('close', 'Tuyệt vời!', {}, 'green big')}</div></div>`;
  },
};

// =====================================================================
// LAI GIỐNG
// =====================================================================
const breed = { a: null, b: null, slot: 'a' };
PANELS.breeding = {
  title: '💕 Vườn Se Duyên', cls: 'wide',
  render() {
    const info = G.breedInfo();
    if (info.state !== 'idle') {
      const br = info.br, A1 = DRAGON_BY_ID[br.typeA], B1 = DRAGON_BY_ID[br.typeB];
      let h = `<div class="pair">${dImg(br.typeA, 2)}<div class="heart">💕</div>${dImg(br.typeB, 2)}</div><p class="center">${A1.name} + ${B1.name}</p>`;
      if (info.state === 'done') h += `<div class="center"><p>Đã có một quả trứng mới!</p>${eImg(br.result, 'wobble')}<p>${btn('breedCollect', '🥚 Nhận trứng', {}, 'green big')}</p></div>`;
      else h += `<div class="center"><p>Đang se duyên… còn ${tm(br.end)}</p>${pbar(br.start, br.end, 'pink')}<p>${btn('skip', `⚡ Xong ngay 💎${G.skipCost(info.left)}`, { k: 'breed', id: '' }, 'gem')}</p></div>`;
      return h;
    }
    const pick = id => (id ? G.dragonById(id) : null);
    const a = pick(breed.a), b = pick(breed.b);
    const slot = (d, k) => `<div class="bslot ${breed.slot === k ? 'on' : ''}" data-act="bslot" data-k="${k}">${d ? dImg(d.type, dragonStage(d.level)) + `<p>${esc(d.name)} <small>Lv${d.level}</small></p>` : `<div class="ci big">?</div><p>Chọn rồng ${k === 'a' ? 'thứ nhất' : 'thứ hai'}</p>`}</div>`;
    let h = `<p class="muted">Ghép hai rồng từ cấp ${BREED_MIN_LEVEL} trở lên. Rồng con sẽ thuộc hệ của bố mẹ – kết hợp hệ khác nhau để tạo ra loài lai mới!</p>
      <div class="pair">${slot(a, 'a')}<div class="heart">💕</div>${slot(b, 'b')}</div>`;
    if (a && b) {
      const cands = G.breedCandidates(a.type, b.type), tot = cands.reduce((s, d) => s + RARITY[d.rarity].weight, 0);
      h += '<h3>Kết quả có thể</h3><div class="mini-grid">';
      for (const c of cands.sort((x, y) => RARITY[y.rarity].weight - RARITY[x.rarity].weight)) {
        const known = S.s.book[c.id];
        h += `<div class="mini">${dImg(c.id, 2, known ? '' : 'shadow')}<p>${known ? c.name : '???'}</p><small>${(RARITY[c.rarity].weight / tot * 100).toFixed(1)}%</small></div>`;
      }
      h += `</div><div class="center">${btn('breedStart', '💕 Bắt đầu se duyên', {}, 'pink big')}</div>`;
    }
    const elig = S.s.dragons.filter(d => d.level >= BREED_MIN_LEVEL && d.id !== (breed.slot === 'a' ? breed.b : breed.a));
    h += `<h3>Chọn rồng cho ô ${breed.slot === 'a' ? 'thứ nhất' : 'thứ hai'}</h3>`;
    if (!elig.length) h += empty(`Chưa có rồng nào đạt cấp ${BREED_MIN_LEVEL}. Hãy cho rồng ăn để lớn nhanh!`);
    h += '<div class="mini-grid">' + elig.map(d => `<div class="mini click ${d.id === breed.a || d.id === breed.b ? 'on' : ''}" data-act="bpick" data-id="${d.id}">${dImg(d.type, dragonStage(d.level))}<p>${esc(d.name)}</p><small>Lv${d.level} ${DRAGON_BY_ID[d.type].el.map(e => ELEMENTS[e].icon).join('')}</small></div>`).join('') + '</div>';
    return h;
  },
};
A.bslot = d => { breed.slot = d.k; paint(); };
A.bpick = d => { breed[breed.slot] = d.id; breed.slot = breed.slot === 'a' ? 'b' : 'a'; sfx('click'); paint(); };
A.breedStart = () => {
  const r = G.startBreeding(breed.a, breed.b);
  if (result(r, '💕 Bắt đầu se duyên!', 'good')) { breed.a = breed.b = null; breed.slot = 'a'; paint(); }
};
A.breedCollect = () => {
  const r = G.collectBreeding();
  if (result(r, r.where === 'hatchery' ? `🥚 Trứng ${DRAGON_BY_ID[r.typeId]?.name} đã vào Lò Ấp!` : '🥚 Trứng được cất vào túi (lò ấp đầy)', 'hatch')) paint();
};

// =====================================================================
// ĐẤU TRƯỜNG
// =====================================================================
const arena = { stage: 0, team: [] };
PANELS.arena = {
  title: '⚔️ Đấu Trường', cls: 'wide',
  render() {
    const best = S.s.arena.stage;
    if (!arena.stage) arena.stage = best + 1;
    arena.stage = Math.max(1, Math.min(best + 1, arena.stage));
    arena.team = arena.team.filter(id => G.dragonById(id));
    const foes = enemiesFor(arena.stage);
    const mine = arena.team.map(id => G.dragonById(id));
    const pf = teamPower(foes), pm = teamPower(mine);
    let h = `<div class="arena-top"><div><p>Ải cao nhất đã vượt: <b>${best}</b></p>
      <div class="stepper">${btn('stage', '◀', { d: -1 }, 'ghost small')}<b>Ải ${arena.stage}${arena.stage % 5 === 0 ? ' 👑' : ''}</b>${btn('stage', '▶', { d: 1 }, 'ghost small')}</div></div>
      <div class="vs"><div>Đội bạn<br><b>${fmt(pm)}</b></div><span>VS</span><div>Đối thủ<br><b>${fmt(pf)}</b></div></div></div>
      <h3>Đối thủ</h3><div class="mini-grid">${foes.map(f => `<div class="mini">${dImg(f.type, Math.max(1, dragonStage(f.level)))}<p>${DRAGON_BY_ID[f.type].name}${f.boss ? ' 👑' : ''}</p><small>Lv${f.level} ${DRAGON_BY_ID[f.type].el.map(e => ELEMENTS[e].icon).join('')}</small></div>`).join('')}</div>
      <h3>Chọn đội (tối đa 3) – ${arena.team.length}/3</h3>`;
    const list = S.s.dragons.slice().sort((a, b) => b.level - a.level);
    if (!list.length) h += empty('Bạn cần có rồng để tham gia đấu trường.');
    h += '<div class="mini-grid">' + list.map(d => {
      const adv = foes.reduce((m, f) => Math.max(m, elemMul(d.type, f.type)), 0);
      return `<div class="mini click ${arena.team.includes(d.id) ? 'on' : ''}" data-act="team" data-id="${d.id}">${dImg(d.type, dragonStage(d.level))}<p>${esc(d.name)}</p><small>Lv${d.level} ${DRAGON_BY_ID[d.type].el.map(e => ELEMENTS[e].icon).join('')}${adv > 1 ? ' <i class="good">khắc</i>' : ''}</small></div>`;
    }).join('') + '</div>';
    h += `<div class="center">${btn('fight', '⚔️ Chiến đấu!', {}, arena.team.length ? 'red big' : 'dim big')}</div>`;
    return h;
  },
};
A.stage = d => { arena.stage += +d.d; paint(); };
A.team = d => {
  const i = arena.team.indexOf(d.id);
  if (i >= 0) arena.team.splice(i, 1); else if (arena.team.length < 3) arena.team.push(d.id); else return toast('Đội tối đa 3 rồng', 'err');
  sfx('click'); paint();
};
A.fight = () => {
  if (!arena.team.length) return toast('Hãy chọn ít nhất 1 rồng', 'err');
  const st = arena.stage; close();
  startBattle(st, arena.team.slice(), () => { arena.stage = 0; open('arena'); });
};

// =====================================================================
// SÁCH RỒNG
// =====================================================================
let bookTab = 'all';
PANELS.book = {
  title: () => `📖 Sách Rồng <small>${Object.keys(S.s.book).length}/${DRAGONS.length}</small>`, cls: 'wide',
  render() {
    let h = tabs(bookTab, [['all', 'Tất cả'], ['common', 'Thường'], ['rare', 'Hiếm'], ['epic', 'Quý'], ['legend', 'Huyền thoại'], ['event', 'Sự kiện'], ['chart', '⚖️ Tương khắc']]);
    if (bookTab === 'chart') {
      h += '<table class="chart"><tr><th>Hệ</th><th>Khắc chế (×1.5)</th><th>Mở ở cấp</th></tr>';
      for (const [k, e] of Object.entries(ELEMENTS)) h += `<tr><td>${chip(k)}</td><td>${e.strong.map(chip).join(' ')}</td><td>${e.unlock}</td></tr>`;
      return h + '</table><p class="muted">Khi bị đối thủ khắc chế, sát thương chỉ còn ×0.7.</p>';
    }
    h += '<div class="mini-grid">';
    for (const d of DRAGONS.filter(x => bookTab === 'all' || x.rarity === bookTab)) {
      const known = S.s.book[d.id];
      h += `<div class="mini click" data-act="dinfo" data-id="${d.id}">${dImg(d.id, 2, known ? '' : 'shadow')}<p>${known ? d.name : '???'}</p><small>${d.el.map(e => ELEMENTS[e].icon).join('')} ${known ? '×' + known : ''}</small></div>`;
    }
    return h + '</div>';
  },
};
A.dinfo = d => open('dinfo', { id: d.id });
PANELS.dinfo = {
  title: p => DRAGON_BY_ID[p.id].name,
  render(p) {
    const d = DRAGON_BY_ID[p.id], known = S.s.book[d.id];
    const how = d.price != null ? `Mua trứng trong cửa hàng: 🪙 ${fmt(d.price)}`
      : d.rarity === 'event' ? 'Phần thưởng sự kiện đặc biệt'
        : `Lai giống các rồng mang hệ ${d.el.map(e => ELEMENTS[e].name).join(' + ')}`;
    return `<div class="center"><div class="stages">${[0, 1, 2].map(s => `<div>${dImg(d.id, s, known ? '' : 'shadow')}<small>${STAGE_NAMES[s]}</small></div>`).join('')}</div>
      <div>${chips(d)} ${rar(d.rarity)}</div><p class="desc">${known ? d.desc : 'Bạn chưa sở hữu loài rồng này.'}</p>
      <p>🪙 ${d.income}/phút (cấp 1) · ⏱ ấp ${fmtD(d.hatch * 1000)}</p><p><b>Cách có được:</b> ${how}</p>
      ${btn('open', '← Sách rồng', { p: 'book' }, 'ghost')}</div>`;
  },
};

// =====================================================================
// NHIỆM VỤ
// =====================================================================
let questTab = 'main';
PANELS.quests = {
  title: '📜 Nhiệm vụ',
  render() {
    let h = tabs(questTab, [['main', 'Nhiệm vụ chính'], ['daily', 'Hằng ngày'], ['login', 'Điểm danh']]);
    if (questTab === 'main') {
      const q = G.questInfo();
      h += `<div class="quest big ${q.done ? 'done' : ''}"><h4>${q.def.text}</h4>${bar(q.cur / q.def.n, 'green')}<p>${fmt(q.cur)}/${fmt(q.def.n)}</p>
        <p>Thưởng: ${rewardText(q.def.reward)}</p>${q.done ? btn('claimQuest', '🎁 Nhận thưởng', {}, 'gold') : ''}</div>
        <p class="muted">Hoàn thành chuỗi nhiệm vụ chính để mở khoá tính năng và nhận thưởng lớn.</p>`;
    } else if (questTab === 'daily') {
      const di = G.dailyInfo();
      di.tasks.forEach((t, i) => {
        h += `<div class="quest ${t.done ? 'done' : ''}"><h4>${t.def.text}</h4>${bar(t.cur / t.def.n, 'green')}<p>${t.cur}/${t.def.n} · Thưởng: ${rewardText(t.def.reward)}</p>
          ${t.claimed ? '<span class="good">✓ Đã nhận</span>' : t.done ? btn('claimDaily', 'Nhận', { i }, 'gold small') : ''}</div>`;
      });
      h += `<div class="quest ${di.allClaimed ? 'done' : ''}"><h4>🎁 Hoàn thành cả 3 nhiệm vụ</h4><p>Thưởng: ${rewardText(G.DAILY_BONUS)}</p>
        ${di.bonus ? '<span class="good">✓ Đã nhận</span>' : di.allClaimed ? btn('claimBonus', 'Nhận', {}, 'gold small') : ''}</div><p class="muted">Nhiệm vụ mới mỗi ngày lúc 0 giờ.</p>`;
    } else {
      const li = G.loginInfo();
      h += '<div class="login">' + LOGIN_REWARDS.map((r, i) => {
        const got = li.claimed ? i <= li.index : i < li.index, today = !li.claimed && i === li.index;
        return `<div class="day ${got ? 'got' : ''} ${today ? 'today' : ''}"><b>Ngày ${i + 1}</b><p>${rewardText(r)}</p>${got ? '✓' : ''}</div>`;
      }).join('') + '</div>';
      h += li.claimed ? '<p class="center good">Hôm nay đã điểm danh. Hẹn gặp lại ngày mai!</p>' : `<div class="center">${btn('claimLogin', '📅 Điểm danh', {}, 'gold big')}</div>`;
      h += '<p class="muted">Bỏ lỡ một ngày sẽ bắt đầu lại từ Ngày 1.</p>';
    }
    return h;
  },
};
const claimed = r => { if (result(r, `🎁 Nhận: ${rewardText(r.reward)}`, 'good')) paint(); };
A.claimQuest = () => claimed(G.claimQuest());
A.claimDaily = d => claimed(G.claimDaily(+d.i));
A.claimBonus = () => claimed(G.claimDailyBonus());
A.claimLogin = () => claimed(G.claimLogin());

// =====================================================================
// SỰ KIỆN
// =====================================================================
const bonusList = ev => Object.entries(ev.bonuses || {}).filter(([, v]) => Number(v) !== 1).map(([k, v]) => `<span class="pill">${EV.BONUS_KEYS[k]} ×${v}</span>`).join(' ');
PANELS.events = {
  title: '🎉 Sự kiện', cls: 'wide',
  render() {
    const ev = EV.activeEvent();
    let h = '';
    if (ev) {
      const th = EV.THEMES[ev.theme] || EV.THEMES.summer, p = EV.progress(ev);
      h += `<div class="ev-banner" style="--c:${th.color}"><div class="ev-icon">${th.icon}</div><div><h2>${esc(ev.name)}</h2><p>${esc(ev.desc)}</p>
        <p>⏳ Kết thúc sau ${tm(ev.end)}</p></div><div class="ev-tok">${ev.tokenIcon}<b>${fmt(p.tokens)}</b><small>${esc(ev.tokenName)}</small></div></div>`;
      const bl = bonusList(ev);
      if (bl) h += `<p><b>Ưu đãi:</b> ${bl}</p>`;
      h += `<p><b>Cách kiếm ${esc(ev.tokenName)}:</b> ${Object.entries(ev.earn || {}).filter(([, v]) => v > 0).map(([k, v]) => `<span class="pill">${EV.ACTIONS[k]} +${v}</span>`).join(' ')}</p>`;
      h += `<h3>Mốc thưởng (tích luỹ ${fmt(p.total)})</h3><div class="milestones">`;
      ev.milestones.forEach((m, i) => {
        const got = p.claimed.includes(i), can = p.total >= m.need && !got;
        h += `<div class="ms ${got ? 'got' : ''} ${can ? 'can' : ''}"><b>${fmt(m.need)} ${ev.tokenIcon}</b>${m.reward.egg ? eImg(m.reward.egg) : ''}<p>${rewardText(m.reward, ev)}</p>${bar(p.total / m.need, 'gold')}
          ${got ? '<span class="good">✓</span>' : can ? btn('claimMs', 'Nhận', { i }, 'gold small') : ''}</div>`;
      });
      h += '</div>';
      if (ev.shop.length) {
        h += `<h3>Cửa hàng sự kiện</h3><div class="grid">`;
        ev.shop.forEach((it, i) => {
          const b = p.bought[i] || 0, out = it.limit && b >= it.limit;
          const icon = it.reward.egg ? eImg(it.reward.egg) : it.reward.deco ? bImg(it.reward.deco) : `<div class="ci big">${it.reward.gems ? '💎' : it.reward.food ? '🍖' : '🪙'}</div>`;
          h += `<div class="card">${icon}<div class="cb"><h4>${rewardText(it.reward, ev)}</h4><p>${it.limit ? `Còn ${it.limit - b}/${it.limit} lượt` : 'Không giới hạn'}</p></div>
            ${out ? '<div class="lock">Hết lượt</div>' : btn('buyEv', `${ev.tokenIcon} ${fmt(it.cost)}`, { i }, p.tokens >= it.cost ? '' : 'dim')}</div>`;
        });
        h += '</div>';
      }
    } else h += empty('Hiện chưa có sự kiện nào đang diễn ra.');
    const up = EV.listEvents().filter(e => EV.eventStatus(e) === 'upcoming');
    if (up.length) {
      h += '<h3>Sắp diễn ra</h3>' + up.map(e => `<div class="drow"><div class="ci big">${EV.THEMES[e.theme]?.icon || '🎉'}</div><div class="cb"><h4>${esc(e.name)}</h4><p>${esc(e.desc)}</p><p>Bắt đầu sau ${tm(e.start)}</p></div></div>`).join('');
    }
    h += `<div class="row tools">${btn('open', '⚙️ Thiết lập sự kiện', { p: 'evAdmin' }, 'ghost small')}</div>`;
    return h;
  },
};
A.claimMs = d => claimed(G.claimMilestone(+d.i));
A.buyEv = d => claimed(G.buyEventItem(+d.i));

// ---------- Quản trị sự kiện ----------
const toInput = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const fromInput = s => new Date(s).getTime();
const STATUS = { active: '<span class="st on">Đang diễn ra</span>', upcoming: '<span class="st up">Sắp diễn ra</span>', ended: '<span class="st off">Đã kết thúc</span>' };

PANELS.evAdmin = {
  title: '⚙️ Thiết lập sự kiện', cls: 'wide', live: false,
  render() {
    let h = `<p class="muted">Tạo, chỉnh sửa và lên lịch sự kiện cho đảo. Chỉ một sự kiện được tính là "đang diễn ra" tại một thời điểm – nếu nhiều sự kiện trùng lịch, sự kiện bắt đầu gần nhất được ưu tiên.</p>
      <div class="row wrap"><select id="tplSel">${Object.entries(EV.TEMPLATE_NAMES).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
      <label>Kéo dài <input id="tplDays" type="number" min="1" value="7" style="width:60px"> ngày</label>
      ${btn('evFromTpl', '➕ Tạo từ mẫu')}${btn('evBlank', '➕ Sự kiện trống', {}, 'ghost')}</div>`;
    const list = EV.listEvents();
    if (!list.length) h += empty('Chưa có sự kiện nào.');
    for (const e of list) {
      const st = EV.eventStatus(e);
      h += `<div class="drow"><div class="ci big">${EV.THEMES[e.theme]?.icon || '🎉'}</div><div class="cb"><h4>${esc(e.name)} ${STATUS[st]}</h4>
        <p>${new Date(e.start).toLocaleString('vi-VN')} → ${new Date(e.end).toLocaleString('vi-VN')}</p>
        <p>${e.milestones.length} mốc thưởng · ${e.shop.length} vật phẩm · ${bonusList(e) || 'không ưu đãi'}</p></div>
        <div class="col">${btn('evEdit', '✏️ Sửa', { id: e.id }, 'small')}
        ${st !== 'active' ? btn('evStart', '▶ Bắt đầu ngay', { id: e.id }, 'green small') : btn('evEnd', '■ Kết thúc', { id: e.id }, 'small warn')}
        ${btn('evDel', '🗑', { id: e.id }, 'ghost small')}</div></div>`;
    }
    h += `<h3>Xuất / Nhập cấu hình (JSON)</h3><textarea id="evJson" rows="5" placeholder="Bấm Xuất để lấy JSON, hoặc dán JSON vào đây rồi bấm Nhập"></textarea>
      <div class="row">${btn('evExport', '⬇ Xuất', {}, 'ghost small')}${btn('evImport', '⬆ Nhập (thay thế toàn bộ)', {}, 'ghost small')}${btn('open', '← Sự kiện', { p: 'events' }, 'ghost small')}</div>`;
    return h;
  },
};
const evChanged = msg => { toast(msg, 'ok'); sfx('good'); save(); paint(); };
A.evFromTpl = () => {
  const days = Math.max(1, +$('#tplDays').value || 7);
  const ev = EV.fromTemplate($('#tplSel').value, now(), days);
  const last = EV.listEvents().reduce((m, e) => Math.max(m, e.end), 0);
  if (last > now()) { ev.start = last; ev.end = last + days * 86400000; }
  EV.saveEvent(ev); evChanged('Đã tạo sự kiện – xếp lịch sau sự kiện cuối cùng');
};
A.evBlank = () => open('evEdit', { ev: EV.blankEvent(), isNew: true });
A.evEdit = d => open('evEdit', { ev: JSON.parse(JSON.stringify(EV.eventById(d.id))) });
A.evStart = d => { EV.startNow(d.id); evChanged('Sự kiện đã bắt đầu'); };
A.evEnd = d => { EV.endNow(d.id); evChanged('Sự kiện đã kết thúc'); };
A.evDel = d => ask('Xoá sự kiện này? Tiến độ của người chơi trong sự kiện cũng bị xoá.', () => { EV.deleteEvent(d.id); evChanged('Đã xoá'); }, 'Xoá');
A.evExport = () => { $('#evJson').value = EV.exportEvents(); $('#evJson').select(); toast('Đã xuất JSON – có thể sao chép', 'ok'); };
A.evImport = () => {
  try { const n = EV.importEvents($('#evJson').value); evChanged(`Đã nhập ${n} sự kiện`); } catch (e) { toast('JSON không hợp lệ: ' + esc(e.message), 'err'); }
};

const RKINDS = { gold: '🪙 Vàng', food: '🍖 Thức ăn', gems: '💎 Đá quý', xp: '⭐ Kinh nghiệm', egg: '🥚 Trứng rồng', deco: '🎁 Trang trí' };
function rewardFields(prefix, r) {
  const k = Object.keys(r || {}).find(x => RKINDS[x]) || 'gold', v = r?.[k];
  let val;
  if (k === 'egg') val = `<select data-f="${prefix}.val">${DRAGONS.map(d => `<option value="${d.id}" ${d.id === v ? 'selected' : ''}>${d.name} (${RARITY[d.rarity].name})</option>`).join('')}</select>`;
  else if (k === 'deco') val = `<select data-f="${prefix}.val">${BUILDINGS.filter(b => b.kind === 'deco').map(b => `<option value="${b.id}" ${b.id === v ? 'selected' : ''}>${b.name}</option>`).join('')}</select>`;
  else val = `<input type="number" min="0" data-f="${prefix}.val" value="${Number(v) || 0}">`;
  return `<select data-f="${prefix}.kind" data-change="edKind">${Object.entries(RKINDS).map(([kk, n]) => `<option value="${kk}" ${kk === k ? 'selected' : ''}>${n}</option>`).join('')}</select>${val}`;
}
PANELS.evEdit = {
  title: p => (p.isNew ? '➕ Tạo sự kiện' : '✏️ Sửa sự kiện'), cls: 'wide', live: false,
  render(p) {
    const e = p.ev;
    let h = `<div class="form">
      <label>Tên sự kiện<input data-f="name" value="${esc(e.name)}"></label>
      <label>Mô tả<textarea data-f="desc" rows="2">${esc(e.desc)}</textarea></label>
      <div class="row wrap"><label>Chủ đề (thời tiết & màu sắc)<select data-f="theme">${Object.entries(EV.THEMES).map(([k, t]) => `<option value="${k}" ${k === e.theme ? 'selected' : ''}>${t.icon} ${t.name}</option>`).join('')}</select></label>
      <label>Tên điểm<input data-f="tokenName" value="${esc(e.tokenName)}"></label><label>Biểu tượng<input data-f="tokenIcon" value="${esc(e.tokenIcon)}" style="width:70px"></label></div>
      <div class="row wrap"><label>Bắt đầu<input type="datetime-local" data-f="start" value="${toInput(e.start)}"></label>
      <label>Kết thúc<input type="datetime-local" data-f="end" value="${toInput(e.end)}"></label></div>
      <h3>Hệ số ưu đãi (1 = bình thường)</h3><div class="row wrap">${Object.entries(EV.BONUS_KEYS).map(([k, n]) => `<label>${n}<input type="number" step="0.1" min="0.1" data-f="b.${k}" value="${e.bonuses?.[k] ?? 1}" style="width:80px"></label>`).join('')}</div>
      <h3>Điểm nhận được mỗi hành động</h3><div class="row wrap">${Object.entries(EV.ACTIONS).map(([k, n]) => `<label>${n}<input type="number" min="0" data-f="e.${k}" value="${e.earn?.[k] ?? 0}" style="width:70px"></label>`).join('')}</div>
      <h3>Mốc thưởng (theo tổng điểm tích luỹ)</h3>`;
    e.milestones.forEach((m, i) => { h += `<div class="row wrap rrow"><label>Cần<input type="number" min="1" data-f="ms.${i}.need" value="${m.need}" style="width:90px"></label>${rewardFields(`ms.${i}`, m.reward)}${btn('edDel', '✕', { list: 'milestones', i }, 'ghost small')}</div>`; });
    h += `${btn('edAdd', '+ Thêm mốc', { list: 'milestones' }, 'ghost small')}<h3>Cửa hàng đổi điểm</h3>`;
    e.shop.forEach((s, i) => { h += `<div class="row wrap rrow"><label>Giá<input type="number" min="1" data-f="sh.${i}.cost" value="${s.cost}" style="width:80px"></label><label>Giới hạn<input type="number" min="0" data-f="sh.${i}.limit" value="${s.limit || 0}" style="width:70px"></label>${rewardFields(`sh.${i}`, s.reward)}${btn('edDel', '✕', { list: 'shop', i }, 'ghost small')}</div>`; });
    h += `${btn('edAdd', '+ Thêm vật phẩm', { list: 'shop' }, 'ghost small')}<p class="muted">Giới hạn 0 = không giới hạn số lần đổi.</p></div>
      <div class="row end sticky">${btn('open', 'Huỷ', { p: 'evAdmin' }, 'ghost')}${btn('edSave', '💾 Lưu sự kiện', {}, 'green')}</div>`;
    return h;
  },
};
function readReward(q, prefix) {
  const k = q(prefix + '.kind'), v = q(prefix + '.val');
  if (k === 'egg') return { egg: DRAGON_BY_ID[v] ? v : 'lantern' };
  if (k === 'deco') return { deco: BUILDING_BY_ID[v]?.kind === 'deco' ? v : 'deco_evlantern' };
  return { [k]: Math.max(0, parseInt(v, 10) || 100) };
}
function gatherEditor() {
  const e = cur.params.ev, body = $('#mBody');
  const q = f => body.querySelector(`[data-f="${f}"]`)?.value;
  e.name = q('name') || ''; e.desc = q('desc') || ''; e.theme = q('theme'); e.tokenName = q('tokenName') || 'Điểm'; e.tokenIcon = q('tokenIcon') || '🎟️';
  e.start = fromInput(q('start')) || e.start; e.end = fromInput(q('end')) || e.end;
  e.bonuses = Object.fromEntries(Object.keys(EV.BONUS_KEYS).map(k => [k, Math.max(0.1, parseFloat(q('b.' + k)) || 1)]));
  e.earn = Object.fromEntries(Object.keys(EV.ACTIONS).map(k => [k, Math.max(0, parseInt(q('e.' + k), 10) || 0)]));
  e.milestones = e.milestones.map((m, i) => ({ need: parseInt(q(`ms.${i}.need`), 10) || 0, reward: readReward(q, `ms.${i}`) }));
  e.shop = e.shop.map((s, i) => ({ cost: parseInt(q(`sh.${i}.cost`), 10) || 0, limit: parseInt(q(`sh.${i}.limit`), 10) || 0, reward: readReward(q, `sh.${i}`) }));
  return e;
}
A.edKind = () => { gatherEditor(); paint(); };
A.edAdd = d => {
  const e = gatherEditor();
  if (d.list === 'milestones') e.milestones.push({ need: (e.milestones.at(-1)?.need || 0) + 100, reward: { gold: 1000 } });
  else e.shop.push({ cost: 50, limit: 5, reward: { food: 300 } });
  paint();
};
A.edDel = d => { const e = gatherEditor(); e[d.list].splice(+d.i, 1); paint(); };
A.edSave = () => {
  const e = gatherEditor(), r = EV.saveEvent(e);
  if (!r.ok) return result(r);
  save(); toast('💾 Đã lưu sự kiện', 'ok'); sfx('good'); open('evAdmin');
};

// =====================================================================
// CÀI ĐẶT
// =====================================================================
PANELS.settings = {
  title: '⚙️ Cài đặt', live: false,
  render() {
    const s = S.s;
    return `<div class="row wrap">${btn('sound', s.settings.sound ? '🔊 Âm thanh: Bật' : '🔇 Âm thanh: Tắt', {}, 'ghost')}${btn('open', '🎉 Thiết lập sự kiện', { p: 'evAdmin' }, 'ghost')}</div>
      <h3>Lưu trữ</h3><p class="muted">Game tự lưu trong trình duyệt. Bạn có thể sao lưu ra văn bản để chuyển sang máy khác.</p>
      <textarea id="saveTxt" rows="4" placeholder="Dữ liệu sao lưu"></textarea>
      <div class="row wrap">${btn('saveExport', '⬇ Sao lưu', {}, 'ghost small')}${btn('saveImport', '⬆ Khôi phục', {}, 'ghost small')}${btn('saveReset', '♻ Chơi lại từ đầu', {}, 'warn small')}</div>
      <h3>Công cụ thử nghiệm</h3><p class="muted">Dành cho người quản trị để kiểm tra sự kiện và tính năng.</p>
      <div class="row wrap">${btn('cheat', '+10K 🪙', { k: 'gold', v: 10000 }, 'ghost small')}${btn('cheat', '+2K 🍖', { k: 'food', v: 2000 }, 'ghost small')}${btn('cheat', '+50 💎', { k: 'gems', v: 50 }, 'ghost small')}${btn('cheat', '+500 điểm sự kiện', { k: 'tokens', v: 500 }, 'ghost small')}</div>
      <div class="row wrap">${btn('skipT', '⏩ +1 giờ', { ms: 3600000 }, 'ghost small')}${btn('skipT', '⏩ +1 ngày', { ms: 86400000 }, 'ghost small')}
      <label>Cấp <input id="lvIn" type="number" min="1" max="40" value="${s.level}" style="width:60px"></label>${btn('setLv', 'Đặt cấp', {}, 'ghost small')}</div>`;
  },
};
A.sound = () => { S.s.settings.sound = !S.s.settings.sound; setSound(S.s.settings.sound); paint(); };
A.saveExport = () => { $('#saveTxt').value = exportSave(); $('#saveTxt').select(); toast('Đã tạo bản sao lưu', 'ok'); };
A.saveImport = () => ask('Khôi phục sẽ ghi đè tiến trình hiện tại. Tiếp tục?', () => {
  try { importSave($('#saveTxt').value); location.reload(); } catch (e) { toast('Dữ liệu không hợp lệ', 'err'); }
});
A.saveReset = () => ask('Xoá toàn bộ tiến trình và chơi lại từ đầu?', () => { window.__noSave = true; resetSave(); location.reload(); }, 'Xoá hết');
A.cheat = d => { G.adminGive({ [d.k]: +d.v }); toast('Đã thêm', 'ok'); };
A.skipT = d => { G.adminSkipTime(+d.ms); toast(`⏩ Đã tua nhanh ${fmtD(+d.ms)}`, 'ok'); };
A.setLv = () => { G.adminSetLevel(+$('#lvIn').value || 1); toast('Đã đặt cấp', 'ok'); };

// =====================================================================
// CÔNG TRÌNH KHÁC & CHÀO MỪNG
// =====================================================================
PANELS.building = {
  title: p => BUILDING_BY_ID[G.buildingById(p.id)?.type]?.name || '',
  render(p) { const b = G.buildingById(p.id); if (!b) return null; return `<div class="center">${bImg(b.type)}</div>${buildingTools(b)}`; },
};
PANELS.welcome = {
  title: '🐉 Chào mừng đến Đảo Rồng Nhỏ!', live: false,
  render() {
    return `<div class="center">${dImg('ember', 0, 'huge')}</div>
      <ol class="steps"><li>🏠 Xây <b>Khu ở</b> đúng hệ cho rồng.</li><li>🥚 Mua <b>trứng</b> và ấp ở <b>Lò Ấp Trứng</b>.</li>
      <li>🌾 Trồng <b>thức ăn</b>, cho rồng ăn để lớn và kiếm nhiều vàng hơn.</li><li>💕 Lai giống ở <b>Vườn Se Duyên</b> để tìm loài mới.</li>
      <li>⚔️ Thử sức ở <b>Đấu Trường</b>, tham gia <b>Sự kiện</b> để nhận rồng hiếm.</li></ol>
      <p class="muted center">Kéo để di chuyển · cuộn/chụm để phóng to · chuột phải/hai ngón để xoay.</p>
      <div class="center">${btn('close', 'Bắt đầu!', {}, 'green big')}</div>`;
  },
};
PANELS.levelup = {
  title: '⭐ Lên cấp!', cls: 'reveal', live: false,
  render(p) {
    const newEggs = DRAGONS.filter(d => d.price != null && Math.max(...d.el.map(e => ELEMENTS[e].unlock)) === p.level);
    return `<div class="center"><div class="lvbig">${p.level}</div><p>Phần thưởng: ${rewardText(p.reward)}</p>
      ${newEggs.length ? `<p>Mở khoá: ${newEggs.map(d => `<b>${d.name}</b>`).join(', ')}</p>` : ''}
      ${btn('close', 'Tiếp tục', {}, 'green big')}</div>`;
  },
};

// =====================================================================
// HUD
// =====================================================================
let hudQueued = false;
function updateHud() {
  hudQueued = false;
  const s = S.s;
  $('#gold').textContent = fmt(s.gold); $('#food').textContent = fmt(s.food); $('#gems').textContent = fmt(s.gems);
  $('#lvl').textContent = s.level;
  const need = xpNeed(s.level);
  $('#xpbar').style.width = `${Math.min(100, s.xp / need * 100)}%`; $('#xpTxt').textContent = `${fmt(s.xp)}/${fmt(need)}`;
  const q = G.questInfo();
  $('#questBox').innerHTML = `<b>${q.done ? '🎁' : '📜'} ${q.def.text}</b>${bar(q.cur / q.def.n, 'green')}<small>${q.done ? 'Bấm để nhận thưởng!' : `${fmt(q.cur)}/${fmt(q.def.n)}`}</small>`;
  $('#questBox').classList.toggle('done', q.done);
  const di = G.dailyInfo(), li = G.loginInfo();
  const qDot = q.done || !li.claimed || di.tasks.some(t => t.done && !t.claimed) || (di.allClaimed && !di.bonus);
  $('#dockQuests').classList.toggle('dot', qDot);
  const ev = EV.activeEvent(), eb = $('#eventBtn');
  if (ev) {
    const th = EV.THEMES[ev.theme] || EV.THEMES.summer, p = EV.progress(ev);
    const can = ev.milestones.some((m, i) => p.total >= m.need && !p.claimed.includes(i));
    eb.classList.remove('hidden'); eb.style.setProperty('--c', th.color); eb.classList.toggle('dot', can);
    eb.innerHTML = `<span class="ei">${th.icon}</span><span><b>${esc(ev.name)}</b><small>⏳ ${fmtD(ev.end - now())} · ${ev.tokenIcon} ${fmt(p.tokens)}</small></span>`;
  } else eb.classList.add('hidden');
  $('#dockEvents').classList.toggle('dot', !!ev && eb.classList.contains('dot'));
  const ready = s.eggs.some(e => now() >= e.end) || G.breedInfo().state === 'done';
  $('#dockDragons').classList.toggle('dot', ready);
}
const queueHud = () => { if (!hudQueued) { hudQueued = true; requestAnimationFrame(updateHud); } };

function tick() {
  let expired = false;
  document.querySelectorAll('#modal [data-end]').forEach(el => {
    const end = +el.dataset.end, left = end - now();
    if (el.classList.contains('tm')) el.textContent = left > 0 ? fmtD(left) : '✓';
    else { const st = +el.dataset.start; el.style.width = `${Math.min(100, Math.max(0, (now() - st) / (end - st) * 100))}%`; }
    if (left <= 0 && !el.dataset.x) { el.dataset.x = '1'; expired = true; }
  });
  document.querySelectorAll('#modal .live-gold').forEach(el => {
    const b = G.buildingById(el.dataset.hab); if (b) el.textContent = fmt(G.habitatInfo(b).stored);
  });
  if (expired && cur && PANELS[cur.name].live !== false) paint();
  updateHud();
}

// =====================================================================
// KHỞI TẠO
// =====================================================================
export function initUI(w, { fresh }) {
  world = w;
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
    const f = A[el.dataset.act];
    if (f) { e.preventDefault(); f(el.dataset, el); }
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-change]');
    if (el && A[el.dataset.change]) A[el.dataset.change](el.dataset, el);
  });
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (world.isPlacing()) world.cancelPlacement(); else close(); } });
  $('#questBox').addEventListener('click', () => { questTab = 'main'; open('quests'); });
  $('#eventBtn').addEventListener('click', () => open('events'));
  $('#gemsPill').addEventListener('click', () => { shopTab = 'gems'; open('shop'); });
  $('#placeOk').addEventListener('click', () => {
    const r = world.confirmPlacement();
    if (r.ok) { sfx('build'); const def = BUILDING_BY_ID[r.building?.type]; if (def?.time) toast(`🔨 Đang xây ${def.name}…`, 'ok'); }
    else if (r.msg) { toast(r.msg, 'err'); sfx('error'); }
  });
  $('#placeCancel').addEventListener('click', () => world.cancelPlacement());

  bus.on('placement', valid => {
    const bar = $('#placeBar');
    bar.classList.toggle('hidden', valid === null);
    document.body.classList.toggle('placing', valid !== null);
    if (valid !== null) { $('#placeMsg').textContent = valid ? 'Kéo để chọn vị trí rồi bấm ✓' : 'Vị trí bị chặn – kéo sang chỗ trống'; $('#placeOk').classList.toggle('dim', !valid); }
  });
  bus.on('pick:building', id => {
    const b = G.buildingById(id); if (!b) return;
    const def = BUILDING_BY_ID[b.type];
    sfx('click');
    switch (def.kind) {
      case 'habitat':
        if (G.isBuilt(b) && G.habitatInfo(b).stored >= 1) { A.collect({ id }); return; }
        open('habitat', { id }); return;
      case 'farm':
        if (G.farmState(b).state === 'ready') { doHarvest(b); return; }
        open('farm', { id }); return;
      case 'hatchery': open('hatchery'); return;
      case 'breeding':
        if (G.breedInfo().state === 'done') { open('breeding'); A.breedCollect(); return; }
        open('breeding'); return;
      case 'arena': open('arena'); return;
      case 'altar': open('events'); return;
      default: open('building', { id });
    }
  });
  bus.on('pick:dragon', id => {
    const d = G.dragonById(id); if (!d) return;
    sfx('pet');
    const pos = world.dragonPos(id); if (pos) { pos.y += 2.2; world.floatText(pos, '❤️', ''); }
    open('habitat', { id: d.habitatId });
  });
  bus.on('levelup', (level, reward) => {
    sfx('level');
    if (!cur || PANELS[cur.name].live !== false) open('levelup', { level, reward });
    else toast(`⭐ Lên cấp ${level}! ${rewardText(reward)}`, 'ok');
  });
  bus.on('tokens', () => { const eb = $('#eventBtn'); eb.classList.remove('bump'); void eb.offsetWidth; eb.classList.add('bump'); });
  for (const ev of ['change', 'buildings', 'eggs', 'dragons', 'events']) { bus.on(ev, schedulePaint); bus.on(ev, queueHud); }
  setInterval(tick, 500);
  updateHud();
  if (fresh) open('welcome');
}
