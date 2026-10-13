import { getSupabase } from './supabase';
import { playerId } from './online/ids';

/** Fire-and-forget product analytics stored in Supabase (no third-party trackers, no cookies). */
export function track(name: string, props: Record<string, string | number | boolean | null> = {}) {
  if (!import.meta.env.PROD && !(window as { __b125track?: boolean }).__b125track) return;
  getSupabase().then(sb => sb?.rpc('track', { ev: name, anon: playerId(), props }).then(() => {}, () => {})).catch(() => {});
}

let beat: ReturnType<typeof setInterval> | null = null;
/** "Online now" in the admin panel = anyone who pinged in the last few minutes while the tab was visible. */
export function startHeartbeat() {
  if (beat) return;
  beat = setInterval(() => { if (document.visibilityState === 'visible') track('ping'); }, 4 * 60 * 1000);
}
