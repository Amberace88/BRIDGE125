/**
 * Journey campaign — a night journey across eight legendary card rooms of Europe.
 *
 * Every chapter (city) has three matches and a boss. A match is a normal game against bots with a
 * "house rule" twist that is set up at match start (see twists.ts) — the engine only knows a few optional
 * table rules (queenDraw, gameOverAt, burnSplash).
 *
 * Rewards are mirrored by `journey_matches` in supabase/migration_011_journey.sql (the server is the source of truth;
 * a unit test keeps both in sync).
 */
import type { BotLevel } from '../engine/bot';

export type ChapterId = 'riga' | 'tallinn' | 'vilnius' | 'warsaw' | 'kyiv' | 'tbilisi' | 'vienna' | 'montecarlo';

export type TwistId =
  | 'none' | 'bluff' | 'trio' | 'handicap'                                              // regular matches
  | 'banker' | 'pique' | 'twins' | 'baron' | 'clock' | 'countess' | 'maestro' | 'croupier';   // bosses

/** Composable cameo silhouette: a profile bust + headwear + accessory. */
export interface Silhouette {
  base: 'm' | 'f';
  head?: 'tophat' | 'bowler' | 'cap' | 'veil' | 'tiara' | 'bun' | 'curls' | 'wild' | 'short';
  acc?: 'monocle' | 'beard' | 'bowtie' | 'pearls' | 'moustache';
  /** two busts side by side (The Twins) */
  double?: boolean;
}

export interface Character {
  id: string;
  /** monogram on the cameo plaque */
  mono: string;
  /** cameo background tint */
  tint: string;
  sil: Silhouette;
}

export interface MatchDef {
  id: string;
  chapter: ChapterId;
  /** 1..32 — global order; a match unlocks when the previous one has at least one star */
  ord: number;
  /** 1..3 for regular matches, 4 for the boss */
  k: number;
  boss: boolean;
  foe: string;
  /** names of extra bot seats (trio / twins / maestro) — character ids or plain companion ids */
  extra: string[];
  level: BotLevel;
  twist: TwistId;
  /** third star: win while finishing on fewer points than this */
  under: number;
  /** BM for the first win */
  bm: number;
  /** XP for the first win */
  xp: number;
  /** BM per newly earned star (the first star included) */
  starBm: number;
  /** cosmetic unlocked by beating the boss (existing catalogue ids) */
  item: string | null;
}

export interface ChapterDef {
  id: ChapterId;
  n: number;
  lat: number;
  lon: number;
  /** accent hue for the chapter's light */
  glow: string;
  /** cosmetic reward for beating the boss */
  item: string;
}

export const CHAPTERS: ChapterDef[] = [
  { id: 'riga', n: 1, lat: 56.95, lon: 24.11, glow: '#E9C46A', item: 'bk_riga' },
  { id: 'tallinn', n: 2, lat: 59.44, lon: 24.75, glow: '#9FD3F5', item: 'fr_ice' },
  { id: 'vilnius', n: 3, lat: 54.69, lon: 25.28, glow: '#E8A75A', item: 'bk_damask' },
  { id: 'warsaw', n: 4, lat: 52.23, lon: 21.01, glow: '#D97A8C', item: 't_bluff' },
  { id: 'kyiv', n: 5, lat: 50.45, lon: 30.52, glow: '#F2D06B', item: 'bn_sunburst' },
  { id: 'tbilisi', n: 6, lat: 41.72, lon: 44.79, glow: '#E07A4F', item: 't_master' },
  { id: 'vienna', n: 7, lat: 48.21, lon: 16.37, glow: '#C9B6F2', item: 'jugend' },
  { id: 'montecarlo', n: 8, lat: 43.74, lon: 7.42, glow: '#F6E3A1', item: 'montecarlo' },
];

/** Exclusive title granted (server side) for finishing the whole journey — not in the cosmetics catalogue yet. */
export const GRAND_TOUR_TITLE = 't_grand_tour';

export const CHARACTERS: Character[] = [
  // Riga — the cellar club under the Old Town
  { id: 'doorman', mono: 'J', tint: '#24594a', sil: { base: 'm', head: 'cap', acc: 'moustache' } },
  { id: 'pianist', mono: 'I', tint: '#4b3560', sil: { base: 'f', head: 'bun', acc: 'pearls' } },
  { id: 'amber', mono: 'P', tint: '#7a4f1c', sil: { base: 'm', head: 'short', acc: 'beard' } },
  { id: 'banker', mono: 'B', tint: '#1c3f36', sil: { base: 'm', head: 'tophat', acc: 'bowtie' } },
  // Tallinn — the tower room above the walls
  { id: 'watchman', mono: 'K', tint: '#2b4a63', sil: { base: 'm', head: 'bowler', acc: 'beard' } },
  { id: 'marzipan', mono: 'L', tint: '#6a3d4a', sil: { base: 'f', head: 'curls' } },
  { id: 'captain', mono: 'T', tint: '#22465c', sil: { base: 'm', head: 'cap', acc: 'beard' } },
  { id: 'pique', mono: 'P', tint: '#1b1c26', sil: { base: 'f', head: 'veil', acc: 'pearls' } },
  // Vilnius — the baroque salon
  { id: 'poet', mono: 'R', tint: '#5b4a2a', sil: { base: 'f', head: 'curls' } },
  { id: 'balloon', mono: 'D', tint: '#38505e', sil: { base: 'm', head: 'short', acc: 'bowtie' } },
  { id: 'jeweller', mono: 'G', tint: '#7a5420', sil: { base: 'f', head: 'bun', acc: 'pearls' } },
  { id: 'twins', mono: 'A·B', tint: '#4a2f45', sil: { base: 'f', head: 'bun', double: true } },
  // Warsaw — the nocturne club
  { id: 'violin', mono: 'Z', tint: '#5a2833', sil: { base: 'f', head: 'bun' } },
  { id: 'conductor', mono: 'M', tint: '#3a4b2a', sil: { base: 'm', head: 'cap', acc: 'moustache' } },
  { id: 'editor', mono: 'A', tint: '#3e3a55', sil: { base: 'f', head: 'curls', acc: 'pearls' } },
  { id: 'baron', mono: 'B', tint: '#3b1d2a', sil: { base: 'm', head: 'short', acc: 'monocle' } },
  // Kyiv — the Golden Gate club
  { id: 'bandura', mono: 'O', tint: '#5c4a1a', sil: { base: 'f', head: 'tiara' } },
  { id: 'chess', mono: 'T', tint: '#2a3a2e', sil: { base: 'm', head: 'short', acc: 'beard' } },
  { id: 'chestnut', mono: 'M', tint: '#5e3420', sil: { base: 'f', head: 'curls' } },
  { id: 'clockmaker', mono: 'C', tint: '#3d3424', sil: { base: 'm', head: 'bowler', acc: 'monocle' } },
  // Tbilisi — the balcony club
  { id: 'winemaker', mono: 'N', tint: '#5a1f2c', sil: { base: 'f', head: 'bun' } },
  { id: 'singer', mono: 'L', tint: '#2e3b4f', sil: { base: 'm', head: 'short', acc: 'moustache' } },
  { id: 'carpet', mono: 'T', tint: '#6a3424', sil: { base: 'f', head: 'curls', acc: 'pearls' } },
  { id: 'countess', mono: 'C', tint: '#4e1b22', sil: { base: 'f', head: 'tiara', acc: 'pearls' } },
  // Vienna — the grand café
  { id: 'waiter', mono: 'K', tint: '#2d3a36', sil: { base: 'm', head: 'short', acc: 'bowtie' } },
  { id: 'soprano', mono: 'G', tint: '#55304e', sil: { base: 'f', head: 'bun', acc: 'pearls' } },
  { id: 'doctor', mono: 'W', tint: '#33302a', sil: { base: 'm', head: 'short', acc: 'beard' } },
  { id: 'maestro', mono: 'M', tint: '#24233a', sil: { base: 'm', head: 'wild', acc: 'bowtie' } },
  // Monte Carlo — the salle privée
  { id: 'heiress', mono: 'I', tint: '#25475a', sil: { base: 'f', head: 'veil' } },
  { id: 'racer', mono: 'L', tint: '#5a2222', sil: { base: 'm', head: 'short', acc: 'moustache' } },
  { id: 'grey', mono: 'G', tint: '#2f3236', sil: { base: 'm', head: 'bowler', acc: 'bowtie' } },
  { id: 'croupier', mono: 'C', tint: '#0f2a22', sil: { base: 'm', head: 'tophat', acc: 'monocle' } },
];

export const character = (id: string) => CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];

interface Row { foe: string; level: BotLevel; twist: TwistId; extra?: string[] }

/** chapter → [match 1, match 2, match 3, boss] */
const PLAN: Record<ChapterId, Row[]> = {
  riga: [
    { foe: 'doorman', level: 'easy', twist: 'none' },
    { foe: 'pianist', level: 'easy', twist: 'none' },
    { foe: 'amber', level: 'normal', twist: 'none' },
    { foe: 'banker', level: 'normal', twist: 'banker' },
  ],
  tallinn: [
    { foe: 'watchman', level: 'normal', twist: 'none' },
    { foe: 'marzipan', level: 'normal', twist: 'trio', extra: ['c_kristjan'] },
    { foe: 'captain', level: 'normal', twist: 'handicap' },
    { foe: 'pique', level: 'hard', twist: 'pique' },
  ],
  vilnius: [
    { foe: 'poet', level: 'normal', twist: 'bluff' },
    { foe: 'balloon', level: 'hard', twist: 'trio', extra: ['c_elena'] },
    { foe: 'jeweller', level: 'hard', twist: 'none' },
    { foe: 'twins', level: 'hard', twist: 'twins', extra: ['c_twin2'] },
  ],
  warsaw: [
    { foe: 'violin', level: 'hard', twist: 'bluff' },
    { foe: 'conductor', level: 'hard', twist: 'handicap' },
    { foe: 'editor', level: 'hard', twist: 'trio', extra: ['c_piotr'] },
    { foe: 'baron', level: 'hard', twist: 'baron' },
  ],
  kyiv: [
    { foe: 'bandura', level: 'hard', twist: 'none' },
    { foe: 'chess', level: 'expert', twist: 'none' },
    { foe: 'chestnut', level: 'hard', twist: 'trio', extra: ['c_bohdan'] },
    { foe: 'clockmaker', level: 'hard', twist: 'clock' },
  ],
  tbilisi: [
    { foe: 'winemaker', level: 'expert', twist: 'none' },
    { foe: 'singer', level: 'expert', twist: 'bluff' },
    { foe: 'carpet', level: 'expert', twist: 'handicap' },
    { foe: 'countess', level: 'expert', twist: 'countess' },
  ],
  vienna: [
    { foe: 'waiter', level: 'expert', twist: 'none' },
    { foe: 'soprano', level: 'expert', twist: 'trio', extra: ['c_franz'] },
    { foe: 'doctor', level: 'expert', twist: 'bluff' },
    { foe: 'maestro', level: 'expert', twist: 'maestro', extra: ['c_viola', 'c_cello'] },
  ],
  montecarlo: [
    { foe: 'heiress', level: 'expert', twist: 'none' },
    { foe: 'racer', level: 'expert', twist: 'bluff' },
    { foe: 'grey', level: 'expert', twist: 'trio', extra: ['c_sofia'] },
    { foe: 'croupier', level: 'expert', twist: 'croupier' },
  ],
};

/** Reward curve (mirrored in SQL): grows with the chapter, bosses pay the most. */
export function rewardFor(chapter: number, k: number): { bm: number; xp: number; starBm: number } {
  if (k === 4) return { bm: 300 + 100 * chapter, xp: 100 + 20 * chapter, starBm: 2 * (20 + 10 * chapter) };
  return { bm: 80 + 40 * chapter + 20 * k, xp: 30 + 10 * chapter + 5 * k, starBm: 20 + 10 * chapter };
}

/** Third-star threshold: finish the game on fewer points than this. */
export function underFor(chapter: number, twist: TwistId): number {
  if (twist === 'croupier') return 45;
  return chapter <= 2 ? 50 : chapter <= 4 ? 55 : chapter <= 6 ? 60 : 65;
}

export const MATCHES: MatchDef[] = CHAPTERS.flatMap(ch => PLAN[ch.id].map((r, i): MatchDef => {
  const k = i + 1;
  const boss = k === 4;
  return {
    id: `${ch.id}_${boss ? 'boss' : k}`,
    chapter: ch.id, ord: (ch.n - 1) * 4 + k, k, boss,
    foe: r.foe, extra: r.extra ?? [], level: r.level, twist: r.twist,
    under: underFor(ch.n, r.twist),
    ...rewardFor(ch.n, k),
    item: boss ? ch.item : null,
  };
}));

export const matchById = (id: string) => MATCHES.find(m => m.id === id);
export const chapterById = (id: string) => CHAPTERS.find(c => c.id === id);
export const matchesOf = (ch: ChapterId) => MATCHES.filter(m => m.chapter === ch);
export const TOTAL_STARS = MATCHES.length * 3;

/** Stars per match id (0 / missing = not won yet). */
export type StarMap = Record<string, number>;

/** A match is playable when it is the first one or the previous one (in global order) has a star. */
export function isUnlocked(m: MatchDef, stars: StarMap): boolean {
  if (m.ord === 1) return true;
  const prev = MATCHES.find(x => x.ord === m.ord - 1);
  return !!prev && (stars[prev.id] ?? 0) > 0;
}

export function chapterStars(ch: ChapterId, stars: StarMap) {
  const ms = matchesOf(ch);
  return { got: ms.reduce((a, m) => a + (stars[m.id] ?? 0), 0), max: ms.length * 3, done: (stars[`${ch}_boss`] ?? 0) > 0 };
}

export const chapterUnlocked = (ch: ChapterId, stars: StarMap) => isUnlocked(matchesOf(ch)[0], stars);

/** The next match to play (first unlocked one without a star), or the last match when everything is won. */
export function nextMatch(stars: StarMap): MatchDef {
  return MATCHES.find(m => !(stars[m.id] > 0)) ?? MATCHES[MATCHES.length - 1];
}

export const totalStars = (stars: StarMap) => MATCHES.reduce((a, m) => a + Math.min(3, Math.max(0, stars[m.id] ?? 0)), 0);

/** Stars for a finished match: win → 1, + never hit by a Q♠ → 1, + finished under the threshold → 1. */
export function starsFor(m: MatchDef, r: { won: boolean; queenHits: number; myScore: number }): number {
  if (!r.won) return 0;
  return 1 + (r.queenHits === 0 ? 1 : 0) + (r.myScore < m.under ? 1 : 0);
}
