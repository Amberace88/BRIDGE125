import type { GameState } from '../engine/engine';

/**
 * Achievement catalogue — mirrors `achievement_defs` (supabase/migration_003_progress.sql + migration_012_economy.sql).
 * A unit test keeps both in sync, so edit them together.
 *
 *  source 'server' — granted by the server from columns / counters (record_game, claim_daily, achievements_sync …)
 *  source 'client' — additionally unlockable mid-game with report_achievement(code) (whitelisted, once per account,
 *                    rate-limited, max 8 per Riga day) so the medal can pop the instant it happens
 *
 * `goal` names the stat that drives the progress ring ("7/10"). Stats are profile columns (games_played, wins, level …)
 * or counters in `profiles.ach_stats` fed by report_game_stats / the economy RPCs (see `_ach_stats()` in 012).
 * Journey achievements have no goal: the campaign grants them by code (`journey_*`).
 */
export type AchCategory = 'firsts' | 'mastery' | 'cards' | 'scoring' | 'social' | 'bluff' | 'collector' | 'streaks' | 'journey' | 'games' | 'secret';
export const ACH_CATEGORIES: AchCategory[] = ['firsts', 'mastery', 'cards', 'scoring', 'social', 'bluff', 'collector', 'streaks', 'journey', 'games', 'secret'];
export type AchTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export const ACH_TIERS: AchTier[] = ['bronze', 'silver', 'gold', 'platinum'];

/** Profile columns exposed as stats by `_ach_stats()`. */
export const COLUMN_STATS = ['games_played', 'wins', 'level', 'streak', 'best_win_streak', 'prestige', 'owned', 'relics', 'collections', 'founder', 'daily_any'] as const;
/** Counters kept in `profiles.ach_stats`. Per-game ones come from report_game_stats (clamped by GAME_STAT_CAPS). */
export const COUNTER_STATS = [
  'qs_played', 'qs_taken', 'qs_countered', 'eight3', 'eight4', 'kings', 'kings_high', 'jacks_max', 'exact125', 'double_reset',
  'comeback', 'zero_win', 'rounds_won', 'clean_round', 'big_draw', 'quad', 'triple7', 'queen_finish', 'marathon', 'midnight',
  'bluff_caught', 'bluff_ok', 'liar', 'online_wins', 'quick_wins', 'quick_games', 'hosted',
  // economy (server-side only)
  'spins', 'jackpots', 'stake_played', 'stake_wins', 'stake_big_wins', 'boosts',
  // mini games (server-side only: record_minigame, migration 019)
  'mg_games', 'mg_zole_wins', 'mg_durak_streak', 'mg_solitaire_wins', 'mg_sudoku_wins', 'mg_dailies', 'mg_daily_streak', 'mg_variety',
  'mg_thousand_wins', 'mg_mahjong_wins', 'mg_freecell_streak',
] as const;
export type AchStat = typeof COLUMN_STATS[number] | typeof COUNTER_STATS[number];

export interface AchDef {
  code: string;
  cat: AchCategory;
  tier: AchTier;
  bm: number;
  xp: number;
  /** brass shards for the collections (economy) */
  shards: number;
  source: 'server' | 'client';
  /** short medallion glyph */
  glyph: string;
  goal?: { stat: AchStat; n: number };
  /** cosmetic id added to `owned` on unlock (existing shop ids or new `ach_*` ids) */
  item?: string;
  /** shown as "???" with a cryptic hint until unlocked */
  secret?: boolean;
}

const XP: Record<AchTier, number> = { bronze: 50, silver: 150, gold: 400, platinum: 1000 };
const SH: Record<AchTier, number> = { bronze: 1, silver: 2, gold: 3, platinum: 5 };
type Opt = { item?: string; secret?: boolean; client?: boolean };
const a = (code: string, cat: AchCategory, tier: AchTier, bm: number, glyph: string, goal?: [AchStat, number], o: Opt = {}): AchDef => ({
  code, cat, tier, bm, xp: XP[tier], shards: SH[tier], source: o.client ? 'client' : 'server', glyph,
  ...(goal ? { goal: { stat: goal[0], n: goal[1] } } : {}),
  ...(o.item ? { item: o.item } : {}), ...(o.secret ? { secret: true } : {}),
});
const C: Opt = { client: true };
const S: Opt = { secret: true };
const SC: Opt = { secret: true, client: true };

export const ACHIEVEMENTS: AchDef[] = [
  // ---- the original 14 (migration_003) — bm and source must not change
  a('first_win', 'firsts', 'bronze', 250, '1st', ['wins', 1]),
  a('games_10', 'mastery', 'bronze', 300, '10', ['games_played', 10]),
  a('wins_10', 'mastery', 'bronze', 500, '♛', ['wins', 10]),
  a('win_streak_3', 'streaks', 'bronze', 750, '×3', ['best_win_streak', 3]),
  a('online_win', 'social', 'bronze', 500, '◎', ['online_wins', 1]),
  a('quick_win', 'social', 'bronze', 500, 'ϟ', ['quick_wins', 1]),
  a('games_50', 'mastery', 'silver', 1000, '50', ['games_played', 50]),
  a('wins_50', 'mastery', 'silver', 2000, '♚', ['wins', 50]),
  a('level_10', 'mastery', 'silver', 1000, 'X', ['level', 10]),
  a('daily_7', 'streaks', 'silver', 1000, '7', ['streak', 7]),
  a('jacks_finish', 'cards', 'bronze', 400, 'J', ['jacks_max', 2], C),
  a('exact_125', 'scoring', 'silver', 600, '125', ['exact125', 1], C),
  a('queen_bounce', 'cards', 'bronze', 400, 'Q♠', ['qs_countered', 1], C),
  a('four_kings', 'cards', 'silver', 400, 'K⁴', ['kings', 1], C),

  // ---- firsts
  a('first_game', 'firsts', 'bronze', 100, '♠', ['games_played', 1]),
  a('first_daily', 'firsts', 'bronze', 100, '☀', ['daily_any', 1]),
  a('first_spin', 'firsts', 'bronze', 100, '⟳', ['spins', 1]),
  a('first_stake', 'firsts', 'bronze', 200, '◆', ['stake_played', 1]),
  a('first_boost', 'firsts', 'bronze', 100, 'ϟ²', ['boosts', 1]),
  a('first_forge', 'firsts', 'silver', 300, '⚒', ['relics', 1]),

  // ---- mastery
  a('games_100', 'mastery', 'silver', 1500, '100', ['games_played', 100]),
  a('games_500', 'mastery', 'gold', 4000, '500', ['games_played', 500]),
  a('games_1000', 'mastery', 'platinum', 8000, 'M', ['games_played', 1000], { item: 'ach_fr_veteran' }),
  a('wins_100', 'mastery', 'gold', 3000, 'C', ['wins', 100]),
  a('wins_500', 'mastery', 'platinum', 10000, 'D', ['wins', 500], { item: 't_legend' }),
  a('level_25', 'mastery', 'gold', 2500, 'XXV', ['level', 25]),
  a('level_50', 'mastery', 'platinum', 5000, 'L', ['level', 50]),
  a('prestige_1', 'mastery', 'gold', 3000, '✵', ['prestige', 1]),
  a('prestige_3', 'mastery', 'platinum', 8000, '✵³', ['prestige', 3], { item: 'ach_t_immortal' }),
  a('stake_win_1', 'mastery', 'silver', 500, '$', ['stake_wins', 1]),
  a('stake_win_10', 'mastery', 'gold', 2000, '$$', ['stake_wins', 10], { item: 't_highroller' }),

  // ---- special cards
  a('qs_counter_10', 'cards', 'gold', 1500, '6♠', ['qs_countered', 10]),
  a('qs_dealt_10', 'cards', 'silver', 800, 'Q↗', ['qs_played', 10], { item: 't_queenslayer' }),
  a('qs_taken_25', 'cards', 'silver', 500, '+5', ['qs_taken', 25]),
  a('eight_chain_3', 'cards', 'silver', 600, '8³', ['eight3', 1], C),
  a('eight_chain_4', 'cards', 'gold', 1500, '8⁴', ['eight4', 1], C),
  a('kings_5', 'cards', 'gold', 2000, 'K×5', ['kings', 5]),
  a('jacks_x3', 'cards', 'silver', 800, 'J×3', ['jacks_max', 3], C),
  a('jacks_x4', 'cards', 'gold', 2000, 'J×4', ['jacks_max', 4], C),
  a('jacks_x5', 'cards', 'platinum', 5000, 'J×5', ['jacks_max', 5], C),

  // ---- scoring
  a('exact_125_10', 'scoring', 'gold', 2500, '125×', ['exact125', 10]),
  a('comeback', 'scoring', 'gold', 1500, '120↺', ['comeback', 1], { item: 'ach_t_phoenix', client: true }),
  a('zero_win', 'scoring', 'gold', 2000, '0', ['zero_win', 1], C),
  a('rounds_100', 'scoring', 'silver', 800, 'R', ['rounds_won', 100]),
  a('rounds_500', 'scoring', 'gold', 2500, 'R⁵', ['rounds_won', 500]),

  // ---- social
  a('online_wins_10', 'social', 'silver', 1000, '◎10', ['online_wins', 10]),
  a('online_wins_50', 'social', 'gold', 3000, '◎50', ['online_wins', 50]),
  a('quick_10', 'social', 'silver', 600, 'ϟ10', ['quick_games', 10]),
  a('host_5', 'social', 'silver', 600, '⌂', ['hosted', 5]),
  a('host_25', 'social', 'gold', 1500, '⌂25', ['hosted', 25]),

  // ---- bluff
  a('bluff_catch_1', 'bluff', 'bronze', 200, '◉', ['bluff_caught', 1]),
  a('bluff_catch_10', 'bluff', 'silver', 800, '◉10', ['bluff_caught', 10]),
  a('bluff_catch_50', 'bluff', 'gold', 2500, '◉50', ['bluff_caught', 50], { item: 'ach_t_detective' }),
  a('bluff_ok_1', 'bluff', 'bronze', 200, '?', ['bluff_ok', 1]),
  a('bluff_ok_10', 'bluff', 'silver', 800, '?10', ['bluff_ok', 10]),
  a('bluff_ok_50', 'bluff', 'gold', 2500, '?50', ['bluff_ok', 50], { item: 't_bluff' }),

  // ---- collector
  a('own_5', 'collector', 'bronze', 300, '5', ['owned', 5]),
  a('own_15', 'collector', 'silver', 1000, '15', ['owned', 15]),
  a('own_30', 'collector', 'gold', 2500, '30', ['owned', 30]),
  a('own_60', 'collector', 'platinum', 6000, '60', ['owned', 60], { item: 'nc_holo' }),
  a('collection_1', 'collector', 'gold', 2000, '❖', ['collections', 1]),
  a('collection_all', 'collector', 'platinum', 6000, '❖³', ['collections', 3], { item: 'ach_t_curator' }),
  a('spins_30', 'collector', 'silver', 600, '⟳30', ['spins', 30]),

  // ---- streaks
  a('daily_30', 'streaks', 'gold', 3000, '30d', ['streak', 30], { item: 'ach_nc_ember' }),
  a('daily_100', 'streaks', 'platinum', 8000, '100d', ['streak', 100]),
  a('win_streak_5', 'streaks', 'silver', 1500, '×5', ['best_win_streak', 5]),
  a('win_streak_10', 'streaks', 'platinum', 5000, '×10', ['best_win_streak', 10]),

  // ---- journey (placeholders: the campaign grants these by code)
  a('journey_ch1', 'journey', 'bronze', 300, 'I'),
  a('journey_ch2', 'journey', 'silver', 600, 'II'),
  a('journey_ch3', 'journey', 'silver', 900, 'III'),
  a('journey_ch4', 'journey', 'gold', 1500, 'IV'),
  a('journey_ch5', 'journey', 'platinum', 4000, 'V'),

  // ---- secrets ("???" until unlocked)
  a('s_midnight', 'secret', 'silver', 700, '☾', ['midnight', 1], SC),
  a('s_avalanche', 'secret', 'silver', 700, '▼', ['big_draw', 1], SC),
  a('s_ghost', 'secret', 'gold', 1500, '◌', ['clean_round', 1], SC),
  a('s_quad', 'secret', 'silver', 800, '⁴', ['quad', 1], SC),
  a('s_phoenix', 'secret', 'gold', 2000, '✶', ['double_reset', 1], SC),
  a('s_regicide', 'secret', 'gold', 1500, '♔', ['kings_high', 1], SC),
  a('s_marathon', 'secret', 'silver', 800, '∞', ['marathon', 1], SC),
  a('s_lucky7', 'secret', 'silver', 777, '777', ['triple7', 1], SC),
  a('s_jackpot', 'secret', 'gold', 1000, '★', ['jackpots', 1], S),
  a('s_all_in', 'secret', 'platinum', 3000, '♦', ['stake_big_wins', 1], S),
  a('s_liar', 'secret', 'gold', 1500, '◐', ['liar', 1], SC),
  a('s_queen_finish', 'secret', 'gold', 1500, 'Q!', ['queen_finish', 1], SC),
  a('s_founder', 'secret', 'gold', 1000, 'F', ['founder', 1], { secret: true, item: 'ach_t_founder' }),

  // ---- mini games (migration 019 seeds these rows with sort 86…; record_minigame feeds the mg_* counters)
  a('mg_first', 'games', 'bronze', 100, '◈', ['mg_games', 1]),
  a('mg_games_100', 'games', 'silver', 1200, '◈100', ['mg_games', 100]),
  a('mg_zole_master', 'games', 'gold', 1500, 'Z', ['mg_zole_wins', 25]),
  a('mg_never_durak', 'games', 'silver', 800, 'D×5', ['mg_durak_streak', 5]),
  a('mg_patience', 'games', 'silver', 600, 'K♥', ['mg_solitaire_wins', 10]),
  a('mg_sudoku_25', 'games', 'silver', 800, '9', ['mg_sudoku_wins', 25]),
  a('mg_daily_solver', 'games', 'silver', 700, '☀7', ['mg_dailies', 7]),
  a('mg_clockwork', 'games', 'gold', 1500, '7d', ['mg_daily_streak', 7]),
  a('mg_all_rounder', 'games', 'gold', 1500, '4◈', ['mg_variety', 4]),
  // ---- the games of 022a–c (migration 024 seeds these rows with sort 95…)
  a('mg_thousand_master', 'games', 'gold', 1500, '1000', ['mg_thousand_wins', 10]),
  a('mg_mahjong_zen', 'games', 'silver', 800, '中', ['mg_mahjong_wins', 25]),
  a('mg_freecell_purist', 'games', 'silver', 800, 'FC×5', ['mg_freecell_streak', 5]),
];

const BY_CODE = new Map(ACHIEVEMENTS.map(x => [x.code, x]));
export const achDef = (code: string) => BY_CODE.get(code);
export const CLIENT_CODES = ACHIEVEMENTS.filter(x => x.source === 'client').map(x => x.code);
/** New cosmetic ids introduced by achievements (need art in src/cosmetics — see src/economy/cosmetics.ts). */
export const ACH_ITEMS = [...new Set(ACHIEVEMENTS.map(x => x.item).filter((x): x is string => !!x && x.startsWith('ach_')))];

/** Value of a stat from the server's stats object (`achievements_sync().stats`). */
export const statValue = (stats: Record<string, number> | null | undefined, k: AchStat) => Math.max(0, Number(stats?.[k] ?? 0) || 0);

/** 0..1 progress towards an achievement (1 when unlocked). */
export function achProgress(d: AchDef, stats: Record<string, number> | null | undefined, unlocked: boolean): { cur: number; n: number; pct: number } {
  if (!d.goal) return { cur: unlocked ? 1 : 0, n: 1, pct: unlocked ? 1 : 0 };
  const n = d.goal.n, cur = unlocked ? n : Math.min(n, statValue(stats, d.goal.stat));
  return { cur, n, pct: n ? cur / n : 0 };
}

/**
 * One-state detection (kept for compatibility): the four original one-shot codes from the last action's events.
 * The full per-game tracking lives in ./tracker.ts.
 */
export function detectAchievements(g: GameState, me: number): string[] {
  if (me < 0 || !g.events?.length) return [];
  const out: string[] = [];
  const ev = g.events;
  if (ev.some(e => e.t === 'roundEnd' && e.winner === me && e.mult > 1)) out.push('jacks_finish');
  if (ev.some(e => e.t === 'reset125' && e.p === me)) out.push('exact_125');
  if (ev.some(e => e.t === 'transfer' && e.p === me)) out.push('queen_bounce');
  if (ev.some(e => e.t === 'kings') && ev.some(e => e.t === 'play' && e.p === me && e.cards.some(c => c.r === 'K'))) out.push('four_kings');
  return out;
}
