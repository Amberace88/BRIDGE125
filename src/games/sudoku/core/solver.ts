import { ALL, boxOf, colOf, rowOf, type Grid } from './grid';
import { shuffle } from './rng';

// Backtracking solver on bitmasks with "fewest candidates first" (MRV). Solves any valid 9×9 in well under a millisecond
// and counts solutions up to a limit (2 is enough to prove uniqueness).

const R = Uint8Array.from({ length: 81 }, (_, i) => rowOf(i));
const C = Uint8Array.from({ length: 81 }, (_, i) => colOf(i));
const B = Uint8Array.from({ length: 81 }, (_, i) => boxOf(i));
const POP = Uint8Array.from({ length: 512 }, (_, m) => { let n = 0; for (let x = m; x; x &= x - 1) n++; return n; });

interface Ctx { v: Int8Array; rows: Int32Array; cols: Int32Array; boxes: Int32Array; count: number; limit: number; out: Grid | null; r?: () => number }

function rec(x: Ctx): void {
  let best = -1, bestMask = 0, bestN = 10;
  const { v, rows, cols, boxes } = x;
  for (let i = 0; i < 81; i++) {
    if (v[i]) continue;
    const m = ALL & ~(rows[R[i]] | cols[C[i]] | boxes[B[i]]);
    const n = POP[m];
    if (n === 0) return;
    if (n < bestN) { best = i; bestMask = m; bestN = n; if (n === 1) break; }
  }
  if (best < 0) {
    if (x.count === 0 && x.out) for (let i = 0; i < 81; i++) x.out[i] = v[i];
    x.count++;
    return;
  }
  const r = R[best], c = C[best], b = B[best];
  const digits: number[] = [];
  for (let d = 1; d <= 9; d++) if (bestMask & (1 << (d - 1))) digits.push(d);
  if (x.r) shuffle(digits, x.r);
  for (const d of digits) {
    const bm = 1 << (d - 1);
    v[best] = d; rows[r] |= bm; cols[c] |= bm; boxes[b] |= bm;
    rec(x);
    v[best] = 0; rows[r] &= ~bm; cols[c] &= ~bm; boxes[b] &= ~bm;
    if (x.count >= x.limit) return;
  }
}

function ctx(g: Grid, limit: number, out: Grid | null, r?: () => number): Ctx | null {
  const x: Ctx = { v: new Int8Array(81), rows: new Int32Array(9), cols: new Int32Array(9), boxes: new Int32Array(9), count: 0, limit, out, r };
  for (let i = 0; i < 81; i++) {
    const d = g[i];
    if (!d) continue;
    const bm = 1 << (d - 1);
    if ((x.rows[R[i]] | x.cols[C[i]] | x.boxes[B[i]]) & bm) return null; // the givens clash
    x.v[i] = d; x.rows[R[i]] |= bm; x.cols[C[i]] |= bm; x.boxes[B[i]] |= bm;
  }
  return x;
}

/** Number of solutions, counting at most `limit`. */
export function countSolutions(g: Grid, limit = 2): number {
  const x = ctx(g, limit, null);
  if (!x) return 0;
  rec(x);
  return x.count;
}

export const isUnique = (g: Grid) => countSolutions(g, 2) === 1;

/** The (first) solution, or null when there is none. */
export function solve(g: Grid): Grid | null {
  const out: Grid = new Array(81).fill(0);
  const x = ctx(g, 1, out);
  if (!x) return null;
  rec(x);
  return x.count ? out : null;
}

/** A random complete, valid grid. */
export function randomSolution(r: () => number): Grid {
  const out: Grid = new Array(81).fill(0);
  const x = ctx(out.slice(), 1, out, r)!;
  rec(x);
  return out;
}
