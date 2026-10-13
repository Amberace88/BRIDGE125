import { motion, useTransform, type MotionValue } from 'motion/react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CHAPTERS, chapterStars, chapterUnlocked, matchesOf, nextMatch, type ChapterId, type StarMap } from '../../campaign/data';
import { CITY_XY, MAP_H, MAP_W, MapEngraving, ROMAN, ROUTE_D, Skyline, StarIcon } from '../../campaign/art';
import type { JourneyStrings } from '../../i18n/journey';
import { sfx } from '../../sound';

interface Props {
  s: JourneyStrings;
  stars: StarMap;
  selected: ChapterId;
  onSelect: (c: ChapterId) => void;
  onEnter: (c: ChapterId) => void;
  mx: MotionValue<number>; my: MotionValue<number>;
  wide: boolean;
}

/** Route length up to each city (measured on the real path so the gold line sits exactly on the dashed one). */
function useRouteStops(ref: React.RefObject<SVGPathElement | null>) {
  const [m, setM] = useState<{ total: number; at: number[] } | null>(null);
  useLayoutEffect(() => {
    const p = ref.current;
    if (!p || typeof p.getTotalLength !== 'function') return;
    const total = p.getTotalLength();
    const N = 600;
    const samples = Array.from({ length: N + 1 }, (_, i) => { const pt = p.getPointAtLength((i / N) * total); return { l: (i / N) * total, x: pt.x, y: pt.y }; });
    let from = 0;
    const at = CHAPTERS.map(c => {
      const [cx, cy] = CITY_XY[c.id];
      let best = from, bd = Infinity;
      for (let i = from; i < samples.length; i++) { const d = Math.hypot(samples[i].x - cx, samples[i].y - cy); if (d < bd) { bd = d; best = i; } }
      from = best;
      return samples[best].l;
    });
    setM({ total, at });
  }, [ref]);
  return m;
}

export function JourneyMap({ s, stars, selected, onSelect, onEnter, mx, my, wide }: Props) {
  const next = nextMatch(stars);
  const current = next.chapter;
  const curIdx = CHAPTERS.findIndex(c => c.id === current);
  const allDone = (stars['montecarlo_boss'] ?? 0) > 0;
  const routeRef = useRef<SVGPathElement>(null);
  const stops = useRouteStops(routeRef);
  const progLen = stops ? stops.at[allDone ? CHAPTERS.length - 1 : curIdx] : 0;

  // depth: the paper drifts a little, the route and pins a little more, dust the most
  const rx = useTransform(my, [-1, 1], wide ? [16, 8] : [10, 4]);
  const ry = useTransform(mx, [-1, 1], wide ? [-5, 5] : [-3, 3]);
  const bx = useTransform(mx, [-1, 1], [-6, 6]), by = useTransform(my, [-1, 1], [-4, 4]);
  const px = useTransform(mx, [-1, 1], [-12, 12]), py = useTransform(my, [-1, 1], [-8, 8]);
  const dx = useTransform(mx, [-1, 1], [26, -26]), dy = useTransform(my, [-1, 1], [18, -18]);
  const lx = useTransform(mx, [-1, 1], ['20%', '80%']);

  const motes = useMemo(() => Array.from({ length: wide ? 26 : 14 }, (_, i) => {
    const r = (k: number) => (((i + 3) * 7919 * (k + 5) + 104729) % 10007) / 10007;
    return { left: r(1) * 100, top: r(2) * 100, s: 1.4 + r(3) * 2.6, dur: 10 + r(4) * 12, del: -r(5) * 20, o: 0.25 + r(6) * 0.5 };
  }), [wide]);

  return (
    <div className="jmap">
      <motion.div className="jmap-tilt" style={{ rotateX: rx, rotateY: ry, transformPerspective: 1500 }}>
        <div className="jmap-frame">
          <motion.div className="jmap-paper" style={{ x: bx, y: by }}>
            <MapEngraving />
          </motion.div>
          <motion.div className="jmap-top" style={{ x: px, y: py }}>
            <svg className="jmap-route" viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
              <defs>
                <linearGradient id="jr-gold" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#fff1c2" /><stop offset="0.5" stopColor="#e5c06a" /><stop offset="1" stopColor="#fff1c2" />
                </linearGradient>
                <filter id="jr-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" /></filter>
              </defs>
              <path ref={routeRef} d={ROUTE_D} className="route-base" />
              {stops && progLen > 0 && (
                <>
                  <motion.path d={ROUTE_D} className="route-glow" filter="url(#jr-glow)" strokeDasharray={`${progLen} ${stops.total}`}
                    initial={{ strokeDashoffset: progLen }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 2.2, ease: [0.3, 0.1, 0.2, 1], delay: 0.4 }} />
                  <motion.path d={ROUTE_D} className="route-prog" strokeDasharray={`${progLen} ${stops.total}`}
                    initial={{ strokeDashoffset: progLen }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 2.2, ease: [0.3, 0.1, 0.2, 1], delay: 0.4 }} />
                  <circle r="5" className="route-spark">
                    <animateMotion dur={`${Math.max(3, progLen / 120)}s`} repeatCount="indefinite" keyPoints={`0;${(progLen / stops.total).toFixed(4)}`} keyTimes="0;1" calcMode="linear" begin="2.6s">
                      <mpath href="#jr-path-ref" />
                    </animateMotion>
                  </circle>
                  <path id="jr-path-ref" d={ROUTE_D} fill="none" stroke="none" />
                </>
              )}
            </svg>
            {CHAPTERS.map((c, i) => {
              const [x, y] = CITY_XY[c.id];
              const st = chapterStars(c.id, stars);
              const open = chapterUnlocked(c.id, stars);
              const isCur = c.id === current && !allDone;
              const side = c.id === 'warsaw' || c.id === 'tbilisi' || c.id === 'vienna' ? 'l' : 'r';
              return (
                <motion.button key={c.id}
                  className={`jpin ${st.done ? 'done' : ''} ${isCur ? 'cur' : ''} ${open ? '' : 'locked'} ${selected === c.id ? 'sel' : ''} side-${side}`}
                  style={{ left: `${(x / MAP_W) * 100}%`, top: `${(y / MAP_H) * 100}%` }}
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.09, type: 'spring', stiffness: 320, damping: 18 }}
                  onClick={() => { sfx.tap(); if (selected === c.id && open) onEnter(c.id); else onSelect(c.id); }}
                  aria-label={s.cities[c.id].name}>
                  {isCur && <span className="pulse" aria-hidden><i /><i /></span>}
                  <span className="medal"><b className="serif">{ROMAN[i]}</b></span>
                  <span className="lbl"><b>{s.cities[c.id].name}</b>{open && st.got > 0 && <small><StarIcon on size={9} />{st.got}</small>}</span>
                </motion.button>
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
        </div>
      </motion.div>
      <motion.div className="jmap-dust" style={{ x: dx, y: dy }} aria-hidden>
        {motes.map((m, i) => <i key={i} style={{ left: `${m.left}%`, top: `${m.top}%`, width: m.s, height: m.s, opacity: m.o, animationDuration: `${m.dur}s`, animationDelay: `${m.del}s` }} />)}
      </motion.div>
    </div>
  );
}

/* ---------------------------------------------------------------- chapter cards */

export function ChapterFeature({ s, id, stars, onEnter }: { s: JourneyStrings; id: ChapterId; stars: StarMap; onEnter: () => void }) {
  const ch = CHAPTERS.find(c => c.id === id)!;
  const st = chapterStars(id, stars);
  const open = chapterUnlocked(id, stars);
  const ms = matchesOf(id);
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
        <div className="kick"><span>{s.chapterN(ch.n)}</span>{ch.n === 8 && <em>{s.finale}</em>}</div>
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

export function ChapterList({ s, stars, selected, onSelect }: { s: JourneyStrings; stars: StarMap; selected: ChapterId; onSelect: (c: ChapterId) => void }) {
  return (
    <ol className="jlist">
      {CHAPTERS.map((c, i) => {
        const st = chapterStars(c.id, stars);
        const open = chapterUnlocked(c.id, stars);
        return (
          <li key={c.id}>
            <button className={`jrow ${selected === c.id ? 'sel' : ''} ${open ? '' : 'locked'} ${st.done ? 'done' : ''}`} style={{ ['--glow' as string]: c.glow }} onClick={() => { sfx.tap(); onSelect(c.id); }}>
              <span className="num serif">{ROMAN[i]}</span>
              <span className="tx"><b>{s.cities[c.id].name}</b><small>{s.cities[c.id].room}</small></span>
              <span className="bar" aria-hidden><i style={{ width: `${(st.got / st.max) * 100}%` }} /></span>
              <span className="st">{open ? <><StarIcon on={st.got > 0} size={12} />{st.got}</> : <span aria-hidden>🔒</span>}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
