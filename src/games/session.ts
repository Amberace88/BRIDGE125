import { track } from '../analytics';
import { getSupabase } from '../supabase';
import type { GameResult } from './types';

/**
 * Report a finished mini game: analytics now, rewards/quests/season/leaderboards on the server (RPC `record_minigame`,
 * migration 019). Resolves to the server's answer (new BM / XP / level …) or null when offline, signed out or not
 * migrated yet — the game must never block on it.
 */
export async function reportGame(r: GameResult): Promise<Record<string, unknown> | null> {
  track('minigame_end', { game: r.game, won: r.won, score: r.score ?? null, seconds: Math.round(r.seconds), level: r.level ?? null, daily: !!r.day });
  try {
    const sb = await getSupabase();
    if (!sb) return null;
    const { data: s } = await sb.auth.getSession();
    if (!s.session) return null;
    const { data, error } = await sb.rpc('record_minigame', {
      p_game: r.game, p_won: r.won, p_score: r.score ?? null, p_seconds: Math.round(r.seconds),
      p_level: r.level ?? null, p_day: r.day ?? null, p_details: r.details ?? {},
    });
    if (error) return null;
    return (data as Record<string, unknown>) ?? null;
  } catch { return null; }
}

/** Analytics when a game starts (call once per new game). */
export const reportStart = (game: string, extra?: Record<string, unknown>) => track('minigame_start', { game, ...extra });
