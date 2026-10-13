import { track } from '../analytics';
import { getSupabase } from '../supabase';
import type { GameResult } from './types';
import { recordLocal } from './useGameStats';

/**
 * Report a finished mini game: analytics now, rewards/quests/season/leaderboards on the server (RPC `record_minigame`,
 * migration 019). Resolves to the server's answer (new BM / XP / level …) or null when offline, signed out or not
 * migrated yet — the game must never block on it.
 *
 * The answer is also applied app-wide (./effects.ts): balance + level in the header, level-up toast, medals, quest
 * progress toast and the hub's stats. The player's record is kept on this device too, so guests see their bests.
 * The answer's shape is `MiniResult` (./api.ts); <GameResultSheet/> renders it.
 */
export async function reportGame(r: GameResult): Promise<Record<string, unknown> | null> {
  track('minigame_end', { game: r.game, won: r.won, score: r.score ?? null, seconds: Math.round(r.seconds), level: r.level ?? null, daily: !!r.day });
  try { recordLocal(r); } catch { /* storage full / private mode */ }
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
    const out = (data as Record<string, unknown>) ?? null;
    if (out?.ok) void import('./effects').then(m => m.applyMiniResult(s.session!.user.id, out)).catch(() => {});
    return out;
  } catch { return null; }
}

/** Analytics when a game starts (call once per new game). */
export const reportStart = (game: string, extra?: Record<string, unknown>) => track('minigame_start', { game, ...extra });
