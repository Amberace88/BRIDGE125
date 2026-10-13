import { getSupabase } from '../../supabase';
import type { ChallengeSide } from './compare';

/** RPCs of supabase/migration_022_games_social.sql for challenge links (bridge125.com/c/<code>). */

export interface ChallengeAnswer { rk: number; username: string; avatar: string | null; avatar_url: string | null; won: boolean; score: number | null; seconds: number; vs: number; is_me: boolean }

export interface Challenge {
  ok: boolean; error?: 'bad' | 'unknown' | string;
  code: string; game: string; seed: string; level: string | null; same_deal: boolean;
  created_at: string; expires_at: string; expired: boolean; mine: boolean;
  creator: { username: string; avatar: string | null; avatar_url: string | null; level: number; frame: string | null; title: string | null };
  result: ChallengeSide & { verified: boolean };
  answers: number; results: ChallengeAnswer[];
  me: (ChallengeSide & { vs: number }) | null;
}

export interface CreateResult { ok: boolean; error?: 'auth' | 'banned' | 'unknown' | 'bad' | 'limit' | string; code?: string; verified?: boolean; expires_at?: string }
export interface SubmitResult { ok: boolean; error?: 'auth' | 'own' | 'expired' | 'unknown' | 'bad' | string; again?: boolean; me?: ChallengeSide; them?: ChallengeSide; vs?: number }
export interface MyChallenge { code: string; game: string; won: boolean; score: number | null; seconds: number; created_at: string; expired: boolean; answers: number; beaten: number }

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    const sb = await getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.rpc(name, args);
    if (error) return null;
    return (data as T) ?? null;
  } catch { return null; }
}

export const challengeGetRpc = (code: string) => rpc<Challenge>('challenge_get', { p_code: code });

export const challengeCreateRpc = (a: { game: string; seed: string; level?: string | null; won: boolean; score?: number | null; seconds: number; sameDeal: boolean }) =>
  rpc<CreateResult>('challenge_create', {
    p_game: a.game, p_seed: a.seed, p_level: a.level ?? null, p_won: a.won, p_score: a.score ?? null,
    p_seconds: Math.round(a.seconds), p_same_deal: a.sameDeal,
  });

export const challengeSubmitRpc = (code: string, r: ChallengeSide) =>
  rpc<SubmitResult>('challenge_submit', { p_code: code, p_won: r.won, p_score: r.score ?? null, p_seconds: Math.round(r.seconds) });

export const challengeMineRpc = (lim = 10) => rpc<MyChallenge[]>('challenge_mine', { p_lim: lim });
