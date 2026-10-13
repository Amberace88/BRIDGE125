import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CardFace } from '../../components/CardFace';
import type { Lang } from '../../i18n';
import { useStrings } from '../../i18n/pick';
import { useFastMode } from '../../pace';
import { sfx } from '../../sound';
import { useApp } from '../../store';
import { GameResultSheet } from '../GameResultSheet';
import { reportGame, reportStart } from '../session';
import type { GameResult, GameScreenProps } from '../types';
import { type Action, type ThousandRules, apply, gameDetails, newGame } from './engine';
import type { TLevel } from './bot';
import { THOUSAND } from './strings';
import { TITLES } from './titles';
import { loadSave, writeSave, type ThousandPrefs, type ThousandRun } from './save';
import { ThousandGame } from './ThousandGame';
import { RulesSheet } from './RulesSheet';
import { PlayModes } from '../online/PlayModes';
import '../../styles/table.css';
import './thousand.css';

export default function ThousandScreen({ onExit, onAuth }: GameScreenProps) {
  const app = useApp();
  const { t } = app;
  const s = useStrings(THOUSAND);
  const [prefs, setPrefs] = useState<ThousandPrefs>(() => loadSave().prefs);
  const [run, setRun] = useState<ThousandRun | null>(() => loadSave().run);
  const [results, setResults] = useState(false);
  const pace = useFastMode();

  /* ---------- seconds at the table (counted while this screen is open and visible) ---------- */
  const clock = useRef({ base: run?.seconds ?? 0, at: performance.now(), hidden: false });
  const elapsed = () => clock.current.base + (clock.current.hidden ? 0 : (performance.now() - clock.current.at) / 1000);
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) { clock.current.base = elapsed(); clock.current.hidden = true; }
      else { clock.current.at = performance.now(); clock.current.hidden = false; }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // autosave after every move
  const persist = useCallback((r: ThousandRun | null, p: ThousandPrefs) => {
    writeSave({ v: 1, prefs: p, run: r ? { ...r, seconds: Math.round(elapsed()) } : null });
  }, []);
  const runRef = useRef(run); runRef.current = run;
  const prefsRef = useRef(prefs); prefsRef.current = prefs;
  useEffect(() => { persist(run, prefs); }, [run, prefs, persist]);
  useEffect(() => () => { persist(runRef.current, prefsRef.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // game over → report once (rewards are decided by the server); the result sheet shows the answer
  const report = useRef<{ result: GameResult; p: Promise<Record<string, unknown> | null> } | null>(null);
  useEffect(() => {
    if (!run || run.g.phase !== 'gameOver' || run.reported) return;
    const g = run.g;
    const result: GameResult = {
      game: 'thousand', won: g.winner === 0, score: Math.max(0, g.scores[0]), seconds: Math.round(elapsed()), level: run.level, details: gameDetails(g),
    };
    report.current = { result, p: reportGame(result) };
    setRun(r => (r ? { ...r, reported: true } : r));
  }, [run?.g.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = (p: ThousandPrefs) => {
    const bots = t.botNames.slice(0, 2);
    const g = newGame({
      players: [{ name: app.name || t.you, bot: false }, { name: bots[0] ?? 'Artjoms', bot: true }, { name: bots[1] ?? 'Marina', bot: true }],
      rules: p.rules, seed: (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0,
    });
    clock.current = { base: 0, at: performance.now(), hidden: false };
    report.current = null;
    setResults(false);
    setPrefs(p);
    setRun({ g, level: p.level, seconds: 0 });
    reportStart('thousand', { level: p.level, ...p.rules });
    sfx.shuffle();
  };

  const onAct = useCallback((a: Action) => setRun(r => (r ? { ...r, g: apply(r.g, 0, a) } : r)), []);
  const onBot = useCallback((seq: number, p: number, a: Action) => setRun(r => (r && r.g.seq === seq ? { ...r, g: apply(r.g, p, a) } : r)), []);

  const facts = useMemo(() => {
    if (!run || run.g.phase !== 'gameOver') return [];
    const d = gameDetails(run.g);
    const out = [{ label: s.facts.deals, value: String(d.deals) }];
    if (Number(d.declared) > 0) out.push({ label: s.facts.made, value: `${d.made}/${d.declared}` });
    if (Number(d.best_contract) > 0) out.push({ label: s.facts.best, value: String(d.best_contract) });
    out.push({ label: s.facts.place, value: `${d.place}/3` });
    return out;
  }, [run?.g.phase, s]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!run) return <Lobby prefs={prefs} onStart={start} onExit={onExit} />;
  const g = run.g;
  const rep = report.current;
  return (
    <>
      <ThousandGame g={g} level={run.level} fast={pace.fast} onToggleFast={pace.toggle} onAct={onAct} onBot={onBot}
        onExit={() => { persist(runRef.current, prefsRef.current); onExit(); }}
        onNewGame={() => { setRun(null); setResults(false); }}
        onResults={() => setResults(true)} />
      <AnimatePresence>
        {results && g.phase === 'gameOver' && rep && (
          <GameResultSheet key="res" result={rep.result} report={rep.p} facts={facts}
            headline={g.winner === 0 ? s.sheet.youWon : g.winner > 0 ? s.sheet.winner(g.players[g.winner].name) : undefined}
            onAgain={() => { setResults(false); start(prefs); }} onExit={() => { setRun(null); onExit(); }} onAuth={onAuth} />
        )}
      </AnimatePresence>
    </>
  );
}

/* ================================================================== lobby */

const HERO = ['AH', 'KH', 'QH'];

function Lobby({ prefs, onStart, onExit }: { prefs: ThousandPrefs; onStart: (p: ThousandPrefs) => void; onExit: () => void }) {
  const s = useStrings(THOUSAND);
  const { lang } = useApp();
  const [level, setLevel] = useState<TLevel>(prefs.level);
  const [rules, setRules] = useState<ThousandRules>(prefs.rules);
  const [howTo, setHowTo] = useState(false);
  const keys: (keyof ThousandRules)[] = ['marriageToBid', 'barrel', 'bolts', 'step10', 'samosval'];
  return (
    <div className="stage tbl thou klobby">
      <div className="room" aria-hidden />
      <div className="kl-glow" aria-hidden />
      <button className="glyph kl-back" aria-label={s.lobby.back} onClick={onExit}>
        <svg viewBox="0 0 24 24" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <div className="kl-in">
        <div className="kl-hero" aria-hidden>
          {HERO.map((id, i) => (
            <motion.span key={id} className="kl-card" style={{ ['--cw' as string]: '86px' }}
              initial={{ opacity: 0, y: 40, rotate: 0 }} animate={{ opacity: 1, y: [40, -6, 0], rotate: (i - 1) * 16 }}
              transition={{ delay: 0.1 + i * 0.09, duration: 0.8, ease: [0.2, 0.8, 0.25, 1] }}>
              <CardFace card={{ id, r: id[0] as 'A', s: 'H' }} lang={lang as Lang} />
            </motion.span>
          ))}
          <motion.span className="kl-1000 serif" initial={{ opacity: 0, scale: 0.6, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.55, type: 'spring', stiffness: 260, damping: 16 }}>1000</motion.span>
        </div>
        <motion.h1 className="serif kl-title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>{TITLES[lang] ?? 'Thousand'}</motion.h1>
        <motion.p className="kl-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>{s.lobby.sub}</motion.p>

        <PlayModes game="thousand">
        <motion.div className="kl-opts" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="kl-row">
            <span className="lbl">{s.lobby.level}</span>
            <div className="kl-seg" role="radiogroup" aria-label={s.lobby.level}>
              {(['easy', 'normal', 'hard'] as TLevel[]).map(l => (
                <button key={l} role="radio" aria-checked={level === l} className={level === l ? 'on' : ''} onClick={() => { sfx.tap(); setLevel(l); }}>
                  {level === l && <motion.i layoutId="kl-lv" className="pill" />}<span>{s.lobby.levels[l]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="kl-rules">
            <span className="lbl">{s.lobby.rules}</span>
            {keys.map(k => (
              <Toggle key={k} on={rules[k]} label={s.lobby.toggles[k].label} sub={s.lobby.toggles[k].sub} onChange={v => setRules(r => ({ ...r, [k]: v }))} />
            ))}
          </div>
        </motion.div>

        <motion.div className="kl-cta" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <button className="btn acc" onClick={() => onStart({ level, rules })}>{s.lobby.start}</button>
          <button className="kl-link" onClick={() => setHowTo(true)}>{s.lobby.howTo}</button>
        </motion.div>
        </PlayModes>
      </div>
      <AnimatePresence>{howTo && <RulesSheet key="r" rules={rules} onClose={() => setHowTo(false)} />}</AnimatePresence>
    </div>
  );
}

function Toggle({ on, label, sub, onChange }: { on: boolean; label: string; sub: string; onChange: (v: boolean) => void }) {
  return (
    <button className={`kl-tog ${on ? 'on' : ''}`} role="switch" aria-checked={on} onClick={() => { sfx.tap(); onChange(!on); }}>
      <span className="txt"><b>{label}</b><small>{sub}</small></span>
      <span className="sw" aria-hidden><motion.i layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} /></span>
    </button>
  );
}
