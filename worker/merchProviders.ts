/** Provider adapters (Printful / Gelato / Prodigi / Printify) behind one interface. */
import type { ProviderId } from '../src/merch/fulfillment';
import { gelato } from './merchGelato';
import { printful } from './merchPrintful';
import { printify } from './merchPrintify';
import { prodigi } from './merchProdigi';
import type { CreateResult, FulfilLine, FulfilRequest, IdentityProbe, MerchEnv, Snapshot } from './merchTypes';

export interface QuoteRequest { country: string; lines: FulfilLine[] }
export interface HookRef { storeId?: string | null; providerOrderId?: string | null; externalId?: string | null }

export interface Provider {
  id: ProviderId;
  label: string;
  /** All secrets this provider needs are set. */
  enabled(env: MerchEnv): boolean;
  /** The store / shop id the owner configured (PRINTFUL_STORE_ID, PRINTIFY_SHOP_ID, GELATO_STORE_ID). */
  expectedStoreId(env: MerchEnv): string | null;
  /** "whoami": stores visible to the key and/or references of orders that are not Bridge 125's. */
  identity(env: MerchEnv): Promise<IdentityProbe>;
  /** Pure request-body builder (unit-tested against the documented shapes). */
  build(req: FulfilRequest): unknown;
  /** Create (and confirm / send to production unless draft). `existingId` = an order found by external id → only finish it. */
  create(env: MerchEnv, req: FulfilRequest, existingId: string | null): Promise<CreateResult>;
  /** Provider order id for one of our external ids (to never create an order twice after a timeout). */
  find(env: MerchEnv, externalId: string): Promise<string | null>;
  /** Authoritative status + tracking from the provider API. */
  fetch(env: MerchEnv, providerOrderId: string): Promise<Snapshot | null>;
  verifyHook(env: MerchEnv, headers: Headers, raw: string): Promise<boolean>;
  hookRef(payload: unknown): HookRef;
  /** Admin catalogue lookup (variant ids for src/merch/fulfillment.ts). */
  catalog(env: MerchEnv, q: URLSearchParams): Promise<unknown>;
  shippingQuote?(env: MerchEnv, req: QuoteRequest): Promise<number | null>;
  registerHooks?(env: MerchEnv, url: string): Promise<unknown>;
}

export const PROVIDER_IMPLS: Record<ProviderId, Provider> = { printful, gelato, prodigi, printify };

export const providerById = (id: string): Provider | null => (id in PROVIDER_IMPLS ? PROVIDER_IMPLS[id as ProviderId] : null);

export function enabledProviders(env: MerchEnv): Set<ProviderId> {
  return new Set((Object.values(PROVIDER_IMPLS)).filter(p => p.enabled(env)).map(p => p.id));
}
