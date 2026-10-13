import { useSyncExternalStore } from 'react';
import { PRODUCTS, priceFor, type ColourId, type Product } from './catalog';
import type { CartItem } from './checkout';
import { FREE_SHIPPING_EUR, MERCH_MAX_LINES, MERCH_MAX_QTY } from './config';

/**
 * Merch cart — persisted per device in localStorage, shared across tabs (storage event), validated against the
 * catalogue on every load (unknown products / colours / sizes are dropped, quantities clamped). Prices are never
 * stored: they are always recomputed from the catalogue, and the server reprices again at checkout.
 */
export interface CartLine extends CartItem { key: string }

export const CART_KEY = 'b125.merch.cart.v1';

export const lineKey = (productId: string, colour: ColourId | null, size: string | null) => `${productId}|${colour ?? ''}|${size ?? ''}`;

const clampQty = (n: unknown) => Math.max(1, Math.min(MERCH_MAX_QTY, Math.floor(Number(n)) || 1));

/** Keep only lines that still exist in the catalogue; normalise colour (single-colour products) and quantities. */
export function sanitize(raw: unknown, products: readonly Product[] = PRODUCTS): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out = new Map<string, CartLine>();
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const { productId, colour, size, qty } = r as Partial<CartItem>;
    const p = products.find(x => x.id === productId);
    if (!p) continue;
    const col = p.colours.find(x => x.id === colour)?.id ?? (p.colours.length === 1 ? p.colours[0].id : null);
    if (!col) continue;
    let sz: string | null = null;
    if (p.sizes?.length) {
      sz = p.sizes.find(s => s.id === size)?.id ?? null;
      if (!sz) continue;
    }
    const key = lineKey(p.id, col, sz);
    const prev = out.get(key);
    out.set(key, { key, productId: p.id, colour: col, size: sz, qty: clampQty((prev?.qty ?? 0) + clampQty(qty)) });
    if (out.size >= MERCH_MAX_LINES) break;
  }
  return [...out.values()];
}

// ------------------------------------------------------------------------------------------------ store
type Listener = () => void;
const listeners = new Set<Listener>();
let lines: CartLine[] | null = null;

function read(): CartLine[] {
  try { return sanitize(JSON.parse(localStorage.getItem(CART_KEY) ?? '[]')); } catch { return []; }
}
function current(): CartLine[] {
  if (lines === null) lines = read();
  return lines;
}
function commit(next: CartLine[]) {
  lines = next;
  try {
    if (next.length) localStorage.setItem(CART_KEY, JSON.stringify(next.map(({ productId, colour, size, qty }) => ({ productId, colour, size, qty }))));
    else localStorage.removeItem(CART_KEY);
  } catch { /* private mode: the cart still works for this visit */ }
  for (const l of listeners) l();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => { if (e.key === CART_KEY) { lines = read(); for (const l of listeners) l(); } });
}

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }

/** React hook: the cart lines (re-renders on every change, also from other tabs). */
export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, current, () => EMPTY);
}
const EMPTY: CartLine[] = [];

export function getCart(): CartLine[] { return current(); }

/** Add (or increase) a variant; returns the line's new quantity. */
export function addToCart(item: Omit<CartItem, 'qty'> & { qty?: number }): number {
  const key = lineKey(item.productId, item.colour, item.size);
  const now = current();
  const prev = now.find(l => l.key === key);
  const qty = clampQty((prev?.qty ?? 0) + (item.qty ?? 1));
  const next = prev ? now.map(l => (l.key === key ? { ...l, qty } : l))
    : sanitize([...now, { productId: item.productId, colour: item.colour, size: item.size, qty }]);
  commit(next);
  return next.find(l => l.key === key)?.qty ?? 0;
}

export function setQty(key: string, qty: number) {
  commit(qty <= 0 ? current().filter(l => l.key !== key) : current().map(l => (l.key === key ? { ...l, qty: clampQty(qty) } : l)));
}
export function removeLine(key: string) { commit(current().filter(l => l.key !== key)); }
export function clearCart() { commit([]); }

// ------------------------------------------------------------------------------------------------ totals
export const cartCount = (ls: readonly CartLine[]) => ls.reduce((n, l) => n + l.qty, 0);

export function lineTotal(l: CartItem, products: readonly Product[] = PRODUCTS): number {
  const p = products.find(x => x.id === l.productId);
  return p ? priceFor(p, l.size, l.colour) * l.qty : 0;
}
export const cartSubtotal = (ls: readonly CartItem[], products: readonly Product[] = PRODUCTS) =>
  Math.round(ls.reduce((s, l) => s + lineTotal(l, products), 0) * 100) / 100;

/** EUR still missing for free shipping (0 = reached). */
export const freeShippingLeft = (subtotal: number) => Math.max(0, Math.round((FREE_SHIPPING_EUR - subtotal) * 100) / 100);

/** What the checkout endpoint receives (no keys, no prices). */
export const toCheckoutItems = (ls: readonly CartLine[]): CartItem[] => ls.map(({ productId, colour, size, qty }) => ({ productId, colour, size, qty }));

/** Tests only: forget the in-memory copy. */
export function _resetCartMemory() { lines = null; }
