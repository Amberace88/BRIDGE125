import type { GameState } from '../engine/engine';

/**
 * Achievement catalogue — mirrors `achievement_defs` in supabase/migration_003_progress.sql.
 *  server: granted inside record_game / claim_daily (the server counts)
 *  client: the client reports them with report_achievement(code) (whitelisted, once per account, rate-limited)
 */
export interface AchDef {
  code: string;
  bm: number;
  source: 'server' | 'client';
  /** short medallion glyph */
  glyph: string;
  /** progress for count-based ones: which stat and the goal */
  goal?: { stat: 'games_played' | 'wins' | 'level' | 'streak' | 'best_win_streak'; n: number };
}

export const ACHIEVEMENTS: AchDef[] = [
  { code: 'first_win', bm: 250, source: 'server', glyph: '1st', goal: { stat: 'wins', n: 1 } },
  { code: 'games_10', bm: 300, source: 'server', glyph: '10', goal: { stat: 'games_played', n: 10 } },
  { code: 'wins_10', bm: 500, source: 'server', glyph: '♛', goal: { stat: 'wins', n: 10 } },
  { code: 'win_streak_3', bm: 750, source: 'server', glyph: '×3', goal: { stat: 'best_win_streak', n: 3 } },
  { code: 'online_win', bm: 500, source: 'server', glyph: '◎' },
  { code: 'quick_win', bm: 500, source: 'server', glyph: 'ϟ' },
  { code: 'games_50', bm: 1000, source: 'server', glyph: '50', goal: { stat: 'games_played', n: 50 } },
  { code: 'wins_50', bm: 2000, source: 'server', glyph: '♚', goal: { stat: 'wins', n: 50 } },
  { code: 'level_10', bm: 1000, source: 'server', glyph: 'X', goal: { stat: 'level', n: 10 } },
  { code: 'daily_7', bm: 1000, source: 'server', glyph: '7', goal: { stat: 'streak', n: 7 } },
  { code: 'jacks_finish', bm: 400, source: 'client', glyph: 'J' },
  { code: 'exact_125', bm: 600, source: 'client', glyph: '125' },
  { code: 'queen_bounce', bm: 400, source: 'client', glyph: 'Q♠' },
  { code: 'four_kings', bm: 400, source: 'client', glyph: 'K⁴' },
];

export const achDef = (code: string) => ACHIEVEMENTS.find(a => a.code === code);
export const CLIENT_CODES = ACHIEVEMENTS.filter(a => a.source === 'client').map(a => a.code);

/**
 * Client-side achievement detection for one state transition (engine events are per action).
 * `me` is the local player's seat.
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
