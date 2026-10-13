import { useEffect, useSyncExternalStore } from 'react';
import { useApp } from '../store';
import type { Profile } from '../supabase';
import { patchData, syncAchievements } from '../progress/store';
import { track } from '../analytics';
import {
  S1_REWARDS, SEASON_S1, claimable, seasonPhase, type Phase, type Reward, type SeasonConfig, type TierRewards, type Track,
} from './data';
import {
  seasonClaimAllRpc, seasonClaimRpc, seasonGodRpc, seasonSkipRpc, seasonStateRpc, seasonUnlockRpc,
  type ClaimAllResult, type ClaimResult, type Fail, type GodResult, type RewardRow, type SeasonMe, type SeasonStateData, type SkipResult, type UnlockResult,
} from './api';

/**
 * Season Pass state shared by /season, the Home dock badge, the Profile card and the tier-up toast.
 * season_state() answers signed-out callers too, so guests see the live season; without a server (offline, or before
 * migration 016) the bundled Season 1 data from ./data.ts is shown as a preview.
 */

export interface SeasonView {
  cfg: SeasonConfig & { name: string };
  rewards: TierRewards[];
  me: SeasonMe | null;
  /** bought premium, or admin / god (premium for free) */
  premium: boolean;
  source: 'server' | 'bundled';
  /** server clock − device clock (ms), so countdowns follow the server */
  skew: number;
}
export interface TierToast { id: number; tier: number; ready: number }

interface SState { uid: string | null; status: 'idle' | 'loading' | 'ready'; view: SeasonView | null; failed: boolean; busy: string | null; toast: TierToast | null }
let state: SState = { uid: null, status: 'idle', view: null, failed: false, busy: null, toast: null };
const subs = new Set<() => void>();
const set = (p: Partial<SState>) => { state = { ...state, ...p }; subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const getState = () => state;

/* ------------------------------------------------------------------ shaping */

function rewardsFrom(rows: RewardRow[]): TierRewards[] {
  const by = new Map<number, Partial<Record<Track, Reward>>>();
  for (const r of rows) {
    const x: Reward = { kind: r.kind, amount: r.amount, ...(r.item ? { item: r.item } : {}) };
    by.set(r.tier, { ...by.get(r.tier), [r.track]: x });
  }
  return [...by.entries()].sort((a, b) => a[0] - b[0])
    .filter(([, v]) => v.free && v.premium)
    .map(([tier, v]) => ({ tier, free: v.free!, premium: v.premium! }));
}

function fromServer(d: SeasonStateData): SeasonView {
  const s = d.season;
  const rewards = rewardsFrom(d.rewards);
  return {
    cfg: {
      id: s.id, name: s.name, startsAt: s.starts_at, endsAt: s.ends_at, tiers: s.tiers, starsPerTier: s.stars_per_tier,
      premiumPrice: s.premium_price, skipPrice: s.skip_price, graceDays: s.grace_days,
    },
    rewards: rewards.length ? rewards : S1_REWARDS,
    me: d.me,
    premium: !!d.me && (d.me.premium || d.me.privileged),
    source: 'server',
    skew: (Date.parse(d.now) || Date.now()) - Date.now(),
  };
}

export const bundledView = (): SeasonView => ({ cfg: { ...SEASON_S1, name: 'Jazz Age' }, rewards: S1_REWARDS, me: null, premium: false, source: 'bundled', skew: 0 });

const withMe = (v: SeasonView, me: SeasonMe): SeasonView => ({ ...v, me, premium: me.premium || me.privileged });

/* ------------------------------------------------------------------ loading */

let inflight: Promise<void> | null = null;
let lastTier: number | null = null;

export function loadSeason(uid: string | null, force = false): Promise<void> {
  if (uid !== state.uid) { set({ uid, status: 'idle', view: null, failed: false, toast: null }); inflight = null; lastTier = null; }
  if (!force && (state.status === 'ready' || inflight)) return inflight ?? Promise.resolve();
  set({ status: state.view ? state.status : 'loading' });
  const p = seasonStateRpc().then(d => {
    if (state.uid !== uid) return;
    if (d.ok) {
      const v = fromServer(d as SeasonStateData);
      noteTier(v);
      set({ status: 'ready', view: v, failed: false });
    } else {
      // 'none' = no season configured right now → still preview the bundled one; network → preview + notice
      set({ status: 'ready', view: state.view ?? bundledView(), failed: (d as Fail).error === 'network' && !!uid });
    }
  }).finally(() => { if (inflight === p) inflight = null; });
  inflight = p;
  return p;
}

/** Remembers the player's tier; a later refresh that finds a higher tier raises the tier-up toast. */
let tid = 1;
function noteTier(v: SeasonView) {
  if (!v.me) return;
  const t = v.me.tier;
  if (lastTier !== null && t > lastTier && seasonPhase(v.cfg) === 'live') {
    set({ toast: { id: tid++, tier: t, ready: claimable(claimState(v), v.rewards).length } });
  }
  lastTier = t;
}
export const dismissTierToast = () => set({ toast: null });

export const claimState = (v: SeasonView) => ({ tier: v.me?.tier ?? 0, premium: v.premium, claimed: v.me?.claimed ?? { free: [], premium: [] } });

/* ------------------------------------------------------------------ actions */

type Patcher = (p: Partial<Profile> & { diamonds?: number }) => void;
let patcher: Patcher | null = null;
export const registerSeasonPatcher = (f: Patcher | null) => { patcher = f; };

function applyMe(me: SeasonMe | undefined) {
  if (!me || !state.view) return;
  const v = withMe(state.view, me);
  lastTier = me.tier;
  set({ view: v });
  patcher?.({ bm: me.bm, owned: me.owned, diamonds: me.diamonds });
  patchData({ bm: me.bm, owned: me.owned, xp: me.xp, level: me.level });
}

async function busy<T>(key: string, fn: () => Promise<T>): Promise<T> {
  set({ busy: key });
  try { return await fn(); } finally { set({ busy: null }); }
}

export const claimReward = (tier: number, tr: Track) => busy(`${tier}:${tr}`, async (): Promise<ClaimResult> => {
  const r = await seasonClaimRpc(tier, tr);
  if (r.ok) {
    applyMe(r.me);
    if (r.granted?.length) void syncAchievements('season');
    track('season_claim', { tier, track: tr, kind: r.reward?.kind ?? null });
  } else if (r.error === 'locked' || r.error === 'premium') void loadSeason(state.uid, true);
  return r;
});

export const claimAllRewards = () => busy('all', async (): Promise<ClaimAllResult> => {
  const r = await seasonClaimAllRpc();
  if (r.ok) {
    applyMe(r.me);
    if (r.granted?.length) void syncAchievements('season');
    track('season_claim_all', { n: r.rewards.length });
  }
  return r;
});

export const unlockPremium = () => busy('unlock', async (): Promise<UnlockResult> => {
  const r = await seasonUnlockRpc();
  if (r.ok) { applyMe(r.me); track('season_unlock', { price: r.price, admin: r.admin }); }
  else if (r.error === 'owned') void loadSeason(state.uid, true);
  return r;
});

export const skipTiers = (n: number) => busy('skip', async (): Promise<SkipResult> => {
  const r = await seasonSkipRpc(n);
  if (r.ok) { applyMe(r.me); track('season_skip', { n: r.skipped, price: r.price }); }
  return r;
});

export const seasonGod = (action: 'stars' | 'reset', amount = 0) => busy('god', async (): Promise<GodResult> => {
  const r = await seasonGodRpc(action, amount);
  if (r.ok) applyMe(r.me);
  return r;
});

/* ------------------------------------------------------------------ hook */

export function useSeason() {
  const app = useApp();
  const uid = app.session?.user.id ?? null;
  const st = useSyncExternalStore(subscribe, getState, getState);
  useEffect(() => { void loadSeason(uid); }, [uid]);
  const patchProfile = app.patchProfile;
  useEffect(() => { registerSeasonPatcher(p => patchProfile(p as Partial<Profile>)); }, [patchProfile]);
  const v = st.uid === uid ? st.view : null;
  const phase: Phase = v ? seasonPhase(v.cfg, Date.now() + v.skew) : 'upcoming';
  const ready = v && v.me && (phase === 'live' || phase === 'grace') ? claimable(claimState(v), v.rewards) : [];
  return {
    view: v,
    phase,
    loading: st.status !== 'ready',
    failed: st.failed,
    signedIn: !!uid,
    busy: st.busy,
    /** claimable (tier, track) pairs right now */
    ready,
    toast: st.toast,
    refresh: () => loadSeason(uid, true),
    claim: claimReward, claimAll: claimAllRewards, unlock: unlockPremium, skip: skipTiers, god: seasonGod,
  };
}
