import { generateSteps, type Puzzle } from './core/generator';
import type { Level } from './core/grid';

// Puzzles come from a Web Worker; without workers the same generator runs in small chunks between frames,
// so the UI never freezes. Results are memoised per (level, seed) for the session.

let worker: Worker | null | undefined;
let nextId = 1;
const waiting = new Map<number, { resolve: (p: Puzzle) => void; reject: (e: Error) => void }>();
const memo = new Map<string, Promise<Puzzle>>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./gen.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; puzzle?: Puzzle; error?: string }>) => {
      const w = waiting.get(e.data.id);
      if (!w) return;
      waiting.delete(e.data.id);
      if (e.data.puzzle) w.resolve(e.data.puzzle); else w.reject(new Error(e.data.error ?? 'generator failed'));
    };
    worker.onerror = () => {
      // a broken worker: fall back to the main thread for everything in flight and from now on
      worker?.terminate(); worker = null;
      const all = [...waiting.entries()]; waiting.clear();
      for (const [, w] of all) w.reject(new Error('worker'));
    };
  } catch { worker = null; }
  return worker;
}

function chunked(level: Level, seed: number): Promise<Puzzle> {
  return new Promise((resolve, reject) => {
    const it = generateSteps(level, seed);
    const tick = () => {
      try {
        const t0 = performance.now();
        // ~12 ms of work per frame
        while (performance.now() - t0 < 12) { const x = it.next(); if (x.done) { resolve(x.value); return; } }
        setTimeout(tick, 0);
      } catch (e) { reject(e as Error); }
    };
    setTimeout(tick, 0);
  });
}

function viaWorker(level: Level, seed: number): Promise<Puzzle> {
  const w = getWorker();
  if (!w) return chunked(level, seed);
  const id = nextId++;
  return new Promise<Puzzle>((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    w.postMessage({ id, level, seed });
  }).catch(() => chunked(level, seed));
}

/** The puzzle of (level, seed) — identical on every device for the same seed. */
export function puzzleFor(level: Level, seed: number): Promise<Puzzle> {
  const k = level + ':' + seed;
  let p = memo.get(k);
  if (!p) { p = viaWorker(level, seed); memo.set(k, p); p.catch(() => memo.delete(k)); }
  return p;
}
