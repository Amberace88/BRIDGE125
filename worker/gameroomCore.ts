// The generic online card-game room: one authoritative engine state, per-seat views, turn clocks, bots for empty or
// absent seats, reconnect with seat restore, rematch, chat and emotes. Pure TypeScript — no Durable Object APIs — so
// the same logic runs in the Worker (worker/gameroom.ts wraps it) and in vitest with simulated sockets.

import { ADAPTERS, type GameAdapter } from '../src/games/online/adapters';
import {
  ACT_BURST, ACT_WINDOW_MS, AWAY_AFTER, MAX_SOCKETS, MSG_MAX, OFFLINE_MS, QUICK_WAIT_MS, TURN_MS,
  type OnlineGameId, type RoomInfo, type StateMsg, cleanName, isQuickCode,
} from '../src/games/online/protocol';
import { CHAT_HISTORY, RateLimiter, isQuickKey, sanitizeChat, type ChatMsg } from '../src/social/sanitize';

/** One connected socket, as the core sees it. `pid` = the player id the socket connected with. */
export interface Sock { readonly pid: string; send(m: string): void; close(code: number, reason: string): void }

export interface CoreHost {
  /** every OPEN socket of the room */
  sockets(): Sock[];
  now(): number;
  /** a number in [0, 1) — seeds, salts, bot jitter */
  random(): number;
  setAlarm(at: number | null): void;
  save(s: GRState): void | Promise<void>;
  /** optional moderation hook: forward a reported chat line (the server attaches the stored text). `room` ≤ 8 chars. */
  report?(r: { room: string; seat: number; name: string; text: string; msgId: number; token: string }): Promise<{ ok: boolean; error?: string }>;
}

export interface GSeat {
  /** the human owning the seat (null: a bot seat) */
  pid: string | null;
  name: string;
  bot: boolean;
  /** a human seat the bot plays for (clock ran out twice / disconnected) until its owner acts or comes back */
  away: boolean;
  /** turns in a row lost to the clock */
  missed: number;
}

export interface GRState {
  v: 1;
  game: OnlineGameId;
  code: string;
  quick: boolean;
  createdAt: number;
  hostPid: string | null;
  seats: GSeat[];
  status: 'lobby' | 'playing';
  rules: unknown;
  /** the authoritative engine state (never sent as is) */
  g: unknown | null;
  gameNo: number;
  /** per-game secret for the opaque ids of face-down cards */
  salt: string;
  deadline: number | null;
  /** what the current deadline is for (the clock is not restarted while this stays the same) */
  dlKey: string;
  startAt: number | null;
  ready: number[];
  rematch: number[];
  chat: ChatMsg[];
  chatId: number;
  emoteId: number;
}

const BOT_NAMES = ['Artem', 'Marina', 'Oleg', 'Ilze', 'Dmitri', 'Anna', 'Jānis', 'Olga'];
const BOT_MS = 950;
const BOT_JITTER = 650;

interface InMsg { t?: unknown; a?: unknown; e?: unknown; name?: unknown; rules?: unknown; seat?: unknown; text?: unknown; q?: unknown; id?: unknown; token?: unknown; rid?: unknown }

export class GameRoomCore {
  s: GRState;
  private host: CoreHost;
  private actRL = new RateLimiter(ACT_BURST, ACT_WINDOW_MS);
  private chatRL = new RateLimiter();
  private reportRL = new RateLimiter(3, 60_000);

  constructor(s: GRState, host: CoreHost) { this.s = s; this.host = host; }

  static fresh(game: OnlineGameId, code: string, now: number): GRState {
    const quick = isQuickCode(code);
    return {
      v: 1, game, code, quick, createdAt: now, hostPid: null, seats: [], status: 'lobby', rules: ADAPTERS[game].defaultRules,
      g: null, gameNo: 0, salt: '', deadline: null, dlKey: '', startAt: quick ? now + QUICK_WAIT_MS : null,
      ready: [], rematch: [], chat: [], chatId: 0, emoteId: 0,
    };
  }

  private get A(): GameAdapter<unknown, unknown, unknown> { return ADAPTERS[this.s.game]; }
  private seatOf(pid: string) { return this.s.seats.findIndex(x => x.pid === pid); }
  private online(): Set<string> { return new Set(this.host.sockets().map(x => x.pid)); }
  private isHost(pid: string) { return pid === this.s.hostPid || (!!this.s.hostPid && !this.online().has(this.s.hostPid)) || !this.s.hostPid; }
  private reply(sock: Sock, m: object) { try { sock.send(JSON.stringify(m)); } catch { /* */ } }
  private sendAll(m: object) { const out = JSON.stringify(m); for (const w of this.host.sockets()) { try { w.send(out); } catch { /* */ } } }

  /* ============================================================== sockets */

  /** A socket opened (the host already counts it in `sockets()`). */
  async connect(sock: Sock, rawName: string): Promise<void> {
    const s = this.s;
    const pid = sock.pid;
    const name = cleanName(rawName);
    if (this.host.sockets().length > MAX_SOCKETS) { this.reject(sock, 'full'); return; }
    let seat = this.seatOf(pid);
    const max = s.quick ? this.A.seats.quick : this.A.seats.max;
    if (seat < 0 && s.status === 'lobby') {
      if (s.seats.length < max) {
        s.seats.push({ pid, name, bot: false, away: false, missed: 0 });
        seat = s.seats.length - 1;
      } else {
        // a full lobby: a human replaces the last bot
        const b = s.seats.map(x => x.bot).lastIndexOf(true);
        if (b >= 0) { s.seats[b] = { pid, name, bot: false, away: false, missed: 0 }; seat = b; }
      }
      if (seat >= 0 && (!s.hostPid || !s.seats.some(x => x.pid === s.hostPid))) s.hostPid = pid;
      if (seat >= 0 && s.quick && s.seats.length >= max && s.seats.every(x => !x.bot)) this.startGame();
    } else if (seat >= 0) {
      const st = s.seats[seat];
      if (s.status === 'lobby') st.name = name;
      st.away = false; st.missed = 0;   // back at the table: the seat is theirs again
    }
    if (seat < 0 && s.quick) { this.reject(sock, 'full'); return; }   // quick tables: the client looks for another one
    await this.changed(sock);
  }

  private reject(sock: Sock, code: string) {
    this.reply(sock, { t: 'error', code });
    try { sock.close(4001, code); } catch { /* */ }
  }

  async close(_sock: Sock): Promise<void> { await this.changed(); }

  /* ============================================================== messages */

  async message(sock: Sock, raw: string | ArrayBuffer): Promise<void> {
    const size = typeof raw === 'string' ? raw.length : raw.byteLength;
    if (size > MSG_MAX) { if (size > MSG_MAX * 16) this.reject(sock, 'big'); return; }
    let m: InMsg;
    try { m = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); } catch { return; }
    if (!m || typeof m !== 'object') return;
    const s = this.s;
    const pid = sock.pid;
    const seat = this.seatOf(pid);
    if (m.t === 'ping') { this.reply(sock, { t: 'pong', now: this.host.now() }); return; }
    if (m.t !== 'chat' && m.t !== 'report' && !this.actRL.allow(pid, this.host.now())) { this.reply(sock, { t: 'slow' }); return; }
    const A = this.A;
    const host = seat >= 0 && this.isHost(pid);

    switch (m.t) {
      case 'act': {
        if (!s.g || seat < 0 || s.status !== 'playing') return;
        const a = A.parse(m.a);
        const n = a ? A.apply(s.g, seat, a) : s.g;
        if (n === s.g) { this.reply(sock, { t: 'reject' }); this.sendTo(pid); return; }
        s.g = n;
        const st = s.seats[seat];
        st.missed = 0; st.away = false;
        s.ready = [];
        break;
      }
      case 'next': {
        const p = s.g ? A.pause(s.g) : null;
        if (seat < 0 || !p?.vote) return;
        if (!s.ready.includes(seat)) s.ready.push(seat);
        if (this.waitingHumans().every(i => s.ready.includes(i))) this.step();
        break;
      }
      case 'rematch': {
        if (!s.g || !A.isOver(s.g) || seat < 0) return;
        if (!s.rematch.includes(seat)) s.rematch.push(seat);
        if (this.waitingHumans().every(i => s.rematch.includes(i))) this.newGame();
        break;
      }
      case 'start': {
        if (!host || s.status !== 'lobby' || seat < 0) return;
        this.startGame();
        break;
      }
      case 'addBot': {
        if (!host || s.status !== 'lobby' || s.quick || s.seats.length >= A.seats.max) return;
        s.seats.push({ pid: null, name: this.botName(), bot: true, away: false, missed: 0 });
        break;
      }
      case 'removeBot': {
        if (!host || s.status !== 'lobby' || s.quick) return;
        const i = s.seats.map(x => x.bot).lastIndexOf(true);
        if (i < 0) return;
        s.seats.splice(i, 1);
        break;
      }
      case 'rules': {
        if (!host || s.status !== 'lobby' || s.quick) return;
        s.rules = A.rules(m.rules, Math.max(s.seats.length, A.seats.min));
        break;
      }
      case 'rename': {
        if (seat < 0) return;
        s.seats[seat].name = cleanName(m.name, s.seats[seat].name);
        if (s.g) s.g = A.setPlayer(s.g, seat, { name: s.seats[seat].name, bot: false });
        break;
      }
      case 'sit': {
        // a spectator takes over a bot seat (also: a player who left comes back)
        const t = Number(m.seat);
        if (seat >= 0 || s.status !== 'playing' || !Number.isInteger(t) || !s.seats[t]?.bot) return;
        const name = cleanName(m.name, 'Player');
        s.seats[t] = { pid, name, bot: false, away: false, missed: 0 };
        if (s.g) s.g = A.setPlayer(s.g, t, { name, bot: false });
        if (!s.hostPid || !this.online().has(s.hostPid)) s.hostPid = pid;
        break;
      }
      case 'leave': {
        if (seat >= 0) {
          if (s.status === 'lobby') s.seats.splice(seat, 1);
          else {
            const st = s.seats[seat];
            st.pid = null; st.bot = true; st.away = false; st.missed = 0;   // a bot finishes the game for them
            if (s.g) s.g = A.setPlayer(s.g, seat, { name: st.name, bot: true });
            s.ready = s.ready.filter(i => i !== seat); s.rematch = s.rematch.filter(i => i !== seat);
          }
          if (s.hostPid === pid) s.hostPid = s.seats.find(x => !x.bot && x.pid && x.pid !== pid)?.pid ?? null;
        }
        try { sock.close(1000, 'left'); } catch { /* */ }
        break;
      }
      case 'emote': {
        if (seat < 0 || typeof m.e !== 'string' || !m.e || m.e.length > 8) return;
        s.emoteId++;
        this.sendAll({ t: 'emote', seat, e: m.e, id: s.emoteId });
        return;
      }
      case 'chat': { await this.chat(sock, seat, m); return; }
      case 'report': { await this.report(sock, seat, m); return; }
      default: return;
    }
    await this.changed();
  }

  /** Humans whose answer we wait for in a vote: connected, seated, not played by the bot. */
  private waitingHumans(): number[] {
    const on = this.online();
    return this.s.seats.map((x, i) => (!x.bot && !x.away && x.pid && on.has(x.pid) ? i : -1)).filter(i => i >= 0);
  }

  private botName(): string {
    const used = new Set(this.s.seats.map(x => x.name));
    return BOT_NAMES.find(n => !used.has(n)) ?? 'Bot';
  }

  /* ============================================================== game flow */

  private startGame() {
    const s = this.s, A = this.A;
    const want = s.quick ? A.seats.quick : A.seats.min;
    while (s.seats.length < want) s.seats.push({ pid: null, name: this.botName(), bot: true, away: false, missed: 0 });
    s.status = 'playing';
    s.startAt = null;
    this.newGame();
  }

  private newGame() {
    const s = this.s, A = this.A;
    const on = this.online();
    for (const x of s.seats) if (!x.bot && (!x.pid || !on.has(x.pid))) x.away = true;   // absent humans start on autopilot
    const seed = Math.floor(this.host.random() * 0xffffffff) >>> 0;
    s.salt = Math.floor(this.host.random() * 2 ** 52).toString(36) + Math.floor(this.host.random() * 2 ** 52).toString(36);
    s.rules = A.rules(s.rules, s.seats.length);
    s.g = A.create(seed, s.seats.map(x => ({ name: x.name, bot: x.bot })), s.rules);
    s.gameNo++;
    s.ready = []; s.rematch = [];
    for (const x of s.seats) x.missed = 0;
  }

  /** Take the pending automatic step / bot move / timeout move. */
  private step() {
    const s = this.s, A = this.A;
    if (!s.g) return;
    const p = A.pause(s.g);
    if (p) { s.g = A.apply(s.g, -1, p.a); s.ready = []; return; }
    const who = A.actor(s.g);
    if (who == null) return;
    const st = s.seats[who];
    if (st && !st.bot && !st.away) { st.missed++; if (st.missed >= AWAY_AFTER) st.away = true; }
    s.g = this.botMove(s.g, who);
  }

  /** The bot's move; if it is somehow illegal, the first legal move — the game can never get stuck. */
  private botMove(g: unknown, seat: number): unknown {
    const A = this.A;
    try {
      const n = A.apply(g, seat, A.bot(g, seat, () => this.host.random()));
      if (n !== g) return n;
    } catch { /* fall through */ }
    for (const a of A.legalActions(g, seat)) { const n = A.apply(g, seat, a); if (n !== g) return n; }
    return g;
  }

  async alarm(): Promise<void> {
    const s = this.s;
    if (!s.deadline) return;
    const now = this.host.now();
    if (now < s.deadline - 50) { this.host.setAlarm(s.deadline); return; }
    if (s.status === 'lobby') {
      if (!s.quick) { s.deadline = null; s.dlKey = ''; await this.host.save(s); return; }
      if (!s.seats.some(x => !x.bot && x.pid && this.online().has(x.pid))) {   // everybody left before the start
        s.startAt = null; s.deadline = null; s.dlKey = ''; await this.host.save(s); return;
      }
      this.startGame();
    } else this.step();
    s.dlKey = '';
    await this.changed();
  }

  /** Work out what the room waits for and set the alarm (an unchanged wait keeps its deadline). */
  private schedule() {
    const s = this.s, A = this.A;
    const now = this.host.now();
    let key = '', ms = 0, at: number | null = null;
    if (s.status === 'lobby') {
      if (s.quick && s.startAt) { key = 'start'; at = s.startAt; }
    } else if (s.g && !A.isOver(s.g)) {
      const p = A.pause(s.g);
      const seq = A.seq(s.g);
      if (p) { key = `p:${s.gameNo}:${seq}`; ms = p.ms; }
      else {
        const who = A.actor(s.g);
        if (who != null) {
          const st = s.seats[who];
          const kind = !st || st.bot || st.away ? 'bot' : st.pid && this.online().has(st.pid) ? 'turn' : 'off';
          key = `${kind}:${s.gameNo}:${seq}:${who}`;
          ms = kind === 'bot' ? BOT_MS + Math.floor(this.host.random() * BOT_JITTER) : kind === 'turn' ? TURN_MS : OFFLINE_MS;
        }
      }
    }
    if (!key) { s.deadline = null; s.dlKey = ''; this.host.setAlarm(null); return; }
    if (key !== s.dlKey || !s.deadline) { s.dlKey = key; s.deadline = at ?? now + ms; }
    this.host.setAlarm(s.deadline);
  }

  private async changed(fresh?: Sock) {
    this.schedule();
    await this.host.save(this.s);
    this.broadcast(fresh);
  }

  /* ============================================================== chat */

  private async chat(sock: Sock, seat: number, m: InMsg) {
    const s = this.s;
    if (seat < 0) return;
    const now = this.host.now();
    if (!this.chatRL.allow(sock.pid, now)) { this.reply(sock, { t: 'chatErr', code: 'slow', wait: this.chatRL.waitMs(sock.pid, now) }); return; }
    let text = '', masked = false;
    const q = isQuickKey(m.q) ? m.q : undefined;
    if (!q) { const c = sanitizeChat(m.text); if (!c) return; text = c.text; masked = c.masked; }
    s.chatId++;
    const line: ChatMsg = { id: s.chatId, seat, name: s.seats[seat].name, text, at: now, ...(q ? { q } : {}), ...(masked ? { masked } : {}) };
    s.chat = [...s.chat.slice(-(CHAT_HISTORY - 1)), line];
    this.sendAll({ t: 'chat', ...line });
    await this.host.save(s);
  }

  private async report(sock: Sock, seat: number, m: InMsg) {
    const s = this.s;
    const line = s.chat.find(x => x.id === Number(m.id));
    const fail = (error: string) => this.reply(sock, { t: 'reportResult', rid: m.rid, ok: false, error });
    if (seat < 0 || !line) return fail('notFound');
    if (line.seat === seat) return fail('self');
    if (typeof m.token !== 'string' || !m.token) return fail('auth');
    if (!this.reportRL.allow(sock.pid, this.host.now())) return fail('throttle');
    if (!this.host.report) return fail('unavailable');
    const r = await this.host.report({ room: `${s.game[0]}:${s.code}`, seat: line.seat, name: line.name, text: line.q ? `[quick:${line.q}]` : line.text, msgId: line.id, token: m.token });
    this.reply(sock, { t: 'reportResult', rid: m.rid, ok: r.ok, error: r.error });
  }

  /* ============================================================== views */

  roomInfo(on = this.online()): RoomInfo {
    const s = this.s, A = this.A;
    return {
      game: s.game, code: s.code, status: s.status, quick: s.quick, minSeats: A.seats.min, maxSeats: s.quick ? A.seats.quick : A.seats.max,
      seats: s.seats.map(x => ({ name: x.name, bot: x.bot, away: x.away, online: x.bot || (!!x.pid && on.has(x.pid)), host: !!x.pid && x.pid === s.hostPid })),
      rules: s.rules, gameNo: s.gameNo, ready: [...s.ready], rematch: [...s.rematch], startAt: s.status === 'lobby' ? s.startAt : null,
    };
  }

  /** The state message for one seat (−1 = spectator). */
  stateFor(seat: number, pid: string, room: RoomInfo, withChat = false): string {
    const s = this.s, A = this.A;
    const msg: StateMsg & { chat?: ChatMsg[] } = {
      t: 'state', you: seat, isHost: this.isHost(pid) && seat >= 0, room,
      view: s.g ? A.viewFor(s.g, seat, s.salt) : null,
      actor: s.g ? A.actor(s.g) : null,
      deadline: s.deadline, turnMs: TURN_MS, now: this.host.now(),
      ...(withChat ? { chat: s.chat } : {}),
    };
    return JSON.stringify(msg);
  }

  private sendTo(pid: string) {
    const room = this.roomInfo();
    const out = this.stateFor(this.seatOf(pid), pid, room);
    for (const w of this.host.sockets()) if (w.pid === pid) { try { w.send(out); } catch { /* */ } }
  }

  broadcast(fresh?: Sock) {
    const room = this.roomInfo();
    const cache = new Map<string, string>();
    for (const w of this.host.sockets()) {
      const seat = this.seatOf(w.pid);
      const key = `${seat}:${this.isHost(w.pid)}`;
      let out = w === fresh ? this.stateFor(seat, w.pid, room, true) : cache.get(key);
      if (!out) { out = this.stateFor(seat, w.pid, room); cache.set(key, out); }
      try { w.send(out); } catch { /* */ }
    }
  }
}
