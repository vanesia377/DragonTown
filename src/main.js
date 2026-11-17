import * as G from './game.js';
import * as EV from './events.js';
import { S, bus, save, rollDaily } from './state.js';
import { createWorld } from './world.js';
import { initUI, toast } from './ui.js';
import { setSound, unlockAudio } from './sound.js';

const fresh = G.init();
const world = createWorld(document.getElementById('stage'), document.getElementById('labels'));
window.__world = world;           // tiện cho gỡ lỗi
initUI(world, { fresh });

setSound(S.s.settings.sound);
window.addEventListener('pointerdown', unlockAudio, { once: true });

// Chủ đề theo sự kiện đang diễn ra
let activeId = undefined;
function syncEvent(announce) {
  const ev = EV.activeEvent();
  const id = ev ? ev.id : null;
  if (id === activeId) return;
  const prev = activeId;
  activeId = id;
  world.setTheme(ev ? ev.theme : 'none');
  world.updateBubbles();
  if (announce && ev) toast(`🎉 Sự kiện <b>${ev.name}</b> đã bắt đầu!`, 'ok');
  else if (announce && prev) toast('Sự kiện đã kết thúc.', '');
}
syncEvent(false);
bus.on('events', () => syncEvent(true));
setInterval(() => { syncEvent(true); rollDaily(); }, 1000);

// Tự lưu
setInterval(save, 5000);
window.addEventListener('beforeunload', () => { if (!window.__noSave) save(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !window.__noSave) save(); });

document.getElementById('loading').remove();
