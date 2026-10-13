/**
 * Merch fulfilment map: which print-on-demand provider makes which product, with which provider variant ids and
 * which print files. Shared by the Worker (worker/merch*.ts — routing, order payloads) and the app (admin tab).
 * DOM-free and Workers-free on purpose.
 *
 * ── HOW TO FILL THIS IN (owner) ─────────────────────────────────────────────────────────────────────────────
 *  1. Set the provider's secrets (docs/MERCH.md) → Admin → Pasūtījumi → "Piegādātāji" shows each store and lets
 *     you look up the provider's catalogue (Printful catalog variant ids, Gelato productUids, Prodigi SKUs,
 *     Printify blueprint / provider / variant ids, or the products you created in your Printify shop).
 *  2. Paste the ids into `variants` of the matching route below. Keys are `<colour>/<size>`:
 *        'ink/L': 4017          → exactly that colour + size
 *        'ink/*': 'GLOBAL-…'    → every size of that colour
 *        '*\/L':  …             → that size in every colour
 *        '*':     …             → every variant (single-variant products: mug, tote, deck …)
 *     Colour ids and size ids are the ones in src/merch/catalog.ts. A missing key or `null` = not mapped yet.
 *  3. A variant can be bought only when at least one route has (a) its provider's secrets set and (b) an id for
 *     that variant. Routes are tried in the order listed (priority); the next one is the fallback.
 *
 * Every external order is tagged with BRAND (see worker/merchBrand.ts) and is refused unless the provider store
 * proves it is the Bridge 125 store — Bridge 125 orders can never land in another brand's store and vice versa.
 */
import type { Category } from './catalog';

export const BRAND = 'bridge125';
export const BRAND_NAME = 'Bridge 125';
export const BRAND_SITE = 'bridge125.com';
/** Every external order / item reference starts with this — and nothing else in a Bridge 125 store may. */
export const EXTERNAL_PREFIX = 'b125-';

export type ProviderId = 'printful' | 'gelato' | 'prodigi' | 'printify';
export const PROVIDERS: ProviderId[] = ['gelato', 'printful', 'prodigi', 'printify'];

/** A provider variant: Printful catalog_variant_id (number), Gelato productUid, Prodigi SKU (+ attributes), Printify variant_id. */
export type VariantRef = string | number | { id: string | number; attributes?: Record<string, string> } | null;

/** A print file in merch-print/ (published at build time under /print/<hash>/…, see scripts/merch/print-assets.mjs). */
export interface PrintFile {
  /** Printful placement ('front', 'default', 'embroidery_front' …) · Gelato file type ('front', 'default') · Prodigi printArea · Printify print_areas key. */
  area: string;
  /** Path relative to merch-print/, e.g. 'queen-of-spades.png', 'deck/back.png'. */
  file: string;
  /** Printful technique ('dtg', 'embroidery', 'sublimation', 'digital', 'uv' …). */
  technique?: string;
}

export interface Route {
  provider: ProviderId;
  /** Human hint for the catalogue lookup: Printful catalog product id, Gelato catalog uid, Prodigi SKU family, Printify blueprint. */
  ref?: string;
  /**
   * Printify only. `productId` = a product you designed in the Printify shop (recommended for the deck: 36 faces +
   * back + box are laid out in Printify's own editor) → orders reference product_id + variant_id.
   * Otherwise blueprint mode: `blueprintId` + `printProviderId` + `files` → print_areas.
   */
  printify?: { blueprintId?: number; printProviderId?: number; productId?: string };
  /** Prodigi only: how the image is fitted (fillPrintArea | fitPrintArea | stretchToPrintArea). */
  sizing?: 'fillPrintArea' | 'fitPrintArea' | 'stretchToPrintArea';
  files: PrintFile[];
  variants: Record<string, VariantRef>;
}

export interface ProductFulfilment {
  /** English name on the Stripe receipt and on provider packing slips. */
  title: string;
  routes: Route[];
}

const tee = (file: string): Route[] => [
  // Gelato first: produced inside the EU (short, duty-free shipping for EU buyers), Printful as the fallback.
  { provider: 'gelato', ref: 'apparel · classic unisex crewneck t-shirt', files: [{ area: 'front', file }], variants: {} },
  { provider: 'printful', ref: 'catalog product 71 (Bella+Canvas 3001)', files: [{ area: 'front', file, technique: 'dtg' }], variants: {} },
];
const hoodie = (file: string): Route[] => [
  { provider: 'gelato', ref: 'apparel · unisex pullover hoodie', files: [{ area: 'front', file }], variants: {} },
  { provider: 'printful', ref: 'catalog product 146 (Gildan 18500)', files: [{ area: 'front', file, technique: 'dtg' }], variants: {} },
];

/** Per-product routes. Products not listed here (e.g. new decks) use CATEGORY_DEFAULTS and stay unpurchasable until mapped. */
export const FULFILMENT: Record<string, ProductFulfilment> = {
  'deck': {
    title: 'Bridge 125 Playing Cards (36-card deck)',
    routes: [
      // Design the deck once in the Printify editor (merch-print/deck/*.png) and put that product's id here.
      { provider: 'printify', ref: 'playing cards (product created in the Bridge 125 Printify shop)', printify: { productId: undefined }, files: [{ area: 'front', file: 'deck/back.png' }], variants: {} },
      { provider: 'prodigi', ref: 'playing cards SKU', sizing: 'fillPrintArea', files: [{ area: 'default', file: 'deck/back.png' }], variants: {} },
    ],
  },
  'tee-queen': { title: 'Queen of Spades Tee', routes: tee('queen-of-spades.png') },
  'tee-burn': { title: '125 → 0 Tee', routes: tee('burn-125.png') },
  'tee-sunset': { title: 'Good Hands Tee', routes: tee('sunset-70s.png') },
  'hoodie-varsity': { title: 'Bridge Club Hoodie', routes: hoodie('varsity-club.png') },
  'hoodie-bluff': { title: 'Bluff Neon Hoodie', routes: hoodie('bluff-neon.png') },
  'poster-riga': {
    title: 'Riga Jugendstil Poster (framed)',
    routes: [
      { provider: 'gelato', ref: 'framed posters', files: [{ area: 'default', file: 'riga-jugendstil.jpg' }], variants: {} },
      { provider: 'prodigi', ref: 'classic frame GLOBAL-CFP-…', sizing: 'fillPrintArea', files: [{ area: 'default', file: 'riga-jugendstil.jpg' }], variants: {} },
      { provider: 'printful', ref: 'catalog product 2 (enhanced matte framed poster)', files: [{ area: 'default', file: 'riga-jugendstil.jpg', technique: 'digital' }], variants: {} },
    ],
  },
  'mug-seven': {
    title: 'Seven? Mug',
    routes: [
      { provider: 'gelato', ref: 'mugs · 11 oz ceramic', files: [{ area: 'default', file: 'seven-rules.png' }], variants: {} },
      { provider: 'printful', ref: 'catalog product 19 (white glossy mug)', files: [{ area: 'default', file: 'seven-rules.png', technique: 'sublimation' }], variants: {} },
      { provider: 'prodigi', ref: 'GLOBAL-MUG-…', sizing: 'fillPrintArea', files: [{ area: 'default', file: 'seven-rules.png' }], variants: {} },
    ],
  },
  'phone-jacks': {
    title: 'Jacks ×5 Phone Case',
    routes: [
      { provider: 'printful', ref: 'tough case for iPhone/Samsung', files: [{ area: 'default', file: 'jacks-x5.png', technique: 'uv' }], variants: {} },
      { provider: 'gelato', ref: 'phone cases', files: [{ area: 'default', file: 'jacks-x5.png' }], variants: {} },
    ],
  },
  'tote-hand': {
    title: 'Good Hand Tote',
    routes: [
      { provider: 'gelato', ref: 'bags · cotton tote', files: [{ area: 'front', file: 'line-art-hand.png' }], variants: {} },
      { provider: 'printful', ref: 'catalog product 84 (eco tote)', files: [{ area: 'front', file: 'line-art-hand.png', technique: 'dtg' }], variants: {} },
    ],
  },
  'cap-logo': {
    title: 'Modern Fan Cap (embroidered)',
    routes: [
      { provider: 'printful', ref: 'catalog product 206 (dad hat, embroidery)', files: [{ area: 'embroidery_front', file: 'logo-mark.png', technique: 'embroidery' }], variants: {} },
    ],
  },
  'stickers': {
    title: 'Bridge 125 Sticker Sheet',
    routes: [
      { provider: 'printful', ref: 'kiss-cut sticker sheet', files: [{ area: 'default', file: 'logo-mark.png', technique: 'digital' }], variants: {} },
      { provider: 'gelato', ref: 'stickers', files: [{ area: 'default', file: 'logo-mark.png' }], variants: {} },
    ],
  },
};

/** Fallback routes by category (no ids → not purchasable until a FULFILMENT entry exists). */
export const CATEGORY_DEFAULTS: Record<Category, Route[]> = {
  cards: [
    { provider: 'printify', ref: 'playing cards (shop product)', files: [], variants: {} },
    { provider: 'prodigi', ref: 'playing cards SKU', files: [], variants: {} },
  ],
  apparel: [
    { provider: 'gelato', files: [], variants: {} },
    { provider: 'printful', files: [], variants: {} },
  ],
  home: [
    { provider: 'gelato', files: [], variants: {} },
    { provider: 'printful', files: [], variants: {} },
  ],
  accessories: [
    { provider: 'printful', files: [], variants: {} },
    { provider: 'gelato', files: [], variants: {} },
  ],
};

export const variantKey = (colour: string | null | undefined, size: string | null | undefined) => `${colour || '*'}/${size || '*'}`;

/** Lookup order for a variant id: exact → colour → size → product-wide. */
export function variantKeys(colour: string | null | undefined, size: string | null | undefined): string[] {
  const c = colour || '', s = size || '';
  const keys = [c && s ? `${c}/${s}` : '', c ? `${c}/*` : '', s ? `*/${s}` : '', '*'];
  if (!c && !s) keys.unshift('*/*');
  return [...new Set(keys.filter(Boolean))];
}

export function resolveVariant(route: Route, colour: string | null | undefined, size: string | null | undefined): VariantRef {
  for (const k of variantKeys(colour, size)) {
    const v = route.variants[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

export const variantId = (v: VariantRef): string | number | null => (v === null ? null : typeof v === 'object' ? v.id : v);
export const variantAttributes = (v: VariantRef): Record<string, string> | undefined => (v && typeof v === 'object' ? v.attributes : undefined);

export function fulfilmentFor(productId: string, category: Category): ProductFulfilment {
  return FULFILMENT[productId] ?? { title: titleFromId(productId), routes: CATEGORY_DEFAULTS[category] ?? [] };
}

export function titleFromId(id: string): string {
  return `${BRAND_NAME} ${id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
}

/** A route is usable for a variant when its provider is switched on and the variant (or the Printify product) is mapped. */
export function routeReady(route: Route, colour: string | null | undefined, size: string | null | undefined): boolean {
  if (variantId(resolveVariant(route, colour, size)) === null) return false;
  if (route.provider === 'printify') return !!(route.printify?.productId || (route.printify?.blueprintId && route.printify?.printProviderId && route.files.length));
  if (route.provider === 'printful' || route.provider === 'gelato' || route.provider === 'prodigi') return route.files.length > 0;
  return false;
}

/** Ready routes for one variant, in priority order, limited to the providers that are switched on. */
export function readyRoutes(f: ProductFulfilment, colour: string | null | undefined, size: string | null | undefined, enabled: ReadonlySet<ProviderId>): Route[] {
  return f.routes.filter(r => enabled.has(r.provider) && routeReady(r, colour, size));
}

/* ======================================================================== shipping */

export type ZoneId = 'eu' | 'europe' | 'world';
export interface ShippingZone {
  id: ZoneId;
  label: string;
  countries: string[];
  /** Flat rate in euro cents (VAT incl.). */
  cents: number;
  /** Free shipping from this subtotal (cents), null = never free. */
  freeOverCents: number | null;
  /** Business days, production + transit. */
  days: [number, number];
}

const EU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];

/** Flat shipping by zone (edit freely). Live provider rates can replace the flat price: MERCH_LIVE_SHIPPING=1. */
export const SHIPPING_ZONES: ShippingZone[] = [
  { id: 'eu', label: 'EU', countries: EU, cents: 590, freeOverCents: 7500, days: [5, 10] },
  { id: 'europe', label: 'UK, Switzerland, Norway, Iceland', countries: ['GB', 'CH', 'NO', 'IS', 'LI'], cents: 990, freeOverCents: 12000, days: [6, 12] },
  { id: 'world', label: 'USA, Canada, Australia, New Zealand', countries: ['US', 'CA', 'AU', 'NZ'], cents: 1490, freeOverCents: null, days: [7, 15] },
];

export function zoneFor(country: string | null | undefined, zones: ShippingZone[] = SHIPPING_ZONES): ShippingZone | null {
  const c = (country ?? '').toUpperCase();
  return zones.find(z => z.countries.includes(c)) ?? null;
}

export function shippingCents(zone: ShippingZone, subtotalCents: number): number {
  return zone.freeOverCents !== null && subtotalCents >= zone.freeOverCents ? 0 : zone.cents;
}
