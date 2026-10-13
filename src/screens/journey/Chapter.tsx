import { motion, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { CHAPTERS, character, chapterStars, isUnlocked, matchesOn, posOn, type ChapterId, type MatchDef, type RouteId, type StarMap } from '../../campaign/data';
import { Cameo, Skyline, StarIcon, StarRow } from '../../campaign/art';
import { twistInfo } from '../../campaign/twists';
import type { JourneyStrings } from '../../i18n/journey';
import { fmtBm } from '../../shop/catalog';
import { sfx } from '../../sound';

const LEVEL_PIPS = { easy: 1, normal: 2, hard: 3, expert: 4 } as const;

export function TwistIcon({ twist }: { twist: MatchDef['twist'] }) {
  const g: Record<string, string> = { none: '♣', bluff: '?', trio: '3', handicap: '+', banker: '6♠', pique: 'Q♠', twins: '×2', baron: '?', clock: '◷', countess: '125', maestro: '×3', croupier: '100', matryoshka: '+6', selector: '◷', bison: '?', eagle: '6♠', caravan: '?', fire: '125', cognac: '+6', voivode: '110', thorn: '125', matador: '6♠', spymaster: 'Q♠' };
  return <i className={`ticon t-${twist}`} aria-hidden>{g[twist] ?? '♣'}</i>;
}

/** Sky, moon, stars and the city's two skyline layers, with parallax. */
export function CityBackdrop({ id, mx, my }: { id: ChapterId; mx: MotionValue<number>; my: MotionValue<number> }) {
  const ch = CHAPTERS.find(c => c.id === id)!;
  const fx = useTransform(mx, [-1, 1], [10, -10]), fy = useTransform(my, [-1, 1], [5, -5]);
  const nx = useTransform(mx, [-1, 1], [26, -26]), ny = useTransform(my, [-1, 1], [10, -10]);
  const sx = useTransform(mx, [-1, 1], [-6, 6]);
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 700);
  useEffect(() => { const f = () => setWide(window.innerWidth >= 700); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  const stars = useMemo(() => Array.from({ length: 70 }, (_, i) => {
    const r = (k: number) => (((i + 11) * 4099 * (k + 3) + 7919) % 9973) / 9973;
    return { l: r(1) * 100, t: r(2) * 62, s: 0.8 + r(3) * 1.8, d: r(4) * 6 };
  }), []);
  return (
    <div className="jcity-bg" style={{ ['--glow' as string]: ch.glow }} aria-hidden>
      <motion.div className="sky" style={{ x: sx }}>
        {stars.map((st, i) => <i key={i} className="star" style={{ left: `${st.l}%`, top: `${st.t}%`, width: st.s, height: st.s, animationDelay: `${st.d}s` }} />)}
        <i className="moon" />
      </motion.div>
      <i className="halo" />
      <motion.div className="lfar" style={{ x: fx, y: fy }}><Skyline city={id} layer="far" tile={wide} /></motion.div>
      <motion.div className="lnear" style={{ x: nx, y: ny }}><Skyline city={id} lit={0.3} tile={wide} /></motion.div>
      <i className="fog" />
    </div>
  );
}

interface Props {
  s: JourneyStrings;
  id: ChapterId;
  stars: StarMap;
  route: RouteId;
  onBack: () => void;
  onPick: (m: MatchDef) => void;
  mx: MotionValue<number>; my: MotionValue<number>;
}

export function ChapterView({ s, id, stars, route, onBack, onPick, mx, my }: Props) {
  const ch = CHAPTERS.find(c => c.id === id)!;
  const city = s.cities[id];
  const ms = matchesOn(route, id);
  const st = chapterStars(id, stars);
  const nextId = ms.find(m => isUnlocked(m, stars, route) && !(stars[m.id] > 0))?.id;
  const tx = useTransform(mx, [-1, 1], [-8, 8]);

  return (
    <div className="jcity" style={{ ['--glow' as string]: ch.glow }}>
      <CityBackdrop id={id} mx={mx} my={my} />
      <div className="jcity-scroll">
        <header className="jbar">
          <button className="jback" onClick={() => { sfx.tap(); onBack(); }} aria-label={s.back}><span aria-hidden>‹</span>{s.title}</button>
          <span className="jtotal"><StarIcon on size={15} /><b>{st.got}</b>/{st.max}</span>
        </header>
        <motion.section className="jcity-hero" style={{ x: tx }}>
          <motion.div className="kick" initial={{ opacity: 0, letterSpacing: '.6em' }} animate={{ opacity: 1, letterSpacing: '.28em' }} transition={{ duration: 0.9 }}>
            {s.chapterN(posOn(route, id))}
          </motion.div>
          <motion.h1 className="serif" initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.8, delay: 0.1 }}>{city.name}</motion.h1>
          <motion.div className="room serif" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>{city.room}</motion.div>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>{city.blurb}</motion.p>
        </motion.section>

        <ol className="jladder">
          {ms.map((m, i) => {
            const open = isUnlocked(m, stars, route);
            const got = stars[m.id] ?? 0;
            const c = character(m.foe);
            const info = twistInfo(m.twist);
            const ch2 = s.chars[m.foe];
            return (
              <motion.li key={m.id} className={m.boss ? 'boss' : ''}
                initial={{ opacity: 0, y: 30, rotateX: -18 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: 0.25 + i * 0.1, type: 'spring', stiffness: 140, damping: 18 }}>
                <button className={`jmatch ${m.boss ? 'boss' : ''} ${open ? '' : 'locked'} ${got ? 'won' : ''} ${nextId === m.id ? 'next' : ''}`}
                  disabled={!open} onClick={() => { sfx.tap(); onPick(m); }}>
                  <span className="sheen" aria-hidden />
                  <span className="cam"><Cameo c={c} size={m.boss ? 92 : 70} boss={m.boss} locked={!open} /></span>
                  <span className="info">
                    <span className="k">{m.boss ? <em>{s.boss}</em> : s.matchN(m.k)}</span>
                    <b className="serif nm">{ch2?.name}</b>
                    <span className="ep">{ch2?.epithet}</span>
                    <span className="chips">
                      <span className="chip2 rule"><TwistIcon twist={m.twist} />{s.twists[m.twist].name}</span>
                      <span className="chip2 lvl" title={s.difficulty}>
                        {[1, 2, 3, 4].map(n => <i key={n} className={n <= LEVEL_PIPS[m.level] ? 'on' : ''} />)}
                        <span>{s.levels[m.level]}</span>
                      </span>
                      {info.seats > 2 && <span className="chip2">{s.seats(info.seats)}</span>}
                    </span>
                  </span>
                  <span className="side">
                    <StarRow n={got} size={m.boss ? 18 : 15} />
                    {open
                      ? <span className="go">{got ? s.replay : s.play}<span aria-hidden>→</span></span>
                      : <span className="lockt">{s.locked}</span>}
                    {!got && open && <span className="bm"><i className="coin" />+{fmtBm(m.bm)}</span>}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
