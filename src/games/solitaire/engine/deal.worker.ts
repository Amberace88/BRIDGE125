// Off the main thread: proves deals winnable (and finds hints) with the solver, so dealing never stutters.
import { dailySeed, winnableSeed, type Mode } from './game';
import { solveKlondike } from './solver';
import type { KState } from './klondike';

export type WorkerReq =
  | { id: number; kind: 'seed'; mode: Mode; start: number }
  | { id: number; kind: 'daily'; day: string }
  | { id: number; kind: 'solve'; state: KState; budget: number };

self.onmessage = (e: MessageEvent<WorkerReq>) => {
  const r = e.data;
  let out: unknown = null;
  try {
    if (r.kind === 'seed') out = winnableSeed(r.mode, r.start);
    else if (r.kind === 'daily') out = dailySeed(r.day);
    else out = solveKlondike(r.state, r.budget);
  } catch { out = null; }
  (self as unknown as Worker).postMessage({ id: r.id, out });
};
