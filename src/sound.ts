// Tiny synthesized sound set (no assets). All calls are safe if audio is unavailable.
let ctx: AudioContext | null = null;
let enabled = true;
export const setSound = (on: boolean) => { enabled = on; };

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

function noise(dur: number, freq: number, gain: number) {
  const c = ac(); if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination); src.start();
}

function tone(freq: number, dur: number, gain = 0.08, type: OscillatorType = 'sine', at = 0) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.value = freq;
  const t0 = c.currentTime + at;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}

export const sfx = {
  play: () => noise(0.09, 2400, 0.5),
  draw: () => noise(0.12, 1400, 0.35),
  shuffle: () => { for (let i = 0; i < 6; i++) setTimeout(() => noise(0.05, 2000 + i * 120, 0.25), i * 45); },
  alert: () => { tone(330, 0.25, 0.09, 'triangle'); tone(247, 0.35, 0.09, 'triangle', 0.12); },
  good: () => { tone(523, 0.18, 0.07); tone(659, 0.18, 0.07, 'sine', 0.09); tone(784, 0.3, 0.07, 'sine', 0.18); },
  big: () => { [392, 494, 587, 784].forEach((f, i) => tone(f, 0.4, 0.06, 'triangle', i * 0.08)); },
  tap: () => tone(880, 0.05, 0.03, 'sine'),
};

export const buzz = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch { /* */ } };
