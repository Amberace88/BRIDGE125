import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { DAILY_STRINGS } from '../i18n/daily';
import { sfx } from '../sound';
import { nextRigaMidnight, rigaDay } from './config';
import { claimDailyRewards, loadDailyGame, submitDaily, useDailyStore } from './store';
import { dateLabel, useLeft } from './time';
import './daily-mini.css';

/**
 * Home entry for the Daily challenge: a compact brass card under the quest tracker. Glows until today's deal is
 * played; afterwards shows the score / rank and the time to the next deal. Light on purpose (the screen is lazy).
 */
export function DailyCard({ onOpen, className = '' }: { onOpen: () => void; className?: string }) {
  const app = useApp();
  const s = useStrings(DAILY_STRINGS);
  const [day, setDay] = useState(rigaDay);
  const next = useMemo(() => nextRigaMidnight(), [day]); // eslint-disable-line react-hooks/exhaustive-deps
  const left = useLeft(next, s);
  useEffect(() => { if (left.left <= 0 && rigaDay() !== day) setDay(rigaDay()); }, [left.left, day]);
  const st = useDailyStore();
  const e = st.entries[day] ?? null;
  const saved = !e && !!loadDailyGame(day);
  const uid = app.session?.user.id ?? null;
  // a guest score from earlier today goes on the board once signed in; closed days pay their rank rewards
  useEffect(() => {
    if (!uid) return;
    void claimDailyRewards(uid);
    if (e && !e.submitted && !e.rejected) void submitDaily(day);
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const [, , d] = day.split('-').map(Number);
  const mon = dateLabel(day, app.lang, { month: 'short' }).replace('.', '');
  return (
    <motion.button className={`dcard ${e ? 'done' : 'hot'} ${className}`} onClick={() => { sfx.tap(); onOpen(); }}
      whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} aria-label={s.home.title}>
      <span className="dc-seal" aria-hidden>
        <small>{mon}</small><b className="serif">{d}</b>
        {e && <i className="ok">✓</i>}
      </span>
      <span className="dc-tx">
        <small className="kick">{s.home.title}</small>
        <b>{e ? s.home.done(e.score) : s.home.sub}</b>
        <em>{e?.rank && e.total ? s.home.rank(e.rank, e.total) : s.home.nextIn(left.text)}</em>
      </span>
      {e ? <span className="dc-go" aria-hidden>›</span> : <span className="dc-play">{saved ? s.home.resume : s.home.play}</span>}
      {!e && <span className="dc-sheen" aria-hidden />}
    </motion.button>
  );
}

export default DailyCard;
