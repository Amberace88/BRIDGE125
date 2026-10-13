// One game of FreeCell: the deal, the board, unlimited undo, the clock — independent of the UI.

import { hashSeed } from '../../solitaire/engine/cards';
import { MAX_DEAL, UNSOLVABLE, msDeal } from './deal';
import { apply, fcScore, fcWon, foundCount, legal, type FcMove, type FcState } from './rules';
import { solveFreecell } from './solver';

export interface FcGame {
  /** Microsoft deal number */
  deal: number;
  st: FcState;
  /** the board before each player move, oldest first (unlimited undo; safe sends home ride along with their move) */
  hist: FcState[];
  /** player moves (a supermove is one move; automatic sends home are free) */
  moves: number;
  undos: number;
  /** seconds played (the clock starts with the first move) */
  seconds: number;
  /** the daily deal of this Riga day */
  day?: string;
  /** the result was reported (won, or abandoned) */
  reported?: boolean;
}

export function newGame(deal: number, day?: string): FcGame {
  return { deal, st: msDeal(deal), hist: [], moves: 0, undos: 0, seconds: 0, day };
}

export const isWon = (g: FcGame) => fcWon(g.st);

/** A player move; null when it is not legal (or the game is over). Safe cards are sent home separately (`autoStep`). */
export function play(g: FcGame, m: FcMove): FcGame | null {
  if (isWon(g) || !legal(g.st, m)) return null;
  return { ...g, st: apply(g.st, m), hist: [...g.hist, g.st], moves: g.moves + 1 };
}

/** An automatic move (safe card home / gathering at the end): no history, no move count. */
export function playAuto(g: FcGame, m: FcMove): FcGame | null {
  if (!legal(g.st, m)) return null;
  return { ...g, st: apply(g.st, m) };
}

export const canUndo = (g: FcGame) => g.hist.length > 0 && !isWon(g);

export function undo(g: FcGame): FcGame {
  if (!canUndo(g)) return g;
  return { ...g, st: g.hist[g.hist.length - 1], hist: g.hist.slice(0, -1), undos: g.undos + 1 };
}

export const scoreOf = (g: FcGame, won = isWon(g)) =>
  fcScore({ won, seconds: g.seconds, moves: g.moves, undos: g.undos, home: foundCount(g.st) });

/* ------------------------------------------------------------------------------------------------ deals */

/** Node budget for the daily proof (fixed: the daily deal must be the same on every device). */
export const DAILY_BUDGET = 120_000;

/** Proven winnable by the solver within `budget` (and not one of the known impossible deals). */
export function dealWinnable(n: number, budget = DAILY_BUDGET): boolean {
  if (UNSOLVABLE.includes(n)) return false;
  return solveFreecell(msDeal(n), budget).result === 'solved';
}

/** The daily deal for a Riga day: the first proven-winnable deal number from the day's hash (same for everyone). */
export function dailyDeal(day: string): number {
  let n = (hashSeed('b125-freecell-' + day) % MAX_DEAL) + 1;
  for (let k = 0; k < 50; k++) {
    if (dealWinnable(n)) return n;
    n = (n % MAX_DEAL) + 1;
  }
  return 1;
}

/** A random deal number for "New deal" (the famous impossible ones are skipped). */
export function randomDeal(rnd = Math.random): number {
  let n = 1 + Math.floor(rnd() * MAX_DEAL);
  while (UNSOLVABLE.includes(n)) n = (n % MAX_DEAL) + 1;
  return n;
}
