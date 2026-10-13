import { format, type Grid, type Level } from './grid';
import { grade, type Grade } from './logic';
import { rng, shuffle } from './rng';
import { countSolutions, randomSolution } from './solver';

// Seeded generator: a random full grid, then clues are removed in symmetric pairs while the solution stays unique.
// The puzzle is graded by the techniques it needs; if the level is wrong, the next attempt continues from the same
// random stream. Everything depends on the seed alone (no clocks) → the Daily is identical on every device.

export interface Puzzle {
  /** 81 chars, '.' = empty */
  puzzle: string;
  solution: string;
  level: Level;
  seed: number;
  givens: number;
  /** the hardest technique tier needed (1–3) */
  tier: number;
  attempts: number;
}

/** Easy keeps more clues (a calmer start); the rest go down to a minimal puzzle. */
const EASY_GIVENS = [36, 40] as const;
/** After this many attempts, take the closest puzzle found so far (keeps worst-case time bounded, still deterministic). */
export const MAX_ATTEMPTS = 1500;
const RANK: Record<Level, number> = { easy: 0, medium: 1, hard: 2, expert: 3 };

function carve(solution: Grid, r: () => number, minGivens: number): Grid {
  const g = solution.slice();
  const pairs: [number, number][] = [];
  for (let i = 0; i <= 40; i++) pairs.push([i, 80 - i]);
  shuffle(pairs, r);
  let n = 81;
  for (const [a, b] of pairs) {
    const k = a === b ? 1 : 2;
    if (n - k < minGivens) continue;
    const va = g[a], vb = g[b];
    g[a] = 0; g[b] = 0;
    if (countSolutions(g, 2) === 1) n -= k;
    else { g[a] = va; g[b] = vb; }
  }
  return g;
}

/** One attempt per `next()` so callers can spread the work (Web Worker or idle chunks). */
export function* generateSteps(level: Level, seed: number): Generator<number, Puzzle, void> {
  const r = rng(seed);
  let best: { g: Grid; sol: Grid; gr: Grade } | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const sol = randomSolution(r);
    const min = level === 'easy' ? EASY_GIVENS[0] + Math.floor(r() * (EASY_GIVENS[1] - EASY_GIVENS[0] + 1)) : 17;
    const g = carve(sol, r, min);
    const gr = grade(g);
    if (gr.level === level) return done(g, sol, gr, level, seed, attempt);
    // the fallback: the hardest solvable puzzle not above the requested level
    if (gr.level && RANK[gr.level] <= RANK[level] && (!best || gr.maxTier > best.gr.maxTier)) best = { g, sol, gr };
    yield attempt;
  }
  if (best) return done(best.g, best.sol, best.gr, level, seed, MAX_ATTEMPTS);
  throw new Error('sudoku: generator found nothing');
}

function done(g: Grid, sol: Grid, gr: Grade, level: Level, seed: number, attempts: number): Puzzle {
  return { puzzle: format(g), solution: format(sol), level, seed, givens: gr.givens, tier: gr.maxTier, attempts };
}

/** Synchronous generation (Web Worker, tests). */
export function generate(level: Level, seed: number): Puzzle {
  const it = generateSteps(level, seed);
  for (;;) { const x = it.next(); if (x.done) return x.value; }
}
