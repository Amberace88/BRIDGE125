import { productById, type ColourId } from './catalog';
import { variantKey } from './fulfillment';
import { getSupabase } from '../supabase';

/**
 * Merch checkout contract (store UI ⇄ fulfilment). The store screen builds a cart and calls `startMerchCheckout`;
 * the fulfilment layer (worker/merch*.ts + Stripe + Printful / Gelato / Prodigi / Printify) implements it.
 *
 *  - Prices come from the server's catalogue, never from the cart.
 *  - Guests can buy (Stripe collects the email); a signed-in player's order also shows in Profile → My orders.
 *  - `country` (ISO-2, optional) picks the shipping zone; Stripe then only offers that zone's countries.
 *    Without it the EU zone is used.
 *  - After paying, Stripe returns to /merch?order=success&sid=<session> (cancel: /merch?order=cancel);
 *    `orderStatusBySession(sid)` in ./orders.ts reads the order for the thank-you view.
 */
export interface CartItem { productId: string; colour: ColourId | null; size: string | null; qty: number }

export type CheckoutError = 'auth' | 'unavailable' | 'invalid' | 'network' | 'consent' | 'region';
export type CheckoutResult = { ok: true; url: string } | { ok: false; error: CheckoutError };

export interface MerchZone { id: 'eu' | 'europe' | 'world'; countries: string[]; cents: number; freeOverCents: number | null; days: [number, number] }
export interface MerchStatus {
  enabled: boolean;
  providers: string[];
  /** productId → purchasable variant keys ("ink/L", "white/*" …). */
  sellable: Record<string, string[]>;
  zones: MerchZone[];
}

const OFF: MerchStatus = { enabled: false, providers: [], sellable: {}, zones: [] };
let statusP: Promise<MerchStatus> | null = null;
let statusAt = 0;

/** GET /api/merch/status (cached for a minute). */
export function merchStatus(force = false): Promise<MerchStatus> {
  if (force || !statusP || Date.now() - statusAt > 60_000) {
    statusAt = Date.now();
    statusP = fetch('/api/merch/status', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() as Promise<MerchStatus> : OFF))
      .then(j => ({ ...OFF, ...j, sellable: j.sellable ?? {}, zones: j.zones ?? [] }))
      .catch(() => { statusP = null; return OFF; });
  }
  return statusP;
}

/** Can this exact variant be ordered right now? */
export function isSellable(st: MerchStatus, item: Pick<CartItem, 'productId' | 'colour' | 'size'>): boolean {
  if (!st.enabled) return false;
  const p = productById(item.productId);
  const colour = item.colour ?? p?.colours[0]?.id ?? null;
  return (st.sellable[item.productId] ?? []).includes(variantKey(colour, item.size));
}

/**
 * True when real orders can be placed: Stripe + at least one print provider configured on the server (and, when
 * `items` is given, every item mapped to a configured provider).
 */
export async function merchCheckoutAvailable(items?: CartItem[]): Promise<boolean> {
  const st = await merchStatus();
  if (!st.enabled) return false;
  if (!items) return Object.keys(st.sellable).length > 0;
  return items.length > 0 && items.every(i => isSellable(st, i));
}

async function accessToken(): Promise<string | null> {
  try {
    const sb = await getSupabase();
    const { data } = sb ? await sb.auth.getSession() : { data: null };
    return data?.session?.access_token ?? null;
  } catch { return null; }
}

/** Start a Stripe Checkout for the cart; resolves to the URL to redirect to. */
export async function startMerchCheckout(items: CartItem[], opts: { lang: string; consent: boolean; country?: string }): Promise<CheckoutResult> {
  if (!opts.consent) return { ok: false, error: 'consent' };
  if (!items.length) return { ok: false, error: 'invalid' };
  try {
    const token = await accessToken();
    const r = await fetch('/api/merch/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        items: items.map(i => ({ productId: i.productId, colour: i.colour, size: i.size, qty: i.qty })),
        lang: opts.lang, consent: true, ...(opts.country ? { country: opts.country } : {}),
      }),
    });
    const j = await r.json().catch(() => ({})) as { url?: string; error?: string };
    if (r.ok && j.url && /^https:\/\/checkout\.stripe\.com\//.test(j.url)) return { ok: true, url: j.url };
    if (r.status === 401) return { ok: false, error: 'auth' };
    if (j.error === 'consent') return { ok: false, error: 'consent' };
    if (j.error === 'region') return { ok: false, error: 'region' };
    if (j.error === 'invalid') return { ok: false, error: 'invalid' };
    return { ok: false, error: 'unavailable' };
  } catch {
    return { ok: false, error: 'network' };
  }
}
