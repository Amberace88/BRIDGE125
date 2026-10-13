import { track } from '../analytics';
import { achDef } from './achievements';
import {
  achievementRarityRpc, achievementsSyncRpc, claimDailyRpc, fetchProgress, pinAchievementsRpc, reportAchievementRpc, reportGameStatsRpc,
  type AchSyncResult, type DailyResult, type GameReward, type PinResult, type ProgressData, type RarityData,
} from './api';

/**
 * A tiny module-level store for progression, shared by every useProgress() caller
 * (nav badge, daily modal, shop, profile, achievements hall) without needing a provider in App.tsx.
 */

export type Toast =
  | { id: number; kind: 'level'; level: number; bm: number }
  | { id: number; kind: 'ach'; code: string; bm: number }
  | { id: number; kind: 'xp'; xp: number; bm: number; won: boolean }
  | { id: number; kind: 'stake'; status: string; payout: number; entry: number };

export interface AchState {
  /** stats from achievements_sync (columns + counters) — drives the progress rings */
  stats: Record<string, number> | null;
  pinned: string[];
  rarity: RarityData | null;
  synced: boolean;
}

export interface ProgressState {
  uid: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: ProgressData | null;
  toasts: Toast[];
  /** cinematic medal reveals (gold, platinum and secret achievements), shown one at a time */
  reveals: string[];
  dailyOpen: boolean;
  ach: AchState;
}

const NO_ACH: AchState = { stats: null, pinned: [], rarity: null, synced: false };
let state: ProgressState = { uid: null, status: 'idle', data: null, toasts: [], reveals: [], dailyOpen: false, ach: NO_ACH };
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());

export const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const getState = () => state;
function set(patch: Partial<ProgressState>) { state = { ...state, ...patch }; emit(); }
export function patchData(patch: Partial<ProgressData>) { if (state.data) set({ data: { ...state.data, ...patch } }); }
function patchAch(patch: Partial<AchState>) { set({ ach: { ...state.ach, ...patch } }); }

/** The app store's profile patcher (registered by useProgress) so BM / owned changes reach every screen. */
type ProfilePatch = { bm?: number; owned?: string[]; xp?: number; level?: number; achievements?: string[] };
let profilePatcher: ((p: ProfilePatch) => void) | null = null;
export const registerProfilePatcher = (f: ((p: ProfilePatch) => void) | null) => { profilePatcher = f; };
export function pushProfile(p: ProfilePatch) {
  const clean = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as ProfilePatch;
  if (!Object.keys(clean).length) return;
  if (state.data) {
    const d: Partial<ProgressData> = { ...clean };
    if (typeof clean.level === 'number') {
      d.level_floor = 20 * clean.level * clean.level + 40 * clean.level - 60;
      d.level_next = 20 * (clean.level + 1) * (clean.level + 1) + 40 * (clean.level + 1) - 60;
    }
    patchData(d);
  }
  profilePatcher?.(clean);
}

// ------------------------------------------------------------------ loading
let inflight: Promise<void> | null = null;
export function ensureLoaded(uid: string | null, force = false) {
  if (uid !== state.uid) {
    lastReward = null;
    set({ uid, data: null, status: uid ? 'loading' : 'idle', toasts: [], reveals: [], dailyOpen: false, ach: NO_ACH });
    inflight = null;
  }
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

// ------------------------------------------------------------------ toasts & reveals
let tid = 1;
type ToastIn = Toast extends infer T ? (T extends Toast ? Omit<T, 'id'> : never) : never;
export function pushToast(t: ToastIn) {
  const toast = { ...t, id: tid++ } as Toast;
  set({ toasts: [...state.toasts, toast].slice(-5) });
  return toast.id;
}
export function dismissToast(id: number) { set({ toasts: state.toasts.filter(t => t.id !== id) }); }
export function dismissReveal() { set({ reveals: state.reveals.slice(1) }); }

/** Gold / platinum / secret medals get the cinematic reveal; the rest a toast. */
export const isBigMedal = (code: string) => { const d = achDef(code); return !!d && (d.secret || d.tier === 'gold' || d.tier === 'platinum'); };

const announced = new Set<string>();
export function announceAchievements(codes: string[] | undefined, source: string) {
  const fresh = (codes ?? []).filter(c => !announced.has(c));
  for (const code of fresh) {
    announced.add(code);
    if (isBigMedal(code)) set({ reveals: [...state.reveals, code] });
    else pushToast({ kind: 'ach', code, bm: achDef(code)?.bm ?? 0 });
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
      // let the chest open first, then celebrate achievements (+ the streak ones from the 012 catalogue)
      setTimeout(() => { if (r.achievements?.length) announceAchievements(r.achievements, 'daily'); void syncAchievements('daily'); }, 1600);
    }
    return r;
  } catch { return { ok: false, error: 'network' }; }
}

// ------------------------------------------------------------------ achievements hall: sync, rarity, pins
/** Apply any 012 RPC result that carries achievements / balances; announces new medals and level-ups. */
export function applyAchResult(r: AchSyncResult | null | undefined, source: string) {
  if (!r?.ok) return;
  if (r.stats || r.pinned) patchAch({ ...(r.stats ? { stats: r.stats } : {}), ...(r.pinned ? { pinned: r.pinned } : {}), synced: true });
  pushProfile({ bm: r.bm, owned: r.owned, xp: r.xp, level: r.level, achievements: r.achievements });
  if (r.granted?.length) announceAchievements(r.granted, source);
  if (typeof r.level === 'number' && typeof r.level_from === 'number' && r.level > r.level_from) {
    pushToast({ kind: 'level', level: r.level, bm: 0 });
  }
}

let syncing: Promise<void> | null = null;
export function syncAchievements(source = 'sync'): Promise<void> {
  if (!state.uid) return Promise.resolve();
  syncing ??= achievementsSyncRpc()
    .then(r => applyAchResult(r, source))
    .catch(() => { /* migration 012 not applied yet / offline */ })
    .finally(() => { syncing = null; });
  return syncing;
}

let rarityAt = 0;
export async function ensureRarity(force = false) {
  if (!force && state.ach.rarity && Date.now() - rarityAt < 10 * 60_000) return;
  try { const r = await achievementRarityRpc(); if (r) { rarityAt = Date.now(); patchAch({ rarity: r }); } } catch { /* */ }
}

export async function pinAchievements(codes: string[]): Promise<PinResult> {
  const before = state.ach.pinned;
  patchAch({ pinned: codes.slice(0, 3) });
  const r = await pinAchievementsRpc(codes.slice(0, 3));
  if (r.ok) patchAch({ pinned: r.pinned ?? codes }); else patchAch({ pinned: before });
  return r;
}

/** Game over: send the tracker's counters (server clamps them). Retries once when throttled. */
export async function reportGameStats(stats: object) {
  if (!state.uid) return;
  for (let i = 0; i < 2; i++) {
    let r = null;
    try { r = await reportGameStatsRpc(stats); } catch { return; }
    if (r?.ok) { applyAchResult(r, 'game'); return; }
    if (r?.error !== 'slow') return;
    await new Promise(res => setTimeout(res, 21_000));
  }
}

// ------------------------------------------------------------------ game results (via store.profile.reward)
let lastReward: number | null = null;
type ProfileLike = {
  games_played?: number; wins?: number; bm?: number; xp?: number; level?: number; win_streak?: number; achievements?: string[]; owned?: string[];
  reward?: GameReward & { stake_payout?: number };
  stake?: { status: string; payout: number; entry: number } | null;
};

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
  if (p.stake && p.stake.status !== 'abandoned') {
    const s = p.stake;
    setTimeout(() => pushToast({ kind: 'stake', status: s.status, payout: s.payout, entry: s.entry }), 350);
  }
  if ((r.level ?? 0) > (r.level_from ?? 0)) {
    setTimeout(() => {
      pushToast({ kind: 'level', level: r.level!, bm: r.level_bm ?? 0 });
      track('level_up', { level: r.level ?? 0 });
    }, 700);
  }
  if (r.achievements?.length) setTimeout(() => announceAchievements(r.achievements, 'game'), 1400);
  // the 012 catalogue (games_100, level_25 …) is checked server-side by achievements_sync
  setTimeout(() => { void syncAchievements('game'); }, 2600);
}

// ------------------------------------------------------------------ client-reported achievements
const queue: string[] = [];
let pumping = false;
export function reportAchievement(code: string) {
  const d = state.data;
  if (!state.uid || !d || d.achievements.includes(code) || queue.includes(code) || !achDef(code) || achDef(code)?.source !== 'client') return;
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
            const ach = r.achievements ?? [...(state.data?.achievements ?? []), code];
            patchData({ achievements: ach, bm: r.bm ?? state.data?.bm });
            profilePatcher?.({ achievements: ach, ...(typeof r.bm === 'number' ? { bm: r.bm } : {}) });
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
