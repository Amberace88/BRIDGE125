import { describe, expect, it } from 'vitest';
import { apply, newGame, nextRound, type Card, type GameState } from './engine';

/** Optional table rules used by the Journey campaign (queenDraw, gameOverAt, burnSplash). Defaults are untouched. */

const C = (id: string): Card => ({ id, r: id.slice(0, -1) as Card['r'], s: id.slice(-1) as Card['s'] });
const DECK = ['6C', '7C', '8C', '9C', '10H', 'KH', '7D', '9D', '10D', 'KD', 'AD', '7H', '8D'];

function setup(hands: string[][], topCard = '10S', deck: string[] = DECK): GameState {
  const st = newGame(hands.map((_, i) => ({ name: 'P' + i, bot: false })), () => 0.42);
  st.players.forEach((p, i) => { p.hand = hands[i].map(C); });
  st.pile = [C(topCard)];
  st.activeSuit = C(topCard).s;
  st.deck = deck.map(C);
  st.current = 0;
  return st;
}

describe('optional table rules (Journey twists)', () => {
  it('defaults are unchanged: Q♠ costs 5', () => {
    const st = setup([['QS', 'KC'], ['AH', '9H']]);
    expect(st.rules?.queenDraw).toBeUndefined();
    const s = apply(st, 0, { type: 'play', cardIds: ['QS'] });
    expect(s.pending).toEqual({ kind: 'queen', amount: 5 });
  });

  it('queenDraw: the Q♠ makes the next player draw that many; the 6♠ transfer stays 6', () => {
    const st = setup([['QS', 'KC'], ['AH', '9H']]);
    st.rules = { bluff: false, queenDraw: 7 };
    let s = apply(st, 0, { type: 'play', cardIds: ['QS'] });
    expect(s.pending).toEqual({ kind: 'queen', amount: 7 });
    s = apply(s, 1, { type: 'accept' });
    expect(s.players[1].hand.length).toBe(9);
    expect(s.current).toBe(0);

    const t = setup([['QS', 'KC'], ['6S', 'AH'], ['10C', 'QC']]);
    t.rules = { bluff: false, queenDraw: 7 };
    let u = apply(t, 0, { type: 'play', cardIds: ['QS'] });
    u = apply(u, 1, { type: 'play', cardIds: ['6S'] });
    expect(u.pending).toEqual({ kind: 'queen6', amount: 6 });
  });

  it('queenDraw also applies when the Q♠ is the last card', () => {
    const st = setup([['QS'], ['AH', '9H']]);
    st.rules = { bluff: false, queenDraw: 7 };
    const s = apply(st, 0, { type: 'play', cardIds: ['QS'] });
    expect(s.phase).toBe('roundOver');
    expect(s.players[1].hand.length).toBe(9);
  });

  it('gameOverAt: the game ends at the custom limit', () => {
    const st = setup([['9S'], ['KH', 'AH']]);
    st.rules = { bluff: false, gameOverAt: 100 };
    st.players[1].score = 80;
    const s = apply(st, 0, { type: 'play', cardIds: ['9S'] });
    expect(s.players[1].score).toBe(105);
    expect(s.phase).toBe('gameOver');
    expect(s.winners).toEqual([0]);

    const d = setup([['9S'], ['KH', 'AH']]);
    d.players[1].score = 80;
    expect(apply(d, 0, { type: 'play', cardIds: ['9S'] }).phase).toBe('roundOver');
  });

  it('burnSplash: an exact 125 burn adds points to every other player', () => {
    const st = setup([['9S'], ['KH'], ['AD', '10C']]);
    st.rules = { bluff: false, burnSplash: 10 };
    st.players[1].score = 115;
    st.players[2].score = 20;
    const s = apply(st, 0, { type: 'play', cardIds: ['9S'] });
    expect(s.players.map(p => p.score)).toEqual([10, 0, 55]);
    const rows = s.lastResult!.rows;
    expect(rows[1].reset).toBe(true);
    expect(rows[0]).toMatchObject({ added: 10, after: 10 });
    expect(rows[2]).toMatchObject({ added: 35, after: 55 });
  });

  it('burnSplash landing exactly on 125 burns that player too (no chain splash)', () => {
    const st = setup([['9S'], ['KH'], ['7C']]);
    st.rules = { bluff: false, burnSplash: 10 };
    st.players[1].score = 115;
    st.players[2].score = 115;
    const s = apply(st, 0, { type: 'play', cardIds: ['9S'] });
    expect(s.players.map(p => p.score)).toEqual([10, 0, 0]);
    expect(s.events.filter(e => e.t === 'reset125').length).toBe(2);
  });

  it('without burnSplash an exact 125 touches nobody else', () => {
    const st = setup([['9S'], ['KH'], ['AD', '10C']]);
    st.players[1].score = 115;
    st.players[2].score = 20;
    const s = apply(st, 0, { type: 'play', cardIds: ['9S'] });
    expect(s.players.map(p => p.score)).toEqual([0, 0, 45]);
  });

  it('rules survive a new round', () => {
    const st = setup([['9S'], ['KH']]);
    st.rules = { bluff: false, queenDraw: 7, gameOverAt: 100, burnSplash: 10 };
    const s = apply(st, 0, { type: 'play', cardIds: ['9S'] });
    expect(nextRound(s).rules).toEqual({ bluff: false, queenDraw: 7, gameOverAt: 100, burnSplash: 10 });
  });
});
