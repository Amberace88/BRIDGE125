import { useEffect, useSyncExternalStore } from 'react';
import { getSupabase } from '../../supabase';
import { useApp } from '../../store';
import { onGameRecorded, rigaToday } from '../useGameStats';

/**
 * RPC types + a tiny store for supabase/migration_022_games_social.sql: the week's tournament, the game of the day and
 * the marathon (one call, `tournament_current`, readable by guests), the standings and the prize claim.
 * Every call resolves to null / throws softly when offline or before the migration — the hub then hides those parts.
 */

export type TourMetric = 'wins' | 'score';
export type TourTier = 'gold' | 'silver' | 'bronze' | 'top10';

export interface TourMe { rank: number; points: number; eligible: boolean; played: number; won: number; best_score: number | null; best_seconds: number | null }
export interface TourPrize { tier: TourTier; bm: number; items: string[] }
export interface TourUnclaimed { week: string; game: string; rank: number; tier: TourTier; bm: number; items: string[] }
export interface TourPodium { rank: number; username: string; avatar: string | null; avatar_url: string | null; tier: TourTier }

export interface ArenaState {
  ok: boolean;
  week: string; game: string; metric: TourMetric; override?: boolean;
  /** next Monday 00:00 Riga (ISO timestamp) */
  ends_at: string;
  players: number;
  prizes: TourPrize[];
  me: TourMe | null;
  unclaimed: TourUnclaimed[];
  last: { week: string; game: string; metric: TourMetric; eligible: number; podium: TourPodium[] } | null;
  gotd: { game: string; day: string; mult: number; bm_today: number; xp_today: number };
  marathon: { games: string[]; goal: number; claimed: boolean; bm: number; xp: number } | null;
}

export interface TourRow {
  rank: number; username: string; points: number; eligible: boolean; played: number; won: number;
  best_score: number | null; best_seconds: number | null; level: number;
  avatar: string | null; avatar_url: string | null; role: string | null; frame: string | null; title: string | null;
  tier: TourTier | null; is_me: boolean;
}

export interface ClaimResult { ok: boolean; error?: string; bm_gain?: number; items?: string[]; prizes?: TourUnclaimed[]; bm?: number; owned?: string[] }
export interface MarathonResult { ok: boolean; error?: string; bm_gain?: number; xp_gain?: number; games?: string[]; bm?: number; xp?: number; level?: number }

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    const sb = await getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.rpc(name, args);
    if (error) return null;
    return (data as T) ?? null;
  } catch { return null; }
}

export const tournamentCurrentRpc = () => rpc<ArenaState>('tournament_current');
export const tournamentClaimRpc = () => rpc<ClaimResult>('tournament_claim');
export const marathonClaimRpc = () => rpc<MarathonResult>('games_marathon_claim');

/** Throws on failure (the board shows its error state). */
export async function tournamentBoardRpc(week?: string | null, lim = 50): Promise<TourRow[]> {
  const sb = await getSupabase();
  if (!sb) throw new Error('offline');
  const { data, error } = await sb.rpc('tournament_board', { p_week: week ?? null, p_lim: lim });
  if (error) throw error;
  return ((data ?? []) as TourRow[]).map(r => ({ ...r, rank: Number(r.rank), points: Number(r.points) }));
}

/* ------------------------------------------------------------------ store (one fetch per uid, refreshed after games) */

interface S { uid: string | null | undefined; data: ArenaState | null; status: 'idle' | 'loading' | 'ready'; at: number; today: string[]; day: string }
const TODAY_KEY = 'b125.games.today.v1';
function readToday(): { day: string; games: string[] } {
  try { const x = JSON.parse(localStorage.getItem(TODAY_KEY) ?? 'null') as { day: string; games: string[] } | null; if (x && x.day === rigaToday()) return x; } catch { /* */ }
  return { day: rigaToday(), games: [] };
}

let state: S = { uid: undefined, data: null, status: 'idle', at: 0, ...(() => { const t = typeof localStorage === 'undefined' ? { day: '', games: [] } : readToday(); return { today: t.games, day: t.day }; })() };
const subs = new Set<() => void>();
const set = (p: Partial<S>) => { state = { ...state, ...p }; subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const get = () => state;

let inflight: Promise<void> | null = null;
const STALE = 90_000;
export function loadArena(uid: string | null, force = false): Promise<void> {
  if (uid !== state.uid) { set({ uid, data: null, status: 'idle', at: 0 }); inflight = null; }
  if (!force && (inflight || (state.status === 'ready' && Date.now() - state.at < STALE))) return inflight ?? Promise.resolve();
  set({ status: state.data ? 'ready' : 'loading' });
  const p = tournamentCurrentRpc().then(d => { if (state.uid === uid) set({ data: d?.ok ? d : null, status: 'ready', at: Date.now() }); })
    .finally(() => { if (inflight === p) inflight = null; });
  inflight = p;
  return p;
}
/** Patch the cached state (after a claim) without a round trip. */
export const patchArena = (p: Partial<ArenaState>) => { if (state.data) set({ data: { ...state.data, ...p } }); };

let wired = false;
function wire() {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  onGameRecorded(r => {
    const t = readToday();
    const games = t.games.includes(r.game) ? t.games : [...t.games, r.game].sort();
    try { localStorage.setItem(TODAY_KEY, JSON.stringify({ day: t.day, games })); } catch { /* */ }
    set({ today: games, day: t.day });
    // the server has counted the game a moment later (reportGame → record_minigame → triggers)
    setTimeout(() => { if (state.uid !== undefined) void loadArena(state.uid ?? null, true); }, 2200);
  });
}

/** The hub's view: this week's tournament, the game of the day, the marathon (null until the server answered). */
export function useArena() {
  const app = useApp();
  const uid = app.session?.user.id ?? null;
  const st = useSyncExternalStore(subscribe, get, get);
  useEffect(() => { wire(); if (app.online) void loadArena(uid); }, [uid, app.online]);
  const today = st.day === rigaToday() ? st.today : [];
  return { data: st.uid === uid ? st.data : null, loading: st.status !== 'ready', today, refresh: () => loadArena(uid, true) };
}
