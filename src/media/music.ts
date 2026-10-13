// Background music — composed live with WebAudio, so it is royalty-free by construction (no audio files).
// Late-night lounge / jazz-noir: rootless chord pads, a walking upright-ish bass, brushes on a swung ride,
// sparse electric-piano comping and melody, and a bed of vinyl crackle. Progressions are drawn at random from a
// set that shares one key, so it never loops audibly yet always sounds like the same record.
//
// Cost when off: nothing exists — no AudioContext, no timers. Started lazily, only from a user gesture.
// Public API:  music.start() / music.stop() / music.setVolume(0..1),  initMusic(),  useMusic()

import { useSyncExternalStore } from 'react';
import { sfx } from '../sound';

// ------------------------------------------------------------------ preference (localStorage `b125.music`)
const KEY = 'b125.music';
interface Pref { on: boolean; vol: number }
function readPref(): Pref {
  try { const j = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return { on: j.on === true, vol: typeof j.vol === 'number' ? Math.min(1, Math.max(0, j.vol)) : 0.5 }; }
  catch { return { on: false, vol: 0.5 }; }
}
let pref: Pref = typeof localStorage !== 'undefined' ? readPref() : { on: false, vol: 0.5 };
const subs = new Set<() => void>();
const savePref = (p: Partial<Pref>) => {
  pref = { ...pref, ...p };
  try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch { /* */ }
  for (const f of subs) f();
};

// ------------------------------------------------------------------ theory
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);
type Qual = 'm9' | 'maj7' | 'd13' | 'd7b9' | 'h7';
const Q: Record<Qual, { pad: number[]; tones: number[]; scale: number[] }> = {
  m9:   { pad: [3, 7, 10, 14], tones: [0, 3, 7, 10], scale: [0, 2, 3, 5, 7, 9, 10] },
  maj7: { pad: [4, 7, 11, 14], tones: [0, 4, 7, 11], scale: [0, 2, 4, 7, 9, 11] },
  d13:  { pad: [4, 9, 10, 14], tones: [0, 4, 7, 10], scale: [0, 2, 4, 7, 9, 10] },
  d7b9: { pad: [4, 8, 10, 13], tones: [0, 4, 7, 10], scale: [0, 1, 4, 7, 8, 10] },
  h7:   { pad: [3, 6, 10, 13], tones: [0, 3, 6, 10], scale: [0, 1, 3, 5, 6, 8, 10] },
};
type Bar = [number, Qual];
const PROGS: Bar[][] = [
  [[0, 'm9'], [5, 'm9'], [10, 'd13'], [3, 'maj7'], [8, 'maj7'], [2, 'h7'], [7, 'd7b9'], [0, 'm9']],
  [[0, 'm9'], [0, 'm9'], [5, 'm9'], [5, 'm9'], [2, 'h7'], [7, 'd7b9'], [0, 'm9'], [7, 'd7b9']],
  [[8, 'maj7'], [7, 'd7b9'], [0, 'm9'], [0, 'm9'], [5, 'm9'], [10, 'd13'], [3, 'maj7'], [7, 'd7b9']],
  [[0, 'm9'], [10, 'd13'], [8, 'maj7'], [7, 'd7b9'], [0, 'm9'], [10, 'd13'], [8, 'maj7'], [7, 'd7b9']],
  [[5, 'm9'], [10, 'd13'], [3, 'maj7'], [8, 'maj7'], [2, 'h7'], [7, 'd7b9'], [0, 'm9'], [0, 'm9']],
];
const rnd = Math.random;
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const nearest = (pc: number, to: number, lo: number, hi: number) => {
  let best = lo, d = 1e9;
  for (let m = lo; m <= hi; m++) if (((m % 12) + 12) % 12 === pc && Math.abs(m - to) < d) { d = Math.abs(m - to); best = m; }
  return best;
};

/** Volume 0..1 → master gain. Measured: ≈ -23 dBFS RMS at the default 0.5 and ≈ -17.5 dBFS at 1 (quiet bed under sfx). */
const levelGain = (v: number) => 0.8 * Math.pow(v, 1.2);

// ------------------------------------------------------------------ engine
class Engine {
  readonly ctx: BaseAudioContext;
  readonly out: GainNode;        // master (volume)
  private duckG: GainNode;
  private bus: GainNode;
  private verb: GainNode;        // reverb send
  private padF: BiquadFilterNode;
  private noise: AudioBuffer;
  private key = pick([50, 53, 55, 57]);      // D, F, G, A (tonic, octave 3)
  private bpm = 70 + Math.floor(rnd() * 10);
  private prog: Bar[] = PROGS[0];
  private bar = 0;
  private next = 0;              // time of next bar
  private padPrev: number[] = [];
  private bassPrev = 0;
  private lfo: OscillatorNode;
  private crackle: AudioBufferSourceNode;

  constructor(ctx: BaseAudioContext, dest: AudioNode) {
    this.ctx = ctx;
    const c = ctx;
    this.out = c.createGain(); this.out.gain.value = 0;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -22; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.4;
    this.duckG = c.createGain();
    this.bus = c.createGain(); this.bus.gain.value = 1;
    this.bus.connect(this.duckG).connect(this.out).connect(comp).connect(dest);

    // reverb: generated stereo impulse (dark plate ~2.6 s)
    const conv = c.createConvolver();
    conv.buffer = this.impulse(2.6);
    const vf = c.createBiquadFilter(); vf.type = 'lowpass'; vf.frequency.value = 3200;
    this.verb = c.createGain(); this.verb.gain.value = 1;
    const vret = c.createGain(); vret.gain.value = 0.55;
    this.verb.connect(conv).connect(vf).connect(vret).connect(this.duckG);

    // pad bus with a slow breathing filter
    this.padF = c.createBiquadFilter(); this.padF.type = 'lowpass'; this.padF.frequency.value = 1300; this.padF.Q.value = 0.4;
    this.lfo = c.createOscillator(); this.lfo.frequency.value = 0.045;
    const lg = c.createGain(); lg.gain.value = 420;
    this.lfo.connect(lg).connect(this.padF.frequency);
    const padOut = c.createGain(); padOut.gain.value = 1;
    this.padF.connect(padOut); padOut.connect(this.bus);
    const padSend = c.createGain(); padSend.gain.value = 0.5; padOut.connect(padSend).connect(this.verb);

    this.noise = this.noiseBuf(2);
    this.crackle = c.createBufferSource(); this.crackle.buffer = this.crackleBuf(7.3); this.crackle.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const cg = c.createGain(); cg.gain.value = 0.05;
    this.crackle.connect(hp).connect(cg).connect(this.bus);
  }

  begin(at: number) {
    this.lfo.start(at); this.crackle.start(at);
    this.next = at + 0.05; this.prog = pick(PROGS); this.bar = 0;
  }
  end(at: number) { try { this.lfo.stop(at); this.crackle.stop(at); } catch { /* */ } }

  setLevel(v: number, at: number, ramp = 0.4) {
    const g = this.out.gain;
    g.cancelScheduledValues(at); g.setValueAtTime(g.value, at);
    g.linearRampToValueAtTime(levelGain(v) + 0.0001, at + ramp);
  }
  duck(at: number) {
    const g = this.duckG.gain;
    g.cancelScheduledValues(at); g.setValueAtTime(g.value, at);
    g.linearRampToValueAtTime(0.4, at + 0.06); g.setTargetAtTime(1, at + 0.5, 0.45);
  }

  /** Schedule every bar that starts before `until`. */
  fill(until: number) {
    while (this.next < until) {
      this.playBar(this.next);
      this.next += (60 / this.bpm) * 4;
      if (++this.bar >= this.prog.length) { this.bar = 0; this.prog = pick(PROGS); }
    }
  }

  private playBar(t0: number) {
    const beat = 60 / this.bpm, barLen = beat * 4, sw = beat * 0.64;
    const [r, q] = this.prog[this.bar];
    const nx = this.prog[(this.bar + 1) % this.prog.length];
    const root = this.key + r, Qd = Q[q];

    // pad — voice-led rootless voicing
    const target = Qd.pad.map(iv => ((root + iv) % 12 + 12) % 12);
    const center = this.padPrev.length ? this.padPrev : [60, 63, 67, 70];
    const voicing = target.map((pc, i) => nearest(pc, center[i] ?? 64, 55, 77)).sort((a, b) => a - b);
    this.padPrev = voicing;
    voicing.forEach((m, i) => this.pad(mtof(m), t0 + i * 0.012, barLen + 0.25));

    // walking bass
    const bRoot = nearest(((root % 12) + 12) % 12, this.bassPrev || 40, 33, 48);
    const nRoot = this.key + nx[0];
    const line = [bRoot];
    line.push(bRoot + pick(rnd() < 0.5 ? [Qd.tones[1], Qd.tones[2]] : [Qd.scale[1], Qd.scale[2]]));
    line.push(bRoot + pick([Qd.tones[2], Qd.tones[3], 12, Qd.tones[1]]));
    const nPc = ((nRoot % 12) + 12) % 12;
    const nTarget = nearest(nPc, bRoot, 33, 50);
    line.push(rnd() < 0.72 ? nTarget + (rnd() < 0.5 ? -1 : 1) : nTarget + 7 - 12 * (nTarget + 7 > 52 ? 1 : 0));
    line.forEach((m, i) => this.bass(mtof(Math.max(31, Math.min(55, m))), t0 + i * beat + (i ? 0.004 * rnd() : 0), beat * 0.92, i === 0 ? 1 : 0.8 + rnd() * 0.15));
    if (rnd() < 0.18) this.bass(mtof(line[3] + (rnd() < 0.5 ? 2 : -2)), t0 + 2 * beat + sw, beat * 0.3, 0.45);   // a little skip
    this.bassPrev = line[3];

    // brushes
    for (let b = 0; b < 4; b++) {
      const t = t0 + b * beat;
      this.tap(t, b % 2 ? 0.75 : 0.55);
      if (b % 2) { this.swish(t, 0.9); this.tap(t + sw, 0.42 + rnd() * 0.1); }
      else this.sweep(t, beat * 1.9);
    }
    this.thump(t0, 1); if (rnd() < 0.55) this.thump(t0 + 2 * beat, 0.7);

    // electric piano: a comp stab now and then + sparse melody from the chord's scale
    if (rnd() < 0.42) {
      const at = t0 + (rnd() < 0.5 ? 1 : 3) * beat + sw;
      const tones = Qd.pad.slice(1).map(iv => nearest(((root + iv) % 12 + 12) % 12, 70, 64, 79));
      tones.forEach((m, i) => this.ep(mtof(m), at + i * 0.008, 0.9, 0.38));
    }
    let last = 76;
    for (let b = 0; b < 8; b++) {
      if (rnd() > 0.13) continue;
      const at = t0 + Math.floor(b / 2) * beat + (b % 2 ? sw : 0);
      const pc = ((root + pick(Qd.scale)) % 12 + 12) % 12;
      const m = nearest(pc, last + (rnd() < 0.5 ? -3 : 3), 67, 86);
      last = m;
      this.ep(mtof(m), at, 1.8 + rnd(), 0.5 + rnd() * 0.25, true);
    }
  }

  // ---------------------------------------------------------------- voices
  private env(g: AudioParam, t: number, peak: number, a: number, dur: number, rel: number) {
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(peak, t + a);
    g.setValueAtTime(peak, t + Math.max(a, dur - rel));
    g.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  private pad(f: number, t: number, dur: number) {
    const c = this.ctx;
    const g = c.createGain();
    this.env(g.gain, t, 0.028, 0.9, dur + 1.1, 1.3);
    for (const [type, det] of [['triangle', -6], ['sine', 7]] as const) {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
      o.connect(g); o.start(t); o.stop(t + dur + 1.2);
    }
    g.connect(this.padF);
  }

  private bass(f: number, t: number, dur: number, vel: number) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f;
    const g2 = c.createGain(); g2.gain.value = 0.35;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(320, t + 0.25);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.26 * vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.13 * vel, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(this.bus);
    o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }

  private noiseSrc(t: number, dur: number) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    s.start(t, rnd() * (this.noise.duration - dur - 0.05), dur + 0.02);
    return s;
  }

  private tap(t: number, vel: number) {        // brush on the ride
    const c = this.ctx;
    const s = this.noiseSrc(t, 0.12);
    const bp = c.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 5200;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 * vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    s.connect(bp).connect(g).connect(this.bus);
  }
  private swish(t: number, vel: number) {      // snare brush slap on 2 & 4
    const c = this.ctx;
    const s = this.noiseSrc(t - 0.03, 0.3);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.6;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t - 0.03); g.gain.linearRampToValueAtTime(0.06 * vel, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    s.connect(bp).connect(g).connect(this.bus);
    const sg = c.createGain(); sg.gain.value = 0.25; g.connect(sg).connect(this.verb);
  }
  private sweep(t: number, dur: number) {      // the circular brush stir under it all
    const c = this.ctx;
    const s = this.noiseSrc(t, dur);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(1800, t); bp.frequency.linearRampToValueAtTime(3400, t + dur * 0.6); bp.frequency.linearRampToValueAtTime(2200, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.018, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(bp).connect(g).connect(this.bus);
  }
  private thump(t: number, vel: number) {      // feathered kick
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16 * vel, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.32);
  }

  private ep(f: number, t: number, dur: number, vel: number, wet = false) {   // 2-op FM electric piano
    const c = this.ctx;
    const car = c.createOscillator(); car.frequency.value = f;
    const mod = c.createOscillator(); mod.frequency.value = f;
    const mg = c.createGain();
    mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.45);
    mod.connect(mg).connect(car.frequency);
    const tine = c.createOscillator(); tine.frequency.value = f * 7.02;
    const tg = c.createGain(); tg.gain.setValueAtTime(0.18, t); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 * vel, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    car.connect(g); tine.connect(tg).connect(g); g.connect(lp).connect(this.bus);
    const sg = c.createGain(); sg.gain.value = wet ? 0.9 : 0.4; lp.connect(sg).connect(this.verb);
    for (const o of [car, mod, tine]) { o.start(t); o.stop(t + dur + 0.05); }
  }

  // ---------------------------------------------------------------- buffers
  private noiseBuf(sec: number) {
    const c = this.ctx, b = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
    return b;
  }
  private crackleBuf(sec: number) {
    const c = this.ctx, sr = c.sampleRate, b = c.createBuffer(2, Math.floor(sr * sec), sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * 0.015;                  // surface hiss
      const pops = Math.floor(sec * (18 + rnd() * 10));
      for (let k = 0; k < pops; k++) {                                                   // dust clicks
        const at = Math.floor(rnd() * (d.length - 200)), amp = (rnd() < 0.08 ? 0.9 : 0.25) * (rnd() < 0.5 ? -1 : 1);
        for (let j = 0; j < 60; j++) d[at + j] += amp * Math.exp(-j / 6) * (j % 2 ? -0.6 : 1);
      }
    }
    return b;
  }
  private impulse(sec: number) {
    const c = this.ctx, sr = c.sampleRate, len = Math.floor(sr * sec), b = c.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
    }
    return b;
  }
}

// ------------------------------------------------------------------ realtime player
let ctx: AudioContext | null = null;
let eng: Engine | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let closing: ReturnType<typeof setTimeout> | null = null;
const AHEAD = 0.6;

function tick() { if (ctx && eng && ctx.state === 'running') eng.fill(ctx.currentTime + AHEAD); }

function onVis() {
  if (!ctx) return;
  if (document.visibilityState === 'hidden') { ctx.suspend().catch(() => {}); if (timer) { clearInterval(timer); timer = null; } }
  else { ctx.resume().catch(() => {}); timer ??= setInterval(tick, 200); }
}

function startNow() {
  if (closing) { clearTimeout(closing); closing = null; }
  if (ctx && eng) { ctx.resume().catch(() => {}); eng.setLevel(pref.vol, ctx.currentTime, 1.2); timer ??= setInterval(tick, 200); return; }
  try {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ latencyHint: 'playback' });
  } catch { return; }
  ctx.resume().catch(() => {});
  eng = new Engine(ctx, ctx.destination);
  const t = ctx.currentTime + 0.05;
  eng.begin(t);
  eng.setLevel(pref.vol, t, 2.5);
  eng.fill(ctx.currentTime + AHEAD);
  timer = setInterval(tick, 200);
  document.addEventListener('visibilitychange', onVis);
}

function stopNow() {
  if (timer) { clearInterval(timer); timer = null; }
  document.removeEventListener('visibilitychange', onVis);
  if (!ctx || !eng) return;
  const c = ctx, e = eng;
  e.setLevel(0, c.currentTime, 0.5);
  closing = setTimeout(() => { e.end(c.currentTime); c.close().catch(() => {}); if (ctx === c) { ctx = null; eng = null; } closing = null; }, 650);
}

export const music = {
  /** Start playing (call from a user gesture) and remember the choice. */
  start() { initMusic(); savePref({ on: true }); startNow(); },
  stop() { savePref({ on: false }); stopNow(); },
  setVolume(v: number) {
    savePref({ vol: Math.min(1, Math.max(0, v)) });
    if (ctx && eng) eng.setLevel(pref.vol, ctx.currentTime, 0.15);
  },
  /** Briefly dip under an important game sound. */
  duck() { if (ctx && eng) eng.duck(ctx.currentTime); },
  get on() { return pref.on; },
  get volume() { return pref.vol; },
};

// ------------------------------------------------------------------ boot + react
let inited = false;
/** Idempotent. Resumes remembered music on the first user gesture and wires ducking under key sfx. */
export function initMusic() {
  if (inited || typeof window === 'undefined') return;
  inited = true;
  for (const k of ['big', 'alert', 'good'] as const) {
    const orig = sfx[k];
    sfx[k] = () => { music.duck(); orig(); };
  }
  if (!pref.on) return;
  const go = () => { off(); if (pref.on) startNow(); };
  const evs = ['pointerdown', 'keydown', 'touchend'] as const;
  const off = () => evs.forEach(e => window.removeEventListener(e, go, true));
  evs.forEach(e => window.addEventListener(e, go, { capture: true, passive: true }));
}

const snap = () => pref;
export function useMusic(): Pref & { toggle: () => void; setVol: (v: number) => void } {
  const p = useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, snap);
  return { ...p, toggle: () => (p.on ? music.stop() : music.start()), setVol: music.setVolume };
}

/** Test/QA helper: render `sec` seconds offline and return the RMS level in dBFS at the given volume. */
export async function measureMusic(sec = 12, vol = 0.5): Promise<number> {
  const sr = 44100, oc = new OfflineAudioContext(2, sr * sec, sr);
  const e = new Engine(oc, oc.destination);
  e.begin(0); e.out.gain.value = levelGain(vol); e.fill(sec);
  const buf = await oc.startRendering();
  let sum = 0, n = 0;
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = sr * 2; i < d.length; i++) { sum += d[i] * d[i]; n++; } }
  return 10 * Math.log10(sum / n);
}
