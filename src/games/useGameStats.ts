import { useEffect, useSyncExternalStore } from 'react';
import { useApp } from '../store';
import { myStatsRpc, type MiniStats } from './api';
import type { GameResult } from './types';

/**
 * The player's record per mini game, shared by the hub tiles and the game-over sheet.
 *  - signed in → the server's minigame_stats (RPC minigame_my_stats, migration 019), patched after every reported game;
 *  - guest (or before the migration) → the same numbers kept on this device, so a guest still sees best / streak.
 */

type StatsMap = Record<string, MiniStats>;
interface S { uid: string | null; server: StatsMap | null; status: 'idle' | 'loading' | 'ready'; local: StatsMap }

const LOCAL_KEY = 'b125.games.stats.v1';
const readLocal = (): StatsMap => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}') as StatsMap; } catch { return {}; } };

let state: S = { uid: null, server: null, status: 'idle', local: typeof localStorage === 'undefined' ? {} : readLocal() };
const subs = new Set<() => void>();
const set = (p: Partial<S>) => { state = { ...state, ...p }; subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const get = () => state;

/** YYYY-MM-DD in Riga — the server's calendar for streaks and daily puzzles. */
export function rigaToday(now = new Date()): string {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
  catch { return now.toISOString().slice(0, 10); }
}
const prevDay = (d: string) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10); };

export const emptyStats = (game: string): MiniStats => ({
  game, played: 0, won: 0, best_score: null, best_seconds: null, streak: 0, best_streak: 0, last_day: null,
  win_streak: 0, best_win_streak: 0, dailies: 0, daily_streak: 0, last_daily: null, daily_done: false,
});

/** Fold one finished game into a stats record — the same rules as record_minigame (pure; exported for tests). */
export function foldResult(prev: MiniStats | undefined, r: GameResult, today = rigaToday()): MiniStats {
  const s = { ...(prev ?? emptyStats(r.game)) };
  const secs = Math.max(0, Math.round(r.seconds));
  s.played += 1;
  if (r.won) {
    s.won += 1;
    s.win_streak += 1;
    if (r.score != null && (s.best_score == null || r.score > s.best_score)) s.best_score = Math.round(r.score);
    if (s.best_seconds == null || secs < s.best_seconds) s.best_seconds = secs;
    s.streak = s.last_day === today ? s.streak : s.last_day === prevDay(today) ? s.streak + 1 : 1;
    s.last_day = today;
    if (r.day && s.last_daily !== r.day) {
      s.dailies += 1;
      s.daily_streak = s.last_daily === prevDay(r.day) ? s.daily_streak + 1 : 1;
      s.last_daily = !s.last_daily || r.day > s.last_daily ? r.day : s.last_daily;
    }
  } else {
    s.win_streak = 0;
  }
  s.best_win_streak = Math.max(s.best_win_streak, s.win_streak);
  s.best_streak = Math.max(s.best_streak, s.streak);
  s.daily_done = s.last_daily === today;
  return s;
}

/** Streaks shown today: a missed day breaks them (the server does the same in minigame_my_stats). */
export function liveStats(s: MiniStats, today = rigaToday()): MiniStats {
  const y = prevDay(today);
  return {
    ...s,
    streak: s.last_day === today || s.last_day === y ? s.streak : 0,
    daily_streak: s.last_daily === today || s.last_daily === y ? s.daily_streak : 0,
    daily_done: s.last_daily === today,
  };
}

/** Called by reportGame() for every finished game (guests and signed-in players alike). */
export function recordLocal(r: GameResult) {
  const local = { ...state.local, [r.game]: foldResult(state.local[r.game], r) };
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(local)); } catch { /* */ }
  set({ local });
}

/** The server's fresh record for one game (from record_minigame). */
export function noteServerStats(s: MiniStats | undefined) {
  if (!s?.game || !state.server) return;
  set({ server: { ...state.server, [s.game]: s } });
}

let inflight: Promise<void> | null = null;
export function loadGameStats(uid: string | null, force = false): Promise<void> {
  if (uid !== state.uid) { set({ uid, server: null, status: 'idle' }); inflight = null; }
  if (!uid) return Promise.resolve();
  if (!force && (state.status === 'ready' || inflight)) return inflight ?? Promise.resolve();
  set({ status: 'loading' });
  const p = myStatsRpc().then(d => { if (state.uid === uid) set({ server: d, status: 'ready' }); })
    .finally(() => { if (inflight === p) inflight = null; });
  inflight = p;
  return p;
}

/** { stats: per game id, loading } — the server's record when signed in (and migrated), else this device's. */
export function useGameStats() {
  const app = useApp();
  const uid = app.session?.user.id ?? null;
  const st = useSyncExternalStore(subscribe, get, get);
  useEffect(() => { void loadGameStats(uid); }, [uid]);
  const server = st.uid === uid && uid ? st.server : null;
  const raw = server ?? st.local;
  const today = rigaToday();
  const stats: StatsMap = {};
  for (const [k, v] of Object.entries(raw)) stats[k] = liveStats(v, today);
  return { stats, loading: !!uid && st.status !== 'ready', fromServer: !!server, refresh: () => loadGameStats(uid, true) };
}
