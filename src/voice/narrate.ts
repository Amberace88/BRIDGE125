// Game state → what the voice assistant says. Pure (no DOM, no speech) so it can be unit-tested in every language.
//
// Only public information is ever spoken: cards that hit the pile, penalties, card counts that the table shows
// anyway, and — for the coach tips — the player's own hand. Opponents' hands are never read.

import { type Card, type GameEvent, type GameState, legalSingles, options } from '../engine/engine';
import type { Lang } from '../i18n';
import { VOICE_PHRASES, YOU, YOU_WORD, cardsPhrase, joinNames, who, type Who } from '../i18n/voice';
import type { CoachLevel } from './prefs';

export type LineKind = 'low' | 'move' | 'tip' | 'big';
export interface Line { text: string; pri: number; kind: LineKind }

/** Priorities: low 1 · plain move 2 · tip 3 · consequence 4 · big moment 5. */
export const PRI = { low: 1, move: 2, tip: 3, hit: 4, big: 5 } as const;

/** Per-game memory so the coach doesn't repeat itself. */
export interface CoachMemo { turnTips: number; lastTip: string; bluffTip: boolean; round: number }
export const newMemo = (): CoachMemo => ({ turnTips: 0, lastTip: '', bluffTip: false, round: 0 });
/** The generic "your turn — match …" tip is given this many times per game; special situations are always explained. */
export const TURN_TIPS_PER_GAME = 5;

export interface NarrateCtx {
  me: number;
  lang: Lang;
  level: CoachLevel;
  /** Display name of a seat (the player's own seat is never asked). */
  name: (i: number) => string;
}

const end = (s: string) => (/[.!?…]$/.test(s) ? s : s + '.');
const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).map(p => end(p as string)).join(' ');

/** Lines for the events of one state transition (the move that produced `g`). */
export function narrateEvents(g: GameState, ctx: NarrateCtx): Line[] {
  if (ctx.level === 'off') return [];
  const P = VOICE_PHRASES[ctx.lang];
  const W = (i: number): Who => (i === ctx.me ? YOU : who(ctx.name(i)));
  const ev = (g.events ?? []) as GameEvent[];
  const out: Line[] = [];
  const play = ev.find((e): e is Extract<GameEvent, { t: 'play' }> => e.t === 'play');

  if (play) {
    const cards: Card[] = play.cards;
    const last = cards[cards.length - 1];
    let pri: number = PRI.move;
    const cons: string[] = [];
    for (const e of ev) {
      switch (e.t) {
        case 'queen': cons.push(P.queen(W(e.target))); pri = PRI.hit; break;
        case 'transfer': cons.push(P.transfer(W(e.target))); pri = PRI.hit; break;
        case 'eight': cons.push(P.eight(W(e.target), e.amount, e.amount > 2 * cards.length)); pri = PRI.hit; break;
        case 'seven': cons.push(P.seven(W(e.target), e.amount)); pri = PRI.hit; break;
        case 'skip': if (last.r === 'A') { cons.push(P.skip(W(e.p))); pri = PRI.hit; } break;
        case 'kings': cons.push(P.kings); pri = PRI.big; break;
        default: break;
      }
    }
    const head = cardsPhrase(ctx.lang, cards);
    out.push({ text: cons.length ? `${head}! ${join(...cons)}` : end(head), pri, kind: pri >= PRI.big ? 'big' : 'move' });
    // an opponent down to one card is worth a heads-up (the table shows the count anyway)
    const hand = g.players[play.p]?.hand.length ?? 0;
    if (play.p !== ctx.me && hand === 1 && g.phase === 'play') out.push({ text: end(P.lastCard(W(play.p))), pri: PRI.low, kind: 'low' });
  }

  for (const e of ev) {
    const le = e as GameEvent;
    switch (le.t) {
      case 'suit': if (le.p !== ctx.me) out.push({ text: end(P.called(le.s)), pri: PRI.hit, kind: 'move' }); break;
      case 'draw': if (!le.forced && le.p !== ctx.me && !play) out.push({ text: end(P.draws(W(le.p))), pri: PRI.low, kind: 'low' }); break;
      case 'reshuffle': out.push({ text: end(P.reshuffle), pri: PRI.low, kind: 'low' }); break;
      case 'bluffCaught': out.push({ text: P.bluffCaught(W(le.p)), pri: PRI.big, kind: 'big' }); break;
      case 'bluffWrong': out.push({ text: P.bluffWrong(W(le.p)), pri: PRI.big, kind: 'big' }); break;
      default: break;
    }
  }

  const re = ev.find((e): e is Extract<GameEvent, { t: 'roundEnd' }> => e.t === 'roundEnd');
  if (re) {
    const r = g.lastResult;
    out.push({ text: join(P.wentOut(W(re.winner)), re.mult > 1 && P.mult(re.mult)), pri: PRI.big, kind: 'big' });
    for (const e of ev) if (e.t === 'reset125') out.push({ text: P.reset(W(e.p)), pri: PRI.big, kind: 'big' });
    const mine = r?.rows.find(x => x.p === ctx.me);
    if (mine && !mine.reset && mine.added > 0) out.push({ text: end(P.add(mine.added)), pri: PRI.big, kind: 'big' });
    const go = ev.find((e): e is Extract<GameEvent, { t: 'gameOver' }> => e.t === 'gameOver');
    if (go?.winners.length) {
      const text = go.winners.length === 1 ? P.win(W(go.winners[0]))
        : end(P.tie(joinNames(ctx.lang, go.winners.map(i => (i === ctx.me ? YOU_WORD[ctx.lang] : ctx.name(i))))));
      out.push({ text, pri: PRI.big, kind: 'big' });
    }
  }
  return out;
}

/** Coach tip for the player whose turn it is (only at the "Moves + tips" level). */
export function coachTip(g: GameState, ctx: NarrateCtx, memo: CoachMemo): Line | null {
  if (ctx.level !== 'tips') return null;
  const me = ctx.me;
  if (g.current !== me || (g.phase !== 'play' && g.phase !== 'chooseSuit')) return null;
  if (memo.round !== g.round) { memo.round = g.round; memo.lastTip = ''; }
  const P = VOICE_PHRASES[ctx.lang];
  let text: string | null = null;
  let generic = false;
  if (g.phase === 'chooseSuit') text = P.chooseSuit;
  else if (g.aceSkip || g.lastPlay?.out) text = P.skipped;
  else if (g.pending?.kind === 'eight') text = P.answer8(g.pending.amount);
  else if (g.pending?.kind === 'queen') text = P.answerQ;
  else if (g.pending?.kind === 'queen6') text = P.takeQ6;
  else if (g.pending?.kind === 'seven') text = P.take7(g.pending.amount);
  else {
    const real = legalSingles(g, me, true);
    const o = options(g, me);
    if (g.mustCover) text = real.length ? P.cover : P.noMatch;
    else if (!real.length) text = o.canPass ? P.passNow : P.noMatch;
    else if (g.drawnThisTurn) text = P.playOrPass;
    else {
      const top = g.pile[g.pile.length - 1];
      text = P.turn(g.activeSuit, top && top.r !== 'J' ? top.r : null);
      generic = true;
    }
  }
  // bluff mode: mention the call-out once per game
  const o2 = options(g, me) as ReturnType<typeof options> & { canChallenge?: boolean };
  if (o2.canChallenge && !memo.bluffTip) { memo.bluffTip = true; text = text ? `${end(text)} ${P.canBluff}` : P.canBluff; generic = false; }
  if (!text) return null;
  if (generic) { if (memo.turnTips >= TURN_TIPS_PER_GAME) return null; memo.turnTips++; }
  text = end(text);
  if (text === memo.lastTip) return null;
  memo.lastTip = text;
  return { text, pri: PRI.tip, kind: 'tip' };
}

/** Phrase used by the settings "Hear it" button. */
export function samplePhrase(lang: Lang, name: string): string {
  const P = VOICE_PHRASES[lang];
  return `${P.card({ id: 'QS', r: 'Q', s: 'S' })}! ${end(P.queen(who(name)))}`;
}
