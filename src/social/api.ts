import { getSupabase } from '../supabase';
import type { SocialError } from './gifts';

/** Payments are live only when the Worker has all its secrets (see docs/PAYMENTS.md). Cached per page load. */
let payStatus: Promise<boolean> | null = null;
export function paymentsEnabled(): Promise<boolean> {
  payStatus ??= fetch('/api/pay/status', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() as Promise<{ enabled?: boolean }> : { enabled: false }))
    .then(j => !!j.enabled)
    .catch(() => false);
  return payStatus;
}

export type CheckoutResult = { url: string } | { error: 'unavailable' | 'auth' | 'network' | 'generic' };

/** Ask the Worker for a Stripe Checkout session and return its URL (the caller redirects). */
export async function startCheckout(pack: string, token: string, lang: string): Promise<CheckoutResult> {
  try {
    const r = await fetch('/api/pay/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ pack, lang }),
    });
    const j = await r.json().catch(() => ({})) as { url?: string; error?: string };
    if (r.ok && j.url && /^https:\/\/checkout\.stripe\.com\//.test(j.url)) return { url: j.url };
    if (r.status === 503) return { error: 'unavailable' };
    if (r.status === 401) return { error: 'auth' };
    return { error: 'generic' };
  } catch { return { error: 'network' }; }
}

export interface WalletPayment { at: string; pack: string; diamonds: number; amount_cents: number; currency: string; status: 'paid' | 'refunded' }
export interface WalletLedger { at: string; delta: number; balance: number; reason: 'purchase' | 'refund' | 'gift' | 'gift_item' | 'admin_grant' | 'correction'; ref: string | null }
export interface WalletGift { at: string; kind: 'table' | 'tip' | 'item'; to?: string; from?: string; gift: string | null; bm: number; diamonds?: number }
export interface Wallet { diamonds: number; bm: number; payments: WalletPayment[]; ledger: WalletLedger[]; sent: WalletGift[]; received: WalletGift[] }

export async function loadWallet(): Promise<Wallet | null> {
  const sb = await getSupabase(); if (!sb) return null;
  const { data, error } = await sb.rpc('my_wallet');
  return error || !data ? null : data as Wallet;
}

export interface InboxGift { id: number; at: string; kind: 'item' | 'tip'; from: string; gift: string | null; bm: number }
export async function giftInbox(): Promise<InboxGift[]> {
  const sb = await getSupabase(); if (!sb) return [];
  const { data, error } = await sb.rpc('gift_inbox');
  return error || !Array.isArray(data) ? [] : data as InboxGift[];
}
export async function markGiftsSeen(ids: number[]) {
  if (!ids.length) return;
  const sb = await getSupabase(); if (!sb) return;
  await sb.rpc('gifts_seen', { ids });
}

export interface GiftItemResult { ok: boolean; error?: SocialError; to_name?: string; diamonds?: number; need?: number; price?: number }
/** Buy a shop style for a friend (by nickname) with Diamonds. */
export async function giftItem(item: string, toName: string): Promise<GiftItemResult> {
  const sb = await getSupabase(); if (!sb) return { ok: false, error: 'network' };
  try {
    const { data, error } = await sb.rpc('gift_item', { p_item: item, p_to: null, p_to_name: toName });
    if (error) return { ok: false, error: error.code === '42883' ? 'unavailable' : 'generic' };
    return data as GiftItemResult;
  } catch { return { ok: false, error: 'network' }; }
}
