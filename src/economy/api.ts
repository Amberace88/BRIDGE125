import { getSupabase } from '../supabase';
import type { BoostKind, PrizeKind } from './config';

/** RPC shapes of supabase/migration_012_economy.sql. Errors come back as `{ ok: false, error }`, never thrown. */
export interface ActiveStake { id: number; tier: 1 | 2 | 3; entry: number; pot: number; started_at: string; shield_used: boolean; expired: boolean }
export interface EconomyState {
  ok: boolean; now: string; today: string; next_reset: string;
  bm: number; xp: number; level: number; prestige: number; shards: number; relics: string[];
  shields: number; boost_xp_until: string | null; boost_luck_until: string | null;
  wheel: { free: boolean; paid: number; max_paid: number; next_price: number | null };
  stake: ActiveStake | null; stake_today: { games: number; profit: number };
  can_prestige: boolean; banned: boolean;
}
interface Granting { granted?: string[]; granted_bm?: number; achievements?: string[]; owned?: string[]; bm?: number; level?: number; level_from?: number; xp?: number }
export interface Fail { ok: false; error: 'auth' | 'banned' | 'network' | 'used' | 'limit' | 'funds' | 'unknown' | 'max' | 'tier' | 'level' | 'owned' | 'none' | 'empty' | string; need?: number }
export type SpinResult = Fail | (Granting & {
  ok: true; idx: number; kind: PrizeKind; amount: number; price: number; bm: number; xp: number; shards: number; shields: number;
  boost_xp_until: string | null; boost_luck_until: string | null; wheel: EconomyState['wheel'];
});
export type BoostResult = Fail | (Granting & { ok: true; kind: BoostKind; price: number; bm: number; shields: number; boost_xp_until: string | null; boost_luck_until: string | null });
export type StakeStartResult = Fail | (Granting & { ok: true; stake: ActiveStake; abandoned: boolean; bm: number });
export interface StakeSettle { id: number; tier: number; entry: number; pot: number; status: 'won' | 'lost' | 'void' | 'expired'; payout: number; lucky: boolean }
/** record_game's JSON (merged into the profile) + the settled stake. */
export type StakeFinishResult = Record<string, unknown> & { bm?: number; stake?: StakeSettle | null; reward?: Record<string, unknown> };
export type ForgeResult = Fail | (Granting & { ok: true; relic: string; cost: number; completed: boolean; item: string | null; shards: number; relics: string[] });
export type PrestigeResult = Fail | (Granting & { ok: true; prestige: number; level: number; xp: number; shards: number });
export type ShieldResult = Fail | { ok: true; shields: number };

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T | Fail> {
  try {
    const sb = await getSupabase();
    if (!sb) return { ok: false, error: 'network' };
    const { data, error } = await sb.rpc(fn, args);
    if (error) return { ok: false, error: 'network' };
    return (data as T) ?? { ok: false, error: 'auth' };
  } catch { return { ok: false, error: 'network' }; }
}

export const economyStateRpc = () => call<EconomyState>('economy_state');
export const wheelSpinRpc = (paid: boolean) => call<SpinResult>('wheel_spin', { paid }) as Promise<SpinResult>;
export const buyBoostRpc = (kind: BoostKind) => call<BoostResult>('buy_boost', { kind }) as Promise<BoostResult>;
export const stakeStartRpc = (tier: 1 | 2 | 3) => call<StakeStartResult>('stake_start', { tier }) as Promise<StakeStartResult>;
export const stakeForfeitRpc = () => call<{ ok: boolean; forfeited?: boolean }>('stake_forfeit');
export const spendShieldRpc = () => call<ShieldResult>('use_shield') as Promise<ShieldResult>;
export const forgeRelicRpc = (collection: string, piece: number) => call<ForgeResult>('forge_relic', { collection, piece }) as Promise<ForgeResult>;
export const prestigeRpc = () => call<PrestigeResult>('do_prestige') as Promise<PrestigeResult>;
export async function stakeFinishRpc(won: boolean): Promise<StakeFinishResult | null> {
  try { const sb = await getSupabase(); if (!sb) return null; const { data, error } = await sb.rpc('stake_finish', { won }); return error ? null : (data as StakeFinishResult); }
  catch { return null; }
}
/** record_game + boosts (XP ×2, Lucky shuffle). Same JSON as record_game. */
export async function recordGamePlusRpc(won: boolean, mode?: string): Promise<Record<string, unknown> | null> {
  try { const sb = await getSupabase(); if (!sb) return null; const { data, error } = await sb.rpc('record_game_plus', mode ? { won, mode } : { won }); return error ? null : (data as Record<string, unknown>); }
  catch { return null; }
}
