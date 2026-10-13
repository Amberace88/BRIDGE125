/**
 * Journey house rules, applied at match setup (and at every new deal) — the engine itself only knows the optional
 * table rules queenDraw / gameOverAt / burnSplash.
 */
import { type GameState, type Rng, apply, newGame, options } from '../engine/engine';
import { botAction } from '../engine/bot';
import type { MatchDef, TwistId } from './data';

/** Points the player starts with in a "handicap" match. */
export const HANDICAP_POINTS = 20;
/** Turn clock in the Clockmaker's room. */
export const CLOCK_MS = 15000;
/** Turn clock at the Berlin door. */
export const SELECTOR_MS = 20000;

export interface TwistInfo {
  /** game players: me + bots */
  seats: number;
  bluff: boolean;
  queenDraw?: number;
  gameOverAt?: number;
  burnSplash?: number;
  /** the boss receives the 6♠ at every deal */
  banker?: boolean;
  /** human turn clock (ms) */
  turnMs?: number;
  /** points I start with */
  myStart?: number;
}

export function twistInfo(t: TwistId): TwistInfo {
  switch (t) {
    case 'bluff': return { seats: 2, bluff: true };
    case 'trio': return { seats: 3, bluff: false };
    case 'handicap': return { seats: 2, bluff: false, myStart: HANDICAP_POINTS };
    case 'banker': return { seats: 2, bluff: false, banker: true };
    case 'pique': return { seats: 2, bluff: false, queenDraw: 7 };
    case 'twins': return { seats: 3, bluff: false };
    case 'baron': return { seats: 2, bluff: true };
    case 'clock': return { seats: 2, bluff: false, turnMs: CLOCK_MS };
    case 'countess': return { seats: 2, bluff: false, burnSplash: 10 };
    case 'maestro': return { seats: 4, bluff: false };
    case 'croupier': return { seats: 2, bluff: false, gameOverAt: 100 };
    // the newer cities' bosses: combinations of the same table rules
    case 'matryoshka': return { seats: 3, bluff: false, queenDraw: 6 };
    case 'selector': return { seats: 2, bluff: false, turnMs: SELECTOR_MS };
    case 'bison': return { seats: 2, bluff: true, myStart: 15 };
    case 'eagle': return { seats: 2, bluff: true, banker: true };
    case 'caravan': return { seats: 3, bluff: true };
    case 'fire': return { seats: 2, bluff: false, burnSplash: 15 };
    case 'cognac': return { seats: 2, bluff: false, myStart: 20, queenDraw: 6 };
    case 'voivode': return { seats: 2, bluff: true, gameOverAt: 110 };
    case 'thorn': return { seats: 3, bluff: false, burnSplash: 10 };
    case 'matador': return { seats: 2, bluff: false, banker: true, gameOverAt: 115 };
    case 'spymaster': return { seats: 2, bluff: false, queenDraw: 6 };
    default: return { seats: 2, bluff: false };
  }
}

/**
 * Move the card `id` into `seat`'s hand by swapping it with one of that hand's cards (hand sizes stay equal, so the
 * deal still looks like a normal deal). The card is never taken from the pile.
 */
export function giveCard(prev: GameState, seat: number, id: string, rng: Rng = Math.random): GameState {
  const target = prev.players[seat];
  if (!target || !target.hand.length || target.hand.some(c => c.id === id)) return prev;
  const st = structuredClone(prev);
  const hand = st.players[seat].hand;
  const j = Math.floor(rng() * hand.length) % hand.length;
  const lists = [st.deck, ...st.players.map(p => p.hand)];
  for (const arr of lists) {
    const i = arr.findIndex(c => c.id === id);
    if (i < 0) continue;
    const mine = hand[j];
    hand[j] = arr[i];
    arr[i] = mine;
    return st;
  }
  return prev;   // the card is on the pile (never the case at a fresh deal)
}

/** Twists that act on every freshly dealt round (including the first one). */
export function roundTwist(m: MatchDef, g: GameState, rng: Rng = Math.random): GameState {
  const info = twistInfo(m.twist);
  if (info.banker && g.phase === 'play' && g.events.length === 0) return giveCard(g, 1, '6S', rng);
  return g;
}

/** A fresh game for this match: seats, bluff mode, table rules, starting points, first-round twist. */
export function setupMatch(m: MatchDef, names: { me: string; foes: string[] }, rng: Rng = Math.random): GameState {
  const info = twistInfo(m.twist);
  const foes = names.foes.slice(0, info.seats - 1);
  const g = newGame([{ name: names.me, bot: false }, ...foes.map(n => ({ name: n, bot: true }))], rng, { bluff: info.bluff });
  g.rules = {
    bluff: info.bluff,
    ...(info.queenDraw ? { queenDraw: info.queenDraw } : {}),
    ...(info.gameOverAt ? { gameOverAt: info.gameOverAt } : {}),
    ...(info.burnSplash ? { burnSplash: info.burnSplash } : {}),
  };
  if (info.myStart) g.players[0].score = info.myStart;
  return roundTwist(m, g, rng);
}

/**
 * The Clockmaker: the clock ran out on player p's turn. Takes ONE step for them (call again while the clock is still
 * expired): pick a suit / take the penalty / let a play stand / cover a 6 / draw one card / pass.
 */
export function clockStep(st: GameState, p: number): GameState {
  if (st.current !== p) return st;
  if (st.phase === 'chooseSuit') return apply(st, p, botAction(st, p, 'easy'));
  if (st.phase !== 'play') return st;
  const o = options(st, p);
  if (st.aceSkip || st.lastPlay?.out) return apply(st, p, { type: 'pass' });
  if (o.canAccept) return apply(st, p, { type: 'accept' });
  if (st.mustCover) return apply(st, p, botAction(st, p, 'normal'));
  if (!st.drawnThisTurn && o.canDraw) return apply(st, p, { type: 'draw' });
  if (o.canPass) return apply(st, p, { type: 'pass' });
  return apply(st, p, botAction(st, p, 'normal'));
}
