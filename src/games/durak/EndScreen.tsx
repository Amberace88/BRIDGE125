import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { AvatarFrame } from '../../cosmetics/AvatarFrame';
import { botLook } from '../../cosmetics/seatLooks';
import { useCosmetics } from '../../cosmetics/useCosmetics';
import { useStrings } from '../../i18n/pick';
import { buzz, sfx } from '../../sound';
import { useApp } from '../../store';
import { Epaulette, PaperHat } from './Art';
import type { DurakLevel } from './bot';
import type { DurakState } from './engine';
import { DURAK_STRINGS } from './strings';

const CONFETTI = ['#EBD38E', '#C9A54C', '#fff6dc', '#ff8fa0', '#9CC4FF'];

export function EndScreen({ g, me, level, onAgain, onSettings, onHome, onAuth }: {
  g: DurakState; me: number; level: DurakLevel; onAgain: () => void; onSettings: () => void; onHome: () => void; onAuth?: () => void;
}) {
  const s = useStrings(DURAK_STRINGS);
  const app = useApp();
  const cos = useCosmetics();
  const reduce = useReducedMotion();
  const n = g.players.length;
  const durak = g.durak;
  const lost = durak === me;
  const draw = durak === null;
  const line = useMemo(() => {
    const list = lost ? s.end.loseLines : s.end.winLines;
    return list[(g.seed + g.seq) % list.length];
  }, [lost, g.seed, g.seq, s]);

  useEffect(() => {
    if (lost) {
      const t1 = setTimeout(() => { sfx.stamp(); buzz([30, 40, 60]); }, reduce ? 0 : 900);
      return () => clearTimeout(t1);
    }
    const t2 = setTimeout(() => (draw ? sfx.good() : sfx.fanfare()), 250);
    return () => clearTimeout(t2);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // the hero: the durak wears the hat (me or a bot); on a draw / win: me
  const heroSeat = draw ? me : durak!;
  const myName = app.name || s.you;
  const nameOf = (i: number) => (i === me ? myName : g.players[i].name);
  const faceOf = (i: number) => (i === me ? (app.avatar || myName.slice(0, 1).toUpperCase()) : g.players[i].name.slice(0, 1).toUpperCase());
  const frameOf = (i: number) => (i === me ? cos.equipped.frame : botLook(level, i).frame);
  const avatar = (i: number, size: number) => {
    const av = <div className="dkav" style={{ width: size, height: size, fontSize: size * 0.42 }}>{faceOf(i)}</div>;
    const fr = frameOf(i);
    return fr && fr !== 'fr_none' ? <AvatarFrame id={fr} size={size}>{av}</AvatarFrame> : av;
  };
  const rows = g.players.map((p, i) => ({ i, place: i === durak ? n : p.place ?? n })).sort((a, b) => a.place - b.place);
  const showHat = !draw;
  const heroSize = 104;

  return (
    <motion.div className={`rsum dkend ${lost ? 'lost' : draw ? 'draw' : 'won'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={lost ? s.end.durak : s.end.notDurak}>
      {!lost && !draw && <div className="rays" aria-hidden />}
      {!lost && !draw && !reduce && (
        <div className="confetti" aria-hidden>
          {Array.from({ length: 34 }, (_, k) => (
            <motion.i key={k} style={{ left: `${(k * 37) % 100}%`, background: CONFETTI[k % CONFETTI.length] }}
              initial={{ y: -30, rotate: 0, opacity: 1 }} animate={{ y: '110vh', rotate: 360 + k * 40, opacity: [1, 1, 0.6] }}
              transition={{ duration: 2.6 + (k % 5) * 0.35, delay: (k % 9) * 0.12, ease: 'easeIn' }} />
          ))}
        </div>
      )}
      <div className="rsum-in dkend-in">
        <div className="dkend-hero">
          <motion.div className="dkend-av" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
            {avatar(heroSeat, heroSize)}
          </motion.div>
          {showHat && (
            <motion.div className="dkend-hat" initial={reduce ? false : { y: -240, rotate: -38, opacity: 0, scale: 1.2 }}
              animate={{ y: 0, rotate: -9, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 170, damping: 11, mass: 1.1, delay: 0.45 }}>
              <PaperHat size={140} />
            </motion.div>
          )}
          {showHat && g.pogony && (
            <>
              <motion.div className="dkend-ep l" initial={reduce ? false : { x: -120, opacity: 0, rotate: -20 }} animate={{ x: 0, opacity: 1, rotate: -8 }}
                transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 1.1 }}><Epaulette size={66} /></motion.div>
              <motion.div className="dkend-ep r" initial={reduce ? false : { x: 120, opacity: 0, rotate: 20 }} animate={{ x: 0, opacity: 1, rotate: 8 }}
                transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 1.25 }}><Epaulette size={66} flip /></motion.div>
            </>
          )}
        </div>
        <div className="kicker">{draw ? s.end.drawSub : lost ? '' : s.end.durakIs(nameOf(durak!))}</div>
        <motion.h1 className={`serif title big ${lost ? 'bad' : ''}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: lost ? 0.9 : 0.15 }}>
          {draw ? s.end.draw : lost ? s.end.durak : s.end.notDurak}
        </motion.h1>
        {showHat && g.pogony && <motion.div className="dkpogony" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>{s.end.pogony}</motion.div>}
        <motion.p className="dkline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: lost ? 1.2 : 0.4 }}>{line}</motion.p>

        <div className="dkplaces">
          {rows.map((r, k) => (
            <motion.div key={r.i} className={`dkprow ${r.i === me ? 'me' : ''} ${r.i === durak ? 'durak' : ''}`}
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (lost ? 1.3 : 0.5) + k * 0.07 }}>
              <span className="pl serif">{r.i === durak ? '' : r.place}</span>
              <span className="pav">{avatar(r.i, 34)}{r.i === durak && <span className="minihat"><PaperHat size={30} /></span>}</span>
              <b>{nameOf(r.i)}</b>
              <span className={`tag ${r.i === durak ? 'out' : 'went'}`}>{r.i === durak ? s.end.durakTag : s.end.place(r.place)}</span>
            </motion.div>
          ))}
        </div>

        <div className="cta">
          <button className="btn acc big" onClick={onAgain}>{s.end.again}</button>
          <div className="dkend-row">
            <button className="btn ghost" onClick={onSettings}>{s.end.settings}</button>
            <button className="btn ghost" onClick={onHome}>{s.end.home}</button>
          </div>
          {onAuth && <button className="dksignin" onClick={onAuth}>{s.end.signIn}</button>}
        </div>
      </div>
    </motion.div>
  );
}
