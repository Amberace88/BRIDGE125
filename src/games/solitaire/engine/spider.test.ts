import { describe, expect, it } from 'vitest';
import { applySp, dealSpider, spAllMoves, spCanDeal, spHint, spLegal, spRunLength, spWon, SP_SCORE, spiderCards, type SpState } from './spider';

/** A state with chosen columns (ids index into the 104-card table). */
function make(suits: 1 | 2 | 4, cols: number[][], extra: Partial<SpState> = {}): SpState {
  const tab = Array.from({ length: 10 }, (_, i) => ({ c: cols[i] ?? [], d: 0 }));
  return { game: 'spider', seed: 1, suits, cards: spiderCards(suits), stock: [], tab, done: [], score: 500, moves: 0, ...extra };
}
// with 4 suits: ids 0-12 ♠ A-K, 13-25 ♥, 26-38 ♣, 39-51 ♦ (and again 52-103)
const S = (r: number) => r - 1, H = (r: number) => 13 + r - 1;

describe('Spider deal', () => {
  it.each([1, 2, 4] as const)('%i suit(s): 104 cards, 54 on the table (4×6 + 6×5), 50 in the stock', suits => {
    const s = dealSpider(42, suits);
    expect(s.tab.map(t => t.c.length)).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
    expect(s.tab.every(t => t.d === t.c.length - 1)).toBe(true);
    expect(s.stock).toHaveLength(50);
    expect(new Set([...s.stock, ...s.tab.flatMap(t => t.c)]).size).toBe(104);
    expect(new Set(s.cards.map(c => c.s)).size).toBe(suits);
    expect(s.score).toBe(SP_SCORE.start);
  });
  it('is deterministic', () => expect(dealSpider(9, 2)).toEqual(dealSpider(9, 2)));
});

describe('Spider rules', () => {
  it('builds down regardless of suit, but only a same-suit run moves as one', () => {
    const s = make(4, [[S(9), H(8)], [S(10)], [H(9), H(8)]]);
    expect(spRunLength(s, 0)).toBe(1);                                  // 9♠ 8♥ is not a suited run
    expect(spLegal(s, { t: 'move', from: 0, to: 1, n: 2 })).toBe(false); // so it cannot move as two
    expect(spLegal(s, { t: 'move', from: 2, to: 1, n: 2 })).toBe(true);  // 9♥ 8♥ onto 10♠ — any suit
    expect(spLegal(s, { t: 'move', from: 0, to: 2, n: 1 })).toBe(false); // 8♥ onto 8♥
  });
  it('anything goes to an empty column; dealing needs every column filled', () => {
    const s = make(1, [[S(5)], [S(9)]], { stock: Array.from({ length: 10 }, (_, i) => 60 + i) });
    expect(spLegal(s, { t: 'move', from: 0, to: 5, n: 1 })).toBe(true);
    expect(spCanDeal(s)).toBe(false);
    const full = make(1, Array.from({ length: 10 }, (_, i) => [i]), { stock: Array.from({ length: 10 }, (_, i) => 60 + i) });
    const d = applySp(full, { t: 'deal' });
    expect(d.tab.every(t => t.c.length === 2)).toBe(true);
    expect(d.stock).toHaveLength(0);
    expect(d.score).toBe(500 + SP_SCORE.move);
  });
  it('a full K→A suited run leaves the table (+100) and the card under it turns up', () => {
    const run = Array.from({ length: 12 }, (_, k) => S(12 - k));   // Q♠ … A♠
    const s = make(4, [[H(4), S(13)], run]);
    s.tab[0].d = 1;
    const n = applySp(s, { t: 'move', from: 1, to: 0, n: 12 });
    expect(n.done).toHaveLength(1);
    expect(n.done[0]).toHaveLength(13);
    expect(n.tab[0]).toEqual({ c: [H(4)], d: 0 });
    expect(n.score).toBe(500 - 1 + 100);
  });
  it('eight runs win', () => {
    const s = make(1, [], { done: Array.from({ length: 8 }, () => []) });
    expect(spWon(s)).toBe(true);
  });
  it('every listed move is legal and the hint picks a sensible one', () => {
    const s = dealSpider(3, 1);
    for (const m of spAllMoves(s)) expect(spLegal(s, m)).toBe(true);
    const h = spHint(s);
    expect(h).not.toBeNull();
    expect(spLegal(s, h!)).toBe(true);
  });
});
