import { DECK_INFO } from './data';

/**
 * "Digital twin" card backs: every physical deck unlocks the very same back as an in-game cosmetic.
 * Earn-only (never sold in the BM shop): granted when a deck code is redeemed (see ./twin.ts).
 *
 * Shape-compatible with `CardBack` in src/theme.ts ({ id, name, css, premium }), plus the vector/raster sources.
 * NOT registered yet — this file must not edit shared files. To switch them on (one PR touching shared code):
 *   1. src/theme.ts          BACKS: `...DECK_BACKS` (import from '../merch/decks/cosmetics') after S1_BACKS
 *   2. src/cosmetics/data.ts EARNED_IDS: add `...DECK_COSMETIC_IDS` (locked in the wardrobe until unlocked)
 *   3. supabase migration    insert the ids into the cosmetics/owned whitelist (like migration_016 did for S1)
 *                            + `deck_codes(code_hash text primary key, deck text, redeemed_by uuid, redeemed_at)`
 *                            + rpc `redeem_deck_code(code text)` → appends `dk_<deck>` to profiles.owned
 *   4. a "Redeem deck code" field in the wardrobe/shop calling that rpc (code format in ./twin.ts)
 */
export interface DeckCosmetic {
  /** Cosmetic id, globally unique: dk_<deck>. */
  id: string;
  deckId: string;
  productId: string;
  name: string;
  /** CSS background for the in-game card back (image + colour fallback while it loads). */
  css: string;
  /** Vector master of the back (public). */
  svg: string;
  /** 360 × 504 WebP of the back cut at the trim line. */
  image: string;
  colours: [string, string, string];
  premium: true;
  unlock: 'deck-code';
}

const NAMES: Record<string, string> = {
  signature: 'Signature Felt', baltic: 'Baltic Morning Star', slavic: 'Slavic Lacquer', caucasus: 'Silk Road Carpet',
  iberian: 'Azulejo Sun', bauhaus: 'Bauhaus Grid', neon: 'Neon Sunset', ivory: 'Ivory Guilloché',
};

export const DECK_COSMETICS: DeckCosmetic[] = DECK_INFO.map(d => {
  const [a, b, c] = d.backColours;
  const image = `/merch/decks/${d.id}/web/back.webp`;
  return {
    id: `dk_${d.id}`,
    deckId: d.id,
    productId: d.productId,
    name: NAMES[d.id] ?? d.id,
    css: `url("${image}") center / cover no-repeat, radial-gradient(circle at 50% 50%, ${c} 0 8%, ${a} 9% 55%, ${b} 100%)`,
    svg: `/merch/decks/${d.id}/back.svg`,
    image,
    colours: d.backColours,
    premium: true,
    unlock: 'deck-code',
  };
});

/** Ready to spread into src/theme.ts BACKS (CardBack shape). */
export const DECK_BACKS = DECK_COSMETICS.map(({ id, name, css, premium }) => ({ id, name, css, premium }));
export const DECK_COSMETIC_IDS = DECK_COSMETICS.map(c => c.id);
export const deckCosmetic = (deckOrProductId: string) => DECK_COSMETICS.find(c => c.deckId === deckOrProductId || c.productId === deckOrProductId);
