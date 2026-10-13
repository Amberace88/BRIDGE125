import type { MiniStats } from '../api';
import type { GameModule } from '../types';

/**
 * "Card room level" (Kāršu zāles līmenis): one cross-game level for every mini game, derived from the per-game records
 * (minigame_stats — the server's when signed in, this device's for guests), so it needs no extra table and never pays:
 * it is the hub's sense of progress. Bridge keeps its own XP and level (profiles.xp / level).
 *
 *   room XP = Σ over games ( 10 · wins + 3 · losses + 15 · daily puzzles + 5 · best day streak ) + 25 per game won at least once
 *   level L needs 40 · (L − 1) · L room XP  (L2 80 · L3 240 · L5 800 · L10 3 600 · L20 15 200)
 */
export const HALL_PER = { win: 10, loss: 3, daily: 15, streak: 5, variety: 25 } as const;

export function hallXp(stats: Record<string, MiniStats | undefined>): number {
  let xp = 0;
  for (const s of Object.values(stats)) {
    if (!s || s.played <= 0) continue;
    const won = Math.max(0, s.won), lost = Math.max(0, s.played - s.won);
    xp += HALL_PER.win * won + HALL_PER.loss * lost + HALL_PER.daily * Math.max(0, s.dailies) + HALL_PER.streak * Math.max(0, s.best_streak);
    if (won > 0) xp += HALL_PER.variety;
  }
  return xp;
}

/** XP needed to reach level `l` (level 1 = 0). */
export const hallFloor = (l: number) => 40 * (l - 1) * l;

export interface HallLevel { level: number; xp: number; floor: number; next: number; pct: number; rank: number }

/** Level, its XP window and the rank name index (0 … 4, one per five levels). */
export function hallLevel(xp: number): HallLevel {
  const x = Math.max(0, Math.floor(xp));
  let l = Math.max(1, Math.floor((1 + Math.sqrt(1 + x / 10)) / 2));
  while (hallFloor(l + 1) <= x) l++;
  while (l > 1 && hallFloor(l) > x) l--;
  const floor = hallFloor(l), next = hallFloor(l + 1);
  return { level: l, xp: x, floor, next, pct: Math.min(1, (x - floor) / (next - floor)), rank: Math.min(4, Math.floor((l - 1) / 5)) };
}

export interface ShowcaseEntry { m: GameModule; st: MiniStats }

/** The showcase strip: every visible game the player has played, most played first (ties: registry order). */
export function showcase(mods: readonly GameModule[], stats: Record<string, MiniStats | undefined>): ShowcaseEntry[] {
  return mods
    .map((m, i) => ({ m, i, st: stats[m.id] }))
    .filter((x): x is { m: GameModule; i: number; st: MiniStats } => !x.m.hidden && !!x.st && x.st.played > 0)
    .sort((a, b) => b.st.played - a.st.played || a.i - b.i)
    .map(({ m, st }) => ({ m, st }));
}

/** Distinct games finished today on this device (marathon progress for guests / before the server answers). */
export function gamesToday(stats: Record<string, MiniStats | undefined>, today: string, playedToday: Set<string>): string[] {
  const out = new Set(playedToday);
  for (const s of Object.values(stats)) if (s && s.last_day === today) out.add(s.game);
  return [...out].sort();
}

/** Days / hours / minutes / seconds until `ends` (never negative). */
export function countdown(ends: number, now = Date.now()) {
  const t = Math.max(0, Math.floor((ends - now) / 1000));
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60, total: t };
}
