/**
 * Zolīte (Zole) — the Latvian national card game. A pure rules engine: no DOM, no clocks, no Math.random.
 *
 * The whole game is one serializable `ZState` (plain JSON). Every random choice comes from the seeded generator
 * stored in the state (`rng`), so a session replays exactly from its seed + actions — the same engine can later run
 * an online table on the server (worker) and on every client.
 *
 * Rules implemented (Latvian standard rules as used by the Latvian Zole federation / club tables, 3 players):
 *   · 26 cards: A 10 K Q J 9 of ♣ ♠ ♥ ♦ + 8♦ 7♦.  Card points A 11, 10 10, K 4, Q 3, J 2, 9/8/7 0 = 120.
 *   · 14 trumps, highest first: Q♣ Q♠ Q♥ Q♦ J♣ J♠ J♥ J♦ A♦ 10♦ K♦ 9♦ 8♦ 7♦.  Plain suits ♣ ♠ ♥: A 10 K 9.
 *   · You must follow the suit led (trumps are one suit of their own); otherwise any card. No duty to trump or overtake.
 *   · Deal: 4 cards to each player (from the dealer's left), 2 face down to the table ("galds"), 4 more to each.
 *   · Bidding, once round from the dealer's left ("pirmā roka"); the first player who does not pass becomes the
 *     declarer and bidding ends:
 *       ņemt galdu → "lielais": takes the 2 table cards, discards 2 (they count for him) — plays alone vs the two "mazie"
 *       zole       → plays alone without the table; the 2 table cards count for the mazie
 *       mazā zole  → (rule toggle) must take no trick at all; the table is not used
 *       garām      → pass
 *     All pass → "galdiņš" (everyone for themselves; most tricks loses, ties → most card points; the 2 table cards go
 *     to the winner of the last trick), or — with the "pules" rule — a common pule is written and the cards are redealt.
 *   · The player on the dealer's left always leads the first trick; the dealer passes to the left after every deal.
 *   · Declarer needs 61+ card points. 91+ = mazie "jaņos" (bigger win); 30 or less = declarer "jaņos";
 *     all 8 tricks = "bezstiķis" for the mazie; no trick at all = declarer "bezstiķī". Mazā zole ends at the first
 *     trick the declarer takes.
 *   · Scoring (declarer / each mazais):
 *       lielais  win 61–90 +2/−1 · 91+ +4/−2 · all tricks +6/−3 · lose 31–60 −4/+2 · ≤30 −6/+3 · no trick −8/+4
 *       zole     win +10/−5 · 91+ +12/−6 · all tricks +14/−7 · lose −12/+6 · ≤30 −14/+7 · no trick −16/+8
 *       mazā zole  win +12/−6 · lose −14/+7
 *       galdiņš  loser −4, the others +2 each (two players tied on tricks and points: −2 each, the third +4)
 *   · Pules (optional): all pass → +1 common pule, redeal. A declarer who loses while any pule is open gets a personal
 *     pule. A declarer who wins while pules are open removes one: own personal pule first (no payment), else a common
 *     pule (+1 from each mazais), else a mazais' personal pule (its owner pays +3). At the end of the session every
 *     personal pule left costs its owner 1 point to each other player; common pules left are dropped.
 */

/* ------------------------------------------------------------------ cards */

export type Suit = 'C' | 'S' | 'H' | 'D';
export type Rank = 'A' | '10' | 'K' | 'Q' | 'J' | '9' | '8' | '7';
/** Same shape as the Bridge 125 card (src/engine/engine.ts) so the shared CardView / CardFace render it. */
export interface ZCard { id: string; r: Rank; s: Suit }
/** Suit for following: 'T' = trump. */
export type FollowSuit = 'T' | 'C' | 'S' | 'H';

export const SUITS: Suit[] = ['C', 'S', 'H', 'D'];
export const GLYPH: Record<Suit, string> = { C: '♣', S: '♠', H: '♥', D: '♦' };
const mk = (r: Rank, s: Suit): ZCard => ({ id: r + s, r, s });

/** The 14 trumps, highest first. */
export const TRUMP_ORDER: readonly ZCard[] = [
  mk('Q', 'C'), mk('Q', 'S'), mk('Q', 'H'), mk('Q', 'D'),
  mk('J', 'C'), mk('J', 'S'), mk('J', 'H'), mk('J', 'D'),
  mk('A', 'D'), mk('10', 'D'), mk('K', 'D'), mk('9', 'D'), mk('8', 'D'), mk('7', 'D'),
];
/** Plain-suit order, highest first. */
export const PLAIN_ORDER: readonly Rank[] = ['A', '10', 'K', '9'];
const TRUMP_IDX = new Map(TRUMP_ORDER.map((c, i) => [c.id, i]));

/** A fresh 26-card deck (trumps first, then ♣ ♠ ♥). */
export function newDeck(): ZCard[] {
  const out = TRUMP_ORDER.map(c => ({ ...c }));
  for (const s of ['C', 'S', 'H'] as Suit[]) for (const r of PLAIN_ORDER) out.push(mk(r, s));
  return out;
}

export const POINTS: Record<Rank, number> = { A: 11, '10': 10, K: 4, Q: 3, J: 2, '9': 0, '8': 0, '7': 0 };
export const cardPoints = (c: ZCard) => POINTS[c.r];
export const sumPoints = (cs: readonly ZCard[]) => cs.reduce((a, c) => a + POINTS[c.r], 0);
export const isTrump = (c: ZCard) => TRUMP_IDX.has(c.id);
export const followSuit = (c: ZCard): FollowSuit => (isTrump(c) ? 'T' : (c.s as FollowSuit));
/**
 * Card strength, 0 = strongest card of the game (Q♣). Trumps 0–13; plain cards 20 + rank (A 20, 10 21, K 22, 9 23).
 * Only meaningful within one follow-suit (a plain card never beats a trump or a card of another plain suit).
 */
export const power = (c: ZCard) => TRUMP_IDX.get(c.id) ?? 20 + PLAIN_ORDER.indexOf(c.r);

/** Does `a` beat `b` (b currently wins a trick whose led suit is `led`)? */
export function beats(a: ZCard, b: ZCard, led: FollowSuit): boolean {
  const ta = isTrump(a), tb = isTrump(b);
  if (ta && !tb) return true;
  if (!ta && tb) return false;
  if (ta && tb) return power(a) < power(b);
  // both plain: only the led suit counts
  if (a.s !== b.s) return followSuit(a) === led && followSuit(b) !== led;
  return power(a) < power(b);
}

export interface Play { p: number; c: ZCard }

/** Index (into `plays`) of the play that wins the trick so far. */
export function trickWinnerIndex(plays: readonly Play[]): number {
  if (!plays.length) return -1;
  const led = followSuit(plays[0].c);
  let w = 0;
  for (let i = 1; i < plays.length; i++) if (beats(plays[i].c, plays[w].c, led)) w = i;
  return w;
}

/** Display order for a hand: trumps (high → low), then ♣ ♠ ♥ (A 10 K 9). */
export function sortHand(cs: readonly ZCard[]): ZCard[] {
  const key = (c: ZCard) => (isTrump(c) ? power(c) : 100 + ['C', 'S', 'H'].indexOf(c.s) * 10 + PLAIN_ORDER.indexOf(c.r));
  return [...cs].sort((a, b) => key(a) - key(b));
}

/* ------------------------------------------------------------------ seeded random (mulberry32) */

/** One step of mulberry32: returns [value in [0,1), next state]. */
export function rand(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}
/** A seeded generator for tests / bots (not stored in state). */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { const [v, n] = rand(s); s = n; return v; };
}
function shuffle<T>(arr: T[], state: number): [T[], number] {
  const a = [...arr];
  let st = state;
  for (let i = a.length - 1; i > 0; i--) {
    const [v, n] = rand(st); st = n;
    const j = Math.floor(v * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return [a, st];
}

/* ------------------------------------------------------------------ state */

export type Bid = 'take' | 'zole' | 'maza' | 'pass';
export type Contract = 'lielais' | 'zole' | 'maza' | 'galdins';
/** Declarer outcome. */
export type Outcome = 'bezstikis' | 'jani' | 'win' | 'lose' | 'loseJani' | 'loseBezstikis';
export type Phase = 'bid' | 'discard' | 'play' | 'dealOver' | 'sessionOver';

export interface ZoleRules {
  /** "mazā zole" may be bid */
  mazaZole: boolean;
  /** all pass → common pule + redeal (federation tournaments) instead of galdiņš */
  pules: boolean;
  /** deals in the session; 0 = until the player stops */
  deals: number;
}
export const DEFAULT_RULES: ZoleRules = { mazaZole: true, pules: false, deals: 12 };

export interface ZPlayer { name: string; bot: boolean }

export interface Trick { leader: number; plays: Play[]; winner: number }

export interface DealResult {
  contract: Contract | 'pule';
  declarer: number;              // −1 for galdiņš / pule
  outcome: Outcome | null;       // declarer's outcome (null for galdiņš / pule)
  /** card points: declarer side vs mazie (lielais incl. his discards; zole: the table goes to the mazie) */
  declPts: number; oppPts: number;
  /** tricks taken per seat and card points per seat (galdiņš: incl. the table cards for the last trick's winner) */
  tricksBy: number[]; ptsBy: number[];
  /** galdiņš: the losing seat(s) */
  losers: number[];
  /** contract points for this deal (zero-sum), pule settlements included */
  delta: number[];
  /** the pule part of `delta` (also zero-sum) */
  puleDelta: number[];
  /** what happened with the pules this deal (for the score sheet) */
  puleNote: null | 'added' | 'personal' | 'ownCleared' | 'commonWon' | 'personalWon';
  /** galdiņš: who received the table cards (the last trick's winner) */
  galdsTo: number;
}

export interface SheetRow {
  deal: number;
  dealer: number;
  contract: Contract | 'pule' | 'final';
  declarer: number;
  outcome: Outcome | null;
  declPts: number; oppPts: number;
  delta: number[];
  /** running totals after this row */
  totals: number[];
  puleNote: DealResult['puleNote'] | 'final';
  losers: number[];
}

export interface ZState {
  v: 1;
  rules: ZoleRules;
  players: ZPlayer[];
  /** seeded generator state (mulberry32) */
  rng: number;
  /** 1-based number of the deal in progress / just finished */
  dealNo: number;
  dealer: number;
  phase: Phase;
  /** seat to act (bid / discard / play) */
  turn: number;
  hands: ZCard[][];
  /** the 2 face-down table cards (emptied when the lielais takes them) */
  galds: ZCard[];
  /** the lielais' 2 discards (face down, they count for him) */
  discards: ZCard[];
  bids: { p: number; bid: Bid }[];
  declarer: number;
  contract: Contract | null;
  /** the trick being played */
  trick: Play[];
  leader: number;
  tricks: Trick[];
  /** running score per seat */
  scores: number[];
  pules: { common: number; personal: number[] };
  sheet: SheetRow[];
  result: DealResult | null;
  /** increases with every accepted action */
  seq: number;
}

export type Action =
  | { type: 'bid'; bid: Bid }
  | { type: 'discard'; ids: [string, string] | string[] }
  | { type: 'play'; id: string }
  | { type: 'next' }      // dealOver → next deal (or session over)
  | { type: 'finish' };   // end the session now (endless sessions / "stop here")

export const N = 3;
export const nextSeat = (p: number) => (p + 1) % N;
/** "pirmā roka": the player on the dealer's left bids and leads first. */
export const firstHand = (s: Pick<ZState, 'dealer'>) => nextSeat(s.dealer);

export interface NewSession {
  players: ZPlayer[];
  rules?: Partial<ZoleRules>;
  seed: number;
  /** first dealer (default: drawn from the seed) */
  dealer?: number;
}

export function newSession(o: NewSession): ZState {
  if (o.players.length !== N) throw new Error('Zole is played by 3 players');
  let st = (o.seed >>> 0) || 1;
  let dealer = o.dealer;
  if (dealer == null) { const [v, n] = rand(st); st = n; dealer = Math.floor(v * N); }
  const base: ZState = {
    v: 1, rules: { ...DEFAULT_RULES, ...o.rules }, players: o.players.map(p => ({ ...p })), rng: st,
    dealNo: 0, dealer: (dealer + N - 1) % N, phase: 'dealOver', turn: 0, hands: [[], [], []], galds: [], discards: [],
    bids: [], declarer: -1, contract: null, trick: [], leader: 0, tricks: [], scores: [0, 0, 0],
    pules: { common: 0, personal: [0, 0, 0] }, sheet: [], result: null, seq: 0,
  };
  return deal(base);
}

/** Start the next deal: the dealer moves one seat to the left, 4 + galds 2 + 4. */
function deal(s: ZState): ZState {
  const dealer = nextSeat(s.dealer);
  const [deck, rng] = shuffle(newDeck(), s.rng);
  const hands: ZCard[][] = [[], [], []];
  const fh = nextSeat(dealer);
  let k = 0;
  for (let i = 0; i < N; i++) { const p = (fh + i) % N; hands[p].push(...deck.slice(k, k + 4)); k += 4; }
  const galds = deck.slice(k, k + 2); k += 2;
  for (let i = 0; i < N; i++) { const p = (fh + i) % N; hands[p].push(...deck.slice(k, k + 4)); k += 4; }
  return {
    ...s, rng, dealNo: s.dealNo + 1, dealer, phase: 'bid', turn: fh, hands, galds, discards: [], bids: [],
    declarer: -1, contract: null, trick: [], leader: fh, tricks: [], result: null, seq: s.seq + 1,
  };
}

/* ------------------------------------------------------------------ queries */

export function legalBids(s: ZState, p: number): Bid[] {
  if (s.phase !== 'bid' || s.turn !== p) return [];
  return s.rules.mazaZole ? ['take', 'zole', 'maza', 'pass'] : ['take', 'zole', 'pass'];
}

/** Cards `p` may play now (empty when it is not p's turn to play). */
export function legalCards(s: ZState, p: number): ZCard[] {
  if (s.phase !== 'play' || s.turn !== p) return [];
  const hand = s.hands[p];
  if (!s.trick.length) return [...hand];
  const led = followSuit(s.trick[0].c);
  const same = hand.filter(c => followSuit(c) === led);
  return same.length ? same : [...hand];
}

/** Card points and tricks taken so far, per seat. */
export function takenBy(s: Pick<ZState, 'tricks'>): { tricks: number[]; pts: number[] } {
  const tricks = [0, 0, 0], pts = [0, 0, 0];
  for (const t of s.tricks) { tricks[t.winner]++; pts[t.winner] += sumPoints(t.plays.map(x => x.c)); }
  return { tricks, pts };
}

/** Team of a seat in the current deal: 'decl' | 'opp' | 'solo' (galdiņš). */
export function teamOf(s: Pick<ZState, 'contract' | 'declarer'>, p: number): 'decl' | 'opp' | 'solo' {
  if (s.contract === 'galdins' || s.declarer < 0) return 'solo';
  return p === s.declarer ? 'decl' : 'opp';
}

/** Live card points of the two sides (declarer incl. discards; zole/maza: table not counted until the end). */
export function sidePoints(s: ZState): { decl: number; opp: number } {
  const { pts } = takenBy(s);
  if (s.declarer < 0) return { decl: 0, opp: 0 };
  const decl = pts[s.declarer] + (s.contract === 'lielais' ? sumPoints(s.discards) : 0);
  const opp = pts.reduce((a, b) => a + b, 0) - pts[s.declarer];
  return { decl, opp };
}

/** Why `a` is not allowed for `p` (null = allowed). */
export function validate(s: ZState, p: number, a: Action): string | null {
  switch (a.type) {
    case 'bid':
      if (s.phase !== 'bid') return 'not bidding';
      if (s.turn !== p) return 'not your turn';
      return legalBids(s, p).includes(a.bid) ? null : 'bid not allowed';
    case 'discard': {
      if (s.phase !== 'discard') return 'not discarding';
      if (s.turn !== p || s.declarer !== p) return 'not your turn';
      const ids = a.ids;
      if (!Array.isArray(ids) || ids.length !== 2 || ids[0] === ids[1]) return 'discard exactly 2 cards';
      return ids.every(id => s.hands[p].some(c => c.id === id)) ? null : 'card not in hand';
    }
    case 'play': {
      if (s.phase !== 'play') return 'not playing';
      if (s.turn !== p) return 'not your turn';
      if (!s.hands[p].some(c => c.id === a.id)) return 'card not in hand';
      return legalCards(s, p).some(c => c.id === a.id) ? null : 'must follow suit';
    }
    case 'next':
      return s.phase === 'dealOver' ? null : 'deal not over';
    case 'finish':
      return s.phase === 'sessionOver' ? 'session over' : null;
  }
  return 'unknown action';
}

/* ------------------------------------------------------------------ scoring */

/** Declarer's points per outcome (each mazais gets −half). */
export const SCORE = {
  lielais: { bezstikis: 6, jani: 4, win: 2, lose: -4, loseJani: -6, loseBezstikis: -8 },
  zole: { bezstikis: 14, jani: 12, win: 10, lose: -12, loseJani: -14, loseBezstikis: -16 },
  maza: { win: 12, lose: -14 },
  galdins: { loser: -4 },
} as const;

/** Outcome of a lielais / zole from the declarer's card points and tricks. */
export function outcomeOf(declPts: number, declTricks: number, totalTricks = 8): Outcome {
  if (declTricks >= totalTricks) return 'bezstikis';
  if (declPts >= 91) return 'jani';
  if (declPts >= 61) return 'win';
  if (declTricks === 0) return 'loseBezstikis';
  if (declPts <= 30) return 'loseJani';
  return 'lose';
}
export const isWin = (o: Outcome | null) => o === 'win' || o === 'jani' || o === 'bezstikis';

/** Zero-sum deal points for a declarer contract. */
export function contractDelta(contract: 'lielais' | 'zole' | 'maza', outcome: Outcome, declarer: number): number[] {
  const v = contract === 'maza' ? (isWin(outcome) ? SCORE.maza.win : SCORE.maza.lose) : SCORE[contract][outcome];
  return [0, 1, 2].map(p => (p === declarer ? v : -v / 2));
}

/** Galdiņš: who loses (most tricks, then most points) and the zero-sum points. */
export function galdinsResult(tricksBy: number[], ptsBy: number[]): { losers: number[]; delta: number[] } {
  const maxT = Math.max(...tricksBy);
  let cand = [0, 1, 2].filter(p => tricksBy[p] === maxT);
  if (cand.length > 1) { const maxP = Math.max(...cand.map(p => ptsBy[p])); cand = cand.filter(p => ptsBy[p] === maxP); }
  const losers = cand;
  const L = SCORE.galdins.loser; // −4
  const delta = [0, 1, 2].map(p => {
    if (losers.length === 1) return losers.includes(p) ? L : -L / 2;
    // two losers fully tied: −2 each, the third +4
    return losers.includes(p) ? L / 2 : -L;
  });
  return { losers, delta };
}

/** Pule settlement after a declarer contract (pules rule). Mutates `pules`, returns the extra points and a note. */
function settlePules(pules: ZState['pules'], declarer: number, won: boolean): { delta: number[]; note: DealResult['puleNote'] } {
  const delta = [0, 0, 0];
  const open = pules.common > 0 || pules.personal.some(x => x > 0);
  if (!open) return { delta, note: null };
  if (!won) { pules.personal[declarer]++; return { delta, note: 'personal' }; }
  if (pules.personal[declarer] > 0) { pules.personal[declarer]--; return { delta, note: 'ownCleared' }; }
  if (pules.common > 0) {
    pules.common--;
    for (let p = 0; p < N; p++) delta[p] = p === declarer ? 2 : -1;
    return { delta, note: 'commonWon' };
  }
  // an opponent's personal pule: the next opponent clockwise that has one pays 3
  for (let i = 1; i < N; i++) {
    const o = (declarer + i) % N;
    if (pules.personal[o] > 0) { pules.personal[o]--; delta[o] = -3; delta[declarer] = 3; return { delta, note: 'personalWon' }; }
  }
  return { delta, note: null };
}

/* ------------------------------------------------------------------ apply */

const remove = (hand: ZCard[], ids: string[]) => hand.filter(c => !ids.includes(c.id));

/** Apply `a` by seat `p`. Returns the same object when the action is not allowed. */
export function apply(s: ZState, p: number, a: Action): ZState {
  if (validate(s, p, a) !== null) return s;
  switch (a.type) {
    case 'bid': return applyBid(s, p, a.bid);
    case 'discard': {
      const ids = [...a.ids];
      const discards = s.hands[p].filter(c => ids.includes(c.id));
      const hands = s.hands.map((h, i) => (i === p ? remove(h, ids) : h));
      const fh = firstHand(s);
      return { ...s, hands, discards, phase: 'play', turn: fh, leader: fh, seq: s.seq + 1 };
    }
    case 'play': return applyPlay(s, p, a.id);
    case 'next': {
      if (s.rules.deals > 0 && s.dealNo >= s.rules.deals) return finishSession(s);
      return deal(s);
    }
    case 'finish': return finishSession(s);
  }
  return s;
}

function applyBid(s: ZState, p: number, bid: Bid): ZState {
  const bids = [...s.bids, { p, bid }];
  const seq = s.seq + 1;
  if (bid === 'take') {
    const hands = s.hands.map((h, i) => (i === p ? [...h, ...s.galds] : h));
    return { ...s, bids, hands, galds: [], declarer: p, contract: 'lielais', phase: 'discard', turn: p, seq };
  }
  if (bid === 'zole' || bid === 'maza') {
    const fh = firstHand(s);
    return { ...s, bids, declarer: p, contract: bid, phase: 'play', turn: fh, leader: fh, seq };
  }
  // pass
  if (bids.length < N) return { ...s, bids, turn: nextSeat(p), seq };
  if (s.rules.pules) {
    // all pass: a common pule, the cards are thrown in
    const pules = { common: s.pules.common + 1, personal: [...s.pules.personal] };
    const result: DealResult = {
      contract: 'pule', declarer: -1, outcome: null, declPts: 0, oppPts: 0, tricksBy: [0, 0, 0], ptsBy: [0, 0, 0],
      losers: [], delta: [0, 0, 0], puleDelta: [0, 0, 0], puleNote: 'added', galdsTo: -1,
    };
    return record({ ...s, bids, pules, contract: null, seq }, result);
  }
  const fh = firstHand(s);
  return { ...s, bids, declarer: -1, contract: 'galdins', phase: 'play', turn: fh, leader: fh, seq };
}

function applyPlay(s: ZState, p: number, id: string): ZState {
  const card = s.hands[p].find(c => c.id === id)!;
  const hands = s.hands.map((h, i) => (i === p ? h.filter(c => c.id !== id) : h));
  const trick = [...s.trick, { p, c: card }];
  const seq = s.seq + 1;
  if (trick.length < N) return { ...s, hands, trick, turn: nextSeat(p), seq };
  const winner = trick[trickWinnerIndex(trick)].p;
  const tricks = [...s.tricks, { leader: s.leader, plays: trick, winner }];
  const next: ZState = { ...s, hands, trick: [], tricks, leader: winner, turn: winner, seq };
  // mazā zole is lost at the declarer's first trick; otherwise all 8 tricks are played
  const over = tricks.length === 8 || (s.contract === 'maza' && winner === s.declarer);
  return over ? endDeal(next) : next;
}

function endDeal(s: ZState): ZState {
  const { tricks: tricksBy, pts } = takenBy(s);
  const ptsBy = [...pts];
  const contract = s.contract!;
  let galdsTo = -1;
  if (contract === 'galdins') {
    galdsTo = s.tricks[s.tricks.length - 1].winner;
    ptsBy[galdsTo] += sumPoints(s.galds);
    const { losers, delta } = galdinsResult(tricksBy, ptsBy);
    const result: DealResult = {
      contract, declarer: -1, outcome: null, declPts: 0, oppPts: 0, tricksBy, ptsBy, losers, delta,
      puleDelta: [0, 0, 0], puleNote: null, galdsTo,
    };
    return record(s, result);
  }
  const d = s.declarer;
  let declPts = ptsBy[d];
  let oppPts = ptsBy.reduce((a, b) => a + b, 0) - ptsBy[d];
  if (contract === 'lielais') declPts += sumPoints(s.discards);
  if (contract === 'zole') oppPts += sumPoints(s.galds);
  let outcome: Outcome;
  if (contract === 'maza') outcome = tricksBy[d] === 0 ? 'win' : 'lose';
  else outcome = outcomeOf(declPts, tricksBy[d]);
  const base = contractDelta(contract, outcome, d);
  const pules = { common: s.pules.common, personal: [...s.pules.personal] };
  const pd = s.rules.pules ? settlePules(pules, d, isWin(outcome)) : { delta: [0, 0, 0], note: null };
  const delta = base.map((v, i) => v + pd.delta[i]);
  const result: DealResult = {
    contract, declarer: d, outcome, declPts, oppPts, tricksBy, ptsBy, losers: [], delta, puleDelta: pd.delta,
    puleNote: pd.note, galdsTo,
  };
  return record({ ...s, pules }, result);
}

/** Write the deal into the score sheet; the session ends after the last deal of a fixed-length session. */
function record(s: ZState, result: DealResult): ZState {
  const scores = s.scores.map((v, i) => v + result.delta[i]);
  const row: SheetRow = {
    deal: s.dealNo, dealer: s.dealer, contract: result.contract, declarer: result.declarer, outcome: result.outcome,
    declPts: result.declPts, oppPts: result.oppPts, delta: result.delta, totals: scores, puleNote: result.puleNote,
    losers: result.losers,
  };
  return { ...s, scores, sheet: [...s.sheet, row], result, phase: 'dealOver', turn: -1 };
}

/** Close the session: personal pules left cost their owners 1 point to each other player. */
function finishSession(s: ZState): ZState {
  if (s.phase === 'sessionOver') return s;
  const left = s.pules.personal;
  let sheet = s.sheet, scores = s.scores;
  if (s.rules.pules && left.some(x => x > 0)) {
    const delta = [0, 1, 2].map(p => -2 * left[p] + [0, 1, 2].filter(o => o !== p).reduce((a, o) => a + left[o], 0));
    scores = scores.map((v, i) => v + delta[i]);
    sheet = [...sheet, {
      deal: s.dealNo, dealer: s.dealer, contract: 'final', declarer: -1, outcome: null, declPts: 0, oppPts: 0, delta,
      totals: scores, puleNote: 'final', losers: [],
    }];
  }
  return { ...s, scores, sheet, phase: 'sessionOver', turn: -1, pules: { common: 0, personal: [0, 0, 0] }, seq: s.seq + 1 };
}

/* ------------------------------------------------------------------ helpers for the UI */

/** Whose action is awaited (null when nobody: deal over / session over). */
export function actor(s: ZState): number | null {
  return s.phase === 'bid' || s.phase === 'discard' || s.phase === 'play' ? s.turn : null;
}

/** Number of deals played so far that produced a score row (pule rows included, the final row excluded). */
export const dealsPlayed = (s: ZState) => s.sheet.filter(r => r.contract !== 'final').length;
