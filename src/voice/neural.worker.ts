/// <reference lib="webworker" />
// Neural text-to-speech for languages that phones and browsers have no system voice for (Latvian first of all).
//
// A Piper (VITS) voice runs fully on the device: espeak-ng turns text into phonemes (a slim WASM build that only
// carries the dictionaries we need, served from /tts/v1/), and onnxruntime-web turns phonemes into audio.
// The voice model is downloaded once from Hugging Face and kept in the Cache API, so later visits work offline.
//
// Messages in:  { t: 'load', voice: NeuralVoice, fetch: boolean }   — fetch=false only opens an already cached voice
//               { t: 'speak', id, text, rate }
// Messages out: { t: 'progress', loaded, total } · { t: 'ready' } · { t: 'missing' } · { t: 'error', msg }
//               { t: 'audio', id, pcm: Float32Array, sampleRate } · { t: 'fail', id, msg }

import * as ort from 'onnxruntime-web/wasm';
import type { NeuralVoice } from './neuralVoices';

declare const self: DedicatedWorkerGlobalScope;

const BASE = '/tts/v1/';
const CACHE = 'b125-voice-v1';

interface PiperConfig {
  audio: { sample_rate: number };
  espeak: { voice: string };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  phoneme_id_map: Record<string, number[]>;
  num_speakers?: number;
}

type PhonemizeModule = { callMain(args: string[]): void };
type CreatePhonemize = (m: Record<string, unknown>) => Promise<PhonemizeModule>;

let session: ort.InferenceSession | null = null;
let config: PiperConfig | null = null;
let createPhonemize: CreatePhonemize | null = null;
let phonWasm: ArrayBuffer | null = null;
let phonData: ArrayBuffer | null = null;
let loading: Promise<void> | null = null;

const post = (m: unknown, transfer: Transferable[] = []) => self.postMessage(m, transfer);

/** Download with progress, or come back from the cache. */
async function cached(url: string, fetchIt: boolean, progress?: (loaded: number, total: number) => void): Promise<ArrayBuffer | null> {
  let cache: Cache | null = null;
  try { cache = await caches.open(CACHE); } catch { /* private mode: no Cache API */ }
  const hit = cache ? await cache.match(url) : undefined;
  if (hit) return hit.arrayBuffer();
  if (!fetchIt) return null;
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get('Content-Length') ?? 0);
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0, lastTick = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); loaded += value.length;
    const now = Date.now();
    if (progress && now - lastTick > 120) { lastTick = now; progress(loaded, total); }
  }
  progress?.(loaded, total || loaded);
  const buf = new Uint8Array(loaded);
  let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
  try { await cache?.put(url, new Response(buf, { headers: { 'Content-Type': 'application/octet-stream' } })); } catch { /* quota: keep it in memory only */ }
  return buf.buffer;
}

async function load(v: NeuralVoice, fetchIt: boolean) {
  // the model first: a missing model means "offer the download", nothing else is fetched
  const cfgBuf = await cached(v.config, fetchIt);
  if (!cfgBuf) { post({ t: 'missing' }); return; }
  const model = await cached(v.model, fetchIt, (loaded, total) => post({ t: 'progress', loaded, total: total || v.bytes }));
  if (!model) { post({ t: 'missing' }); return; }
  config = JSON.parse(new TextDecoder().decode(cfgBuf)) as PiperConfig;

  const [mod, wasm, data] = await Promise.all([
    import(/* @vite-ignore */ BASE + 'piper_phonemize.js') as Promise<{ default: CreatePhonemize }>,
    fetch(BASE + 'piper_phonemize.wasm').then(r => r.arrayBuffer()),
    fetch(BASE + 'piper_phonemize.data').then(r => r.arrayBuffer()),
  ]);
  createPhonemize = mod.default; phonWasm = wasm; phonData = data;

  ort.env.wasm.wasmPaths = BASE;   // ort-wasm-simd-threaded.mjs + .wasm, self-hosted
  ort.env.wasm.numThreads = 1;          // the page is not cross-origin isolated: no SharedArrayBuffer threads
  ort.env.wasm.proxy = false;
  session = await ort.InferenceSession.create(new Uint8Array(model), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  post({ t: 'ready' });
}

interface PhonemizeOut { phoneme_ids: number[]; phonemes?: string[] }

/**
 * espeak-ng → phoneme ids (a fresh module per call: Emscripten's main() runs once per instance).
 * The result is printed to stdout — or to stderr together with a "Missing phoneme" notice — so both are read.
 */
async function phonemize(text: string): Promise<number[]> {
  if (!createPhonemize || !config) throw new Error('not loaded');
  const out = await new Promise<PhonemizeOut>((resolve, reject) => {
    let done = false;
    const take = (line: string) => {
      if (done) return;
      const i = line.indexOf('{"phoneme_ids"');
      if (i < 0) return;
      try { done = true; resolve(JSON.parse(line.slice(i)) as PhonemizeOut); } catch (e) { reject(e); }
    };
    createPhonemize!({
      wasmBinary: phonWasm!.slice(0),
      getPreloadedPackage: () => phonData!.slice(0),
      locateFile: (u: string) => BASE + u.split('/').pop(),
      print: take,
      printErr: take,
    }).then(m => {
      try { m.callMain(['-l', config!.espeak.voice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']); }
      catch (e) { if (!done && !(e && typeof e === 'object' && 'status' in e)) reject(e); }
      setTimeout(() => { if (!done) reject(new Error('phonemizer gave no output')); }, 4000);
    }, reject);
  });
  return toIds(out);
}

/** Map phonemes with the model's own table (the WASM's built-in table can lack symbols the model knows). */
function toIds(out: PhonemizeOut): number[] {
  const map = config?.phoneme_id_map;
  if (!map || !Object.keys(map).length || !out.phonemes?.length || !map['^'] || !map['_'] || !map['$']) return out.phoneme_ids;
  const ids: number[] = [...map['^'], ...map['_']];
  for (const ph of out.phonemes) { const v = map[ph]; if (v) ids.push(...v, ...map['_']); }
  ids.push(...map['$']);
  return ids;
}

async function speak(id: number, text: string, rate: number) {
  if (!session || !config) throw new Error('not loaded');
  const ids = await phonemize(text);
  const inf = config.inference;
  const feeds: Record<string, ort.Tensor> = {
    input: new ort.Tensor('int64', BigInt64Array.from(ids, n => BigInt(n)), [1, ids.length]),
    input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor('float32', Float32Array.from([inf.noise_scale, inf.length_scale / rate, inf.noise_w]), [3]),
  };
  if ((config.num_speakers ?? 1) > 1) feeds.sid = new ort.Tensor('int64', BigInt64Array.from([0n]), [1]);
  const out = await session.run(feeds);
  const first = out[session.outputNames[0]];
  const pcm = new Float32Array(first.data as Float32Array);   // own copy so it can be transferred
  post({ t: 'audio', id, pcm, sampleRate: config.audio.sample_rate }, [pcm.buffer]);
}

// one synthesis at a time, in order
let chain: Promise<unknown> = Promise.resolve();

self.onmessage = (e: MessageEvent) => {
  const m = e.data as { t: 'load'; voice: NeuralVoice; fetch: boolean } | { t: 'speak'; id: number; text: string; rate: number };
  if (m.t === 'load') {
    loading = (loading ?? Promise.resolve()).then(() => (session ? post({ t: 'ready' }) : load(m.voice, m.fetch)))
      .catch(err => { post({ t: 'error', msg: String((err as Error)?.message ?? err) }); })
      .finally(() => { loading = null; });
    return;
  }
  if (m.t === 'speak') {
    chain = chain.then(() => speak(m.id, m.text, m.rate)).catch(err => post({ t: 'fail', id: m.id, msg: String((err as Error)?.message ?? err) }));
  }
};
