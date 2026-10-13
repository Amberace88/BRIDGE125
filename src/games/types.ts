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
}
