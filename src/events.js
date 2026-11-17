// Hệ thống sự kiện: định nghĩa, mẫu có sẵn, điểm sự kiện, mốc thưởng, cửa hàng đổi.
import { S, now, bus } from './state.js';

const DAY = 86400000;

export const THEMES = {
  summer:    { name: 'Mùa Hè',     icon: '🌴', color: '#19b3a6' },
  midautumn: { name: 'Trăng Rằm',  icon: '🏮', color: '#e8643a' },
  spring:    { name: 'Xuân Về',    icon: '🌸', color: '#e85a8f' },
  spooky:    { name: 'Đêm Ma Quái', icon: '🎃', color: '#8a4fd0' },
  winter:    { name: 'Đông Ấm',    icon: '❄️', color: '#3d8bd8' },
};

export const ACTIONS = {
  collect: 'Thu vàng', feed: 'Cho ăn', harvest: 'Thu hoạch',
  hatch: 'Ấp nở', breed: 'Lai giống', battleWin: 'Thắng trận',
};

export const BONUS_KEYS = {
  gold: 'Vàng thu được', food: 'Thức ăn thu hoạch', xp: 'Kinh nghiệm',
  hatchSpeed: 'Tốc độ ấp', breedSpeed: 'Tốc độ lai',
};

const base = (o) => ({
  id: '', name: '', desc: '', theme: 'summer', start: 0, end: 0,
  tokenName: 'Điểm hội', tokenIcon: '🎟️',
  bonuses: { gold: 1, food: 1, xp: 1, hatchSpeed: 1, breedSpeed: 1 },
  earn: { collect: 1, feed: 1, harvest: 2, hatch: 10, breed: 15, battleWin: 12 },
  milestones: [], shop: [], ...o,
});

// Mẫu sự kiện – dùng trong bảng thiết lập
export const TEMPLATES = {
  opening: () => base({
    name: 'Lễ Hội Khai Đảo', theme: 'summer', tokenName: 'Vỏ sò', tokenIcon: '🐚',
    desc: 'Chào mừng chủ đảo mới! Nhận thêm vàng và kinh nghiệm, tích Vỏ sò đổi quà.',
    bonuses: { gold: 1.5, food: 1, xp: 1.5, hatchSpeed: 2, breedSpeed: 1 },
    milestones: [
      { need: 20, reward: { gold: 500 } },
      { need: 60, reward: { food: 300 } },
      { need: 150, reward: { gems: 5 } },
      { need: 300, reward: { gold: 5000 } },
      { need: 600, reward: { egg: 'coral' } },
    ],
    shop: [
      { reward: { food: 200 }, cost: 30, limit: 10 },
      { reward: { gems: 2 }, cost: 60, limit: 5 },
      { reward: { deco: 'deco_evlantern' }, cost: 80, limit: 6 },
      { reward: { egg: 'steam' }, cost: 250, limit: 1 },
    ],
  }),
  midautumn: () => base({
    name: 'Đêm Hội Trăng Rằm', theme: 'midautumn', tokenName: 'Bánh trăng', tokenIcon: '🥮',
    desc: 'Rước đèn dưới trăng! Lai giống nhanh gấp đôi, tích Bánh trăng để đón Rồng Lồng Đèn.',
    bonuses: { gold: 1.2, food: 1, xp: 1, hatchSpeed: 1, breedSpeed: 2 },
    milestones: [
      { need: 50, reward: { gold: 2000 } },
      { need: 150, reward: { food: 800 } },
      { need: 350, reward: { gems: 8 } },
      { need: 700, reward: { deco: 'deco_evtree' } },
      { need: 1200, reward: { egg: 'lantern' } },
    ],
    shop: [
      { reward: { deco: 'deco_evlantern' }, cost: 60, limit: 10 },
      { reward: { food: 500 }, cost: 50, limit: 10 },
      { reward: { gems: 3 }, cost: 90, limit: 5 },
    ],
  }),
  spring: () => base({
    name: 'Hội Xuân Trên Đảo', theme: 'spring', tokenName: 'Lì xì', tokenIcon: '🧧',
    desc: 'Xuân về khắp đảo! Thu hoạch gấp đôi thức ăn, tích Lì xì đổi Rồng Hoa Xuân.',
    bonuses: { gold: 1.25, food: 2, xp: 1.25, hatchSpeed: 1, breedSpeed: 1 },
    milestones: [
      { need: 50, reward: { gold: 2500 } },
      { need: 150, reward: { gems: 5 } },
      { need: 350, reward: { food: 1500 } },
      { need: 700, reward: { gems: 12 } },
      { need: 1200, reward: { egg: 'blossom' } },
    ],
    shop: [
      { reward: { deco: 'deco_evtree' }, cost: 200, limit: 2 },
      { reward: { gold: 3000 }, cost: 60, limit: 10 },
      { reward: { gems: 3 }, cost: 90, limit: 5 },
    ],
  }),
  spooky: () => base({
    name: 'Đêm Hội Bí Ngô', theme: 'spooky', tokenName: 'Kẹo', tokenIcon: '🍬',
    desc: 'Đảo chìm trong màn đêm tím. Thắng trận nhận thêm Kẹo, đổi Rồng Bí Ngô.',
    bonuses: { gold: 1, food: 1, xp: 2, hatchSpeed: 1.5, breedSpeed: 1.5 },
    earn: { collect: 1, feed: 1, harvest: 2, hatch: 10, breed: 15, battleWin: 30 },
    milestones: [
      { need: 60, reward: { food: 600 } },
      { need: 180, reward: { gems: 6 } },
      { need: 400, reward: { gold: 8000 } },
      { need: 800, reward: { gems: 15 } },
      { need: 1300, reward: { egg: 'pumpkin' } },
    ],
    shop: [
      { reward: { deco: 'deco_evlantern' }, cost: 60, limit: 10 },
      { reward: { food: 500 }, cost: 50, limit: 10 },
    ],
  }),
  winter: () => base({
    name: 'Lễ Hội Đông Ấm', theme: 'winter', tokenName: 'Bông tuyết', tokenIcon: '❄️',
    desc: 'Tuyết rơi trên đảo! Trứng nở nhanh gấp ba, tích Bông tuyết đón Rồng Chuông Tuyết.',
    bonuses: { gold: 1.3, food: 1.3, xp: 1.3, hatchSpeed: 3, breedSpeed: 1 },
    milestones: [
      { need: 50, reward: { gold: 3000 } },
      { need: 150, reward: { food: 1000 } },
      { need: 350, reward: { gems: 8 } },
      { need: 700, reward: { deco: 'deco_evtree' } },
      { need: 1200, reward: { egg: 'snowbell' } },
    ],
    shop: [
      { reward: { gems: 3 }, cost: 90, limit: 5 },
      { reward: { gold: 3000 }, cost: 60, limit: 10 },
      { reward: { deco: 'deco_evlantern' }, cost: 60, limit: 10 },
    ],
  }),
};
export const TEMPLATE_NAMES = {
  opening: 'Lễ Hội Khai Đảo', midautumn: 'Đêm Hội Trăng Rằm', spring: 'Hội Xuân Trên Đảo',
  spooky: 'Đêm Hội Bí Ngô', winter: 'Lễ Hội Đông Ấm',
};

const newId = () => 'ev' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);

export function fromTemplate(key, start = now(), days = 7) {
  const ev = TEMPLATES[key]();
  ev.id = newId(); ev.start = start; ev.end = start + days * DAY;
  return ev;
}

export function blankEvent() {
  const ev = base({ name: 'Sự kiện mới', desc: '' });
  ev.id = newId(); ev.start = now(); ev.end = now() + 3 * DAY;
  ev.milestones = [{ need: 50, reward: { gold: 1000 } }];
  return ev;
}

export function seedEvents() {
  const t = now();
  S.s.events = [fromTemplate('opening', t, 7), fromTemplate('midautumn', t + 7 * DAY, 7)];
}

export const eventStatus = (ev, t = now()) => (t < ev.start ? 'upcoming' : t >= ev.end ? 'ended' : 'active');
export const listEvents = () => S.s.events.slice().sort((a, b) => a.start - b.start);
// Nếu nhiều sự kiện trùng thời gian, sự kiện bắt đầu gần nhất được ưu tiên
export const activeEvent = () => listEvents().reverse().find(e => eventStatus(e) === 'active') || null;
export const eventById = id => S.s.events.find(e => e.id === id);

export function progress(ev) {
  return (S.s.eventProgress[ev.id] ||= { tokens: 0, total: 0, claimed: [], bought: {} });
}

export function bonus(key) {
  const ev = activeEvent();
  const v = ev ? Number(ev.bonuses?.[key]) : 1;
  return v > 0 ? v : 1;
}

// Cộng điểm sự kiện theo hành động; trả về số điểm vừa nhận
export function earnTokens(action, times = 1) {
  const ev = activeEvent();
  if (!ev) return 0;
  const n = Math.round((Number(ev.earn?.[action]) || 0) * times);
  return addTokens(n);
}

export function addTokens(n) {
  const ev = activeEvent();
  if (!ev || !(n > 0)) return 0;
  const p = progress(ev);
  p.tokens += n; p.total += n;
  bus.emit('tokens', n, ev);
  return n;
}

export function saveEvent(ev) {
  ev.start = Number(ev.start); ev.end = Number(ev.end);
  if (!ev.name.trim()) return { ok: false, msg: 'Sự kiện cần có tên' };
  if (!(ev.end > ev.start)) return { ok: false, msg: 'Thời gian kết thúc phải sau thời gian bắt đầu' };
  ev.milestones = ev.milestones.filter(m => m.need > 0).sort((a, b) => a.need - b.need);
  ev.shop = ev.shop.filter(it => it.cost > 0);
  const i = S.s.events.findIndex(e => e.id === ev.id);
  if (i >= 0) S.s.events[i] = ev; else S.s.events.push(ev);
  bus.emit('events');
  return { ok: true };
}

export function deleteEvent(id) {
  S.s.events = S.s.events.filter(e => e.id !== id);
  delete S.s.eventProgress[id];
  bus.emit('events');
}

export function startNow(id) {
  const ev = eventById(id);
  if (!ev) return;
  const len = Math.max(3600000, ev.end - ev.start);
  ev.start = now(); ev.end = ev.start + len;
  bus.emit('events');
}

export function endNow(id) {
  const ev = eventById(id);
  if (!ev) return;
  ev.end = now();
  if (ev.start >= ev.end) ev.start = ev.end - 1000;
  bus.emit('events');
}

export function exportEvents() { return JSON.stringify(S.s.events, null, 2); }

export function importEvents(text) {
  const arr = JSON.parse(text);
  if (!Array.isArray(arr)) throw new Error('Cần một mảng sự kiện');
  const clean = arr.map(e => {
    const ev = base(e);
    if (!ev.id) ev.id = newId();
    if (!THEMES[ev.theme]) ev.theme = 'summer';
    return ev;
  });
  S.s.events = clean;
  bus.emit('events');
  return clean.length;
}

export function fmtDuration(ms) {
  let s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  if (d) return `${d} ngày ${h} giờ`;
  if (h) return `${h} giờ ${m} phút`;
  if (m) return `${m} phút ${s} giây`;
  return `${s} giây`;
}
