import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { DAILY_STRINGS, type DailyStrings } from '../i18n/daily';
import { LocalGame } from '../screens/LocalGame';
import { AvatarImg } from '../components/AvatarImg';
import { AvatarFrame } from '../cosmetics/AvatarFrame';
import { RoleBadge } from '../components/RoleBadge';
import { QuestToasts } from '../campaign/QuestToasts';
import { track } from '../analytics';
import { sfx } from '../sound';
import { InviteCard, InviteMini } from '../referral/InviteCard';
import { useReferral } from '../referral/store';
import { dailyLink } from '../referral/config';
import { challengeBoardRpc, type BoardRow } from './api';
import { DAILY, REWARDS, SCORE, addDays, challengeNo, dailyScore, nextRigaMidnight, rigaDay } from './config';
import type { DailyOutcome, DailyRun } from './session';
import type { GameState } from '../engine/engine';
import { canvasBlob, drawShareCard, shareImage } from './shareCard';
import {
  claimDailyRewards, dismissClaimed, loadDailyGame, loadDailyTurns, recordDaily, saveDailyGame, setRank, submitDaily, useDailyStore, type LocalEntry,
} from './store';
import { dateLabel, useLeft } from './time';
import './daily.css';

const fmt = (n: number) => Math.round(n || 0).toLocaleString('fr-FR');
const cap = (t: string) => t.charAt(0).toLocaleUpperCase() + t.slice(1);

/* ------------------------------------------------------------------ board data (module cache → instant repaint) */

const boardCache = new Map<string, { rows: BoardRow[]; at: number }>();
function useBoard(day: string, uid: string | null) {
  const [rows, setRows] = useState<BoardRow[] | null>(() => boardCache.get(day)?.rows ?? null);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setErr(false);
    const r = await challengeBoardRpc(day, 50);
    if (r) { boardCache.set(day, { rows: r, at: Date.now() }); setRows(r); } else setErr(true);
    setLoading(false);
  }, [day]);
  useEffect(() => { setRows(boardCache.get(day)?.rows ?? null); void load(); }, [load, uid]); // eslint-disable-line react-hooks/exhaustive-deps
  return { rows, err, loading, reload: load };
}

/* ------------------------------------------------------------------ screen */

type View = { v: 'lobby' } | { v: 'game'; scored: boolean; key: number; resume: GameState | null; turns: number };
interface Shown { scored: boolean; o: DailyOutcome; score: number }

/**
 * /daily — today's challenge: status, countdown, play, leaderboard (today / yesterday), share, invite.
 * Runs LocalGame in daily mode itself (like the Journey), so the game screen stays untouched.
 */
export function Daily({ onExit, onAuth }: { onExit: () => void; onAuth: () => void }) {
  const app = useApp();
  const s = useStrings(DAILY_STRINGS);
  const uid = app.session?.user.id ?? null;
  const [day, setDay] = useState(rigaDay);
  const next = useMemo(() => nextRigaMidnight(), [day]); // eslint-disable-line react-hooks/exhaustive-deps
  const left = useLeft(next, s);
  useEffect(() => { if (left.left <= 0) { const d = rigaDay(); if (d !== day) setDay(d); } }, [left.left, day]);

  const store = useDailyStore();
  const entry = store.entries[day] ?? null;
  const [view, setView] = useState<View>({ v: 'lobby' });
  const [shown, setShown] = useState<Shown | null>(null);
  const [round, setRound] = useState(1);
  /** the bookmark hides while the table shows a round summary (it would sit above it) */
  const [live, setLive] = useState(true);
  const [tab, setTab] = useState<'today' | 'yesterday'>('today');
  const today = useBoard(day, uid);
  const yday = useBoard(addDays(day, -1), uid);
  const ref = useReferral(uid);
  const refCode = ref.info?.code ?? null;
  const no = challengeNo(day);
  const saved = !entry ? loadDailyGame(day) : null;
  const serverMine = today.rows?.find(r => r.is_me) ?? null;
  const played = !!entry || !!serverMine;

  useEffect(() => { track('daily_open', { day, played }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // a guest who just signed in: send the stored score; closed days pay their rank rewards
  useEffect(() => {
    if (!uid) return;
    void claimDailyRewards(uid);
    if (entry && !entry.submitted && !entry.rejected) void submitDaily(day).then(() => today.reload());
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (serverMine && entry) setRank(day, serverMine.rank, serverMine.total); }, [serverMine?.rank, serverMine?.total]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = (scored: boolean) => {
    sfx.whoosh(0.8);
    setShown(null); setRound(1); setLive(true);
    track('daily_start', { day, scored, resume: scored && !!saved });
    setView({ v: 'game', scored, key: Date.now(), resume: scored ? loadDailyGame(day) : null, turns: scored ? loadDailyTurns(day) : 0 });
  };

  const onEnd = (scored: boolean) => (o: DailyOutcome) => {
    const score = dailyScore(o);
    setTimeout(() => setShown({ scored, o, score }), 2400);
    if (scored) void recordDaily({ day, won: o.won, turns: o.turns, points: o.points, roundsWon: o.roundsWon, rounds: o.rounds, queens: o.queens }, !!uid)
      .then(() => today.reload());
    else track('daily_practice_done', { day, score });
  };

  const run: DailyRun | undefined = view.v === 'game' ? {
    day, scored: view.scored,
    turns: view.turns,
    overlay: <AnimatePresence>{live && <DailyHud key="hud" s={s} round={round} practice={!view.scored} />}</AnimatePresence>,
    onState: (g, turns) => { setRound(Math.min(DAILY.rounds, Math.max(1, g.round))); setLive(g.phase === 'play' || g.phase === 'chooseSuit'); if (view.scored && g.phase !== 'gameOver') saveDailyGame(day, g, turns); },
    onEnd: onEnd(view.scored),
  } : undefined;

  return (
    <div className={`dly ${view.v === 'game' ? 'is-game' : ''}`}>
      <AnimatePresence mode="wait">
        {view.v === 'lobby' && (
          <motion.div key="lobby" className="dly-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03, filter: 'blur(6px)' }} transition={{ duration: 0.3 }}>
            <div className="dly-bg" aria-hidden><i className="g1" /><i className="g2" /></div>
            <div className="dly-scroll">
              <header className="dly-bar">
                <button className="dly-back" onClick={() => { sfx.tap(); onExit(); }} aria-label={s.back}><span aria-hidden>‹</span></button>
                <div className="dly-ttl">
                  <small>{s.no(no)}</small>
                  <h1 className="serif">{s.kicker}</h1>
                </div>
                <span className="dly-timer" title={s.nextIn(left.text)}><ClockIcon /><b>{left.text}</b></span>
                <span className="dly-barsp" aria-hidden />
              </header>

              <main className="dly-main">
                <Hero day={day} lang={app.lang} played={played} />
                <p className="dly-date serif">{cap(dateLabel(day, app.lang))}</p>

                <section className="dly-panel dly-status">
                  {!played ? (
                    <>
                      <div className="dly-same"><span className="ddot" aria-hidden />{s.same}</div>
                      <p className="dly-intro">{s.intro}</p>
                      <div className="dly-format">{s.format.split(' · ').map(x => <span key={x}>{x}</span>)}</div>
                      <motion.button className="btn acc big dly-play" onClick={() => start(true)} whileTap={{ scale: 0.97 }}>
                        <span className="suitspin" aria-hidden>♠</span>
                        <span>{saved ? s.resume : s.play}</span>
                        <span className="arr" aria-hidden>→</span>
                      </motion.button>
                    </>
                  ) : (
                    <Played s={s} entry={entry} server={serverMine} signedIn={!!uid} online={app.online}
                      onAuth={onAuth} onPractice={() => start(false)}
                      onShare={() => (entry ? shareResult(entry) : serverMine ? shareResult({ score: serverMine.score, won: serverMine.won, turns: serverMine.turns, points: 0, queens: 0, rank: serverMine.rank, total: serverMine.total }) : undefined)} />
                  )}
                  <div className="dly-next"><ClockIcon /> {s.nextIn(left.text)}</div>
                </section>

                <Claimed s={s} />

                <ScoringPanel s={s} />

                {yday.rows && yday.rows.length > 0 && <Winners s={s} rows={yday.rows.slice(0, 3)} />}

                <section className="dly-panel dly-boardp">
                  <div className="dly-boardhead">
                    <h2 className="serif">{s.board.title}</h2>
                    <div className="dly-tabs" role="tablist">
                      {(['today', 'yesterday'] as const).map(k => (
                        <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { sfx.tap(); setTab(k); }}>
                          {tab === k && <motion.span layoutId="dly-tab" className="pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                          <b>{s.board[k]}</b>
                        </button>
                      ))}
                    </div>
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={tab} initial={{ opacity: 0, x: tab === 'today' ? -16 : 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Board s={s} b={tab === 'today' ? today : yday} empty={tab === 'today' ? s.board.empty : s.board.emptyYesterday} />
                    </motion.div>
                  </AnimatePresence>
                  {!uid && app.online && (
                    <div className="dly-guest">
                      <span className="seal" aria-hidden>♠</span>
                      <div><b>{s.guest.title}</b><small>{s.guest.sub}</small></div>
                      <button className="btn acc sm" onClick={onAuth}>{s.signIn}</button>
                    </div>
                  )}
                </section>

                {uid && <InviteCard compact />}
              </main>
            </div>
          </motion.div>
        )}
        {view.v === 'game' && run && (
          <motion.div key={'g' + view.key} className="dly-game" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <LocalGame resume={view.resume} daily={run} onExit={() => { setShown(null); setView({ v: 'lobby' }); }} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shown && (
          <ResultView key="res" s={s} shown={shown} day={day} entry={shown.scored ? entry : null} signedIn={!!uid} online={app.online}
            onAuth={onAuth}
            onShare={() => shareResult(shown.scored && entry ? entry : { score: shown.score, won: shown.o.won, turns: shown.o.turns, points: shown.o.points, queens: shown.o.queens, practice: !shown.scored })}
            onPractice={() => start(false)}
            onDone={() => { setShown(null); setView({ v: 'lobby' }); }} />
        )}
      </AnimatePresence>
      {view.v === 'lobby' && <QuestToasts />}
      <ShareToast />
    </div>
  );

  async function shareResult(d: { score: number; won: boolean; turns: number; points: number; queens: number; rank?: number | null; total?: number | null; practice?: boolean }) {
    if (shareBusy) return;
    shareBusy = true;
    emitShare(s.share.preparing);
    try {
      const cv = await drawShareCard({
        score: d.score, no, dateLabel: dateLabel(day, app.lang, { day: 'numeric', month: 'long', year: 'numeric' }), won: d.won, points: d.points, turns: d.turns, queens: d.queens,
        rank: d.practice ? null : d.rank, total: d.practice ? null : d.total, name: app.name || undefined, practice: d.practice,
        url: 'bridge125.com/daily', labels: { ...s.card, practice: s.practiceTag },
      });
      const blob = await canvasBlob(cv);
      if (!blob) { emitShare(null); return; }
      const how = await shareImage(blob, { title: `Bridge 125 · ${s.kicker}`, text: s.share.text(d.score, no), url: dailyLink(refCode), filename: `bridge125-daily-${day}.png` });
      track('daily_share', { day, how, practice: !!d.practice });
      emitShare(how === 'saved' ? `${s.share.saved} · ${s.share.copied}` : null);
    } catch { emitShare(null); } finally { shareBusy = false; }
  }
}

/* ------------------------------------------------------------------ share toast (module-level so shareResult can use it) */
let shareBusy = false;
const shareSubs = new Set<(m: string | null) => void>();
const emitShare = (m: string | null) => shareSubs.forEach(f => f(m));
function ShareToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let tm: ReturnType<typeof setTimeout> | undefined;
    const f = (m: string | null) => { setMsg(m); clearTimeout(tm); if (m) tm = setTimeout(() => setMsg(null), 2600); };
    shareSubs.add(f);
    return () => { shareSubs.delete(f); clearTimeout(tm); };
  }, []);
  return (
    <AnimatePresence>
      {msg && <motion.div className="dly-toast" role="status" initial={{ y: 30, opacity: 0, x: '-50%' }} animate={{ y: 0, opacity: 1, x: '-50%' }} exit={{ y: 30, opacity: 0, x: '-50%' }}>{msg}</motion.div>}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ pieces */

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
);

/** Brass seal with today's date over three fanned card backs; tilts with the pointer / device. */
function Hero({ day, lang, played }: { day: string; lang: string; played: boolean }) {
  const rx = useMotionValue(0), ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 120, damping: 14 }), sy = useSpring(ry, { stiffness: 120, damping: 14 });
  const rotY = useTransform(sx, [-1, 1], [-14, 14]), rotX = useTransform(sy, [-1, 1], [10, -10]);
  const shine = useTransform(sx, [-1, 1], ['20%', '80%']);
  const back = useTransform(sx, [-1, 1], [10, -10]);
  useEffect(() => {
    const mv = (e: PointerEvent) => { if (e.pointerType === 'touch') return; rx.set((e.clientX / innerWidth) * 2 - 1); ry.set((e.clientY / innerHeight) * 2 - 1); };
    const or = (e: DeviceOrientationEvent) => { if (e.gamma == null || e.beta == null) return; rx.set(Math.max(-1, Math.min(1, e.gamma / 25))); ry.set(Math.max(-1, Math.min(1, (e.beta - 45) / 25))); };
    addEventListener('pointermove', mv); addEventListener('deviceorientation', or);
    let raf = 0; const t0 = performance.now();
    const idle = (t: number) => { if (!matchMedia('(hover: hover)').matches) { rx.set(Math.sin((t - t0) / 2400) * 0.5); ry.set(Math.cos((t - t0) / 3100) * 0.3); } raf = requestAnimationFrame(idle); };
    raf = requestAnimationFrame(idle);
    return () => { removeEventListener('pointermove', mv); removeEventListener('deviceorientation', or); cancelAnimationFrame(raf); };
  }, [rx, ry]);
  const [, , d] = day.split('-').map(Number);
  const mon = dateLabel(day, lang, { month: 'short' }).replace('.', '');
  return (
    <div className="dly-hero" aria-hidden>
      <motion.div className="fan" style={{ x: back }}>
        {[-2, -1, 0, 1, 2].map(i => (
          <motion.i key={i} className="cb" initial={{ rotate: 0, y: 30, opacity: 0 }} animate={{ rotate: i * 13, y: Math.abs(i) * 7, opacity: 1 }}
            transition={{ delay: 0.15 + (2 - Math.abs(i)) * 0.06, type: 'spring', stiffness: 160, damping: 16 }} />
        ))}
      </motion.div>
      <motion.div className={`seal ${played ? 'done' : ''}`} style={{ rotateX: rotX, rotateY: rotY }}
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 14 }}>
        <span className="ring" />
        <span className="sface">
          <small>{mon}</small>
          <b className="serif">{d}</b>
          <em>{played ? '✓' : '♠'}</em>
        </span>
        <motion.span className="gloss" style={{ left: shine }} />
      </motion.div>
      <Motes />
    </div>
  );
}

function Motes() {
  const m = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ l: (i * 37) % 100, t: (i * 53) % 100, s: 2 + (i % 3), d: 7 + (i % 5) * 2, dl: -i * 1.3 })), []);
  return <div className="motes">{m.map((x, i) => <i key={i} style={{ left: `${x.l}%`, top: `${x.t}%`, width: x.s, height: x.s, animationDuration: `${x.d}s`, animationDelay: `${x.dl}s` }} />)}</div>;
}

function Played({ s, entry, server, signedIn, online, onAuth, onPractice, onShare }: {
  s: DailyStrings; entry: LocalEntry | null; server: BoardRow | null; signedIn: boolean; online: boolean;
  onAuth: () => void; onPractice: () => void; onShare: () => void;
}) {
  const score = entry?.score ?? server?.score ?? 0;
  const rank = server?.rank ?? entry?.rank ?? null;
  const total = server?.total ?? entry?.total ?? null;
  const won = entry?.won ?? server?.won ?? false;
  return (
    <>
      <div className="dly-same done"><span className="ddot" aria-hidden />{s.played}</div>
      <div className="dly-score">
        <small>{s.yourScore}</small>
        <b className="serif"><CountUp to={score} /></b>
        <span className={`tag ${won ? 'won' : 'lost'}`}>{won ? s.stats.won : s.stats.lost}</span>
      </div>
      {rank && total ? (
        <div className="dly-rank"><span>{s.yourRank}</span><b>{s.rankOf(rank, total)}</b></div>
      ) : !signedIn && online ? (
        <button className="dly-rank guest" onClick={onAuth}><span>{s.guest.title}</span><b>{s.signIn} ›</b></button>
      ) : null}
      {entry && (
        <div className="dly-chips">
          <span><b>{fmt(entry.points)}</b>{s.stats.points}</span>
          <span><b>{fmt(entry.turns)}</b>{s.stats.turns}</span>
          <span><b>{fmt(entry.roundsWon)}</b>{s.stats.rounds}</span>
          <span><b>{fmt(entry.queens)}</b>{s.stats.queens}</span>
        </div>
      )}
      <div className="dly-actions">
        <motion.button className="btn acc dly-share" onClick={() => { sfx.tap(); onShare(); }} whileTap={{ scale: 0.97 }}><ShareIcon />{s.share.button}</motion.button>
        <button className="btn ghost" onClick={() => { sfx.tap(); onPractice(); }}>{s.practice}</button>
      </div>
    </>
  );
}

export const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 12.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
);

function CountUp({ to, dur = 1100 }: { to: number; dur?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => { const k = Math.min(1, (t - t0) / dur); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to, dur]);
  return <>{fmt(v)}</>;
}

function ScoringPanel({ s }: { s: DailyStrings }) {
  const [open, setOpen] = useState(false);
  const rows: [string, string][] = [
    [s.how.base, `${fmt(SCORE.base)}`], [s.how.win, `+${SCORE.win}`], [s.how.round, `+${SCORE.round}`],
    [s.how.point, `−${SCORE.point}`], [s.how.turn, `−${SCORE.turn}`], [s.how.queen, `−${SCORE.queen}`],
  ];
  return (
    <section className="dly-panel dly-how">
      <button className="dly-howhead" onClick={() => { sfx.tap(); setOpen(o => !o); }} aria-expanded={open}>
        <span className="serif">{s.how.title}</span>
        <span className="rw">
          <i title={s.rewards.play}><em className="coin" />{fmt(REWARDS.play.bm)}</i>
          <i title={s.rewards.top1}>♛ {fmt(REWARDS.top1.bm)}</i>
        </span>
        <motion.span className="chev" animate={{ rotate: open ? 90 : 0 }} aria-hidden>›</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <ul className="dly-formula">
              {rows.map(([l, v]) => <li key={l}><span>{l}</span><b className={v.startsWith('−') ? 'neg' : v.startsWith('+') ? 'pos' : ''}>{v}</b></li>)}
              <li className="floor"><span>{s.how.floor}</span></li>
            </ul>
            <div className="dly-rewards">
              <div className="label">{s.rewards.title}</div>
              <div className="grid">
                {([['play', s.rewards.play], ['top10pct', s.rewards.top10pct], ['top10', s.rewards.top10], ['top1', s.rewards.top1]] as const).map(([k, l]) => (
                  <span key={k} className={`rwd r-${k}`}><small>{l}</small><b><em className="coin" />{fmt(REWARDS[k].bm)}</b><i>+{REWARDS[k].xp} XP</i></span>
                ))}
              </div>
              <p className="note">{s.rewards.note}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Claimed({ s }: { s: DailyStrings }) {
  const st = useDailyStore();
  const c = st.claimed[st.claimed.length - 1];
  return (
    <AnimatePresence>
      {c && (
        <motion.button className="dly-claimed" onClick={dismissClaimed} initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <span className="medal" aria-hidden>{c.rank}</span>
          <span>{s.claimed(c.rank)}</span>
          <b><em className="coin" />+{fmt(c.bm)}</b>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

const MEDAL = ['#F3DE9C', '#D9DEE6', '#E0A878'];

function Winners({ s, rows }: { s: DailyStrings; rows: BoardRow[] }) {
  return (
    <section className="dly-winners">
      <div className="label">{s.winners}</div>
      <div className="row">
        {rows.map((r, i) => (
          <motion.div key={r.rank} className="w" style={{ ['--medal' as string]: MEDAL[r.rank - 1] }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}>
            <span className="av"><AvatarFrame id={r.frame || 'fr_brass'} size={40}><AvatarImg url={r.avatar_url} emoji={r.avatar} name={r.username} size={40} /></AvatarFrame><i>{r.rank}</i></span>
            <span className="nm">{r.username}</span>
            <b>{fmt(r.score)}</b>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Board({ s, b, empty }: { s: DailyStrings; b: ReturnType<typeof useBoard>; empty: string }) {
  const rows = b.rows;
  if (!rows && b.err) return (
    <div className="dly-bstate"><p>{s.board.error}</p><button className="btn ghost sm" onClick={() => void b.reload()}>↻ {s.board.retry}</button></div>
  );
  if (!rows) return <div className="dly-bsk" aria-busy="true">{Array.from({ length: 5 }).map((_, i) => <i key={i} className="shimmerbar" style={{ animationDelay: `${i * 0.08}s` }} />)}</div>;
  if (!rows.length) return <div className="dly-bstate"><span className="ico" aria-hidden>♠</span><p>{empty}</p></div>;
  const total = rows[0]?.total ?? rows.length;
  const top = rows.filter(r => r.rank <= 50);
  const me = rows.find(r => r.is_me && r.rank > 50);
  return (
    <div className="dly-board">
      <div className="dly-count">{s.board.players(total)}</div>
      {top.map((r, i) => <BoardRowView key={r.rank + r.username} r={r} s={s} i={i} />)}
      {me && <><div className="dly-gap" aria-hidden><i /><i /><i /></div><BoardRowView r={me} s={s} i={0} /></>}
    </div>
  );
}

function BoardRowView({ r, s, i }: { r: BoardRow; s: DailyStrings; i: number }) {
  const medal = r.rank <= 3 ? MEDAL[r.rank - 1] : undefined;
  return (
    <motion.div className={`dly-row ${r.is_me ? 'me' : ''} ${medal ? 'top' : ''}`} style={medal ? { ['--medal' as string]: medal } : undefined}
      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + Math.min(i, 12) * 0.035, type: 'spring', stiffness: 300, damping: 26 }}>
      <span className="drk">{medal ? <i>{r.rank}</i> : r.rank}</span>
      <AvatarFrame id={r.frame || 'fr_brass'} size={36}><AvatarImg url={r.avatar_url} emoji={r.avatar} name={r.username} size={36} /></AvatarFrame>
      <span className="dwho">
        <span className="nm"><span>{r.username}</span>{r.is_me && <em>{s.board.you}</em>}{r.role && r.role !== 'player' && <RoleBadge role={r.role as 'admin'} size="xs" />}</span>
        <small>{r.won ? '♛ ' : ''}{s.board.turns(r.turns)}</small>
      </span>
      <b className="sc serif">{fmt(r.score)}</b>
    </motion.div>
  );
}

/** A brass bookmark on the left edge of the table (like the Journey's house-rule tab): opens for a few seconds at every new round. */
function DailyHud({ s, round, practice }: { s: DailyStrings; round: number; practice: boolean }) {
  const [open, setOpen] = useState(true);
  useEffect(() => { setOpen(true); const t = setTimeout(() => setOpen(false), 4200); return () => clearTimeout(t); }, [round]);
  return (
    <motion.button className={`dly-hud ${practice ? 'practice' : ''} ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)} aria-expanded={open}
      aria-label={`${practice ? s.practiceTag : s.hud.title} · ${s.hud.round(round, DAILY.rounds)}`}
      initial={{ x: -80 }} animate={{ x: 0 }} exit={{ x: -90, transition: { duration: 0.2 } }} transition={{ delay: 0.6, type: 'spring', stiffness: 220, damping: 22 }}>
      <span className="dh-seal" aria-hidden><b>{round}</b><small>/{DAILY.rounds}</small></span>
      <AnimatePresence initial={false}>
        {open && (
          <motion.span className="dh-tx" initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.35 }}>
            <small>{practice ? s.practiceTag : s.hud.title}</small>
            <b className="serif">{s.hud.round(round, DAILY.rounds)}</b>
            <span className="pips" aria-hidden>{Array.from({ length: DAILY.rounds }, (_, i) => <i key={i} className={i < round ? 'on' : ''} />)}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ result */

function ResultView({ s, shown, day, entry, signedIn, online, onAuth, onShare, onPractice, onDone }: {
  s: DailyStrings; shown: Shown; day: string; entry: LocalEntry | null; signedIn: boolean; online: boolean;
  onAuth: () => void; onShare: () => void; onPractice: () => void; onDone: () => void;
}) {
  const o = shown.o;
  const app = useApp();
  const score = shown.scored && entry ? entry.score : shown.score;
  const lines: [string, number][] = [
    [s.how.base, SCORE.base],
    ...(o.won ? [[s.how.win, SCORE.win] as [string, number]] : []),
    ...(o.roundsWon ? [[`${s.how.round} ×${o.roundsWon}`, SCORE.round * o.roundsWon] as [string, number]] : []),
    ...(o.points ? [[`${s.how.point} ×${o.points}`, -SCORE.point * o.points] as [string, number]] : []),
    [`${s.how.turn} ×${o.turns}`, -SCORE.turn * o.turns],
    ...(o.queens ? [[`${s.how.queen} ×${o.queens}`, -SCORE.queen * o.queens] as [string, number]] : []),
  ];
  const status = !shown.scored ? s.result.practiceNote
    : !signedIn ? null
    : entry?.rejected ? s.result.rejected
    : entry?.submitted ? s.result.onBoard
    : online ? s.result.sending : s.result.offline;
  useEffect(() => { if (o.won) sfx.good(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [preview, setPreview] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  // a live thumbnail of the share card
  useEffect(() => {
    let dead = false;
    void drawShareCard({
      score, no: challengeNo(day), dateLabel: dateLabel(day, app.lang, { day: 'numeric', month: 'long', year: 'numeric' }), won: o.won, points: o.points, turns: o.turns, queens: o.queens,
      rank: shown.scored ? entry?.rank : null, total: shown.scored ? entry?.total : null, name: app.name || undefined, practice: !shown.scored,
      url: 'bridge125.com/daily', labels: { ...s.card, practice: s.practiceTag },
    }).then(cv => canvasBlob(cv)).then(b => {
      if (dead || !b) return;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(b); setPreview(urlRef.current);
    });
    return () => { dead = true; };
  }, [score, entry?.rank, entry?.total]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  return (
    <motion.div className="dly-res" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="dly-res-scrim" />
      <motion.div className="dly-res-card" initial={{ y: 60, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
        <div className="kick">{shown.scored ? s.result.title : s.result.practiceTitle}</div>
        <h2 className="serif">{o.won ? s.result.won : s.result.lost}</h2>
        <div className="dscore serif"><CountUp to={score} dur={1500} /></div>
        {shown.scored && entry?.rank && entry.total ? <div className="drk">{s.rankOf(entry.rank, entry.total)}</div> : null}
        {status && <div className={`dst ${entry?.submitted ? 'ok' : ''}`}>{entry?.submitted && '✓ '}{status}</div>}
        {shown.scored && !signedIn && online && (
          <button className="dly-rank guest" onClick={onAuth}><span>{s.guest.title}</span><b>{s.signIn} ›</b></button>
        )}
        <details className="brk">
          <summary>{s.result.breakdown}</summary>
          <ul>{lines.map(([l, v]) => <li key={l}><span>{l}</span><b className={l === s.how.base ? '' : v < 0 ? 'neg' : 'pos'}>{v < 0 ? `−${fmt(-v)}` : `${l === s.how.base ? '' : '+'}${fmt(v)}`}</b></li>)}</ul>
        </details>
        <motion.div className="prev" initial={{ rotate: -4, y: 20, opacity: 0 }} animate={{ rotate: -3, y: 0, opacity: preview ? 1 : 0 }} transition={{ delay: 0.5, type: 'spring', stiffness: 160, damping: 16 }}
          onClick={onShare} role="button" aria-label={s.share.button}>
          {preview && <img src={preview} alt="" />}
          <i className="shine" />
        </motion.div>
        <div className="acts">
          <motion.button className="btn acc big" onClick={() => { sfx.tap(); onShare(); }} whileTap={{ scale: 0.97 }}><ShareIcon />{s.share.button}</motion.button>
          <div className="row">
            <button className="btn ghost" onClick={() => { sfx.tap(); onPractice(); }}>{s.result.again}</button>
            <button className="btn ghost" onClick={() => { sfx.tap(); onDone(); }}>{s.result.done}</button>
          </div>
          {signedIn && <InviteMini />}
        </div>
      </motion.div>
    </motion.div>
  );
}

