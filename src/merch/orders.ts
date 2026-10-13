/**
 * Merch orders on the client: the player's own orders (Profile → My orders, RLS: own rows only), the order of a
 * just-finished checkout (by Stripe session id, no personal data), and the admin "Orders" tab.
 * Tables + RPCs: supabase/migration_021_merch_orders.sql · Worker: worker/merch.ts.
 */
import { getSupabase } from '../supabase';

export type OrderStatus = 'paid' | 'processing' | 'partially_shipped' | 'shipped' | 'delivered' | 'canceled' | 'refunded';
export type FulfilmentStatus = 'queued' | 'submitting' | 'submitted' | 'in_production' | 'partially_shipped' | 'shipped' | 'delivered' | 'failed' | 'canceled' | 'manual';

export interface TrackingInfo { carrier: string | null; number: string | null; url: string | null; shippedAt: string | null; deliveredAt?: string | null }
export interface OrderItem { product_id: string; colour: string | null; size: string | null; qty: number; title?: string | null; unit_cents?: number; fulfilment_id?: number | null }
export interface Shipment { id?: number; provider: string | null; status: FulfilmentStatus; tracking: TrackingInfo[]; shipped_at: string | null; delivered_at: string | null }

export interface MyOrder {
  id: string;
  created_at: string;
  status: OrderStatus;
  total_cents: number;
  currency: string;
  items: OrderItem[];
  shipments: Shipment[];
}

const ITEMS = 'merch_order_items!merch_order_items_order_id_fkey';
const FULS = 'merch_fulfilments!merch_fulfilments_order_id_fkey';

/** Timeline step 0 paid · 1 in production · 2 shipped · 3 delivered (−1 = cancelled / refunded). */
export function timelineStep(s: OrderStatus): number {
  switch (s) {
    case 'paid': return 0;
    case 'processing': return 1;
    case 'partially_shipped': case 'shipped': return 2;
    case 'delivered': return 3;
    default: return -1;
  }
}

/** Only https tracking links are rendered. */
export function safeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try { const x = new URL(u); return x.protocol === 'https:' ? x.href : null; } catch { return null; }
}

export function fmtMoney(cents: number, currency: string, lang: string): string {
  try { return new Intl.NumberFormat(lang === 'en' ? 'en-IE' : lang, { style: 'currency', currency: (currency || 'eur').toUpperCase() }).format(cents / 100); }
  catch { return `€${(cents / 100).toFixed(2)}`; }
}

type Row = Record<string, unknown> & { merch_order_items?: OrderItem[]; merch_fulfilments?: Shipment[] };
const toOrder = (r: Row): MyOrder => ({
  id: String(r.id), created_at: String(r.created_at), status: r.status as OrderStatus,
  total_cents: Number(r.total_cents ?? 0), currency: String(r.currency ?? 'eur'),
  items: r.merch_order_items ?? [],
  shipments: (r.merch_fulfilments ?? []).map(f => ({ ...f, tracking: Array.isArray(f.tracking) ? f.tracking : [] })),
});

/** The signed-in player's orders, newest first. null = not signed in / offline / migration 021 missing. */
export async function loadMyOrders(): Promise<MyOrder[] | null> {
  const sb = await getSupabase().catch(() => null);
  if (!sb) return null;
  const { data: s } = await sb.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return null;
  const { data, error } = await sb.from('merch_orders')
    .select(`id,created_at,status,total_cents,currency,${ITEMS}(product_id,colour,size,qty,title),${FULS}(id,provider,status,tracking,shipped_at,delivered_at)`)
    .eq('user_id', uid).order('created_at', { ascending: false }).limit(50);
  return error ? null : (data as Row[]).map(toOrder);
}

/** Thank-you page after Stripe: { found:false } while the webhook has not arrived yet (poll a few times). */
export async function orderStatusBySession(sid: string): Promise<{ found: boolean; order?: MyOrder } | null> {
  try {
    const r = await fetch(`/api/merch/order?sid=${encodeURIComponent(sid)}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json() as { found?: boolean; order?: Row };
    return j.found && j.order ? { found: true, order: toOrder(j.order) } : { found: false };
  } catch { return null; }
}

/* ================================================================ admin */

export interface AdminFulfilment extends Shipment {
  id: number;
  external_id: string | null;
  provider_order_id: string | null;
  provider_status: string | null;
  attention: string | null;
  attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  tried: string[];
  admin_note: string | null;
  updated_at: string;
}
export interface AdminOrder {
  id: string;
  created_at: string;
  status: OrderStatus;
  needs_attention: boolean;
  email: string | null;
  user_id: string | null;
  lang: string | null;
  stripe_session_id: string;
  stripe_payment_intent: string | null;
  subtotal_cents: number; shipping_cents: number; tax_cents: number; total_cents: number; currency: string;
  ship_country: string | null;
  shipping_address: Record<string, string | null> | null;
  refunded_at: string | null;
  items: OrderItem[];
  fulfilments: AdminFulfilment[];
}

export async function adminLoadOrders(opts: { status?: OrderStatus | ''; attention?: boolean; limit?: number } = {}): Promise<AdminOrder[] | null> {
  const sb = await getSupabase().catch(() => null);
  if (!sb) return null;
  let q = sb.from('merch_orders').select(`*,${ITEMS}(*),${FULS}(*)`).order('created_at', { ascending: false }).limit(opts.limit ?? 300);
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.attention) q = q.eq('needs_attention', true);
  const { data, error } = await q;
  if (error) return null;
  return (data as Row[]).map(r => ({
    ...(r as unknown as AdminOrder),
    items: r.merch_order_items ?? [],
    fulfilments: ((r.merch_fulfilments ?? []) as unknown as AdminFulfilment[]).map(f => ({ ...f, tracking: Array.isArray(f.tracking) ? f.tracking : [] })).sort((a, b) => a.id - b.id),
  }));
}

export type AdminAction = 'retry' | 'resolve' | 'cancel' | 'note';

/** resolve / cancel / note through the RPC; retry goes through the Worker so it is submitted at once. */
export async function adminFulfilmentAction(id: number, action: AdminAction, note?: string): Promise<boolean> {
  if (action === 'retry') { const r = await adminWorker<{ ok?: boolean }>('retry', { id }); return !!r?.ok; }
  const sb = await getSupabase().catch(() => null);
  if (!sb) return false;
  const { data, error } = await sb.rpc('admin_merch_action', { p_fulfilment: id, p_action: action, p_note: note ?? null });
  return !error && data === true;
}

async function adminWorker<T>(action: string, body?: unknown, query = ''): Promise<T | null> {
  try {
    const sb = await getSupabase();
    const token = sb ? (await sb.auth.getSession()).data.session?.access_token : null;
    if (!token) return null;
    const r = await fetch(`/api/merch/admin/${action}${query}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const j = await r.json().catch(() => null) as T | null;
    return j ?? null;
  } catch { return null; }
}

export interface ProviderReport {
  id: string; label: string; configured: boolean; expectedStoreId: string | null;
  brand: { ok: boolean; reason: string | null; storeName: string | null; warnings: string[] } | null;
  webhookUrl: string | null; canRegisterHooks: boolean;
  mapping: { mapped: number; total: number };
  missingPrintFiles: string[];
}
export interface ProvidersReport {
  stripe: boolean; store: boolean; enabled: boolean; brand: string; draftOrders: boolean; liveShipping: boolean;
  providers: ProviderReport[]; enabledProviders: string[]; error?: string; reason?: string;
}

export const adminProviders = () => adminWorker<ProvidersReport>('providers');
export const adminRunQueue = () => adminWorker<{ ok?: boolean; submitted?: unknown[]; polled?: number }>('run', {});
export const adminRegisterHooks = (provider: string) => adminWorker<unknown>('register-hooks', { provider });
export const adminCatalog = (provider: string, params: Record<string, string>) =>
  adminWorker<unknown>('catalog', undefined, `?${new URLSearchParams({ provider, ...params })}`);
