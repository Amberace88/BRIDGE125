import { track } from '../analytics';
import { achDef } from './achievements';
import { claimDailyRpc, fetchProgress, reportAchievementRpc, type DailyResult, type GameReward, type ProgressData } from './api';

/**
 * A tiny module-level store for progression, shared by every useProgress() caller
 * (nav badge, daily modal, shop, profile) without needing a provider in App.tsx.
 */

export type Toast =
  | { id: number; kind: 'level'; level: number; bm: number }
  | { id: number; kind: 'ach'; code: string; bm: number }
  | { id: number; kind: 'xp'; xp: number; bm: number; won: boolean };

export interface ProgressState {
  uid: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: ProgressData | null;
  toasts: Toast[];
  dailyOpen: boolean;
}

let state: ProgressState = { uid: null, status: 'idle', data: null, toasts: [], dailyOpen: false };
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());

export const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const getState = () => state;
function set(patch: Partial<ProgressState>) { state = { ...state, ...patch }; emit(); }
export function patchData(patch: Partial<ProgressData>) { if (state.data) set({ data: { ...state.data, ...patch } }); }

// ------------------------------------------------------------------ loading
let inflight: Promise<void> | null = null;
export function ensureLoaded(uid: string | null, force = false) {
  if (uid !== state.uid) { lastReward = null; set({ uid, data: null, status: uid ? 'loading' : 'idle', toasts: [], dailyOpen: false }); inflight = null; }
  if (!uid) return Promise.resolve();
  if (!force && (state.status === 'ready' || inflight)) return inflight ?? Promise.resolve();
  if (!state.data) set({ status: 'loading' });
  const p = fetchProgress().then(d => {
    if (state.uid !== uid) return;
    // `progress()` does not exist until migration 003 runs → stay quiet (no badge, no modal)
    if (!d) { set({ status: 'error' }); return; }
    set({ data: d, status: 'ready' });
  }).catch(() => { if (state.uid === uid) set({ status: 'error' }); }).finally(() => { if (inflight === p) inflight = null; });
  inflight = p;
  return p;
}

// ------------------------------------------------------------------ toasts
let tid = 1;
type ToastIn = Toast extends infer T ? (T extends Toast ? Omit<T, 'id'> : never) : never;
export function pushToast(t: ToastIn) {
  const toast = { ...t, id: tid++ } as Toast;
  set({ toasts: [...state.toasts, toast].slice(-5) });
  return toast.id;
}
export function dismissToast(id: number) { set({ toasts: state.toasts.filter(t => t.id !== id) }); }

function announceAchievements(codes: string[] | undefined, source: string) {
  for (const code of codes ?? []) {
    pushToast({ kind: 'ach', code, bm: achDef(code)?.bm ?? 0 });
    track('achievement', { code, source });
  }
}

// ------------------------------------------------------------------ daily modal
export const openDailyReward = () => set({ dailyOpen: true });
export const closeDailyReward = () => set({ dailyOpen: false });

export async function claimDaily(): Promise<DailyResult> {
  try {
    const r = await claimDailyRpc();
    if (!r) return { ok: false, error: 'network' };
    if (r.ok && state.data) {
      const d = state.data;
      patchData({
        can_claim: false, last_daily: d.today,
        streak: r.streak ?? d.streak, claim_streak: r.streak ?? d.claim_streak, claim_day: r.day ?? d.claim_day,
        bm: r.bm ?? d.bm, owned: r.owned ?? d.owned,
        achievements: [...new Set([...d.achievements, ...(r.achievements ?? [])])],
        next_reset: r.next_reset ?? d.next_reset,
      });
    }
    if (r.ok && r.claimed) {
      track('daily_claim', { day: r.day ?? 0, streak: r.streak ?? 0, bm: r.reward_bm ?? 0, item: r.item ?? null });
      // let the chest open first, then celebrate achievements
      if (r.achievements?.length) setTimeout(() => announceAchievements(r.achievements, 'daily'), 1600);
    }
    return r;
  } catch { return { ok: false, error: 'network' }; }
}

// ------------------------------------------------------------------ game results (via store.profile.reward)
let lastReward: number | null = null;
type ProfileLike = { games_played?: number; wins?: number; bm?: number; xp?: number; level?: number; win_streak?: number; achievements?: string[]; owned?: string[]; reward?: GameReward };

/** Called whenever the app profile object changes: syncs numbers and turns a fresh `reward` into toasts. */
export function ingestProfile(p: ProfileLike) {
  const d = state.data;
  if (d) {
    const patch: Partial<ProgressData> = {};
    if (typeof p.bm === 'number') patch.bm = p.bm;
    if (typeof p.games_played === 'number') patch.games_played = p.games_played;
    if (typeof p.wins === 'number') patch.wins = p.wins;
    if (Array.isArray(p.owned)) patch.owned = p.owned;
    if (typeof p.xp === 'number' && typeof p.level === 'number') {
      patch.xp = p.xp; patch.level = p.level;
      patch.level_floor = 20 * p.level * p.level + 40 * p.level - 60;
      patch.level_next = 20 * (p.level + 1) * (p.level + 1) + 40 * (p.level + 1) - 60;
    }
    if (typeof p.win_streak === 'number') { patch.win_streak = p.win_streak; patch.best_win_streak = Math.max(d.best_win_streak, p.win_streak); }
    if (Array.isArray(p.achievements)) patch.achievements = p.achievements;
    patchData(patch);
  }
  const r = p.reward;
  if (!r || r.throttled || r.games_played === lastReward) return;
  lastReward = r.games_played;
  if ((r.xp ?? 0) > 0 || (r.bm ?? 0) > 0) pushToast({ kind: 'xp', xp: r.xp ?? 0, bm: r.bm ?? 0, won: !!r.won });
  if ((r.level ?? 0) > (r.level_from ?? 0)) {
    setTimeout(() => {
      pushToast({ kind: 'level', level: r.level!, bm: r.level_bm ?? 0 });
      track('level_up', { level: r.level ?? 0 });
    }, 700);
  }
  if (r.achievements?.length) setTimeout(() => announceAchievements(r.achievements, 'game'), 1400);
}

// ------------------------------------------------------------------ client-reported achievements
const queue: string[] = [];
let pumping = false;
export function reportAchievement(code: string) {
  const d = state.data;
  if (!state.uid || !d || d.achievements.includes(code) || queue.includes(code)) return;
  queue.push(code);
  void pump();
}
async function pump() {
  if (pumping) return;
  pumping = true;
  try {
    while (queue.length) {
      const code = queue[0];
      let tries = 0;
      for (;;) {
        let r = null;
        try { r = await reportAchievementRpc(code); } catch { /* offline / no migration */ }
        if (r?.ok) {
          if (r.granted) {
            patchData({ achievements: r.achievements ?? [...(state.data?.achievements ?? []), code], bm: r.bm ?? state.data?.bm });
            announceAchievements([code], 'play');
          }
          break;
        }
        if (r?.error === 'slow' && tries++ < 4) { await new Promise(res => setTimeout(res, 4500)); continue; }
        break;
      }
      queue.shift();
    }
  } finally { pumping = false; }
}
