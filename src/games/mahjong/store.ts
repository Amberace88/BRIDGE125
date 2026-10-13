import { useSyncExternalStore } from 'react';
import { isGame, type Game } from './core/game';
import { LAYOUT_IDS, isLayout, type LayoutId } from './core/layouts';
import { addDays, rigaDay, streakOf } from './core/daily';
import { SKINS, type Skin } from './TileArt';

// Everything Mahjong keeps on the device, in ONE localStorage key (b125.mahjong.v1):
// unfinished games (autosaved after every move), settings, finished dailies, bests and clear counts.

export const STORAGE_KEY = 'b125.mahjong.v1';

export interface Settings { skin: Skin; dim: boolean }
export interface DailyDone { layout: LayoutId; won: boolean; seconds: number; score: number }
export interface Best { score: number; seconds: number }
export interface Saved {
  v: 1;
  /** unfinished games by key ('free:turtle', 'daily:2026-10-13') */
  games: Record<string, Game>;
  last: string | null;
  settings: Settings;
  dailies: Record<string, DailyDone>;
  best: Partial<Record<LayoutId, Best>>;
  cleared: Partial<Record<LayoutId, number>>;
  pick: LayoutId;
}

const DEFAULTS: Settings = { skin: 'classic', dim: true };
const empty = (): Saved => ({ v: 1, games: {}, last: null, settings: { ...DEFAULTS }, dailies: {}, best: {}, cleared: {}, pick: 'turtle' });

function sanitize(x: unknown): Saved {
  const s = empty();
  if (!x || typeof x !== 'object' || (x as Saved).v !== 1) return s;
  const r = x as Partial<Saved>;
  if (r.games && typeof r.games === 'object') for (const [k, g] of Object.entries(r.games)) if (isGame(g) && g.key === k && g.status === 'play') s.games[k] = g;
  s.last = typeof r.last === 'string' && s.games[r.last] ? r.last : null;
  if (r.settings && typeof r.settings === 'object') {
    if (SKINS.includes(r.settings.skin)) s.settings.skin = r.settings.skin;
    if (typeof r.settings.dim === 'boolean') s.settings.dim = r.settings.dim;
  }
  if (r.dailies && typeof r.dailies === 'object') for (const [d, v] of Object.entries(r.dailies)) if (v && isLayout(v.layout)) s.dailies[d] = v;
  if (r.best && typeof r.best === 'object') for (const l of LAYOUT_IDS) { const b = r.best[l]; if (b && typeof b.score === 'number' && typeof b.seconds === 'number') s.best[l] = b; }
  if (r.cleared && typeof r.cleared === 'object') for (const l of LAYOUT_IDS) { const c = r.cleared[l]; if (typeof c === 'number') s.cleared[l] = c; }
  if (isLayout(r.pick)) s.pick = r.pick;
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

/** Old unfinished dailies are dropped (a daily only counts on its day or the day after). */
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
export const setPick = (pick: LayoutId) => write({ ...state, pick });

/** Book a finished game (once): bests, clear counts and the daily list. */
export function recordFinished(g: Game, seconds: number, score: number) {
  const next: Saved = { ...state, best: { ...state.best }, cleared: { ...state.cleared }, dailies: { ...state.dailies } };
  if (g.status === 'won') {
    next.cleared[g.layout] = (next.cleared[g.layout] ?? 0) + 1;
    const b = next.best[g.layout];
    next.best[g.layout] = { score: Math.max(b?.score ?? 0, score), seconds: b?.seconds ? Math.min(b.seconds, seconds) : seconds };
  }
  if (g.mode === 'daily' && g.day && !next.dailies[g.day]) {
    next.dailies[g.day] = { layout: g.layout, won: g.status === 'won', seconds, score };
    const days = Object.keys(next.dailies).sort();
    for (const d of days.slice(0, Math.max(0, days.length - 400))) delete next.dailies[d];
  }
  write(next);
}

export const clearedDays = (s: Saved) => Object.entries(s.dailies).filter(([, v]) => v.won).map(([d]) => d);
export const dailyStreak = (s: Saved, today = rigaDay()) => streakOf(clearedDays(s), today);
export const resetSaved = () => write(empty());
