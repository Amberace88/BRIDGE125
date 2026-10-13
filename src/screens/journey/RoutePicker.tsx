import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { PICKABLE_ROUTES, ROUTES, chapterById, routeForLang, type RouteId } from '../../campaign/data';
import { Skyline } from '../../campaign/art';
import type { RouteChange } from '../../campaign/journeyStore';
import type { JourneyStrings } from '../../i18n/journey';
import { sfx } from '../../sound';

interface Props {
  s: JourneyStrings;
  lang: string;
  current: RouteId;
  /** false: the route is fixed (first star won, not an admin) — the picker only shows the routes */
  canChange: boolean;
  privileged: boolean;
  onPick: (r: RouteId) => Promise<RouteChange>;
  onClose: () => void;
}

/** "Where does your night begin?" — every starting city with its eight-room route; the finale is always Monte Carlo. */
export function RoutePicker({ s, lang, current, canChange, privileged, onPick, onClose }: Props) {
  const mine = routeForLang(lang);
  const [busy, setBusy] = useState<RouteId | null>(null);
  const [err, setErr] = useState(false);
  const list = useMemo(() => {
    const home = (r: RouteId) => s.cities[ROUTES[r][0]].name;
    const rest = PICKABLE_ROUTES.filter(r => r !== mine && r !== current).sort((a, b) => home(a).localeCompare(home(b), lang));
    return [...new Set<RouteId>([current, mine, ...rest])];
  }, [s, lang, mine, current]);

  const pick = async (r: RouteId) => {
    if (busy || r === current || !canChange) return;
    sfx.tap(); setBusy(r); setErr(false);
    const res = await onPick(r);
    setBusy(null);
    if (res.ok) { sfx.whoosh(0.7); onClose(); } else setErr(true);
  };

  return (
    <motion.div className="jrp" role="dialog" aria-modal="true" aria-label={s.route.title}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} onClick={onClose}>
      <motion.div className="jrp-in" onClick={e => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}>
        <header className="jrp-head">
          <div>
            <small>{s.route.change}</small>
            <h2 className="serif">{s.route.title}</h2>
            <p>{s.route.sub}</p>
          </div>
          <button className="jrp-x" onClick={onClose} aria-label={s.close}>×</button>
        </header>
        {(privileged || !canChange) && <div className={`jrp-note ${privileged ? 'admin' : ''}`}>{privileged ? s.route.admin : s.route.locked}</div>}
        {err && <div className="jrp-note err">{s.route.error}</div>}
        <ol className="jrp-list">
          {list.map((r, i) => {
            const ids = ROUTES[r];
            const home = chapterById(ids[0])!;
            const isCur = r === current;
            return (
              <motion.li key={r} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + Math.min(i, 10) * 0.035 }}>
                <button className={`jrp-item ${isCur ? 'cur' : ''}`} style={{ ['--glow' as string]: home.glow }} disabled={!isCur && (!canChange || !!busy)} onClick={() => void pick(r)}>
                  <span className="sky" aria-hidden><Skyline city={home.id} layer="far" /></span>
                  <span className="tx">
                    <span className="tags">
                      {isCur && <em className="cur">{s.route.current}</em>}
                      {r === mine && <em>{s.route.suggested}</em>}
                      {r === 'classic' && <em>{s.route.classic}</em>}
                    </span>
                    <b className="serif">{s.cities[home.id].name}</b>
                    <span className="path">
                      {ids.map((id, k) => <span key={id} className={k === 0 ? 'h' : k === ids.length - 1 ? 'f' : ''}>{s.cities[id].name}</span>)}
                    </span>
                  </span>
                  <span className="go">{isCur ? <span className="check" aria-hidden>✓</span> : busy === r ? <span className="spin" aria-hidden /> : canChange ? <>{s.route.start}<i aria-hidden>→</i></> : <span aria-hidden>🔒</span>}</span>
                </button>
              </motion.li>
            );
          })}
        </ol>
      </motion.div>
    </motion.div>
  );
}
