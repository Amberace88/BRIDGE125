import { DurableObject } from 'cloudflare:workers';
import { type Action, type Card, type GameState, apply, newGame, nextRound } from '../src/engine/engine';
import { botAction } from '../src/engine/bot';
import { isQuickCode, QUICK_WAIT_MS, type Lobby } from './lobby';

export interface Env { ROOMS: DurableObjectNamespace<Room>; LOBBY: DurableObjectNamespace<Lobby>; ASSETS: Fetcher }

interface Seat { pid: string | null; name: string; bot: boolean }
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
}

const MAX_SEATS = 4;
const TURN_MS = 30_000;
const OFFLINE_MS = 8_000;
const ROUND_PAUSE_MS = 14_000;
const BOT_NAMES = ['Artem', 'Marina', 'Oleg', 'Ilze', 'Dmitri', 'Anna'];
const QUICK_MIN_PLAYERS = 3;

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
    this.broadcast();
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
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const s = await this.load();
    const pid = this.ctx.getTags(ws)[0];
    const seat = s.seats.findIndex(x => x.pid === pid);
    let msg: { t: string; a?: Action; e?: string; name?: string; bluff?: boolean };
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
        break;
      }
      case 'leave': {
        if (seat < 0) return;
        if (s.status === 'lobby') {
          s.seats.splice(seat, 1);
          if (s.hostPid === pid) s.hostPid = s.seats.find(x => !x.bot)?.pid ?? null;
        } else {
          s.seats[seat].bot = true; s.seats[seat].pid = null;   // a bot takes over the seat
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

  private roomPayload() {
    const s = this.s!;
    const on = this.online();
    return {
      code: s.code, status: s.status, maxSeats: MAX_SEATS, quick: !!s.quick,
      seats: s.seats.map(x => ({ name: x.name, bot: x.bot, online: x.bot || on.has(x.pid ?? ''), host: x.pid === s.hostPid })),
    };
  }

  private payloadFor(pid: string) {
    const s = this.s!;
    const seat = s.seats.findIndex(x => x.pid === pid);
    const on = this.online();
    const offline = s.seats.map((x, i) => (!x.bot && !on.has(x.pid ?? '') ? i : -1)).filter(i => i >= 0);
    return JSON.stringify({
      t: 'state', you: seat, isHost: pid === s.hostPid, room: this.roomPayload(),
      game: s.game && seat >= 0 ? viewFor(s.game, seat) : null,
      deadline: s.deadline, turnMs: TURN_MS, offline,
    });
  }

  private sendTo(pid: string) {
    for (const ws of this.ctx.getWebSockets(pid)) { try { ws.send(this.payloadFor(pid)); } catch { /* */ } }
  }

  private broadcast() {
    for (const ws of this.ctx.getWebSockets()) {
      const pid = this.ctx.getTags(ws)[0];
      try { ws.send(this.payloadFor(pid)); } catch { /* */ }
    }
  }
}
