// Durak (Дурак) — pure rules engine. No DOM, no Date, no Math.random: every state is plain JSON and every step is
// deterministic, so the same seed replays the same game (and the state can travel over the wire for online play later).
//
// Model: a bout is turn-based. The attacker leads; the defender answers one card at a time (beat / transfer / take);
// when every attack card is covered — or the defender has said "take" — the throwers (attacker first, then the others
// clockwise, never the defender) may throw in cards whose rank is already on the table, or pass. Players who cannot
// throw anything are skipped automatically. When nobody throws any more the bout waits in phase 'resolve' until the
// table (or a server) applies `{ type: 'resolve' }` — so the last card can land before the cards leave the table.

export type Suit = 'S' | 'C' | 'H' | 'D';
export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export interface Card { id: string; r: Rank; s: Suit }

export const SUITS: Suit[] = ['S', 'C', 'H', 'D'];
export const RANKS: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SUIT_GLYPH: Record<Suit, string> = { S: '♠', C: '♣', H: '♥', D: '♦' };
export const isRed = (s: Suit) => s === 'H' || s === 'D';
export const rankIdx = (r: Rank) => RANKS.indexOf(r);
export const HAND = 6;
export const MAX_PAIRS = 6;

export interface DurakRules {
  /** "perevodnoy": the defender may pass the attack on with a card of the same rank */
  transfer: boolean;
  /** 36 cards (6–A) or 24 cards (9–A) */
  deck: 36 | 24;
}

export interface DPlayer {
  id: string; name: string; bot: boolean;
  hand: Card[];
  /** out of cards with the talon empty: finished, not the durak */
  out: boolean;
  /** finishing place (1 = first out); null while playing (the durak keeps null) */
  place: number | null;
}

export interface Pair { a: Card; d: Card | null }

export type Action =
  /** lead (empty table, one or more cards of one rank) or throw in (ranks already on the table) */
  | { type: 'attack'; cards: string[] }
  /** cover the attack card at table index `target` */
  | { type: 'defend'; card: string; target: number }
  /** perevodnoy: add a card of the same rank and pass the defence on to the next player */
  | { type: 'transfer'; card: string }
  /** defender gives up the bout (throwers may still add cards) */
  | { type: 'take' }
  /** a thrower stops throwing (the attacker's pass with everything covered is "Bito") */
  | { type: 'pass' }
  /** system step after the bout: discard or pick up, draw up to six, next bout (seat is ignored) */
  | { type: 'resolve' };

export type DurakEvent =
  | { t: 'start'; p: number; card: Card | null }
  | { t: 'attack'; p: number; cards: Card[]; lead: boolean }
  | { t: 'defend'; p: number; card: Card; target: number }
  | { t: 'transfer'; p: number; card: Card; to: number }
  | { t: 'take'; p: number }
  | { t: 'pass'; p: number; bito: boolean }
  | { t: 'beaten'; p: number; cards: Card[] }
  | { t: 'took'; p: number; cards: Card[] }
  | { t: 'draw'; draws: { p: number; ids: string[] }[] }
  | { t: 'out'; p: number; place: number }
  | { t: 'over'; durak: number | null; pogony: boolean };

export type Phase = 'play' | 'resolve' | 'over';

export interface DurakState {
  v: 1;
  seed: number;
  /** increases with every applied action */
  seq: number;
  rules: DurakRules;
  players: DPlayer[];
  /** index 0 = top of the talon; the last card lies face up under it (the trump card) */
  talon: Card[];
  trump: Suit;
  /** the card that showed the trump (stays visible while it is in the talon) */
  trumpCard: Card;
  discard: Card[];
  table: Pair[];
  /** who leads / throws first in this bout (after a transfer: the player who transferred) */
  attacker: number;
  defender: number;
  /** who opened the bout (draws first afterwards) */
  lead: number;
  /** most attack cards this bout: min(6, defender's hand when the bout started) */
  limit: number;
  /** the defender said "take" */
  taking: boolean;
  /** whose move (-1 while the bout waits for 'resolve' or the game is over) */
  turn: number;
  /** throwers that passed in the current throw-in round */
  passed: number[];
  phase: Phase;
  resolution: null | 'beaten' | 'taken';
  bout: number;
  /** public memory: cards everyone saw go into a hand (picked up, the drawn trump card), per seat */
  known: string[][];
  events: DurakEvent[];
  /** seat of the durak once the game is over (null: a draw — the last players went out together) */
  durak: number | null;
  /** the last attack contained sixes and the durak took/beat them last — "pogony" (epaulettes) */
  pogony: boolean;
}

/* ------------------------------------------------------------------ rng */

/** mulberry32 — small, fast, seedable. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeDeck(size: 36 | 24): Card[] {
  const ranks = size === 24 ? RANKS.slice(3) : RANKS;
  const out: Card[] = [];
  for (const s of SUITS) for (const r of ranks) out.push({ id: r + s, r, s });
  return out;
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------------------------------------------ card helpers */

/** `b` beats `a` with trump `trump`. */
export function beats(b: Card, a: Card, trump: Suit): boolean {
  if (b.s === a.s) return rankIdx(b.r) > rankIdx(a.r);
  return b.s === trump && a.s !== trump;
}

/** Order for showing a hand: plain suits (alternating colours), trumps last; low to high inside a suit. */
export function sortHand(hand: Card[], trump: Suit): Card[] {
  const order = (['S', 'H', 'C', 'D'] as Suit[]).filter(s => s !== trump);
  const so = (s: Suit) => (s === trump ? 9 : order.indexOf(s));
  return hand.slice().sort((x, y) => so(x.s) - so(y.s) || rankIdx(x.r) - rankIdx(y.r));
}

export const cardLabel = (c: Card) => `${c.r}${SUIT_GLYPH[c.s]}`;

/* ------------------------------------------------------------------ new game */

export interface NewGameOpts {
  players: { name: string; bot: boolean }[];
  rules?: Partial<DurakRules>;
  seed?: number;
}

export function newGame(o: NewGameOpts): DurakState {
  const rules: DurakRules = { transfer: !!o.rules?.transfer, deck: o.rules?.deck === 24 ? 24 : 36 };
  const n = o.players.length;
  if (n < 2 || n * HAND > rules.deck) throw new Error(`durak: ${n} players do not fit a ${rules.deck}-card deck`);
  const seed = (o.seed ?? 1) >>> 0;
  const rand = rng(seed);
  const deck = shuffle(makeDeck(rules.deck), rand);
  const players: DPlayer[] = o.players.map((p, i) => ({ id: `p${i}`, name: p.name, bot: p.bot, hand: [], out: false, place: null }));
  // deal one card at a time, round-robin
  for (let k = 0; k < HAND; k++) for (let i = 0; i < n; i++) players[i].hand.push(deck.shift()!);
  // the trump: bottom card of the talon — or, when every card was dealt, the last card dealt (it stays in that hand)
  const trumpCard = deck.length ? deck[deck.length - 1] : players[n - 1].hand[HAND - 1];
  const trump = trumpCard.s;
  const known = players.map(() => [] as string[]);
  if (!deck.length) known[n - 1].push(trumpCard.id);
  // the lowest trump leads; nobody has a trump → the lowest card (ties by suit order)
  let first = 0, best: Card | null = null;
  const better = (c: Card, b: Card | null) => {
    if (!b) return true;
    const ct = c.s === trump, bt = b.s === trump;
    if (ct !== bt) return ct;
    return rankIdx(c.r) < rankIdx(b.r) || (rankIdx(c.r) === rankIdx(b.r) && SUITS.indexOf(c.s) < SUITS.indexOf(b.s));
  };
  players.forEach((p, i) => p.hand.forEach(c => { if (better(c, best)) { best = c; first = i; } }));
  const lowTrump = (best as Card | null)?.s === trump ? best : null;
  const defender = (first + 1) % n;
  return {
    v: 1, seed, seq: 0, rules, players, talon: deck, trump, trumpCard, discard: [], table: [],
    attacker: first, defender, lead: first, limit: Math.min(MAX_PAIRS, players[defender].hand.length),
    taking: false, turn: first, passed: [], phase: 'play', resolution: null, bout: 1, known,
    events: [{ t: 'start', p: first, card: lowTrump }], durak: null, pogony: false,
  };
}

/* ------------------------------------------------------------------ queries */

/** next seat after `i` that is still in the game */
export function nextActive(s: DurakState, i: number): number {
  const n = s.players.length;
  for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (!s.players[j].out) return j; }
  return i;
}

export const uncovered = (s: DurakState) => s.table.filter(p => !p.d).length;
export const tableRanks = (s: DurakState) => new Set(s.table.flatMap(p => (p.d ? [p.a.r, p.d.r] : [p.a.r])));

/** throw-in order: the attacker, then clockwise, never the defender, never a finished player */
export function throwOrder(s: DurakState): number[] {
  const n = s.players.length, out: number[] = [];
  for (let k = 0; k < n; k++) {
    const j = (s.attacker + k) % n;
    if (j !== s.defender && !s.players[j].out) out.push(j);
  }
  return out;
}

/** cards `seat` could throw in right now (ignores whose turn it is) */
export function throwable(s: DurakState, seat: number): Card[] {
  if (seat === s.defender || s.table.length >= s.limit || !s.table.length) return [];
  const rk = tableRanks(s);
  return s.players[seat].hand.filter(c => rk.has(c.r));
}

/** whether the defender may transfer with `card` right now */
export function canTransferWith(s: DurakState, card: Card): boolean {
  if (!s.rules.transfer || s.taking || !s.table.length || s.table.some(p => p.d)) return false;
  const r = s.table[0].a.r;
  if (card.r !== r || s.table.some(p => p.a.r !== r)) return false;
  const to = nextActive(s, s.defender);
  if (to === s.defender) return false;
  const total = s.table.length + 1;
  return total <= MAX_PAIRS && s.players[to].hand.length >= total;
}

/** throw-in round: the first thrower (in order) who has not passed and can throw something */
function nextThrower(s: DurakState): number {
  for (const p of throwOrder(s)) if (!s.passed.includes(p) && throwable(s, p).length) return p;
  return -1;
}

/** Every legal action for `seat` (empty when it is not their move). Bots and tests use this. */
export function legalActions(s: DurakState, seat: number): Action[] {
  if (s.phase !== 'play' || s.turn !== seat) return [];
  const hand = s.players[seat].hand;
  const out: Action[] = [];
  if (seat === s.defender && !s.taking && uncovered(s) > 0) {
    s.table.forEach((p, i) => {
      if (p.d) return;
      for (const c of hand) if (beats(c, p.a, s.trump)) out.push({ type: 'defend', card: c.id, target: i });
    });
    for (const c of hand) if (canTransferWith(s, c)) out.push({ type: 'transfer', card: c.id });
    out.push({ type: 'take' });
    return out;
  }
  if (!s.table.length) {
    // lead: any card, or several of one rank (up to the limit)
    const byRank = new Map<Rank, Card[]>();
    for (const c of hand) byRank.set(c.r, [...(byRank.get(c.r) ?? []), c]);
    for (const cs of byRank.values()) {
      for (const c of cs) out.push({ type: 'attack', cards: [c.id] });
      // multi-card leads: every subset of size ≥2 of the same rank, capped by the limit
      const subsets = (arr: Card[]): Card[][] => arr.reduce<Card[][]>((acc, c) => acc.concat(acc.map(x => [...x, c])), [[]]);
      for (const sub of subsets(cs)) if (sub.length >= 2 && sub.length <= s.limit) out.push({ type: 'attack', cards: sub.map(c => c.id) });
    }
    return out;
  }
  for (const c of throwable(s, seat)) out.push({ type: 'attack', cards: [c.id] });
  out.push({ type: 'pass' });
  return out;
}

/** null when legal, else a short reason (for tests / debugging). */
export function validate(s: DurakState, seat: number, a: Action): string | null {
  if (a.type === 'resolve') return s.phase === 'resolve' ? null : 'nothing to resolve';
  if (s.phase !== 'play') return 'not playing';
  if (s.turn !== seat) return 'not your turn';
  const hand = s.players[seat].hand;
  const find = (id: string) => hand.find(c => c.id === id);
  const defending = seat === s.defender && !s.taking && uncovered(s) > 0;
  switch (a.type) {
    case 'attack': {
      if (defending) return 'defender cannot attack';
      if (!Array.isArray(a.cards) || !a.cards.length || new Set(a.cards).size !== a.cards.length) return 'bad cards';
      const cs = a.cards.map(find);
      if (cs.some(c => !c)) return 'card not in hand';
      if (s.table.length + cs.length > s.limit) return 'too many cards';
      if (!s.table.length) return cs.every(c => c!.r === cs[0]!.r) ? null : 'lead must be one rank';
      const rk = tableRanks(s);
      return cs.every(c => rk.has(c!.r)) ? null : 'rank not on the table';
    }
    case 'defend': {
      if (!defending) return 'not defending';
      const c = find(a.card); const p = s.table[a.target];
      if (!c || !p || p.d) return 'bad target';
      return beats(c, p.a, s.trump) ? null : 'does not beat';
    }
    case 'transfer': {
      if (!defending) return 'not defending';
      const c = find(a.card);
      return c && canTransferWith(s, c) ? null : 'cannot transfer';
    }
    case 'take': return defending ? null : 'not defending';
    case 'pass': return !defending && s.table.length > 0 ? null : 'cannot pass now';
    default: return 'unknown action';
  }
}

/* ------------------------------------------------------------------ apply */

const clone = (s: DurakState): DurakState => ({
  ...s,
  players: s.players.map(p => ({ ...p, hand: p.hand.slice() })),
  talon: s.talon.slice(), discard: s.discard.slice(), table: s.table.map(p => ({ ...p })),
  passed: s.passed.slice(), known: s.known.map(k => k.slice()), events: [],
});

/** After a change on the table: whose move is it, or is the bout over? */
function advance(s: DurakState) {
  if (!s.taking && uncovered(s) > 0) { s.turn = s.defender; return; }
  const t = nextThrower(s);
  if (t >= 0) { s.turn = t; return; }
  s.turn = -1;
  s.phase = 'resolve';
  s.resolution = s.taking ? 'taken' : 'beaten';
}

const takeFromHand = (s: DurakState, seat: number, id: string): Card => {
  const h = s.players[seat].hand;
  const i = h.findIndex(c => c.id === id);
  const [c] = h.splice(i, 1);
  const k = s.known[seat].indexOf(id);
  if (k >= 0) s.known[seat].splice(k, 1);
  return c;
};

/** Apply an action. Illegal → the same state object comes back unchanged. */
export function apply(prev: DurakState, seat: number, a: Action): DurakState {
  if (validate(prev, seat, a) !== null) return prev;
  if (a.type === 'resolve') return resolve(prev);
  const s = clone(prev);
  s.seq++;
  switch (a.type) {
    case 'attack': {
      const lead = !s.table.length;
      const cards = a.cards.map(id => takeFromHand(s, seat, id));
      for (const c of cards) s.table.push({ a: c, d: null });
      s.events.push({ t: 'attack', p: seat, cards, lead });
      break;
    }
    case 'defend': {
      const c = takeFromHand(s, seat, a.card);
      s.table[a.target].d = c;
      s.events.push({ t: 'defend', p: seat, card: c, target: a.target });
      // new ranks on the table: everybody may throw again
      if (!uncovered(s)) s.passed = [];
      break;
    }
    case 'transfer': {
      const c = takeFromHand(s, seat, a.card);
      s.table.push({ a: c, d: null });
      const to = nextActive(s, s.defender);
      s.events.push({ t: 'transfer', p: seat, card: c, to });
      s.attacker = s.defender;
      s.defender = to;
      s.limit = Math.min(MAX_PAIRS, s.players[to].hand.length);
      s.passed = [];
      break;
    }
    case 'take': {
      s.taking = true;
      s.passed = [];
      s.events.push({ t: 'take', p: seat });
      break;
    }
    case 'pass': {
      s.passed.push(seat);
      s.events.push({ t: 'pass', p: seat, bito: seat === s.attacker && !s.taking });
      break;
    }
  }
  advance(s);
  return s;
}

function resolve(prev: DurakState): DurakState {
  const s = clone(prev);
  s.seq++;
  const n = s.players.length;
  const cards = s.table.flatMap(p => (p.d ? [p.a, p.d] : [p.a]));
  const sixes = s.table.some(p => p.a.r === '6');
  const def = s.defender;
  let next: number;
  if (s.resolution === 'taken') {
    s.players[def].hand.push(...cards);
    s.known[def].push(...cards.map(c => c.id));
    s.events.push({ t: 'took', p: def, cards });
    next = def; // the attack passes over the defender
  } else {
    s.discard.push(...cards);
    s.events.push({ t: 'beaten', p: def, cards });
    next = -1; // the defender attacks next (or the next active player if they are out)
  }
  s.table = [];
  // draw up to six: the opener first, the others clockwise, the defender last
  const order: number[] = [];
  for (let k = 0; k < n; k++) { const j = (s.lead + k) % n; if (j !== def && !s.players[j].out) order.push(j); }
  order.push(def);
  const draws: { p: number; ids: string[] }[] = [];
  for (const p of order) {
    const pl = s.players[p];
    const ids: string[] = [];
    while (pl.hand.length < HAND && s.talon.length) {
      const c = s.talon.shift()!;
      pl.hand.push(c);
      ids.push(c.id);
      if (c.id === s.trumpCard.id) s.known[p].push(c.id);
    }
    if (ids.length) draws.push({ p, ids });
  }
  if (draws.length) s.events.push({ t: 'draw', draws });
  // who is out
  if (!s.talon.length) {
    let place = s.players.filter(p => p.out).length;
    for (const p of order) {
      const pl = s.players[p];
      if (!pl.out && !pl.hand.length) { pl.out = true; pl.place = ++place; s.events.push({ t: 'out', p, place }); }
    }
  }
  const active = s.players.map((_, i) => i).filter(i => !s.players[i].out);
  s.passed = []; s.taking = false; s.resolution = null;
  if (active.length <= 1) {
    s.phase = 'over'; s.turn = -1;
    s.durak = active.length ? active[0] : null;
    s.pogony = s.durak !== null && sixes;
    s.events.push({ t: 'over', durak: s.durak, pogony: s.pogony });
    return s;
  }
  const attacker = next === -1 ? (s.players[def].out ? nextActive(s, def) : def) : nextActive(s, def);
  const defender = nextActive(s, attacker);
  s.phase = 'play';
  s.bout++;
  s.attacker = attacker; s.lead = attacker; s.defender = defender;
  s.limit = Math.min(MAX_PAIRS, s.players[defender].hand.length);
  s.turn = attacker;
  return s;
}

/* ------------------------------------------------------------------ public knowledge (bots) */

/**
 * What `seat` can know about everyone else's cards: the full deck minus my hand, the discard pile, the table, and the
 * visible trump card while it is in the talon. `known[p]` are cards seen going into p's hand.
 */
export function unseenFor(s: DurakState, seat: number): Card[] {
  const gone = new Set<string>([
    ...s.players[seat].hand.map(c => c.id),
    ...s.discard.map(c => c.id),
    ...s.table.flatMap(p => (p.d ? [p.a.id, p.d.id] : [p.a.id])),
  ]);
  if (s.talon.length) gone.add(s.trumpCard.id);
  return makeDeck(s.rules.deck).filter(c => !gone.has(c.id));
}

/* ------------------------------------------------------------------ score */

/** Score for the leaderboard: finishing early is worth more, every pick-up costs a little; the durak scores 0. */
export function durakScore(g: DurakState, me: number, takes: number): number {
  if (g.durak === me) return 0;
  const n = g.players.length;
  const place = g.players[me].place ?? n;
  return 100 * (n - place) + Math.max(0, 60 - takes * 10) + (g.durak === null ? 0 : 40);
}
