/**
 * Тысяча (Thousand / Tūkstotis) — the Russian trick-taking classic for 3 players. A pure rules engine: no DOM, no
 * clocks, no Math.random. The whole game is one serializable `TState` (plain JSON); every random choice comes from the
 * seeded generator stored in the state (`rng`), so a game replays exactly from its seed + actions.
 *
 * Rules (the common online set, as on the big Russian card-game sites; optional ones are `ThousandRules` toggles):
 *   · 24 cards: A 10 K Q J 9 of ♣ ♠ ♥ ♦ (rank order exactly that). Card points A 11, 10 10, K 4, Q 3, J 2, 9 0 = 120.
 *   · Deal: 7 cards to each player, 3 face down to the "прикуп" (talon). The dealer moves one seat left every deal.
 *   · Bidding: the player on the dealer's left must open at 100. Then, round the table, each player raises (by 5;
 *     by 10 from 200 with `step10`) or passes for good. The last player left is the declarer. With `marriageToBid`
 *     (on by default) a bid above 120 needs a marriage (K+Q of one suit) in hand. Highest bid 300.
 *   · The declarer shows and takes the talon (10 cards), gives one card face down to each opponent (everyone holds 8)
 *     and may raise the contract (same steps; above 120 again needs a marriage in hand).
 *   · Play: the declarer leads the first trick; the trick's winner leads the next. You must follow suit; without the
 *     suit you must trump if you can; otherwise any card. No duty to overtake. Highest trump wins, else the highest
 *     card of the suit led. There is no trump until the first marriage.
 *   · Marriage ("марьяж"): a player on lead — never on the first trick of the deal — who holds K and Q of a suit may lead
 *     one of them and declare it: ♥ 100 · ♦ 80 · ♣ 60 · ♠ 40 points, and that suit becomes trump (a later marriage
 *     changes the trump again). Declaring is optional.
 *   · Scoring: deal points = card points taken + marriages declared. The declarer scores +contract if his deal points
 *     reach it, else −contract. Each opponent scores his deal points rounded to the nearest 5 (…2 down, …3 up).
 *   · Barrel ("бочка", `barrel`, on by default): reaching 880 or more puts a player on the barrel at exactly 880. There
 *     opponent points no longer count; to get off he must make a contract that lifts him to 1000 (a bid of 120+) —
 *     three deals without that (or a smaller contract made) and he falls off: −120. A failed contract drops him to
 *     880 − contract. When a second player climbs onto the barrel, the one already there is knocked off (−120).
 *   · Bolt ("болт", `bolts`, on by default): an opponent who takes no trick and declares no marriage gets a bolt;
 *     the third bolt costs 120 and the count starts again.
 *   · Dump truck ("самосвал", `samosval`, off by default): landing on exactly 555 resets that score to 0.
 *   · The game: the first player to reach 1000 — only as the declarer with the barrel on — wins. Without the barrel
 *     anyone reaching 1000 wins (highest score; a tie goes to the declarer).
 */

/* ------------------------------------------------------------------ cards */

export type Suit = 'C' | 'S' | 'H' | 'D';
export type Rank = 'A' | '10' | 'K' | 'Q' | 'J' | '9';
/** Same shape as the Bridge 125 card (src/engine/engine.ts) so the shared CardView / CardFace render it. */
export interface TCard { id: string; r: Rank; s: Suit }

export const SUITS: Suit[] = ['H', 'D', 'C', 'S'];
export const RANKS: readonly Rank[] = ['A', '10', 'K', 'Q', 'J', '9'];
export const GLYPH: Record<Suit, string> = { C: '♣', S: '♠', H: '♥', D: '♦' };
export const POINTS: Record<Rank, number> = { A: 11, '10': 10, K: 4, Q: 3, J: 2, '9': 0 };
/** Marriage values. */
export const MARRIAGE: Record<Suit, number> = { H: 100, D: 80, C: 60, S: 40 };
export const N = 3;
export const MAX_BID = 300;
export const FORCED_BID = 100;

const mk = (r: Rank, s: Suit): TCard => ({ id: r + s, r, s });
export const card = (id: string): TCard => mk(id.slice(0, -1) as Rank, id.slice(-1) as Suit);

export function newDeck(): TCard[] {
  const out: TCard[] = [];
  for (const s of SUITS) for (const r of RANKS) out.push(mk(r, s));
  return out;
}
export const cardPoints = (c: TCard) => POINTS[c.r];
export const sumPoints = (cs: readonly TCard[]) => cs.reduce((a, c) => a + POINTS[c.r], 0);
/** 0 = strongest (A) … 5 = weakest (9). */
export const rankIdx = (c: TCard) => RANKS.indexOf(c.r);
export const nextSeat = (p: number) => (p + 1) % N;

/** Does `a` beat `b` (b is winning a trick led in `led`, with trump `trump`)? */
export function beats(a: TCard, b: TCard, led: Suit, trump: Suit | null): boolean {
  if (a.s === b.s) return rankIdx(a) < rankIdx(b);
  if (trump && a.s === trump) return true;
  if (trump && b.s === trump) return false;
  return a.s === led && b.s !== led;
}

export interface Play { p: number; c: TCard; m?: boolean }

/** Index (into `plays`) of the play winning the trick so far. */
export function trickWinnerIndex(plays: readonly Play[], trump: Suit | null): number {
  if (!plays.length) return -1;
  const led = plays[0].c.s;
  let w = 0;
  for (let i = 1; i < plays.length; i++) if (beats(plays[i].c, plays[w].c, led, trump)) w = i;
  return w;
}

/** Suits in which `hand` holds both K and Q, best first. */
export function marriagesIn(hand: readonly TCard[]): Suit[] {
  return SUITS.filter(s => hand.some(c => c.s === s && c.r === 'K') && hand.some(c => c.s === s && c.r === 'Q'));
}

/** Display order: ♥ ♠ ♦ ♣ alternating colours (trump first when set), A → 9. */
export function sortHand(cs: readonly TCard[], trump: Suit | null = null): TCard[] {
  const order: Suit[] = ['H', 'S', 'D', 'C'];
  const so = (s: Suit) => (s === trump ? -1 : order.indexOf(s));
  return [...cs].sort((a, b) => so(a.s) - so(b.s) || rankIdx(a) - rankIdx(b));
}

/** Opponent points: rounded to the nearest 5 (…2 → down, …3 → up). */
export const round5 = (v: number) => Math.floor((v + 2) / 5) * 5;

/* ------------------------------------------------------------------ seeded random (mulberry32) */

export function rand(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}
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

export interface ThousandRules {
  /** a bid / contract above 120 needs a marriage in hand */
  marriageToBid: boolean;
  /** from 200 bids go up in steps of 10 */
  step10: boolean;
  /** the barrel at 880 */
  barrel: boolean;
  /** 3 bolts (deals without a trick as an opponent) → −120 */
  bolts: boolean;
  /** landing on exactly 555 → 0 */
  samosval: boolean;
}
export const DEFAULT_RULES: ThousandRules = { marriageToBid: true, step10: false, barrel: true, bolts: true, samosval: false };

export type Phase = 'bid' | 'give' | 'contract' | 'play' | 'dealOver' | 'gameOver';

export interface TPlayer { name: string; bot: boolean }
export interface Trick { leader: number; plays: Play[]; winner: number }
/** A bid: an amount, or 0 = pass. `forced` marks the opening 100. */
export interface BidRec { p: number; bid: number; forced?: boolean }

export type NoteKind = 'barrelOn' | 'barrelStay' | 'barrelFail' | 'barrelOff' | 'barrelPush' | 'bolt' | 'bolt3' | 'samosval' | 'win';
export interface Note { p: number; k: NoteKind; n?: number }

export interface DealResult {
  declarer: number;
  contract: number;
  made: boolean;
  cardPts: number[];
  marPts: number[];
  /** card points + marriages */
  pts: number[];
  tricksBy: number[];
  /** score change per seat (penalties included) */
  delta: number[];
  notes: Note[];
}

export interface SheetRow {
  deal: number;
  dealer: number;
  declarer: number;
  contract: number;
  made: boolean;
  pts: number[];
  delta: number[];
  /** totals after this row */
  totals: number[];
  barrel: (number | null)[];
  bolts: number[];
  notes: Note[];
}

export interface TState {
  v: 1;
  rules: ThousandRules;
  players: TPlayer[];
  rng: number;
  dealNo: number;
  dealer: number;
  phase: Phase;
  turn: number;
  hands: TCard[][];
  /** the face-down talon (emptied when the declarer takes it) */
  talon: TCard[];
  /** the talon as it was shown to everybody (after the bidding) */
  talonShown: TCard[];
  /** the declarer's gifts (each card is known to the declarer and its receiver only) */
  gives: { to: number; c: TCard }[];
  bids: BidRec[];
  passed: boolean[];
  high: number;
  highBy: number;
  declarer: number;
  /** the final contract (0 until set) */
  contract: number;
  trump: Suit | null;
  marriages: { p: number; s: Suit }[];
  trick: Play[];
  leader: number;
  tricks: Trick[];
  scores: number[];
  /** deals spent on the barrel (null = not on it) */
  barrel: (number | null)[];
  bolts: number[];
  sheet: SheetRow[];
  result: DealResult | null;
  /** the seat that reached 1000 (−1 none) */
  winner: number;
  /** the game was ended early (resigned) */
  resigned?: boolean;
  seq: number;
}

export type Action =
  | { type: 'bid'; amount: number }        // 0 = pass
  | { type: 'give'; ids: string[] }        // [to the next seat, to the one after]
  | { type: 'contract'; amount: number }
  | { type: 'play'; id: string; marriage?: boolean }
  | { type: 'next' }
  | { type: 'finish' };

export const firstHand = (s: Pick<TState, 'dealer'>) => nextSeat(s.dealer);

export interface NewGame { players: TPlayer[]; rules?: Partial<ThousandRules>; seed: number; dealer?: number }

export function newGame(o: NewGame): TState {
  if (o.players.length !== N) throw new Error('Thousand is played by 3 players');
  let st = (o.seed >>> 0) || 1;
  let dealer = o.dealer;
  if (dealer == null) { const [v, n] = rand(st); st = n; dealer = Math.floor(v * N); }
  const base: TState = {
    v: 1, rules: { ...DEFAULT_RULES, ...o.rules }, players: o.players.map(p => ({ ...p })), rng: st,
    dealNo: 0, dealer: (dealer + N - 1) % N, phase: 'dealOver', turn: -1, hands: [[], [], []], talon: [], talonShown: [], gives: [],
    bids: [], passed: [false, false, false], high: 0, highBy: -1, declarer: -1, contract: 0, trump: null, marriages: [],
    trick: [], leader: 0, tricks: [], scores: [0, 0, 0], barrel: [null, null, null], bolts: [0, 0, 0], sheet: [], result: null,
    winner: -1, seq: 0,
  };
  return deal(base);
}

/** The deal: one card at a time from the dealer's left; the talon's 3 cards go down after the first round. */
function deal(s: TState): TState {
  const dealer = nextSeat(s.dealer);
  const [deck, rng] = shuffle(newDeck(), s.rng);
  const hands: TCard[][] = [[], [], []];
  const fh = nextSeat(dealer);
  const talon: TCard[] = [];
  let k = 0;
  for (let round = 0; round < 7; round++) {
    for (let i = 0; i < N; i++) hands[(fh + i) % N].push(deck[k++]);
    if (round === 0) talon.push(deck[k++], deck[k++], deck[k++]);
  }
  return {
    ...s, rng, dealNo: s.dealNo + 1, dealer, phase: 'bid', hands, talon, talonShown: [], gives: [],
    bids: [{ p: fh, bid: FORCED_BID, forced: true }], passed: [false, false, false], high: FORCED_BID, highBy: fh, turn: nextSeat(fh),
    declarer: -1, contract: 0, trump: null, marriages: [], trick: [], leader: fh, tricks: [], result: null, seq: s.seq + 1,
  };
}

/* ------------------------------------------------------------------ queries */

export const stepAt = (rules: ThousandRules, v: number) => (rules.step10 && v >= 200 ? 10 : 5);
const nextAmount = (rules: ThousandRules, v: number) => v + stepAt(rules, v);

/** The highest amount a hand may bid / contract. */
export function maxBidFor(rules: ThousandRules, hand: readonly TCard[]): number {
  return rules.marriageToBid && marriagesIn(hand).length === 0 ? 120 : MAX_BID;
}

/** Amounts a hand may name, from `from` (inclusive) up. */
function amountsFrom(rules: ThousandRules, from: number, max: number): number[] {
  const out: number[] = [];
  for (let v = from; v <= max; v = nextAmount(rules, v)) out.push(v);
  return out;
}

/** Raises `p` may bid now (pass = 0 is always allowed on his turn). */
export function bidOptions(s: TState, p: number): number[] {
  if (s.phase !== 'bid' || s.turn !== p) return [];
  return amountsFrom(s.rules, nextAmount(s.rules, s.high), maxBidFor(s.rules, s.hands[p]));
}

/** Contracts the declarer may announce after the talon (the won bid first). */
export function contractOptions(s: TState, p: number): number[] {
  if (s.phase !== 'contract' || s.turn !== p || s.declarer !== p) return [];
  const max = Math.max(s.high, maxBidFor(s.rules, s.hands[p]));
  return [s.high, ...amountsFrom(s.rules, nextAmount(s.rules, s.high), max)];
}

/** Cards `p` may play now. */
export function legalCards(s: TState, p: number): TCard[] {
  if (s.phase !== 'play' || s.turn !== p) return [];
  const hand = s.hands[p];
  if (!s.trick.length) return [...hand];
  const led = s.trick[0].c.s;
  const same = hand.filter(c => c.s === led);
  if (same.length) return same;
  if (s.trump) { const tr = hand.filter(c => c.s === s.trump); if (tr.length) return tr; }
  return [...hand];
}

/** May `p` declare a marriage by leading `c` now? */
export function canDeclare(s: TState, p: number, c: TCard): boolean {
  if (s.phase !== 'play' || s.turn !== p || s.trick.length > 0 || s.tricks.length === 0) return false;
  if (c.r !== 'K' && c.r !== 'Q') return false;
  const other = c.r === 'K' ? 'Q' : 'K';
  return s.hands[p].some(x => x.id === c.id) && s.hands[p].some(x => x.s === c.s && x.r === other);
}

/** Tricks, card points and marriage points per seat so far. */
export function takenBy(s: Pick<TState, 'tricks' | 'marriages'>): { tricks: number[]; cards: number[]; mar: number[]; pts: number[] } {
  const tricks = [0, 0, 0], cards = [0, 0, 0], mar = [0, 0, 0];
  for (const t of s.tricks) { tricks[t.winner]++; cards[t.winner] += sumPoints(t.plays.map(x => x.c)); }
  for (const m of s.marriages) mar[m.p] += MARRIAGE[m.s];
  return { tricks, cards, mar, pts: cards.map((v, i) => v + mar[i]) };
}

export function validate(s: TState, p: number, a: Action): string | null {
  switch (a.type) {
    case 'bid':
      if (s.phase !== 'bid') return 'not bidding';
      if (s.turn !== p) return 'not your turn';
      if (a.amount === 0) return null;
      return bidOptions(s, p).includes(a.amount) ? null : 'bid not allowed';
    case 'give': {
      if (s.phase !== 'give') return 'not giving';
      if (s.turn !== p || s.declarer !== p) return 'not your turn';
      const ids = a.ids;
      if (!Array.isArray(ids) || ids.length !== 2 || ids[0] === ids[1]) return 'give exactly 2 cards';
      return ids.every(id => s.hands[p].some(c => c.id === id)) ? null : 'card not in hand';
    }
    case 'contract':
      if (s.phase !== 'contract') return 'not contracting';
      if (s.turn !== p) return 'not your turn';
      return contractOptions(s, p).includes(a.amount) ? null : 'contract not allowed';
    case 'play': {
      if (s.phase !== 'play') return 'not playing';
      if (s.turn !== p) return 'not your turn';
      const c = s.hands[p].find(x => x.id === a.id);
      if (!c) return 'card not in hand';
      if (!legalCards(s, p).some(x => x.id === a.id)) return s.trick.length && s.hands[p].some(x => x.s === s.trick[0].c.s) ? 'must follow suit' : 'must trump';
      if (a.marriage && !canDeclare(s, p, c)) return 'no marriage';
      return null;
    }
    case 'next':
      return s.phase === 'dealOver' ? null : 'deal not over';
    case 'finish':
      return s.phase === 'gameOver' ? 'game over' : null;
  }
  return 'unknown action';
}

/* ------------------------------------------------------------------ apply */

export function apply(s: TState, p: number, a: Action): TState {
  if (validate(s, p, a) !== null) return s;
  switch (a.type) {
    case 'bid': return applyBid(s, p, a.amount);
    case 'give': {
      const d = s.declarer;
      const to = [nextSeat(d), nextSeat(nextSeat(d))];
      const cs = a.ids.map(id => s.hands[d].find(c => c.id === id)!);
      const hands = s.hands.map((h, i) => (i === d ? h.filter(c => !a.ids.includes(c.id)) : i === to[0] ? [...h, cs[0]] : i === to[1] ? [...h, cs[1]] : h));
      return { ...s, hands, gives: [{ to: to[0], c: cs[0] }, { to: to[1], c: cs[1] }], phase: 'contract', turn: d, seq: s.seq + 1 };
    }
    case 'contract':
      return { ...s, contract: a.amount, phase: 'play', turn: s.declarer, leader: s.declarer, seq: s.seq + 1 };
    case 'play': return applyPlay(s, p, a.id, !!a.marriage);
    case 'next': return deal(s);
    case 'finish': return { ...s, phase: 'gameOver', turn: -1, resigned: s.winner < 0, seq: s.seq + 1 };
  }
  return s;
}

function applyBid(s: TState, p: number, amount: number): TState {
  const bids = [...s.bids, { p, bid: amount }];
  const passed = [...s.passed];
  let { high, highBy } = s;
  if (amount === 0) passed[p] = true;
  else { high = amount; highBy = p; }
  const active = [0, 1, 2].filter(q => !passed[q]);
  const seq = s.seq + 1;
  if (active.length <= 1) {
    // the declarer shows the talon and takes it
    const d = highBy;
    const hands = s.hands.map((h, i) => (i === d ? [...h, ...s.talon] : h));
    return { ...s, bids, passed, high, highBy, declarer: d, hands, talonShown: [...s.talon], talon: [], phase: 'give', turn: d, seq };
  }
  let q = nextSeat(p);
  while (passed[q]) q = nextSeat(q);
  return { ...s, bids, passed, high, highBy, turn: q, seq };
}

function applyPlay(s: TState, p: number, id: string, marriage: boolean): TState {
  const c = s.hands[p].find(x => x.id === id)!;
  let { trump, marriages } = s;
  if (marriage) { trump = c.s; marriages = [...marriages, { p, s: c.s }]; }
  const hands = s.hands.map((h, i) => (i === p ? h.filter(x => x.id !== id) : h));
  const trick = [...s.trick, marriage ? { p, c, m: true } : { p, c }];
  const seq = s.seq + 1;
  if (trick.length < N) return { ...s, hands, trick, trump, marriages, turn: nextSeat(p), seq };
  const winner = trick[trickWinnerIndex(trick, trump)].p;
  const tricks = [...s.tricks, { leader: s.leader, plays: trick, winner }];
  const next: TState = { ...s, hands, trick: [], tricks, trump, marriages, leader: winner, turn: winner, seq };
  return tricks.length === 8 ? endDeal(next) : next;
}

/* ------------------------------------------------------------------ scoring */

export interface ScoreIn {
  rules: ThousandRules;
  scores: number[];
  barrel: (number | null)[];
  bolts: number[];
  declarer: number;
  contract: number;
  /** deal points (cards + marriages) */
  pts: number[];
  /** tricks taken (for bolts) */
  tricks: number[];
}
export interface ScoreOut { scores: number[]; barrel: (number | null)[]; bolts: number[]; delta: number[]; notes: Note[]; winner: number; made: boolean }

export const BARREL_AT = 880;
export const GOAL = 1000;
export const PENALTY = 120;
export const BARREL_TRIES = 3;

/** One deal's scoring — barrel, bolts and the dump truck included. Pure (exported for tests). */
export function scoreDeal(o: ScoreIn): ScoreOut {
  const { rules, declarer: d, contract } = o;
  const made = o.pts[d] >= contract;
  const scores = [...o.scores], barrel = [...o.barrel], bolts = [...o.bolts];
  const notes: Note[] = [];
  const reached: number[] = [];
  const landed: number[] = [];
  for (let p = 0; p < N; p++) {
    const old = o.scores[p];
    const onB = rules.barrel && barrel[p] != null;
    let gain = p === d ? (made ? contract : -contract) : (onB ? 0 : round5(o.pts[p]));
    // bolt: an opponent with no trick and no marriage (not counted on the barrel)
    if (rules.bolts && p !== d && !onB && o.tricks[p] === 0 && o.pts[p] === 0) {
      bolts[p]++;
      if (bolts[p] >= 3) { bolts[p] = 0; gain -= PENALTY; notes.push({ p, k: 'bolt3' }); }
      else notes.push({ p, k: 'bolt', n: bolts[p] });
    }
    let nw = old + gain;
    if (rules.barrel) {
      if (onB) {
        if (p === d && made && old + contract >= GOAL) { nw = old + contract; barrel[p] = null; reached.push(p); }
        else if (p === d && !made) { nw = old - contract; barrel[p] = null; notes.push({ p, k: 'barrelOff' }); }
        else {
          nw = old;
          barrel[p] = barrel[p]! + 1;
          if (barrel[p]! >= BARREL_TRIES) { nw = old - PENALTY; barrel[p] = null; notes.push({ p, k: 'barrelFail' }); }
          else notes.push({ p, k: 'barrelStay', n: barrel[p]! });
        }
      } else if (nw >= GOAL && p === d) {
        reached.push(p);
      } else if (nw >= BARREL_AT) {
        nw = BARREL_AT; barrel[p] = 0; landed.push(p); notes.push({ p, k: 'barrelOn' });
      }
    } else if (nw >= GOAL) reached.push(p);
    if (rules.samosval && nw === 555) { nw = 0; notes.push({ p, k: 'samosval' }); }
    scores[p] = nw;
  }
  // a newcomer on the barrel knocks off whoever was already sitting there
  if (landed.length) {
    for (let p = 0; p < N; p++) {
      if (landed.includes(p) || barrel[p] == null) continue;
      barrel[p] = null; scores[p] -= PENALTY;
      for (let i = notes.length - 1; i >= 0; i--) if (notes[i].p === p && notes[i].k === 'barrelStay') notes.splice(i, 1);
      notes.push({ p, k: 'barrelPush' });
    }
  }
  let winner = -1;
  if (reached.length) {
    const best = Math.max(...reached.map(p => scores[p]));
    const top = reached.filter(p => scores[p] === best);
    winner = top.includes(d) ? d : top[0];
    notes.push({ p: winner, k: 'win' });
  }
  return { scores, barrel, bolts, delta: scores.map((v, i) => v - o.scores[i]), notes, winner, made };
}

function endDeal(s: TState): TState {
  const t = takenBy(s);
  const out = scoreDeal({
    rules: s.rules, scores: s.scores, barrel: s.barrel, bolts: s.bolts, declarer: s.declarer, contract: s.contract, pts: t.pts, tricks: t.tricks,
  });
  const result: DealResult = {
    declarer: s.declarer, contract: s.contract, made: out.made, cardPts: t.cards, marPts: t.mar, pts: t.pts, tricksBy: t.tricks,
    delta: out.delta, notes: out.notes,
  };
  const row: SheetRow = {
    deal: s.dealNo, dealer: s.dealer, declarer: s.declarer, contract: s.contract, made: out.made, pts: t.pts, delta: out.delta,
    totals: out.scores, barrel: out.barrel, bolts: out.bolts, notes: out.notes,
  };
  return {
    ...s, scores: out.scores, barrel: out.barrel, bolts: out.bolts, sheet: [...s.sheet, row], result, winner: out.winner,
    phase: out.winner >= 0 ? 'gameOver' : 'dealOver', turn: -1,
  };
}

/* ------------------------------------------------------------------ UI helpers */

export function actor(s: TState): number | null {
  return s.phase === 'bid' || s.phase === 'give' || s.phase === 'contract' || s.phase === 'play' ? s.turn : null;
}
/** Last thing a seat said in the bidding (undefined = nothing yet). */
export function lastBid(s: TState, p: number): BidRec | undefined {
  for (let i = s.bids.length - 1; i >= 0; i--) if (s.bids[i].p === p) return s.bids[i];
  return undefined;
}
/** Standing: seats by score, best first (ties: seat order). */
export const standing = (s: Pick<TState, 'scores'>) => [0, 1, 2].sort((a, b) => s.scores[b] - s.scores[a] || a - b);

/** Facts for quests / achievements from the finished game (seat 0 = the player). */
export function gameDetails(g: TState): Record<string, number | boolean | string> {
  const mine = g.sheet.filter(r => r.declarer === 0);
  const made = mine.filter(r => r.made);
  return {
    deals: g.sheet.length,
    declared: mine.length,
    made: made.length,
    best_contract: made.reduce((a, r) => Math.max(a, r.contract), 0),
    barrel: g.sheet.some(r => r.notes.some(n => n.p === 0 && n.k === 'barrelOn')),
    bolts: g.sheet.reduce((a, r) => a + r.notes.filter(n => n.p === 0 && (n.k === 'bolt' || n.k === 'bolt3')).length, 0),
    resigned: !!g.resigned,
    place: standing(g).indexOf(0) + 1,
  };
}
