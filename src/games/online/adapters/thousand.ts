import {
  type Action, type TState, type ThousandRules, DEFAULT_RULES, actor, apply, bidOptions, contractOptions, legalCards, newGame,
} from '../../thousand/engine';
import { botAction } from '../../thousand/bot';
import { type GameAdapter, cardId, hideAll, idList, int, isObj } from './types';

const DUMMY = { r: '9' as const, s: 'S' as const };
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

export const thousandAdapter: GameAdapter<TState, Action, ThousandRules> = {
  id: 'thousand',
  seats: { min: 3, max: 3, quick: 3 },
  defaultRules: { ...DEFAULT_RULES },
  rules(raw) {
    const r = isObj(raw) ? raw : {};
    return {
      marriageToBid: bool(r.marriageToBid, DEFAULT_RULES.marriageToBid),
      step10: bool(r.step10, DEFAULT_RULES.step10),
      barrel: bool(r.barrel, DEFAULT_RULES.barrel),
      bolts: bool(r.bolts, DEFAULT_RULES.bolts),
      samosval: bool(r.samosval, DEFAULT_RULES.samosval),
    };
  },
  create: (seed, players, rules) => newGame({ players, rules, seed }),
  parse(raw) {
    if (!isObj(raw)) return null;
    switch (raw.type) {
      case 'bid': return int(raw.amount, 0, 300) ? { type: 'bid', amount: raw.amount } : null;
      case 'give': return idList(raw.ids, 2) && raw.ids.length === 2 ? { type: 'give', ids: [raw.ids[0], raw.ids[1]] } : null;
      case 'contract': return int(raw.amount, 100, 300) ? { type: 'contract', amount: raw.amount } : null;
      case 'play': return cardId(raw.id) ? { type: 'play', id: raw.id, ...(raw.marriage === true ? { marriage: true } : {}) } : null;
      default: return null;   // 'next' is a vote (room message), 'finish' is not allowed online
    }
  },
  apply,
  legalActions(s, p) {
    switch (s.phase) {
      case 'bid': return s.turn === p ? [{ type: 'bid', amount: 0 }, ...bidOptions(s, p).map(amount => ({ type: 'bid' as const, amount }))] : [];
      case 'give': return s.turn === p ? [{ type: 'give', ids: s.hands[p].slice(0, 2).map(c => c.id) }] : [];
      case 'contract': return contractOptions(s, p).map(amount => ({ type: 'contract', amount }));
      case 'play': return legalCards(s, p).map(c => ({ type: 'play', id: c.id }));
      default: return [];
    }
  },
  actor,
  pause: s => (s.phase === 'dealOver' ? { ms: 15_000, a: { type: 'next' }, vote: true } : null),
  bot: (s, p, rnd) => botAction(s, p, 'hard', rnd) ?? { type: 'bid', amount: 0 },
  setPlayer: (s, p, pl) => ({ ...s, players: s.players.map((x, i) => (i === p ? { ...pl } : x)) }),
  viewFor(s, seat, salt) {
    const reveal = s.phase === 'dealOver' || s.phase === 'gameOver';
    // while the declarer is about to give, the talon he took is still public knowledge (it was shown face up)
    const shown = s.phase === 'give' ? new Set(s.talonShown.map(c => c.id)) : null;
    return {
      ...s,
      rng: 0,
      hands: s.hands.map((h, i) => {
        if (i === seat || reveal) return h;
        if (shown && i === s.declarer) return h.map(c => (shown.has(c.id) ? c : hideAll([c], salt, DUMMY)[0]));
        return hideAll(h, salt, DUMMY);
      }),
      talon: hideAll(s.talon, salt, DUMMY),
      gives: s.gives.filter(g => seat === s.declarer || g.to === seat),
    };
  },
  isOver: s => s.phase === 'gameOver',
  result: s => ({ scores: [...s.scores], winners: s.winner >= 0 ? [s.winner] : [] }),
  seq: s => s.seq,
};

/* ------------------------------------------------------------------ client: my seat at the bottom */

/** Rotate a Thousand view so that seat `you` becomes seat 0 (the table always draws seat 0 at the bottom). */
export function rotateThousand(g: TState, you: number): TState {
  if (you <= 0) return g;
  const n = 3;
  const m = (i: number) => (i < 0 ? i : (i - you + n) % n);
  const arr = <T>(a: readonly T[]): T[] => a.map((_, k) => a[(k + you) % n]);
  const notes = (ns: { p: number }[]) => ns.map(x => ({ ...x, p: m(x.p) }));
  return {
    ...g,
    players: arr(g.players), dealer: m(g.dealer), turn: m(g.turn), hands: arr(g.hands),
    gives: g.gives.map(x => ({ ...x, to: m(x.to) })), bids: g.bids.map(b => ({ ...b, p: m(b.p) })), passed: arr(g.passed),
    highBy: m(g.highBy), declarer: m(g.declarer), marriages: g.marriages.map(x => ({ ...x, p: m(x.p) })),
    trick: g.trick.map(x => ({ ...x, p: m(x.p) })), leader: m(g.leader),
    tricks: g.tricks.map(t => ({ leader: m(t.leader), winner: m(t.winner), plays: t.plays.map(x => ({ ...x, p: m(x.p) })) })),
    scores: arr(g.scores), barrel: arr(g.barrel), bolts: arr(g.bolts),
    sheet: g.sheet.map(r => ({
      ...r, dealer: m(r.dealer), declarer: m(r.declarer), pts: arr(r.pts), delta: arr(r.delta), totals: arr(r.totals),
      barrel: arr(r.barrel), bolts: arr(r.bolts), notes: notes(r.notes) as typeof r.notes,
    })),
    result: g.result && {
      ...g.result, declarer: m(g.result.declarer), cardPts: arr(g.result.cardPts), marPts: arr(g.result.marPts), pts: arr(g.result.pts),
      tricksBy: arr(g.result.tricksBy), delta: arr(g.result.delta), notes: notes(g.result.notes) as typeof g.result.notes,
    },
    winner: m(g.winner),
  };
}
