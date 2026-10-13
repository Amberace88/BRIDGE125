/**
 * Prodigi Print API v4 (https://www.prodigi.com/print-api/docs/reference/).
 * One API key = one Prodigi account, so Bridge 125 uses its own account; the brand guard refuses to send while the
 * key can see orders whose merchantReference is not a Bridge 125 one.
 */
import { BRAND, BRAND_SITE, EXTERNAL_PREFIX, variantAttributes, variantId } from '../src/merch/fulfillment';
import type { Provider } from './merchProviders';
import {
  type CreateResult, type FStatus, type FulfilRequest, type IdentityProbe, type MerchEnv, type Snapshot, type Tracking,
  arr, errText, http, obj, retryable, str,
} from './merchTypes';

const base = (env: MerchEnv) => (env.PRODIGI_SANDBOX === '1' ? 'https://api.sandbox.prodigi.com/v4.0' : 'https://api.prodigi.com/v4.0');
const headers = (env: MerchEnv) => ({ 'X-API-Key': String(env.PRODIGI_API_KEY ?? ''), 'Content-Type': 'application/json' });

/** POST /v4.0/Orders body (documented fields only). */
export function prodigiOrderBody(req: FulfilRequest) {
  const s = req.shipTo;
  return {
    merchantReference: req.externalId,
    shippingMethod: 'Standard',
    callbackUrl: req.callbackUrl,
    recipient: {
      name: s.name,
      email: s.email,
      ...(s.phone ? { phoneNumber: s.phone } : {}),
      address: {
        line1: s.line1,
        ...(s.line2 ? { line2: s.line2 } : {}),
        postalOrZipCode: s.postalCode,
        countryCode: s.country,
        townOrCity: s.city,
        ...(s.state ? { stateOrCounty: s.state } : {}),
      },
    },
    items: req.lines.map((l, i) => {
      const attributes = variantAttributes(l.variant);
      return {
        merchantReference: `${req.externalId}-${i + 1}`,
        sku: String(variantId(l.variant)),
        copies: l.qty,
        sizing: l.route.sizing ?? 'fillPrintArea',
        ...(attributes ? { attributes } : {}),
        assets: l.files.map(f => ({ printArea: f.area, url: f.url })),
      };
    }),
    metadata: { brand: BRAND, site: BRAND_SITE, order: req.orderId },
  };
}

export function prodigiStatus(order: Record<string, unknown>, tracking: Tracking[]): FStatus {
  const st = obj(order.status);
  const stage = str(st.stage);
  if (stage === 'Cancelled') return 'canceled';
  if (stage === 'Complete') return 'shipped';
  const shipments = arr(order.shipments);
  if (tracking.length && tracking.length >= shipments.length) return 'shipped';
  if (tracking.length) return 'partially_shipped';
  const d = obj(st.details);
  if (d.inProduction === 'InProgress' || d.inProduction === 'Complete' || d.shipping === 'InProgress') return 'in_production';
  return 'submitted';
}

export const prodigi: Provider = {
  id: 'prodigi',
  label: 'Prodigi',
  enabled: env => !!env.PRODIGI_API_KEY,
  expectedStoreId: () => null,

  async identity(env): Promise<IdentityProbe> {
    const r = await http(`${base(env)}/Orders?top=100`, { headers: headers(env) });
    if (!r.ok) return { error: errText(r) };
    const foreignRefs = arr(obj(r.json).orders).map(obj)
      .map(o => str(o.merchantReference) ?? str(o.id) ?? '?')
      .filter(ref => !ref.startsWith(EXTERNAL_PREFIX));
    return { foreignRefs };
  },

  build: prodigiOrderBody,

  async create(env, req, existingId): Promise<CreateResult> {
    if (existingId) return { ok: true, providerOrderId: existingId, status: 'submitted' };
    if (req.draft && env.PRODIGI_SANDBOX !== '1') return { ok: false, retry: false, error: 'MERCH_DRAFT_ORDERS=1: Prodigi has no draft orders — set PRODIGI_SANDBOX=1 to test' };
    const r = await http(`${base(env)}/Orders`, { method: 'POST', headers: headers(env), body: JSON.stringify(prodigiOrderBody(req)) });
    if (!r.ok) return { ok: false, retry: retryable(r.status), error: errText(r) };
    const id = str(obj(obj(r.json).order).id);
    if (!id) return { ok: false, retry: true, error: `Prodigi: ${str(obj(r.json).outcome) ?? 'no order id'}` };
    return { ok: true, providerOrderId: id, status: 'submitted' };
  },

  async find(env, externalId) {
    const r = await http(`${base(env)}/Orders?top=5&merchantReferences=${encodeURIComponent(externalId)}`, { headers: headers(env) });
    if (!r.ok) return null;
    const hit = arr(obj(r.json).orders).map(obj).find(o => o.merchantReference === externalId);
    return hit ? str(hit.id) : null;
  },

  async fetch(env, id): Promise<Snapshot | null> {
    const r = await http(`${base(env)}/Orders/${encodeURIComponent(id)}`, { headers: headers(env) });
    if (!r.ok) return null;
    const order = obj(obj(r.json).order);
    const tracking: Tracking[] = arr(order.shipments).map(x => {
      const s = obj(x), c = obj(s.carrier), t = obj(s.tracking);
      return { carrier: [str(c.name), str(c.service)].filter(Boolean).join(' ') || null, number: str(t.number), url: str(t.url), shippedAt: str(s.dispatchDate) };
    }).filter(t => t.number || t.url);
    const st = obj(order.status);
    const issues = arr(st.issues).map(obj).map(i => str(i.description) ?? str(i.errorCode)).filter(Boolean);
    const errored = Object.values(obj(st.details)).some(v => v === 'Error');
    return {
      status: prodigiStatus(order, tracking), tracking, providerStatus: str(st.stage) ?? 'unknown',
      attention: errored || issues.length ? `Prodigi: ${issues.join('; ') || 'a production step reported Error'}` : null,
    };
  },

  // Prodigi callbacks are unsigned: the per-order callback URL carries our secret token, and the order is re-read.
  async verifyHook() { return true; },

  hookRef(payload) {
    const p = obj(payload), order = obj(obj(p.data).order);
    return { providerOrderId: str(order.id) ?? str(p.subject), externalId: str(order.merchantReference) };
  },

  async catalog(env, q) {
    const sku = q.get('sku');
    if (!sku) return { ok: false, status: 400, data: { error: 'Pass ?sku=GLOBAL-… (Prodigi product SKU, see the Prodigi product catalogue).' } };
    const r = await http(`${base(env)}/products/${encodeURIComponent(sku)}`, { headers: headers(env) });
    return { ok: r.ok, status: r.status, data: r.json };
  },

  async shippingQuote(env, req) {
    const r = await http(`${base(env)}/quotes`, {
      method: 'POST', headers: headers(env),
      body: JSON.stringify({
        shippingMethod: 'Standard', destinationCountryCode: req.country, currencyCode: 'EUR',
        items: req.lines.map(l => ({
          sku: String(variantId(l.variant)), copies: l.qty,
          ...(variantAttributes(l.variant) ? { attributes: variantAttributes(l.variant) } : {}),
          assets: l.route.files.map(f => ({ printArea: f.area })),
        })),
      }),
    }, 8000);
    if (!r.ok) return null;
    const ship = obj(obj(obj(arr(obj(r.json).quotes)[0]).costSummary).shipping);
    const v = Number(ship.amount);
    return Number.isFinite(v) && v >= 0 && str(ship.currency) === 'EUR' ? Math.round(v * 100) : null;
  },
};
