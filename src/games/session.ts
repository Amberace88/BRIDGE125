import { track } from '../analytics';
import { getSupabase } from '../supabase';
import type { GameResult } from './types';
import { recordLocal } from './useGameStats';
import { submitResult } from '../offline/sync';
import { isOffline } from '../offline/net';
import { storedUid } from '../offline/session';

/**
 * Report a finished mini game: analytics now, rewards/quests/season/leaderboards on the server (RPC `record_minigame`,
 * migration 019). Resolves to the server's answer (new BM / XP / level …) or null when offline (then the result waits
 * in the offline queue and is sent later), signed out or not migrated yet — the game must never block on it.
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
    const { data: s } = await sb.auth.getSession().catch(() => ({ data: { session: null } }));
    const uid = s.session?.user.id ?? (isOffline() ? storedUid() : null);
    if (!uid) return null;
    // through the offline queue: stored on the device with a nonce, sent now or as soon as the connection is back
    // (src/offline/sync.ts applies a late answer app-wide, same as below)
    const out = await submitResult('mini', uid, {
      p_game: r.game, p_won: r.won, p_score: r.score ?? null, p_seconds: Math.round(r.seconds),
      p_level: r.level ?? null, p_day: r.day ?? null, p_details: r.details ?? {},
    }) as Record<string, unknown> | null;
    if (out?.ok) void import('./effects').then(m => m.applyMiniResult(uid, out)).catch(() => {});
    return out ?? null;
  } catch { return null; }
}

/** Analytics when a game starts (call once per new game). */
export const reportStart = (game: string, extra?: Record<string, unknown>) => track('minigame_start', { game, ...extra });
