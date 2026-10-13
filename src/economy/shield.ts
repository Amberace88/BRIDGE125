import type { Card, GameState } from '../engine/engine';
import { SHIELD_SAVES } from './config';
import type { ActiveStake } from './api';

/**
 * Stake-game helpers that work on top of the pure engine (no engine changes):
 *  - a stake game carries its stake id on the GameState (survives the LocalGame save / resume),
 *  - the Shield boost puts the last 2 cards of a Q♠ penalty draw back under the deck (5 → 3, 6 → 4), once per game.
 * Only ever used at bot tables: boosts never touch games against real players.
 */
export type StakeGame = GameState & { stakeId?: number; stakeTier?: number; shielded?: boolean };

export const markStakeGame = (g: GameState, s: Pick<ActiveStake, 'id' | 'tier'>): GameState => ({ ...g, stakeId: s.id, stakeTier: s.tier } as StakeGame);
/** The same game without its stake marker (a casual bot game from here on). */
export const stripStake = (g: GameState): GameState => { const { stakeId: _i, stakeTier: _t, ...rest } = g as StakeGame; return rest as GameState; };
export const stakeIdOf = (g: GameState | null | undefined): number | null => (g as StakeGame | null | undefined)?.stakeId ?? null;
export const isShielded = (g: GameState | null | undefined) => !!(g as StakeGame | null | undefined)?.shielded;

/**
 * If `next` is `me` taking a Q♠ penalty (5, or 6 after a 6♠ pass) and the shield is armed, returns a copy where 2 of the
 * drawn cards went back to the bottom of the deck; otherwise returns `next` unchanged. Pure.
 */
export function shieldStep(prev: GameState, next: GameState, me: number, armed: boolean): GameState {
  if (!armed || next === prev || isShielded(prev)) return next;
  const pend = prev.pending;
  if (!pend || (pend.kind !== 'queen' && pend.kind !== 'queen6') || prev.current !== me) return next;
  const ev = next.events.find(e => e.t === 'draw' && e.p === me && e.forced);
  if (!ev || ev.t !== 'draw' || ev.n <= SHIELD_SAVES) return next;
  const st = structuredClone(next) as StakeGame;
  const hand = st.players[me].hand;
  const back: Card[] = hand.splice(hand.length - SHIELD_SAVES, SHIELD_SAVES);
  st.deck.push(...back);
  st.events = st.events.map(e => (e.t === 'draw' && e.p === me && e.forced ? { ...e, n: e.n - back.length } : e));
  st.shielded = true;
  return st;
}
