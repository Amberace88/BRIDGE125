import { motion } from 'motion/react';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { geoOf, isFree } from './core/board';
import type { LayoutId } from './core/layouts';
import { Face, faceName, type Skin } from './TileArt';

// The board: real 3D-looking tile stacks (ivory face, bone and brass edges, layers offset up-left), scaled to fit any
// screen, with pinch / wheel zoom and drag-to-pan. Tiles are plain divs moved by transforms (no layout work per
// frame); a matched pair flies together in an overlay and bursts into gold dust.

export interface Fly { k: number; a: number; b: number; fa: number; fb: number; combo: number; points: number; last: boolean }

interface Props {
  layout: LayoutId;
  faces: number[];
  skin: Skin;
  dim: boolean;
  sel: number;
  hint: [number, number] | null;
  shake: { i: number; k: number } | null;
  flies: Fly[];
  /** bump to replay the deal-in animation (new deal, shuffle) */
  dealKey: string;
  paused: boolean;
  zoomReq: number;
  onTile: (i: number) => void;
  onFlyDone: (k: number) => void;
  onZoom?: (zoomed: boolean) => void;
}

const RATIO = 1.3;     // tile height / width
const DEPTH = 0.13;    // layer offset (and edge thickness) / width
const MAX_TW = 76;
const ZOOM_MAX = 2.6;

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setSize(s => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export const Board = memo(function Board({ layout, faces, skin, dim, sel, hint, shake, flies, dealKey, paused, zoomReq, onTile, onFlyDone, onZoom }: Props) {
  const geo = geoOf(layout);
  const [wrap, size] = useSize<HTMLDivElement>();

  // fit: the whole board (plus the stack offsets and the bottom-right edges) inside the box
  const fit = useMemo(() => {
    const cols = geo.w / 2, rows = geo.h / 2, extra = (geo.zMax + 1) * DEPTH;
    const pad = 8;
    const tw = Math.max(14, Math.min(MAX_TW, (size.w - pad * 2) / (cols + extra), (size.h - pad * 2) / (rows * RATIO + extra)));
    const th = tw * RATIO, d = tw * DEPTH;
    return { tw, th, d, W: cols * tw + (geo.zMax + 1) * d, H: rows * th + (geo.zMax + 1) * d };
  }, [geo, size.w, size.h]);

  const at = useCallback((i: number) => {
    const p = geo.pos[i];
    return { left: (p.x / 2) * fit.tw + (geo.zMax - p.z) * fit.d, top: (p.y / 2) * fit.th + (geo.zMax - p.z) * fit.d };
  }, [geo, fit]);

  // paint order: lower layers first, then by diagonal so every tile covers its neighbours' right / bottom edges
  const order = useMemo(() => geo.pos.map((_, i) => i).sort((a, b) => {
    const p = geo.pos[a], q = geo.pos[b];
    return p.z - q.z || p.x + p.y - (q.x + q.y) || p.y - q.y;
  }), [geo]);

  /* ------------------------------------------------------------ zoom + pan */
  const [view, setView] = useState({ z: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [dragging, setDragging] = useState(false);
  const clampView = useCallback((v: { z: number; x: number; y: number }) => {
    const z = Math.min(ZOOM_MAX, Math.max(1, v.z));
    const mx = Math.max(0, (fit.W * z - size.w) / 2 + 24), my = Math.max(0, (fit.H * z - size.h) / 2 + 24);
    return { z, x: z === 1 ? 0 : Math.min(mx, Math.max(-mx, v.x)), y: z === 1 ? 0 : Math.min(my, Math.max(-my, v.y)) };
  }, [fit.W, fit.H, size.w, size.h]);
  useEffect(() => { setView(v => clampView(v)); }, [clampView]);
  useEffect(() => { onZoom?.(view.z > 1.01); }, [view.z > 1.01]); // eslint-disable-line react-hooks/exhaustive-deps
  // the zoom button: in to ×1.8 (around the centre), or back out
  const firstReq = useRef(zoomReq);
  useEffect(() => {
    if (zoomReq === firstReq.current) return;
    setView(v => clampView(v.z > 1.01 ? { z: 1, x: 0, y: 0 } : { z: 1.8, x: 0, y: 0 }));
  }, [zoomReq, clampView]);

  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; z: number; x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const suppress = useRef(false);

  const onDown = (e: React.PointerEvent) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const ps = [...ptrs.current.values()];
    const cx = ps.reduce((s, p) => s + p.x, 0) / ps.length, cy = ps.reduce((s, p) => s + p.y, 0) / ps.length;
    const dist = ps.length > 1 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0;
    gesture.current = { dist, z: viewRef.current.z, x: viewRef.current.x, y: viewRef.current.y, cx, cy, moved: gesture.current?.moved ?? false };
    if (ps.length === 1) { suppress.current = false; gesture.current.moved = false; }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const ps = [...ptrs.current.values()];
    const cx = ps.reduce((s, p) => s + p.x, 0) / ps.length, cy = ps.reduce((s, p) => s + p.y, 0) / ps.length;
    if (ps.length > 1 && g.dist > 0) {
      const dist = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
      const z = Math.min(ZOOM_MAX, Math.max(1, g.z * (dist / g.dist)));
      g.moved = true; suppress.current = true;
      setDragging(true);
      setView(clampView({ z, x: g.x * (z / g.z) + (cx - g.cx), y: g.y * (z / g.z) + (cy - g.cy) }));
    } else if (viewRef.current.z > 1.01) {
      const dx = cx - g.cx, dy = cy - g.cy;
      if (!g.moved && Math.hypot(dx, dy) < 7) return;
      g.moved = true; suppress.current = true;
      setDragging(true);
      setView(clampView({ z: viewRef.current.z, x: g.x + dx, y: g.y + dy }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId);
    const ps = [...ptrs.current.values()];
    if (ps.length) {
      const cx = ps.reduce((s, p) => s + p.x, 0) / ps.length, cy = ps.reduce((s, p) => s + p.y, 0) / ps.length;
      gesture.current = { dist: 0, z: viewRef.current.z, x: viewRef.current.x, y: viewRef.current.y, cx, cy, moved: true };
    } else { gesture.current = null; setDragging(false); }
  };

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const v = viewRef.current;
      const z = Math.min(ZOOM_MAX, Math.max(1, v.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018))));
      // keep the point under the cursor in place
      const px = e.clientX - r.left - r.width / 2, py = e.clientY - r.top - r.height / 2;
      setView(clampView({ z, x: px - (px - v.x) * (z / v.z), y: py - (py - v.y) * (z / v.z) }));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [wrap, clampView]);

  const click = (i: number) => {
    if (suppress.current) { suppress.current = false; return; }
    onTile(i);
  };

  // the deal-in cascade only right after a deal / shuffle; a tile that comes back later (undo) pops in at once
  const dealAt = useRef({ key: dealKey, t: performance.now() });
  if (dealAt.current.key !== dealKey) dealAt.current = { key: dealKey, t: performance.now() };
  const cascade = performance.now() - dealAt.current.t < 1200;

  const vars = { '--tw': `${fit.tw}px`, '--th': `${fit.th}px`, '--d': `${fit.d}px`, width: fit.W, height: fit.H } as CSSProperties;
  const ready = size.w > 0;

  return (
    <div ref={wrap} className={`mj-board ${dim ? 'dim' : ''} ${paused ? 'is-paused' : ''} ${view.z > 1.01 ? 'zoomed' : ''}`}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={e => { if (e.pointerType === 'mouse') onUp(e); }}>
      {ready && (
        <div className={`mj-cam ${dragging ? 'drag' : ''}`} style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.z})` }}>
          <div className="mj-inner" style={vars} key={dealKey}>
            <div className="mj-shadow" aria-hidden />
            {order.map((i, k) => {
              const f = faces[i];
              if (f < 0) return null;
              const { left, top } = at(i);
              const free = isFree(geo, faces, i);
              return (
                <Tile key={i} i={i} face={f} skin={skin} left={left} top={top} free={free} k={cascade ? k : 0}
                  sel={sel === i} hint={!!hint && (hint[0] === i || hint[1] === i)} shake={shake?.i === i ? shake.k : 0} onClick={click} />
              );
            })}
            {flies.map(fl => <FlyPair key={fl.k} fly={fl} skin={skin} a={at(fl.a)} b={at(fl.b)} tw={fit.tw} th={fit.th} onDone={onFlyDone} />)}
          </div>
        </div>
      )}
    </div>
  );
});

const Tile = memo(function Tile({ i, face, skin, left, top, free, sel, hint, shake, k, onClick }: {
  i: number; face: number; skin: Skin; left: number; top: number; free: boolean; sel: boolean; hint: boolean; shake: number; k: number; onClick: (i: number) => void;
}) {
  return (
    <div className={`mj-t ${free ? 'free' : 'blk'} ${sel ? 'sel' : ''} ${hint ? 'hint' : ''}`}
      style={{ transform: `translate3d(${left}px, ${top}px, 0)`, '--dl': `${Math.min(900, k * 6)}ms` } as CSSProperties}
      role="button" aria-label={faceName(face)} aria-pressed={sel} aria-disabled={!free}
      onClick={() => onClick(i)}>
      <div className="mj-in">
        <div className={`mj-tb ${shake ? 'shake' : ''}`} key={shake || 'n'}>
          <Face skin={skin} face={face} />
        </div>
      </div>
    </div>
  );
});

/** Two tiles lift, fly together and burst into gold dust (+ the points, and the combo when there is one). */
function FlyPair({ fly, skin, a, b, tw, th, onDone }: { fly: Fly; skin: Skin; a: { left: number; top: number }; b: { left: number; top: number }; tw: number; th: number; onDone: (k: number) => void }) {
  const mx = (a.left + b.left) / 2, my = (a.top + b.top) / 2;
  const meetGap = tw * 0.52;
  // they meet side by side, a on the left
  const aL = a.left <= b.left;
  const ax = mx - (aL ? meetGap : -meetGap) - a.left, bx = mx + (aL ? meetGap : -meetGap) - b.left;
  const lift = th * 0.22;
  useEffect(() => { const t = setTimeout(() => onDone(fly.k), fly.last ? 1300 : 950); return () => clearTimeout(t); }, [fly.k, fly.last, onDone]);
  const tr = { duration: 0.5, times: [0, 0.3, 0.72, 1], ease: 'easeInOut' as const };
  const dust = useMemo(() => Array.from({ length: fly.last ? 34 : 18 }, (_, i) => {
    const r = (s: number) => { const x = Math.sin((fly.k + 1) * 97.3 + i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
    const ang = (i / (fly.last ? 34 : 18)) * Math.PI * 2 + r(1) * 0.5;
    const dist = (fly.last ? 1.6 : 0.9) * tw * (0.6 + r(2) * 0.9);
    return { dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist * 0.85 - tw * 0.2, s: 2 + r(3) * (fly.last ? 5 : 3.5), dl: r(4) * 80, star: i % 5 === 0 };
  }), [fly.k, fly.last, tw]);
  return (
    <div className="mj-fly" aria-hidden>
      {([[a, ax, -6, fly.fa], [b, bx, 6, fly.fb]] as const).map(([p, dx, rot, f], n) => (
        <motion.div key={n} className="mj-t free fly" style={{ left: 0, top: 0, x: p.left, y: p.top }}
          initial={{ x: p.left, y: p.top, scale: 1, rotate: 0, opacity: 1 }}
          animate={{ x: [p.left, p.left, p.left + dx, p.left + dx], y: [p.top, p.top - lift, my - lift * 0.6, my - lift * 0.6], scale: [1, 1.12, 1.04, 0.5], rotate: [0, rot * 0.5, rot, 0], opacity: [1, 1, 1, 0] }}
          transition={tr}>
          <div className="mj-tb"><Face skin={skin} face={f} /></div>
        </motion.div>
      ))}
      <div className={`mj-burst ${fly.last ? 'big' : ''}`} style={{ left: mx + tw / 2, top: my + th / 2 - lift * 0.6 }}>
        <i className="flash" />
        <i className="ring" />
        {dust.map((d, i) => (
          <i key={i} className={d.star ? 'star' : 'dust'} style={{ '--dx': `${d.dx}px`, '--dy': `${d.dy}px`, '--s': `${d.s}px`, '--dl': `${360 + d.dl}ms` } as CSSProperties} />
        ))}
        <b className={`pts ${fly.combo > 1 ? 'combo' : ''}`}>
          +{fly.points}{fly.combo > 1 && <em>×{fly.combo}</em>}
        </b>
      </div>
    </div>
  );
}
