/**
 * Thousand bots — easy / normal / hard. A bot only looks at what its seat can see (`viewFor`): its own hand, the
 * bids, the shown talon, the card it received (or gave), the marriages and every card played so far. Normal and hard
 * bots remember the played cards (which higher cards are still out); hard bots also track who showed out of a suit
 * and where the talon's cards went.
 */
import {
  type Action, type Suit, type TCard, type TState, MARRIAGE, N, POINTS, RANKS, SUITS, beats, bidOptions, canDeclare, cardPoints,
  contractOptions, legalCards, marriagesIn, newDeck, nextSeat, rankIdx, trickWinnerIndex,
} from './engine';

export type TLevel = 'easy' | 'normal' | 'hard';
export const LEVELS: TLevel[] = ['easy', 'normal', 'hard'];

/* ------------------------------------------------------------------ hand evaluation */

/**
 * Expected deal points of a hand played as the declarer (it leads the first trick): sure tricks from the top of each
 * suit (with the two cards the opponents add), plus the marriages it can expect to declare.
 */
export function estimate(hand: readonly TCard[]): number {
  let pts = 0;
  const aces = hand.filter(c => c.r === 'A').length;
  const mar = marriagesIn(hand);
  for (const s of SUITS) {
    const cs = hand.filter(c => c.s === s).sort((a, b) => rankIdx(a) - rankIdx(b));
    if (!cs.length) continue;
    let top = 0;
    for (const r of RANKS) { if (cs.some(c => c.r === r)) top++; else break; }
    // opponents run out of a suit after ~2 rounds: deeper winners count less
    for (let i = 0; i < top; i++) pts += (POINTS[cs[i].r] + 7) * (i < 2 ? 1 : i < 3 ? 0.7 : 0.45);
    // a long suit: the low cards win once the others are out (and it may become trump)
    if (cs.length >= 4) pts += (cs.length - 3) * 6;
    // an unguarded 10 tends to fall to the ace
    if (!cs.some(c => c.r === 'A') && cs.some(c => c.r === '10') && cs.length <= 2) pts -= 3;
  }
  // marriages: needs the lead after trick 1 — an ace (or a second marriage) gets it back
  mar.forEach((s, i) => {
    const reach = aces >= 2 ? 0.95 : aces === 1 ? (i === 0 ? 0.9 : 0.75) : (i === 0 ? 0.55 : 0.4);
    pts += MARRIAGE[s] * reach;
    // the K and Q themselves are points that come home once their suit is trump
    pts += 5 * reach;
  });
  return pts;
}

/** What the talon is worth on average to a 7-card hand: ~15 card points, plus the chance it completes a marriage. */
export function talonBonus(hand: readonly TCard[]): number {
  let b = 22;
  for (const s of SUITS) {
    const k = hand.some(c => c.s === s && c.r === 'K'), q = hand.some(c => c.s === s && c.r === 'Q');
    if (k !== q) b += MARRIAGE[s] * 0.17 * 0.75;
  }
  return b;
}

/** The highest bid a seat believes in (before the talon). */
export function bidLimit(hand: readonly TCard[], level: TLevel, rnd: () => number): number {
  const est = estimate(hand) + talonBonus(hand);
  const noise = level === 'easy' ? (rnd() - 0.4) * 30 : level === 'normal' ? (rnd() - 0.5) * 10 : (rnd() - 0.5) * 4;
  const margin = level === 'hard' ? 4 : level === 'normal' ? 4 : 2;
  return Math.floor((est + noise - margin) / 5) * 5;
}

/** Coach: the bid the hint suggests for seat `p` (0 = pass), from a hard bot's view without noise. */
export function suggestBid(s: TState, p: number): number {
  const opts = bidOptions(s, p);
  if (!opts.length) return 0;
  const lim = Math.floor((estimate(s.hands[p]) + talonBonus(s.hands[p]) - 4) / 5) * 5;
  return opts[0] <= lim ? opts[0] : 0;
}

/* ------------------------------------------------------------------ the view */

export interface View {
  me: number;
  hand: TCard[];
  declarer: number;
  contract: number;
  high: number;
  trump: Suit | null;
  talonShown: TCard[];
  /** gifts this seat knows: the ones it made (declarer) or received */
  gives: { to: number; c: TCard }[];
  tricks: { leader: number; plays: { p: number; c: TCard }[]; winner: number }[];
  trick: { p: number; c: TCard }[];
  marriages: { p: number; s: Suit }[];
  scores: number[];
  barrel: (number | null)[];
  first: boolean;
}

export function viewFor(s: TState, me: number): View {
  return {
    me, hand: [...s.hands[me]], declarer: s.declarer, contract: s.contract, high: s.high, trump: s.trump,
    talonShown: [...s.talonShown], gives: s.gives.filter(g => s.declarer === me || g.to === me),
    tricks: s.tricks.map(t => ({ ...t, plays: [...t.plays] })), trick: [...s.trick], marriages: [...s.marriages],
    scores: [...s.scores], barrel: [...s.barrel], first: s.tricks.length === 0,
  };
}

/* ------------------------------------------------------------------ bidding, talon, contract */

export function chooseBid(s: TState, p: number, level: TLevel, rnd: () => number): number {
  const opts = bidOptions(s, p);
  if (!opts.length) return 0;
  let lim = bidLimit(s.hands[p], level, rnd);
  // on the barrel only a contract that reaches 1000 helps
  if (s.rules.barrel && s.barrel[p] != null && lim < 120) return 0;
  // an opponent close to the barrel / 1000: take more risk to stop him
  const threat = [0, 1, 2].some(q => q !== p && s.barrel[q] != null);
  if (threat) lim += level === 'hard' ? 10 : 5;
  return opts[0] <= lim ? opts[0] : 0;
}

/** The declarer's two gifts: low cards that break nothing — never a marriage card, rarely points. */
export function chooseGive(s: TState, p: number, level: TLevel, rnd: () => number): [string, string] {
  const hand = s.hands[p];
  const mar = new Set(marriagesIn(hand));
  if (level === 'easy' && rnd() < 0.25) {
    const pool = hand.filter(c => !mar.has(c.s) && c.r !== 'A');
    const pk = (pool.length >= 2 ? pool : hand);
    const a = pk[Math.floor(rnd() * pk.length)];
    const rest = pk.filter(c => c.id !== a.id);
    return [a.id, rest[Math.floor(rnd() * rest.length)].id];
  }
  let best: [string, string] = [hand[0].id, hand[1].id];
  let bestV = -Infinity;
  for (let i = 0; i < hand.length; i++) for (let j = i + 1; j < hand.length; j++) {
    const keep = hand.filter((_, k) => k !== i && k !== j);
    const given = cardPoints(hand[i]) + cardPoints(hand[j]);
    const v = estimate(keep) - given * 0.9;
    if (v > bestV) { bestV = v; best = [hand[i].id, hand[j].id]; }
  }
  // the lower of the two goes to the next seat (it plays right after us) — cosmetic, both are low
  return best;
}

export function chooseContract(s: TState, p: number, level: TLevel, rnd: () => number): number {
  const opts = contractOptions(s, p);
  if (!opts.length) return s.high;
  const est = estimate(s.hands[p]) + (level === 'easy' ? (rnd() - 0.5) * 20 : 0);
  const margin = level === 'hard' ? 30 : level === 'normal' ? 18 : 10;
  let want = opts[0];
  for (const v of opts) if (v <= est - margin) want = v;
  // on the barrel: aim for 1000 if it is at all realistic
  if (s.rules.barrel && s.barrel[p] != null) {
    const need = 1000 - s.scores[p];
    const reach = opts.find(v => v >= need);
    if (reach != null && reach <= est + 5) want = Math.max(want, reach);
  }
  return want;
}

/* ------------------------------------------------------------------ card play */

interface Ctx {
  s: TState; p: number; level: TLevel; rnd: () => number;
  hand: TCard[]; legal: TCard[]; trump: Suit | null;
  /** cards not seen by this seat (null = no memory: easy bots) */
  unseen: TCard[] | null;
  voidIn: Set<string>;
}

const mate = (s: TState, a: number, b: number) => a === b || (a !== s.declarer && b !== s.declarer);

function ctxFor(s: TState, p: number, level: TLevel, rnd: () => number): Ctx {
  const v = viewFor(s, p);
  const seen = new Set<string>(v.hand.map(c => c.id));
  for (const t of v.tricks) for (const pl of t.plays) seen.add(pl.c.id);
  for (const pl of v.trick) seen.add(pl.c.id);
  const unseen = level === 'easy' ? null : newDeck().filter(c => !seen.has(c.id));
  const voidIn = new Set<string>();
  if (level === 'hard') {
    for (const t of [...v.tricks.map(x => x.plays), v.trick]) {
      if (!t.length) continue;
      const led = t[0].c.s;
      for (const pl of t.slice(1)) {
        if (pl.c.s !== led) { voidIn.add(pl.p + led); if (s.trump && pl.c.s !== s.trump) voidIn.add(pl.p + s.trump); }
      }
    }
  }
  return { s, p, level, rnd, hand: v.hand, legal: legalCards(s, p), trump: s.trump, unseen, voidIn };
}

/** No card still out can beat `c` within its suit. */
function isMaster(c: TCard, x: Ctx): boolean {
  if (!x.unseen) return c.r === 'A';
  return !x.unseen.some(u => u.s === c.s && rankIdx(u) < rankIdx(c));
}
const outIn = (x: Ctx, s: Suit) => (x.unseen ? x.unseen.filter(c => c.s === s).length : 6);
/** Might a seat other than us (and not our mate) trump a lead of suit `s`? */
function ruffRisk(x: Ctx, s: Suit): boolean {
  if (!x.trump || s === x.trump) return false;
  const foes = [0, 1, 2].filter(q => !mate(x.s, q, x.p));
  if (x.level === 'hard') return foes.some(q => x.voidIn.has(q + s) && !x.voidIn.has(q + x.trump!));
  return outIn(x, s) <= 1;
}
/** Cards of a marriage we still hold (keep them for the lead). */
function marriageCards(x: Ctx): Set<string> {
  const out = new Set<string>();
  for (const s of marriagesIn(x.hand)) for (const c of x.hand) if (c.s === s && (c.r === 'K' || c.r === 'Q')) out.add(c.id);
  return out;
}
const keepCost = (c: TCard, x: Ctx, mar: Set<string>) =>
  cardPoints(c) + (mar.has(c.id) ? 60 : 0) + (x.trump && c.s === x.trump ? 8 : 0) + (isMaster(c, x) && c.r !== '9' ? 6 : 0);
const cheapest = (cs: TCard[], x: Ctx) => { const m = marriageCards(x); return [...cs].sort((a, b) => keepCost(a, x, m) - keepCost(b, x, m) || rankIdx(b) - rankIdx(a))[0]; };

export function choosePlay(s: TState, p: number, level: TLevel, rnd: () => number): { id: string; marriage?: boolean } {
  const x = ctxFor(s, p, level, rnd);
  const legal = x.legal;
  // a marriage on lead: always worth it (the biggest one first)
  if (!s.trick.length && s.tricks.length > 0) {
    const decl = marriagesIn(x.hand).filter(m => canDeclare(s, p, x.hand.find(c => c.s === m && c.r === 'Q')!));
    if (decl.length && !(level === 'easy' && rnd() < 0.15)) {
      const m = decl[0];
      // lead the queen (3 points at risk), unless the king is the master card of the suit
      const k = x.hand.find(c => c.s === m && c.r === 'K')!, q = x.hand.find(c => c.s === m && c.r === 'Q')!;
      return { id: (isMaster(k, x) ? k : q).id, marriage: true };
    }
  }
  if (level === 'easy' && rnd() < 0.3) return { id: legal[Math.floor(rnd() * legal.length)].id };
  return { id: (s.trick.length ? follow(x) : lead(x)).id };
}

function lead(x: Ctx): TCard {
  const { s, p, legal } = x;
  const mar = marriageCards(x);
  const declarer = s.declarer === p;
  const free = legal.filter(c => !mar.has(c.id));
  const pool = free.length ? free : legal;
  // 1. cash a master that will not be ruffed: aces first, then the biggest points
  const masters = pool.filter(c => isMaster(c, x) && !ruffRisk(x, c.s) && (c.s !== x.trump || declarer));
  if (masters.length) return [...masters].sort((a, b) => cardPoints(b) - cardPoints(a))[0];
  // 2. the declarer with trump length pulls trumps
  if (declarer && x.trump) {
    const tr = pool.filter(c => c.s === x.trump);
    if (tr.length && tr.length >= outIn(x, x.trump) - 1) return [...tr].sort((a, b) => rankIdx(a) - rankIdx(b))[0];
  }
  // 3. a low card from the longest side suit, never a bare 10 (it walks into the ace)
  const bySuit = (c: TCard) => pool.filter(o => o.s === c.s).length;
  const ok = pool.filter(c => !(c.r === '10' && !x.hand.some(o => o.s === c.s && o.r === 'A')) && c.s !== x.trump);
  const cands = ok.length ? ok : pool;
  return [...cands].sort((a, b) => cardPoints(a) - cardPoints(b) || bySuit(b) - bySuit(a) || rankIdx(b) - rankIdx(a))[0];
}

function follow(x: Ctx): TCard {
  const { s, p, legal } = x;
  const trick = s.trick;
  const wi = trickWinnerIndex(trick, x.trump);
  const win = trick[wi];
  const led = trick[0].c.s;
  const mateWins = mate(s, win.p, p);
  const last = trick.length === N - 1;
  const beaters = legal.filter(c => beats(c, win.c, led, x.trump));
  const pts = trick.reduce((a, t) => a + cardPoints(t.c), 0);
  const mar = marriageCards(x);
  const dump = () => cheapest(legal, x);
  const schmear = () => {
    const ok = legal.filter(c => !mar.has(c.id) && !(isMaster(c, x) && c.r === 'A' && legal.length > 1 && x.level === 'hard' && c.s !== led));
    const pool = ok.length ? ok : legal;
    return [...pool].sort((a, b) => cardPoints(b) - cardPoints(a) || rankIdx(b) - rankIdx(a))[0];
  };
  /** the cheapest card that wins */
  const takeCheap = () => [...beaters].sort((a, b) => keepCost(a, x, mar) - keepCost(b, x, mar) || rankIdx(b) - rankIdx(a))[0];
  if (last) {
    if (mateWins) return schmear();
    if (beaters.length && (pts > 0 || beaters.some(c => cardPoints(c) <= 2 && !mar.has(c.id)))) {
      // win with points if a non-trump beater carries them
      const pointy = beaters.filter(c => c.s === led && !mar.has(c.id)).sort((a, b) => cardPoints(b) - cardPoints(a))[0];
      return pointy ?? takeCheap();
    }
    return dump();
  }
  // second to play: the third player is next
  const third = nextSeat(p);
  const thirdMate = mate(s, third, p);
  if (mateWins) {
    // our mate led: if his card is master, add points unless the declarer (third) can ruff
    if (isMaster(win.c, x) && !(x.trump && x.voidIn.has(third + led))) return schmear();
    return dump();
  }
  if (beaters.length) {
    const masterBeat = beaters.filter(c => (c.s === led ? isMaster(c, x) && !(x.trump && x.voidIn.has(third + led) && !thirdMate) : true));
    if (masterBeat.length) {
      const sameSuit = masterBeat.filter(c => c.s === led);
      if (sameSuit.length) return [...sameSuit].sort((a, b) => cardPoints(b) - cardPoints(a))[0];
      if (pts >= 10 || !thirdMate) return [...masterBeat].sort((a, b) => rankIdx(b) - rankIdx(a))[0];
    }
    if (thirdMate) return dump();
    if (pts >= 10) return takeCheap();
  }
  return dump();
}

/* ------------------------------------------------------------------ entry point */

export function botAction(s: TState, p: number, level: TLevel, rnd: () => number = Math.random): Action | null {
  switch (s.phase) {
    case 'bid': return s.turn === p ? { type: 'bid', amount: chooseBid(s, p, level, rnd) } : null;
    case 'give': return s.turn === p ? { type: 'give', ids: chooseGive(s, p, level, rnd) } : null;
    case 'contract': return s.turn === p ? { type: 'contract', amount: chooseContract(s, p, level, rnd) } : null;
    case 'play': return s.turn === p ? { type: 'play', ...choosePlay(s, p, level, rnd) } : null;
    default: return null;
  }
}
