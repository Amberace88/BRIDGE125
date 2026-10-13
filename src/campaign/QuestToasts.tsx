import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useStrings } from '../i18n/pick';
import { QUEST_STRINGS } from '../i18n/journey';
import { sfx } from '../sound';
import { dismissQuestToast, useQuests, type QuestToast } from './questStore';
import './quests-mini.css';

/** Only the first mounted layer renders, so it is safe to mount in several screens (LocalGame, Journey, App). */
let mounted = 0;
const owners = new Set<() => void>();
let owner: object | null = null;
const sub = (f: () => void) => { owners.add(f); return () => { owners.delete(f); }; };
const getOwner = () => owner;

function Toast({ t }: { t: QuestToast }) {
  const s = useStrings(QUEST_STRINGS);
  const ready = t.changes.some(c => c.to >= c.goal);
  useEffect(() => {
    const a = setTimeout(() => (ready ? sfx.good() : sfx.coin()), 350);
    const b = setTimeout(() => dismissQuestToast(t.id), ready ? 5600 : 4400);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <motion.button layout className={`qtoast ${ready ? 'ready' : ''}`} onClick={() => dismissQuestToast(t.id)}
      initial={{ y: 40, opacity: 0, scale: 0.92 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
      <span className="qt-kick"><i className="qt-seal" aria-hidden>♠</i>{s.toast}</span>
      {t.changes.slice(0, 3).map(c => (
        <span key={c.kind + c.id} className={`qt-row ${c.to >= c.goal ? 'done' : ''}`}>
          <span className="qt-name">{s.names[c.id] ?? c.id}</span>
          <span className="qt-bar" aria-hidden>
            <i className="from" style={{ width: `${(c.from / c.goal) * 100}%` }} />
            <motion.i className="to" initial={{ width: `${(c.from / c.goal) * 100}%` }} animate={{ width: `${(c.to / c.goal) * 100}%` }} transition={{ delay: 0.35, duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} />
          </span>
          <span className="qt-n">{c.to >= c.goal ? s.ready : `${c.to}/${c.goal}`}</span>
        </span>
      ))}
      <span className="qt-sheen" aria-hidden />
    </motion.button>
  );
}

/** End-of-game "quest progress" toasts (bottom of the screen). */
export function QuestToasts() {
  const q = useQuests();
  const [me] = useState<object>(() => ({}));
  const cur = useSyncExternalStore(sub, getOwner, getOwner);
  useEffect(() => {
    mounted++;
    if (!owner) { owner = me; owners.forEach(f => f()); }
    return () => {
      mounted--;
      if (owner === me) { owner = null; owners.forEach(f => f()); }
    };
  }, [me]);
  useEffect(() => { if (!owner && mounted > 0) { owner = me; owners.forEach(f => f()); } }, [cur, me]);
  if (cur !== me) return null;
  return (
    <div className="qtoasts" aria-live="polite">
      <AnimatePresence initial={false}>
        {q.toasts.map(t => <Toast key={t.id} t={t} />)}
      </AnimatePresence>
    </div>
  );
}
