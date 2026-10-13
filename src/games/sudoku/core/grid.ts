// Sudoku geometry + bit helpers. A grid is 81 numbers, row-major, 0 = empty. Candidates are 9-bit masks (bit d-1 = digit d).

export type Grid = number[];
export type Level = 'easy' | 'medium' | 'hard' | 'expert';
export const LEVELS: readonly Level[] = ['easy', 'medium', 'hard', 'expert'];
export const isLevel = (x: unknown): x is Level => typeof x === 'string' && (LEVELS as readonly string[]).includes(x);

export const ALL = 0x1ff;
export const rowOf = (i: number) => (i / 9) | 0;
export const colOf = (i: number) => i % 9;
export const boxOf = (i: number) => ((rowOf(i) / 3) | 0) * 3 + ((colOf(i) / 3) | 0);

/** 27 units: 0–8 rows, 9–17 columns, 18–26 boxes; each lists its 9 cells. */
export const UNITS: readonly number[][] = (() => {
  const u: number[][] = [];
  for (let r = 0; r < 9; r++) u.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) u.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
  for (let b = 0; b < 9; b++) {
    const r0 = ((b / 3) | 0) * 3, c0 = (b % 3) * 3;
    u.push(Array.from({ length: 9 }, (_, k) => (r0 + ((k / 3) | 0)) * 9 + c0 + (k % 3)));
  }
  return u;
})();
export type UnitKind = 'row' | 'col' | 'box';
export const unitKind = (u: number): UnitKind => (u < 9 ? 'row' : u < 18 ? 'col' : 'box');
/** 1-based number of a unit inside its kind (row 3, box 5 …). */
export const unitNo = (u: number) => (u % 9) + 1;

/** The row, column and box unit of every cell. */
export const CELL_UNITS: readonly [number, number, number][] = Array.from({ length: 81 }, (_, i) => [rowOf(i), 9 + colOf(i), 18 + boxOf(i)] as [number, number, number]);

/** The 20 peers of every cell (same row, column or box). */
export const PEERS: readonly number[][] = Array.from({ length: 81 }, (_, i) => {
  const s = new Set<number>();
  for (const u of CELL_UNITS[i]) for (const j of UNITS[u]) if (j !== i) s.add(j);
  return [...s].sort((a, b) => a - b);
});
const PEER_SET: readonly Set<number>[] = PEERS.map(p => new Set(p));
export const sees = (a: number, b: number) => a !== b && PEER_SET[a].has(b);

export const bit = (d: number) => 1 << (d - 1);
export const has = (mask: number, d: number) => (mask & (1 << (d - 1))) !== 0;
export function popcount(m: number) { let n = 0; while (m) { m &= m - 1; n++; } return n; }
export function digitsOf(m: number): number[] { const out: number[] = []; for (let d = 1; d <= 9; d++) if (m & (1 << (d - 1))) out.push(d); return out; }
/** The single digit of a one-bit mask. */
export const onlyDigit = (m: number) => 32 - Math.clz32(m);

export function parse(s: string): Grid {
  const g: Grid = [];
  for (const ch of s) { if (ch >= '1' && ch <= '9') g.push(ch.charCodeAt(0) - 48); else if (ch === '0' || ch === '.') g.push(0); }
  if (g.length !== 81) throw new Error('sudoku: expected 81 cells, got ' + g.length);
  return g;
}
export const format = (g: Grid) => g.map(v => (v ? String(v) : '.')).join('');
export const givens = (g: Grid) => g.reduce((n, v) => n + (v ? 1 : 0), 0);

/** Candidate masks from the placed values (0 for filled cells). */
export function candidatesOf(g: Grid): number[] {
  const used = new Array(27).fill(0);
  for (let i = 0; i < 81; i++) if (g[i]) { const b = bit(g[i]); for (const u of CELL_UNITS[i]) used[u] |= b; }
  return g.map((v, i) => (v ? 0 : ALL & ~(used[CELL_UNITS[i][0]] | used[CELL_UNITS[i][1]] | used[CELL_UNITS[i][2]])));
}

/** True when no unit holds the same digit twice. */
export function isConsistent(g: Grid): boolean {
  for (const u of UNITS) { let m = 0; for (const i of u) if (g[i]) { const b = bit(g[i]); if (m & b) return false; m |= b; } }
  return true;
}
export const isComplete = (g: Grid) => g.every(v => v > 0) && isConsistent(g);
