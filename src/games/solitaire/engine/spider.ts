// Spider — two decks, ten columns, 1 / 2 / 4 suits. Pure and immutable.
//
// Build down regardless of suit; only a same-suit descending run moves as a unit; a full K…A run of one suit leaves
// the tableau by itself (+100). Dealing puts one card on every column and needs every column filled.

import { SUITS, mulberry32, shuffle, type SCard, type Suit } from './cards';

export interface SColumn { c: number[]; d: number }

export interface SpState {
  game: 'spider';
  seed: number;
  suits: 1 | 2 | 4;
  /** card faces by id (104 cards) */
  cards: SCard[];
  /** last = next card dealt (deals take 10 at a time) */
  stock: number[];
  tab: SColumn[];
  /** completed runs (each K → A, in removal order) */
  done: number[][];
  score: number;
  moves: number;
}

export type SpMove = { t: 'deal' } | { t: 'move'; from: number; to: number; n: number };

export const SP_SCORE = { start: 500, move: -1, run: 100, undo: -5 } as const;

const SUIT_SETS: Record<1 | 2 | 4, Suit[]> = { 1: ['S'], 2: ['S', 'H'], 4: [...SUITS] };

export function spiderCards(suits: 1 | 2 | 4): SCard[] {
  const set = SUIT_SETS[suits];
  const out: SCard[] = [];
  for (let id = 0; id < 104; id++) out.push({ id, r: (id % 13) + 1, s: set[Math.floor(id / 13) % set.length] });
  return out;
}

export function dealSpider(seed: number, suits: 1 | 2 | 4 = 1): SpState {
  const cards = spiderCards(suits);
  const deck = shuffle(cards.map(c => c.id), mulberry32(seed ^ 0x5bd1e995));
  const tab: SColumn[] = Array.from({ length: 10 }, () => ({ c: [], d: 0 }));
  for (let i = 0; i < 54; i++) tab[i % 10].c.push(deck.pop()!);
  tab.forEach(t => { t.d = t.c.length - 1; });
  return { game: 'spider', seed, suits, cards, stock: deck, tab, done: [], score: SP_SCORE.start, moves: 0 };
}

const clone = (s: SpState): SpState => ({ ...s, stock: s.stock.slice(), tab: s.tab.map(t => ({ c: t.c.slice(), d: t.d })), done: s.done.slice() });

/** Number of cards at the end of column `i` that form a same-suit descending run (face up). */
export function spRunLength(s: SpState, i: number): number {
  const { c, d } = s.tab[i];
  if (c.length <= d) return 0;
  let n = 1;
  for (let k = c.length - 1; k > d; k--) {
    const a = s.cards[c[k]], b = s.cards[c[k - 1]];
    if (a.s === b.s && b.r === a.r + 1) n++; else break;
  }
  return n;
}

export const spCanDeal = (s: SpState) => s.stock.length > 0 && s.tab.every(t => t.c.length > 0);

export function spLegal(s: SpState, m: SpMove): boolean {
  if (m.t === 'deal') return spCanDeal(s);
  const { from, to, n } = m;
  if (from === to || from < 0 || to < 0 || from > 9 || to > 9 || n < 1) return false;
  if (n > spRunLength(s, from)) return false;
  const src = s.tab[from].c;
  const head = s.cards[src[src.length - n]];
  const dest = s.tab[to].c;
  if (!dest.length) return true;
  if (s.tab[to].d >= dest.length) return false;
  return s.cards[dest[dest.length - 1]].r === head.r + 1;
}

/** Removes a finished K → A run from the end of column i (if any) and turns the next card up. */
function collectRun(s: SpState, i: number): boolean {
  if (spRunLength(s, i) < 13) return false;
  const col = s.tab[i];
  const top = s.cards[col.c[col.c.length - 13]];
  if (top.r !== 13) return false;
  s.done.push(col.c.splice(col.c.length - 13, 13));
  s.score += SP_SCORE.run;
  if (col.c.length && col.d >= col.c.length) col.d = col.c.length - 1;
  return true;
}

export function applySp(s0: SpState, m: SpMove): SpState {
  if (!spLegal(s0, m)) return s0;
  const s = clone(s0);
  if (m.t === 'deal') {
    for (let i = 0; i < 10; i++) s.tab[i].c.push(s.stock.pop()!);
    for (let i = 0; i < 10; i++) collectRun(s, i);
  } else {
    const src = s.tab[m.from];
    s.tab[m.to].c.push(...src.c.splice(src.c.length - m.n, m.n));
    if (src.c.length && src.d >= src.c.length) src.d = src.c.length - 1;
    collectRun(s, m.to);
  }
  s.score += SP_SCORE.move;
  s.moves++;
  return s;
}

export const spWon = (s: SpState) => s.done.length === 8;

export function spAllMoves(s: SpState): SpMove[] {
  const out: SpMove[] = [];
  for (let i = 0; i < 10; i++) {
    const run = spRunLength(s, i);
    for (let n = 1; n <= run; n++) for (let k = 0; k < 10; k++) {
      const m: SpMove = { t: 'move', from: i, to: k, n };
      if (spLegal(s, m)) out.push(m);
    }
  }
  if (spCanDeal(s)) out.push({ t: 'deal' });
  return out;
}

/** How good a move looks (hint + tap-to-move ranking). Higher is better; ≤ 0 is pointless shuffling. */
export function spMoveValue(s: SpState, m: SpMove): number {
  if (m.t === 'deal') return 0.5;
  const src = s.tab[m.from];
  const head = s.cards[src.c[src.c.length - m.n]];
  const dest = s.tab[m.to].c;
  const whole = src.c.length - m.n === src.d;            // moves everything face up
  const reveals = whole && src.d > 0;
  const empties = whole && src.d === 0;
  const destTop = dest.length ? s.cards[dest[dest.length - 1]] : null;
  const sameSuit = !!destTop && destTop.s === head.s;
  // the card left behind already sits on its natural parent: moving away only breaks a build
  const under = src.c.length - m.n - 1 >= src.d && src.c.length - m.n - 1 >= 0 ? s.cards[src.c[src.c.length - m.n - 1]] : null;
  const breaksBuild = !!under && under.r === head.r + 1;
  const breaksSuited = breaksBuild && under!.s === head.s;
  let v = 0;
  if (sameSuit) v += 6 + spRunLength(s, m.from) * 0.1;
  else if (destTop) v += 2;
  if (reveals) v += 5 + Math.min(src.d, 5) * 0.2;
  if (!destTop) v += empties ? -3 : head.r === 13 ? 2 : 0.6;
  if (breaksSuited) v -= 9;
  else if (breaksBuild) v -= sameSuit ? 0 : 3;
  // a run that would complete K → A
  if (sameSuit && destTop) {
    const after = spRunLength(s, m.to) + m.n;
    if (destTop.s === head.s && after >= 13) v += 50;
  }
  return v;
}

/** Best move for the card at `index` in column `from` (tap-to-move). */
export function spBestMove(s: SpState, from: number, index: number): SpMove | null {
  const n = s.tab[from].c.length - index;
  let best: SpMove | null = null, bv = -Infinity;
  for (let k = 0; k < 10; k++) {
    const m: SpMove = { t: 'move', from, to: k, n };
    if (!spLegal(s, m)) continue;
    const v = spMoveValue(s, m) - k * 0.001;
    if (v > bv) { bv = v; best = m; }
  }
  return best;
}

/** The hint: the most useful move, or the deal when nothing useful is left. null = no move at all. */
export function spHint(s: SpState): SpMove | null {
  let best: SpMove | null = null, bv = 0;
  for (const m of spAllMoves(s)) {
    if (m.t === 'deal') continue;
    const v = spMoveValue(s, m);
    if (v > bv) { bv = v; best = m; }
  }
  if (best) return best;
  if (spCanDeal(s)) return { t: 'deal' };
  // nothing useful: any legal move (or none)
  return spAllMoves(s).find(m => m.t === 'move') ?? null;
}

export const spLiveScore = (s: SpState, undos: number) => Math.max(0, s.score + undos * SP_SCORE.undo);
