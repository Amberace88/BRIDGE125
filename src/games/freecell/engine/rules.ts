// FreeCell — the rules. Pure: no DOM, no React. Card ids are Solitaire's (id = suitIndex * 13 + rank - 1, suits S H C D),
// so the shared card component and celebration draw them as they are.

import { SUITS, type SCard } from '../../solitaire/engine/cards';

/** 8 cascades, 4 free cells, 4 foundations (one per suit, in SUITS order; the number is the rank on top, 0 = empty). */
export interface FcState { cols: number[][]; cells: (number | null)[]; found: number[] }

export type Loc = { k: 'col'; i: number } | { k: 'cell'; i: number } | { k: 'found'; i: number };
/** n cards from the end of `from` (n > 1 only between cascades: a supermove). */
export interface FcMove { from: Loc; to: Loc; n: number }

export const rankOf = (id: number) => (id % 13) + 1;
export const suitOf = (id: number) => Math.floor(id / 13);
export const isRed = (id: number) => suitOf(id) % 2 === 1;
export const fcCard = (id: number): SCard => ({ id, r: rankOf(id), s: SUITS[suitOf(id)] });
export const cardId = (suit: number, rank: number) => suit * 13 + rank - 1;

/** b may lie on a in a cascade: one rank lower, the other colour. */
export const stacks = (a: number, b: number) => rankOf(a) === rankOf(b) + 1 && isRed(a) !== isRed(b);

export const freeCells = (s: FcState) => s.cells.reduce<number>((a, c) => a + (c == null ? 1 : 0), 0);
export const emptyCols = (s: FcState) => s.cols.reduce((a, c) => a + (c.length ? 0 : 1), 0);
export const foundCount = (s: FcState) => s.found[0] + s.found[1] + s.found[2] + s.found[3];
export const fcWon = (s: FcState) => foundCount(s) === 52;

/** Length of the ordered run (alternating colours, descending) at the end of a cascade. */
export function runLength(col: number[]): number {
  if (!col.length) return 0;
  let n = 1;
  for (let i = col.length - 1; i > 0 && stacks(col[i - 1], col[i]); i--) n++;
  return n;
}

/**
 * Most cards one supermove may carry: (free cells + 1) · 2^(empty cascades). An empty cascade that is the target
 * cannot help, so it is left out of the count.
 */
export function maxMovable(s: FcState, toEmpty: boolean): number {
  const e = emptyCols(s) - (toEmpty ? 1 : 0);
  return (freeCells(s) + 1) * 2 ** Math.max(0, e);
}

export const canHome = (s: FcState, id: number) => s.found[suitOf(id)] === rankOf(id) - 1;

/** The cards a move would carry (null when `from` cannot give them). */
export function movingCards(s: FcState, from: Loc, n: number): number[] | null {
  if (from.k === 'cell') { const c = s.cells[from.i]; return c == null || n !== 1 ? null : [c]; }
  if (from.k === 'found') return null; // FreeCell never takes cards back off the foundations
  const col = s.cols[from.i];
  if (!col || n < 1 || n > col.length) return null;
  if (n > runLength(col)) return null;
  return col.slice(col.length - n);
}

export function legal(s: FcState, m: FcMove): boolean {
  if (m.from.k === m.to.k && m.from.i === m.to.i) return false;
  const cards = movingCards(s, m.from, m.n);
  if (!cards) return false;
  const head = cards[0];
  if (m.to.k === 'found') return m.n === 1 && suitOf(head) === m.to.i && canHome(s, head);
  if (m.to.k === 'cell') return m.n === 1 && m.to.i >= 0 && m.to.i < 4 && s.cells[m.to.i] == null;
  const dst = s.cols[m.to.i];
  if (!dst) return false;
  if (!dst.length) return m.n <= maxMovable(s, true);
  return stacks(dst[dst.length - 1], head) && m.n <= maxMovable(s, false);
}

/** Plays a move (no legality check — see `legal`). */
export function apply(s: FcState, m: FcMove): FcState {
  const cols = s.cols.slice();
  const cells = s.cells.slice();
  const found = s.found.slice();
  let cards: number[];
  if (m.from.k === 'cell') { cards = [cells[m.from.i]!]; cells[m.from.i] = null; }
  else { const c = cols[m.from.i]; cards = c.slice(c.length - m.n); cols[m.from.i] = c.slice(0, c.length - m.n); }
  if (m.to.k === 'found') found[m.to.i] = rankOf(cards[0]);
  else if (m.to.k === 'cell') cells[m.to.i] = cards[0];
  else cols[m.to.i] = cols[m.to.i].concat(cards);
  return { cols, cells, found };
}

/** Plays a move when it is legal; null otherwise. */
export const tryMove = (s: FcState, m: FcMove): FcState | null => (legal(s, m) ? apply(s, m) : null);

/* ------------------------------------------------------------------------------------------------ automatic moves */

/**
 * A card is safe to send home when no card still in play could ever need it as a base: aces and twos always; any
 * other card once both foundations of the other colour hold its rank − 1.
 */
export function isSafeHome(s: FcState, id: number): boolean {
  if (!canHome(s, id)) return false;
  const r = rankOf(id);
  if (r <= 2) return true;
  const red = isRed(id);
  const opp = red ? [0, 2] : [1, 3];
  return s.found[opp[0]] >= r - 1 && s.found[opp[1]] >= r - 1;
}

/** The next safe card to send home (free cells first), or null. */
export function autoStep(s: FcState): FcMove | null {
  for (let i = 0; i < 4; i++) {
    const c = s.cells[i];
    if (c != null && isSafeHome(s, c)) return { from: { k: 'cell', i }, to: { k: 'found', i: suitOf(c) }, n: 1 };
  }
  for (let i = 0; i < 8; i++) {
    const col = s.cols[i];
    const c = col[col.length - 1];
    if (c != null && isSafeHome(s, c)) return { from: { k: 'col', i }, to: { k: 'found', i: suitOf(c) }, n: 1 };
  }
  return null;
}

export function autoAll(s: FcState): FcState {
  let m: FcMove | null;
  while ((m = autoStep(s))) s = apply(s, m);
  return s;
}

/** Nothing is left out of order: every cascade descends, so the cards can simply be gathered home. */
export function canFinish(s: FcState): boolean {
  if (fcWon(s)) return false;
  return s.cols.every(c => c.every((id, i) => i === 0 || rankOf(c[i - 1]) >= rankOf(id)));
}

/** One step of gathering everything home: the lowest card that can go. */
export function finishStep(s: FcState): FcMove | null {
  let best: FcMove | null = null, br = 99;
  s.cells.forEach((c, i) => { if (c != null && canHome(s, c) && rankOf(c) < br) { br = rankOf(c); best = { from: { k: 'cell', i }, to: { k: 'found', i: suitOf(c) }, n: 1 }; } });
  s.cols.forEach((col, i) => {
    const c = col[col.length - 1];
    if (c != null && canHome(s, c) && rankOf(c) < br) { br = rankOf(c); best = { from: { k: 'col', i }, to: { k: 'found', i: suitOf(c) }, n: 1 }; }
  });
  return best;
}

/* ------------------------------------------------------------------------------------------------ move lists (UI) */

/** Every legal move. Moves into empty cascades are offered for every run length; into cells only the first free one. */
export function allMoves(s: FcState): FcMove[] {
  const out: FcMove[] = [];
  const firstCell = s.cells.findIndex(c => c == null);
  const srcs: { from: Loc; cards: number[] }[] = [];
  s.cells.forEach((c, i) => { if (c != null) srcs.push({ from: { k: 'cell', i }, cards: [c] }); });
  s.cols.forEach((col, i) => { if (col.length) srcs.push({ from: { k: 'col', i }, cards: col.slice(col.length - runLength(col)) }); });
  for (const { from, cards } of srcs) {
    const top = cards[cards.length - 1];
    if (canHome(s, top)) out.push({ from, to: { k: 'found', i: suitOf(top) }, n: 1 });
    if (from.k === 'col' && firstCell >= 0) out.push({ from, to: { k: 'cell', i: firstCell }, n: 1 });
    for (let j = 0; j < 8; j++) {
      if (from.k === 'col' && from.i === j) continue;
      const dst = s.cols[j];
      if (dst.length) {
        const t = dst[dst.length - 1];
        const k = cards.findIndex(c => stacks(t, c));
        if (k >= 0) { const m: FcMove = { from, to: { k: 'col', i: j }, n: cards.length - k }; if (legal(s, m)) out.push(m); }
      } else {
        const fromLen = from.k === 'col' ? s.cols[from.i].length : 1;
        for (let n = 1; n <= cards.length; n++) {
          if (from.k === 'col' && n === fromLen) continue; // a whole cascade into an empty one changes nothing
          const m: FcMove = { from, to: { k: 'col', i: j }, n };
          if (legal(s, m)) out.push(m);
        }
      }
    }
  }
  return out;
}

/** No legal move at all: the game is lost unless the player undoes. */
export const noMoves = (s: FcState) => !fcWon(s) && allMoves(s).length === 0;

/**
 * Where a tap sends a card (and everything on it): home first (a single card), then onto a cascade that builds,
 * then the largest run into an empty cascade, then a free cell. null when nothing fits.
 */
export function tapMove(s: FcState, from: Loc, index: number): FcMove | null {
  let n: number;
  if (from.k === 'cell') n = 1;
  else if (from.k === 'col') n = s.cols[from.i].length - index;
  else return null;
  const cards = movingCards(s, from, n);
  if (!cards) return null;
  const head = cards[0];
  const tryM = (to: Loc): FcMove | null => { const m = { from, to, n }; return legal(s, m) ? m : null; };
  if (n === 1 && canHome(s, head)) return { from, to: { k: 'found', i: suitOf(head) }, n: 1 };
  // onto a cascade: prefer the longest resulting run
  let best: FcMove | null = null, bestLen = -1;
  for (let j = 0; j < 8; j++) {
    if (!s.cols[j].length) continue;
    const m = tryM({ k: 'col', i: j });
    if (m) { const L = runLength(s.cols[j]); if (L > bestLen) { bestLen = L; best = m; } }
  }
  if (best) return best;
  const empty = s.cols.findIndex(c => !c.length);
  const fromWhole = from.k === 'col' && n === s.cols[from.i].length;
  if (n > 1 && empty >= 0 && !fromWhole) { const m = tryM({ k: 'col', i: empty }); if (m) return m; }
  if (n === 1) {
    const cell = s.cells.findIndex(c => c == null);
    if (from.k === 'col' && cell >= 0) return { from, to: { k: 'cell', i: cell }, n: 1 };
    if (empty >= 0 && !fromWhole) { const m = tryM({ k: 'col', i: empty }); if (m) return m; }
  }
  return null;
}

/** Double tap: home if it can go, otherwise into a free cell. */
export function sendMove(s: FcState, from: Loc): FcMove | null {
  let id: number | null | undefined;
  if (from.k === 'cell') id = s.cells[from.i];
  else if (from.k === 'col') id = s.cols[from.i][s.cols[from.i].length - 1];
  if (id == null) return null;
  if (canHome(s, id)) return { from, to: { k: 'found', i: suitOf(id) }, n: 1 };
  const cell = s.cells.findIndex(c => c == null);
  if (from.k === 'col' && cell >= 0) return { from, to: { k: 'cell', i: cell }, n: 1 };
  return null;
}

/** All legal destinations for dragging the cards from `index` of `from` (a cascade) or a cell card. */
export function dropTargets(s: FcState, from: Loc, index: number): { to: Loc; n: number }[] {
  const n = from.k === 'col' ? s.cols[from.i].length - index : 1;
  const out: { to: Loc; n: number }[] = [];
  const add = (to: Loc) => { if (legal(s, { from, to, n })) out.push({ to, n }); };
  for (let i = 0; i < 4; i++) add({ k: 'found', i });
  for (let i = 0; i < 4; i++) add({ k: 'cell', i });
  for (let i = 0; i < 8; i++) add({ k: 'col', i });
  return out;
}

/* ------------------------------------------------------------------------------------------------ scoring */

/**
 * The leaderboard score (higher is better). A win: 3000 + up to 1800 for speed + up to 1500 for few moves − 20 per
 * undo, never under 500. A loss: 10 per card home.
 */
export function fcScore(r: { won: boolean; seconds: number; moves: number; undos: number; home: number }): number {
  if (!r.won) return Math.max(0, r.home) * 10;
  const speed = Math.max(0, 1800 - Math.round(r.seconds));
  const lean = Math.max(0, 300 - r.moves) * 5;
  return Math.max(500, 3000 + speed + lean - 20 * r.undos);
}
