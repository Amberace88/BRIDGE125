// Off the main thread: proves the daily deal winnable and finds hints with the solver, so play never stutters.
import { dailyDeal } from './game';
import { solveFreecell } from './solver';
import type { FcState } from './rules';

export type FcWorkerReq =
  | { id: number; kind: 'daily'; day: string }
  | { id: number; kind: 'solve'; state: FcState; budget: number };

self.onmessage = (e: MessageEvent<FcWorkerReq>) => {
  const r = e.data;
  let out: unknown = null;
  try {
    out = r.kind === 'daily' ? dailyDeal(r.day) : solveFreecell(r.state, r.budget);
  } catch { out = null; }
  (self as unknown as Worker).postMessage({ id: r.id, out });
};
