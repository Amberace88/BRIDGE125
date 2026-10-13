import type { Env } from './room';
import { handlePay } from './pay';
export { Room } from './room';
export { Lobby } from './lobby';

const CODE = /^\/api\/room\/([A-Z0-9]{4,6})\/ws$/;

/** Optional TURN (Cloudflare Realtime): set TURN_KEY_ID + secret TURN_KEY_API_TOKEN (`wrangler secret put`) to enable. */
type IceEnv = Env & { TURN_KEY_ID?: string; TURN_KEY_API_TOKEN?: string };
const STUN: RTCIceServerLike[] = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];
interface RTCIceServerLike { urls: string | string[]; username?: string; credential?: string }

async function iceServers(env: IceEnv): Promise<Response> {
  const head = { 'Cache-Control': 'private, max-age=3600', 'Content-Type': 'application/json' };
  if (env.TURN_KEY_ID && env.TURN_KEY_API_TOKEN) {
    try {
      const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
        method: 'POST', headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 6 * 3600 }),
      });
      if (r.ok) {
        const j = await r.json() as { iceServers?: RTCIceServerLike | RTCIceServerLike[] };
        const list = Array.isArray(j.iceServers) ? j.iceServers : j.iceServers ? [j.iceServers] : [];
        if (list.length) return new Response(JSON.stringify({ iceServers: [...STUN, ...list], turn: true }), { headers: head });
      }
    } catch { /* fall back to STUN */ }
  }
  return new Response(JSON.stringify({ iceServers: STUN, turn: false }), { headers: head });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(CODE);
    if (m) {
      const stub = env.ROOMS.get(env.ROOMS.idFromName(m[1]));
      return stub.fetch(req);
    }
    if (url.pathname === '/api/quick') {
      const stub = env.LOBBY.get(env.LOBBY.idFromName('global'));
      return stub.fetch(req);
    }
    if (url.pathname === '/api/ice') return iceServers(env);
    if (url.pathname === '/api/health') return Response.json({ ok: true, ts: Date.now() });
    if (url.pathname.startsWith('/api/pay/')) { const r = await handlePay(req, env); if (r) return r; }
    if (url.pathname.startsWith('/api/')) return new Response('not found', { status: 404 });
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
