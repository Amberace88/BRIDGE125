import { describe, expect, it } from 'vitest';
import {
  type Action, type Card, type DurakState, type Rank, type Suit, MAX_PAIRS, apply, beats, legalActions, makeDeck, newGame, sortHand, validate,
} from './engine';
import { autoplay, botAction, coverPlan, type DurakLevel } from './bot';

const C = (id: string): Card => ({ id, r: id.slice(0, -1) as Rank, s: id.slice(-1) as Suit });
const names = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `P${i}`, bot: i > 0 }));

/** A hand-built mid-game state: hands given as id lists, trump suit, talon ids (top first). */
function make(o: { hands: string[][]; trump: Suit; talon?: string[]; attacker?: number; transfer?: boolean; discard?: string[] }): DurakState {
  const base = newGame({ players: names(o.hands.length), seed: 7, rules: { transfer: !!o.transfer } });
  const talon = (o.talon ?? []).map(C);
  const trumpCard = talon.length ? talon[talon.length - 1] : C('6' + o.trump);
  const attacker = o.attacker ?? 0;
  const defender = (attacker + 1) % o.hands.length;
  return {
    ...base, trump: o.trump, trumpCard, talon, discard: (o.discard ?? []).map(C),
    players: base.players.map((p, i) => ({ ...p, hand: o.hands[i].map(C) })),
    attacker, defender, lead: attacker, turn: attacker, limit: Math.min(MAX_PAIRS, o.hands[defender].length),
    table: [], known: o.hands.map(() => []), events: [],
  };
}
const act = (s: DurakState, seat: number, a: Action) => {
  const r = validate(s, seat, a);
  if (r) throw new Error(`illegal ${JSON.stringify(a)} by ${seat}: ${r}`);
  return apply(s, seat, a);
};

describe('deal and trump', () => {
  it('deals six each, trump = bottom of the talon, seedable', () => {
    const g = newGame({ players: names(3), seed: 42 });
    expect(g.players.every(p => p.hand.length === 6)).toBe(true);
    expect(g.talon).toHaveLength(36 - 18);
    expect(g.trump).toBe(g.talon[g.talon.length - 1].s);
    expect(g.trumpCard.id).toBe(g.talon[g.talon.length - 1].id);
    const g2 = newGame({ players: names(3), seed: 42 });
    expect(JSON.stringify(g2)).toBe(JSON.stringify(g));
    const g3 = newGame({ players: names(3), seed: 43 });
    expect(JSON.stringify(g3)).not.toBe(JSON.stringify(g));
  });
  it('the lowest trump starts', () => {
    for (let seed = 1; seed < 200; seed++) {
      const g = newGame({ players: names(4), seed });
      const low = (p: number) => Math.min(...g.players[p].hand.filter(c => c.s === g.trump).map(c => '6789TJQKA'.indexOf(c.r === '10' ? 'T' : c.r)), 99);
      const best = Math.min(...g.players.map((_, i) => low(i)));
      if (best < 99) expect(low(g.attacker)).toBe(best);
      expect(g.defender).toBe((g.attacker + 1) % 4);
      expect(g.turn).toBe(g.attacker);
      const ev = g.events[0];
      expect(ev.t).toBe('start');
    }
  });
  it('24-card deck and full deals', () => {
    const g = newGame({ players: names(4), seed: 3, rules: { deck: 24 } });
    expect(g.talon).toHaveLength(0);
    expect(g.players.flatMap(p => p.hand).every(c => ['9', '10', 'J', 'Q', 'K', 'A'].includes(c.r))).toBe(true);
    expect(g.trump).toBe(g.players[3].hand[5].s);
    expect(() => newGame({ players: names(5), rules: { deck: 24 } })).toThrow();
    const six = newGame({ players: names(6), seed: 5 });
    expect(six.talon).toHaveLength(0);
  });
  it('state survives JSON', () => {
    const g = newGame({ players: names(3), seed: 9 });
    expect(JSON.parse(JSON.stringify(g))).toEqual(g);
  });
});

describe('beating', () => {
  it('higher of the same suit or any trump', () => {
    expect(beats(C('8H'), C('7H'), 'S')).toBe(true);
    expect(beats(C('6H'), C('7H'), 'S')).toBe(false);
    expect(beats(C('6S'), C('AH'), 'S')).toBe(true);
    expect(beats(C('AH'), C('6S'), 'S')).toBe(false);
    expect(beats(C('7S'), C('6S'), 'S')).toBe(true);
    expect(beats(C('AD'), C('6H'), 'S')).toBe(false);
  });
});

describe('attack, defend, throw in', () => {
  const base = () => make({
    hands: [['7H', '7C', '9D', 'KH', '6S', 'QC'], ['8H', 'AS', '10C', 'JD', '6D', '7D'], ['7S', '9H', 'QD', 'KC', '8C', '6C']],
    trump: 'S', talon: ['AH', 'AC', 'AD', 'KD', 'KS', 'QS'],
  });
  it('lead: any card, one rank only; no pass on an empty table', () => {
    const s = base();
    expect(validate(s, 0, { type: 'attack', cards: ['7H'] })).toBeNull();
    expect(validate(s, 0, { type: 'attack', cards: ['7H', '7C'] })).toBeNull();
    expect(validate(s, 0, { type: 'attack', cards: ['7H', '9D'] })).not.toBeNull();
    expect(validate(s, 0, { type: 'pass' })).not.toBeNull();
    expect(validate(s, 1, { type: 'attack', cards: ['8H'] })).not.toBeNull(); // not his turn
  });
  it('defender beats, then throwers may add only ranks on the table', () => {
    let s = act(base(), 0, { type: 'attack', cards: ['7H'] });
    expect(s.turn).toBe(1);
    expect(validate(s, 1, { type: 'defend', card: '6D', target: 0 })).not.toBeNull();
    expect(validate(s, 1, { type: 'defend', card: '8H', target: 0 })).toBeNull();
    expect(validate(s, 1, { type: 'defend', card: 'AS', target: 0 })).toBeNull();
    s = act(s, 1, { type: 'defend', card: '8H', target: 0 });
    // attacker first: may throw 7C (7 on table); 9D is not on the table
    expect(s.turn).toBe(0);
    expect(validate(s, 0, { type: 'attack', cards: ['9D'] })).not.toBeNull();
    expect(validate(s, 0, { type: 'attack', cards: ['7C'] })).toBeNull();
    s = act(s, 0, { type: 'pass' });
    expect(s.events[0]).toMatchObject({ t: 'pass', bito: true });
    // seat 2 holds 7S and 8C (both ranks on the table)
    expect(s.turn).toBe(2);
    s = act(s, 2, { type: 'attack', cards: ['8C'] });
    expect(s.turn).toBe(1);
    s = act(s, 1, { type: 'defend', card: '10C', target: 1 });
    // new rank (10) → the round restarts with the attacker
    expect(s.passed).toEqual([]);
    expect(s.turn).toBe(0);
    s = act(s, 0, { type: 'attack', cards: ['7C'] });
    s = act(s, 1, { type: 'defend', card: 'AS', target: 2 });
    // the attacker has nothing left that matches → skipped; seat 2 still holds 7S
    expect(s.turn).toBe(2);
    s = act(s, 2, { type: 'pass' });
    expect(s.phase).toBe('resolve');
    expect(s.resolution).toBe('beaten');
    s = act(s, -1, { type: 'resolve' });
    expect(s.discard).toHaveLength(6);
    // defender attacks next
    expect(s.attacker).toBe(1);
    expect(s.defender).toBe(2);
  });
  it('never more than six cards, never more than the defender holds', () => {
    let s = make({ hands: [['7H', '7C', '7D', '7S', '8H', '9H'], ['AH', 'KH'], ['6C']], trump: 'D' });
    expect(s.limit).toBe(2);
    expect(validate(s, 0, { type: 'attack', cards: ['7H', '7C', '7D'] })).not.toBeNull();
    s = act(s, 0, { type: 'attack', cards: ['7H', '7C'] });
    expect(legalActions(s, 1).some(a => a.type === 'take')).toBe(true);
    s = act(s, 1, { type: 'take' });
    // limit reached: nobody may throw, the bout resolves at once
    expect(s.phase).toBe('resolve');
    s = act(s, -1, { type: 'resolve' });
    expect(s.players[1].hand.map(c => c.id).sort()).toEqual(['7C', '7H', 'AH', 'KH']);
    // the taker is skipped: seat 2 attacks
    expect(s.attacker).toBe(2);
    expect(s.defender).toBe(0);
    // six-card cap
    const big = make({ hands: [['7H', '7C', '7D', '7S', '8H', '8C', '8D', '8S'], ['AH', 'KH', 'QH', 'JH', '10H', '9H', '6H', 'AC']], trump: 'D' });
    expect(big.limit).toBe(6);
  });
  it('throwing in while the defender takes, up to the limit', () => {
    let s = make({ hands: [['7H', '7C', '7D', '9D'], ['8S', 'AS', '10C'], ['7S', '9H', 'QD']], trump: 'D' });
    s = act(s, 0, { type: 'attack', cards: ['7H'] });
    s = act(s, 1, { type: 'take' });
    expect(s.turn).toBe(0);
    s = act(s, 0, { type: 'attack', cards: ['7C'] });
    expect(s.turn).toBe(0); // keeps the turn while taking
    s = act(s, 0, { type: 'pass' });
    expect(s.turn).toBe(2);
    s = act(s, 2, { type: 'attack', cards: ['7S'] });
    // 3 cards = limit (defender held 3)
    expect(s.phase).toBe('resolve');
    s = act(s, -1, { type: 'resolve' });
    expect(s.players[1].hand).toHaveLength(6);
    expect(s.known[1].sort()).toEqual(['7C', '7H', '7S']);
  });
});

describe('perevodnoy (transfer)', () => {
  it('only when enabled, only the same rank, only before any cover, only if the next player can hold it', () => {
    const mk = (transfer: boolean, h2 = ['9S', '9H', 'QD', 'KC']) => make({
      hands: [['7H', '8C', '9D'], ['7S', '8H', '10C'], h2], trump: 'D', transfer,
    });
    let s = act(mk(false), 0, { type: 'attack', cards: ['7H'] });
    expect(validate(s, 1, { type: 'transfer', card: '7S' })).not.toBeNull();
    s = act(mk(true), 0, { type: 'attack', cards: ['7H'] });
    expect(validate(s, 1, { type: 'transfer', card: '8H' })).not.toBeNull();
    expect(validate(s, 1, { type: 'transfer', card: '7S' })).toBeNull();
    s = act(s, 1, { type: 'transfer', card: '7S' });
    expect(s.defender).toBe(2);
    expect(s.attacker).toBe(1);
    expect(s.turn).toBe(2);
    expect(s.table).toHaveLength(2);
    // next player holds only 1 card → cannot receive 2
    let t = act(mk(true, ['QD']), 0, { type: 'attack', cards: ['7H'] });
    expect(validate(t, 1, { type: 'transfer', card: '7S' })).not.toBeNull();
    // after a cover no transfer
    t = make({ hands: [['7H', '7C', '9D'], ['7S', '8H', '10C', 'AD'], ['9S', 'QD', 'KC', '6C']], trump: 'D', transfer: true });
    t = act(t, 0, { type: 'attack', cards: ['7H', '7C'] });
    t = act(t, 1, { type: 'defend', card: '8H', target: 0 });
    expect(validate(t, 1, { type: 'transfer', card: '7S' })).not.toBeNull();
  });
  it('two players: the transfer goes back to the attacker', () => {
    let s = make({ hands: [['7H', '8C', '9D'], ['7S', '8H', '10C']], trump: 'D', transfer: true });
    s = act(s, 0, { type: 'attack', cards: ['7H'] });
    s = act(s, 1, { type: 'transfer', card: '7S' });
    expect(s.defender).toBe(0);
    expect(s.turn).toBe(0);
  });
});

describe('drawing and the end', () => {
  it('opener draws first, other throwers next, defender last', () => {
    let s = make({
      hands: [['7H', '8C'], ['8H', 'AS', '10C'], ['9S', '9H', 'QD', 'KC', '6C', 'JC'], ['6H', '9C']],
      trump: 'S', talon: ['AH', 'AC', 'AD', 'KD', 'KS', 'QS', 'JS', '10S', '9S', '8S', '7D'],
    });
    s = act(s, 0, { type: 'attack', cards: ['7H'] });
    s = act(s, 1, { type: 'defend', card: '8H', target: 0 });
    s = act(s, 0, { type: 'attack', cards: ['8C'] });
    s = act(s, 1, { type: 'defend', card: '10C', target: 1 });
    // seat 0 is out of cards, seat 2 has no 7/8/10 → skipped; seat 3 has none either → resolve
    expect(s.phase).toBe('resolve');
    s = act(s, -1, { type: 'resolve' });
    const draw = s.events.find(e => e.t === 'draw');
    expect(draw && draw.t === 'draw' && draw.draws.map(d => d.p)).toEqual([0, 3, 1]);
    expect(s.players[0].hand).toHaveLength(6);   // took 6
    expect(s.players[3].hand).toHaveLength(6);   // took 4 → talon had 11: 6 + 4 = 10, 1 left
    expect(s.players[1].hand).toHaveLength(2);   // 1 + 1 (last card)
    expect(s.talon).toHaveLength(0);
  });
  it('last player holding cards is the durak; going out together is a draw', () => {
    let s = make({ hands: [['7H'], ['8H', '9C']], trump: 'S' });
    s = act(s, 0, { type: 'attack', cards: ['7H'] });
    s = act(s, 1, { type: 'defend', card: '8H', target: 0 });
    expect(s.phase).toBe('resolve');
    s = act(s, -1, { type: 'resolve' });
    expect(s.phase).toBe('over');
    expect(s.durak).toBe(1);
    expect(s.players[0].place).toBe(1);
    let d = make({ hands: [['7H'], ['8H']], trump: 'S' });
    d = act(d, 0, { type: 'attack', cards: ['7H'] });
    d = act(d, 1, { type: 'defend', card: '8H', target: 0 });
    d = act(d, -1, { type: 'resolve' });
    expect(d.phase).toBe('over');
    expect(d.durak).toBeNull();
  });
  it('a finished player is skipped; game goes on with the rest', () => {
    let s = make({ hands: [['7H'], ['8H', '9C', '6D'], ['6C', 'JD']], trump: 'S' });
    s = act(s, 0, { type: 'attack', cards: ['7H'] });
    s = act(s, 1, { type: 'defend', card: '8H', target: 0 });
    s = act(s, -1, { type: 'resolve' });
    expect(s.players[0].out).toBe(true);
    expect(s.phase).toBe('play');
    expect(s.attacker).toBe(1);
    expect(s.defender).toBe(2);
  });
  it('pogony: the durak is beaten with sixes in the last bout', () => {
    let s = make({ hands: [['6H'], ['9C', '8D']], trump: 'S' });
    s = act(s, 0, { type: 'attack', cards: ['6H'] });
    s = act(s, 1, { type: 'take' });
    s = act(s, -1, { type: 'resolve' });
    expect(s.durak).toBe(1);
    expect(s.pogony).toBe(true);
  });
});

describe('sorting', () => {
  it('trumps last, low to high', () => {
    const h = sortHand(['AS', '6H', '7S', 'KH', '9D'].map(C), 'S');
    expect(h.map(c => c.id)).toEqual(['6H', 'KH', '9D', '7S', 'AS']);
  });
});

/* ------------------------------------------------------------------ bots over thousands of games */

function invariant(s: DurakState) {
  const all = [...s.talon, ...s.discard, ...s.table.flatMap(p => (p.d ? [p.a, p.d] : [p.a])), ...s.players.flatMap(p => p.hand)];
  const ids = all.map(c => c.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.length).toBe(s.rules.deck);
  expect(s.table.length).toBeLessThanOrEqual(MAX_PAIRS);
  if (s.phase === 'play' && !s.taking) {
    const unc = s.table.filter(p => !p.d).length;
    expect(unc).toBeLessThanOrEqual(s.players[s.defender].hand.length);
  }
  if (s.phase === 'play') expect(s.players[s.turn].out).toBe(false);
}

describe('bots', () => {
  const levels: DurakLevel[] = ['easy', 'normal', 'hard'];
  it('never make an illegal move and every game ends (2000+ games)', () => {
    let games = 0, duraks = 0, draws = 0;
    for (let seed = 1; seed <= 700; seed++) {
      for (const transfer of [false, true]) {
        const n = 2 + (seed % 5);                    // 2..6 players
        const deck: 36 | 24 = n <= 4 && seed % 7 === 0 ? 24 : 36;
        let s = newGame({ players: names(n), seed: seed * 31 + (transfer ? 1 : 0), rules: { transfer, deck } });
        const lv = Array.from({ length: n }, (_, i) => levels[(seed + i) % 3]);
        let steps = 0;
        while (s.phase !== 'over') {
          if (++steps > 4000) throw new Error(`game did not end: seed ${seed}`);
          if (s.phase === 'resolve') { s = apply(s, -1, { type: 'resolve' }); invariant(s); continue; }
          const seat = s.turn;
          const a = botAction(s, seat, lv[seat]);
          const legal = legalActions(s, seat);
          expect(legal.some(x => JSON.stringify(x) === JSON.stringify(a))).toBe(true);
          expect(validate(s, seat, a)).toBeNull();
          const nx = apply(s, seat, a);
          expect(nx).not.toBe(s);
          s = nx;
          if (steps % 3 === 0) invariant(s);
        }
        games++;
        if (s.durak === null) draws++; else duraks++;
        expect(s.players.filter(p => !p.out).length).toBeLessThanOrEqual(1);
      }
    }
    expect(games).toBe(1400);
    expect(duraks).toBeGreaterThan(draws);
  }, 120_000);

  it('random legal play from a human seat never breaks the engine', () => {
    for (let seed = 1; seed <= 300; seed++) {
      let s = newGame({ players: names(3), seed, rules: { transfer: seed % 2 === 0 } });
      let r = seed;
      const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
      for (let i = 0; i < 3000 && s.phase !== 'over'; i++) {
        if (s.phase === 'resolve') { s = apply(s, -1, { type: 'resolve' }); continue; }
        const seat = s.turn;
        const legal = legalActions(s, seat);
        const a = seat === 0 ? legal[Math.floor(rnd() * legal.length)] : botAction(s, seat, 'hard');
        s = apply(s, seat, a);
        invariant(s);
      }
      expect(s.phase).toBe('over');
    }
  }, 60_000);

  it('hard bots beat easy bots more often than not', () => {
    let hardWins = 0, games = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const s = autoplay(newGame({ players: names(2), seed }), seed % 2 ? ['hard', 'easy'] : ['easy', 'hard']);
      if (s.durak === null) continue;
      games++;
      const hardSeat = seed % 2 ? 0 : 1;
      if (s.durak !== hardSeat) hardWins++;
    }
    expect(hardWins / games).toBeGreaterThan(0.55);
  }, 60_000);

  it('cover plan uses the cheapest cards', () => {
    let s = make({ hands: [['7H', '7C'], ['8H', 'AH', '6S', 'AS', '8C']], trump: 'S' });
    s = apply(s, 0, { type: 'attack', cards: ['7H', '7C'] });
    const plan = coverPlan(s, 1)!;
    expect(plan.map(p => p.card.id).sort()).toEqual(['8C', '8H']);
    expect(makeDeck(36)).toHaveLength(36);
  });
});
