// Runs the solver in a Web Worker when there is one, on the main thread (after a frame) otherwise.
import { dailyDeal } from './engine/game';
import { solveFreecell, type FcSolveResult } from './engine/solver';
import type { FcState } from './engine/rules';
import type { FcWorkerReq } from './engine/fc.worker';

type Req = FcWorkerReq extends infer R ? (R extends { id: number } ? Omit<R, 'id'> : never) : never;

let worker: Worker | null | undefined;
let seq = 0;
const waiting = new Map<number, (v: unknown) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./engine/fc.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; out: unknown }>) => { waiting.get(e.data.id)?.(e.data.out); waiting.delete(e.data.id); };
    worker.onerror = () => { worker = null; for (const [, f] of waiting) f(undefined); waiting.clear(); };
  } catch { worker = null; }
  return worker;
}

function local(r: Req): unknown {
  return r.kind === 'daily' ? dailyDeal(r.day) : solveFreecell(r.state, r.budget);
}

function run<T>(r: Req): Promise<T> {
  const w = typeof Worker !== 'undefined' ? getWorker() : null;
  if (!w) return new Promise(res => setTimeout(() => res(local(r) as T), 16));
  return new Promise(res => {
    const id = ++seq;
    waiting.set(id, v => res((v === undefined ? local(r) : v) as T));
    w.postMessage({ ...r, id });
  });
}

export const computeDaily = (day: string) => run<number>({ kind: 'daily', day });
export const computeSolve = (state: FcState, budget: number) => run<FcSolveResult | null>({ kind: 'solve', state, budget });
