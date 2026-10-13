/**
 * Zole bots — easy / normal / hard. A bot only ever looks at what its seat can see (`viewFor`): its own hand, its own
 * discards (when it is the lielais), the bids and every card played so far. Hard bots remember all played cards
 * (card counting: which higher cards are still out) and which players showed out of a suit.
 */
import {
  type Action, type Bid, type FollowSuit, type Play, type ZCard, type ZState,
  N, TRUMP_ORDER, beats, cardPoints, followSuit, isTrump, legalBids, legalCards, newDeck, power, sumPoints, teamOf,
  trickWinnerIndex,
} from './engine';

export type ZLevel = 'easy' | 'normal' | 'hard';
export const LEVELS: ZLevel[] = ['easy', 'normal', 'hard'];

/** Everything one seat may know. */
export interface View {
  me: number;
  hand: ZCard[];
  /** own discards (lielais) */
  discards: ZCard[];
  contract: ZState['contract'];
  declarer: number;
  bids: ZState['bids'];
  dealer: number;
  /** completed tricks (face up in our memory) */
  tricks: { leader: number; plays: Play[]; winner: number }[];
  trick: Play[];
  rules: ZState['rules'];
  /** number of bids already made this deal before mine */
  position: number;
}

export function viewFor(s: ZState, me: number): View {
  return {
    me, hand: [...s.hands[me]], discards: s.declarer === me ? [...s.discards] : [], contract: s.contract,
    declarer: s.declarer, bids: [...s.bids], dealer: s.dealer, tricks: s.tricks.map(t => ({ ...t, plays: [...t.plays] })),
    trick: [...s.trick], rules: s.rules, position: s.bids.length,
  };
}

/* ------------------------------------------------------------------ hand evaluation */

const TRUMP_W = [4.0, 3.6, 3.3, 3.0, 2.6, 2.4, 2.2, 2.0, 1.8, 1.6, 1.4, 1.2, 1.2, 1.2];
const trumpW = (c: ZCard) => TRUMP_W[power(c)] ?? 0;

export interface HandEval { value: number; trumps: number; queens: number; topTrumps: number; aces: number; voids: number }

/** Strength of a hand for playing alone (lielais / zole). */
export function evaluate(hand: readonly ZCard[]): HandEval {
  const trumps = hand.filter(isTrump);
  let value = trumps.reduce((a, c) => a + trumpW(c), 0);
  const queens = trumps.filter(c => c.r === 'Q').length;
  const topTrumps = trumps.filter(c => power(c) <= 5).length;
  let aces = 0, voids = 0;
  for (const s of ['C', 'S', 'H'] as const) {
    const cs = hand.filter(c => !isTrump(c) && c.s === s);
    if (!cs.length) { voids++; if (trumps.length >= 4) value += 0.9; continue; }
    const hasA = cs.some(c => c.r === 'A');
    if (hasA) { aces++; value += cs.length <= 2 ? 1.7 : 1.2; }
    if (cs.some(c => c.r === '10')) value += hasA ? 0.9 : cs.length === 1 ? -0.4 : 0.1;
    if (cs.length >= 3 && !hasA) value -= 0.5;
  }
  // long trumps grow stronger
  if (trumps.length >= 6) value += (trumps.length - 5) * 0.8;
  return { value, trumps: trumps.length, queens, topTrumps, aces, voids };
}

/** How likely a hand is to take a trick (for mazā zole: lower is safer). */
export function mazaDanger(hand: readonly ZCard[]): number {
  let d = 0;
  for (const c of hand) {
    if (isTrump(c)) { const p = power(c); d += p <= 3 ? 3 : p <= 7 ? 1.4 : p <= 9 ? 0.8 : p <= 10 ? 0.55 : 0.35 - (p - 11) * 0.1; continue; }
    const suit = hand.filter(x => !isTrump(x) && x.s === c.s);
    const base = c.r === 'A' ? 1.0 : c.r === '10' ? 0.6 : c.r === 'K' ? 0.35 : 0.12;
    d += base * (suit.length >= 3 ? 1.6 : 1);
  }
  return d;
}

/* ------------------------------------------------------------------ bidding */

export function chooseBid(v: View, level: ZLevel, rnd: () => number): Bid {
  const e = evaluate(v.hand);
  const noise = level === 'easy' ? (rnd() - 0.5) * 5 : level === 'normal' ? (rnd() - 0.5) * 1.2 : 0;
  const last = v.position === N - 1;
  const value = e.value + noise;
  // Bars measured by simulation (hard bots on all seats): taking the table breaks even at a value of ~15 (we take a
  // little earlier, as people do — a table of endless galdiņš is no fun), zole pays off from ~20.5,
  // mazā zole below a danger of ~3; passing is worth about −0.3 per deal.
  const zoleBar = level === 'hard' ? 20.5 : level === 'normal' ? 21.5 : 24;
  if (value >= zoleBar && e.trumps >= 5) return 'zole';
  const takeBar = (level === 'hard' ? 14.3 : level === 'normal' ? 14 : 12.8) - (last && !v.rules.pules ? 0.7 : 0);
  if (value >= takeBar) return 'take';
  // mazā zole: only with a hand that very rarely wins a trick
  if (v.rules.mazaZole) {
    const d = mazaDanger(v.hand) + (level === 'easy' ? (rnd() - 0.5) * 1.5 : 0);
    if (d <= (level === 'hard' ? 3.0 : level === 'normal' ? 2.6 : 2.4)) return 'maza';
  }
  return 'pass';
}

/** The lielais' two discards: bank points, make voids, keep trumps. */
export function chooseDiscard(v: View, level: ZLevel, rnd: () => number): [string, string] {
  const hand = v.hand;
  if (level === 'easy' && rnd() < 0.3) {
    const plain = hand.filter(c => !isTrump(c));
    const pool = plain.length >= 2 ? plain : hand;
    const a = pool[Math.floor(rnd() * pool.length)];
    const rest = pool.filter(c => c.id !== a.id);
    return [a.id, rest[Math.floor(rnd() * rest.length)].id];
  }
  let best: [string, string] = [hand[0].id, hand[1].id];
  let bestV = -Infinity;
  for (let i = 0; i < hand.length; i++) for (let j = i + 1; j < hand.length; j++) {
    const a = hand[i], b = hand[j];
    const keep = hand.filter(c => c !== a && c !== b);
    let val = (cardPoints(a) + cardPoints(b)) * 0.35;
    for (const c of [a, b]) if (isTrump(c)) val -= 12 + (14 - power(c));
    for (const s of ['C', 'S', 'H'] as const) {
      const before = hand.filter(c => !isTrump(c) && c.s === s);
      const after = keep.filter(c => !isTrump(c) && c.s === s);
      if (before.length && !after.length) val += 5;
      const hasA = after.some(c => c.r === 'A');
      if (after.some(c => c.r === '10') && !hasA) val -= after.length === 1 ? 4 : 2;
      if (after.length === 1 && after[0].r === 'K') val -= 1.5;
      if (hasA && after.length <= 2) val += 1;
    }
    val += evaluate(keep).value * 0.3;
    if (val > bestV) { bestV = val; best = [a.id, b.id]; }
  }
  return best;
}

/* ------------------------------------------------------------------ card play */

interface Ctx {
  v: View; level: ZLevel; rnd: () => number;
  legal: ZCard[];
  /** cards this seat has not seen yet (still in someone's hand, or the table / unseen discards) */
  unseen: ZCard[];
  /** seats known to be out of a follow-suit */
  voidIn: Set<string>;
}

const team = (v: View, p: number) => teamOf({ contract: v.contract, declarer: v.declarer }, p);
const mates = (v: View, a: number, b: number) => {
  if (v.contract === 'galdins') return a === b;
  if (v.contract === 'maza') return a === b || (a !== v.declarer && b !== v.declarer);
  return team(v, a) === team(v, b);
};

function buildCtx(v: View, level: ZLevel, rnd: () => number, legal: ZCard[]): Ctx {
  const seen = new Set<string>([...v.hand, ...v.discards].map(c => c.id));
  for (const t of v.tricks) for (const pl of t.plays) seen.add(pl.c.id);
  for (const pl of v.trick) seen.add(pl.c.id);
  const unseen = level === 'hard' ? newDeck().filter(c => !seen.has(c.id)) : [];
  const voidIn = new Set<string>();
  if (level === 'hard') {
    for (const t of [...v.tricks.map(x => x.plays), v.trick]) {
      if (!t.length) continue;
      const led = followSuit(t[0].c);
      for (const pl of t.slice(1)) if (followSuit(pl.c) !== led) voidIn.add(pl.p + led);
    }
  }
  return { v, level, rnd, legal, unseen, voidIn };
}

/** No unseen card of its follow-suit can beat it (hard bots only; others fall back to "top trump" knowledge). */
function isMaster(c: ZCard, x: Ctx): boolean {
  if (x.level !== 'hard') return isTrump(c) && power(c) === 0;
  const fs = followSuit(c);
  return !x.unseen.some(u => followSuit(u) === fs && power(u) < power(c));
}
const unseenTrumps = (x: Ctx) => (x.level === 'hard' ? x.unseen.filter(isTrump).length : TRUMP_ORDER.length);

const byPower = (a: ZCard, b: ZCard) => power(a) - power(b);        // strongest first
const lowest = (cs: ZCard[]) => [...cs].sort((a, b) => cardPoints(a) - cardPoints(b) || power(b) - power(a))[0];
const cheapestWinner = (cs: ZCard[]) => [...cs].sort((a, b) => power(b) - power(a) || cardPoints(b) - cardPoints(a))[0];
/** For a schmear: many points, little power wasted. */
const richest = (cs: ZCard[]) => [...cs].sort((a, b) => (cardPoints(b) * 10 + power(b)) - (cardPoints(a) * 10 + power(a)))[0];

export function choosePlay(v: View, level: ZLevel, rnd: () => number, legal: ZCard[]): ZCard {
  if (legal.length === 1) return legal[0];
  if (level === 'easy' && rnd() < 0.35) return legal[Math.floor(rnd() * legal.length)];
  const x = buildCtx(v, level, rnd, legal);
  if (v.contract === 'galdins') return avoidTricks(x);
  if (v.contract === 'maza') return v.me === v.declarer ? avoidTricks(x) : mazaDefence(x);
  return v.me === v.declarer ? declarerPlay(x) : defenderPlay(x);
}

/** Galdiņš / mazā zole declarer: take as few tricks as possible. */
function avoidTricks(x: Ctx): ZCard {
  const { v, legal } = x;
  if (!v.trick.length) {
    // lead the weakest card (prefer a plain suit where others still hold higher cards)
    return [...legal].sort((a, b) => power(b) - power(a) || cardPoints(a) - cardPoints(b))[0];
  }
  const w = v.trick[trickWinnerIndex(v.trick)].c;
  const led = followSuit(v.trick[0].c);
  const under = legal.filter(c => !beats(c, w, led));
  if (under.length) {
    // dump the most dangerous card that still ducks (highest power; in galdiņš also shed points)
    return [...under].sort((a, b) => power(a) - power(b) || cardPoints(b) - cardPoints(a))[0];
  }
  const last = v.trick.length === N - 1;
  // forced to win: if last, win with the strongest card (get rid of it); else the weakest winner (someone may overtake)
  return last ? [...legal].sort(byPower)[0] : cheapestWinner(legal);
}

/** Mazā zole defenders: make the declarer take a trick. */
function mazaDefence(x: Ctx): ZCard {
  const { v, legal } = x;
  const d = v.declarer;
  const played = v.trick.some(pl => pl.p === d);
  if (!v.trick.length) return [...legal].sort((a, b) => power(b) - power(a))[0]; // lead low: the declarer may have to go over
  const wi = trickWinnerIndex(v.trick);
  const w = v.trick[wi];
  const led = followSuit(v.trick[0].c);
  if (played && w.p === d) {
    // keep the declarer on top: the highest card that does not beat him
    const under = legal.filter(c => !beats(c, w.c, led));
    if (under.length) return [...under].sort(byPower)[0];
    return lowest(legal);
  }
  if (!played) return [...legal].sort((a, b) => power(b) - power(a))[0]; // play low, the declarer comes after
  // the declarer is already beaten in this trick: shed a strong card for later
  return [...legal].sort(byPower)[0];
}

function declarerPlay(x: Ctx): ZCard {
  const { v, legal } = x;
  const trumps = legal.filter(isTrump);
  if (!v.trick.length) {
    // pull trumps with masters while the mazie may still hold trumps
    const masters = trumps.filter(c => isMaster(c, x));
    if (masters.length && unseenTrumps(x) > 0) return [...masters].sort(byPower)[0];
    if (trumps.length >= 4 && x.level !== 'easy') return [...trumps].sort(byPower)[0];
    const aces = legal.filter(c => !isTrump(c) && c.r === 'A');
    if (aces.length) return aces[0];
    const plainMasters = legal.filter(c => !isTrump(c) && isMaster(c, x) && x.level === 'hard');
    if (plainMasters.length) return plainMasters[0];
    if (trumps.length >= 2) return [...trumps].sort(byPower)[trumps.length - 1];
    return lowest(legal);
  }
  return followPlay(x);
}

function defenderPlay(x: Ctx): ZCard {
  const { v, legal } = x;
  if (!v.trick.length) {
    // cash a plain ace, unless the declarer is known to be void in it
    const aces = legal.filter(c => !isTrump(c) && c.r === 'A' && !x.voidIn.has(v.declarer + c.s) && !playedSuitTwice(v, c.s));
    if (aces.length) return aces[0];
    const plain = legal.filter(c => !isTrump(c));
    if (plain.length) {
      // lead the longest plain suit's lowest card (the partner may schmear or win)
      const bySuit = new Map<string, ZCard[]>();
      for (const c of plain) bySuit.set(c.s, [...(bySuit.get(c.s) ?? []), c]);
      const longest = [...bySuit.values()].sort((a, b) => b.length - a.length)[0];
      return lowest(longest);
    }
    return lowest(legal);
  }
  return followPlay(x);
}

const playedSuitTwice = (v: View, s: string) => v.tricks.filter(t => followSuit(t.plays[0].c) === s).length >= 2;

/** Following a trick in lielais / zole (declarer or mazie). */
function followPlay(x: Ctx): ZCard {
  const { v, legal } = x;
  const wi = trickWinnerIndex(v.trick);
  const w = v.trick[wi];
  const led: FollowSuit = followSuit(v.trick[0].c);
  const last = v.trick.length === N - 1;
  const trickPts = sumPoints(v.trick.map(pl => pl.c));
  const friendWins = w.p !== v.me && mates(v, w.p, v.me);
  const winners = legal.filter(c => beats(c, w.c, led));

  if (friendWins) {
    // partner on top: schmear when it is safe (I am last, or the partner's card cannot be beaten)
    const safe = last || isMaster(w.c, x);
    if (safe) { const spare = legal.filter(c => !(isTrump(c) && power(c) <= 3)); return richest(spare.length ? spare : legal); }
    return lowest(legal);
  }
  if (winners.length) {
    if (last) return cheapestWinner(x.level === 'easy' ? winners : pickValueWinner(winners));
    // someone (an enemy, or my partner) plays after me
    const nextP = (v.me + 1) % N;
    const enemyAfter = !mates(v, nextP, v.me);
    if (!enemyAfter) return cheapestWinner(winners);
    const masters = winners.filter(c => isMaster(c, x));
    if (masters.length) return cheapestWinner(masters);
    if (trickPts >= 10 || x.level === 'easy') return [...winners].sort(byPower)[0];
    // a cheap trick: duck with a low card unless winning costs nothing
    const low = lowest(legal);
    return cardPoints(low) === 0 ? low : cheapestWinner(winners);
  }
  return lowest(legal);
}

/** The last player wins: a winner that also brings points home, without wasting a top trump. */
function pickValueWinner(ws: ZCard[]): ZCard[] {
  const nonTop = ws.filter(c => !(isTrump(c) && power(c) <= 3));
  return nonTop.length ? nonTop : ws;
}

/* ------------------------------------------------------------------ entry point */

/** The bot's action for seat `p` (null when it is not p's move). Uses only `viewFor(s, p)`. */
export function botAction(s: ZState, p: number, level: ZLevel, rnd: () => number = Math.random): Action | null {
  const v = viewFor(s, p);
  if (s.phase === 'bid' && s.turn === p) {
    const b = chooseBid(v, level, rnd);
    return { type: 'bid', bid: legalBids(s, p).includes(b) ? b : 'pass' };
  }
  if (s.phase === 'discard' && s.turn === p) return { type: 'discard', ids: chooseDiscard(v, level, rnd) };
  if (s.phase === 'play' && s.turn === p) return { type: 'play', id: choosePlay(v, level, rnd, legalCards(s, p)).id };
  return null;
}

/** A gentle suggestion for the human (first-timer hints): what a normal bot would bid. */
export function suggestBid(s: ZState, p: number): Bid {
  return chooseBid(viewFor(s, p), 'hard', () => 0.5);
}
