import { clock, fmtNum } from '../hub/order';

/** One side of a challenge: what a finished game reported (GameResult / mg_challenges / mg_challenge_results). */
export interface ChallengeSide { won: boolean; score?: number | null; seconds: number }

/**
 * Does `a` beat `b`? 1 / 0 (tie) / -1 — the same rule as `_mg_cmp` in supabase/migration_022_games_social.sql:
 * a win beats a loss; then the higher score (when both have one); then, between two wins, the faster time.
 */
export function compareResults(a: ChallengeSide, b: ChallengeSide): 1 | 0 | -1 {
  if (a.won && !b.won) return 1;
  if (b.won && !a.won) return -1;
  if (a.score != null && b.score != null && Math.round(a.score) !== Math.round(b.score)) return a.score > b.score ? 1 : -1;
  if (a.won && Math.round(a.seconds) !== Math.round(b.seconds)) return a.seconds < b.seconds ? 1 : -1;
  return 0;
}

/** The headline number of a result: the score when the game keeps one, else the time ("2:41"). */
export const resultMain = (r: ChallengeSide) => (r.score != null ? fmtNum(r.score) : clock(r.seconds));
/** The secondary line: the time when the headline is a score. */
export const resultSub = (r: ChallengeSide) => (r.score != null ? clock(r.seconds) : '');

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
/** A fresh URL-safe seed (see the seed contract in ../types.ts). */
export function newSeed(len = 10): string {
  const out: string[] = [];
  const buf = new Uint32Array(len);
  try { crypto.getRandomValues(buf); } catch { for (let i = 0; i < len; i++) buf[i] = Math.floor(Math.random() * 2 ** 32); }
  for (let i = 0; i < len; i++) out.push(ABC[buf[i] % ABC.length]);
  return out.join('');
}

export const SEED_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const CODE_RE = /^[A-Za-z0-9]{6,10}$/;

/** bridge125.com/c/<code> (the current origin in dev / previews). */
export function challengeUrl(code: string): string {
  const origin = typeof location !== 'undefined' && /^https?:/.test(location.origin) ? location.origin : 'https://bridge125.com';
  return `${origin}/c/${code}`;
}
/** "bridge125.com/c/AbC12xY" — the link as printed on the share image. */
export const prettyUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '');
