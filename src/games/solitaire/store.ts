// Solitaire on this device: the game in progress (autosaved every move), preferences, stats and daily bests.
// One localStorage key: b125.solitaire.v1. Every access is guarded (private mode, quota, corrupt data).

import { isMode, isSpiderMode, type AnyState, type Game, type Mode } from './engine/game';
import { spiderCards, type SpState } from './engine/spider';
import { addDays } from './engine/cards';

export const SOL_KEY = 'b125.solitaire.v1';
/** history kept on disk (in memory undo is unlimited) */
const HIST_ON_DISK = 400;

export interface ModeStats { played: number; won: number; bestScore: number; bestTime: number; bestMoves: number; streak: number; bestStreak: number }
export interface DailyRec { won: boolean; plays: number; bestTime?: number; bestMoves?: number; bestScore?: number }

export interface SolSave {
  v: 1;
  game: Game | null;
  prefs: { mode: Mode; vegas: boolean };
  stats: Partial<Record<Mode, ModeStats>>;
  daily: Record<string, DailyRec>;
  /** cached daily seeds (the winnable search is deterministic, this only saves the work) */
  seeds: Record<string, number>;
  /** first-run tips shown */
  tips?: boolean;
}

const fresh = (): SolSave => ({ v: 1, game: null, prefs: { mode: 'klondike-1', vegas: false }, stats: {}, daily: {}, seeds: {} });

const strip = (s: AnyState): AnyState => (s.game === 'spider' ? ({ ...s, cards: undefined } as unknown as SpState) : s);
function restore(s: AnyState): AnyState {
  if (s && s.game === 'spider' && !Array.isArray(s.cards)) return { ...s, cards: spiderCards(s.suits) };
  return s;
}

function validGame(g: unknown): g is Game {
  const x = g as Game;
  return !!x && typeof x === 'object' && isMode(x.mode) && !!x.st && Array.isArray(x.hist)
    && (x.st.game === 'spider') === isSpiderMode(x.mode) && Array.isArray(x.st.tab);
}

export function loadSave(): SolSave {
  try {
    const raw = localStorage.getItem(SOL_KEY);
    if (!raw) return fresh();
    const v = JSON.parse(raw) as Partial<SolSave>;
    if (!v || v.v !== 1) return fresh();
    const out: SolSave = { ...fresh(), ...v, prefs: { ...fresh().prefs, ...(v.prefs ?? {}) } } as SolSave;
    if (!isMode(out.prefs.mode)) out.prefs.mode = 'klondike-1';
    if (out.game && validGame(out.game)) {
      out.game = { ...out.game, st: restore(out.game.st), hist: out.game.hist.map(restore) };
    } else out.game = null;
    out.stats ??= {}; out.daily ??= {}; out.seeds ??= {};
    return out;
  } catch { return fresh(); }
}

export function writeSave(s: SolSave): void {
  try {
    const g = s.game ? { ...s.game, st: strip(s.game.st), hist: s.game.hist.slice(-HIST_ON_DISK).map(strip) } : null;
    // keep the daily records of the last 60 days
    const cutoff = addDays(new Date().toISOString().slice(0, 10), -60);
    const daily = Object.fromEntries(Object.entries(s.daily).filter(([d]) => d >= cutoff));
    const seeds = Object.fromEntries(Object.entries(s.seeds).filter(([d]) => d >= cutoff));
    localStorage.setItem(SOL_KEY, JSON.stringify({ ...s, game: g, daily, seeds }));
  } catch { /* private mode / quota */ }
}

const emptyStats = (): ModeStats => ({ played: 0, won: 0, bestScore: 0, bestTime: 0, bestMoves: 0, streak: 0, bestStreak: 0 });

/** Records a finished game; returns which bests it beat. */
export function recordResult(s: SolSave, g: Game, won: boolean, score: number): { save: SolSave; bestTime: boolean; bestMoves: boolean; bestScore: boolean } {
  const st = { ...emptyStats(), ...(s.stats[g.mode] ?? {}) };
  st.played++;
  let bestTime = false, bestMoves = false, bestScore = false;
  const secs = Math.max(1, Math.round(g.seconds));
  if (won) {
    st.won++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak);
    if (!st.bestTime || secs < st.bestTime) { bestTime = st.bestTime > 0; st.bestTime = secs; }
    if (!st.bestMoves || g.st.moves < st.bestMoves) { bestMoves = st.bestMoves > 0; st.bestMoves = g.st.moves; }
    if (score > st.bestScore) { bestScore = st.bestScore > 0; st.bestScore = score; }
  } else st.streak = 0;
  const daily = { ...s.daily };
  if (g.day) {
    const prev = daily[g.day];
    const d: DailyRec = prev ? { ...prev } : { won: false, plays: 0 };
    d.plays++;
    if (won) {
      d.won = true;
      if (d.bestTime == null || secs < d.bestTime) d.bestTime = secs;
      if (d.bestMoves == null || g.st.moves < d.bestMoves) d.bestMoves = g.st.moves;
      if (d.bestScore == null || score > d.bestScore) d.bestScore = score;
    }
    daily[g.day] = d;
  }
  return { save: { ...s, stats: { ...s.stats, [g.mode]: st }, daily }, bestTime, bestMoves, bestScore };
}
