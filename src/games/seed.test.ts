import { describe, expect, it } from 'vitest';
import { GAMES } from './registry';
import { hash32, isSeed, pickLevel, seedNumber } from './seed';
import { sessionFromSeed } from './zole/save';
import { gameFromSeed as thousandFromSeed } from './thousand/save';
import { gameFromSeed as durakFromSeed, isStandardTable } from './durak/save';
import { newGame as solNewGame, seedStart, winnableSeed } from './solitaire/engine/game';
import { dealFromSeed, newGame as fcNewGame } from './freecell/engine/game';
import { MAX_DEAL, UNSOLVABLE } from './freecell/engine/deal';
import { generate } from './sudoku/core/generator';
import { seedFor as sudokuSeed } from './sudoku/core/game';
import { newGame as mjNewGame, seedFor as mahjongSeed, shuffleSeed } from './mahjong/core/game';

// The seed contract (src/games/types.ts): same seed (+ level) ⇒ the very same deal / puzzle on every device;
// different seeds ⇒ different deals. Everything below is pure — no Math.random, no clocks.

const P3 = [{ name: 'Me', bot: false }, { name: 'Anna', bot: true }, { name: 'Jānis', bot: true }];
const json = (x: unknown) => JSON.stringify(x);

describe('seed helpers', () => {
  it('validates seeds like the server does', () => {
    for (const s of ['abc', 'AbC12xY_-', '7', 'x'.repeat(64)]) expect(isSeed(s), s).toBe(true);
    for (const s of ['', 'a b', 'ā', 'x'.repeat(65), 'a/b', undefined, 12]) expect(isSeed(s), String(s)).toBe(false);
  });
  it('maps seeds to numbers deterministically; digits are the number itself', () => {
    expect(seedNumber('abc', 'zole')).toBe(seedNumber('abc', 'zole'));
    expect(seedNumber('abc', 'zole')).not.toBe(seedNumber('abd', 'zole'));
    expect(seedNumber('abc', 'zole')).not.toBe(seedNumber('abc', 'durak'));
    expect(seedNumber('123456', 'zole')).toBe(123456);
    expect(seedNumber('4294967295', 'x')).toBe(4294967295);
    expect(seedNumber('0', 'x')).not.toBe(0);
    expect(seedNumber('0', 'x', 0xffffffff, 0)).toBe(0);
    expect(seedNumber('5000', 'x', 1000)).toBeLessThanOrEqual(1000);
    for (let i = 0; i < 200; i++) {
      const n = seedNumber('s' + i, 'x', 99);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(99);
    }
    expect(hash32('a')).not.toBe(hash32('b'));
  });
  it('takes the challenge level only when the game knows it', () => {
    expect(pickLevel('hard', ['easy', 'normal', 'hard'] as const, 'normal')).toBe('hard');
    expect(pickLevel('expert', ['easy', 'normal', 'hard'] as const, 'normal')).toBe('normal');
    expect(pickLevel(undefined, ['easy', 'normal'] as const, 'easy')).toBe('easy');
  });
  it('every registered game honours the seed contract', () => {
    for (const id of ['zole', 'durak', 'thousand', 'solitaire', 'freecell', 'sudoku', 'mahjong']) {
      expect(GAMES.find(m => m.id === id)?.seeded, id).toBe(true);
    }
  });
});

describe('Zole', () => {
  it('same seed ⇒ same session (hands, galds, dealer); different seeds differ', () => {
    const a = sessionFromSeed('abc', P3), b = sessionFromSeed('abc', P3);
    expect(json(a)).toBe(json(b));
    const c = sessionFromSeed('abd', P3);
    expect(json(c.hands)).not.toBe(json(a.hands));
    // the generator state carries on: the second deal is the same too
    expect(a.rng).toBe(b.rng);
  });
});

describe('Thousand', () => {
  it('same seed ⇒ same deal; different seeds differ', () => {
    const a = thousandFromSeed('abc', P3), b = thousandFromSeed('abc', P3);
    expect(json(a)).toBe(json(b));
    expect(json(thousandFromSeed('xyz', P3).hands)).not.toBe(json(a.hands));
  });
});

describe('Durak', () => {
  it('same seed ⇒ same deal and trump; different seeds differ', () => {
    const a = durakFromSeed('abc', P3), b = durakFromSeed('abc', P3);
    expect(json(a)).toBe(json(b));
    const c = durakFromSeed('abd', P3);
    expect(json([c.players.map(p => p.hand), c.trumpCard])).not.toBe(json([a.players.map(p => p.hand), a.trumpCard]));
  });
  it('a reported seed (the engine seed as digits) replays the very same deal', () => {
    const a = durakFromSeed('abc', P3);
    expect(json(durakFromSeed(String(a.seed), P3))).toBe(json(a));
    expect(isStandardTable({ players: 3, deck: 36, transfer: false })).toBe(true);
    expect(isStandardTable({ players: 2, deck: 36, transfer: false })).toBe(false);
  });
});

describe('Solitaire', () => {
  const deal = (seed: string, mode: 'klondike-1' | 'spider-2') => solNewGame(mode, winnableSeed(mode, seedStart(seed)));
  it('same seed + mode ⇒ same (winnable) deal; different seeds differ', () => {
    expect(json(deal('abc', 'klondike-1').st)).toBe(json(deal('abc', 'klondike-1').st));
    expect(json(deal('abc', 'klondike-1').st)).not.toBe(json(deal('abd', 'klondike-1').st));
    expect(json(deal('abc', 'spider-2').st)).toBe(json(deal('abc', 'spider-2').st));
    expect(json(deal('abc', 'spider-2').st)).not.toBe(json(deal('xyz', 'spider-2').st));
  });
  it('a digit seed starts the search at that deal number', () => {
    expect(seedStart('123')).toBe(123);
    expect(seedStart('abc')).toBeGreaterThan(0);
    expect(seedStart('abc')).toBeLessThanOrEqual(999_999_999);
  });
});

describe('FreeCell', () => {
  it('same seed ⇒ same deal number; digits are the deal number', () => {
    expect(dealFromSeed('abc')).toBe(dealFromSeed('abc'));
    expect(dealFromSeed('abc')).not.toBe(dealFromSeed('abd'));
    expect(dealFromSeed('11982')).toBe(11982);
    expect(dealFromSeed('1')).toBe(1);
    expect(json(fcNewGame(dealFromSeed('abc')).st)).toBe(json(fcNewGame(dealFromSeed('abc')).st));
    expect(json(fcNewGame(dealFromSeed('abc')).st)).not.toBe(json(fcNewGame(dealFromSeed('xyz')).st));
  });
  it('hashed seeds stay in range and skip the impossible deals', () => {
    for (let i = 0; i < 300; i++) {
      const n = dealFromSeed('seed' + i);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(MAX_DEAL);
      expect(UNSOLVABLE.includes(n)).toBe(false);
    }
  });
});

describe('Sudoku', () => {
  it('same seed + level ⇒ same puzzle; different seeds differ; the reported seed replays it', () => {
    const a = generate('easy', sudokuSeed('abc'));
    expect(generate('easy', sudokuSeed('abc')).puzzle).toBe(a.puzzle);
    expect(generate('easy', sudokuSeed('abd')).puzzle).not.toBe(a.puzzle);
    expect(generate('easy', sudokuSeed(String(a.seed))).puzzle).toBe(a.puzzle);
    expect(sudokuSeed('0')).toBe(0);
  });
});

describe('Mahjong', () => {
  it('same seed + layout ⇒ same deal; different seeds differ; the reported seed replays it', () => {
    const a = mjNewGame('free', 'turtle', mahjongSeed('abc'));
    expect(json(mjNewGame('free', 'turtle', mahjongSeed('abc')).faces)).toBe(json(a.faces));
    expect(json(mjNewGame('free', 'turtle', mahjongSeed('abd')).faces)).not.toBe(json(a.faces));
    expect(json(mjNewGame('free', 'turtle', mahjongSeed(String(a.seed))).faces)).toBe(json(a.faces));
    expect(json(mjNewGame('free', 'pyramid', mahjongSeed('abc')).faces)).toBe(json(mjNewGame('free', 'pyramid', mahjongSeed('abc')).faces));
  });
  it('reshuffles are seeded by the deal too', () => {
    expect(shuffleSeed({ seed: 7, shuffles: 0 })).toBe(shuffleSeed({ seed: 7, shuffles: 0 }));
    expect(shuffleSeed({ seed: 7, shuffles: 0 })).not.toBe(shuffleSeed({ seed: 7, shuffles: 1 }));
  });
});
