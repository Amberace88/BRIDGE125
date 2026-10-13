import type { DurakLevel } from './bot';
import type { DurakState } from './engine';

/** Everything Durak keeps on the device: the table settings, the game in progress (every move) and seen hints. */
export const SAVE_KEY = 'b125.durak.v1';

export interface DurakSettings { players: number; level: DurakLevel; transfer: boolean; deck: 36 | 24 }
export interface DurakSave {
  v: 1;
  settings: DurakSettings;
  /** the game in progress (null when none) */
  game: DurakState | null;
  /** seconds played in that game */
  seconds: number;
  /** times I picked up the cards in that game (score) */
  takes: number;
  /** first-time hints already shown */
  hints: string[];
}

export const DEFAULT_SETTINGS: DurakSettings = { players: 3, level: 'normal', transfer: false, deck: 36 };

const LEVELS: DurakLevel[] = ['easy', 'normal', 'hard'];

function sane(x: unknown): DurakSave {
  const base: DurakSave = { v: 1, settings: { ...DEFAULT_SETTINGS }, game: null, seconds: 0, takes: 0, hints: [] };
  if (!x || typeof x !== 'object') return base;
  const o = x as Partial<DurakSave>;
  const st = (o.settings ?? {}) as Partial<DurakSettings>;
  const deck = st.deck === 24 ? 24 : 36;
  const players = Math.max(2, Math.min(deck === 24 ? 4 : 6, Math.round(Number(st.players) || DEFAULT_SETTINGS.players)));
  base.settings = { players, deck, transfer: !!st.transfer, level: LEVELS.includes(st.level as DurakLevel) ? st.level as DurakLevel : 'normal' };
  const g = o.game as DurakState | null | undefined;
  if (g && g.v === 1 && Array.isArray(g.players) && Array.isArray(g.talon) && g.phase !== 'over') base.game = g;
  base.seconds = Math.max(0, Number(o.seconds) || 0);
  base.takes = Math.max(0, Number(o.takes) || 0);
  base.hints = Array.isArray(o.hints) ? o.hints.filter((h): h is string => typeof h === 'string').slice(0, 20) : [];
  return base;
}

export function loadSave(): DurakSave {
  try { return sane(JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')); } catch { return sane(null); }
}

export function writeSave(s: DurakSave) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* private mode / quota: play on */ }
}

export function patchSave(p: Partial<DurakSave>) { writeSave({ ...loadSave(), ...p }); }
