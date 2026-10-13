/**
 * Deck collection facts shared by the app (products, cosmetics) and the generator (scripts/merch/decks).
 * No imports with runtime effect: the Node generator imports this file directly.
 */
/** Store colour slot ids (a subset-compatible copy of ColourId in ../catalog — no import, the Node generator reads this file). */
export type DeckColourId = 'ink' | 'forest' | 'ruby' | 'felt' | 'white' | 'natural' | 'black' | 'oak';

/** Every UI language of the app (src/i18n). */
export const ALL_LANGS = ['en', 'lv', 'ru', 'uk', 'lt', 'et', 'pl', 'de', 'be', 'kk', 'uz', 'az', 'ka', 'hy', 'ro', 'bg', 'es'] as const;

export interface DeckInfo {
  /** Slug: folders public/merch/decks/<id>, merch-print/decks/<id>; QR source deck_<id>. */
  id: string;
  /** Store product id. The Signature deck keeps the historical 'deck' id so old links keep working. */
  productId: string;
  price: number;
  badge?: 'new' | 'bestseller' | 'limited';
  hero?: boolean;
  /** Store colour slot (single colour, picker hidden) + the deck's real swatch. */
  colour: DeckColourId;
  swatch: string;
  /** Languages the deck is designed for (store sorts these first for matching visitors). */
  markets: readonly string[];
  /** A 36-card (6 … A) Eastern edition is offered: Bridge 125, Durak, Zolīte. */
  edition36: boolean;
  /** Card used as the product's `design` (public/merch/decks/<id>/<card>.svg). */
  heroCard: string;
  /** Back colours for the in-game twin cosmetic (fallback gradient while the image loads). */
  backColours: [string, string, string];
}

export const DECK_INFO: DeckInfo[] = [
  { id: 'signature', productId: 'deck', price: 24, hero: true, badge: 'new', colour: 'felt', swatch: '#0B3B30', markets: ALL_LANGS, edition36: true, heroCard: 'QS', backColours: ['#17614D', '#0B3B30', '#C9A85A'] },
  { id: 'baltic', productId: 'deck-baltic', price: 26, badge: 'new', colour: 'ruby', swatch: '#A3202E', markets: ['lv', 'lt', 'et', 'en'], edition36: true, heroCard: 'QH', backColours: ['#B3283A', '#F3EAD8', '#D98A1E'] },
  { id: 'slavic', productId: 'deck-slavic', price: 26, badge: 'new', colour: 'ink', swatch: '#141210', markets: ['ru', 'uk', 'be', 'kk', 'bg'], edition36: true, heroCard: 'QD', backColours: ['#141210', '#C8202B', '#E8B53C'] },
  { id: 'caucasus', productId: 'deck-caucasus', price: 26, badge: 'new', colour: 'ruby', swatch: '#8E1F2A', markets: ['ka', 'hy', 'az', 'kk', 'uz'], edition36: true, heroCard: 'KD', backColours: ['#8E1F2A', '#1D2A5A', '#E3A72F'] },
  { id: 'iberian', productId: 'deck-iberian', price: 26, badge: 'new', colour: 'white', swatch: '#1E4FA3', markets: ['es', 'en'], edition36: false, heroCard: 'QH', backColours: ['#1E4FA3', '#F7F2E7', '#E8452C'] },
  { id: 'bauhaus', productId: 'deck-bauhaus', price: 24, colour: 'natural', swatch: '#E1251B', markets: ['de', 'pl', 'ro', 'en'], edition36: false, heroCard: 'KC', backColours: ['#F2EDE3', '#E1251B', '#1F4E9E'] },
  { id: 'neon', productId: 'deck-neon', price: 24, badge: 'limited', colour: 'ink', swatch: '#FF2BD6', markets: ALL_LANGS, edition36: false, heroCard: 'QS', backColours: ['#0A0612', '#FF2BD6', '#00E5FF'] },
  { id: 'ivory', productId: 'deck-ivory', price: 29, badge: 'limited', colour: 'natural', swatch: '#F3EDE0', markets: ALL_LANGS, edition36: false, heroCard: 'AS', backColours: ['#F5EFE2', '#E9DFCB', '#B8954A'] },
];

export const deckInfo = (id: string) => DECK_INFO.find(d => d.id === id || d.productId === id);
