import { useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, isGame, type Game, type Settings } from './core/game';
import { LEVELS, isLevel, type Level } from './core/grid';
import { addDays, rigaDay, streakOf } from './core/daily';

// Everything Sudoku keeps on the device, in ONE localStorage key (b125.sudoku.v1):
// unfinished games (autosaved after every move), settings, finished dailies, best times and solve counts.

export const STORAGE_KEY = 'b125.sudoku.v1';

export interface DailyDone { level: Level; won: boolean; seconds: number; score: number; hints: number; mistakes: number }
export interface Saved {
  v: 1;
  /** unfinished games by key ('classic:hard', 'daily:2026-10-13:easy') */
  games: Record<string, Game>;
  /** the game that was open last (Continue) */
  last: string | null;
  settings: Settings;
  /** finished dailies: day → level → result */
  dailies: Record<string, Partial<Record<Level, DailyDone>>>;
  /** best solve time per level (seconds) */
  best: Partial<Record<Level, number>>;
  solved: Partial<Record<Level, number>>;
  /** the level picked last for a new classic game */
  pick: Level;
}

const empty = (): Saved => ({ v: 1, games: {}, last: null, settings: { ...DEFAULT_SETTINGS }, dailies: {}, best: {}, solved: {}, pick: 'medium' });

function sanitize(x: unknown): Saved {
  const s = empty();
  if (!x || typeof x !== 'object' || (x as Saved).v !== 1) return s;
  const r = x as Partial<Saved>;
  if (r.games && typeof r.games === 'object') for (const [k, g] of Object.entries(r.games)) if (isGame(g)) s.games[k] = g;
  s.last = typeof r.last === 'string' && s.games[r.last] ? r.last : null;
  if (r.settings && typeof r.settings === 'object') for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (typeof r.settings[k] === 'boolean') s.settings[k] = r.settings[k];
  }
  if (r.dailies && typeof r.dailies === 'object') s.dailies = r.dailies;
  if (r.best && typeof r.best === 'object') s.best = r.best;
  if (r.solved && typeof r.solved === 'object') s.solved = r.solved;
  if (isLevel(r.pick)) s.pick = r.pick;
  return s;
}

function read(): Saved {
  try { return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')); } catch { return empty(); }
}

let state: Saved = typeof localStorage === 'undefined' ? empty() : read();
const subs = new Set<() => void>();

function write(next: Saved) {
  state = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* full / private mode: keep it in memory */ }
  subs.forEach(f => f());
}

export const getSaved = () => state;
export function useSaved(): Saved {
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => state, () => state);
}

/** Old unfinished dailies are dropped (a daily is only worth playing on its day). */
function prune(games: Record<string, Game>, today: string): Record<string, Game> {
  const out: Record<string, Game> = {};
  const keep = new Set([today, addDays(today, -1)]);
  for (const [k, g] of Object.entries(games)) if (g.mode !== 'daily' || (g.day && keep.has(g.day))) out[k] = g;
  return out;
}

/** Autosave (every move). Finished games leave the list of unfinished ones. */
export function saveGame(g: Game) {
  const games = { ...state.games };
  if (g.status === 'play') games[g.key] = g; else delete games[g.key];
  write({ ...state, games: prune(games, rigaDay()), last: g.status === 'play' ? g.key : state.last === g.key ? null : state.last });
}

export function dropGame(key: string) {
  const games = { ...state.games }; delete games[key];
  write({ ...state, games, last: state.last === key ? null : state.last });
}

export const setSettings = (patch: Partial<Settings>) => write({ ...state, settings: { ...state.settings, ...patch } });
export const setPick = (pick: Level) => write({ ...state, pick });

/** Book a finished game (once): stats, and the daily list for dailies. */
export function recordFinished(g: Game, seconds: number, score: number) {
  const next: Saved = { ...state, best: { ...state.best }, solved: { ...state.solved }, dailies: { ...state.dailies } };
  if (g.status === 'won') {
    next.solved[g.level] = (next.solved[g.level] ?? 0) + 1;
    const b = next.best[g.level];
    if (!b || seconds < b) next.best[g.level] = seconds;
  }
  if (g.mode === 'daily' && g.day) {
    const day = { ...(next.dailies[g.day] ?? {}) };
    if (!day[g.level]) day[g.level] = { level: g.level, won: g.status === 'won', seconds, score, hints: g.hints, mistakes: g.mistakes };
    next.dailies[g.day] = day;
    // keep about a year of history
    const days = Object.keys(next.dailies).sort();
    for (const d of days.slice(0, Math.max(0, days.length - 400))) delete next.dailies[d];
  }
  write(next);
}

/** Days with at least one solved daily. */
export const solvedDays = (s: Saved) => Object.entries(s.dailies).filter(([, v]) => LEVELS.some(l => v[l]?.won)).map(([d]) => d);
export const dailyStreak = (s: Saved, today = rigaDay()) => streakOf(solvedDays(s), today);
/** Test hook: start over. */
export const resetSaved = () => write(empty());
