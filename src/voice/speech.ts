// Speech output for the voice assistant: a small priority-aware queue on top of the Web Speech API.
//
//  · SpeechQueue — pure policy (testable with a fake backend and clock): one line at a time, short TTLs so lines
//    never pile up, stale moves/tips are dropped when the game moves on, important lines interrupt small talk.
//  · WebSpeech backend — voice choice per language (prefers natural/neural/online voices), async voice loading,
//    iOS unlock on the first gesture, cancel→speak gap, watchdog for lost `end` events, Chrome's ~15 s cut-off
//    keep-alive, and silence while the tab is hidden.

import { LANGS, type Lang } from '../i18n';
import type { Line, LineKind } from './narrate';

/* =========================================================================== queue policy */
export interface Backend {
  /** Start speaking; call `done` exactly once when finished or failed. Return false when nothing can be spoken. */
  speak(text: string, done: () => void): boolean;
  cancel(): void;
}

interface Item extends Line { at: number; ttl: number }

const TTL: Record<LineKind, number> = { low: 2500, move: 4000, tip: 6000, big: 9000 };
const MAX_QUEUE = 3;

export class SpeechQueue {
  private q: Item[] = [];
  private cur: Item | null = null;
  private token = 0;
  private be: Backend;
  private now: () => number;
  constructor(be: Backend, now: () => number = () => Date.now()) { this.be = be; this.now = now; }

  get speaking(): Line | null { return this.cur; }
  get pending(): readonly Line[] { return this.q; }

  /** Add lines produced by one game transition. */
  push(lines: Line[]) {
    for (const l of lines) this.add(l);
    this.pump();
  }

  private add(l: Line) {
    const t = this.now();
    this.q = this.q.filter(x => t - x.at < x.ttl);
    // the game moved on: queued tips are about a state that no longer exists
    // (a newer tip also replaces an older one)
    this.q = this.q.filter(x => x.kind !== 'tip');
    const item: Item = { ...l, at: t, ttl: TTL[l.kind] };
    if (this.cur && this.interrupts(this.cur, item)) {
      // keep only queued lines at least as important, then cut the current line off
      this.q = this.q.filter(x => x.pri >= item.pri);
      this.stopCurrent();
    }
    this.q.push(item);
    while (this.q.length > MAX_QUEUE) {
      // drop the least important (oldest first among equals)
      let k = 0;
      for (let i = 1; i < this.q.length; i++) if (this.q[i].pri < this.q[k].pri) k = i;
      this.q.splice(k, 1);
    }
  }

  private interrupts(cur: Item, next: Item) {
    if (cur.kind === 'tip' && next.kind !== 'tip') return true;     // tips are cheap
    if (cur.kind === 'low' && next.pri > cur.pri) return true;
    return next.pri >= 4 && next.pri > cur.pri;
  }

  private stopCurrent() {
    this.cur = null;
    this.token++;
    try { this.be.cancel(); } catch { /* */ }
  }

  private pump() {
    if (this.cur) return;
    const t = this.now();
    while (this.q.length) {
      const it = this.q.shift()!;
      if (t - it.at >= it.ttl) continue;
      const tok = ++this.token;
      this.cur = it;
      const ok = this.be.speak(it.text, () => {
        if (tok !== this.token) return;
        this.cur = null;
        this.pump();
      });
      if (ok) return;
      this.cur = null;
    }
  }

  /** Forget everything (leaving the table, tab hidden, voice switched off). */
  clear() {
    this.q = [];
    if (this.cur) this.stopCurrent();
  }
}

/* =========================================================================== voice choice */
export interface VoiceLike { name: string; lang: string; localService?: boolean; default?: boolean; voiceURI?: string }

/** Where a language has no voice on the device, speak a related language the player most likely understands. */
export const VOICE_FALLBACK: Record<Lang, Lang[]> = {
  en: [], lv: ['en'], ru: ['en'], uk: ['en'], lt: ['en'], et: ['en'], pl: ['en'], de: ['en'], be: ['ru', 'en'], kk: ['ru', 'en'],
  uz: ['ru', 'en'], az: ['ru', 'en'], ka: ['ru', 'en'], hy: ['ru', 'en'], ro: ['en'], bg: ['ru', 'en'], es: ['en'],
};

const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|pipe organ|fred|junior|ralph|kathy|grandpa|grandma|rocko|shelley|flo|eddy|reed|sandy)\b/i;

const tagOf = (v: VoiceLike) => v.lang.replace(/_/g, '-').toLowerCase();

/** Score a voice for a language (higher is better, -Infinity = unusable). */
export function scoreVoice(v: VoiceLike, lang: Lang): number {
  const tag = tagOf(v);
  const base = tag.split('-')[0] === 'mo' ? 'ro' : tag.split('-')[0];
  if (base !== lang) return -Infinity;
  const want = (LANGS.find(l => l.id === lang)?.intl ?? lang).toLowerCase();
  const region = want.split('-').pop();
  let s = 0;
  if (tag === want) s += 12;
  else if (region && tag.endsWith('-' + region)) s += 10;
  const n = v.name;
  if (/natural|neural|wavenet|premium|enhanced|siri/i.test(n)) s += 40;
  if (/online/i.test(n)) s += 25;
  if (/google/i.test(n)) s += 22;
  if (/microsoft/i.test(n)) s += 6;
  if (v.localService) s += 3;
  if (v.default) s += 2;
  if (NOVELTY.test(n)) s -= 100;
  if (/compact|espeak|robot/i.test(n)) s -= 25;
  return s;
}

export function pickVoice<V extends VoiceLike>(voices: readonly V[], lang: Lang): V | null {
  let best: V | null = null, bs = -Infinity;
  for (const v of voices) { const s = scoreVoice(v, lang); if (s > bs) { bs = s; best = v; } }
  return bs === -Infinity ? null : best;
}

/** The language actually spoken for a UI language: itself, a fallback, or null (silent). */
export function resolveSpeakLang(voices: readonly VoiceLike[], lang: Lang): Lang | null {
  for (const l of [lang, ...VOICE_FALLBACK[lang]]) if (pickVoice(voices, l)) return l;
  return null;
}

/* =========================================================================== Web Speech backend */
const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);
const isAndroid = () => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

export const RATE = 1.1;
export const PITCH = 1;

class WebSpeech implements Backend {
  lang: Lang = 'en';
  volume = 1;
  onActive: ((on: boolean) => void) | null = null;
  voice: SpeechSynthesisVoice | null = null;
  private live: SpeechSynthesisUtterance | null = null;   // keep a reference: GC'd utterances lose their events
  private lastCancel = 0;
  private keep: ReturnType<typeof setInterval> | null = null;
  private dog: ReturnType<typeof setTimeout> | null = null;

  setVoice(v: SpeechSynthesisVoice | null) { this.voice = v; }

  speak(text: string, done: () => void): boolean {
    const s = synth();
    if (!s || !this.voice || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return false;
    let finished = false;
    const finish = () => {
      if (finished) return; finished = true;
      if (this.keep) { clearInterval(this.keep); this.keep = null; }
      if (this.dog) { clearTimeout(this.dog); this.dog = null; }
      if (this.live === u) this.live = null;
      this.onActive?.(false);
      done();
    };
    const u = new SpeechSynthesisUtterance(text);
    u.voice = this.voice; u.lang = this.voice.lang; u.rate = RATE; u.pitch = PITCH; u.volume = this.volume;
    u.onstart = () => this.onActive?.(true);
    u.onend = finish;
    u.onerror = finish;
    this.live = u;
    const go = () => {
      if (finished) return;
      try {
        if (s.paused) s.resume();          // Safari can get stuck "paused" after an interruption
        s.speak(u);
      } catch { finish(); return; }
      // a lost `end` event must never freeze the narrator
      this.dog = setTimeout(() => { try { s.cancel(); } catch { /* */ } finish(); }, 2500 + text.length * 110);
      // Chrome (desktop, network voices) stops after ~15 s unless nudged; never on Android, where pause = stop
      if (!isAndroid() && this.voice && !this.voice.localService) {
        this.keep = setInterval(() => { if (s.speaking) { s.pause(); s.resume(); } }, 9000);
      }
    };
    // speaking right after cancel() is swallowed by Chrome/Safari — leave a short gap
    const gap = 90 - (Date.now() - this.lastCancel);
    if (gap > 0) setTimeout(go, gap); else go();
    return true;
  }

  cancel() {
    const s = synth(); if (!s) return;
    this.lastCancel = Date.now();
    try { s.cancel(); } catch { /* */ }
    this.onActive?.(false);
  }
}

/* =========================================================================== singleton */
type Listener = () => void;

class Narrator {
  readonly be = new WebSpeech();
  readonly queue = new SpeechQueue(this.be);
  private voices: SpeechSynthesisVoice[] = [];
  private uiLang: Lang = 'en';
  private subs = new Set<Listener>();
  private inited = false;
  private unlocked = false;
  speakLang: Lang | null = null;

  init() {
    if (this.inited) return;
    this.inited = true;
    const s = synth(); if (!s) return;
    const load = () => {
      const v = s.getVoices();
      if (v.length && v.length !== this.voices.length) { this.voices = v; this.choose(); }
    };
    load();
    try { s.addEventListener?.('voiceschanged', load); } catch { /* */ }
    // Safari / some Androids never fire voiceschanged: poll a little
    let n = 0;
    const iv = setInterval(() => { load(); if (++n > 20 || this.voices.length) clearInterval(iv); }, 250);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.queue.clear(); });
    // iOS / Safari only speak after a gesture has spoken once: prime with a silent utterance
    const unlock = () => {
      if (this.unlocked) return; this.unlocked = true;
      off();
      try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; s.speak(u); } catch { /* */ }
      load();
    };
    const evs = ['pointerdown', 'touchend', 'keydown'] as const;
    const off = () => evs.forEach(e => window.removeEventListener(e, unlock, true));
    evs.forEach(e => window.addEventListener(e, unlock, { capture: true, passive: true }));
  }

  private choose() {
    this.speakLang = resolveSpeakLang(this.voices, this.uiLang);
    this.be.setVoice(this.speakLang ? pickVoice(this.voices, this.speakLang) : null);
    for (const f of this.subs) f();
  }

  setLang(l: Lang) { if (l !== this.uiLang || !this.inited) { this.init(); this.uiLang = l; this.choose(); } }
  setVolume(v: number) { this.be.volume = Math.min(1, Math.max(0, v)); }
  say(lines: Line[]) { if (lines.length && this.speakLang) this.queue.push(lines); }
  stop() { this.queue.clear(); }
  get available() { return !!synth(); }
  get voiceName() { return this.be.voice?.name ?? null; }
  subscribe = (f: Listener) => { this.subs.add(f); return () => { this.subs.delete(f); }; };
}

let one: Narrator | null = null;
/** The app-wide narrator (created lazily; harmless where speech is unsupported). */
export function narrator(): Narrator { return (one ??= new Narrator()); }
