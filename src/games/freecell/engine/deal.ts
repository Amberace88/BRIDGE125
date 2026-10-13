// The classic Microsoft FreeCell deals (#1 … #1 000 000): the same numbers every FreeCell player knows.

import { SUITS } from '../../solitaire/engine/cards';
import type { FcState } from './rules';

export const MAX_DEAL = 1_000_000;

/** The deals among #1 … #1 000 000 that no one can win. */
export const UNSOLVABLE: readonly number[] = [11982, 146692, 186216, 455889, 495505, 512118, 517776, 781948];

export const isDealNo = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= MAX_DEAL;

/** Microsoft's C runtime rand(): state = state · 214013 + 2531011 (mod 2³¹), value = state >> 16. */
function msRand(seed: number) {
  let st = seed >>> 0;
  return () => {
    st = (st * 214013 + 2531011) % 2147483648; // < 2^49 before the modulo: exact in a double
    return Math.floor(st / 65536);
  };
}

/** MS card number (0 … 51: rank-major, suits C D H S) → our id (suitIndex · 13 + rank − 1, suits S H C D). */
const MS_SUIT = ['C', 'D', 'H', 'S'] as const;
const fromMs = (c: number) => SUITS.indexOf(MS_SUIT[c % 4]) * 13 + Math.floor(c / 4);

/** Deal number n exactly as Windows FreeCell deals it: 8 cascades (7, 7, 7, 7, 6, 6, 6, 6), last card on top. */
export function msDeal(n: number): FcState {
  const rnd = msRand(n);
  const deck = Array.from({ length: 52 }, (_, i) => i);
  const cols: number[][] = Array.from({ length: 8 }, () => []);
  let left = 52;
  for (let i = 0; i < 52; i++) {
    const j = rnd() % left;
    cols[i % 8].push(fromMs(deck[j]));
    deck[j] = deck[--left];
  }
  return { cols, cells: [null, null, null, null], found: [0, 0, 0, 0] };
}

/** "JD", "TC", "AS" … (tests and debugging). */
export function cardCode(id: number): string {
  return 'A23456789TJQK'[id % 13] + SUITS[Math.floor(id / 13)];
}
