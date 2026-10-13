import { getSupabase } from '../supabase';
import type { RewardKind, Track } from './data';

/** RPC shapes of supabase/migration_016_season.sql. Errors come back as `{ ok: false, error }`, never thrown. */

export interface SeasonRow {
  id: string; name: string; starts_at: string; ends_at: string; tiers: number; stars_per_tier: number;
  premium_price: number; skip_price: number; grace_days: number; phase: 'upcoming' | 'live' | 'grace' | 'over';
}
export interface RewardRow { tier: number; track: Track; kind: RewardKind; amount: number; item: string | null }
export interface SeasonMe {
  stars: number; tier: number; premium: boolean; privileged: boolean; banned: boolean;
  claimed: { free: number[]; premium: number[] };
  stars_today: Record<string, number>;
  bm: number; diamonds: number; shards: number; owned: string[]; xp: number; level: number;
}
export interface SeasonStateData { ok: true; now: string; season: SeasonRow; rewards: RewardRow[]; me: SeasonMe | null }

export interface SpinOutcome { idx: number; kind: 'bm' | 'xp' | 'shards' | 'boost_xp' | 'boost_luck' | 'shield'; amount: number }
/** What one claim paid (spin outcomes included). */
export interface Granted { kind: RewardKind; amount: number; tier: number; track: Track; item?: string; spins?: SpinOutcome[] }

export interface Fail { ok: false; error: 'auth' | 'banned' | 'network' | 'none' | 'bad' | 'locked' | 'premium' | 'owned' | 'funds' | 'max' | string; need?: number; diamonds?: number }
export type ClaimResult = Fail | { ok: true; already?: boolean; tier: number; track: Track; reward?: Granted; granted?: string[]; granted_bm?: number; me: SeasonMe };
export type ClaimAllResult = Fail | { ok: true; rewards: Granted[]; granted?: string[]; granted_bm?: number; me: SeasonMe };
export type UnlockResult = Fail | { ok: true; price: number; admin: boolean; me: SeasonMe };
export type SkipResult = Fail | { ok: true; skipped: number; price: number; tier_from: number; admin: boolean; me: SeasonMe };
export type GodResult = Fail | { ok: true; me: SeasonMe };

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T | Fail> {
  try {
    const sb = await getSupabase();
    if (!sb) return { ok: false, error: 'network' };
    const { data, error } = await sb.rpc(fn, args);
    if (error) return { ok: false, error: 'network' };
    return (data as T) ?? { ok: false, error: 'network' };
  } catch { return { ok: false, error: 'network' }; }
}

export const seasonStateRpc = () => call<SeasonStateData>('season_state') as Promise<SeasonStateData | Fail>;
export const seasonClaimRpc = (tier: number, track: Track) => call<ClaimResult>('season_claim', { p_tier: tier, p_track: track }) as Promise<ClaimResult>;
export const seasonClaimAllRpc = () => call<ClaimAllResult>('season_claim_all') as Promise<ClaimAllResult>;
export const seasonUnlockRpc = () => call<UnlockResult>('season_unlock') as Promise<UnlockResult>;
export const seasonSkipRpc = (n: number) => call<SkipResult>('season_skip', { n }) as Promise<SkipResult>;
export const seasonGodRpc = (action: 'stars' | 'reset', amount = 0) => call<GodResult>('season_god', { action, amount }) as Promise<GodResult>;
