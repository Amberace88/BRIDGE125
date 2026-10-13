import { type Action, type Bid, type ZState, type ZoleRules, DEFAULT_RULES, actor, apply, legalBids, legalCards, newSession } from '../../zole/engine';
import { botAction } from '../../zole/bot';
import { type GameAdapter, cardId, hideAll, idList, isObj } from './types';

const DUMMY = { r: '9' as const, s: 'C' as const };
const BIDS: Bid[] = ['take', 'zole', 'maza', 'pass'];
/** Online sessions are shorter than the solo default. */
export const ZOLE_ONLINE_DEALS = [6, 9, 12, 24];

export const zoleAdapter: GameAdapter<ZState, Action, ZoleRules> = {
  id: 'zole',
  seats: { min: 3, max: 3, quick: 3 },
  defaultRules: { ...DEFAULT_RULES, deals: 6 },
  rules(raw) {
    const r = isObj(raw) ? raw : {};
    return {
      mazaZole: typeof r.mazaZole === 'boolean' ? r.mazaZole : DEFAULT_RULES.mazaZole,
      pules: typeof r.pules === 'boolean' ? r.pules : DEFAULT_RULES.pules,
      deals: ZOLE_ONLINE_DEALS.includes(Number(r.deals)) ? Number(r.deals) : 6,
    };
  },
  create: (seed, players, rules) => newSession({ players, rules, seed }),
  parse(raw) {
    if (!isObj(raw)) return null;
    if (raw.type === 'bid' && BIDS.includes(raw.bid as Bid)) return { type: 'bid', bid: raw.bid as Bid };
    if (raw.type === 'discard' && idList(raw.ids, 2) && raw.ids.length === 2) return { type: 'discard', ids: [raw.ids[0], raw.ids[1]] };
    if (raw.type === 'play' && cardId(raw.id)) return { type: 'play', id: raw.id };
    return null;   // 'next' is a vote (room message), 'finish' is not allowed online
  },
  apply,
  legalActions(s, p) {
    if (s.phase === 'bid') return legalBids(s, p).map(bid => ({ type: 'bid', bid }));
    if (s.phase === 'discard' && s.turn === p) return [{ type: 'discard', ids: s.hands[p].slice(0, 2).map(c => c.id) }];
    return legalCards(s, p).map(c => ({ type: 'play', id: c.id }));
  },
  actor,
  pause: s => (s.phase === 'dealOver' ? { ms: 15_000, a: { type: 'next' }, vote: true } : null),
  bot: (s, p, rnd) => botAction(s, p, 'hard', rnd) ?? { type: 'bid', bid: 'pass' },
  setPlayer: (s, p, pl) => ({ ...s, players: s.players.map((x, i) => (i === p ? { ...pl } : x)) }),
  viewFor(s, seat, salt) {
    const reveal = s.phase === 'dealOver' || s.phase === 'sessionOver';
    return {
      ...s,
      rng: 0,
      hands: s.hands.map((h, i) => (i === seat || reveal ? h : hideAll(h, salt, DUMMY))),
      galds: reveal ? s.galds : hideAll(s.galds, salt, DUMMY),
      discards: reveal || seat === s.declarer ? s.discards : hideAll(s.discards, salt, DUMMY),
    };
  },
  isOver: s => s.phase === 'sessionOver',
  result(s) {
    const best = Math.max(...s.scores);
    return { scores: [...s.scores], winners: s.scores.map((v, i) => (v === best ? i : -1)).filter(i => i >= 0) };
  },
  seq: s => s.seq,
};

/* ------------------------------------------------------------------ client: my seat at the bottom */

/** Rotate a Zole view so that seat `you` becomes seat 0 (the tables always draw seat 0 at the bottom). */
export function rotateZole(g: ZState, you: number): ZState {
  if (you <= 0) return g;
  const n = 3;
  const m = (i: number) => (i < 0 ? i : (i - you + n) % n);
  const arr = <T>(a: readonly T[]): T[] => a.map((_, k) => a[(k + you) % n]);
  const idx = (a: readonly number[]) => a.map(m);
  return {
    ...g,
    players: arr(g.players), dealer: m(g.dealer), turn: m(g.turn), hands: arr(g.hands),
    bids: g.bids.map(b => ({ ...b, p: m(b.p) })), declarer: m(g.declarer),
    trick: g.trick.map(x => ({ ...x, p: m(x.p) })), leader: m(g.leader),
    tricks: g.tricks.map(t => ({ leader: m(t.leader), winner: m(t.winner), plays: t.plays.map(x => ({ ...x, p: m(x.p) })) })),
    scores: arr(g.scores), pules: { common: g.pules.common, personal: arr(g.pules.personal) },
    sheet: g.sheet.map(r => ({ ...r, dealer: m(r.dealer), declarer: m(r.declarer), delta: arr(r.delta), totals: arr(r.totals), losers: idx(r.losers) })),
    result: g.result && {
      ...g.result, declarer: m(g.result.declarer), tricksBy: arr(g.result.tricksBy), ptsBy: arr(g.result.ptsBy), losers: idx(g.result.losers),
      delta: arr(g.result.delta), puleDelta: arr(g.result.puleDelta), galdsTo: m(g.result.galdsTo),
    },
  };
}

/** Undo `rotateZole` for a seat index. */
export const realSeat = (local: number, you: number, n: number) => (you <= 0 || local < 0 ? local : (local + you) % n);

