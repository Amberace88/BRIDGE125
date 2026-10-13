import { DEFAULT_RULES, newSession, type ZPlayer, type ZState, type ZoleRules } from './engine';
import type { ZLevel } from './bot';
import { seedNumber } from '../seed';

/**
 * Zole on this device: the lobby choices and the session in progress, saved after every move under one key, so
 * leaving (or a closed tab) always resumes exactly where the player was.
 */
export const SAVE_KEY = 'b125.zole.v1';
const TIPS_KEY = 'b125.zole.tips.v1';

export interface ZolePrefs { level: ZLevel; rules: ZoleRules }
export interface ZoleRun {
  g: ZState;
  level: ZLevel;
  /** seconds of play so far (only while the table is open) */
  seconds: number;
  /** the result was reported (session over) */
  reported?: boolean;
  /** the seed the session was dealt from — only when it can be replayed from (seed, level) alone (standard rules) */
  seed?: string;
}
export interface ZoleSave { v: 1; prefs: ZolePrefs; run: ZoleRun | null }

export const DEFAULT_PREFS: ZolePrefs = { level: 'normal', rules: { mazaZole: true, pules: false, deals: 12 } };

/* ---------- seed contract (../types.ts): a session from a string seed, the same on every device ---------- */
/** the standard rules a challenge is played with (a seed + level must be enough to replay the session) */
export const isStandardRules = (r: ZoleRules) => r.mazaZole === DEFAULT_RULES.mazaZole && r.pules === DEFAULT_RULES.pules && r.deals === DEFAULT_RULES.deals;
export const sessionFromSeed = (seed: string, players: ZPlayer[], rules: ZoleRules = DEFAULT_RULES): ZState =>
  newSession({ players, rules, seed: seedNumber(seed, 'zole') });

const valid = (r: unknown): r is ZoleRun => {
  const g = (r as ZoleRun | null)?.g;
  return !!g && g.v === 1 && Array.isArray(g.hands) && g.hands.length === 3 && Array.isArray(g.scores) && typeof g.phase === 'string';
};

export function loadSave(): ZoleSave {
  try {
    const j = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as Partial<ZoleSave> | null;
    const prefs: ZolePrefs = {
      level: j?.prefs?.level === 'easy' || j?.prefs?.level === 'hard' ? j.prefs.level : j?.prefs?.level === 'normal' ? 'normal' : DEFAULT_PREFS.level,
      rules: { ...DEFAULT_PREFS.rules, ...(j?.prefs?.rules ?? {}) },
    };
    const run = valid(j?.run) && !(j!.run!.g.phase === 'sessionOver' && j!.run!.reported) ? j!.run! : null;
    return { v: 1, prefs, run };
  } catch {
    return { v: 1, prefs: DEFAULT_PREFS, run: null };
  }
}

export function writeSave(s: ZoleSave) {
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
