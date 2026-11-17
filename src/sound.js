// Âm thanh tổng hợp bằng WebAudio (không cần file âm thanh).
let ctx = null, enabled = true, musicTimer = null, unlocked = false;

function ac() {
  if (!unlocked) return null;
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur = 0.12, type = 'sine', vol = 0.07, delay = 0, slide = 0) {
  const c = ac(); if (!c || !enabled) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.03);
}

const SFX = {
  click: () => tone(520, 0.06, 'triangle', 0.05),
  coin: () => { tone(988, 0.08, 'square', 0.04); tone(1319, 0.14, 'square', 0.04, 0.07); },
  good: () => { tone(523, 0.1, 'triangle', 0.07); tone(659, 0.1, 'triangle', 0.07, 0.09); tone(784, 0.18, 'triangle', 0.07, 0.18); },
  level: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, i * 0.1)),
  hatch: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'sine', 0.08, i * 0.09)); tone(1568, 0.5, 'sine', 0.05, 0.5); },
  error: () => tone(180, 0.18, 'sawtooth', 0.05, 0, -60),
  build: () => { tone(220, 0.08, 'square', 0.04); tone(180, 0.1, 'square', 0.04, 0.1); },
  hit: () => tone(160, 0.12, 'sawtooth', 0.08, 0, -90),
  whoosh: () => tone(300, 0.2, 'sine', 0.05, 0, 500),
  win: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.07, i * 0.12)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', 0.06, i * 0.16)),
  pet: () => { tone(740, 0.08, 'sine', 0.05); tone(988, 0.1, 'sine', 0.05, 0.07); },
};
export function sfx(name) { try { SFX[name]?.(); } catch { /* bỏ qua lỗi âm thanh */ } }

const SCALE = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3];
function startMusic() {
  if (musicTimer || !enabled || !unlocked) return;
  let i = 0;
  musicTimer = setInterval(() => {
    if (!enabled || document.hidden) return;
    const n = SCALE[(Math.random() * SCALE.length) | 0];
    tone(n, 0.9, 'sine', 0.018);
    if (i++ % 4 === 0) tone(n / 2, 1.4, 'triangle', 0.015);
  }, 900);
}
export function setSound(on) {
  enabled = on;
  if (on) startMusic(); else { clearInterval(musicTimer); musicTimer = null; }
}
export function unlockAudio() { unlocked = true; ac(); if (enabled) startMusic(); }
