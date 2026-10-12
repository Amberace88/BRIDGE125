import { describe, it, expect, vi } from 'vitest';
import { apply, newGame, nextRound, shuffle, validatePlay, type Card, type GameState, cardPoints, options } from './engine';
import { BOT_LEVELS, botAction, botView, type BotLevel } from './bot';

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

// ---------------------------------------------------------------- helpers for the new suites

/** Small deterministic PRNG so simulations are reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seeded<T>(seed: number, fn: () => T): T {
  const spy = vi.spyOn(Math, 'random').mockImplementation(mulberry32(seed));
  try { return fn(); } finally { spy.mockRestore(); }
}

function bluffSetup(hands: string[][], topCard = '10H', deck: string[] = ['7D', '9D', '10D', 'KD', 'AD', '6D', '8D', 'QD']): GameState {
  const st = setup(hands, topCard, deck);
  st.rules = { bluff: true };
  return st;
}
const ids = (cs: Card[]) => cs.map(c => c.id).sort();

/** Play a whole game with bots; throws if any bot action is rejected. */
function playOut(levels: BotLevel[], bluff: boolean, maxSteps = 40000): GameState {
  let s = newGame(levels.map((l, i) => ({ name: l + i, bot: true })), { bluff });
  let steps = 0;
  while (s.phase !== 'gameOver' && steps < maxSteps) {
    if (s.phase === 'roundOver') { s = nextRound(s); continue; }
    const p = s.current;
    const a = botAction(s, p, levels[p]);
    const n = apply(s, p, a);
    if (n === s) throw new Error(`${levels[p]} bot made invalid move ${JSON.stringify(a)} pending=${JSON.stringify(s.pending)} mustCover=${s.mustCover} aceSkip=${s.aceSkip} lastPlay=${JSON.stringify(s.lastPlay)}`);
    s = n; steps++;
  }
  return s;
}

// ---------------------------------------------------------------- Q♠

describe('queen of spades: draw 5 and lose the turn', () => {
  it('3 players: the hit player draws 5 and the turn passes on', () => {
    const st = setup([['QS', 'KC'], ['AH', '7C'], ['10C', 'QC']], '10S');
    let s = apply(st, 0, { type: 'play', cardIds: ['QS'] });
    expect(s.pending).toEqual({ kind: 'queen', amount: 5 });
    expect(s.current).toBe(1);
    const o = options(s, 1);
    expect(o.canAccept).toBe(true);
    expect(o.canDraw).toBe(false);
    expect(o.canPass).toBe(false);
    expect(o.legal).toEqual([]);
    s = apply(s, 1, { type: 'accept' });
    expect(s.players[1].hand.length).toBe(7);
    expect(s.current).toBe(2);
    expect(s.pending).toBeNull();
    expect(s.events).toContainEqual({ t: 'skip', p: 1 });
    // the hit player cannot act any more this turn
    expect(apply(s, 1, { type: 'draw' })).toBe(s);
    expect(apply(s, 1, { type: 'play', cardIds: ['7C'] })).toBe(s);
  });
  it('2 players: the turn comes straight back to the queen player', () => {
    const st = setup([['QS', 'KC'], ['AH', '7C']], '10S');
    let s = apply(st, 0, { type: 'play', cardIds: ['QS'] });
    s = apply(s, 1, { type: 'accept' });
    expect(s.players[1].hand.length).toBe(7);
    expect(s.current).toBe(0);
  });
  it('multi-queen play including Q♠ hits the same way', () => {
    const st = setup([['QH', 'QS', 'KC'], ['AH', '7C'], ['10C']], '10H');
    let s = apply(st, 0, { type: 'play', cardIds: ['QH', 'QS'] });
    expect(s.pending).toEqual({ kind: 'queen', amount: 5 });
    s = apply(s, 1, { type: 'accept' });
    expect(s.current).toBe(2);
  });
  it('still loses the turn when the deck cannot supply all 5 cards', () => {
    const st = setup([['QS', 'KC'], ['AH', '7C'], ['10C']], '10S', ['7D', '8D']);
    let s = apply(st, 0, { type: 'play', cardIds: ['QS'] });
    s = apply(s, 1, { type: 'accept' });
    expect(s.current).toBe(2);
  });
  it('6♠ transfer still works: the target draws 6, must cover (keeps the turn), then the turn passes', () => {
    const st = setup([['QS', 'KC'], ['6S', 'AH'], ['10C', 'QC', 'KS']], '10S',
      ['6C', '7C', '8C', '9C', '10H', 'KH', '7D', '9D', '10D', 'KD', 'AD', '7H', '8D']);
    let s = apply(st, 0, { type: 'play', cardIds: ['QS'] });
    s = apply(s, 1, { type: 'play', cardIds: ['6S'] });
    expect(s.pending).toEqual({ kind: 'queen6', amount: 6 });
    expect(s.events).toContainEqual({ t: 'transfer', p: 1, target: 2 });
    expect(options(s, 2).forcedDraw).toBe(true);
    s = apply(s, 2, { type: 'accept' });
    expect(s.players[2].hand.length).toBe(9);
    expect(s.current).toBe(2);
    expect(s.mustCover).toBe(true);
    s = apply(s, 2, { type: 'play', cardIds: ['KS'] });
    expect(s.current).toBe(0);
    expect(s.mustCover).toBe(false);
  });
  it('Q♠ + 6♠ combo: next draws 6 and must cover', () => {
    const st = setup([['QS', '6S', 'KC'], ['AH', '7S'], ['10C']], '10S');
    let s = apply(st, 0, { type: 'play', cardIds: ['QS', '6S'] });
    expect(s.pending).toEqual({ kind: 'queen6', amount: 6 });
    expect(s.current).toBe(1);
    s = apply(s, 1, { type: 'accept' });
    expect(s.current).toBe(1);
    expect(s.mustCover).toBe(true);
  });
  it('bots accept and lose the turn too', () => {
    const st = setup([['QS', 'KC'], ['AH', '7C'], ['10C', 'QC']], '10S');
    const s = apply(st, 0, { type: 'play', cardIds: ['QS'] });
    for (const lvl of BOT_LEVELS) {
      const a = botAction(s, 1, lvl);
      expect(a).toEqual({ type: 'accept' });
      expect(apply(s, 1, a).current).toBe(2);
    }
  });
});

// ---------------------------------------------------------------- game setup / rules field

describe('rules & newGame options', () => {
  it('bluff is off by default and stored on the state', () => {
    expect(newGame([{ name: 'a', bot: false }, { name: 'b', bot: true }]).rules).toEqual({ bluff: false });
    expect(newGame([{ name: 'a', bot: false }, { name: 'b', bot: true }], { bluff: true }).rules).toEqual({ bluff: true });
    expect(newGame([{ name: 'a', bot: false }, { name: 'b', bot: true }], () => 0.3, { bluff: true }).rules).toEqual({ bluff: true });
  });
  it('nextRound keeps the rules', () => {
    const st = bluffSetup([['KH'], ['AS', '7C']]);
    let s = apply(st, 0, { type: 'play', cardIds: ['KH'] });
    s = apply(s, 1, { type: 'pass' });
    expect(s.phase).toBe('roundOver');
    const r2 = nextRound(s);
    expect(r2.rules).toEqual({ bluff: true });
    expect(r2.lastPlay).toBeNull();
  });
  it('old saved games without `rules` play by the normal rules', () => {
    const st = setup([['7C', 'KC'], ['AS']]);
    delete st.rules; delete st.lastPlay; delete st.aceSkip;
    expect(options(st, 0).legal).toEqual([]);
    expect(options(st, 0).canChallenge).toBe(false);
    expect(apply(st, 0, { type: 'play', cardIds: ['7C'] })).toBe(st);
  });
  it('options always expose canChallenge (false outside bluff mode)', () => {
    const st = setup([['10S', 'KC'], ['AS']]);
    const s = apply(st, 0, { type: 'play', cardIds: ['10S'] });
    expect(options(s, 1).canChallenge).toBe(false);
    expect(apply(s, 1, { type: 'challenge' })).toBe(s);
  });
});

// ---------------------------------------------------------------- bluff mode

describe('bluff mode', () => {
  it('every hand card is playable; multi-play must still be one rank', () => {
    const st = bluffSetup([['7C', 'KC', 'KD', 'AS'], ['AH']]);
    expect(ids(options(st, 0).legal)).toEqual(['7C', 'AS', 'KC', 'KD']);
    expect(validatePlay(st, 0, ['KC', 'KD'])).toBeNull();
    expect(validatePlay(st, 0, ['KC', 'AS'])).toBe('sameRank');
    expect(validatePlay(st, 0, ['7C'], true)).toBe('illegal');
  });
  it('only the next player may challenge, and only as the first action', () => {
    const st = bluffSetup([['KC', 'AD'], ['10D', '7D'], ['QC']]);
    let s = apply(st, 0, { type: 'play', cardIds: ['KC'] });
    expect(s.lastPlay?.wasLegal).toBe(false);
    expect(options(s, 1).canChallenge).toBe(true);
    expect(options(s, 2).canChallenge).toBe(false);
    expect(apply(s, 2, { type: 'challenge' })).toBe(s);
    s = apply(s, 1, { type: 'draw' });                 // first action without challenging
    expect(s.lastPlay).toBeNull();
    expect(options(s, 1).canChallenge).toBe(false);
    expect(apply(s, 1, { type: 'challenge' })).toBe(s);
  });
  it('bluff caught: cards back + 2, pile and effects reverted, challenger plays normally', () => {
    const st = bluffSetup([['8C', 'KD'], ['10D', '7D'], ['QC']], '10H', ['9S', '9C', '6H', '7H']);
    let s = apply(st, 0, { type: 'play', cardIds: ['8C'] });     // illegal 8 → +2 on player 1
    expect(s.pending).toEqual({ kind: 'eight', amount: 2 });
    expect(options(s, 1).canChallenge).toBe(true);
    s = apply(s, 1, { type: 'challenge' });
    expect(s.events).toContainEqual({ t: 'bluffCaught', p: 0, by: 1, cards: [C('8C')] });
    expect(ids(s.players[0].hand)).toEqual(ids([C('8C'), C('KD'), C('9S'), C('9C')]));
    expect(s.players[1].hand.length).toBe(2);
    expect(s.pile.map(c => c.id)).toEqual(['10H']);
    expect(s.activeSuit).toBe('H');
    expect(s.pending).toBeNull();
    expect(s.current).toBe(1);
    const o = options(s, 1);
    expect(o.canChallenge).toBe(false);
    expect(o.canDraw).toBe(true);
    expect(ids(o.legal)).toEqual(['10D', '7D']);
  });
  it('bluff wrong: the challenger draws 2 and loses the turn', () => {
    const st = bluffSetup([['10S', 'KD'], ['7C', '7D'], ['QC']], '10H', ['9S', '9C', '6H', '7H']);
    let s = apply(st, 0, { type: 'play', cardIds: ['10S'] });
    expect(s.lastPlay?.wasLegal).toBe(true);
    s = apply(s, 1, { type: 'challenge' });
    expect(s.events).toContainEqual({ t: 'bluffWrong', p: 1 });
    expect(s.players[1].hand.length).toBe(4);
    expect(s.current).toBe(2);
    expect(s.pile.map(c => c.id)).toEqual(['10H', '10S']);
  });
  it('wrong challenge of a legal 8: the penalty is taken as well', () => {
    const st = bluffSetup([['8H', 'KD'], ['7C', '7D'], ['QC']], '10H', ['9S', '9C', '6H', '7H', '6C']);
    let s = apply(st, 0, { type: 'play', cardIds: ['8H'] });
    s = apply(s, 1, { type: 'challenge' });
    expect(s.players[1].hand.length).toBe(6);
    expect(s.current).toBe(2);
    expect(s.pending).toBeNull();
  });
  it('unchallenged bluff stands with its normal effects', () => {
    const st = bluffSetup([['7C', 'KD'], ['10D', 'AD'], ['QC']], '10H', ['9S', '9C', '6H']);
    let s = apply(st, 0, { type: 'play', cardIds: ['7C'] });      // illegal 7 → next draws 1 and continues
    expect(options(s, 1).forcedDraw).toBe(true);
    s = apply(s, 1, { type: 'accept' });
    expect(s.lastPlay).toBeNull();
    expect(s.players[1].hand.length).toBe(3);
    expect(s.current).toBe(1);
    expect(s.activeSuit).toBe('C');
    expect(s.pile[s.pile.length - 1].id).toBe('7C');
    expect(apply(s, 1, { type: 'challenge' })).toBe(s);
  });
  it('bluff on the last card: the round waits for the challenge window', () => {
    const st = bluffSetup([['KC'], ['10D', 'AD'], ['QC']], '10H', ['9S', '9C', '6H']);
    const s = apply(st, 0, { type: 'play', cardIds: ['KC'] });
    expect(s.phase).toBe('play');
    expect(s.current).toBe(1);
    expect(s.lastPlay?.out).toBe(true);
    const o = options(s, 1);
    expect(o).toMatchObject({ canChallenge: true, canPass: true, canDraw: false, legal: [] });
    // caught → the round goes on
    const caught = apply(s, 1, { type: 'challenge' });
    expect(caught.phase).toBe('play');
    expect(ids(caught.players[0].hand)).toEqual(['9C', '9S', 'KC']);
    expect(caught.current).toBe(1);
    // let it stand → the round ends with player 0 as winner
    const stood = apply(s, 1, { type: 'pass' });
    expect(stood.phase).toBe('roundOver');
    expect(stood.lastResult?.winner).toBe(0);
    // nothing else is allowed meanwhile
    expect(apply(s, 1, { type: 'play', cardIds: ['10D'] })).toBe(s);
    expect(apply(s, 1, { type: 'draw' })).toBe(s);
  });
  it('legal last card + wrong challenge: challenger draws 2, the round ends', () => {
    const st = bluffSetup([['JC'], ['10D', 'AD'], ['QC']], '10H', ['9S', '9C', '6H']);
    let s = apply(st, 0, { type: 'play', cardIds: ['JC'] });
    expect(s.phase).toBe('play');
    s = apply(s, 1, { type: 'challenge' });
    expect(s.phase).toBe('roundOver');
    expect(s.lastResult?.mult).toBe(2);
    expect(s.lastResult?.rows[1].handPoints).toBe(25);   // 10D + AD (+ 9S, 9C worth 0)
  });
  it('a final 8 still hands its penalty to the next player when the play stands', () => {
    const st = bluffSetup([['8H'], ['10D'], ['QC']], '10H', ['9S', '9C', '6H']);
    let s = apply(st, 0, { type: 'play', cardIds: ['8H'] });
    expect(s.pending).toEqual({ kind: 'eight', amount: 2 });
    expect(options(s, 1).canPass).toBe(true);
    s = apply(s, 1, { type: 'pass' });
    expect(s.phase).toBe('roundOver');
    expect(s.players[1].hand.length).toBe(3);
  });
  it('ace in bluff mode: the skipped player may challenge, otherwise passes', () => {
    const st = bluffSetup([['AS', 'KD'], ['10D', '7D'], ['QC']], '10H', ['9S', '9C', '6H']);
    const s = apply(st, 0, { type: 'play', cardIds: ['AS'] });
    expect(s.current).toBe(1);
    expect(s.aceSkip).toBe(1);
    expect(options(s, 1)).toMatchObject({ canChallenge: true, canPass: true, canDraw: false, canAccept: false, legal: [] });
    const passed = apply(s, 1, { type: 'pass' });
    expect(passed.current).toBe(2);
    expect(passed.aceSkip).toBe(0);
    const caught = apply(s, 1, { type: 'challenge' });
    expect(caught.current).toBe(1);
    expect(caught.aceSkip).toBe(0);
    expect(options(caught, 1).canDraw).toBe(true);
  });
  it('legal ace, unchallenged, skips exactly like normal mode (2 players → back to the ace player)', () => {
    const st = bluffSetup([['AH', 'KD'], ['10D', '7D']], '10H', ['9S', '9C', '6H']);
    let s = apply(st, 0, { type: 'play', cardIds: ['AH'] });
    s = apply(s, 1, { type: 'pass' });
    expect(s.current).toBe(0);
  });
  it('a 6 and its cover count as one play: a caught bluff reverts both', () => {
    const st = bluffSetup([['6C', '10C', 'KD'], ['10D', '7D'], ['QC']], '10H', ['9S', '9C', '6H']);
    let s = apply(st, 0, { type: 'play', cardIds: ['6C'] });      // illegal 6
    expect(s.current).toBe(0);
    expect(options(s, 1).canChallenge).toBe(false);               // not until the turn is over
    s = apply(s, 0, { type: 'play', cardIds: ['10C'] });           // (legal) cover
    expect(s.current).toBe(1);
    expect(s.lastPlay?.cards.map(c => c.id)).toEqual(['6C', '10C']);
    expect(s.lastPlay?.wasLegal).toBe(false);
    s = apply(s, 1, { type: 'challenge' });
    expect(s.pile.map(c => c.id)).toEqual(['10H']);
    expect(ids(s.players[0].hand)).toEqual(['10C', '6C', '9C', '9S', 'KD']);
    expect(s.mustCover).toBe(false);
  });
  it('jack with a suit choice can be challenged after the suit is picked', () => {
    const st = bluffSetup([['JC', 'KD'], ['10D', '7D']], '10H', ['9S', '9C', '6H']);
    let s = apply(st, 0, { type: 'play', cardIds: ['JC'] });
    expect(s.phase).toBe('chooseSuit');
    s = apply(s, 0, { type: 'suit', suit: 'D' });
    expect(options(s, 1).canChallenge).toBe(true);
    s = apply(s, 1, { type: 'challenge' });                          // jacks are always legal
    expect(s.events).toContainEqual({ t: 'bluffWrong', p: 1 });
    expect(s.current).toBe(0);
    expect(s.activeSuit).toBe('D');
  });
  it('a caught four-kings bluff restores everyone\'s score', () => {
    const st = bluffSetup([['KS', 'KD', 'KC', 'KH', 'AC'], ['10D', '7D']], '9H', ['9S', '9C', '6H']);
    st.players[0].score = 80; st.players[1].score = 40;
    let s = apply(st, 0, { type: 'play', cardIds: ['KS', 'KD', 'KC', 'KH'] });   // KS on 9H: illegal
    expect(s.events).toContainEqual({ t: 'kings' });
    expect(s.players.map(p => p.score)).toEqual([0, 0]);
    expect(s.lastPlay?.wasLegal).toBe(false);
    s = apply(s, 1, { type: 'challenge' });
    expect(s.players.map(p => p.score)).toEqual([80, 40]);
    expect(s.pile.map(c => c.id)).toEqual(['9H']);
    expect(s.players[0].hand.length).toBe(7);
  });
  it('the pile never ends up empty after a revert (reshuffle mid-play)', () => {
    // player 0 bluffs a 6 as their last card, must draw to cover, the deck is empty → reshuffle
    const st = bluffSetup([['6C'], ['10D', '7D']], '10H', []);
    st.pile = [C('9H'), C('10H')];
    let s = apply(st, 0, { type: 'play', cardIds: ['6C'] });
    expect(options(s, 0).canDraw).toBe(true);
    s = apply(s, 0, { type: 'draw' });
    expect(s.players[0].hand.length).toBe(1);
    s = apply(s, 0, { type: 'play', cardIds: [s.players[0].hand[0].id] });
    s = apply(s, 1, { type: 'challenge' });
    expect(s.pile.length).toBeGreaterThan(0);
    const all = [...s.pile, ...s.deck, ...s.players.flatMap(p => p.hand)].map(c => c.id);
    expect(new Set(all).size).toBe(all.length);                       // no duplicated cards
  });
  it('mustCover in bluff mode: may draw only without a real cover', () => {
    const st = bluffSetup([['6C', 'KD', '7H'], ['10D']], '10C', ['9S', '9C']);
    let s = apply(st, 0, { type: 'play', cardIds: ['6C'] });
    expect(ids(options(s, 0).legal)).toEqual(['7H', 'KD']);           // any card may "cover"…
    expect(options(s, 0).canDraw).toBe(true);                         // …but no real cover → drawing is allowed
    s = apply(s, 0, { type: 'draw' });
    expect(s.players[0].hand.map(c => c.id)).toContain('9S');
    expect(options(s, 0).canDraw).toBe(false);                        // 9S is a real cover now
  });
});

// ---------------------------------------------------------------- bots

describe('bots', () => {
  it('bot-only games always terminate (original easy/normal mix)', () => {
    seeded(1, () => {
      for (let g = 0; g < 100; g++) {
        const s = playOut((['easy', 'normal', 'easy', 'normal'] as BotLevel[]).slice(0, 2 + (g % 3)).map((l, i) => (g % 2 ? l : i % 2 ? 'easy' : 'normal')), false, 20000);
        expect(s.phase).toBe('gameOver');
      }
    });
  }, 120_000);

  it('300 games across every level mix, with and without bluff, all terminate with valid moves', () => {
    seeded(7, () => {
      const rng = mulberry32(99);
      for (let g = 0; g < 300; g++) {
        const n = 2 + (g % 3);
        const levels = Array.from({ length: n }, () => BOT_LEVELS[Math.floor(rng() * BOT_LEVELS.length)]);
        const s = playOut(levels, g % 2 === 1);
        expect(s.phase).toBe('gameOver');
        expect(s.winners.length).toBeGreaterThan(0);
        const all = [...s.pile, ...s.deck, ...s.players.flatMap(p => p.hand)].map(c => c.id);
        expect(new Set(all).size).toBe(36);
        expect(all.length).toBe(36);
      }
    });
  }, 120_000);

  it('every level returns an accepted action from many mid-game states (incl. challenge windows)', () => {
    seeded(3, () => {
      let checked = 0;
      for (let g = 0; g < 40; g++) {
        const levels: BotLevel[] = ['easy', 'normal', 'hard', 'expert'].slice(0, 2 + (g % 3)) as BotLevel[];
        let s = newGame(levels.map((l, i) => ({ name: l + i, bot: true })), { bluff: g % 2 === 0 });
        for (let step = 0; step < 400 && s.phase !== 'gameOver'; step++) {
          if (s.phase === 'roundOver') { s = nextRound(s); continue; }
          for (const lvl of BOT_LEVELS) {
            const a = botAction(s, s.current, lvl);
            expect(apply(s, s.current, a)).not.toBe(s);
            checked++;
          }
          s = apply(s, s.current, botAction(s, s.current, levels[s.current]));
        }
      }
      expect(checked).toBeGreaterThan(1000);
    });
  }, 120_000);

  it('bots only use visible information', () => {
    seeded(5, () => {
      for (let g = 0; g < 60; g++) {
        let s = newGame([{ name: 'a', bot: true }, { name: 'b', bot: true }, { name: 'c', bot: true }], { bluff: g % 2 === 0 });
        for (let step = 0; step < 30 && s.phase === 'play'; step++) s = apply(s, s.current, botAction(s, s.current, 'normal'));
        if (s.phase !== 'play' && s.phase !== 'chooseSuit') continue;
        const p = s.current;
        // swap the other players' hands with the deck: same sizes, completely different contents
        const alt: GameState = structuredClone(s);
        const pool = shuffle([...alt.deck, ...alt.players.filter((_, i) => i !== p).flatMap(pl => pl.hand)], mulberry32(g));
        alt.players.forEach((pl, i) => { if (i !== p) pl.hand = pool.splice(0, pl.hand.length); });
        alt.deck = pool;
        for (const lvl of BOT_LEVELS) {
          const seed = 1000 + g;
          const a1 = seeded(seed, () => botAction(s, p, lvl));
          const a2 = seeded(seed, () => botAction(alt, p, lvl));
          expect(a2).toEqual(a1);
        }
        // and the masked view really hides everything
        const v = botView(s, p);
        expect(v.players.every((pl, i) => i === p || pl.hand.every(c => c.id.startsWith('h')))).toBe(true);
        expect(v.deck.every(c => c.id.startsWith('d'))).toBe(true);
      }
    });
  });

  it('bots challenge illegal plays and pass on legal ones at hard/expert', () => {
    const illegal = apply(bluffSetup([['KC', 'AD'], ['10D', '7D']]), 0, { type: 'play', cardIds: ['KC'] });
    const legal = apply(bluffSetup([['10C', 'AD'], ['10D', '7D']]), 0, { type: 'play', cardIds: ['10C'] });
    seeded(11, () => {
      expect(botAction(illegal, 1, 'expert')).toEqual({ type: 'challenge' });
      for (let i = 0; i < 50; i++) {
        expect(botAction(legal, 1, 'expert').type).not.toBe('challenge');
        expect(botAction(legal, 1, 'hard').type).not.toBe('challenge');
      }
    });
  });

  it('expert bots go out with jacks for the multiplier', () => {
    const st = setup([['JC', 'JD'], ['AS', 'KS', '10S']], '7H');
    const a = botAction(st, 0, 'expert');
    expect(a.type).toBe('play');
    expect(a.type === 'play' && a.cardIds.length).toBe(2);
  });

  it('expert clearly beats easy heads-up (200 games, seeded)', () => {
    const wins = seeded(2024, () => {
      let w = 0;
      for (let g = 0; g < 200; g++) {
        const levels: BotLevel[] = g % 2 ? ['expert', 'easy'] : ['easy', 'expert'];
        const s = playOut(levels, g % 4 >= 2);
        if (s.winners.includes(g % 2 ? 0 : 1)) w++;
      }
      return w;
    });
    expect(wins / 200).toBeGreaterThan(0.7);
  }, 120_000);
});
