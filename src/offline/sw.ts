import { useSyncExternalStore } from 'react';

/**
 * Service worker registration + the update flow. A new version installs in the background and then WAITS: the page
 * shows "New version — tap to update" (src/offline/OfflineLayer.tsx) instead of swapping code under a running game.
 * Tapping posts SKIP_WAITING; the new worker takes control and the page reloads once.
 */

let waiting: ServiceWorker | null = null;
let accepted = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());

function offer(w: ServiceWorker | null) {
  if (!w || waiting === w) return;
  waiting = w;
  emit();
}

export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  const hadController = !!sw.controller;
  sw.addEventListener('controllerchange', () => {
    // only the update the player asked for reloads the page (the very first install just takes control quietly)
    if (accepted) { accepted = false; location.reload(); }
  });
  const go = () => {
    sw.register('/sw.js').then(reg => {
      if (reg.waiting && hadController) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => { if (w.state === 'installed' && sw.controller) offer(w); });
      });
      // long sessions (an installed app left open): look for a new version every 30 min while visible and online
      setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine) void reg.update().catch(() => {}); }, 30 * 60_000);
    }).catch(() => {});
  };
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
}

/** The waiting new version (or null). */
export function useUpdateReady(): ServiceWorker | null {
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => waiting, () => null);
}

export function applyUpdate() {
  if (!waiting) return;
  accepted = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
}
export function dismissUpdate() { waiting = null; emit(); }
