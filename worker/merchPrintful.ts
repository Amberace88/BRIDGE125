/**
 * Printful API v2 (https://developers.printful.com/docs/v2-beta/) — store-scoped.
 * Every call carries X-PF-Store-Id = PRINTFUL_STORE_ID, and the brand guard has checked (GET /v2/stores) that this
 * store is named "Bridge 125" before any order is sent.
 */
import { BRAND_NAME, BRAND_SITE, variantId } from '../src/merch/fulfillment';
import type { Provider } from './merchProviders';
import {
  type CreateResult, type FStatus, type FulfilRequest, type IdentityProbe, type MerchEnv, type Snapshot, type Tracking,
  arr, cents, errText, hexToBytes, hmacHex, http, obj, retryable, safeEqual, str,
} from './merchTypes';

const API = 'https://api.printful.com';

function headers(env: MerchEnv): Record<string, string> {
  return {
    Authorization: `Bearer ${env.PRINTFUL_TOKEN}`,
    'X-PF-Store-Id': String(env.PRINTFUL_STORE_ID ?? ''),
    'Content-Type': 'application/json',
  };
}

/** POST /v2/orders body (documented fields only). */
export function printfulOrderBody(req: FulfilRequest) {
  const s = req.shipTo;
  return {
    external_id: req.externalId,
    shipping: 'STANDARD',
    recipient: {
      name: s.name,
      address1: s.line1,
      ...(s.line2 ? { address2: s.line2 } : {}),
      city: s.city,
      ...(s.state ? { state_code: s.state } : {}),
      country_code: s.country,
      zip: s.postalCode,
      ...(s.phone ? { phone: s.phone } : {}),
      email: s.email,
    },
    order_items: req.lines.map((l, i) => {
      const byArea = new Map<string, { placement: string; technique: string; layers: { type: 'file'; url: string }[] }>();
      for (const f of l.files) {
        const p = byArea.get(f.area) ?? { placement: f.area, technique: f.technique ?? 'dtg', layers: [] };
        p.layers.push({ type: 'file', url: f.url });
        byArea.set(f.area, p);
      }
      return {
        source: 'catalog',
        catalog_variant_id: Number(variantId(l.variant)),
        quantity: l.qty,
        external_id: `${req.externalId}-${i + 1}`,
        name: [l.title, l.colour, l.size].filter(Boolean).join(' · '),
        retail_price: cents(l.unitCents),
        placements: [...byArea.values()],
      };
    }),
    customization: {
      packing_slip: {
        email: req.contactEmail,
        store_name: BRAND_NAME,
        message: `Thank you for playing ${BRAND_NAME} · ${BRAND_SITE}`,
        custom_order_id: req.shortId,
      },
    },
    retail_costs: {
      currency: req.currency,
      subtotal: cents(req.totals.subtotalCents),
      shipping: cents(req.totals.shippingCents),
      tax: cents(req.totals.taxCents),
      total: cents(req.totals.totalCents),
    },
  };
}

export function printfulStatus(s: string, shipments: Tracking[]): FStatus {
  switch (s) {
    case 'fulfilled': return shipments.some(t => t.deliveredAt) && shipments.every(t => t.deliveredAt) ? 'delivered' : 'shipped';
    case 'partial': return 'partially_shipped';
    case 'inprocess': return shipments.length ? 'partially_shipped' : 'in_production';
    case 'canceled': return 'canceled';
    case 'failed': return 'failed';
    default: return 'submitted';   // draft, pending, inreview, onhold
  }
}

async function confirm(env: MerchEnv, id: string): Promise<CreateResult> {
  const r = await http(`${API}/v2/orders/${encodeURIComponent(id)}/confirmation`, { method: 'POST', headers: headers(env) });
  if (r.ok) return { ok: true, providerOrderId: id, status: 'submitted' };
  // already confirmed → fine
  if (r.status === 400 && /confirm|status/i.test(r.text)) return { ok: true, providerOrderId: id, status: 'submitted' };
  return { ok: false, retry: retryable(r.status), error: `confirm ${errText(r)}` };
}

export const printful: Provider = {
  id: 'printful',
  label: 'Printful',
  enabled: env => !!(env.PRINTFUL_TOKEN && env.PRINTFUL_STORE_ID),
  expectedStoreId: env => env.PRINTFUL_STORE_ID ?? null,

  async identity(env): Promise<IdentityProbe> {
    const r = await http(`${API}/v2/stores`, { headers: headers(env) });
    if (!r.ok) return { error: errText(r) };
    const stores = arr(obj(r.json).data).map(s => ({ id: str(obj(s).id) ?? '', name: str(obj(s).name) ?? '' }));
    return { stores };
  },

  build: printfulOrderBody,

  async create(env, req, existingId): Promise<CreateResult> {
    let id = existingId;
    if (!id) {
      const r = await http(`${API}/v2/orders`, { method: 'POST', headers: headers(env), body: JSON.stringify(printfulOrderBody(req)) });
      if (!r.ok) return { ok: false, retry: retryable(r.status), error: errText(r) };
      id = str(obj(obj(r.json).data).id);
      if (!id) return { ok: false, retry: true, error: 'Printful: no order id in response' };
    }
    if (req.draft) return { ok: true, providerOrderId: id, status: 'submitted' };
    return confirm(env, id);
  },

  async find(env, externalId) {
    const r = await http(`${API}/v2/orders/@${encodeURIComponent(externalId)}`, { headers: headers(env) });
    return r.ok ? str(obj(obj(r.json).data).id) : null;
  },

  async fetch(env, id): Promise<Snapshot | null> {
    const [o, sh] = await Promise.all([
      http(`${API}/v2/orders/${encodeURIComponent(id)}`, { headers: headers(env) }),
      http(`${API}/v2/orders/${encodeURIComponent(id)}/shipments`, { headers: headers(env) }),
    ]);
    if (!o.ok) return null;
    const d = obj(obj(o.json).data);
    const tracking: Tracking[] = arr(obj(sh.json).data).map(x => {
      const s = obj(x);
      return {
        carrier: str(s.carrier), number: str(s.tracking_number), url: str(s.tracking_url),
        shippedAt: str(s.shipped_at), deliveredAt: str(s.delivered_at),
      };
    }).filter(t => t.number || t.url);
    const ps = str(d.status) ?? 'unknown';
    return { status: printfulStatus(ps, tracking), tracking, providerStatus: ps, attention: ps === 'onhold' ? 'Printful: order on hold (billing / file issue) — check the Printful dashboard' : ps === 'failed' ? 'Printful: order failed' : null };
  },

  async verifyHook(env, headersIn, raw) {
    if (!env.PRINTFUL_WEBHOOK_SECRET) return true;      // URL token already checked; status is re-fetched from the API anyway
    const sig = (headersIn.get('x-pf-webhook-signature') ?? '').toLowerCase();
    if (!sig) return false;
    const key = hexToBytes(env.PRINTFUL_WEBHOOK_SECRET) ?? env.PRINTFUL_WEBHOOK_SECRET;
    return safeEqual(await hmacHex(key, raw), sig);
  },

  hookRef(payload) {
    const p = obj(payload), d = obj(p.data), o = obj(d.order);
    return { storeId: str(p.store_id), providerOrderId: str(o.id), externalId: str(o.external_id) };
  },

  async catalog(env, q) {
    const product = q.get('product');
    const url = product
      ? `${API}/v2/catalog-products/${encodeURIComponent(product)}/catalog-variants`
      : `${API}/v2/catalog-products?limit=100&offset=${Number(q.get('offset') ?? 0) || 0}`;
    const r = await http(url, { headers: headers(env) });
    return { ok: r.ok, status: r.status, data: r.json };
  },

  async shippingQuote(env, req) {
    const r = await http(`${API}/v2/shipping-rates`, {
      method: 'POST', headers: headers(env),
      body: JSON.stringify({
        recipient: { country_code: req.country },
        order_items: req.lines.map(l => ({ source: 'catalog', catalog_variant_id: Number(variantId(l.variant)), quantity: l.qty })),
        currency: 'EUR',
      }),
    }, 8000);
    if (!r.ok) return null;
    const rates = arr(obj(r.json).data).map(x => obj(x));
    const std = rates.find(x => x.shipping === 'STANDARD') ?? rates[0];
    const v = Number(std?.rate);
    return Number.isFinite(v) && v >= 0 && str(std?.currency) === 'EUR' ? Math.round(v * 100) : null;
  },

  async registerHooks(env, url) {
    const r = await http(`${API}/v2/webhooks`, {
      method: 'POST', headers: headers(env),
      body: JSON.stringify({
        default_url: url,
        events: ['shipment_sent', 'shipment_delivered', 'shipment_returned', 'shipment_canceled', 'order_failed', 'order_canceled', 'order_put_hold', 'order_remove_hold']
          .map(type => ({ type })),
      }),
    });
    return { ok: r.ok, status: r.status, data: r.json, note: 'Copy data.secret_key into the PRINTFUL_WEBHOOK_SECRET secret to enable signature checks.' };
  },
};
