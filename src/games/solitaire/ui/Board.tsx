import { useReducedMotion } from 'motion/react';
import { memo, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Lang } from '../../../i18n';
import { SUIT_GLYPH, SUITS, type SCard } from '../engine/cards';
import { kCard, kCanDraw } from '../engine/klondike';
import type { AnyMove, AnyState } from '../engine/game';
import { SolCard, type Registry } from './SolCard';
import { klondikeLayout, pileKey, spiderLayout, type Layout, type PileRef, type Slot } from './layout';
import { dragGroup, dropTargets, moveOnto } from './adapter';

export interface HintMark { cards: number[]; to: string | null; key: number }

interface Props {
  st: AnyState;
  W: number;
  H: number;
  lang: Lang;
  /** changes with every new deal: the cards are dealt in again */
  dealKey: string;
  /** play the deal-in animation for this dealKey */
  dealIn: boolean;
  hint: HintMark | null;
  shake: { id: number; key: number } | null;
  /** a drag ended on a legal pile */
  onDrop: (m: AnyMove) => void;
  onTap: (pile: PileRef, index: number) => void;
  onDoubleTap: (pile: PileRef, index: number) => void;
  onFeltDoubleTap: () => void;
  onDragStart: () => void;
  hideCards?: boolean;
}

interface Press {
  id: number; x0: number; y0: number; t0: number;
  ox: number; oy: number;
  cid: number | null; slot: string | null;
  pile: PileRef | null; index: number;
  group: number[] | null;
  targets: PileRef[];
  dragging: boolean;
  lastX: number; lastT: number; vx: number;
  target: string | null;
}

const TAP_MS = 380, TAP_PX = 7;

export const Board = memo(function Board(p: Props) {
  const { st, W, H, lang, dealKey, dealIn, hint, shake } = p;
  const reduce = !!useReducedMotion();
  const layout: Layout = useMemo(() => (st.game === 'klondike' ? klondikeLayout(st, W, H) : spiderLayout(st, W, H)), [st, W, H]);
  const cards: SCard[] = useMemo(() => (st.game === 'klondike' ? Array.from({ length: 52 }, (_, i) => kCard(i)) : st.cards), [st.game, (st as { cards?: SCard[] }).cards]); // eslint-disable-line react-hooks/exhaustive-deps
  const reg = useRef<Registry>(new Map()).current;
  const root = useRef<HTMLDivElement>(null);
  const press = useRef<Press | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number; cid: number | null; felt: boolean } | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [dragKeys, setDragKeys] = useState<string | null>(null);

  const slotByKey = useMemo(() => new Map(layout.slots.map(s => [s.key, s])), [layout]);

  // deal order: tableau row by row (the way a dealer deals), stock last
  const enterDelay = useMemo(() => {
    const m = new Map<number, number>();
    if (!dealIn) return m;
    const order: number[] = [];
    const cols = st.tab.map(t => t.c);
    const rows = Math.max(...cols.map(c => c.length));
    for (let r = 0; r < rows; r++) for (const c of cols) if (r < c.length) order.push(c[r]);
    const step = order.length > 40 ? 0.018 : 0.034;
    order.forEach((id, k) => m.set(id, 0.15 + k * step));
    return m;
  }, [dealKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const local = (e: { clientX: number; clientY: number }) => {
    const r = root.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const pickTarget = (pr: Press, hx: number, hy: number): Slot | null => {
    const { cw, ch } = layout;
    let best: Slot | null = null, bestScore = -Infinity;
    for (const t of pr.targets) {
      const s = slotByKey.get(pileKey(t));
      if (!s) continue;
      // overlap of the held card with the pile's drop zone, plus closeness to where it would land
      const ox = Math.max(0, Math.min(hx + cw, s.zx + s.zw) - Math.max(hx, s.zx));
      const oy = Math.max(0, Math.min(hy + ch, s.zy + s.zh) - Math.max(hy, s.zy));
      const overlap = (ox * oy) / (cw * ch);
      const d = Math.hypot(hx - s.ax, (hy - s.ay) * 0.7) / cw;
      const score = overlap * 2 - d * 0.6;
      if ((overlap > 0.12 || d < 0.9) && score > bestScore) { bestScore = score; best = s; }
    }
    return best;
  };

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (press.current) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-cid],[data-slot]');
    const cid = el?.dataset.cid != null ? Number(el.dataset.cid) : null;
    const slot = el?.dataset.slot ?? null;
    const w = cid != null ? layout.where.get(cid) ?? null : null;
    const pt = local(e);
    const pr: Press = {
      id: e.pointerId, x0: pt.x, y0: pt.y, t0: performance.now(), ox: 0, oy: 0, cid, slot,
      pile: w?.pile ?? (slot ? layout.slots.find(s => s.key === slot)?.pile ?? null : null), index: w?.index ?? -1,
      group: null, targets: [], dragging: false, lastX: pt.x, lastT: performance.now(), vx: 0, target: null,
    };
    if (cid != null && w) {
      pr.group = dragGroup(st, w.pile, w.index);
      if (pr.group) pr.targets = dropTargets(st, w.pile, w.index);
    }
    press.current = pr;
    try { root.current!.setPointerCapture(e.pointerId); } catch { /* */ }
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const pr = press.current;
    if (!pr || pr.id !== e.pointerId) return;
    const pt = local(e);
    const dx = pt.x - pr.x0, dy = pt.y - pr.y0;
    if (!pr.dragging) {
      if (!pr.group || Math.hypot(dx, dy) < TAP_PX) return;
      pr.dragging = true;
      pr.group.forEach((id, k) => {
        const h = reg.get(id);
        if (!h) return;
        h.stop(); h.dragging = true;
        h.z.set(1000 + k);
        h.lift.set(1);
      });
      setDragKeys(pr.pile ? pileKey(pr.pile) : null);
      p.onDragStart();
    }
    const now = performance.now();
    const dt = Math.max(1, now - pr.lastT);
    pr.vx = pr.vx * 0.7 + ((pt.x - pr.lastX) / dt) * 0.3;
    pr.lastX = pt.x; pr.lastT = now;
    const head = reg.get(pr.group![0]);
    if (!head) return;
    const hx = head.pose.x + dx, hy = head.pose.y + dy;
    const t = pickTarget(pr, hx, hy);
    const key = t?.key ?? null;
    if (key !== pr.target) { pr.target = key; setDropKey(key); }
    // magnetic pull toward the pile it would land on
    let mx = 0, my = 0;
    if (t) {
      const d = Math.hypot(t.ax - hx, t.ay - hy);
      const k = Math.max(0, 1 - d / (layout.cw * 1.4)) * 0.32;
      mx = (t.ax - hx) * k; my = (t.ay - hy) * k;
    }
    const tiltTarget = Math.max(-9, Math.min(9, pr.vx * 6));
    pr.group!.forEach(id => {
      const h = reg.get(id);
      if (!h) return;
      h.x.set(h.pose.x + dx + mx);
      h.y.set(h.pose.y + dy + my);
      h.tilt.set(h.tilt.get() * 0.75 + tiltTarget * 0.25);
    });
  };

  const endDrag = (pr: Press, commit: boolean) => {
    const group = pr.group ?? [];
    let move: AnyMove | null = null;
    if (commit && pr.target && pr.pile) {
      const s = slotByKey.get(pr.target);
      if (s) move = moveOnto(st, pr.pile, pr.index, s.pile);
    }
    group.forEach(id => {
      const h = reg.get(id);
      if (!h) return;
      h.dragging = false;
      if (move) h.dropped = true;
      else h.settle();
    });
    setDropKey(null); setDragKeys(null);
    if (move) p.onDrop(move);
  };

  const onPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    const pr = press.current;
    if (!pr || pr.id !== e.pointerId) return;
    press.current = null;
    if (pr.dragging) { endDrag(pr, true); return; }
    const pt = local(e);
    const now = performance.now();
    if (now - pr.t0 > TAP_MS * 2 || Math.hypot(pt.x - pr.x0, pt.y - pr.y0) > TAP_PX * 2) return;
    const lt = lastTap.current;
    const isDouble = !!lt && now - lt.t < 330 && Math.hypot(pt.x - lt.x, pt.y - lt.y) < 30;
    if (pr.pile && (pr.cid != null || pr.slot)) {
      const sameCard = isDouble && lt!.cid === pr.cid && pr.cid != null;
      lastTap.current = { t: now, x: pt.x, y: pt.y, cid: pr.cid, felt: false };
      if (sameCard) { p.onDoubleTap(pr.pile, pr.index); lastTap.current = null; return; }
      // a quick second tap right after a tap-move lands on the card that took its place: ignore it
      if (isDouble && !lt!.felt && pr.pile.k !== 'stock') return;
      p.onTap(pr.pile, pr.index);
      return;
    }
    if (isDouble && lt!.felt) { lastTap.current = null; p.onFeltDoubleTap(); return; }
    lastTap.current = { t: now, x: pt.x, y: pt.y, cid: null, felt: true };
  };

  const onPointerCancel = (e: RPointerEvent<HTMLDivElement>) => {
    const pr = press.current;
    if (!pr || pr.id !== e.pointerId) return;
    press.current = null;
    if (pr.dragging) endDrag(pr, false);
  };

  const hintCards = useMemo(() => new Set(hint?.cards ?? []), [hint]);
  const { cw, ch } = layout;
  const stockEmpty = st.stock.length === 0;
  const canRecycle = st.game === 'klondike' && kCanDraw(st);

  return (
    <div ref={root} className={`sol-board ${dragKeys ? 'dragging' : ''}`} style={{ width: W, height: H, ['--cw' as string]: `${cw}px` }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
      onContextMenu={e => e.preventDefault()}>
      {layout.slots.map(s => (
        <div key={s.key} data-slot={s.key}
          className={`sol-slot m-${s.mark ?? 'none'} ${dropKey === s.key ? 'drop' : ''} ${hint?.to === s.key ? 'hinted' : ''}`}
          style={{ transform: `translate3d(${s.x}px, ${s.y}px, 0)`, width: cw, height: ch }}>
          {s.mark === 'suit' && s.suit != null && <span className={`sg ${s.suit % 2 ? 'red' : ''}`}>{SUIT_GLYPH[SUITS[s.suit]]}</span>}
          {s.mark === 'king' && <span className="kg">K</span>}
          {s.mark === 'stock' && stockEmpty && (
            st.game === 'klondike'
              ? <svg viewBox="0 0 24 24" className={`rc ${canRecycle ? '' : 'off'}`} aria-hidden="true">{canRecycle
                ? <path d="M4 12a8 8 0 0 1 13.7-5.6M20 12a8 8 0 0 1-13.7 5.6M17.5 3v3.6h-3.6M6.5 21v-3.6h3.6" />
                : <path d="M7 7l10 10M17 7L7 17" />}</svg>
              : <span className="kg">✓</span>
          )}
        </div>
      ))}
      {dropKey && slotByKey.get(dropKey) && (() => {
        const t = slotByKey.get(dropKey)!;
        return <div className="sol-ghost" style={{ transform: `translate3d(${t.ax}px, ${t.ay}px, 0)`, width: cw, height: ch }} />;
      })()}
      <div className={`sol-cards ${p.hideCards ? 'gone' : ''}`}>
        {cards.map(c => {
          const pose = layout.poses.get(c.id);
          if (!pose) return null;
          const d = enterDelay.get(c.id);
          return (
            <SolCard key={`${dealKey}:${c.id}`} card={c} pose={pose} cw={cw} ch={ch} lang={lang} reg={reg} reduce={reduce}
              enter={d != null ? { x: layout.stockX, y: layout.stockY, delay: d } : undefined}
              glow={hintCards.has(c.id)} shake={shake?.id === c.id ? shake.key : undefined} />
          );
        })}
      </div>
    </div>
  );
});
