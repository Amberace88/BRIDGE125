// Бридж rules engine — pure, deterministic given an rng.
export type Suit = 'S' | 'C' | 'H' | 'D';
export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export interface Card { id: string; r: Rank; s: Suit }

export const SUITS: Suit[] = ['S', 'C', 'H', 'D'];
export const RANKS: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SUIT_GLYPH: Record<Suit, string> = { S: '♠', C: '♣', H: '♥', D: '♦' };
export const isRed = (s: Suit) => s === 'H' || s === 'D';
export const isQS = (c: Card) => c.r === 'Q' && c.s === 'S';
export const is6S = (c: Card) => c.r === '6' && c.s === 'S';

export const GAME_OVER_AT = 130;
export const RESET_AT = 125;

export function cardPoints(c: Card): number {
  switch (c.r) {
    case 'A': return 15;
    case 'K': case 'Q': case 'J': case '10': return 10;
    case '6': return c.s === 'S' ? 5 : 0;
    default: return 0;
  }
}

export interface Player {
  id: string; name: string; bot: boolean;
  hand: Card[]; score: number;
}

export type Pending =
  | { kind: 'eight'; amount: number }      // can answer with an 8, else draw + skip
  | { kind: 'queen'; amount: number }      // Q♠: can answer with 6♠, else draw 5 + skip
  | { kind: 'queen6'; amount: number }     // after 6♠ transfer: draw 6 then cover the 6♠
  | { kind: 'seven'; amount: number };     // draw N then continue the turn

export type GameEvent =
  | { t: 'play'; p: number; cards: Card[] }
  | { t: 'draw'; p: number; n: number; forced?: boolean }
  | { t: 'skip'; p: number }
  | { t: 'suit'; p: number; s: Suit }
  | { t: 'queen'; target: number }
  | { t: 'transfer'; p: number; target: number }
  | { t: 'eight'; target: number; amount: number }
  | { t: 'seven'; target: number; amount: number }
  | { t: 'kings'; }
  | { t: 'mustCover'; p: number }
  | { t: 'reshuffle' }
  | { t: 'roundEnd'; winner: number; mult: number }
  | { t: 'reset125'; p: number }
  | { t: 'gameOver'; winners: number[] }
  | { t: 'bluffCaught'; p: number; by: number; cards: Card[] }   // bluff mode: p's illegal play was challenged by `by` and reverted
  | { t: 'bluffWrong'; p: number };                              // bluff mode: p challenged a legal play

/** Optional table rules. Missing on old saved games → treat as `{ bluff: false }`. */
export interface GameRules { bluff: boolean }

/**
 * Bluff mode: the most recent play, kept only while the next player may still challenge it.
 * `cards` covers the whole turn (a 6 and the card(s) that covered it count as one play).
 */
export interface LastPlay {
  by: number;
  cards: Card[];
  final: Card[];            // cards of the last segment (jack multiplier when going out)
  wasLegal: boolean;
  prevTop: Card;            // pile top before the play
  prevSuit: Suit;           // active suit before the play
  prevScores?: number[];    // only when the play triggered the four-kings reset
  out?: boolean;            // the play emptied the hand: the round ends once the window closes
}

export interface RoundResult {
  winner: number; mult: number; jacks: number;
  rows: { p: number; handPoints: number; added: number; before: number; after: number; reset: boolean }[];
}

export interface GameState {
  players: Player[];
  deck: Card[];
  pile: Card[];
  current: number;
  activeSuit: Suit;
  phase: 'play' | 'chooseSuit' | 'roundOver' | 'gameOver';
  pending: Pending | null;
  mustCover: boolean;
  drawnThisTurn: boolean;
  round: number;
  starter: number;
  events: GameEvent[];
  seq: number;              // increments on every change (for UI)
  lastResult: RoundResult | null;
  winners: number[];
  rules?: GameRules;
  /** Bluff mode only: open challenge window (see LastPlay). */
  lastPlay?: LastPlay | null;
  /** Bluff mode only: the current player was hit by this many aces and may only pass (or challenge). */
  aceSkip?: number;
}

export interface NewGameOpts { bluff?: boolean }
export const isBluff = (st: GameState) => !!st.rules?.bluff;

export type Rng = () => number;

export function makeDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ id: r + s, r, s });
  return d;
}

export function shuffle<T>(a: T[], rng: Rng): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

const NEUTRAL_START = (c: Card) => ['9', '10', 'K'].includes(c.r) || (c.r === 'Q' && c.s !== 'S');

/**
 * Start a new game. `newGame(players)`, `newGame(players, { bluff: true })`,
 * `newGame(players, rng)` and `newGame(players, rng, opts)` are all accepted.
 */
export function newGame(names: { name: string; bot: boolean }[], rngOrOpts?: Rng | NewGameOpts, maybeOpts?: NewGameOpts): GameState {
  const rng: Rng = typeof rngOrOpts === 'function' ? rngOrOpts : Math.random;
  const opts: NewGameOpts = (typeof rngOrOpts === 'function' ? maybeOpts : rngOrOpts) ?? {};
  const players: Player[] = names.map((n, i) => ({ id: 'p' + i, name: n.name, bot: n.bot, hand: [], score: 0 }));
  const st: GameState = {
    players, deck: [], pile: [], current: 0, activeSuit: 'S', phase: 'play', pending: null,
    mustCover: false, drawnThisTurn: false, round: 0, starter: 0, events: [], seq: 0, lastResult: null, winners: [],
    rules: { bluff: !!opts.bluff }, lastPlay: null, aceSkip: 0,
  };
  return dealRound(st, rng, 0);
}

export function dealRound(prev: GameState, rng: Rng, starter: number): GameState {
  const st = clone(prev);
  st.round += 1;
  st.starter = starter;
  st.deck = shuffle(makeDeck(), rng);
  st.pile = [];
  const n = st.players.length;
  const handSize = n === 2 ? 5 : 4;
  for (const p of st.players) p.hand = st.deck.splice(0, handSize);
  // first pile card must be neutral
  let idx = st.deck.findIndex(NEUTRAL_START);
  if (idx < 0) idx = 0;
  const [first] = st.deck.splice(idx, 1);
  st.pile.push(first);
  st.activeSuit = first.s;
  st.current = starter % n;
  st.phase = 'play';
  st.pending = null;
  st.mustCover = false;
  st.drawnThisTurn = false;
  st.lastResult = null;
  st.lastPlay = null;
  st.aceSkip = 0;
  st.events = [];
  st.seq++;
  return st;
}

export const top = (st: GameState) => st.pile[st.pile.length - 1];
export const nextIdx = (st: GameState, from: number, steps = 1) => (from + steps) % st.players.length;

function clone(st: GameState): GameState { return structuredClone(st); }

/** Can this single card be played onto the current top (ignoring pending responses)? */
export function canPlayOn(st: GameState, c: Card): boolean {
  const t = top(st);
  if (c.r === 'J' || c.r === '9') return true;
  return c.s === st.activeSuit || c.r === t.r;
}

export type Action =
  | { type: 'play'; cardIds: string[] }
  | { type: 'draw' }
  | { type: 'pass' }
  | { type: 'accept' }            // accept a pending penalty
  | { type: 'suit'; suit: Suit }
  | { type: 'challenge' };        // bluff mode: call out the previous player's play

/** Who may challenge right now (bluff mode), or null. Always the current player when not null. */
export function challenger(st: GameState): number | null {
  const lp = st.lastPlay;
  if (!lp || st.phase !== 'play') return null;
  const c = nextIdx(st, lp.by);
  return c !== lp.by && st.current === c ? c : null;
}

/**
 * Validate a multi-card play. Returns error string or null.
 * In bluff mode any same-rank set may be played when no penalty is pending (`strict` ignores bluff mode).
 */
export function validatePlay(st: GameState, p: number, ids: string[], strict = false): string | null {
  if (st.phase !== 'play') return 'phase';
  if (p !== st.current) return 'turn';
  if (st.aceSkip) return 'skipped';
  if (st.lastPlay?.out) return 'wait';
  if (!ids.length) return 'empty';
  if (new Set(ids).size !== ids.length) return 'duplicate';
  const relax = !strict && isBluff(st);
  const hand = st.players[p].hand;
  const cards = ids.map(id => hand.find(c => c.id === id));
  if (cards.some(c => !c)) return 'notInHand';
  const cs = cards as Card[];
  const pend = st.pending;
  if (pend) {
    if (pend.kind === 'eight') return cs.every(c => c.r === '8') ? null : 'mustAnswer8';
    if (pend.kind === 'queen') return cs.length === 1 && is6S(cs[0]) ? null : 'mustAnswer6S';
    return 'mustDraw';
  }
  // special combo: Q♠ then 6♠
  if (cs.length === 2 && isQS(cs[0]) && is6S(cs[1])) {
    return relax || canPlayOn(st, cs[0]) ? null : 'illegal';
  }
  if (!relax && !canPlayOn(st, cs[0])) return 'illegal';
  if (cs.some(c => c.r !== cs[0].r)) return 'sameRank';
  return null;
}

export function legalSingles(st: GameState, p: number, strict = false): Card[] {
  return st.players[p].hand.filter(c => validatePlay(st, p, [c.id], strict) === null);
}

function drawCards(st: GameState, p: number, n: number, forced = false): number {
  let got = 0;
  for (let i = 0; i < n; i++) {
    if (!st.deck.length) {
      if (st.pile.length <= 1) break;
      const t = st.pile.pop()!;
      st.deck = shuffle(st.pile, Math.random);
      st.pile = [t];
      st.events.push({ t: 'reshuffle' });
    }
    const c = st.deck.shift();
    if (!c) break;
    st.players[p].hand.push(c);
    got++;
  }
  if (got) st.events.push({ t: 'draw', p, n: got, forced });
  return got;
}

function endTurn(st: GameState, steps = 1) {
  st.current = nextIdx(st, st.current, steps);
  st.drawnThisTurn = false;
  st.mustCover = false;
}

/**
 * The player who takes a pending penalty draws it, then:
 * - 8 / Q♠ (+5): loses the turn — the turn passes to the next player;
 * - Q♠ passed on with 6♠ (+6): must cover the 6♠ (the only Q♠-family case that keeps the turn);
 * - 7: continues the turn normally.
 */
function takePenalty(st: GameState, p: number, pend: Pending) {
  st.pending = null;
  drawCards(st, p, pend.amount, true);
  switch (pend.kind) {
    case 'queen6':
      st.mustCover = true;
      st.drawnThisTurn = false;
      st.events.push({ t: 'mustCover', p });
      break;
    case 'seven':
      st.drawnThisTurn = false;
      break;
    case 'eight':
    case 'queen':
      st.events.push({ t: 'skip', p });
      endTurn(st);
      break;
  }
}

/** Apply an action. Returns new state (or the same state if invalid). */
export function apply(prev: GameState, p: number, a: Action, rng: Rng = Math.random): GameState {
  const st = clone(prev);
  st.events = [];
  const me = st.players[p];
  if (!me) return prev;

  // ---- bluff mode: challenge window ----
  const lp = st.lastPlay ?? null;
  const continuing = !!lp && lp.by === p && st.current === p;   // the bluffer finishing their own turn (cover a 6, pick a suit)
  if (a.type === 'challenge') {
    if (!lp || challenger(st) !== p) return prev;
    return resolveChallenge(st, p, lp, rng);
  }
  if (lp && !continuing) {
    if (p !== st.current) return prev;
    st.lastPlay = null;                       // any other first action closes the window
    if (lp.out) {
      // the previous player went out: the play stands, the round ends
      if (a.type !== 'pass' && a.type !== 'accept') return prev;
      return roundEnd(st, lp.by, lp.final, rng);
    }
  }

  if (a.type === 'suit') {
    if (st.phase !== 'chooseSuit' || p !== st.current) return prev;
    st.activeSuit = a.suit;
    st.events.push({ t: 'suit', p, s: a.suit });
    st.phase = 'play';
    endTurn(st);
    return finish(st);
  }

  if (st.phase !== 'play' || p !== st.current) return prev;

  if (st.aceSkip) {
    // bluff mode: skipped by an ace — the only moves are pass (or challenge, handled above)
    if (a.type !== 'pass') return prev;
    const k = st.aceSkip;
    st.aceSkip = 0;
    endTurn(st, k);
    return finish(st);
  }

  if (a.type === 'accept') {
    const pend = st.pending;
    if (!pend) return prev;
    takePenalty(st, p, pend);
    return finish(st);
  }

  if (a.type === 'draw') {
    if (st.pending) return prev;
    if (st.mustCover) {
      // must keep drawing until a (real) cover is possible
      if (legalSingles(st, p, true).length) return prev;
      const got = drawCards(st, p, 1);
      if (!got) { st.mustCover = false; endTurn(st); }
      return finish(st);
    }
    if (st.drawnThisTurn) return prev;
    drawCards(st, p, 1);
    st.drawnThisTurn = true;
    return finish(st);
  }

  if (a.type === 'pass') {
    if (st.pending || st.mustCover) return prev;
    if (!st.drawnThisTurn && st.deck.length + st.pile.length > 1) return prev;
    endTurn(st);
    return finish(st);
  }

  if (a.type !== 'play') return prev;

  // play
  const err = validatePlay(st, p, a.cardIds);
  if (err) return prev;
  const cards = a.cardIds.map(id => me.hand.find(c => c.id === id)!);
  if (isBluff(st)) {
    const legal = validatePlay(st, p, a.cardIds, true) === null;
    if (lp && continuing) {
      lp.cards.push(...cards);
      lp.final = cards;
      lp.wasLegal = lp.wasLegal && legal;
      st.lastPlay = lp;
    } else {
      st.lastPlay = { by: p, cards: cards.slice(), final: cards, wasLegal: legal, prevTop: top(st), prevSuit: st.activeSuit };
    }
  }
  me.hand = me.hand.filter(c => !a.cardIds.includes(c.id));
  st.pile.push(...cards);
  st.events.push({ t: 'play', p, cards });
  const last = cards[cards.length - 1];
  st.activeSuit = last.s;
  const pend = st.pending;
  st.pending = null;
  st.mustCover = false;
  const next = nextIdx(st, p);

  // responses to pending
  if (pend?.kind === 'eight') {
    const amount = pend.amount + 2 * cards.length;
    st.pending = { kind: 'eight', amount };
    st.events.push({ t: 'eight', target: next, amount });
    if (!me.hand.length) return goOut(st, p, cards, rng);
    endTurn(st);
    return finish(st);
  }
  if (pend?.kind === 'queen') {
    // 6♠ transfer: next player draws 6 then must cover the 6♠
    st.pending = { kind: 'queen6', amount: 6 };
    st.events.push({ t: 'transfer', p, target: next });
    if (!me.hand.length) return goOut(st, p, cards, rng);
    endTurn(st);
    return finish(st);
  }

  // Q♠ + 6♠ combo
  if (cards.length === 2 && isQS(cards[0]) && is6S(cards[1])) {
    st.pending = { kind: 'queen6', amount: 6 };
    st.events.push({ t: 'transfer', p, target: next });
    if (!me.hand.length) return goOut(st, p, cards, rng);
    endTurn(st);
    return finish(st);
  }

  // kings on the pile
  if (last.r === 'K') {
    const t4 = st.pile.slice(-4);
    if (t4.length === 4 && t4.every(c => c.r === 'K')) {
      if (st.lastPlay && !st.lastPlay.prevScores) st.lastPlay.prevScores = st.players.map(pl => pl.score);
      for (const pl of st.players) pl.score = 0;
      st.events.push({ t: 'kings' });
    }
  }

  switch (last.r) {
    case '6': {
      // must cover; cannot finish on a 6
      st.mustCover = true;
      st.drawnThisTurn = false;
      st.events.push({ t: 'mustCover', p });
      return finish(st);
    }
    case '7': {
      if (!me.hand.length) return goOut(st, p, cards, rng, { kind: 'seven', amount: cards.length });
      st.pending = { kind: 'seven', amount: cards.length };
      st.events.push({ t: 'seven', target: next, amount: cards.length });
      endTurn(st);
      return finish(st);
    }
    case '8': {
      if (!me.hand.length) return goOut(st, p, cards, rng, { kind: 'eight', amount: 2 * cards.length });
      st.pending = { kind: 'eight', amount: 2 * cards.length };
      st.events.push({ t: 'eight', target: next, amount: 2 * cards.length });
      endTurn(st);
      return finish(st);
    }
    case 'A': {
      if (!me.hand.length) return goOut(st, p, cards, rng);
      for (let k = 1; k <= cards.length; k++) st.events.push({ t: 'skip', p: nextIdx(st, p, k) });
      if (isBluff(st)) {
        // the skipped player still gets the chance to challenge before the skip takes effect
        st.aceSkip = cards.length;
        endTurn(st);
      } else {
        endTurn(st, 1 + cards.length);
      }
      return finish(st);
    }
    case 'J': {
      if (!me.hand.length) return goOut(st, p, cards, rng);
      st.phase = 'chooseSuit';
      return finish(st);
    }
    case 'Q': {
      const hasQS = cards.some(isQS);
      if (!me.hand.length) return goOut(st, p, cards, rng, hasQS ? { kind: 'queen', amount: 5 } : null);
      if (hasQS) {
        st.pending = { kind: 'queen', amount: 5 };
        st.events.push({ t: 'queen', target: next });
      }
      endTurn(st);
      return finish(st);
    }
    default: {
      if (!me.hand.length) return goOut(st, p, cards, rng);
      endTurn(st);
      return finish(st);
    }
  }
}

/** The player emptied their hand. In bluff mode the round only ends once the next player lets the play stand. */
function goOut(st: GameState, winner: number, finalCards: Card[], rng: Rng, penalty: Pending | null = null): GameState {
  if (st.lastPlay) {
    if (penalty) st.pending = penalty;
    st.lastPlay.out = true;
    st.mustCover = false;
    st.drawnThisTurn = false;
    st.aceSkip = 0;
    st.current = nextIdx(st, winner);
    return finish(st);
  }
  return roundEnd(st, winner, finalCards, rng, penalty);
}

/** Take the card with this id out of wherever it is (pile, deck, hands). */
function takeCardById(st: GameState, id: string): Card | null {
  for (const arr of [st.pile, st.deck, ...st.players.map(pl => pl.hand)]) {
    const i = arr.findIndex(c => c.id === id);
    if (i >= 0) return arr.splice(i, 1)[0];
  }
  return null;
}

function resolveChallenge(st: GameState, c: number, lp: LastPlay, rng: Rng): GameState {
  st.lastPlay = null;
  const b = lp.by;
  if (!lp.wasLegal) {
    // caught: revert the play; the bluffer takes the cards back + 2; then it's the challenger's normal turn
    const ids = new Set(lp.cards.map(x => x.id));
    st.pile = st.pile.filter(x => !ids.has(x.id));
    st.deck = st.deck.filter(x => !ids.has(x.id));
    if (!st.pile.length) {
      // the pile was reshuffled into the deck mid-play: put the previous top card back
      const t = takeCardById(st, lp.prevTop.id) ?? st.deck.shift() ?? null;
      if (t) st.pile.push(t);
    }
    st.players[b].hand.push(...lp.cards);
    if (!st.pile.length) st.pile.push(st.players[b].hand.pop()!);   // never leave an empty pile
    st.activeSuit = lp.prevSuit;
    if (lp.prevScores) lp.prevScores.forEach((sc, i) => { if (st.players[i]) st.players[i].score = sc; });
    st.pending = null;
    st.aceSkip = 0;
    st.mustCover = false;
    st.phase = 'play';
    st.events.push({ t: 'bluffCaught', p: b, by: c, cards: lp.cards });
    drawCards(st, b, 2, true);
    st.current = c;
    st.drawnThisTurn = false;
    return finish(st);
  }
  // wrong: the challenger draws 2 and loses the turn (on top of any penalty the play carried)
  st.events.push({ t: 'bluffWrong', p: c });
  drawCards(st, c, 2, true);
  if (lp.out) return roundEnd(st, b, lp.final, rng);
  if (st.aceSkip) {
    const k = st.aceSkip;
    st.aceSkip = 0;
    endTurn(st, k);
    return finish(st);
  }
  const pend = st.pending;
  if (pend) {
    takePenalty(st, c, pend);
    if (pend.kind !== 'seven') return finish(st);   // 8 / Q♠: already skipped; 6♠ transfer: must still cover
  }
  st.events.push({ t: 'skip', p: c });
  endTurn(st);
  return finish(st);
}

function roundEnd(st: GameState, winner: number, finalCards: Card[], _rng: Rng, penalty: Pending | null = null): GameState {
  // penalty from the final card still lands on the next player before scoring
  const target = nextIdx(st, winner);
  const pend = penalty ?? st.pending;
  if (pend && target !== winner) drawCards(st, target, pend.amount, true);
  st.pending = null;
  st.lastPlay = null;
  st.aceSkip = 0;
  st.mustCover = false;
  const jacks = finalCards.every(c => c.r === 'J') ? finalCards.length : 0;
  const mult = jacks ? jacks + 1 : 1;
  const rows: RoundResult['rows'] = [];
  st.players.forEach((pl, i) => {
    const handPoints = pl.hand.reduce((a, c) => a + cardPoints(c), 0);
    const added = i === winner ? 0 : handPoints * mult;
    const before = pl.score;
    let after = before + added;
    let reset = false;
    if (after === RESET_AT) { after = 0; reset = true; st.events.push({ t: 'reset125', p: i }); }
    pl.score = after;
    rows.push({ p: i, handPoints: i === winner ? 0 : handPoints, added, before, after, reset });
  });
  st.lastResult = { winner, mult, jacks, rows };
  st.events.push({ t: 'roundEnd', winner, mult });
  if (st.players.some(pl => pl.score >= GAME_OVER_AT)) {
    const min = Math.min(...st.players.map(pl => pl.score));
    st.winners = st.players.map((pl, i) => (pl.score === min ? i : -1)).filter(i => i >= 0);
    st.phase = 'gameOver';
    st.events.push({ t: 'gameOver', winners: st.winners });
  } else {
    st.phase = 'roundOver';
  }
  return finish(st);
}

export function nextRound(st: GameState, rng: Rng = Math.random): GameState {
  if (st.phase !== 'roundOver') return st;
  return dealRound(st, rng, nextIdx(st, st.starter));
}

function finish(st: GameState): GameState {
  st.seq++;
  return st;
}

export interface PlayerOptions {
  mine: boolean;
  /** Cards that may be played singly (bluff mode: every hand card whenever no penalty is pending). */
  legal: Card[];
  canAccept: boolean;
  canDraw: boolean;
  canPass: boolean;
  forcedDraw: boolean;
  combo: boolean;
  /** Bluff mode: may call out the previous player's play (only as the first action of this turn). */
  canChallenge: boolean;
}

/** What the current player is allowed to do right now (for UI). */
export function options(st: GameState, p: number): PlayerOptions {
  const mine = st.current === p && st.phase === 'play';
  const canChallenge = mine && challenger(st) === p;
  if (mine && (st.aceSkip || st.lastPlay?.out)) {
    // skipped by an ace / previous player went out: let it stand (pass) or challenge
    return { mine, legal: [], canAccept: false, canDraw: false, canPass: true, forcedDraw: false, combo: false, canChallenge };
  }
  const pend = st.pending;
  const forcedDraw = mine && !!pend && (pend.kind === 'queen6' || pend.kind === 'seven');
  const legal = mine && !forcedDraw ? legalSingles(st, p) : [];
  const realCovers = st.mustCover && isBluff(st) ? legalSingles(st, p, true) : legal;
  const hand = st.players[p]?.hand ?? [];
  const qs = hand.find(isQS);
  const s6 = hand.find(is6S);
  return {
    mine,
    legal,
    canAccept: mine && !!pend,
    canDraw: mine && !pend && (st.mustCover ? realCovers.length === 0 : !st.drawnThisTurn),
    canPass: mine && !pend && !st.mustCover && (st.drawnThisTurn || st.deck.length + st.pile.length <= 1),
    forcedDraw,
    combo: mine && !pend && !!qs && !!s6 && validatePlay(st, p, [qs.id, s6.id]) === null,
    canChallenge,
  };
}
