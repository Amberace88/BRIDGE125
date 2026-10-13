/**
 * Fulfilment orchestration: route paid items to providers, submit provider orders (brand-guarded, idempotent,
 * retried with backoff, falling back to the next provider), and sync status / tracking back.
 */
import { PRODUCTS } from '../src/merch/catalog';
import {
  BRAND, EXTERNAL_PREFIX, type ProviderId, type Route, fulfilmentFor, readyRoutes, resolveVariant, routeReady,
} from '../src/merch/fulfillment';
import { brandGuard } from './merchBrand';
import { printUrl } from './merchPrint';
import { enabledProviders, providerById, type Provider } from './merchProviders';
import {
  claimFulfilments, findFulfilment, loadOrder, patchFulfilment, pollCandidates,
  type FulfilmentRow, type ItemRow, type OrderRow,
} from './merchStore';
import { type FStatus, type FulfilLine, type FulfilRequest, type MerchEnv, type ShipTo, type Tracking, hookToken } from './merchTypes';

export const MAX_ATTEMPTS = 8;
/** Minutes to wait after attempt n (1-based) failed transiently. */
const BACKOFF_MIN = [1, 5, 15, 60, 180, 360, 720, 1440];
export const backoffMinutes = (attempt: number) => BACKOFF_MIN[Math.min(Math.max(attempt, 1), BACKOFF_MIN.length) - 1];

const SUFFIX: Record<ProviderId, string> = { printful: 'pf', gelato: 'ge', prodigi: 'pd', printify: 'pi' };

/** b125-<12 hex of the order id>-<provider> — unique per order + provider, ≤ 32 chars (Printful's limit). */
export function externalIdFor(orderId: string, provider: ProviderId): string {
  return `${EXTERNAL_PREFIX}${orderId.replace(/-/g, '').slice(0, 12)}-${SUFFIX[provider]}`;
}
export const shortIdFor = (orderId: string) => orderId.replace(/-/g, '').slice(0, 8).toUpperCase();

export interface RoutedItem { productId: string; colour: string | null; size: string | null; qty: number; unitCents: number; title: string; provider: ProviderId | null }

/** Pick a provider for every item (first ready route); group items into one fulfilment per provider. */
export function routeItems(items: Omit<RoutedItem, 'provider' | 'title'>[], enabled: ReadonlySet<ProviderId>, orderId: string) {
  const routed: (RoutedItem & { fkey: string })[] = [];
  const groups = new Map<string, { key: string; provider: ProviderId | null; external_id: string | null; status: FStatus; last_error: string | null }>();
  for (const it of items) {
    const product = PRODUCTS.find(p => p.id === it.productId);
    const f = product ? fulfilmentFor(product.id, product.category) : null;
    const routes = f ? readyRoutes(f, it.colour, it.size, enabled) : [];
    const provider = routes[0]?.provider ?? null;
    const key = provider ?? 'none';
    if (!groups.has(key)) {
      groups.set(key, provider
        ? { key, provider, external_id: externalIdFor(orderId, provider), status: 'queued', last_error: null }
        : { key, provider: null, external_id: null, status: 'failed', last_error: 'No provider is configured for these items (check src/merch/fulfillment.ts and the provider secrets)' });
    }
    routed.push({ ...it, title: f?.title ?? it.productId, provider, fkey: key });
  }
  return { items: routed, fulfilments: [...groups.values()] };
}

export function shipToFrom(order: Pick<OrderRow, 'shipping_address' | 'email'>): ShipTo | null {
  const a = order.shipping_address;
  if (!a?.line1 || !a.city || !a.country || !a.name) return null;
  const name = a.name.trim().replace(/\s+/g, ' ');
  const sp = name.lastIndexOf(' ');
  return {
    name, firstName: sp > 0 ? name.slice(0, sp) : name, lastName: sp > 0 ? name.slice(sp + 1) : '-',
    line1: a.line1, line2: a.line2 || null, city: a.city, state: a.state || null, postalCode: a.postal_code ?? '', country: a.country.toUpperCase(),
    email: order.email ?? '', phone: a.phone || null,
  };
}

function routeFor(provider: ProviderId, it: Pick<ItemRow, 'product_id' | 'colour' | 'size'>): Route | null {
  const product = PRODUCTS.find(p => p.id === it.product_id);
  if (!product) return null;
  return fulfilmentFor(product.id, product.category).routes.find(r => r.provider === provider && routeReady(r, it.colour, it.size)) ?? null;
}

/** Build the provider-neutral request; returns an error string for configuration problems. */
export async function buildRequest(env: MerchEnv, provider: ProviderId, f: Pick<FulfilmentRow, 'external_id'>, order: OrderRow, items: ItemRow[]): Promise<FulfilRequest | string> {
  const shipTo = shipToFrom(order);
  if (!shipTo) return 'shipping address missing in the order';
  if (!f.external_id?.startsWith(EXTERNAL_PREFIX)) return 'external id without the b125- prefix';
  const lines: FulfilLine[] = [];
  for (const it of items) {
    const route = routeFor(provider, it);
    if (!route) return `${it.product_id} ${it.colour ?? ''}/${it.size ?? ''} has no ${provider} mapping`;
    const files: FulfilLine['files'] = [];
    for (const pf of route.files) {
      const url = await printUrl(env, pf.file);
      if (!url) return `print file merch-print/${pf.file} is not published (run npm run build, or set MERCH_PRINT_BASE_URL)`;
      files.push({ area: pf.area, url, ...(pf.technique ? { technique: pf.technique } : {}) });
    }
    lines.push({ productId: it.product_id, title: it.title ?? it.product_id, colour: it.colour, size: it.size, qty: it.qty, unitCents: it.unit_cents, route, variant: resolveVariant(route, it.colour, it.size), files });
  }
  if (!lines.length) return 'no items';
  let returnAddress: Record<string, string> | null = null;
  try { returnAddress = env.MERCH_RETURN_ADDRESS ? JSON.parse(env.MERCH_RETURN_ADDRESS) as Record<string, string> : null; } catch { returnAddress = null; }
  const origin = (env.PUBLIC_ORIGIN || 'https://bridge125.com').replace(/\/+$/, '');
  return {
    provider, externalId: f.external_id, orderId: order.id, shortId: shortIdFor(order.id), currency: 'EUR', lines, shipTo,
    totals: { subtotalCents: order.subtotal_cents, shippingCents: order.shipping_cents, taxCents: order.tax_cents, totalCents: order.total_cents },
    draft: env.MERCH_DRAFT_ORDERS === '1',
    callbackUrl: `${origin}/api/merch/hooks/${provider}?t=${await hookToken(env, provider)}`,
    contactEmail: env.MERCH_CONTACT_EMAIL || 'hello@bridge125.com',
    returnAddress,
  };
}

/** Next provider that can make ALL of these items (not tried yet, configured). */
export function fallbackProvider(items: Pick<ItemRow, 'product_id' | 'colour' | 'size'>[], tried: string[], enabled: ReadonlySet<ProviderId>): ProviderId | null {
  const first = items[0];
  if (!first) return null;
  const product = PRODUCTS.find(p => p.id === first.product_id);
  if (!product) return null;
  for (const r of fulfilmentFor(product.id, product.category).routes) {
    if (tried.includes(r.provider) || !enabled.has(r.provider)) continue;
    if (items.every(it => routeFor(r.provider, it))) return r.provider;
  }
  return null;
}

export type SubmitOutcome = { id: number; result: 'submitted' | 'retry' | 'failed' | 'switched' | 'canceled' | 'skipped'; detail?: string };

/** Submit one claimed fulfilment (status 'submitting'). */
export async function submitFulfilment(env: MerchEnv, f: FulfilmentRow, depth = 0): Promise<SubmitOutcome> {
  const fail = async (detail: string, retry: boolean): Promise<SubmitOutcome> => {
    if (retry && f.attempts < MAX_ATTEMPTS) {
      await patchFulfilment(env, f.id, { status: 'queued', locked_until: null, last_error: detail.slice(0, 1000), next_attempt_at: new Date(Date.now() + backoffMinutes(f.attempts) * 60_000).toISOString() });
      return { id: f.id, result: 'retry', detail };
    }
    // permanent problem: try the next provider — only while no provider order exists (never ship twice)
    if (!f.provider_order_id && f.provider) {
      const order = await loadOrder(env, f.order_id);
      const items = (order?.merch_order_items ?? []).filter(i => i.fulfilment_id === f.id);
      const tried = [...new Set([...(f.tried ?? []), f.provider])];
      const next = fallbackProvider(items, tried, enabledProviders(env));
      if (next && order) {
        const ext = externalIdFor(order.id, next);
        const ok = await patchFulfilment(env, f.id, { provider: next, tried, external_id: ext, status: 'queued', attempts: 0, locked_until: null, next_attempt_at: new Date().toISOString(), last_error: `${f.provider}: ${detail}`.slice(0, 1000) });
        if (ok && depth < 2) {
          const [again] = await claimFulfilments(env, { id: f.id, limit: 1 });
          if (again) return submitFulfilment(env, again, depth + 1);
        }
        return { id: f.id, result: 'switched', detail: `${f.provider} → ${next}: ${detail}` };
      }
    }
    await patchFulfilment(env, f.id, { status: 'failed', locked_until: null, last_error: detail.slice(0, 1000) });
    return { id: f.id, result: 'failed', detail };
  };

  const provider = f.provider ? providerById(f.provider) : null;
  if (!provider) return fail('no provider assigned', false);
  const order = await loadOrder(env, f.order_id);
  if (!order) return fail('order not found', true);
  if (order.brand !== BRAND) return fail(`order brand ${order.brand} ≠ ${BRAND}`, false);
  if (order.refunded_at) {
    await patchFulfilment(env, f.id, { status: 'canceled', locked_until: null, last_error: 'refunded before submission' });
    return { id: f.id, result: 'canceled' };
  }
  if (!provider.enabled(env)) return fail(`${provider.label} is not configured (secrets missing)`, false);

  const guard = await brandGuard(env, provider.id);
  if (!guard.ok) return fail(`brand guard: ${guard.reason}`, (guard.reason ?? '').startsWith('whoami failed'));

  const items = (order.merch_order_items ?? []).filter(i => i.fulfilment_id === f.id);
  const req = await buildRequest(env, provider.id, f, order, items);
  if (typeof req === 'string') return fail(req, false);

  // never create twice: after a timeout / crash / admin retry the order may already exist under our external id
  let existing = f.provider_order_id;
  if (!existing) existing = await provider.find(env, req.externalId);

  const res = await provider.create(env, req, existing);
  if (!res.ok) {
    if (existing) { f.provider_order_id = existing; await patchFulfilment(env, f.id, { provider_order_id: existing }); }
    return fail(res.error, res.retry);
  }
  await patchFulfilment(env, f.id, {
    status: res.status, provider_order_id: res.providerOrderId, submitted_at: new Date().toISOString(),
    locked_until: null, last_error: null, provider_status: env.MERCH_DRAFT_ORDERS === '1' ? 'draft' : null,
  });
  return { id: f.id, result: 'submitted', detail: res.providerOrderId };
}

/** Claim + submit due fulfilments (cron, webhook, admin "run now"). */
export async function processQueue(env: MerchEnv, opts: { id?: number; limit?: number } = {}): Promise<SubmitOutcome[]> {
  const claimed = await claimFulfilments(env, opts);
  const out: SubmitOutcome[] = [];
  for (const f of claimed) {
    try { out.push(await submitFulfilment(env, f)); }
    catch (e) {
      const detail = `crash: ${(e as Error)?.message ?? e}`;
      await patchFulfilment(env, f.id, { status: 'queued', locked_until: null, last_error: detail, next_attempt_at: new Date(Date.now() + backoffMinutes(f.attempts) * 60_000).toISOString() });
      out.push({ id: f.id, result: 'retry', detail });
    }
  }
  return out;
}

const RANK: Record<FStatus, number> = { queued: 0, submitting: 0, failed: 0, manual: 0, canceled: 9, submitted: 1, in_production: 2, partially_shipped: 3, shipped: 4, delivered: 5 };

/** Merge an authoritative provider snapshot into a fulfilment (never moves backwards, except to canceled/failed). */
export function mergeSnapshot(f: Pick<FulfilmentRow, 'status' | 'shipped_at' | 'delivered_at' | 'tracking'>, snap: { status: FStatus; tracking: Tracking[]; providerStatus: string; attention: string | null }, now = new Date()) {
  let status = snap.status;
  if (status !== 'canceled' && status !== 'failed' && RANK[status] < RANK[f.status]) status = f.status;
  if (f.status === 'manual' || f.status === 'delivered') status = f.status;
  const tracking = snap.tracking.length ? snap.tracking : (f.tracking ?? []);
  const iso = now.toISOString();
  return {
    status,
    provider_status: snap.providerStatus.slice(0, 60),
    tracking,
    attention: snap.attention,
    polled_at: iso,
    shipped_at: f.shipped_at ?? (RANK[status] >= RANK.partially_shipped && status !== 'canceled' ? (tracking.find(t => t.shippedAt)?.shippedAt ?? iso) : null),
    delivered_at: f.delivered_at ?? (status === 'delivered' ? (tracking.find(t => t.deliveredAt)?.deliveredAt ?? iso) : null),
  };
}

export async function refreshFulfilment(env: MerchEnv, f: FulfilmentRow): Promise<boolean> {
  const p = f.provider ? providerById(f.provider) : null;
  if (!p || !f.provider_order_id || !p.enabled(env)) return false;
  const snap = await p.fetch(env, f.provider_order_id);
  if (!snap) { await patchFulfilment(env, f.id, { polled_at: new Date().toISOString() }); return false; }
  return patchFulfilment(env, f.id, mergeSnapshot(f, snap));
}

/** Provider callback → find our fulfilment → re-read the order from the provider API (payload is never trusted). */
export async function handleProviderHook(env: MerchEnv, provider: Provider, payload: unknown): Promise<{ matched: boolean; reason?: string }> {
  const ref = provider.hookRef(payload);
  const expected = provider.expectedStoreId(env);
  if (ref.storeId && expected && String(ref.storeId) !== String(expected)) return { matched: false, reason: `event for store ${ref.storeId}, not ${expected}` };
  if (ref.externalId && !ref.externalId.startsWith(EXTERNAL_PREFIX)) return { matched: false, reason: 'not a Bridge 125 order' };
  const f = await findFulfilment(env, provider.id, ref);
  if (!f) return { matched: false, reason: 'unknown order' };
  await refreshFulfilment(env, f);
  return { matched: true };
}

/** Cron: submit what is due, then refresh stale statuses (missed webhooks). */
export async function merchCron(env: MerchEnv): Promise<{ submitted: SubmitOutcome[]; polled: number }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !enabledProviders(env).size) return { submitted: [], polled: 0 };
  const submitted = await processQueue(env, { limit: 10 });
  let polled = 0;
  for (const f of await pollCandidates(env, 15)) if (await refreshFulfilment(env, f)) polled++;
  return { submitted, polled };
}
