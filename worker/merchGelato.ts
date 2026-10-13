/**
 * Gelato Order API v4 (https://dashboard.gelato.com/docs/orders/v4/create/).
 * Gelato API keys are account-wide, so Bridge 125 uses its OWN Gelato account (or an account that only ever holds
 * Bridge 125 orders): the brand guard refuses to send anything while the key can see orders that are not ours.
 * Every order also overrides the sender (returnAddress.companyName = "Bridge 125") and carries brand metadata.
 */
import { BRAND, BRAND_NAME, BRAND_SITE, EXTERNAL_PREFIX, variantId } from '../src/merch/fulfillment';
import type { Provider } from './merchProviders';
import {
  type CreateResult, type FStatus, type FulfilRequest, type IdentityProbe, type MerchEnv, type Snapshot, type Tracking,
  arr, errText, http, obj, retryable, str,
} from './merchTypes';

const ORDER_API = 'https://order.gelatoapis.com';
const PRODUCT_API = 'https://product.gelatoapis.com';

const headers = (env: MerchEnv) => ({ 'X-API-KEY': String(env.GELATO_API_KEY ?? ''), 'Content-Type': 'application/json' });

/** POST /v4/orders body (documented fields only). */
export function gelatoOrderBody(req: FulfilRequest) {
  const s = req.shipTo;
  return {
    orderType: req.draft ? 'draft' : 'order',
    orderReferenceId: req.externalId,
    customerReferenceId: req.externalId,
    currency: req.currency,
    items: req.lines.map((l, i) => ({
      itemReferenceId: `${req.externalId}-${i + 1}`,
      productUid: String(variantId(l.variant)),
      files: l.files.map(f => ({ type: f.area, url: f.url })),
      quantity: l.qty,
    })),
    shippingAddress: {
      firstName: s.firstName,
      lastName: s.lastName,
      addressLine1: s.line1,
      ...(s.line2 ? { addressLine2: s.line2 } : {}),
      city: s.city,
      postCode: s.postalCode,
      ...(s.state ? { state: s.state } : {}),
      country: s.country,
      email: s.email,
      ...(s.phone ? { phone: s.phone } : {}),
    },
    returnAddress: { companyName: BRAND_NAME, email: req.contactEmail, ...(req.returnAddress ?? {}) },
    metadata: [
      { key: 'brand', value: BRAND },
      { key: 'site', value: BRAND_SITE },
      { key: 'order', value: req.orderId },
    ],
  };
}

export function gelatoStatus(s: string): FStatus {
  switch (s) {
    case 'printed': case 'in_production': case 'digitized': return 'in_production';
    case 'shipped': case 'in_transit': return 'shipped';
    case 'delivered': return 'delivered';
    case 'canceled': case 'cancelled': return 'canceled';
    case 'failed': case 'not_connected': case 'returned': return 'failed';
    default: return 'submitted';      // created, uploading, passed, pending_approval, draft, on_hold …
  }
}

/** Orders on this key that are not Bridge 125's (manual sample orders placed in the Gelato UI are ignored). */
export function gelatoForeign(orders: unknown[], storeId?: string | null): string[] {
  const out: string[] = [];
  for (const x of orders) {
    const o = obj(x);
    const ref = str(o.orderReferenceId) ?? '';
    const sid = str(o.storeId);
    if (storeId && sid && sid !== storeId) { out.push(ref || str(o.id) || '?'); continue; }
    if (ref.startsWith(EXTERNAL_PREFIX) || str(o.channel) === 'ui') continue;
    out.push(ref || str(o.id) || '?');
  }
  return out;
}

export const gelato: Provider = {
  id: 'gelato',
  label: 'Gelato',
  enabled: env => !!env.GELATO_API_KEY,
  expectedStoreId: env => env.GELATO_STORE_ID ?? null,

  async identity(env): Promise<IdentityProbe> {
    const r = await http(`${ORDER_API}/v4/orders:search`, { method: 'POST', headers: headers(env), body: JSON.stringify({ limit: 100, offset: 0 }) });
    if (!r.ok) return { error: errText(r) };
    return { foreignRefs: gelatoForeign(arr(obj(r.json).orders), env.GELATO_STORE_ID) };
  },

  build: gelatoOrderBody,

  async create(env, req, existingId): Promise<CreateResult> {
    if (existingId) return { ok: true, providerOrderId: existingId, status: 'submitted' };
    const r = await http(`${ORDER_API}/v4/orders`, { method: 'POST', headers: headers(env), body: JSON.stringify(gelatoOrderBody(req)) });
    if (!r.ok) return { ok: false, retry: retryable(r.status), error: errText(r) };
    const j = obj(r.json);
    const id = str(j.id);
    if (!id) return { ok: false, retry: true, error: 'Gelato: no order id in response' };
    return { ok: true, providerOrderId: id, status: gelatoStatus(str(j.fulfillmentStatus) ?? '') };
  },

  async find(env, externalId) {
    const r = await http(`${ORDER_API}/v4/orders:search`, { method: 'POST', headers: headers(env), body: JSON.stringify({ orderReferenceIds: [externalId], limit: 5 }) });
    if (!r.ok) return null;
    const hit = arr(obj(r.json).orders).map(obj).find(o => o.orderReferenceId === externalId);
    return hit ? str(hit.id) : null;
  },

  async fetch(env, id): Promise<Snapshot | null> {
    const r = await http(`${ORDER_API}/v4/orders/${encodeURIComponent(id)}`, { headers: headers(env) });
    if (!r.ok) return null;
    const o = obj(r.json);
    const ship = obj(o.shipment);
    const carrier = str(ship.shipmentMethodName);
    const tracking: Tracking[] = arr(ship.packages).map(p => {
      const k = obj(p);
      return { carrier, number: str(k.trackingCode), url: str(k.trackingUrl), shippedAt: null };
    }).filter(t => t.number || t.url);
    const ps = str(o.fulfillmentStatus) ?? 'unknown';
    const st = gelatoStatus(ps);
    return { status: st, tracking, providerStatus: ps, attention: st === 'failed' ? `Gelato: ${ps}` : ps === 'on_hold' ? 'Gelato: order on hold — check the Gelato dashboard' : null };
  },

  // Gelato does not sign webhooks: the secret token in the callback URL authenticates them, and the status is
  // always re-read from the API with our key, so a forged call can at most trigger a refresh.
  async verifyHook() { return true; },

  hookRef(payload) {
    const p = obj(payload);
    return { providerOrderId: str(p.orderId), externalId: str(p.orderReferenceId), storeId: str(p.storeId) };
  },

  async catalog(env, q) {
    const cat = q.get('catalog');
    const r = cat
      ? await http(`${PRODUCT_API}/v3/catalogs/${encodeURIComponent(cat)}/products:search`, { method: 'POST', headers: headers(env), body: JSON.stringify({ limit: 100, offset: Number(q.get('offset') ?? 0) || 0 }) })
      : await http(`${PRODUCT_API}/v3/catalogs`, { headers: headers(env) });
    return { ok: r.ok, status: r.status, data: r.json };
  },
};
