import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { CHAPTERS, character, type MatchDef } from '../../campaign/data';
import { Cameo, StarIcon } from '../../campaign/art';
import type { MatchOutcome } from '../../campaign/session';
import type { CompleteResult } from '../../campaign/journeyStore';
import type { JourneyStrings } from '../../i18n/journey';
import { buzz, sfx } from '../../sound';
import { CoinBurst, Ticker } from '../Rewards';

interface Props {
  s: JourneyStrings;
  m: MatchDef;
  outcome: MatchOutcome;
  /** previous best stars for this match (before the game) */
  prevBest: number;
  /** server answer (null while pending) */
  res: CompleteResult | null;
  hasNext: boolean;
  onRetry: () => void; onNext: () => void; onCity: () => void; onAuth?: () => void;
}

export function MatchResult({ s, m, outcome, prevBest, res, hasNext, onRetry, onNext, onCity, onAuth }: Props) {
  const won = outcome.won;
  const ch = CHAPTERS.find(c => c.id === m.chapter)!;
  const goals = [won, won && outcome.queenHits === 0, won && outcome.myScore < m.under];
  const [lit, setLit] = useState(0);
  // stars light up in the order of the goals that were met (not simply the first N slots)
  const rank = (i: number) => goals.slice(0, i).filter(Boolean).length;
  const isLit = (i: number) => goals[i] && rank(i) < lit;
  const newBest = won && outcome.stars > prevBest;

  useEffect(() => {
    const tms: ReturnType<typeof setTimeout>[] = [];
    if (won) {
      sfx.fanfare(); buzz([30, 50, 30]);
      for (let i = 1; i <= outcome.stars; i++) tms.push(setTimeout(() => { setLit(i); sfx.coin(); buzz(18); }, 700 + i * 520));
    } else sfx.alert();
    return () => tms.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // rewards: the server's answer, or what this result is worth (guests / offline)
  const est = useMemo(() => {
    const gain = Math.max(0, outcome.stars - prevBest);
    const first = prevBest === 0;
    return { bm: (first ? m.bm : 0) + gain * m.starBm, xp: first ? m.xp : 0, item: first ? m.item : null, title: first && m.ord === 32 ? 't_grand_tour' : null };
  }, [m, outcome.stars, prevBest]);
  const rw = res?.reward ?? null;
  const bm = rw ? rw.bm : est.bm, xp = rw ? rw.xp : est.xp, item = rw ? rw.item : est.item, title = rw ? rw.title : est.title;
  const guest = !!res?.guest, offline = !!res?.offline;
  const conquered = won && m.boss && prevBest === 0;

  return (
    <motion.div className={`jres ${won ? 'win' : 'lose'}`} style={{ ['--glow' as string]: ch.glow }} role="dialog" aria-modal="true"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="jres-bg" aria-hidden>{won && <i className="rays" />}<i className="spot" /></div>
      <motion.div className="jres-in" initial={{ y: 40, opacity: 0, rotateX: 14 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} transition={{ type: 'spring', stiffness: 170, damping: 20 }} style={{ transformPerspective: 1000 }}>
        <div className="jres-cam"><Cameo c={character(m.foe)} size={84} boss={m.boss} /></div>
        <div className="jres-kick">{s.cities[m.chapter].name} · {m.boss ? s.boss : s.matchN(m.k)}</div>
        <motion.h2 className="serif jres-title" initial={{ scale: 1.4, opacity: 0, filter: 'blur(10px)' }} animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }} transition={{ delay: 0.2, duration: 0.6 }}>
          {won ? s.result.victory : s.result.defeat}
        </motion.h2>
        {!won && <p className="jres-sub">{s.result.defeatSub}</p>}
        <div className="jres-score">{s.result.yourScore(outcome.myScore)}</div>

        {won && (
          <div className="jres-stars">
            {[0, 1, 2].map(i => (
              <div key={i} className={`slot ${isLit(i) ? 'on' : ''} ${goals[i] ? 'ok' : 'miss'}`}>
                <motion.span className="big" animate={isLit(i) ? { scale: [0.2, 1.35, 1], rotate: [-40, 10, 0] } : { scale: 1 }} transition={{ duration: 0.55 }}>
                  <StarIcon on={isLit(i)} size={i === 1 ? 58 : 46} />
                </motion.span>
                {isLit(i) && <CoinBurst key={'b' + i} n={10} spread={70} />}
                <small>{[s.star.win, s.star.queen, s.star.under(m.under)][i]}</small>
              </div>
            ))}
          </div>
        )}
        {newBest && prevBest > 0 && <motion.div className="jres-best" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.4, type: 'spring' }}>{s.result.newBest}</motion.div>}

        {won && (bm > 0 || xp > 0 || item) && (
          <motion.div className="jres-rewards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 + outcome.stars * 0.52 }}>
            <small>{s.result.earned}</small>
            <div className="row">
              {bm > 0 && <span className="rw"><i className="coin" />+<Ticker to={bm} from={0} dur={1.2} /></span>}
              {xp > 0 && <span className="rw xp">+{xp} XP</span>}
              {item && <span className="rw trophy">✦ {s.item[item] ?? item}</span>}
              {title && <span className="rw trophy">✦ {s.item[title] ?? title}</span>}
            </div>
            {guest && <button className="jres-note link" onClick={onAuth}>{s.result.signIn}</button>}
            {offline && <div className="jres-note">{s.result.offline}</div>}
          </motion.div>
        )}
        {conquered && (
          <motion.div className="jres-banner serif" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.6, type: 'spring', stiffness: 200, damping: 14 }}>
            {m.ord === 32 ? s.result.grandTour : s.result.conquered(s.cities[m.chapter].name)}
          </motion.div>
        )}

        <div className="jres-cta">
          {won && hasNext && <button className="btn acc big" onClick={() => { sfx.tap(); onNext(); }}>{s.result.next}<span className="arr" aria-hidden>→</span></button>}
          {!won && <button className="btn acc big" onClick={() => { sfx.tap(); onRetry(); }}><span aria-hidden>↺</span>{s.result.retry}</button>}
          <div className="two">
            {won && <button className="btn ghost" onClick={() => { sfx.tap(); onRetry(); }}><span aria-hidden>↺</span>{s.replay}</button>}
            <button className="btn ghost" onClick={() => { sfx.tap(); onCity(); }}>{s.result.toCity}</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
