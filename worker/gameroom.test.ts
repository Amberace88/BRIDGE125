import { describe, expect, it } from 'vitest';
import { ADAPTERS } from '../src/games/online/adapters';
import { rotateThousand } from '../src/games/online/adapters/thousand';
import { rotateZole } from '../src/games/online/adapters/zole';
import { AWAY_AFTER, MSG_MAX, OFFLINE_MS, QUICK_WAIT_MS, TURN_MS, type OnlineGameId, type StateMsg } from '../src/games/online/protocol';
import type { DurakState } from '../src/games/durak/engine';
import { newSession, type ZState } from '../src/games/zole/engine';
import { newGame as newThousand, type TState } from '../src/games/thousand/engine';
import { newGame as newDurak } from '../src/games/durak/engine';
import { makeRng } from '../src/games/zole/engine';
import { GameRoomCore, type CoreHost, type GRState, type Sock } from './gameroomCore';

/* ================================================================== a simulated Durable Object host */

class FakeSock implements Sock {
  inbox: Record<string, unknown>[] = [];
  open = true;
  readonly pid: string;
  private room: FakeRoom;
  constructor(pid: string, room: FakeRoom) { this.pid = pid; this.room = room; }
  send(m: string) { if (this.open) this.inbox.push(JSON.parse(m)); }
  close() { this.open = false; }
  /** the newest state message this socket received */
  get state(): StateMsg { const s = [...this.inbox].reverse().find(m => m.t === 'state'); if (!s) throw new Error('no state for ' + this.pid); return s as unknown as StateMsg; }
  msg(m: object) { return this.room.core.message(this, JSON.stringify(m)); }
  raw(m: string) { return this.room.core.message(this, m); }
}

class FakeRoom implements CoreHost {
  t = 1_000_000;
  socks: FakeSock[] = [];
  alarmAt: number | null = null;
  saved = 0;
  core: GameRoomCore;
  private rnd: () => number;
  constructor(game: OnlineGameId, code: string, seed = 7) {
    this.rnd = makeRng(seed);
    this.core = new GameRoomCore(GameRoomCore.fresh(game, code, this.t), this);
  }
  sockets() { return this.socks.filter(s => s.open); }
  now() { return this.t; }
  random() { return this.rnd(); }
  setAlarm(at: number | null) { this.alarmAt = at; }
  save(s: GRState) { this.saved++; JSON.stringify(s); }   // must stay serializable
  async join(pid: string, name = pid) { const s = new FakeSock(pid, this); this.socks.push(s); await this.core.connect(s, name); return s; }
  async drop(s: FakeSock) { s.open = false; await this.core.close(s); }
  /** advance the clock to the alarm and fire it */
  async tick() { if (this.alarmAt == null) return false; this.t = Math.max(this.t, this.alarmAt); await this.core.alarm(); return true; }
  get g() { return this.core.s.g; }
}

const A = ADAPTERS;

/** Play the move the adapter's bot would play for whoever is to act, through that seat's socket. */
async function humanMove(room: FakeRoom, socks: FakeSock[]) {
  const ad = A[room.core.s.game];
  const g = room.g!;
  const who = ad.actor(g);
  if (who == null) return false;
  const sock = socks.find(s => s.open && s.state.you === who);
  if (!sock) return false;
  const a = ad.bot(g, who, Math.random);
  room.t += 400;   // humans need a moment (and the room rate-limits floods)
  await sock.msg({ t: 'act', a });
  return true;
}

/** Drive a game to the end: humans act through their sockets, pauses / bots through alarms. */
async function playOut(room: FakeRoom, socks: FakeSock[], max = 6000) {
  const ad = A[room.core.s.game];
  for (let i = 0; i < max && room.g && !ad.isOver(room.g); i++) {
    if (!(await humanMove(room, socks))) await room.tick();
  }
  return room.g && ad.isOver(room.g);
}

/* ================================================================== views never leak hidden cards */

const realIds = (cs: { id: string }[]) => cs.map(c => c.id);
const leaksIn = (view: unknown, ids: string[]) => { const j = JSON.stringify(view); return ids.filter(id => j.includes(`"${id}"`)); };

describe('viewFor hides what a seat may not see', () => {
  it('zole: other hands, the galds, the discards and the rng', () => {
    const ad = A.zole;
    let g = newSession({ players: [{ name: 'a', bot: false }, { name: 'b', bot: false }, { name: 'c', bot: false }], seed: 99 }) as ZState;
    for (let seat = 0; seat < 3; seat++) {
      const v = ad.viewFor(g, seat, 'salt') as ZState;
      const hidden = [...g.hands.filter((_, i) => i !== seat).flatMap(realIds), ...realIds(g.galds)];
      expect(leaksIn(v, hidden)).toEqual([]);
      expect(v.rng).toBe(0);
      expect(v.hands[seat]).toEqual(g.hands[seat]);
      expect(v.hands.map(h => h.length)).toEqual(g.hands.map(h => h.length));
    }
    // spectator: nothing
    expect(leaksIn(ad.viewFor(g, -1, 's'), g.hands.flat().map(c => c.id))).toEqual([]);
    // the lielais takes the table and discards: only he sees the discards
    const first = g.turn;
    g = ad.apply(g, first, { type: 'bid', bid: 'take' }) as ZState;
    const disc = g.hands[first].slice(0, 2).map(c => c.id);
    g = ad.apply(g, first, { type: 'discard', ids: disc }) as ZState;
    for (let seat = 0; seat < 3; seat++) {
      const v = ad.viewFor(g, seat, 'salt') as ZState;
      if (seat === first) expect(realIds(v.discards)).toEqual(disc);
      else expect(leaksIn(v, disc)).toEqual([]);
    }
  });

  it('zole: hidden ids are opaque and stable, and differ between salts', () => {
    const g = newSession({ players: [{ name: 'a', bot: false }, { name: 'b', bot: true }, { name: 'c', bot: true }], seed: 3 }) as ZState;
    const v1 = A.zole.viewFor(g, 0, 'one') as ZState, v2 = A.zole.viewFor(g, 0, 'one') as ZState, v3 = A.zole.viewFor(g, 0, 'two') as ZState;
    expect(realIds(v1.hands[1])).toEqual(realIds(v2.hands[1]));
    expect(realIds(v1.hands[1])).not.toEqual(realIds(v3.hands[1]));
    expect(new Set(v1.hands[1].map(c => c.r + c.s)).size).toBe(1);   // dummy faces only
    expect(new Set(realIds(v1.hands[1])).size).toBe(8);
  });

  it('durak: other hands, the talon (except the trump card), draws and the seed', () => {
    const ad = A.durak;
    let g = newDurak({ players: [0, 1, 2].map(i => ({ name: 'p' + i, bot: false })), seed: 1234 });
    // play until somebody drew cards from the talon
    for (let k = 0; k < 400 && !g.events.some(e => e.t === 'draw'); k++) {
      const who = ad.actor(g);
      g = who == null ? ad.apply(g, -1, ad.pause(g)!.a) : ad.apply(g, who, ad.bot(g, who, Math.random));
    }
    expect(g.events.some(e => e.t === 'draw')).toBe(true);
    for (let seat = 0; seat < 3; seat++) {
      const v = ad.viewFor(g, seat, 'pepper') as DurakState;
      const others = g.players.filter((_, i) => i !== seat).flatMap(p => realIds(p.hand)).filter(id => !g.table.some(t => t.a.id === id || t.d?.id === id));
      const talon = realIds(g.talon).filter(id => id !== g.trumpCard.id);
      // public knowledge stays visible: the discard pile and cards seen going into a hand (picked up / the trump card)
      const pub = new Set([...realIds(g.discard), ...g.known.flat()]);
      expect(leaksIn(v, [...others, ...talon].filter(id => !pub.has(id)))).toEqual([]);
      expect(v.seed).toBe(0);
      expect(v.players[seat].hand).toEqual(g.players[seat].hand);
      if (g.talon.length) expect(v.talon[v.talon.length - 1].id).toBe(g.trumpCard.id);
    }
  });

  it('thousand: other hands, the face-down talon, other gives, the rng', () => {
    const ad = A.thousand;
    let g = newThousand({ players: [0, 1, 2].map(i => ({ name: 'p' + i, bot: false })), seed: 77 }) as TState;
    for (let seat = 0; seat < 3; seat++) {
      const v = ad.viewFor(g, seat, 'x') as TState;
      expect(leaksIn(v, [...g.hands.filter((_, i) => i !== seat).flatMap(realIds), ...realIds(g.talon)])).toEqual([]);
      expect(v.rng).toBe(0);
    }
    // bidding ends → the talon is shown (public); after the give, nobody else knows what went where
    for (let k = 0; k < 10 && g.phase === 'bid'; k++) g = ad.apply(g, g.turn, { type: 'bid', amount: 0 }) as TState;
    expect(g.phase).toBe('give');
    const d = g.declarer;
    const vg = ad.viewFor(g, (d + 1) % 3, 'x') as TState;
    expect(realIds(vg.hands[d]).filter(id => g.talonShown.some(c => c.id === id)).sort()).toEqual(realIds(g.talonShown).sort());
    const ids = g.hands[d].slice(0, 2).map(c => c.id);
    g = ad.apply(g, d, { type: 'give', ids }) as TState;
    const r1 = (d + 1) % 3, r2 = (d + 2) % 3;
    const v1 = ad.viewFor(g, r1, 'x') as TState;
    expect(v1.gives.map(x => x.to)).toEqual([r1]);
    expect(leaksIn(v1, [ids[1]])).toEqual([]);
    expect(leaksIn(ad.viewFor(g, r2, 'x'), [ids[0]])).toEqual([]);
    expect((ad.viewFor(g, d, 'x') as TState).gives.length).toBe(2);
  });

  it('rotation puts my seat at 0 and keeps seat-indexed data consistent', () => {
    const z = newSession({ players: [{ name: 'a', bot: false }, { name: 'b', bot: false }, { name: 'c', bot: false }], seed: 5 }) as ZState;
    const rz = rotateZole(z, 2);
    expect(rz.players.map(p => p.name)).toEqual(['c', 'a', 'b']);
    expect(rz.hands[0]).toEqual(z.hands[2]);
    expect(rz.turn).toBe((z.turn - 2 + 3) % 3);
    const t = newThousand({ players: [{ name: 'a', bot: false }, { name: 'b', bot: false }, { name: 'c', bot: false }], seed: 5 }) as TState;
    const rt = rotateThousand(t, 1);
    expect(rt.players.map(p => p.name)).toEqual(['b', 'c', 'a']);
    expect(rt.bids[0].p).toBe((t.bids[0].p + 2) % 3);
    expect(rt.highBy).toBe((t.highBy + 2) % 3);
  });
});

/* ================================================================== action validation */

describe('action validation', () => {
  it('parse rejects wrong shapes and server-only actions', () => {
    expect(A.zole.parse({ type: 'finish' })).toBeNull();
    expect(A.zole.parse({ type: 'next' })).toBeNull();
    expect(A.zole.parse({ type: 'bid', bid: 'all' })).toBeNull();
    expect(A.zole.parse({ type: 'play', id: '<script>' })).toBeNull();
    expect(A.zole.parse({ type: 'discard', ids: ['QC', 'QC', 'JD'] })).toBeNull();
    expect(A.durak.parse({ type: 'resolve' })).toBeNull();
    expect(A.durak.parse({ type: 'attack', cards: ['6S', '6S'] })).toBeNull();
    expect(A.durak.parse({ type: 'defend', card: '7S', target: 99 })).toBeNull();
    expect(A.thousand.parse({ type: 'bid', amount: 102.5 })).toBeNull();
    expect(A.thousand.parse({ type: 'finish' })).toBeNull();
    expect(A.thousand.parse({ type: 'play', id: 'KH', marriage: true })).toEqual({ type: 'play', id: 'KH', marriage: true });
  });

  it('the room rejects out-of-turn, illegal and oversized messages', async () => {
    const room = new FakeRoom('zole', 'ABCDE');
    const [a, b, c] = [await room.join('a'), await room.join('b'), await room.join('c')];
    await a.msg({ t: 'start' });
    const g0 = room.g as ZState;
    const turn = g0.turn;
    const wrong = [a, b, c].find(s => s.state.you !== turn)!;
    await wrong.msg({ t: 'act', a: { type: 'bid', bid: 'take' } });
    expect(room.g).toBe(g0);
    expect(wrong.inbox.some(m => m.t === 'reject')).toBe(true);
    const right = [a, b, c].find(s => s.state.you === turn)!;
    await right.msg({ t: 'act', a: { type: 'play', id: g0.hands[turn][0].id } });   // not the play phase
    expect(room.g).toBe(g0);
    await right.raw('{"t":"act","a":{"type":"bid","bid":"pass"},"pad":"' + 'x'.repeat(MSG_MAX) + '"}');
    expect(room.g).toBe(g0);
    await right.raw('not json');
    await right.msg({ t: 'act', a: { type: 'bid', bid: 'pass' } });
    expect((room.g as ZState).bids.length).toBe(1);
  });

  it('rate-limits a flood of messages', async () => {
    const room = new FakeRoom('durak', 'FLOOD');
    const a = await room.join('a');
    for (let i = 0; i < 40; i++) await a.msg({ t: 'rename', name: 'n' + i });
    expect(a.inbox.some(m => m.t === 'slow')).toBe(true);
  });
});

/* ================================================================== full games through the room */

describe('full online games with simulated sockets', () => {
  it('zole: three humans play a whole session; nobody ever sees another hand', async () => {
    const room = new FakeRoom('zole', 'ZOLE1', 11);
    const socks = [await room.join('a', 'Anna'), await room.join('b', 'Boris'), await room.join('c', 'Cilda')];
    await socks[0].msg({ t: 'rules', rules: { deals: 6, mazaZole: true, pules: false } });
    await socks[0].msg({ t: 'start' });
    expect(room.core.s.status).toBe('playing');
    let checked = 0;
    const ad = A.zole;
    for (let i = 0; i < 4000 && !ad.isOver(room.g); i++) {
      // every few steps: each socket's view only shows its own hand
      if (i % 7 === 0) for (const s of socks) {
        const g = room.g as ZState;
        if (g.phase === 'dealOver') continue;
        const me = s.state.you;
        const others = g.hands.filter((_, k) => k !== me).flatMap(realIds);
        expect(leaksIn(s.state.view, [...others, ...realIds(g.galds)])).toEqual([]);
        checked++;
      }
      if ((room.g as ZState).phase === 'dealOver') { room.t += 1000; for (const s of socks) await s.msg({ t: 'next' }); continue; }   // everybody ready → no wait
      if (!(await humanMove(room, socks))) await room.tick();
    }
    const z = room.g as ZState;
    expect([z.phase, z.dealNo, z.turn, room.core.s.ready, room.alarmAt]).toEqual(['sessionOver', 6, -1, [], null]);
    expect(checked).toBeGreaterThan(10);
    const g = room.g as ZState;
    expect(g.sheet.filter(r => r.contract !== 'final').length).toBe(6);
    expect(g.scores.reduce((x, y) => x + y, 0)).toBe(0);
    // rematch: all three vote
    for (const s of socks) await s.msg({ t: 'rematch' });
    expect(room.core.s.gameNo).toBe(2);
    expect((room.g as ZState).phase).toBe('bid');
  });

  it('durak: 2 humans + bots on a quick table that fills with bots after the wait', async () => {
    const room = new FakeRoom('durak', 'QDURK1', 5);
    const a = await room.join('a'), b = await room.join('b');
    expect(room.core.s.status).toBe('lobby');
    expect(room.alarmAt).toBe(room.core.s.startAt);
    room.t += QUICK_WAIT_MS;
    await room.tick();
    expect(room.core.s.status).toBe('playing');
    expect(room.core.s.seats.map(x => x.bot)).toEqual([false, false, true]);
    // a stranger arriving at a started quick table is turned away (the client looks for another table)
    const late = await room.join('late');
    expect(late.inbox.some(m => m.t === 'error' && m.code === 'full')).toBe(true);
    expect(await playOut(room, [a, b])).toBe(true);
    const g = room.g as DurakState;
    expect(a.state.view && (a.state.view as DurakState).phase).toBe('over');
    expect(A.durak.result(g).winners.length).toBeGreaterThanOrEqual(2);
  });

  it('thousand: a whole game to 1000 with one human and two bots (pauses run by the clock)', async () => {
    const room = new FakeRoom('thousand', 'THOUS', 3);
    const a = await room.join('a');
    await a.msg({ t: 'addBot' }); await a.msg({ t: 'addBot' });
    await a.msg({ t: 'start' });
    expect(await playOut(room, [a], 20000)).toBe(true);
    const g = room.g as TState;
    expect(g.winner).toBeGreaterThanOrEqual(0);
    expect(Math.max(...g.scores)).toBeGreaterThanOrEqual(1000);
  });
});

/* ================================================================== reconnect, timeouts, bot takeover */

describe('reconnect and bots', () => {
  it('a disconnected player keeps the seat; the bot plays for them after OFFLINE_MS; reconnect restores it', async () => {
    const room = new FakeRoom('zole', 'RECON', 21);
    const [a, b, c] = [await room.join('a'), await room.join('b'), await room.join('c')];
    await a.msg({ t: 'start' });
    const g0 = room.g as ZState;
    const who = g0.turn;
    const victim = [a, b, c].find(s => s.state.you === who)!;
    await room.drop(victim);
    expect(room.core.s.seats[who].pid).toBe(victim.pid);
    expect(a.state.room.seats[who].online).toBe(false);
    expect(room.alarmAt).toBe(room.t + OFFLINE_MS);
    await room.tick();
    expect((room.g as ZState).seq).toBeGreaterThan(g0.seq);   // the bot moved for them
    expect(room.core.s.seats[who].missed).toBe(1);
    const back = await room.join(victim.pid);
    expect(back.state.you).toBe(who);
    expect(room.core.s.seats[who].away).toBe(false);
    expect((back.state.view as ZState).hands[who]).toEqual((room.g as ZState).hands[who]);
    // chat history arrives with the first state after a reconnect
    expect(Array.isArray((back.inbox.find(m => m.t === 'state') as { chat?: unknown }).chat)).toBe(true);
  });

  it('a human who lets the clock run out twice goes on autopilot until acting again', async () => {
    const room = new FakeRoom('durak', 'AWAYS', 2);
    const a = await room.join('a');
    const b = await room.join('b');
    await a.msg({ t: 'start' });
    const seatA = a.state.you;
    // only b plays; a's turns time out
    let timeouts = 0;
    for (let i = 0; i < 300 && !room.core.s.seats[seatA].away; i++) {
      const g = room.g as DurakState;
      const who = A.durak.actor(g);
      if (who === b.state.you) { room.t += 400; await b.msg({ t: 'act', a: A.durak.bot(g, who, Math.random) }); continue; }
      if (who === seatA) { expect(room.alarmAt! - room.t).toBe(TURN_MS); timeouts++; }
      await room.tick();
    }
    expect(room.core.s.seats[seatA].away).toBe(true);
    expect(timeouts).toBe(AWAY_AFTER);
    expect(a.state.room.seats[seatA].away).toBe(true);
    // on autopilot the bot answers quickly
    const g = room.g as DurakState;
    if (A.durak.actor(g) === seatA) expect(room.alarmAt! - room.t).toBeLessThan(2000);
  });

  it('leave → a bot takes the seat; a spectator can sit down on it again', async () => {
    const room = new FakeRoom('thousand', 'LEAVE', 4);
    const [a, b, c] = [await room.join('a'), await room.join('b'), await room.join('c')];
    await a.msg({ t: 'start' });
    const seatB = b.state.you;
    await b.msg({ t: 'leave' });
    expect(room.core.s.seats[seatB]).toMatchObject({ pid: null, bot: true });
    expect((room.g as TState).players[seatB].bot).toBe(true);
    const d = await room.join('dora', 'Dora');
    expect(d.state.you).toBe(-1);
    // the spectator sees no hands at all
    const g = room.g as TState;
    expect(leaksIn(d.state.view, g.hands.flatMap(realIds))).toEqual([]);
    await d.msg({ t: 'sit', seat: seatB, name: 'Dora' });
    expect(d.state.you).toBe(seatB);
    expect(room.core.s.seats[seatB]).toMatchObject({ pid: 'dora', bot: false, name: 'Dora' });
    expect((room.g as TState).players[seatB]).toEqual({ name: 'Dora', bot: false });
    void c;
  });

  it('a full private lobby: a new human replaces a bot; host controls are host-only', async () => {
    const room = new FakeRoom('zole', 'PRIVT');
    const a = await room.join('a');
    await a.msg({ t: 'addBot' }); await a.msg({ t: 'addBot' });
    expect(room.core.s.seats.length).toBe(3);
    const b = await room.join('b');
    expect(b.state.you).toBe(2);
    expect(room.core.s.seats.map(x => x.bot)).toEqual([false, true, false]);
    await b.msg({ t: 'removeBot' });   // not the host
    expect(room.core.s.seats.length).toBe(3);
    await b.msg({ t: 'start' });
    expect(room.core.s.status).toBe('lobby');
    await a.msg({ t: 'start' });
    expect(room.core.s.status).toBe('playing');
  });

  it('deal-over pause: waits for every human (or the clock)', async () => {
    const room = new FakeRoom('zole', 'PAUSE', 8);
    const socks = [await room.join('a'), await room.join('b'), await room.join('c')];
    await socks[0].msg({ t: 'start' });
    for (let i = 0; i < 400 && (room.g as ZState).phase !== 'dealOver'; i++) if (!(await humanMove(room, socks))) await room.tick();
    expect((room.g as ZState).phase).toBe('dealOver');
    await socks[0].msg({ t: 'next' }); await socks[1].msg({ t: 'next' });
    expect((room.g as ZState).phase).toBe('dealOver');
    expect(socks[2].state.room.ready.length).toBe(2);
    await socks[2].msg({ t: 'next' });
    expect((room.g as ZState).phase).toBe('bid');
    expect((room.g as ZState).dealNo).toBe(2);
  });
});
