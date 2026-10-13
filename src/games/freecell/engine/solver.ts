// A FreeCell solver: best-first search over supermoves, safe cards sent home after every move (exactly as the game
// does), states folded by symmetry (cell order, cascade order). Proves the daily deal winnable and finds hints.
// Deterministic: same input + budget → same answer on every device.

import {
  apply, autoAll, canHome, fcWon, foundCount, maxMovable, rankOf, runLength, stacks, suitOf,
  type FcMove, type FcState,
} from './rules';

export interface FcSolveResult {
  result: 'solved' | 'unsolvable' | 'budget';
  /** the winning line from the given state (each move is followed by the safe sends home) */
  path?: FcMove[];
  nodes: number;
}

function key(s: FcState): string {
  const cells = s.cells.map(c => (c == null ? '' : String.fromCharCode(48 + c))).sort().join('');
  const cols = s.cols.map(c => String.fromCharCode(...c.map(x => 48 + x))).sort().join(',');
  return cells + '|' + cols;
}

/** Lower is closer to solved. */
function heur(s: FcState): number {
  const home = foundCount(s);
  let h = (52 - home) * 3;
  // cards buried above a lower card of the same column must move again before that card can go home
  for (const col of s.cols) {
    let min = 99;
    for (let i = 0; i < col.length; i++) {
      const r = rankOf(col[i]);
      if (r > min) h += 1;
      if (i > 0 && !stacks(col[i - 1], col[i])) h += 1;
      if (r < min) min = r;
    }
  }
  // how deep the next card of each foundation sits
  for (let su = 0; su < 4; su++) {
    const want = s.found[su] + 1;
    if (want > 13) continue;
    for (const col of s.cols) {
      const k = col.findIndex(c => suitOf(c) === su && rankOf(c) === want);
      if (k >= 0) { h += (col.length - 1 - k) * 1.5; break; }
    }
  }
  let used = 0, empty = 0;
  for (const c of s.cells) if (c != null) used++;
  for (const c of s.cols) if (!c.length) empty++;
  return h + used * 1.5 - empty * 2;
}

/** Candidate moves (pruned: one free cell / one empty cascade stands for all of them). */
export function solverMoves(s: FcState): FcMove[] {
  const out: FcMove[] = [];
  const cell = s.cells.findIndex(c => c == null);
  const empty = s.cols.findIndex(c => !c.length);
  // home
  s.cells.forEach((c, i) => { if (c != null && canHome(s, c)) out.push({ from: { k: 'cell', i }, to: { k: 'found', i: suitOf(c) }, n: 1 }); });
  s.cols.forEach((col, i) => { const c = col[col.length - 1]; if (c != null && canHome(s, c)) out.push({ from: { k: 'col', i }, to: { k: 'found', i: suitOf(c) }, n: 1 }); });
  const lim = maxMovable(s, false), limE = maxMovable(s, true);
  // cascade → cascade
  s.cols.forEach((col, i) => {
    if (!col.length) return;
    const L = runLength(col);
    for (let j = 0; j < 8; j++) {
      if (j === i) continue;
      const dst = s.cols[j];
      if (dst.length) {
        const t = dst[dst.length - 1];
        const need = rankOf(t) - 1;
        const n = need - rankOf(col[col.length - 1]) + 1;
        if (n >= 1 && n <= L && n <= lim && stacks(t, col[col.length - n])) out.push({ from: { k: 'col', i }, to: { k: 'col', i: j }, n });
      }
    }
    if (empty >= 0 && col.length > 1) {
      const top = Math.min(L, limE, L === col.length ? col.length - 1 : L);
      for (let n = top; n >= 1; n--) out.push({ from: { k: 'col', i }, to: { k: 'col', i: empty }, n });
    }
  });
  // cell → cascade
  s.cells.forEach((c, i) => {
    if (c == null) return;
    for (let j = 0; j < 8; j++) {
      const dst = s.cols[j];
      if (dst.length && stacks(dst[dst.length - 1], c)) out.push({ from: { k: 'cell', i }, to: { k: 'col', i: j }, n: 1 });
    }
    if (empty >= 0) out.push({ from: { k: 'cell', i }, to: { k: 'col', i: empty }, n: 1 });
  });
  // cascade → cell
  if (cell >= 0) s.cols.forEach((col, i) => { if (col.length) out.push({ from: { k: 'col', i }, to: { k: 'cell', i: cell }, n: 1 }); });
  return out;
}

interface Node { s: FcState; m: FcMove | null; p: Node | null; g: number; f: number }

class Heap {
  a: Node[] = [];
  get size() { return this.a.length; }
  push(n: Node) {
    const a = this.a; a.push(n);
    let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= n.f) break; a[i] = a[p]; i = p; }
    a[i] = n;
  }
  pop(): Node {
    const a = this.a; const top = a[0]; const last = a.pop()!;
    if (a.length) {
      let i = 0; const n = a.length;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        let mf = last.f;
        if (l < n && a[l].f < mf) { m = l; mf = a[l].f; }
        if (r < n && a[r].f < mf) m = r;
        if (m === i) break;
        a[i] = a[m]; i = m;
      }
      a[i] = last;
    }
    return top;
  }
}

/** Solves from `start` (which should already have its safe cards home). `budget` = states expanded at most. */
export function solveFreecell(start: FcState, budget = 60_000): FcSolveResult {
  const s0 = autoAll(start);
  if (fcWon(s0)) return { result: 'solved', path: [], nodes: 0 };
  const seen = new Set<string>([key(s0)]);
  const open = new Heap();
  open.push({ s: s0, m: null, p: null, g: 0, f: heur(s0) });
  let nodes = 0;
  while (open.size) {
    const cur = open.pop();
    if (++nodes > budget) return { result: 'budget', nodes };
    for (const m of solverMoves(cur.s)) {
      const ns = autoAll(apply(cur.s, m));
      const k = key(ns);
      if (seen.has(k)) continue;
      seen.add(k);
      const node: Node = { s: ns, m, p: cur, g: cur.g + 1, f: 0 };
      if (fcWon(ns)) {
        const path: FcMove[] = [];
        for (let x: Node | null = node; x && x.m; x = x.p) path.push(x.m);
        return { result: 'solved', path: path.reverse(), nodes };
      }
      node.f = heur(ns) + node.g * 1.6;
      open.push(node);
    }
  }
  return { result: 'unsolvable', nodes };
}
