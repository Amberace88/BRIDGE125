import { layoutOf, type LayoutId, type Pos } from './layouts';
import { matchKey } from './tiles';

// Geometry of a layout and the one rule of the game: a tile is FREE when no tile lies on it (any higher layer,
// overlapping) and its left or its right side is open (no tile on the same layer directly beside it).

export interface Geo {
  id: LayoutId;
  pos: Pos[];
  /** tiles on higher layers that overlap this one */
  above: number[][];
  /** tiles on lower layers under this one (all must be in before it in the reverse build) */
  below: number[][];
  /** same-layer neighbours touching the left / right side */
  left: number[][];
  right: number[][];
  /** board size in half-tile units, and the top layer */
  w: number; h: number; zMax: number;
}

const overlaps = (a: Pos, b: Pos) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;

export function geoOfPositions(id: LayoutId, pos: Pos[]): Geo {
  const n = pos.length;
  const above: number[][] = [], below: number[][] = [], left: number[][] = [], right: number[][] = [];
  let w = 0, h = 0, zMax = 0;
  for (let i = 0; i < n; i++) {
    const p = pos[i];
    above.push([]); below.push([]); left.push([]); right.push([]);
    w = Math.max(w, p.x + 2); h = Math.max(h, p.y + 2); zMax = Math.max(zMax, p.z);
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const q = pos[j];
      if (q.z > p.z && overlaps(p, q)) above[i].push(j);
      if (q.z < p.z && overlaps(p, q)) below[i].push(j);
      if (q.z === p.z && Math.abs(q.y - p.y) < 2) {
        if (q.x === p.x - 2) left[i].push(j);
        if (q.x === p.x + 2) right[i].push(j);
      }
    }
  }
  return { id, pos, above, below, left, right, w, h, zMax };
}

const GEO = new Map<LayoutId, Geo>();
export function geoOf(id: LayoutId): Geo {
  let g = GEO.get(id);
  if (!g) { g = geoOfPositions(id, layoutOf(id)); GEO.set(id, g); }
  return g;
}

/** faces[i] ≥ 0: tile i is on the board; −1: removed. */
export function isFree(geo: Geo, faces: ArrayLike<number>, i: number): boolean {
  if (faces[i] < 0) return false;
  for (const j of geo.above[i]) if (faces[j] >= 0) return false;
  let l = true, r = true;
  for (const j of geo.left[i]) if (faces[j] >= 0) { l = false; break; }
  if (l) return true;
  for (const j of geo.right[i]) if (faces[j] >= 0) { r = false; break; }
  return r;
}

export function freeTiles(geo: Geo, faces: ArrayLike<number>): number[] {
  const out: number[] = [];
  for (let i = 0; i < geo.pos.length; i++) if (isFree(geo, faces, i)) out.push(i);
  return out;
}

/** Every removable pair right now (a < b). */
export function availablePairs(geo: Geo, faces: ArrayLike<number>): [number, number][] {
  const by = new Map<number, number[]>();
  for (const i of freeTiles(geo, faces)) {
    const k = matchKey(faces[i]);
    const l = by.get(k);
    if (l) l.push(i); else by.set(k, [i]);
  }
  const out: [number, number][] = [];
  for (const l of by.values()) for (let a = 0; a < l.length; a++) for (let b = a + 1; b < l.length; b++) out.push([l[a], l[b]]);
  return out;
}

export const tilesLeft = (faces: ArrayLike<number>) => { let n = 0; for (let i = 0; i < faces.length; i++) if (faces[i] >= 0) n++; return n; };
