import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useApp } from '../store';
import { track } from '../analytics';
import type { GameState } from '../engine/engine';
import type { Profile } from '../supabase';
import { applyAchResult, pushProfile } from '../progress/store';
import { useProgress } from '../progress/useProgress';
import {
  buyBoostRpc, economyStateRpc, forgeRelicRpc, prestigeRpc, spendShieldRpc, stakeForfeitRpc, stakeStartRpc,
  wheelSpinRpc, type ActiveStake, type BoostResult, type EconomyState, type ForgeResult, type PrestigeResult, type SpinResult,
  type StakeFinishResult, type StakeSettle, type StakeStartResult,
} from './api';
import { submitResult } from '../offline/sync';
import { patchAppProfile } from '../offline/sink';
import { isOffline } from '../offline/net';
import { storedUid } from '../offline/session';
import { STAKE_TIERS, type BoostKind } from './config';
import { isShielded, shieldStep, stakeIdOf } from './shield';

/* ================================================================== module store (shared by every hook) */
interface EcoStore { uid: string | null; status: 'idle' | 'loading' | 'ready' | 'error'; s: EconomyState | null; at: number }
let store: EcoStore = { uid: null, status: 'idle', s: null, at: 0 };
const subs = new Set<() => void>();
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const get = () => store;
function set(p: Partial<EcoStore>) { store = { ...store, ...p }; subs.forEach(f => f()); }
function patchS(p: Partial<EconomyState>) { if (store.s) set({ s: { ...store.s, ...p } }); }

let inflight: Promise<void> | null = null;
export function loadEconomy(uid: string | null, force = false): Promise<void> {
  if (uid !== store.uid) { set({ uid, s: null, status: uid ? 'loading' : 'idle', at: 0 }); inflight = null; }
  if (!uid) return Promise.resolve();
  if (!force && (inflight || (store.status === 'ready' && Date.now() - store.at < 60_000))) return inflight ?? Promise.resolve();
  const p = economyStateRpc().then(r => {
    if (store.uid !== uid) return;
    if (r.ok) set({ s: r as EconomyState, status: 'ready', at: Date.now() });
    else set({ status: 'error' });
  }).finally(() => { if (inflight === p) inflight = null; });
  inflight = p;
  return p;
}

/** Server time offset so countdowns agree with the server's `now`. */
const skew = () => (store.s ? new Date(store.s.now).getTime() - store.at : 0);
export const serverNow = () => Date.now() + skew();
const msLeft = (iso: string | null | undefined) => (iso ? Math.max(0, new Date(iso).getTime() - serverNow()) : 0);

/* ================================================================== useEconomy */
/**
 * Bridge Money economy for the signed-in player: wheel, boosts, collections, prestige (and the raw state).
 * Every action is a server RPC; results also update BM / owned / achievements in the progress + app stores.
 */
export function useEconomy() {
  const app = useApp();
  const st = useSyncExternalStore(subscribe, get, get);
  const uid = app.session?.user.id ?? null;
  useEffect(() => { void loadEconomy(uid); }, [uid]);
  const s = st.s;
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);

  const refresh = useCallback(() => loadEconomy(uid, true), [uid]);

  const spin = useCallback(async (paid: boolean): Promise<SpinResult> => {
    const r = await wheelSpinRpc(paid);
    if (r.ok) {
      // only the price and the spin counters now — the prize lands in settleSpin() when the wheel stops
      patchS({ wheel: r.wheel, ...(store.s ? { bm: Math.max(0, store.s.bm - r.price) } : {}) });
      track('wheel_spin', { paid, idx: r.idx, kind: r.kind, amount: r.amount, price: r.price });
    } else if (r.error === 'used' || r.error === 'limit') void loadEconomy(uid, true);
    return r;
  }, [uid]);

  /** Call once the wheel animation has landed: balances, level-ups and achievements show only then. */
  const settleSpin = useCallback((r: SpinResult) => {
    if (!r.ok) return;
    patchS({ bm: r.bm, xp: r.xp, shards: r.shards, shields: r.shields, boost_xp_until: r.boost_xp_until, boost_luck_until: r.boost_luck_until, wheel: r.wheel });
    applyAchResult({ ...r, ok: true }, 'wheel');
  }, []);

  const buyBoost = useCallback(async (kind: BoostKind): Promise<BoostResult> => {
    const r = await buyBoostRpc(kind);
    if (r.ok) {
      patchS({ bm: r.bm, shields: r.shields, boost_xp_until: r.boost_xp_until, boost_luck_until: r.boost_luck_until });
      applyAchResult({ ...r, ok: true }, 'boost');
      track('boost_buy', { kind, price: r.price });
    }
    return r;
  }, []);

  const forge = useCallback(async (collection: string, piece: number): Promise<ForgeResult> => {
    const r = await forgeRelicRpc(collection, piece);
    if (r.ok) {
      patchS({ shards: r.shards, relics: r.relics });
      applyAchResult({ ...r, ok: true }, 'forge');
      track('relic_forge', { relic: r.relic, completed: r.completed });
    }
    return r;
  }, []);

  const prestige = useCallback(async (): Promise<PrestigeResult> => {
    const r = await prestigeRpc();
    if (r.ok) {
      patchS({ prestige: r.prestige, level: r.level, xp: r.xp, shards: r.shards, can_prestige: false });
      applyAchResult({ ...r, ok: true }, 'prestige');
      track('prestige', { prestige: r.prestige });
    }
    return r;
  }, []);

  void tick;
  const xpLeft = msLeft(s?.boost_xp_until), luckLeft = msLeft(s?.boost_luck_until);
  return {
    ready: st.status === 'ready' && !!s,
    signedIn: !!uid,
    state: s,
    shards: s?.shards ?? 0,
    relics: s?.relics ?? [],
    shields: s?.shields ?? 0,
    prestigeLevel: s?.prestige ?? 0,
    boosts: { xp2: xpLeft, lucky: luckLeft },
    wheel: s?.wheel ?? null,
    nextReset: s?.next_reset ?? null,
    refresh, spin, settleSpin, buyBoost, forge, prestige,
  };
}

/* ================================================================== stakes */
export interface StakeTierView { tier: 1 | 2 | 3; entry: number; pot: number; minLevel: number; locked: boolean; affordable: boolean }

/**
 * High-stakes tables vs bots.
 *   const stakes = useStakes();
 *   const r = await stakes.start(2);            // pays the entry → r.stake (pass it to LocalGame)
 *   … at game over: await finishStakeGame(app, won)   (records the game + settles the pot)
 */
export function useStakes() {
  const app = useApp();
  const p = useProgress();
  const eco = useEconomy();
  const s = eco.state;
  const level = p.level, bm = p.bm, prestige = s?.prestige ?? 0;
  const tiers: StakeTierView[] = useMemo(() => STAKE_TIERS.map(t => ({
    tier: t.tier, entry: t.entry, pot: Math.floor(t.entry * 2.5), minLevel: t.minLevel,
    locked: level < t.minLevel && prestige === 0, affordable: bm >= t.entry,
  })), [level, bm, prestige]);

  const start = useCallback(async (tier: 1 | 2 | 3): Promise<StakeStartResult> => {
    const r = await stakeStartRpc(tier);
    if (r.ok) {
      patchS({ bm: r.bm, stake: r.stake, stake_today: { games: (store.s?.stake_today.games ?? 0) + 1, profit: store.s?.stake_today.profit ?? 0 } });
      applyAchResult({ ...r, ok: true }, 'stake');
      track('stake_start', { tier, entry: r.stake.entry, abandoned: r.abandoned });
    }
    return r;
  }, []);

  const forfeit = useCallback(async () => {
    patchS({ stake: null });
    await stakeForfeitRpc();
    track('stake_forfeit');
  }, []);

  return {
    ready: eco.ready,
    signedIn: eco.signedIn,
    tiers,
    active: s?.stake ?? null as ActiveStake | null,
    today: s?.stake_today ?? { games: 0, profit: 0 },
    shields: s?.shields ?? 0,
    luckyActive: eco.boosts.lucky > 0,
    start, forfeit,
    finish: (won: boolean) => finishStakeGame(app, won),
  };
}

type AppLike = { patchProfile: (p: Partial<Profile>) => void; recordGame: (won: boolean, mode?: 'bots' | 'room' | 'quick') => void; session: unknown };

/**
 * Game over at a stake table: records the game AND settles the stake (stake_finish). Returns the settled stake.
 * With `stakeId` (the id the game carries) it first checks that this stake is still the open one on the server:
 * stake_finish settles whatever stake is active, so a resumed game of an older stake must never settle a newer one —
 * such a game is recorded as a normal bot game instead.
 */
export async function finishStakeGame(app: AppLike, won: boolean, stakeId?: number | null): Promise<StakeSettle | null> {
  if (!app.session) return null;
  if (stakeId != null) {
    const uid = (app.session as { user?: { id?: string } }).user?.id ?? store.uid;
    await loadEconomy(uid ?? null, true);
    if (store.status === 'ready' && store.s?.stake?.id !== stakeId) { await recordGamePlus(app, won, 'bots'); return null; }
  }
  // through the offline queue: sent now, or (offline / network error) kept on the device and settled later
  const r = await submitResult('stake', sessionUid(app), { won }) as StakeFinishResult | null;
  if (!r) return null;
  applyStake(app.patchProfile, r);
  return r.stake ?? null;
}

const sessionUid = (app: AppLike) => (app.session as { user?: { id?: string } } | null)?.user?.id ?? store.uid ?? '';

function applyStake(patch: (p: Partial<Profile>) => void, r: StakeFinishResult) {
  patch(r as unknown as Partial<Profile>);       // same merge as store.recordGame → XP/level/achievement toasts
  patchS({ stake: null, ...(typeof r.bm === 'number' ? { bm: r.bm } : {}) });
  void loadEconomy(store.uid, true);
  if (r.stake) track('stake_finish', { tier: r.stake.tier, status: r.stake.status, payout: r.stake.payout });
}
function applyGame(patch: (p: Partial<Profile>) => void, r: Record<string, unknown>) {
  patch(r as unknown as Partial<Profile>);
  if (typeof r.bm === 'number') patchS({ bm: r.bm as number });
}
/** Offline queue appliers (src/offline/sync.ts): a result answered after its screen was left. */
export const applyQueuedGame = (d: unknown) => { if (d && typeof d === 'object') applyGame(p => patchAppProfile(p as Record<string, unknown>), d as Record<string, unknown>); };
export const applyQueuedStake = (d: unknown) => { if (d && typeof d === 'object') applyStake(p => patchAppProfile(p as Record<string, unknown>), d as StakeFinishResult); };

/**
 * Drop-in for `app.recordGame(won, mode)` that also applies boosts (XP ×2, Lucky shuffle) — record_game_plus.
 * Falls back to app.recordGame when migration 012 is not applied yet.
 */
export async function recordGamePlus(app: AppLike, won: boolean, mode?: 'bots' | 'room' | 'quick'): Promise<void> {
  const uid = app.session ? sessionUid(app) : (isOffline() ? storedUid() : null);
  if (!uid) return;
  // through the offline queue (nonce → never paid twice): null = kept on the device, applied when it goes through
  const r = await submitResult('game', uid, mode ? { won, mode } : { won }) as Record<string, unknown> | null;
  if (!r) return;
  applyGame(app.patchProfile, r);
}

/**
 * LocalGame helper for a stake match: arms the Shield (if the player owns one and has not used it this match) and
 * spends it on the server when it fires.  onAct={a => setG(cur => stake.step(cur, apply(cur, 0, a)))}
 */
export function useStakeGame(g: GameState | null | undefined, me = 0) {
  const eco = useEconomy();
  const active = eco.state?.stake ?? null;
  const id = stakeIdOf(g);
  /** the game carries a stake that is no longer the open one (settled, forfeited, replaced) — it is not a stake match */
  const stale = id !== null && eco.ready && active?.id !== id;
  const isStake = id !== null && !stale;
  const armed = isStake && !!active && active.id === id && !active.shield_used && eco.shields > 0;
  const shielded = isShielded(g);
  useEffect(() => {
    if (!shielded || !active || active.shield_used) return;
    patchS({ stake: { ...active, shield_used: true }, shields: Math.max(0, (store.s?.shields ?? 1) - 1) });
    void spendShieldRpc().then(r => { if (r.ok) patchS({ shields: r.shields }); });
    track('shield_used', { stake: active.id });
  }, [shielded]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = useCallback((prev: GameState, next: GameState) => shieldStep(prev, next, me, armed), [armed, me]);
  return { isStake, stale, stakeId: id, active, armed, shielded, step };
}

/** Push BM / owned changes into the app profile (re-exported for screens that do their own RPCs). */
export const syncBalances = pushProfile;
