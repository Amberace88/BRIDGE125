import { playerId } from '../online/useRoom';
import { isRefCode } from './config';

/**
 * The invite code a visitor arrived with (`/?ref=CODE`, also `/daily?ref=CODE`) is kept on the device until the visitor
 * signs up, then claimed once by ReferralRoot. Codes older than 14 days are dropped.
 */
const KEY = 'b125.ref';
const TTL = 14 * 24 * 3600 * 1000;

export interface StoredRef { code: string; at: number; /** uid that already tried to claim it */ tried?: string; welcomed?: boolean }

export function readRef(): StoredRef | null {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? 'null') as StoredRef | null;
    if (!o || !isRefCode(o.code) || Date.now() - o.at > TTL) return null;
    return o;
  } catch { return null; }
}
export function writeRef(r: StoredRef | null) {
  try { if (r) localStorage.setItem(KEY, JSON.stringify(r)); else localStorage.removeItem(KEY); } catch { /* */ }
}

/** Take `?ref=` off the address bar (keeps the path) and remember it. Returns the code when one was present. */
export function captureRefFromUrl(): string | null {
  try {
    const u = new URL(location.href);
    const raw = u.searchParams.get('ref');
    if (raw === null) return null;
    u.searchParams.delete('ref');
    history.replaceState(history.state, '', u.pathname + (u.search ? u.search : '') + u.hash);
    const code = raw.trim().toUpperCase();
    if (!isRefCode(code)) return null;
    const cur = readRef();
    if (!cur || cur.code !== code) writeRef({ code, at: Date.now() });
    return code;
  } catch { return null; }
}

/** Anonymous device id (the same one analytics and quick match use): one invited account per device. */
export const deviceId = () => playerId();
