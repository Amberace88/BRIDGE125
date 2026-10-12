import type { Env } from './room';
export { Room } from './room';
export { Lobby } from './lobby';

const CODE = /^\/api\/room\/([A-Z0-9]{4,6})\/ws$/;

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
    if (url.pathname === '/api/health') return Response.json({ ok: true, ts: Date.now() });
    if (url.pathname.startsWith('/api/')) return new Response('not found', { status: 404 });
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
