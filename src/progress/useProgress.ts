import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useApp } from '../store';
import { getSupabase, type Profile } from '../supabase';
import type { GameState } from '../engine/engine';
import { detectAchievements } from './achievements';
import { levelProgress } from './levels';
import {
  claimDaily, closeDailyReward, dismissToast, ensureLoaded, getState, ingestProfile, openDailyReward, patchData,
  reportAchievement, subscribe,
} from './store';

export type { Toast } from './store';
export type { ProgressData, GameReward } from './api';
export { openDailyReward, closeDailyReward, reportAchievement };

/** Profile as returned after migration 003 (extra columns + the `reward` object merged by recordGame). */
export type ProgressProfile = Profile & {
  xp?: number; level?: number; streak?: number; achievements?: string[]; win_streak?: number;
  reward?: import('./api').GameReward;
};

let lastProfile: object | null = null;

/**
 * Progression for the signed-in player: level / XP, daily reward state, achievements, BM and owned items.
 * Safe to call from many components — state lives in one shared store.
 */
export function useProgress() {
  const app = useApp();
  const st = useSyncExternalStore(subscribe, getState, getState);
  const uid = app.session?.user.id ?? null;

  useEffect(() => { void ensureLoaded(uid); }, [uid]);

  // listen to game results: recordGame() merges record_game's JSON (incl. `reward`) into app.profile
  const prof = app.profile as ProgressProfile | null;
  useEffect(() => {
    if (!prof || prof === lastProfile) return;
    lastProfile = prof;
    ingestProfile(prof);
  }, [prof, st.data]);

  const d = st.data;
  const lp = d ? levelProgress(d.xp, d.level) : null;

  const refresh = useCallback(() => ensureLoaded(uid, true), [uid]);

  return {
    ready: st.status === 'ready' && !!d,
    loading: st.status === 'loading',
    signedIn: !!uid,
    data: d,
    level: lp?.level ?? 1,
    xp: d?.xp ?? 0,
    xpInto: lp?.into ?? 0,
    xpNeed: lp?.need ?? 1,
    xpPct: lp?.pct ?? 0,
    bm: d?.bm ?? app.profile?.bm ?? 0,
    owned: d?.owned ?? app.profile?.owned ?? [],
    achievements: d?.achievements ?? [],
    canClaim: !!d?.can_claim,
    toasts: st.toasts,
    dailyOpen: st.dailyOpen,
    claimDaily,
    reportAchievement,
    openDaily: openDailyReward,
    closeDaily: closeDailyReward,
    dismissToast,
    refresh,
  };
}

/**
 * Push fresh profile fields (bm, owned …) into the app store after a purchase or a claim.
 * Prefers `patchProfile` / `reloadProfile` on the store context (see wiring notes); without them it refreshes the auth
 * session, which makes the store re-select the profile row.
 */
export async function syncAppProfile(app: ReturnType<typeof useApp>, patch: Partial<Profile>) {
  if (patch.bm !== undefined || patch.owned) patchData({ ...(patch.bm !== undefined ? { bm: patch.bm } : {}), ...(patch.owned ? { owned: patch.owned } : {}) });
  const ext = app as unknown as { patchProfile?: (p: Partial<Profile>) => void; reloadProfile?: () => Promise<void> };
  if (ext.patchProfile) { ext.patchProfile(patch); return; }
  if (ext.reloadProfile) { await ext.reloadProfile(); return; }
  try { await (await getSupabase())?.auth.refreshSession(); } catch { /* offline: next load picks it up */ }
}

/**
 * Report client-detected achievements for a running game (jacks finish, exact 125, queen bounce, four kings).
 * Call once per game screen: `useGameAchievements(g, 0)` (bots) or `useGameAchievements(r.game, r.you)` (online).
 */
export function useGameAchievements(g: GameState | null | undefined, me: number) {
  const { session } = useApp();
  const seq = g?.seq;
  useEffect(() => {
    if (!g || !session || me < 0) return;
    for (const code of detectAchievements(g, me)) reportAchievement(code);
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps
}
