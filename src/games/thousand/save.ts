import { DEFAULT_RULES, type TState, type ThousandRules } from './engine';
import type { TLevel } from './bot';

/**
 * Thousand on this device: the lobby choices and the game in progress, saved after every move under one key, so
 * leaving (or a closed tab) always resumes exactly where the player was.
 */
export const SAVE_KEY = 'b125.thousand.v1';
const TIPS_KEY = 'b125.thousand.tips.v1';

export interface ThousandPrefs { level: TLevel; rules: ThousandRules }
export interface ThousandRun {
  g: TState;
  level: TLevel;
  /** seconds at the table so far */
  seconds: number;
  /** the result was reported (game over) */
  reported?: boolean;
}
export interface ThousandSave { v: 1; prefs: ThousandPrefs; run: ThousandRun | null }

export const DEFAULT_PREFS: ThousandPrefs = { level: 'normal', rules: DEFAULT_RULES };

const valid = (r: unknown): r is ThousandRun => {
  const g = (r as ThousandRun | null)?.g;
  return !!g && g.v === 1 && Array.isArray(g.hands) && g.hands.length === 3 && Array.isArray(g.scores) && typeof g.phase === 'string' && Array.isArray(g.barrel);
};

export function loadSave(): ThousandSave {
  try {
    const j = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as Partial<ThousandSave> | null;
    const lv = j?.prefs?.level;
    const prefs: ThousandPrefs = {
      level: lv === 'easy' || lv === 'hard' || lv === 'normal' ? lv : DEFAULT_PREFS.level,
      rules: { ...DEFAULT_RULES, ...(j?.prefs?.rules ?? {}) },
    };
    const run = valid(j?.run) && !(j!.run!.g.phase === 'gameOver' && j!.run!.reported) ? j!.run! : null;
    return { v: 1, prefs, run };
  } catch {
    return { v: 1, prefs: DEFAULT_PREFS, run: null };
  }
}

export function writeSave(s: ThousandSave) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* private mode / full: in-memory only */ }
}

/* ---------- first-timer coach: each tip shows once per device ---------- */
let tipsCache: Record<string, number> | null = null;
function tips(): Record<string, number> {
  if (tipsCache) return tipsCache;
  try { tipsCache = JSON.parse(localStorage.getItem(TIPS_KEY) ?? '{}') ?? {}; } catch { tipsCache = {}; }
  return tipsCache!;
}
export const tipSeen = (k: string) => !!tips()[k];
export function markTip(k: string) {
  const t = { ...tips(), [k]: 1 };
  tipsCache = t;
  try { localStorage.setItem(TIPS_KEY, JSON.stringify(t)); } catch { /* */ }
}
/** Deals finished on this device (the bid suggestion shows for the first few). */
export const dealsSeen = () => tips().deals ?? 0;
export function bumpDeals() {
  const t = { ...tips(), deals: (tips().deals ?? 0) + 1 };
  tipsCache = t;
  try { localStorage.setItem(TIPS_KEY, JSON.stringify(t)); } catch { /* */ }
}
