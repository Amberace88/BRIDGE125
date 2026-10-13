/** Supabase (PostgREST) access for merch orders — always as service_role, from the Worker only. */
import { supaHeaders } from './pay';
import type { FStatus, MerchEnv, Tracking } from './merchTypes';

export interface FulfilmentRow {
  id: number;
  order_id: string;
  provider: string | null;
  tried: string[];
  external_id: string | null;
  provider_order_id: string | null;
  status: FStatus;
  provider_status: string | null;
  attention: string | null;
  attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  tracking: Tracking[];
  submitted_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface ItemRow { id: number; order_id: string; fulfilment_id: number | null; product_id: string; colour: string | null; size: string | null; qty: number; unit_cents: number; title: string | null }

export interface OrderRow {
  id: string;
  brand: string;
  created_at: string;
  user_id: string | null;
  email: string | null;
  lang: string | null;
  stripe_session_id: string;
  status: string;
  needs_attention: boolean;
  subtotal_cents: number; shipping_cents: number; tax_cents: number; total_cents: number;
  ship_country: string | null;
  shipping_address: { name?: string; line1?: string; line2?: string | null; city?: string; state?: string | null; postal_code?: string; country?: string; phone?: string | null } | null;
  refunded_at: string | null;
  merch_order_items?: ItemRow[];
}

export const storeReady = (env: MerchEnv) => !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

async function rest<T>(env: MerchEnv, path: string, init: RequestInit = {}, prefer?: string): Promise<{ ok: boolean; status: number; data: T | null }> {
  if (!storeReady(env)) return { ok: false, status: 503, data: null };
  const h: Record<string, string> = supaHeaders(env.SUPABASE_SERVICE_ROLE_KEY!);
  if (prefer) h.Prefer = prefer;
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...h, ...(init.headers as Record<string, string> | undefined) } });
    const text = await r.text();
    let data: T | null = null;
    try { data = text ? JSON.parse(text) as T : null; } catch { /* empty */ }
    return { ok: r.ok, status: r.status, data };
  } catch { return { ok: false, status: 502, data: null }; }
}

export const rpc = <T>(env: MerchEnv, fn: string, args: Record<string, unknown>) =>
  rest<T>(env, `rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });

export async function recordOrder(env: MerchEnv, p: Record<string, unknown>) {
  return rpc<{ id: string; created: boolean }>(env, 'merch_order_record', { p });
}

export async function claimFulfilments(env: MerchEnv, opts: { id?: number; limit?: number }): Promise<FulfilmentRow[]> {
  const r = await rpc<FulfilmentRow[]>(env, 'merch_claim', { p_id: opts.id ?? null, p_limit: opts.limit ?? 5 });
  return r.ok && Array.isArray(r.data) ? r.data : [];
}

export async function loadOrder(env: MerchEnv, id: string): Promise<OrderRow | null> {
  const r = await rest<OrderRow[]>(env, `merch_orders?id=eq.${encodeURIComponent(id)}&select=*,merch_order_items!merch_order_items_order_id_fkey(*)`);
  return r.ok && r.data?.[0] ? r.data[0] : null;
}

export async function patchFulfilment(env: MerchEnv, id: number, patch: Record<string, unknown>): Promise<boolean> {
  const r = await rest(env, `merch_fulfilments?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(patch) }, 'return=minimal');
  return r.ok;
}

export async function findFulfilment(env: MerchEnv, provider: string, ref: { providerOrderId?: string | null; externalId?: string | null }): Promise<FulfilmentRow | null> {
  const q = ref.providerOrderId
    ? `provider=eq.${encodeURIComponent(provider)}&provider_order_id=eq.${encodeURIComponent(ref.providerOrderId)}`
    : ref.externalId ? `provider=eq.${encodeURIComponent(provider)}&external_id=eq.${encodeURIComponent(ref.externalId)}` : null;
  if (!q) return null;
  const r = await rest<FulfilmentRow[]>(env, `merch_fulfilments?${q}&select=*&limit=1`);
  return r.ok && r.data?.[0] ? r.data[0] : null;
}

/** Sent orders whose status has not been refreshed for 6 h (webhooks can be missed). */
export async function pollCandidates(env: MerchEnv, limit = 15): Promise<FulfilmentRow[]> {
  const stale = new Date(Date.now() - 6 * 3600_000).toISOString();
  const shippedSince = new Date(Date.now() - 30 * 86400_000).toISOString();
  const tree = `(or(status.in.(submitted,in_production,partially_shipped),and(status.eq.shipped,shipped_at.gt."${shippedSince}")),`
    + `or(polled_at.is.null,polled_at.lt."${stale}"))`;
  const q = `provider_order_id=not.is.null&and=${encodeURIComponent(tree)}&order=polled_at.asc.nullsfirst&limit=${limit}&select=*`;
  const r = await rest<FulfilmentRow[]>(env, `merch_fulfilments?${q}`);
  return r.ok && Array.isArray(r.data) ? r.data : [];
}

/** Idempotency: true the first time (source, id) is seen. */
export async function firstTime(env: MerchEnv, source: string, eventId: string): Promise<boolean | null> {
  const r = await rest<unknown[]>(env, 'merch_events?on_conflict=source,event_id', { method: 'POST', body: JSON.stringify({ source, event_id: eventId }) }, 'resolution=ignore-duplicates,return=representation');
  if (!r.ok) return null;
  return Array.isArray(r.data) && r.data.length > 0;
}

export async function orderBySession(env: MerchEnv, sid: string) {
  const r = await rest<Record<string, unknown>[]>(env,
    `merch_orders?stripe_session_id=eq.${encodeURIComponent(sid)}&select=id,created_at,status,total_cents,currency,merch_order_items!merch_order_items_order_id_fkey(product_id,colour,size,qty),merch_fulfilments!merch_fulfilments_order_id_fkey(provider,status,tracking,shipped_at,delivered_at)`);
  return r.ok ? (r.data?.[0] ?? null) : undefined;
}

export const markRefunded = (env: MerchEnv, intent: string, eventId: string) =>
  rpc<{ ok?: boolean; noop?: boolean }>(env, 'merch_mark_refunded', { p_intent: intent, p_event: eventId });
