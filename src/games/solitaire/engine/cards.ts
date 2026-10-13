// Solitaire — cards, seeded shuffles and the Riga day. Pure: no DOM, no React.

export type Suit = 'S' | 'H' | 'C' | 'D';
/** Suit order of the Klondike foundations (and of card ids: id = suitIndex * 13 + rank - 1). */
export const SUITS: readonly Suit[] = ['S', 'H', 'C', 'D'];
export const SUIT_GLYPH: Record<Suit, string> = { S: '♠', H: '♥', C: '♣', D: '♦' };
export const isRedSuit = (s: Suit) => s === 'H' || s === 'D';

/** A card in a solitaire deal. r: 1 (ace) … 13 (king). Ids are unique within a deal (Spider has two decks). */
export interface SCard { id: number; r: number; s: Suit }

/** Corner label: A 2 … 10 J Q K. */
export const RANK_TEXT = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export type RankText = (typeof RANK_TEXT)[number];
export const rankText = (r: number) => RANK_TEXT[r] as Exclude<RankText, ''>;

/** One standard 52-card deck, id = suitIndex * 13 + (r - 1). */
export function standardDeck(): SCard[] {
  const out: SCard[] = [];
  SUITS.forEach((s, si) => { for (let r = 1; r <= 13; r++) out.push({ id: si * 13 + r - 1, r, s }); });
  return out;
}

/* ------------------------------------------------------------------------------------------------ random */

/** mulberry32 — tiny, fast, good enough for card shuffles; identical on every device. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates with a seeded generator (in place, returns the array). */
export function shuffle<T>(a: T[], rnd: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/** FNV-1a 32-bit — turns text (a day, a label) into a seed. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** A fresh random seed (deal number), 1 … 999 999 999. */
export const randomSeed = () => 1 + Math.floor(Math.random() * 999_999_999);

/* ------------------------------------------------------------------------------------------------ calendar */

/** YYYY-MM-DD in Europe/Riga — the game's day (daily deal, same for everyone). */
export function rigaDay(d = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch { return d.toISOString().slice(0, 10); }
}

export function addDays(day: string, n: number): string {
  const [y, m, dd] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10);
}
