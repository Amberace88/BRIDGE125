// Klondike — deal, rules, scoring. Pure and immutable: every move returns a new state.
//
// Card ids: id = suitIndex * 13 + rank - 1 with suits S H C D (see cards.ts), so rank/suit/colour are arithmetic.
// Foundations have fixed suit slots in the same order (0 ♠, 1 ♥, 2 ♣, 3 ♦).

import { SUITS, mulberry32, shuffle, type SCard } from './cards';

export const kRank = (id: number) => (id % 13) + 1;
export const kSuit = (id: number) => (id / 13) | 0;
export const kRed = (id: number) => (kSuit(id) & 1) === 1;
export const kCard = (id: number): SCard => ({ id, r: kRank(id), s: SUITS[kSuit(id)] });

/** A tableau column: the first `d` cards are face down. */
export interface Column { c: number[]; d: number }

export interface KState {
  game: 'klondike';
  seed: number;
  draw: 1 | 3;
  /** Vegas scoring: −52 to start, +5 per card on a foundation, limited passes through the stock */
  vegas: boolean;
  /** last = top of the stock (dealt next) */
  stock: number[];
  /** last = top of the waste (the playable card) */
  waste: number[];
  /** 4 foundations in suit order S H C D (last = top) */
  found: number[][];
  tab: Column[];
  score: number;
  moves: number;
  /** times the waste was turned back over into the stock */
  passes: number;
}

export type KPile = { k: 'waste' } | { k: 'found'; i: number } | { k: 'tab'; i: number };
/** `draw` turns stock cards onto the waste — or, with an empty stock, turns the waste back over. */
export type KMove = { t: 'draw' } | { t: 'move'; from: KPile; to: KPile; n: number };

/** Windows-style standard scoring. */
export const K_SCORE = {
  wasteToTab: 5, toFound: 10, fromFound: -15, reveal: 5,
  recycle1: -100, recycle3: -20,
  /** each undo */
  undo: -10,
  /** −2 for every 10 seconds */
  timeEvery: 10, timeCost: 2,
  /** win bonus 700 000 / seconds (games of 30 s or more) */
  bonus: 700_000,
} as const;
export const K_VEGAS = { start: -52, card: 5, undo: -5 } as const;

export function dealKlondike(seed: number, draw: 1 | 3 = 1, vegas = false): KState {
  const deck = shuffle(Array.from({ length: 52 }, (_, i) => i), mulberry32(seed));
  const tab: Column[] = Array.from({ length: 7 }, (_, i) => ({ c: [], d: i }));
  for (let row = 0; row < 7; row++) for (let col = row; col < 7; col++) tab[col].c.push(deck.pop()!);
  return {
    game: 'klondike', seed, draw, vegas,
    stock: deck, waste: [], found: [[], [], [], []], tab,
    score: vegas ? K_VEGAS.start : 0, moves: 0, passes: 0,
  };
}

const clone = (s: KState): KState => ({
  ...s, stock: s.stock.slice(), waste: s.waste.slice(), found: s.found.map(f => f.slice()), tab: s.tab.map(t => ({ c: t.c.slice(), d: t.d })),
});

/** Card `a` may go on card `b` in the tableau (one lower, other colour). */
export const kFits = (a: number, b: number) => kRank(b) === kRank(a) + 1 && kRed(a) !== kRed(b);
/** Card may go on its foundation now. */
export const kFoundFits = (s: KState, id: number) => s.found[kSuit(id)].length === kRank(id) - 1;

/** Vegas: one pass with draw 1, three with draw 3. Standard: unlimited. */
export const kMaxPasses = (s: KState) => (s.vegas ? (s.draw === 1 ? 1 : 3) : Infinity);
export const kCanDraw = (s: KState) => s.stock.length > 0 || (s.waste.length > 0 && s.passes + 1 < kMaxPasses(s));

/** Cards of a pile (top last). */
export function kPileCards(s: KState, p: KPile): number[] {
  return p.k === 'waste' ? s.waste : p.k === 'found' ? s.found[p.i] : s.tab[p.i].c;
}

/** Validates a move without applying it. */
export function kLegal(s: KState, m: KMove): boolean {
  if (m.t === 'draw') return kCanDraw(s);
  const { from, to, n } = m;
  if (n < 1) return false;
  if (from.k === to.k && (from.k === 'waste' || (from as { i: number }).i === (to as { i: number }).i)) return false;
  const src = kPileCards(s, from);
  if (src.length < n) return false;
  if (from.k !== 'tab' && n !== 1) return false;
  if (from.k === 'tab') {
    const col = s.tab[from.i];
    if (col.c.length - n < col.d) return false; // only face-up cards move
    for (let k = col.c.length - n; k < col.c.length - 1; k++) if (!kFits(col.c[k + 1], col.c[k])) return false;
  }
  const head = src[src.length - n];
  if (to.k === 'waste') return false;
  if (to.k === 'found') return n === 1 && to.i === kSuit(head) && s.found[to.i].length === kRank(head) - 1 && from.k !== 'found';
  const dest = s.tab[to.i].c;
  return dest.length === 0 ? kRank(head) === 13 : kFits(head, dest[dest.length - 1]);
}

/** Applies a legal move (returns the same state object when the move is illegal). */
export function applyK(s0: KState, m: KMove): KState {
  if (!kLegal(s0, m)) return s0;
  const s = clone(s0);
  const std = !s.vegas;
  if (m.t === 'draw') {
    if (s.stock.length > 0) {
      for (let i = 0; i < s.draw && s.stock.length; i++) s.waste.push(s.stock.pop()!);
    } else {
      s.stock = s.waste.reverse(); s.waste = [];
      s.passes++;
      if (std) s.score += s.draw === 1 ? K_SCORE.recycle1 : s.passes > 3 ? K_SCORE.recycle3 : 0;
    }
    s.moves++;
    if (std) s.score = Math.max(0, s.score);
    return s;
  }
  const { from, to, n } = m;
  const src = kPileCards(s, from);
  const moving = src.splice(src.length - n, n);
  kPileCards(s, to).push(...moving);
  if (std) {
    if (to.k === 'found') s.score += K_SCORE.toFound;
    else if (from.k === 'waste') s.score += K_SCORE.wasteToTab;
    if (from.k === 'found') s.score += K_SCORE.fromFound;
  } else {
    if (to.k === 'found') s.score += K_VEGAS.card;
    if (from.k === 'found') s.score -= K_VEGAS.card;
  }
  if (from.k === 'tab') {
    const col = s.tab[from.i];
    if (col.c.length > 0 && col.d >= col.c.length) { col.d = col.c.length - 1; if (std) s.score += K_SCORE.reveal; }
  }
  if (std) s.score = Math.max(0, s.score);
  s.moves++;
  return s;
}

export const kWon = (s: KState) => s.found.every(f => f.length === 13);

/** Every legal move (draw first). */
export function kAllMoves(s: KState): KMove[] {
  const out: KMove[] = [];
  if (kCanDraw(s)) out.push({ t: 'draw' });
  const tryTo = (from: KPile, n: number, head: number) => {
    if (n === 1 && from.k !== 'found') {
      const to: KPile = { k: 'found', i: kSuit(head) };
      if (kFoundFits(s, head)) out.push({ t: 'move', from, to, n });
    }
    for (let i = 0; i < 7; i++) {
      if (from.k === 'tab' && from.i === i) continue;
      const m: KMove = { t: 'move', from, to: { k: 'tab', i }, n };
      if (kLegal(s, m)) out.push(m);
    }
  };
  if (s.waste.length) tryTo({ k: 'waste' }, 1, s.waste[s.waste.length - 1]);
  s.tab.forEach((col, i) => { for (let k = col.d; k < col.c.length; k++) tryTo({ k: 'tab', i }, col.c.length - k, col.c[k]); });
  s.found.forEach((f, i) => { if (f.length) tryTo({ k: 'found', i }, 1, f[f.length - 1]); });
  return out;
}

/* ------------------------------------------------------------------------------------------------ helpers for play */

/**
 * The best destination for the card at `index` of a pile (tap-to-move): its foundation when it is the top card,
 * else a tableau column — preferring one that is not empty, then the leftmost. null when it cannot move.
 */
export function kBestMove(s: KState, from: KPile, index: number): KMove | null {
  const src = kPileCards(s, from);
  const n = src.length - index;
  if (n < 1) return null;
  const head = src[index];
  if (n === 1 && from.k !== 'found') {
    const m: KMove = { t: 'move', from, to: { k: 'found', i: kSuit(head) }, n: 1 };
    if (kLegal(s, m)) return m;
  }
  // a card already resting on a matching parent gains nothing from an equal parent elsewhere (tap would ping-pong)
  if (from.k === 'tab' && index > s.tab[from.i].d && kFits(head, src[index - 1])) return null;
  let empty: KMove | null = null;
  for (let i = 0; i < 7; i++) {
    const m: KMove = { t: 'move', from, to: { k: 'tab', i }, n };
    if (!kLegal(s, m)) continue;
    if (s.tab[i].c.length === 0) {
      // a king that already sits alone at the bottom of a column gains nothing from another empty column
      if (from.k === 'tab' && index === 0) continue;
      empty ??= m;
    } else return m;
  }
  return empty;
}

/** The move that sends the top card of a pile to its foundation, if legal. */
export function kToFoundation(s: KState, from: KPile): KMove | null {
  const src = kPileCards(s, from);
  if (!src.length || from.k === 'found') return null;
  const m: KMove = { t: 'move', from, to: { k: 'found', i: kSuit(src[src.length - 1]) }, n: 1 };
  return kLegal(s, m) ? m : null;
}

/** A card can go home without ever being needed in the tableau again (both opposite-colour foundations ≥ r − 1). */
export function kSafeHome(found: ArrayLike<number>, id: number): boolean {
  const r = kRank(id);
  if (r <= 2) return true;
  const red = kRed(id);
  const a = red ? found[0] : found[1], b = red ? found[2] : found[3];
  return a >= r - 1 && b >= r - 1;
}

/** Next "collect" move (double tap on the felt): a safe card from the waste or a column top to its foundation. */
export function kCollectStep(s: KState): KMove | null {
  const lens = s.found.map(f => f.length);
  const piles: KPile[] = [{ k: 'waste' }, ...s.tab.map((_, i) => ({ k: 'tab', i }) as KPile)];
  for (const p of piles) {
    const src = kPileCards(s, p);
    if (!src.length) continue;
    const top = src[src.length - 1];
    if (kFoundFits(s, top) && kSafeHome(lens, top)) return { t: 'move', from: p, to: { k: 'found', i: kSuit(top) }, n: 1 };
  }
  return null;
}

/** Auto-complete is offered once the stock and waste are empty and every tableau card is face up. */
export const kCanAutoComplete = (s: KState) =>
  !kWon(s) && s.stock.length === 0 && s.waste.length === 0 && s.tab.every(t => t.d === 0);

/** Next auto-complete move: the lowest card that fits a foundation. */
export function kAutoStep(s: KState): KMove | null {
  let best: KMove | null = null, bestR = 99;
  const piles: KPile[] = [{ k: 'waste' }, ...s.tab.map((_, i) => ({ k: 'tab', i }) as KPile)];
  for (const p of piles) {
    const src = kPileCards(s, p);
    if (!src.length) continue;
    const top = src[src.length - 1];
    if (kFoundFits(s, top) && kRank(top) < bestR) { bestR = kRank(top); best = { t: 'move', from: p, to: { k: 'found', i: kSuit(top) }, n: 1 }; }
  }
  return best;
}

/** Plays auto-complete to the end (tests + instant finish). */
export function kAutoComplete(s: KState): { state: KState; moves: KMove[] } {
  const moves: KMove[] = [];
  let st = s;
  for (let guard = 0; guard < 60 && !kWon(st); guard++) {
    const m = kAutoStep(st);
    if (!m) break;
    moves.push(m); st = applyK(st, m);
  }
  return { state: st, moves };
}

/* ------------------------------------------------------------------------------------------------ score */

/** The score shown during play: state score − undo costs − time (standard) / undo costs (Vegas). */
export function kLiveScore(s: KState, seconds: number, undos: number): number {
  if (s.vegas) return s.score + undos * K_VEGAS.undo;
  return Math.max(0, s.score + undos * K_SCORE.undo - Math.floor(seconds / K_SCORE.timeEvery) * K_SCORE.timeCost);
}

/** Final score: the live score plus the speed bonus for a won standard game. */
export function kFinalScore(s: KState, seconds: number, undos: number): number {
  const live = kLiveScore(s, seconds, undos);
  if (s.vegas || !kWon(s)) return live;
  return live + (seconds >= 30 ? Math.floor(K_SCORE.bonus / seconds) : Math.floor(K_SCORE.bonus / 30));
}
