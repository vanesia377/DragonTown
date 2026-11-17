// Luật chơi: kinh tế, công trình, rồng, ấp trứng, lai giống, nhiệm vụ.
import {
  GRID, EXPANSIONS, ELEMENTS, RARITY, DRAGONS, DRAGON_BY_ID, BUILDING_BY_ID, HABITAT_LEVELS,
  HATCHERY_LEVELS, CROP_BY_ID, QUESTS, DAILY_POOL, LOGIN_REWARDS, GEM_EXCHANGE, MAX_DRAGON_LEVEL,
  FEEDS_PER_LEVEL, MAX_LEVEL, BREED_MIN_LEVEL, xpNeed, feedCost, dragonIncome,
} from './data.js';
import { S, bus, now, uid, save, load, rollDaily, dayKey } from './state.js';
import * as EV from './events.js';

const ok = (extra = {}) => ({ ok: true, ...extra });
const fail = msg => ({ ok: false, msg });
export const fmt = n => {
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'T';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'Tr';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('vi-VN');
};

export function init() {
  const fresh = load();
  if (fresh) EV.seedEvents();
  S.s.decoBag ||= {};
  rollDaily();
  return fresh;
}

// ---------- Tài nguyên & phần thưởng ----------
export function stat(name, n = 1) {
  S.s.stats[name] = (S.s.stats[name] || 0) + n;
}

export function absStat(name) {
  const s = S.s;
  switch (name) {
    case 'dragons': return s.dragons.length;
    case 'species': return Object.keys(s.book).length;
    case 'maxDragonLevel': return s.dragons.reduce((m, d) => Math.max(m, d.level), 0);
    case 'arenaStage': return s.arena.stage;
    default: return 0;
  }
}

export function addXp(n) {
  const s = S.s;
  n = Math.round(n * EV.bonus('xp'));
  if (n <= 0) return 0;
  s.xp += n;
  while (s.level < MAX_LEVEL && s.xp >= xpNeed(s.level)) {
    s.xp -= xpNeed(s.level);
    s.level++;
    const reward = { gold: 100 * s.level, gems: 2 };
    s.gold += reward.gold; s.gems += reward.gems;
    bus.emit('levelup', s.level, reward);
  }
  return n;
}

export function rewardText(r, ev = EV.activeEvent()) {
  const parts = [];
  if (r.gold) parts.push(`${fmt(r.gold)} 🪙`);
  if (r.food) parts.push(`${fmt(r.food)} 🍖`);
  if (r.gems) parts.push(`${r.gems} 💎`);
  if (r.xp) parts.push(`${r.xp} ⭐`);
  if (r.tokens) parts.push(`${r.tokens} ${ev ? ev.tokenIcon : '🎟️'}`);
  if (r.egg) parts.push(`🥚 ${DRAGON_BY_ID[r.egg]?.name || 'Trứng'}`);
  if (r.deco) parts.push(`🎁 ${BUILDING_BY_ID[r.deco]?.name || 'Trang trí'}`);
  return parts.join('  ');
}

export function grant(r) {
  const s = S.s;
  if (r.gold) { s.gold += r.gold; stat('goldEarned', r.gold); }
  if (r.food) s.food += r.food;
  if (r.gems) s.gems += r.gems;
  if (r.xp) addXp(r.xp);
  if (r.tokens) EV.addTokens(r.tokens);
  if (r.egg && DRAGON_BY_ID[r.egg]) addEgg(r.egg);
  if (r.deco && BUILDING_BY_ID[r.deco]) s.decoBag[r.deco] = (s.decoBag[r.deco] || 0) + 1;
  bus.emit('change');
}

// ---------- Lưới & công trình ----------
export const unlockedHalf = () => EXPANSIONS[S.s.expansion].half;
export function cellUnlocked(x, z) {
  const h = unlockedHalf(), c = GRID / 2;
  return x >= c - h && x < c + h && z >= c - h && z < c + h;
}

export function canPlace(typeId, x, z, ignoreId = null) {
  const def = BUILDING_BY_ID[typeId];
  for (let i = 0; i < def.w; i++) for (let j = 0; j < def.d; j++) {
    if (!cellUnlocked(x + i, z + j)) return false;
  }
  for (const b of S.s.buildings) {
    if (b.id === ignoreId) continue;
    const o = BUILDING_BY_ID[b.type];
    if (x < b.x + o.w && x + def.w > b.x && z < b.z + o.d && z + def.d > b.z) return false;
  }
  return true;
}

// Tìm ô trống gần tâm nhất cho một loại công trình
export function findSpot(typeId, ignoreId = null, near = null) {
  const c = GRID / 2;
  const nx = near ? near.x : c - 1, nz = near ? near.z : c - 1;
  let best = null, bd = Infinity;
  for (let x = 0; x < GRID; x++) for (let z = 0; z < GRID; z++) {
    if (!canPlace(typeId, x, z, ignoreId)) continue;
    const d = (x - nx) ** 2 + (z - nz) ** 2;
    if (d < bd) { bd = d; best = { x, z }; }
  }
  return best;
}

export const buildingById = id => S.s.buildings.find(b => b.id === id);
export const countOf = typeId => S.s.buildings.filter(b => b.type === typeId).length;
export const countKind = kind => S.s.buildings.filter(b => BUILDING_BY_ID[b.type].kind === kind).length;
export const isBuilt = b => !b.readyAt || now() >= b.readyAt;

export function limitOf(def) {
  const lv = S.s.level;
  if (def.kind === 'habitat') return 3 + lv;
  if (def.kind === 'farm') return Math.min(12, 2 + Math.floor(lv / 2));
  if (def.unique) return 1;
  return Infinity;
}
const countFor = def => (def.kind === 'habitat' || def.kind === 'farm' ? countKind(def.kind) : countOf(def.id));

export function canBuy(def) {
  const s = S.s;
  if (def.eventOnly) return (s.decoBag[def.id] || 0) > 0 ? ok() : fail('Chỉ đổi được trong sự kiện');
  if (def.unique) return fail('Mỗi đảo chỉ có một công trình này');
  if ((def.level || 1) > s.level) return fail(`Cần cấp ${def.level}`);
  if (countFor(def) >= limitOf(def)) return fail('Đã đạt giới hạn, hãy lên cấp để xây thêm');
  if (def.gems && s.gems < def.gems) return fail('Không đủ đá quý');
  if (def.cost && s.gold < def.cost) return fail('Không đủ vàng');
  return ok();
}

export function buyBuilding(typeId, x, z) {
  const s = S.s, def = BUILDING_BY_ID[typeId];
  const inBag = (s.decoBag[typeId] || 0) > 0;
  if (!inBag) {
    const c = canBuy(def);
    if (!c.ok) return c;
  }
  if (!canPlace(typeId, x, z)) return fail('Không thể đặt ở đây');
  if (inBag) {
    if (--s.decoBag[typeId] <= 0) delete s.decoBag[typeId];
  } else {
    if (def.gems) s.gems -= def.gems;
    if (def.cost) s.gold -= def.cost;
  }
  const b = { id: 'b' + uid(), type: typeId, x, z, level: 1 };
  if (def.time) b.readyAt = now() + def.time * 1000;
  if (def.kind === 'habitat') { b.stored = 0; b.t = b.readyAt || now(); }
  s.buildings.push(b);
  stat('build_' + def.kind);
  addXp(def.xp || Math.round(Math.sqrt(def.cost || 100)));
  bus.emit('buildings'); bus.emit('change');
  return ok({ building: b });
}

export function moveBuilding(id, x, z) {
  const b = buildingById(id);
  if (!b || !canPlace(b.type, x, z, id)) return fail('Không thể đặt ở đây');
  b.x = x; b.z = z;
  bus.emit('buildings');
  return ok();
}

export function sellBuilding(id) {
  const s = S.s, b = buildingById(id);
  if (!b) return fail('Không tìm thấy');
  const def = BUILDING_BY_ID[b.type];
  if (def.unique) return fail('Không thể bán công trình này');
  if (def.kind === 'habitat' && dragonsIn(id).length) return fail('Hãy chuyển rồng đi trước');
  const refund = Math.round((def.cost || 0) * 0.25);
  if (def.kind === 'habitat') s.gold += Math.floor(habitatInfo(b).stored);
  s.gold += refund;
  s.buildings = s.buildings.filter(o => o.id !== id);
  bus.emit('buildings'); bus.emit('change');
  return ok({ refund });
}

export function expandInfo() {
  const next = EXPANSIONS[S.s.expansion + 1];
  return next || null;
}
export function expand() {
  const s = S.s, next = expandInfo();
  if (!next) return fail('Đảo đã mở rộng tối đa');
  if (s.level < next.level) return fail(`Cần cấp ${next.level}`);
  if (s.gold < next.cost) return fail('Không đủ vàng');
  s.gold -= next.cost; s.expansion++;
  stat('expand'); addXp(100 * s.expansion);
  bus.emit('expand'); bus.emit('change');
  return ok();
}

// ---------- Khu ở ----------
export const dragonsIn = habId => S.s.dragons.filter(d => d.habitatId === habId);
export const dragonById = id => S.s.dragons.find(d => d.id === id);

export function habitatInfo(b) {
  const def = BUILDING_BY_ID[b.type], L = HABITAT_LEVELS[b.level - 1];
  const dragons = dragonsIn(b.id);
  const rate = dragons.reduce((sum, d) => sum + dragonIncome(d.type, d.level), 0); // vàng / phút
  const cap = Math.round(def.cap * L.cap);
  const dt = Math.max(0, now() - (b.t || now()));
  const stored = Math.min(cap, (b.stored || 0) + rate * dt / 60000);
  return { def, slots: L.slots, cap, rate, stored, dragons, full: stored >= cap };
}
function settle(b) {
  if (!b) return;
  b.stored = habitatInfo(b).stored;
  b.t = Math.max(now(), b.readyAt || 0);
}

export function collect(b) {
  if (!isBuilt(b)) return fail('Đang xây dựng');
  const info = habitatInfo(b);
  const base = Math.floor(info.stored);
  if (base < 1) return fail('Chưa có vàng');
  const amount = Math.round(base * EV.bonus('gold'));
  b.stored = info.stored - base; b.t = now();
  S.s.gold += amount;
  stat('collect'); stat('goldEarned', amount);
  const xp = addXp(1 + Math.floor(Math.sqrt(base) / 4));
  const tokens = EV.earnTokens('collect');
  bus.emit('change');
  return ok({ amount, xp, tokens });
}

export function upgradeCost(b) {
  const next = HABITAT_LEVELS[b.level];
  return next ? Math.round(BUILDING_BY_ID[b.type].cost * next.costMul) : null;
}
export function upgradeHabitat(b) {
  const cost = upgradeCost(b);
  if (cost == null) return fail('Đã đạt cấp tối đa');
  if (S.s.gold < cost) return fail('Không đủ vàng');
  settle(b);
  S.s.gold -= cost; b.level++;
  addXp(Math.round(Math.sqrt(cost)));
  bus.emit('buildings'); bus.emit('change');
  return ok();
}

// Khu ở phù hợp (cùng hệ, còn chỗ, đã xây xong)
export function habitatsFor(typeId, includeFull = false) {
  const els = DRAGON_BY_ID[typeId].el;
  return S.s.buildings.filter(b => {
    const def = BUILDING_BY_ID[b.type];
    if (def.kind !== 'habitat' || !els.includes(def.el) || !isBuilt(b)) return false;
    return includeFull || dragonsIn(b.id).length < HABITAT_LEVELS[b.level - 1].slots;
  });
}

// ---------- Rồng ----------
export function feed(dragonId) {
  const s = S.s, d = dragonById(dragonId);
  if (!d) return fail('Không tìm thấy rồng');
  if (d.level >= MAX_DRAGON_LEVEL) return fail('Rồng đã đạt cấp tối đa');
  const cost = feedCost(d.level);
  if (s.food < cost) return fail('Không đủ thức ăn, hãy trồng thêm');
  s.food -= cost;
  d.feeds++;
  let leveled = false;
  if (d.feeds >= FEEDS_PER_LEVEL) {
    settle(buildingById(d.habitatId));
    d.feeds = 0; d.level++; leveled = true;
  }
  stat('feed'); addXp(2);
  const tokens = EV.earnTokens('feed');
  bus.emit('change');
  if (leveled) bus.emit('dragons');
  return ok({ leveled, tokens, level: d.level });
}

export const sellValue = d => Math.round(DRAGON_BY_ID[d.type].income * 15 * (1 + d.level * 0.2));

export function sellDragon(dragonId) {
  const s = S.s, d = dragonById(dragonId);
  if (!d) return fail('Không tìm thấy rồng');
  if (s.breeding && !s.breeding.done && (s.breeding.a === d.id || s.breeding.b === d.id)) {
    return fail('Rồng đang trong Vườn Se Duyên');
  }
  settle(buildingById(d.habitatId));
  const value = sellValue(d);
  s.gold += value;
  s.dragons = s.dragons.filter(o => o.id !== dragonId);
  bus.emit('dragons'); bus.emit('change');
  return ok({ value });
}

export function moveDragon(dragonId, habId) {
  const d = dragonById(dragonId), target = buildingById(habId);
  if (!d || !target) return fail('Không hợp lệ');
  if (!habitatsFor(d.type).some(h => h.id === habId)) return fail('Khu ở không phù hợp hoặc đã đầy');
  settle(buildingById(d.habitatId)); settle(target);
  d.habitatId = habId;
  bus.emit('dragons'); bus.emit('change');
  return ok();
}

export function renameDragon(dragonId, name) {
  const d = dragonById(dragonId);
  name = String(name || '').trim().slice(0, 18);
  if (d && name) { d.name = name; bus.emit('change'); }
}

// ---------- Vườn ----------
export function farmState(b) {
  if (!b.crop) return { state: 'idle' };
  const t = now();
  if (t >= b.crop.end) return { state: 'ready', crop: CROP_BY_ID[b.crop.id], progress: 1 };
  return {
    state: 'growing', crop: CROP_BY_ID[b.crop.id], left: b.crop.end - t,
    progress: (t - b.crop.start) / (b.crop.end - b.crop.start),
  };
}

export function plant(b, cropId) {
  const s = S.s, crop = CROP_BY_ID[cropId];
  if (!isBuilt(b)) return fail('Đang xây dựng');
  if (b.crop) return fail('Vườn đang trồng');
  if (crop.level > s.level) return fail(`Cần cấp ${crop.level}`);
  if (s.gold < crop.cost) return fail('Không đủ vàng');
  s.gold -= crop.cost;
  b.crop = { id: cropId, start: now(), end: now() + crop.time * 1000 };
  bus.emit('buildings'); bus.emit('change');
  return ok();
}

export function harvest(b) {
  const st = farmState(b);
  if (st.state !== 'ready') return fail('Chưa thu hoạch được');
  const amount = Math.round(st.crop.food * EV.bonus('food'));
  S.s.food += amount;
  b.lastCrop = b.crop.id; b.crop = null;
  stat('harvest');
  const xp = addXp(st.crop.xp);
  const tokens = EV.earnTokens('harvest');
  bus.emit('buildings'); bus.emit('change');
  return ok({ amount, xp, tokens });
}

// ---------- Trứng & ấp ----------
export const hatchery = () => S.s.buildings.find(b => b.type === 'hatchery');
export const hatcherySlots = () => HATCHERY_LEVELS[hatchery().level - 1].slots;
export const hatchTime = typeId => Math.max(3, DRAGON_BY_ID[typeId].hatch / EV.bonus('hatchSpeed')) * 1000;

export function addEgg(typeId) {
  const s = S.s;
  if (s.eggs.length < hatcherySlots()) {
    const t = now();
    s.eggs.push({ id: 'e' + uid(), type: typeId, start: t, end: t + hatchTime(typeId) });
    bus.emit('eggs');
    return 'hatchery';
  }
  s.eggBag.push(typeId);
  bus.emit('eggs');
  return 'bag';
}

export function eggBuyable(def) {
  if (def.price == null) return fail('Chỉ có được nhờ lai giống');
  const lv = Math.max(...def.el.map(e => ELEMENTS[e].unlock));
  if (S.s.level < lv) return fail(`Cần cấp ${lv}`);
  if (S.s.gold < def.price) return fail('Không đủ vàng');
  return ok();
}

export function buyEgg(typeId) {
  const def = DRAGON_BY_ID[typeId];
  const c = eggBuyable(def);
  if (!c.ok) return c;
  S.s.gold -= def.price;
  const where = addEgg(typeId);
  stat('buyEgg');
  bus.emit('change');
  return ok({ where });
}

export function bagToHatchery(index) {
  const s = S.s;
  if (s.eggs.length >= hatcherySlots()) return fail('Lò ấp đã đầy');
  const [typeId] = s.eggBag.splice(index, 1);
  if (!typeId) return fail('Không có trứng');
  addEgg(typeId);
  bus.emit('change');
  return ok();
}

export function hatch(eggId, habId) {
  const s = S.s, egg = s.eggs.find(e => e.id === eggId);
  if (!egg) return fail('Không tìm thấy trứng');
  if (now() < egg.end) return fail('Trứng chưa nở');
  if (!habitatsFor(egg.type).some(h => h.id === habId)) return fail('Khu ở không phù hợp hoặc đã đầy');
  settle(buildingById(habId));
  const def = DRAGON_BY_ID[egg.type];
  const dragon = { id: 'd' + uid(), type: egg.type, name: def.name, level: 1, feeds: 0, habitatId: habId };
  s.dragons.push(dragon);
  s.eggs = s.eggs.filter(e => e.id !== eggId);
  const isNew = !s.book[egg.type];
  s.book[egg.type] = (s.book[egg.type] || 0) + 1;
  stat('hatch');
  addXp(RARITY[def.rarity].xp * (isNew ? 2 : 1));
  const tokens = EV.earnTokens('hatch');
  // tự đưa trứng trong túi vào chỗ vừa trống
  if (s.eggBag.length) addEgg(s.eggBag.shift());
  bus.emit('dragons'); bus.emit('eggs'); bus.emit('change');
  return ok({ dragon, isNew, tokens });
}

export function upgradeHatchery() {
  const s = S.s, h = hatchery(), next = HATCHERY_LEVELS[h.level];
  if (!next) return fail('Đã đạt cấp tối đa');
  if (s.level < next.level) return fail(`Cần cấp ${next.level}`);
  if (s.gold < next.cost) return fail('Không đủ vàng');
  s.gold -= next.cost; h.level++;
  if (s.eggBag.length) addEgg(s.eggBag.shift());
  bus.emit('buildings'); bus.emit('eggs'); bus.emit('change');
  return ok();
}

// ---------- Lai giống ----------
export function breedCandidates(typeA, typeB) {
  const pool = new Set([...DRAGON_BY_ID[typeA].el, ...DRAGON_BY_ID[typeB].el]);
  return DRAGONS.filter(d => d.rarity !== 'event' && d.el.every(e => pool.has(e)));
}

export function breedInfo() {
  const br = S.s.breeding;
  if (!br) return { state: 'idle' };
  const t = now();
  if (t >= br.end) return { state: 'done', br };
  return { state: 'busy', br, left: br.end - t, progress: (t - br.start) / (br.end - br.start) };
}

export function startBreeding(aId, bId) {
  const s = S.s;
  if (s.breeding) return fail('Vườn Se Duyên đang bận');
  const a = dragonById(aId), b = dragonById(bId);
  if (!a || !b || a.id === b.id) return fail('Hãy chọn hai rồng khác nhau');
  if (a.level < BREED_MIN_LEVEL || b.level < BREED_MIN_LEVEL) return fail(`Rồng cần đạt cấp ${BREED_MIN_LEVEL}`);
  const cands = breedCandidates(a.type, b.type);
  let total = cands.reduce((sum, d) => sum + RARITY[d.rarity].weight, 0);
  let r = Math.random() * total, result = cands[0];
  for (const d of cands) { r -= RARITY[d.rarity].weight; if (r <= 0) { result = d; break; } }
  const t = now();
  const dur = Math.max(5, result.hatch * 0.75 / EV.bonus('breedSpeed')) * 1000;
  s.breeding = { a: a.id, b: b.id, typeA: a.type, typeB: b.type, result: result.id, start: t, end: t + dur };
  stat('breed'); addXp(15);
  const tokens = EV.earnTokens('breed');
  bus.emit('buildings'); bus.emit('change');
  return ok({ tokens });
}

export function collectBreeding() {
  const s = S.s, info = breedInfo();
  if (info.state !== 'done') return fail('Chưa xong');
  const typeId = s.breeding.result;
  s.breeding = null;
  const where = addEgg(typeId);
  bus.emit('buildings'); bus.emit('change');
  return ok({ typeId, where });
}

// ---------- Tăng tốc bằng đá quý ----------
export const skipCost = ms => Math.max(1, Math.ceil(ms / 60000 / 3));

export function skip(kind, id) {
  const s = S.s, t = now();
  let target, key = 'end';
  if (kind === 'egg') target = s.eggs.find(e => e.id === id);
  else if (kind === 'breed') target = s.breeding;
  else if (kind === 'farm') target = buildingById(id)?.crop;
  else if (kind === 'build') { target = buildingById(id); key = 'readyAt'; }
  if (!target || !(target[key] > t)) return fail('Không cần tăng tốc');
  const cost = skipCost(target[key] - t);
  if (s.gems < cost) return fail('Không đủ đá quý');
  s.gems -= cost;
  const shift = target[key] - t;
  target[key] = t;
  if (target.start != null) target.start -= shift;
  if (kind === 'build' && target.t != null) target.t = t;
  bus.emit('buildings'); bus.emit('eggs'); bus.emit('change');
  return ok({ cost });
}

export function exchangeGems(i) {
  const s = S.s, ex = GEM_EXCHANGE[i];
  if (!ex) return fail('Không hợp lệ');
  if (s.gems < ex.gems) return fail('Không đủ đá quý');
  s.gems -= ex.gems;
  if (ex.gold) s.gold += ex.gold;
  if (ex.food) s.food += ex.food;
  bus.emit('change');
  return ok();
}

// ---------- Nhiệm vụ ----------
export function questInfo() {
  const s = S.s, q = s.quest;
  let def;
  if (q.index < QUESTS.length) def = QUESTS[q.index];
  else {
    const k = q.index - QUESTS.length + 1;
    def = { text: `Kiếm thêm ${fmt(5000 * k)} vàng`, stat: 'goldEarned', n: 5000 * k, base: true, reward: { gems: 3, xp: 100 * k } };
  }
  const cur = def.abs ? absStat(def.abs) : (s.stats[def.stat] || 0) - (def.base ? q.base : 0);
  return { def, cur: Math.min(cur, def.n), done: cur >= def.n };
}

export function claimQuest() {
  const info = questInfo();
  if (!info.done) return fail('Chưa hoàn thành');
  S.s.quest.index++;
  S.s.quest.base = S.s.stats.goldEarned || 0;
  grant(info.def.reward);
  return ok({ reward: info.def.reward });
}

export function dailyInfo() {
  rollDaily();
  const s = S.s;
  const tasks = s.daily.tasks.map(t => {
    const def = DAILY_POOL.find(p => p.id === t.id);
    const cur = Math.min(def.n, (s.stats[def.stat] || 0) - t.base);
    return { def, cur, done: cur >= def.n, claimed: t.claimed };
  });
  return { tasks, allClaimed: tasks.every(t => t.claimed), bonus: s.daily.bonus };
}

export function claimDaily(i) {
  const info = dailyInfo(), t = info.tasks[i];
  if (!t || !t.done || t.claimed) return fail('Chưa hoàn thành');
  S.s.daily.tasks[i].claimed = true;
  grant(t.def.reward);
  return ok({ reward: t.def.reward });
}

export const DAILY_BONUS = { gems: 3, tokens: 30 };
export function claimDailyBonus() {
  const info = dailyInfo();
  if (!info.allClaimed || info.bonus) return fail('Chưa đủ điều kiện');
  S.s.daily.bonus = true;
  grant(DAILY_BONUS);
  return ok({ reward: DAILY_BONUS });
}

export function loginInfo() {
  const s = S.s, today = dayKey();
  const claimed = s.login.day === today;
  const yesterday = dayKey(now() - 86400000);
  const streak = claimed ? s.login.streak : (s.login.day === yesterday ? s.login.streak : 0);
  const index = claimed ? (streak - 1) % LOGIN_REWARDS.length : streak % LOGIN_REWARDS.length;
  return { claimed, index, streak };
}

export function claimLogin() {
  const info = loginInfo();
  if (info.claimed) return fail('Hôm nay đã nhận rồi');
  const reward = LOGIN_REWARDS[info.index];
  S.s.login = { day: dayKey(), streak: info.streak + 1 };
  grant(reward);
  return ok({ reward });
}

// ---------- Sự kiện ----------
export function claimMilestone(i) {
  const ev = EV.activeEvent();
  if (!ev) return fail('Không có sự kiện đang diễn ra');
  const p = EV.progress(ev), m = ev.milestones[i];
  if (!m || p.claimed.includes(i)) return fail('Đã nhận rồi');
  if (p.total < m.need) return fail('Chưa đủ điểm');
  p.claimed.push(i);
  grant(m.reward);
  return ok({ reward: m.reward });
}

export function buyEventItem(i) {
  const ev = EV.activeEvent();
  if (!ev) return fail('Không có sự kiện đang diễn ra');
  const p = EV.progress(ev), it = ev.shop[i];
  if (!it) return fail('Không hợp lệ');
  const bought = p.bought[i] || 0;
  if (it.limit && bought >= it.limit) return fail('Đã đổi hết lượt');
  if (p.tokens < it.cost) return fail(`Không đủ ${ev.tokenName}`);
  p.tokens -= it.cost; p.bought[i] = bought + 1;
  grant(it.reward);
  return ok({ reward: it.reward });
}

// ---------- Đấu trường ----------
export function battleResult(stage, win) {
  const s = S.s;
  if (!win) { stat('battleLose'); bus.emit('change'); return { reward: { gold: 20 * stage } }; }
  const first = stage > s.arena.stage;
  const reward = { gold: 100 + 60 * stage, xp: 10 + 6 * stage };
  if (first) { reward.gems = stage % 5 === 0 ? 5 : 1; s.arena.stage = stage; }
  stat('battleWin');
  const tokens = EV.earnTokens('battleWin');
  grant(reward);
  return { reward, tokens, first };
}

// ---------- Công cụ quản trị (thử nghiệm) ----------
export function adminGive(r) { grant(r); }
export function adminSkipTime(ms) { S.s.timeSkew += ms; bus.emit('buildings'); bus.emit('eggs'); bus.emit('events'); bus.emit('change'); }
export function adminSetLevel(lv) { S.s.level = Math.max(1, Math.min(MAX_LEVEL, lv)); S.s.xp = 0; bus.emit('change'); }

export { save };
