import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  CHAPTERS, FINALE_ID, ROUTES, chapterStars, chapterUnlocked, matchesOn, nextMatch, posOn, type ChapterId, type RouteId, type StarMap,
} from '../../campaign/data';
import { CITY_XY, Compass, MAP_H, MAP_W, MapLayers, ROMAN, Skyline, StarIcon, routeD } from '../../campaign/art';
import type { JourneyStrings } from '../../i18n/journey';
import { sfx } from '../../sound';

interface Props {
  s: JourneyStrings;
  stars: StarMap;
  route: RouteId;
  selected: ChapterId;
  onSelect: (c: ChapterId) => void;
  onEnter: (c: ChapterId) => void;
  mx: MotionValue<number>; my: MotionValue<number>;
  wide: boolean;
}

type Cam = { x: number; y: number; w: number };
type Side = 'r' | 'l' | 't' | 'b';
type View = 'route' | 'all' | 'free';

/** Never zoom closer than this (screen px per map unit) … */
const MAX_SCALE = 0.95;
/** … and, in the route view, never so far out that neighbouring cities crowd each other (else: focus around "you are here"). */
const MIN_ROUTE_SCALE = 0.34;
/** Room around the fitted cities for medals and labels (px). */
const PAD = { l: 34, r: 96, t: 60, b: 58 };

function clampCam(c: Cam, aspect: number): Cam {
  const maxW = Math.min(MAP_W, MAP_H / aspect);
  const w = Math.min(Math.max(c.w, 120), maxW), h = w * aspect;
  return { w, x: Math.min(Math.max(c.x, w / 2), MAP_W - w / 2), y: Math.min(Math.max(c.y, h / 2), MAP_H - h / 2) };
}

/** Fit points (map units) into a frame of `size` px with label padding; returns the camera and its scale. */
function fit(pts: [number, number][], size: { w: number; h: number }, minScale = 0): Cam & { s: number } {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const aw = Math.max(40, size.w - PAD.l - PAD.r), ah = Math.max(40, size.h - PAD.t - PAD.b);
  const s = Math.max(minScale, Math.min(MAX_SCALE, aw / Math.max(1, x1 - x0), ah / Math.max(1, y1 - y0)));
  const w = size.w / s;
  return { s, w, x: (x0 + x1) / 2 + (PAD.r - PAD.l) / 2 / s, y: (y0 + y1) / 2 + (PAD.b - PAD.t) / 2 / s };
}

/** Camera for a view: the whole route if it fits legibly, else the stretch around the current chapter; or every salon. */
function targetCam(view: 'route' | 'all', route: RouteId, curIdx: number, size: { w: number; h: number }): Cam {
  const aspect = size.h / size.w;
  if (view === 'all') return clampCam(fit(CHAPTERS.map(c => CITY_XY[c.id]), size), aspect);
  const ids = ROUTES[route];
  const all = fit(ids.map(id => CITY_XY[id]), size);
  if (all.s >= MIN_ROUTE_SCALE) return clampCam(all, aspect);
  const a = Math.max(0, Math.min(curIdx - 1, ids.length - 4)), win = ids.slice(a, a + 4).map(id => CITY_XY[id]);
  return clampCam(fit(win, size, MIN_ROUTE_SCALE), aspect);
}

/** Route length up to each city (measured on the real path so the gold line sits exactly on the dotted one). */
function useRouteStops(ref: React.RefObject<SVGPathElement | null>, route: RouteId) {
  const [m, setM] = useState<{ total: number; at: number[]; route: RouteId } | null>(null);
  useLayoutEffect(() => {
    const p = ref.current;
    if (!p || typeof p.getTotalLength !== 'function') return;
    const total = p.getTotalLength();
    const N = 700;
    const samples = Array.from({ length: N + 1 }, (_, i) => { const pt = p.getPointAtLength((i / N) * total); return { l: (i / N) * total, x: pt.x, y: pt.y }; });
    let from = 0;
    const at = ROUTES[route].map(id => {
      const [cx, cy] = CITY_XY[id];
      let best = from, bd = Infinity;
      for (let i = from; i < samples.length; i++) { const d = Math.hypot(samples[i].x - cx, samples[i].y - cy); if (d < bd) { bd = d; best = i; } }
      from = best;
      return samples[best].l;
    });
    setM({ total, at, route });
  }, [ref, route]);
  return m && m.route === route ? m : null;
}

/** Greedy label placement: each route label takes the side (right, left, above, below) that overlaps least. */
function placeLabels(items: { id: ChapterId; x: number; y: number; w: number; h: number }[], size: { w: number; h: number }, medal: number): Record<string, Side> {
  const out: Record<string, Side> = {};
  const boxes: [number, number, number, number][] = items.map(it => [it.x - medal / 2, it.y - medal / 2, it.x + medal / 2, it.y + medal / 2]);
  const area = (a: [number, number, number, number], b: [number, number, number, number]) =>
    Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const rect = (it: typeof items[number], sd: Side): [number, number, number, number] => {
    const g = medal / 2 - 2;
    switch (sd) {
      case 'r': return [it.x + g, it.y - it.h / 2, it.x + g + it.w, it.y + it.h / 2];
      case 'l': return [it.x - g - it.w, it.y - it.h / 2, it.x - g, it.y + it.h / 2];
      case 't': return [it.x - it.w / 2, it.y - g - it.h - 2, it.x + it.w / 2, it.y - g - 2];
      default: return [it.x - it.w / 2, it.y + g + 2, it.x + it.w / 2, it.y + g + it.h + 2];
    }
  };
  for (const it of items) {
    let best: Side = 'r', bc = Infinity;
    for (const sd of ['r', 'l', 't', 'b'] as Side[]) {
      const r = rect(it, sd);
      let c = (sd === 'r' ? 0 : sd === 'l' ? 6 : 14);
      for (const b of boxes) c += area(r, b) * 3;
      for (const id of Object.keys(out)) { const o = items.find(x => x.id === id)!; c += area(r, rect(o, out[id])) * 4; }
      const ob = Math.max(0, -r[0]) + Math.max(0, r[2] - size.w) + Math.max(0, -r[1]) + Math.max(0, r[3] - size.h);
      c += ob * it.h * 9;
      if (c < bc) { bc = c; best = sd; }
    }
    out[it.id] = best;
    boxes.push(rect(it, best));
  }
  return out;
}

export function JourneyMap({ s, stars, route, selected, onSelect, onEnter, mx, my, wide }: Props) {
  const ids = ROUTES[route];
  const next = nextMatch(stars, route);
  const current = next.chapter;
  const curIdx = Math.max(0, ids.indexOf(current));
  const allDone = (stars[FINALE_ID] ?? 0) > 0;
  const D = routeD(route);
  const routeRef = useRef<SVGPathElement>(null);
  const stops = useRouteStops(routeRef, route);
  const progLen = stops ? stops.at[allDone ? ids.length - 1 : curIdx] : 0;

  /* ---------------------------------------------------------------- camera */
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); if (r.width > 0) setSize(p => (p && Math.abs(p.w - el.offsetWidth) < 1 && Math.abs(p.h - el.offsetHeight) < 1 ? p : { w: el.offsetWidth, h: el.offsetHeight })); };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const camX = useMotionValue(MAP_W * 0.42), camY = useMotionValue(MAP_H * 0.45), camW = useMotionValue(MAP_W), camA = useMotionValue(0.8);
  const vb = useTransform([camX, camY, camW, camA], ([x, y, w, a]: number[]) => `${(x - w / 2).toFixed(2)} ${(y - (w * a) / 2).toFixed(2)} ${w.toFixed(2)} ${(w * a).toFixed(2)}`);
  const pxW = useMotionValue(1);   // frame width in px (for unit ↔ px)
  const unit = useTransform([camW, pxW], ([w, p]: number[]) => w / Math.max(1, p));   // map units per screen px
  const [view, setView] = useState<View>('route');
  const [settled, setSettled] = useState<Cam | null>(null);
  const first = useRef(true);
  const anims = useRef<{ stop: () => void }[]>([]);

  const goTo = useCallback((c: Cam, instant = false) => {
    anims.current.forEach(a => a.stop());
    if (instant) { camX.set(c.x); camY.set(c.y); camW.set(c.w); setSettled(c); return; }
    const t = { type: 'spring' as const, stiffness: 70, damping: 20, mass: 1 };
    anims.current = [animate(camX, c.x, t), animate(camY, c.y, t), animate(camW, c.w, { ...t, onComplete: () => setSettled(c) })];
  }, [camX, camY, camW]);

  // a new route (starting city changed): fly to it, whatever the player had panned to
  const lastRoute = useRef(route);
  useLayoutEffect(() => { if (lastRoute.current !== route) { lastRoute.current = route; setView('route'); } }, [route]);
  useLayoutEffect(() => {
    if (!size) return;
    camA.set(size.h / size.w); pxW.set(size.w);
    if (view === 'free') { setSettled(clampCam({ x: camX.get(), y: camY.get(), w: camW.get() }, size.h / size.w)); return; }
    const t = targetCam(view, route, curIdx, size);
    if (first.current) {
      first.current = false;
      // establishing shot: start a little wider and settle onto the route
      const from = clampCam({ ...t, w: t.w * 1.35 }, size.h / size.w);
      goTo(from, true);
      const id = requestAnimationFrame(() => goTo(t));
      return () => cancelAnimationFrame(id);
    }
    goTo(t);
  }, [size, view, route, curIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------------------------------------------------------- gestures: drag to pan, pinch / ctrl+wheel to zoom */
  const drag = useRef<{ pts: Map<number, { x: number; y: number }>; start: { x: number; y: number; w: number; px: number; py: number; dist: number; mx: number; my: number } | null; moved: boolean }>({ pts: new Map(), start: null, moved: false });
  const snapshot = () => {
    const d = drag.current, p = [...d.pts.values()];
    const c = p.length > 1 ? { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 } : p[0];
    d.start = { x: camX.get(), y: camY.get(), w: camW.get(), px: c.x, py: c.y, dist: p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0, mx: c.x, my: c.y };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (!size || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const d = drag.current;
    d.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (d.pts.size === 1) d.moved = false;
    anims.current.forEach(a => a.stop());
    snapshot();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!size || !d.pts.has(e.pointerId) || !d.start) return;
    d.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = [...d.pts.values()];
    const c = p.length > 1 ? { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 } : p[0];
    if (!d.moved) {
      if (Math.hypot(c.x - d.start.px, c.y - d.start.py) < 7 && p.length < 2) return;
      d.moved = true;
      try { frameRef.current?.setPointerCapture(e.pointerId); } catch { /* */ }
      setView('free');
    }
    const aspect = size.h / size.w;
    let w = d.start.w;
    if (p.length > 1 && d.start.dist > 0) w = d.start.w * d.start.dist / Math.max(20, Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y));
    w = Math.min(Math.max(w, size.w / MAX_SCALE / 1.25), Math.min(MAP_W, MAP_H / aspect));
    const k0 = d.start.w / size.w, k1 = w / size.w;
    const rect = frameRef.current!.getBoundingClientRect();
    // keep the map point under the gesture's start centre under the current centre
    const ax = d.start.x + (d.start.px - rect.left - size.w / 2) * k0, ay = d.start.y + (d.start.py - rect.top - size.h / 2) * k0;
    const c2 = clampCam({ x: ax - (c.x - rect.left - size.w / 2) * k1, y: ay - (c.y - rect.top - size.h / 2) * k1, w }, aspect);
    camX.set(c2.x); camY.set(c2.y); camW.set(c2.w);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    d.pts.delete(e.pointerId);
    if (d.pts.size) { snapshot(); return; }
    d.start = null;
    if (d.moved && size) setSettled({ x: camX.get(), y: camY.get(), w: camW.get() });
  };
  const onClickCapture = (e: React.MouseEvent) => { if (drag.current.moved) { e.stopPropagation(); e.preventDefault(); drag.current.moved = false; } };
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !size) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;            // pinch on a trackpad / ctrl + wheel; a plain wheel keeps scrolling the page
      e.preventDefault();
      const aspect = size.h / size.w, rect = el.getBoundingClientRect();
      const w0 = camW.get(), w = Math.min(Math.max(w0 * Math.exp(e.deltaY * 0.01), size.w / MAX_SCALE / 1.25), Math.min(MAP_W, MAP_H / aspect));
      const ox = e.clientX - rect.left - size.w / 2, oy = e.clientY - rect.top - size.h / 2;
      const ax = camX.get() + ox * (w0 / size.w), ay = camY.get() + oy * (w0 / size.w);
      const c = clampCam({ x: ax - ox * (w / size.w), y: ay - oy * (w / size.w), w }, aspect);
      anims.current.forEach(a => a.stop());
      camX.set(c.x); camY.set(c.y); camW.set(c.w); setView('free'); setSettled(c);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [size, camX, camY, camW]);
  const zoomBy = (f: number) => {
    if (!size) return;
    const aspect = size.h / size.w;
    const w = Math.min(Math.max(camW.get() * f, size.w / MAX_SCALE / 1.25), Math.min(MAP_W, MAP_H / aspect));
    const c = clampCam({ x: camX.get(), y: camY.get(), w }, aspect);
    setView('free'); goTo(c);
  };

  /* ---------------------------------------------------------------- labels */
  // far out (the whole continent on a phone): smaller medals and labels
  const compact = !!size && !!settled && size.w / settled.w < (wide ? 0.3 : 0.2);
  const medal = compact ? 22 : wide ? 38 : 30;
  const sides = useMemo(() => {
    if (!size || !settled) return {} as Record<string, Side>;
    const k = settled.w / size.w, vx = settled.x - settled.w / 2, vy = settled.y - (settled.w * size.h / size.w) / 2;
    const fs = compact ? 6.8 : wide ? 8.8 : 7.2;
    const items = ids.map(id => {
      const [x, y] = CITY_XY[id];
      const name = s.cities[id].name;
      const st = chapterStars(id, stars).got;
      return { id, x: (x - vx) / k, y: (y - vy) / k, w: name.length * fs + (compact ? 14 : wide ? 22 : 16), h: compact ? (st > 0 ? 24 : 16) : st > 0 ? (wide ? 34 : 27) : (wide ? 24 : 19) };
    });
    return placeLabels(items, size, medal);
  }, [size, settled, ids, s, stars, wide, medal, compact]);

  /* ---------------------------------------------------------------- depth */
  const rx = useTransform(my, [-1, 1], wide ? [9, 4] : [6, 2]);
  const ry = useTransform(mx, [-1, 1], wide ? [-4, 4] : [-2, 2]);
  const bx = useTransform(mx, [-1, 1], [-4, 4]), by = useTransform(my, [-1, 1], [-3, 3]);
  const px = useTransform(mx, [-1, 1], [-7, 7]), py = useTransform(my, [-1, 1], [-5, 5]);
  const dx = useTransform(mx, [-1, 1], [26, -26]), dy = useTransform(my, [-1, 1], [18, -18]);
  const lx = useTransform(mx, [-1, 1], ['20%', '80%']);

  // route strokes are drawn in map units but sized in screen px
  const sw = (px2: number) => (u: number) => px2 * u;
  const baseW = useTransform(unit, sw(2.6)), progW = useTransform(unit, sw(3.6)), glowW = useTransform(unit, sw(12)), sparkR = useTransform(unit, sw(5));
  const dash = useTransform(unit, u => `${(1.2 * u).toFixed(2)} ${(7.5 * u).toFixed(2)}`);

  const motes = useMemo(() => Array.from({ length: wide ? 26 : 14 }, (_, i) => {
    const r = (k: number) => (((i + 3) * 7919 * (k + 5) + 104729) % 10007) / 10007;
    return { left: r(1) * 100, top: r(2) * 100, s: 1.4 + r(3) * 2.6, dur: 10 + r(4) * 12, del: -r(5) * 20, o: 0.25 + r(6) * 0.5 };
  }), [wide]);

  const offRoute = CHAPTERS.filter(c => !ids.includes(c.id));

  return (
    <div className="jmap">
      <motion.div className="jmap-tilt" style={{ rotateX: rx, rotateY: ry, transformPerspective: 1500 }}>
        <div className={`jmap-frame view-${view} ${compact ? 'compact' : ''}`} ref={frameRef}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onClickCapture={onClickCapture}>
          <motion.div className="jmap-paper" style={{ x: bx, y: by }}>
            <motion.svg className="jmap-engr" viewBox={vb} preserveAspectRatio="xMidYMid slice" aria-hidden>
              <MapLayers />
            </motion.svg>
          </motion.div>
          <motion.div className="jmap-top" style={{ x: px, y: py }}>
            <motion.svg className="jmap-route" viewBox={vb} preserveAspectRatio="xMidYMid slice" aria-hidden>
              <defs>
                <linearGradient id="jr-gold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={MAP_W} y2="0">
                  {Array.from({ length: 13 }, (_, i) => <stop key={i} offset={i / 12} stopColor={i % 2 ? '#e5c06a' : '#fff1c2'} />)}
                </linearGradient>
              </defs>
              <motion.path key={'b' + route} ref={routeRef} d={D} className="route-base" style={{ strokeWidth: baseW, strokeDasharray: dash }} />
              {stops && progLen > 0 && (
                <g key={'p' + route}>
                  <motion.path d={D} className="route-glow" style={{ strokeWidth: glowW }} strokeDasharray={`${progLen} ${stops.total + 10}`}
                    initial={{ strokeDashoffset: progLen }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 2.2, ease: [0.3, 0.1, 0.2, 1], delay: 0.5 }} />
                  <motion.path d={D} className="route-prog" style={{ strokeWidth: progW }} strokeDasharray={`${progLen} ${stops.total + 10}`}
                    initial={{ strokeDashoffset: progLen }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 2.2, ease: [0.3, 0.1, 0.2, 1], delay: 0.5 }} />
                  <path id="jr-path-ref" d={D} fill="none" stroke="none" />
                  <motion.circle r={sparkR} className="route-spark">
                    <animateMotion dur={`${Math.max(3, progLen / 220)}s`} repeatCount="indefinite" keyPoints={`0;${(progLen / stops.total).toFixed(4)}`} keyTimes="0;1" calcMode="linear" begin="2.8s">
                      <mpath href="#jr-path-ref" />
                    </animateMotion>
                  </motion.circle>
                </g>
              )}
            </motion.svg>
            {offRoute.map(c => <Dot key={c.id} id={c.id} name={s.cities[c.id].name} camX={camX} camY={camY} camW={camW} camA={camA} showName={view !== 'route'} title={s.route.offRoute} />)}
            {ids.map((id, i) => {
              const st = chapterStars(id, stars);
              const open = chapterUnlocked(id, stars, route);
              const isCur = id === current && !allDone;
              return (
                <Pin key={route + id} id={id} camX={camX} camY={camY} camW={camW} camA={camA}
                  className={`jpin ${st.done ? 'done' : ''} ${isCur ? 'cur' : ''} ${open ? '' : 'locked'} ${selected === id ? 'sel' : ''} side-${sides[id] ?? 'r'} ${i === ids.length - 1 ? 'fin' : ''}`}
                  delay={0.45 + i * 0.08}
                  onClick={() => { sfx.tap(); if (selected === id && open) onEnter(id); else onSelect(id); }}
                  label={s.cities[id].name}>
                  {isCur && <span className="pulse" aria-hidden><i /><i /></span>}
                  <span className="medal"><b className="serif">{ROMAN[i]}</b></span>
                  <span className="lbl"><b>{s.cities[id].name}</b>{open && st.got > 0 && <small><StarIcon on size={9} />{st.got}</small>}</span>
                </Pin>
              );
            })}
          </motion.div>
          <div className="jmap-sweep" aria-hidden />
          <motion.div className="jmap-lamp" aria-hidden style={{ left: lx }} />
          <div className="jmap-vignette" aria-hidden />
          <div className="jmap-cartouche" aria-hidden>
            <span className="serif">Carte des Salons</span>
            <small>MMXXVI · {s.title}</small>
          </div>
          {wide && <Compass size={92} />}
          <div className="jmap-ctl" onPointerDown={e => e.stopPropagation()}>
            <div className="seg" role="group">
              <button className={view === 'route' ? 'on' : ''} onClick={() => { sfx.tap(); setView('route'); if (view === 'route' && size) goTo(targetCam('route', route, curIdx, size)); }}>{s.route.viewRoute}</button>
              <button className={view === 'all' ? 'on' : ''} onClick={() => { sfx.tap(); setView('all'); }}>{s.route.viewAll}</button>
            </div>
            {wide && <div className="zoom"><button aria-label="+" onClick={() => zoomBy(0.7)}>+</button><button aria-label="−" onClick={() => zoomBy(1.42)}>−</button></div>}
          </div>
        </div>
      </motion.div>
      <motion.div className="jmap-dust" style={{ x: dx, y: dy }} aria-hidden>
        {motes.map((m, i) => <i key={i} style={{ left: `${m.left}%`, top: `${m.top}%`, width: m.s, height: m.s, opacity: m.o, animationDuration: `${m.dur}s`, animationDelay: `${m.del}s` }} />)}
      </motion.div>
    </div>
  );
}

type CamMV = { camX: MotionValue<number>; camY: MotionValue<number>; camW: MotionValue<number>; camA: MotionValue<number> };
function usePinPos(id: ChapterId, { camX, camY, camW, camA }: CamMV) {
  const [x, y] = CITY_XY[id];
  const left = useTransform([camX, camW], ([cx, w]: number[]) => `${(((x - (cx - w / 2)) / w) * 100).toFixed(3)}%`);
  const top = useTransform([camY, camW, camA], ([cy, w, a]: number[]) => `${(((y - (cy - (w * a) / 2)) / (w * a)) * 100).toFixed(3)}%`);
  return { left, top };
}

function Pin({ id, className, delay, onClick, label, children, ...cam }: CamMV & { id: ChapterId; className: string; delay: number; onClick: () => void; label: string; children: React.ReactNode }) {
  const { left, top } = usePinPos(id, cam);
  return (
    <motion.button className={className} style={{ left, top }} aria-label={label}
      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay, type: 'spring', stiffness: 320, damping: 18 }}
      onClick={onClick}>
      {children}
    </motion.button>
  );
}

function Dot({ id, name, showName, title, ...cam }: CamMV & { id: ChapterId; name: string; showName: boolean; title: string }) {
  const { left, top } = usePinPos(id, cam);
  return (
    <motion.span className={`jdot ${showName ? 'named' : ''}`} style={{ left, top }} title={`${name} · ${title}`}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
      <i aria-hidden /><em>{name}</em>
    </motion.span>
  );
}

/* ---------------------------------------------------------------- chapter cards */

export function ChapterFeature({ s, id, stars, route, onEnter }: { s: JourneyStrings; id: ChapterId; stars: StarMap; route: RouteId; onEnter: () => void }) {
  const ch = CHAPTERS.find(c => c.id === id)!;
  const pos = posOn(route, id);
  const st = chapterStars(id, stars);
  const open = chapterUnlocked(id, stars, route);
  const ms = matchesOn(route, id);
  const city = s.cities[id];
  return (
    <motion.article key={id} className={`jfeat ${open ? '' : 'locked'}`} style={{ ['--glow' as string]: ch.glow }}
      initial={{ opacity: 0, y: 14, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 20 }}>
      <div className="jfeat-sky" aria-hidden>
        <i className="moon" />
        <Skyline city={id} layer="far" />
        <Skyline city={id} />
        <i className="fog" />
      </div>
      <div className="jfeat-body">
        <div className="kick"><span>{s.chapterN(pos)}</span>{pos === 8 && <em>{s.finale}</em>}</div>
        <h2 className="serif">{city.name}</h2>
        <div className="room serif">{city.room}</div>
        <p>{city.blurb}</p>
        <div className="jfeat-row">
          <div className="jfeat-matches" aria-hidden>
            {ms.map(m => <i key={m.id} className={`${(stars[m.id] ?? 0) > 0 ? 'won' : ''} ${m.boss ? 'boss' : ''}`} />)}
          </div>
          <span className="jfeat-stars"><StarIcon on size={14} /><b>{st.got}</b>/{st.max}</span>
        </div>
        <button className={`btn ${open ? 'acc' : 'ghost'} jfeat-cta`} disabled={!open} onClick={() => { sfx.tap(); onEnter(); }}>
          {open ? <>{s.open}<span className="arr" aria-hidden>→</span></> : <><span aria-hidden>🔒</span>{s.chapterLocked}</>}
        </button>
      </div>
    </motion.article>
  );
}

export function ChapterList({ s, stars, route, selected, onSelect }: { s: JourneyStrings; stars: StarMap; route: RouteId; selected: ChapterId; onSelect: (c: ChapterId) => void }) {
  return (
    <ol className="jlist">
      {ROUTES[route].map((id, i) => {
        const c = CHAPTERS.find(x => x.id === id)!;
        const st = chapterStars(id, stars);
        const open = chapterUnlocked(id, stars, route);
        return (
          <li key={id}>
            <button className={`jrow ${selected === id ? 'sel' : ''} ${open ? '' : 'locked'} ${st.done ? 'done' : ''}`} style={{ ['--glow' as string]: c.glow }} onClick={() => { sfx.tap(); onSelect(id); }}>
              <span className="num serif">{ROMAN[i]}</span>
              <span className="tx"><b>{s.cities[id].name}</b><small>{s.cities[id].room}</small></span>
              <span className="bar" aria-hidden><i style={{ width: `${(st.got / st.max) * 100}%` }} /></span>
              <span className="st">{open ? <><StarIcon on={st.got > 0} size={12} />{st.got}</> : <span aria-hidden>🔒</span>}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
