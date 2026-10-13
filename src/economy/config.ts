/**
 * Bridge Money (BM) economy — tuning numbers. The server (supabase/migration_012_economy.sql) is the source of truth;
 * these mirror it for display, and a unit test (economy.test.ts) keeps both in sync.
 * BM has no cash value and can never be withdrawn; the wheel is free to spin daily and its odds are published in-app.
 */

/* ------------------------------------------------------------------ fortune wheel */
export type PrizeKind = 'bm' | 'xp' | 'shards' | 'boost_xp' | 'boost_luck' | 'shield';
export interface WheelPrize { idx: number; kind: PrizeKind; amount: number; weight: number }

/** Segments in wheel order (clockwise from the pointer). Weights sum to 10 000 (= 100.00 %). */
export const WHEEL_PRIZES: WheelPrize[] = [
  { idx: 0, kind: 'bm', amount: 100, weight: 2200 },
  { idx: 1, kind: 'xp', amount: 100, weight: 1500 },
  { idx: 2, kind: 'bm', amount: 250, weight: 1800 },
  { idx: 3, kind: 'shards', amount: 2, weight: 1300 },
  { idx: 4, kind: 'bm', amount: 500, weight: 1000 },
  { idx: 5, kind: 'boost_xp', amount: 60, weight: 350 },      // minutes of XP ×2
  { idx: 6, kind: 'bm', amount: 1000, weight: 400 },
  { idx: 7, kind: 'xp', amount: 300, weight: 600 },
  { idx: 8, kind: 'bm', amount: 5000, weight: 40 },          // jackpot
  { idx: 9, kind: 'shards', amount: 5, weight: 500 },
  { idx: 10, kind: 'boost_luck', amount: 1440, weight: 210 }, // minutes of Lucky shuffle (24 h)
  { idx: 11, kind: 'shield', amount: 1, weight: 100 },
];
export const WHEEL_TOTAL = 10000;
export const JACKPOT_IDX = 8;
/** Price of the 1st…5th paid spin of the day (the free spin resets at 00:00 Riga time). */
export const SPIN_PRICES = [300, 600, 1200, 2000, 3000] as const;
export const MAX_PAID_SPINS = SPIN_PRICES.length;

/** Expected BM paid per spin (BM prizes only) — used by the docs and a test. */
export const wheelEvBm = () => WHEEL_PRIZES.reduce((s, p) => s + (p.kind === 'bm' ? p.amount * p.weight : 0), 0) / WHEEL_TOTAL;

/* ------------------------------------------------------------------ high-stakes tables (vs bots) */
export interface StakeTier { tier: 1 | 2 | 3; entry: number; minLevel: number }
export const STAKE_TIERS: StakeTier[] = [
  { tier: 1, entry: 250, minLevel: 1 },
  { tier: 2, entry: 1000, minLevel: 5 },
  { tier: 3, entry: 5000, minLevel: 12 },
];
/** pot = entry × 2.5, paid to the winner (the entry is already spent) */
export const POT_MULT = 2.5;
export const potFor = (entry: number) => Math.floor(entry * POT_MULT);
/** Net profit of a won stake = pot − entry. */
export const stakeProfit = (entry: number) => potFor(entry) - entry;
/** A stake game must last at least this long to pay (a real game to 130 takes minutes). */
export const STAKE_MIN_SECONDS = 90;
/** A stake left open longer than this is lost. */
export const STAKE_MAX_HOURS = 6;
export const STAKE_DAILY_GAMES = 10;
/** Net stake profit paid per Riga day; above it a win only refunds the entry. */
export const STAKE_DAILY_PROFIT_CAP = 20000;
/** Stake tables: 3 bots on Hard, bluff mode off (the house edge comes from the 1-in-4 seat). */
export const STAKE_TABLE = { opponents: 3, level: 'hard' as const, bluff: false };

/**
 * Payout of a won stake under the daily cap (mirrors stake_finish()).
 * `profitToday` = net profit already paid today by earlier won stakes.
 */
export function stakePayout(entry: number, luckyActive: boolean, profitToday: number): number {
  const pot = potFor(entry) + (luckyActive ? Math.ceil(potFor(entry) * LUCKY_PCT / 100) : 0);
  const room = Math.max(0, STAKE_DAILY_PROFIT_CAP - profitToday);
  return entry + Math.min(pot - entry, room);
}

/* ------------------------------------------------------------------ boosts (rewards only — never gameplay online) */
export type BoostKind = 'xp2' | 'lucky' | 'shield';
export interface BoostDef { kind: BoostKind; price: number; minutes: number; maxMinutes: number; maxCount: number }
export const BOOSTS: BoostDef[] = [
  { kind: 'xp2', price: 900, minutes: 60, maxMinutes: 360, maxCount: 0 },
  { kind: 'lucky', price: 1500, minutes: 1440, maxMinutes: 4320, maxCount: 0 },
  { kind: 'shield', price: 500, minutes: 0, maxMinutes: 0, maxCount: 5 },
];
export const boostDef = (k: BoostKind) => BOOSTS.find(b => b.kind === k)!;
/** Lucky shuffle: +10 % BM from won games (and won stakes). */
export const LUCKY_PCT = 10;
/** Shield: the next Q♠ penalty against you in a stake match draws 2 fewer cards (5 → 3). */
export const SHIELD_SAVES = 2;

/* ------------------------------------------------------------------ collections (shards → exclusive items) */
export interface CollectionDef { id: string; item: string; costs: [number, number, number, number]; glyphs: [string, string, string, string] }
export const COLLECTIONS: CollectionDef[] = [
  { id: 'obsidian', item: 'ach_fr_obsidian', costs: [4, 6, 8, 12], glyphs: ['A♠', 'K♠', 'Q♠', 'J♠'] },
  { id: 'aurum', item: 'ach_nc_aurum', costs: [5, 7, 10, 13], glyphs: ['A♦', 'K♦', 'Q♦', 'J♦'] },
  { id: 'vault', item: 'ach_bn_vault', costs: [6, 9, 12, 18], glyphs: ['A♥', 'K♥', 'Q♥', 'J♥'] },
];
export const collectionCost = (c: CollectionDef) => c.costs.reduce((s, x) => s + x, 0);
export const relicId = (col: string, piece: number) => `${col}:${piece}`;

/* ------------------------------------------------------------------ prestige */
export const PRESTIGE_LEVEL = 50;
export const PRESTIGE_ITEM = 'ach_fr_prestige';
export const PRESTIGE_SHARDS = 10;
