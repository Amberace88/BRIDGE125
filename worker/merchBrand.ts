/**
 * Brand guard — Bridge 125 orders can never be created in another brand's print store (e.g. Rojo y Gualda).
 *
 *  - Printful / Printify are store-scoped: the configured PRINTFUL_STORE_ID / PRINTIFY_SHOP_ID must exist for the
 *    key AND that store's name must contain "Bridge 125".
 *  - Gelato / Prodigi keys are account-wide: the account must hold no orders that are not Bridge 125's
 *    (merchantReference / orderReferenceId starting with "b125-"), i.e. a separate account for this brand.
 *
 * The check ("whoami") runs before checkout and before every provider order; results are cached per isolate
 * (10 min when OK, 1 min when not). Any doubt = refuse: the order waits in "needs attention" instead.
 */
import { BRAND_NAME, type ProviderId } from '../src/merch/fulfillment';
import { PROVIDER_IMPLS } from './merchProviders';
import type { IdentityProbe, MerchEnv } from './merchTypes';

export const brandNameMatches = (name: string | null | undefined) => /bridge\s*125/i.test(name ?? '');

export interface BrandCheck {
  provider: ProviderId;
  ok: boolean;
  reason: string | null;
  storeId: string | null;
  storeName: string | null;
  warnings: string[];
  checkedAt: number;
}

/** Pure decision from a whoami probe (unit-tested). */
export function evaluateIdentity(provider: ProviderId, expectedStoreId: string | null, probe: IdentityProbe, now = Date.now()): BrandCheck {
  const base = { provider, storeId: expectedStoreId, storeName: null as string | null, warnings: [] as string[], checkedAt: now };
  if (probe.error) return { ...base, ok: false, reason: `whoami failed: ${probe.error}` };

  if (provider === 'printful' || provider === 'printify') {
    if (!expectedStoreId) return { ...base, ok: false, reason: `${provider === 'printful' ? 'PRINTFUL_STORE_ID' : 'PRINTIFY_SHOP_ID'} is not set` };
    const stores = probe.stores ?? [];
    const store = stores.find(s => String(s.id) === String(expectedStoreId));
    if (!store) return { ...base, ok: false, reason: `store ${expectedStoreId} is not visible to this token (visible: ${stores.map(s => `${s.id} "${s.name}"`).join(', ') || 'none'})` };
    if (!brandNameMatches(store.name)) return { ...base, storeName: store.name, ok: false, reason: `store ${store.id} is named "${store.name}" — it must contain "${BRAND_NAME}"` };
    if (stores.length > 1) base.warnings.push(`this token can see ${stores.length} stores — orders still go only to "${store.name}" (${store.id}); a store-level token is safer`);
    return { ...base, storeName: store.name, ok: true, reason: null };
  }

  // gelato / prodigi: account-wide keys → the account must be Bridge 125-only
  const foreign = probe.foreignRefs ?? [];
  if (foreign.length) {
    return { ...base, ok: false, reason: `this ${provider} account has ${foreign.length} order(s) that are not Bridge 125's (${foreign.slice(0, 3).join(', ')}${foreign.length > 3 ? ', …' : ''}) — use a separate ${provider} account for Bridge 125` };
  }
  return { ...base, storeName: `${BRAND_NAME} (${provider} account)`, ok: true, reason: null };
}

const cache = new Map<string, BrandCheck>();
const TTL_OK = 10 * 60_000, TTL_FAIL = 60_000;

export function clearBrandCache() { cache.clear(); }

export async function brandGuard(env: MerchEnv, provider: ProviderId, opts: { fresh?: boolean } = {}): Promise<BrandCheck> {
  const p = PROVIDER_IMPLS[provider];
  if (!p.enabled(env)) return { provider, ok: false, reason: 'not configured', storeId: null, storeName: null, warnings: [], checkedAt: Date.now() };
  const hit = cache.get(provider);
  const now = Date.now();
  if (!opts.fresh && hit && now - hit.checkedAt < (hit.ok ? TTL_OK : TTL_FAIL)) return hit;
  let probe: IdentityProbe;
  try { probe = await p.identity(env); } catch (e) { probe = { error: (e as Error).message }; }
  const res = evaluateIdentity(provider, p.expectedStoreId(env), probe, now);
  cache.set(provider, res);
  if (!res.ok) console.warn('merch brand guard refused', provider, res.reason);
  return res;
}
