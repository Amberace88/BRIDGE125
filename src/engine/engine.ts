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
  | { t: 'gameOver'; winners: number[] };

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
}

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

export function newGame(names: { name: string; bot: boolean }[], rng: Rng = Math.random): GameState {
  const players: Player[] = names.map((n, i) => ({ id: 'p' + i, name: n.name, bot: n.bot, hand: [], score: 0 }));
  const st: GameState = {
    players, deck: [], pile: [], current: 0, activeSuit: 'S', phase: 'play', pending: null,
    mustCover: false, drawnThisTurn: false, round: 0, starter: 0, events: [], seq: 0, lastResult: null, winners: [],
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
  | { type: 'suit'; suit: Suit };

/** Validate a multi-card play. Returns error string or null. */
export function validatePlay(st: GameState, p: number, ids: string[]): string | null {
  if (st.phase !== 'play') return 'phase';
  if (p !== st.current) return 'turn';
  if (!ids.length) return 'empty';
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
    return canPlayOn(st, cs[0]) ? null : 'illegal';
  }
  if (!canPlayOn(st, cs[0])) return 'illegal';
  if (cs.some(c => c.r !== cs[0].r)) return 'sameRank';
  return null;
}

export function legalSingles(st: GameState, p: number): Card[] {
  return st.players[p].hand.filter(c => validatePlay(st, p, [c.id]) === null);
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

/** Apply an action. Returns new state (or the same state if invalid). */
export function apply(prev: GameState, p: number, a: Action, rng: Rng = Math.random): GameState {
  const st = clone(prev);
  st.events = [];
  const me = st.players[p];

  if (a.type === 'suit') {
    if (st.phase !== 'chooseSuit' || p !== st.current) return prev;
    st.activeSuit = a.suit;
    st.events.push({ t: 'suit', p, s: a.suit });
    st.phase = 'play';
    endTurn(st);
    return finish(st);
  }

  if (st.phase !== 'play' || p !== st.current) return prev;

  if (a.type === 'accept') {
    const pend = st.pending;
    if (!pend) return prev;
    st.pending = null;
    drawCards(st, p, pend.amount, true);
    if (pend.kind === 'eight' || pend.kind === 'queen') {
      st.events.push({ t: 'skip', p });
      endTurn(st);
    } else if (pend.kind === 'queen6') {
      st.mustCover = true;
      st.events.push({ t: 'mustCover', p });
      st.drawnThisTurn = false;
    } else {
      st.drawnThisTurn = false; // seven: continue turn normally
    }
    return finish(st);
  }

  if (a.type === 'draw') {
    if (st.pending) return prev;
    if (st.mustCover) {
      // must keep drawing until a cover is possible
      if (legalSingles(st, p).length) return prev;
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

  // play
  const err = validatePlay(st, p, a.cardIds);
  if (err) return prev;
  const cards = a.cardIds.map(id => me.hand.find(c => c.id === id)!) ;
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
    if (!me.hand.length) return roundEnd(st, p, cards, rng);
    endTurn(st);
    return finish(st);
  }
  if (pend?.kind === 'queen') {
    // 6♠ transfer: next player draws 6 then must cover the 6♠
    st.pending = { kind: 'queen6', amount: 6 };
    st.events.push({ t: 'transfer', p, target: next });
    if (!me.hand.length) return roundEnd(st, p, cards, rng);
    endTurn(st);
    return finish(st);
  }

  // Q♠ + 6♠ combo
  if (cards.length === 2 && isQS(cards[0]) && is6S(cards[1])) {
    st.pending = { kind: 'queen6', amount: 6 };
    st.events.push({ t: 'transfer', p, target: next });
    if (!me.hand.length) return roundEnd(st, p, cards, rng);
    endTurn(st);
    return finish(st);
  }

  // kings on the pile
  if (last.r === 'K') {
    const t4 = st.pile.slice(-4);
    if (t4.length === 4 && t4.every(c => c.r === 'K')) {
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
      if (!me.hand.length) return roundEnd(st, p, cards, rng, { kind: 'seven', amount: cards.length });
      st.pending = { kind: 'seven', amount: cards.length };
      st.events.push({ t: 'seven', target: next, amount: cards.length });
      endTurn(st);
      return finish(st);
    }
    case '8': {
      if (!me.hand.length) return roundEnd(st, p, cards, rng, { kind: 'eight', amount: 2 * cards.length });
      st.pending = { kind: 'eight', amount: 2 * cards.length };
      st.events.push({ t: 'eight', target: next, amount: 2 * cards.length });
      endTurn(st);
      return finish(st);
    }
    case 'A': {
      if (!me.hand.length) return roundEnd(st, p, cards, rng);
      for (let k = 1; k <= cards.length; k++) st.events.push({ t: 'skip', p: nextIdx(st, p, k) });
      endTurn(st, 1 + cards.length);
      return finish(st);
    }
    case 'J': {
      if (!me.hand.length) return roundEnd(st, p, cards, rng);
      st.phase = 'chooseSuit';
      return finish(st);
    }
    case 'Q': {
      const hasQS = cards.some(isQS);
      if (!me.hand.length) return roundEnd(st, p, cards, rng, hasQS ? { kind: 'queen', amount: 5 } : null);
      if (hasQS) {
        st.pending = { kind: 'queen', amount: 5 };
        st.events.push({ t: 'queen', target: next });
      }
      endTurn(st);
      return finish(st);
    }
    default: {
      if (!me.hand.length) return roundEnd(st, p, cards, rng);
      endTurn(st);
      return finish(st);
    }
  }
}

function roundEnd(st: GameState, winner: number, finalCards: Card[], _rng: Rng, penalty: Pending | null = null): GameState {
  // penalty from the final card still lands on the next player before scoring
  const target = nextIdx(st, winner);
  const pend = penalty ?? st.pending;
  if (pend && target !== winner) drawCards(st, target, pend.amount, true);
  st.pending = null;
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

/** What the current player is allowed to do right now (for UI). */
export function options(st: GameState, p: number) {
  const mine = st.current === p && st.phase === 'play';
  const pend = st.pending;
  const forcedDraw = mine && !!pend && (pend.kind === 'queen6' || pend.kind === 'seven');
  const legal = mine && !forcedDraw ? legalSingles(st, p) : [];
  return {
    mine,
    legal,
    canAccept: mine && !!pend,
    canDraw: mine && !pend && (st.mustCover ? legal.length === 0 : !st.drawnThisTurn),
    canPass: mine && !pend && !st.mustCover && (st.drawnThisTurn || st.deck.length + st.pile.length <= 1),
    forcedDraw,
    combo: mine && !pend && st.players[p].hand.some(isQS) && st.players[p].hand.some(is6S)
      && validatePlay(st, p, [st.players[p].hand.find(isQS)!.id, st.players[p].hand.find(is6S)!.id]) === null,
  };
}
