import { type Action, type DurakRules, type DurakState, HAND, apply, legalActions, newGame } from '../../durak/engine';
import { botAction } from '../../durak/bot';
import { type GameAdapter, cardId, hideAll, hideCard, idList, int, isObj } from './types';

const DUMMY = { r: '6' as const, s: 'S' as const };

export const durakAdapter: GameAdapter<DurakState, Action, DurakRules> = {
  id: 'durak',
  seats: { min: 2, max: 6, quick: 3 },
  defaultRules: { transfer: false, deck: 36 },
  rules(raw, seats) {
    const r = isObj(raw) ? raw : {};
    // a 24-card deck only holds 4 hands of six
    const deck = r.deck === 24 && seats * HAND <= 24 ? 24 : 36;
    return { transfer: r.transfer === true, deck };
  },
  create: (seed, players, rules) => newGame({ players, rules: { ...rules, deck: players.length * HAND > rules.deck ? 36 : rules.deck }, seed }),
  parse(raw) {
    if (!isObj(raw)) return null;
    switch (raw.type) {
      case 'attack': return idList(raw.cards, 6) && new Set(raw.cards).size === raw.cards.length ? { type: 'attack', cards: [...raw.cards] } : null;
      case 'defend': return cardId(raw.card) && int(raw.target, 0, 11) ? { type: 'defend', card: raw.card, target: raw.target } : null;
      case 'transfer': return cardId(raw.card) ? { type: 'transfer', card: raw.card } : null;
      case 'take': return { type: 'take' };
      case 'pass': return { type: 'pass' };
      default: return null;   // 'resolve' is the server's own step
    }
  },
  apply,
  legalActions,
  actor: s => (s.phase === 'play' && s.turn >= 0 ? s.turn : null),
  pause: s => (s.phase === 'resolve' ? { ms: s.resolution === 'taken' ? 1100 : 950, a: { type: 'resolve' }, vote: false } : null),
  bot: (s, p) => botAction(s, p, 'hard'),
  setPlayer: (s, p, pl) => ({ ...s, players: s.players.map((x, i) => (i === p ? { ...x, name: pl.name, bot: pl.bot } : x)) }),
  viewFor(s, seat, salt) {
    const hide = (cs: DurakState['talon']) => hideAll(cs, salt, DUMMY);
    const last = s.talon.length - 1;
    return {
      ...s,
      seed: 0,
      players: s.players.map((p, i) => (i === seat ? p : { ...p, hand: hide(p.hand) })),
      // the bottom card of the talon (the trump card) lies face up
      talon: s.talon.map((c, i) => (i === last && c.id === s.trumpCard.id ? c : hideCard(c, salt, DUMMY))),
      events: s.events.map(e => (e.t === 'draw'
        ? { ...e, draws: e.draws.map(d => (d.p === seat ? d : { ...d, ids: d.ids.map(id => hideCard({ id }, salt, {}).id) })) }
        : e)),
    };
  },
  isOver: s => s.phase === 'over',
  result(s) {
    const n = s.players.length;
    // score: places (1st out best); the durak scores lowest
    const scores = s.players.map((p, i) => (s.durak === i ? 0 : n + 1 - (p.place ?? n)));
    return { scores, winners: s.players.map((_, i) => i).filter(i => i !== s.durak) };
  },
  seq: s => s.seq,
};
