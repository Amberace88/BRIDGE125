/**
 * Merch fulfilment routes (see docs/MERCH.md):
 *
 *   GET  /api/merch/status                 → { enabled, providers, sellable, zones }       (public)
 *   POST /api/merch/checkout               → { url }   body { items, lang, consent, country? }, Bearer token optional
 *   POST /api/merch/webhook                ← Stripe (optional separate endpoint; /api/pay/webhook handles merch too)
 *   GET  /api/merch/order?sid=cs_…         → status of a just-paid order (no personal data)
 *   POST /api/merch/hooks/<provider>?t=…   ← Printful / Gelato / Prodigi / Printify status callbacks
 *   GET  /api/merch/admin/providers        → stores, brand check, webhook URLs, mapping coverage   (admin)
 *   GET  /api/merch/admin/catalog?provider=…&…  → provider catalogue lookup for fulfillment.ts       (admin)
 *   POST /api/merch/admin/retry {id}       → re-queue + submit one fulfilment now                  (admin)
 *   POST /api/merch/admin/run              → process the queue + refresh statuses now               (admin)
 *   POST /api/merch/admin/register-hooks {provider} → create Printful / Printify webhooks            (admin)
 *
 * With no secrets every money-moving endpoint answers 503 {"error":"unavailable","reason":"not_configured"}.
 */
import { PRODUCTS } from '../src/merch/catalog';
import { BRAND, PROVIDERS, fulfilmentFor, routeReady } from '../src/merch/fulfillment';
import { paymentsEnabled, supaRpc } from './pay';
import { brandGuard, clearBrandCache } from './merchBrand';
import { sellableMap } from './merchCart';
import { handleProviderHook, merchCron, processQueue } from './merchFulfil';
import { printUrl } from './merchPrint';
import { PROVIDER_IMPLS, enabledProviders, providerById } from './merchProviders';
import { orderBySession, storeReady } from './merchStore';
import { activeZones, json, merchCheckout, merchEnabled, merchWebhook, type WaitUntil } from './merchStripe';
import { hookToken, type MerchEnv, safeEqual } from './merchTypes';

export { merchCron };
export { servePrint } from './merchPrint';

async function isAdmin(req: Request, env: MerchEnv): Promise<boolean> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (token.length < 20) return false;
  const r = await supaRpc<boolean>(env, 'is_admin', {}, { token });
  return r.ok && r.data === true;
}

function status(env: MerchEnv) {
  const enabled = enabledProviders(env);
  const on = merchEnabled(env);
  return {
    enabled: on,
    brand: BRAND,
    providers: [...enabled],
    sellable: on ? sellableMap(enabled) : {},
    zones: activeZones(env).map(z => ({ id: z.id, countries: z.countries, cents: z.cents, freeOverCents: z.freeOverCents, days: z.days })),
  };
}

async function providersReport(env: MerchEnv, origin: string) {
  const enabled = enabledProviders(env);
  const out = [];
  for (const id of PROVIDERS) {
    const p = PROVIDER_IMPLS[id];
    const configured = p.enabled(env);
    const guard = configured ? await brandGuard(env, id, { fresh: true }) : null;
    // mapping coverage: variants of every product that this provider could make today
    let mapped = 0, total = 0;
    const missingFiles = new Set<string>();
    for (const prod of PRODUCTS) {
      const f = fulfilmentFor(prod.id, prod.category);
      const route = f.routes.find(r => r.provider === id);
      if (!route) continue;
      const sizes = prod.sizes?.length ? prod.sizes.map(s => s.id) : [null];
      for (const c of prod.colours) for (const s of sizes) { total++; if (routeReady(route, c.id, s)) mapped++; }
      if (configured) for (const pf of route.files) if (!(await printUrl(env, pf.file))) missingFiles.add(pf.file);
    }
    out.push({
      id, label: p.label, configured,
      expectedStoreId: p.expectedStoreId(env),
      brand: guard,
      webhookUrl: configured ? `${origin}/api/merch/hooks/${id}?t=${await hookToken(env, id)}` : null,
      canRegisterHooks: !!p.registerHooks,
      mapping: { mapped, total },
      missingPrintFiles: [...missingFiles],
    });
  }
  return {
    stripe: paymentsEnabled(env), store: storeReady(env), enabled: merchEnabled(env), brand: BRAND,
    draftOrders: env.MERCH_DRAFT_ORDERS === '1', liveShipping: env.MERCH_LIVE_SHIPPING === '1',
    providers: out, enabledProviders: [...enabled],
  };
}

export async function handleMerch(req: Request, env: MerchEnv, ctx?: WaitUntil): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  if (!path.startsWith('/api/merch/')) return null;
  const method = req.method;
  const origin = ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') ? url.origin : env.PUBLIC_ORIGIN || url.origin).replace(/\/+$/, '');

  if (path === '/api/merch/status') return json(status(env));
  if (path === '/api/merch/checkout') return method === 'POST' ? merchCheckout(req, env) : json({ error: 'method' }, 405);
  if (path === '/api/merch/webhook') return method === 'POST' ? merchWebhook(req, env, ctx) : json({ error: 'method' }, 405);

  if (path === '/api/merch/order') {
    if (!storeReady(env)) return json({ error: 'unavailable', reason: 'not_configured' }, 503);
    const sid = url.searchParams.get('sid') ?? '';
    if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sid)) return json({ error: 'invalid' }, 400);
    const o = await orderBySession(env, sid);
    if (o === undefined) return json({ error: 'store' }, 502);
    return json(o ? { found: true, order: o } : { found: false, status: 'pending' });
  }

  const hook = path.match(/^\/api\/merch\/hooks\/([a-z]+)$/);
  if (hook) {
    if (method !== 'POST') return json({ error: 'method' }, 405);
    const p = providerById(hook[1]);
    if (!p) return json({ error: 'unknown provider' }, 404);
    if (!p.enabled(env) || !storeReady(env)) return json({ error: 'unavailable', reason: 'not_configured' }, 503);
    const expected = await hookToken(env, p.id);
    if (!expected || !safeEqual(url.searchParams.get('t') ?? '', expected)) return json({ error: 'token' }, 401);
    const raw = await req.text();
    if (raw.length > 512_000) return json({ error: 'too large' }, 413);
    if (!(await p.verifyHook(env, req.headers, raw))) return json({ error: 'signature' }, 401);
    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { return json({ error: 'bad' }, 400); }
    const work = handleProviderHook(env, p, payload).catch(e => { console.error('merch hook', p.id, e); return { matched: false }; });
    if (ctx) { ctx.waitUntil(work); return json({ received: true }); }
    return json({ received: true, ...(await work) });
  }

  if (path.startsWith('/api/merch/admin/')) {
    if (!storeReady(env)) return json({ error: 'unavailable', reason: 'not_configured' }, 503);
    if (!(await isAdmin(req, env))) return json({ error: 'forbidden' }, 403);
    const action = path.slice('/api/merch/admin/'.length);

    if (action === 'providers' && method === 'GET') { clearBrandCache(); return json(await providersReport(env, origin)); }

    if (action === 'catalog' && method === 'GET') {
      const p = providerById(url.searchParams.get('provider') ?? '');
      if (!p) return json({ error: 'provider?' }, 400);
      if (!p.enabled(env)) return json({ error: 'unavailable', reason: 'not_configured' }, 503);
      return json(await p.catalog(env, url.searchParams));
    }

    if (method !== 'POST') return json({ error: 'method' }, 405);
    let body: Record<string, unknown> = {};
    try { body = await req.json() as Record<string, unknown>; } catch { /* empty body ok */ }

    if (action === 'retry') {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return json({ error: 'invalid' }, 400);
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
      const r = await supaRpc<boolean>(env, 'admin_merch_action', { p_fulfilment: id, p_action: 'retry', p_note: null }, { token });
      if (!r.ok) return json({ error: 'rpc', status: r.status }, 502);
      if (r.data !== true) return json({ error: 'not retryable' }, 409);
      clearBrandCache();
      return json({ ok: true, results: await processQueue(env, { id, limit: 1 }) });
    }
    if (action === 'run') {
      clearBrandCache();
      return json({ ok: true, ...(await merchCron(env)) });
    }
    if (action === 'register-hooks') {
      const p = providerById(String(body.provider ?? ''));
      if (!p?.registerHooks) return json({ error: 'not supported — set the webhook URL in the provider dashboard' }, 400);
      if (!p.enabled(env)) return json({ error: 'unavailable', reason: 'not_configured' }, 503);
      const g = await brandGuard(env, p.id, { fresh: true });
      if (!g.ok) return json({ error: 'brand', reason: g.reason }, 409);
      return json(await p.registerHooks(env, `${origin}/api/merch/hooks/${p.id}?t=${await hookToken(env, p.id)}`));
    }
    return json({ error: 'not found' }, 404);
  }
  return json({ error: 'not found' }, 404);
}
