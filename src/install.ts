import { useEffect, useState } from 'react';

/** Chrome / Edge / Samsung fire this when the PWA can be installed; we keep it to show our own button. */
interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: BIPEvent | null = null;
let installedNow = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());

/** Call once, as early as possible (before React mounts), so the event is never missed. */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as BIPEvent; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; installedNow = true; emit(); });
}

export type Platform = 'ios' | 'android' | 'desktop';

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** iOS can only add to the home screen from Safari (and recent Chrome via its share sheet). */
export const isIosSafari = () => detectPlatform() === 'ios' && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram/.test(navigator.userAgent);

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force(n => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  const installed = installedNow || isStandalone();
  return {
    installed,
    canPrompt: !!deferred && !installed,
    platform: detectPlatform(),
    /** Returns true when the user accepted the browser's install dialog. */
    prompt: async () => {
      if (!deferred) return false;
      const ev = deferred;
      await ev.prompt();
      const { outcome } = await ev.userChoice;
      if (outcome === 'accepted') { deferred = null; installedNow = true; emit(); }
      return outcome === 'accepted';
    },
  };
}
