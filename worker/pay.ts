/**
 * Payments (Diamonds via Stripe Checkout) + small Supabase REST helpers shared with the Room.
 *
 *   GET  /api/pay/status    → { enabled }                       (UI shows "Payments coming soon" when false)
 *   POST /api/pay/checkout  → { url }  (Authorization: Bearer <Supabase access token>, body { pack, lang, consent: true })
 *   POST /api/pay/webhook   ← Stripe   (signature verified, credits Diamonds idempotently)
 *
 * No secret lives in the repo. Secrets (set with `wrangler secret put` — see docs/PAYMENTS.md):
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
 * Public vars (wrangler.jsonc): SUPABASE_URL, SUPABASE_ANON_KEY, PUBLIC_ORIGIN, STRIPE_AUTOMATIC_TAX.
 * While any secret is missing every payment endpoint answers 503 and nothing is charged.
 *
 * This file has no Workers-only imports so the signature check is unit-tested in Node (src/social/social.test.ts).
 */
import { diamondPack } from '../src/social/gifts';

export interface PayEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  /** e.g. https://bridge125.com — used for Checkout return URLs (falls back to the request origin). */
  PUBLIC_ORIGIN?: string;
  /** "1" = let Stripe Tax calculate VAT (requires Stripe Tax to be activated in the dashboard). */
  STRIPE_AUTOMATIC_TAX?: string;
}

/** Tolerance for the Stripe-Signature timestamp (Stripe's default is 5 minutes). */
export const SIGNATURE_TOLERANCE_S = 300;

const enc = new TextEncoder();

/* ================================================================ Stripe signature (Web Crypto HMAC-SHA256) */

export function parseStripeSignature(header: string | null): { t: number; v1: string[] } | null {
  if (!header) return null;
  let t = NaN; const v1: string[] = [];
  for (const part of header.split(',')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k === 't') t = Number(v);
    else if (k === 'v1' && /^[0-9a-f]{64}$/i.test(v)) v1.push(v.toLowerCase());
  }
  return Number.isFinite(t) && v1.length ? { t, v1 } : null;
}

/** Constant-time comparison of two equal-length hex strings (no early exit). */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
  let hex = '';
  for (const b of sig) hex += b.toString(16).padStart(2, '0');
  return hex;
}

export type SigResult = 'ok' | 'missing' | 'malformed' | 'stale' | 'mismatch';

/**
 * Verify a Stripe webhook: signed payload is `${t}.${rawBody}`, HMAC-SHA256 with the endpoint secret (whsec_…),
 * any `v1` may match (Stripe sends several while a secret is being rolled). Rejects timestamps outside the tolerance.
 */
export async function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowS = Math.floor(Date.now() / 1000), toleranceS = SIGNATURE_TOLERANCE_S): Promise<SigResult> {
  if (!header) return 'missing';
  const p = parseStripeSignature(header);
  if (!p) return 'malformed';
  if (Math.abs(nowS - p.t) > toleranceS) return 'stale';
  const expected = await hmacSha256Hex(secret, `${p.t}.${rawBody}`);
  let ok = false;
  for (const v of p.v1) ok = timingSafeEqualHex(expected, v) || ok;   // check all, no short-circuit
  return ok ? 'ok' : 'mismatch';
}

/* ================================================================ Supabase REST */

/** Headers for a Supabase REST call. New-style keys (sb_publishable_/sb_secret_) go in `apikey` only; legacy JWT keys also as Bearer. */
export function supaHeaders(key: string, userToken?: string | null): Record<string, string> {
  const h: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' };
  if (userToken) h.Authorization = `Bearer ${userToken}`;
  else if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
  return h;
}

export interface AuthUser { id: string; email?: string }
const userCache = new Map<string, { u: AuthUser; until: number }>();

/** Resolve a Supabase access token to its user (cached 5 min). null = invalid / Supabase not configured. */
export async function userFromToken(env: PayEnv, token: unknown): Promise<AuthUser | null> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096 || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const now = Date.now();
  const hit = userCache.get(token);
  if (hit && hit.until > now) return hit.u;
  try {
    const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: supaHeaders(env.SUPABASE_ANON_KEY, token) });
    if (!r.ok) return null;
    const j = await r.json() as { id?: string; email?: string };
    if (!j.id || !/^[0-9a-f-]{36}$/i.test(j.id)) return null;
    const u = { id: j.id, email: j.email };
    if (userCache.size > 1000) userCache.clear();
    userCache.set(token, { u, until: now + 5 * 60_000 });
    return u;
  } catch { return null; }
}

/** Call a Postgres function through PostgREST, as the user (token) or as service_role (`service: true`). */
export async function supaRpc<T = unknown>(env: PayEnv, fn: string, args: Record<string, unknown>, as: { token?: string | null; service?: boolean }): Promise<{ ok: boolean; status: number; data: T | null }> {
  const key = as.service ? env.SUPABASE_SERVICE_ROLE_KEY : env.SUPABASE_ANON_KEY;
  if (!env.SUPABASE_URL || !key) return { ok: false, status: 503, data: null };
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST', headers: supaHeaders(key, as.service ? null : as.token), body: JSON.stringify(args),
    });
    const data = await r.json().catch(() => null) as T | null;
    return { ok: r.ok, status: r.status, data };
  } catch { return { ok: false, status: 502, data: null }; }
}

/* ================================================================ endpoints */

export const paymentsEnabled = (env: PayEnv) =>
  !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_URL && env.SUPABASE_ANON_KEY);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const LOCALES = new Set(['en', 'lv', 'lt', 'et', 'ru', 'pl', 'de', 'es', 'ro', 'bg']);   // Stripe Checkout locales we use

/** Stripe wants application/x-www-form-urlencoded with bracketed keys. */
function form(obj: Record<string, string | number | undefined>): string {
  return Object.entries(obj).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

async function checkout(req: Request, env: PayEnv): Promise<Response> {
  if (!paymentsEnabled(env)) return json({ error: 'unavailable' }, 503);
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const user = await userFromToken(env, token);
  if (!user) return json({ error: 'auth' }, 401);
  let body: { pack?: unknown; lang?: unknown; consent?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'bad' }, 400); }
  const pack = typeof body.pack === 'string' ? diamondPack(body.pack) : undefined;
  if (!pack) return json({ error: 'unknown' }, 400);
  // EU digital content: no delivery without the express waiver of the 14-day withdrawal right (Directive 2011/83/EU art. 16(m))
  if (body.consent !== true) return json({ error: 'consent' }, 400);
  const waiver = new Date().toISOString();
  const waiverText = 'Delivered immediately: you asked for immediate delivery and acknowledged that your 14-day right of withdrawal ends once delivery starts. Terms: ';
  const reqOrigin = new URL(req.url);
  const local = reqOrigin.hostname === 'localhost' || reqOrigin.hostname === '127.0.0.1';
  const origin = (!local && env.PUBLIC_ORIGIN) || reqOrigin.origin;
  const lang = typeof body.lang === 'string' && LOCALES.has(body.lang) ? body.lang : 'auto';
  const name = `${pack.diamonds.toLocaleString('en-US')} Diamonds`;
  const params: Record<string, string | number | undefined> = {
    mode: 'payment',
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': pack.cents,
    'line_items[0][price_data][tax_behavior]': 'inclusive',      // prices shown to players include VAT
    'line_items[0][price_data][product_data][name]': name,
    'line_items[0][price_data][product_data][description]': 'Bridge 125 premium currency for table gifts and gifting styles. Delivered instantly.',
    'line_items[0][price_data][product_data][metadata][pack]': pack.id,
    client_reference_id: user.id,
    customer_email: user.email,
    'metadata[uid]': user.id,
    'metadata[pack]': pack.id,
    'payment_intent_data[metadata][uid]': user.id,
    'payment_intent_data[metadata][pack]': pack.id,
    // consent record, kept with the order and repeated on the payment (receipt description + checkout page)
    'metadata[withdrawal_waiver]': waiver,
    'payment_intent_data[metadata][withdrawal_waiver]': waiver,
    'payment_intent_data[description]': `Bridge 125 — ${name}. ${waiverText}${origin}/terms`,
    'custom_text[submit][message]': `${waiverText}${origin}/terms`,
    success_url: `${origin}/?pay=ok&sid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?pay=cancel`,
    locale: lang,
    'automatic_tax[enabled]': env.STRIPE_AUTOMATIC_TAX === '1' ? 'true' : undefined,
  };
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': crypto.randomUUID() },
    body: form(params),
  });
  const j = await r.json().catch(() => null) as { url?: string; id?: string; error?: { message?: string } } | null;
  if (!r.ok || !j?.url) return json({ error: 'stripe', message: j?.error?.message?.slice(0, 200) }, 502);
  return json({ url: j.url, id: j.id });
}

interface StripeEvent { id: string; type: string; data: { object: Record<string, unknown> } }

async function webhook(req: Request, env: PayEnv): Promise<Response> {
  if (!paymentsEnabled(env)) return json({ error: 'unavailable' }, 503);
  const raw = await req.text();
  const sig = await verifyStripeSignature(raw, req.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET!);
  if (sig !== 'ok') return json({ error: 'signature', reason: sig }, 400);
  let ev: StripeEvent;
  try { ev = JSON.parse(raw); } catch { return json({ error: 'bad' }, 400); }
  const o = ev.data?.object ?? {};
  const meta = (o.metadata ?? {}) as Record<string, string>;

  if (ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') {
    if (o.payment_status !== 'paid') return json({ received: true, pending: true });   // async methods: wait for *_succeeded
    const uid = meta.uid || (o.client_reference_id as string);
    const r = await supaRpc<{ ok?: boolean; error?: string }>(env, 'credit_diamonds', {
      p_session: o.id, p_intent: o.payment_intent ?? null, p_event: ev.id, p_user: uid, p_pack: meta.pack,
      p_amount_cents: o.amount_total, p_currency: o.currency,
    }, { service: true });
    // 5xx → Stripe retries (credit is idempotent on the session id); a logical rejection is acknowledged and logged.
    if (!r.ok) return json({ error: 'credit', status: r.status }, 500);
    if (r.data && r.data.ok === false) console.warn('credit_diamonds rejected', ev.id, r.data.error);
    return json({ received: true });
  }
  if (ev.type === 'charge.refunded' && o.refunded === true && typeof o.payment_intent === 'string') {
    const r = await supaRpc(env, 'refund_payment', { p_intent: o.payment_intent, p_event: ev.id }, { service: true });
    if (!r.ok) return json({ error: 'refund', status: r.status }, 500);
    return json({ received: true });
  }
  return json({ received: true, ignored: ev.type });
}

/** Routes /api/pay/*. Returns null for other paths. */
export async function handlePay(req: Request, env: PayEnv): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  if (path === '/api/pay/status') return json({ enabled: paymentsEnabled(env) });
  if (path === '/api/pay/checkout') return req.method === 'POST' ? checkout(req, env) : json({ error: 'method' }, 405);
  if (path === '/api/pay/webhook') return req.method === 'POST' ? webhook(req, env) : json({ error: 'method' }, 405);
  return null;
}
