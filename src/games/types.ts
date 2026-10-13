// Bridge 125 Games — one platform, one style. Bridge stays the main game; mini games plug in here.
//
// Every mini game lives in src/games/<id>/ and exports a GameModule from src/games/<id>/index.ts. The module is
// registered with ONE line in src/games/registry.ts. The app routes /g/<id> to the module's lazily loaded Screen.
// Shared across all games: the account, BM / Diamonds wallet, cosmetics (card backs, tables, frames …), quests,
// season stars, achievements and leaderboards — a game only reports results through `reportGame` (./session.ts).

import type { ComponentType, LazyExoticComponent } from 'react';
import type { Lang } from '../i18n';

export type GameId = 'zole' | 'durak' | 'solitaire' | 'sudoku' | (string & {});

/** What a game screen receives from the app shell. */
export interface GameScreenProps {
  /** back to the games hub / home */
  onExit: () => void;
  /** open the sign-in sheet (rewards and leaderboards need an account) */
  onAuth: () => void;
  /**
   * SEED CONTRACT (optional, backwards compatible — a game that does not support it simply ignores it).
   * Set when the player opened a challenge (bridge125.com/c/<code>) or started one from the hub: deal / generate the
   * FIRST new game of this visit from this seed, right away (skip the lobby; a saved game in progress is NOT resumed).
   * Same seed + same `level` ⇒ the very same deal / puzzle on every device and build (use a seeded PRNG, e.g.
   * mulberry32(hash(seed)) — never Math.random for the deal). Later games ("Play again") may be random again.
   * A game that honours it sets `seeded: true` on its GameModule and reports `seed` in its GameResult.
   * Seeds are short URL-safe strings: /^[A-Za-z0-9_-]{1,64}$/.
   */
  seed?: string;
  /** with `seed`: the bots' level / puzzle difficulty the challenge was played at ('easy' | 'normal' | 'hard' | 'expert' …) */
  level?: string;
}

export interface GameModule {
  id: GameId;
  /** card games use the shared card faces, backs and table felt; puzzles may only use the felt/brand */
  kind: 'cards' | 'puzzle';
  /** players at the table (incl. bots); 1 for solo games */
  players: { min: number; max: number };
  /** short localized texts for the hub tile (fallback: en) */
  title: Partial<Record<Lang, string>> & { en: string };
  tagline: Partial<Record<Lang, string>> & { en: string };
  /** a small inline SVG/emblem for the hub tile (no external images) */
  Emblem: ComponentType<{ size?: number }>;
  /** the full game (lazy: never loaded until the player opens it) */
  Screen: LazyExoticComponent<ComponentType<GameScreenProps>>;
  /** languages where this game is a local classic — shown first in the hub for those players */
  homeLangs?: Lang[];
  /** hidden from the hub until ready (still reachable at /g/<id> for testing) */
  hidden?: boolean;
  /** has a daily puzzle / seeded deal (reported with `day`): the hub shows a "Daily" badge and a "Today" leaderboard */
  daily?: boolean;
  /**
   * honours `GameScreenProps.seed` (see the seed contract there): challenges then promise the friend "the same deal".
   * Without it a challenge is "beat my score" on a deal of their own.
   */
  seeded?: boolean;
}

/** One finished game, reported once at game over. Rewards are decided by the server, never by the client. */
export interface GameResult {
  game: GameId;
  /** won the game (solo puzzles: solved) */
  won: boolean;
  /** game-specific score (higher is better) — used for leaderboards; omit if meaningless */
  score?: number;
  /** seconds played (anti-abuse + "fast win" achievements) */
  seconds: number;
  /** bots' level or puzzle difficulty, e.g. 'easy' | 'normal' | 'hard' | 'expert' */
  level?: string;
  /** daily puzzle / seeded deal day (YYYY-MM-DD, Riga) when the game was a daily one */
  day?: string;
  /** small extra facts for quests/achievements, e.g. { durak: true } or { zole_big: 1 } */
  details?: Record<string, number | boolean | string>;
  /**
   * the seed this game was dealt from, when the game can replay it (`GameModule.seeded`): lets "Challenge a friend"
   * after ANY game (not only seeded starts) send the very same deal. Client-only — never sent to record_minigame.
   */
  seed?: string;
}
