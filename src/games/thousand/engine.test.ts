import { describe, expect, it } from 'vitest';
import {
  type Action, type TCard, type TState, DEFAULT_RULES, FORCED_BID, MARRIAGE, apply, beats, bidOptions, canDeclare, card, cardPoints,
  contractOptions, firstHand, gameDetails, legalCards, makeRng, marriagesIn, newDeck, newGame, round5, scoreDeal, sortHand, sumPoints, takenBy,
  trickWinnerIndex, validate,
} from './engine';
import { LEVELS, botAction, chooseGive, estimate, type TLevel } from './bot';

const cs = (ids: string) => ids.split(' ').map(card);
const players = [{ name: 'A', bot: false }, { name: 'B', bot: true }, { name: 'C', bot: true }];
const act = (s: TState, p: number, a: Action) => { expect(validate(s, p, a)).toBeNull(); return apply(s, p, a); };

/** Dealer 2: seat 0 opens with the forced 100. Hands of 7 + a talon of 3. */
function rig(hands: string[], talon: string, rules = {}): TState {
  const s = newGame({ players, seed: 11, dealer: 2, rules });
  return { ...s, hands: hands.map(cs), talon: cs(talon) };
}
/** A deal in the play phase: declarer 0 with the given 8-card hands and contract. */
function playing(hands: string[], contract = 100, extra: Partial<TState> = {}): TState {
  const s = newGame({ players, seed: 3, dealer: 2 });
  return { ...s, phase: 'play', hands: hands.map(cs), talon: [], declarer: 0, contract, high: contract, turn: 0, leader: 0, ...extra };
}

describe('deck', () => {
  it('24 unique cards, 120 points', () => {
    const d = newDeck();
    expect(d).toHaveLength(24);
    expect(new Set(d.map(c => c.id)).size).toBe(24);
    expect(sumPoints(d)).toBe(120);
    expect(['A', '10', 'K', 'Q', 'J', '9'].map(r => cardPoints(card(r + 'H')))).toEqual([11, 10, 4, 3, 2, 0]);
  });
  it('marriages are worth ♥100 ♦80 ♣60 ♠40', () => {
    expect(MARRIAGE).toEqual({ H: 100, D: 80, C: 60, S: 40 });
    expect(marriagesIn(cs('KH QH KS AS QD 9C'))).toEqual(['H']);
    expect(marriagesIn(cs('KS QS KC QC'))).toEqual(['C', 'S']);
  });
  it('rounds opponent points to 5', () => {
    expect([0, 2, 3, 7, 8, 12, 13, 47, 48, 120].map(round5)).toEqual([0, 0, 5, 5, 10, 10, 15, 45, 50, 120]);
  });
  it('sorts by suit then rank, trump first', () => {
    expect(sortHand(cs('9C AH 10S QH')).map(c => c.id)).toEqual(['AH', 'QH', '10S', '9C']);
    expect(sortHand(cs('9C AH 10S QH'), 'C').map(c => c.id)).toEqual(['9C', 'AH', 'QH', '10S']);
  });
});

describe('deal', () => {
  it('7 + 7 + 7 and a talon of 3; first hand opens with 100', () => {
    const g = newGame({ players, seed: 99 });
    expect(g.hands.map(h => h.length)).toEqual([7, 7, 7]);
    expect(g.talon).toHaveLength(3);
    const all = [...g.hands.flat(), ...g.talon].map(c => c.id);
    expect(new Set(all).size).toBe(24);
    expect(g.bids).toEqual([{ p: firstHand(g), bid: FORCED_BID, forced: true }]);
    expect(g.turn).toBe((firstHand(g) + 1) % 3);
  });
  it('the dealer moves left every deal', () => {
    let g = newGame({ players, seed: 5, dealer: 1 });
    expect(g.dealer).toBe(1);
    g = { ...g, phase: 'dealOver' };
    g = apply(g, 0, { type: 'next' });
    expect(g.dealer).toBe(2);
    expect(g.dealNo).toBe(2);
  });
});

describe('trick winner', () => {
  const t = (...ids: string[]) => ids.map((id, p) => ({ p, c: card(id) }));
  it('highest of the led suit without trump', () => {
    expect(trickWinnerIndex(t('KC', 'AC', '10C'), null)).toBe(1);
    expect(trickWinnerIndex(t('10C', 'AC', '9C'), null)).toBe(1);
    expect(trickWinnerIndex(t('9H', 'AS', 'JH'), null)).toBe(2); // off-suit ace never wins
    expect(trickWinnerIndex(t('10H', 'KH', 'QH'), null)).toBe(0); // 10 beats K
  });
  it('trump beats everything else', () => {
    expect(trickWinnerIndex(t('AH', '9S', '10H'), 'S')).toBe(1);
    expect(trickWinnerIndex(t('AH', '9S', 'JS'), 'S')).toBe(2);
    expect(beats(card('9D'), card('AC'), 'C', 'D')).toBe(true);
    expect(beats(card('AC'), card('9D'), 'C', 'D')).toBe(false);
  });
});

describe('legality', () => {
  const g = playing(['AH 9H KS QS 10D 9D JC 9C', 'KH JH AS 10S AD KD QD JD', '10H QH 9S JS AC 10C KC QC'], 100, { tricks: [], trump: null });
  it('the leader plays anything', () => {
    expect(legalCards(g, 0)).toHaveLength(8);
    expect(legalCards(g, 1)).toHaveLength(0);
  });
  it('must follow suit', () => {
    const h = act(g, 0, { type: 'play', id: 'AH' });
    expect(legalCards(h, 1).map(c => c.id).sort()).toEqual(['JH', 'KH']);
    expect(validate(h, 1, { type: 'play', id: 'AS' })).toBe('must follow suit');
  });
  it('without the suit, must trump; without trump, anything', () => {
    // seat 2 is void in diamonds; trump ♣
    const h = act({ ...g, trump: 'C' }, 0, { type: 'play', id: '10D' });
    const h2 = act(h, 1, { type: 'play', id: 'AD' });
    expect(legalCards(h2, 2).map(c => c.id).sort()).toEqual(['10C', 'AC', 'KC', 'QC']);
    expect(validate(h2, 2, { type: 'play', id: '9S' })).toBe('must trump');
    // no trump yet: anything
    const n = act(act(g, 0, { type: 'play', id: '10D' }), 1, { type: 'play', id: 'AD' });
    expect(legalCards(n, 2)).toHaveLength(8);
  });
});

describe('marriages', () => {
  const base = playing(['KS QS AH 9H 10D 9D JC 9C', 'KH JH AS 10S AD KD QD JD', '10H QH 9S JS AC 10C KC QC']);
  it('not on the first trick', () => {
    expect(canDeclare(base, 0, card('KS'))).toBe(false);
    expect(validate(base, 0, { type: 'play', id: 'KS', marriage: true })).toBe('no marriage');
  });
  it('on lead after a trick: K or Q with its pair; scores and sets trump', () => {
    let g = act(base, 0, { type: 'play', id: 'AH' });
    g = act(g, 1, { type: 'play', id: 'JH' });
    g = act(g, 2, { type: 'play', id: 'QH' });
    expect(g.turn).toBe(0);
    expect(canDeclare(g, 0, card('QS'))).toBe(true);
    expect(canDeclare(g, 0, card('9H'))).toBe(false);
    expect(canDeclare(g, 1, card('KD'))).toBe(false); // not on lead
    g = act(g, 0, { type: 'play', id: 'QS', marriage: true });
    expect(g.trump).toBe('S');
    expect(g.marriages).toEqual([{ p: 0, s: 'S' }]);
    expect(takenBy(g).mar).toEqual([40, 0, 0]);
    // seat 1 must follow spades
    expect(legalCards(g, 1).map(c => c.id).sort()).toEqual(['10S', 'AS']);
  });
  it('a later marriage changes the trump', () => {
    let g = act(base, 0, { type: 'play', id: 'AH' });
    g = act(g, 1, { type: 'play', id: 'KH' });
    g = act(g, 2, { type: 'play', id: '10H' });
    g = act(g, 0, { type: 'play', id: 'KS', marriage: true });
    g = act(g, 1, { type: 'play', id: 'AS' });
    g = act(g, 2, { type: 'play', id: '9S' });
    expect(g.turn).toBe(1);
    g = act(g, 1, { type: 'play', id: 'QD', marriage: true });
    expect(g.trump).toBe('D');
    expect(takenBy(g).mar).toEqual([40, 80, 0]);
  });
});

describe('bidding', () => {
  it('first hand is forced to 100; others raise by 5 or pass', () => {
    const g = rig(['KH QH AH 10H AS 10S AD', 'KS QS 9H JH 9S JS 9D', 'KC QC AC 10C 9C JC KD'], 'QD JD 10D');
    expect(g.high).toBe(100);
    expect(g.turn).toBe(1);
    expect(bidOptions(g, 1)[0]).toBe(105);
    expect(validate(g, 1, { type: 'bid', amount: 100 })).toBe('bid not allowed');
    expect(validate(g, 1, { type: 'bid', amount: 107 })).toBe('bid not allowed');
    let h = act(g, 1, { type: 'bid', amount: 110 });
    expect(h.turn).toBe(2);
    h = act(h, 2, { type: 'bid', amount: 0 });
    expect(h.turn).toBe(0);
    h = act(h, 0, { type: 'bid', amount: 115 });
    expect(h.turn).toBe(1); // seat 2 passed for good
    h = act(h, 1, { type: 'bid', amount: 0 });
    expect(h.phase).toBe('give');
    expect(h.declarer).toBe(0);
    expect(h.high).toBe(115);
    expect(h.hands[0]).toHaveLength(10);
    expect(h.talonShown.map(c => c.id)).toEqual(['QD', 'JD', '10D']);
  });
  it('everyone passes → the opener plays 100', () => {
    let g = rig(['KH QH AH 10H AS 10S AD', 'KS QS 9H JH 9S JS 9D', 'KC QC AC 10C 9C JC KD'], 'QD JD 10D');
    g = act(g, 1, { type: 'bid', amount: 0 });
    g = act(g, 2, { type: 'bid', amount: 0 });
    expect(g.declarer).toBe(0);
    expect(g.high).toBe(100);
  });
  it('above 120 only with a marriage in hand', () => {
    const g = rig(['KH QH AH 10H AS 10S AD', '9S JS 9H JH AC 10C 9D', 'KC JD KS 10D 9C JC KD'], 'QS QD QC');
    expect(Math.max(...bidOptions(g, 1))).toBe(120);
    const free = { ...g, rules: { ...DEFAULT_RULES, marriageToBid: false } };
    expect(Math.max(...bidOptions(free, 1))).toBe(300);
    const h = act(g, 1, { type: 'bid', amount: 120 });
    expect(bidOptions(h, 2)).toEqual([]); // no marriage, nothing above 120
    expect(validate(h, 2, { type: 'bid', amount: 0 })).toBeNull();
  });
  it('step 10 from 200 (optional)', () => {
    const g = rig(['KH QH AH 10H AS 10S AD', 'KS QS 9H JH 9S JS 9D', 'KC QC AC 10C 9C JC KD'], 'QD JD 10D', { step10: true });
    const o = bidOptions(g, 1);
    expect(o.slice(0, 3)).toEqual([105, 110, 115]);
    expect(o.filter(v => v >= 190).slice(0, 4)).toEqual([190, 195, 200, 210]);
  });
});

describe('talon, gifts and the contract', () => {
  const won = () => {
    let g = rig(['KH QH AH 10H AS 10S AD', 'KS QS 9H JH 9S JS 9D', 'KC QC AC 10C 9C JC KD'], 'QD JD 10D');
    g = act(g, 1, { type: 'bid', amount: 0 });
    return act(g, 2, { type: 'bid', amount: 0 });
  };
  it('the declarer gives one card to each opponent', () => {
    const g = won();
    expect(validate(g, 0, { type: 'give', ids: ['9S'] })).toBe('give exactly 2 cards');
    expect(validate(g, 0, { type: 'give', ids: ['QD', '9S'] })).toBe('card not in hand');
    const h = act(g, 0, { type: 'give', ids: ['QD', 'JD'] });
    expect(h.hands.map(x => x.length)).toEqual([8, 8, 8]);
    expect(h.hands[1].some(c => c.id === 'QD')).toBe(true);
    expect(h.hands[2].some(c => c.id === 'JD')).toBe(true);
    expect(h.phase).toBe('contract');
  });
  it('the contract may only go up (and above 120 needs a marriage)', () => {
    const h = act(won(), 0, { type: 'give', ids: ['QD', 'JD'] });
    expect(contractOptions(h, 0)[0]).toBe(100);
    expect(validate(h, 0, { type: 'contract', amount: 95 })).toBe('contract not allowed');
    expect(Math.max(...contractOptions(h, 0))).toBe(300); // holds K♥ Q♥
    const p = act(h, 0, { type: 'contract', amount: 140 });
    expect(p.phase).toBe('play');
    expect(p.contract).toBe(140);
    expect(p.turn).toBe(0);
  });
});

describe('scoring', () => {
  const R = DEFAULT_RULES;
  const sd = (o: Partial<Parameters<typeof scoreDeal>[0]>) => scoreDeal({
    rules: R, scores: [0, 0, 0], barrel: [null, null, null], bolts: [0, 0, 0], declarer: 0, contract: 100, pts: [100, 12, 8], tricks: [5, 2, 1], ...o,
  });
  it('declarer +bid / −bid; opponents rounded to 5', () => {
    expect(sd({}).delta).toEqual([100, 10, 10]);
    expect(sd({ pts: [99, 13, 8] }).delta).toEqual([-100, 15, 10]);
    expect(sd({ contract: 120, pts: [150, 0, 30], tricks: [6, 0, 2] }).delta[0]).toBe(120);
  });
  it('bolt: an opponent without a trick; the third costs 120', () => {
    const a = sd({ pts: [120, 0, 0], tricks: [8, 0, 0] });
    expect(a.bolts).toEqual([0, 1, 1]);
    expect(a.notes.filter(n => n.k === 'bolt')).toHaveLength(2);
    const b = sd({ pts: [120, 0, 0], tricks: [8, 0, 0], bolts: [0, 2, 0], scores: [0, 300, 0] });
    expect(b.scores[1]).toBe(180);
    expect(b.bolts[1]).toBe(0);
    expect(b.notes.some(n => n.p === 1 && n.k === 'bolt3')).toBe(true);
    // a marriage (no tricks) is not a bolt
    expect(sd({ pts: [100, 40, 0], tricks: [8, 0, 0] }).bolts).toEqual([0, 0, 1]);
    // bolts can be switched off
    expect(sd({ rules: { ...R, bolts: false }, pts: [120, 0, 0], tricks: [8, 0, 0] }).bolts).toEqual([0, 0, 0]);
  });
  it('barrel: 880+ sits at 880; opponent points stop counting', () => {
    const a = sd({ scores: [700, 850, 0], pts: [80, 40, 0], tricks: [4, 3, 1] }); // decl fails 100, seat 1 → 890 → 880
    expect(a.scores[1]).toBe(880);
    expect(a.barrel[1]).toBe(0);
    const b = sd({ scores: [0, 880, 0], barrel: [null, 0, null], pts: [100, 20, 0], tricks: [5, 2, 1] });
    expect(b.scores[1]).toBe(880);
    expect(b.barrel[1]).toBe(1);
  });
  it('barrel: three deals without 1000 → −120', () => {
    const a = sd({ scores: [0, 880, 0], barrel: [null, 2, null], pts: [100, 20, 0], tricks: [5, 2, 1] });
    expect(a.scores[1]).toBe(760);
    expect(a.barrel[1]).toBeNull();
    expect(a.notes.some(n => n.k === 'barrelFail')).toBe(true);
  });
  it('barrel: the declarer making 120+ reaches 1000 and wins; failing drops', () => {
    const w = sd({ scores: [880, 0, 0], barrel: [0, null, null], contract: 120, pts: [125, 0, 0], tricks: [7, 1, 0] });
    expect(w.winner).toBe(0);
    expect(w.scores[0]).toBe(1000);
    const small = sd({ scores: [880, 0, 0], barrel: [0, null, null], contract: 100, pts: [110, 10, 0], tricks: [6, 1, 1] });
    expect(small.winner).toBe(-1);
    expect(small.scores[0]).toBe(880);
    expect(small.barrel[0]).toBe(1);
    const fail = sd({ scores: [880, 0, 0], barrel: [0, null, null], contract: 140, pts: [100, 10, 10], tricks: [6, 1, 1] });
    expect(fail.scores[0]).toBe(740);
    expect(fail.barrel[0]).toBeNull();
  });
  it('barrel: a newcomer knocks the sitter off', () => {
    const a = sd({ scores: [800, 880, 0], barrel: [null, 1, null], contract: 100, pts: [100, 20, 0], tricks: [5, 3, 0] });
    expect(a.scores[0]).toBe(880);
    expect(a.barrel[0]).toBe(0);
    expect(a.scores[1]).toBe(760);
    expect(a.barrel[1]).toBeNull();
    expect(a.notes.some(n => n.p === 1 && n.k === 'barrelPush')).toBe(true);
  });
  it('jumping straight past 1000 as the declarer wins; an opponent cannot', () => {
    expect(sd({ scores: [850, 0, 0], contract: 160 }).winner).toBe(-1); // contract failed (100 < 160)
    const w = sd({ scores: [850, 0, 0], contract: 160, pts: [170, 0, 0], tricks: [8, 0, 0] });
    expect(w.winner).toBe(0);
    const o = sd({ scores: [0, 990, 0], pts: [100, 20, 0] });
    expect(o.scores[1]).toBe(880);
    expect(o.winner).toBe(-1);
  });
  it('without the barrel anybody reaching 1000 wins', () => {
    const o = sd({ rules: { ...R, barrel: false }, scores: [0, 990, 0], pts: [100, 20, 0] });
    expect(o.scores[1]).toBe(1010);
    expect(o.winner).toBe(1);
  });
  it('samosval: exactly 555 → 0 (optional)', () => {
    expect(sd({ scores: [455, 0, 0] }).scores[0]).toBe(555);
    const a = sd({ rules: { ...R, samosval: true }, scores: [455, 0, 0] });
    expect(a.scores[0]).toBe(0);
    expect(a.notes.some(n => n.k === 'samosval')).toBe(true);
  });
});

describe('a whole deal', () => {
  it('scores into the sheet; card points always add to 120', () => {
    let g = newGame({ players, seed: 2024 });
    const rnd = makeRng(1);
    while (g.phase !== 'dealOver' && g.phase !== 'gameOver') {
      const a = botAction(g, g.turn, 'hard', rnd)!;
      g = act(g, g.turn, a);
    }
    expect(g.sheet).toHaveLength(1);
    expect(g.result!.cardPts.reduce((a, b) => a + b, 0)).toBe(120);
    expect(g.tricks).toHaveLength(8);
    expect(g.hands.every(h => h.length === 0)).toBe(true);
    const d = gameDetails(g);
    expect(d.deals).toBe(1);
    expect(d.declared).toBe(g.result!.declarer === 0 ? 1 : 0);
  });
});

describe('bots', () => {
  it('value marriages and aces', () => {
    expect(estimate(cs('KH QH AS 10S AD 9C JC'))).toBeGreaterThan(estimate(cs('9H JH 9S JS 9D JD 9C')) + 100);
  });
  it('never give away a marriage card', () => {
    const g: TState = { ...newGame({ players, seed: 4, dealer: 2 }), phase: 'give', declarer: 0, turn: 0,
      hands: [cs('KH QH AH 10H AS 9S 9D JD 9C JC'), cs('KS QS 10S JS KD QD 10D'), cs('AD AC 10C KC QC JH 9H')] };
    const ids = chooseGive(g, 0, 'hard', makeRng(2));
    expect(ids.some(id => id === 'KH' || id === 'QH')).toBe(false);
  });

  const runGame = (seed: number, levels: TLevel[], rules = {}) => {
    const rnd = makeRng(seed * 7 + 1);
    let g = newGame({ players: [{ name: 'a', bot: true }, { name: 'b', bot: true }, { name: 'c', bot: true }], seed, rules });
    let moves = 0;
    while (g.phase !== 'gameOver' && g.dealNo < 250) {
      if (g.phase === 'dealOver') { g = apply(g, 0, { type: 'next' }); continue; }
      const p = g.turn;
      const a = botAction(g, p, levels[p], rnd);
      if (!a) throw new Error(`no action in ${g.phase}`);
      const err = validate(g, p, a);
      if (err) throw new Error(`illegal ${JSON.stringify(a)} by ${p} in ${g.phase}: ${err}`);
      const n = apply(g, p, a);
      // invariants
      const cards = [...n.hands.flat(), ...n.talon, ...n.trick.map(t => t.c), ...n.tricks.flatMap(t => t.plays.map(x => x.c))];
      if (n.phase !== 'dealOver' && n.phase !== 'gameOver' && new Set(cards.map((c: TCard) => c.id)).size !== 24) throw new Error('lost a card');
      g = n; moves++;
    }
    return { g, moves };
  };

  it('play thousands of deals without an illegal move, games end at 1000', () => {
    let games = 0, deals = 0, finished = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const lv = [LEVELS[seed % 3], LEVELS[(seed + 1) % 3], LEVELS[(seed + 2) % 3]];
      const rules = seed % 4 === 0 ? { step10: true, samosval: true } : seed % 5 === 0 ? { barrel: false, bolts: false, marriageToBid: false } : {};
      const { g } = runGame(seed, lv, rules);
      games++; deals += g.dealNo;
      if (g.phase === 'gameOver') {
        finished++;
        expect(g.winner).toBeGreaterThanOrEqual(0);
        expect(g.scores[g.winner]).toBeGreaterThanOrEqual(1000);
      }
      // the sheet's totals follow the deltas
      let tot = [0, 0, 0];
      for (const r of g.sheet) { tot = tot.map((v, i) => v + r.delta[i]); expect(r.totals).toEqual(tot); }
    }
    expect(games).toBe(120);
    expect(deals).toBeGreaterThan(2000);
    expect(finished).toBeGreaterThan(100);
  }, 120_000);

  it('hard bots beat easy bots over many games', () => {
    let hardWins = 0, easyWins = 0;
    for (let seed = 500; seed < 560; seed++) {
      const hardSeat = seed % 3;
      const lv: TLevel[] = [0, 1, 2].map(p => (p === hardSeat ? 'hard' : 'easy'));
      const { g } = runGame(seed, lv);
      if (g.winner === hardSeat) hardWins++; else if (g.winner >= 0) easyWins++;
    }
    expect(hardWins).toBeGreaterThan(easyWins / 2); // one hard vs two easy: a fair share is 1/3
  }, 120_000);
});
