import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useApp } from '../../store';
import { useStrings } from '../../i18n/pick';
import { ARENA_STRINGS } from '../../i18n/arena';
import { pushProfile } from '../../progress/store';
import { buzz, sfx } from '../../sound';
import type { MiniStats } from '../api';
import type { GameModule } from '../types';
import { rewardFor } from '../rewards';
import { marathonClaimRpc, patchArena, type ArenaState } from '../tournament/api';
import { ChestIcon, SunIcon } from '../tournament/icons';
import { hallLevel, hallXp, showcase } from './hall';
import { clock, fmtNum, textOf } from './order';

/* ------------------------------------------------------------------ today: game of the day + marathon */

export function TodayRow({ list, arena, today, signedIn, onOpen, onAuth }: {
  list: readonly GameModule[]; arena: ArenaState | null; today: string[]; signedIn: boolean; onOpen: (id: string) => void; onAuth: () => void;
}) {
  const app = useApp();
  const s = useStrings(ARENA_STRINGS);
  const g = arena?.gotd?.game ? list.find(m => m.id === arena.gotd.game) : undefined;
  const E = g?.Emblem;
  const base = g ? rewardFor(g.id, true) : null;
  const mar = arena?.marathon ?? null;
  const games = mar?.games ?? today;
  const goal = mar?.goal ?? 3;
  const done = Math.min(goal, games.length);
  const [claim, setClaim] = useState<'idle' | 'busy' | 'got'>('idle');
  const claimed = !!mar?.claimed || claim === 'got';
  const ready = done >= goal && !claimed;
  const pips = useMemo(() => Array.from({ length: goal }, (_, i) => games[i] ? list.find(m => m.id === games[i]) ?? null : undefined), [games, goal, list]);

  const open = async () => {
    if (!signedIn) { onAuth(); return; }
    setClaim('busy');
    const r = await marathonClaimRpc();
    if (r?.ok || r?.error === 'claimed') {
      sfx.fanfare(); buzz([20, 40, 20]);
      if (r.ok) pushProfile({ bm: r.bm, xp: r.xp, level: r.level });
      if (mar) patchArena({ marathon: { ...mar, claimed: true } });
      setClaim('got');
    } else setClaim('idle');
  };

  if (!g && !arena) return null;
  return (
    <div className="ga-today">
      {g && E && (
        <motion.button className="ga-gotd" onClick={() => { sfx.tap(); onOpen(g.id); }} aria-label={`${s.today.gotd}: ${textOf(g.title, app.lang)}`}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.18 }}
          whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
          <i className="ga-gotd-burst" aria-hidden />
          <span className="ga-kick sm"><SunIcon />{s.today.gotd}</span>
          <span className="ga-gotd-body">
            <span className="ga-gotd-medal" aria-hidden><E size={30} /></span>
            <span className="ga-gotd-tx">
              <b className="serif">{textOf(g.title, app.lang)}</b>
              <em>{s.today.bonus}</em>
            </span>
          </span>
          <span className="ga-gotd-foot">
            {base && <span className="ga-x15"><i className="coin" /><s>{base.bm}</s><b>{Math.min(99, Math.round(base.bm * 1.5))}</b></span>}
            {arena?.gotd && arena.gotd.bm_today > 0
              ? <span className="ga-earned">{s.today.earned} +{fmtNum(arena.gotd.bm_today)}</span>
              : <span className="ga-play">{s.today.play} →</span>}
          </span>
        </motion.button>
      )}
      <motion.div className={`ga-mara ${ready ? 'ready' : ''} ${claimed ? 'claimed' : ''}`}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.24 }}>
        <span className="ga-kick sm"><ChestIcon open={claimed} />{s.today.marathon}</span>
        <p>{s.today.marathonSub}</p>
        <div className="ga-pips" aria-label={`${done}/${goal}`}>
          {pips.map((pm, i) => (
            <motion.span key={i} className={`ga-pip ${pm !== undefined ? 'on' : ''}`} initial={false} animate={{ scale: pm !== undefined ? [1.25, 1] : 1 }}>
              {pm ? <pm.Emblem size={18} /> : pm === null ? '✓' : <i>{i + 1}</i>}
            </motion.span>
          ))}
          <span className="ga-chest" aria-hidden><ChestIcon open={claimed} /></span>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {claimed ? (
            <motion.span key="c" className="ga-mara-done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>✓ {s.today.opened}</motion.span>
          ) : ready ? (
            <motion.button key="r" className="btn acc sm ga-mara-btn" disabled={claim === 'busy'} onClick={() => void open()} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: 0.95 }}>
              {signedIn ? s.today.open : s.today.signIn}
            </motion.button>
          ) : (
            <motion.span key="p" className="ga-mara-rw" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <b>{done}/{goal}</b><span><i className="coin" />{mar?.bm ?? 200}<small> · +{mar?.xp ?? 40} XP</small></span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ card-room level + showcase strip */

export function Showcase({ list, stats, onOpen }: { list: readonly GameModule[]; stats: Record<string, MiniStats>; onOpen: (id: string) => void }) {
  const app = useApp();
  const s = useStrings(ARENA_STRINGS);
  const lv = useMemo(() => hallLevel(hallXp(stats)), [stats]);
  const items = useMemo(() => showcase(list, stats), [list, stats]);
  const R = 30, C = 2 * Math.PI * R;
  return (
    <motion.section className="ga-hall" aria-labelledby="ga-hall-h" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, type: 'spring', stiffness: 170, damping: 20 }}>
      <div className="ga-hall-head">
        <span className="ga-ring" aria-hidden>
          <svg viewBox="0 0 72 72">
            <defs>
              <linearGradient id="gaRingG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff2c4" /><stop offset=".5" stopColor="#c9a54c" /><stop offset="1" stopColor="#8c6e28" /></linearGradient>
            </defs>
            <circle cx="36" cy="36" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
            <motion.circle cx="36" cy="36" r={R} fill="none" stroke="url(#gaRingG)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - lv.pct) }} transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1], delay: 0.4 }}
              transform="rotate(-90 36 36)" />
          </svg>
          <b>{lv.level}</b>
        </span>
        <div className="ga-hall-tx">
          <span className="ga-kick sm">{s.hall.title}</span>
          <h2 id="ga-hall-h" className="serif">{s.hall.ranks[lv.rank]}</h2>
          <span className="ga-hall-xp"><b>{fmtNum(lv.xp)}</b> XP · {fmtNum(lv.next - lv.xp)} {s.hall.toNext}</span>
        </div>
      </div>
      <span className="ga-kick sm ga-show-h">{s.hall.showcase}</span>
      {items.length ? (
        <div className="ga-strip" role="list">
          {items.map(({ m, st }, i) => {
            const E = m.Emblem;
            const main = st.best_score != null ? fmtNum(st.best_score) : clock(st.best_seconds);
            return (
              <motion.button key={m.id} role="listitem" className="ga-case" onClick={() => { sfx.tap(); onOpen(m.id); }}
                initial={{ opacity: 0, x: 20, rotateY: -20 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} transition={{ delay: 0.35 + i * 0.06, type: 'spring', stiffness: 220, damping: 20 }}
                whileHover={{ y: -3, rotateX: 6 }} whileTap={{ scale: 0.96 }}>
                <span className="ga-case-top">
                  <span className="ga-case-medal" aria-hidden><E size={22} /></span>
                  <b className="serif">{textOf(m.title, app.lang)}</b>
                </span>
                <span className="ga-case-best"><small>{st.best_score != null ? s.hall.best : s.hall.fastest}</small><b>{main}</b></span>
                <span className="ga-case-foot">
                  <span className={st.streak >= 2 ? 'hot' : ''}>{st.streak >= 2 ? '🔥' : '·'} {st.streak} <small>{s.hall.streak}</small></span>
                  <span>{fmtNum(st.won)} <small>{s.hall.wins}</small></span>
                </span>
              </motion.button>
            );
          })}
        </div>
      ) : <p className="ga-show-empty">{s.hall.empty}</p>}
    </motion.section>
  );
}
