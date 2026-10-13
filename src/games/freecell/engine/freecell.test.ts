import { describe, expect, it } from 'vitest';
import { cardCode, msDeal, UNSOLVABLE } from './deal';
import {
  allMoves, apply, autoAll, autoStep, canFinish, cardId, fcScore, fcWon, finishStep, foundCount, isSafeHome, legal,
  maxMovable, noMoves, runLength, sendMove, tapMove, type FcState,
} from './rules';
import { solveFreecell } from './solver';
import { dailyDeal, dealWinnable, newGame, play, randomDeal, scoreOf, undo } from './game';
import { addDays } from '../../solitaire/engine/cards';

/** Rows as Windows prints them (row r: card r of every cascade). */
const rows = (s: FcState) => {
  const out: string[] = [];
  for (let r = 0; r < 7; r++) out.push(s.cols.filter(c => r < c.length).map(c => cardCode(c[r])).join(' '));
  return out;
};

/** "KS QH" → ids (T = ten). */
const C = (code: string) => cardId('SHCD'.indexOf(code[1]), 'A23456789TJQK'.indexOf(code[0]) + 1);
const col = (txt: string) => (txt ? txt.split(' ').map(C) : []);
const board = (cols: string[], cells: (string | null)[] = [null, null, null, null], found = [0, 0, 0, 0]): FcState => ({
  cols: Array.from({ length: 8 }, (_, i) => col(cols[i] ?? '')), cells: cells.map(c => (c ? C(c) : null)), found,
});

describe('Microsoft deals', () => {
  it('deal #1 is the famous first deal', () => {
    expect(rows(msDeal(1))).toEqual([
      'JD 2D 9H JC 5D 7H 7C 5H',
      'KD KC 9S 5S AD QC KH 3H',
      '2S KS 9D QD JS AS AH 3C',
      '4C 5C TS QH 4H AC 4D 7S',
      '3S TD 4S TH 8H 2C JH 7D',
      '6D 8S 8D QS 6C 3D 8C TC',
      '6S 9C 2H 6H',
    ]);
  });

  it('deal #617 matches Windows', () => {
    expect(rows(msDeal(617))).toEqual([
      '7D AD 5C 3S 5S 8C 2D AH',
      'TD 7S QD AC 6D 8H AS KH',
      'TH QC 3H 9D 6S 8D 3D TC',
      'KD 5H 9S 3C 8S 7H 4D JS',
      '4C QS 9C 9H 7C 6H 2C 2S',
      '4S TS 2H 5D JC 6C JH QH',
      'JD KS KC 4H',
    ]);
  });

  it('every deal is a full deck in 7-7-7-7-6-6-6-6', () => {
    for (const n of [1, 2, 11982, 999_999, 1_000_000]) {
      const s = msDeal(n);
      expect(s.cols.map(c => c.length)).toEqual([7, 7, 7, 7, 6, 6, 6, 6]);
      expect(new Set(s.cols.flat()).size).toBe(52);
    }
  });

  it('random deals skip the impossible ones', () => {
    expect(randomDeal(() => 11981.5 / 1_000_000)).toBe(11983);
    for (let i = 0; i < 200; i++) expect(UNSOLVABLE).not.toContain(randomDeal());
  });
});

describe('rules', () => {
  it('builds down in alternating colours', () => {
    const s = board(['KS', 'QH', 'QC', 'JD']);
    expect(legal(s, { from: { k: 'col', i: 1 }, to: { k: 'col', i: 0 }, n: 1 })).toBe(true);   // QH on KS
    expect(legal(s, { from: { k: 'col', i: 2 }, to: { k: 'col', i: 0 }, n: 1 })).toBe(false);  // QC on KS: same colour
    expect(legal(s, { from: { k: 'col', i: 3 }, to: { k: 'col', i: 0 }, n: 1 })).toBe(false);  // JD on KS: rank gap
  });

  it('foundations take A → K of one suit only', () => {
    const s = board(['AS', '2S', '2H', '3S'], undefined, [0, 0, 0, 0]);
    expect(legal(s, { from: { k: 'col', i: 1 }, to: { k: 'found', i: 0 }, n: 1 })).toBe(false); // 2 before A
    expect(legal(s, { from: { k: 'col', i: 0 }, to: { k: 'found', i: 1 }, n: 1 })).toBe(false); // spade on hearts
    const a = apply(s, { from: { k: 'col', i: 0 }, to: { k: 'found', i: 0 }, n: 1 });
    expect(a.found[0]).toBe(1);
    expect(legal(a, { from: { k: 'col', i: 1 }, to: { k: 'found', i: 0 }, n: 1 })).toBe(true);
    expect(legal(a, { from: { k: 'col', i: 3 }, to: { k: 'found', i: 0 }, n: 1 })).toBe(false); // 3 before 2
    // cards never leave the foundations
    expect(legal(a, { from: { k: 'found', i: 0 }, to: { k: 'col', i: 0 }, n: 1 })).toBe(false);
  });

  it('free cells hold one card each', () => {
    const s = board(['KS QH', 'JC'], ['2D', null, '3D', '4D']);
    expect(legal(s, { from: { k: 'col', i: 1 }, to: { k: 'cell', i: 1 }, n: 1 })).toBe(true);
    expect(legal(s, { from: { k: 'col', i: 1 }, to: { k: 'cell', i: 0 }, n: 1 })).toBe(false);
    expect(legal(s, { from: { k: 'col', i: 0 }, to: { k: 'cell', i: 1 }, n: 2 })).toBe(false);
    expect(legal(s, { from: { k: 'cell', i: 0 }, to: { k: 'col', i: 0 }, n: 1 })).toBe(false); // 2D on QH
  });

  it('supermoves: (free cells + 1) · 2^(empty cascades)', () => {
    const run = 'KS QH JS TH 9S 8H';
    const roomy = board([run, 'KD', '3C', '', '4C', '5C', '6C', '2C']);
    expect(maxMovable(roomy, false)).toBe(5 * 2);   // 4 free cells, 1 empty cascade
    expect(maxMovable(roomy, true)).toBe(5);        // the empty cascade is the target: it cannot help
    // 2 free cells, no empty cascade → 3 cards at most
    const v = board([run, 'QD', '4C', '5C', '6C', '7C', '8C', 'TC'], ['2D', '3D', null, null]);
    expect(runLength(v.cols[0])).toBe(6);
    expect(maxMovable(v, false)).toBe(3);
    expect(legal(v, { from: { k: 'col', i: 0 }, to: { k: 'col', i: 1 }, n: 4 })).toBe(false); // JS…8H onto QD: 4 > 3
    expect(legal(v, { from: { k: 'col', i: 0 }, to: { k: 'col', i: 7 }, n: 2 })).toBe(false); // 9S on TC: same colour
    const w = { ...v, cells: [v.cells[0], null, null, null] };
    expect(maxMovable(w, false)).toBe(4);
    expect(legal(w, { from: { k: 'col', i: 0 }, to: { k: 'col', i: 1 }, n: 4 })).toBe(true);
    // 1 free cell + 1 empty cascade → 4 onto a card, 2 into the empty cascade
    const x = board([run, 'QD', '', '5C', '6C', '7C', '8C', 'TC'], ['2D', '3D', '4D', null]);
    expect(maxMovable(x, false)).toBe(4);
    expect(legal(x, { from: { k: 'col', i: 0 }, to: { k: 'col', i: 1 }, n: 4 })).toBe(true);
    expect(legal(x, { from: { k: 'col', i: 0 }, to: { k: 'col', i: 2 }, n: 3 })).toBe(false);
    expect(legal(x, { from: { k: 'col', i: 0 }, to: { k: 'col', i: 2 }, n: 2 })).toBe(true);
    // no free cell, two empty cascades → 1 · 2² = 4
    const z = board([run, 'QD', '', '', '6C', '7C', '8C', 'TC'], ['2D', '3D', '4D', '5D']);
    expect(maxMovable(z, false)).toBe(4);
    // a broken run cannot move as one
    const y = board(['KS 8H QH', 'KD']);
    expect(legal(y, { from: { k: 'col', i: 0 }, to: { k: 'col', i: 1 }, n: 2 })).toBe(false);
  });

  it('only safe cards go home on their own', () => {
    const s = board(['3H', '2C', 'AD', '4S'], undefined, [2, 2, 1, 0]);
    expect(isSafeHome(s, C('AD'))).toBe(true);
    expect(isSafeHome(s, C('3H'))).toBe(false);   // the 2 of clubs is still out: a red 3 may be needed under it
    const after = autoAll(s);
    expect(after.found).toEqual([2, 3, 2, 1]);    // AD and 2C go, then 3H is safe and goes too
    expect(after.cols[3]).toEqual([C('4S')]);     // 4S could go only after 3S
    expect(autoAll(after)).toEqual(after);
  });

  it('autoStep prefers the free cells', () => {
    const s = board(['AS'], ['AH', null, null, null]);
    expect(autoStep(s)?.from).toEqual({ k: 'cell', i: 0 });
  });

  it('gathering at the end', () => {
    const s = board(['KS QS', 'KH', '', '', '', '', '', ''], [null, null, null, null], [11, 12, 13, 13]);
    expect(canFinish(s)).toBe(true);
    let t = s;
    for (let k = 0; k < 10 && finishStep(t); k++) t = apply(t, finishStep(t)!);
    expect(fcWon(t)).toBe(true);
    expect(canFinish(board(['QS KS'], undefined, [11, 12, 13, 13]))).toBe(false);
  });

  it('taps and double taps', () => {
    const s = board(['KS', 'QH', 'AD', '5C'], undefined, [0, 0, 0, 0]);
    expect(tapMove(s, { k: 'col', i: 1 }, 0)).toEqual({ from: { k: 'col', i: 1 }, to: { k: 'col', i: 0 }, n: 1 });
    expect(tapMove(s, { k: 'col', i: 2 }, 0)?.to).toEqual({ k: 'found', i: 3 });
    expect(tapMove(s, { k: 'col', i: 3 }, 0)?.to).toEqual({ k: 'cell', i: 0 }); // a lone card: a free cell before an empty cascade
    expect(sendMove(s, { k: 'col', i: 3 })?.to).toEqual({ k: 'cell', i: 0 });
  });

  it('no moves at all', () => {
    const s = board(['KS 2H', 'KC 3H', 'QS 4H', 'QC 5H', 'KH 2D', 'KD 3D', 'QH 4D', 'QD 5D'], ['JS', 'JH', 'JC', 'JD']);
    expect(allMoves(s)).toEqual([]);
    expect(noMoves(s)).toBe(true);
  });
});

describe('game', () => {
  it('play, undo, count', () => {
    const g = newGame(1);
    const m = allMoves(g.st)[0];
    const g1 = play(g, m)!;
    expect(g1.moves).toBe(1);
    expect(g1.hist).toHaveLength(1);
    const g0 = undo(g1);
    expect(g0.st).toEqual(g.st);
    expect(g0.undos).toBe(1);
    expect(play(g, { from: { k: 'found', i: 0 }, to: { k: 'col', i: 0 }, n: 1 })).toBeNull();
  });

  it('scoring rewards speed, few moves, no undos', () => {
    expect(fcScore({ won: true, seconds: 120, moves: 90, undos: 0, home: 52 })).toBe(3000 + 1680 + 1050);
    expect(fcScore({ won: true, seconds: 5000, moves: 400, undos: 300, home: 52 })).toBe(500);
    expect(fcScore({ won: true, seconds: 300, moves: 100, undos: 2, home: 52 })).toBeGreaterThan(fcScore({ won: true, seconds: 300, moves: 100, undos: 3, home: 52 }));
    expect(fcScore({ won: false, seconds: 300, moves: 100, undos: 0, home: 17 })).toBe(170);
    expect(scoreOf({ ...newGame(5), seconds: 100 }, false)).toBe(0);
  });
});

describe('solver', () => {
  const replay = (start: FcState, path: ReturnType<typeof solveFreecell>['path']) => {
    let s = autoAll(start);
    for (const m of path!) { expect(legal(s, m)).toBe(true); s = autoAll(apply(s, m)); }
    return s;
  };

  it('solves the classic deals with a legal line', () => {
    for (const n of [1, 617, 2, 3, 1941]) {
      const r = solveFreecell(msDeal(n), 120_000);
      expect(r.result, `#${n}`).toBe('solved');
      expect(fcWon(replay(msDeal(n), r.path))).toBe(true);
    }
  });

  it('proves #11982 impossible', () => {
    expect(solveFreecell(msDeal(11982), 400_000).result).toBe('unsolvable');
    expect(dealWinnable(11982)).toBe(false);
  });

  it('finds the line from a near-solved board', () => {
    const s = board(['QS KH', 'QH KS', 'QC KD', 'QD KC', '', '', '', ''], ['JC', null, null, null], [11, 11, 10, 11]);
    const r = solveFreecell(s, 1000);
    expect(r.result).toBe('solved');
    expect(fcWon(replay(s, r.path))).toBe(true);
    expect(foundCount(s)).toBe(43);
  });

  it('every daily deal of a fortnight is proven winnable, and the same each time', () => {
    const start = '2026-10-13';
    const seen = new Set<number>();
    for (let k = 0; k < 14; k++) {
      const day = addDays(start, k);
      const n = dailyDeal(day);
      expect(UNSOLVABLE).not.toContain(n);
      const r = solveFreecell(msDeal(n), 120_000);
      expect(r.result, day).toBe('solved');
      expect(fcWon(replay(msDeal(n), r.path))).toBe(true);
      seen.add(n);
    }
    expect(seen.size).toBeGreaterThan(10);
    expect(dailyDeal(start)).toBe(dailyDeal(start));
  }, 120_000);
});
