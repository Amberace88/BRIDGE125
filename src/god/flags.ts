import { useCallback, useSyncExternalStore } from 'react';
import { useApp } from '../store';

/**
 * GOD MODE local test toggles (admin + god only). Stored per device in localStorage; never sent to the server.
 *
 *   xray      show the bots' cards face-up — LOCAL games against bots only (never online rooms)
 *   fastBots  bots act ~3× faster (multiply every bot think/act delay by `botDelay`)
 *
 * Read them in a component with `useGodFlags()` — it already returns everything OFF for normal players, so a stale
 * localStorage value can never leak to a non-privileged account. Outside React use `getGodFlags(isPrivileged)`.
 */
export interface GodFlags { xray: boolean; fastBots: boolean }

const KEY = 'b125.god.flags.v1';
const OFF: GodFlags = { xray: false, fastBots: false };
/** Multiplier for bot delays while `fastBots` is on (≈3× faster). */
export const FAST_BOT_FACTOR = 1 / 3;

let cache: GodFlags | null = null;
const subs = new Set<() => void>();

function read(): GodFlags {
  if (cache) return cache;
  try {
    const j = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<GodFlags> | null;
    cache = { xray: !!j?.xray, fastBots: !!j?.fastBots };
  } catch { cache = { ...OFF }; }
  return cache;
}
const emit = () => { for (const f of subs) f(); };
function subscribe(f: () => void) {
  subs.add(f);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; f(); } };
  window.addEventListener('storage', onStorage);
  return () => { subs.delete(f); window.removeEventListener('storage', onStorage); };
}

export function setGodFlag<K extends keyof GodFlags>(k: K, v: GodFlags[K]) {
  cache = { ...read(), [k]: v };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* private mode: in-memory only */ }
  emit();
}

/** Non-React access (game loops, timers). Pass `app.isPrivileged`; returns all-off for everyone else. */
export function getGodFlags(isPrivileged: boolean): GodFlags & { botDelay: number } {
  const f = isPrivileged ? read() : OFF;
  return { ...f, botDelay: f.fastBots ? FAST_BOT_FACTOR : 1 };
}

/**
 * GOD MODE test flags for the current player (all false unless admin/god).
 *
 *   const god = useGodFlags();
 *   const delay = BOT_DELAY_MS * god.botDelay;              // fastBots → ×1/3
 *   const showFace = seat.isBot && god.xray && !online;      // local games only
 */
export function useGodFlags() {
  const { isPrivileged } = useApp();
  const raw = useSyncExternalStore(subscribe, read, () => OFF);
  const f = isPrivileged ? raw : OFF;
  const set = useCallback(<K extends keyof GodFlags>(k: K, v: GodFlags[K]) => { if (isPrivileged) setGodFlag(k, v); }, [isPrivileged]);
  return { xray: f.xray, fastBots: f.fastBots, botDelay: f.fastBots ? FAST_BOT_FACTOR : 1, set };
}
