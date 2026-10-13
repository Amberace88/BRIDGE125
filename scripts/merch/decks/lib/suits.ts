/** Suit glyphs, each drawn in a 100 × 100 box. */
import { n } from './svg.ts';

/** Clockwise circle path (so overlapping parts of a compound suit union under nonzero fill). */
const cw = (cx: number, cy: number, r: number) => `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 1 ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 1 ${n(cx - r)} ${n(cy)}Z`;

export type Suit = 'S' | 'H' | 'D' | 'C';

/** Classic silhouettes (same geometry as the existing Bridge 125 deck and app). */
export const CLASSIC: Record<Suit, string> = {
  S: 'M50 4C38 22 8 38 8 60C8 74 19 84 32 84C40 84 46 80 49 75C48 86 44 94 34 98L66 98C56 94 52 86 51 75C54 80 60 84 68 84C81 84 92 74 92 60C92 38 62 22 50 4Z',
  H: 'M50 96C44 88 6 62 6 34C6 18 18 6 32 6C41 6 47 11 50 18C53 11 59 6 68 6C82 6 94 18 94 34C94 62 56 88 50 96Z',
  D: 'M50 2C60 20 74 36 90 50C74 64 60 80 50 98C40 80 26 64 10 50C26 36 40 20 50 2Z',
  C: 'M50 4C38 4 29 13 29 25C29 30 31 35 34 39C31 37 27 36 24 36C12 36 4 46 4 57C4 69 13 78 25 78'
    + 'C35 78 43 72 47 64C46 80 42 90 32 98L68 98C58 90 54 80 53 64C57 72 65 78 75 78C87 78 96 69 96 57'
    + 'C96 46 88 36 76 36C73 36 69 37 66 39C69 35 71 30 71 25C71 13 62 4 50 4Z',
};

/** Straight-edged diamond variant (used where a crisp lozenge reads better). */
export const DIAMOND_STRAIGHT = 'M50 2L90 50L50 98L10 50Z';

/** Constructed from circles, triangles and squares — the Bauhaus set. */
export const GEO: Record<Suit, string> = {
  H: cw(29, 33, 25) + cw(71, 33, 25) + 'M5.6 42L94.4 42L50 96Z',
  S: cw(29, 61, 25) + cw(71, 61, 25) + 'M5.6 52L50 2L94.4 52Z' + 'M50 58L66 98L34 98Z',
  D: 'M50 2L88 50L50 98L12 50Z',
  C: cw(50, 27, 22) + cw(26, 60, 22) + cw(74, 60, 22) + 'M50 52L66 98L34 98Z' + 'M40 40L60 40L60 62L40 62Z',
};

export type SuitSet = Record<Suit, string>;

/** Suit glyph whose 100 × 100 box is centred on (x, y) with width `size`; rotated 180° when `flip`. */
export function suitAt(set: SuitSet, s: Suit, x: number, y: number, size: number, attrs: string, flip = false) {
  const k = size / 100;
  const t = flip
    ? `translate(${n(x + size / 2)} ${n(y + size / 2)}) scale(${n(-k)})`
    : `translate(${n(x - size / 2)} ${n(y - size / 2)}) scale(${n(k)})`;
  return `<path transform="${t}" d="${set[s]}" ${attrs}/>`;
}

export const isRed = (s: Suit) => s === 'H' || s === 'D';
