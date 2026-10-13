import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { JOURNEY_STRINGS } from '../i18n/journey';
import { MATCHES, TOTAL_STARS, chapterById, matchById, nextMatch, totalStars, type ChapterId, type MatchDef } from '../campaign/data';
import { StarIcon } from '../campaign/art';
import { useJourney, type CompleteResult } from '../campaign/journeyStore';
import { useParallax } from '../campaign/useParallax';
import type { MatchOutcome } from '../campaign/session';
import { QuestToasts } from '../campaign/QuestToasts';
import { syncAppProfile } from '../progress/useProgress';
import { track } from '../analytics';
import { sfx } from '../sound';
import { LocalGame } from './LocalGame';
import { ChapterFeature, ChapterList, JourneyMap } from './journey/JourneyMap';
import { ChapterView } from './journey/Chapter';
import { MatchIntro } from './journey/MatchIntro';
import { MatchResult } from './journey/MatchResult';
import { HouseRuleTab } from './journey/HouseRuleTab';
import '../styles/journey.css';

type View = { v: 'map' } | { v: 'city'; ch: ChapterId } | { v: 'match'; id: string; key: number };

function useWide(min = 900) {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= min : false));
  useEffect(() => { const f = () => setW(window.innerWidth >= min); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, [min]);
  return w;
}

/**
 * The Journey: single-player campaign across eight card rooms of Europe.
 * Self-contained route: map → city → match intro → match (LocalGame in campaign mode) → result.
 */
export function Journey({ onExit, onAuth }: { onExit: () => void; onAuth?: () => void }) {
  const app = useApp();
  const s = useStrings(JOURNEY_STRINGS);
  const J = useJourney();
  const stars = J.stars;
  const { mx, my } = useParallax();
  const wide = useWide();
  const [view, setView] = useState<View>({ v: 'map' });
  const [sel, setSel] = useState<ChapterId>(() => nextMatch(stars).chapter);
  const picked = useRef(false);
  const [intro, setIntro] = useState<MatchDef | null>(null);
  const [shown, setShown] = useState<{ o: MatchOutcome; prev: number } | null>(null);
  const [res, setRes] = useState<CompleteResult | null>(null);
  const total = totalStars(stars);

  // follow the player's current chapter until they pick one themselves (progress may load after mount)
  const cur = nextMatch(stars).chapter;
  useEffect(() => { if (!picked.current) setSel(cur); }, [cur]);
  useEffect(() => { track('journey_open', { stars: total }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (c: ChapterId) => { picked.current = true; setSel(c); };
  const enter = (c: ChapterId) => { picked.current = true; setSel(c); sfx.whoosh(0.8); setView({ v: 'city', ch: c }); };
  const start = (m: MatchDef) => { setIntro(null); setShown(null); setRes(null); setView({ v: 'match', id: m.id, key: Date.now() }); };

  const onEnd = (o: MatchOutcome) => {
    const prev = stars[o.matchId] ?? 0;
    setRes(null);
    setTimeout(() => setShown({ o, prev }), 2400);
    if (o.won) {
      void J.complete(o.matchId, o.stars).then(r => {
        setRes(r);
        if (r.ok && !r.guest && (typeof r.bm === 'number' || r.owned)) void syncAppProfile(app, { ...(typeof r.bm === 'number' ? { bm: r.bm } : {}), ...(r.owned ? { owned: r.owned } : {}) });
      });
    }
  };

  const match = view.v === 'match' ? matchById(view.id) : null;
  const campaign = useMemo(() => {
    if (!match) return undefined;
    const ch = chapterById(match.chapter)!;
    const foeTxt = s.chars[match.foe];
    const foes = [foeTxt?.seat ?? foeTxt?.name ?? match.foe, ...match.extra.map(e => s.companions[e] ?? s.chars[e]?.name ?? e)];
    return {
      match,
      names: { me: app.name || app.t.you, foes },
      overlay: <HouseRuleTab s={s} m={match} n={ch.n} />,
      onEnd,
    };
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = match ? MATCHES.find(x => x.ord === match.ord + 1) ?? null : null;

  return (
    <div className={`jroot ${view.v === 'match' ? 'is-match' : ''}`}>
      <AnimatePresence mode="wait">
        {view.v === 'map' && (
          <motion.div key="map" className="jscreen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }} transition={{ duration: 0.35 }}>
            <div className="jbg" aria-hidden><i className="glow1" /><i className="glow2" /><i className="felt" /></div>
            <div className="jscroll">
              <header className="jbar">
                <button className="jback" onClick={() => { sfx.tap(); onExit(); }} aria-label={s.back}><span aria-hidden>‹</span><span className="t">{s.back}</span></button>
                <div className="jtitle">
                  <small>{s.kicker}</small>
                  <h1 className="serif">{s.title}</h1>
                </div>
                <span className="jtotal" title={s.progress(total, TOTAL_STARS)}><StarIcon on size={15} /><b>{total}</b><small>/{TOTAL_STARS}</small></span>
              </header>
              <main className={`jmain ${wide ? 'wide' : ''}`}>
                <section className="jmapcol">
                  <JourneyMap s={s} stars={stars} selected={sel} onSelect={select} onEnter={enter} mx={mx} my={my} wide={wide} />
                  <div className="jprog">
                    <span className="lbl">{s.progress(total, TOTAL_STARS)}</span>
                    <span className="bar" aria-hidden><motion.i initial={{ width: 0 }} animate={{ width: `${(total / TOTAL_STARS) * 100}%` }} transition={{ duration: 1.4, delay: 0.6 }} /></span>
                  </div>
                </section>
                <aside className="jside">
                  <AnimatePresence mode="wait"><ChapterFeature key={sel} s={s} id={sel} stars={stars} onEnter={() => enter(sel)} /></AnimatePresence>
                  <ChapterList s={s} stars={stars} selected={sel} onSelect={select} />
                </aside>
              </main>
            </div>
          </motion.div>
        )}
        {view.v === 'city' && (
          <motion.div key={'city' + view.ch} className="jscreen" initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}>
            <ChapterView s={s} id={view.ch} stars={stars} mx={mx} my={my} onBack={() => setView({ v: 'map' })} onPick={m => setIntro(m)} />
          </motion.div>
        )}
        {view.v === 'match' && match && campaign && (
          <motion.div key={'m' + view.key} className="jmatchwrap" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <LocalGame resume={null} campaign={campaign} onExit={() => { setShown(null); setView({ v: 'city', ch: match.chapter }); }} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {intro && <MatchIntro key={intro.id} s={s} m={intro} lang={app.lang} best={stars[intro.id] ?? 0} onAccept={() => start(intro)} onClose={() => setIntro(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {shown && match && (
          <MatchResult key={'r' + (view.v === 'match' ? view.key : 0)} s={s} m={match} outcome={shown.o} prevBest={shown.prev} res={res} hasNext={!!next}
            onAuth={onAuth}
            onRetry={() => start(match)}
            onCity={() => { setShown(null); setView({ v: 'city', ch: match.chapter }); }}
            onNext={() => { if (!next) return; setShown(null); setSel(next.chapter); setView({ v: 'city', ch: next.chapter }); setTimeout(() => setIntro(next), 450); }} />
        )}
      </AnimatePresence>
      {view.v !== 'match' && <QuestToasts />}
    </div>
  );
}

