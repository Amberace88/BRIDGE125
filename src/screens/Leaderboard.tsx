import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { getSupabase } from '../supabase';
import { useStrings } from '../i18n/pick';
import { LB, type LbStrings } from '../i18n/leaderboard';
import { RoleBadge } from '../components/RoleBadge';
import { AvatarImg } from '../components/AvatarImg';
import { sfx } from '../sound';
import { Sheet } from './Sheets';
import '../styles/leaderboard.css';

/* Leaderboard v2 — RPC leaderboard2(kind, lim) from supabase/migration_007_god.sql.
   Every registered non-banned player is ranked; the caller's own row is always returned (is_me) even beyond `lim`. */

type Kind = 'wins' | 'week' | 'bm' | 'level';
const KINDS: Kind[] = ['wins', 'week', 'bm', 'level'];
const LIM = 50;
const STALE_MS = 60_000;

export interface LbRow {
  rank: number; username: string; wins: number; games_played: number; bm: number; level: number; week_wins: number;
  avatar: string | null; avatar_url: string | null; role: string | null; is_me: boolean;
}
type Load = { rows: LbRow[]; at: number };

const MEDAL = ['#F3DE9C', '#D9DEE6', '#E0A878'];
const fmt = (n: number) => Math.round(n || 0).toLocaleString('fr-FR');
const metricOf = (k: Kind, r: LbRow) => (k === 'wins' ? r.wins : k === 'week' ? r.week_wins : k === 'bm' ? r.bm : r.level);
const pct = (r: LbRow) => (r.games_played ? Math.round((r.wins / r.games_played) * 100) : 0);

/** Module-level cache so re-opening the sheet paints instantly, then refreshes if stale. */
const cache = new Map<Kind, Load>();

function CountUp({ to, dur = 900, delay = 0 }: { to: number; dur?: number; delay?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now() + delay;
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / dur));
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to, dur, delay]);
  return <>{fmt(v)}</>;
}

export function Leaderboard({ onClose, onAuth }: { onClose: () => void; onAuth: () => void }) {
  const app = useApp();
  const { t } = app;
  const s = useStrings(LB);
  const [kind, setKind] = useState<Kind>('wins');
  const [dir, setDir] = useState(1);
  const [data, setData] = useState<Partial<Record<Kind, Load>>>(() => Object.fromEntries(cache));
  const [err, setErr] = useState<Kind | null>(null);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  const load = useCallback(async (k: Kind, force = false) => {
    const c = cache.get(k);
    if (!force && c && Date.now() - c.at < STALE_MS) { setData(d => ({ ...d, [k]: c })); return; }
    const id = ++reqId.current;
    setLoading(true); setErr(e => (e === k ? null : e));
    try {
      const sb = await getSupabase();
      if (!sb) throw new Error('offline');
      const { data: rows, error } = await sb.rpc('leaderboard2', { kind: k, lim: LIM });
      if (error) throw error;
      const v: Load = { rows: ((rows ?? []) as LbRow[]).map(r => ({ ...r, rank: Number(r.rank), bm: Number(r.bm) })), at: Date.now() };
      cache.set(k, v);
      setData(d => ({ ...d, [k]: v }));
    } catch {
      if (id === reqId.current || !cache.get(k)) setErr(k);
    } finally { if (id === reqId.current) setLoading(false); }
  }, []);

  useEffect(() => { void load(kind); }, [kind, load]);
  // a finished game changes the board: drop the cache
  const gp = app.profile?.games_played;
  const firstGp = useRef(gp);
  useEffect(() => { if (gp !== firstGp.current) { firstGp.current = gp; cache.clear(); void load(kind, true); } }, [gp]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (k: Kind) => { if (k === kind) return; sfx.tap(); setDir(KINDS.indexOf(k) > KINDS.indexOf(kind) ? 1 : -1); setKind(k); };
  const refresh = () => { sfx.tap(); void load(kind, true); };

  const cur = data[kind];
  const rows = cur?.rows ?? null;
  const shown = rows?.filter(r => r.rank <= LIM) ?? [];
  const me = rows?.find(r => r.is_me) ?? null;
  const meOutside = !!me && me.rank > LIM;
  const top = [shown.find(r => r.rank === 2), shown.find(r => r.rank === 1), shown.find(r => r.rank === 3)];
  const rest = shown.filter(r => r.rank > 3);
  const anyActive = kind === 'week' ? shown.some(r => r.week_wins > 0) : shown.length > 0;

  // pin "You: #n" at the bottom while my row is not on screen
  const [myEl, setMyEl] = useState<HTMLDivElement | null>(null);
  const [meVisible, setMeVisible] = useState(true);
  useEffect(() => {
    if (!myEl) { setMeVisible(false); return; }
    const io = new IntersectionObserver(([e]) => setMeVisible(e.isIntersecting), { threshold: 0.6 });
    io.observe(myEl); return () => io.disconnect();
  }, [myEl]);

  return (
    <Sheet onClose={onClose}>
      <PullToRefresh s={s} onRefresh={() => load(kind, true)}>
        <div className="lb2">
          <div className="lb2head">
            <div style={{ minWidth: 0 }}>
              <h2 className="serif">{t.lb.title}</h2>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={kind} className="lb2hint" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>{s.hint[kind]}</motion.span>
              </AnimatePresence>
            </div>
            <button className="lb2ref" onClick={refresh} aria-label={s.refresh} title={s.refresh} disabled={loading}>
              <motion.svg viewBox="0 0 24 24" width="18" height="18" animate={{ rotate: loading ? 360 : 0 }} transition={loading ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : { duration: 0.3 }} aria-hidden>
                <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            </button>
          </div>

          <div className="lb2tabs" role="tablist">
            {KINDS.map(k => (
              <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? 'on' : ''} onClick={() => pick(k)}>
                {kind === k && <motion.span layoutId="lb2pill" className="lb2pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <b><i aria-hidden>{k === 'wins' ? '♛' : k === 'week' ? '◷' : k === 'bm' ? '◉' : '★'}</i>{s.tabs[k]}</b>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div key={kind} custom={dir} variants={SLIDE} initial="in" animate="on" exit="out" transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
              {!rows && err !== kind && <Skeleton />}
              {err === kind && !rows && (
                <div className="lb2state err">
                  <div className="lb2icon" aria-hidden>⚠</div>
                  <p>{t.lb.error}</p>
                  <button className="btn ghost sm" onClick={refresh}>↻ {s.retry}</button>
                </div>
              )}
              {rows && !anyActive && (
                <div className="lb2state">
                  <div className="lb2icon" aria-hidden>🏆</div>
                  <p>{kind === 'week' ? s.emptyWeek : t.lb.empty}</p>
                </div>
              )}

              {rows && shown.length > 0 && (
                <>
                  <div className="lb2pod">
                    {top.map((r, i) => r ? <PodiumSpot key={r.rank} r={r} kind={kind} s={s} you={t.lb.you} i={i} myRef={r.is_me ? setMyEl : undefined} />
                      : <div key={'e' + i} />)}
                  </div>
                  {rest.length > 0 && (
                    <div className="lb2list">
                      {rest.map((r, i) => (
                        <Row key={r.rank + r.username} r={r} kind={kind} s={s} you={t.lb.you} games={t.lb.games} i={i} rowRef={r.is_me ? setMyEl : undefined} />
                      ))}
                    </div>
                  )}
                  {meOutside && me && (
                    <>
                      <div className="lb2gap" aria-hidden><i /><i /><i /></div>
                      <div className="lb2list"><Row r={me} kind={kind} s={s} you={t.lb.you} games={t.lb.games} i={0} rowRef={setMyEl} /></div>
                    </>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {!app.session && app.online && (
            <motion.div className="lb2guest" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="lb2gicon" aria-hidden>♠</div>
              <div style={{ flex: 1, minWidth: 0 }}><b>{s.guestTitle}</b><span>{s.guestSub}</span></div>
              <button className="btn acc sm" onClick={onAuth}>{t.lb.signIn}</button>
            </motion.div>
          )}

          <AnimatePresence>
            {me && !meVisible && rows && (
              <motion.div className="lb2pin" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                onClick={() => myEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })} role="button">
                <span className="lb2pinrk">{s.youRank(fmt(me.rank))}</span>
                <AvatarImg url={me.avatar_url} emoji={me.avatar} name={me.username} size={30} />
                <span className="lb2pinnm">{me.username}</span>
                <b className="lb2pinv">{kind === 'bm' && <i className="coin" />}{kind === 'level' ? s.lvl(me.level) : fmt(metricOf(kind, me))}</b>
              </motion.div>
            )}
          </AnimatePresence>

          <button className="btn ghost" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>{t.close}</button>
        </div>
      </PullToRefresh>
    </Sheet>
  );
}

const SLIDE = {
  in: (d: number) => ({ opacity: 0, x: 28 * d }),
  on: { opacity: 1, x: 0 },
  out: (d: number) => ({ opacity: 0, x: -28 * d, transition: { duration: 0.12 } }),
};

function Value({ kind, r, s, delay }: { kind: Kind; r: LbRow; s: LbStrings; delay: number }) {
  if (kind === 'level') return <>{s.lvl(r.level)}</>;
  return <>{kind === 'bm' && <i className="coin" />}<CountUp to={metricOf(kind, r)} delay={delay} /></>;
}

function PodiumSpot({ r, kind, s, you, i, myRef }: { r: LbRow; kind: Kind; s: LbStrings; you: string; i: number; myRef?: React.Ref<HTMLDivElement> }) {
  const c = MEDAL[r.rank - 1];
  const delay = [0.12, 0, 0.24][i];
  return (
    <motion.div ref={myRef} className={`lb2spot p${r.rank} ${r.is_me ? 'me' : ''}`} style={{ ['--medal' as string]: c }}
      initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay, type: 'spring', stiffness: 200, damping: 17 }}>
      {r.rank === 1 && <motion.span className="lb2crown" aria-hidden initial={{ y: -14, opacity: 0, rotate: -20 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 12 }}>♛</motion.span>}
      <div className="lb2face">
        <AvatarImg url={r.avatar_url} emoji={r.avatar} name={r.username} size={r.rank === 1 ? 66 : 54} />
        <i className="lb2medal">{r.rank}</i>
      </div>
      <div className="lb2pname">{r.username}{r.is_me && <em> · {you}</em>}</div>
      {r.role && r.role !== 'player' && <RoleBadge role={r.role} size="xs" />}
      <div className="lb2pval"><b><Value kind={kind} r={r} s={s} delay={delay * 1000 + 250} /></b></div>
      <div className="lb2psub">{kind === 'level' ? `${fmt(r.wins)} ${s.metric.wins}` : kind === 'bm' ? s.lvl(r.level) : r.games_played ? `${pct(r)}% · ${s.lvl(r.level)}` : s.noGames}</div>
      <div className="lb2plinth"><span /></div>
    </motion.div>
  );
}

function Row({ r, kind, s, you, games, i, rowRef }: { r: LbRow; kind: Kind; s: LbStrings; you: string; games: string; i: number; rowRef?: React.Ref<HTMLDivElement> }) {
  const idle = r.games_played === 0;
  const sub = idle ? s.noGames
    : kind === 'week' ? `${fmt(r.wins)} ${s.metric.wins} · ${pct(r)}%`
    : kind === 'level' ? `${fmt(r.wins)} ${s.metric.wins} · ${fmt(r.games_played)} ${games.toLowerCase()}`
    : `${pct(r)}% · ${fmt(r.games_played)} ${games.toLowerCase()}`;
  return (
    <motion.div ref={rowRef} className={`lb2row ${r.is_me ? 'me' : ''} ${idle ? 'idle' : ''}`}
      initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + Math.min(i, 14) * 0.035, type: 'spring', stiffness: 300, damping: 26 }}>
      <span className="lb2rk">{r.rank}</span>
      <AvatarImg url={r.avatar_url} emoji={r.avatar} name={r.username} size={38} />
      <div className="lb2who">
        <div className="lb2nm"><span>{r.username}</span>{r.is_me && !(r.role && r.role !== 'player') && <em>{you}</em>}{r.role && r.role !== 'player' && <RoleBadge role={r.role} size="xs" />}</div>
        <div className="lb2sub">{kind !== 'level' && <span className="lb2lv">{s.lvl(r.level)}</span>}<span>{sub}</span></div>
      </div>
      <b className="lb2v"><Value kind={kind} r={r} s={s} delay={250 + Math.min(i, 14) * 35} /></b>
    </motion.div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true">
      <div className="lb2pod sk">{[0, 1, 2].map(i => <div key={i} className={`lb2skspot p${[2, 1, 3][i]}`}><i className="shimmerbar" /><i className="shimmerbar" /><i className="shimmerbar" /></div>)}</div>
      <div className="lb2list">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="shimmerbar" style={{ height: 58, animationDelay: `${i * 0.08}s` }} />)}</div>
    </div>
  );
}

/** Touch pull-to-refresh inside the sheet (only when the sheet is scrolled to the top). */
function PullToRefresh({ children, onRefresh, s }: { children: React.ReactNode; onRefresh: () => Promise<void>; s: LbStrings }) {
  const box = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const TRIGGER = 50;
  const scroller = () => box.current?.closest('.sheet') as HTMLElement | null;
  return (
    <div ref={box}
      onTouchStart={e => { start.current = (scroller()?.scrollTop ?? 0) <= 0 && !busy ? e.touches[0].clientY : null; }}
      onTouchMove={e => { if (start.current == null) return; const dy = e.touches[0].clientY - start.current; setPull(dy > 0 ? Math.min(110, dy * 0.5) : 0); }}
      onTouchEnd={async () => {
        const go = pull >= TRIGGER; start.current = null;
        if (go) { setBusy(true); setPull(48); sfx.tap(); await onRefresh().catch(() => {}); setBusy(false); }
        setPull(0);
      }}>
      <motion.div className="lb2ptr" animate={{ height: pull, opacity: pull > 8 ? 1 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 36 }} aria-hidden={!busy}>
        <motion.span className="lb2ptrico" animate={busy ? { rotate: 360 } : { rotate: pull * 3 }} transition={busy ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : { duration: 0 }}>↻</motion.span>
        <span>{busy ? s.refresh : pull >= TRIGGER ? s.release : s.pull}</span>
      </motion.div>
      {children}
    </div>
  );
}
