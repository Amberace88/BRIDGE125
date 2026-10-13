/**
 * Bridge 125 merch catalogue. Product copy lives in src/i18n/merch.ts (composed from the design story + the product
 * kind, see src/merch/copy.ts); artwork is drawn in code by scripts/merch/* (vector sources in merch-print/designs,
 * mockups in public/merch/mockups). Prices are EUR retail incl. VAT, before shipping.
 *
 * Playing-card decks come first: they are the flagship (src/merch/decks — DECK_PRODUCTS). While that list is empty
 * the store falls back to the original 36-card deck below.
 */
export type Category = 'apparel' | 'home' | 'cards' | 'accessories';
export const CATEGORIES: Category[] = ['cards', 'apparel', 'home', 'accessories'];

/** Store collections: the four categories + City editions (a cross-cut of posters, tees and mugs). */
export type Collection = Category | 'cities';
export const COLLECTIONS: Collection[] = ['cards', 'apparel', 'home', 'accessories', 'cities'];

export type ColourId = 'ink' | 'forest' | 'ruby' | 'felt' | 'white' | 'natural' | 'black' | 'oak' | 'navy' | 'sand' | 'paper' | 'night';

/** What the product physically is — drives the copy (src/i18n/merch.ts → kinds), the size guide and cross-sell. */
export type Kind = 'deck' | 'tee' | 'hoodie' | 'sweatshirt' | 'cap' | 'mug' | 'enamel' | 'poster' | 'canvas' | 'tote' | 'phone'
  | 'stickers' | 'notebook' | 'playmat' | 'coasters';

/** City editions = the Journey home cities (src/campaign/data.ts). */
export type CityId = 'riga' | 'tallinn' | 'vilnius' | 'warsaw' | 'berlin' | 'kyiv' | 'bucharest' | 'sofia' | 'tbilisi' | 'yerevan'
  | 'baku' | 'almaty' | 'tashkent' | 'madrid' | 'london' | 'vienna' | 'montecarlo';
export const CITY_IDS: CityId[] = ['riga', 'tallinn', 'vilnius', 'warsaw', 'berlin', 'kyiv', 'bucharest', 'sofia', 'tbilisi', 'yerevan',
  'baku', 'almaty', 'tashkent', 'madrid', 'london', 'vienna', 'montecarlo'];

export interface Colour { id: ColourId; swatch: string; images: string[]; /** e.g. a frame */ priceDelta?: number }
export interface SizeOption { id: string; label: string; priceDelta?: number }

export interface Product {
  id: string;
  category: Category;
  price: number;                 // EUR
  design: string;                // merch-print/designs/<design>.svg — the print artwork
  colours: Colour[];             // first = default; a single colour hides the picker
  sizes?: SizeOption[];          // omitted = one size
  hero?: boolean;
  badge?: 'new' | 'bestseller' | 'limited';
  /** product type (copy, size guide, cross-sell). Omitted → derived from the id/category. */
  kind?: Kind;
  /** design story key in MerchStrings.designs (defaults to `design`) */
  story?: string;
  /** UI languages this product speaks to most ("For you" row). Omitted or [] = universal. */
  markets?: string[];
  /** City edition */
  city?: CityId;
}

const M = (name: string) => `/merch/mockups/${name}.webp`;
const APPAREL: SizeOption[] = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map(s => ({ id: s, label: s, priceDelta: s === '2XL' || s === '3XL' ? 3 : 0 }));
const HOODIE: SizeOption[] = ['S', 'M', 'L', 'XL', '2XL'].map(s => ({ id: s, label: s, priceDelta: s === '2XL' ? 4 : 0 }));
const POSTER: SizeOption[] = [{ id: '30x40', label: '30 × 40 cm' }, { id: '50x70', label: '50 × 70 cm', priceDelta: 20 }];
const PHONES: SizeOption[] = ['iPhone 15', 'iPhone 15 Pro', 'iPhone 16', 'iPhone 16 Pro', 'Galaxy S24', 'Pixel 9']
  .map(s => ({ id: s.toLowerCase().replace(/\s+/g, '-'), label: s }));

export const SWATCH: Record<ColourId, string> = {
  ink: '#1B1C21', forest: '#0E3A2E', ruby: '#7A1B2B', felt: '#0B3B30', white: '#F4F4F2', natural: '#E6DCC6', black: '#141418', oak: '#8A6439',
  navy: '#1C2541', sand: '#E6DAC2', paper: '#FBF7EC', night: '#2A0E5C',
};
const c = (id: ColourId, ...images: string[]): Colour => ({ id, swatch: SWATCH[id], images: images.map(M) });
const FRAME_PRICE = 25;
/** Unframed print + black / oak frames (frame adds FRAME_PRICE). */
const framed = (key: string): Colour[] => [
  c('paper', `${key}-paper`, `${key}-black`),
  { ...c('black', `${key}-black`, `${key}-paper`), priceDelta: FRAME_PRICE },
  { ...c('oak', `${key}-oak`, `${key}-paper`), priceDelta: FRAME_PRICE },
];

import * as DECKS from './decks';
import { DECK_PRODUCTS } from './decks';

/** Language → home city of the Journey route (lv → Riga …); ru / be have no City edition of their own. */
export const LANG_HOME: Record<string, CityId | undefined> = {
  lv: 'riga', et: 'tallinn', lt: 'vilnius', pl: 'warsaw', de: 'berlin', uk: 'kyiv', ro: 'bucharest', bg: 'sofia', ka: 'tbilisi',
  hy: 'yerevan', az: 'baku', kk: 'almaty', uz: 'tashkent', es: 'madrid', en: 'london',
};
/** Who a City edition speaks to: its home language first, then neighbours on the Journey routes. Monte Carlo = everyone. */
export const CITY_MARKETS: Record<CityId, string[]> = {
  riga: ['lv', 'ru', 'et', 'lt'], tallinn: ['et', 'lv', 'ru'], vilnius: ['lt', 'be', 'lv', 'pl'], warsaw: ['pl', 'be', 'uk', 'lt'],
  berlin: ['de', 'pl', 'en'], kyiv: ['uk', 'pl', 'ro'], bucharest: ['ro', 'bg', 'uk'], sofia: ['bg', 'ro'], tbilisi: ['ka', 'hy', 'az'],
  yerevan: ['hy', 'ka', 'ru'], baku: ['az', 'ka', 'kk', 'uz'], almaty: ['kk', 'uz', 'ru'], tashkent: ['uz', 'kk', 'ru'],
  madrid: ['es', 'en'], london: ['en', 'es', 'de'], vienna: ['de', 'pl', 'ro', 'bg'], montecarlo: [],
};
const POST_SOVIET = ['ru', 'uk', 'be', 'bg', 'kk', 'uz', 'az', 'hy', 'ka', 'lv', 'lt', 'et', 'pl'];

/** The original 36-card deck — the flagship until the deck collection (DECK_PRODUCTS) ships. */
const LEGACY_DECK: Product = {
  id: 'deck', category: 'cards', kind: 'deck', price: 19, design: 'deck/QS', story: 'deck', hero: true, badge: 'new',
  colours: [c('felt', 'deck-hero', 'deck-fan', 'deck-backs')],
};

const UNIVERSAL: Product[] = [
  // ---- cards & the table
  { id: 'mat-table', category: 'cards', kind: 'playmat', price: 34, design: 'mat-felt', story: 'the-table', badge: 'new',
    sizes: [{ id: '61x35', label: '61 × 35 cm' }, { id: '90x40', label: '90 × 40 cm', priceDelta: 12 }],
    colours: [c('felt', 'mat-table-felt'), c('night', 'mat-table-night')] },
  // ---- apparel
  { id: 'tee-lady', category: 'apparel', kind: 'tee', price: 34, design: 'pop-lady', badge: 'new', sizes: APPAREL,
    colours: [c('white', 'tee-lady-white'), c('ink', 'tee-lady-ink')] },
  { id: 'tee-queen', category: 'apparel', kind: 'tee', price: 32, design: 'queen-of-spades', badge: 'bestseller', sizes: APPAREL,
    colours: [c('ink', 'tee-queen-ink'), c('forest', 'tee-queen-forest')] },
  { id: 'hoodie-burn', category: 'apparel', kind: 'hoodie', price: 62, design: 'burn-synth', badge: 'new', sizes: HOODIE,
    colours: [c('ink', 'hoodie-burn-ink'), c('navy', 'hoodie-burn-navy')] },
  { id: 'sweat-durak', category: 'apparel', kind: 'sweatshirt', price: 54, design: 'never-durak', sizes: HOODIE, markets: POST_SOVIET,
    colours: [c('navy', 'sweat-durak-navy'), c('ink', 'sweat-durak-ink')] },
  { id: 'tee-bluff', category: 'apparel', kind: 'tee', price: 32, design: 'bluff-riso', sizes: APPAREL,
    colours: [c('white', 'tee-bluff-white'), c('sand', 'tee-bluff-sand')] },
  { id: 'tee-lucky', category: 'apparel', kind: 'tee', price: 32, design: 'lucky-jack', sizes: APPAREL,
    colours: [c('ink', 'tee-lucky-ink'), c('white', 'tee-lucky-white')] },
  { id: 'tee-seven', category: 'apparel', kind: 'tee', price: 30, design: 'seven-two', sizes: APPAREL,
    colours: [c('white', 'tee-seven-white'), c('natural', 'tee-seven-natural')] },
  { id: 'tee-lielais', category: 'apparel', kind: 'tee', price: 32, design: 'lielais', sizes: APPAREL, markets: ['lv'],
    colours: [c('natural', 'tee-lielais-natural'), c('white', 'tee-lielais-white')] },
  { id: 'hoodie-bluff', category: 'apparel', kind: 'hoodie', price: 59, design: 'bluff-neon', badge: 'limited', sizes: HOODIE,
    colours: [c('ink', 'hoodie-bluff-ink'), c('ruby', 'hoodie-bluff-ruby')] },
  { id: 'hoodie-varsity', category: 'apparel', kind: 'hoodie', price: 59, design: 'varsity-club', sizes: HOODIE,
    colours: [c('forest', 'hoodie-varsity-forest'), c('ink', 'hoodie-varsity-ink')] },
  { id: 'cap-125', category: 'apparel', kind: 'cap', price: 27, design: 'cap-125',
    colours: [c('ink', 'cap-125-ink'), c('navy', 'cap-125-navy')] },
  { id: 'cap-logo', category: 'apparel', kind: 'cap', price: 27, design: 'logo-mark',
    colours: [c('ink', 'cap-logo-ink'), c('forest', 'cap-logo-forest')] },
  // ---- home
  { id: 'poster-lady', category: 'home', kind: 'poster', price: 29, design: 'pop-lady', sizes: POSTER, colours: framed('poster-lady') },
  { id: 'poster-bluff', category: 'home', kind: 'poster', price: 29, design: 'bluff-riso', sizes: POSTER, colours: framed('poster-bluff') },
  { id: 'poster-seven', category: 'home', kind: 'poster', price: 29, design: 'seven-two', sizes: POSTER, colours: framed('poster-seven') },
  { id: 'poster-patience', category: 'home', kind: 'poster', price: 29, design: 'patience', sizes: POSTER, colours: framed('poster-patience') },
  { id: 'canvas-suits', category: 'home', kind: 'canvas', price: 49, design: 'four-suits', badge: 'new',
    sizes: [{ id: '40x40', label: '40 × 40 cm' }, { id: '60x60', label: '60 × 60 cm', priceDelta: 25 }], colours: [c('white', 'canvas-suits-white')] },
  { id: 'coasters-suits', category: 'home', kind: 'coasters', price: 24, design: 'four-suits', colours: [c('white', 'coasters-suits-white')] },
  { id: 'mug-sevens', category: 'home', kind: 'mug', price: 17, design: 'seven-two-wrap', story: 'seven-two',
    colours: [c('white', 'mug-sevens-white', 'mug-sevens-white-2')] },
  { id: 'mug-lady', category: 'home', kind: 'mug', price: 17, design: 'pop-lady-wrap', story: 'pop-lady', colours: [c('white', 'mug-lady-white')] },
  { id: 'mug-lucky', category: 'home', kind: 'enamel', price: 21, design: 'lucky-jack-wrap', story: 'lucky-jack', colours: [c('white', 'mug-lucky-white')] },
  { id: 'mug-seven', category: 'home', kind: 'mug', price: 17, design: 'seven-rules', colours: [c('white', 'mug-front', 'mug-back')] },
  { id: 'poster-riga', category: 'home', kind: 'poster', price: 39, design: 'riga-jugendstil', markets: ['lv', 'ru'], city: 'riga', sizes: POSTER,
    colours: [c('black', 'poster-riga-black'), c('oak', 'poster-riga-oak')] },
  // ---- accessories
  { id: 'notebook-nines', category: 'accessories', kind: 'notebook', price: 18, design: 'sudoku-nines', badge: 'new', colours: [c('white', 'notebook-nines-white')] },
  { id: 'notebook-patience', category: 'accessories', kind: 'notebook', price: 18, design: 'patience', colours: [c('white', 'notebook-patience-white')] },
  { id: 'tote-suits', category: 'accessories', kind: 'tote', price: 22, design: 'four-suits', colours: [c('natural', 'tote-suits-natural')] },
  { id: 'tote-lielais', category: 'accessories', kind: 'tote', price: 22, design: 'lielais', markets: ['lv'], colours: [c('natural', 'tote-lielais-natural')] },
  { id: 'phone-lady', category: 'accessories', kind: 'phone', price: 26, design: 'pop-lady', sizes: PHONES, colours: [c('white', 'phone-lady-white')] },
  { id: 'phone-lucky', category: 'accessories', kind: 'phone', price: 26, design: 'lucky-jack', sizes: PHONES, colours: [c('ink', 'phone-lucky-ink')] },
  { id: 'phone-jacks', category: 'accessories', kind: 'phone', price: 24, design: 'jacks-x5', sizes: PHONES, colours: [c('felt', 'phone-jacks')] },
  { id: 'stickers-pop', category: 'accessories', kind: 'stickers', price: 7, design: 'four-suits', story: 'whole-table', colours: [c('white', 'stickers-pop-white')] },
];

/** City editions: poster (paper / black / oak), badge tee, enamel mug — one set per Journey home city. */
const CITY_PRODUCTS: Product[] = CITY_IDS.flatMap((city): Product[] => {
  const markets = CITY_MARKETS[city];
  return [
    { id: `city-poster-${city}`, category: 'home', kind: 'poster', price: 29, design: `city-${city}`, city, markets, sizes: POSTER,
      colours: framed(`cposter-${city}`) },
    { id: `city-tee-${city}`, category: 'apparel', kind: 'tee', price: 32, design: `badge-${city}`, city, markets, sizes: APPAREL,
      colours: [c('white', `ctee-${city}-white`), c('ink', `ctee-${city}-ink`)] },
    { id: `city-mug-${city}`, category: 'home', kind: 'enamel', price: 21, design: `badge-${city}-wrap`, city, markets,
      colours: [c('white', `cmug-${city}-white`)] },
  ];
});

const deckList = DECK_PRODUCTS.filter(p => p.category === 'cards');
const deckIds = new Set(DECK_PRODUCTS.map(p => p.id));

/** Decks first: playing cards are the flagship. */
export const PRODUCTS: Product[] = [
  ...DECK_PRODUCTS,
  ...(deckList.length ? [] : [LEGACY_DECK]),
  ...[...UNIVERSAL, ...CITY_PRODUCTS].filter(p => !deckIds.has(p.id)),
];

export const productById = (id: string) => PRODUCTS.find(p => p.id === id);

/** The flagship deck shown in the store hero: the first hero deck, else the first deck, else the legacy deck. */
export function flagship(): Product {
  const decks = PRODUCTS.filter(p => p.category === 'cards' && kindOf(p) === 'deck');
  return decks.find(p => p.hero) ?? decks[0] ?? LEGACY_DECK;
}

/** Kind of a product (deck products from the deck collection may omit it). */
export function kindOf(p: Product): Kind {
  if (p.kind) return p.kind;
  if (p.category === 'cards') return 'deck';
  const m = p.id.match(/^(tee|hoodie|sweat|cap|mug|poster|canvas|tote|phone|stickers|notebook|mat|coasters)/);
  const k = m?.[1];
  return k === 'sweat' ? 'sweatshirt' : k === 'mat' ? 'playmat' : (k as Kind | undefined) ?? 'poster';
}

/** Collection a product is listed under (City editions pull out every city product). */
export const collectionOf = (p: Product): Collection => (p.city && p.id.startsWith('city-') ? 'cities' : p.category);

// ------------------------------------------------------------------------------------------------ markets
type DeckMarkets = Record<string, readonly string[]> | readonly string[] | undefined;
/** Optional DECK_MARKETS export of the deck collection: per deck id, or one list for every deck. */
const deckMarkets = Reflect.get(DECKS, ['DECK', 'MARKETS'].join('_')) as DeckMarkets;

export function marketsOf(p: Product): readonly string[] {
  if (p.markets?.length) return p.markets;
  if (deckIds.has(p.id) && deckMarkets) {
    if (Array.isArray(deckMarkets)) return deckMarkets as readonly string[];
    const m = (deckMarkets as Record<string, readonly string[]>)[p.id];
    if (Array.isArray(m)) return m;
  }
  return [];
}

/** How strongly a product speaks to a visitor's language: 3 home city, 2 their market, 1 universal, 0 someone else's. */
export function marketScore(p: Product, lang: string): number {
  const m = marketsOf(p);
  if (!m.length) return 1;
  if (!m.includes(lang)) return 0;
  return p.city && LANG_HOME[lang] === p.city ? 3 : 2;
}

/** "For you": the visitor's own city / market first, then the flagship decks and bestsellers; max n. */
export function forYou(lang: string, n = 10): Product[] {
  const rank = (p: Product) => marketScore(p, lang) * 10 + (p.category === 'cards' ? 4 : 0) + (p.badge === 'bestseller' ? 3 : p.badge === 'new' ? 2 : 0)
    + (marketsOf(p).length && marketsOf(p)[0] === lang ? 1 : 0);
  const seenCity = new Set<string>();
  return PRODUCTS
    .map((p, i) => ({ p, r: rank(p), i }))
    .filter(x => x.r >= 10)
    .sort((a, b) => b.r - a.r || a.i - b.i)
    .map(x => x.p)
    // one product per foreign city keeps the row varied
    .filter(p => { if (!p.city || marketScore(p, lang) === 3) return true; const k = p.city; if (seenCity.has(k)) return false; seenCity.add(k); return true; })
    .slice(0, n);
}

/** Cross-sell: same design (other product types), same city, then same collection. */
export function completeTheSet(p: Product, n = 4): Product[] {
  const story = p.story ?? p.design.replace(/-wrap$/, '');
  const same = (q: Product) => q.id !== p.id && ((q.story ?? q.design.replace(/-wrap$/, '')) === story || (!!p.city && q.city === p.city)
    || q.design.replace(/^badge-|^city-|-wrap$/g, '') === story.replace(/^badge-|^city-/, ''));
  const out = PRODUCTS.filter(same);
  for (const q of PRODUCTS) if (out.length < n && q.id !== p.id && !out.includes(q) && kindOf(q) !== kindOf(p) && collectionOf(q) === collectionOf(p)) out.push(q);
  if (p.category !== 'cards') { const d = flagship(); if (!out.includes(d) && d.id !== p.id) out.unshift(d); }
  return out.slice(0, n);
}

// ------------------------------------------------------------------------------------------------ prices & variants
export function priceFor(p: Product, sizeId?: string | null, colour?: ColourId | null): number {
  const delta = p.sizes?.find(s => s.id === sizeId)?.priceDelta ?? 0;
  const cd = p.colours.find(x => x.id === colour)?.priceDelta ?? 0;
  return p.price + delta + cd;
}

/** Lowest price a product can be bought for ("from €29"). */
export const fromPrice = (p: Product) => p.price + Math.min(0, ...p.colours.map(x => x.priceDelta ?? 0));

/** Stored with an interest sign-up / used to look up a checkout link: "forest / L". */
export function variantLabel(p: Product, colour: ColourId | null, sizeId: string | null): string {
  const parts: string[] = [];
  if (p.colours.length > 1 && colour) parts.push(colour);
  const size = p.sizes?.find(s => s.id === sizeId);
  if (size) parts.push(size.id);
  return parts.join(' / ');
}

/** Size guide (cm, measured flat). */
export const SIZE_GUIDE: Partial<Record<Kind, { sizes: string[]; chest: number[]; length: number[] }>> = {
  tee: { sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'], chest: [43, 46, 51, 56, 61, 66, 71], length: [69, 71, 74, 76, 79, 81, 84] },
  hoodie: { sizes: ['S', 'M', 'L', 'XL', '2XL'], chest: [51, 56, 61, 66, 71], length: [69, 71, 74, 76, 79] },
  sweatshirt: { sizes: ['S', 'M', 'L', 'XL', '2XL'], chest: [51, 56, 61, 66, 71], length: [69, 71, 74, 76, 79] },
};

export function formatEUR(v: number, lang: string): string {
  try {
    return new Intl.NumberFormat(lang === 'en' ? 'en-IE' : lang, { style: 'currency', currency: 'EUR', maximumFractionDigits: v % 1 ? 2 : 0 }).format(v);
  } catch {
    return `€${v}`;
  }
}

const EMAIL_RE = /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$/i;
/** Same rule as merch_interest_add() in supabase/migration_005_merch.sql. */
export const isEmail = (s: string) => s.length >= 6 && s.length <= 254 && EMAIL_RE.test(s.trim());
