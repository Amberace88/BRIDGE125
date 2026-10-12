// Synthesized sound design (no assets). Every call is safe when audio is unavailable or switched off.
// One AudioContext, one master gain (the player's sound-effects volume) → gentle limiter → speakers.
//
// Public API: setSound(on), setSfxVolume(0..1), setDuckHandler(fn), sfx.*, buzz(pattern)
// media/music.ts wraps sfx.big / sfx.alert / sfx.good to duck the music — keep `sfx` a plain mutable object.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.8;
let duckHandler: (() => void) | null = null;

export const setSound = (on: boolean) => { enabled = on; };
export const isSoundOn = () => enabled;
/** 0..1 — applied to every effect (perceptual curve). */
export const setSfxVolume = (v: number) => {
  volume = Math.min(1, Math.max(0, v));
  if (master && ctx) master.gain.setTargetAtTime(gainFor(volume), ctx.currentTime, 0.03);
};
/** Called right before the louder cinematic sounds (the music module registers its ducking here). */
export const setDuckHandler = (fn: (() => void) | null) => { duckHandler = fn; };

const gainFor = (v: number) => 1.25 * Math.pow(v, 1.6);

function ac(): AudioContext | null {
  if (!enabled || volume <= 0.001) return null;
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 8; lim.attack.value = 0.003; lim.release.value = 0.15;
      master = ctx.createGain(); master.gain.value = gainFor(volume);
      master.connect(lim).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}
const out = () => master!;

let noiseBuf: AudioBuffer | null = null;
function whiteNoise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

/** Decaying noise burst through a band-pass (card snaps, slides). */
function noise(dur: number, freq: number, gain: number, at = 0, type: BiquadFilterType = 'bandpass', q = 0.8) {
  const c = ac(); if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(f).connect(g).connect(out()); src.start(c.currentTime + at);
}

function tone(freq: number, dur: number, gain = 0.08, type: OscillatorType = 'sine', at = 0, glide?: number, pan = 0) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type;
  const t0 = c.currentTime + at;
  o.frequency.setValueAtTime(freq, t0);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node: AudioNode = o.connect(g);
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; node = node.connect(p); }
  node.connect(out()); o.start(t0); o.stop(t0 + dur + 0.02);
}

/** Filtered noise swell with a moving filter and pan — whooshes, roars, swirls. */
function sweep(dur: number, f0: number, f1: number, f2: number, gain: number, at = 0, pan0 = 0, pan1 = 0, q = 1.1, type: BiquadFilterType = 'bandpass') {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at;
  const src = c.createBufferSource(); src.buffer = whiteNoise(c);
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.55); f.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = src.connect(f).connect(g);
  if (c.createStereoPanner) {
    const p = c.createStereoPanner(); p.pan.setValueAtTime(pan0, t); p.pan.linearRampToValueAtTime(pan1, t + dur);
    node = node.connect(p);
  }
  node.connect(out());
  src.start(t, Math.random() * 1.2, dur + 0.05);
}

/** Pitch-dropping sine — the body of a hit. */
function boom(f0: number, f1: number, dur: number, gain: number, at = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out()); o.start(t); o.stop(t + dur + 0.02);
}

const duck = () => { try { duckHandler?.(); } catch { /* */ } };
const live = () => !!ac();

export const sfx = {
  play: () => noise(0.09, 2400, 0.5),
  draw: () => noise(0.12, 1400, 0.35),
  shuffle: () => { for (let i = 0; i < 6; i++) setTimeout(() => noise(0.05, 2000 + i * 120, 0.25), i * 45); },
  alert: () => { tone(330, 0.25, 0.09, 'triangle'); tone(247, 0.35, 0.09, 'triangle', 0.12); },
  good: () => { tone(523, 0.18, 0.07); tone(659, 0.18, 0.07, 'sine', 0.09); tone(784, 0.3, 0.07, 'sine', 0.18); },
  big: () => { [392, 494, 587, 784].forEach((f, i) => tone(f, 0.4, 0.06, 'triangle', i * 0.08)); },
  tap: () => tone(880, 0.05, 0.03, 'sine'),

  /* ---------- cinematic set ---------- */
  /** Q♠ / multiplier: a heavy table slam with a short metallic ring. */
  slam: () => {
    if (!live()) return; duck();
    boom(150, 38, 0.55, 0.55);
    noise(0.16, 700, 0.55, 0, 'lowpass', 0.7);
    noise(0.05, 3800, 0.28, 0.005);
    tone(1880, 0.5, 0.025, 'triangle', 0.02, 1840);
    tone(2830, 0.35, 0.015, 'sine', 0.02);
  },
  /** Something rushing around the table (ace skip, redirect). */
  whoosh: (pan = 1) => { if (!live()) return; sweep(0.46, 380, 2600, 700, 0.42, 0, -0.8 * pan, 0.8 * pan, 1.4); },
  /** 8 chain: an iron clank that climbs with every link, plus a breath of fire. */
  chain: (level = 1) => {
    if (!live()) return; duck();
    const k = Math.min(4, Math.max(1, level));
    const f = 520 * Math.pow(1.122, k - 1);
    tone(f, 0.16, 0.05, 'square', 0, f * 0.96); tone(f * 1.51, 0.12, 0.03, 'square', 0.035);
    noise(0.06, 5200, 0.22, 0.0, 'highpass', 0.7);
    sweep(0.55 + k * 0.08, 180, 900 + k * 260, 300, 0.16 + k * 0.04, 0.03, 0, 0, 0.6, 'lowpass');
  },
  /** 125 → 0: ignition, roar and crackle burning down. */
  burn: () => {
    if (!live()) return; duck();
    sweep(1.15, 160, 1100, 240, 0.32, 0, 0, 0, 0.5, 'lowpass');
    for (let i = 0; i < 14; i++) noise(0.018, 2600 + Math.random() * 2400, 0.16 + Math.random() * 0.2, 0.08 + Math.random() * 0.95, 'bandpass', 1.4);
    tone(196, 0.9, 0.03, 'sawtooth', 0.05, 98);
  },
  /** Royal fanfare (four kings, game won). */
  fanfare: () => {
    if (!live()) return; duck();
    const notes: [number, number, number][] = [[523.25, 0, 0.16], [659.25, 0.12, 0.16], [783.99, 0.24, 0.16], [1046.5, 0.38, 0.75]];
    for (const [f, at, d] of notes) {
      tone(f, d, 0.05, 'sawtooth', at); tone(f * 1.003, d, 0.04, 'triangle', at); tone(f / 2, d, 0.03, 'triangle', at);
    }
    [659.25, 783.99].forEach(f => tone(f, 0.75, 0.035, 'triangle', 0.38));
    sweep(0.9, 6000, 9000, 7000, 0.05, 0.38, -0.3, 0.3, 0.7, 'highpass');
  },
  /** The 6 must be covered: a soft protective "vwomm". */
  shield: () => { if (!live()) return; tone(392, 0.42, 0.05, 'sine', 0, 440); tone(784, 0.3, 0.03, 'triangle', 0.03); tone(1568, 0.22, 0.012, 'sine', 0.05); },
  /** Coins / points tallied. */
  coin: () => { if (!live()) return; tone(1318.5, 0.08, 0.04, 'square'); tone(1760, 0.32, 0.04, 'square', 0.075); tone(2637, 0.25, 0.012, 'sine', 0.075); },
  /** 6♠ redirect: reversed swell into a glassy ping. */
  mirror: () => { if (!live()) return; duck(); sweep(0.32, 900, 3800, 6000, 0.3, 0, 0.6, -0.6, 1.6); tone(1568, 0.6, 0.04, 'sine', 0.28); tone(2093, 0.55, 0.03, 'sine', 0.3); tone(3136, 0.4, 0.015, 'sine', 0.31); },
  /** 9 / J: a prismatic arpeggio swirl. */
  prism: () => { if (!live()) return; [784, 988, 1175, 1480, 1976].forEach((f, i) => tone(f, 0.32, 0.03, 'sine', i * 0.045, undefined, (i % 2 ? 1 : -1) * 0.4)); sweep(0.4, 2400, 7000, 4000, 0.06, 0, -0.5, 0.5, 2); },
  /** 7: a quick flick of one card. */
  flick: () => { if (!live()) return; noise(0.07, 5200, 0.3, 0, 'highpass', 0.6); tone(1100, 0.08, 0.025, 'triangle', 0, 1650); },
  /** A stamp landing on a seat (+5, +2 …). */
  stamp: () => { if (!live()) return; boom(220, 80, 0.2, 0.3); noise(0.05, 1500, 0.3); },
  /** Bluff reveal — good (green) or bad (red). */
  reveal: (good: boolean) => {
    if (!live()) return; duck();
    if (good) { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.55, 0.04, 'triangle', i * 0.03)); }
    else { tone(155.6, 0.6, 0.07, 'sawtooth', 0, 146.8); tone(164.8, 0.6, 0.06, 'sawtooth', 0, 155.6); boom(110, 45, 0.4, 0.35); }
  },
};

export type SfxName = keyof typeof sfx;

export const buzz = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch { /* */ } };
