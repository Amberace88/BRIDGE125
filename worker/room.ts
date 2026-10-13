import { DurableObject } from 'cloudflare:workers';
import { type Action, type Card, type GameState, apply, newGame, nextRound } from '../src/engine/engine';
import { botAction } from '../src/engine/bot';
import { isQuickCode, QUICK_WAIT_MS, type Lobby } from './lobby';
import { supaRpc, userFromToken, type PayEnv } from './pay';
import { CHAT_HISTORY, RateLimiter, isQuickKey, sanitizeChat, type ChatMsg } from '../src/social/sanitize';
import { TIP_MAX_PER_RECIPIENT_DAY, TIP_MIN, isGiftId, type SeatGift, type SocialError } from '../src/social/gifts';

export interface Env extends PayEnv { ROOMS: DurableObjectNamespace<Room>; LOBBY: DurableObjectNamespace<Lobby>; ASSETS: Fetcher }

/**
 * `uid` = the seat's Supabase user id, verified by this room from the seat's own access token (`hello` → /auth/v1/user);
 * a client can never claim one. Clients see it as `seats[i].uid` only to look up that account's public cosmetics
 * (public_cosmetics RPC, migration 015) — everything that moves money (gifts, tips, reports) still re-checks the
 * sender's token server-side and only ever uses the stored uid.
 */
interface Seat { pid: string | null; name: string; bot: boolean; uid?: string | null }
interface RoomState {
  code: string;
  hostPid: string | null;
  seats: Seat[];
  status: 'lobby' | 'playing';
  game: GameState | null;
  deadline: number | null;
  createdAt: number;
  emoteId: number;
  quick?: boolean;
  startAt?: number | null;
  /** social layer: last CHAT_HISTORY chat lines, gifts on seats for the current game */
  chat?: ChatMsg[];
  chatId?: number;
  gifts?: SeatGift[];
  socialId?: number;
}

interface InMsg {
  t: string; a?: Action; e?: string; name?: string; bluff?: boolean;
  // social
  token?: unknown; text?: unknown; q?: unknown; to?: unknown; gift?: unknown; amount?: unknown; id?: unknown; rid?: unknown;
}
const GIFTS_KEPT = 40;

const MAX_SEATS = 4;
const TURN_MS = 30_000;
const OFFLINE_MS = 8_000;
const ROUND_PAUSE_MS = 14_000;
const BOT_NAMES = ['Artem', 'Marina', 'Oleg', 'Ilze', 'Dmitri', 'Anna'];
const QUICK_MIN_PLAYERS = 3;

// media relay (WebRTC signalling) — payloads are opaque to the server
interface RtcIn { to: number; data: unknown }
interface MediaIn { cam?: unknown; mic?: unknown; sid?: unknown; av?: unknown }
interface MediaState { cam: boolean; mic: boolean; sid: string; av: string }
const RTC_MAX = 24_000;   // an SDP with a few m-lines is ~3–8 KB; candidates are tiny

const hidden = (id: string): Card => ({ id, r: '6', s: 'S' });

function viewFor(g: GameState, seat: number): GameState {
  return {
    ...g,
    deck: g.deck.map((_, i) => hidden('d' + i)),
    players: g.players.map((p, i) => (i === seat ? p : { ...p, hand: p.hand.map((_, k) => hidden(`h${i}_${k}`)) })),
  };
}

export class Room extends DurableObject<Env> {
  private s: RoomState | null = null;
  // per-player limits (memory only: a hibernation wake-up simply forgets old hits)
  private chatRL = new RateLimiter();
  private giftRL = new RateLimiter(1, 1500);
  private tipRL = new RateLimiter(1, 3000);
  private reportRL = new RateLimiter(3, 60_000);
  private helloRL = new RateLimiter(6, 60_000);

  private async load(code?: string): Promise<RoomState> {
    if (this.s) return this.s;
    const saved = await this.ctx.storage.get<RoomState>('s');
    if (saved) { this.s = saved; return saved; }
    const now = Date.now();
    const quick = isQuickCode(code ?? '');
    this.s = { code: code ?? '?', hostPid: null, seats: [], status: 'lobby', game: null, deadline: null, createdAt: now, emoteId: 0, quick, startAt: quick ? now + QUICK_WAIT_MS : null };
    return this.s;
  }
  private async save() { if (this.s) await this.ctx.storage.put('s', this.s); }

  private online(): Set<string> {
    const set = new Set<string>();
    for (const ws of this.ctx.getWebSockets()) for (const tag of this.ctx.getTags(ws)) set.add(tag);
    return set;
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const url = new URL(req.url);
    const code = url.pathname.split('/')[3] ?? '?';
    const pid = (url.searchParams.get('pid') ?? '').slice(0, 40);
    const name = (url.searchParams.get('name') ?? 'Player').trim().slice(0, 20) || 'Player';
    if (!pid) return new Response('pid required', { status: 400 });
    const s = await this.load(code);

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server, [pid]);

    let seat = s.seats.findIndex(x => x.pid === pid);
    if (seat < 0) {
      if (s.status === 'lobby' && s.seats.length < MAX_SEATS) {
        s.seats.push({ pid, name, bot: false });
        seat = s.seats.length - 1;
        if (!s.hostPid) s.hostPid = pid;
        if (s.quick && s.seats.length >= MAX_SEATS) this.startGame();
      } else {
        server.send(JSON.stringify({ t: 'error', code: 'full' }));
        server.close(4001, 'full');
        return new Response(null, { status: 101, webSocket: client });
      }
    } else if (s.status === 'lobby') {
      s.seats[seat].name = name;
    }
    this.schedule();
    await this.save();
    this.broadcast(server);
    try { server.send(JSON.stringify({ t: 'gifts', list: s.gifts ?? [] })); } catch { /* */ }
    return new Response(null, { status: 101, webSocket: client });
  }

  private botName(): string {
    const used = new Set(this.s!.seats.map(x => x.name));
    return BOT_NAMES.find(n => !used.has(n)) ?? 'Bot';
  }

  /** Start the game; quick tables top up with bots so nobody plays a lonely 1-on-1 against an empty room. */
  private startGame(fillTo = 2, bluff = false) {
    const s = this.s!;
    while (s.seats.length < Math.min(fillTo, MAX_SEATS)) s.seats.push({ pid: null, name: this.botName(), bot: true });
    s.status = 'playing';
    s.startAt = null;
    s.game = newGame(s.seats.map(x => ({ name: x.name, bot: x.bot })), { bluff });
    this.clearGifts();
  }

  /** Seat gifts last for one game. */
  private clearGifts() {
    const s = this.s!;
    if (!s.gifts?.length) return;
    s.gifts = [];
    this.sendAll({ t: 'gifts', list: [] });
  }

  private sendAll(m: object) {
    const out = JSON.stringify(m);
    for (const w of this.ctx.getWebSockets()) { try { w.send(out); } catch { /* */ } }
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const s = await this.load();
    const pid = this.ctx.getTags(ws)[0];
    const seat = s.seats.findIndex(x => x.pid === pid);
    let msg: InMsg;
    try { msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); } catch { return; }
    const isHost = pid === s.hostPid || !this.online().has(s.hostPid ?? '');

    switch (msg.t) {
      case 'ping': ws.send(JSON.stringify({ t: 'pong' })); return;
      case 'rename': {
        if (seat >= 0 && msg.name) { s.seats[seat].name = msg.name.trim().slice(0, 20) || s.seats[seat].name; if (s.game) s.game.players[seat].name = s.seats[seat].name; }
        break;
      }
      case 'addBot': {
        if (!isHost || s.status !== 'lobby' || s.seats.length >= MAX_SEATS) return;
        s.seats.push({ pid: null, name: this.botName(), bot: true });
        break;
      }
      case 'removeBot': {
        if (!isHost || s.status !== 'lobby') return;
        const i = s.seats.map(x => x.bot).lastIndexOf(true);
        if (i >= 0) s.seats.splice(i, 1);
        break;
      }
      case 'start': {
        if (!isHost || s.status !== 'lobby' || (s.seats.length < 2 && !s.quick)) return;
        this.startGame(s.quick ? QUICK_MIN_PLAYERS : 2, msg.bluff === true);
        break;
      }
      case 'act': {
        if (!s.game || seat < 0 || !msg.a) return;
        const n = apply(s.game, seat, msg.a);
        if (n === s.game) { this.sendTo(pid); return; }
        s.game = n;
        break;
      }
      case 'next': {
        if (!s.game || s.game.phase !== 'roundOver') return;
        s.game = nextRound(s.game);
        break;
      }
      case 'rematch': {
        if (!s.game || s.game.phase !== 'gameOver') return;
        s.game = newGame(s.seats.map(x => ({ name: x.name, bot: x.bot })), { bluff: !!s.game.rules?.bluff });
        this.clearGifts();
        break;
      }
      case 'leave': {
        if (seat < 0) return;
        if (s.status === 'lobby') {
          s.seats.splice(seat, 1);
          if (s.hostPid === pid) s.hostPid = s.seats.find(x => !x.bot)?.pid ?? null;
        } else {
          s.seats[seat].bot = true; s.seats[seat].pid = null; s.seats[seat].uid = null;   // a bot takes over the seat
          if (s.game) s.game.players[seat].bot = true;
          if (s.hostPid === pid) s.hostPid = s.seats.find(x => !x.bot)?.pid ?? null;
        }
        ws.close(1000, 'left');
        break;
      }
      case 'emote': {
        if (seat < 0 || !msg.e || msg.e.length > 8) return;
        s.emoteId++;
        const out = JSON.stringify({ t: 'emote', seat, e: msg.e, id: s.emoteId });
        for (const w of this.ctx.getWebSockets()) { try { w.send(out); } catch { /* */ } }
        return;
      }
      // ---- social layer: account hello, chat, gifts, tips, reports
      case 'hello': { if (await this.hello(pid, msg)) break; return; }
      case 'chat': { await this.chat(ws, pid, seat, msg); return; }
      case 'gift': { await this.gift(ws, pid, seat, msg); return; }
      case 'tip': { await this.tip(ws, pid, seat, msg); return; }
      case 'report': { await this.report(ws, pid, seat, msg); return; }
      // ---- media: WebRTC signalling relay (one target seat only) + per-seat camera/mic state (kept on the socket, not in room storage)
      case 'rtc': { this.relayRtc(s, seat, msg as unknown as RtcIn); return; }
      case 'media': { this.mediaHello(ws, s, seat, msg as unknown as MediaIn); return; }
      default: return;
    }
    this.schedule();
    await this.save();
    this.broadcast();
  }

  async webSocketClose(ws: WebSocket) {
    await this.load();
    try { ws.close(); } catch { /* */ }
    this.schedule();
    await this.save();
    this.broadcast();
  }
  async webSocketError(ws: WebSocket) { await this.webSocketClose(ws); }

  /** Work out who must act next and when, and set the alarm. */
  private schedule() {
    const s = this.s!;
    const g = s.game;
    const now = Date.now();
    if (s.status === 'lobby' && s.quick && s.startAt) {
      s.deadline = s.startAt;
      this.ctx.storage.setAlarm(s.deadline);
      return;
    }
    if (!g || s.status !== 'playing') { s.deadline = null; return; }
    if (g.phase === 'roundOver') s.deadline = now + ROUND_PAUSE_MS;
    else if (g.phase === 'gameOver') s.deadline = null;
    else {
      const seat = s.seats[g.current];
      const heavy = g.events.some(e => ['queen', 'transfer', 'kings', 'reset125', 'eight'].includes(e.t));
      if (!seat || seat.bot) s.deadline = now + 1100 + (heavy ? 700 : 0) + Math.floor(Math.random() * 400);
      else if (!this.online().has(seat.pid ?? '')) s.deadline = now + OFFLINE_MS;
      else s.deadline = now + TURN_MS;
    }
    if (s.deadline) this.ctx.storage.setAlarm(s.deadline);
    else this.ctx.storage.deleteAlarm();
  }

  async alarm() {
    const s = await this.load();
    if (s.status === 'lobby' && s.quick && s.startAt) {
      if (Date.now() < s.startAt - 50) { this.ctx.storage.setAlarm(s.startAt); return; }
      if (!s.seats.some(x => !x.bot)) { s.startAt = null; s.deadline = null; await this.save(); return; }   // everyone left
      this.startGame(QUICK_MIN_PLAYERS);
      this.schedule();
      await this.save();
      this.broadcast();
      return;
    }
    const g = s.game;
    if (!g || s.status !== 'playing' || !s.deadline) return;
    if (Date.now() < s.deadline - 50) { this.ctx.storage.setAlarm(s.deadline); return; }
    if (g.phase === 'roundOver') s.game = nextRound(g);
    else if (g.phase === 'play' || g.phase === 'chooseSuit') {
      const p = g.current;
      const a = botAction(g, p, 'hard');
      let n = apply(g, p, a);
      if (n === g) n = apply(g, p, { type: 'draw' });
      if (n === g) n = apply(g, p, { type: 'pass' });
      if (n === g) n = apply(g, p, { type: 'accept' });
      s.game = n;
    }
    this.schedule();
    await this.save();
    this.broadcast();
  }

  /* ============================================================== social layer */

  /** `{t:'hello', token}` — verify the Supabase session and remember the seat's user id. true = room changed. */
  private async hello(pid: string, m: InMsg): Promise<boolean> {
    if (!this.helloRL.allow(pid)) return false;
    const user = m.token ? await userFromToken(this.env, m.token) : null;
    const s = this.s!;
    const seat = s.seats.findIndex(x => x.pid === pid);   // re-read after the await
    if (seat < 0) return false;
    const uid = user?.id ?? null;
    if ((s.seats[seat].uid ?? null) === uid) return false;
    s.seats[seat].uid = uid;
    return true;
  }

  private async chat(ws: WebSocket, pid: string, seat: number, m: InMsg) {
    const s = this.s!;
    if (seat < 0) return;
    if (!this.chatRL.allow(pid)) { this.reply(ws, { t: 'chatErr', code: 'slow', wait: this.chatRL.waitMs(pid) }); return; }
    let text = '', masked = false;
    const q = isQuickKey(m.q) ? m.q : undefined;
    if (!q) {
      const c = sanitizeChat(m.text);
      if (!c) return;
      text = c.text; masked = c.masked;
    }
    s.chatId = (s.chatId ?? 0) + 1;
    const msg: ChatMsg = { id: s.chatId, seat, name: s.seats[seat].name, text, at: Date.now(), ...(q ? { q } : {}), ...(masked ? { masked } : {}) };
    s.chat = [...(s.chat ?? []).slice(-(CHAT_HISTORY - 1)), msg];
    this.sendAll({ t: 'chat', ...msg });
    await this.save();
  }

  private reply(ws: WebSocket, m: object) { try { ws.send(JSON.stringify(m)); } catch { /* */ } }

  private socialFail(ws: WebSocket, kind: string, rid: unknown, error: SocialError) {
    this.reply(ws, { t: kind, rid, ok: false, error });
  }

  private static httpErr(status: number): SocialError {
    return status === 401 || status === 403 ? 'auth' : status === 503 ? 'unavailable' : 'network';
  }

  /** `{t:'gift', to, gift, token, rid}` — charged by Supabase as the sender (their token), then shown to the table. */
  private async gift(ws: WebSocket, pid: string, seat: number, m: InMsg) {
    const s = this.s!;
    const to = Number(m.to);
    if (seat < 0) return this.socialFail(ws, 'giftResult', m.rid, 'generic');
    if (!Number.isInteger(to) || !s.seats[to]) return this.socialFail(ws, 'giftResult', m.rid, 'target');
    if (to === seat) return this.socialFail(ws, 'giftResult', m.rid, 'self');
    if (!isGiftId(m.gift)) return this.socialFail(ws, 'giftResult', m.rid, 'unknown');
    if (typeof m.token !== 'string' || !m.token) return this.socialFail(ws, 'giftResult', m.rid, 'auth');
    if (!this.giftRL.allow(pid)) return this.socialFail(ws, 'giftResult', m.rid, 'throttle');
    const target = s.seats[to];
    const r = await supaRpc<{ ok?: boolean; error?: SocialError; bm?: number; diamonds?: number; need?: number; cur?: string }>(this.env, 'send_gift',
      { p_gift: m.gift, p_to: target.bot ? null : target.uid ?? null, p_room: s.code, p_to_name: target.name }, { token: m.token });
    if (!r.ok || !r.data) return this.socialFail(ws, 'giftResult', m.rid, Room.httpErr(r.status));
    const d = r.data;
    this.reply(ws, { t: 'giftResult', rid: m.rid, ok: !!d.ok, error: d.error, bm: d.bm, diamonds: d.diamonds, need: d.need, cur: d.cur });
    if (!d.ok) return;
    const from = s.seats.findIndex(x => x.pid === pid);
    s.socialId = (s.socialId ?? 0) + 1;
    s.gifts = [...(s.gifts ?? []).slice(-(GIFTS_KEPT - 1)), [to, m.gift as string]];
    this.sendAll({ t: 'gift', id: s.socialId, from, to, gift: m.gift, fromName: s.seats[from]?.name ?? '' });
    await this.save();
  }

  /** `{t:'tip', to, amount, token, rid}` — BM from one account to another; every limit is enforced by tip_bm(). */
  private async tip(ws: WebSocket, pid: string, seat: number, m: InMsg) {
    const s = this.s!;
    const to = Number(m.to), amount = Number(m.amount);
    if (seat < 0) return this.socialFail(ws, 'tipResult', m.rid, 'generic');
    if (!Number.isInteger(to) || !s.seats[to]) return this.socialFail(ws, 'tipResult', m.rid, 'target');
    if (to === seat) return this.socialFail(ws, 'tipResult', m.rid, 'self');
    if (!Number.isInteger(amount) || amount < TIP_MIN || amount > TIP_MAX_PER_RECIPIENT_DAY) return this.socialFail(ws, 'tipResult', m.rid, 'limit');
    const target = s.seats[to];
    if (target.bot || !target.uid) return this.socialFail(ws, 'tipResult', m.rid, 'noAccount');
    if (typeof m.token !== 'string' || !m.token) return this.socialFail(ws, 'tipResult', m.rid, 'auth');
    if (!this.tipRL.allow(pid)) return this.socialFail(ws, 'tipResult', m.rid, 'throttle');
    const r = await supaRpc<{ ok?: boolean; error?: SocialError; bm?: number; left?: number }>(this.env, 'tip_bm',
      { p_to: target.uid, p_amount: amount, p_room: s.code }, { token: m.token });
    if (!r.ok || !r.data) return this.socialFail(ws, 'tipResult', m.rid, Room.httpErr(r.status));
    const d = r.data;
    this.reply(ws, { t: 'tipResult', rid: m.rid, ok: !!d.ok, error: d.error, bm: d.bm, left: d.left });
    if (!d.ok) return;
    const from = s.seats.findIndex(x => x.pid === pid);
    s.socialId = (s.socialId ?? 0) + 1;
    this.sendAll({ t: 'tip', id: s.socialId, from, to, amount, fromName: s.seats[from]?.name ?? '' });
    await this.save();
  }

  /** `{t:'report', id, token, rid}` — the server attaches the *stored* text, so a report can't be forged. */
  private async report(ws: WebSocket, pid: string, seat: number, m: InMsg) {
    const s = this.s!;
    const line = (s.chat ?? []).find(x => x.id === Number(m.id));
    if (seat < 0 || !line) return this.socialFail(ws, 'reportResult', m.rid, 'notFound');
    if (line.seat === seat) return this.socialFail(ws, 'reportResult', m.rid, 'self');
    if (typeof m.token !== 'string' || !m.token) return this.socialFail(ws, 'reportResult', m.rid, 'auth');
    if (!this.reportRL.allow(pid)) return this.socialFail(ws, 'reportResult', m.rid, 'throttle');
    const r = await supaRpc<{ ok?: boolean; error?: SocialError }>(this.env, 'report_chat', {
      p_room: s.code, p_seat: line.seat, p_name: line.name, p_text: line.q ? `[quick:${line.q}]` : line.text,
      p_reported: s.seats[line.seat]?.uid ?? null, p_msg_id: line.id,
    }, { token: m.token });
    if (!r.ok || !r.data) return this.socialFail(ws, 'reportResult', m.rid, Room.httpErr(r.status));
    this.reply(ws, { t: 'reportResult', rid: m.rid, ok: !!r.data.ok, error: r.data.error });
  }

  /**
   * Media helpers. `rtc` forwards an opaque signalling blob (SDP / ICE candidate) to exactly one human seat.
   * `media` records the sender's camera/mic state on its socket attachment (survives hibernation), tells the
   * other sockets, and answers the sender with everybody's current state so late joiners can catch up.
   */
  private relayRtc(s: RoomState, from: number, m: RtcIn) {
    if (from < 0 || !Number.isInteger(m.to) || m.to === from) return;
    const target = s.seats[m.to];
    if (!target || target.bot || !target.pid) return;
    let data: string;
    try { data = JSON.stringify(m.data ?? null); } catch { return; }
    if (data.length > RTC_MAX) return;
    const out = `{"t":"rtc","from":${from},"data":${data}}`;
    for (const w of this.ctx.getWebSockets(target.pid)) { try { w.send(out); } catch { /* */ } }
  }

  private mediaHello(ws: WebSocket, s: RoomState, seat: number, m: MediaIn) {
    if (seat < 0) return;
    const st: MediaState = {
      cam: m.cam === true, mic: m.mic === true,
      sid: typeof m.sid === 'string' ? m.sid.replace(/[^\w-]/g, '').slice(0, 24) : '',
      av: typeof m.av === 'string' && m.av.length <= 300 && /^https:\/\/[^\s"<>]+$/.test(m.av) ? m.av : '',
    };
    try { ws.serializeAttachment({ media: st }); } catch { /* */ }
    const seatOf = new Map(s.seats.map((x, i) => [x.pid ?? '', i] as const));
    const mine = JSON.stringify({ t: 'media', seat, ...st });
    const all = new Map<number, MediaState & { seat: number }>();   // one entry per seat (a player may have two tabs)
    for (const w of this.ctx.getWebSockets()) {
      const i = seatOf.get(this.ctx.getTags(w)[0]) ?? -1;
      if (w === ws || i < 0 || i === seat) continue;
      try { w.send(mine); } catch { /* */ }
      const a = w.deserializeAttachment() as { media?: MediaState } | null;
      const prev = all.get(i);
      if (a?.media && !(prev && (prev.cam || prev.mic))) all.set(i, { seat: i, ...a.media });
    }
    try { ws.send(JSON.stringify({ t: 'mediaAll', states: [...all.values()] })); } catch { /* */ }
  }

  private roomPayload() {
    const s = this.s!;
    const on = this.online();
    return {
      code: s.code, status: s.status, maxSeats: MAX_SEATS, quick: !!s.quick,
      seats: s.seats.map(x => ({
        name: x.name, bot: x.bot, online: x.bot || on.has(x.pid ?? ''), host: x.pid === s.hostPid, acct: !x.bot && !!x.uid,
        ...(!x.bot && x.uid ? { uid: x.uid } : {}),
      })),
    };
  }

  private payloadFor(pid: string, withChat = false) {
    const s = this.s!;
    const seat = s.seats.findIndex(x => x.pid === pid);
    const on = this.online();
    const offline = s.seats.map((x, i) => (!x.bot && !on.has(x.pid ?? '') ? i : -1)).filter(i => i >= 0);
    return JSON.stringify({
      t: 'state', you: seat, isHost: pid === s.hostPid, room: this.roomPayload(),
      game: s.game && seat >= 0 ? viewFor(s.game, seat) : null,
      deadline: s.deadline, turnMs: TURN_MS, offline,
      ...(withChat ? { chat: s.chat ?? [] } : {}),
    });
  }

  private sendTo(pid: string) {
    for (const ws of this.ctx.getWebSockets(pid)) { try { ws.send(this.payloadFor(pid)); } catch { /* */ } }
  }

  /** `fresh` = a socket that just connected: its state also carries the chat history. */
  private broadcast(fresh?: WebSocket) {
    for (const ws of this.ctx.getWebSockets()) {
      const pid = this.ctx.getTags(ws)[0];
      try { ws.send(this.payloadFor(pid, ws === fresh)); } catch { /* */ }
    }
  }
}
