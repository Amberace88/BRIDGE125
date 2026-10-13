import { motion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { useApp } from '../../store';
import { useStrings } from '../../i18n/pick';
import { ARENA_STRINGS } from '../../i18n/arena';
import { AvatarImg } from '../../components/AvatarImg';
import { buzz, sfx } from '../../sound';
import { canvasBlob, shareImage } from '../../daily/shareCard';
import type { GameModule } from '../types';
import { textOf } from '../hub/order';
import { ImageIcon, SwordsIcon } from '../tournament/icons';
import { challengeUrl, prettyUrl, resultMain, resultSub, type ChallengeSide } from './compare';
import { drawChallengeCard } from './shareCard';

export interface Duelist { name: string; avatar?: string | null; avatar_url?: string | null; r: ChallengeSide }

/**
 * The result of a challenge: "You 2:41 · VS · Anna 3:05" — two medallions face to face, the winner glowing, the
 * headline, and: share the result image, challenge them back, play again / back.
 * `saved`: true = stored on the challenge board · false = guest (local comparison only) · null = still sending.
 */
export function CompareSheet({ m, code, me, them, vs, saved, again, onRevenge, onAgain, onBack, onAuth }: {
  m: GameModule; code: string; me: Duelist; them: Duelist; vs: number; saved: boolean | null; again?: boolean;
  onRevenge?: () => void; onAgain?: () => void; onBack: () => void; onAuth: () => void;
}) {
  const app = useApp();
  const s = useStrings(ARENA_STRINGS);
  const c = s.challenge;
  const title = textOf(m.title, app.lang);
  const head = vs > 0 ? c.vs.win : vs < 0 ? c.vs.lose : c.vs.tie;
  const E = m.Emblem;
  useEffect(() => {
    const t = setTimeout(() => { if (vs > 0) { sfx.fanfare(); buzz([20, 40, 20]); } else if (vs < 0) sfx.alert(); else sfx.good(); }, 350);
    return () => clearTimeout(t);
  }, [vs]);

  const share = async () => {
    sfx.tap();
    const url = challengeUrl(code);
    const cv = await drawChallengeCard({
      game: title, kicker: c.card.kicker,
      a: { name: me.name, main: resultMain(me.r), sub: resultSub(me.r), won: me.r.won },
      b: { name: them.name, main: resultMain(them.r), sub: resultSub(them.r), won: them.r.won },
      vs, headline: head, wonLabel: c.won, lostLabel: c.lost, vsLabel: c.card.vs, cta: c.card.cta, url: prettyUrl(url),
    });
    const blob = await canvasBlob(cv);
    if (!blob) return;
    await shareImage(blob, { title: head, text: c.vs.shareText(title, `${me.name} ${resultMain(me.r)} – ${them.name} ${resultMain(them.r)}`), url, filename: `bridge125-${code}.png` });
  };

  return (
    <>
      <motion.div className="grs-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <div className="grs-pos">
        <motion.div className={`gc-vs ${vs > 0 ? 'win' : vs < 0 ? 'lose' : 'tie'}`} role="dialog" aria-modal="true" aria-label={head}
          initial={{ y: 70, opacity: 0, scale: 0.92, rotateX: 18 }} animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }} exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 210, damping: 21 }}>
          {vs > 0 && <Sparks />}
          <span className="ga-kick"><span className="gc-vs-em" aria-hidden><E size={18} /></span>{title} · {c.card.kicker}</span>
          <motion.h2 className="serif" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>{head}</motion.h2>
          <div className="gc-duel">
            <Side d={me} label={c.vs.you} win={vs > 0} from={-1} wonL={c.won} lostL={c.lost} />
            <motion.span className="gc-seal" aria-hidden initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.35, type: 'spring', stiffness: 320, damping: 12 }}>
              {c.card.vs}
            </motion.span>
            <Side d={them} label={them.name} win={vs < 0} from={1} wonL={c.won} lostL={c.lost} />
          </div>
          <p className="gc-vs-note">
            {saved === false ? <>{c.vs.guestNote} <button className="gc-inline" onClick={onAuth}>{c.signIn}</button></>
              : again ? c.vs.first : saved ? `✓ ${c.vs.saved}` : ' '}
          </p>
          <div className="gc-vs-cta">
            {onRevenge && (
              <motion.button className="btn acc" onClick={() => { sfx.tap(); onRevenge(); }} whileTap={{ scale: 0.96 }}>
                <SwordsIcon /><span>{c.vs.revenge}</span>
              </motion.button>
            )}
            <div className="gc-row">
              <button className="btn ghost" onClick={() => { sfx.tap(); (onAgain ?? onBack)(); }}>{onAgain ? `↻ ${c.vs.again}` : `‹ ${c.vs.back}`}</button>
              <button className="btn ghost" onClick={() => void share()} aria-label={c.vs.share} title={c.vs.share}><ImageIcon /></button>
            </div>
            {onAgain && <button className="gc-inline" onClick={onBack}>‹ {c.vs.back}</button>}
          </div>
        </motion.div>
      </div>
    </>
  );
}

function Side({ d, label, win, from, wonL, lostL }: { d: Duelist; label: string; win: boolean; from: number; wonL: string; lostL: string }) {
  return (
    <motion.div className={`gc-side ${win ? 'win' : ''}`} initial={{ x: 60 * from, opacity: 0, rotateY: 30 * from }} animate={{ x: 0, opacity: 1, rotateY: 0 }}
      transition={{ type: 'spring', stiffness: 170, damping: 17, delay: 0.1 }}>
      {win && <motion.span className="gc-crown" aria-hidden initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 12 }}>♛</motion.span>}
      <AvatarImg url={d.avatar_url} emoji={d.avatar} name={d.name} size={52} />
      <small>{label}</small>
      <b>{resultMain(d.r)}</b>
      <em>{resultSub(d.r) || ' '}</em>
      <span className={`gc-tag ${d.r.won ? 'won' : 'lost'}`}>{d.r.won ? wonL : lostL}</span>
    </motion.div>
  );
}

function Sparks() {
  const bits = useMemo(() => Array.from({ length: 18 }, (_, i) => {
    const r = (k: number) => (((i + 1) * 9301 * (k + 3) + 49297) % 233280) / 233280;
    return { l: 6 + r(1) * 88, d: r(2) * 1.6, dur: 2.2 + r(3) * 1.8, s: 3 + r(4) * 5, x: (r(5) - 0.5) * 60 };
  }), []);
  return (
    <div className="grs-sparks" aria-hidden>
      {bits.map((b, i) => (
        <motion.i key={i} style={{ left: `${b.l}%`, width: b.s, height: b.s }} initial={{ y: 40, opacity: 0, x: 0 }}
          animate={{ y: -260, opacity: [0, 1, 0], x: b.x }} transition={{ duration: b.dur, delay: b.d, repeat: Infinity, repeatDelay: 0.6, ease: 'easeOut' }} />
      ))}
    </div>
  );
}
