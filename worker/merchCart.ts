/**
 * Server-side cart: validated against src/merch/catalog.ts (prices are NEVER taken from the client), routed with
 * src/merch/fulfillment.ts, and carried through Stripe Checkout metadata in a compact form.
 */
import { PRODUCTS, priceFor, type ColourId, type Product } from '../src/merch/catalog';
import { type ProviderId, type Route, fulfilmentFor, readyRoutes, variantKey } from '../src/merch/fulfillment';

export const MAX_LINES = 20;
export const MAX_QTY_PER_LINE = 10;
export const MAX_ITEMS = 30;

export interface PricedLine {
  product: Product;
  productId: string;
  colour: ColourId | null;
  size: string | null;
  qty: number;
  unitCents: number;
  title: string;
}

export type CartCheck = { ok: true; lines: PricedLine[]; subtotalCents: number } | { ok: false; error: 'invalid'; detail: string };

const ID_RE = /^[a-z0-9-]{2,40}$/;

export function validateCart(raw: unknown, products: Product[] = PRODUCTS): CartCheck {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: 'invalid', detail: 'empty cart' };
  if (raw.length > MAX_LINES) return { ok: false, error: 'invalid', detail: 'too many lines' };
  const merged = new Map<string, PricedLine>();
  for (const it of raw) {
    if (!it || typeof it !== 'object') return { ok: false, error: 'invalid', detail: 'bad line' };
    const { productId, colour, size, qty } = it as Record<string, unknown>;
    if (typeof productId !== 'string' || !ID_RE.test(productId)) return { ok: false, error: 'invalid', detail: 'bad product id' };
    const product = products.find(p => p.id === productId);
    if (!product) return { ok: false, error: 'invalid', detail: `unknown product ${productId}` };
    if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) return { ok: false, error: 'invalid', detail: 'bad quantity' };

    let c: ColourId | null = null;
    if (colour === null || colour === undefined || colour === '') {
      if (product.colours.length > 1) return { ok: false, error: 'invalid', detail: `${productId}: colour required` };
      c = product.colours[0]?.id ?? null;
    } else {
      const hit = product.colours.find(x => x.id === colour);
      if (!hit) return { ok: false, error: 'invalid', detail: `${productId}: unknown colour` };
      c = hit.id;
    }
    let s: string | null = null;
    if (product.sizes?.length) {
      const hit = typeof size === 'string' ? product.sizes.find(x => x.id === size) : undefined;
      if (!hit) return { ok: false, error: 'invalid', detail: `${productId}: size required` };
      s = hit.id;
    } else if (size !== null && size !== undefined && size !== '') {
      return { ok: false, error: 'invalid', detail: `${productId}: has no sizes` };
    }

    const unitCents = Math.round(priceFor(product, s) * 100);
    if (!Number.isFinite(unitCents) || unitCents <= 0) return { ok: false, error: 'invalid', detail: `${productId}: no price` };
    const key = `${productId}|${c ?? ''}|${s ?? ''}`;
    const prev = merged.get(key);
    if (prev) prev.qty += qty;
    else merged.set(key, { product, productId, colour: c, size: s, qty, unitCents, title: fulfilmentFor(productId, product.category).title });
  }
  const lines = [...merged.values()];
  if (lines.some(l => l.qty > MAX_QTY_PER_LINE)) return { ok: false, error: 'invalid', detail: 'bad quantity' };
  if (lines.reduce((a, l) => a + l.qty, 0) > MAX_ITEMS) return { ok: false, error: 'invalid', detail: 'too many items' };
  return { ok: true, lines, subtotalCents: lines.reduce((a, l) => a + l.qty * l.unitCents, 0) };
}

/** The ready routes for one line, in priority order (empty = cannot be fulfilled right now). */
export function lineRoutes(line: Pick<PricedLine, 'product' | 'colour' | 'size'>, enabled: ReadonlySet<ProviderId>): Route[] {
  return readyRoutes(fulfilmentFor(line.product.id, line.product.category), line.colour, line.size, enabled);
}

/** Every purchasable variant key per product ("ink/L", "white/*" …) for the store UI. */
export function sellableMap(enabled: ReadonlySet<ProviderId>, products: Product[] = PRODUCTS): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const p of products) {
    const keys: string[] = [];
    const sizes = p.sizes?.length ? p.sizes.map(s => s.id) : [null];
    for (const c of p.colours) for (const s of sizes) {
      if (lineRoutes({ product: p, colour: c.id, size: s }, enabled).length) keys.push(variantKey(c.id, s));
    }
    if (keys.length) out[p.id] = keys;
  }
  return out;
}

/* ---------------------------------------------------------------- Stripe metadata (values ≤ 500 chars, ≤ 50 keys) */

const META_CHUNK = 480;

export function encodeCart(lines: Pick<PricedLine, 'productId' | 'colour' | 'size' | 'qty' | 'unitCents'>[]): Record<string, string> {
  const parts = lines.map(l => [l.productId, l.colour ?? '-', l.size ?? '-', l.qty, l.unitCents].join('|'));
  const out: Record<string, string> = {};
  let cur = '', n = 0;
  for (const p of parts) {
    if (cur && cur.length + 1 + p.length > META_CHUNK) { out[`cart${n++}`] = cur; cur = ''; }
    cur = cur ? `${cur};${p}` : p;
  }
  if (cur) out[`cart${n}`] = cur;
  return out;
}

export interface DecodedLine { productId: string; colour: string | null; size: string | null; qty: number; unitCents: number }

export function decodeCart(meta: Record<string, string | undefined>): DecodedLine[] | null {
  const chunks: string[] = [];
  for (let i = 0; i < 20 && meta[`cart${i}`]; i++) chunks.push(meta[`cart${i}`]!);
  if (!chunks.length) return null;
  const out: DecodedLine[] = [];
  for (const p of chunks.join(';').split(';')) {
    const [productId, colour, size, qty, unit] = p.split('|');
    const q = Number(qty), u = Number(unit);
    if (!productId || !ID_RE.test(productId) || !Number.isInteger(q) || q < 1 || !Number.isInteger(u) || u < 0) return null;
    out.push({ productId, colour: colour && colour !== '-' ? colour : null, size: size && size !== '-' ? size : null, qty: q, unitCents: u });
  }
  return out;
}
