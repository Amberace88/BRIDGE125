// One game of Solitaire (any mode): state + unlimited undo + time, independent of the UI.

import { applyK, dealKlondike, kFinalScore, kLegal, kLiveScore, kWon, type KMove, type KState } from './klondike';
import { applySp, dealSpider, spLegal, spLiveScore, spWon, SP_SCORE, type SpMove, type SpState } from './spider';
import { hashSeed } from './cards';
import { findWinnableSeed } from './solver';

export type Mode = 'klondike-1' | 'klondike-3' | 'spider-1' | 'spider-2' | 'spider-4';
export const MODES: readonly Mode[] = ['klondike-1', 'klondike-3', 'spider-1', 'spider-2', 'spider-4'];
export const isMode = (x: unknown): x is Mode => typeof x === 'string' && (MODES as readonly string[]).includes(x);
export const isSpiderMode = (m: Mode) => m.startsWith('spider');

export type AnyState = KState | SpState;
export type AnyMove = KMove | SpMove;

export interface Game {
  mode: Mode;
  st: AnyState;
  /** previous states, oldest first (unlimited undo) */
  hist: AnyState[];
  undos: number;
  /** seconds played (the clock starts with the first move) */
  seconds: number;
  /** the daily deal of this Riga day */
  day?: string;
  /** the result was reported (won, or abandoned) */
  reported?: boolean;
}

export function newGame(mode: Mode, seed: number, opts: { vegas?: boolean; day?: string } = {}): Game {
  const st: AnyState = isSpiderMode(mode)
    ? dealSpider(seed, Number(mode.split('-')[1]) as 1 | 2 | 4)
    : dealKlondike(seed, Number(mode.split('-')[1]) as 1 | 3, !!opts.vegas && !opts.day);
  return { mode, st, hist: [], undos: 0, seconds: 0, day: opts.day };
}

export const isWon = (g: Game) => (g.st.game === 'klondike' ? kWon(g.st) : spWon(g.st));
export const legal = (g: Game, m: AnyMove) =>
  g.st.game === 'klondike' ? kLegal(g.st, m as KMove) : spLegal(g.st, m as SpMove);

/** Plays a move; null when it is not legal (or the game is over). */
export function play(g: Game, m: AnyMove): Game | null {
  if (isWon(g)) return null;
  const next = g.st.game === 'klondike' ? applyK(g.st, m as KMove) : applySp(g.st, m as SpMove);
  if (next === g.st) return null;
  return { ...g, st: next, hist: [...g.hist, g.st] };
}

export const canUndo = (g: Game) => g.hist.length > 0 && !isWon(g);

/** Takes back the last move (costs points: see K_SCORE.undo / SP_SCORE.undo). */
export function undo(g: Game): Game {
  if (!canUndo(g)) return g;
  return { ...g, st: g.hist[g.hist.length - 1], hist: g.hist.slice(0, -1), undos: g.undos + 1 };
}

/** Back to the deal (same cards), clock and undos kept. */
export function restart(g: Game): Game {
  if (!g.hist.length) return g;
  return { ...g, st: g.hist[0], hist: [], undos: g.undos };
}

export function liveScore(g: Game): number {
  return g.st.game === 'klondike' ? kLiveScore(g.st, g.seconds, g.undos) : spLiveScore(g.st, g.undos);
}
export function finalScore(g: Game): number {
  return g.st.game === 'klondike' ? kFinalScore(g.st, g.seconds, g.undos) : spLiveScore(g.st, g.undos);
}
export const movesOf = (g: Game) => g.st.moves;
export const undoCost = (g: Game) => (g.st.game === 'klondike' ? (g.st.vegas ? 5 : 10) : -SP_SCORE.undo);

/* ------------------------------------------------------------------------------------------------ deals */

/** Node budget per deal for the winnable check (fixed: the daily deal must be the same on every device). */
export const WINNABLE_BUDGET = 5_000;

/** The daily deal's seed for a Riga day: the first proven-winnable Klondike (draw 1) deal from the day's hash. */
export function dailySeed(day: string): number {
  const start = (hashSeed('b125-solitaire-' + day) % 999_999_999) + 1;
  return findWinnableSeed(start, 1, WINNABLE_BUDGET);
}

/** A proven-winnable Klondike deal near `start` (Spider deals are used as they come). */
export function winnableSeed(mode: Mode, start: number): number {
  if (isSpiderMode(mode)) return start;
  return findWinnableSeed(start, mode === 'klondike-3' ? 3 : 1, WINNABLE_BUDGET);
}
