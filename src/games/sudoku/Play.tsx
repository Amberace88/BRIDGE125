import { AnimatePresence, motion, animate } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { useApp } from '../../store';
import { useStrings } from '../../i18n/pick';
import { buzz, sfx } from '../../sound';
import { useCosmetics } from '../../cosmetics/useCosmetics';
import { VictoryEffect } from '../../cosmetics/VictoryEffect';
import { reportGame } from '../session';
import {
  MISTAKE_LIMIT, addHint, digitCounts, enter, erase, fillNotes, patchCell, redo, reveal, toggleNote, undo,
  type Events, type Game,
} from './core/game';
import { UNITS, colOf, rowOf, type Level } from './core/grid';
import { scoreOf } from './core/score';
import { dailyNo } from './core/daily';
import { Board, type Fx, type Marks } from './Board';
import { describe, findHint, hintMarks, type Hint } from './hint';
import { dailyStreak, getSaved, recordFinished, saveGame, setSettings, useSaved, dropGame } from './store';
import { SUDOKU_STRINGS, type SudokuStrings } from './strings';
import { IcBack, IcCheck, IcClock, IcClose, IcErase, IcFlag, IcFlame, IcGear, IcGrid, IcHint, IcNotes, IcPause, IcPlay, IcRedo, IcRestart, IcSpark, IcUndo } from './icons';
import { fmtTime } from './time';

interface End {
  won: boolean; seconds: number; score: number; newBest: boolean; perfect: boolean; streak: number;
  reward: number | null; sent: boolean;
}

interface Props {
  initial: Game;
  onLobby: () => void;
  onNext: (level: Level) => void;
  onRestart: (g: Game) => void;
  onAuth: () => void;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function Play({ initial, onLobby, onNext, onRestart, onAuth }: Props) {
  const s = useStrings(SUDOKU_STRINGS);
  const app = useApp();
  const st = useSaved().settings;
  const cos = useCosmetics();
  const [g, setG] = useState(initial);
  const gRef = useRef(g);
  const msRef = useRef(initial.ms);
  const [sel, setSel] = useState(() => Math.max(0, initial.values.findIndex(v => v === 0)));
  const selRef = useRef(sel);
  useEffect(() => { selRef.current = sel; }, [sel]);
  const [notes, setNotes] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hint, setHint] = useState<Hint | null>(null);
  const [fx, setFx] = useState<Fx | null>(null);
  const [shake, setShake] = useState<{ cell: number; k: number } | null>(null);
  const [sheet, setSheet] = useState(false);
  const [end, setEnd] = useState<End | null>(null);
  const [showEnd, setShowEnd] = useState(false);
  const playing = g.status === 'play';
  const active = playing && !paused && !sheet;

  /* ------------------------------------------------------------ persistence */
  const persist = useCallback(() => { const x = gRef.current; if (x.status === 'play') saveGame({ ...x, ms: msRef.current }); }, []);
  useEffect(() => {
    const t = setInterval(persist, 5000);
    const vis = () => { if (document.visibilityState === 'hidden') { setPaused(p => p || gRef.current.status === 'play'); persist(); } };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pagehide', persist);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); window.removeEventListener('pagehide', persist); persist(); };
  }, [persist]);

  /* ------------------------------------------------------------ finishing */
  const finish = useCallback((x: Game) => {
    const won = x.status === 'won';
    const seconds = Math.max(1, Math.floor(x.ms / 1000));
    const score = scoreOf({ level: x.level, seconds, hints: x.hints, mistakes: x.mistakes, solved: won });
    const prevBest = getSaved().best[x.level];
    recordFinished(x, seconds, score);
    setEnd({
      won, seconds, score, newBest: won && (!prevBest || seconds < prevBest), perfect: won && !x.hints && !x.mistakes,
      streak: x.mode === 'daily' ? dailyStreak(getSaved()) : 0, reward: null, sent: false,
    });
    setHint(null); setNotes(false);
    void reportGame({
      game: 'sudoku', won, score, seconds, level: x.level, day: x.mode === 'daily' ? x.day : undefined,
      details: { mistakes: x.mistakes, hints: x.hints },
      // the generator seed replays this very puzzle at this level (seedFor)
      seed: String(x.seed),
    }).then(r => {
      const bm = r && (typeof r.bm === 'number' ? r.bm : typeof r.reward_bm === 'number' ? r.reward_bm : null);
      setEnd(e => (e ? { ...e, reward: bm as number | null, sent: !!r } : e));
    });
    if (won) {
      // a gold wave rolls out from the last cell, then the results
      const last = selRef.current;
      const r0 = rowOf(last < 0 ? 40 : last), c0 = colOf(last < 0 ? 40 : last);
      const cells = new Map<number, number>();
      for (let i = 0; i < 81; i++) cells.set(i, Math.round(Math.hypot(rowOf(i) - r0, colOf(i) - c0) * 70));
      setFx({ cells, k: Date.now(), kind: 'wave' });
      sfx.fanfare(); buzz([30, 60, 30, 60, 140]);
      setTimeout(() => setShowEnd(true), 1500);
    } else {
      sfx.reveal(false); buzz([60, 80, 120]);
      setTimeout(() => setShowEnd(true), 900);
    }
  }, []);

  /* ------------------------------------------------------------ moves */
  const apply = useCallback((fn: (x: Game) => [Game, Events]): { next: Game; ev: Events } | null => {
    const [n, ev] = fn(gRef.current);
    if (!ev.changed) return null;
    const next = { ...n, ms: msRef.current };
    gRef.current = next;
    setG(next);
    saveGame(next);
    return { next, ev };
  }, []);

  const feedback = useCallback((r: { next: Game; ev: Events } | null, cell: number) => {
    if (!r) return;
    const { ev, next } = r;
    if (ev.mistake) { sfx.alert(); buzz([35, 50, 35]); setShake({ cell, k: Date.now() }); setTimeout(() => setShake(null), 520); }
    else if (ev.placed) { sfx.flip(); buzz(8); }
    if (ev.units?.length) {
      const cells = new Map<number, number>();
      for (const u of ev.units) {
        const at = UNITS[u].indexOf(cell);
        UNITS[u].forEach((i, k) => { const d = Math.abs(k - at) * 55; cells.set(i, Math.min(cells.get(i) ?? 1e9, d)); });
      }
      if (!ev.solved) { setFx({ cells, k: Date.now(), kind: 'unit' }); sfx.prism(); buzz([10, 40, 16]); }
    } else if (ev.digitDone && !ev.solved) sfx.coin();
    if (next.status !== 'play') finish(next);
  }, [finish]);

  const input = useCallback((d: number, asNote: boolean) => {
    if (paused || gRef.current.status !== 'play' || sel < 0) return;
    if (asNote) { if (apply(x => toggleNote(x, sel, d))) { sfx.tap(); buzz(4); } return; }
    const r = apply(x => enter(x, sel, d, st));
    if (r) setHint(null);
    feedback(r, sel);
  }, [apply, feedback, paused, sel, st]);

  const doErase = useCallback(() => { if (!paused && apply(x => erase(x, sel))) { sfx.tap(); setHint(null); } }, [apply, paused, sel]);
  const doUndo = useCallback(() => {
    if (paused) return;
    const c = patchCell(gRef.current.undo[gRef.current.undo.length - 1]);
    if (apply(undo)) { sfx.flick(); setHint(null); if (c >= 0) setSel(c); }
  }, [apply, paused]);
  const doRedo = useCallback(() => {
    if (paused) return;
    const c = patchCell(gRef.current.redo[gRef.current.redo.length - 1]);
    const r = apply(redo);
    if (r) { sfx.flick(); setHint(null); if (c >= 0) setSel(c); if (r.next.status !== 'play') finish(r.next); }
  }, [apply, finish, paused]);

  const doHint = useCallback(() => {
    if (paused || gRef.current.status !== 'play') return;
    if (hint) { setHint(null); return; }
    const h = findHint(gRef.current, sel);
    if (!h) return;
    apply(x => [addHint(x), { changed: true }]);
    sfx.shield(); buzz(10);
    setSel(h.cell);
    if (h.kind === 'wrong') apply(x => erase(x, h.cell));
    if (h.kind === 'reveal') feedback(apply(x => reveal(x, h.cell, st)), h.cell);
    setHint(h);
  }, [apply, feedback, hint, paused, sel, st]);

  const fillHint = useCallback(() => {
    if (hint?.kind === 'step') feedback(apply(x => reveal(x, hint.cell, st)), hint.cell);
    setHint(null);
  }, [apply, feedback, hint, st]);

  const onCell = useCallback((i: number) => { if (!paused) setSel(i); }, [paused]);
  const resume = useCallback(() => { setPaused(false); sfx.tap(); }, []);

  /* ------------------------------------------------------------ keyboard */
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey) return;
    if (sheet) { if (e.key === 'Escape') setSheet(false); return; }
    if (showEnd) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    const digit = /^(Digit|Numpad)([1-9])$/.exec(e.code)?.[2];
    if (digit && !mod) { e.preventDefault(); input(Number(digit), notes !== e.shiftKey); return; }
    if (k === ' ' || k === 'p' || (k === 'escape' && !hint)) { e.preventDefault(); if (playing) setPaused(p => !p); return; }
    if (k === 'escape' && hint) { setHint(null); return; }
    if (paused) return;
    const move = (dr: number, dc: number) => {
      e.preventDefault();
      setSel(c => { const r = rowOf(Math.max(0, c)), cc = colOf(Math.max(0, c)); return ((r + dr + 9) % 9) * 9 + ((cc + dc + 9) % 9); });
    };
    if (k === 'arrowup') return move(-1, 0);
    if (k === 'arrowdown') return move(1, 0);
    if (k === 'arrowleft') return move(0, -1);
    if (k === 'arrowright') return move(0, 1);
    if (k === 'backspace' || k === 'delete' || e.code === 'Digit0' || e.code === 'Numpad0') { e.preventDefault(); doErase(); return; }
    if ((k === 'z' && (e.shiftKey && mod)) || k === 'y') { e.preventDefault(); doRedo(); return; }
    if (k === 'z' || k === 'u') { e.preventDefault(); doUndo(); return; }
    if (k === 'n' && !mod) { setNotes(n => !n); sfx.tap(); return; }
    if (k === 'h' && !mod) { doHint(); return; }
    if (k === 'enter' && hint?.kind === 'step') { fillHint(); }
  };
  useEffect(() => { keys.current = onKey; });
  useEffect(() => { const f = (e: KeyboardEvent) => keys.current(e); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, []);

  /* ------------------------------------------------------------ view */
  const marks: Marks | null = useMemo(() => (hint ? hintMarks(hint) : null), [hint]);
  const counts = useMemo(() => digitCounts(g), [g]);
  const daily = g.mode === 'daily';
  const doneDigits = DIGITS.filter(d => counts[d] >= 9);

  return (
    <div className={`sdk-play ${daily ? 'is-daily' : ''}`}>
      <header className="sdk-bar">
        <button type="button" className="sdk-ib" onClick={() => { sfx.tap(); persist(); onLobby(); }} aria-label={s.back} title={s.back}><IcBack /></button>
        <div className="sdk-ttl">
          <small>{daily ? `${s.daily} · ${s.dailyNo(dailyNo(g.day!))}` : s.classic}</small>
          <b className="serif">{s.levels[g.level]}</b>
        </div>
        <button type="button" className="sdk-ib" onClick={() => { sfx.tap(); setSheet(true); }} aria-label={s.tools.settings} title={s.tools.settings}><IcGear /></button>
      </header>

      <div className="sdk-main">
        <section className="sdk-stage">
          <div className="sdk-status">
            <Stat label={s.mistakes} bad={g.mistakes > 0} value={st.limit ? `${g.mistakes}/${MISTAKE_LIMIT}` : String(g.mistakes)} />
            <Stat label={s.hints} value={String(g.hints)} />
            <div className="sdk-clock">
              <Stat label={s.time} value={<Clock msRef={msRef} initial={initial.ms} active={active} />} />
              <button type="button" className="sdk-ib sm" onClick={() => { if (playing) { setPaused(p => !p); sfx.tap(); } }} aria-label={paused ? s.resume : s.pause} title={paused ? s.resume : s.pause} disabled={!playing}>
                {paused ? <IcPlay /> : <IcPause />}
              </button>
            </div>
          </div>
          <Board g={g} sel={sel} settings={st} marks={marks} fx={fx} shake={shake} paused={paused}
            pausedLabel={s.paused} resumeLabel={s.resume} onCell={onCell} onResume={resume} />
        </section>

        <section className="sdk-side">
          <div className="sdk-sidehead">
            <small>{daily ? `${s.daily} · ${s.dailyNo(dailyNo(g.day!))}` : s.classic}</small>
            <b className="serif">{s.levels[g.level]}</b>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {hint ? (
              <HintCard key="hint" s={s} hint={hint} onFill={fillHint} onClose={() => setHint(null)} />
            ) : (
              <motion.div key="ctl" className="sdk-controls" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
                <div className="sdk-tools">
                  <Tool label={s.tools.undo} onClick={doUndo} disabled={!g.undo.length || !playing}><IcUndo /></Tool>
                  <Tool label={s.tools.redo} onClick={doRedo} disabled={!g.redo.length || !playing}><IcRedo /></Tool>
                  <Tool label={s.tools.erase} onClick={doErase} disabled={!playing}><IcErase /></Tool>
                  <Tool label={s.tools.notes} onClick={() => { setNotes(n => !n); sfx.tap(); buzz(6); }} on={notes} disabled={!playing}>
                    <IcNotes /><em className="sdk-onpip" aria-hidden>{notes ? 'ON' : 'OFF'}</em>
                  </Tool>
                  <Tool label={s.tools.hint} onClick={doHint} disabled={!playing}><IcHint />{g.hints > 0 && <em className="sdk-badge">{g.hints}</em>}</Tool>
                </div>
                <div className={`sdk-pad ${notes ? 'is-notes' : ''}`}>
                  {DIGITS.map(d => {
                    const left = 9 - counts[d];
                    const done = doneDigits.includes(d);
                    return (
                      <motion.button type="button" key={d} className={`sdk-key ${done ? 'done' : ''}`} whileTap={{ scale: 0.86, y: 2 }}
                        transition={{ type: 'spring', stiffness: 700, damping: 26 }}
                        onPointerDown={e => { e.preventDefault(); input(d, notes); }}
                        onClick={e => { if (e.detail === 0) input(d, notes); }}
                        disabled={!playing || paused} aria-label={String(d)}>
                        <b className="serif" data-d={d}>{d}</b>
                        <small>{done ? <IcCheck size={12} /> : left}</small>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="sdk-keys">{s.keys}</p>
        </section>
      </div>

      <AnimatePresence>
        {sheet && (
          <SettingsSheet key="set" s={s} sound={app.sound} daily={daily}
            onSound={() => app.set({ sound: !app.sound })}
            onClose={() => setSheet(false)}
            onFill={() => { apply(fillNotes); setSheet(false); sfx.prism(); }}
            onRestart={() => { setSheet(false); onRestart(gRef.current); }}
            onAbandon={() => { setSheet(false); dropGame(gRef.current.key); onLobby(); }} />
        )}
      </AnimatePresence>

      {end?.won && fx?.kind === 'wave' && <VictoryEffect id={cos.equipped.victory} />}
      <AnimatePresence>
        {showEnd && end && (
          <Results key="end" s={s} g={g} end={end} signedIn={!!app.session}
            onAuth={onAuth} onLobby={onLobby}
            onNext={() => onNext(g.level)} onRetry={() => onRestart(g)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================ pieces */

function Stat({ label, value, bad }: { label: string; value: ReactNode; bad?: boolean }) {
  return <div className={`sdk-stat ${bad ? 'bad' : ''}`}><small>{label}</small><b>{value}</b></div>;
}

/** Counts active play time into msRef (the game state picks it up on every move / autosave) and shows it. */
function Clock({ msRef, initial, active }: { msRef: MutableRefObject<number>; initial: number; active: boolean }) {
  const [sec, setSec] = useState(() => Math.floor(initial / 1000));
  useEffect(() => {
    if (!active) return;
    let last = performance.now();
    const t = setInterval(() => {
      const now = performance.now();
      msRef.current += Math.min(5000, now - last);
      last = now;
      setSec(Math.floor(msRef.current / 1000));
    }, 250);
    return () => clearInterval(t);
  }, [active, msRef]);
  return <span className="sdk-time">{fmtTime(sec)}</span>;
}

function Tool({ label, onClick, disabled, on, children }: { label: string; onClick: () => void; disabled?: boolean; on?: boolean; children: ReactNode }) {
  return (
    <motion.button type="button" className={`sdk-tool ${on ? 'on' : ''}`} onClick={onClick} disabled={disabled} aria-label={label} title={label} aria-pressed={on}
      whileTap={{ scale: 0.84 }} transition={{ type: 'spring', stiffness: 600, damping: 24 }}>
      {children}
    </motion.button>
  );
}

function HintCard({ s, hint, onFill, onClose }: { s: SudokuStrings; hint: Hint; onFill: () => void; onClose: () => void }) {
  let title = s.hint.title, text = '', pre: string | null = null, more = 0;
  if (hint.kind === 'wrong') text = s.hint.wrong;
  else if (hint.kind === 'reveal') text = s.hint.revealed;
  else {
    const d = describe(hint.step, s);
    if (hint.pre.length) {
      const p = describe(hint.pre[0], s);
      pre = p.text;
      more = hint.pre.length - 1;
      title = p.title;
      text = hint.step.tech === 'nakedSingle' ? s.hint.text.then(hint.digit) : d.text;
    } else { title = d.title; text = d.text; }
  }
  return (
    <motion.div className="sdk-hint" initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }} role="status">
      <div className="sdk-hinthead">
        <span className="sdk-hintic"><IcHint /></span>
        <div><small>{s.hint.title}</small><b className="serif">{title}</b></div>
        <button type="button" className="sdk-ib sm" onClick={onClose} aria-label={s.hint.close}><IcClose /></button>
      </div>
      {pre && <p className="sdk-hintpre"><em>{s.hint.first}</em> {pre}{more > 0 && <span className="more"> {s.hint.more(more)}</span>}</p>}
      <p className="sdk-hinttext">{text}</p>
      <div className="sdk-hintact">
        {hint.kind === 'step' && <button type="button" className="btn acc sm" onClick={onFill}><IcSpark /> {s.hint.reveal} <b className="serif">{hint.digit}</b></button>}
        <button type="button" className="btn ghost sm" onClick={onClose}>{s.hint.close}</button>
      </div>
    </motion.div>
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`sdk-toggle ${on ? 'on' : ''}`} onClick={() => { onClick(); sfx.tap(); }} role="switch" aria-checked={on}>
      <span>{label}</span><i aria-hidden><motion.b layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} /></i>
    </button>
  );
}

function SettingsSheet({ s, sound, daily, onSound, onClose, onFill, onRestart, onAbandon }: {
  s: SudokuStrings; sound: boolean; daily: boolean; onSound: () => void; onClose: () => void; onFill: () => void; onRestart: () => void; onAbandon: () => void;
}) {
  const st = useSaved().settings;
  return (
    <>
      <motion.div className="sdk-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div className="sdk-sheet" role="dialog" aria-label={s.settings.title}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 36 }}>
        <div className="grab" />
        <div className="sdk-sheethead"><b className="serif">{s.settings.title}</b><button type="button" className="sdk-ib sm" onClick={onClose} aria-label={s.hint.close}><IcClose /></button></div>
        <Toggle on={st.autoClear} label={s.settings.autoClear} onClick={() => setSettings({ autoClear: !st.autoClear })} />
        <Toggle on={st.conflicts} label={s.settings.conflicts} onClick={() => setSettings({ conflicts: !st.conflicts })} />
        <Toggle on={st.sameDigits} label={s.settings.sameDigits} onClick={() => setSettings({ sameDigits: !st.sameDigits })} />
        <Toggle on={st.limit} label={s.settings.limit} onClick={() => setSettings({ limit: !st.limit })} />
        <Toggle on={sound} label={s.settings.sound} onClick={onSound} />
        <div className="sdk-sheetacts">
          <button type="button" className="sdk-act" onClick={onFill}><IcGrid /><span>{s.settings.fillNotes}</span></button>
          {!daily && <button type="button" className="sdk-act" onClick={onRestart}><IcRestart /><span>{s.settings.restart}</span></button>}
          {!daily && <button type="button" className="sdk-act bad" onClick={onAbandon}><IcFlag /><span>{s.settings.abandon}</span></button>}
        </div>
        <p className="sdk-sheetnote">{s.keys}</p>
      </motion.div>
    </>
  );
}

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const c = animate(0, to, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: v => { el.textContent = Math.round(v).toLocaleString('fr-FR'); } });
    return () => c.stop();
  }, [to]);
  return <span ref={ref}>0</span>;
}

function Results({ s, g, end, signedIn, onAuth, onLobby, onNext, onRetry }: {
  s: SudokuStrings; g: Game; end: End; signedIn: boolean; onAuth: () => void; onLobby: () => void; onNext: () => void; onRetry: () => void;
}) {
  const daily = g.mode === 'daily';
  return (
    <>
      <motion.div className="sdk-scrim strong" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div className={`sdk-result ${end.won ? 'won' : 'lost'}`} role="dialog" aria-label={end.won ? s.win.title : s.lost.title}
        initial={{ opacity: 0, y: 60, scale: 0.94, rotateX: 18 }} animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}>
        <div className="sdk-medal" aria-hidden>
          <span className="rim" />
          <span className="core">{end.won ? <IcCheck size={44} /> : <IcClose />}</span>
        </div>
        <small className="sdk-kicker">{daily ? `${s.daily} · ${s.dailyNo(dailyNo(g.day!))}` : s.classic} · {s.levels[g.level]}</small>
        <h2 className="serif">{end.won ? (daily ? s.win.daily : s.win.title) : s.lost.title}</h2>
        {end.won ? (
          <div className="sdk-score"><small>{s.score}</small><b className="serif"><CountUp to={end.score} /></b></div>
        ) : <p className="sdk-lostsub">{s.lost.sub}</p>}
        <div className="sdk-rstats">
          <div><small>{s.time}</small><b>{fmtTime(end.seconds)}</b></div>
          <div><small>{s.mistakes}</small><b>{g.mistakes}</b></div>
          <div><small>{s.hints}</small><b>{g.hints}</b></div>
        </div>
        <div className="sdk-chips">
          {end.perfect && <span className="sdk-chip gold"><IcSpark /> {s.win.perfect}</span>}
          {end.newBest && <span className="sdk-chip gold"><IcClock /> {s.win.newBest}</span>}
          {daily && end.streak > 0 && <span className="sdk-chip flame"><IcFlame /> {s.streak(end.streak)}</span>}
          {end.reward ? <span className="sdk-chip gold"><i className="coin" /> {s.win.reward(end.reward)}</span> : null}
        </div>
        {!signedIn && <button type="button" className="sdk-signin" onClick={onAuth}>{s.win.signIn}</button>}
        <div className="sdk-ractions">
          {daily ? (
            <button type="button" className="btn acc" onClick={onLobby}><IcBack /> {s.back}</button>
          ) : end.won ? (
            <>
              <button type="button" className="btn ghost" onClick={onLobby}><IcBack /></button>
              <button type="button" className="btn acc" onClick={onNext}>{s.next}</button>
            </>
          ) : (
            <>
              <button type="button" className="btn ghost" onClick={onLobby}><IcBack /></button>
              <button type="button" className="btn acc" onClick={onRetry}><IcRestart /> {s.retry}</button>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}
