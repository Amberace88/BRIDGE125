// Mahjong scoring (leaderboards). Rewards (BM / XP) are decided by the server, never here.
//
//   a match            10 + 5 × (combo − 1)   combo = consecutive matches each within COMBO_MS of the last (max ×8)
//   a hint             −20      a shuffle   −50      (the running score never drops below 0)
//   a cleared board    + 5 per tile of the layout  + 2 per second under par (par = 5 s per tile)
// An unfinished board keeps what it scored.

export const MATCH = 10;
export const COMBO_STEP = 5;
export const COMBO_MAX = 8;
export const COMBO_MS = 4000;
export const HINT_COST = 20;
export const SHUFFLE_COST = 50;
export const CLEAR_PER_TILE = 5;
export const PAR_PER_TILE = 5;
export const TIME_BONUS = 2;

/** The combo after a match `gapMs` after the previous one (prev = the combo before; 0 = first match). */
export const nextCombo = (prev: number, gapMs: number | null) => (prev > 0 && gapMs != null && gapMs >= 0 && gapMs <= COMBO_MS ? Math.min(COMBO_MAX, prev + 1) : 1);

export const matchPoints = (combo: number) => MATCH + COMBO_STEP * (Math.min(COMBO_MAX, Math.max(1, combo)) - 1);

export const minus = (score: number, cost: number) => Math.max(0, score - cost);

export interface FinalInput { score: number; tiles: number; seconds: number; won: boolean }
export function clearBonus({ tiles, seconds, won }: FinalInput) {
  if (!won) return { clear: 0, time: 0 };
  const par = tiles * PAR_PER_TILE;
  return { clear: tiles * CLEAR_PER_TILE, time: Math.max(0, Math.round((par - Math.max(0, seconds)) * TIME_BONUS)) };
}
export function finalScore(x: FinalInput): number {
  const b = clearBonus(x);
  return Math.max(0, Math.round(x.score + b.clear + b.time));
}
