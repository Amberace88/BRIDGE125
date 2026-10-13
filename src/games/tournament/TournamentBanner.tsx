import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useApp } from '../../store';
import { useStrings } from '../../i18n/pick';
import { ARENA_STRINGS, type ArenaStrings } from '../../i18n/arena';
import { sfx } from '../../sound';
import { gameById } from '../registry';
import { clock, fmtNum, textOf } from '../hub/order';
import { countdown } from '../hub/hall';
import type { ArenaState } from './api';
import { TrophyIcon } from './icons';

/**
 * The week's tournament on the hub: claret felt + brass, the featured game's emblem in a laurel medallion, a live
 * countdown to Monday 00:00 (Riga), the player's rank and the prize, "Play now" and "Standings".
 * An unclaimed prize turns the banner into a "Collect" call.
 */
export function TournamentBanner({ t, signedIn, onPlay, onBoard, onClaim, onAuth }: {
  t: ArenaState; signedIn: boolean; onPlay: (game: string) => void; onBoard: () => void; onClaim: () => void; onAuth: () => void;
}) {
  const app = useApp();
  const s = useStrings(ARENA_STRINGS);
  const m = gameById(t.game);
  const E = m?.Emblem;
  const title = m ? textOf(m.title, app.lang) : t.game;
  const ends = Date.parse(t.ends_at);
  const unclaimed = t.unclaimed?.[0];
  const gold = t.prizes.find(p => p.tier === 'gold');
  const me = t.me;

  return (
    <motion.section className={`ga-tour ${unclaimed ? 'prize' : ''}`} aria-label={s.tour.kicker}
      initial={{ opacity: 0, y: 22, rotateX: -10 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ type: 'spring', stiffness: 150, damping: 19, delay: 0.12 }}>
      <div className="ga-tour-felt" aria-hidden><i className="rays" /><i className="sheen" /></div>
      <div className="ga-tour-top">
        <span className="ga-tour-medal" aria-hidden>
          <svg className="ga-laurel" viewBox="0 0 120 120"><Laurel /></svg>
          <span className="ga-tour-coin">{E ? <E size={40} /> : <TrophyIcon />}</span>
        </span>
        <div className="ga-tour-head">
          <span className="ga-kick"><TrophyIcon />{s.tour.kicker}</span>
          <h2 className="serif">{title}</h2>
          <div className="ga-tour-chips">
            <span className="ga-chip">{s.tour.metric[t.metric]}</span>
            <span className="ga-chip"><b>{fmtNum(t.players)}</b>&nbsp;{s.tour.players}</span>
            <span className="ga-chip free">{s.tour.free}</span>
          </div>
        </div>
      </div>

      <Countdown ends={ends} s={s} />

      <div className="ga-tour-mid">
        <div className="ga-tour-me">
          <small>{s.tour.rank}</small>
          {me && me.eligible ? (
            <b className="rank"><i>#</i>{me.rank}<em>{fmtNum(me.points)} {s.tour.points[t.metric]}{t.metric === 'wins' && me.best_seconds != null ? ` · ${clock(me.best_seconds)}` : ''}</em></b>
          ) : (
            <b className="none">{signedIn ? (me ? s.tour.qualify : s.tour.unranked) : s.tour.guest}</b>
          )}
        </div>
        {gold && (
          <div className="ga-tour-prize" title={s.tour.prizes}>
            <small>{s.tour.tiers.gold}</small>
            <b><i className="coin" />{fmtNum(gold.bm)}</b>
            <em>♔ {s.tour.prizeLine}</em>
          </div>
        )}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {unclaimed ? (
          <motion.button key="claim" className="btn acc ga-tour-cta claim" onClick={() => { sfx.coin(); onClaim(); }}
            initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.96 }}>
            <TrophyIcon /><span>{s.tour.claim.collect} · {s.tour.tiers[unclaimed.tier]}</span><span className="arr" aria-hidden>→</span>
          </motion.button>
        ) : (
          <motion.div key="cta" className="ga-tour-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {m && !m.hidden ? (
              <motion.button className="btn acc ga-tour-cta" onClick={() => { sfx.tap(); onPlay(t.game); }} whileTap={{ scale: 0.96 }} whileHover={{ y: -2 }}>
                <span>{s.tour.play}</span><span className="arr" aria-hidden>→</span>
              </motion.button>
            ) : <span className="ga-tour-soon">{s.tour.noGame}</span>}
            <motion.button className="btn ghost ga-tour-board" onClick={() => { sfx.tap(); onBoard(); }} whileTap={{ scale: 0.95 }}>{s.tour.standings}</motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      {!signedIn && app.online && <button className="ga-tour-sign" onClick={onAuth}>{s.tour.signIn} →</button>}
    </motion.section>
  );
}

/** d · h · m · s tiles; the seconds tile ticks with a tiny flip. */
export function Countdown({ ends, s, compact = false }: { ends: number; s: ArenaStrings; compact?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const c = countdown(ends, now);
  const parts: [string, number][] = [[s.tour.units.d, c.d], [s.tour.units.h, c.h], [s.tour.units.m, c.m], [s.tour.units.s, c.s]];
  return (
    <div className={`ga-count ${compact ? 'compact' : ''}`} role="timer" aria-label={`${s.tour.endsIn} ${c.d}${s.tour.units.d} ${c.h}${s.tour.units.h} ${c.m}${s.tour.units.m}`}>
      <span className="ga-count-l">{s.tour.endsIn}</span>
      <span className="ga-count-tiles">
        {parts.map(([u, v], i) => (
          <span key={u} className="ga-tile">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.b key={v} initial={{ y: i === 3 ? -10 : 0, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ duration: 0.22 }}>
                {String(v).padStart(i ? 2 : 1, '0')}
              </motion.b>
            </AnimatePresence>
            <small>{u}</small>
          </span>
        ))}
      </span>
    </div>
  );
}

/** Two laurel branches around the medal (brass line art). */
export const Laurel = () => (
  <g fill="none" stroke="currentColor" strokeLinecap="round">
    {[-1, 1].map(side => (
      <g key={side} transform={side < 0 ? 'translate(120 0) scale(-1 1)' : undefined}>
        <path d="M60 108c-22-4-38-20-42-46" strokeWidth="2" />
        {[0, 1, 2, 3, 4, 5].map(i => {
          const a = 98 - i * 9, y = 102 - i * 8.2, x = 46 - i * 5 + (i > 3 ? (i - 3) * 1.6 : 0);
          return <ellipse key={i} cx={x} cy={y} rx="7" ry="3.2" transform={`rotate(${-a + 60} ${x} ${y})`} fill="currentColor" fillOpacity=".85" stroke="none" />;
        })}
      </g>
    ))}
  </g>
);
