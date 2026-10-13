import { motion } from 'motion/react';
import type { SolStrings } from '../strings';
import type { DailyRec, ModeStats } from '../store';
import type { Mode } from '../engine/game';
import SolitaireEmblem from '../Emblem';
import { IconClose, IconSun } from './icons';
import { fmtTime } from './format';

interface Props {
  s: SolStrings;
  mode: Mode;
  vegas: boolean;
  stats: Partial<Record<Mode, ModeStats>>;
  daily: DailyRec | undefined;
  dayLabel: string;
  canContinue: boolean;
  busy: boolean;
  onMode: (m: Mode) => void;
  onVegas: (v: boolean) => void;
  onPlay: () => void;
  onDaily: () => void;
  onContinue: () => void;
  onClose?: () => void;
}

const SPRING = { type: 'spring' as const, stiffness: 520, damping: 38 };

function Seg<T extends string | number | boolean>({ id, value, items, onPick }: { id: string; value: T; items: { v: T; label: string }[]; onPick: (v: T) => void }) {
  return (
    <div className="sol-seg" role="radiogroup">
      {items.map(it => (
        <button key={String(it.v)} role="radio" aria-checked={it.v === value} className={it.v === value ? 'on' : ''} onClick={() => onPick(it.v)}>
          {it.v === value && <motion.span layoutId={`seg-${id}`} className="pill" transition={SPRING} />}
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Mini art for the mode tiles: Klondike's seven cascades / Spider's ten. */
function ModeArt({ spider }: { spider: boolean }) {
  const cols = spider ? 10 : 7;
  return (
    <svg viewBox="0 0 70 40" aria-hidden="true" className="mart">
      {Array.from({ length: cols }, (_, i) => {
        const w = spider ? 5.4 : 8, gap = spider ? 1.3 : 1.7;
        const x = 2 + i * (w + gap) + (spider ? 0 : 0.4);
        const n = spider ? 3 + ((i * 7) % 4) : 1 + i * 0.6;
        return Array.from({ length: Math.ceil(n) }, (_, k) => (
          <rect key={`${i}-${k}`} x={x} y={4 + k * (spider ? 4.2 : 4.5)} width={w} height={spider ? 8 : 11} rx="1"
            className={k === Math.ceil(n) - 1 ? 'up' : 'dn'} />
        ));
      })}
    </svg>
  );
}

export function Menu(p: Props) {
  const { s, mode } = p;
  const spider = mode.startsWith('spider');
  const st = p.stats[mode];
  return (
    <motion.div className="sol-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onPointerDown={e => { if (e.target === e.currentTarget && p.onClose) p.onClose(); }}>
      <motion.div className="sol-sheet" initial={{ y: 40, scale: 0.96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 30, scale: 0.97, opacity: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 30 }}>
        {p.onClose && <button className="glyph sol-x" aria-label={s.close} title={s.close} onClick={p.onClose}><IconClose /></button>}
        <div className="sol-brand">
          <motion.div className="em" initial={{ rotate: -8, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.08 }}>
            <SolitaireEmblem size={68} />
          </motion.div>
          <h1 className="serif">{s.title}</h1>
          <p>{s.tagline}</p>
        </div>

        <div className="sol-modes">
          {([['klondike-1', s.klondike, false], ['spider-1', s.spider, true]] as const).map(([m, label, sp]) => {
            const on = spider === sp;
            return (
              <button key={m} className={`sol-mode ${on ? 'on' : ''}`} aria-pressed={on}
                onClick={() => { if (!on) p.onMode(sp ? 'spider-1' : 'klondike-1'); }}>
                {on && <motion.span layoutId="sol-mode-ring" className="ring" transition={SPRING} />}
                <ModeArt spider={sp} />
                <b className="serif">{label}</b>
              </button>
            );
          })}
        </div>

        {spider ? (
          <Seg id="suits" value={mode} onPick={p.onMode}
            items={[{ v: 'spider-1' as Mode, label: s.suits(1) }, { v: 'spider-2' as Mode, label: s.suits(2) }, { v: 'spider-4' as Mode, label: s.suits(4) }]} />
        ) : (
          <>
            <Seg id="draw" value={mode} onPick={p.onMode} items={[{ v: 'klondike-1' as Mode, label: s.draw(1) }, { v: 'klondike-3' as Mode, label: s.draw(3) }]} />
            <Seg id="vegas" value={p.vegas} onPick={p.onVegas} items={[{ v: false, label: s.standard }, { v: true, label: s.vegas }]} />
          </>
        )}
        <p className="sol-note">{spider ? s.spiderNote : p.vegas ? s.vegasNote : `${s.winnable} · ${s.undoCost(10)}`}</p>

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

        {st && st.played > 0 && (
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
