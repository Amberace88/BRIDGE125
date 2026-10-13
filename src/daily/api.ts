import { getSupabase } from '../supabase';

/** RPC wrappers for supabase/migration_014_daily_referrals.sql. Every call resolves to null when offline / not migrated. */
async function soft<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    const sb = await getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.rpc(fn, args);
    if (error) return null;
    return data as T;
  } catch { return null; }
}

/* ------------------------------------------------------------------ daily challenge */

export interface RewardInfo { bm: number; xp: number; level_from?: number; level?: number; level_bm?: number }

export interface SubmitResult {
  ok: boolean;
  error?: 'auth' | 'banned' | 'day' | 'bad' | 'impossible' | 'mismatch' | 'done' | string;
  first?: boolean; day?: string; score?: number; turns?: number; won?: boolean; rank?: number; total?: number;
  reward?: RewardInfo | null; bm?: number; xp?: number; level?: number;
}

export interface BoardRow {
  rank: number; username: string; score: number; turns: number; won: boolean;
  avatar: string | null; avatar_url: string | null; frame: string | null; role: string | null; is_me: boolean; total: number;
}

export interface ClaimDay { day: string; rank: number; total: number; tier: 'top1' | 'top10' | 'top10pct' | null; bm: number; xp: number; score: number }
export interface ClaimResult { ok: boolean; error?: string; days?: ClaimDay[]; reward?: RewardInfo; bm?: number; xp?: number; level?: number }

export const challengeSubmitRpc = (day: string, score: number, turns: number, won: boolean, details: Record<string, number>) =>
  soft<SubmitResult>('challenge_submit', { day, score, turns, won, details });

export async function challengeBoardRpc(day: string, lim = 50): Promise<BoardRow[] | null> {
  const rows = await soft<BoardRow[]>('challenge_board', { day, lim });
  return rows ? rows.map(r => ({ ...r, rank: Number(r.rank), total: Number(r.total), score: Number(r.score), turns: Number(r.turns) })) : null;
}

export const challengeClaimRpc = () => soft<ClaimResult>('challenge_claim');

/* ------------------------------------------------------------------ referrals */

export interface RefFriend { name: string; avatar: string | null; avatar_url: string | null; status: 'pending' | 'rewarded'; games: number; at: string }
export interface RefReward { bm: number; games: number; item: string }
export interface RefInfo {
  ok: boolean; error?: string;
  code?: string; joined?: number; rewarded?: number; bm_earned?: number;
  friends?: RefFriend[];
  invited_by?: { name: string; status: 'pending' | 'rewarded'; games: number; target: number } | null;
  reward?: RefReward;
}
export interface RefClaim { ok: boolean; error?: 'auth' | 'banned' | 'claimed' | 'unknown' | 'self' | 'old' | 'device' | 'limit' | string; name?: string; games?: number; target?: number; reward?: RefReward }
export interface RefPeek { ok: boolean; name?: string; reward?: RefReward }

export const referralCodeRpc = (device: string) => soft<RefInfo>('referral_code', { device });
export const referralClaimRpc = (code: string, device: string) => soft<RefClaim>('referral_claim', { code, device });
export const referralPeekRpc = (code: string) => soft<RefPeek>('referral_peek', { code });
