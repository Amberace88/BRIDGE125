import { ACCENTS, BACKS, TABLES } from '../theme';

/**
 * Shop catalogue — display data for the Shop screen.
 * Prices here are for display only; the server (`public.shop_items` seeded in supabase/migration_003_progress.sql)
 * is the source of truth and `buy_item()` charges its own price. A unit test keeps both lists in sync.
 *
 * Ids are theme ids (src/theme.ts) because `profile.owned` is checked by id (store.canUse). Where one id names two
 * theme slots (neon, royal, jugend) the item is sold as a set that unlocks both.
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type Slot = 'accent' | 'table' | 'back';

export interface Cosmetic {
  id: string;
  kind: 'accent' | 'table' | 'back' | 'set';
  /** theme slots this id unlocks */
  slots: Slot[];
  priceBm: number;
  priceEur: number | null;
  rarity: Rarity;
  tag?: 'new' | 'hot';
}

export interface Bundle { id: string; kind: 'bundle'; bm: number; priceEur: number; bonusPct: number; rarity: Rarity; best?: boolean }
export interface Pass { id: string; kind: 'pass'; priceEur: number; rarity: Rarity }

export const COSMETICS: Cosmetic[] = [
  { id: 'emerald', kind: 'accent', slots: ['accent'], priceBm: 1500, priceEur: null, rarity: 'rare' },
  { id: 'rosegold', kind: 'accent', slots: ['accent'], priceBm: 2500, priceEur: null, rarity: 'epic', tag: 'hot' },
  { id: 'platinum', kind: 'accent', slots: ['accent'], priceBm: 4000, priceEur: null, rarity: 'legendary' },
  { id: 'neon', kind: 'set', slots: ['accent', 'back'], priceBm: 3500, priceEur: null, rarity: 'epic', tag: 'new' },
  { id: 'gold', kind: 'back', slots: ['back'], priceBm: 3000, priceEur: null, rarity: 'epic', tag: 'hot' },
  { id: 'royal', kind: 'set', slots: ['table', 'back'], priceBm: 6000, priceEur: null, rarity: 'epic' },
  { id: 'synth', kind: 'table', slots: ['table'], priceBm: 5000, priceEur: null, rarity: 'epic', tag: 'new' },
  { id: 'jugend', kind: 'set', slots: ['table', 'back'], priceBm: 7500, priceEur: null, rarity: 'legendary' },
  { id: 'montecarlo', kind: 'table', slots: ['table'], priceBm: 8000, priceEur: null, rarity: 'legendary' },
];

/** Real-money BM bundles (coming soon — no payment provider yet). bonusPct is relative to the €1.99 base rate. */
export const BUNDLES: Bundle[] = [
  { id: 'bm_5k', kind: 'bundle', bm: 5000, priceEur: 1.99, bonusPct: 0, rarity: 'rare' },
  { id: 'bm_12k', kind: 'bundle', bm: 12000, priceEur: 3.99, bonusPct: 20, rarity: 'epic' },
  { id: 'bm_30k', kind: 'bundle', bm: 30000, priceEur: 7.99, bonusPct: 49, rarity: 'epic' },
  { id: 'bm_80k', kind: 'bundle', bm: 80000, priceEur: 17.99, bonusPct: 77, rarity: 'legendary', best: true },
];

export const PASS: Pass = { id: 'pass_s1', kind: 'pass', priceEur: 4.99, rarity: 'legendary' };

/** The hero of the Featured tab. */
export const FEATURED_ID = 'montecarlo';
/** "Trending" row on the Featured tab. */
export const TRENDING_IDS = ['platinum', 'jugend', 'gold', 'rosegold'];

export const cosmetic = (id: string) => COSMETICS.find(c => c.id === id);
export const forSlot = (slot: Slot) => COSMETICS.filter(c => c.slots.includes(slot));

/** Flat rows in the same shape as the SQL seed (used by the sync test). */
export const SHOP_ROWS: { id: string; kind: string; price_bm: number | null; price_eur: number | null; grants_bm: number | null; rarity: Rarity }[] = [
  ...COSMETICS.map(c => ({ id: c.id, kind: c.kind, price_bm: c.priceBm, price_eur: c.priceEur, grants_bm: null, rarity: c.rarity })),
  ...BUNDLES.map(b => ({ id: b.id, kind: b.kind, price_bm: null, price_eur: b.priceEur, grants_bm: b.bm, rarity: b.rarity })),
  { id: PASS.id, kind: PASS.kind, price_bm: null, price_eur: PASS.priceEur, grants_bm: null, rarity: PASS.rarity },
];

/** English theme name for one slot of an item (the i18n module can override with translated names). */
export function themeName(id: string, slot: Slot): string {
  if (slot === 'accent') return ACCENTS.find(a => a.id === id)?.name ?? id;
  if (slot === 'table') return TABLES.find(t => t.id === id)?.name ?? id;
  return BACKS.find(b => b.id === id)?.name ?? id;
}

export const accentOf = (id: string) => ACCENTS.find(a => a.id === id) ?? ACCENTS[0];

export const fmtBm = (n: number) => Math.round(n).toLocaleString('fr-FR');
export const fmtEur = (n: number, lang: string) =>
  new Intl.NumberFormat(lang === 'en' ? 'en-IE' : lang === 'uk' ? 'uk-UA' : lang, { style: 'currency', currency: 'EUR' }).format(n);
