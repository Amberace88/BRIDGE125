import { getSupabase } from '../supabase';

export type InterestResult = 'ok' | 'invalid' | 'rate_limited' | 'offline' | 'error';

/** Store an email + product + variant via the merch_interest_add RPC (supabase/migration_005_merch.sql). */
export async function addInterest(email: string, productId: string, variant: string, lang: string): Promise<InterestResult> {
  const sb = await getSupabase().catch(() => null);
  if (!sb) return 'offline';
  try {
    const { data, error } = await sb.rpc('merch_interest_add', { email: email.trim(), product_id: productId, variant: variant || null, lang });
    if (error) return /fetch|network/i.test(error.message) ? 'offline' : 'error';
    return data === 'ok' || data === 'invalid' || data === 'rate_limited' ? data : 'error';
  } catch {
    return 'offline';
  }
}

export interface InterestRow { id: number; at: string; email: string; product_id: string; variant: string | null; lang: string | null; user_id: string | null }

/** Admin panel: all sign-ups, newest first (guarded by public.is_admin() on the server). */
export async function adminInterest(): Promise<InterestRow[] | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('admin_merch_interest');
  return error ? null : (data as InterestRow[]);
}

const KEY = 'b125.merch.interest.v1';
/** Per-device memory of which products this viewer already asked about (UI nicety only). */
export function rememberedInterest(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]; } catch { return []; }
}
export function rememberInterest(productId: string) {
  try {
    const s = new Set(rememberedInterest()); s.add(productId);
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch { /* private mode */ }
}
