import { describe, it, expect } from 'vitest';
import { apply, newGame, type Card, type GameState, cardPoints, options } from './engine';
import { botAction } from './bot';

const C = (id: string): Card => ({ id, r: id.slice(0, -1) as Card['r'], s: id.slice(-1) as Card['s'] });

function setup(hands: string[][], topCard = '10H', deck: string[] = ['6C', '7C', '8C', '9C', '10C', 'KC', '7D', '9D', '10D', 'KD', 'AD', '7H']): GameState {
  const st = newGame(hands.map((_, i) => ({ name: 'P' + i, bot: false })), () => 0.42);
  st.players.forEach((p, i) => { p.hand = hands[i].map(C); });
  st.pile = [C(topCard)];
  st.activeSuit = C(topCard).s;
  st.deck = deck.map(C);
  st.current = 0;
  return st;
}

describe('basic play', () => {
  it('suit or rank match, J and 9 wild', () => {
    const st = setup([['7H', '10S', 'JC', '9D', 'KC'], ['AS']]);
    const legal = options(st, 0).legal.map(c => c.id).sort();
    expect(legal).toEqual(['10S', '7H', '9D', 'JC'].sort());
  });
  it('multi-play same rank', () => {
    const st = setup([['10S', '10D', 'KC'], ['AS']]);
    const s2 = apply(st, 0, { type: 'play', cardIds: ['10S', '10D'] });
    expect(s2.players[0].hand.map(c => c.id)).toEqual(['KC']);
    expect(s2.activeSuit).toBe('D');
    expect(s2.current).toBe(1);
  });
});

describe('special cards', () => {
  it('A skips next player (2p → same player again)', () => {
    const st = setup([['AH', 'KC'], ['AS', '7S']]);
    const s2 = apply(st, 0, { type: 'play', cardIds: ['AH'] });
    expect(s2.current).toBe(0);
  });
  it('7: next draws 1 then continues', () => {
    const st = setup([['7H', 'KC'], ['AS', '7S']]);
    let s = apply(st, 0, { type: 'play', cardIds: ['7H'] });
    expect(s.current).toBe(1);
    expect(options(s, 1).forcedDraw).toBe(true);
    s = apply(s, 1, { type: 'accept' });
    expect(s.players[1].hand.length).toBe(3);
    expect(s.current).toBe(1);
    expect(options(s, 1).legal.map(c => c.id)).toContain('7S');
  });
  it('8 stacks: 8 → 8 → draw 4 and skip', () => {
    const st = setup([['8H', 'KC'], ['8S', 'AS'], ['10C', 'QC']]);
    let s = apply(st, 0, { type: 'play', cardIds: ['8H'] });
    s = apply(s, 1, { type: 'play', cardIds: ['8S'] });
    expect(s.pending).toEqual({ kind: 'eight', amount: 4 });
    s = apply(s, 2, { type: 'accept' });
    expect(s.players[2].hand.length).toBe(6);
    expect(s.current).toBe(0);
  });
  it('Q♠: draw 5 and skip; or 6♠ transfer → next draws 6 and must cover', () => {
    const st = setup([['QS', 'KC'], ['6S', 'AH'], ['10C', 'QC', 'JD']], '10S',
      ['6C', '7C', '8C', '9C', '10H', 'KH', '7D', '9D', '10D', 'KD', 'AD', '7H', '8D']);
    let s = apply(st, 0, { type: 'play', cardIds: ['QS'] });
    expect(s.pending?.kind).toBe('queen');
    s = apply(s, 1, { type: 'play', cardIds: ['6S'] });
    expect(s.pending).toEqual({ kind: 'queen6', amount: 6 });
    expect(s.current).toBe(2);
    s = apply(s, 2, { type: 'accept' });
    expect(s.players[2].hand.length).toBe(9);
    expect(s.mustCover).toBe(true);
    expect(s.current).toBe(2);
    s = apply(s, 2, { type: 'play', cardIds: ['JD'] });
    expect(s.phase).toBe('chooseSuit');
  });
  it('6 must be covered by same player', () => {
    const st = setup([['6H', '10H', 'KC'], ['AS']]);
    let s = apply(st, 0, { type: 'play', cardIds: ['6H'] });
    expect(s.current).toBe(0);
    expect(s.mustCover).toBe(true);
    s = apply(s, 0, { type: 'play', cardIds: ['10H'] });
    expect(s.current).toBe(1);
  });
  it('J asks for suit', () => {
    const st = setup([['JC', 'KC'], ['AS']]);
    let s = apply(st, 0, { type: 'play', cardIds: ['JC'] });
    expect(s.phase).toBe('chooseSuit');
    s = apply(s, 0, { type: 'suit', suit: 'D' });
    expect(s.activeSuit).toBe('D');
    expect(s.current).toBe(1);
  });
  it('four kings on the pile reset all scores', () => {
    const st = setup([['KS', 'KD', 'AC'], ['AS']], 'KH');
    st.pile = [C('KC'), C('KH')];
    st.players[0].score = 80; st.players[1].score = 90;
    const s = apply(st, 0, { type: 'play', cardIds: ['KS', 'KD'] });
    expect(s.players.map(p => p.score)).toEqual([0, 0]);
  });
});

describe('scoring', () => {
  it('points per card', () => {
    expect(cardPoints(C('AH'))).toBe(15);
    expect(cardPoints(C('6S'))).toBe(5);
    expect(cardPoints(C('6H'))).toBe(0);
    expect(cardPoints(C('QS'))).toBe(10);
  });
  it('finish with 4 jacks → ×5, exactly 125 → 0, ≥130 → game over', () => {
    const st = setup([['JS', 'JH', 'JC', 'JD'], ['AS'], ['AH', 'KH', 'QH']]);
    st.players[1].score = 50;  // +15×5=75 → 125 → 0
    st.players[2].score = 47;  // +35×5=175 → 222
    const s = apply(st, 0, { type: 'play', cardIds: ['JS', 'JH', 'JC', 'JD'] });
    expect(s.lastResult?.mult).toBe(5);
    expect(s.players[1].score).toBe(0);
    expect(s.players[2].score).toBe(222);
    expect(s.phase).toBe('gameOver');
    expect(s.winners).toEqual([0, 1]);
  });
  it('cannot finish on a 6', () => {
    const st = setup([['6H'], ['AS']]);
    const s = apply(st, 0, { type: 'play', cardIds: ['6H'] });
    expect(s.phase).toBe('play');
    expect(s.mustCover).toBe(true);
    expect(options(s, 0).canDraw).toBe(true);
  });
});

describe('bots', () => {
  it('bot-only games always terminate', () => {
    for (let g = 0; g < 200; g++) {
      let s = newGame([{ name: 'a', bot: true }, { name: 'b', bot: true }, { name: 'c', bot: true }].slice(0, 2 + (g % 3)));
      let steps = 0;
      while (s.phase !== 'gameOver' && steps < 20000) {
        if (s.phase === 'roundOver') { s = { ...s }; s = (s as GameState); s = nextRoundSafe(s); continue; }
        const p = s.current;
        const a = botAction(s, p, g % 2 ? 'easy' : 'normal');
        const n = apply(s, p, a);
        if (n === s) throw new Error('bot made invalid move ' + JSON.stringify(a) + ' pending=' + JSON.stringify(s.pending) + ' mustCover=' + s.mustCover);
        s = n; steps++;
      }
      expect(s.phase).toBe('gameOver');
    }
  });
});

import { nextRound } from './engine';
function nextRoundSafe(s: GameState) { return nextRound(s); }
