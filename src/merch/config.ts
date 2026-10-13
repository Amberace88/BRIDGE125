/**
 * ─────────────────────────────────────────────────────────────────────────────────────────────────────────
 *  MERCH CHECKOUT HOOK — paste your print-on-demand product links here.
 * ─────────────────────────────────────────────────────────────────────────────────────────────────────────
 *
 *  While a product has no link, its button is "Notify me / Pre-order interest" and sign-ups are stored in
 *  Supabase (table merch_interest, see supabase/migration_005_merch.sql; read them in the admin panel via
 *  rpc('admin_merch_interest')).
 *
 *  Paste a link (Printful / Gelato / Printify storefront, Shopify, Etsy, Stripe Payment Link …) and that
 *  product's button turns into "Buy — €xx" and opens the link in a new tab. Nothing else needs to change.
 *
 *  Keys:  '<product id>'                     → one link for every variant
 *         '<product id>:<colour>'            → a link for one colour   (e.g. 'tee-queen:forest')
 *         '<product id>:<colour>:<size id>'  → a link for one exact variant (e.g. 'tee-queen:ink:L')
 *  The most specific key wins. Product ids are in src/merch/catalog.ts.
 *  Optional {size} / {colour} placeholders in a URL are filled in, e.g. 'https://shop.example/tee?size={size}'.
 */
export const MERCH_CHECKOUT: Record<string, string> = {
  'deck': '',
  'deck-baltic': '',
  'deck-slavic': '',
  'deck-caucasus': '',
  'deck-iberian': '',
  'deck-bauhaus': '',
  'deck-neon': '',
  'deck-ivory': '',
  'tee-queen': '',
  'hoodie-varsity': '',
  'poster-riga': '',
  'tee-burn': '',
  'mug-seven': '',
  'hoodie-bluff': '',
  'phone-jacks': '',
  'tee-sunset': '',
  'tote-hand': '',
  'cap-logo': '',
  'stickers': '',
};

/** Shown in the product sheet. */
export const MERCH_SHIPPING_DAYS = '5–10';

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
