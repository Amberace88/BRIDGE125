/**
 * Card geometry, card ids and the DeckTheme contract every deck implements.
 *
 * Print spec (all decks): poker size 2.5 × 3.5 in (63.5 × 88.9 mm) at 300 dpi = 750 × 1050 px trim,
 * + 1/8 in (37.5 px ≈ 3.2 mm) bleed each side → 825 × 1125 px canvas. Safe area: 1/8 in inside the trim.
 */
import { face, type FaceKey } from './font.ts';
import { CLASSIC, isRed, suitAt, type Suit, type SuitSet } from './suits.ts';
import { dbl, n, rot180 } from './svg.ts';

export type { Suit } from './suits.ts';
export const W = 825, H = 1125, B = 37.5, TW = 750, TH = 1050, CX = W / 2, CY = H / 2;
export const SAFE = B + 37.5;           // safe-area inset from the canvas edge
export const CORNER = 37.5;             // trim corner radius (1/8 in)

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
export const SUIT_NAMES: Record<Suit, string> = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
export const RANK_NAMES: Record<Rank, string> = {
  A: 'Ace', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten', J: 'Jack', Q: 'Queen', K: 'King',
};
export type JokerId = 'JK1' | 'JK2';
export type CardId = `${Rank}${Suit}` | JokerId;

export const DECK54: CardId[] = [...SUITS.flatMap(s => RANKS.map(r => `${r}${s}` as CardId)), 'JK1', 'JK2'];
/** The 36-card Eastern edition (Bridge / Durak / Zolīte-compatible): 6 … A in four suits. */
export const DECK36: CardId[] = SUITS.flatMap(s => (['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as Rank[]).map(r => `${r}${s}` as CardId));

export function parseCard(id: CardId): { rank: Rank; suit: Suit } | { joker: 1 | 2 } {
  if (id === 'JK1' || id === 'JK2') return { joker: id === 'JK1' ? 1 : 2 };
  return { rank: id.slice(0, -1) as Rank, suit: id.slice(-1) as Suit };
}
export const cardTitle = (id: CardId) => {
  const p = parseCard(id);
  return 'joker' in p ? `Joker ${p.joker}` : `${RANK_NAMES[p.rank]} of ${SUIT_NAMES[p.suit]}`;
};

// ------------------------------------------------------------------------------------------------ pip layouts
type Col = 'L' | 'C' | 'R';
/** Standard pip positions: column + vertical fraction of the pip field (0 = top row, 1 = bottom row). */
export const PIP_LAYOUT: Record<string, [Col, number][]> = {
  2: [['C', 0], ['C', 1]],
  3: [['C', 0], ['C', 0.5], ['C', 1]],
  4: [['L', 0], ['R', 0], ['L', 1], ['R', 1]],
  5: [['L', 0], ['R', 0], ['C', 0.5], ['L', 1], ['R', 1]],
  6: [['L', 0], ['R', 0], ['L', 0.5], ['R', 0.5], ['L', 1], ['R', 1]],
  7: [['L', 0], ['R', 0], ['C', 0.25], ['L', 0.5], ['R', 0.5], ['L', 1], ['R', 1]],
  8: [['L', 0], ['R', 0], ['C', 0.25], ['L', 0.5], ['R', 0.5], ['C', 0.75], ['L', 1], ['R', 1]],
  9: [['L', 0], ['R', 0], ['L', 1 / 3], ['R', 1 / 3], ['C', 0.5], ['L', 2 / 3], ['R', 2 / 3], ['L', 1], ['R', 1]],
  10: [['L', 0], ['R', 0], ['C', 1 / 6], ['L', 1 / 3], ['R', 1 / 3], ['L', 2 / 3], ['R', 2 / 3], ['C', 5 / 6], ['L', 1], ['R', 1]],
};

export interface PipField { dx: number; top: number; bottom: number; size: number }
export const DEFAULT_PIPS: PipField = { dx: 158, top: CY - 338, bottom: CY + 338, size: 122 };

/** Pip centres for a number card: [x, y, flipped]. Pips below the centre line are drawn upside down. */
export function pipPositions(rank: Rank, f: PipField = DEFAULT_PIPS): [number, number, boolean][] {
  return (PIP_LAYOUT[rank] ?? []).map(([c, t]) => {
    const x = c === 'L' ? CX - f.dx : c === 'R' ? CX + f.dx : CX;
    const y = f.top + (f.bottom - f.top) * t;
    return [x, y, y > CY + 1];
  });
}

// ------------------------------------------------------------------------------------------------ the theme contract
export interface DeckColours {
  /** Product swatch / dominant colour (store dots, cosmetics fallback). */
  primary: string;
  secondary: string;
  accent: string;
  /** Card-face paper. */
  paper: string;
}

export interface DeckTheme {
  /** Slug: folder names + `deck_<id>` QR source. */
  id: string;
  /** Store product id (Signature keeps the historical 'deck'). */
  productId: string;
  /** English name, used on the box and in file titles. */
  name: string;
  /** Short subtitle printed on the box ("Folk ornament of the Baltic coast"). */
  boxLine: string;
  /** Market hint for the box side: languages this deck is designed for. */
  markets: string[];
  edition36: boolean;
  colours: DeckColours;
  /** Shared <defs> (gradients, patterns, filters) included in every SVG of the deck. */
  defs: string;
  /** Background of a face card (full bleed, 825 × 1125). */
  faceBg(id: CardId): string;
  /** Index (rank over suit) for the top-left corner; the generator adds the 180° copy. */
  index(rank: Rank, s: Suit): string;
  pip(s: Suit, x: number, y: number, size: number, flip: boolean): string;
  pipField: PipField;
  /** Optional decoration on number cards (drawn over the background, under the pips). */
  numberDeco?(rank: Rank, s: Suit): string;
  ace(s: Suit): string;
  court(rank: 'J' | 'Q' | 'K', s: Suit): string;
  joker(k: 1 | 2): string;
  /** Card back — must be 180° rotation symmetric. */
  back(): string;
  box: BoxArt;
  /** Mockup surface + light (scripts/merch/decks/mockups.ts). */
  scene: SceneStyle;
}

export interface BoxArt {
  /** Front panel art (W × H canvas of the box, see box.ts); gets the label drawn by box.ts unless `ownLabel`. */
  front(w: number, h: number): string;
  /** Background for back / sides / flaps. */
  panel(w: number, h: number): string;
  /** Colour of text printed on panels. */
  ink: string;
  /** Accent (rules, logo) on panels. */
  accent: string;
  /** Label plate behind text on the front (null = none). */
  plate: string | null;
  /** Rules / frames colour (defaults to accent; must be a solid colour for thin straight lines). */
  rule?: string;
  /** Custom front label (replaces the default wordmark + name plates). */
  ownLabel?(w: number, h: number): string;
}

export interface SceneStyle {
  surface: 'felt' | 'wood' | 'linen' | 'tile' | 'neon' | 'marble' | 'paper' | 'lacquer' | 'rug';
  /** Base colours for the surface. */
  base: string;
  hi: string;
  lo: string;
  /** Hero cards shown fanned in the mockups. */
  fan: CardId[];
  /** Cards laid out in the spread mockup. */
  spread: CardId[];
}

// ------------------------------------------------------------------------------------------------ shared building blocks
/** Classic index: rank glyph in a font over a suit glyph. */
export function textIndex(o: {
  rank: Rank; s: Suit; font: FaceKey; size: number; fill: string; suitFill: string; set?: SuitSet;
  x?: number; y?: number; suitSize?: number; gap?: number; tenSqueeze?: number; extra?: string;
}) {
  const f = face(o.font);
  const x = o.x ?? B + 82, y = o.y ?? B + 132;
  const ten = o.rank === '10';
  const sx = ten ? (o.tenSqueeze ?? 0.8) : 1;
  const { d } = f.text(o.rank, x, y, ten ? o.size * 0.94 : o.size, { anchor: 'middle', sx, tracking: ten ? -0.04 : 0 });
  const ss = o.suitSize ?? 56;
  return `<path d="${d}" fill="${o.fill}" ${o.extra ?? ''}/>` + suitAt(o.set ?? CLASSIC, o.s, x, y + (o.gap ?? 22) + ss / 2, ss, `fill="${o.suitFill}"`);
}

export const corners = (g: string) => dbl(g, CX, CY);

/** Number card: background + optional deco + pips + indices. */
export function numberCard(t: DeckTheme, rank: Rank, s: Suit) {
  const pips = pipPositions(rank, t.pipField).map(([x, y, flip]) => t.pip(s, x, y, t.pipField.size, flip)).join('');
  return t.faceBg(`${rank}${s}` as CardId) + (t.numberDeco?.(rank, s) ?? '') + pips + corners(t.index(rank, s));
}

export function cardBody(t: DeckTheme, id: CardId): string {
  const p = parseCard(id);
  if ('joker' in p) return t.joker(p.joker);
  if (p.rank === 'A') return t.ace(p.suit);
  if (p.rank === 'J' || p.rank === 'Q' || p.rank === 'K') return t.court(p.rank, p.suit);
  return numberCard(t, p.rank, p.suit);
}

/** Joker index: the word JOKER stacked vertically in the corner (+ 180° copy). */
export function jokerIndex(fill: string, font: FaceKey = 'golos800', size = 40, x = B + 70, y0 = B + 92) {
  const f = face(font);
  let g = '';
  'JOKER'.split('').forEach((ch, i) => { g += `<path d="${f.text(ch, x, y0 + i * size * 1.02, size, { anchor: 'middle' }).d}" fill="${fill}"/>`; });
  return corners(g);
}

export { isRed, rot180, n };
