import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { GAMES_STRINGS, type GamesStrings } from '../i18n/games';
import { LB } from '../i18n/leaderboard';
import { AvatarImg } from '../components/AvatarImg';
import { RoleBadge } from '../components/RoleBadge';
import { Sheet } from '../screens/Sheets';
import { sfx } from '../sound';
import { boardRpc, type BoardKind, type BoardRow } from './api';
import { miniDef } from './rewards';
import type { GameModule } from './types';
import { clock, fmtNum, textOf } from './hub/order';
import '../styles/leaderboard.css';
import './hub/games.css';

/* Per-game leaderboard — RPC minigame_board(game, kind, day, lim) from migration 019, in the Leaderboard sheet's style
   (same lb2 podium + rows). Kinds: all-time best · wins this week · today's daily (games with a daily puzzle). */

const LIM = 50;
const STALE_MS = 60_000;
const MEDAL = ['#F3DE9C', '#D9DEE6', '#E0A878'];
const cache = new Map<string, { rows: BoardRow[]; at: number }>();

/** The number a row is ranked by, as text: a score, a win count, or (games without a score) the time. */
function valueText(kind: BoardKind, r: BoardRow, s: GamesStrings) {
  if (kind === 'week') return { main: fmtNum(r.value), sub: s.board.wins };
  if (r.value == null) return { main: clock(r.seconds), sub: '' };
  return { main: fmtNum(r.value), sub: r.seconds != null ? clock(r.seconds) : '' };
}

export function GameBoard({ m, onClose, onAuth, initialKind = 'best' }: { m: GameModule; onClose: () => void; onAuth: () => void; initialKind?: BoardKind }) {
  const app = useApp();
  const s = useStrings(GAMES_STRINGS);
  const lvl = useStrings(LB).lvl;
  const daily = !!(m.daily ?? miniDef(m.id)?.hasDaily);
  const kinds: BoardKind[] = daily ? ['best', 'week', 'daily'] : ['best', 'week'];
  const [kind, setKind] = useState<BoardKind>(kinds.includes(initialKind) ? initialKind : 'best');
  const [dir, setDir] = useState(1);
  const [rows, setRows] = useState<BoardRow[] | null>(() => cache.get(`${m.id}:${kind}`)?.rows ?? null);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const req = useRef(0);
  const E = m.Emblem;

  const load = useCallback(async (k: BoardKind, force = false) => {
    const key = `${m.id}:${k}`;
    const c = cache.get(key);
    if (c) setRows(c.rows); else setRows(null);
    if (!force && c && Date.now() - c.at < STALE_MS) return;
    const id = ++req.current;
    setLoading(true); setErr(false);
    try {
      const r = await boardRpc(m.id, k, null, LIM);
      cache.set(key, { rows: r, at: Date.now() });
      if (id === req.current) setRows(r);
    } catch { if (id === req.current && !c) setErr(true); }
    finally { if (id === req.current) setLoading(false); }
  }, [m.id]);

  useEffect(() => { void load(kind); }, [kind, load]);

  const pick = (k: BoardKind) => { if (k === kind) return; sfx.tap(); setDir(kinds.indexOf(k) > kinds.indexOf(kind) ? 1 : -1); setKind(k); };
  const shown = rows?.filter(r => r.rank <= LIM) ?? [];
  const me = rows?.find(r => r.is_me) ?? null;
  const top = [shown.find(r => r.rank === 2), shown.find(r => r.rank === 1), shown.find(r => r.rank === 3)];
  const rest = shown.filter(r => r.rank > 3);

  return (
    <Sheet onClose={onClose}>
      <div className="lb2 gb">
        <div className="lb2head">
          <span className="gb-emblem" aria-hidden><E size={30} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className="serif">{textOf(m.title, app.lang)}</h2>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={kind} className="lb2hint" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>{s.board.hint[kind]}</motion.span>
            </AnimatePresence>
          </div>
          <button className="lb2ref" onClick={() => { sfx.tap(); void load(kind, true); }} aria-label={s.board.retry} disabled={loading}>
            <motion.svg viewBox="0 0 24 24" width="18" height="18" animate={{ rotate: loading ? 360 : 0 }} transition={loading ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : { duration: 0.3 }} aria-hidden>
              <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          </button>
        </div>

        <div className="lb2tabs" role="tablist">
          {kinds.map(k => (
            <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? 'on' : ''} onClick={() => pick(k)}>
              {kind === k && <motion.span layoutId="gbpill" className="lb2pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <b><i aria-hidden>{k === 'best' ? '♛' : k === 'week' ? '◷' : '☀'}</i>{s.board.tabs[k]}</b>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div key={kind} custom={dir} variants={SLIDE} initial="in" animate="on" exit="out" transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
            {!rows && !err && (
              <div aria-busy="true">
                <div className="lb2pod sk">{[0, 1, 2].map(i => <div key={i} className={`lb2skspot p${[2, 1, 3][i]}`}><i className="shimmerbar" /><i className="shimmerbar" /><i className="shimmerbar" /></div>)}</div>
                <div className="lb2list">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmerbar" style={{ height: 58, animationDelay: `${i * 0.08}s` }} />)}</div>
              </div>
            )}
            {err && !rows && (
              <div className="lb2state err">
                <div className="lb2icon" aria-hidden>⚠</div>
                <p>{s.board.error}</p>
                <button className="btn ghost sm" onClick={() => void load(kind, true)}>↻ {s.board.retry}</button>
              </div>
            )}
            {rows && shown.length === 0 && (
              <div className="lb2state">
                <div className="lb2icon" aria-hidden>{kind === 'daily' ? '☀' : '🏆'}</div>
                <p>{kind === 'daily' ? s.board.emptyDaily : s.board.empty}</p>
              </div>
            )}
            {rows && shown.length > 0 && (
              <>
                <div className="lb2pod">
                  {top.map((r, i) => r ? <Podium key={r.rank} r={r} i={i} kind={kind} s={s} /> : <div key={'e' + i} />)}
                </div>
                {rest.length > 0 && <div className="lb2list">{rest.map((r, i) => <Row key={r.rank + r.username} r={r} i={i} kind={kind} s={s} lvl={lvl} />)}</div>}
                {me && me.rank > LIM && (
                  <>
                    <div className="lb2gap" aria-hidden><i /><i /><i /></div>
                    <div className="lb2list"><Row r={me} i={0} kind={kind} s={s} lvl={lvl} /></div>
                  </>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {!app.session && app.online && (
          <div className="lb2guest">
            <div className="lb2gicon" aria-hidden>♠</div>
            <div style={{ flex: 1, minWidth: 0 }}><b>{s.board.guest}</b><span>{s.guest.sub}</span></div>
            <button className="btn acc sm" onClick={onAuth}>{s.guest.signIn}</button>
          </div>
        )}
        <button className="btn ghost" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>{s.close}</button>
      </div>
    </Sheet>
  );
}

const SLIDE = {
  in: (d: number) => ({ opacity: 0, x: 28 * d }),
  on: { opacity: 1, x: 0 },
  out: (d: number) => ({ opacity: 0, x: -28 * d, transition: { duration: 0.12 } }),
};

function Podium({ r, i, kind, s }: { r: BoardRow; i: number; kind: BoardKind; s: GamesStrings }) {
  const delay = [0.12, 0, 0.24][i];
  const v = valueText(kind, r, s);
  return (
    <motion.div className={`lb2spot p${r.rank} ${r.is_me ? 'me' : ''}`} style={{ ['--medal' as string]: MEDAL[r.rank - 1] }}
      initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay, type: 'spring', stiffness: 200, damping: 17 }}>
      {r.rank === 1 && <motion.span className="lb2crown" aria-hidden initial={{ y: -14, opacity: 0, rotate: -20 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 12 }}>♛</motion.span>}
      <div className="lb2face">
        <AvatarImg url={r.avatar_url} emoji={r.avatar} name={r.username} size={r.rank === 1 ? 66 : 54} />
        <i className="lb2medal">{r.rank}</i>
      </div>
      <div className="lb2pname">{r.username}{r.is_me && <em> · {s.board.you}</em>}</div>
      {r.role && r.role !== 'player' && <RoleBadge role={r.role} size="xs" />}
      <div className="lb2pval"><b>{v.main}</b></div>
      <div className="lb2psub">{v.sub || ' '}</div>
      <div className="lb2plinth"><span /></div>
    </motion.div>
  );
}

function Row({ r, i, kind, s, lvl }: { r: BoardRow; i: number; kind: BoardKind; s: GamesStrings; lvl: (n: number) => string }) {
  const v = valueText(kind, r, s);
  return (
    <motion.div className={`lb2row ${r.is_me ? 'me' : ''}`}
      initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + Math.min(i, 14) * 0.035, type: 'spring', stiffness: 300, damping: 26 }}>
      <span className="lb2rk">{r.rank}</span>
      <AvatarImg url={r.avatar_url} emoji={r.avatar} name={r.username} size={38} />
      <div className="lb2who">
        <div className="lb2nm"><span>{r.username}</span>{r.is_me && <em>{s.board.you}</em>}{r.role && r.role !== 'player' && <RoleBadge role={r.role} size="xs" />}</div>
        <div className="lb2sub"><span className="lb2lv">{lvl(r.level)}</span>{v.sub && <span>{v.sub}</span>}</div>
      </div>
      <b className="lb2v">{v.main}</b>
    </motion.div>
  );
}
