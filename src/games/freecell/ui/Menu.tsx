import { motion } from 'motion/react';
import { useState } from 'react';
import type { FcStrings } from '../strings';
import type { FcDailyRec, FcStats } from '../store';
import { isDealNo, MAX_DEAL } from '../engine/deal';
import FreeCellEmblem from '../Emblem';
import { IconClose, IconSun } from '../../solitaire/ui/icons';
import { fmtTime } from '../../solitaire/ui/format';

interface Props {
  s: FcStrings;
  stats: FcStats;
  daily: FcDailyRec | undefined;
  dayLabel: string;
  canContinue: boolean;
  busy: boolean;
  onPlay: () => void;
  onDaily: () => void;
  onDeal: (n: number) => void;
  onContinue: () => void;
  onClose?: () => void;
}

/** Mini art: four cells and eight cascades. */
function BoardArt() {
  return (
    <svg viewBox="0 0 80 34" aria-hidden="true" className="fc-art">
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={`t${i}`} x={2 + i * 9.6} y={1.5} width={7.6} height={10} rx="1" className={i < 4 ? (i === 1 ? 'up' : 'cell') : 'home'} />
      ))}
      {Array.from({ length: 8 }, (_, i) => Array.from({ length: i < 4 ? 4 : 3 }, (_, k) => (
        <rect key={`${i}-${k}`} x={2 + i * 9.6} y={14 + k * 4.4} width={7.6} height={9} rx="1" className={`up ${(i + k) % 2 ? 'r' : ''}`} />
      )))}
    </svg>
  );
}

export function FcMenu(p: Props) {
  const { s, stats: st } = p;
  const [deal, setDeal] = useState('');
  const n = Number(deal);
  const ok = deal !== '' && isDealNo(n);
  return (
    <motion.div className="sol-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onPointerDown={e => { if (e.target === e.currentTarget && p.onClose) p.onClose(); }}>
      <motion.div className="sol-sheet fc-sheet" initial={{ y: 40, scale: 0.96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 30, scale: 0.97, opacity: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 30 }}>
        {p.onClose && <button className="glyph sol-x" aria-label={s.close} title={s.close} onClick={p.onClose}><IconClose /></button>}
        <div className="sol-brand">
          <motion.div className="em" initial={{ rotate: -8, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.08 }}>
            <FreeCellEmblem size={68} />
          </motion.div>
          <h1 className="serif">{s.title}</h1>
          <p>{s.tagline}</p>
        </div>

        <div className="fc-rules">
          <BoardArt />
          <p>{s.rules}</p>
        </div>

        <div className="sol-actions">
          {p.canContinue && <button className="btn ghost" onClick={p.onContinue}>{s.continue}</button>}
          <button className="btn acc" disabled={p.busy} onClick={p.onPlay}>{p.canContinue ? s.newGame : s.play}</button>
        </div>

        <button className={`sol-daily ${p.daily?.won ? 'won' : ''}`} disabled={p.busy} onClick={p.onDaily}>
          <span className="ic"><IconSun /></span>
          <span className="tx">
            <b>{s.daily} <em>· {p.dayLabel}</em></b>
            <small>{p.daily?.won && p.daily.bestTime != null ? `${s.dailySolved} · ${s.dailyBest(fmtTime(p.daily.bestTime), p.daily.bestMoves ?? 0)}` : s.dailySub}</small>
          </span>
          <span className="chev">›</span>
        </button>

        <form className="fc-deal" onSubmit={e => { e.preventDefault(); if (ok && !p.busy) p.onDeal(n); }}>
          <label>
            <small>{s.dealLabel}</small>
            <span className="fc-dealin">
              <i aria-hidden="true">#</i>
              <input inputMode="numeric" pattern="[0-9]*" maxLength={7} placeholder={s.dealPlaceholder} value={deal} aria-label={s.dealLabel}
                onChange={e => setDeal(e.target.value.replace(/\D/g, '').slice(0, 7))} max={MAX_DEAL} />
            </span>
          </label>
          <button className="btn ghost sm" type="submit" disabled={!ok || p.busy}>{s.playDeal}</button>
        </form>
        <p className="sol-note">{s.famous}</p>

        {st.played > 0 && (
          <div className="sol-stats">
            <span><small>{s.played}</small><b>{st.played}</b></span>
            <span><small>{s.wins}</small><b>{st.won}</b></span>
            <span><small>{s.best}</small><b>{st.bestTime ? fmtTime(st.bestTime) : '—'}</b></span>
            <span><small>{s.streak}</small><b>{st.streak}</b></span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
