import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../store';
import { useStrings } from '../../i18n/pick';
import { buzz, sfx } from '../../sound';
import { track } from '../../analytics';
import { reportStart } from '../session';
import type { GameScreenProps } from '../types';
import { gameKey, newGame, solutionAt, type Game } from './core/game';
import { LEVELS, type Level } from './core/grid';
import type { Puzzle } from './core/generator';
import { addDays, dailyNo, dailySeed, msToRigaMidnight, rigaDay } from './core/daily';
import { randomSeed } from './core/rng';
import { puzzleFor } from './gen';
import { dailyStreak, getSaved, saveGame, setPick, useSaved, type Saved } from './store';
import { SUDOKU_STRINGS, type SudokuStrings } from './strings';
import { Play } from './Play';
import { IcBack, IcCheck, IcClock, IcClose, IcFlame, IcPlay } from './icons';
import { fmtLeft, fmtTime } from './time';
import './sudoku.css';

type View = { v: 'lobby' } | { v: 'play'; game: Game; k: number };

/** One prefetched classic seed per level, so "New game" is usually instant. */
const classicSeed: Partial<Record<Level, number>> = {};
function prefetchClassic(level: Level) {
  const seed = classicSeed[level] ?? (classicSeed[level] = randomSeed());
  void puzzleFor(level, seed).catch(() => {});
}

export default function SudokuScreen({ onExit, onAuth }: GameScreenProps) {
  const s = useStrings(SUDOKU_STRINGS);
  const [view, setView] = useState<View>({ v: 'lobby' });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => { track('minigame_open', { game: 'sudoku' }); }, []);

  const open = useCallback((game: Game) => { setView({ v: 'play', game, k: Date.now() }); }, []);

  const load = useCallback(async (make: () => Promise<Game>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setFailed(false);
    try {
      const g = await make();
      saveGame(g);
      open(g);
      sfx.shuffle(); buzz(12);
    } catch { setFailed(true); }
    finally { busyRef.current = false; setBusy(false); }
  }, [open]);

  const startDaily = useCallback((level: Level) => {
    const day = rigaDay();
    const cur = getSaved().games[gameKey('daily', level, day)];
    if (cur) { sfx.whoosh(0.6); open(cur); return; }
    void load(async () => {
      const p = await puzzleFor(level, dailySeed(day, level));
      reportStart('sudoku', { level, daily: true });
      return newGame(p, 'daily', day);
    });
  }, [load, open]);

  const startClassic = useCallback((level: Level) => {
    setPick(level);
    void load(async () => {
      const seed = classicSeed[level] ?? randomSeed();
      delete classicSeed[level];
      const p = await puzzleFor(level, seed);
      reportStart('sudoku', { level, daily: false });
      setTimeout(() => prefetchClassic(level), 1500);
      return newGame(p, 'classic');
    });
  }, [load]);

  const restart = useCallback((g: Game) => {
    const p: Puzzle = { puzzle: g.puzzle, solution: g.solution, level: g.level, seed: g.seed, givens: 0, tier: 0, attempts: 0 };
    const fresh = newGame(p, 'classic');
    saveGame(fresh);
    reportStart('sudoku', { level: g.level, daily: false, restart: true });
    open(fresh);
  }, [open]);

  return (
    <div className="sdk">
      <div className="sdk-bg" aria-hidden><i className="g1" /><i className="g2" /></div>
      <AnimatePresence mode="wait">
        {view.v === 'lobby' ? (
          <motion.div key="lobby" className="sdk-view" initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(6px)' }} transition={{ duration: 0.28 }}>
            <Lobby s={s} onExit={onExit} onDaily={startDaily} onClassic={startClassic} onResume={k => { const g = getSaved().games[k]; if (g) { sfx.whoosh(0.6); open(g); } }} />
          </motion.div>
        ) : (
          <motion.div key={'play' + view.k} className="sdk-view" initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
            <Play initial={view.game} onLobby={() => setView({ v: 'lobby' })} onNext={startClassic} onRestart={restart} onAuth={onAuth} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(busy || failed) && (
          <motion.div className="sdk-busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => failed && setFailed(false)}>
            <div className="sdk-busycard">
              {failed ? <IcClose /> : <Shuffler />}
              <b className="serif">{failed ? '—' : s.generating}</b>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Nine tiles flipping through digits while a grid is generated. */
function Shuffler() {
  const [t, setT] = useState(0);
  useEffect(() => { const i = setInterval(() => setT(x => x + 1), 110); return () => clearInterval(i); }, []);
  return (
    <div className="sdk-shuffler" aria-hidden>
      {Array.from({ length: 9 }, (_, i) => <span key={i} className={(t + i) % 4 === 0 ? 'on' : ''}>{((t * 7 + i * 4) % 9) + 1}</span>)}
    </div>
  );
}

/* ================================================================ lobby */

function Lobby({ s, onExit, onDaily, onClassic, onResume }: {
  s: SudokuStrings; onExit: () => void; onDaily: (l: Level) => void; onClassic: (l: Level) => void; onResume: (key: string) => void;
}) {
  const app = useApp();
  const saved = useSaved();
  const [day, setDay] = useState(rigaDay);
  const [left, setLeft] = useState(() => msToRigaMidnight());
  const [preview, setPreview] = useState<string | null>(null);
  const [pick, setPickState] = useState<Level>(saved.pick);
  const streak = dailyStreak(saved, day);

  useEffect(() => {
    const t = setInterval(() => { setLeft(msToRigaMidnight()); const d = rigaDay(); if (d !== day) setDay(d); }, 20_000);
    return () => clearInterval(t);
  }, [day]);

  // warm up today's dailies (the worker queues them) and one free-play grid of the picked level
  useEffect(() => {
    let alive = true;
    puzzleFor('medium', dailySeed(day, 'medium')).then(p => { if (alive) setPreview(p.puzzle); }).catch(() => {});
    for (const l of LEVELS) if (l !== 'medium') void puzzleFor(l, dailySeed(day, l)).catch(() => {});
    prefetchClassic(saved.pick);
    return () => { alive = false; };
  }, [day]); // eslint-disable-line react-hooks/exhaustive-deps

  const last = saved.last ? saved.games[saved.last] : null;
  const lastOk = last && last.status === 'play' && (last.mode === 'classic' || last.day === day || last.day === addDays(day, -1)) ? last : null;
  const classicSaved = saved.games[gameKey('classic', pick)];
  const no = dailyNo(day);
  const dateText = useMemo(() => {
    const [y, m, d] = day.split('-').map(Number);
    try { return new Intl.DateTimeFormat(app.lang === 'uk' ? 'uk-UA' : app.lang, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d))); } catch { return day; }
  }, [day, app.lang]);

  return (
    <div className="sdk-lobby">
      <header className="sdk-bar">
        <button type="button" className="sdk-ib" onClick={() => { sfx.tap(); onExit(); }} aria-label={s.back} title={s.back}><IcBack /></button>
        <div className="sdk-ttl big"><b className="serif">{s.title}</b></div>
        <span className={`sdk-streak ${streak ? 'on' : ''}`} title={streak ? s.streak(streak) : s.streakNone}><IcFlame /><b>{streak}</b></span>
      </header>

      <div className="sdk-lobbymain">
        <div className="sdk-herocol">
          <HeroBoard puzzle={preview} />
          <p className="sdk-tagline">{s.tagline}</p>
        </div>

        <div className="sdk-cards">
          <motion.section className="sdk-card daily" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 28 }}>
            <div className="sdk-cardhead">
              <div>
                <small>{s.dailyNo(no)} · {cap(dateText)}</small>
                <h2 className="serif">{s.daily}</h2>
              </div>
            </div>
            <p className="sdk-cardsub">{s.dailySub}</p>
            <div className="sdk-levels">
              {LEVELS.map((l, i) => <DailyTile key={l} s={s} level={l} idx={i} day={day} saved={saved} onClick={() => { sfx.tap(); onDaily(l); }} />)}
            </div>
            <div className="sdk-cardfoot">
              <p className={`sdk-streakline ${streak ? 'on' : ''}`}><IcFlame /> {streak ? s.streak(streak) : s.streakNone}</p>
              <span className="sdk-left"><IcClock /> {s.nextIn(fmtLeft(left, s.units))}</span>
            </div>
          </motion.section>

          {lastOk && (
            <motion.button type="button" className="sdk-card cont" onClick={() => onResume(lastOk.key)}
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 28 }}
              whileTap={{ scale: 0.98 }}>
              <Progress g={lastOk} />
              <div className="sdk-conttext">
                <small>{lastOk.mode === 'daily' ? `${s.daily} · ${s.dailyNo(dailyNo(lastOk.day!))}` : s.classic}</small>
                <b className="serif">{s.levels[lastOk.level]}</b>
                <span><IcClock /> {fmtTime(lastOk.ms / 1000)}</span>
              </div>
              <span className="sdk-contgo"><IcPlay /> <em>{s.continue}</em></span>
            </motion.button>
          )}

          <motion.section className="sdk-card classic" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 28 }}>
            <div className="sdk-cardhead">
              <div><small>{s.classicSub}</small><h2 className="serif">{s.classic}</h2></div>
            </div>
            <div className="sdk-seg" role="tablist">
              {LEVELS.map(l => (
                <button type="button" key={l} role="tab" aria-selected={pick === l} className={pick === l ? 'on' : ''}
                  onClick={() => { setPickState(l); setPick(l); prefetchClassic(l); sfx.tap(); }}>
                  {pick === l && <motion.span layoutId="sdk-segpill" className="pill" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
                  <span>{s.levels[l]}</span>
                </button>
              ))}
            </div>
            <div className="sdk-levelinfo">
              <Pips n={LEVELS.indexOf(pick) + 1} />
              <span>{s.levelInfo[pick]}</span>
              <span className="sp" />
              {saved.best[pick] ? <span className="best">{s.best} <b>{fmtTime(saved.best[pick]!)}</b></span> : null}
              {saved.solved[pick] ? <span className="cnt">{s.solvedN(saved.solved[pick]!)}</span> : null}
            </div>
            <div className="sdk-classicbtns">
              {classicSaved && (
                <button type="button" className="btn ghost" onClick={() => onResume(classicSaved.key)}>
                  <IcPlay /> {s.continue} <small className="mono">{fmtTime(classicSaved.ms / 1000)}</small>
                </button>
              )}
              <button type="button" className="btn acc" onClick={() => { sfx.tap(); onClassic(pick); }}>{s.newGame}</button>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}

const cap = (t: string) => t.charAt(0).toLocaleUpperCase() + t.slice(1);

function Pips({ n }: { n: number }) {
  return <span className="sdk-pips" aria-hidden>{[1, 2, 3, 4].map(i => <i key={i} className={i <= n ? 'on' : ''} />)}</span>;
}

function DailyTile({ s, level, idx, day, saved, onClick }: { s: SudokuStrings; level: Level; idx: number; day: string; saved: Saved; onClick: () => void }) {
  const done = saved.dailies[day]?.[level];
  const cur = saved.games[gameKey('daily', level, day)];
  const pct = cur ? progressOf(cur) : 0;
  return (
    <motion.button type="button" className={`sdk-tile ${done ? (done.won ? 'won' : 'lost') : cur ? 'cur' : ''}`} onClick={onClick} disabled={!!done}
      whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }} transition={{ type: 'spring', stiffness: 500, damping: 28 }}>
      <Pips n={idx + 1} />
      <b className="serif">{s.levels[level]}</b>
      {done ? (
        <span className="st">{done.won ? <><IcCheck size={14} /> {fmtTime(done.seconds)}</> : <><IcClose /> {s.failed}</>}</span>
      ) : cur ? (
        <span className="st"><i className="bar"><i style={{ width: `${pct}%` }} /></i>{pct}%</span>
      ) : (
        <span className="st go"><IcPlay size={14} /> {s.play}</span>
      )}
      {done?.won && <span className="score">{done.score.toLocaleString('fr-FR')}</span>}
    </motion.button>
  );
}

function progressOf(g: Game): number {
  let given = 0, ok = 0;
  for (let i = 0; i < 81; i++) {
    if (g.puzzle.charCodeAt(i) !== 46) given++;
    else if (g.values[i] === solutionAt(g, i)) ok++;
  }
  return Math.round((ok / Math.max(1, 81 - given)) * 100);
}

function Progress({ g }: { g: Game }) {
  const p = progressOf(g);
  const r = 22, c = 2 * Math.PI * r;
  return (
    <span className="sdk-ring">
      <svg viewBox="0 0 52 52" width="52" height="52" aria-hidden>
        <circle cx="26" cy="26" r={r} stroke="rgba(255,255,255,.1)" strokeWidth="4" fill="none" />
        <circle cx="26" cy="26" r={r} stroke="url(#sdkring)" strokeWidth="4" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} transform="rotate(-90 26 26)" />
        <defs><linearGradient id="sdkring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--acc-hi)" /><stop offset="1" stopColor="var(--acc)" /></linearGradient></defs>
      </svg>
      <b>{p}%</b>
    </span>
  );
}

/* ================================================================ hero: a tilted 3D slab with today's grid */

const FALLBACK = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';

function HeroBoard({ puzzle }: { puzzle: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 18 }), sy = useSpring(my, { stiffness: 120, damping: 18 });
  const rotY = useTransform(sx, v => -14 + v * 16);
  const rotX = useTransform(sy, v => 34 - v * 14);
  const glare = useTransform(sx, v => `${30 + v * 40}%`);
  const p = puzzle ?? FALLBACK;
  return (
    <div className="sdk-hero" ref={ref}
      onPointerMove={e => { const r = ref.current?.getBoundingClientRect(); if (!r) return; mx.set((e.clientX - r.left) / r.width - 0.5); my.set((e.clientY - r.top) / r.height - 0.5); }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}>
      <div className="sdk-heroglow" aria-hidden />
      <div className="sdk-slabwrap">
      <motion.div className="sdk-slab" style={{ rotateX: rotX, rotateY: rotY, rotateZ: -6 }} aria-hidden>
        <div className="sdk-slabside" />
        <div className="sdk-slabtop">
          {Array.from({ length: 9 }, (_, b) => (
            <div className="b" key={b}>
              {Array.from({ length: 9 }, (_, k) => {
                const i = (Math.floor(b / 3) * 3 + Math.floor(k / 3)) * 9 + (b % 3) * 3 + (k % 3);
                const ch = p[i];
                return <i key={k} className={ch !== '.' && (i * 7) % 11 === 0 ? 'gold' : ''}>{ch === '.' ? '' : ch}</i>;
              })}
            </div>
          ))}
          <motion.span className="glare" style={{ left: glare }} />
        </div>
      </motion.div>
      </div>
      <div className="sdk-floaters" aria-hidden>
        {[4, 7, 1, 9, 2, 6].map((d, i) => <span key={i} className={`f f${i}`}>{d}</span>)}
      </div>
    </div>
  );
}
