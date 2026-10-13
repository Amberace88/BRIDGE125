import { getSupabase } from '../supabase';
import type { QuestEvents, QuestKind, Metric } from './quests';
import type { StarMap } from './data';

/** RPC wrappers for supabase/migration_011_journey.sql. Every call resolves to null when offline / not migrated. */

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw error;
  return data as T;
}
async function soft<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  try { return await rpc<T>(fn, args); } catch { return null; }
}

/* ------------------------------------------------------------------ journey */

/** `route` is the player's stored route (migration 018), null when none is stored yet (or before 018). */
export interface JourneyProgressData { stars: StarMap; total: number; route?: string | null }

export interface JourneyReward {
  bm: number; xp: number; item: string | null; title: string | null;
  level_from?: number; level?: number; level_bm?: number;
}

export interface JourneyCompleteResult {
  ok: boolean; error?: 'auth' | 'banned' | 'stars' | 'unknown' | 'locked' | 'slow' | 'network' | string; retry_in?: number;
  match?: string; stars?: number; prev?: number; new_stars?: number; first?: boolean;
  reward?: JourneyReward; bm?: number; xp?: number; level?: number; owned?: string[];
}

export interface JourneyImportResult { ok: boolean; error?: string; imported?: number; stars?: StarMap; bm?: number; owned?: string[]; reward?: JourneyReward; route?: string }
export interface JourneyRouteResult { ok: boolean; error?: 'auth' | 'banned' | 'unknown' | 'started' | string; route?: string }

/** PostgREST "no function with these arguments" — the database predates migration 018: retry the old signature. */
const isMissingFn = (e: unknown) => {
  const x = e as { code?: string; message?: string } | null;
  return x?.code === 'PGRST202' || /could not find the function/i.test(x?.message ?? '');
};
async function withLegacy<T>(fn: string, args: Record<string, unknown>, legacy: Record<string, unknown>): Promise<T | null> {
  try { return await rpc<T>(fn, args); } catch (e) { return isMissingFn(e) ? soft<T>(fn, legacy) : null; }
}

export const journeyProgressRpc = () => soft<JourneyProgressData>('journey_progress');
export const journeyCompleteRpc = (matchId: string, stars: number, route: string) =>
  withLegacy<JourneyCompleteResult>('journey_complete', { match_id: matchId, stars, route }, { match_id: matchId, stars });
export const journeyImportRpc = (progress: StarMap, route: string | null) =>
  withLegacy<JourneyImportResult>('journey_import', { progress, route }, { progress });
export const journeySetRouteRpc = (route: string) => soft<JourneyRouteResult>('journey_set_route', { route_id: route });

/* ------------------------------------------------------------------ quests */

export interface ServerQuestRow { id: string; kind: QuestKind; metric: Metric; goal: number; progress: number; bm: number; xp: number; claimed: boolean }

export interface QuestBoardData {
  today: string; week: string; next_daily: string; next_weekly: string;
  reroll_available: boolean; reroll_cost: number;
  chest: { claimed: boolean; bm: number; xp: number };
  daily: ServerQuestRow[]; weekly: ServerQuestRow[];
}

export interface QuestActionResult {
  ok: boolean; error?: 'auth' | 'banned' | 'slow' | 'unknown' | 'claimed' | 'incomplete' | 'used' | 'funds' | 'none' | 'bad' | 'network' | string;
  retry_in?: number; board?: QuestBoardData;
  reward?: { bm: number; xp: number; level_from?: number; level?: number; level_bm?: number };
  bm?: number; xp?: number; level?: number; replaced?: string; id?: string;
}

export const questsRpc = () => soft<QuestBoardData>('quests');
export const questProgressRpc = (events: QuestEvents) => soft<QuestActionResult>('quest_progress', { events });
export const claimQuestRpc = (id: string) => soft<QuestActionResult>('claim_quest', { quest_id: id });
export const rerollQuestRpc = (id: string) => soft<QuestActionResult>('reroll_quest', { quest_id: id });
export const claimChestRpc = () => soft<QuestActionResult>('claim_quest_chest');
