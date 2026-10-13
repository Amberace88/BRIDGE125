// Main-thread side of the on-device neural voice: a speech Backend that sends text to the TTS worker and plays
// the returned audio through its own AudioContext (so the sound-effects volume never touches the voice).

import type { Lang } from '../i18n';
import { neuralVoiceFor } from './neuralVoices';

export type NeuralStatus = 'none' | 'checking' | 'missing' | 'downloading' | 'loading' | 'ready' | 'error';
export interface NeuralState { lang: Lang | null; status: NeuralStatus; loaded: number; total: number }

type Out =
  | { t: 'progress'; loaded: number; total: number } | { t: 'ready' } | { t: 'missing' } | { t: 'error'; msg: string }
  | { t: 'audio'; id: number; pcm: Float32Array; sampleRate: number } | { t: 'fail'; id: number; msg: string };

const CACHE = 'b125-voice-v1';
const MEMO = 160;

export class NeuralTTS {
  volume = 1;
  rate = 1.06;
  onActive: ((on: boolean) => void) | null = null;
  state: NeuralState = { lang: null, status: 'none', loaded: 0, total: 0 };
  private worker: Worker | null = null;
  private subs = new Set<() => void>();
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private src: AudioBufferSourceNode | null = null;
  private waiting = new Map<number, (r: { pcm: Float32Array; sampleRate: number } | null) => void>();
  private seq = 0;
  private token = 0;
  private memo = new Map<string, AudioBuffer>();

  get ready() { return this.state.status === 'ready'; }
  subscribe = (f: () => void) => { this.subs.add(f); return () => { this.subs.delete(f); }; };
  private set(p: Partial<NeuralState>) { this.state = { ...this.state, ...p }; for (const f of this.subs) f(); }

  /** Open the voice for `lang`: from the cache only (fetch=false) or downloading it (fetch=true). */
  open(lang: Lang, fetch: boolean) {
    const v = neuralVoiceFor(lang);
    if (!v || typeof Worker === 'undefined') { this.set({ lang, status: 'none' }); return; }
    if (this.state.lang !== lang) this.close();
    const s = this.state.status;
    if (s === 'ready' || s === 'downloading' || s === 'loading' || (s === 'checking' && !fetch)) return;
    if (!fetch && (s === 'missing' || s === 'error')) return;
    this.set({ lang, status: fetch ? 'downloading' : 'checking', loaded: 0, total: v.bytes });
    this.ensureWorker().postMessage({ t: 'load', voice: v, fetch });
  }

  /** Forget the downloaded voice (frees the storage). */
  async remove() {
    this.close();
    try { await caches.delete(CACHE); } catch { /* */ }
    this.set({ status: 'missing', loaded: 0 });
  }

  private close() {
    this.cancel();
    this.worker?.terminate(); this.worker = null;
    for (const f of this.waiting.values()) f(null);
    this.waiting.clear(); this.memo.clear();
    this.state = { lang: null, status: 'none', loaded: 0, total: 0 };
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const w = new Worker(new URL('./neural.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<Out>) => {
      const m = e.data;
      switch (m.t) {
        case 'progress': this.set({ status: m.total && m.loaded >= m.total ? 'loading' : 'downloading', loaded: m.loaded, total: m.total }); break;
        case 'missing': this.set({ status: 'missing' }); break;
        case 'ready': this.set({ status: 'ready' }); break;
        case 'error': this.set({ status: 'error' }); console.warn('[voice] neural voice failed:', m.msg); break;
        case 'audio': { const f = this.waiting.get(m.id); this.waiting.delete(m.id); f?.({ pcm: m.pcm, sampleRate: m.sampleRate }); break; }
        case 'fail': { console.warn('[voice] neural synthesis failed:', m.msg); const f = this.waiting.get(m.id); this.waiting.delete(m.id); f?.(null); break; }
      }
    };
    w.onerror = () => { this.set({ status: 'error' }); };
    this.worker = w;
    return w;
  }

  /** Create / resume the audio output — call from a user gesture (iOS). */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.gain = this.ctx.createGain();
        this.gain.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch { /* no Web Audio */ }
  }

  /** Backend.speak */
  speak(text: string, done: () => void): boolean {
    if (!this.ready || !this.worker || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return false;
    this.unlock();
    if (!this.ctx) return false;
    const tok = ++this.token;
    let finished = false;
    const finish = () => { if (finished) return; finished = true; done(); };
    const hit = this.memo.get(text);
    if (hit) { this.play(hit, tok, finish); return true; }
    const id = ++this.seq;
    this.waiting.set(id, r => {
      if (tok !== this.token || !r || !this.ctx) { finish(); return; }
      const buf = this.ctx.createBuffer(1, r.pcm.length, r.sampleRate);
      buf.copyToChannel(r.pcm as Float32Array<ArrayBuffer>, 0);
      this.memo.set(text, buf);
      if (this.memo.size > MEMO) this.memo.delete(this.memo.keys().next().value!);
      this.play(buf, tok, finish);
    });
    this.worker.postMessage({ t: 'speak', id, text, rate: this.rate });
    return true;
  }

  private play(buf: AudioBuffer, tok: number, finish: () => void) {
    const ctx = this.ctx!, g = this.gain!;
    if (tok !== this.token) { finish(); return; }
    try { this.src?.stop(); } catch { /* */ }
    g.gain.value = this.volume;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(g);
    this.src = src;
    // onended is lost when the context is suspended (iOS before the first tap) — never freeze the narrator
    const dog = setTimeout(end, buf.duration * 1000 + 1500);
    function end() { clearTimeout(dog); finish(); }
    src.onended = () => { if (this.src === src) { this.src = null; this.onActive?.(false); } end(); };
    this.onActive?.(true);
    src.start();
  }

  /** Backend.cancel */
  cancel() {
    this.token++;
    if (this.src) { try { this.src.stop(); } catch { /* */ } this.src = null; this.onActive?.(false); }
  }
}
