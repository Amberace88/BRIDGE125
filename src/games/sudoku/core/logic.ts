import { CELL_UNITS, PEERS, UNITS, bit, boxOf, candidatesOf, colOf, digitsOf, givens, onlyDigit, popcount, rowOf, sees, type Grid, type Level } from './grid';

// Human solving techniques. Used three ways: to grade generated puzzles (the hardest technique needed decides the level),
// to explain the next logical step as a hint, and in tests (every step must keep the true solution).

export type Technique =
  | 'fullHouse' | 'nakedSingle' | 'hiddenSingle'
  | 'pointing' | 'claiming' | 'nakedPair' | 'hiddenPair'
  | 'nakedTriple' | 'hiddenTriple' | 'xWing' | 'nakedQuad'
  | 'swordfish' | 'xyWing' | 'xyzWing';

/** 1 singles · 2 intersections and subsets · 3 fish and wings. */
export const TIER: Record<Technique, 1 | 2 | 3> = {
  fullHouse: 1, nakedSingle: 1, hiddenSingle: 1,
  pointing: 2, claiming: 2, nakedPair: 2, hiddenPair: 2, nakedTriple: 2, hiddenTriple: 2, nakedQuad: 2,
  xWing: 3, swordfish: 3, xyWing: 3, xyzWing: 3,
};

export interface Elim { cell: number; digit: number }
export interface Step {
  tech: Technique;
  /** a placement (singles) */
  place?: { cell: number; digit: number };
  /** candidate eliminations (everything else) */
  elims: Elim[];
  /** units the pattern lives in, main first (hidden single: its unit; pointing: box then line; fish: base lines) */
  units: number[];
  /** the pattern's cells */
  cells: number[];
  /** the pattern's digits */
  digits: number[];
}

/** Mutable solving state: values + candidate masks. */
export interface LogicState { v: Grid; c: number[] }
export const logicState = (g: Grid): LogicState => ({ v: g.slice(), c: candidatesOf(g) });

export function placeDigit(s: LogicState, cell: number, d: number) {
  s.v[cell] = d; s.c[cell] = 0;
  const b = ~bit(d);
  for (const p of PEERS[cell]) s.c[p] &= b;
}
export function applyStep(s: LogicState, st: Step) {
  if (st.place) placeDigit(s, st.place.cell, st.place.digit);
  for (const e of st.elims) s.c[e.cell] &= ~bit(e.digit);
}

/* ------------------------------------------------------------------ helpers */

function combos<T>(a: T[], k: number, f: (pick: T[]) => boolean): boolean {
  const pick: T[] = [];
  const go = (start: number): boolean => {
    if (pick.length === k) return f(pick);
    for (let i = start; i <= a.length - (k - pick.length); i++) { pick.push(a[i]); if (go(i + 1)) return true; pick.pop(); }
    return false;
  };
  return go(0);
}
const positions = (s: LogicState, u: number, d: number) => { const b = bit(d); return UNITS[u].filter(i => s.c[i] & b); };
const placedIn = (s: LogicState, u: number, d: number) => UNITS[u].some(i => s.v[i] === d);
const sortElims = (e: Elim[]) => e.sort((a, b) => a.cell - b.cell || a.digit - b.digit);

/* ------------------------------------------------------------------ singles */

function fullHouse(s: LogicState): Step | null {
  for (const u of ORDER) {
    let empty = -1, n = 0, used = 0;
    for (const i of UNITS[u]) { if (s.v[i]) used |= bit(s.v[i]); else { empty = i; n++; } }
    if (n !== 1) continue;
    const m = 0x1ff & ~used;
    if (popcount(m) === 1 && s.c[empty] & m) return { tech: 'fullHouse', place: { cell: empty, digit: onlyDigit(m) }, elims: [], units: [u], cells: [empty], digits: [onlyDigit(m)] };
  }
  return null;
}
function nakedSingle(s: LogicState): Step | null {
  for (let i = 0; i < 81; i++) if (!s.v[i] && popcount(s.c[i]) === 1) {
    const d = onlyDigit(s.c[i]);
    return { tech: 'nakedSingle', place: { cell: i, digit: d }, elims: [], units: [], cells: [i], digits: [d] };
  }
  return null;
}
function hiddenSingle(s: LogicState, units: readonly number[]): Step | null {
  for (const u of units) for (let d = 1; d <= 9; d++) {
    const p = positions(s, u, d);
    if (p.length === 1 && !placedIn(s, u, d)) return { tech: 'hiddenSingle', place: { cell: p[0], digit: d }, elims: [], units: [u], cells: [p[0]], digits: [d] };
  }
  return null;
}

/* ------------------------------------------------------------------ intersections */

function pointing(s: LogicState): Step | null {
  for (let b = 18; b < 27; b++) for (let d = 1; d <= 9; d++) {
    const p = positions(s, b, d);
    if (p.length < 2) continue;
    for (const line of [rowOf(p[0]), 9 + colOf(p[0])]) {
      if (!p.every(i => CELL_UNITS[i][line < 9 ? 0 : 1] === line)) continue;
      const elims = UNITS[line].filter(i => !p.includes(i) && s.c[i] & bit(d)).map(cell => ({ cell, digit: d }));
      if (elims.length) return { tech: 'pointing', elims, units: [b, line], cells: p, digits: [d] };
    }
  }
  return null;
}
function claiming(s: LogicState): Step | null {
  for (let line = 0; line < 18; line++) for (let d = 1; d <= 9; d++) {
    const p = positions(s, line, d);
    if (p.length < 2) continue;
    const b = 18 + boxOf(p[0]);
    if (!p.every(i => 18 + boxOf(i) === b)) continue;
    const elims = UNITS[b].filter(i => !p.includes(i) && s.c[i] & bit(d)).map(cell => ({ cell, digit: d }));
    if (elims.length) return { tech: 'claiming', elims, units: [line, b], cells: p, digits: [d] };
  }
  return null;
}

/* ------------------------------------------------------------------ subsets */

const NAKED: Record<number, Technique> = { 2: 'nakedPair', 3: 'nakedTriple', 4: 'nakedQuad' };
const HIDDEN: Record<number, Technique> = { 2: 'hiddenPair', 3: 'hiddenTriple' };

function nakedSubset(s: LogicState, k: number): Step | null {
  let found: Step | null = null;
  for (const u of ORDER) {
    const cells = UNITS[u].filter(i => !s.v[i] && popcount(s.c[i]) >= 2 && popcount(s.c[i]) <= k);
    if (cells.length < k) continue;
    if (combos(cells, k, pick => {
      let m = 0; for (const i of pick) m |= s.c[i];
      if (popcount(m) !== k) return false;
      const elims: Elim[] = [];
      for (const i of UNITS[u]) if (!s.v[i] && !pick.includes(i)) for (const d of digitsOf(s.c[i] & m)) elims.push({ cell: i, digit: d });
      if (!elims.length) return false;
      found = { tech: NAKED[k], elims: sortElims(elims), units: [u], cells: [...pick], digits: digitsOf(m) };
      return true;
    })) return found;
  }
  return null;
}
function hiddenSubset(s: LogicState, k: number): Step | null {
  let found: Step | null = null;
  for (const u of ORDER) {
    const ds: number[] = [];
    for (let d = 1; d <= 9; d++) { const n = positions(s, u, d).length; if (n >= 1 && n <= k) ds.push(d); }
    if (ds.length < k) continue;
    if (combos(ds, k, pick => {
      const cells = new Set<number>();
      for (const d of pick) for (const i of positions(s, u, d)) cells.add(i);
      if (cells.size !== k) return false;
      let keep = 0; for (const d of pick) keep |= bit(d);
      const elims: Elim[] = [];
      for (const i of cells) for (const d of digitsOf(s.c[i] & ~keep)) elims.push({ cell: i, digit: d });
      if (!elims.length) return false;
      found = { tech: HIDDEN[k], elims: sortElims(elims), units: [u], cells: [...cells].sort((a, b) => a - b), digits: [...pick] };
      return true;
    })) return found;
  }
  return null;
}

/* ------------------------------------------------------------------ fish */

function fish(s: LogicState, k: number): Step | null {
  const tech: Technique = k === 2 ? 'xWing' : 'swordfish';
  let found: Step | null = null;
  for (let d = 1; d <= 9; d++) for (const base of [0, 9]) {
    const cover = base === 0 ? 9 : 0;
    // cross index of a cell inside the cover kind (column for row-based fish, row for column-based)
    const cross = (i: number) => (base === 0 ? colOf(i) : rowOf(i));
    const lines: number[] = [];
    for (let l = base; l < base + 9; l++) { const n = positions(s, l, d).length; if (n >= 2 && n <= k) lines.push(l); }
    if (lines.length < k) continue;
    if (combos(lines, k, pick => {
      const xs = new Set<number>(); const cells: number[] = [];
      for (const l of pick) for (const i of positions(s, l, d)) { xs.add(cross(i)); cells.push(i); }
      if (xs.size !== k) return false;
      const elims: Elim[] = [];
      for (const x of xs) for (const i of UNITS[cover + x]) if (s.c[i] & bit(d) && !pick.includes(CELL_UNITS[i][base === 0 ? 0 : 1])) elims.push({ cell: i, digit: d });
      if (!elims.length) return false;
      found = { tech, elims: sortElims(elims), units: [...pick, ...[...xs].sort((a, b) => a - b).map(x => cover + x)], cells: cells.sort((a, b) => a - b), digits: [d] };
      return true;
    })) return found;
  }
  return null;
}

/* ------------------------------------------------------------------ wings */

function xyWing(s: LogicState): Step | null {
  for (let p = 0; p < 81; p++) {
    if (s.v[p] || popcount(s.c[p]) !== 2) continue;
    const pm = s.c[p];
    const wings = PEERS[p].filter(q => !s.v[q] && popcount(s.c[q]) === 2 && popcount(s.c[q] & pm) === 1);
    for (let a = 0; a < wings.length; a++) for (let b = a + 1; b < wings.length; b++) {
      const q1 = wings[a], q2 = wings[b];
      const z = s.c[q1] & s.c[q2] & ~pm;
      if (popcount(z) !== 1 || (s.c[q1] & pm) === (s.c[q2] & pm)) continue;
      const zd = onlyDigit(z);
      const elims: Elim[] = [];
      for (let i = 0; i < 81; i++) if (i !== p && i !== q1 && i !== q2 && s.c[i] & z && sees(i, q1) && sees(i, q2)) elims.push({ cell: i, digit: zd });
      if (elims.length) return { tech: 'xyWing', elims, units: [], cells: [p, q1, q2], digits: digitsOf(pm | z) };
    }
  }
  return null;
}
function xyzWing(s: LogicState): Step | null {
  for (let p = 0; p < 81; p++) {
    if (s.v[p] || popcount(s.c[p]) !== 3) continue;
    const pm = s.c[p];
    const wings = PEERS[p].filter(q => !s.v[q] && popcount(s.c[q]) === 2 && (s.c[q] & ~pm) === 0);
    for (let a = 0; a < wings.length; a++) for (let b = a + 1; b < wings.length; b++) {
      const q1 = wings[a], q2 = wings[b];
      const z = s.c[q1] & s.c[q2];
      if (popcount(z) !== 1 || (s.c[q1] | s.c[q2]) !== pm) continue;
      const zd = onlyDigit(z);
      const elims: Elim[] = [];
      for (let i = 0; i < 81; i++) if (i !== p && i !== q1 && i !== q2 && s.c[i] & z && sees(i, p) && sees(i, q1) && sees(i, q2)) elims.push({ cell: i, digit: zd });
      if (elims.length) return { tech: 'xyzWing', elims, units: [], cells: [p, q1, q2], digits: digitsOf(pm) };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ driver */

/** Boxes first: that is how people scan. */
const ORDER: readonly number[] = [...Array.from({ length: 9 }, (_, i) => 18 + i), ...Array.from({ length: 18 }, (_, i) => i)];
const BOXES = ORDER.slice(0, 9), LINES = ORDER.slice(9);

const FINDERS: ((s: LogicState) => Step | null)[] = [
  fullHouse,
  s => hiddenSingle(s, BOXES),
  nakedSingle,
  s => hiddenSingle(s, LINES),
  pointing, claiming,
  s => nakedSubset(s, 2), s => hiddenSubset(s, 2),
  s => nakedSubset(s, 3), s => hiddenSubset(s, 3),
  s => fish(s, 2), s => nakedSubset(s, 4),
  s => fish(s, 3), xyWing, xyzWing,
];

/** The easiest available step, or null when these techniques are stuck (or the grid is solved). */
export function nextStep(s: LogicState): Step | null {
  for (const f of FINDERS) { const st = f(s); if (st) return st; }
  return null;
}

export interface Grade {
  /** null: needs techniques beyond this solver (or has no unique solution) */
  level: Level | null;
  maxTier: number;
  counts: Partial<Record<Technique, number>>;
  solved: boolean;
  steps: number;
  givens: number;
}

/**
 * Level from the hardest technique needed:
 *  easy   — singles only, many givens (≥ 34)
 *  medium — singles only, a minimal (sparse) grid
 *  hard   — needs intersections or subsets (pointing / claiming, pairs, triples)
 *  expert — needs fish or wings (X-Wing, Swordfish, XY-Wing, XYZ-Wing)
 */
export function levelFor(maxTier: number, nGivens: number): Level {
  return maxTier >= 3 ? 'expert' : maxTier === 2 ? 'hard' : nGivens >= 34 ? 'easy' : 'medium';
}

export function grade(puzzle: Grid): Grade {
  const s = logicState(puzzle);
  const counts: Partial<Record<Technique, number>> = {};
  let maxTier = 0, steps = 0;
  for (;;) {
    const st = nextStep(s);
    if (!st) break;
    applyStep(s, st);
    counts[st.tech] = (counts[st.tech] ?? 0) + 1;
    maxTier = Math.max(maxTier, TIER[st.tech]);
    steps++;
  }
  const solved = s.v.every(v => v > 0);
  const n = givens(puzzle);
  return { level: solved ? levelFor(maxTier, n) : null, maxTier, counts, solved, steps, givens: n };
}

/**
 * The next placement a person can find from `values`, with the elimination steps it needs first.
 * Null when the techniques are stuck (the hint then falls back to revealing a cell).
 */
export function nextPlacement(values: Grid): { pre: Step[]; step: Step } | null {
  const s = logicState(values);
  const pre: Step[] = [];
  for (let guard = 0; guard < 200; guard++) {
    const st = nextStep(s);
    if (!st) return null;
    if (st.place) return { pre, step: st };
    pre.push(st);
    applyStep(s, st);
  }
  return null;
}
