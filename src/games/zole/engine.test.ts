import { describe, expect, it } from 'vitest';
import {
  type Action, type ZCard, type ZState, DEFAULT_RULES, SCORE, TRUMP_ORDER, apply, beats, cardPoints, contractDelta, firstHand,
  followSuit, galdinsResult, isTrump, legalBids, legalCards, makeRng, newDeck, newSession, outcomeOf, sortHand, sumPoints,
  trickWinnerIndex, validate,
} from './engine';
import { LEVELS, botAction, chooseBid, chooseDiscard, evaluate, viewFor, type ZLevel } from './bot';

const C = (id: string): ZCard => {
  const s = id.slice(-1) as ZCard['s'];
  return { id, r: id.slice(0, -1) as ZCard['r'], s };
};
const cs = (ids: string) => ids.split(' ').map(C);
const players = [{ name: 'A', bot: false }, { name: 'B', bot: true }, { name: 'C', bot: true }];

/** A session with dealer 2 (seat 0 bids and leads first) and the given hands / table. */
function rig(hands: string[], galds: string, rules = {}): ZState {
  const s = newSession({ players, seed: 7, dealer: 2, rules });
  return { ...s, hands: hands.map(cs), galds: cs(galds) };
}
/** Play the deal out: every seat plays its first legal card (or `pick`). */
function playOut(s: ZState, pick?: (s: ZState, p: number) => string): ZState {
  let g = s;
  for (let guard = 0; g.phase === 'play' && guard < 40; guard++) {
    const p = g.turn;
    const id = pick?.(g, p) ?? legalCards(g, p)[0].id;
    const n = apply(g, p, { type: 'play', id });
    expect(n).not.toBe(g);
    g = n;
  }
  return g;
}
const act = (s: ZState, p: number, a: Action) => { const n = apply(s, p, a); expect(validate(s, p, a)).toBeNull(); return n; };

describe('deck', () => {
  it('has 26 unique cards worth 120 points', () => {
    const d = newDeck();
    expect(d).toHaveLength(26);
    expect(new Set(d.map(c => c.id)).size).toBe(26);
    expect(sumPoints(d)).toBe(120);
    expect(d.filter(isTrump)).toHaveLength(14);
    for (const s of ['C', 'S', 'H']) expect(d.filter(c => !isTrump(c) && c.s === s).map(c => c.r)).toEqual(['A', '10', 'K', '9']);
    expect(d.some(c => c.id === '8D') && d.some(c => c.id === '7D')).toBe(true);
    expect(d.some(c => c.id === '8C' || c.id === '7H')).toBe(false);
  });
  it('card points', () => {
    expect(['A', '10', 'K', 'Q', 'J', '9', '8', '7'].map(r => cardPoints(C(r + 'D')))).toEqual([11, 10, 4, 3, 2, 0, 0, 0]);
  });
});

describe('trumps', () => {
  it('order is Q♣ Q♠ Q♥ Q♦ J♣ J♠ J♥ J♦ A♦ 10♦ K♦ 9♦ 8♦ 7♦', () => {
    expect(TRUMP_ORDER.map(c => c.id)).toEqual(['QC', 'QS', 'QH', 'QD', 'JC', 'JS', 'JH', 'JD', 'AD', '10D', 'KD', '9D', '8D', '7D']);
  });
  it('every higher trump beats every lower one, any trump beats any plain card', () => {
    for (let i = 0; i < 14; i++) for (let j = 0; j < 14; j++) {
      if (i !== j) expect(beats(TRUMP_ORDER[i], TRUMP_ORDER[j], 'T')).toBe(i < j);
    }
    for (const t of TRUMP_ORDER) for (const p of cs('AC 10S AH 9C')) {
      expect(beats(t, p, followSuit(p))).toBe(true);
      expect(beats(p, t, 'T')).toBe(false);
    }
  });
  it('queens and jacks of plain suits are trumps, not their suit', () => {
    expect(followSuit(C('QH'))).toBe('T');
    expect(followSuit(C('JC'))).toBe('T');
    expect(followSuit(C('KH'))).toBe('H');
    expect(followSuit(C('KD'))).toBe('T');
  });
  it('sorts a hand: trumps high → low, then ♣ ♠ ♥', () => {
    expect(sortHand(cs('9C AH 7D QS JD AC 10C KH')).map(c => c.id)).toEqual(['QS', 'JD', '7D', 'AC', '10C', '9C', 'AH', 'KH']);
  });
});

describe('trick winner', () => {
  const t = (...ids: string[]) => ids.map((id, p) => ({ p, c: C(id) }));
  it('highest card of the led suit wins without trumps', () => {
    expect(trickWinnerIndex(t('KC', 'AC', '10C'))).toBe(1);
    expect(trickWinnerIndex(t('10H', 'AS', '9H'))).toBe(0); // off-suit ace does not win
    expect(trickWinnerIndex(t('9S', 'KS', 'AH'))).toBe(1);
  });
  it('any trump beats the led plain suit; highest trump wins', () => {
    expect(trickWinnerIndex(t('AC', '7D', '10C'))).toBe(1);
    expect(trickWinnerIndex(t('AC', '7D', 'JH'))).toBe(2);
    expect(trickWinnerIndex(t('9D', 'QC', 'AD'))).toBe(1);
    expect(trickWinnerIndex(t('QH', 'QS', 'JC'))).toBe(1);
  });
});

describe('follow suit', () => {
  it('must follow the led suit; trumps are one suit', () => {
    let s = rig(['QC AC 10C KH 9S 7D AS JH', 'AD KC 9C 10H 9H 10S KS 8D', 'QS QH QD JC JS JD 10D KD'], 'AH 9D');
    s = act(s, 0, { type: 'bid', bid: 'zole' });
    s = act(s, 0, { type: 'play', id: 'AC' });
    expect(legalCards(s, 1).map(c => c.id).sort()).toEqual(['9C', 'KC']);
    expect(validate(s, 1, { type: 'play', id: 'AD' })).toBe('must follow suit');
    s = act(s, 1, { type: 'play', id: 'KC' });
    // seat 2 has no clubs → anything
    expect(legalCards(s, 2)).toHaveLength(8);
    s = act(s, 2, { type: 'play', id: 'QS' });
    expect(s.tricks[0].winner).toBe(2);
    // led trump (a queen of hearts is a trump, not a heart)
    s = act(s, 2, { type: 'play', id: 'QH' });
    expect(legalCards(s, 0).map(c => c.id).sort()).toEqual(['7D', 'JH', 'QC']);
    expect(validate(s, 0, { type: 'play', id: 'KH' })).toBe('must follow suit');
  });
  it('rejects playing out of turn and cards not in hand', () => {
    let s = rig(['QC AC 10C KH 9S 7D AS JH', 'AD KC 9C 10H 9H 10S KS 8D', 'QS QH QD JC JS JD 10D KD'], 'AH 9D');
    s = act(s, 0, { type: 'bid', bid: 'zole' });
    expect(apply(s, 1, { type: 'play', id: 'AD' })).toBe(s);
    expect(apply(s, 0, { type: 'play', id: 'AD' })).toBe(s);
  });
});

describe('bidding', () => {
  it('starts left of the dealer; take → discard 2 → first hand leads', () => {
    const s0 = newSession({ players, seed: 3, dealer: 1 });
    expect(s0.turn).toBe(2);
    expect(firstHand(s0)).toBe(2);
    expect(s0.hands.map(h => h.length)).toEqual([8, 8, 8]);
    expect(s0.galds).toHaveLength(2);
    expect(legalBids(s0, 2)).toEqual(['take', 'zole', 'maza', 'pass']);
    expect(legalBids(s0, 0)).toEqual([]);
    let s = act(s0, 2, { type: 'bid', bid: 'pass' });
    expect(s.turn).toBe(0);
    s = act(s, 0, { type: 'bid', bid: 'take' });
    expect(s.phase).toBe('discard');
    expect(s.hands[0]).toHaveLength(10);
    expect(s.galds).toHaveLength(0);
    expect(s.declarer).toBe(0);
    expect(s.contract).toBe('lielais');
    // seat 1 never bids: bidding ends with the first non-pass
    expect(validate(s, 1, { type: 'bid', bid: 'take' })).not.toBeNull();
    expect(validate(s, 0, { type: 'discard', ids: [s.hands[0][0].id] })).not.toBeNull();
    const ids = [s.hands[0][0].id, s.hands[0][1].id];
    s = act(s, 0, { type: 'discard', ids });
    expect(s.hands[0]).toHaveLength(8);
    expect(s.discards.map(c => c.id)).toEqual(ids);
    expect(s.phase).toBe('play');
    expect(s.turn).toBe(2); // first hand leads, not the declarer
  });
  it('without mazā zole the bid is not offered', () => {
    const s = newSession({ players, seed: 3, dealer: 1, rules: { mazaZole: false } });
    expect(legalBids(s, 2)).toEqual(['take', 'zole', 'pass']);
    expect(validate(s, 2, { type: 'bid', bid: 'maza' })).not.toBeNull();
  });
  it('all pass → galdiņš, everyone for themselves', () => {
    let s = newSession({ players, seed: 11, dealer: 2 });
    s = act(s, 0, { type: 'bid', bid: 'pass' });
    s = act(s, 1, { type: 'bid', bid: 'pass' });
    s = act(s, 2, { type: 'bid', bid: 'pass' });
    expect(s.contract).toBe('galdins');
    expect(s.declarer).toBe(-1);
    expect(s.phase).toBe('play');
    expect(s.turn).toBe(0);
    s = playOut(s);
    expect(s.phase).toBe('dealOver');
    const r = s.result!;
    expect(r.tricksBy.reduce((a, b) => a + b)).toBe(8);
    expect(r.ptsBy.reduce((a, b) => a + b)).toBe(120); // incl. the table cards
    expect(r.galdsTo).toBe(s.tricks[7].winner);
    const maxT = Math.max(...r.tricksBy);
    for (const l of r.losers) expect(r.tricksBy[l]).toBe(maxT);
    expect(r.delta.reduce((a, b) => a + b)).toBe(0);
  });
  it('all pass with pules → a common pule and a redeal', () => {
    let s = newSession({ players, seed: 11, dealer: 2, rules: { pules: true } });
    for (const p of [0, 1, 2]) s = act(s, p, { type: 'bid', bid: 'pass' });
    expect(s.phase).toBe('dealOver');
    expect(s.pules.common).toBe(1);
    expect(s.result!.contract).toBe('pule');
    expect(s.sheet.at(-1)!.delta).toEqual([0, 0, 0]);
    s = act(s, 0, { type: 'next' });
    expect(s.dealNo).toBe(2);
    expect(s.dealer).toBe(0);
    expect(s.turn).toBe(1);
  });
});

describe('scoring table', () => {
  it('outcome thresholds', () => {
    expect(outcomeOf(120, 8)).toBe('bezstikis');
    expect(outcomeOf(91, 6)).toBe('jani');
    expect(outcomeOf(90, 6)).toBe('win');
    expect(outcomeOf(61, 4)).toBe('win');
    expect(outcomeOf(60, 4)).toBe('lose');
    expect(outcomeOf(31, 2)).toBe('lose');
    expect(outcomeOf(30, 2)).toBe('loseJani');
    expect(outcomeOf(21, 0)).toBe('loseBezstikis'); // discards only, no trick
  });
  it('lielais', () => {
    const rows: [string, number][] = [['bezstikis', 6], ['jani', 4], ['win', 2], ['lose', -4], ['loseJani', -6], ['loseBezstikis', -8]];
    for (const [o, v] of rows) expect(contractDelta('lielais', o as never, 1)).toEqual([-v / 2, v, -v / 2]);
  });
  it('zole', () => {
    const rows: [string, number][] = [['bezstikis', 14], ['jani', 12], ['win', 10], ['lose', -12], ['loseJani', -14], ['loseBezstikis', -16]];
    for (const [o, v] of rows) expect(contractDelta('zole', o as never, 0)).toEqual([v, -v / 2, -v / 2]);
  });
  it('mazā zole', () => {
    expect(contractDelta('maza', 'win', 2)).toEqual([-6, -6, 12]);
    expect(contractDelta('maza', 'lose', 2)).toEqual([7, 7, -14]);
  });
  it('galdiņš: most tricks loses, then most points; full tie → two losers', () => {
    expect(galdinsResult([4, 2, 2], [50, 40, 30])).toEqual({ losers: [0], delta: [-4, 2, 2] });
    expect(galdinsResult([3, 3, 2], [40, 50, 30])).toEqual({ losers: [1], delta: [2, -4, 2] });
    expect(galdinsResult([3, 3, 2], [45, 45, 30])).toEqual({ losers: [0, 1], delta: [-2, -2, 4] });
  });
  it('the table constants match the federation table', () => {
    expect(SCORE.lielais).toEqual({ bezstikis: 6, jani: 4, win: 2, lose: -4, loseJani: -6, loseBezstikis: -8 });
    expect(SCORE.zole).toEqual({ bezstikis: 14, jani: 12, win: 10, lose: -12, loseJani: -14, loseBezstikis: -16 });
  });
});

describe('whole deals', () => {
  const strong = ['QC QS QH QD JC JS JH JD', 'KD 9D 8D 7D AC 10C KC 9C', 'AS 10S KS 9S AH 10H KH 9H'];
  it('lielais takes every trick → bezstiķis +6 / −3 / −3, discards count for him', () => {
    let s = rig(strong, 'AD 10D');
    s = act(s, 0, { type: 'bid', bid: 'take' });
    s = act(s, 0, { type: 'discard', ids: ['AD', '10D'] });
    s = playOut(s, (g, p) => (p === 0 ? sortHand(legalCards(g, p))[0].id : legalCards(g, p)[0].id));
    const r = s.result!;
    expect(r.contract).toBe('lielais');
    expect(r.tricksBy[0]).toBe(8);
    expect(r.declPts).toBe(120);
    expect(r.outcome).toBe('bezstikis');
    expect(r.delta).toEqual([6, -3, -3]);
    expect(s.scores).toEqual([6, -3, -3]);
    expect(s.sheet).toHaveLength(1);
  });
  it('zole: the table counts for the mazie', () => {
    let s = rig(strong, 'AD 10D');
    s = act(s, 0, { type: 'bid', bid: 'zole' });
    s = playOut(s, (g, p) => (p === 0 ? sortHand(legalCards(g, p))[0].id : legalCards(g, p)[0].id));
    const r = s.result!;
    expect(r.tricksBy[0]).toBe(8);
    expect(r.declPts).toBe(120 - 21);
    expect(r.oppPts).toBe(21);
    expect(r.outcome).toBe('bezstikis');
    expect(r.delta).toEqual([14, -7, -7]);
  });
  it('a declarer without a trick: zole −16 / +8 / +8', () => {
    let s = rig(['KD 9D 8D 7D AC 10C KC 9C', 'QC QS QH QD JC JS JH JD', 'AS 10S KS 9S AH 10H KH 9H'], 'AD 10D');
    s = act(s, 0, { type: 'bid', bid: 'zole' });
    s = playOut(s, (g, p) => (p === 1 ? sortHand(legalCards(g, p))[0].id : legalCards(g, p)[0].id));
    expect(s.result!.tricksBy[0]).toBe(0);
    expect(s.result!.outcome).toBe('loseBezstikis');
    expect(s.result!.delta).toEqual([-16, 8, 8]);
  });
  it('mazā zole ends at the declarer\'s first trick (−14 / +7 / +7)', () => {
    let s = rig(['QC AC 10C KH 9S 7D AS JH', 'AD KC 9C 10H 9H 10S KS 8D', 'QS QH QD JC JS JD 10D KD'], 'AH 9D');
    s = act(s, 0, { type: 'bid', bid: 'maza' });
    expect(s.contract).toBe('maza');
    s = act(s, 0, { type: 'play', id: 'QC' });
    s = act(s, 1, { type: 'play', id: 'AD' });
    s = act(s, 2, { type: 'play', id: 'KD' });
    expect(s.phase).toBe('dealOver');
    expect(s.tricks).toHaveLength(1);
    expect(s.result!.outcome).toBe('lose');
    expect(s.result!.delta).toEqual([-14, 7, 7]);
  });
  it('mazā zole won: no trick in 8 → +12 / −6 / −6', () => {
    let s = rig(['9C 9S 9H 7D KC KS KH 8D', 'QC QS QH QD JC JS JH JD', 'AD 10D KD 9D AC AS AH 10C'], '10S 10H');
    s = act(s, 0, { type: 'bid', bid: 'maza' });
    // 0 always ducks (lowest), 1 always plays its strongest trump
    s = playOut(s, (g, p) => {
      const l = sortHand(legalCards(g, p));
      return p === 1 ? l[0].id : l[l.length - 1].id;
    });
    expect(s.result!.tricksBy[0]).toBe(0);
    expect(s.result!.outcome).toBe('win');
    expect(s.result!.delta).toEqual([12, -6, -6]);
  });
  it('random deals: outcome agrees with the points, every deal is zero-sum, points add to 120', () => {
    for (let seed = 1; seed <= 300; seed++) {
      let s = newSession({ players, seed, rules: { deals: 1 } });
      const bid = (['take', 'zole', 'maza', 'pass'] as const)[seed % 4];
      s = act(s, s.turn, { type: 'bid', bid });
      if (bid === 'pass') { s = act(s, s.turn, { type: 'bid', bid: 'pass' }); s = act(s, s.turn, { type: 'bid', bid: 'pass' }); }
      if (s.phase === 'discard') s = act(s, s.turn, { type: 'discard', ids: [s.hands[s.turn][0].id, s.hands[s.turn][5].id] });
      s = playOut(s, (g, p) => { const l = legalCards(g, p); return l[(seed * 7 + g.seq) % l.length].id; });
      const r = s.result!;
      expect(r.delta.reduce((a, b) => a + b)).toBe(0);
      if (r.contract === 'lielais' || r.contract === 'zole') {
        expect(r.declPts + r.oppPts).toBe(120);
        expect(r.outcome).toBe(outcomeOf(r.declPts, r.tricksBy[r.declarer]));
      }
      s = act(s, 0, { type: 'next' });
      expect(s.phase).toBe('sessionOver');
    }
  });
});

describe('pules', () => {
  it('a declarer who wins with a common pule open collects +1 from each; a loser gets a personal pule', () => {
    const strong = ['QC QS QH QD JC JS JH JD', 'KD 9D 8D 7D AC 10C KC 9C', 'AS 10S KS 9S AH 10H KH 9H'];
    let s = rig(strong, 'AD 10D', { pules: true });
    s = { ...s, pules: { common: 1, personal: [0, 0, 0] } };
    s = act(s, 0, { type: 'bid', bid: 'take' });
    s = act(s, 0, { type: 'discard', ids: ['AD', '10D'] });
    s = playOut(s, (g, p) => (p === 0 ? sortHand(legalCards(g, p))[0].id : legalCards(g, p)[0].id));
    expect(s.result!.puleNote).toBe('commonWon');
    expect(s.result!.delta).toEqual([8, -4, -4]);
    expect(s.pules.common).toBe(0);

    let t = rig(['KD 9D 8D 7D AC 10C KC 9C', 'QC QS QH QD JC JS JH JD', 'AS 10S KS 9S AH 10H KH 9H'], 'AD 10D', { pules: true });
    t = { ...t, pules: { common: 1, personal: [0, 0, 0] } };
    t = act(t, 0, { type: 'bid', bid: 'zole' });
    t = playOut(t, (g, p) => (p === 1 ? sortHand(legalCards(g, p))[0].id : legalCards(g, p)[0].id));
    expect(t.result!.puleNote).toBe('personal');
    expect(t.pules).toEqual({ common: 1, personal: [1, 0, 0] });
    expect(t.result!.delta).toEqual([-16, 8, 8]);
  });
  it('a win clears the own personal pule first, then an opponent pays 3 for his', () => {
    const strong = ['QC QS QH QD JC JS JH JD', 'KD 9D 8D 7D AC 10C KC 9C', 'AS 10S KS 9S AH 10H KH 9H'];
    const run = (pules: ZState['pules']) => {
      let s = rig(strong, 'AD 10D', { pules: true });
      s = { ...s, pules };
      s = act(s, 0, { type: 'bid', bid: 'take' });
      s = act(s, 0, { type: 'discard', ids: ['AD', '10D'] });
      return playOut(s, (g, p) => (p === 0 ? sortHand(legalCards(g, p))[0].id : legalCards(g, p)[0].id));
    };
    const a = run({ common: 1, personal: [1, 0, 0] });
    expect(a.result!.puleNote).toBe('ownCleared');
    expect(a.pules).toEqual({ common: 1, personal: [0, 0, 0] });
    expect(a.result!.delta).toEqual([6, -3, -3]);
    const b = run({ common: 0, personal: [0, 0, 1] });
    expect(b.result!.puleNote).toBe('personalWon');
    expect(b.result!.delta).toEqual([9, -3, -6]);
  });
  it('personal pules left at the end cost 1 to each other player', () => {
    let s = newSession({ players, seed: 5, rules: { pules: true, deals: 0 } });
    s = { ...s, pules: { common: 2, personal: [0, 2, 0] } };
    s = act(s, 0, { type: 'finish' });
    expect(s.phase).toBe('sessionOver');
    const last = s.sheet.at(-1)!;
    expect(last.contract).toBe('final');
    expect(last.delta).toEqual([2, -4, 2]);
    expect(s.scores).toEqual([2, -4, 2]);
  });
});

describe('session', () => {
  it('a fixed-length session ends after its last deal; the dealer moves left', () => {
    let s = newSession({ players, seed: 9, dealer: 0, rules: { deals: 2 } });
    expect(s.dealNo).toBe(1);
    expect(s.dealer).toBe(0);
    for (let d = 0; d < 2; d++) {
      while (s.phase !== 'dealOver') s = act(s, s.turn, botAction(s, s.turn, 'normal', makeRng(d + s.seq))!);
      if (d === 0) { s = act(s, 0, { type: 'next' }); expect(s.dealer).toBe(1); expect(s.turn).toBe(2); }
    }
    s = act(s, 0, { type: 'next' });
    expect(s.phase).toBe('sessionOver');
    expect(s.sheet).toHaveLength(2);
    expect(s.scores.reduce((a, b) => a + b)).toBe(0);
  });
  it('is deterministic for a seed and JSON-serializable', () => {
    const runIt = () => {
      let s = newSession({ players, seed: 1234, rules: { deals: 3 } });
      const rnd = makeRng(99);
      while (s.phase !== 'sessionOver') {
        if (s.phase === 'dealOver') { s = apply(s, 0, { type: 'next' }); continue; }
        s = apply(s, s.turn, botAction(s, s.turn, 'hard', rnd)!);
        s = JSON.parse(JSON.stringify(s)) as ZState;
      }
      return s;
    };
    expect(JSON.stringify(runIt())).toBe(JSON.stringify(runIt()));
  });
  it('different seeds deal different hands', () => {
    const a = newSession({ players, seed: 1 }), b = newSession({ players, seed: 2 });
    expect(JSON.stringify(a.hands)).not.toBe(JSON.stringify(b.hands));
  });
  it('default rules', () => {
    expect(DEFAULT_RULES).toEqual({ mazaZole: true, pules: false, deals: 12 });
  });
});

describe('bots', () => {
  it('never make an illegal move across thousands of random deals', () => {
    const counts: Record<string, number> = {};
    let deals = 0;
    for (let i = 0; i < 1200; i++) {
      const level = LEVELS[i % 3] as ZLevel;
      const rules = { mazaZole: i % 2 === 0, pules: i % 5 === 0, deals: 3 };
      const rnd = makeRng(i * 31 + 7);
      let s = newSession({ players: players.map(p => ({ ...p, bot: true })), seed: i + 1, rules });
      let guard = 0;
      while (s.phase !== 'sessionOver' && guard++ < 400) {
        if (s.phase === 'dealOver') { deals++; counts[s.result!.contract] = (counts[s.result!.contract] ?? 0) + 1; s = apply(s, 0, { type: 'next' }); continue; }
        const p = s.turn;
        const a = botAction(s, p, level, rnd);
        expect(a).not.toBeNull();
        expect(validate(s, p, a!)).toBeNull();
        const n = apply(s, p, a!);
        expect(n.seq).toBe(s.seq + 1);
        s = n;
      }
      expect(s.phase).toBe('sessionOver');
      expect(s.scores.reduce((a, b) => a + b)).toBe(0);
    }
    expect(deals).toBe(3600);
    // the bots actually bid: lielais is the common game, galdiņš happens, zole is rare
    expect(counts.lielais).toBeGreaterThan(deals * 0.3);
    expect((counts.galdins ?? 0) + (counts.pule ?? 0)).toBeGreaterThan(deals * 0.05);
  });
  it('a bot sees only its own seat', () => {
    const s = newSession({ players, seed: 3 });
    const v = viewFor(s, 1);
    expect(JSON.stringify(v)).not.toContain(JSON.stringify(s.hands[0]));
    expect(JSON.stringify(v)).not.toContain(JSON.stringify(s.galds));
    expect(v.hand).toEqual(s.hands[1]);
  });
  it('bids sensibly: a monster takes / plays zole, a weak hand passes', () => {
    const base = viewFor(newSession({ players, seed: 3 }), 0);
    const monster = { ...base, hand: cs('QC QS QH QD JC JS AD AC') };
    expect(['zole', 'take']).toContain(chooseBid(monster, 'hard', () => 0.5));
    expect(chooseBid(monster, 'hard', () => 0.5)).toBe('zole');
    const ok = { ...base, hand: cs('QC QH JS JD AD 9D AC 10S') };
    expect(chooseBid(ok, 'normal', () => 0.5)).toBe('take');
    const weak = { ...base, hand: cs('7D 8D AC 10S KH 9H 10C KS'), rules: { ...base.rules, mazaZole: false } };
    expect(chooseBid(weak, 'hard', () => 0.5)).toBe('pass');
    expect(evaluate(monster.hand).trumps).toBe(7);
  });
  it('discards keep trumps and bank plain points / make voids', () => {
    const v = { ...viewFor(newSession({ players, seed: 3 }), 0), hand: cs('QC QS QH JC JD AD 9D 10S KH AC') };
    const d = chooseDiscard(v, 'hard', () => 0.5);
    expect(d.every(id => !isTrump(C(id)))).toBe(true);
    expect(d).toContain('10S');
    expect(d).toContain('KH');
  });
  it('the mazie schmear points onto a partner who already wins', () => {
    // seat 1 leads A♣ (partner of 2), declarer 0 follows 9♣ is impossible here — use galdiņš-free zole by seat 0
    let s = rig(['QC QS QH QD JC JS JH JD', 'AC KD 9D 8D 7D 10C KC 9C', 'AS 10S KS 9S AH 10H KH 9H'], 'AD 10D');
    s = act(s, 0, { type: 'bid', bid: 'zole' });
    // move: 0 leads a heart? 0 has only trumps; make seat 1 lead instead by playing one trick
    s = act(s, 0, { type: 'play', id: 'JD' });
    s = act(s, 1, { type: 'play', id: '7D' });
    s = act(s, 2, { type: 'play', id: '9H' });
    expect(s.tricks[0].winner).toBe(0);
    // 0 leads a trump again; 1 follows; now craft: 1 wins a plain trick later is impossible (0 has all trumps) — check
    // instead that a defender with a winning partner plays the richest card when last
    const g: ZState = {
      ...s, phase: 'play', turn: 2, leader: 1,
      trick: [{ p: 1, c: C('AC') }],
      hands: [s.hands[0], s.hands[1], cs('AS 10S KS AH 10H KH')],
    };
    // 0 must still play: simulate 0 having played a low trump already (cannot win vs A♣? trump wins) → use a plain case
    const g2: ZState = { ...g, trick: [{ p: 1, c: C('AC') }, { p: 0, c: C('9C') }], hands: [cs('QC QS'), s.hands[1], cs('AS 10S KS AH 10H KH')] };
    const a = botAction(g2, 2, 'hard', () => 0.5)!;
    expect(a.type).toBe('play');
    expect(['AS', 'AH']).toContain((a as { id: string }).id);
  });
});
