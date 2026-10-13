/**
 * Season Pass — Season 1 ("Jazz Age"). Pure data + tier math, no React.
 *
 * The server is the source of truth (supabase/migration_016_season.sql: public.seasons, public.season_rewards and the
 * star rules inside _season_profile_hook / _season_quest_hook). This file mirrors it so the pass renders instantly and
 * works signed-out as a preview; src/season/season.test.ts keeps the two in sync.
 *
 * Stars ("season XP"): tier = 1 + floor(stars / STARS_PER_TIER), capped at TIERS. Tier 1 is reached at 0 stars, so the
 * first rewards are claimable on the very first visit; the last tier needs (TIERS - 1) × STARS_PER_TIER stars.
 */

export type Track = 'free' | 'premium';
export type RewardKind = 'bm' | 'dm' | 'shards' | 'spin' | 'boost_xp' | 'item';

export interface Reward { kind: RewardKind; amount: number; item?: string }
export interface TierRewards { tier: number; free: Reward; premium: Reward }

export interface SeasonConfig {
  id: string;
  /** ISO timestamps (the DB row wins once loaded) */
  startsAt: string; endsAt: string;
  tiers: number; starsPerTier: number;
  /** Diamonds */
  premiumPrice: number; skipPrice: number;
  /** claiming stays open this many days after the season ends */
  graceDays: number;
}

export const SEASON_S1: SeasonConfig = {
  id: 's1',
  startsAt: '2026-10-19T00:00:00+03:00',   // Monday 00:00 Riga
  endsAt: '2026-12-14T00:00:00+02:00',     // 8 weeks later (Riga switches to winter time on 25 Oct)
  tiers: 40, starsPerTier: 100,
  premiumPrice: 950, skipPrice: 150,
  graceDays: 14,
};

/**
 * Where stars come from. Mirrors the SQL hooks. `achievement` is by medal tier.
 * Only paid games count (record_game's 60-per-day reward cap), so there is nothing to farm.
 */
export const STAR_RULES = {
  win: 5,
  loss: 2,
  questDaily: 10,
  questWeekly: 25,
  chest: 50,
  challenge: 15,
  achievement: { bronze: 5, silver: 10, gold: 20, platinum: 40 },
} as const;

/** Daily caps per source (stars per Riga day) — the server's safety net. */
export const STAR_CAPS: Record<string, number> = { game: 300, quest: 200, challenge: 30, achievement: 400, other: 100 };

const bm = (amount: number): Reward => ({ kind: 'bm', amount });
const dm = (amount: number): Reward => ({ kind: 'dm', amount });
const sh = (amount: number): Reward => ({ kind: 'shards', amount });
const spin = (amount = 1): Reward => ({ kind: 'spin', amount });
const boost = (mins: number): Reward => ({ kind: 'boost_xp', amount: mins });
const item = (id: string): Reward => ({ kind: 'item', amount: 1, item: id });

/** 40 tiers × (free, premium). Keep in sync with the `season_rewards` seed in migration 016. */
export const S1_REWARDS: TierRewards[] = ([
  [bm(200), item('s1_table')],
  [sh(1), bm(300)],
  [bm(250), spin()],
  [bm(250), dm(25)],
  [spin(), item('s1_em_jazz')],
  [bm(300), sh(3)],
  [sh(1), bm(400)],
  [bm(300), boost(60)],
  [bm(350), dm(25)],
  [item('s1_t_debut'), item('s1_bk_gilded')],
  [bm(350), bm(500)],
  [boost(60), sh(3)],
  [bm(400), spin()],
  [sh(2), dm(25)],
  [spin(), item('s1_t_maestro')],
  [bm(400), bm(600)],
  [bm(450), sh(4)],
  [sh(2), spin(2)],
  [bm(450), dm(25)],
  [bm(1000), item('s1_nc_champagne')],
  [bm(500), bm(700)],
  [sh(2), boost(120)],
  [bm(500), spin()],
  [bm(550), dm(25)],
  [item('s1_bk_ticket'), item('s1_bn_skyline')],
  [bm(550), bm(800)],
  [sh(3), sh(5)],
  [bm(600), spin(2)],
  [bm(600), dm(25)],
  [spin(2), item('s1_vx_champagne')],
  [bm(650), bm(900)],
  [sh(3), sh(5)],
  [bm(650), spin(2)],
  [bm(700), dm(25)],
  [boost(120), bm(1500)],
  [bm(700), sh(6)],
  [sh(3), spin(3)],
  [bm(750), bm(1200)],
  [bm(800), dm(75)],
  [bm(3000), item('s1_fr_gilded')],
] as [Reward, Reward][]).map(([free, premium], i) => ({ tier: i + 1, free, premium }));

/* ------------------------------------------------------------------ tier math (mirrors _season_tier in SQL) */

export const tierForStars = (stars: number, c: Pick<SeasonConfig, 'tiers' | 'starsPerTier'> = SEASON_S1) =>
  Math.max(1, Math.min(c.tiers, 1 + Math.floor(Math.max(0, stars) / c.starsPerTier)));

/** Stars needed to *reach* tier t (tier 1 → 0). */
export const starsForTier = (t: number, c: Pick<SeasonConfig, 'tiers' | 'starsPerTier'> = SEASON_S1) =>
  (Math.max(1, Math.min(c.tiers, t)) - 1) * c.starsPerTier;

/** Progress inside the current tier: { tier, into, need, pct, maxed }. */
export function tierProgress(stars: number, c: Pick<SeasonConfig, 'tiers' | 'starsPerTier'> = SEASON_S1) {
  const tier = tierForStars(stars, c);
  const maxed = tier >= c.tiers;
  const into = maxed ? c.starsPerTier : Math.max(0, stars) - starsForTier(tier, c);
  return { tier, into, need: c.starsPerTier, pct: maxed ? 1 : into / c.starsPerTier, maxed };
}

/** Diamonds to skip `n` tiers from `tier` (never past the last tier). */
export const skipCost = (n: number, tier: number, c: Pick<SeasonConfig, 'tiers' | 'skipPrice'> = SEASON_S1) =>
  Math.max(0, Math.min(n, c.tiers - tier)) * c.skipPrice;

export interface ClaimState { tier: number; premium: boolean; claimed: { free: number[]; premium: number[] } }

/** Every (tier, track) the player may claim right now. */
export function claimable(s: ClaimState, rewards: TierRewards[] = S1_REWARDS): { tier: number; track: Track }[] {
  const out: { tier: number; track: Track }[] = [];
  for (const r of rewards) {
    if (r.tier > s.tier) break;
    if (!s.claimed.free.includes(r.tier)) out.push({ tier: r.tier, track: 'free' });
    if (s.premium && !s.claimed.premium.includes(r.tier)) out.push({ tier: r.tier, track: 'premium' });
  }
  return out;
}

export type Phase = 'upcoming' | 'live' | 'grace' | 'over';
export function seasonPhase(c: Pick<SeasonConfig, 'startsAt' | 'endsAt' | 'graceDays'>, now = Date.now()): Phase {
  const a = Date.parse(c.startsAt), b = Date.parse(c.endsAt);
  if (now < a) return 'upcoming';
  if (now < b) return 'live';
  if (now < b + c.graceDays * 864e5) return 'grace';
  return 'over';
}

/** Week of the season (1-based) for the "Week 3 of 8" label. */
export function seasonWeek(c: Pick<SeasonConfig, 'startsAt' | 'endsAt'>, now = Date.now()) {
  const a = Date.parse(c.startsAt), b = Date.parse(c.endsAt);
  const weeks = Math.max(1, Math.round((b - a) / (7 * 864e5)));
  return { week: Math.max(1, Math.min(weeks, Math.floor((now - a) / (7 * 864e5)) + 1)), weeks };
}

/** Totals per track (premium value at a glance on the unlock sheet). */
export function trackTotals(track: Track, rewards: TierRewards[] = S1_REWARDS) {
  const t = { bm: 0, dm: 0, shards: 0, spin: 0, boost_xp: 0, items: [] as string[] };
  for (const r of rewards) {
    const x = r[track];
    if (x.kind === 'item') t.items.push(x.item!);
    else t[x.kind] += x.amount;
  }
  return t;
}
