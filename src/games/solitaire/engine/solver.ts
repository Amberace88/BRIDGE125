// Klondike solver — "thoughtful" (all cards known) depth-first search with a transposition table.
//
// Used for: the winnable-deal guarantee (every new deal and the daily deal are checked before play), the smart hint,
// and "no more moves". It only ever plays real, legal moves (a subset of them — no foundation → tableau moves, partial
// stack moves only when they free a card for a foundation), so any solution it reports can be replayed move by move
// through the game engine. It follows the standard rules (unlimited passes through the stock).

import { dealKlondike, kRank, kRed, kSafeHome, kSuit, type KMove, type KPile, type KState } from './klondike';

interface N {
  tab: number[][];
  down: number[];
  /** foundation heights per suit */
  f: number[];
  stock: number[];
  waste: number[];
}

export interface SolveResult {
  /** solved: a winning line was found · failed: the search ran out of moves · unknown: the node budget ran out */
  result: 'solved' | 'failed' | 'unknown';
  /** the winning line as real game moves (when solved) */
  path?: KMove[];
  nodes: number;
}

const fromState = (s: KState): N => ({
  tab: s.tab.map(t => t.c.slice()), down: s.tab.map(t => t.d), f: s.found.map(x => x.length),
  stock: s.stock.slice(), waste: s.waste.slice(),
});
const cloneN = (n: N): N => ({ tab: n.tab.map(c => c.slice()), down: n.down.slice(), f: n.f.slice(), stock: n.stock.slice(), waste: n.waste.slice() });

const TAB = (i: number): KPile => ({ k: 'tab', i });
const WASTE: KPile = { k: 'waste' };
const FOUND = (i: number): KPile => ({ k: 'found', i });
const DRAW: KMove = { t: 'draw' };

function flipTop(n: N, i: number) {
  const len = n.tab[i].length;
  if (len > 0 && n.down[i] >= len) n.down[i] = len - 1;
}

/** Plays every safe foundation move (never needed in the tableau again), recording them. */
function autoSafe(n: N, path: KMove[]) {
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i < 7; i++) {
      const col = n.tab[i];
      if (col.length === 0 || n.down[i] >= col.length) continue;
      const top = col[col.length - 1];
      const s = kSuit(top);
      if (n.f[s] === kRank(top) - 1 && kSafeHome(n.f, top)) {
        col.pop(); n.f[s]++; flipTop(n, i);
        path.push({ t: 'move', from: TAB(i), to: FOUND(s), n: 1 });
        changed = true;
      }
    }
    if (n.waste.length) {
      const top = n.waste[n.waste.length - 1];
      const s = kSuit(top);
      if (n.f[s] === kRank(top) - 1 && kSafeHome(n.f, top)) {
        n.waste.pop(); n.f[s]++;
        path.push({ t: 'move', from: WASTE, to: FOUND(s), n: 1 });
        changed = true;
      }
    }
  }
}

const won = (n: N) => n.f[0] === 13 && n.f[1] === 13 && n.f[2] === 13 && n.f[3] === 13;

/** Talon empty and nothing face down: finishes by itself — play it out (lowest card first). */
function finishable(n: N) {
  if (n.stock.length || n.waste.length) return false;
  for (let i = 0; i < 7; i++) if (n.down[i] > 0) return false;
  return true;
}
function finish(n: N, path: KMove[]) {
  for (let guard = 0; guard < 60 && !won(n); guard++) {
    let bi = -1, br = 99;
    for (let i = 0; i < 7; i++) {
      const col = n.tab[i];
      if (!col.length) continue;
      const top = col[col.length - 1];
      if (n.f[kSuit(top)] === kRank(top) - 1 && kRank(top) < br) { br = kRank(top); bi = i; }
    }
    if (bi < 0) return;
    const top = n.tab[bi].pop()!; const s = kSuit(top); n.f[s]++;
    path.push({ t: 'move', from: TAB(bi), to: FOUND(s), n: 1 });
  }
}

const CH = (id: number) => String.fromCharCode(40 + id);
function keyOf(n: N): string {
  const cols: string[] = [];
  for (let i = 0; i < 7; i++) {
    let s = String.fromCharCode(48 + n.down[i]);
    for (const c of n.tab[i]) s += CH(c);
    cols.push(s);
  }
  cols.sort();
  let t = '';
  for (const c of n.stock) t += CH(c);
  t += '/';
  for (const c of n.waste) t += CH(c);
  return cols.join(',') + '|' + t;
}

interface Talon { card: number; stock: number[]; waste: number[]; draws: number }

/** Cards reachable from the talon (first time each shows on the waste), with the stock/waste after reaching them. */
function talon(n: N, k: number): Talon[] {
  const out: Talon[] = [];
  let s = n.stock.slice(), w = n.waste.slice();
  const total = s.length + w.length;
  if (!total) return out;
  const seen = new Set<number>();
  if (w.length) { const t = w[w.length - 1]; seen.add(t); out.push({ card: t, stock: s.slice(), waste: w.slice(), draws: 0 }); }
  const steps = Math.ceil(s.length / k) + 1 + Math.ceil(total / k);
  for (let step = 1; step <= steps; step++) {
    if (s.length === 0) { s = w.reverse(); w = []; continue; }
    for (let i = 0; i < k && s.length; i++) w.push(s.pop()!);
    const t = w[w.length - 1];
    if (!seen.has(t)) { seen.add(t); out.push({ card: t, stock: s.slice(), waste: w.slice(), draws: step }); }
  }
  return out;
}

const fits = (a: number, b: number) => kRank(b) === kRank(a) + 1 && kRed(a) !== kRed(b);

interface Cand { pri: number; make: () => { n: N; moves: KMove[] } }

function candidates(n: N, draw: number): Cand[] {
  const out: Cand[] = [];
  const tops: number[] = n.tab.map((c, i) => (c.length > n.down[i] ? c[c.length - 1] : -1));

  // column tops → foundation (the safe ones were already played)
  for (let i = 0; i < 7; i++) {
    const top = tops[i];
    if (top < 0 || n.f[kSuit(top)] !== kRank(top) - 1) continue;
    const reveals = n.down[i] > 0 && n.tab[i].length - n.down[i] === 1;
    out.push({ pri: reveals ? 7 : 3, make: () => {
      const c = cloneN(n); c.tab[i].pop(); c.f[kSuit(top)]++; flipTop(c, i);
      return { n: c, moves: [{ t: 'move', from: TAB(i), to: FOUND(kSuit(top)), n: 1 }] };
    } });
  }

  // tableau → tableau
  for (let i = 0; i < 7; i++) {
    const col = n.tab[i];
    const d = n.down[i];
    if (col.length <= d) continue;
    for (let j = d; j < col.length; j++) {
      const head = col[j];
      const whole = j === d;
      if (!whole) {
        // a partial stack only moves to free the card above it for its foundation
        const under = col[j - 1];
        if (n.f[kSuit(under)] !== kRank(under) - 1) continue;
      }
      let emptyDone = false;
      for (let k = 0; k < 7; k++) {
        if (k === i) continue;
        const dest = n.tab[k];
        if (dest.length === 0) {
          if (kRank(head) !== 13 || emptyDone) continue;
          if (whole && d === 0) continue;           // a king already alone at the bottom
          emptyDone = true;                         // all empty columns are alike
        } else if (dest.length <= n.down[k] || !fits(head, dest[dest.length - 1])) continue;
        const pri = whole ? (d > 0 ? 8 + Math.min(d, 6) * 0.1 : 1) : 4;
        out.push({ pri, make: () => {
          const c = cloneN(n);
          const moving = c.tab[i].splice(j);
          c.tab[k].push(...moving); flipTop(c, i);
          return { n: c, moves: [{ t: 'move', from: TAB(i), to: TAB(k), n: moving.length }] };
        } });
      }
    }
  }

  // talon → foundation / tableau
  for (const t of talon(n, draw)) {
    const card = t.card;
    const pre: KMove[] = Array.from({ length: t.draws }, () => DRAW);
    const pick = () => { const c = cloneN(n); c.stock = t.stock.slice(); c.waste = t.waste.slice(); c.waste.pop(); return c; };
    if (n.f[kSuit(card)] === kRank(card) - 1) {
      out.push({ pri: 5 - t.draws * 0.01, make: () => {
        const c = pick(); c.f[kSuit(card)]++;
        return { n: c, moves: [...pre, { t: 'move', from: WASTE, to: FOUND(kSuit(card)), n: 1 }] };
      } });
    }
    let emptyDone = false;
    for (let k = 0; k < 7; k++) {
      const dest = n.tab[k];
      if (dest.length === 0) {
        if (kRank(card) !== 13 || emptyDone) continue;
        emptyDone = true;
      } else if (dest.length <= n.down[k] || !fits(card, dest[dest.length - 1])) continue;
      out.push({ pri: 6 - t.draws * 0.01, make: () => {
        const c = pick(); c.tab[k].push(card);
        return { n: c, moves: [...pre, { t: 'move', from: WASTE, to: TAB(k), n: 1 }] };
      } });
    }
  }

  out.sort((a, b) => b.pri - a.pri);
  return out;
}

/** Solves a Klondike position. `budget` caps the positions visited. */
export function solveKlondike(s: KState, budget = 50_000): SolveResult {
  const root = fromState(s);
  const path: KMove[] = [];
  autoSafe(root, path);
  const seen = new Set<string>();
  let nodes = 0;
  let out = false;
  const draw = s.draw;

  const dfs = (n: N): boolean => {
    if (won(n)) return true;
    if (finishable(n)) { finish(n, path); return won(n); }
    if (++nodes > budget) { out = true; return false; }
    const key = keyOf(n);
    if (seen.has(key)) return false;
    seen.add(key);
    for (const c of candidates(n, draw)) {
      const mark = path.length;
      const { n: child, moves } = c.make();
      path.push(...moves);
      autoSafe(child, path);
      if (dfs(child)) return true;
      path.length = mark;
      if (out) return false;
    }
    return false;
  };

  const ok = dfs(root);
  if (ok) return { result: 'solved', path: path.slice(), nodes };
  return { result: out ? 'unknown' : 'failed', nodes };
}

/**
 * Is there still something worth doing? (a foundation move, a card freed, a talon card placed …). False means only
 * pointless shuffling is left — the game shows "No more moves". Standard rules (unlimited passes).
 */
export function klondikeHasUsefulMove(s: KState): boolean {
  const n = fromState(s);
  const path: KMove[] = [];
  autoSafe(n, path);
  if (path.length || won(n) || finishable(n)) return true;
  return candidates(n, s.draw).length > 0;
}

/** Node budget for the winnable-deal check (deterministic: the daily deal depends on it). */
export const DEAL_BUDGET = 40_000;

/** True when the deal for `seed` is proven winnable (standard rules). */
export const isWinnableSeed = (seed: number, draw: 1 | 3, budget = DEAL_BUDGET) =>
  solveKlondike(dealKlondike(seed, draw), budget).result === 'solved';

/** The first winnable deal at or after `start` (deterministic for a given start). */
export function findWinnableSeed(start: number, draw: 1 | 3, budget = DEAL_BUDGET, maxTries = 400): number {
  for (let k = 0; k < maxTries; k++) {
    const seed = ((start + k - 1) % 999_999_999) + 1;
    if (isWinnableSeed(seed, draw, budget)) return seed;
  }
  return start;
}
