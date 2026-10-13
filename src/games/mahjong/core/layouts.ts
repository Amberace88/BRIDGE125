// Board layouts. A position is the top-left corner of a tile in HALF-tile units (x2, y2) on layer z: a tile covers
// [x, x+2) × [y, y+2), so rows and columns may sit half a tile apart (the classic turtle's ends, pyramid steps).
//
// Never change a shipped layout's positions: daily boards are generated from them (same seed → same board).

export type LayoutId = 'turtle' | 'fortress' | 'pyramid' | 'dragon' | 'pagoda';
export const LAYOUT_IDS: LayoutId[] = ['turtle', 'fortress', 'pyramid', 'dragon', 'pagoda'];
export const isLayout = (x: unknown): x is LayoutId => typeof x === 'string' && (LAYOUT_IDS as string[]).includes(x);

export interface Pos { x: number; y: number; z: number }

/** w × h tiles from (x, y) in whole tiles (halves allowed) on layer z */
function rect(out: Pos[], x: number, y: number, w: number, h: number, z: number) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push({ x: (x + i) * 2, y: (y + j) * 2, z });
}
/** a picture: '#' is a tile, anything else a gap; (dx, dy) in whole tiles (halves allowed) */
function art(out: Pos[], rows: string[], z: number, dx = 0, dy = 0) {
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') out.push({ x: (dx + i) * 2, y: (dy + j) * 2, z }); });
}
const one = (out: Pos[], x: number, y: number, z: number) => out.push({ x: x * 2, y: y * 2, z });

function turtle(): Pos[] {
  const p: Pos[] = [];
  art(p, [
    '.############.',
    '...########...',
    '..##########..',
    '.############.',
    '.############.',
    '..##########..',
    '...########...',
    '.############.',
  ], 0);
  one(p, 0, 3.5, 0); one(p, 13, 3.5, 0); one(p, 14, 3.5, 0);
  rect(p, 4, 1, 6, 6, 1);
  rect(p, 5, 2, 4, 4, 2);
  rect(p, 6, 3, 2, 2, 3);
  one(p, 6.5, 3.5, 4);
  return p;
}

function fortress(): Pos[] {
  const p: Pos[] = [];
  art(p, [
    '############',
    '#..........#',
    '#.########.#',
    '#.########.#',
    '#.########.#',
    '#.########.#',
    '#..........#',
    '############',
  ], 0);
  art(p, [
    '############',
    '#..........#',
    '#..........#',
    '#..######..#',
    '#..######..#',
    '#..........#',
    '#..........#',
    '############',
  ], 1);
  // towers: corners, gates and side bastions
  for (const [x, y] of [[0.5, 0], [10.5, 0], [0.5, 7], [10.5, 7], [5.5, 0], [5.5, 7], [0, 3.5], [11, 3.5]]) one(p, x, y, 2);
  for (const [x, y] of [[0.5, 0], [10.5, 0], [0.5, 7], [10.5, 7]]) one(p, x, y, 3);
  // the keep
  rect(p, 3.5, 3.5, 5, 1, 2);
  rect(p, 5, 3.5, 2, 1, 3);
  one(p, 5.5, 3.5, 4);
  return p;
}

function pyramid(): Pos[] {
  const p: Pos[] = [];
  rect(p, 0, 0, 8, 8, 0);
  rect(p, 1, 1, 6, 6, 1);
  rect(p, 1.5, 1.5, 5, 5, 2);
  rect(p, 2.5, 2.5, 3, 3, 3);
  rect(p, 3, 3, 2, 2, 4);
  return p;
}

function dragon(): Pos[] {
  const p: Pos[] = [];
  // an S-shaped body, two tiles thick
  art(p, [
    '############.',
    '############.',
    '##...........',
    '############.',
    '############.',
    '..........##.',
    '#############',
    '############.',
  ], 0);
  // the spine
  for (const y of [0.5, 3.5, 6.5]) rect(p, 1, y, 10, 1, 1);
  for (const y of [0.5, 3.5, 6.5]) rect(p, 3, y, 6, 1, 2);
  for (const y of [0.5, 3.5, 6.5]) rect(p, 5, y, 2, 1, 3);
  // the head
  one(p, 5.5, 3.5, 4);
  return p;
}

function pagoda(): Pos[] {
  const p: Pos[] = [];
  art(p, [
    '.####.',
    '######',
    '######',
    '######',
    '######',
    '######',
    '######',
    '.####.',
  ], 0);
  rect(p, 1, 1, 4, 6, 1);
  rect(p, 1.5, 1.5, 3, 5, 2);
  rect(p, 2, 2.5, 2, 3, 3);
  one(p, 2.5, 3.5, 4);
  return p;
}

const BUILD: Record<LayoutId, () => Pos[]> = { turtle, fortress, pyramid, dragon, pagoda };
const CACHE = new Map<LayoutId, Pos[]>();

/** The positions of a layout (cached, never mutate). Sorted by layer, row, column. */
export function layoutOf(id: LayoutId): Pos[] {
  let l = CACHE.get(id);
  if (!l) {
    l = BUILD[id]().sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
    CACHE.set(id, l);
  }
  return l;
}

/** Layouts a Daily Mahjong may use (the big classics). */
export const DAILY_LAYOUTS: LayoutId[] = ['turtle', 'fortress', 'pyramid', 'dragon'];
