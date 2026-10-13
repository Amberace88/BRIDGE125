// The Mahjong Solitaire tile set: 144 tiles of 42 faces.
//
//   face  0– 8  dots 1–9          ×4 each
//   face  9–17  bamboo 1–9        ×4 each
//   face 18–26  characters 1–9    ×4 each
//   face 27–30  winds E S W N     ×4 each
//   face 31–33  dragons R G W     ×4 each
//   face 34–37  flowers 1–4       ×1 each — any flower matches any flower
//   face 38–41  seasons 1–4       ×1 each — any season matches any season
//
// 34 × 4 + 8 = 144 tiles = 72 pairs.

export type Suit = 'dots' | 'bamboo' | 'chars' | 'wind' | 'dragon' | 'flower' | 'season';

export const FACES = 42;
export const FLOWER0 = 34;
export const SEASON0 = 38;

export function suitOf(face: number): Suit {
  if (face < 9) return 'dots';
  if (face < 18) return 'bamboo';
  if (face < 27) return 'chars';
  if (face < 31) return 'wind';
  if (face < 34) return 'dragon';
  if (face < 38) return 'flower';
  return 'season';
}

/** 1-based rank inside the suit (dots 1–9, wind 1–4 = E S W N, dragon 1–3 = red green white, flower/season 1–4). */
export function rankOf(face: number): number {
  if (face < 27) return (face % 9) + 1;
  if (face < 31) return face - 27 + 1;
  if (face < 34) return face - 31 + 1;
  if (face < 38) return face - FLOWER0 + 1;
  return face - SEASON0 + 1;
}

/** Faces with the same key match: the face itself, or one shared key for all flowers / all seasons. */
export function matchKey(face: number): number {
  if (face >= SEASON0) return SEASON0;
  if (face >= FLOWER0) return FLOWER0;
  return face;
}

export const matches = (a: number, b: number) => a >= 0 && b >= 0 && matchKey(a) === matchKey(b);

/** All 144 tiles (faces), in order. */
export function fullSet(): number[] {
  const out: number[] = [];
  for (let f = 0; f < FLOWER0; f++) out.push(f, f, f, f);
  for (let f = FLOWER0; f < FACES; f++) out.push(f);
  return out;
}

/** The 72 matching pairs of the full set (two pairs per face, flowers 1+2 · 3+4, seasons 1+2 · 3+4). */
export function fullPairs(): [number, number][] {
  const out: [number, number][] = [];
  for (let f = 0; f < FLOWER0; f++) out.push([f, f], [f, f]);
  out.push([FLOWER0, FLOWER0 + 1], [FLOWER0 + 2, FLOWER0 + 3], [SEASON0, SEASON0 + 1], [SEASON0 + 2, SEASON0 + 3]);
  return out;
}

/** Pair up any multiset of faces where every match key appears an even number of times (null if impossible). */
export function pairUp(faces: number[]): [number, number][] | null {
  const by = new Map<number, number[]>();
  for (const f of faces) { const k = matchKey(f); const l = by.get(k); if (l) l.push(f); else by.set(k, [f]); }
  const out: [number, number][] = [];
  for (const l of by.values()) {
    if (l.length % 2) return null;
    l.sort((a, b) => a - b);
    for (let i = 0; i < l.length; i += 2) out.push([l[i], l[i + 1]]);
  }
  return out;
}
