import { useEffect, useState } from 'react';
import { track } from './analytics';

/** Chrome / Edge / Samsung fire this when the PWA can be installed; we keep it to show our own button. */
interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: BIPEvent | null = null;
let installedNow = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());

/** Call once, as early as possible (before React mounts), so the event is never missed. */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as BIPEvent; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; installedNow = true; markInstalled(); emit(); track('app_installed', { platform: detectPlatform() }); });
}

const INST_KEY = 'b125.installed';
const markInstalled = () => { try { localStorage.setItem(INST_KEY, '1'); } catch { /* */ } };
const wasInstalled = () => { try { return localStorage.getItem(INST_KEY) === '1'; } catch { return false; } };
if (typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone)) markInstalled();

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
    /**
     * Whether to advertise installing at all. Chromium only fires `beforeinstallprompt` while the app is NOT
     * installed, so no event = already installed (or not installable) → hide the button. iOS Safari has no
     * such event, so there we show the manual "Add to Home Screen" guide unless running standalone.
     */
    available: !installed && (!!deferred || (detectPlatform() === 'ios' && isIosSafari() && !wasInstalled())),
    platform: detectPlatform(),
    /** Returns true when the user accepted the browser's install dialog. */
    prompt: async () => {
      if (!deferred) return false;
      const ev = deferred;
      await ev.prompt();
      const { outcome } = await ev.userChoice;
      track('install_prompt', { outcome });
      if (outcome === 'accepted') { deferred = null; installedNow = true; markInstalled(); emit(); }
      return outcome === 'accepted';
    },
  };
}
