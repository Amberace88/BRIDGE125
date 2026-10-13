/**
 * Table gifts, BM tips and Diamond packs — display + validation data shared by the client and the Worker.
 * Prices here are for display and request validation only: the server (`public.gift_catalog`, `public.diamond_packs`
 * in supabase/migration_010_social.sql) charges its own price. A unit test keeps both lists in sync.
 * No loot boxes: every purchase names exactly what you get.
 */

export type GiftCurrency = 'bm' | 'dm';
export type GiftFx = 'clover' | 'petals' | 'smoke' | 'fizz' | 'gleam' | 'fireworks' | 'crown' | 'sparkle';

export interface Gift {
  id: string;
  price: number;
  cur: GiftCurrency;
  /** 1 = small, 4 = show-stopper (bigger flight, longer landing) */
  tier: 1 | 2 | 3 | 4;
  fx: GiftFx;
  /** landing particle colours */
  colors: string[];
}

export const GIFTS: Gift[] = [
  { id: 'clover', price: 150, cur: 'bm', tier: 1, fx: 'clover', colors: ['#7BE38A', '#2FAE5A', '#E9FFD8'] },
  { id: 'rose', price: 400, cur: 'bm', tier: 1, fx: 'petals', colors: ['#FF5B7A', '#C21640', '#FFD3DC'] },
  { id: 'cigar', price: 20, cur: 'dm', tier: 2, fx: 'smoke', colors: ['#E8D9C0', '#B98B53', '#FFB25A'] },
  { id: 'champagne', price: 40, cur: 'dm', tier: 2, fx: 'fizz', colors: ['#FFF3C2', '#EBD38E', '#FFFFFF'] },
  { id: 'trophy', price: 60, cur: 'dm', tier: 3, fx: 'gleam', colors: ['#FFE08A', '#C9A54C', '#FFF7DA'] },
  { id: 'fireworks', price: 90, cur: 'dm', tier: 3, fx: 'fireworks', colors: ['#FF5B7A', '#5BC8FF', '#FFE08A', '#9D7BFF', '#7BE38A'] },
  { id: 'crown', price: 150, cur: 'dm', tier: 4, fx: 'crown', colors: ['#FFE08A', '#C9A54C', '#FF5B7A', '#5BC8FF'] },
  { id: 'ring', price: 300, cur: 'dm', tier: 4, fx: 'sparkle', colors: ['#DFF6FF', '#9EE7FF', '#FFFFFF', '#EBD38E'] },
];
export const gift = (id: string) => GIFTS.find(g => g.id === id);
export const isGiftId = (id: unknown): id is string => typeof id === 'string' && GIFTS.some(g => g.id === id);

/* ---------------------------------------------------------------- BM tips (limits mirror tip_bm() in SQL) */
export const TIP_PRESETS = [50, 100, 250, 500, 1000];
export const TIP_MIN = 10;
/** Max BM one player may tip one recipient per day (Riga calendar day). */
export const TIP_MAX_PER_RECIPIENT_DAY = 1000;
/** Max BM one player may tip in total per day. */
export const TIP_MAX_PER_DAY = 3000;
/** Games the sender must have finished before tipping. */
export const TIP_MIN_GAMES = 3;

/* ---------------------------------------------------------------- Diamonds (premium currency) */
export interface DiamondPack { id: string; diamonds: number; bonusPct: number; cents: number; best?: boolean; popular?: boolean }
/** Real-money packs (EUR, VAT included). Keep in sync with public.diamond_packs. */
export const DIAMOND_PACKS: DiamondPack[] = [
  { id: 'dm_100', diamonds: 100, bonusPct: 0, cents: 99 },
  { id: 'dm_550', diamonds: 550, bonusPct: 10, cents: 499 },
  { id: 'dm_1200', diamonds: 1200, bonusPct: 20, cents: 999, popular: true },
  { id: 'dm_2600', diamonds: 2600, bonusPct: 30, cents: 1999 },
  { id: 'dm_7000', diamonds: 7000, bonusPct: 40, cents: 4999, best: true },
];
export const diamondPack = (id: string) => DIAMOND_PACKS.find(p => p.id === id);

/** A shop style bought *as a gift* costs Diamonds: 1 💎 per 25 BM of its shop price, rounded up to 10 (min 10). Mirrors item_diamonds() in SQL. */
export const itemDiamondPrice = (priceBm: number) => Math.max(10, Math.ceil(priceBm / 250) * 10);

export const fmtDm = (n: number) => Math.round(n).toLocaleString('fr-FR');
export const fmtCents = (cents: number, lang: string) => {
  try { return new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(cents / 100); } catch { return `€${(cents / 100).toFixed(2)}`; }
};

/* ---------------------------------------------------------------- wire shapes (WebSocket) */
/** A gift as broadcast to the table. */
export interface GiftEvent { id: number; from: number; to: number; gift: string; fromName: string }
export interface TipEvent { id: number; from: number; to: number; amount: number; fromName: string }
/** Persistent seat decorations for the current game: [seat, giftId]. */
export type SeatGift = [number, string];
export type SocialError = 'auth' | 'banned' | 'unknown' | 'funds' | 'self' | 'throttle' | 'target' | 'noAccount' | 'games' | 'limit' | 'owned' | 'ambiguous' | 'notFound' | 'unavailable' | 'network' | 'generic';
