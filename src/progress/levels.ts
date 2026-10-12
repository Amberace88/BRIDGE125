/**
 * Level curve — mirrors supabase/migration_003_progress.sql (xp_for_level / level_for_xp / level_reward).
 * The server is the source of truth; these are only used to draw rings and bars.
 */

export const XP_PER_GAME = 25;
export const XP_PER_WIN = 60;
export const MAX_LEVEL = 100;

/** Total XP needed to reach level `l` (L1 = 0, L2 = 100, L3 = 240, L5 = 640, L10 = 2 340). */
export const xpForLevel = (l: number) => { const n = Math.max(1, l); return 20 * n * n + 40 * n - 60; };

export function levelForXp(xp: number): number {
  const x = Math.max(0, xp);
  let l = Math.max(1, Math.floor(Math.sqrt((x + 80) / 20)) - 1);
  while (l < MAX_LEVEL && xpForLevel(l + 1) <= x) l++;
  while (l > 1 && xpForLevel(l) > x) l--;
  return Math.min(l, MAX_LEVEL);
}

/** BM paid on reaching level `l`: 50·L, doubled every 5th level. */
export const levelReward = (l: number) => 50 * l * (l % 5 === 0 ? 2 : 1);

export interface LevelProgress { level: number; into: number; need: number; pct: number; floor: number; next: number }

export function levelProgress(xp: number, level = levelForXp(xp)): LevelProgress {
  const floor = xpForLevel(level), next = xpForLevel(level + 1);
  const need = Math.max(1, next - floor), into = Math.min(need, Math.max(0, xp - floor));
  return { level, into, need, pct: level >= MAX_LEVEL ? 1 : into / need, floor, next };
}

/** Daily reward ladder (BM) for days 1–7 of a streak cycle — mirrors claim_daily(). */
export const DAILY_REWARDS = [100, 150, 200, 300, 400, 500, 1000] as const;
/** Cosmetic unlocked on day 7 of the first cycle (if not owned yet). */
export const DAILY_ITEM = 'emerald';
