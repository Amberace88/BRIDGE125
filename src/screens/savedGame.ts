import type { GameState } from '../engine/engine';

/**
 * The "continue" slot for local bot games (one game per device). Kept out of LocalGame.tsx so Home / App can check for a
 * saved game without loading the table code.
 */
export const SAVE_KEY = 'b125.game.v1';

export function loadSavedGame(): GameState | null {
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null; const g = JSON.parse(raw) as GameState; return g.phase === 'gameOver' ? null : g; } catch { return null; }
}
export function saveGame(g: GameState) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(g)); } catch { /* */ } }
export function clearSavedGame() { try { localStorage.removeItem(SAVE_KEY); } catch { /* */ } }

/** Stake id carried by a saved stake game (see src/economy/shield.ts), or null. */
export const savedStakeIdOf = (g: GameState | null | undefined): number | null => {
  const id = (g as (GameState & { stakeId?: unknown }) | null | undefined)?.stakeId;
  return typeof id === 'number' ? id : null;
};

/**
 * Drops the saved game when it belongs to stake `stakeId` — that stake is no longer the active one on the server
 * (settled, forfeited, abandoned by a newer stake or expired), so the game must not be resumed as a stake match.
 */
export function clearSavedStakeGame(stakeId: number) {
  if (savedStakeIdOf(loadSavedGame()) === stakeId) clearSavedGame();
}
