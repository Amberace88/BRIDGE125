import type { Level } from './grid';
import { hashSeed } from './rng';

// Daily Sudoku: one puzzle per Riga calendar day per level, the same for everyone (seed = date + level).

const FMT = (() => {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  } catch { return null; }
})();
function parts(at: Date) {
  if (!FMT) return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate(), hour: at.getUTCHours(), minute: at.getUTCMinutes(), second: at.getUTCSeconds() };
  const o: Record<string, number> = {};
  for (const p of FMT.formatToParts(at)) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return { year: o.year, month: o.month, day: o.day, hour: o.hour % 24, minute: o.minute, second: o.second };
}
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Today's date in Riga, 'YYYY-MM-DD'. */
export function rigaDay(at: Date = new Date()): string { const p = parts(at); return iso(p.year, p.month, p.day); }

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Milliseconds until the next Riga midnight. */
export function msToRigaMidnight(at: Date = new Date()): number {
  const p = parts(at);
  const left = ((23 - p.hour) * 3600 + (59 - p.minute) * 60 + (60 - p.second)) * 1000 - at.getMilliseconds();
  return Math.max(1000, left);
}

/** The seed of the Daily Sudoku of `day` at `level`. Never change this: it would change every past and future daily. */
export const dailySeed = (day: string, level: Level) => hashSeed(`bridge125:sudoku:daily:${day}:${level}`);

/** Daily number for display (#1 = launch day). */
export const SUDOKU_EPOCH = '2026-10-13';
export function dailyNo(day: string): number {
  const [y, m, d] = day.split('-').map(Number), [y0, m0, d0] = SUDOKU_EPOCH.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y0, m0 - 1, d0)) / 86400000) + 1;
}

/**
 * Consecutive days with at least one solved daily, ending today — or yesterday while today is still open
 * (a streak only breaks once a whole day passes without a solve).
 */
export function streakOf(days: Iterable<string>, today: string): number {
  const set = new Set(days);
  let d = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
