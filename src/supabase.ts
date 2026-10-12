import type { SupabaseClient } from '@supabase/supabase-js';

// Public client config (publishable key is safe to ship in the browser; RLS protects the data).
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://iclxvshtxwukkhljetik.supabase.co';
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? 'sb_publishable_nMYB6ax0FmIitlK-vuK9Gw_7-zfEN03';

export const hasSupabase = !!(url && key);

/** The Supabase SDK is loaded lazily, after first paint, so it never delays the home screen. */
let pending: Promise<SupabaseClient | null> | null = null;
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!hasSupabase) return Promise.resolve(null);
  pending ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }));
  return pending;
}

export interface Profile {
  id: string; username: string | null; lang: string | null; accent: string | null; background: string | null;
  bm: number; games_played: number; wins: number;
}
