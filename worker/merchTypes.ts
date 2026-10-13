/**
 * Shared types + tiny helpers for the merch fulfilment Worker modules (worker/merch*.ts).
 * No Workers-only globals here (no ExecutionContext / Fetcher types): these files are also imported by Node tests
 * and type-checked by the app tsconfig through worker/pay.ts.
 */
import type { PayEnv } from './pay';
import type { ProviderId, Route, VariantRef } from '../src/merch/fulfillment';

export interface MerchEnv extends PayEnv {
  /** Static assets binding (print files are published under /print/<hash>/… by scripts/merch/print-assets.mjs). */
  ASSETS?: { fetch(input: Request | string): Promise<Response> };

  /** Printful: a token created for the "Bridge 125" store (Developers → Your tokens → store-level access). */
  PRINTFUL_TOKEN?: string;
  PRINTFUL_STORE_ID?: string;
  /** Optional: the `secret_key` Printful returns when the v2 webhook is created — enables signature checks. */
  PRINTFUL_WEBHOOK_SECRET?: string;
  /** Gelato: API key of the Bridge 125 Gelato account (or store). */
  GELATO_API_KEY?: string;
  GELATO_STORE_ID?: string;
  /** Prodigi: API key of the Bridge 125 Prodigi account. "1" in PRODIGI_SANDBOX = sandbox API. */
  PRODIGI_API_KEY?: string;
  PRODIGI_SANDBOX?: string;
  /** Printify: personal access token + the id of the "Bridge 125" shop. */
  PRINTIFY_TOKEN?: string;
  PRINTIFY_SHOP_ID?: string;

  /** Optional: signing secret of a separate Stripe endpoint for /api/merch/webhook (default: STRIPE_WEBHOOK_SECRET). */
  STRIPE_MERCH_WEBHOOK_SECRET?: string;
  /** Optional: secret for the provider callback URLs (default: derived from SUPABASE_SERVICE_ROLE_KEY). */
  MERCH_HOOK_SECRET?: string;

  /** Public vars (wrangler.jsonc) */
  MERCH_LIVE_SHIPPING?: string;     // "1" = quote live rates (Printful / Prodigi), flat zone rate as fallback
  MERCH_DRAFT_ORDERS?: string;      // "1" = create provider orders as drafts / do not send to production (testing)
  MERCH_COUNTRIES?: string;         // optional allow-list "LV,LT,EE,ES,…" (subset of the shipping zones)
  MERCH_PRINT_BASE_URL?: string;    // optional: print files from another public host (e.g. a Supabase Storage bucket)
  MERCH_CONTACT_EMAIL?: string;     // shown on packing slips (default hello@bridge125.com)
  MERCH_RETURN_ADDRESS?: string;    // optional JSON {"companyName","addressLine1","city","postCode","country",…}
}

export type FStatus =
  | 'queued' | 'submitting' | 'submitted' | 'in_production' | 'partially_shipped' | 'shipped' | 'delivered'
  | 'failed' | 'canceled' | 'manual';

export interface Tracking { carrier: string | null; number: string | null; url: string | null; shippedAt: string | null; deliveredAt?: string | null }

export interface ShipTo {
  name: string; firstName: string; lastName: string;
  line1: string; line2: string | null; city: string; state: string | null; postalCode: string; country: string;
  email: string; phone: string | null;
}

export interface FulfilLine {
  productId: string;
  title: string;
  colour: string | null;
  size: string | null;
  qty: number;
  unitCents: number;
  route: Route;
  variant: VariantRef;
  files: { area: string; url: string; technique?: string }[];
}

export interface FulfilRequest {
  provider: ProviderId;
  externalId: string;
  orderId: string;
  shortId: string;
  currency: 'EUR';
  lines: FulfilLine[];
  shipTo: ShipTo;
  totals: { subtotalCents: number; shippingCents: number; taxCents: number; totalCents: number };
  draft: boolean;
  /** Provider callback URL (Prodigi takes one per order). */
  callbackUrl: string;
  contactEmail: string;
  returnAddress: Record<string, string> | null;
}

export type CreateResult =
  | { ok: true; providerOrderId: string; status: FStatus }
  | { ok: false; retry: boolean; error: string };

export interface Snapshot { status: FStatus; tracking: Tracking[]; providerStatus: string; attention: string | null }

export interface StoreInfo { id: string; name: string }
export interface IdentityProbe { stores?: StoreInfo[]; foreignRefs?: string[]; error?: string }

export interface HttpResult { ok: boolean; status: number; json: unknown; text: string }

/** fetch with a timeout; never throws (status 0 = network error / timeout). */
export async function http(url: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<HttpResult> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal });
    const text = await r.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    return { ok: r.ok, status: r.status, json, text };
  } catch (e) {
    return { ok: false, status: 0, json: null, text: (e as Error)?.message ?? 'network' };
  } finally { clearTimeout(timer); }
}

/** 0 (network/timeout), 408, 425, 429, 5xx → try again later; other 4xx → the request itself is wrong. */
export const retryable = (status: number) => status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;

export function errText(r: HttpResult, max = 300): string {
  const j = r.json as Record<string, unknown> | null;
  const pick = (v: unknown): string | null => (typeof v === 'string' ? v : v && typeof v === 'object' ? JSON.stringify(v) : null);
  const msg = pick(j?.error) ?? pick(j?.message) ?? pick(j?.errors) ?? pick(j?.statusTxt) ?? r.text;
  return `HTTP ${r.status}: ${(msg ?? '').slice(0, max)}`;
}

export const cents = (c: number) => (Math.round(c) / 100).toFixed(2);

export function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
}
export function arr(v: unknown): unknown[] { return Array.isArray(v) ? v : []; }
export const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : typeof v === 'number' ? String(v) : null);

const enc = new TextEncoder();
export async function hmacHex(key: string | Uint8Array, payload: string): Promise<string> {
  const raw = typeof key === 'string' ? enc.encode(key) : key;
  const k = await crypto.subtle.importKey('raw', raw as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(payload)));
  let hex = '';
  for (const b of sig) hex += b.toString(16).padStart(2, '0');
  return hex;
}
export function hexToBytes(hex: string): Uint8Array | null {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/**
 * Secret token for a provider's callback URL (/api/merch/hooks/<provider>?t=…) and the Printify webhook secret.
 * MERCH_HOOK_SECRET if set, otherwise derived from the service-role key (it only ever goes to that provider).
 */
export async function hookToken(env: MerchEnv, provider: string): Promise<string> {
  const base = env.MERCH_HOOK_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!base) return '';
  return (await hmacHex(base, `b125-merch-hook:${provider}`)).slice(0, 40);
}
