// ICE servers for the table video mesh.
// Public STUN works for most home/mobile networks. For symmetric NATs a TURN relay is needed: the worker's
// /api/ice returns Cloudflare Realtime TURN credentials when the owner configures TURN_KEY_ID + TURN_KEY_API_TOKEN,
// and plain STUN otherwise. Any failure here silently falls back to STUN.

export const STUN: RTCIceServer[] = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];

let cached: { at: number; list: RTCIceServer[] } | null = null;
let pending: Promise<RTCIceServer[]> | null = null;

export function getIceServers(): Promise<RTCIceServer[]> {
  if (cached && Date.now() - cached.at < 50 * 60_000) return Promise.resolve(cached.list);
  pending ??= (async () => {
    try {
      const ctl = new AbortController();
      const tm = setTimeout(() => ctl.abort(), 2500);
      const r = await fetch('/api/ice', { signal: ctl.signal, cache: 'no-store' });
      clearTimeout(tm);
      if (!r.ok) throw new Error('ice ' + r.status);
      const j = await r.json() as { iceServers?: RTCIceServer[] };
      const list = Array.isArray(j.iceServers) && j.iceServers.length ? j.iceServers : STUN;
      cached = { at: Date.now(), list };
      return list;
    } catch {
      return STUN;
    } finally {
      pending = null;
    }
  })();
  return pending;
}
