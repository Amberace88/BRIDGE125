import { getSupabase } from '../supabase';

/** RPC types for supabase/migration_019_minigames.sql. Every call resolves to null when offline / not migrated. */

/** One player's record in one game (minigame_stats). The streaks already read 0 once a day was missed. */
export interface MiniStats {
  game: string; played: number; won: number;
  best_score: number | null; best_seconds: number | null;
  streak: number; best_streak: number; last_day: string | null;
  win_streak: number; best_win_streak: number;
  dailies: number; daily_streak: number; last_daily: string | null; daily_done: boolean | null;
}

export interface MiniReward {
  bm: number; xp: number; daily_bm: number; daily_xp: number; stars: number;
  level_from: number; level: number; level_bm: number;
  achievements: string[]; achievement_bm: number;
}

export interface MiniQuestRow { id: string; metric: string; goal: number; progress: number; claimed: boolean }

/** What `record_minigame` answers (= what `reportGame()` resolves to). */
export interface MiniResult {
  ok: boolean;
  error?: 'auth' | 'banned' | 'unknown' | 'bad' | 'fast' | 'slow' | string;
  retry_in?: number; min_seconds?: number;
  game?: string; won?: boolean; paid?: boolean; capped?: boolean; daily?: boolean; best?: boolean;
  reward?: MiniReward;
  bm?: number; xp?: number; level?: number; achievements?: string[];
  stats?: MiniStats; quests?: MiniQuestRow[];
}

export type BoardKind = 'best' | 'week' | 'daily';
export interface BoardRow {
  rank: number; username: string; value: number | null; seconds: number | null; played: number; won: number; level: number;
  avatar: string | null; avatar_url: string | null; role: string | null; is_me: boolean;
}

/** Narrow whatever `reportGame()` resolved to. */
export const asMiniResult = (x: unknown): MiniResult | null =>
  x && typeof x === 'object' && typeof (x as MiniResult).ok === 'boolean' ? (x as MiniResult) : null;

export async function myStatsRpc(): Promise<Record<string, MiniStats> | null> {
  try {
    const sb = await getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.rpc('minigame_my_stats');
    if (error) return null;
    return (data as Record<string, MiniStats> | null) ?? null;
  } catch { return null; }
}

/** Throws on failure (the board shows its error state). */
export async function boardRpc(game: string, kind: BoardKind, day?: string | null, lim = 50): Promise<BoardRow[]> {
  const sb = await getSupabase();
  if (!sb) throw new Error('offline');
  const { data, error } = await sb.rpc('minigame_board', { p_game: game, p_kind: kind, p_day: day ?? null, p_lim: lim });
  if (error) throw error;
  return ((data ?? []) as BoardRow[]).map(r => ({
    ...r, rank: Number(r.rank), value: r.value == null ? null : Number(r.value), seconds: r.seconds == null ? null : Number(r.seconds),
  }));
}
