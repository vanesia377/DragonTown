// Trạng thái game, lưu/tải, bus sự kiện nội bộ.
import { DAILY_POOL } from './data.js';

const SAVE_KEY = 'dragontown.save.v1';

export const bus = {
  _h: {},
  on(ev, fn) { (this._h[ev] ||= []).push(fn); },
  emit(ev, a, b) { (this._h[ev] || []).forEach(fn => fn(a, b)); },
};

// S.s là đối tượng trạng thái hiện tại (có thể bị thay khi nạp save)
export const S = { s: null };

export const now = () => Date.now() + (S.s?.timeSkew || 0);
export const uid = () => (S.s.nextId++).toString(36);
export const dayKey = (t = now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export function newState() {
  const t = Date.now();
  return {
    v: 1, createdAt: t, lastSeen: t, timeSkew: 0, nextId: 10,
    gold: 800, food: 60, gems: 25, xp: 0, level: 1,
    expansion: 0,
    buildings: [
      { id: 'b1', type: 'hatchery', x: 6, z: 6, level: 1 },
      { id: 'b2', type: 'altar', x: 11, z: 6, level: 1 },
      { id: 'b3', type: 'breeding', x: 15, z: 6, level: 1 },
      { id: 'b4', type: 'arena', x: 6, z: 15, level: 1 },
    ],
    dragons: [],           // {id,type,name,level,feeds,habitatId}
    eggs: [],              // đang ấp: {id,type,start,end}
    eggBag: [],            // trứng chờ: [typeId]
    decoBag: {},           // đồ trang trí nhận từ sự kiện: {typeId: số lượng}
    breeding: null,        // {a,b,result,start,end}
    stats: {},
    quest: { index: 0, base: 0 },
    daily: { day: '', tasks: [], bonus: false },
    login: { day: '', streak: 0 },
    arena: { stage: 0 },
    book: {},
    events: [],
    eventProgress: {},
    settings: { sound: true },
  };
}

export function save() {
  if (!S.s) return;
  S.s.lastSeen = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S.s)); } catch { /* bộ nhớ đầy hoặc bị chặn */ }
}

export function load() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { data = null; }
  const fresh = !data || data.v !== 1;
  S.s = fresh ? newState() : Object.assign(newState(), data);
  return fresh;
}

export function exportSave() { return JSON.stringify(S.s); }

export function importSave(text) {
  const data = JSON.parse(text);
  if (!data || data.v !== 1 || !Array.isArray(data.buildings)) throw new Error('Dữ liệu không hợp lệ');
  S.s = Object.assign(newState(), data);
  save();
}

export function resetSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* bỏ qua */ }
}

// Chọn 3 nhiệm vụ ngày theo ngày (ổn định trong cùng một ngày)
export function rollDaily() {
  const key = dayKey();
  if (S.s.daily.day === key) return;
  let seed = 0;
  for (const ch of key) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = DAILY_POOL.slice();
  const tasks = [];
  while (tasks.length < 3) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const p = pool.splice(seed % pool.length, 1)[0];
    tasks.push({ id: p.id, base: S.s.stats[p.stat] || 0, claimed: false });
  }
  S.s.daily = { day: key, tasks, bonus: false };
}
