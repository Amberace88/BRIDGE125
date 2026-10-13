import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CardFace } from '../../components/CardFace';
import type { Lang } from '../../i18n';
import { useStrings } from '../../i18n/pick';
import { useFastMode } from '../../pace';
import { sfx } from '../../sound';
import { useApp } from '../../store';
import { reportGame, reportStart } from '../session';
import type { GameScreenProps } from '../types';
import { type Action, type ZState, type ZoleRules, apply, isWin } from './engine';
import { LEVELS, type ZLevel } from './bot';
import { isSeed, pickLevel } from '../seed';
import { newSeed } from '../challenge/compare';
import { ZOLE } from './strings';
import { TITLES } from './titles';
import { DEFAULT_PREFS, isStandardRules, loadSave, sessionFromSeed, writeSave, type ZolePrefs, type ZoleRun } from './save';
import { ZoleGame } from './ZoleGame';
import { RulesSheet } from './RulesSheet';
import '../../styles/table.css';
import './zole.css';

/** Facts for quests / achievements from the finished session (seat 0 = the player). */
function sessionDetails(g: ZState): Record<string, number | boolean | string> {
  const mine = g.sheet.filter(r => r.declarer === 0 && r.contract !== 'final');
  const won = mine.filter(r => isWin(r.outcome));
  const best = won.some(r => r.contract === 'zole') ? 'zole' : won.some(r => r.contract === 'maza') ? 'maza' : won.some(r => r.contract === 'lielais') ? 'lielais' : 'none';
  return {
    role: mine.length ? 'lielais' : 'mazais',
    contract: best,
    jani: won.filter(r => r.outcome === 'jani').length,
    bezstikis: won.filter(r => r.outcome === 'bezstikis').length,
    deals: g.sheet.filter(r => r.contract !== 'final').length,
    zole_big: won.length,
    zole_solo: won.filter(r => r.contract === 'zole').length,
    galdins_lost: g.sheet.filter(r => r.contract === 'galdins' && r.losers.includes(0)).length,
  };
}

export default function ZoleScreen({ onExit, seed, level }: GameScreenProps) {
  const app = useApp();
  const { t } = app;
  const [prefs, setPrefs] = useState<ZolePrefs>(() => loadSave().prefs);
  const table = () => {
    const bots = t.botNames.slice(0, 2);
    return [{ name: app.name || t.you, bot: false }, { name: bots[0] ?? 'Artjoms', bot: true }, { name: bots[1] ?? 'Marina', bot: true }];
  };
  /** a new session; seeded (a challenge, see ../types.ts) → standard rules, so the seed + level replay it anywhere */
  const newRun = (p: ZolePrefs, sd?: string): ZoleRun => {
    const rules = sd ? DEFAULT_PREFS.rules : p.rules;
    const s = sd ?? newSeed();
    return { g: sessionFromSeed(s, table(), rules), level: p.level, seconds: 0, ...(isStandardRules(rules) ? { seed: s } : {}) };
  };
  // a challenge seed: the first session starts at once from it (no lobby, the saved session is not resumed)
  const [run, setRun] = useState<ZoleRun | null>(() => (isSeed(seed) ? newRun({ ...prefs, level: pickLevel(level, LEVELS, prefs.level) }, seed) : loadSave().run));
  useEffect(() => {
    if (isSeed(seed) && run) reportStart('zole', { level: run.level, deals: run.g.rules.deals, maza: run.g.rules.mazaZole, pules: run.g.rules.pules, seeded: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
  const persist = useCallback((r: ZoleRun | null, p: ZolePrefs) => {
    writeSave({ v: 1, prefs: p, run: r ? { ...r, seconds: Math.round(elapsed()) } : null });
  }, []);
  const runRef = useRef(run); runRef.current = run;
  const prefsRef = useRef(prefs); prefsRef.current = prefs;
  useEffect(() => { persist(run, prefs); }, [run, prefs, persist]);
  useEffect(() => () => { persist(runRef.current, prefsRef.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // the session is over → report once (rewards are decided by the server)
  useEffect(() => {
    if (!run || run.g.phase !== 'sessionOver' || run.reported) return;
    const g = run.g;
    void reportGame({ game: 'zole', won: g.scores[0] > 0, score: g.scores[0], seconds: Math.round(elapsed()), level: run.level, details: sessionDetails(g), ...(run.seed ? { seed: run.seed } : {}) });
    setRun(r => (r ? { ...r, reported: true } : r));
  }, [run?.g.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = (p: ZolePrefs) => {
    clock.current = { base: 0, at: performance.now(), hidden: false };
    setPrefs(p);
    setRun(newRun(p));
    reportStart('zole', { level: p.level, deals: p.rules.deals, maza: p.rules.mazaZole, pules: p.rules.pules });
    sfx.shuffle();
  };

  const onAct = useCallback((a: Action) => setRun(r => (r ? { ...r, g: apply(r.g, 0, a) } : r)), []);
  const onBot = useCallback((seq: number, p: number, a: Action) => setRun(r => (r && r.g.seq === seq ? { ...r, g: apply(r.g, p, a) } : r)), []);

  if (!run) return <Lobby prefs={prefs} onStart={start} onExit={onExit} />;
  return (
    <ZoleGame g={run.g} level={run.level} fast={pace.fast} onToggleFast={pace.toggle} onAct={onAct} onBot={onBot}
      onExit={() => { persist(runRef.current, prefsRef.current); onExit(); }}
      onNewSession={() => { setRun(null); }} />
  );
}

/* ================================================================== lobby */

const HERO = ['QC', 'QS', 'QH'];

function Lobby({ prefs, onStart, onExit }: { prefs: ZolePrefs; onStart: (p: ZolePrefs) => void; onExit: () => void }) {
  const s = useStrings(ZOLE);
  const { lang } = useApp();
  const [level, setLevel] = useState<ZLevel>(prefs.level);
  const [rules, setRules] = useState<ZoleRules>(prefs.rules);
  const [howTo, setHowTo] = useState(false);
  const DEALS = [9, 12, 24, 0];
  return (
    <div className="stage tbl zole zlobby">
      <div className="room" aria-hidden />
      <div className="zl-glow" aria-hidden />
      <button className="glyph zl-back" aria-label={s.lobby.back} onClick={onExit}>
        <svg viewBox="0 0 24 24" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <div className="zl-in">
        <div className="zl-hero" aria-hidden>
          {HERO.map((id, i) => (
            <motion.span key={id} className="zl-card" style={{ ['--cw' as string]: '86px' }}
              initial={{ opacity: 0, y: 40, rotate: 0 }} animate={{ opacity: 1, y: [40, -6, 0], rotate: (i - 1) * 16 }}
              transition={{ delay: 0.1 + i * 0.09, duration: 0.8, ease: [0.2, 0.8, 0.25, 1] }}>
              <CardFace card={{ id, r: 'Q', s: id[1] as 'C' }} lang={lang as Lang} />
            </motion.span>
          ))}
        </div>
        <motion.h1 className="serif zl-title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>{TITLES[lang] ?? 'Zole'}</motion.h1>
        <motion.p className="zl-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>{s.lobby.sub}</motion.p>

        <motion.div className="zl-opts" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="zl-row">
            <span className="lbl">{s.lobby.level}</span>
            <div className="zl-seg" role="radiogroup" aria-label={s.lobby.level}>
              {(['easy', 'normal', 'hard'] as ZLevel[]).map(l => (
                <button key={l} role="radio" aria-checked={level === l} className={level === l ? 'on' : ''} onClick={() => { sfx.tap(); setLevel(l); }}>
                  {level === l && <motion.i layoutId="zl-lv" className="pill" />}<span>{s.lobby.levels[l]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="zl-row">
            <span className="lbl">{s.lobby.deals}</span>
            <div className="zl-seg" role="radiogroup" aria-label={s.lobby.deals}>
              {DEALS.map(d => (
                <button key={d} role="radio" aria-checked={rules.deals === d} className={rules.deals === d ? 'on' : ''} onClick={() => { sfx.tap(); setRules(r => ({ ...r, deals: d })); }}>
                  {rules.deals === d && <motion.i layoutId="zl-dl" className="pill" />}<span>{d === 0 ? s.lobby.endless : d}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="zl-rules">
            <span className="lbl">{s.lobby.rules}</span>
            <Toggle on={rules.mazaZole} label={s.lobby.maza} sub={s.lobby.mazaSub} onChange={v => setRules(r => ({ ...r, mazaZole: v }))} />
            <Toggle on={rules.pules} label={s.lobby.pules} sub={s.lobby.pulesSub} onChange={v => setRules(r => ({ ...r, pules: v }))} />
          </div>
        </motion.div>

        <motion.div className="zl-cta" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <button className="btn acc" onClick={() => onStart({ level, rules })}>{s.lobby.start}</button>
          <button className="zl-link" onClick={() => setHowTo(true)}>{s.lobby.howTo}</button>
        </motion.div>
      </div>
      <AnimatePresence>{howTo && <RulesSheet key="r" rules={rules} onClose={() => setHowTo(false)} />}</AnimatePresence>
    </div>
  );
}

function Toggle({ on, label, sub, onChange }: { on: boolean; label: string; sub: string; onChange: (v: boolean) => void }) {
  return (
    <button className={`zl-tog ${on ? 'on' : ''}`} role="switch" aria-checked={on} onClick={() => { sfx.tap(); onChange(!on); }}>
      <span className="txt"><b>{label}</b><small>{sub}</small></span>
      <span className="sw" aria-hidden><motion.i layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} /></span>
    </button>
  );
}

