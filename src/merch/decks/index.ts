import type { Product } from '../catalog';

/**
 * Playing-card decks — the flagship merch. Filled by the deck collection (src/merch/decks/*): every deck is a
 * Product with category 'cards'. Only `import type` from ../catalog here (catalog imports this file).
 */
export const DECK_PRODUCTS: Product[] = [];
