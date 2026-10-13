import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useApp } from '../store';
import { getSupabase, type Profile } from '../supabase';
import type { GameState } from '../engine/engine';
import { levelProgress } from './levels';
import { GameTracker, type GameStats } from './tracker';
import {
  claimDaily, closeDailyReward, dismissReveal, dismissToast, ensureLoaded, ensureRarity, getState, ingestProfile, openDailyReward, patchData,
  pinAchievements, registerProfilePatcher, reportAchievement, reportGameStats, subscribe, syncAchievements,
} from './store';

export type { Toast } from './store';
export type { ProgressData, GameReward } from './api';
export { openDailyReward, closeDailyReward, reportAchievement, syncAchievements };

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
  // lets 012 RPC results (wheel, stakes, achievements) update app.profile.bm / owned everywhere
  const patchProfile = app.patchProfile;
  useEffect(() => { registerProfilePatcher(p => patchProfile(p as Partial<Profile>)); }, [patchProfile]);

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
    reveals: st.reveals,
    dailyOpen: st.dailyOpen,
    claimDaily,
    reportAchievement,
    openDaily: openDailyReward,
    closeDaily: closeDailyReward,
    dismissToast,
    dismissReveal,
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
 * The achievements hall's data: unlocked codes, stats for the progress rings, pinned showcase and rarity.
 * Calls achievements_sync() once per mount (it also grants anything the stats already allow).
 */
export function useAchievements(opts: { rarity?: boolean } = {}) {
  const p = useProgress();
  const st = useSyncExternalStore(subscribe, getState, getState);
  const uid = p.signedIn ? st.uid : null;
  useEffect(() => { if (uid) void syncAchievements('hall'); }, [uid]);
  useEffect(() => { if (opts.rarity) void ensureRarity(); }, [opts.rarity]);
  return {
    ready: p.ready,
    signedIn: p.signedIn,
    unlocked: p.achievements,
    stats: st.ach.stats,
    synced: st.ach.synced,
    pinned: st.ach.pinned,
    rarity: st.ach.rarity,
    pin: pinAchievements,
    sync: syncAchievements,
  };
}

/**
 * Achievement tracking for a running game: reports one-shot medals the moment they happen (report_achievement) and
 * sends the whole game's counters at game over (report_game_stats). Works for bots and online games alike.
 *   LocalGame:  useGameAchievements(g, 0)                              (or { mode: 'stake' } at a stake table)
 *   OnlineRoom: useGameAchievements(r.game, r.you, { mode: quick ? 'quick' : 'room', host: r.you === 0 })
 * Without `mode` it is inferred: any other human at the table → 'online', otherwise 'bots'.
 */
export function useGameAchievements(g: GameState | null | undefined, me: number, opts: { mode?: GameStats['mode']; host?: boolean } = {}) {
  const { session } = useApp();
  const seq = g?.seq;
  const ref = useRef<{ t: GameTracker; prev: GameState | null; sent: boolean } | null>(null);
  useEffect(() => {
    if (!g || me < 0) return;
    let cur = ref.current;
    const prev = cur?.prev ?? null;
    // a new game: first state, a rematch (round restarted) or a different table
    const fresh = !cur || (prev && (g.round < prev.round || g.players.length !== prev.players.length || (prev.phase === 'gameOver' && g.phase !== 'gameOver')));
    if (fresh) {
      const mode = opts.mode ?? (g.players.some((pl, i) => i !== me && !pl.bot) ? 'online' : 'bots');
      cur = ref.current = { t: new GameTracker(me, mode, !!opts.host), prev: null, sent: false };
    }
    const c = cur!;
    const codes = c.t.step(c.prev, g);
    c.prev = g;
    if (!session) return;
    for (const code of codes) reportAchievement(code);
    if (c.t.finished && !c.sent) { c.sent = true; void reportGameStats(c.t.stats()); }
  }, [seq, g, me, session]); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}
