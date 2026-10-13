import { DurableObject } from 'cloudflare:workers';
import { ADAPTERS } from '../src/games/online/adapters';
import { CODE_RE, QUICK_WAIT_MS, isOnlineGame, randomCode, type OnlineGameId } from '../src/games/online/protocol';
import { GameRoomCore, type CoreHost, type GRState, type Sock } from './gameroomCore';
import { supaRpc, type PayEnv } from './pay';

export interface GameEnv extends PayEnv {
  GAMEROOMS: DurableObjectNamespace<GameRoom>;
  GAMELOBBY: DurableObjectNamespace<GameLobby>;
}

const ROOM_PATH = /^\/api\/g\/([a-z]{2,16})\/room\/([A-Z0-9]{4,6})\/ws$/;
const QUICK_PATH = /^\/api\/g\/([a-z]{2,16})\/quick$/;

/** Worker routing for online mini games: `/api/g/<game>/room/<CODE>/ws` (WebSocket) and `/api/g/<game>/quick`. */
export function routeGames(req: Request, env: GameEnv, url: URL): Promise<Response> | null {
  const m = url.pathname.match(ROOM_PATH);
  if (m) {
    if (!isOnlineGame(m[1]) || !CODE_RE.test(m[2])) return Promise.resolve(new Response('not found', { status: 404 }));
    return env.GAMEROOMS.get(env.GAMEROOMS.idFromName(`${m[1]}:${m[2]}`)).fetch(req);
  }
  const q = url.pathname.match(QUICK_PATH);
  if (q) {
    if (!isOnlineGame(q[1])) return Promise.resolve(new Response('not found', { status: 404 }));
    return env.GAMELOBBY.get(env.GAMELOBBY.idFromName(q[1])).fetch(req);
  }
  return null;
}

/**
 * One online table of a card mini game (zole / durak / thousand …). The rules live in ./gameroomCore.ts; this class
 * only adapts it to the Durable Object runtime: hibernatable WebSockets tagged with the player id, one alarm, storage.
 */
export class GameRoom extends DurableObject<GameEnv> {
  private core: GameRoomCore | null = null;
  private socks = new WeakMap<WebSocket, Sock>();

  private sock(ws: WebSocket): Sock {
    let s = this.socks.get(ws);
    if (!s) {
      const pid = this.ctx.getTags(ws)[0] ?? '';
      s = { pid, send: m => ws.send(m), close: (c, r) => ws.close(c, r) };
      this.socks.set(ws, s);
    }
    return s;
  }

  private host: CoreHost = {
    sockets: () => this.ctx.getWebSockets().filter(ws => ws.readyState === 1).map(ws => this.sock(ws)),
    now: () => Date.now(),
    random: () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; },
    setAlarm: at => { if (at) void this.ctx.storage.setAlarm(at); else void this.ctx.storage.deleteAlarm(); },
    save: s => this.ctx.storage.put('s', s),
    report: async r => {
      const x = await supaRpc<{ ok?: boolean; error?: string }>(this.env, 'report_chat', {
        p_room: r.room, p_seat: r.seat, p_name: r.name, p_text: r.text, p_reported: null, p_msg_id: r.msgId,
      }, { token: r.token });
      return x.ok && x.data ? { ok: !!x.data.ok, error: x.data.error } : { ok: false, error: x.status === 401 || x.status === 403 ? 'auth' : 'network' };
    },
  };

  private async load(game?: OnlineGameId, code?: string): Promise<GameRoomCore | null> {
    if (this.core) return this.core;
    const saved = await this.ctx.storage.get<GRState>('s');
    if (saved) { this.core = new GameRoomCore(saved, this.host); return this.core; }
    if (!game || !code) return null;
    this.core = new GameRoomCore(GameRoomCore.fresh(game, code, Date.now()), this.host);
    return this.core;
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const url = new URL(req.url);
    const m = url.pathname.match(ROOM_PATH);
    const pid = (url.searchParams.get('pid') ?? '').replace(/[^\w-]/g, '').slice(0, 40);
    if (!m || !isOnlineGame(m[1]) || !pid) return new Response('bad request', { status: 400 });
    const core = await this.load(m[1], m[2]);
    if (!core || core.s.game !== m[1]) return new Response('not found', { status: 404 });
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server, [pid]);
    await core.connect(this.sock(server), url.searchParams.get('name') ?? '');
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const core = await this.load();
    if (core) await core.message(this.sock(ws), raw);
  }

  async webSocketClose(ws: WebSocket) {
    try { ws.close(); } catch { /* */ }
    const core = await this.load();
    if (core) await core.close(this.sock(ws));
  }

  async webSocketError(ws: WebSocket) { await this.webSocketClose(ws); }

  async alarm() {
    const core = await this.load();
    if (core) await core.alarm();
  }
}

interface Open { code: string; at: number; pids: string[] }
/** Stop sending new players to a table this close to its start, so they don't arrive as it fills. */
const CUTOFF_MS = 4_000;

/**
 * Quick-match matchmaker, one per game (`idFromName(gameId)`): everybody who presses "Play online" gets the same open
 * table until it is full or about to start; the table itself fills the empty seats with bots after QUICK_WAIT_MS.
 */
export class GameLobby extends DurableObject<GameEnv> {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const game = url.pathname.match(QUICK_PATH)?.[1];
    const pid = (url.searchParams.get('pid') ?? '').replace(/[^\w-]/g, '').slice(0, 40);
    const skip = (url.searchParams.get('skip') ?? '').toUpperCase();
    if (!isOnlineGame(game) || !pid) return Response.json({ error: 'bad request' }, { status: 400 });
    const seats = ADAPTERS[game].seats.quick;
    const now = Date.now();
    let open = await this.ctx.storage.get<Open>('open');
    const usable = open && open.code !== skip && now < open.at + QUICK_WAIT_MS - CUTOFF_MS && open.pids.length < seats;
    const head = { 'Cache-Control': 'no-store' };
    if (open && usable && open.pids.includes(pid)) return Response.json({ code: open.code, startAt: open.at + QUICK_WAIT_MS }, { headers: head });
    if (!open || !usable) open = { code: randomCode(5, 'Q'), at: now, pids: [] };
    open.pids.push(pid);
    if (open.pids.length >= seats) await this.ctx.storage.delete('open');
    else await this.ctx.storage.put('open', open);
    return Response.json({ code: open.code, startAt: open.at + QUICK_WAIT_MS }, { headers: head });
  }
}
