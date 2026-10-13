import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useStrings } from '../i18n/pick';
import { QUEST_STRINGS, type QuestStrings } from '../i18n/journey';
import { sfx } from '../sound';
import { useQuests } from './questStore';
import { isGameMetric, isReady, type Metric } from './quests';
import './quests-mini.css';

/** "5h 12m" / "2d 4h" until the given epoch ms; ticks every 30 s. */
export function useCountdown(target: number | undefined, s: QuestStrings) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  if (!target) return '';
  const ms = Math.max(0, target - now);
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}${s.time.d} ${h % 24}${s.time.h}`;
  if (h > 0) return `${h}${s.time.h} ${m % 60}${s.time.m}`;
  return `${Math.max(1, m)}${s.time.m}`;
}

const GLYPH: Record<Metric, string> = {
  games: '♣', wins: '♛', queen: 'Q♠', burn125: '125', jacks: 'J', rounds: '↻', rounds_won: '⇥', bluff_rounds: '?', bounce: '6♠',
  kings: 'K⁴', quick_win: 'ϟ', journey_win: '✦', journey_3star: '★',
  // mini games (migration 019)
  mg_games: '◈', mg_zole_win: 'Z', mg_durak_win: 'D', mg_solitaire_win: 'K♥', mg_sudoku_daily: '9',
  // 022a–c, live from migration 024
  mg_thousand_win: '1000', mg_mahjong_daily: '中', mg_freecell_win: 'FC', mg_freecell_daily: '☀FC',
};

/** Engraved brass medallion with the quest's glyph. */
export function QuestGlyph({ metric, size = 46 }: { metric: Metric; size?: number }) {
  const g = GLYPH[metric] ?? '◈';
  return (
    <span className={`qglyph m-${metric}`} style={{ width: size, height: size, fontSize: size * (g.length > 2 ? 0.27 : g.length > 1 ? 0.33 : 0.42) }} aria-hidden>
      <span className="in serif">{g}</span>
    </span>
  );
}

/** Brass progress bar with notches for small goals. */
export function QuestBar({ v, max }: { v: number; max: number }) {
  return (
    <span className="qbar" aria-hidden>
      <motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(100, (v / max) * 100)}%` }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} />
      {max <= 10 && max > 1 && Array.from({ length: max - 1 }, (_, i) => <b key={i} style={{ left: `${((i + 1) / max) * 100}%` }} />)}
    </span>
  );
}

/**
 * Compact daily-quest tracker for Home: three mini bars, the reset timer and an "N ready" badge. Opens the quest log.
 * Self-contained (small stylesheet), so Home can import it without pulling in the quest log screen.
 */
export function QuestTracker({ onOpen, className = '' }: { onOpen: () => void; className?: string }) {
  const s = useStrings(QUEST_STRINGS);
  const q = useQuests();
  const b = q.board;
  const t = useCountdown(b?.nextDaily, s);
  if (!b) return null;
  // Home keeps to Bridge: the extra mini-game quest lives in the quest log and the games hub
  const rows = b.daily.filter(r => !isGameMetric(r.metric));
  const done = rows.every(r => r.claimed);
  return (
    <button className={`qtrack ${q.ready ? 'hot' : ''} ${className}`} onClick={() => { sfx.tap(); onOpen(); }}>
      <span className="qtrack-head">
        <i className="qt-seal" aria-hidden>♠</i>
        <b>{s.tracker.title}</b>
        {q.ready > 0 ? <em className="qready">{s.tracker.ready(q.ready)}</em> : <small>{done ? s.tracker.done : s.resetsIn(t)}</small>}
        <span className="go" aria-hidden>›</span>
      </span>
      <span className="qtrack-rows">
        {rows.map(r => (
          <span key={r.id} className={`qtr ${isReady(r) ? 'ready' : ''} ${r.claimed ? 'claimed' : ''}`}>
            <QuestGlyph metric={r.metric} size={26} />
            <span className="qtr-tx"><span className="nm">{s.desc[r.metric](r.goal)}</span><QuestBar v={r.progress} max={r.goal} /></span>
            <span className="qtr-n">{r.claimed ? '✓' : `${r.progress}/${r.goal}`}</span>
          </span>
        ))}
      </span>
    </button>
  );
}

export default QuestTracker;
