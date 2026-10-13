/**
 * ─────────────────────────────────────────────────────────────────────────────────────────────────────────
 *  MERCH STORE SETTINGS
 * ─────────────────────────────────────────────────────────────────────────────────────────────────────────
 *
 *  Real orders go through the cart → startMerchCheckout() (src/merch/checkout.ts, Stripe + print-on-demand,
 *  implemented by the fulfilment worker). While merchCheckoutAvailable() is false the cart works as a
 *  pre-order list and "Notify me" sign-ups are stored in Supabase (table merch_interest, see
 *  supabase/migration_005_merch.sql; read them in the admin panel via rpc('admin_merch_interest')).
 *
 *  Optional fallback, only used while the cart checkout is off: paste an external product link
 *  (Printful / Gelato / Printify storefront, Etsy, Stripe Payment Link …) below and that product's sheet shows
 *  "Buy — €xx" opening the link in a new tab.
 *
 *  Keys:  '<product id>'                     → one link for every variant
 *         '<product id>:<colour>'            → a link for one colour   (e.g. 'tee-queen:forest')
 *         '<product id>:<colour>:<size id>'  → a link for one exact variant (e.g. 'tee-queen:ink:L')
 *  The most specific key wins. Product ids are in src/merch/catalog.ts; products without a key simply have no link.
 *  Optional {size} / {colour} placeholders in a URL are filled in, e.g. 'https://shop.example/tee?size={size}'.
 */
export const MERCH_CHECKOUT: Record<string, string> = {
  // 'tee-queen': 'https://…',
};

/** Shown in the product sheet and the cart. */
export const MERCH_SHIPPING_DAYS = '5–10';
/** Free shipping from this cart subtotal (EUR). Keep in sync with the fulfilment worker's shipping rules. */
export const FREE_SHIPPING_EUR = 75;
/** "Shipping from €x" — the cheapest EU rate, shown as an estimate (the exact rate is computed at checkout). */
export const SHIPPING_FROM_EUR = 4.9;
/** Max quantity of one variant in the cart, and max distinct lines. */
export const MERCH_MAX_QTY = 10;
export const MERCH_MAX_LINES = 30;

/** Ship-to countries offered in the cart (ISO 3166-1 alpha-2). Names come from Intl.DisplayNames in the visitor's language. */
export const SHIP_COUNTRIES = [
  'LV', 'LT', 'EE', 'PL', 'DE', 'AT', 'ES', 'FR', 'IT', 'NL', 'BE', 'LU', 'IE', 'PT', 'FI', 'SE', 'DK', 'CZ', 'SK', 'HU', 'RO', 'BG',
  'GR', 'HR', 'SI', 'MT', 'CY', 'GB', 'NO', 'CH', 'UA', 'GE', 'AM', 'AZ', 'KZ', 'UZ', 'MC',
] as const;
/** Default ship-to country per UI language. */
export const LANG_COUNTRY: Record<string, string> = {
  lv: 'LV', lt: 'LT', et: 'EE', pl: 'PL', de: 'DE', es: 'ES', ro: 'RO', bg: 'BG', uk: 'UA', ka: 'GE', hy: 'AM', az: 'AZ', kk: 'KZ',
  uz: 'UZ', be: 'LT', ru: 'LV', en: 'GB',
};

export function checkoutUrl(productId: string, colour?: string | null, size?: string | null, table: Record<string, string> = MERCH_CHECKOUT): string | null {
  const keys = [colour && size ? `${productId}:${colour}:${size}` : '', colour ? `${productId}:${colour}` : '', productId].filter(Boolean);
  for (const k of keys) {
    const raw = table[k]?.trim();
    if (raw && /^https:\/\//i.test(raw)) {
      return raw.replace('{size}', encodeURIComponent(size ?? '')).replace('{colour}', encodeURIComponent(colour ?? ''));
    }
  }
  return null;
}
