import { useSyncExternalStore } from 'react';

/**
 * Connectivity, app-wide. `navigator.onLine` + the online/offline events: cheap, instant, and exactly what the
 * browser uses to fail requests fast. (A captive portal / "lie-fi" still counts as online; requests then fail
 * normally and the result queue keeps them — see ./queue.ts.)
 */

const subs = new Set<() => void>();
let online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;

function update() {
  const now = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  if (now === online) return;
  online = now;
  subs.forEach(f => f());
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
}

export const isOnline = () => online;
export const isOffline = () => !online;
export function onNetChange(f: () => void): () => void { subs.add(f); return () => { subs.delete(f); }; }
/** true while the device has a connection */
export function useOnline(): boolean { return useSyncExternalStore(onNetChange, isOnline, () => true); }

/** Test hook: force a state (also fires the listeners). */
export function __setOnline(v: boolean) { if (v !== online) { online = v; subs.forEach(f => f()); } }

/**
 * `fetch` for the Supabase client: while offline it fails at once with a TypeError (exactly what fetch does on a
 * network error, so supabase-js reports a normal network error) instead of putting a red net::ERR_INTERNET_DISCONNECTED
 * line in the console for every call.
 */
export const offlineAwareFetch: typeof fetch = (input, init) =>
  online ? fetch(input, init) : Promise.reject(new TypeError('Failed to fetch (offline)'));
