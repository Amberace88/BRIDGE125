import {
  type Action, type Card, type GameState, type Suit, SUITS, cardPoints, is6S, isQS, legalSingles, nextIdx, options, validatePlay,
} from './engine';

export type BotLevel = 'easy' | 'normal';

function bestSuit(hand: Card[]): Suit {
  const count: Record<Suit, number> = { S: 0, C: 0, H: 0, D: 0 };
  for (const c of hand) if (c.r !== 'J') count[c.s] += 1 + cardPoints(c) / 20;
  return SUITS.reduce((a, b) => (count[b] > count[a] ? b : a), 'S' as Suit);
}

/** Decide one action for player p. */
export function botAction(st: GameState, p: number, level: BotLevel = 'normal'): Action {
  const hand = st.players[p].hand;
  if (st.phase === 'chooseSuit') return { type: 'suit', suit: bestSuit(hand) };
  const o = options(st, p);
  const pend = st.pending;

  if (pend) {
    if (pend.kind === 'eight') {
      const eights = hand.filter(c => c.r === '8');
      if (eights.length) return { type: 'play', cardIds: eights.map(c => c.id) };
    }
    if (pend.kind === 'queen') {
      const six = hand.find(is6S);
      if (six) return { type: 'play', cardIds: [six.id] };
    }
    return { type: 'accept' };
  }

  const legal = o.legal;
  if (!legal.length) {
    if (o.canDraw) return { type: 'draw' };
    return { type: 'pass' };
  }

  if (level === 'easy') {
    const c = legal[Math.floor(Math.random() * legal.length)];
    return { type: 'play', cardIds: [c.id] };
  }

  const nextP = st.players[nextIdx(st, p)];
  const oppMin = Math.min(...st.players.filter((_, i) => i !== p).map(pl => pl.hand.length));

  // 1) Can I go out right now with all remaining cards of one rank?
  for (const c of legal) {
    const same = hand.filter(h => h.r === c.r);
    if (same.length === hand.length && c.r !== '6') {
      const ordered = [c, ...same.filter(h => h.id !== c.id)];
      if (validatePlay(st, p, ordered.map(x => x.id)) === null) return { type: 'play', cardIds: ordered.map(x => x.id) };
    }
  }

  // 2) Q♠ + 6♠ combo, or Q♠ when it hurts
  if (o.combo && (nextP.hand.length <= 3 || hand.length <= 4)) {
    return { type: 'play', cardIds: [hand.find(isQS)!.id, hand.find(is6S)!.id] };
  }

  const score = (c: Card): number => {
    let v = cardPoints(c) * 2;                         // dump points
    if (isQS(c)) v += 25 + (6 - Math.min(nextP.hand.length, 6)) * 3;
    if (c.r === '8') v += 14;
    if (c.r === '7') v += 8;
    if (c.r === 'A') v += 6;
    if (c.r === 'J') v -= hand.length > 2 ? 30 : -10; // keep jacks for the finish
    if (c.r === '9') v -= 6;                           // wild-ish, keep a bit
    if (c.r === '6') {
      // only good if we can cover afterwards
      const rest = hand.filter(h => h.id !== c.id);
      const cover = rest.some(h => h.r === 'J' || h.r === '9' || h.s === c.s || h.r === '6');
      v += cover ? 4 : -40;
    }
    if (oppMin <= 2 && (c.r === '8' || isQS(c) || c.r === '7')) v += 12;
    return v + Math.random() * 2;
  };

  const best = legal.slice().sort((a, b) => score(b) - score(a))[0];
  // add same-rank cards when it dumps points or stacks penalties
  const extras = hand.filter(h => h.id !== best.id && h.r === best.r && best.r !== 'J' && best.r !== '6');
  const ids = [best.id, ...(['8', '7', 'A', '10', 'K', 'Q'].includes(best.r) ? extras.map(e => e.id) : [])];
  if (validatePlay(st, p, ids) === null) return { type: 'play', cardIds: ids };
  return { type: 'play', cardIds: [best.id] };
}

export { legalSingles };
