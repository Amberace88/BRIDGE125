/**
 * Journey campaign — a night journey across the legendary card rooms of Europe (and a little beyond).
 *
 * Nineteen cities (chapters), each with three matches and a boss. A player travels one ROUTE of eight chapters: the
 * route starts in the home city of the UI language (lv → Riga, ru → Moscow, de → Berlin, …), tours its neighbours and
 * always ends in Monte Carlo. The route is fixed per player (stored in progress) once the first star is won.
 *
 * A match id is stable per city (`riga_1` … `riga_boss`), so progress and rewards stay valid whatever the route.
 * Everything that depends on the position on the route — order, bot level, the third-star threshold and the BM / XP
 * rewards — is resolved per route (`routeMatches`), so chapter 1 always pays and plays like chapter 1.
 *
 * A match is a normal game against bots with a "house rule" twist that is set up at match start (see twists.ts) — the
 * engine only knows a few optional table rules (queenDraw, gameOverAt, burnSplash).
 *
 * Mirrored by supabase/migration_018_journey_routes.sql (journey_matches, journey_route_stops, journey_slots — the
 * server is the source of truth; unit tests keep both in sync). The original 32 matches and their order are the
 * 'classic' route (migration 011), kept for players who started before routes existed.
 */
import type { BotLevel } from '../engine/bot';

export type ChapterId =
  | 'riga' | 'tallinn' | 'vilnius' | 'warsaw' | 'kyiv' | 'tbilisi' | 'vienna' | 'montecarlo'
  | 'moscow' | 'berlin' | 'minsk' | 'almaty' | 'tashkent' | 'baku' | 'yerevan' | 'bucharest' | 'sofia' | 'madrid' | 'london';

export type TwistId =
  | 'none' | 'bluff' | 'trio' | 'handicap'                                              // regular matches
  | 'banker' | 'pique' | 'twins' | 'baron' | 'clock' | 'countess' | 'maestro' | 'croupier'   // bosses (classic)
  | 'matryoshka' | 'selector' | 'bison' | 'eagle' | 'caravan' | 'fire' | 'cognac' | 'voivode' | 'thorn' | 'matador' | 'spymaster';

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

/** A match as it is defined for its city (route independent). */
export interface MatchTpl {
  id: string;
  chapter: ChapterId;
  /** 1..3 for regular matches, 4 for the boss */
  k: number;
  boss: boolean;
  foe: string;
  /** names of extra bot seats (trio / twins / maestro …) — character ids or plain companion ids */
  extra: string[];
  twist: TwistId;
  /** cosmetic unlocked by beating the boss (existing catalogue ids) */
  item: string | null;
}

/** A match resolved on a route: position, order, level, third-star threshold and rewards. */
export interface MatchDef extends MatchTpl {
  /** 1..8 — chapter position on the route */
  pos: number;
  /** 1..32 — order on the route; a match unlocks when the previous one has at least one star */
  ord: number;
  level: BotLevel;
  /** third star: win while finishing on fewer points than this */
  under: number;
  /** BM for the first win */
  bm: number;
  /** XP for the first win */
  xp: number;
  /** BM per newly earned star (the first star included) */
  starBm: number;
}

export interface ChapterDef {
  id: ChapterId;
  lat: number;
  lon: number;
  /** accent hue for the chapter's light */
  glow: string;
  /** cosmetic reward for beating the boss */
  item: string;
}

export const CHAPTERS: ChapterDef[] = [
  { id: 'riga', lat: 56.95, lon: 24.11, glow: '#E9C46A', item: 'bk_riga' },
  { id: 'tallinn', lat: 59.44, lon: 24.75, glow: '#9FD3F5', item: 'fr_ice' },
  { id: 'vilnius', lat: 54.69, lon: 25.28, glow: '#E8A75A', item: 'bk_damask' },
  { id: 'warsaw', lat: 52.23, lon: 21.01, glow: '#D97A8C', item: 't_bluff' },
  { id: 'kyiv', lat: 50.45, lon: 30.52, glow: '#F2D06B', item: 'bn_sunburst' },
  { id: 'tbilisi', lat: 41.72, lon: 44.79, glow: '#E07A4F', item: 't_master' },
  { id: 'vienna', lat: 48.21, lon: 16.37, glow: '#C9B6F2', item: 'jugend' },
  { id: 'montecarlo', lat: 43.74, lon: 7.42, glow: '#F6E3A1', item: 'montecarlo' },
  { id: 'moscow', lat: 55.76, lon: 37.62, glow: '#EE7A6B', item: 'fr_laurel' },
  { id: 'berlin', lat: 52.52, lon: 13.40, glow: '#7FD6CB', item: 'bk_deco' },
  { id: 'minsk', lat: 53.90, lon: 27.56, glow: '#A9C7F0', item: 'bk_marble' },
  { id: 'almaty', lat: 43.24, lon: 76.95, glow: '#A3E3B5', item: 'bn_aurora' },
  { id: 'tashkent', lat: 41.30, lon: 69.24, glow: '#5FCFE3', item: 'bk_dragon' },
  { id: 'baku', lat: 40.41, lon: 49.87, glow: '#FF9A4A', item: 'fr_flames' },
  { id: 'yerevan', lat: 40.18, lon: 44.51, glow: '#F2A3A0', item: 'nc_ruby' },
  { id: 'bucharest', lat: 44.43, lon: 26.10, glow: '#E6C27A', item: 't_highroller' },
  { id: 'sofia', lat: 42.70, lon: 23.32, glow: '#F3B6CB', item: 'vx_confetti' },
  { id: 'madrid', lat: 40.42, lon: -3.70, glow: '#F4A259', item: 'nc_fire' },
  { id: 'london', lat: 51.51, lon: -0.13, glow: '#BFCBDD', item: 'fr_crown' },
];

/** Exclusive title granted (server side) for finishing the whole journey (the Monte Carlo boss, on any route). */
export const GRAND_TOUR_TITLE = 't_grand_tour';
export const FINALE_ID = 'montecarlo_boss';

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
  // Moscow — a box at the Bolshoi
  { id: 'ballerina', mono: 'A', tint: '#5a2430', sil: { base: 'f', head: 'bun', acc: 'pearls' } },
  { id: 'samovar', mono: 'G', tint: '#5b3a1e', sil: { base: 'm', head: 'short', acc: 'beard' } },
  { id: 'cosmonaut', mono: 'V', tint: '#2b3d5c', sil: { base: 'f', head: 'curls' } },
  { id: 'matryoshka', mono: 'M', tint: '#6b1f24', sil: { base: 'f', head: 'veil', double: true } },
  // Berlin — the cabaret below the arches
  { id: 'dj', mono: 'L', tint: '#1f3a3d', sil: { base: 'm', head: 'cap' } },
  { id: 'cabaret', mono: 'M', tint: '#4a2440', sil: { base: 'f', head: 'tophat', acc: 'pearls' } },
  { id: 'graffiti', mono: 'D', tint: '#3d4a26', sil: { base: 'm', head: 'wild', acc: 'beard' } },
  { id: 'selector', mono: 'S', tint: '#15181c', sil: { base: 'm', head: 'short', acc: 'beard' } },
  // Minsk — the Svislach club
  { id: 'accordion', mono: 'A', tint: '#5a3a4a', sil: { base: 'f', head: 'bun' } },
  { id: 'tractor', mono: 'S', tint: '#3c4a22', sil: { base: 'm', head: 'cap', acc: 'moustache' } },
  { id: 'goalie', mono: 'P', tint: '#23405a', sil: { base: 'm', head: 'short' } },
  { id: 'bison', mono: 'B', tint: '#3a2a1a', sil: { base: 'm', head: 'wild', acc: 'beard' } },
  // Almaty — the mountain lodge
  { id: 'apples', mono: 'A', tint: '#3f5a26', sil: { base: 'f', head: 'curls' } },
  { id: 'dombra', mono: 'N', tint: '#5a3b1c', sil: { base: 'm', head: 'short', acc: 'moustache' } },
  { id: 'skater', mono: 'D', tint: '#264f5e', sil: { base: 'f', head: 'bun' } },
  { id: 'eaglehunter', mono: 'E', tint: '#3b3324', sil: { base: 'm', head: 'cap', acc: 'beard' } },
  // Tashkent — the blue dome teahouse
  { id: 'potter', mono: 'D', tint: '#1d4a5c', sil: { base: 'f', head: 'veil' } },
  { id: 'plov', mono: 'R', tint: '#5c3a1a', sil: { base: 'm', head: 'short', acc: 'beard' } },
  { id: 'silk', mono: 'M', tint: '#4f2a52', sil: { base: 'f', head: 'curls', acc: 'pearls' } },
  { id: 'caravan', mono: 'C', tint: '#5a4520', sil: { base: 'm', head: 'bowler', acc: 'beard' } },
  // Baku — the Flame Towers lounge
  { id: 'mugham', mono: 'L', tint: '#5a2a3a', sil: { base: 'f', head: 'bun', acc: 'pearls' } },
  { id: 'oilman', mono: 'F', tint: '#2a2f33', sil: { base: 'm', head: 'cap', acc: 'moustache' } },
  { id: 'nard', mono: 'E', tint: '#4a3420', sil: { base: 'm', head: 'short', acc: 'beard' } },
  { id: 'firekeeper', mono: 'F', tint: '#6a2a12', sil: { base: 'f', head: 'tiara' } },
  // Yerevan — the Cascade terrace
  { id: 'duduk', mono: 'A', tint: '#4a3326', sil: { base: 'm', head: 'short', acc: 'moustache' } },
  { id: 'prodigy', mono: 'A', tint: '#2c3a4a', sil: { base: 'f', head: 'bun' } },
  { id: 'lavash', mono: 'G', tint: '#6a4a2a', sil: { base: 'f', head: 'curls' } },
  { id: 'cellarmaster', mono: 'C', tint: '#4a2018', sil: { base: 'm', head: 'bowler', acc: 'moustache' } },
  // Bucharest — the Little Paris salon
  { id: 'architect', mono: 'I', tint: '#3a3a52', sil: { base: 'f', head: 'bun', acc: 'pearls' } },
  { id: 'lautar', mono: 'F', tint: '#5a2a24', sil: { base: 'm', head: 'short', acc: 'moustache' } },
  { id: 'gymnast', mono: 'S', tint: '#24485a', sil: { base: 'm', head: 'short' } },
  { id: 'voivode', mono: 'V', tint: '#3a0f18', sil: { base: 'm', head: 'wild', acc: 'moustache' } },
  // Sofia — the golden dome club
  { id: 'roses', mono: 'R', tint: '#6a2a44', sil: { base: 'f', head: 'curls' } },
  { id: 'gaida', mono: 'S', tint: '#3a4a2a', sil: { base: 'm', head: 'cap', acc: 'moustache' } },
  { id: 'icon', mono: 'B', tint: '#5a4418', sil: { base: 'f', head: 'veil' } },
  { id: 'baroness', mono: 'R', tint: '#5a1830', sil: { base: 'f', head: 'tiara', acc: 'pearls' } },
  // Madrid — the Gran Vía salon
  { id: 'flamenco', mono: 'C', tint: '#6a1a22', sil: { base: 'f', head: 'bun', acc: 'pearls' } },
  { id: 'guitarist', mono: 'J', tint: '#4a2e1a', sil: { base: 'm', head: 'short', acc: 'beard' } },
  { id: 'copyist', mono: 'I', tint: '#3a3048', sil: { base: 'f', head: 'curls', acc: 'pearls' } },
  { id: 'matador', mono: 'M', tint: '#5a0f14', sil: { base: 'm', head: 'bowler', acc: 'bowtie' } },
  // London — the Mayfair club
  { id: 'cabbie', mono: 'A', tint: '#22262a', sil: { base: 'm', head: 'cap', acc: 'moustache' } },
  { id: 'detective', mono: 'H', tint: '#3a3226', sil: { base: 'f', head: 'bowler' } },
  { id: 'rocker', mono: 'J', tint: '#3a1a3a', sil: { base: 'm', head: 'wild' } },
  { id: 'spymaster', mono: 'Q', tint: '#1a2430', sil: { base: 'm', head: 'bowler', acc: 'monocle' } },
];

export const character = (id: string) => CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];

interface Row { foe: string; twist: TwistId; extra?: string[] }

/** chapter → [match 1, match 2, match 3, boss] */
const PLAN: Record<ChapterId, Row[]> = {
  riga: [
    { foe: 'doorman', twist: 'none' },
    { foe: 'pianist', twist: 'none' },
    { foe: 'amber', twist: 'none' },
    { foe: 'banker', twist: 'banker' },
  ],
  tallinn: [
    { foe: 'watchman', twist: 'none' },
    { foe: 'marzipan', twist: 'trio', extra: ['c_kristjan'] },
    { foe: 'captain', twist: 'handicap' },
    { foe: 'pique', twist: 'pique' },
  ],
  vilnius: [
    { foe: 'poet', twist: 'bluff' },
    { foe: 'balloon', twist: 'trio', extra: ['c_elena'] },
    { foe: 'jeweller', twist: 'none' },
    { foe: 'twins', twist: 'twins', extra: ['c_twin2'] },
  ],
  warsaw: [
    { foe: 'violin', twist: 'bluff' },
    { foe: 'conductor', twist: 'handicap' },
    { foe: 'editor', twist: 'trio', extra: ['c_piotr'] },
    { foe: 'baron', twist: 'baron' },
  ],
  kyiv: [
    { foe: 'bandura', twist: 'none' },
    { foe: 'chess', twist: 'none' },
    { foe: 'chestnut', twist: 'trio', extra: ['c_bohdan'] },
    { foe: 'clockmaker', twist: 'clock' },
  ],
  tbilisi: [
    { foe: 'winemaker', twist: 'none' },
    { foe: 'singer', twist: 'bluff' },
    { foe: 'carpet', twist: 'handicap' },
    { foe: 'countess', twist: 'countess' },
  ],
  vienna: [
    { foe: 'waiter', twist: 'none' },
    { foe: 'soprano', twist: 'trio', extra: ['c_franz'] },
    { foe: 'doctor', twist: 'bluff' },
    { foe: 'maestro', twist: 'maestro', extra: ['c_viola', 'c_cello'] },
  ],
  montecarlo: [
    { foe: 'heiress', twist: 'none' },
    { foe: 'racer', twist: 'bluff' },
    { foe: 'grey', twist: 'trio', extra: ['c_sofia'] },
    { foe: 'croupier', twist: 'croupier' },
  ],
  moscow: [
    { foe: 'ballerina', twist: 'none' },
    { foe: 'samovar', twist: 'trio', extra: ['c_vera'] },
    { foe: 'cosmonaut', twist: 'handicap' },
    { foe: 'matryoshka', twist: 'matryoshka', extra: ['c_masha'] },
  ],
  berlin: [
    { foe: 'dj', twist: 'none' },
    { foe: 'cabaret', twist: 'bluff' },
    { foe: 'graffiti', twist: 'trio', extra: ['c_jonas'] },
    { foe: 'selector', twist: 'selector' },
  ],
  minsk: [
    { foe: 'accordion', twist: 'none' },
    { foe: 'tractor', twist: 'handicap' },
    { foe: 'goalie', twist: 'trio', extra: ['c_yanka'] },
    { foe: 'bison', twist: 'bison' },
  ],
  almaty: [
    { foe: 'apples', twist: 'none' },
    { foe: 'dombra', twist: 'bluff' },
    { foe: 'skater', twist: 'trio', extra: ['c_arman'] },
    { foe: 'eaglehunter', twist: 'eagle' },
  ],
  tashkent: [
    { foe: 'potter', twist: 'none' },
    { foe: 'plov', twist: 'handicap' },
    { foe: 'silk', twist: 'bluff' },
    { foe: 'caravan', twist: 'caravan', extra: ['c_timur'] },
  ],
  baku: [
    { foe: 'mugham', twist: 'none' },
    { foe: 'oilman', twist: 'bluff' },
    { foe: 'nard', twist: 'trio', extra: ['c_aysel'] },
    { foe: 'firekeeper', twist: 'fire' },
  ],
  yerevan: [
    { foe: 'duduk', twist: 'none' },
    { foe: 'prodigy', twist: 'handicap' },
    { foe: 'lavash', twist: 'trio', extra: ['c_davit'] },
    { foe: 'cellarmaster', twist: 'cognac' },
  ],
  bucharest: [
    { foe: 'architect', twist: 'none' },
    { foe: 'lautar', twist: 'bluff' },
    { foe: 'gymnast', twist: 'handicap' },
    { foe: 'voivode', twist: 'voivode' },
  ],
  sofia: [
    { foe: 'roses', twist: 'none' },
    { foe: 'gaida', twist: 'bluff' },
    { foe: 'icon', twist: 'trio', extra: ['c_ivo'] },
    { foe: 'baroness', twist: 'thorn', extra: ['c_kalina'] },
  ],
  madrid: [
    { foe: 'flamenco', twist: 'none' },
    { foe: 'guitarist', twist: 'bluff' },
    { foe: 'copyist', twist: 'trio', extra: ['c_diego'] },
    { foe: 'matador', twist: 'matador' },
  ],
  london: [
    { foe: 'cabbie', twist: 'none' },
    { foe: 'detective', twist: 'bluff' },
    { foe: 'rocker', twist: 'trio', extra: ['c_poppy'] },
    { foe: 'spymaster', twist: 'spymaster' },
  ],
};

/** Every match of every city (route independent). Ids are stable: `<city>_1..3`, `<city>_boss`. */
export const MATCH_TPLS: MatchTpl[] = CHAPTERS.flatMap(ch => PLAN[ch.id].map((r, i): MatchTpl => {
  const k = i + 1;
  const boss = k === 4;
  return { id: `${ch.id}_${boss ? 'boss' : k}`, chapter: ch.id, k, boss, foe: r.foe, extra: r.extra ?? [], twist: r.twist, item: boss ? ch.item : null };
}));
export const ALL_MATCH_IDS = new Set(MATCH_TPLS.map(m => m.id));

/* ================================================================================== routes */

/** A route is named after its starting city; 'classic' is the original order (players who started before routes). */
export type RouteId = 'classic' | Exclude<ChapterId, 'vienna' | 'montecarlo'>;

/**
 * Eight chapters per route: the home city, six neighbours in travel order, Monte Carlo. Each order is the shortest
 * path through its cities (checked in tests), and no route sends a player through a capital their language's
 * players would rather not visit.
 */
export const ROUTES: Record<RouteId, ChapterId[]> = {
  riga: ['riga', 'tallinn', 'vilnius', 'warsaw', 'kyiv', 'bucharest', 'vienna', 'montecarlo'],
  tallinn: ['tallinn', 'riga', 'vilnius', 'warsaw', 'berlin', 'london', 'madrid', 'montecarlo'],
  vilnius: ['vilnius', 'riga', 'warsaw', 'kyiv', 'bucharest', 'sofia', 'vienna', 'montecarlo'],
  warsaw: ['warsaw', 'kyiv', 'bucharest', 'sofia', 'vienna', 'berlin', 'london', 'montecarlo'],
  kyiv: ['kyiv', 'bucharest', 'sofia', 'vienna', 'berlin', 'london', 'madrid', 'montecarlo'],
  berlin: ['berlin', 'warsaw', 'vilnius', 'kyiv', 'bucharest', 'sofia', 'vienna', 'montecarlo'],
  moscow: ['moscow', 'minsk', 'vilnius', 'riga', 'warsaw', 'berlin', 'vienna', 'montecarlo'],
  minsk: ['minsk', 'vilnius', 'riga', 'warsaw', 'berlin', 'london', 'madrid', 'montecarlo'],
  tbilisi: ['tbilisi', 'baku', 'yerevan', 'kyiv', 'bucharest', 'sofia', 'vienna', 'montecarlo'],
  yerevan: ['yerevan', 'tbilisi', 'kyiv', 'vilnius', 'warsaw', 'berlin', 'vienna', 'montecarlo'],
  baku: ['baku', 'tbilisi', 'moscow', 'minsk', 'vilnius', 'warsaw', 'vienna', 'montecarlo'],
  almaty: ['almaty', 'tashkent', 'baku', 'tbilisi', 'bucharest', 'sofia', 'vienna', 'montecarlo'],
  tashkent: ['tashkent', 'baku', 'yerevan', 'tbilisi', 'kyiv', 'warsaw', 'vienna', 'montecarlo'],
  bucharest: ['bucharest', 'sofia', 'vienna', 'warsaw', 'berlin', 'london', 'madrid', 'montecarlo'],
  sofia: ['sofia', 'bucharest', 'kyiv', 'vilnius', 'warsaw', 'berlin', 'vienna', 'montecarlo'],
  madrid: ['madrid', 'london', 'berlin', 'warsaw', 'kyiv', 'bucharest', 'vienna', 'montecarlo'],
  london: ['london', 'berlin', 'warsaw', 'kyiv', 'bucharest', 'sofia', 'vienna', 'montecarlo'],
  classic: ['riga', 'tallinn', 'vilnius', 'warsaw', 'kyiv', 'tbilisi', 'vienna', 'montecarlo'],
};
export const ROUTE_IDS = Object.keys(ROUTES) as RouteId[];
/** Routes offered in the "change starting city" picker (the classic order is kept only for players already on it). */
export const PICKABLE_ROUTES = ROUTE_IDS.filter(r => r !== 'classic');
export const isRouteId = (x: unknown): x is RouteId => typeof x === 'string' && x in ROUTES;

/** The home city (route) of every UI language. */
export const LANG_ROUTE: Record<string, RouteId> = {
  lv: 'riga', ru: 'moscow', uk: 'kyiv', lt: 'vilnius', et: 'tallinn', pl: 'warsaw', de: 'berlin', be: 'minsk',
  kk: 'almaty', uz: 'tashkent', az: 'baku', ka: 'tbilisi', hy: 'yerevan', ro: 'bucharest', bg: 'sofia', es: 'madrid', en: 'london',
};
export const routeForLang = (lang: string): RouteId => LANG_ROUTE[lang] ?? 'london';

/** Bot level by position on the route (chapter 1..8 × match 1..4) — the original campaign curve. */
const LEVELS: BotLevel[][] = [
  ['easy', 'easy', 'normal', 'normal'],
  ['normal', 'normal', 'normal', 'hard'],
  ['normal', 'hard', 'hard', 'hard'],
  ['hard', 'hard', 'hard', 'hard'],
  ['hard', 'expert', 'hard', 'hard'],
  ['expert', 'expert', 'expert', 'expert'],
  ['expert', 'expert', 'expert', 'expert'],
  ['expert', 'expert', 'expert', 'expert'],
];
export const levelFor = (pos: number, k: number): BotLevel => LEVELS[Math.min(8, Math.max(1, pos)) - 1][k - 1];

/** Reward curve by position (mirrored in SQL as journey_slots): grows with the chapter, bosses pay the most. */
export function rewardFor(pos: number, k: number): { bm: number; xp: number; starBm: number } {
  if (k === 4) return { bm: 300 + 100 * pos, xp: 100 + 20 * pos, starBm: 2 * (20 + 10 * pos) };
  return { bm: 80 + 40 * pos + 20 * k, xp: 30 + 10 * pos + 5 * k, starBm: 20 + 10 * pos };
}

/** Third-star threshold: finish the game on fewer points than this (shorter games ask for less). */
export function underFor(pos: number, twist: TwistId): number {
  if (twist === 'croupier') return 45;
  const base = pos <= 2 ? 50 : pos <= 4 ? 55 : pos <= 6 ? 60 : 65;
  const end = twist === 'voivode' ? 110 : twist === 'matador' ? 115 : 0;
  return end ? Math.min(base, Math.floor((end * 0.45) / 5) * 5) : base;
}

const tplOf = new Map(MATCH_TPLS.map(m => [m.id, m]));
const cache = new Map<RouteId, MatchDef[]>();
/** The 32 matches of a route, in order, with level / threshold / rewards for their position. */
export function routeMatches(route: RouteId): MatchDef[] {
  let ms = cache.get(route);
  if (!ms) {
    ms = ROUTES[route].flatMap((ch, i) => PLAN[ch].map((_, j): MatchDef => {
      const pos = i + 1, k = j + 1;
      const t = tplOf.get(`${ch}_${k === 4 ? 'boss' : k}`)!;
      return { ...t, pos, ord: (pos - 1) * 4 + k, level: levelFor(pos, k), under: underFor(pos, t.twist), ...rewardFor(pos, k) };
    }));
    cache.set(route, ms);
  }
  return ms;
}

export const routeChapters = (route: RouteId): ChapterDef[] => ROUTES[route].map(id => chapterById(id)!);
/** 1..8, or 0 when the city is not on the route. */
export const posOn = (route: RouteId, ch: ChapterId) => ROUTES[route].indexOf(ch) + 1;
export const onRoute = (route: RouteId, ch: ChapterId) => ROUTES[route].includes(ch);
export const matchOn = (route: RouteId, id: string) => routeMatches(route).find(m => m.id === id);
export const chapterById = (id: string) => CHAPTERS.find(c => c.id === id);
export const matchTpl = (id: string) => tplOf.get(id);
export const matchesOn = (route: RouteId, ch: ChapterId) => routeMatches(route).filter(m => m.chapter === ch);
/** Every route has 8 chapters × 4 matches. */
export const TOTAL_STARS = 32 * 3;

/** Stars per match id (0 / missing = not won yet). */
export type StarMap = Record<string, number>;

/** A match is playable when it is the first one of the route or the previous one on the route has a star. */
export function isUnlocked(m: MatchDef, stars: StarMap, route: RouteId): boolean {
  if (m.ord === 1) return true;
  const prev = routeMatches(route)[m.ord - 2];
  return !!prev && (stars[prev.id] ?? 0) > 0;
}

export function chapterStars(ch: ChapterId, stars: StarMap) {
  const ms = MATCH_TPLS.filter(m => m.chapter === ch);
  return { got: ms.reduce((a, m) => a + Math.min(3, stars[m.id] ?? 0), 0), max: ms.length * 3, done: (stars[`${ch}_boss`] ?? 0) > 0 };
}

export function chapterUnlocked(ch: ChapterId, stars: StarMap, route: RouteId) {
  const first = matchesOn(route, ch)[0];
  return !!first && isUnlocked(first, stars, route);
}

/** The next match to play on the route (first one without a star), or the finale when everything is won. */
export function nextMatch(stars: StarMap, route: RouteId): MatchDef {
  const ms = routeMatches(route);
  return ms.find(m => !(stars[m.id] > 0)) ?? ms[ms.length - 1];
}

/** Stars earned on the route (stars on other cities — e.g. an admin who switched routes — don't count). */
export const totalStars = (stars: StarMap, route: RouteId) => routeMatches(route).reduce((a, m) => a + Math.min(3, Math.max(0, stars[m.id] ?? 0)), 0);
export const hasAnyStar = (stars: StarMap) => Object.values(stars).some(v => v > 0);

/** The route a player without a stored choice is on: the original order if they already won something there
 *  (they started before routes existed), else their language's home city. */
export const defaultRoute = (stars: StarMap, lang: string): RouteId =>
  (routeMatches('classic').some(m => (stars[m.id] ?? 0) > 0) ? 'classic' : routeForLang(lang));

/** Stars for a finished match: win → 1, + never hit by a Q♠ → 1, + finished under the threshold → 1. */
export function starsFor(m: MatchDef, r: { won: boolean; queenHits: number; myScore: number }): number {
  if (!r.won) return 0;
  return 1 + (r.queenHits === 0 ? 1 : 0) + (r.myScore < m.under ? 1 : 0);
}

/** Great-circle distance in km (route geography tests, map). */
export function distKm(a: ChapterId, b: ChapterId): number {
  const A = chapterById(a)!, B = chapterById(b)!, R = Math.PI / 180;
  const h = Math.sin((B.lat - A.lat) * R / 2) ** 2 + Math.cos(A.lat * R) * Math.cos(B.lat * R) * Math.sin((B.lon - A.lon) * R / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
