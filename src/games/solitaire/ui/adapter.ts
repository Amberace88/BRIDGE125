// Board ↔ rules: which cards a drag picks up, where they may go, what a tap does. Pure (no DOM).
import { kBestMove, kLegal, kToFoundation, type KMove, type KPile, type KState } from '../engine/klondike';
import { spBestMove, spLegal, spRunLength, type SpMove, type SpState } from '../engine/spider';
import type { AnyMove, AnyState } from '../engine/game';
import type { PileRef } from './layout';

const toK = (p: PileRef): KPile | null => (p.k === 'stock' ? null : p.k === 'waste' ? { k: 'waste' } : { k: p.k, i: p.i });

export function pileCards(st: AnyState, p: PileRef): number[] {
  if (st.game === 'klondike') {
    if (p.k === 'stock') return st.stock;
    if (p.k === 'waste') return st.waste;
    return p.k === 'found' ? st.found[p.i] : st.tab[p.i].c;
  }
  if (p.k === 'stock') return st.stock;
  if (p.k === 'found') return st.done[p.i] ?? [];
  if (p.k === 'tab') return st.tab[p.i].c;
  return [];
}

/** The cards that move together when the card at `index` of `pile` is picked up (null: it cannot be picked up). */
export function dragGroup(st: AnyState, pile: PileRef, index: number): number[] | null {
  const cards = pileCards(st, pile);
  if (index < 0 || index >= cards.length) return null;
  if (st.game === 'klondike') {
    if (pile.k === 'stock') return null;
    if (pile.k === 'waste' || pile.k === 'found') return index === cards.length - 1 ? [cards[index]] : null;
    return index >= st.tab[pile.i].d ? cards.slice(index) : null;
  }
  if (pile.k !== 'tab') return null;
  const run = spRunLength(st, pile.i);
  return index >= cards.length - run ? cards.slice(index) : null;
}

/** The move that puts the group starting at `index` of `from` onto `to`, if legal. */
export function moveOnto(st: AnyState, from: PileRef, index: number, to: PileRef): AnyMove | null {
  const n = pileCards(st, from).length - index;
  if (st.game === 'klondike') {
    const f = toK(from), t = toK(to);
    if (!f || !t) return null;
    const m: KMove = { t: 'move', from: f, to: t, n };
    return kLegal(st, m) ? m : null;
  }
  if (from.k !== 'tab' || to.k !== 'tab') return null;
  const m: SpMove = { t: 'move', from: from.i, to: to.i, n };
  return spLegal(st, m) ? m : null;
}

/** Every pile the group may be dropped on. */
export function dropTargets(st: AnyState, from: PileRef, index: number): PileRef[] {
  const out: PileRef[] = [];
  const all: PileRef[] = st.game === 'klondike'
    ? [...[0, 1, 2, 3].map(i => ({ k: 'found', i }) as PileRef), ...st.tab.map((_, i) => ({ k: 'tab', i }) as PileRef)]
    : st.tab.map((_, i) => ({ k: 'tab', i }) as PileRef);
  for (const to of all) if (moveOnto(st, from, index, to)) out.push(to);
  return out;
}

/** Tap on a card: the best move for it (foundation first for a top card), or null. */
export function tapMove(st: AnyState, pile: PileRef, index: number): AnyMove | null {
  if (pile.k === 'stock') return st.game === 'klondike' ? { t: 'draw' } : { t: 'deal' };
  if (!dragGroup(st, pile, index)) return null;
  if (st.game === 'klondike') {
    const f = toK(pile);
    return f ? kBestMove(st, f, index) : null;
  }
  return pile.k === 'tab' ? spBestMove(st as SpState, pile.i, index) : null;
}

/** Double tap on a card: straight to its foundation (Klondike). */
export function homeMove(st: AnyState, pile: PileRef): AnyMove | null {
  if (st.game !== 'klondike') return null;
  const f = toK(pile);
  return f ? kToFoundation(st as KState, f) : null;
}

/** Piles a move touches: [from, to] for highlighting hints. */
export function movePiles(m: AnyMove, st: AnyState): { from: PileRef | null; to: PileRef | null; n: number } {
  if (m.t === 'draw' || m.t === 'deal') return { from: { k: 'stock' }, to: st.game === 'klondike' ? { k: 'waste' } : null, n: 0 };
  if (st.game === 'klondike') {
    const km = m as Extract<KMove, { t: 'move' }>;
    const conv = (p: KPile): PileRef => (p.k === 'waste' ? { k: 'waste' } : { k: p.k, i: p.i });
    return { from: conv(km.from), to: conv(km.to), n: km.n };
  }
  const sm = m as Extract<SpMove, { t: 'move' }>;
  return { from: { k: 'tab', i: sm.from }, to: { k: 'tab', i: sm.to }, n: sm.n };
}
