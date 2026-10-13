import type { OnlineGameId } from '../protocol';

/** A seat as the engine sees it. */
export interface SeatPlayer { name: string; bot: boolean }

export interface GameOutcome {
  /** final score per seat (engine units) */
  scores: number[];
  /** winning seat(s) */
  winners: number[];
}

/** An automatic step the server takes by itself (next deal, clearing the table …). */
export interface Pause<A> {
  ms: number;
  a: A;
  /** the humans may skip the wait: the step is taken as soon as every connected human sent `next` */
  vote: boolean;
}

/**
 * Server-side adapter around one pure card-game engine. The room (worker/gameroomCore.ts) is generic: it only talks to
 * the engine through this interface, so a new card game goes online by adding an adapter to ./index.ts.
 *
 * Everything here must stay worker-safe (no DOM, no React) — the Worker bundles these files.
 */
export interface GameAdapter<S = unknown, A = unknown, R = unknown> {
  id: OnlineGameId;
  /** seats at the table (bots included); `quick` = seats of a quick-match table */
  seats: { min: number; max: number; quick: number };
  /** the rules a room starts with */
  defaultRules: R;
  /** sanitize rules sent by a host (unknown input → a valid rules object) */
  rules(raw: unknown, seats: number): R;
  create(seed: number, players: SeatPlayer[], rules: R): S;
  /** check the SHAPE of a client action (only the kinds a player may send); engine legality is checked by `apply` */
  parse(raw: unknown): A | null;
  /** apply an action of `seat`; an illegal action returns the very same object */
  apply(s: S, seat: number, a: A): S;
  legalActions(s: S, seat: number): A[];
  /** whose move the game waits for (null: nobody — a pause, or the game is over) */
  actor(s: S): number | null;
  pause(s: S): Pause<A> | null;
  /** the server bot's move for `seat` (also used when a human's clock runs out) */
  bot(s: S, seat: number, rnd: () => number): A;
  /** a seat changed hands (human ↔ bot, rename) */
  setPlayer(s: S, seat: number, p: SeatPlayer): S;
  /** what `seat` may see (−1: a spectator): other hands, the talon, seeds … are hidden. `salt` keeps hidden ids opaque. */
  viewFor(s: S, seat: number, salt: string): S;
  isOver(s: S): boolean;
  result(s: S): GameOutcome;
  /** increases with every accepted action */
  seq(s: S): number;
}

/* ------------------------------------------------------------------ hiding helpers */

/** FNV-1a 32-bit — opaque ids for face-down cards (stable within a game, unguessable without the room's salt). */
function fnv(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/**
 * A face-down stand-in for a card: an opaque id (the same card keeps the same id while it stays hidden, so the table
 * can animate it from the talon into a hand) and a fixed dummy face that says nothing.
 */
export function hideCard<C extends { id: string }>(c: C, salt: string, dummy: Omit<C, 'id'>): C {
  const h = fnv(salt + '|' + c.id).toString(36) + fnv(c.id + '|' + salt).toString(36).slice(0, 3);
  return { ...dummy, id: 'x' + h } as C;
}

export const hideAll = <C extends { id: string }>(cs: readonly C[], salt: string, dummy: Omit<C, 'id'>): C[] => cs.map(c => hideCard(c, salt, dummy));

/* ------------------------------------------------------------------ parsing helpers */

export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export const cardId = (v: unknown): v is string => typeof v === 'string' && /^[0-9AKQJ]{1,2}[CSHD]$/.test(v);
export const idList = (v: unknown, n: number): v is string[] => Array.isArray(v) && v.length >= 1 && v.length <= n && v.every(cardId);
export const int = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
