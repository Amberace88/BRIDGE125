/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRODUCTS } from '../src/merch/catalog';
import {
  BRAND, CATEGORY_DEFAULTS, EXTERNAL_PREFIX, FULFILMENT, SHIPPING_ZONES, fulfilmentFor, readyRoutes, resolveVariant, routeReady,
  shippingCents, variantKeys, zoneFor, type ProviderId, type Route,
} from '../src/merch/fulfillment';
import { hmacSha256Hex } from './pay';
import { brandGuard, clearBrandCache, evaluateIdentity } from './merchBrand';
import { decodeCart, encodeCart, sellableMap, validateCart } from './merchCart';
import { backoffMinutes, externalIdFor, fallbackProvider, mergeSnapshot, routeItems, shipToFrom, submitFulfilment } from './merchFulfil';
import { gelatoForeign, gelatoOrderBody, gelatoStatus } from './merchGelato';
import { printfulOrderBody, printfulStatus } from './merchPrintful';
import { printifyOrderBody, printifyStatus } from './merchPrintify';
import { prodigiOrderBody, prodigiStatus } from './merchProdigi';
import { PROVIDER_IMPLS } from './merchProviders';
import { handleMerch } from './merch';
import { addressFromSession, checkoutParams, merchStripeEvent } from './merchStripe';
import type { FulfilmentRow, OrderRow } from './merchStore';
import { hmacHex, hookToken, type FulfilRequest, type MerchEnv } from './merchTypes';

const tee = PRODUCTS.find(p => p.id === 'tee-queen')!;
const mug = PRODUCTS.find(p => p.id === 'mug-seven')!;

/** Temporarily map variants in FULFILMENT (restored after each test). */
const saved: [Route, Record<string, unknown>][] = [];
function mapVariant(productId: string, provider: ProviderId, key: string, value: string | number) {
  const r = FULFILMENT[productId].routes.find(x => x.provider === provider)!;
  saved.push([r, { ...r.variants }]);
  r.variants[key] = value;
}
afterEach(() => { for (const [r, v] of saved.splice(0).reverse()) r.variants = v as Route['variants']; clearBrandCache(); vi.unstubAllGlobals(); });

/* ------------------------------------------------------------------------------------------------ cart / prices */

describe('cart validation (server prices only)', () => {
  it('prices from the catalogue, ignoring any client price, with size deltas', () => {
    const c = validateCart([
      { productId: 'tee-queen', colour: 'ink', size: '3XL', qty: 2, price: 0.01, unitCents: 1 },
      { productId: 'mug-seven', colour: null, size: null, qty: 1 },
    ]);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.lines[0].unitCents).toBe((tee.price + 3) * 100);
    expect(c.lines[1].unitCents).toBe(mug.price * 100);
    expect(c.lines[1].colour).toBe('white');   // single-colour product defaults
    expect(c.subtotalCents).toBe(2 * (tee.price + 3) * 100 + mug.price * 100);
  });

  it('merges duplicate lines and enforces limits', () => {
    const c = validateCart([{ productId: 'tee-queen', colour: 'ink', size: 'L', qty: 3 }, { productId: 'tee-queen', colour: 'ink', size: 'L', qty: 2 }]);
    expect(c.ok && c.lines.length === 1 && c.lines[0].qty === 5).toBe(true);
    expect(validateCart([{ productId: 'tee-queen', colour: 'ink', size: 'L', qty: 6 }, { productId: 'tee-queen', colour: 'ink', size: 'L', qty: 6 }]).ok).toBe(false);
  });

  it.each([
    ['empty', []],
    ['not an array', { productId: 'deck' }],
    ['unknown product', [{ productId: 'rojo-tee', colour: null, size: null, qty: 1 }]],
    ['bad id', [{ productId: 'DROP TABLE', qty: 1 }]],
    ['missing size', [{ productId: 'tee-queen', colour: 'ink', size: null, qty: 1 }]],
    ['unknown size', [{ productId: 'tee-queen', colour: 'ink', size: '9XL', qty: 1 }]],
    ['missing colour on multi-colour', [{ productId: 'tee-queen', colour: null, size: 'L', qty: 1 }]],
    ['unknown colour', [{ productId: 'tee-queen', colour: 'pink', size: 'L', qty: 1 }]],
    ['size on sizeless', [{ productId: 'mug-seven', colour: null, size: 'L', qty: 1 }]],
    ['zero qty', [{ productId: 'mug-seven', colour: null, size: null, qty: 0 }]],
    ['fractional qty', [{ productId: 'mug-seven', colour: null, size: null, qty: 1.5 }]],
    ['too many', [{ productId: 'mug-seven', colour: null, size: null, qty: 11 }]],
  ])('rejects %s', (_n, items) => { expect(validateCart(items).ok).toBe(false); });

  it('round-trips the cart through Stripe metadata (≤ 500 chars per value)', () => {
    const c = validateCart(PRODUCTS.slice(0, 12).map(p => ({ productId: p.id, colour: p.colours[0].id, size: p.sizes?.[0]?.id ?? null, qty: 2 })));
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const meta = encodeCart(c.lines);
    for (const v of Object.values(meta)) expect(v.length).toBeLessThanOrEqual(500);
    const back = decodeCart(meta)!;
    expect(back.map(b => [b.productId, b.qty, b.unitCents])).toEqual(c.lines.map(l => [l.productId, l.qty, l.unitCents]));
    expect(decodeCart({})).toBeNull();
    expect(decodeCart({ cart0: 'x|y|z|NaN|1' })).toBeNull();
  });
});

/* ------------------------------------------------------------------------------------------------ routing */

describe('routing table', () => {
  it('every catalogue product has a fulfilment entry or a category default', () => {
    for (const p of PRODUCTS) {
      const f = fulfilmentFor(p.id, p.category);
      expect(f.title.length, p.id).toBeGreaterThan(2);
      expect(f.routes.length, p.id).toBeGreaterThan(0);
      for (const r of FULFILMENT[p.id]?.routes ?? []) for (const pf of r.files) expect(pf.file, p.id).toMatch(/^[\w./-]+\.(png|jpe?g|pdf)$/);
    }
    expect(fulfilmentFor('deck-new-thing', 'cards').routes).toBe(CATEGORY_DEFAULTS.cards);
  });

  it('nothing is sellable until a variant id is mapped AND the provider is configured', () => {
    expect(sellableMap(new Set(['gelato', 'printful', 'prodigi', 'printify']))).toEqual({});
    mapVariant('tee-queen', 'gelato', 'ink/L', 'apparel_product_gca_t-shirt_gsi_l_gco_black');
    expect(sellableMap(new Set<ProviderId>(['printful']))).toEqual({});
    expect(sellableMap(new Set<ProviderId>(['gelato']))).toEqual({ 'tee-queen': ['ink/L'] });
  });

  it('resolves variant ids from the most specific key', () => {
    expect(variantKeys('ink', 'L')).toEqual(['ink/L', 'ink/*', '*/L', '*']);
    const r: Route = { provider: 'gelato', files: [{ area: 'front', file: 'x.png' }], variants: { '*': 'all', 'ink/*': 'ink-any', 'ink/L': 'ink-l', '*/XL': 'xl' } };
    expect(resolveVariant(r, 'ink', 'L')).toBe('ink-l');
    expect(resolveVariant(r, 'ink', 'M')).toBe('ink-any');
    expect(resolveVariant(r, 'forest', 'XL')).toBe('xl');
    expect(resolveVariant(r, 'forest', 'M')).toBe('all');
    expect(routeReady({ ...r, files: [] }, 'ink', 'L')).toBe(false);   // no print file → not ready
    expect(routeReady({ provider: 'printify', files: [], variants: { '*': 12 } }, null, null)).toBe(false);
    expect(routeReady({ provider: 'printify', printify: { productId: 'abc' }, files: [], variants: { '*': 12 } }, null, null)).toBe(true);
  });

  it('routes by priority, falls back when the first provider is off, groups per provider', () => {
    mapVariant('tee-queen', 'gelato', 'ink/L', 'g-ink-l');
    mapVariant('tee-queen', 'printful', 'ink/L', 4017);
    mapVariant('cap-logo', 'printful', '*', 7853);
    const f = fulfilmentFor('tee-queen', 'apparel');
    expect(readyRoutes(f, 'ink', 'L', new Set<ProviderId>(['gelato', 'printful'])).map(r => r.provider)).toEqual(['gelato', 'printful']);
    expect(readyRoutes(f, 'ink', 'L', new Set<ProviderId>(['printful'])).map(r => r.provider)).toEqual(['printful']);

    const oid = '12345678-90ab-cdef-1234-567890abcdef';
    const r = routeItems([
      { productId: 'tee-queen', colour: 'ink', size: 'L', qty: 1, unitCents: 3200 },
      { productId: 'cap-logo', colour: 'ink', size: null, qty: 1, unitCents: 2700 },
      { productId: 'deck', colour: 'felt', size: null, qty: 1, unitCents: 1900 },
    ], new Set<ProviderId>(['gelato', 'printful']), oid);
    expect(r.fulfilments.map(f => [f.provider, f.external_id, f.status])).toEqual([
      ['gelato', 'b125-1234567890ab-ge', 'queued'],
      ['printful', 'b125-1234567890ab-pf', 'queued'],
      [null, null, 'failed'],
    ]);
    expect(r.items.map(i => i.fkey)).toEqual(['gelato', 'printful', 'none']);
    expect(fallbackProvider([{ product_id: 'tee-queen', colour: 'ink', size: 'L' }], ['gelato'], new Set<ProviderId>(['gelato', 'printful']))).toBe('printful');
    expect(fallbackProvider([{ product_id: 'tee-queen', colour: 'ink', size: 'L' }, { product_id: 'cap-logo', colour: 'ink', size: null }], ['gelato'], new Set<ProviderId>(['gelato', 'printful']))).toBe('printful');
    expect(fallbackProvider([{ product_id: 'tee-queen', colour: 'ink', size: 'L' }], ['gelato', 'printful'], new Set<ProviderId>(['gelato', 'printful']))).toBeNull();
  });

  it('external ids carry the brand prefix and fit Printful (≤ 32 chars)', () => {
    for (const p of ['printful', 'gelato', 'prodigi', 'printify'] as ProviderId[]) {
      const id = externalIdFor(crypto.randomUUID(), p);
      expect(id.startsWith(EXTERNAL_PREFIX)).toBe(true);
      expect(id.length).toBeLessThanOrEqual(32);
    }
  });

  it('flat shipping by zone with a free-shipping threshold', () => {
    const eu = zoneFor('LV')!;
    expect(eu.id).toBe('eu');
    expect(zoneFor('ES')!.id).toBe('eu');
    expect(zoneFor('GB')!.id).toBe('europe');
    expect(zoneFor('US')!.id).toBe('world');
    expect(zoneFor('KP')).toBeNull();
    expect(shippingCents(eu, 1000)).toBe(eu.cents);
    expect(shippingCents(eu, eu.freeOverCents!)).toBe(0);
    expect(new Set(SHIPPING_ZONES.flatMap(z => z.countries)).size).toBe(SHIPPING_ZONES.flatMap(z => z.countries).length);
  });

  it('retries back off and status never moves backwards', () => {
    expect([1, 2, 3, 8, 99].map(backoffMinutes)).toEqual([1, 5, 15, 1440, 1440]);
    const m = mergeSnapshot({ status: 'shipped', shipped_at: '2026-01-01', delivered_at: null, tracking: [] }, { status: 'in_production', tracking: [], providerStatus: 'x', attention: null });
    expect(m.status).toBe('shipped');
    const c = mergeSnapshot({ status: 'submitted', shipped_at: null, delivered_at: null, tracking: [] }, { status: 'canceled', tracking: [], providerStatus: 'canceled', attention: null });
    expect(c.status).toBe('canceled');
  });
});

/* ------------------------------------------------------------------------------------------------ brand guard */

describe('brand guard', () => {
  it('store-scoped providers: id must exist and the name must say Bridge 125', () => {
    const stores = [{ id: '111', name: 'Rojo y Gualda' }, { id: '222', name: 'Bridge 125' }];
    expect(evaluateIdentity('printful', '222', { stores }).ok).toBe(true);
    expect(evaluateIdentity('printful', '222', { stores }).warnings.length).toBe(1);
    const wrong = evaluateIdentity('printful', '111', { stores });
    expect(wrong.ok).toBe(false);
    expect(wrong.reason).toContain('Rojo y Gualda');
    expect(evaluateIdentity('printify', '999', { stores }).ok).toBe(false);
    expect(evaluateIdentity('printify', null, { stores }).ok).toBe(false);
    expect(evaluateIdentity('printify', '222', { stores: [{ id: '222', name: 'bridge125 merch' }] }).ok).toBe(true);
    expect(evaluateIdentity('printful', '222', { error: 'HTTP 401' }).ok).toBe(false);
  });

  it('account-wide providers: refuse when the account has orders of another brand', () => {
    expect(evaluateIdentity('gelato', null, { foreignRefs: [] }).ok).toBe(true);
    const r = evaluateIdentity('prodigi', null, { foreignRefs: ['RYG-1001', 'RYG-1002'] });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('RYG-1001');
    expect(gelatoForeign([
      { orderReferenceId: 'b125-abc-ge', channel: 'api' },
      { orderReferenceId: 'sample', channel: 'ui' },
      { orderReferenceId: '#1001', channel: 'shopify' },
    ])).toEqual(['#1001']);
    expect(gelatoForeign([{ orderReferenceId: 'b125-x', storeId: 'other' }], 'mine')).toEqual(['b125-x']);
  });

  it('refuses to send an order to a store that is not Bridge 125 (no order request is made)', async () => {
    mapVariant('cap-logo', 'printful', '*', 7853);
    const env = baseEnv({ PRINTFUL_TOKEN: 'pf_test', PRINTFUL_STORE_ID: '111', MERCH_PRINT_BASE_URL: 'https://cdn.example/print' });
    const calls: string[] = [];
    const patches: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.includes('/v2/stores')) return Response.json({ data: [{ id: 111, name: 'Rojo y Gualda', type: 'native' }] });
      if (url.includes('/rest/v1/merch_orders')) return Response.json([order([{ id: 1, order_id: ORDER.id, fulfilment_id: 7, product_id: 'cap-logo', colour: 'ink', size: null, qty: 1, unit_cents: 2700, title: 'Cap' }])]);
      if (url.includes('/rest/v1/merch_fulfilments') && init?.method === 'PATCH') { patches.push(JSON.parse(String(init.body))); return new Response(null, { status: 204 }); }
      return new Response('unexpected', { status: 500 });
    }));
    const out = await submitFulfilment(env, ful({ id: 7, provider: 'printful', external_id: 'b125-aaaaaaaaaaaa-pf' }));
    expect(out.result).toBe('failed');
    expect(out.detail).toContain('brand guard');
    expect(calls.some(c => c.startsWith('POST https://api.printful.com/v2/orders'))).toBe(false);
    expect(patches.at(-1)).toMatchObject({ status: 'failed' });
  });

  it('caches the whoami result', async () => {
    const f = vi.fn(async () => Response.json({ data: [{ id: 222, name: 'Bridge 125' }] }));
    vi.stubGlobal('fetch', f);
    const env = baseEnv({ PRINTFUL_TOKEN: 't', PRINTFUL_STORE_ID: '222' });
    expect((await brandGuard(env, 'printful')).ok).toBe(true);
    expect((await brandGuard(env, 'printful')).ok).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------------------------------------ provider payloads */

const REQ: FulfilRequest = {
  provider: 'printful', externalId: 'b125-0123456789ab-pf', orderId: '01234567-89ab-cdef-0123-456789abcdef', shortId: '01234567', currency: 'EUR',
  lines: [{
    productId: 'tee-queen', title: 'Queen of Spades Tee', colour: 'ink', size: 'L', qty: 2, unitCents: 3200,
    route: FULFILMENT['tee-queen'].routes[1], variant: 4017,
    files: [{ area: 'front', url: 'https://bridge125.com/print/abc/queen-of-spades.png', technique: 'dtg' }],
  }],
  shipTo: { name: 'Anna Bērziņa', firstName: 'Anna', lastName: 'Bērziņa', line1: 'Brīvības iela 1', line2: null, city: 'Rīga', state: null, postalCode: 'LV-1010', country: 'LV', email: 'anna@example.lv', phone: '+37120000000' },
  totals: { subtotalCents: 6400, shippingCents: 590, taxCents: 1214, totalCents: 6990 },
  draft: false, callbackUrl: 'https://bridge125.com/api/merch/hooks/prodigi?t=tok', contactEmail: 'hello@bridge125.com', returnAddress: null,
};

describe('provider payloads (documented request shapes)', () => {
  it('Printful v2 POST /v2/orders', () => {
    expect(printfulOrderBody(REQ)).toEqual({
      external_id: 'b125-0123456789ab-pf',
      shipping: 'STANDARD',
      recipient: { name: 'Anna Bērziņa', address1: 'Brīvības iela 1', city: 'Rīga', country_code: 'LV', zip: 'LV-1010', phone: '+37120000000', email: 'anna@example.lv' },
      order_items: [{
        source: 'catalog', catalog_variant_id: 4017, quantity: 2, external_id: 'b125-0123456789ab-pf-1', name: 'Queen of Spades Tee · ink · L', retail_price: '32.00',
        placements: [{ placement: 'front', technique: 'dtg', layers: [{ type: 'file', url: 'https://bridge125.com/print/abc/queen-of-spades.png' }] }],
      }],
      customization: { packing_slip: { email: 'hello@bridge125.com', store_name: 'Bridge 125', message: 'Thank you for playing Bridge 125 · bridge125.com', custom_order_id: '01234567' } },
      retail_costs: { currency: 'EUR', subtotal: '64.00', shipping: '5.90', tax: '12.14', total: '69.90' },
    });
  });

  it('Gelato v4 POST /v4/orders', () => {
    const r = { ...REQ, externalId: 'b125-0123456789ab-ge', lines: [{ ...REQ.lines[0], variant: 'apparel_product_gca_t-shirt_gsi_l_gco_black', files: [{ area: 'front', url: 'https://x/p.png' }] }] };
    expect(gelatoOrderBody(r)).toEqual({
      orderType: 'order',
      orderReferenceId: 'b125-0123456789ab-ge',
      customerReferenceId: 'b125-0123456789ab-ge',
      currency: 'EUR',
      items: [{ itemReferenceId: 'b125-0123456789ab-ge-1', productUid: 'apparel_product_gca_t-shirt_gsi_l_gco_black', files: [{ type: 'front', url: 'https://x/p.png' }], quantity: 2 }],
      shippingAddress: { firstName: 'Anna', lastName: 'Bērziņa', addressLine1: 'Brīvības iela 1', city: 'Rīga', postCode: 'LV-1010', country: 'LV', email: 'anna@example.lv', phone: '+37120000000' },
      returnAddress: { companyName: 'Bridge 125', email: 'hello@bridge125.com' },
      metadata: [{ key: 'brand', value: BRAND }, { key: 'site', value: 'bridge125.com' }, { key: 'order', value: REQ.orderId }],
    });
    expect(gelatoOrderBody({ ...r, draft: true }).orderType).toBe('draft');
  });

  it('Prodigi v4 POST /v4.0/Orders', () => {
    const r = { ...REQ, externalId: 'b125-0123456789ab-pd', lines: [{ ...REQ.lines[0], route: FULFILMENT['poster-riga'].routes[1], variant: { id: 'GLOBAL-CFP-12X16', attributes: { color: 'black' } }, qty: 1, files: [{ area: 'default', url: 'https://x/r.jpg' }] }] };
    expect(prodigiOrderBody(r)).toEqual({
      merchantReference: 'b125-0123456789ab-pd',
      shippingMethod: 'Standard',
      callbackUrl: 'https://bridge125.com/api/merch/hooks/prodigi?t=tok',
      recipient: { name: 'Anna Bērziņa', email: 'anna@example.lv', phoneNumber: '+37120000000', address: { line1: 'Brīvības iela 1', postalOrZipCode: 'LV-1010', countryCode: 'LV', townOrCity: 'Rīga' } },
      items: [{ merchantReference: 'b125-0123456789ab-pd-1', sku: 'GLOBAL-CFP-12X16', copies: 1, sizing: 'fillPrintArea', attributes: { color: 'black' }, assets: [{ printArea: 'default', url: 'https://x/r.jpg' }] }],
      metadata: { brand: BRAND, site: 'bridge125.com', order: REQ.orderId },
    });
  });

  it('Printify v1 POST /v1/shops/{shop}/orders.json — product and blueprint line items', () => {
    const product = { ...REQ.lines[0], route: { provider: 'printify' as const, printify: { productId: '5d39b159e7c48c000728c89f' }, files: [], variants: {} }, variant: 33719, files: [] };
    const blueprint = { ...REQ.lines[0], route: { provider: 'printify' as const, printify: { blueprintId: 6, printProviderId: 29 }, files: [{ area: 'front', file: 'x.png' }], variants: {} }, variant: 12100, files: [{ area: 'front', url: 'https://x/f.png' }] };
    expect(printifyOrderBody({ ...REQ, externalId: 'b125-0123456789ab-pi', lines: [product, blueprint] })).toEqual({
      external_id: 'b125-0123456789ab-pi',
      label: 'b125-0123456789ab-pi',
      line_items: [
        { product_id: '5d39b159e7c48c000728c89f', variant_id: 33719, quantity: 2 },
        { blueprint_id: 6, print_provider_id: 29, variant_id: 12100, print_areas: { front: 'https://x/f.png' }, quantity: 2 },
      ],
      shipping_method: 1,
      send_shipping_notification: true,
      address_to: { first_name: 'Anna', last_name: 'Bērziņa', email: 'anna@example.lv', phone: '+37120000000', country: 'LV', address1: 'Brīvības iela 1', city: 'Rīga', zip: 'LV-1010' },
    });
  });

  it('maps provider statuses', () => {
    expect(printfulStatus('inprocess', [])).toBe('in_production');
    expect(printfulStatus('fulfilled', [{ carrier: 'DHL', number: '1', url: null, shippedAt: null }])).toBe('shipped');
    expect(printfulStatus('canceled', [])).toBe('canceled');
    expect(gelatoStatus('printed')).toBe('in_production');
    expect(gelatoStatus('delivered')).toBe('delivered');
    expect(prodigiStatus({ status: { stage: 'Complete' } }, [])).toBe('shipped');
    expect(prodigiStatus({ status: { stage: 'InProgress', details: { inProduction: 'InProgress' } } }, [])).toBe('in_production');
    expect(printifyStatus('partially-fulfilled', [])).toBe('partially_shipped');
  });
});

/* ------------------------------------------------------------------------------------------------ Stripe */

const SECRET = 'whsec_test_secret';
function baseEnv(extra: Partial<MerchEnv> = {}): MerchEnv {
  return {
    SUPABASE_URL: 'https://db.example', SUPABASE_ANON_KEY: 'sb_publishable_x', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x',
    STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: SECRET, PUBLIC_ORIGIN: 'https://bridge125.com', ...extra,
  };
}
const ORDER: OrderRow = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', brand: 'bridge125', created_at: '2026-10-13T10:00:00Z', user_id: null, email: 'anna@example.lv', lang: 'lv',
  stripe_session_id: 'cs_test_abc', status: 'paid', needs_attention: false, subtotal_cents: 2700, shipping_cents: 590, tax_cents: 0, total_cents: 3290, ship_country: 'LV',
  shipping_address: { name: 'Anna Bērziņa', line1: 'Brīvības iela 1', city: 'Rīga', postal_code: 'LV-1010', country: 'LV' }, refunded_at: null,
};
const order = (items: OrderRow['merch_order_items']): OrderRow => ({ ...ORDER, merch_order_items: items });
const ful = (p: Partial<FulfilmentRow>): FulfilmentRow => ({
  id: 1, order_id: ORDER.id, provider: 'printful', tried: [], external_id: 'b125-aaaaaaaaaaaa-pf', provider_order_id: null, status: 'submitting', provider_status: null,
  attention: null, attempts: 1, next_attempt_at: '', last_error: null, tracking: [], submitted_at: null, shipped_at: null, delivered_at: null, ...p,
});

async function signed(body: unknown, secret = SECRET) {
  const raw = JSON.stringify(body);
  const t = Math.floor(Date.now() / 1000);
  return { raw, header: `t=${t},v1=${await hmacSha256Hex(secret, `${t}.${raw}`)}` };
}

describe('Stripe checkout + webhook', () => {
  it('builds Checkout params from server prices with zone shipping and brand metadata', () => {
    const c = validateCart([{ productId: 'tee-queen', colour: 'forest', size: 'M', qty: 1 }]);
    if (!c.ok) throw new Error('cart');
    const zone = zoneFor('LV')!;
    const p = checkoutParams({ lines: c.lines, subtotalCents: c.subtotalCents, zone, shipCents: 590, origin: 'https://bridge125.com', lang: 'lv', user: null, automaticTax: false, imageOrigin: 'https://bridge125.com' });
    expect(p['line_items[0][price_data][unit_amount]']).toBe(tee.price * 100);
    expect(p['line_items[0][price_data][tax_behavior]']).toBe('inclusive');
    expect(p['line_items[0][price_data][product_data][images][0]']).toMatch(/^https:\/\/bridge125\.com\/merch\/mockups\//);
    expect(p['metadata[kind]']).toBe('merch');
    expect(p['metadata[brand]']).toBe('bridge125');
    expect(p['payment_intent_data[metadata][brand]']).toBe('bridge125');
    expect(p['metadata[cart0]']).toBe(`tee-queen|forest|M|1|${tee.price * 100}`);
    expect(p['shipping_options[0][shipping_rate_data][fixed_amount][amount]']).toBe(590);
    expect(p.success_url).toBe('https://bridge125.com/merch?order=success&sid={CHECKOUT_SESSION_ID}');
    expect(p.cancel_url).toBe('https://bridge125.com/merch?order=cancel');
    expect(Object.keys(p).filter(k => k.startsWith('shipping_address_collection')).length).toBe(zone.countries.length);
    expect(p.customer_email).toBeUndefined();
    expect(p['automatic_tax[enabled]']).toBeUndefined();
  });

  it('reads shipping details from both Stripe API shapes', () => {
    const a = { name: 'A B', address: { line1: 'L1', line2: null, city: 'Rīga', state: null, postal_code: 'LV-1', country: 'lv' } };
    expect(addressFromSession({ collected_information: { shipping_details: a }, customer_details: { phone: '+371' } })).toMatchObject({ line1: 'L1', country: 'LV', phone: '+371' });
    expect(addressFromSession({ shipping_details: a })).toMatchObject({ name: 'A B', city: 'Rīga' });
    expect(addressFromSession({})).toBeNull();
    expect(shipToFrom({ email: 'x@y.lv', shipping_address: { name: 'Jānis Ozols Jr', line1: 'L', city: 'C', country: 'lv', postal_code: '1' } })).toMatchObject({ firstName: 'Jānis Ozols', lastName: 'Jr', country: 'LV' });
  });

  it('verifies the Stripe signature on /api/merch/webhook', async () => {
    const env = baseEnv({ GELATO_API_KEY: 'g' });
    const ev = { id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', metadata: { kind: 'merch', brand: 'bridge125' }, payment_status: 'unpaid' } } };
    const { raw, header } = await signed(ev);
    const ok = await handleMerch(new Request('https://bridge125.com/api/merch/webhook', { method: 'POST', body: raw, headers: { 'Stripe-Signature': header } }), env);
    expect(ok!.status).toBe(200);
    expect(await ok!.json()).toMatchObject({ pending: true });
    const bad = await signed(ev, 'whsec_wrong');
    const no = await handleMerch(new Request('https://bridge125.com/api/merch/webhook', { method: 'POST', body: raw, headers: { 'Stripe-Signature': bad.header } }), env);
    expect(no!.status).toBe(400);
    const none = await handleMerch(new Request('https://bridge125.com/api/merch/webhook', { method: 'POST', body: raw }), env);
    expect(none!.status).toBe(400);
  });

  it('records the order idempotently (same session → same order, Stripe retries are safe)', async () => {
    mapVariant('cap-logo', 'printful', '*', 7853);
    const env = baseEnv({ PRINTFUL_TOKEN: 'pf', PRINTFUL_STORE_ID: '222' });
    const recorded = new Map<string, string>();
    const bodies: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/rest/v1/rpc/merch_order_record')) {
        const p = JSON.parse(String(init!.body)).p as Record<string, unknown>;
        bodies.push(p);
        const sid = String(p.stripe_session_id);
        const created = !recorded.has(sid);
        if (created) recorded.set(sid, String(p.id));
        return Response.json({ id: recorded.get(sid), created });
      }
      if (url.includes('/rest/v1/merch_events')) return Response.json(bodies.length === 1 ? [{}] : []);
      if (url.endsWith('/rest/v1/rpc/merch_claim')) return Response.json([]);
      return new Response('unexpected ' + url, { status: 500 });
    }));
    const ev = {
      id: 'evt_A', type: 'checkout.session.completed',
      data: { object: {
        id: 'cs_test_same', payment_status: 'paid', payment_intent: 'pi_1', amount_subtotal: 2700, amount_total: 3290, currency: 'eur',
        total_details: { amount_shipping: 590, amount_tax: 0 }, customer_details: { email: 'anna@example.lv' },
        collected_information: { shipping_details: { name: 'Anna B', address: { line1: 'L1', city: 'Rīga', postal_code: 'LV-1', country: 'LV' } } },
        metadata: { kind: 'merch', brand: 'bridge125', zone: 'eu', lang: 'lv', cart0: 'cap-logo|ink|-|1|2700' },
      } },
    };
    const r1 = await merchStripeEvent(ev, env);
    const r2 = await merchStripeEvent({ ...ev, id: 'evt_B', type: 'checkout.session.async_payment_succeeded' }, env);
    const j1 = await r1.json() as { order: string; created: boolean }, j2 = await r2.json() as { order: string; created: boolean; duplicate_event: boolean };
    expect(j1.created).toBe(true);
    expect(j2.created).toBe(false);
    expect(j2.order).toBe(j1.order);
    expect(bodies[0]).toMatchObject({ brand: 'bridge125', stripe_session_id: 'cs_test_same', ship_country: 'LV', total_cents: 3290 });
    expect((bodies[0].fulfilments as { provider: string; external_id: string }[])[0]).toMatchObject({ provider: 'printful' });
    expect((bodies[0].fulfilments as { external_id: string }[])[0].external_id.startsWith('b125-')).toBe(true);
  });

  it('ignores sessions of another brand and never records them', async () => {
    const f = vi.fn(async () => Response.json({}));
    vi.stubGlobal('fetch', f);
    const res = await merchStripeEvent({ id: 'e', type: 'checkout.session.completed', data: { object: { id: 'cs_x', payment_status: 'paid', metadata: { kind: 'merch', brand: 'rojoygualda' } } } }, baseEnv({ GELATO_API_KEY: 'g' }));
    expect(await res.json()).toMatchObject({ ignored: 'brand' });
    expect(f).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------------------------------------ provider orders */

describe('provider submission', () => {
  beforeEach(() => clearBrandCache());

  it('never creates a second provider order after a timeout: looks the external id up first', async () => {
    mapVariant('cap-logo', 'printful', '*', 7853);
    const env = baseEnv({ PRINTFUL_TOKEN: 'pf', PRINTFUL_STORE_ID: '222', MERCH_PRINT_BASE_URL: 'https://cdn.example/print' });
    const calls: string[] = [];
    const patches: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); const m = init?.method ?? 'GET'; calls.push(`${m} ${url}`);
      if (url.endsWith('/v2/stores')) return Response.json({ data: [{ id: 222, name: 'Bridge 125' }] });
      if (url.includes('/v2/orders/@b125-')) return Response.json({ data: { id: 9001, status: 'draft' } });
      if (url.endsWith('/v2/orders/9001/confirmation')) return Response.json({ data: { id: 9001, status: 'pending' } });
      if (url.includes('/rest/v1/merch_orders')) return Response.json([order([{ id: 1, order_id: ORDER.id, fulfilment_id: 5, product_id: 'cap-logo', colour: 'ink', size: null, qty: 1, unit_cents: 2700, title: 'Cap' }])]);
      if (url.includes('/rest/v1/merch_fulfilments')) { patches.push(JSON.parse(String(init!.body))); return new Response(null, { status: 204 }); }
      return new Response('unexpected', { status: 500 });
    }));
    const out = await submitFulfilment(env, ful({ id: 5, attempts: 2 }));
    expect(out.result).toBe('submitted');
    expect(calls.filter(c => c === 'POST https://api.printful.com/v2/orders')).toHaveLength(0);
    expect(calls).toContain('POST https://api.printful.com/v2/orders/9001/confirmation');
    expect(patches.at(-1)).toMatchObject({ status: 'submitted', provider_order_id: '9001' });
  });

  it('retries transient errors with backoff and falls back to the next provider on a hard rejection', async () => {
    mapVariant('tee-queen', 'gelato', 'ink/L', 'g-uid');
    mapVariant('tee-queen', 'printful', 'ink/L', 4017);
    const env = baseEnv({ GELATO_API_KEY: 'g', PRINTFUL_TOKEN: 'pf', PRINTFUL_STORE_ID: '222', MERCH_PRINT_BASE_URL: 'https://cdn.example/print' });
    let gelatoStatus = 503;
    const patches: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/v4/orders:search')) return Response.json({ orders: [] });
      if (url.endsWith('/v4/orders')) return new Response(JSON.stringify({ message: 'nope' }), { status: gelatoStatus });
      if (url.endsWith('/v2/stores')) return Response.json({ data: [{ id: 222, name: 'Bridge 125' }] });
      if (url.endsWith('/v2/orders')) return Response.json({ data: { id: 77 } });
      if (url.endsWith('/v2/orders/77/confirmation')) return Response.json({ data: { id: 77 } });
      if (url.includes('/rest/v1/merch_orders')) return Response.json([order([{ id: 1, order_id: ORDER.id, fulfilment_id: 3, product_id: 'tee-queen', colour: 'ink', size: 'L', qty: 1, unit_cents: 3200, title: 'Tee' }])]);
      if (url.includes('/rest/v1/merch_fulfilments')) { patches.push(JSON.parse(String(init!.body))); return new Response(null, { status: 204 }); }
      if (url.endsWith('/rest/v1/rpc/merch_claim')) return Response.json([ful({ id: 3, provider: 'printful', tried: ['gelato'], external_id: 'b125-aaaaaaaaaaaa-pf', attempts: 1 })]);
      return new Response('unexpected ' + url, { status: 500 });
    }));
    const t = await submitFulfilment(env, ful({ id: 3, provider: 'gelato', external_id: 'b125-aaaaaaaaaaaa-ge', attempts: 1 }));
    expect(t.result).toBe('retry');
    expect(patches.at(-1)).toMatchObject({ status: 'queued' });
    gelatoStatus = 400;
    const h = await submitFulfilment(env, ful({ id: 3, provider: 'gelato', external_id: 'b125-aaaaaaaaaaaa-ge', attempts: 1 }));
    expect(h.result).toBe('submitted');
    expect(patches.find(p => p.provider === 'printful')).toMatchObject({ provider: 'printful', tried: ['gelato'], external_id: 'b125-aaaaaaaaaaaa-pf' });
    expect(patches.at(-1)).toMatchObject({ status: 'submitted', provider_order_id: '77' });
  });
});

/* ------------------------------------------------------------------------------------------------ provider webhooks */

describe('provider webhooks', () => {
  it('require the secret URL token', async () => {
    const env = baseEnv({ GELATO_API_KEY: 'g' });
    const bad = await handleMerch(new Request('https://bridge125.com/api/merch/hooks/gelato?t=nope', { method: 'POST', body: '{}' }), env);
    expect(bad!.status).toBe(401);
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([])));
    const tok = await hookToken(env, 'gelato');
    const ok = await handleMerch(new Request(`https://bridge125.com/api/merch/hooks/gelato?t=${tok}`, { method: 'POST', body: JSON.stringify({ orderId: 'x', orderReferenceId: 'b125-x-ge' }) }), env);
    expect(ok!.status).toBe(200);
    expect(await ok!.json()).toMatchObject({ received: true, matched: false });
    expect(await hookToken(env, 'gelato')).not.toBe(await hookToken(env, 'prodigi'));
  });

  it('verify Printify (X-Pfy-Signature) and Printful (x-pf-webhook-signature) signatures', async () => {
    const env = baseEnv({ PRINTIFY_TOKEN: 'p', PRINTIFY_SHOP_ID: '1', PRINTFUL_TOKEN: 'f', PRINTFUL_STORE_ID: '2', PRINTFUL_WEBHOOK_SECRET: 'a1b2c3d4' });
    const raw = JSON.stringify({ type: 'order:shipment:created', resource: { id: 'o1', data: { shop_id: 1 } } });
    const good = `sha256=${await hmacHex(await hookToken(env, 'printify'), raw)}`;
    expect(await PROVIDER_IMPLS.printify.verifyHook(env, new Headers({ 'X-Pfy-Signature': good }), raw)).toBe(true);
    expect(await PROVIDER_IMPLS.printify.verifyHook(env, new Headers({ 'X-Pfy-Signature': 'sha256=00' }), raw)).toBe(false);
    expect(await PROVIDER_IMPLS.printify.verifyHook(env, new Headers(), raw)).toBe(false);
    const key = new Uint8Array([0xa1, 0xb2, 0xc3, 0xd4]);
    const pf = await hmacHex(key, raw);
    expect(await PROVIDER_IMPLS.printful.verifyHook(env, new Headers({ 'x-pf-webhook-signature': pf }), raw)).toBe(true);
    expect(await PROVIDER_IMPLS.printful.verifyHook(env, new Headers({ 'x-pf-webhook-signature': 'ff' }), raw)).toBe(false);
  });

  it('ignore events for another store', () => {
    expect(PROVIDER_IMPLS.printful.hookRef({ type: 'shipment_sent', store_id: 111, data: { order: { id: 5, external_id: 'RYG-1' } } })).toEqual({ storeId: '111', providerOrderId: '5', externalId: 'RYG-1' });
  });
});

/* ------------------------------------------------------------------------------------------------ not configured */

describe('without secrets', () => {
  it('answers 503 not_configured and reports disabled', async () => {
    const env: MerchEnv = { SUPABASE_URL: 'https://db.example', SUPABASE_ANON_KEY: 'x' };
    const call = (path: string, init?: RequestInit) => handleMerch(new Request(`https://bridge125.com${path}`, init), env);
    const st = await call('/api/merch/status');
    expect(await st!.json()).toMatchObject({ enabled: false, providers: [], sellable: {} });
    for (const [path, method] of [['/api/merch/checkout', 'POST'], ['/api/merch/webhook', 'POST'], ['/api/merch/order?sid=cs_test_aaaaaaaaaaaa', 'GET'], ['/api/merch/admin/providers', 'GET']] as const) {
      const r = await call(path, { method, body: method === 'POST' ? '{}' : undefined });
      expect(r!.status, path).toBe(503);
      expect(await r!.json(), path).toMatchObject({ error: 'unavailable', reason: 'not_configured' });
    }
    expect(await handleMerch(new Request('https://bridge125.com/api/pay/x'), env)).toBeNull();
  });
});

/* ------------------------------------------------------------------------------------------------ migration 021 */

describe('migration 021', () => {
  const sql = readFileSync(`${process.cwd()}/supabase/migration_021_merch_orders.sql`, 'utf8');
  it('locks the tables (RLS everywhere, owner/admin read, service-role writes) and pins the brand', () => {
    for (const t of ['merch_orders', 'merch_fulfilments', 'merch_order_items', 'merch_events']) expect(sql).toContain(`alter table public.${t} enable row level security`);
    expect(sql).toContain("check (brand = 'bridge125')");
    expect(sql).toContain("check (external_id is null or external_id like 'b125-%')");
    expect(sql).toMatch(/revoke all on public\.merch_orders, public\.merch_fulfilments, public\.merch_order_items, public\.merch_events from anon, authenticated/);
    expect(sql).toMatch(/using \(user_id = \(select auth\.uid\(\)\) or \(select public\.is_admin\(\)\)\)/);
    for (const fn of ['merch_order_record(jsonb)', 'merch_claim(bigint, integer)', 'merch_mark_refunded(text, text)']) {
      expect(sql).toContain(`revoke execute on function public.${fn} from public, anon, authenticated`);
      expect(sql).toContain(`grant execute on function public.${fn} to service_role`);
    }
    expect(sql).toContain('on conflict (stripe_session_id) do nothing');
    expect(sql).toContain('for update skip locked');
  });
});
