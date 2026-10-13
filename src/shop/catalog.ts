import { ACCENTS, BACKS, TABLES } from '../theme';
import { COS_KINDS, COS_LISTS, type CosKind } from '../cosmetics/data';

/**
 * Shop catalogue — display data for the Shop screen and the Profile wardrobe.
 * Prices here are for display only; the server (`public.shop_items` seeded in supabase/migration_003_progress.sql
 * and supabase/migration_008_cosmetics.sql) is the source of truth and `buy_item()` charges its own price.
 * A unit test keeps both lists in sync.
 *
 * Ids are theme / cosmetic ids (src/theme.ts, src/cosmetics/data.ts) because `profile.owned` is checked by id
 * (store.canUse). Where one id names two theme slots (neon, royal, jugend) the item is sold as a 'set' that unlocks
 * both. A 'pack' is a discounted bundle of other items (its `grants`).
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ThemeSlot = 'accent' | 'table' | 'back';
export type Slot = ThemeSlot | CosKind;
export type ItemKind = Slot | 'set' | 'pack';
export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export interface Cosmetic {
  id: string;
  kind: ItemKind;
  /** theme / cosmetic slots this id unlocks (empty for packs — see `grants`) */
  slots: Slot[];
  priceBm: number;
  priceEur: number | null;
  rarity: Rarity;
  tag?: 'new' | 'hot';
  /** pack contents */
  grants?: string[];
  /** release day (YYYY-MM-DD) — items show a "New" badge for 30 days */
  added?: string;
}

export interface Bundle { id: string; kind: 'bundle'; bm: number; priceEur: number; bonusPct: number; rarity: Rarity; best?: boolean }
/** The season pass: bought with Diamonds on /season (migration 016), never with € or BM directly — priceEur stays null. */
export interface Pass { id: string; kind: 'pass'; priceEur: number | null; rarity: Rarity }

const W2 = '2026-10-12';
const item = (id: string, kind: Slot, priceBm: number, rarity: Rarity, tag?: 'hot'): Cosmetic =>
  ({ id, kind, slots: [kind], priceBm, priceEur: null, rarity, added: W2, ...(tag ? { tag } : {}) });
const pack = (id: string, grants: string[], priceBm: number, priceEur: number, rarity: Rarity, tag?: 'hot'): Cosmetic =>
  ({ id, kind: 'pack', slots: [], grants, priceBm, priceEur, rarity, added: W2, ...(tag ? { tag } : {}) });

export const COSMETICS: Cosmetic[] = [
  // ---- wave 1 (migration_003)
  { id: 'emerald', kind: 'accent', slots: ['accent'], priceBm: 1500, priceEur: null, rarity: 'rare' },
  { id: 'rosegold', kind: 'accent', slots: ['accent'], priceBm: 2500, priceEur: null, rarity: 'epic', tag: 'hot' },
  { id: 'platinum', kind: 'accent', slots: ['accent'], priceBm: 4000, priceEur: null, rarity: 'legendary' },
  { id: 'neon', kind: 'set', slots: ['accent', 'back'], priceBm: 3500, priceEur: null, rarity: 'epic' },
  { id: 'gold', kind: 'back', slots: ['back'], priceBm: 3000, priceEur: null, rarity: 'epic', tag: 'hot' },
  { id: 'royal', kind: 'set', slots: ['table', 'back'], priceBm: 6000, priceEur: null, rarity: 'epic' },
  { id: 'synth', kind: 'table', slots: ['table'], priceBm: 5000, priceEur: null, rarity: 'epic' },
  { id: 'jugend', kind: 'set', slots: ['table', 'back'], priceBm: 7500, priceEur: null, rarity: 'legendary' },
  { id: 'montecarlo', kind: 'table', slots: ['table'], priceBm: 8000, priceEur: null, rarity: 'legendary' },

  // ---- wave 2 (migration_008): tables
  item('marble', 'table', 6000, 'epic', 'hot'),
  item('emvelvet', 'table', 5500, 'epic'),
  item('oldriga', 'table', 9000, 'legendary', 'hot'),
  item('yacht', 'table', 8500, 'legendary'),
  item('aurora', 'table', 9500, 'legendary'),
  item('damask', 'table', 6500, 'epic'),
  item('sakura', 'table', 3500, 'rare'),
  item('carbonrace', 'table', 4000, 'rare'),
  // card backs
  item('bk_onyx', 'back', 6000, 'legendary', 'hot'),
  item('bk_holo', 'back', 7000, 'legendary'),
  item('bk_dragon', 'back', 6500, 'legendary'),
  item('bk_marble', 'back', 3500, 'epic'),
  item('bk_damask', 'back', 3500, 'epic'),
  item('bk_aurora', 'back', 4000, 'epic'),
  item('bk_riga', 'back', 4000, 'epic'),
  item('bk_deco', 'back', 3500, 'epic'),
  item('bk_sakura', 'back', 2000, 'rare'),
  item('bk_racing', 'back', 2000, 'rare'),
  item('bk_teak', 'back', 2200, 'rare'),
  item('bk_studs', 'back', 2200, 'rare'),
  item('bk_tartan', 'back', 900, 'common'),
  // card faces (deck styles)
  item('f_minimal', 'face', 2500, 'rare'),
  item('f_deco', 'face', 4500, 'epic', 'hot'),
  item('f_neon', 'face', 5000, 'epic'),
  item('f_royal', 'face', 8000, 'legendary'),
  // avatar frames
  item('fr_neon', 'frame', 2500, 'rare'),
  item('fr_laurel', 'frame', 4500, 'epic'),
  item('fr_flames', 'frame', 5000, 'epic', 'hot'),
  item('fr_ice', 'frame', 5000, 'epic'),
  item('fr_crown', 'frame', 8000, 'legendary'),
  item('fr_diamond', 'frame', 10000, 'legendary'),
  // victory effects
  item('vx_confetti', 'victory', 3000, 'rare'),
  item('vx_fireworks', 'victory', 5000, 'epic', 'hot'),
  item('vx_waterfall', 'victory', 5500, 'epic'),
  item('vx_crowns', 'victory', 8000, 'legendary'),
  // emote packs
  item('em_cheeky', 'emotes', 1800, 'rare'),
  item('em_animals', 'emotes', 1800, 'rare'),
  item('em_casino', 'emotes', 3000, 'epic'),
  item('em_royal', 'emotes', 3500, 'epic'),
  // titles
  item('t_lucky', 'title', 1500, 'common'),
  item('t_shark', 'title', 2500, 'rare', 'hot'),
  item('t_bluff', 'title', 3500, 'epic'),
  item('t_queenslayer', 'title', 4500, 'epic'),
  item('t_highroller', 'title', 5000, 'epic'),
  item('t_master', 'title', 9000, 'legendary'),
  item('t_legend', 'title', 12000, 'legendary'),
  // name colours
  item('nc_gold', 'namecolor', 1500, 'rare'),
  item('nc_ruby', 'namecolor', 1500, 'rare'),
  item('nc_ice', 'namecolor', 1500, 'rare'),
  item('nc_emerald', 'namecolor', 1500, 'rare'),
  item('nc_neon', 'namecolor', 3000, 'epic'),
  item('nc_fire', 'namecolor', 3500, 'epic'),
  item('nc_holo', 'namecolor', 6000, 'legendary'),
  // profile banners
  item('bn_bokeh', 'banner', 2000, 'rare'),
  item('bn_sunburst', 'banner', 3500, 'epic'),
  item('bn_aurora', 'banner', 3500, 'epic'),
  item('bn_riga', 'banner', 4000, 'epic'),
  item('bn_suits', 'banner', 6000, 'legendary'),

  // ---- packs (sets of different items at a discount; € price = future real-money option)
  pack('pk_starter', ['emerald', 'bk_tartan', 'fr_neon', 'em_cheeky'], 3500, 0.99, 'rare', 'hot'),
  pack('pk_sakura', ['sakura', 'bk_sakura', 'em_animals', 'nc_ruby'], 5900, 1.99, 'rare'),
  pack('pk_racing', ['carbonrace', 'bk_racing', 'fr_flames', 'vx_fireworks'], 10900, 2.99, 'epic'),
  pack('pk_neon', ['synth', 'neon', 'f_neon', 'fr_neon', 'nc_neon'], 12900, 3.99, 'epic'),
  pack('pk_aurora', ['aurora', 'bk_aurora', 'nc_ice', 'bn_aurora'], 12900, 3.99, 'epic'),
  pack('pk_montecarlo', ['montecarlo', 'gold', 'fr_laurel', 't_highroller'], 14900, 4.99, 'legendary', 'hot'),
  pack('pk_riga', ['oldriga', 'bk_riga', 'fr_ice', 'bn_riga'], 15900, 4.99, 'legendary'),
  pack('pk_royal', ['royal', 'f_royal', 'fr_crown', 'vx_crowns', 't_legend'], 27900, 7.99, 'legendary'),
];

/** Real-money BM bundles (coming soon — no payment provider yet). bonusPct is relative to the €1.99 base rate. */
export const BUNDLES: Bundle[] = [
  { id: 'bm_5k', kind: 'bundle', bm: 5000, priceEur: 1.99, bonusPct: 0, rarity: 'rare' },
  { id: 'bm_12k', kind: 'bundle', bm: 12000, priceEur: 3.99, bonusPct: 20, rarity: 'epic' },
  { id: 'bm_30k', kind: 'bundle', bm: 30000, priceEur: 7.99, bonusPct: 49, rarity: 'epic' },
  { id: 'bm_80k', kind: 'bundle', bm: 80000, priceEur: 17.99, bonusPct: 77, rarity: 'legendary', best: true },
];

export const PASS: Pass = { id: 'pass_s1', kind: 'pass', priceEur: null, rarity: 'legendary' };

/** The hero of the Featured tab (fallback; the shop rotates a daily pick — see featuredToday). */
export const FEATURED_ID = 'montecarlo';
/** "Trending" row on the Featured tab. */
export const TRENDING_IDS = ['platinum', 'jugend', 'gold', 'rosegold'];

export const cosmetic = (id: string) => COSMETICS.find(c => c.id === id);
export const forSlot = (slot: Slot) => COSMETICS.filter(c => c.slots.includes(slot));
export const PACKS = COSMETICS.filter(c => c.kind === 'pack');
/** Every item a player can collect (packs are only containers). */
export const COLLECTIBLES = COSMETICS.filter(c => c.kind !== 'pack');

/** Free + premium options of one slot, as { id, premium } (used by tests and the wardrobe). */
export function slotOptions(slot: Slot): { id: string; name: string; premium?: boolean }[] {
  if (slot === 'accent') return ACCENTS;
  if (slot === 'table') return TABLES;
  if (slot === 'back') return BACKS;
  return COS_LISTS[slot];
}
export const ALL_SLOTS: Slot[] = ['table', 'back', 'accent', ...COS_KINDS];

/** Value of a pack's contents at full price (what the "-xx %" badge compares against). */
export const packWorth = (p: Cosmetic, skip: (id: string) => boolean = () => false) =>
  (p.grants ?? []).filter(g => !skip(g)).reduce((s, g) => s + (cosmetic(g)?.priceBm ?? 0), 0);

/**
 * What a pack costs for this player — mirrors buy_item() in migration_008: the discount stays proportional when some
 * of the contents are already owned (rounded to 10 BM, at least 10). Null = everything is owned already.
 */
export function packPrice(p: Cosmetic, owned: (id: string) => boolean): number | null {
  const full = packWorth(p), missing = packWorth(p, owned);
  if (!missing) return null;
  if (missing === full) return p.priceBm;
  return Math.max(10, Math.round((p.priceBm * missing) / full / 10) * 10);
}
export const packSavePct = (p: Cosmetic) => Math.round((1 - p.priceBm / Math.max(1, packWorth(p))) * 100);

/** Riga calendar day — the shop's daily rotation flips together with the daily reward. */
export function rigaDay(d = new Date()): string {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
  catch { return d.toISOString().slice(0, 10); }
}
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Deterministic "Featured today": one hero (a pack or a legendary) + four picks from different categories. */
export function featuredToday(day = rigaDay()): { hero: Cosmetic; picks: Cosmetic[] } {
  const heroes = COSMETICS.filter(c => c.kind === 'pack' || c.rarity === 'legendary');
  const h = hash(day);
  const hero = heroes[h % heroes.length];
  const pool = COLLECTIBLES.filter(c => c.id !== hero.id && c.rarity !== 'common');
  const picks: Cosmetic[] = [];
  const seen = new Set<string>();
  for (let i = 0; picks.length < 4 && i < pool.length * 3; i++) {
    const c = pool[hash(`${day}#${i}`) % pool.length];
    if (seen.has(c.kind) || picks.includes(c)) continue;
    seen.add(c.kind); picks.push(c);
  }
  return { hero, picks };
}
export const isNew = (c: Cosmetic, day = rigaDay()) => !!c.added && (Date.parse(day) - Date.parse(c.added)) / 864e5 < 30;

/** Flat rows in the same shape as the SQL seed (used by the sync test). */
export const SHOP_ROWS: { id: string; kind: string; price_bm: number | null; price_eur: number | null; grants_bm: number | null; rarity: Rarity }[] = [
  ...COSMETICS.map(c => ({ id: c.id, kind: c.kind, price_bm: c.priceBm, price_eur: c.priceEur, grants_bm: null, rarity: c.rarity })),
  ...BUNDLES.map(b => ({ id: b.id, kind: b.kind, price_bm: null, price_eur: b.priceEur, grants_bm: b.bm, rarity: b.rarity })),
  { id: PASS.id, kind: PASS.kind, price_bm: null, price_eur: PASS.priceEur, grants_bm: null, rarity: PASS.rarity },
];

/** English name for one slot of an item (the i18n modules override with translated names). */
export function themeName(id: string, slot: Slot): string {
  return slotOptions(slot).find(o => o.id === id)?.name ?? id;
}

export const accentOf = (id: string) => ACCENTS.find(a => a.id === id) ?? ACCENTS[0];

export const fmtBm = (n: number) => Math.round(n).toLocaleString('fr-FR');
export const fmtEur = (n: number, lang: string) =>
  new Intl.NumberFormat(lang === 'en' ? 'en-IE' : lang === 'uk' ? 'uk-UA' : lang, { style: 'currency', currency: 'EUR' }).format(n);
