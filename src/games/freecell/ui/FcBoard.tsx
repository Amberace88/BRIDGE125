import { useReducedMotion } from 'motion/react';
import { memo, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Lang } from '../../../i18n';
import { SUIT_GLYPH, SUITS } from '../../solitaire/engine/cards';
import { SolCard, type Registry } from '../../solitaire/ui/SolCard';
import { fcCard, legal, maxMovable, runLength, stacks, type FcMove, type FcState, type Loc } from '../engine/rules';
import { fcLayout, locKey, type FcLayout, type FcSlot } from './layout';

export interface HintMark { cards: number[]; to: string | null; key: number }

interface Props {
  st: FcState;
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
  onDrop: (m: FcMove) => void;
  /** a drag ended on a cascade the run fits by rank, but the run is longer than a supermove allows */
  onTooMany: (limit: number) => void;
  onTap: (loc: Loc, index: number) => void;
  onDoubleTap: (loc: Loc, index: number) => void;
  onDragStart: () => void;
  hideCards?: boolean;
}

interface Target { key: string; loc: Loc; ok: boolean }

interface Press {
  id: number; x0: number; y0: number; t0: number;
  cid: number | null;
  loc: Loc | null; index: number;
  group: number[] | null;
  targets: Target[];
  limit: number;
  dragging: boolean;
  lastX: number; lastT: number; vx: number;
  target: Target | null;
}

const TAP_MS = 380, TAP_PX = 7;
const ALL_CARDS = Array.from({ length: 52 }, (_, i) => fcCard(i));

/** What can be dragged from a card: the run on top of it (a cascade) or the card itself (a free cell). */
function dragGroup(s: FcState, loc: Loc, index: number): number[] | null {
  if (loc.k === 'cell') { const c = s.cells[loc.i]; return c == null ? null : [c]; }
  if (loc.k !== 'col') return null;
  const col = s.cols[loc.i];
  if (index < col.length - runLength(col)) return null;
  return col.slice(index);
}

/** Every pile the group could land on; `ok: false` = it fits by rank but is too long for a supermove right now. */
function targetsFor(s: FcState, loc: Loc, n: number, head: number): Target[] {
  const out: Target[] = [];
  const add = (to: Loc, ok: boolean) => out.push({ key: locKey(to), loc: to, ok });
  for (let i = 0; i < 4; i++) { const to: Loc = { k: 'found', i }; if (legal(s, { from: loc, to, n })) add(to, true); }
  for (let i = 0; i < 4; i++) { const to: Loc = { k: 'cell', i }; if (legal(s, { from: loc, to, n })) add(to, true); }
  for (let i = 0; i < 8; i++) {
    const to: Loc = { k: 'col', i };
    if (loc.k === 'col' && loc.i === i) continue;
    if (legal(s, { from: loc, to, n })) { add(to, true); continue; }
    const dst = s.cols[i];
    const fits = dst.length ? stacks(dst[dst.length - 1], head) : true;
    if (fits && n > 1) add(to, false);
  }
  return out;
}

export const FcBoard = memo(function FcBoard(p: Props) {
  const { st, W, H, lang, dealKey, dealIn, hint, shake } = p;
  const reduce = !!useReducedMotion();
  const layout: FcLayout = useMemo(() => fcLayout(st, W, H), [st, W, H]);
  const reg = useRef<Registry>(new Map()).current;
  const root = useRef<HTMLDivElement>(null);
  const press = useRef<Press | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number; cid: number | null } | null>(null);
  const [drop, setDrop] = useState<Target | null>(null);
  const [dragging, setDragging] = useState(false);

  const slotByKey = useMemo(() => new Map(layout.slots.map(s => [s.key, s])), [layout]);

  // the deal: card by card along the row, the way Windows dealt it (card k → cascade k mod 8)
  const enterDelay = useMemo(() => {
    const m = new Map<number, number>();
    if (!dealIn) return m;
    const rows = Math.max(...st.cols.map(c => c.length));
    let k = 0;
    for (let r = 0; r < rows; r++) for (const c of st.cols) if (r < c.length) m.set(c[r], 0.12 + (k++) * 0.021);
    return m;
  }, [dealKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const local = (e: { clientX: number; clientY: number }) => {
    const r = root.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const pickTarget = (pr: Press, hx: number, hy: number): Target | null => {
    const { cw, ch } = layout;
    let best: Target | null = null, bestScore = -Infinity;
    for (const t of pr.targets) {
      const s = slotByKey.get(t.key);
      if (!s) continue;
      const ox = Math.max(0, Math.min(hx + cw, s.zx + s.zw) - Math.max(hx, s.zx));
      const oy = Math.max(0, Math.min(hy + ch, s.zy + s.zh) - Math.max(hy, s.zy));
      const overlap = (ox * oy) / (cw * ch);
      const d = Math.hypot(hx - s.ax, (hy - s.ay) * 0.7) / cw;
      const score = overlap * 2 - d * 0.6 + (t.ok ? 0.05 : 0);
      if ((overlap > 0.12 || d < 0.9) && score > bestScore) { bestScore = score; best = t; }
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
      id: e.pointerId, x0: pt.x, y0: pt.y, t0: performance.now(), cid,
      loc: w?.loc ?? (slot ? slotByKey.get(slot)?.loc ?? null : null), index: w?.index ?? -1,
      group: null, targets: [], limit: 1, dragging: false, lastX: pt.x, lastT: performance.now(), vx: 0, target: null,
    };
    if (cid != null && w) {
      pr.group = dragGroup(st, w.loc, w.index);
      if (pr.group) {
        pr.targets = targetsFor(st, w.loc, pr.group.length, pr.group[0]);
        pr.limit = maxMovable(st, false);
      }
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
      setDragging(true);
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
    if (t?.key !== pr.target?.key) { pr.target = t; setDrop(t); }
    // magnetic pull toward the pile it would land on (only where it may land)
    let mx = 0, my = 0;
    const s: FcSlot | undefined = t?.ok ? slotByKey.get(t.key) : undefined;
    if (s) {
      const d = Math.hypot(s.ax - hx, s.ay - hy);
      const k = Math.max(0, 1 - d / (layout.cw * 1.4)) * 0.32;
      mx = (s.ax - hx) * k; my = (s.ay - hy) * k;
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
    let move: FcMove | null = null;
    const t = pr.target;
    if (commit && t?.ok && pr.loc) {
      const m: FcMove = { from: pr.loc, to: t.loc, n: group.length };
      if (legal(st, m)) move = m;
    }
    group.forEach(id => {
      const h = reg.get(id);
      if (!h) return;
      h.dragging = false;
      if (move) h.dropped = true;
      else h.settle();
    });
    setDrop(null); setDragging(false);
    if (move) p.onDrop(move);
    else if (commit && t && !t.ok) p.onTooMany(t.loc.k === 'col' && !st.cols[t.loc.i].length ? maxMovable(st, true) : pr.limit);
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
    if (pr.loc && pr.cid != null) {
      const same = isDouble && lt!.cid === pr.cid;
      lastTap.current = { t: now, x: pt.x, y: pt.y, cid: pr.cid };
      if (same) { p.onDoubleTap(pr.loc, pr.index); lastTap.current = null; return; }
      // a quick second tap right after a tap-move lands on the card that took its place: ignore it
      if (isDouble) return;
      p.onTap(pr.loc, pr.index);
      return;
    }
    lastTap.current = null;
  };

  const onPointerCancel = (e: RPointerEvent<HTMLDivElement>) => {
    const pr = press.current;
    if (!pr || pr.id !== e.pointerId) return;
    press.current = null;
    if (pr.dragging) endDrag(pr, false);
  };

  const hintCards = useMemo(() => new Set(hint?.cards ?? []), [hint]);
  const { cw, ch } = layout;
  const ghost = drop?.ok ? slotByKey.get(drop.key) : undefined;

  return (
    <div ref={root} className={`sol-board fc-board ${dragging ? 'dragging' : ''}`} style={{ width: W, height: H, ['--cw' as string]: `${cw}px` }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
      onContextMenu={e => e.preventDefault()}>
      <i className="fc-divider" aria-hidden="true" style={{ transform: `translate3d(${layout.midX}px, ${layout.topY + ch * 0.12}px, 0)`, height: ch * 0.76 }} />
      {layout.slots.map(s => (
        <div key={s.key} data-slot={s.key}
          className={`sol-slot fc-${s.mark} ${s.mark === 'suit' ? 'm-suit' : s.mark === 'col' ? 'm-king' : ''} ${drop?.key === s.key ? (drop.ok ? 'drop' : 'nodrop') : ''} ${hint?.to === s.key ? 'hinted' : ''}`}
          style={{ transform: `translate3d(${s.x}px, ${s.y}px, 0)`, width: cw, height: ch }}>
          {s.mark === 'suit' && s.suit != null && <span className={`sg ${s.suit % 2 ? 'red' : ''}`}>{SUIT_GLYPH[SUITS[s.suit]]}</span>}
          {s.mark === 'cell' && <span className="fc-cellmark" />}
        </div>
      ))}
      {ghost && <div className="sol-ghost" style={{ transform: `translate3d(${ghost.ax}px, ${ghost.ay}px, 0)`, width: cw, height: ch }} />}
      <div className={`sol-cards ${p.hideCards ? 'gone' : ''}`}>
        {ALL_CARDS.map(c => {
          const pose = layout.poses.get(c.id);
          if (!pose) return null;
          const d = enterDelay.get(c.id);
          return (
            <SolCard key={`${dealKey}:${c.id}`} card={c} pose={pose} cw={cw} ch={ch} lang={lang} reg={reg} reduce={reduce}
              enter={d != null ? { x: layout.deckX, y: layout.deckY, delay: d } : undefined}
              glow={hintCards.has(c.id)} shake={shake?.id === c.id ? shake.key : undefined} />
          );
        })}
      </div>
    </div>
  );
});
