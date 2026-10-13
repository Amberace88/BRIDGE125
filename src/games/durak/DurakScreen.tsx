import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStrings } from '../../i18n/pick';
import { FAST_TEMPO, useFastMode } from '../../pace';
import { useApp } from '../../store';
import { reportGame, reportStart } from '../session';
import type { GameScreenProps } from '../types';
import { autoplay, botAction } from './bot';
import { DurakTable } from './DurakTable';
import { type Action, type DurakState, apply, durakScore } from './engine';
import { EndScreen } from './EndScreen';
import { Lobby, RulesSheet } from './Lobby';
import { DEFAULT_SETTINGS, LEVELS, type DurakSettings, gameFromSeed, isStandardTable, loadSave, writeSave } from './save';
import type { DurakLevel } from './bot';
import { isSeed, pickLevel } from '../seed';
import { newSeed } from '../challenge/compare';
import { DURAK_STRINGS } from './strings';

const ME = 0;
const tableOf = (me: string, bots: readonly string[], n: number) => [{ name: me, bot: false }, ...bots.slice(0, n - 1).map(name => ({ name, bot: true }))];

export default function DurakScreen({ onExit, onAuth, seed, level: seedLevel }: GameScreenProps) {
  const app = useApp();
  const s = useStrings(DURAK_STRINGS);
  // a challenge seed (../types.ts): the first game is dealt from it at once, at the standard table (no lobby, no resume)
  const [boot] = useState(() => {
    const b = loadSave();
    if (!isSeed(seed)) return { ...b, runLevel: null as DurakLevel | null };
    const game = gameFromSeed(seed, tableOf(app.name || s.you, s.botNames, DEFAULT_SETTINGS.players));
    return { ...b, game, seconds: 0, takes: 0, runLevel: pickLevel(seedLevel, LEVELS, b.settings.level) };
  });
  const [settings, setSettings] = useState<DurakSettings>(boot.settings);
  const [g, setG] = useState<DurakState | null>(boot.game);
  /** the bots' level of a seeded game (the lobby's level otherwise) */
  const [runLevel, setRunLevel] = useState<DurakLevel | null>(boot.runLevel);
  const [view, setView] = useState<'lobby' | 'table'>(boot.game ? 'table' : 'lobby');
  const [hints, setHints] = useState<string[]>(boot.hints);
  const [sheet, setSheet] = useState<null | 'menu' | 'rules'>(null);
  const [showEnd, setShowEnd] = useState(false);
  const [dealing, setDealing] = useState(false);
  const secs = useRef(boot.seconds);
  const takes = useRef(boot.takes);
  const reported = useRef(false);
  const pace = useFastMode();
  const tempo = pace.fast ? FAST_TEMPO : 1;
  const level = runLevel ?? settings.level;

  // every move is saved; a finished game is not kept
  useEffect(() => {
    writeSave({ v: 1, settings, game: g && g.phase !== 'over' ? g : null, seconds: Math.round(secs.current), takes: takes.current, hints });
  }, [g, settings, hints]);

  // time played (only while the table is on screen and the tab is visible)
  const over = g?.phase === 'over';
  useEffect(() => {
    if (view !== 'table' || !g || over) return;
    const iv = setInterval(() => { if (document.visibilityState !== 'hidden') secs.current += 1; }, 1000);
    return () => clearInterval(iv);
  }, [view, !!g, over]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (boot.runLevel && g) reportStart('durak', { players: g.players.length, level: boot.runLevel, variant: 'podkidnoy', deck: g.rules.deck, seeded: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback((st: DurakSettings) => {
    const ng = gameFromSeed(newSeed(), tableOf(app.name || s.you, s.botNames, st.players), st);
    setRunLevel(null);
    secs.current = 0; takes.current = 0; reported.current = false;
    setShowEnd(false); setSheet(null);
    setG(ng); setView('table');
    reportStart('durak', { players: st.players, level: st.level, variant: st.transfer ? 'perevodnoy' : 'podkidnoy', deck: st.deck });
  }, [app.name, s]);

  /* ---------- bots, and the pause before the table clears ---------- */
  const meOut = !!g?.players[ME].out;
  useEffect(() => {
    if (!g || view !== 'table' || dealing) return;
    const k = meOut ? 0.35 : pace.fast ? 0.5 : 1;
    const seq = g.seq;
    if (g.phase === 'resolve') {
      const tm = setTimeout(() => setG(cur => (cur && cur.seq === seq && cur.phase === 'resolve' ? apply(cur, -1, { type: 'resolve' }) : cur)),
        (g.resolution === 'taken' ? 980 : 820) * k);
      return () => clearTimeout(tm);
    }
    if (g.phase !== 'play' || !g.players[g.turn].bot) return;
    const a = botAction(g, g.turn, level);
    const base = a.type === 'pass' ? 560 : a.type === 'take' ? 980 : g.table.length === 0 ? 1050 : 880;
    const jitter = ((g.seed >>> (seq % 24)) % 380);
    const tm = setTimeout(() => setG(cur => (cur && cur.seq === seq ? apply(cur, cur.turn, a) : cur)), (base + jitter) * k);
    return () => clearTimeout(tm);
  }, [g?.seq, g?.phase, dealing, view, pace.fast, meOut]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- game over: report once, then the end screen ---------- */
  useEffect(() => {
    if (!g || g.phase !== 'over') return;
    if (!reported.current) {
      reported.current = true;
      const isDurak = g.durak === ME;
      const place = isDurak ? g.players.length : g.players[ME].place ?? g.players.length;
      void reportGame({
        game: 'durak', won: !isDurak, score: durakScore(g, ME, takes.current), seconds: Math.round(secs.current), level,
        // the engine seed replays this deal (seed contract) — when it was dealt at the standard table
        ...(isStandardTable({ players: g.players.length, deck: g.rules.deck, transfer: g.rules.transfer }) ? { seed: String(g.seed) } : {}),
        details: { durak: isDurak, place, players: g.players.length, variant: g.rules.transfer ? 'perevodnoy' : 'podkidnoy', deck: g.rules.deck, pogony: isDurak && g.pogony },
      });
    }
    const tm = setTimeout(() => setShowEnd(true), 1300 * tempo);
    return () => clearTimeout(tm);
  }, [g?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const onAct = (a: Action) => {
    setG(cur => {
      if (!cur) return cur;
      const nx = apply(cur, ME, a);
      if (nx !== cur && a.type === 'take') takes.current += 1;
      return nx;
    });
  };
  const onHint = useCallback((id: string) => setHints(h => (h.includes(id) ? h : [...h, id])), []);

  return (
    <div className="dkroot" style={{ position: 'absolute', inset: 0 }}>
      {view === 'lobby' || !g ? (
        <Lobby settings={settings} onChange={setSettings} onStart={() => start(settings)}
          onResume={g && g.phase !== 'over' ? () => setView('table') : undefined}
          onRules={() => setSheet('rules')} onExit={onExit} />
      ) : (
        <DurakTable key={g.seed} g={g} me={ME} level={level} tempo={meOut ? 0.4 : tempo} fast={pace.fast} onToggleFast={pace.toggle}
          onAct={onAct} onMenu={() => setSheet('menu')} onDealing={setDealing} hints={hints} onHint={onHint}
          onSkipToEnd={() => setG(cur => (cur ? autoplay(cur, level) : cur))} />
      )}

      <AnimatePresence>
        {showEnd && g && g.phase === 'over' && view === 'table' && (
          <EndScreen key="end" g={g} me={ME} level={level}
            onAgain={() => start(settings)}
            onSettings={() => { setShowEnd(false); setG(null); setView('lobby'); }}
            onHome={onExit}
            onAuth={app.session ? undefined : onAuth} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === 'rules' && <RulesSheet key="rules" onClose={() => setSheet(null)} />}
        {sheet === 'menu' && (
          <>
            <motion.div key="mscrim" className="scrim" style={{ zIndex: 80 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(null)} />
            <motion.div key="msheet" className="sheet dkmenu" style={{ zIndex: 81 }} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
              <div className="grab" />
              <p className="menu-note">{s.savedNote}</p>
              <button className="btn acc" style={{ width: '100%' }} onClick={onExit}>{s.saveExit}</button>
              <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => setSheet('rules')}>{s.rules}</button>
              <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => { setSheet(null); setView('lobby'); }}>{s.newGame}</button>
              <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => setSheet(null)}>{s.back}</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
