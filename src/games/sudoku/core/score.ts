import type { Level } from './grid';

// Score of a solved puzzle (leaderboards). Rewards (BM / XP) are decided by the server, never here.
//
//   score = base(level) × speed × help × care × clean
//     speed = √clamp(par / seconds, 0.4, 2.25)   → 0.63 … 1.5  (par time = 1.0)
//     help  = 0.75 ^ hints                         (each hint costs a quarter)
//     care  = max(0.5, 1 − 0.08 × mistakes)
//     clean = 1.15 when no hints and no mistakes
// An unsolved puzzle scores 0.

export const BASE: Record<Level, number> = { easy: 1000, medium: 2000, hard: 3500, expert: 5500 };
/** Par times in seconds — a good, steady solve. */
export const PAR: Record<Level, number> = { easy: 5 * 60, medium: 9 * 60, hard: 16 * 60, expert: 25 * 60 };

export interface ScoreInput { level: Level; seconds: number; hints: number; mistakes: number; solved: boolean }

export function scoreOf({ level, seconds, hints, mistakes, solved }: ScoreInput): number {
  if (!solved) return 0;
  const s = Math.max(20, seconds);
  const speed = Math.sqrt(Math.min(2.25, Math.max(0.4, PAR[level] / s)));
  const help = Math.pow(0.75, Math.max(0, hints));
  const care = Math.max(0.5, 1 - 0.08 * Math.max(0, mistakes));
  const clean = hints === 0 && mistakes === 0 ? 1.15 : 1;
  return Math.round(BASE[level] * speed * help * care * clean);
}

/** The parts of the score for the results screen. */
export function scoreParts(x: ScoreInput) {
  const s = Math.max(20, x.seconds);
  return {
    base: BASE[x.level],
    speed: Math.sqrt(Math.min(2.25, Math.max(0.4, PAR[x.level] / s))),
    help: Math.pow(0.75, Math.max(0, x.hints)),
    care: Math.max(0.5, 1 - 0.08 * Math.max(0, x.mistakes)),
    clean: x.hints === 0 && x.mistakes === 0,
    total: scoreOf(x),
  };
}
