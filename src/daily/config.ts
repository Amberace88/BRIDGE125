import { newGame, seedFrom, type GameState } from '../engine/engine';
import type { BotLevel } from '../engine/bot';

/**
 * Daily challenge ("Dienas izaicinājums"): every Riga calendar day everyone plays the SAME three deals against the
 * SAME three bots. The deal comes from a seed derived from the date (engine: NewGameOpts.seed); in a seeded game the
 * bots decide deterministically, so the only difference between two players is how they play.
 *
 * Keep SCORE + REWARDS in sync with supabase/migration_014_daily_referrals.sql (src/daily/daily.test.ts compares them).
 */
export const DAILY = {
  opponents: 3,
  level: 'hard' as BotLevel,
  rounds: 3,
  bluff: false,
} as const;

/** score = base + win + per round won − per point − per turn − per Q♠ taken, never below 0. */
export const SCORE = { base: 1000, win: 500, round: 150, point: 5, turn: 2, queen: 40 } as const;
/** Server-side sanity ranges (challenge_submit rejects anything outside). */
export const LIMITS = { turns: 300, points: 600, queens: 20 } as const;

/** BM + XP paid server-side: on the first scored attempt of the day, and once the day is over by final rank. */
export const REWARDS = {
  play: { bm: 150, xp: 50 },
  top1: { bm: 2500, xp: 400 },
  top10: { bm: 800, xp: 150 },
  top10pct: { bm: 300, xp: 80 },
} as const;

export interface DailyDetails {
  /** my points when the game ended (lower is better) */
  points: number;
  /** rounds I went out first */
  roundsWon: number;
  /** rounds played (≤ DAILY.rounds; fewer if someone passed 130) */
  rounds: number;
  /** Q♠ penalties I had to take */
  queens: number;
}

export interface DailyResult extends DailyDetails {
  day: string;
  won: boolean;
  turns: number;
  score: number;
}

export function dailyScore(r: { won: boolean; turns: number } & DailyDetails): number {
  const v = SCORE.base + (r.won ? SCORE.win : 0) + SCORE.round * r.roundsWon
    - SCORE.point * r.points - SCORE.turn * r.turns - SCORE.queen * r.queens;
  return Math.max(0, Math.round(v));
}

/** The seed of a day ('YYYY-MM-DD'). */
export const dailySeed = (day: string) => seedFrom('bridge125:daily:' + day);

/** Today's challenge table: me + three bots, seeded deal, three rounds. */
export function dailyGame(day: string, me: string, bots: string[]): GameState {
  return newGame([{ name: me, bot: false }, ...bots.slice(0, DAILY.opponents).map(n => ({ name: n, bot: true }))],
    { seed: dailySeed(day), maxRounds: DAILY.rounds, bluff: DAILY.bluff });
}

/* ------------------------------------------------------------------ Riga calendar */

const RIGA = 'Europe/Riga';
function parts(at: Date) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: RIGA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(at)) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return o as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Today's date in Riga ('YYYY-MM-DD') — the challenge day flips at Riga midnight, like the server's riga_today(). */
export function rigaDay(at: Date = new Date()): string {
  const p = parts(at);
  return iso(p.year, p.month, p.day);
}

/** Add days to a 'YYYY-MM-DD' date. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Epoch ms of the next Riga midnight (when the next challenge opens). */
export function nextRigaMidnight(at: Date = new Date()): number {
  const p = parts(at);
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at.getTime() / 1000) * 1000;
  const [y, m, d] = addDays(iso(p.year, p.month, p.day), 1).split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d) - offset;
  // DST may change the offset overnight: correct with the offset at the guessed instant
  const q = parts(new Date(guess));
  const off2 = Date.UTC(q.year, q.month - 1, q.day, q.hour, q.minute, q.second) - guess;
  return Date.UTC(y, m - 1, d) - off2;
}

/** Challenge number (#1 = launch day) for the share card. */
export const LAUNCH_DAY = '2026-10-13';
export function challengeNo(day: string): number {
  const [a, b] = [LAUNCH_DAY, day].map(s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); });
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}
