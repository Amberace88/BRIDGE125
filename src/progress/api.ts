import { getSupabase } from '../supabase';

/** Server snapshot returned by `progress()` (see migration_003). */
export interface ProgressData {
  xp: number; level: number; level_floor: number; level_next: number;
  bm: number; owned: string[]; achievements: string[];
  games_played: number; wins: number; win_streak: number; best_win_streak: number;
  streak: number; last_daily: string | null; can_claim: boolean; claim_day: number; claim_streak: number;
  today: string; next_reset: string; banned: boolean;
}

/** The `reward` object that record_game() merges into the store's profile. */
export interface GameReward {
  games_played: number; throttled: boolean; won?: boolean; capped?: boolean;
  xp?: number; bm?: number; level_from?: number; level?: number; level_bm?: number;
  achievements?: string[]; achievement_bm?: number;
}

export interface DailyResult {
  ok: boolean; error?: string; claimed?: boolean; already?: boolean; streak?: number; day?: number;
  reward_bm?: number; item?: string | null; bm?: number; owned?: string[];
  achievements?: string[]; achievement_bm?: number; next_reset?: string;
}

export interface BuyResult {
  ok: boolean; error?: 'auth' | 'banned' | 'unknown' | 'owned' | 'funds' | 'network' | string;
  need?: number; item?: string; price?: number; admin?: boolean; bm?: number; owned?: string[];
}

export interface ReportResult { ok: boolean; error?: string; granted?: boolean; code?: string; reward_bm?: number; bm?: number; achievements?: string[] }

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export const fetchProgress = () => rpc<ProgressData>('progress');
export const claimDailyRpc = () => rpc<DailyResult>('claim_daily');
export const reportAchievementRpc = (code: string) => rpc<ReportResult>('report_achievement', { code });

export async function buyItemRpc(itemId: string): Promise<BuyResult> {
  try { return (await rpc<BuyResult>('buy_item', { item_id: itemId })) ?? { ok: false, error: 'network' }; }
  catch { return { ok: false, error: 'network' }; }
}
