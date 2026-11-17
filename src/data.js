// Dữ liệu tĩnh của game: hệ, loài rồng, công trình, cây trồng, nhiệm vụ…

export const GRID = 24;          // số ô mỗi chiều
export const CELL = 2;           // kích thước 1 ô (đơn vị 3D)
export const EXPANSIONS = [      // nửa cạnh vùng đã mở (tính theo ô)
  { half: 6, cost: 0, level: 1 },
  { half: 8, cost: 3000, level: 4 },
  { half: 10, cost: 25000, level: 9 },
  { half: 12, cost: 150000, level: 15 },
];

export const MAX_DRAGON_LEVEL = 20;
export const FEEDS_PER_LEVEL = 4;
export const MAX_LEVEL = 40;

export const ELEMENTS = {
  fire:      { name: 'Lửa',   icon: '🔥', color: 0xff6a3d, strong: ['plant', 'ice'],      unlock: 1 },
  plant:     { name: 'Mộc',   icon: '🌿', color: 0x5ec44a, strong: ['water', 'earth'],    unlock: 1 },
  water:     { name: 'Nước',  icon: '💧', color: 0x3da5ff, strong: ['fire', 'earth'],     unlock: 2 },
  earth:     { name: 'Đất',   icon: '🪨', color: 0xb0845a, strong: ['lightning', 'fire'], unlock: 4 },
  lightning: { name: 'Lôi',   icon: '⚡', color: 0xffd23d, strong: ['water', 'ice'],      unlock: 6 },
  ice:       { name: 'Băng',  icon: '❄️', color: 0x9be4ff, strong: ['plant', 'earth'],    unlock: 8 },
  light:     { name: 'Quang', icon: '✨', color: 0xfff2a8, strong: ['dark'],              unlock: 11 },
  dark:      { name: 'Ám',    icon: '🌙', color: 0x7a4bd6, strong: ['light'],             unlock: 13 },
};

export const RARITY = {
  common: { name: 'Thường',       color: '#7c8a99', mul: 1.0,  xp: 20,  weight: 100 },
  rare:   { name: 'Hiếm',         color: '#3d8bff', mul: 1.2,  xp: 50,  weight: 45 },
  epic:   { name: 'Quý',          color: '#b455e8', mul: 1.45, xp: 120, weight: 14 },
  legend: { name: 'Huyền thoại',  color: '#f5a623', mul: 1.8,  xp: 300, weight: 3 },
  event:  { name: 'Sự kiện',      color: '#ff4f8b', mul: 1.6,  xp: 200, weight: 0 },
};

// look: c1 thân, c2 bụng/cánh, c3 sừng/gai; horn, wing, tail: kiểu dáng
const D = (id, name, el, rarity, income, hatch, price, look, desc) =>
  ({ id, name, el, rarity, income, hatch, price, look, desc });

export const DRAGONS = [
  // --- Rồng thuần hệ (mua trứng trong cửa hàng) ---
  D('ember',   'Rồng Than Hồng',  ['fire'],      'common', 12, 20,   100,
    { c1: 0xe8502e, c2: 0xffc56b, c3: 0x6b2a1c, horn: 'cone', wing: 'bat', tail: 'flame' },
    'Chú rồng nhỏ luôn ấm như một hòn than, thích ngủ cạnh bếp lửa.'),
  D('sprout',  'Rồng Lá Non',     ['plant'],     'common', 10, 20,   100,
    { c1: 0x58b947, c2: 0xd8f08a, c3: 0x2f7a3a, horn: 'leaf', wing: 'leaf', tail: 'leaf' },
    'Mỗi sáng trên lưng nó lại mọc thêm một chiếc lá mới.'),
  D('ripple',  'Rồng Sóng Biếc',  ['water'],     'common', 18, 45,   300,
    { c1: 0x2f8fe0, c2: 0xb8ecff, c3: 0x1c4f9c, horn: 'fin', wing: 'fin', tail: 'fin' },
    'Bơi nhanh hơn bay, hay phun nước trêu các bạn rồng khác.'),
  D('pebble',  'Rồng Đá Cuội',    ['earth'],     'common', 30, 90,   1500,
    { c1: 0x9a7350, c2: 0xe0c9a0, c3: 0x5a4632, horn: 'cone', wing: 'small', tail: 'club' },
    'Chậm chạp nhưng cứng cáp, có thể nằm im cả ngày như tảng đá.'),
  D('spark',   'Rồng Chớp Vàng',  ['lightning'], 'common', 55, 180,  5000,
    { c1: 0xf2c230, c2: 0xfff4b0, c3: 0x3a6fd8, horn: 'bolt', wing: 'bat', tail: 'bolt' },
    'Chạy nhanh đến mức để lại tia lửa điện lách tách phía sau.'),
  D('frost',   'Rồng Tuyết Mai',  ['ice'],       'common', 80, 300,  15000,
    { c1: 0x8fd6f2, c2: 0xffffff, c3: 0x4a8fc0, horn: 'crystal', wing: 'feather', tail: 'crystal' },
    'Hơi thở của nó làm mặt hồ đóng băng thành những bông hoa tuyết.'),
  D('dawn',    'Rồng Bình Minh',  ['light'],     'rare',   130, 480, 50000,
    { c1: 0xfff0b8, c2: 0xffd866, c3: 0xf08c3a, horn: 'antler', wing: 'feather', tail: 'spade', glow: 0xffe9a0 },
    'Xuất hiện khi tia nắng đầu tiên chạm vào đỉnh đảo.'),
  D('dusk',    'Rồng Dạ Nguyệt',  ['dark'],      'rare',   160, 600, 80000,
    { c1: 0x4a3a8c, c2: 0x9c7cf0, c3: 0x1c1638, horn: 'curl', wing: 'bat', tail: 'spade', glow: 0x9c7cf0 },
    'Chỉ thức giấc khi trăng lên, đôi cánh lấp lánh như bầu trời đêm.'),

  // --- Rồng lai (chỉ có được nhờ lai giống) ---
  D('steam',   'Rồng Hơi Sương',  ['fire', 'water'],      'rare', 40, 240, null,
    { c1: 0xd9e6ee, c2: 0xff9a7a, c3: 0x5a8fb0, horn: 'fin', wing: 'feather', tail: 'flame' },
    'Lửa gặp nước tạo nên làn hơi ấm áp bao quanh nó suốt ngày.'),
  D('chili',   'Rồng Ớt Cay',     ['fire', 'plant'],      'rare', 34, 200, null,
    { c1: 0xd62f2f, c2: 0x6fd04a, c3: 0x2f7a3a, horn: 'leaf', wing: 'leaf', tail: 'flame' },
    'Ăn gì cũng phải thật cay. Hắt hơi một cái là cháy cả luống rau.'),
  D('magma',   'Rồng Dung Nham',  ['fire', 'earth'],      'rare', 60, 360, null,
    { c1: 0x3b2a26, c2: 0xff7a1a, c3: 0xffb347, horn: 'cone', wing: 'small', tail: 'club', glow: 0xff6a1a },
    'Lớp vảy đá nứt nẻ để lộ dòng dung nham nóng chảy bên trong.'),
  D('firework','Rồng Pháo Hoa',   ['fire', 'lightning'],  'epic', 110, 600, null,
    { c1: 0xff4f6e, c2: 0xffe14f, c3: 0x4fd8ff, horn: 'bolt', wing: 'bat', tail: 'bolt', glow: 0xffe14f },
    'Mỗi lần vui mừng, nó bắn những chùm sáng rực rỡ lên trời.'),
  D('lotus',   'Rồng Sen Hồ',     ['water', 'plant'],     'rare', 36, 220, null,
    { c1: 0x4fbfa8, c2: 0xffb8d9, c3: 0x2f8f6a, horn: 'leaf', wing: 'leaf', tail: 'fin' },
    'Thích nằm giữa đầm sen, trên đầu đội một búp sen hồng.'),
  D('mud',     'Rồng Bùn Lầy',    ['water', 'earth'],     'rare', 58, 340, null,
    { c1: 0x7a6248, c2: 0x8fd0c8, c3: 0x4a3a2a, horn: 'none', wing: 'small', tail: 'club' },
    'Tắm bùn là thú vui số một. Đừng mặc áo trắng khi đến gần.'),
  D('floe',    'Rồng Băng Trôi',  ['water', 'ice'],       'epic', 120, 620, null,
    { c1: 0x5fb8e8, c2: 0xe8faff, c3: 0x2a6fa8, horn: 'crystal', wing: 'fin', tail: 'fin' },
    'Cưỡi trên những tảng băng trôi đi khắp đại dương.'),
  D('storm',   'Rồng Giông Bão',  ['water', 'lightning'], 'epic', 100, 560, null,
    { c1: 0x46558c, c2: 0xb8c8e8, c3: 0xffe14f, horn: 'bolt', wing: 'bat', tail: 'bolt', glow: 0xffe14f },
    'Nơi nào nó bay qua, mây đen kéo đến và sấm rền vang.'),
  D('moss',    'Rồng Rêu Cổ',     ['plant', 'earth'],     'rare', 52, 300, null,
    { c1: 0x6b7a4a, c2: 0xa8d05a, c3: 0x4a3a2a, horn: 'antler', wing: 'small', tail: 'club' },
    'Già như cánh rừng, trên lưng mọc cả một vườn rêu nhỏ.'),
  D('sunflower','Rồng Hướng Dương',['plant', 'light'],    'epic', 150, 720, null,
    { c1: 0xf5c518, c2: 0x8a5a2a, c3: 0x58b947, horn: 'leaf', wing: 'leaf', tail: 'leaf', glow: 0xffe14f },
    'Luôn quay đầu về phía mặt trời, kể cả khi đang ăn.'),
  D('quartz',  'Rồng Pha Lê',     ['earth', 'ice'],       'epic', 140, 700, null,
    { c1: 0xc8a8e8, c2: 0xf0e0ff, c3: 0x8a5ad0, horn: 'crystal', wing: 'crystal', tail: 'crystal', glow: 0xc8a8ff },
    'Toàn thân trong suốt, phản chiếu ánh sáng thành cầu vồng nhỏ.'),
  D('aurora',  'Rồng Cực Quang',  ['lightning', 'ice'],   'epic', 170, 780, null,
    { c1: 0x3fd8b0, c2: 0xb07af0, c3: 0xe8fff8, horn: 'crystal', wing: 'feather', tail: 'bolt', glow: 0x7af0d0 },
    'Dải sáng xanh tím uốn lượn theo mỗi nhịp vỗ cánh của nó.'),
  D('solar',   'Rồng Mặt Trời',   ['fire', 'light'],      'epic', 190, 840, null,
    { c1: 0xff9a1a, c2: 0xfff0a0, c3: 0xd63a1a, horn: 'antler', wing: 'feather', tail: 'flame', glow: 0xffc040 },
    'Bờm lửa rực cháy như vầng dương giữa trưa hè.'),
  D('rainbow', 'Rồng Cầu Vồng',   ['water', 'light'],     'epic', 180, 800, null,
    { c1: 0xff8fb8, c2: 0x8fe0ff, c3: 0xffe14f, horn: 'fin', wing: 'feather', tail: 'fin', glow: 0xffc0e0 },
    'Chỉ xuất hiện sau cơn mưa, để lại vệt bảy màu trên trời.'),
  D('winter',  'Rồng Đêm Đông',   ['ice', 'dark'],        'epic', 200, 900, null,
    { c1: 0x2a3a6b, c2: 0xb8e0ff, c3: 0x101830, horn: 'crystal', wing: 'bat', tail: 'crystal', glow: 0x8fc8ff },
    'Lặng lẽ như đêm đông dài, bước chân phủ đầy sương giá.'),
  D('ash',     'Rồng Tro Tàn',    ['fire', 'dark'],       'epic', 195, 880, null,
    { c1: 0x3a3238, c2: 0xff5a2a, c3: 0x8a8088, horn: 'curl', wing: 'bat', tail: 'flame', glow: 0xff5a2a },
    'Sinh ra từ đống tro của một ngọn núi lửa đã tắt.'),
  D('blackbolt','Rồng Hắc Lôi',   ['lightning', 'dark'],  'epic', 210, 960, null,
    { c1: 0x241c3a, c2: 0xc04ff0, c3: 0xf0e14f, horn: 'bolt', wing: 'bat', tail: 'bolt', glow: 0xc04ff0 },
    'Tia sét tím xé toạc màn đêm mỗi khi nó nổi giận.'),

  // --- Huyền thoại ---
  D('nebula',  'Rồng Tinh Vân',   ['light', 'dark'],      'legend', 420, 1800, null,
    { c1: 0x3a2a7a, c2: 0xff8fd8, c3: 0x8fe8ff, horn: 'antler', wing: 'feather', tail: 'spade', glow: 0xff8fd8 },
    'Ánh sáng và bóng tối hoà làm một, mang cả dải ngân hà trên cánh.'),
  D('golden',  'Rồng Hoàng Kim',  ['earth', 'light'],     'legend', 500, 2100, null,
    { c1: 0xf0b820, c2: 0xfff4c0, c3: 0xc07a10, horn: 'antler', wing: 'crystal', tail: 'club', glow: 0xffd040 },
    'Vảy bằng vàng ròng. Nơi nó nằm, vàng tự nhiên sinh sôi.'),
  D('tempest', 'Rồng Thiên Phong', ['fire', 'water', 'lightning'], 'legend', 460, 2000, null,
    { c1: 0x1a8f9c, c2: 0xff7a4a, c3: 0xffe14f, horn: 'bolt', wing: 'feather', tail: 'flame', glow: 0x4fe0f0 },
    'Chúa tể của ba nguyên tố, chỉ nghe kể trong truyền thuyết.'),

  // --- Rồng sự kiện (phần thưởng sự kiện) ---
  D('lantern', 'Rồng Lồng Đèn',   ['fire', 'light'],      'event', 260, 600, null,
    { c1: 0xe83a3a, c2: 0xffd24f, c3: 0x8a1c1c, horn: 'curl', wing: 'feather', tail: 'flame', glow: 0xffb040 },
    'Thắp sáng đêm hội trăng rằm bằng chiếc đuôi lồng đèn.'),
  D('blossom', 'Rồng Hoa Xuân',   ['plant', 'light'],     'event', 260, 600, null,
    { c1: 0xffb8d0, c2: 0xfff0a0, c3: 0x8a5a3a, horn: 'antler', wing: 'leaf', tail: 'leaf', glow: 0xffd0e0 },
    'Mang mùa xuân đến đảo, mỗi bước chân nở một đoá hoa.'),
  D('pumpkin', 'Rồng Bí Ngô',     ['plant', 'dark'],      'event', 260, 600, null,
    { c1: 0xf08a1a, c2: 0x3a2a4a, c3: 0x4a8a2a, horn: 'curl', wing: 'bat', tail: 'club', glow: 0xffa030 },
    'Thích doạ ma nhưng lại rất sợ bóng tối.'),
  D('snowbell','Rồng Chuông Tuyết',['ice', 'light'],      'event', 260, 600, null,
    { c1: 0xf4faff, c2: 0xe83a4a, c3: 0x2f8f4a, horn: 'antler', wing: 'feather', tail: 'club', glow: 0xffffff },
    'Tiếng chuông trên cổ nó báo hiệu mùa lễ hội đã về.'),
  D('coral',   'Rồng San Hô',     ['water', 'fire'],      'event', 260, 600, null,
    { c1: 0xff7a6a, c2: 0x4fe0d0, c3: 0xffe0a0, horn: 'antler', wing: 'fin', tail: 'fin', glow: 0xff9a8a },
    'Vị khách mùa hè đến từ rạn san hô ấm áp.'),
];

export const DRAGON_BY_ID = Object.fromEntries(DRAGONS.map(d => [d.id, d]));

// ----- Công trình -----
// kind: habitat | farm | hatchery | breeding | arena | altar | deco
const elHab = (el, cost, cap, time) => ({
  id: 'hab_' + el, kind: 'habitat', el, name: 'Khu ' + ELEMENTS[el].name, w: 3, d: 3,
  cost, cap, time, level: ELEMENTS[el].unlock,
  desc: `Nơi ở cho rồng hệ ${ELEMENTS[el].name}. Chứa 2 rồng, nâng cấp để chứa thêm.`,
});

export const BUILDINGS = [
  elHab('fire', 150, 400, 5),
  elHab('plant', 150, 400, 5),
  elHab('water', 400, 700, 15),
  elHab('earth', 2000, 1500, 30),
  elHab('lightning', 6000, 3000, 60),
  elHab('ice', 18000, 5000, 90),
  elHab('light', 60000, 9000, 120),
  elHab('dark', 90000, 12000, 120),
  { id: 'farm', kind: 'farm', name: 'Vườn Thức Ăn', w: 2, d: 2, cost: 200, time: 5, level: 1,
    desc: 'Trồng thức ăn để nuôi rồng lớn.' },
  { id: 'hatchery', kind: 'hatchery', name: 'Lò Ấp Trứng', w: 3, d: 3, unique: true,
    desc: 'Ấp trứng rồng. Nâng cấp để ấp nhiều trứng cùng lúc.' },
  { id: 'breeding', kind: 'breeding', name: 'Vườn Se Duyên', w: 3, d: 3, unique: true,
    desc: 'Ghép đôi hai rồng trưởng thành để lai ra loài mới.' },
  { id: 'arena', kind: 'arena', name: 'Đấu Trường', w: 3, d: 3, unique: true,
    desc: 'Thử sức đội rồng của bạn qua các ải.' },
  { id: 'altar', kind: 'altar', name: 'Đài Lễ Hội', w: 2, d: 2, unique: true,
    desc: 'Trung tâm sự kiện của đảo.' },
  // trang trí
  { id: 'deco_tree', kind: 'deco', name: 'Cây Tán Tròn', w: 1, d: 1, cost: 80, xp: 4, level: 1 },
  { id: 'deco_pine', kind: 'deco', name: 'Cây Thông', w: 1, d: 1, cost: 120, xp: 5, level: 2 },
  { id: 'deco_flower', kind: 'deco', name: 'Luống Hoa', w: 1, d: 1, cost: 60, xp: 3, level: 1 },
  { id: 'deco_rock', kind: 'deco', name: 'Hòn Non Bộ', w: 1, d: 1, cost: 150, xp: 6, level: 3 },
  { id: 'deco_lamp', kind: 'deco', name: 'Đèn Đá', w: 1, d: 1, cost: 300, xp: 10, level: 3 },
  { id: 'deco_bench', kind: 'deco', name: 'Ghế Gỗ', w: 1, d: 1, cost: 200, xp: 7, level: 2 },
  { id: 'deco_fountain', kind: 'deco', name: 'Đài Phun Nước', w: 2, d: 2, cost: 2500, xp: 60, level: 5 },
  { id: 'deco_windmill', kind: 'deco', name: 'Cối Xay Gió', w: 2, d: 2, cost: 6000, xp: 120, level: 7 },
  { id: 'deco_statue', kind: 'deco', name: 'Tượng Rồng Đá', w: 1, d: 1, gems: 15, xp: 150, level: 6 },
  { id: 'deco_flag', kind: 'deco', name: 'Cờ Lễ Hội', w: 1, d: 1, cost: 500, xp: 15, level: 4 },
  // trang trí chỉ đổi được trong sự kiện
  { id: 'deco_evlantern', kind: 'deco', name: 'Cột Lồng Đèn', w: 1, d: 1, xp: 80, eventOnly: true },
  { id: 'deco_evtree', kind: 'deco', name: 'Cây Ước Nguyện', w: 2, d: 2, xp: 200, eventOnly: true },
];
export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

export const HABITAT_LEVELS = [
  { cap: 1, slots: 2 },
  { cap: 2.5, slots: 3, costMul: 3 },
  { cap: 6, slots: 4, costMul: 10 },
];
export const HATCHERY_LEVELS = [
  { slots: 1 },
  { slots: 2, cost: 5000, level: 5 },
  { slots: 3, cost: 40000, level: 10 },
];

export const CROPS = [
  { id: 'berry',  name: 'Quả Mọng',   icon: '🫐', cost: 20,   time: 30,   food: 14,   xp: 2,  level: 1 },
  { id: 'shroom', name: 'Nấm Sương',  icon: '🍄', cost: 100,  time: 300,  food: 80,   xp: 6,  level: 2 },
  { id: 'gourd',  name: 'Bí Rồng',    icon: '🎃', cost: 500,  time: 1800, food: 450,  xp: 20, level: 5 },
  { id: 'star',   name: 'Trái Sao',   icon: '⭐', cost: 2500, time: 7200, food: 2400, xp: 60, level: 9 },
];
export const CROP_BY_ID = Object.fromEntries(CROPS.map(c => [c.id, c]));

// ----- Nhiệm vụ chính (theo chuỗi) -----
// stat: bộ đếm cộng dồn; abs: giá trị tuyệt đối lấy từ trạng thái
export const QUESTS = [
  { text: 'Xây một Khu Lửa cho rồng ở', stat: 'build_habitat', n: 1, reward: { gold: 150, xp: 15 } },
  { text: 'Mua một quả trứng rồng', stat: 'buyEgg', n: 1, reward: { gold: 100, xp: 15 } },
  { text: 'Ấp nở chú rồng đầu tiên', stat: 'hatch', n: 1, reward: { food: 60, xp: 25 } },
  { text: 'Xây một Vườn Thức Ăn', stat: 'build_farm', n: 1, reward: { gold: 200, xp: 20 } },
  { text: 'Thu hoạch thức ăn 1 lần', stat: 'harvest', n: 1, reward: { food: 40, xp: 20 } },
  { text: 'Cho rồng ăn 4 lần', stat: 'feed', n: 4, reward: { gold: 200, xp: 25 } },
  { text: 'Thu vàng từ khu ở 3 lần', stat: 'collect', n: 3, reward: { gems: 2, xp: 30 } },
  { text: 'Sở hữu 2 chú rồng', abs: 'dragons', n: 2, reward: { gold: 400, xp: 40 } },
  { text: 'Nuôi một rồng đạt cấp 4', abs: 'maxDragonLevel', n: 4, reward: { food: 150, xp: 50 } },
  { text: 'Lai giống rồng 1 lần', stat: 'breed', n: 1, reward: { gems: 3, xp: 60 } },
  { text: 'Đặt 3 vật trang trí', stat: 'build_deco', n: 3, reward: { gold: 500, xp: 40 } },
  { text: 'Thắng 1 trận ở Đấu Trường', stat: 'battleWin', n: 1, reward: { gems: 3, xp: 80 } },
  { text: 'Mở rộng đảo', stat: 'expand', n: 1, reward: { gold: 1500, xp: 100 } },
  { text: 'Sưu tầm 6 loài rồng', abs: 'species', n: 6, reward: { gems: 5, xp: 150 } },
  { text: 'Vượt ải 5 Đấu Trường', abs: 'arenaStage', n: 5, reward: { gems: 5, gold: 3000, xp: 200 } },
  { text: 'Nuôi một rồng đạt cấp 10', abs: 'maxDragonLevel', n: 10, reward: { gems: 5, food: 1000, xp: 250 } },
  { text: 'Sưu tầm 12 loài rồng', abs: 'species', n: 12, reward: { gems: 10, xp: 400 } },
  { text: 'Vượt ải 15 Đấu Trường', abs: 'arenaStage', n: 15, reward: { gems: 15, xp: 600 } },
  { text: 'Sưu tầm 20 loài rồng', abs: 'species', n: 20, reward: { gems: 25, xp: 1000 } },
];

export const DAILY_POOL = [
  { id: 'd_collect', text: 'Thu vàng 8 lần', stat: 'collect', n: 8, reward: { gold: 400, tokens: 15 } },
  { id: 'd_feed', text: 'Cho rồng ăn 10 lần', stat: 'feed', n: 10, reward: { food: 150, tokens: 15 } },
  { id: 'd_harvest', text: 'Thu hoạch 4 lần', stat: 'harvest', n: 4, reward: { gold: 300, tokens: 15 } },
  { id: 'd_hatch', text: 'Ấp nở 1 quả trứng', stat: 'hatch', n: 1, reward: { gems: 1, tokens: 20 } },
  { id: 'd_breed', text: 'Lai giống 1 lần', stat: 'breed', n: 1, reward: { gems: 1, tokens: 20 } },
  { id: 'd_battle', text: 'Thắng 2 trận đấu', stat: 'battleWin', n: 2, reward: { gems: 1, tokens: 25 } },
];

export const LOGIN_REWARDS = [
  { gold: 300 }, { food: 150 }, { gems: 3 }, { gold: 1500 }, { food: 600 }, { gems: 6 }, { gems: 10, egg: 'steam' },
];

export const GEM_EXCHANGE = [
  { gems: 5, gold: 1000 }, { gems: 20, gold: 5000 }, { gems: 5, food: 300 }, { gems: 20, food: 1500 },
];

export const xpNeed = lvl => Math.round(40 * Math.pow(lvl, 1.7));
export const feedCost = lvl => Math.round(5 * Math.pow(1.35, lvl - 1));
export const dragonIncome = (type, lvl) => DRAGON_BY_ID[type].income * (1 + 0.25 * (lvl - 1));
export const dragonStage = lvl => (lvl < 4 ? 0 : lvl < 10 ? 1 : 2);   // bé / thiếu niên / trưởng thành
export const STAGE_NAMES = ['Rồng con', 'Thiếu niên', 'Trưởng thành'];
export const BREED_MIN_LEVEL = 4;
