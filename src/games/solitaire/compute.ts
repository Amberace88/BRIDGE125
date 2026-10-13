// Runs the solver work in a Web Worker when there is one, on the main thread (after a frame) otherwise.
import { dailySeed, winnableSeed, type Mode } from './engine/game';
import { solveKlondike, type SolveResult } from './engine/solver';
import type { KState } from './engine/klondike';
import type { WorkerReq } from './engine/deal.worker';

type Req = WorkerReq extends infer R ? (R extends { id: number } ? Omit<R, 'id'> : never) : never;

let worker: Worker | null | undefined;
let seq = 0;
const waiting = new Map<number, (v: unknown) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./engine/deal.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; out: unknown }>) => { waiting.get(e.data.id)?.(e.data.out); waiting.delete(e.data.id); };
    worker.onerror = () => { worker = null; for (const [, f] of waiting) f(undefined); waiting.clear(); };
  } catch { worker = null; }
  return worker;
}

function local(r: Req): unknown {
  if (r.kind === 'seed') return winnableSeed(r.mode, r.start);
  if (r.kind === 'daily') return dailySeed(r.day);
  return solveKlondike(r.state, r.budget);
}

function run<T>(r: Req): Promise<T> {
  const w = typeof Worker !== 'undefined' ? getWorker() : null;
  if (!w) return new Promise(res => setTimeout(() => res(local(r) as T), 16));
  return new Promise(res => {
    const id = ++seq;
    // worker died mid-request → compute here
    waiting.set(id, v => res((v === undefined ? local(r) : v) as T));
    w.postMessage({ ...r, id });
  });
}

export const computeSeed = (mode: Mode, start: number) => run<number>({ kind: 'seed', mode, start });
export const computeDaily = (day: string) => run<number>({ kind: 'daily', day });
export const computeSolve = (state: KState, budget: number) => run<SolveResult | null>({ kind: 'solve', state, budget });
