/**
 * Printify API v1 (https://developers.printify.com/) — shop-scoped: every order goes to
 * /v1/shops/{PRINTIFY_SHOP_ID}/orders.json, and the brand guard has checked (GET /v1/shops.json) that this shop's
 * title is "Bridge 125". A Printify account can hold several shops (e.g. Rojo y Gualda + Bridge 125) safely.
 */
import { BRAND_NAME, variantId } from '../src/merch/fulfillment';
import type { Provider } from './merchProviders';
import {
  type CreateResult, type FStatus, type FulfilRequest, type IdentityProbe, type MerchEnv, type Snapshot, type Tracking,
  arr, errText, hmacHex, hookToken, http, obj, retryable, safeEqual, str,
} from './merchTypes';

const API = 'https://api.printify.com/v1';
const headers = (env: MerchEnv) => ({
  Authorization: `Bearer ${env.PRINTIFY_TOKEN}`,
  'Content-Type': 'application/json',
  'User-Agent': 'Bridge125-Fulfilment/1.0',
});
const shop = (env: MerchEnv) => encodeURIComponent(String(env.PRINTIFY_SHOP_ID ?? ''));

/** POST /v1/shops/{shop_id}/orders.json body (documented fields only). */
export function printifyOrderBody(req: FulfilRequest) {
  const s = req.shipTo;
  return {
    external_id: req.externalId,
    label: req.externalId,
    line_items: req.lines.map(l => {
      const pf = l.route.printify ?? {};
      const variant_id = Number(variantId(l.variant));
      if (pf.productId) return { product_id: pf.productId, variant_id, quantity: l.qty };
      return {
        blueprint_id: pf.blueprintId, print_provider_id: pf.printProviderId, variant_id,
        print_areas: Object.fromEntries(l.files.map(f => [f.area, f.url])),
        quantity: l.qty,
      };
    }),
    shipping_method: 1,
    send_shipping_notification: true,
    address_to: {
      first_name: s.firstName,
      last_name: s.lastName,
      email: s.email,
      ...(s.phone ? { phone: s.phone } : {}),
      country: s.country,
      ...(s.state ? { region: s.state } : {}),
      address1: s.line1,
      ...(s.line2 ? { address2: s.line2 } : {}),
      city: s.city,
      zip: s.postalCode,
    },
  };
}

export function printifyStatus(s: string, tracking: Tracking[]): FStatus {
  switch (s) {
    case 'fulfilled': return tracking.length && tracking.every(t => t.deliveredAt) ? 'delivered' : 'shipped';
    case 'partially-fulfilled': return 'partially_shipped';
    case 'in-production': case 'sending-to-production': return 'in_production';
    case 'canceled': return 'canceled';
    default: return 'submitted';     // pending, on-hold, payment-not-received, had-issues
  }
}

export const printify: Provider = {
  id: 'printify',
  label: 'Printify',
  enabled: env => !!(env.PRINTIFY_TOKEN && env.PRINTIFY_SHOP_ID),
  expectedStoreId: env => env.PRINTIFY_SHOP_ID ?? null,

  async identity(env): Promise<IdentityProbe> {
    const r = await http(`${API}/shops.json`, { headers: headers(env) });
    if (!r.ok) return { error: errText(r) };
    const list = Array.isArray(r.json) ? r.json : arr(obj(r.json).data);
    return { stores: list.map(s => ({ id: str(obj(s).id) ?? '', name: str(obj(s).title) ?? '' })) };
  },

  build: printifyOrderBody,

  async create(env, req, existingId): Promise<CreateResult> {
    let id = existingId;
    if (!id) {
      const r = await http(`${API}/shops/${shop(env)}/orders.json`, { method: 'POST', headers: headers(env), body: JSON.stringify(printifyOrderBody(req)) });
      if (!r.ok) return { ok: false, retry: retryable(r.status), error: errText(r) };
      id = str(obj(r.json).id);
      if (!id) return { ok: false, retry: true, error: 'Printify: no order id in response' };
    }
    if (req.draft) return { ok: true, providerOrderId: id, status: 'submitted' };
    const p = await http(`${API}/shops/${shop(env)}/orders/${encodeURIComponent(id)}/send_to_production.json`, { method: 'POST', headers: headers(env) });
    if (p.ok || (p.status >= 400 && p.status < 500 && /production|status/i.test(p.text))) return { ok: true, providerOrderId: id, status: 'in_production' };
    return { ok: false, retry: retryable(p.status), error: `send_to_production ${errText(p)}` };
  },

  async find(env, externalId) {
    const r = await http(`${API}/shops/${shop(env)}/orders.json?limit=50`, { headers: headers(env) });
    if (!r.ok) return null;
    const hit = arr(obj(r.json).data).map(obj).find(o => o.external_id === externalId || o.label === externalId);
    return hit ? str(hit.id) : null;
  },

  async fetch(env, id): Promise<Snapshot | null> {
    const r = await http(`${API}/shops/${shop(env)}/orders/${encodeURIComponent(id)}.json`, { headers: headers(env) });
    if (!r.ok) return null;
    const o = obj(r.json);
    const tracking: Tracking[] = arr(o.shipments).map(x => {
      const s = obj(x);
      return { carrier: str(s.carrier), number: str(s.number), url: str(s.url), shippedAt: str(s.shipped_at), deliveredAt: str(s.delivered_at) };
    }).filter(t => t.number || t.url);
    const ps = str(o.status) ?? 'unknown';
    return {
      status: printifyStatus(ps, tracking), tracking, providerStatus: ps,
      attention: ps === 'had-issues' || ps === 'payment-not-received' || ps === 'on-hold' ? `Printify: ${ps} — check the Printify dashboard` : null,
    };
  },

  async verifyHook(env, h, raw) {
    const sig = (h.get('x-pfy-signature') ?? '').trim().toLowerCase();
    const secret = await hookToken(env, 'printify');
    if (!sig || !secret) return false;
    const expected = `sha256=${await hmacHex(secret, raw)}`;
    return safeEqual(expected, sig);
  },

  hookRef(payload) {
    const p = obj(payload), res = obj(p.resource), d = obj(res.data);
    return { providerOrderId: str(res.id), storeId: str(d.shop_id), externalId: null };
  },

  async catalog(env, q) {
    const bp = q.get('blueprint'), pp = q.get('print_provider');
    const url = q.get('products')
      ? `${API}/shops/${shop(env)}/products.json?limit=50`
      : bp && pp ? `${API}/catalog/blueprints/${encodeURIComponent(bp)}/print_providers/${encodeURIComponent(pp)}/variants.json`
      : bp ? `${API}/catalog/blueprints/${encodeURIComponent(bp)}/print_providers.json`
      : `${API}/catalog/blueprints.json`;
    const r = await http(url, { headers: headers(env) });
    return { ok: r.ok, status: r.status, data: r.json };
  },

  async registerHooks(env, url) {
    const secret = await hookToken(env, 'printify');
    if (!secret) return { ok: false, error: 'no hook secret (SUPABASE_SERVICE_ROLE_KEY / MERCH_HOOK_SECRET missing)' };
    const out: unknown[] = [];
    for (const topic of ['order:updated', 'order:shipment:created', 'order:shipment:delivered']) {
      const r = await http(`${API}/shops/${shop(env)}/webhooks.json`, { method: 'POST', headers: headers(env), body: JSON.stringify({ topic, url, secret }) });
      out.push({ topic, ok: r.ok, status: r.status, data: r.json });
    }
    return { ok: true, results: out, note: `Webhooks for the ${BRAND_NAME} shop only.` };
  },
};
