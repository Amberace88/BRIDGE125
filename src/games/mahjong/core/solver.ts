import { availablePairs, freeTiles, isFree, type Geo } from './board';
import { rng } from './rng';
import { matchKey, matches } from './tiles';

// A small depth-first solver with a node budget — used for hints ("a move that keeps the board winnable") and the
// tests. Deals are solvable by construction and carry their own plan (see game.ts); the solver is only needed when
// the player's own moves left that plan, so it searches from the current position.
//
// Speed-ups: a key whose every remaining tile is free is removed at once (no choice matters), positions that failed
// once are remembered, moves that open up the most are tried first, and the search restarts a few times with a
// little randomness (dead ends in Mahjong are heavy-tailed: a fresh order often finds a way at once).

export interface SolveResult { moves: [number, number][] | null; nodes: number; exhausted: boolean }

function keyOf(faces: Int16Array): string {
  let s = '';
  for (let i = 0; i < faces.length; i += 15) {
    let v = 0;
    for (let k = 0; k < 15 && i + k < faces.length; k++) if (faces[i + k] >= 0) v |= 1 << k;
    s += String.fromCharCode(v + 48);
  }
  return s;
}

/** For every tile, all tiles that lie above it, directly or through other tiles (they must all go before it). */
const CLOSURE = new WeakMap<Geo, Set<number>[]>();
function closureOf(geo: Geo): Set<number>[] {
  let c = CLOSURE.get(geo);
  if (c) return c;
  c = geo.pos.map(() => new Set<number>());
  const order = geo.pos.map((_, i) => i).sort((a, b) => geo.pos[b].z - geo.pos[a].z);
  for (const i of order) for (const j of geo.above[i]) { c[i].add(j); for (const k of c[j]) c[i].add(k); }
  CLOSURE.set(geo, c);
  return c;
}

function search(geo: Geo, start: ArrayLike<number>, budget: number, dead: Set<string>, jitter: () => number): SolveResult {
  const over = closureOf(geo);
  const faces = Int16Array.from(start as ArrayLike<number>);
  const n = faces.length;
  const path: [number, number][] = [];
  let nodes = 0, out = false;
  let left = 0;
  for (let i = 0; i < n; i++) if (faces[i] >= 0) left++;
  const alive = new Map<number, number>();
  for (let i = 0; i < n; i++) if (faces[i] >= 0) { const k = matchKey(faces[i]); alive.set(k, (alive.get(k) ?? 0) + 1); }

  // how much removing tile i opens up: tiles under it, tiles beside it, and same-key tiles it is holding down
  const weight = (i: number) => {
    let w = geo.pos[i].z * 2;
    for (const j of geo.below[i]) if (faces[j] >= 0) w += 3;
    for (const j of geo.left[i]) if (faces[j] >= 0) w += 2;
    for (const j of geo.right[i]) if (faces[j] >= 0) w += 2;
    const k = matchKey(faces[i]);
    for (const j of geo.below[i]) if (faces[j] >= 0 && matchKey(faces[j]) === k) w += 6;
    return w;
  };

  const rec = (): boolean => {
    if (left === 0) return true;
    if (++nodes > budget) { out = true; return false; }
    const k = keyOf(faces);
    if (dead.has(k)) return false;
    let moves: [number, number][];
    const free = freeTiles(geo, faces);
    const freeBy = new Map<number, number[]>();
    for (const i of free) { const m = matchKey(faces[i]); const l = freeBy.get(m); if (l) l.push(i); else freeBy.set(m, [i]); }
    // a dead end for sure: the last two tiles of a key, one buried under the other
    for (let i = 0; i < n; i++) {
      if (faces[i] < 0) continue;
      const m = matchKey(faces[i]);
      if (alive.get(m) !== 2) continue;
      for (const j of over[i]) if (faces[j] >= 0 && matchKey(faces[j]) === m) { dead.add(k); return false; }
    }
    let safe: [number, number] | null = null;
    for (const [m, l] of freeBy) if (l.length >= 2 && l.length === alive.get(m) && l.length % 2 === 0) { safe = [l[0], l[1]]; break; }
    if (safe) moves = [safe];
    else {
      moves = availablePairs(geo, faces);
      if (!moves.length) { dead.add(k); return false; }
      const sc = new Map<[number, number], number>();
      for (const mv of moves) sc.set(mv, weight(mv[0]) + weight(mv[1]) + jitter() * 4);
      moves.sort((a, b) => sc.get(b)! - sc.get(a)!);
    }
    for (const [a, b] of moves) {
      const fa = faces[a], fb = faces[b], m = matchKey(fa);
      faces[a] = -1; faces[b] = -1; left -= 2; alive.set(m, alive.get(m)! - 2); path.push([a, b]);
      if (rec()) return true;
      path.pop(); faces[a] = fa; faces[b] = fb; left += 2; alive.set(m, alive.get(m)! + 2);
      if (out) return false;
    }
    if (!out) dead.add(k);
    return false;
  };

  const ok = rec();
  return { moves: ok ? path.slice() : null, nodes, exhausted: out };
}

export function solve(geo: Geo, start: ArrayLike<number>, budget = 30000): SolveResult {
  const dead = new Set<string>();
  let nodes = 0;
  const r = rng(0x9e3779b9);
  for (let attempt = 0; attempt < 6 && nodes < budget; attempt++) {
    const slice = Math.max(800, Math.floor(attempt < 5 ? budget / 8 : budget - nodes));
    const res = search(geo, start, Math.min(slice, budget - nodes), dead, attempt === 0 ? () => 0 : r);
    nodes += res.nodes;
    if (res.moves) return { moves: res.moves, nodes, exhausted: false };
    if (!res.exhausted) return { moves: null, nodes, exhausted: false }; // proven unsolvable
  }
  return { moves: null, nodes, exhausted: true };
}

/** Does this removal order clear the board from `faces`? */
export function planWorks(geo: Geo, faces: ArrayLike<number>, plan: [number, number][]): boolean {
  const f = Array.from(faces);
  let left = f.filter(x => x >= 0).length;
  if (plan.length * 2 !== left) return false;
  for (const [a, b] of plan) {
    if (!matches(f[a], f[b]) || !isFree(geo, f, a) || !isFree(geo, f, b)) return false;
    f[a] = -1; f[b] = -1; left -= 2;
  }
  return left === 0;
}
