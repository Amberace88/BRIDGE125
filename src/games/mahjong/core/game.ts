import { availablePairs, geoOf, isFree, tilesLeft } from './board';
import { deal, reshuffle } from './generate';
import { isLayout, layoutOf, type LayoutId } from './layouts';
import { matchPoints, minus, nextCombo, HINT_COST, SHUFFLE_COST } from './score';
import { planWorks, solve } from './solver';
import { FACES, matches } from './tiles';
import { seedNumber } from '../../seed';

// One game of Mahjong Solitaire as plain, serializable data (autosaved after every move) + pure actions on it.

export type Mode = 'daily' | 'free';
export type Status = 'play' | 'won' | 'lost';
/** shuffles per game */
export const SHUFFLES = 3;

export interface Move { a: number; b: number; fa: number; fb: number; score: number; combo: number; lastAt: number | null; plan: Plan }
/** a removal order that clears the board from here (null: not known — the player's moves left it) */
export type Plan = [number, number][] | null;

export interface Game {
  v: 1;
  /** 'daily:2026-10-13' | 'free:turtle' */
  key: string;
  mode: Mode;
  layout: LayoutId;
  day?: string;
  seed: number;
  /** face per layout position, −1 = removed */
  faces: number[];
  /** the deal as dealt (restart) */
  start: number[];
  /** how to clear the board from here (hints); dealt with the board, kept up to date move by move */
  plan: Plan;
  /** matches since the last shuffle (undo) */
  history: Move[];
  score: number;
  combo: number;
  bestCombo: number;
  /** game time (ms) of the last match — the combo clock */
  lastAt: number | null;
  matches: number;
  hints: number;
  shuffles: number;
  undos: number;
  /** game time played */
  ms: number;
  status: Status;
}

/**
 * The deal seed of a challenge seed (seed contract, ../../types.ts): digits are the deal seed itself (a game reports
 * `String(game.seed)`, so any deal can be sent to a friend), anything else is hashed. Same layout + seed ⇒ same deal.
 */
export const seedFor = (seed: string) => seedNumber(seed, 'mahjong', 0xffffffff, 0);
/** The reshuffle's seed: from the deal and the shuffle count, so a challenge replays the same on every device. */
export const shuffleSeed = (g: Pick<Game, 'seed' | 'shuffles'>) => (g.seed ^ Math.imul(g.shuffles + 1, 0x9e3779b1)) >>> 0;

export const gameKey = (mode: Mode, layout: LayoutId, day?: string) => (mode === 'daily' ? `daily:${day}` : `free:${layout}`);

export function newGame(mode: Mode, layout: LayoutId, seed: number, day?: string): Game {
  const d = deal(layout, seed);
  return {
    v: 1, key: gameKey(mode, layout, day), mode, layout, ...(mode === 'daily' ? { day } : {}), seed,
    faces: d.faces, start: d.faces.slice(), plan: d.solution, history: [],
    score: 0, combo: 0, bestCombo: 0, lastAt: null, matches: 0, hints: 0, shuffles: 0, undos: 0, ms: 0, status: 'play',
  };
}

/** The same deal from the start (free play only — a daily is played once). */
export const restartGame = (g: Game): Game => ({
  ...g, faces: g.start.slice(), plan: deal(g.layout, g.seed).solution, history: [], score: 0, combo: 0, bestCombo: 0, lastAt: null, matches: 0, hints: 0, shuffles: 0, undos: 0, ms: 0, status: 'play',
});

export const shufflesLeft = (g: Game) => Math.max(0, SHUFFLES - g.shuffles);
export const canMatch = (g: Game, a: number, b: number) => {
  const geo = geoOf(g.layout);
  return a !== b && g.status === 'play' && matches(g.faces[a], g.faces[b]) && isFree(geo, g.faces, a) && isFree(geo, g.faces, b);
};

/** Remove a matching pair of free tiles at game time `at` (ms). */
export function match(g: Game, a: number, b: number, at: number): { game: Game; points: number; combo: number } | null {
  if (!canMatch(g, a, b)) return null;
  const combo = nextCombo(g.combo, g.lastAt == null ? null : at - g.lastAt);
  const points = matchPoints(combo);
  const faces = g.faces.slice();
  faces[a] = -1; faces[b] = -1;
  const won = tilesLeft(faces) === 0;
  return {
    game: {
      ...g, faces, ms: at, plan: repairPlan(g, faces, a, b),
      history: [...g.history, { a, b, fa: g.faces[a], fb: g.faces[b], score: g.score, combo: g.combo, lastAt: g.lastAt, plan: g.plan }],
      score: g.score + points, combo, bestCombo: Math.max(g.bestCombo, combo), lastAt: at, matches: g.matches + 1,
      status: won ? 'won' : 'play',
    },
    points, combo,
  };
}

/** Take back the last match (not across a shuffle). */
export function undo(g: Game): Game | null {
  const m = g.history[g.history.length - 1];
  if (!m || g.status !== 'play') return null;
  const faces = g.faces.slice();
  faces[m.a] = m.fa; faces[m.b] = m.fb;
  // the points come back off; the combo chain is broken
  return { ...g, faces, plan: m.plan ?? null, history: g.history.slice(0, -1), score: m.score, combo: 0, lastAt: null, matches: g.matches - 1, undos: g.undos + 1 };
}

export const movesOf = (g: Game) => availablePairs(geoOf(g.layout), g.faces);

/**
 * Keep the plan in step with the player's match (a, b): a planned pair simply leaves it; matching across two planned
 * pairs (a with x's partner …) joins the two leftover partners into one pair at either step — if that still clears.
 */
function repairPlan(g: Game, faces: number[], a: number, b: number): Plan {
  const plan = g.plan;
  if (!plan) return null;
  const geo = geoOf(g.layout);
  const i = plan.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
  if (i >= 0) { const p = plan.filter((_, k) => k !== i); return planWorks(geo, faces, p) ? p : null; }
  const ia = plan.findIndex(p => p[0] === a || p[1] === a), ib = plan.findIndex(p => p[0] === b || p[1] === b);
  if (ia < 0 || ib < 0) return null;
  const x = plan[ia][0] === a ? plan[ia][1] : plan[ia][0], y = plan[ib][0] === b ? plan[ib][1] : plan[ib][0];
  for (const at of [Math.max(ia, ib), Math.min(ia, ib)]) {
    const drop = at === ia ? ib : ia;
    const p = plan.map((q, k) => (k === at ? [x, y] as [number, number] : q)).filter((_, k) => k !== drop);
    if (planWorks(geo, faces, p)) return p;
  }
  return null;
}

/** A good move + the plan behind it: the next step of the plan, else of a solution found quickly, else any move. */
export function hintFor(g: Game, budget = 12000): { pair: [number, number]; plan: Plan } | null {
  const geo = geoOf(g.layout);
  const any = availablePairs(geo, g.faces);
  if (!any.length) return null;
  if (g.plan?.length && planWorks(geo, g.faces, g.plan)) return { pair: g.plan[0], plan: g.plan };
  const r = solve(geo, g.faces, budget);
  return r.moves?.length ? { pair: r.moves[0], plan: r.moves } : { pair: any[0], plan: null };
}
export const hintMove = (g: Game, budget?: number) => hintFor(g, budget)?.pair ?? null;

export const takeHint = (g: Game, plan: Plan = g.plan): Game => ({ ...g, plan, hints: g.hints + 1, score: minus(g.score, HINT_COST), combo: 0, lastAt: null });

/** Shuffle the remaining tiles into a solvable arrangement (when one exists). */
export function shuffleGame(g: Game, seed: number): { game: Game; solvable: boolean } | null {
  if (g.status !== 'play' || shufflesLeft(g) <= 0) return null;
  const r = reshuffle(geoOf(g.layout), g.faces, seed);
  return {
    game: { ...g, faces: r.faces, plan: r.solvable ? r.solution : null, history: [], shuffles: g.shuffles + 1, score: minus(g.score, SHUFFLE_COST), combo: 0, lastAt: null },
    solvable: r.solvable,
  };
}

export const giveUp = (g: Game): Game => ({ ...g, status: 'lost' });

/** Storage guard: only well-formed games are restored. */
export function isGame(x: unknown): x is Game {
  if (!x || typeof x !== 'object') return false;
  const g = x as Game;
  if (g.v !== 1 || !isLayout(g.layout) || (g.mode !== 'daily' && g.mode !== 'free') || typeof g.key !== 'string') return false;
  const n = layoutOf(g.layout).length;
  const okFaces = (f: unknown) => Array.isArray(f) && f.length === n && f.every(v => Number.isInteger(v) && v >= -1 && v < FACES);
  if (!okFaces(g.faces) || !okFaces(g.start)) return false;
  if (!Array.isArray(g.history) || !['play', 'won', 'lost'].includes(g.status)) return false;
  if (g.plan != null && !(Array.isArray(g.plan) && g.plan.every(p => Array.isArray(p) && p.length === 2 && p.every(i => Number.isInteger(i) && i >= 0 && i < n)))) return false;
  for (const k of ['score', 'combo', 'bestCombo', 'matches', 'hints', 'shuffles', 'undos', 'ms', 'seed'] as const) if (typeof g[k] !== 'number' || !Number.isFinite(g[k])) return false;
  return g.mode === 'free' || typeof g.day === 'string';
}
