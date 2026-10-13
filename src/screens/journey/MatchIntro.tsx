import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { CHAPTERS, character, type MatchDef } from '../../campaign/data';
import { Cameo, StarIcon, TwistArt } from '../../campaign/art';
import { twistInfo } from '../../campaign/twists';
import type { JourneyStrings } from '../../i18n/journey';
import type { Lang } from '../../i18n';
import { fmtBm } from '../../shop/catalog';
import { buzz, sfx } from '../../sound';
import { TwistIcon } from './Chapter';

interface Props { s: JourneyStrings; m: MatchDef; lang: Lang; best: number; onAccept: () => void; onClose: () => void }

/**
 * Pre-match card. For a boss it is a short cinematic: the title sweeps in, the cameo flips onto the table with a slam,
 * the name and quote write themselves, then the house rule slides up with a card illustration. Tap to skip ahead.
 */
export function MatchIntro({ s, m, lang, best, onAccept, onClose }: Props) {
  const boss = m.boss;
  const [fast, setFast] = useState(!boss);
  const c = character(m.foe);
  const ch = CHAPTERS.find(x => x.id === m.chapter)!;
  const txt = s.chars[m.foe];
  const info = twistInfo(m.twist);
  const city = s.cities[m.chapter].name;
  const T = (t: number) => (fast ? Math.min(t, 0.25) * 0.4 : t);

  useEffect(() => {
    if (!boss) { sfx.whoosh(0.6); return; }
    sfx.whoosh(1);
    const a = setTimeout(() => { sfx.slam(); buzz(30); }, 900);
    const b = setTimeout(() => sfx.big(), 2100);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [boss]);

  const words = txt.name.split(' ');
  return (
    <motion.div className={`jintro ${boss ? 'boss' : ''}`} style={{ ['--glow' as string]: ch.glow }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}
      onClick={() => setFast(true)} role="dialog" aria-modal="true" aria-label={txt.name}>
      <div className="jintro-bg" aria-hidden>
        {boss && <motion.i className="rays" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: T(0.5), duration: 1.4 }} />}
        <motion.i className="spot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: T(0.2), duration: 1 }} />
        <i className="grain" />
      </div>
      {boss && !fast && <button className="jskip" onClick={e => { e.stopPropagation(); setFast(true); }}>{s.intro.skip}</button>}

      <div className="jintro-in">
        <motion.div className="jintro-kick" initial={{ opacity: 0, letterSpacing: '0.9em' }} animate={{ opacity: 1, letterSpacing: '0.32em' }} transition={{ delay: T(0.15), duration: T(1) || 0.2 }}>
          {boss ? s.intro.bossOf(city) : `${city} · ${s.matchN(m.k)}`}
        </motion.div>

        <motion.div className="jintro-cameo"
          initial={boss ? { rotateY: 100, scale: 1.6, y: -40, opacity: 0 } : { scale: 0.85, opacity: 0 }}
          animate={{ rotateY: 0, scale: 1, y: 0, opacity: 1 }}
          transition={boss ? { delay: T(0.35), duration: T(0.6) || 0.2, ease: [0.2, 0.9, 0.25, 1.15] } : { type: 'spring', stiffness: 220, damping: 18 }}
          style={{ transformPerspective: 900 }}>
          {boss && <motion.i className="ring" initial={{ scale: 0.6, opacity: 0.9 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ delay: T(0.9), duration: 1.1 }} />}
          <Cameo c={c} size={boss ? 150 : 112} boss={boss} />
        </motion.div>

        <h2 className="jintro-name serif" aria-label={txt.name}>
          {words.map((w, i) => (
            <motion.span key={i} initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: T(1.05 + i * 0.12), duration: 0.5 }}>{w}</motion.span>
          ))}
        </h2>
        <motion.div className="jintro-ep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: T(1.35) }}>{txt.epithet}</motion.div>
        <motion.blockquote className="jintro-quote serif" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: T(1.6), duration: 0.6 }}>
          “{txt.quote}”
        </motion.blockquote>

        <motion.section className="jrule" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: T(2.05), type: 'spring', stiffness: 160, damping: 20 }}>
          <div className="jrule-art"><TwistArt twist={m.twist} lang={lang} w={boss ? 50 : 44} /></div>
          <div className="jrule-tx">
            <small><TwistIcon twist={m.twist} />{s.houseRule}</small>
            <b className="serif">{s.twists[m.twist].name}</b>
            <p>{s.twists[m.twist].desc}</p>
            <div className="jrule-meta">
              <span>{s.levels[m.level]}</span><span>·</span><span>{s.seats(info.seats)}</span>
            </div>
          </div>
        </motion.section>

        <motion.div className="jgoals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: T(2.3) }}>
          {[s.star.win, s.star.queen, s.star.under(m.under)].map((g, i) => (
            <div key={i} className={`goal ${best > i ? 'got' : ''}`}><StarIcon on={best > i} size={15} /><span>{g}</span></div>
          ))}
        </motion.div>

        <motion.div className="jrewards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: T(2.45) }}>
          {best === 0 && <span className="rw"><i className="coin" />+{fmtBm(m.bm)} <small>{s.firstWin}</small></span>}
          {best === 0 && <span className="rw xp">+{m.xp} XP</span>}
          <span className="rw"><i className="coin" />+{fmtBm(m.starBm)} <small>{s.perStar}</small></span>
          {m.item && best === 0 && <span className="rw trophy">✦ {s.item[m.item] ?? m.item}</span>}
        </motion.div>

        <AnimatePresence>
          <motion.div className="jintro-cta" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: T(2.6) }}>
            <button className="btn acc big" onClick={() => { sfx.tap(); onAccept(); }}><span className="suitspin" aria-hidden>♠</span>{boss ? s.intro.accept : s.play}<span className="arr" aria-hidden>→</span></button>
            <button className="btn ghost" onClick={onClose}>{s.intro.back}</button>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
