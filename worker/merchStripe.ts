/**
 * Merch Stripe Checkout:
 *   POST /api/merch/checkout   cart → Checkout Session (server prices, shipping zone, address collection, tax flag)
 *   Stripe events with metadata.kind = "merch" (from /api/pay/webhook or /api/merch/webhook) → merch_orders row →
 *   provider orders (worker/merchFulfil.ts).
 */
import { BRAND, BRAND_NAME, type ProviderId, type ShippingZone, type ZoneId, SHIPPING_ZONES, resolveVariant, shippingCents, zoneFor } from '../src/merch/fulfillment';
import { userFromToken, paymentsEnabled, verifyStripeSignature } from './pay';
import { brandGuard } from './merchBrand';
import { type PricedLine, decodeCart, encodeCart, lineRoutes, validateCart } from './merchCart';
import { processQueue, routeItems } from './merchFulfil';
import { enabledProviders, PROVIDER_IMPLS } from './merchProviders';
import { firstTime, markRefunded, recordOrder } from './merchStore';
import { type FulfilLine, type MerchEnv, obj, str } from './merchTypes';

export interface WaitUntil { waitUntil(p: Promise<unknown>): void }

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Stripe + Supabase service key + at least one provider. */
export const merchEnabled = (env: MerchEnv) => paymentsEnabled(env) && enabledProviders(env).size > 0;

const LOCALES = new Set(['en', 'lv', 'lt', 'et', 'ru', 'pl', 'de', 'es', 'ro', 'bg', 'fr', 'it', 'nl', 'fi', 'sv']);

/** Zones limited to the optional MERCH_COUNTRIES allow-list. */
export function activeZones(env: MerchEnv): ShippingZone[] {
  const allow = (env.MERCH_COUNTRIES ?? '').split(',').map(s => s.trim().toUpperCase()).filter(s => /^[A-Z]{2}$/.test(s));
  if (!allow.length) return SHIPPING_ZONES;
  return SHIPPING_ZONES.map(z => ({ ...z, countries: z.countries.filter(c => allow.includes(c)) })).filter(z => z.countries.length);
}

/** Stripe wants application/x-www-form-urlencoded with bracketed keys. */
export function form(obj: Record<string, string | number | boolean | undefined | null>): string {
  return Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

/** Pure: the Stripe Checkout Session parameters for a validated cart (unit-tested). */
export function checkoutParams(o: {
  lines: PricedLine[]; subtotalCents: number; zone: ShippingZone; shipCents: number; origin: string; lang: string;
  user: { id: string; email?: string } | null; automaticTax: boolean; imageOrigin: string | null;
}): Record<string, string | number | boolean | undefined> {
  const p: Record<string, string | number | boolean | undefined> = {
    mode: 'payment',
    currency: 'eur',
    locale: LOCALES.has(o.lang) ? o.lang : 'auto',
    success_url: `${o.origin}/merch?order=success&sid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${o.origin}/merch?order=cancel`,
    'phone_number_collection[enabled]': true,
    'billing_address_collection': 'auto',
    'automatic_tax[enabled]': o.automaticTax ? true : undefined,
    'custom_text[submit][message]': `Made to order for you by our print partner and shipped in ${o.zone.days[0]}–${o.zone.days[1]} business days. Terms: ${o.origin}/terms`,
    'payment_intent_data[description]': `${BRAND_NAME} merch`,
    'payment_intent_data[metadata][kind]': 'merch',
    'payment_intent_data[metadata][brand]': BRAND,
    'metadata[kind]': 'merch',
    'metadata[brand]': BRAND,
    'metadata[zone]': o.zone.id,
    'metadata[lang]': o.lang,
    'metadata[ship_cents]': o.shipCents,
  };
  if (o.user) {
    p.client_reference_id = o.user.id;
    p['metadata[uid]'] = o.user.id;
    p['payment_intent_data[metadata][uid]'] = o.user.id;
    if (o.user.email) p.customer_email = o.user.email;
  }
  for (const [k, v] of Object.entries(encodeCart(o.lines))) p[`metadata[${k}]`] = v;
  o.lines.forEach((l, i) => {
    const b = `line_items[${i}]`;
    p[`${b}[quantity]`] = l.qty;
    p[`${b}[price_data][currency]`] = 'eur';
    p[`${b}[price_data][unit_amount]`] = l.unitCents;
    p[`${b}[price_data][tax_behavior]`] = 'inclusive';
    p[`${b}[price_data][product_data][name]`] = l.title;
    const variant = [l.product.colours.length > 1 ? l.colour : null, l.size ? (l.product.sizes?.find(s => s.id === l.size)?.label ?? l.size) : null].filter(Boolean).join(' · ');
    if (variant) p[`${b}[price_data][product_data][description]`] = variant;
    p[`${b}[price_data][product_data][metadata][product]`] = l.productId;
    p[`${b}[price_data][product_data][metadata][variant]`] = `${l.colour ?? '*'}/${l.size ?? '*'}`;
    const img = l.product.colours.find(c => c.id === l.colour)?.images[0] ?? l.product.colours[0]?.images[0];
    if (img && o.imageOrigin) p[`${b}[price_data][product_data][images][0]`] = `${o.imageOrigin}${img}`;
  });
  o.zone.countries.forEach((c, i) => { p[`shipping_address_collection[allowed_countries][${i}]`] = c; });
  const s = 'shipping_options[0][shipping_rate_data]';
  p[`${s}[type]`] = 'fixed_amount';
  p[`${s}[fixed_amount][amount]`] = o.shipCents;
  p[`${s}[fixed_amount][currency]`] = 'eur';
  p[`${s}[display_name]`] = o.shipCents === 0 ? 'Free shipping' : `Standard shipping (${o.zone.label})`;
  p[`${s}[tax_behavior]`] = 'inclusive';
  p[`${s}[delivery_estimate][minimum][unit]`] = 'business_day';
  p[`${s}[delivery_estimate][minimum][value]`] = o.zone.days[0];
  p[`${s}[delivery_estimate][maximum][unit]`] = 'business_day';
  p[`${s}[delivery_estimate][maximum][value]`] = o.zone.days[1];
  return p;
}

/** Live shipping from the providers (sum per provider), or null → flat zone rate. */
async function liveShipping(env: MerchEnv, lines: PricedLine[], country: string, providerOf: (l: PricedLine) => ProviderId): Promise<number | null> {
  const groups = new Map<ProviderId, FulfilLine[]>();
  for (const l of lines) {
    const pid = providerOf(l);
    const route = lineRoutes(l, new Set([pid]))[0];
    if (!route) return null;
    const fl: FulfilLine = { productId: l.productId, title: l.title, colour: l.colour, size: l.size, qty: l.qty, unitCents: l.unitCents, route, variant: resolveVariant(route, l.colour, l.size), files: [] };
    groups.set(pid, [...(groups.get(pid) ?? []), fl]);
  }
  let total = 0;
  for (const [pid, fl] of groups) {
    const p = PROVIDER_IMPLS[pid];
    if (!p.shippingQuote) return null;
    const c = await p.shippingQuote(env, { country, lines: fl });
    if (c === null) return null;
    total += c;
  }
  return total;
}

export async function merchCheckout(req: Request, env: MerchEnv): Promise<Response> {
  if (!merchEnabled(env)) return json({ error: 'unavailable', reason: 'not_configured' }, 503);
  let body: { items?: unknown; lang?: unknown; consent?: unknown; country?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'invalid' }, 400); }
  if (body.consent !== true) return json({ error: 'consent' }, 400);

  const cart = validateCart(body.items);
  if (!cart.ok) return json({ error: 'invalid', detail: cart.detail }, 400);

  const zones = activeZones(env);
  const country = typeof body.country === 'string' && /^[A-Za-z]{2}$/.test(body.country) ? body.country.toUpperCase() : null;
  const zone = country ? zoneFor(country, zones) : (zones.find(z => z.id === 'eu') ?? zones[0] ?? null);
  if (!zone) return json({ error: 'region' }, 400);

  // every line needs a provider that is configured, mapped AND passes the brand guard — never take money we cannot fulfil
  const enabled = enabledProviders(env);
  const chosen = new Map<PricedLine, ProviderId>();
  for (const l of cart.lines) {
    let pick: ProviderId | null = null;
    for (const r of lineRoutes(l, enabled)) {
      const g = await brandGuard(env, r.provider);
      if (g.ok) { pick = r.provider; break; }
    }
    if (!pick) return json({ error: 'unavailable', reason: 'product', product: l.productId }, 409);
    chosen.set(l, pick);
  }

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const user = token ? await userFromToken(env, token) : null;
  if (token && !user) return json({ error: 'auth' }, 401);

  let shipCents = shippingCents(zone, cart.subtotalCents);
  if (shipCents > 0 && env.MERCH_LIVE_SHIPPING === '1' && country) {
    const live = await liveShipping(env, cart.lines, country, l => chosen.get(l)!).catch(() => null);
    if (live !== null) shipCents = live;
  }

  const reqUrl = new URL(req.url);
  const local = reqUrl.hostname === 'localhost' || reqUrl.hostname === '127.0.0.1';
  const origin = (!local && env.PUBLIC_ORIGIN) || reqUrl.origin;
  const lang = typeof body.lang === 'string' && /^[a-z]{2}$/.test(body.lang) ? body.lang : 'en';
  const params = checkoutParams({
    lines: cart.lines, subtotalCents: cart.subtotalCents, zone, shipCents, origin, lang, user,
    automaticTax: env.STRIPE_AUTOMATIC_TAX === '1', imageOrigin: origin.startsWith('https://') ? origin : null,
  });
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': crypto.randomUUID() },
    body: form(params),
  });
  const j = await r.json().catch(() => null) as { url?: string; id?: string; error?: { message?: string } } | null;
  if (!r.ok || !j?.url) return json({ error: 'stripe', message: j?.error?.message?.slice(0, 200) }, 502);
  return json({ url: j.url, id: j.id, shipping_cents: shipCents, zone: zone.id as ZoneId });
}

/* ================================================================ Stripe events */

interface StripeEvent { id: string; type: string; data: { object: Record<string, unknown> } }

export const isMerchObject = (o: Record<string, unknown>) => obj(o.metadata).kind === 'merch';

/** Shipping details moved to collected_information in newer Stripe API versions — read both. */
export function addressFromSession(o: Record<string, unknown>) {
  const sd = obj(obj(o.collected_information).shipping_details);
  const legacy = obj(o.shipping_details);
  const src = Object.keys(sd).length ? sd : Object.keys(legacy).length ? legacy : obj(o.shipping);
  const a = obj(src.address);
  const cd = obj(o.customer_details);
  if (!str(a.line1)) return null;
  return {
    name: str(src.name) ?? str(cd.name) ?? '',
    line1: str(a.line1), line2: str(a.line2), city: str(a.city), state: str(a.state),
    postal_code: str(a.postal_code), country: (str(a.country) ?? '').toUpperCase(),
    phone: str(cd.phone),
  };
}

/** checkout.session.completed / async_payment_succeeded for a merch session → order + fulfilments. */
export async function merchStripeEvent(ev: StripeEvent, env: MerchEnv, ctx?: WaitUntil): Promise<Response> {
  const o = ev.data?.object ?? {};
  const meta = obj(o.metadata) as Record<string, string>;

  if (ev.type === 'charge.refunded') {
    if (o.refunded !== true || typeof o.payment_intent !== 'string') return json({ received: true, partial: true });
    const r = await markRefunded(env, o.payment_intent, ev.id);
    return r.ok ? json({ received: true }) : json({ error: 'refund', status: r.status }, 500);
  }
  if (ev.type !== 'checkout.session.completed' && ev.type !== 'checkout.session.async_payment_succeeded') return json({ received: true, ignored: ev.type });
  if (meta.brand !== BRAND) { console.warn('merch event for another brand ignored', ev.id, meta.brand); return json({ received: true, ignored: 'brand' }); }
  if (o.payment_status !== 'paid') return json({ received: true, pending: true });

  const orderId = crypto.randomUUID();
  const decoded = decodeCart(meta) ?? [];
  const routed = routeItems(decoded.map(d => ({ productId: d.productId, colour: d.colour, size: d.size, qty: Math.min(d.qty, 10), unitCents: d.unitCents })), enabledProviders(env), orderId);
  if (!decoded.length) routed.fulfilments.push({ key: 'none', provider: null, external_id: null, status: 'failed', last_error: 'Cart metadata missing or unreadable — check the Stripe session line items' });
  const td = obj(o.total_details);
  const addr = addressFromSession(o);
  const rec = await recordOrder(env, {
    id: orderId,
    brand: BRAND,
    user_id: meta.uid || str(o.client_reference_id) || null,
    email: str(obj(o.customer_details).email) ?? str(o.customer_email),
    lang: meta.lang,
    stripe_session_id: o.id,
    stripe_payment_intent: str(o.payment_intent),
    stripe_event_id: ev.id,
    currency: str(o.currency) ?? 'eur',
    subtotal_cents: Number(o.amount_subtotal ?? 0),
    shipping_cents: Number(td.amount_shipping ?? obj(o.shipping_cost).amount_total ?? 0),
    tax_cents: Number(td.amount_tax ?? 0),
    total_cents: Number(o.amount_total ?? 0),
    ship_zone: meta.zone,
    ship_country: addr?.country ?? null,
    shipping_address: addr,
    fulfilments: routed.fulfilments,
    items: routed.items.map(i => ({ product_id: i.productId, colour: i.colour, size: i.size, qty: i.qty, unit_cents: i.unitCents, title: i.title, fkey: i.fkey })),
  });
  if (!rec.ok) return json({ error: 'record', status: rec.status }, 500);   // 5xx → Stripe retries; recording is idempotent on the session id
  const first = await firstTime(env, 'stripe', ev.id);                       // audit trail of processed event ids
  if (!addr) console.warn('merch order without shipping address', o.id);

  const run = processQueue(env, { limit: 5 }).catch(e => console.error('merch submit', e));
  if (ctx) ctx.waitUntil(run); else await run;
  return json({ received: true, order: rec.data?.id, created: rec.data?.created, duplicate_event: first === false });
}

/** POST /api/merch/webhook — optional separate Stripe endpoint for merch events (same handling). */
export async function merchWebhook(req: Request, env: MerchEnv, ctx?: WaitUntil): Promise<Response> {
  const secret = env.STRIPE_MERCH_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !paymentsEnabled(env)) return json({ error: 'unavailable', reason: 'not_configured' }, 503);
  const raw = await req.text();
  const sig = await verifyStripeSignature(raw, req.headers.get('Stripe-Signature'), secret);
  if (sig !== 'ok') return json({ error: 'signature', reason: sig }, 400);
  let ev: StripeEvent;
  try { ev = JSON.parse(raw); } catch { return json({ error: 'bad' }, 400); }
  const o = ev.data?.object ?? {};
  if (ev.type === 'charge.refunded') return merchStripeEvent(ev, env, ctx);
  if (!isMerchObject(o)) return json({ received: true, ignored: 'not merch' });
  return merchStripeEvent(ev, env, ctx);
}
