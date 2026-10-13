import { describe, expect, it } from 'vitest';
import { canUndo, dailySeed, finalScore, isWon, liveScore, newGame, play, undo, WINNABLE_BUDGET } from './game';
import { applyK, dealKlondike, kWon, type KState } from './klondike';
import { findWinnableSeed, klondikeHasUsefulMove, solveKlondike } from './solver';
import { addDays } from './cards';

/** Replays a solver line through the real rules engine. */
function replays(s0: KState, path: NonNullable<ReturnType<typeof solveKlondike>['path']>) {
  let s = s0;
  for (const m of path) {
    const n = applyK(s, m);
    if (n === s) return false;   // an illegal move
    s = n;
  }
  return kWon(s);
}

describe('undo', () => {
  it('takes back moves one by one down to the deal, each costing points', () => {
    let g = newGame('klondike-1', 2024);
    const deal = g.st;
    for (let i = 0; i < 5; i++) g = play(g, { t: 'draw' })!;
    expect(g.st.moves).toBe(5);
    expect(canUndo(g)).toBe(true);
    for (let i = 0; i < 5; i++) g = undo(g);
    expect(g.st).toBe(deal);
    expect(g.undos).toBe(5);
    expect(canUndo(g)).toBe(false);
    expect(liveScore(g)).toBe(0);       // never below zero
    const scored = { ...g, st: { ...g.st, score: 200 } };
    expect(liveScore(scored)).toBe(150); // 5 undos × 10
  });
  it('illegal moves are refused without touching history', () => {
    const g = newGame('spider-1', 5);
    expect(play(g, { t: 'move', from: 0, to: 0, n: 1 })).toBeNull();
  });
  it('Spider undo costs points too', () => {
    let g = newGame('spider-1', 8);
    g = play(g, { t: 'deal' })!;
    expect(g.st.score).toBe(499);
    g = undo(g);
    expect(liveScore(g)).toBe(495);
    expect(finalScore(g)).toBe(495);
  });
});

describe('solver', () => {
  it.each([1, 3] as const)('draw %i: its winning lines replay to a win through the real rules', draw => {
    let solved = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const s = dealKlondike(seed, draw);
      const r = solveKlondike(s, WINNABLE_BUDGET);
      if (r.result !== 'solved') continue;
      solved++;
      expect(replays(s, r.path!)).toBe(true);
    }
    expect(solved).toBeGreaterThan(3);
  });
  it('a winnable seed search is deterministic and proven', () => {
    const a = findWinnableSeed(777, 3, WINNABLE_BUDGET);
    expect(findWinnableSeed(777, 3, WINNABLE_BUDGET)).toBe(a);
    expect(solveKlondike(dealKlondike(a, 3), WINNABLE_BUDGET).result).toBe('solved');
  });
  it('knows when nothing useful is left', () => {
    expect(klondikeHasUsefulMove(dealKlondike(1))).toBe(true);
    // stock/waste empty, two columns that cannot interact, nothing for the foundations
    const blocked: KState = {
      ...dealKlondike(1), stock: [], waste: [], found: [[], [], [], []],
      tab: [{ c: [5, 0], d: 1 }, { c: [18, 13], d: 1 }, ...Array.from({ length: 5 }, () => ({ c: [] as number[], d: 0 }))],
    };
    // aces are on top → they go home: useful
    expect(klondikeHasUsefulMove(blocked)).toBe(true);
    const dead: KState = { ...blocked, tab: [{ c: [0, 5], d: 1 }, { c: [13, 18], d: 1 }, ...blocked.tab.slice(2)] };
    expect(klondikeHasUsefulMove(dead)).toBe(false);
  });
});

describe('daily deal', () => {
  it('is the same for everyone, differs by day, and is winnable (next 7 Riga days)', () => {
    const start = '2026-10-13';
    const seen = new Set<number>();
    for (let k = 0; k < 7; k++) {
      const day = addDays(start, k);
      const seed = dailySeed(day);
      expect(dailySeed(day)).toBe(seed);
      seen.add(seed);
      const g = newGame('klondike-1', seed, { day });
      expect(g.day).toBe(day);
      expect(g.st.game === 'klondike' && g.st.draw === 1 && !g.st.vegas).toBe(true);
      const r = solveKlondike(g.st as KState, WINNABLE_BUDGET);
      expect(r.result).toBe('solved');
      expect(replays(g.st as KState, r.path!)).toBe(true);
    }
    expect(seen.size).toBe(7);
  });
  it('a daily game never uses Vegas scoring', () => {
    const g = newGame('klondike-1', 5, { vegas: true, day: '2026-10-13' });
    expect((g.st as KState).vegas).toBe(false);
    expect(isWon(g)).toBe(false);
  });
});
