import {
  type Action, type Card, type GameState, type Rng, type Suit, GAME_OVER_AT, RESET_AT, SUITS,
  apply, cardPoints, is6S, isBluff, isQS, legalSingles, makeDeck, mixSeed, mulberry32, nextIdx, options, validatePlay,
} from './engine';

export type BotLevel = 'easy' | 'normal' | 'hard' | 'expert';
export const BOT_LEVELS: readonly BotLevel[] = ['easy', 'normal', 'hard', 'expert'];

/** The bots' source of randomness: Math.random, or a seeded rng for the duration of one seeded decision. */
let rndSrc: Rng = Math.random;
const rnd = () => rndSrc();
const play = (cards: Card[]): Action => ({ type: 'play', cardIds: cards.map(c => c.id) });
const pts = (cs: Card[]) => cs.reduce((a, c) => a + cardPoints(c), 0);
const hidden = (id: string): Card => ({ id, r: '6', s: 'S' });

/**
 * Everything a seat is allowed to know: its own hand, the pile (cards played this round), the other
 * players' hand sizes / scores / bot flags, and the deck size. Other hands and the deck order are masked,
 * so the bots below cannot peek even by accident.
 */
export function botView(st: GameState, p: number): GameState {
  return {
    ...st,
    deck: st.deck.map((_, i) => hidden('d' + i)),
    players: st.players.map((pl, i) => (i === p ? pl : { ...pl, hand: pl.hand.map((_, k) => hidden(`h${i}_${k}`)) })),
  };
}

/**
 * Decide one action for player p (the current player). Always returns an action `apply()` accepts.
 * Seeded games (st.seed set — the Daily challenge) are deterministic: the same state always gets the same decision,
 * because the rng is derived from (seed, round, seq, seat). Pass `rng` to override.
 */
export function botAction(st: GameState, p: number, level: BotLevel = 'normal', rng?: Rng): Action {
  const r = rng ?? (st.seed !== undefined ? mulberry32(mixSeed(st.seed, st.round, st.seq, p, 3)) : undefined);
  if (!r) return ensureValid(st, p, decide(botView(st, p), p, level));
  const prev = rndSrc;
  rndSrc = r;
  try { return ensureValid(st, p, decide(botView(st, p), p, level)); } finally { rndSrc = prev; }
}

// ---------------------------------------------------------------- safety net

const accepted = (st: GameState, p: number, a: Action) => apply(st, p, a) !== st;

function ensureValid(st: GameState, p: number, a: Action): Action {
  if (accepted(st, p, a)) return a;  const o = options(st, p);
  const cands: Action[] = [];
  if (st.phase === 'chooseSuit') cands.push({ type: 'suit', suit: bestSuit(st.players[p]?.hand ?? []) });
  if (o.canAccept) cands.push({ type: 'accept' });
  for (const c of legalSingles(st, p, true)) cands.push(play([c]));
  if (o.canPass) cands.push({ type: 'pass' });
  if (o.canDraw) cands.push({ type: 'draw' });
  for (const c of o.legal) cands.push(play([c]));
  if (o.canChallenge) cands.push({ type: 'challenge' });
  for (const c of cands) if (accepted(st, p, c)) return c;
  return a;
}

// ---------------------------------------------------------------- shared

function bestSuit(hand: Card[]): Suit {
  const count: Record<Suit, number> = { S: 0, C: 0, H: 0, D: 0 };
  for (const c of hand) if (c.r !== 'J') count[c.s] += 1 + cardPoints(c) / 20;
  return SUITS.reduce((a, b) => (count[b] > count[a] ? b : a), 'S' as Suit);
}

/** Cards nobody has shown yet (in other hands or the deck), from this seat's point of view. */
function unseen(st: GameState, p: number): Card[] {
  const seen = new Set([...st.players[p].hand, ...st.pile].map(c => c.id));
  return makeDeck().filter(c => !seen.has(c.id));
}

/** P(a hand of h random cards out of `pool` holds at least one card matching pred). */
function pHolds(pool: Card[], pred: (c: Card) => boolean, h: number): number {
  const U = pool.length;
  const k = pool.filter(pred).length;
  if (!k || h <= 0) return 0;
  if (h >= U) return 1;
  let none = 1;
  for (let i = 0; i < h; i++) none *= Math.max(0, U - k - i) / (U - i);
  return 1 - none;
}

function wantsChallenge(st: GameState, level: BotLevel): boolean {
  const lp = st.lastPlay;
  if (!lp) return false;
  // legality is public information: the card(s) and the top/active suit they went on are on the table
  const illegal = !lp.wasLegal;
  switch (level) {
    case 'easy': return illegal ? rnd() < 0.25 : rnd() < 0.02;
    case 'normal': return illegal ? rnd() < 0.5 : rnd() < 0.02;
    case 'hard': return illegal && rnd() < 0.9;
    case 'expert': return illegal;
  }
}

function decide(st: GameState, p: number, level: BotLevel): Action {
  const hand = st.players[p].hand;
  const smart = level === 'hard' || level === 'expert';
  if (st.phase === 'chooseSuit') return { type: 'suit', suit: smart ? smartSuit(st, p, level === 'expert') : bestSuit(hand) };
  const o = options(st, p);
  // bots keep the classic tempo: at most one voluntary draw per turn (players may draw freely)
  if (st.drawnThisTurn && !st.mustCover) o.canDraw = false;
  if (o.canChallenge && wantsChallenge(st, level)) return { type: 'challenge' };
  if (st.aceSkip || st.lastPlay?.out) return { type: 'pass' };

  const pend = st.pending;
  if (pend) {
    if (pend.kind === 'eight') {
      const eights = hand.filter(c => c.r === '8');
      if (eights.length) return play(eights);
    }
    if (pend.kind === 'queen') {
      const six = hand.find(is6S);
      if (six) return play([six]);
    }
    return { type: 'accept' };
  }

  const legal = legalSingles(st, p, true);   // what is really playable (bluffs are decided separately)
  return smart ? smartPlay(st, p, level === 'expert', legal, o.canDraw) : simplePlay(st, p, level, legal, o.canDraw);
}

// ---------------------------------------------------------------- easy / normal

function simplePlay(st: GameState, p: number, level: BotLevel, legal: Card[], canDraw: boolean): Action {
  const hand = st.players[p].hand;
  if (!legal.length) {
    // rare, clumsy bluffs
    if (isBluff(st) && hand.length && rnd() < (level === 'easy' ? 0.04 : 0.08)) return play([hand[Math.floor(rnd() * hand.length)]]);
    return canDraw ? { type: 'draw' } : { type: 'pass' };
  }

  if (level === 'easy') return play([legal[Math.floor(rnd() * legal.length)]]);

  const nextP = st.players[nextIdx(st, p)];
  const oppMin = Math.min(...st.players.filter((_, i) => i !== p).map(pl => pl.hand.length));

  // 1) Can I go out right now with all remaining cards of one rank?
  for (const c of legal) {
    const same = hand.filter(h => h.r === c.r);
    if (same.length === hand.length && c.r !== '6') {
      const ordered = [c, ...same.filter(h => h.id !== c.id)];
      if (validatePlay(st, p, ordered.map(x => x.id), true) === null) return play(ordered);
    }
  }

  // 2) Q♠ + 6♠ combo, or Q♠ when it hurts
  const qs = hand.find(isQS);
  const s6 = hand.find(is6S);
  if (qs && s6 && validatePlay(st, p, [qs.id, s6.id], true) === null && (nextP.hand.length <= 3 || hand.length <= 4)) {
    return play([qs, s6]);
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
    return v + rnd() * 2;
  };

  const best = legal.slice().sort((a, b) => score(b) - score(a))[0];
  // add same-rank cards when it dumps points or stacks penalties
  const extras = hand.filter(h => h.id !== best.id && h.r === best.r && best.r !== 'J' && best.r !== '6');
  const group = [best, ...(['8', '7', 'A', '10', 'K', 'Q'].includes(best.r) ? extras : [])];
  if (validatePlay(st, p, group.map(c => c.id), true) === null) return play(group);
  return play([best]);
}

// ---------------------------------------------------------------- hard / expert

interface Ctx {
  expert: boolean;
  next: number;
  nextSize: number;
  oppMin: number;
  danger: boolean;          // someone is about to go out
  nextThreat: boolean;      // next player has the fewest cards / is the leader → worth attacking
  myScore: number;
  minOppScore: number;
  handPts: number;
  pool: Card[];             // unseen cards (expert counting)
}

function context(st: GameState, p: number, expert: boolean): Ctx {
  const next = nextIdx(st, p);
  const opps = st.players.map((pl, i) => ({ pl, i })).filter(x => x.i !== p);
  const oppMin = Math.min(...opps.map(x => x.pl.hand.length));
  const minOppScore = Math.min(...opps.map(x => x.pl.score));
  const nextSize = st.players[next].hand.length;
  return {
    expert, next, nextSize, oppMin,
    danger: oppMin <= 2,
    nextThreat: nextSize <= oppMin || nextSize <= 2 || st.players[next].score <= minOppScore,
    myScore: st.players[p].score,
    minOppScore,
    handPts: pts(st.players[p].hand),
    pool: expert ? unseen(st, p) : [],
  };
}

/** Rough chance the next player catches a bluff. Only public info (is it a bot?) is used. */
function catchProb(st: GameState, ctx: Ctx): number {
  const bot = st.players[ctx.next].bot;
  return ctx.expert ? (bot ? 0.85 : 0.75) : (bot ? 0.8 : 0.65);
}

function smartSuit(st: GameState, p: number, expert: boolean): Suit {
  const hand = st.players[p].hand;
  const pool = expert ? unseen(st, p) : [];
  const val: Record<Suit, number> = { S: 0, C: 0, H: 0, D: 0 };
  for (const c of hand) {
    if (c.r === 'J') continue;
    val[c.s] += (c.r === '9' ? 1 : 3) + cardPoints(c) / 10;
  }
  if (expert) for (const c of pool) val[c.s] -= 0.15;   // fewer of the suit outstanding → opponents follow less
  return SUITS.reduce((a, b) => (val[b] > val[a] ? b : a), SUITS[0]);
}

function kingsRun(st: GameState): number {
  let n = 0;
  for (let i = st.pile.length - 1; i >= 0 && st.pile[i].r === 'K'; i--) n++;
  return n;
}

function candidates(hand: Card[], legal: Card[]): Card[][] {
  const out: Card[][] = [];
  for (const c of legal) {
    out.push([c]);
    const others = hand.filter(h => h.id !== c.id && h.r === c.r);
    if (others.length && c.r !== 'J') {
      // finish on the suit we hold most of
      const rest = hand.filter(h => h.r !== c.r);
      const suitCount = (s: Suit) => rest.filter(h => h.s === s).length;
      others.sort((a, b) => suitCount(a.s) - suitCount(b.s));
      out.push([c, ...others]);
    }
  }
  return out;
}

function evalPlay(st: GameState, S: Card[], rest: Card[], ctx: Ctx): number {
  const r = S[0].r;
  const last = S[S.length - 1];
  const p = pts(S);
  const restPts = pts(rest);
  let v = S.length * 3;
  v += p * (ctx.danger ? 2.2 : 1);                            // dump high-point cards early, harder under danger

  // keep a follow-up for next turn
  const newSuit = r === 'J' ? bestSuit(rest) : last.s;
  const follow = rest.filter(c => c.s === newSuit || c.r === r || c.r === 'J' || c.r === '9').length;
  v += Math.min(follow, 3) * 2;

  switch (r) {
    case 'J':
      if (rest.length) v -= 35;                              // wild + finisher: save it
      break;
    case '9':
      if (rest.length > 1) v -= 8;                           // wild-ish: save it
      break;
    case '8': {
      let atk = ctx.nextThreat ? 12 : 3;
      if (ctx.expert && ctx.nextThreat) atk += 8 * (1 - pHolds(ctx.pool, c => c.r === '8', ctx.nextSize));
      v += atk * S.length;
      break;
    }
    case '7':
      v += 4 + (ctx.nextThreat ? 3 : 0);
      break;
    case 'A':
      v += 4 + (ctx.nextThreat ? 4 : 0);
      break;
    case 'Q':
      if (S.some(isQS)) {
        v += 8 + (ctx.nextThreat ? 14 : 0);
        if (ctx.expert) v += 10 * (1 - pHolds(ctx.pool, is6S, ctx.nextSize));
      }
      break;
    case 'K': {
      if (kingsRun(st) + S.length >= 4) v += (ctx.myScore - ctx.minOppScore) * 0.6;   // reset everyone to 0
      break;
    }
    case '6': {
      const cover = rest.some(c => c.r === 'J' || c.r === '9' || c.s === last.s || c.r === '6');
      if (!cover) { v -= 60; break; }
      v += 2;
      // keep the 6♠ as the answer to Q♠ while the queen is still out
      if (S.some(is6S) && !st.pile.some(isQS)) v -= 10;
      // two-step finish: 6 now, the rest covers it
      if (rest.length && rest.every(c => c.r === rest[0].r) && rest[0].r !== '6'
        && rest.some(c => c.r === 'J' || c.r === '9' || c.s === last.s)) v += 40;
      break;
    }
    default: break;
  }

  if (ctx.expert) {
    // tempo: aces that bring the turn straight back (e.g. one ace heads-up), unanswered 8s heads-up
    const n = st.players.length;
    if (rest.length) {
      let back = 0;
      if (r === 'A') back = (1 + S.length) % n === 0 ? 1 : 0;
      else if (r === '8' && n === 2) back = 1 - pHolds(ctx.pool, c => c.r === '8', ctx.nextSize);
      v += back * (15 + Math.min(follow, 3) * 1.5);
    }
    // plan a jack finish: leave only jacks → next turn they all go out and multiply everyone's points
    if (rest.length && rest.every(c => c.r === 'J')) v += 12;
    if (ctx.danger) {
      const target = RESET_AT - ctx.myScore;
      if (target > 0 && restPts === target) v += 30;               // someone goes out → we land on 125 → reset to 0
      else if (target > 0 && ctx.handPts === target && restPts !== target) v -= 20;
      if (ctx.myScore + restPts >= GAME_OVER_AT) v += p * 1.5;     // don't get caught over the line
    }
  }
  return v + rnd() * 1.5;
}

/** No real move: bluff (bluff mode) when the odds are right, else draw / pass. */
function noMove(st: GameState, p: number, ctx: Ctx, canDraw: boolean): Action {
  const hand = st.players[p].hand;
  if (isBluff(st) && hand.length) {
    const q = catchProb(st, ctx);
    const byRank = new Map<string, Card[]>();
    for (const c of hand) if (c.r !== '6') byRank.set(c.r, [...(byRank.get(c.r) ?? []), c]);
    let best: Card[] | null = null;
    let bestGain = -Infinity;
    for (const g of byRank.values()) {
      const out = g.length === hand.length;
      const gain = g.length + pts(g) / 10 + (out ? 8 : 0) + (['8', '7', 'A'].includes(g[0].r) || g.some(isQS) ? 1 : 0);
      if (gain > bestGain) { bestGain = gain; best = g; }
    }
    if (best) {
      const alt = st.mustCover ? -1 : st.drawnThisTurn ? 0 : -0.5;   // drawing until a cover / one draw / keep the hand
      const ev = (1 - q) * bestGain - q * 2;                 // caught → cards back + 2
      const margin = ctx.expert ? 0.3 : 0.8;
      if (ev > alt + margin && (ctx.expert || rnd() < 0.7)) return play(best);
    }
  }
  return canDraw ? { type: 'draw' } : { type: 'pass' };
}

function smartPlay(st: GameState, p: number, expert: boolean, legal: Card[], canDraw: boolean): Action {
  const hand = st.players[p].hand;
  const ctx = context(st, p, expert);
  if (!legal.length) return noMove(st, p, ctx, canDraw);

  // 1) go out now with all remaining cards of one rank (jacks multiply)
  for (const c of legal) {
    if (c.r === '6') continue;
    const same = hand.filter(h => h.r === c.r);
    if (same.length === hand.length) {
      const ordered = [c, ...same.filter(h => h.id !== c.id)];
      if (validatePlay(st, p, ordered.map(x => x.id), true) === null) return play(ordered);
    }
  }

  // 2) Q♠ + 6♠: the next player draws 6 and must cover
  const qs = hand.find(isQS);
  const s6 = hand.find(is6S);
  if (qs && s6 && validatePlay(st, p, [qs.id, s6.id], true) === null
    && (ctx.nextThreat || hand.length <= 3 || (expert && hand.length === 2))) {
    return play([qs, s6]);
  }

  // 3) score every real play
  let best: Card[] = [legal[0]];
  let bestV = -Infinity;
  for (const S of candidates(hand, legal)) {
    if (validatePlay(st, p, S.map(c => c.id), true) !== null) continue;
    const ids = new Set(S.map(c => c.id));
    const v = evalPlay(st, S, hand.filter(c => !ids.has(c.id)), ctx);
    if (v > bestV) { bestV = v; best = S; }
  }

  // 4) a 6 nobody can cover would mean drawing until we can: try the deck / keep the turn short instead
  if (best[0].r === '6' && bestV < -30 && !st.mustCover) {
    if (canDraw) return { type: 'draw' };
    if (st.drawnThisTurn) return { type: 'pass' };
  }

  // 5) save a lone jack: try the deck first
  if (best[0].r === 'J' && hand.length > 2 && !ctx.danger && !st.mustCover && !st.drawnThisTurn && canDraw) return { type: 'draw' };
  return play(best);
}
export { legalSingles };
