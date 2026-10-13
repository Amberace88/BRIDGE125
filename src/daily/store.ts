import { useSyncExternalStore } from 'react';
import type { GameState } from '../engine/engine';
import { pushProfile, pushToast } from '../progress/store';
import { track } from '../analytics';
import { challengeClaimRpc, challengeSubmitRpc, type ClaimDay, type SubmitResult } from './api';
import { dailyScore, rigaDay, type DailyResult } from './config';

/**
 * Daily challenge state on this device:
 *  - results per day (`b125.daily.v1`): the scored attempt, whether the server has it, my rank;
 *  - the scored game in progress (`b125.daily.game`): leaving mid-game resumes it — the attempt is not restarted,
 *    so nobody gets to see the deal and try again for a better score;
 *  - guests keep their score locally; it is submitted once they sign in (same day).
 */

export interface LocalEntry extends DailyResult {
  submitted?: boolean;
  rank?: number | null;
  total?: number | null;
  /** server said no (impossible / day passed) — never retried */
  rejected?: string;
  at: number;
}

const KEY = 'b125.daily.v1';
const GAME_KEY = 'b125.daily.game';

function readAll(): Record<string, LocalEntry> {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as Record<string, LocalEntry> : {}; } catch { return {}; }
}
function writeAll(m: Record<string, LocalEntry>) {
  // keep the last 14 days
  const keep = Object.keys(m).sort().slice(-14);
  try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(keep.map(k => [k, m[k]])))); } catch { /* */ }
}

interface DState { entries: Record<string, LocalEntry>; claimed: ClaimDay[] }
let state: DState = { entries: readAll(), claimed: [] };
const subs = new Set<() => void>();
const set = (p: Partial<DState>) => { state = { ...state, ...p }; subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const getState = () => state;

export function useDailyStore() { return useSyncExternalStore(subscribe, getState, getState); }
export const entryFor = (day: string): LocalEntry | null => state.entries[day] ?? null;

function patchEntry(day: string, patch: Partial<LocalEntry>) {
  const cur = state.entries[day];
  if (!cur) return;
  const entries = { ...state.entries, [day]: { ...cur, ...patch } };
  writeAll(entries);
  set({ entries });
}

/* ------------------------------------------------------------------ the scored game in progress */

export function loadDailyGame(day: string): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { day: string; g: GameState; turns: number };
    return o.day === day && o.g.phase !== 'gameOver' ? o.g : null;
  } catch { return null; }
}
export function loadDailyTurns(day: string): number {
  try { const o = JSON.parse(localStorage.getItem(GAME_KEY) ?? 'null') as { day: string; turns: number } | null; return o?.day === day ? o.turns : 0; } catch { return 0; }
}
export function saveDailyGame(day: string, g: GameState, turns: number) {
  try { localStorage.setItem(GAME_KEY, JSON.stringify({ day, g, turns })); } catch { /* */ }
}
export function clearDailyGame() { try { localStorage.removeItem(GAME_KEY); } catch { /* */ } }

/* ------------------------------------------------------------------ results */

/** Store the scored attempt (once per day) and, when signed in, send it. Returns the stored entry. */
export async function recordDaily(r: Omit<DailyResult, 'score'>, signedIn: boolean): Promise<LocalEntry> {
  const day = r.day;
  const existing = state.entries[day];
  if (existing) return existing;
  const entry: LocalEntry = { ...r, score: dailyScore(r), at: Date.now() };
  const entries = { ...state.entries, [day]: entry };
  writeAll(entries);
  set({ entries });
  clearDailyGame();
  track('daily_done', { day, score: entry.score, won: entry.won, turns: entry.turns, guest: !signedIn });
  if (signedIn) await submitDaily(day);
  return state.entries[day] ?? entry;
}

let inflight: string | null = null;
/** Send a stored, not-yet-submitted result (e.g. a guest who just signed in). Idempotent server-side. */
export async function submitDaily(day: string): Promise<SubmitResult | null> {
  const e = state.entries[day];
  if (!e || e.submitted || e.rejected || inflight === day) return null;
  if (day !== rigaDay() && day !== rigaDay(new Date(Date.now() - 20 * 60 * 1000))) return null;   // too late for the board
  inflight = day;
  try {
    const res = await challengeSubmitRpc(day, e.score, e.turns, e.won, { points: e.points, roundsWon: e.roundsWon, rounds: e.rounds, queens: e.queens });
    if (!res) return null;
    if (res.ok) {
      patchEntry(day, { submitted: true, rank: res.rank ?? null, total: res.total ?? null });
      if (typeof res.bm === 'number') pushProfile({ bm: res.bm, xp: res.xp, level: res.level });
      const rw = res.reward;
      if (rw && (rw.bm > 0 || rw.xp > 0)) pushToast({ kind: 'xp', xp: rw.xp, bm: rw.bm, won: e.won });
      if (rw && (rw.level ?? 0) > (rw.level_from ?? 0)) setTimeout(() => pushToast({ kind: 'level', level: rw.level!, bm: rw.level_bm ?? 0 }), 2400);
    } else if (res.error === 'done') {
      // this account already has today's result (e.g. played on another device): show the server's
      patchEntry(day, { submitted: true, rank: res.rank ?? null, total: res.total ?? null, ...(typeof res.score === 'number' ? { score: res.score } : {}) });
    } else if (res.error !== 'auth') {
      patchEntry(day, { rejected: res.error ?? 'error' });
    }
    return res;
  } finally { inflight = null; }
}

export function setRank(day: string, rank: number | null, total: number | null) {
  const e = state.entries[day];
  if (e && (e.rank !== rank || e.total !== total)) patchEntry(day, { rank, total });
}

let claimedFor: string | null = null;
/** Final-rank rewards of closed days (once per account per session-day). */
export async function claimDailyRewards(uid: string) {
  const key = uid + rigaDay();
  if (claimedFor === key) return;
  claimedFor = key;
  const r = await challengeClaimRpc();
  if (!r?.ok) { if (!r) claimedFor = null; return; }
  const paid = (r.days ?? []).filter(d => d.bm > 0 || d.xp > 0);
  if (paid.length) {
    set({ claimed: paid });
    if (typeof r.bm === 'number') pushProfile({ bm: r.bm, xp: r.xp, level: r.level });
    const rw = r.reward;
    if (rw) pushToast({ kind: 'xp', xp: rw.xp, bm: rw.bm, won: true });
    if (rw && (rw.level ?? 0) > (rw.level_from ?? 0)) setTimeout(() => pushToast({ kind: 'level', level: rw.level!, bm: rw.level_bm ?? 0 }), 2400);
    track('daily_rank_reward', { days: paid.length, bm: rw?.bm ?? 0 });
  }
}
export const dismissClaimed = () => set({ claimed: [] });
