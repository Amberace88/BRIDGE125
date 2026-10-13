import { describe, expect, it } from 'vitest';
import {
  applyK, dealKlondike, kAllMoves, kBestMove, kAutoComplete, kCanAutoComplete, kCanDraw, kCollectStep, kFinalScore, kFits,
  kLegal, kLiveScore, kWon, K_SCORE, type KMove, type KState,
} from './klondike';

const id = (suit: number, r: number) => suit * 13 + r - 1; // suits: 0 ♠ 1 ♥ 2 ♣ 3 ♦
const empty = (over: Partial<KState> = {}): KState => ({
  game: 'klondike', seed: 1, draw: 1, vegas: false, stock: [], waste: [], found: [[], [], [], []],
  tab: Array.from({ length: 7 }, () => ({ c: [], d: 0 })), score: 0, moves: 0, passes: 0, ...over,
});

describe('Klondike deal', () => {
  it('deals 28 cards in 7 columns (top card up) and 24 to the stock, every card once', () => {
    const s = dealKlondike(12345);
    expect(s.tab.map(t => t.c.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(s.tab.map(t => t.d)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(s.stock).toHaveLength(24);
    const all = [...s.stock, ...s.tab.flatMap(t => t.c)].sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 52 }, (_, i) => i));
  });
  it('is deterministic per seed and differs between seeds', () => {
    expect(dealKlondike(7)).toEqual(dealKlondike(7));
    expect(dealKlondike(7).stock).not.toEqual(dealKlondike(8).stock);
  });
});

describe('Klondike rules', () => {
  it('builds down in alternating colours', () => {
    expect(kFits(id(1, 6), id(0, 7))).toBe(true);   // 6♥ on 7♠
    expect(kFits(id(2, 6), id(0, 7))).toBe(false);  // 6♣ on 7♠ (same colour)
    expect(kFits(id(1, 5), id(0, 7))).toBe(false);  // 5♥ on 7♠ (not one lower)
  });
  it('only a king goes to an empty column', () => {
    const s = empty({ waste: [id(0, 13)], tab: [{ c: [], d: 0 }, { c: [id(1, 12)], d: 0 }, ...Array.from({ length: 5 }, () => ({ c: [], d: 0 }))] });
    expect(kLegal(s, { t: 'move', from: { k: 'waste' }, to: { k: 'tab', i: 0 }, n: 1 })).toBe(true);
    const q = { ...s, waste: [id(0, 12)] };
    expect(kLegal(q, { t: 'move', from: { k: 'waste' }, to: { k: 'tab', i: 0 }, n: 1 })).toBe(false);
  });
  it('foundations start with the ace and follow suit upwards', () => {
    const s = empty({ waste: [id(1, 2), id(1, 1)] });
    const toF = (i: number): KMove => ({ t: 'move', from: { k: 'waste' }, to: { k: 'found', i }, n: 1 });
    expect(kLegal(s, toF(0))).toBe(false); // ♥ ace onto the ♠ foundation
    const a = applyK(s, toF(1));
    expect(a.found[1]).toEqual([id(1, 1)]);
    const b = applyK(a, toF(1));
    expect(b.found[1]).toEqual([id(1, 1), id(1, 2)]);
    // two cards never move to a foundation together
    const t = empty({ tab: [{ c: [id(0, 2), id(1, 1)], d: 0 }, ...Array.from({ length: 6 }, () => ({ c: [], d: 0 }))], found: [[id(0, 1)], [], [], []] });
    expect(kLegal(t, { t: 'move', from: { k: 'tab', i: 0 }, to: { k: 'found', i: 0 }, n: 2 })).toBe(false);
  });
  it('moves a face-up run and turns the card underneath (+5)', () => {
    const s = empty({ tab: [
      { c: [id(2, 3), id(0, 9), id(1, 8)], d: 1 },   // 3♣ (down), 9♠, 8♥
      { c: [id(3, 10)], d: 0 },                      // 10♦
      ...Array.from({ length: 5 }, () => ({ c: [], d: 0 })),
    ] });
    const m: KMove = { t: 'move', from: { k: 'tab', i: 0 }, to: { k: 'tab', i: 1 }, n: 2 };
    expect(kLegal(s, m)).toBe(true);
    const n = applyK(s, m);
    expect(n.tab[1].c).toEqual([id(3, 10), id(0, 9), id(1, 8)]);
    expect(n.tab[0]).toEqual({ c: [id(2, 3)], d: 0 });
    expect(n.score).toBe(K_SCORE.reveal);
    expect(n.moves).toBe(1);
    // face-down cards never move
    expect(kLegal(s, { t: 'move', from: { k: 'tab', i: 0 }, to: { k: 'tab', i: 1 }, n: 3 })).toBe(false);
  });
  it('an illegal move leaves the state untouched', () => {
    const s = dealKlondike(3);
    const bad: KMove = { t: 'move', from: { k: 'tab', i: 0 }, to: { k: 'tab', i: 0 }, n: 1 };
    expect(applyK(s, bad)).toBe(s);
  });
  it('lists every legal move (and only legal ones)', () => {
    const s = dealKlondike(99);
    for (const m of kAllMoves(s)) expect(kLegal(s, m)).toBe(true);
    expect(kAllMoves(s).some(m => m.t === 'draw')).toBe(true);
  });
});

describe('tap-to-move', () => {
  it('prefers the foundation, then a column, and never ping-pongs between equal parents', () => {
    const cols = (c: { c: number[]; d: number }[]) => [...c, ...Array.from({ length: 7 - c.length }, () => ({ c: [] as number[], d: 0 }))];
    const s = empty({ tab: cols([{ c: [id(2, 9), id(3, 8)], d: 0 }, { c: [id(0, 9)], d: 0 }, { c: [id(1, 1)], d: 0 }]) });
    expect(kBestMove(s, { k: 'tab', i: 2 }, 0)).toEqual({ t: 'move', from: { k: 'tab', i: 2 }, to: { k: 'found', i: 1 }, n: 1 });
    expect(kBestMove(s, { k: 'tab', i: 0 }, 1)).toBeNull();          // 8♦ already on 9♣: not moved to 9♠
    const t = empty({ waste: [id(3, 8)], tab: cols([{ c: [id(0, 9)], d: 0 }]) });
    expect(kBestMove(t, { k: 'waste' }, 0)).toEqual({ t: 'move', from: { k: 'waste' }, to: { k: 'tab', i: 0 }, n: 1 });
  });
});

describe('Klondike stock', () => {
  it('draw 1 turns one card, draw 3 turns three; an empty stock turns the waste back over', () => {
    const s1 = applyK(dealKlondike(5, 1), { t: 'draw' });
    expect(s1.waste).toHaveLength(1); expect(s1.stock).toHaveLength(23);
    let s3 = applyK(dealKlondike(5, 3), { t: 'draw' });
    expect(s3.waste).toHaveLength(3);
    for (let i = 0; i < 7; i++) s3 = applyK(s3, { t: 'draw' });
    expect(s3.stock).toHaveLength(0);
    const order = s3.waste.slice();
    s3 = applyK(s3, { t: 'draw' });
    expect(s3.waste).toHaveLength(0);
    expect(s3.stock).toEqual(order.reverse());
    expect(s3.passes).toBe(1);
  });
  it('standard draw-1 recycle costs 100 points (never below 0)', () => {
    const s = empty({ waste: [1, 2], score: 150 });
    expect(applyK(s, { t: 'draw' }).score).toBe(50);
    expect(applyK({ ...s, score: 20 }, { t: 'draw' }).score).toBe(0);
  });
  it('Vegas: −52 to start, +5 per card home, one pass with draw 1', () => {
    const v = dealKlondike(11, 1, true);
    expect(v.score).toBe(-52);
    expect(kCanDraw({ ...v, stock: [], waste: [1] })).toBe(false);
    const w = empty({ vegas: true, score: -52, waste: [id(0, 1)] });
    expect(applyK(w, { t: 'move', from: { k: 'waste' }, to: { k: 'found', i: 0 }, n: 1 }).score).toBe(-47);
  });
});

describe('Klondike scoring + finish', () => {
  it('standard live score loses 2 per 10 s and 10 per undo; a win adds the speed bonus', () => {
    const s = empty({ score: 300 });
    expect(kLiveScore(s, 95, 1)).toBe(300 - 10 - 18);
    const won = empty({ score: 600, found: [0, 1, 2, 3].map(su => Array.from({ length: 13 }, (_, r) => id(su, r + 1))) });
    expect(kWon(won)).toBe(true);
    expect(kFinalScore(won, 140, 0)).toBe(600 - 28 + Math.floor(700_000 / 140));
  });

  const near = (): KState => empty({
    found: [0, 1, 2, 3].map(su => Array.from({ length: 10 }, (_, r) => id(su, r + 1))),
    tab: [
      { c: [id(0, 13), id(1, 12), id(0, 11)], d: 0 }, { c: [id(1, 13), id(0, 12), id(1, 11)], d: 0 },
      { c: [id(2, 13), id(3, 12), id(2, 11)], d: 0 }, { c: [id(3, 13), id(2, 12), id(3, 11)], d: 0 },
      { c: [], d: 0 }, { c: [], d: 0 }, { c: [], d: 0 },
    ],
  });
  it('auto-complete is offered once everything is face up and plays to the win', () => {
    const s = near();
    expect(kCanAutoComplete(s)).toBe(true);
    expect(kCanAutoComplete(dealKlondike(1))).toBe(false);
    const { state, moves } = kAutoComplete(s);
    expect(kWon(state)).toBe(true);
    expect(moves).toHaveLength(12);
  });
  it('collect (double tap on the felt) only sends cards that are safe to send', () => {
    const s = empty({ found: [[id(0, 1)], [], [], []], waste: [id(0, 2)], tab: [{ c: [id(1, 1)], d: 0 }, { c: [id(0, 5)], d: 0 }, ...Array.from({ length: 5 }, () => ({ c: [], d: 0 }))] });
    const m1 = kCollectStep(s)!;
    expect(m1).toEqual({ t: 'move', from: { k: 'waste' }, to: { k: 'found', i: 0 }, n: 1 });
    // 3♠ with the red foundations empty is not safe (a red 2 may still need it)
    const t = empty({ found: [[id(0, 1), id(0, 2)], [], [], []], waste: [id(0, 3)] });
    expect(kCollectStep(t)).toBeNull();
  });
});
