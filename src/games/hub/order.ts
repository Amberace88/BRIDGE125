import type { Lang } from '../../i18n';
import type { GameModule } from '../types';

/** The hub's order: hidden games out; games that are a local classic in the player's language first; else registry order. */
export function hubGames(mods: readonly GameModule[], lang: Lang): GameModule[] {
  return mods
    .map((m, i) => ({ m, i, home: m.homeLangs?.includes(lang) ? 0 : 1 }))
    .filter(x => !x.m.hidden)
    .sort((a, b) => a.home - b.home || a.i - b.i)
    .map(x => x.m);
}

/** A module's localized text (title / tagline) with the English fallback. */
export const textOf = (t: GameModule['title'], lang: Lang): string => t[lang] ?? t.en;

/** 75 → "1:15", 3725 → "1:02:05" */
export function clock(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '–';
  const s = Math.max(0, Math.round(sec)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? h + ':' : ''}${mm}:${String(r).padStart(2, '0')}`;
}

/** 12500 → "12 500" (thin-space thousands, like the rest of the app) */
export const fmtNum = (n: number | null | undefined) => (n == null ? '–' : Math.round(n).toLocaleString('fr-FR'));
