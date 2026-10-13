// Durak bots — easy / normal / hard. They only use what a player at the table can see: their own hand, the table,
// the discard pile, the trump card, hand sizes and the public memory in `state.known` (cards seen going into a hand).
// Every move comes from `legalActions`, so a bot can never make an illegal move.
import {
  type Action, type Card, type DurakState, type Rank, apply as apply2, beats, legalActions, nextActive, rankIdx, rng, unseenFor,
} from './engine';

export type DurakLevel = 'easy' | 'normal' | 'hard';

/** How much a card is worth keeping: rank, plus a big premium for trumps. */
const worth = (c: Card, trump: string) => rankIdx(c.r) + (c.s === trump ? 10 : 0);

/** Cheapest assignment of beaters to the uncovered attack cards (small backtracking; null when impossible). */
export function coverPlan(s: DurakState, seat: number): { target: number; card: Card }[] | null {
  const hand = s.players[seat].hand;
  const targets = s.table.map((p, i) => ({ p, i })).filter(x => !x.p.d);
  // hardest attack first: fewer options → less branching
  const opts = targets.map(t => ({ t: t.i, cs: hand.filter(c => beats(c, t.p.a, s.trump)).sort((x, y) => worth(x, s.trump) - worth(y, s.trump)) }))
    .sort((x, y) => x.cs.length - y.cs.length);
  let best: { target: number; card: Card }[] | null = null;
  let bestCost = Infinity;
  let steps = 0;
  const used = new Set<string>();
  const cur: { target: number; card: Card }[] = [];
  const go = (k: number, cost: number) => {
    if (++steps > 4000 || cost >= bestCost) return;
    if (k === opts.length) { best = cur.slice(); bestCost = cost; return; }
    for (const c of opts[k].cs) {
      if (used.has(c.id)) continue;
      used.add(c.id); cur.push({ target: opts[k].t, card: c });
      go(k + 1, cost + coverCost(c, s));
      cur.pop(); used.delete(c.id);
    }
  };
  go(0, 0);
  return best;
}

/** What it "costs" to spend a card on defence: trumps are expensive while the talon is thick. */
function coverCost(c: Card, s: DurakState): number {
  const r = rankIdx(c.r);
  if (c.s !== s.trump) return 1 + r * 0.6;
  const early = s.talon.length > 6 ? 1.6 : s.talon.length > 0 ? 1.2 : 0.8;
  return (6 + r * 1.4) * early;
}

/** chance-ish that `def` can beat card `c`, from what `seat` can know (hard bots) */
function beatOdds(s: DurakState, seat: number, def: number, c: Card): number {
  const known = s.known[def].map(id => s.players[def].hand.find(h => h.id === id)).filter(Boolean) as Card[];
  if (known.some(k => beats(k, c, s.trump))) return 1;
  const unseen = unseenFor(s, seat).filter(u => !s.known.some((k, p) => p !== def && k.includes(u.id)) && !known.some(k => k.id === u.id));
  const unknownSlots = s.players[def].hand.length - known.length;
  if (unknownSlots <= 0 || !unseen.length) return 0;
  const good = unseen.filter(u => beats(u, c, s.trump)).length;
  // probability at least one of `unknownSlots` cards drawn from `unseen` beats c
  let pNone = 1;
  for (let i = 0; i < unknownSlots; i++) pNone *= Math.max(0, (unseen.length - good - i) / Math.max(1, unseen.length - i));
  return 1 - pNone;
}

export function botAction(s: DurakState, seat: number, level: DurakLevel = 'normal'): Action {
  const legal = legalActions(s, seat);
  if (!legal.length) return { type: 'pass' };
  const rand = rng((s.seed ^ Math.imul(s.seq + 1, 2654435761) ^ (seat * 97)) >>> 0);
  const hand = s.players[seat].hand;
  const byId = (id: string) => hand.find(c => c.id === id)!;
  const trump = s.trump;
  const talon = s.talon.length;
  const def = s.defender;
  const defHand = s.players[def].hand.length;

  const defending = legal.some(a => a.type === 'take');
  if (defending) return defend(s, seat, level, legal, rand);

  // ---------------------------------------------------------------- lead
  if (!s.table.length) {
    const singles = legal.filter((a): a is Extract<Action, { type: 'attack' }> => a.type === 'attack' && a.cards.length === 1);
    if (level === 'easy') {
      // mostly low cards, sometimes anything
      const sorted = singles.slice().sort((x, y) => worth(byId(x.cards[0]), trump) - worth(byId(y.cards[0]), trump));
      return rand() < 0.7 ? sorted[0] : sorted[Math.floor(rand() * sorted.length)];
    }
    const count = (r: Rank) => hand.filter(c => c.r === r && c.s !== trump).length;
    let best = singles[0], bestScore = -Infinity;
    for (const a of singles) {
      const c = byId(a.cards[0]);
      let score = -worth(c, trump) * 2;
      if (c.s === trump) score -= talon > 0 ? 30 : 8;
      score += (count(c.r) - 1) * 2.5; // keeps a twin to throw in later
      if (level === 'hard') {
        const odds = beatOdds(s, seat, def, c);
        score += (1 - odds) * (talon > 0 ? 6 : 22);
      }
      if (score > bestScore) { bestScore = score; best = a; }
    }
    // hard / endgame: lead the whole set of that rank when the defender is short (they cannot hold them all off)
    {
      const c = byId(best.cards[0]);
      const twins = hand.filter(h => h.r === c.r && (h.s !== trump || talon === 0));
      if (twins.length > 1 && (level === 'hard' || talon === 0)) {
        const ids = twins.slice(0, s.limit).map(h => h.id);
        const multi = legal.find(a => a.type === 'attack' && a.cards.length === ids.length && ids.every(id => a.cards.includes(id)));
        if (multi && ids.length > 1) return multi;
      }
    }
    return best;
  }

  // ---------------------------------------------------------------- throw in / pass
  const throws = legal.filter((a): a is Extract<Action, { type: 'attack' }> => a.type === 'attack');
  const pass: Action = { type: 'pass' };
  if (!throws.length) return pass;
  const cards = throws.map(a => byId(a.cards[0])).sort((x, y) => worth(x, trump) - worth(y, trump));
  const low = cards[0];
  const pick = (c: Card) => throws.find(a => a.cards[0] === c.id)!;
  if (level === 'easy') return rand() < 0.55 && low.s !== trump ? pick(low) : pass;
  if (s.taking) {
    // they take anyway: unload cards we do not want — never trumps while the talon lasts, nothing high early on
    const junk = cards.filter(c => c.s !== trump && (talon === 0 || rankIdx(c.r) <= (level === 'hard' ? 5 : 4)));
    return junk.length ? pick(junk[0]) : pass;
  }
  // the bout is covered: throw a cheap card that may break the defence
  const lateGame = talon === 0;
  const maxRank = lateGame ? 99 : talon <= 6 ? 6 : 4; // up to Q / 10 depending on the talon
  const ok = cards.filter(c => (c.s !== trump || lateGame) && rankIdx(c.r) <= maxRank);
  if (!ok.length) return pass;
  if (level === 'hard') {
    // prefer the card the defender is least likely to beat
    let bc = ok[0], bo = Infinity;
    for (const c of ok) { const o = beatOdds(s, seat, def, c) + worth(c, trump) * 0.02; if (o < bo) { bo = o; bc = c; } }
    // late game: always press; early: only when it hurts
    if (lateGame || bo < 0.85 || defHand <= 2) return pick(bc);
    return rankIdx(bc.r) <= 3 && bc.s !== trump ? pick(bc) : pass;
  }
  return pick(ok[0]);
}

function defend(s: DurakState, seat: number, level: DurakLevel, legal: Action[], rand: () => number): Action {
  const take: Action = { type: 'take' };
  const trump = s.trump;
  const talon = s.talon.length;
  const hand = s.players[seat].hand;
  const transfers = legal.filter((a): a is Extract<Action, { type: 'transfer' }> => a.type === 'transfer');
  const plan = coverPlan(s, seat);
  const cheapTransfer = transfers
    .map(a => ({ a, c: hand.find(h => h.id === a.card)! }))
    .sort((x, y) => worth(x.c, trump) - worth(y.c, trump))[0];

  if (level === 'easy') {
    if (cheapTransfer && rand() < 0.4) return cheapTransfer.a;
    if (plan) { const st = plan[0]; return { type: 'defend', card: st.card.id, target: st.target }; }
    return cheapTransfer ? cheapTransfer.a : take;
  }

  const planCost = plan ? plan.reduce((t, x) => t + coverCost(x.card, s), 0) : Infinity;
  // transfer when it is cheap: a plain card instead of spending trumps / high cards
  if (cheapTransfer) {
    const tc = cheapTransfer.c;
    const tcost = tc.s === trump ? coverCost(tc, s) + 4 : 1 + rankIdx(tc.r) * 0.3;
    const nextDef = nextActive(s, s.defender);
    const nextIsShort = s.players[nextDef].hand.length <= 2;
    if (!plan || tcost < planCost * 0.8 || (level === 'hard' && nextIsShort && tc.s !== trump)) return cheapTransfer.a;
  }
  if (!plan) return take;

  // is taking cheaper? Only while the talon is thick and the attack is small and low
  const tableCards = s.table.flatMap(p => (p.d ? [p.a, p.d] : [p.a]));
  const pickup = tableCards.length;
  const lowAttack = tableCards.every(c => c.s !== trump && rankIdx(c.r) <= 4);
  const usesBigTrump = plan.some(x => x.card.s === trump && rankIdx(x.card.r) >= (level === 'hard' ? 5 : 6));
  if (talon > 8 && pickup <= 2 && lowAttack && usesBigTrump && hand.length <= 6) return take;
  if (level === 'hard' && talon > 4 && planCost > 22 && pickup <= 3 && lowAttack && hand.length <= 5) return take;

  // cover the hardest card first (the plan is ordered that way)
  const st = plan[0];
  return { type: 'defend', card: st.card.id, target: st.target };
}

/** handy for tests: a bot plays seat after seat until the game ends (returns the final state) */
export function autoplay(s: DurakState, levels: DurakLevel[] | DurakLevel = 'normal', maxSteps = 5000): DurakState {
  let cur = s;
  for (let i = 0; i < maxSteps && cur.phase !== 'over'; i++) {
    if (cur.phase === 'resolve') { cur = apply2(cur, -1, { type: 'resolve' }); continue; }
    const lv = Array.isArray(levels) ? levels[cur.turn % levels.length] : levels;
    cur = apply2(cur, cur.turn, botAction(cur, cur.turn, lv));
  }
  return cur;
}
