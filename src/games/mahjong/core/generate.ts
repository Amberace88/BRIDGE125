import { geoOf, isFree, type Geo } from './board';
import type { LayoutId } from './layouts';
import { rng, shuffle } from './rng';
import { fullPairs, pairUp } from './tiles';

// Every deal is SOLVABLE by construction: the board is filled pair by pair in reverse, and each pair is placed only
// where both tiles would be free at that moment. Removing the pairs in the opposite order then always works.
//
//   placement step k fills tiles a, b with one matching pair; the board then holds exactly the tiles of steps ≤ k,
//   which is the board the player sees right before removing a, b in the reverse order — so a, b must be free there.
//
// A placement is rejected when it would strand an empty spot forever (both its sides already filled — it could never
// be placed free), and a tile only goes in once everything below it is in (nothing is ever slid under a tile).

export interface Deal {
  /** face per position (−1 = no tile) */
  faces: number[];
  /** the solution: pairs in removal order */
  solution: [number, number][];
}

/** Pairs of positions in PLACEMENT order (first pair placed = last removed), or null after too many restarts. */
export function placementOrder(geo: Geo, active: boolean[], r: () => number, restarts = 400): [number, number][] | null {
  const n = geo.pos.length;
  const total = active.reduce((k, a) => k + (a ? 1 : 0), 0);
  if (total % 2) return null;
  const filled = new Int8Array(n).fill(-1); // reuse isFree: ≥0 filled, −1 empty
  const cand: number[] = [];

  const supported = (i: number) => { for (const j of geo.below[i]) if (active[j] && filled[j] < 0) return false; return true; };
  const placeable = (i: number) => {
    if (!active[i] || filled[i] >= 0 || !supported(i)) return false;
    filled[i] = 0; const ok = isFree(geo, filled, i); filled[i] = -1;
    return ok;
  };
  // A run of empty spots in a row that is closed by filled tiles at BOTH ends can never be completed: whichever of
  // its spots is placed last has both sides filled. `closed` walks the empty run from i in one direction.
  const seen = new Int32Array(n);
  let stamp = 0;
  const closed = (i: number, dir: number[][]) => {
    stamp++;
    const stack = [i];
    seen[i] = stamp;
    while (stack.length) {
      const u = stack.pop()!;
      for (const v of dir[u]) {
        if (filled[v] >= 0) return true;
        if (active[v] && seen[v] !== stamp) { seen[v] = stamp; stack.push(v); }
      }
    }
    return false;
  };
  const stranded = (i: number) => active[i] && filled[i] < 0 && closed(i, geo.left) && closed(i, geo.right);
  const strandsAround = (a: number) => {
    for (const j of geo.left[a]) if (stranded(j)) return true;
    for (const j of geo.right[a]) if (stranded(j)) return true;
    return false;
  };

  for (let attempt = 0; attempt <= restarts; attempt++) {
    filled.fill(-1);
    const order: [number, number][] = [];
    let left = total, stuck = false;
    while (left > 0 && !stuck) {
      cand.length = 0;
      for (let i = 0; i < n; i++) if (placeable(i)) cand.push(i);
      shuffle(cand, r);
      let done = false;
      for (let ai = 0; ai < cand.length && ai < 12 && !done; ai++) {
        const a = cand[ai];
        filled[a] = 0;
        if (strandsAround(a)) { filled[a] = -1; continue; }
        const bs: number[] = [];
        for (let i = 0; i < n; i++) if (i !== a && placeable(i)) bs.push(i);
        shuffle(bs, r);
        for (let bi = 0; bi < bs.length && bi < 24; bi++) {
          const b = bs[bi];
          filled[b] = 0;
          if (isFree(geo, filled, a) && isFree(geo, filled, b) && !strandsAround(b) && !strandsAround(a)) {
            order.push([a, b]); left -= 2; done = true; break;
          }
          filled[b] = -1;
        }
        if (!done) filled[a] = -1;
      }
      if (!done) stuck = true;
    }
    if (!stuck) return order;
  }
  return null;
}

/** Faces onto a placement order: one pair per step (pairs are shuffled, and each pair's two tiles too). */
function assign(n: number, order: [number, number][], pairs: [number, number][], r: () => number): Deal {
  const faces = new Array<number>(n).fill(-1);
  const ps = shuffle(pairs.slice(), r);
  order.forEach(([a, b], k) => {
    const [f, g] = r() < 0.5 ? ps[k] : [ps[k][1], ps[k][0]];
    faces[a] = f; faces[b] = g;
  });
  return { faces, solution: order.slice().reverse() };
}

/** A fresh solvable deal for a layout from a seed (deterministic). */
export function deal(id: LayoutId, seed: number): Deal {
  const geo = geoOf(id);
  const n = geo.pos.length;
  const r = rng(seed);
  const order = placementOrder(geo, new Array<boolean>(n).fill(true), r);
  if (!order) throw new Error(`mahjong: could not arrange ${id}`);
  // a smaller layout gets a random selection of the 72 pairs
  const pairs = shuffle(fullPairs(), r).slice(0, n / 2);
  return assign(n, order, pairs, r);
}

/**
 * Shuffle the tiles still on the board into a new SOLVABLE arrangement on the same spots (same tiles, new places).
 * `solvable: false` when no solvable arrangement exists for these spots (e.g. the last tiles are stacked on each
 * other): the tiles are then shuffled at random.
 */
export function reshuffle(geo: Geo, faces: number[], seed: number): Deal & { solvable: boolean } {
  const r = rng(seed);
  const active = faces.map(f => f >= 0);
  const pairs = pairUp(faces.filter(f => f >= 0));
  const order = pairs ? placementOrder(geo, active, r, 120) : null;
  if (order && pairs) return { ...assign(faces.length, order, pairs, r), solvable: true };
  const spots = faces.map((f, i) => (f >= 0 ? i : -1)).filter(i => i >= 0);
  const left = shuffle(faces.filter(f => f >= 0), r);
  const out = new Array<number>(faces.length).fill(-1);
  spots.forEach((i, k) => { out[i] = left[k]; });
  return { faces: out, solution: [], solvable: false };
}
