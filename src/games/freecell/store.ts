// FreeCell on this device: the game in progress (autosaved every move), stats and daily bests.
// One localStorage key: b125.freecell.v1. Every access is guarded (private mode, quota, corrupt data).

import { addDays } from '../solitaire/engine/cards';
import { isDealNo } from './engine/deal';
import type { FcGame } from './engine/game';
import type { FcState } from './engine/rules';

export const FC_KEY = 'b125.freecell.v1';
/** history kept on disk (in memory undo is unlimited) */
const HIST_ON_DISK = 500;

export interface FcStats { played: number; won: number; streak: number; bestStreak: number; bestTime: number; bestMoves: number; bestScore: number }
export interface FcDailyRec { won: boolean; plays: number; bestTime?: number; bestMoves?: number }

export interface FcSave {
  v: 1;
  game: FcGame | null;
  stats: FcStats;
  daily: Record<string, FcDailyRec>;
  /** cached daily deal numbers (the proof is deterministic, this only saves the work) */
  deals: Record<string, number>;
  /** first-run tip shown */
  tips?: boolean;
}

export const emptyStats = (): FcStats => ({ played: 0, won: 0, streak: 0, bestStreak: 0, bestTime: 0, bestMoves: 0, bestScore: 0 });
const fresh = (): FcSave => ({ v: 1, game: null, stats: emptyStats(), daily: {}, deals: {} });

function validState(s: unknown): s is FcState {
  const x = s as FcState;
  if (!x || !Array.isArray(x.cols) || x.cols.length !== 8 || !Array.isArray(x.cells) || x.cells.length !== 4 || !Array.isArray(x.found) || x.found.length !== 4) return false;
  const seen = new Set<number>();
  for (const c of x.cols) { if (!Array.isArray(c)) return false; for (const id of c) seen.add(id); }
  for (const c of x.cells) if (c != null) seen.add(c);
  const home = x.found.reduce((a, f) => a + (Number.isInteger(f) && f >= 0 && f <= 13 ? f : 99), 0);
  return home <= 52 && seen.size + home === 52;
}

function validGame(g: unknown): g is FcGame {
  const x = g as FcGame;
  return !!x && typeof x === 'object' && isDealNo(x.deal) && validState(x.st) && Array.isArray(x.hist) && x.hist.every(validState)
    && Number.isFinite(x.moves) && Number.isFinite(x.undos) && Number.isFinite(x.seconds);
}

export function loadSave(): FcSave {
  try {
    const raw = localStorage.getItem(FC_KEY);
    if (!raw) return fresh();
    const v = JSON.parse(raw) as Partial<FcSave>;
    if (!v || v.v !== 1) return fresh();
    const out: FcSave = { ...fresh(), ...v, stats: { ...emptyStats(), ...(v.stats ?? {}) } } as FcSave;
    if (!validGame(out.game)) out.game = null;
    if (!out.daily || typeof out.daily !== 'object') out.daily = {};
    if (!out.deals || typeof out.deals !== 'object') out.deals = {};
    return out;
  } catch { return fresh(); }
}

export function writeSave(s: FcSave): void {
  try {
    const g = s.game ? { ...s.game, hist: s.game.hist.slice(-HIST_ON_DISK) } : null;
    // keep the daily records of the last 60 days
    const cutoff = addDays(new Date().toISOString().slice(0, 10), -60);
    const daily = Object.fromEntries(Object.entries(s.daily).filter(([d]) => d >= cutoff));
    const deals = Object.fromEntries(Object.entries(s.deals).filter(([d]) => d >= cutoff));
    localStorage.setItem(FC_KEY, JSON.stringify({ ...s, game: g, daily, deals }));
  } catch { /* private mode / quota */ }
}

/** Records a finished game; returns which bests it beat. */
export function recordResult(s: FcSave, g: FcGame, won: boolean, score: number): { save: FcSave; bestTime: boolean; bestMoves: boolean } {
  const st = { ...emptyStats(), ...s.stats };
  st.played++;
  let bestTime = false, bestMoves = false;
  const secs = Math.max(1, Math.round(g.seconds));
  if (won) {
    st.won++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak);
    if (!st.bestTime || secs < st.bestTime) { bestTime = st.bestTime > 0; st.bestTime = secs; }
    if (!st.bestMoves || g.moves < st.bestMoves) { bestMoves = st.bestMoves > 0; st.bestMoves = g.moves; }
    if (score > st.bestScore) st.bestScore = score;
  } else st.streak = 0;
  const daily = { ...s.daily };
  if (g.day) {
    const d: FcDailyRec = { ...(daily[g.day] ?? { won: false, plays: 0 }) };
    d.plays++;
    if (won) {
      d.won = true;
      if (d.bestTime == null || secs < d.bestTime) d.bestTime = secs;
      if (d.bestMoves == null || g.moves < d.bestMoves) d.bestMoves = g.moves;
    }
    daily[g.day] = d;
  }
  return { save: { ...s, stats: st, daily }, bestTime, bestMoves };
}
