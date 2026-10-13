import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { GameScreenProps } from '../../types';
import { reportGame, reportStart } from '../../session';
import { useApp } from '../../../store';
import { intlLocale } from '../../../i18n';
import { buzz, sfx } from '../../../sound';
import { solStrings } from '../strings';
import { loadSave, recordResult, writeSave, type SolSave } from '../store';
import {
  canUndo, finalScore, isSpiderMode, isWon, liveScore, newGame, play, undo, undoCost,
  type AnyMove, type Game, type Mode,
} from '../engine/game';
import { kAllMoves, kAutoStep, kCanAutoComplete, kCanDraw, kCard, kCollectStep, type KMove, type KState } from '../engine/klondike';
import { spHint, type SpState } from '../engine/spider';
import { klondikeHasUsefulMove } from '../engine/solver';
import { randomSeed, rigaDay } from '../engine/cards';
import { computeDaily, computeSeed, computeSolve } from '../compute';
import { Board, type HintMark } from './Board';
import { homeMove, movePiles, pileCards, tapMove } from './adapter';
import { klondikeLayout, pileKey, spiderLayout, type PileRef } from './layout';
import { Menu } from './Menu';
import { Cascade, SuitConfetti, type Launch } from './Celebration';
import { IconBack, IconHint, IconMenu, IconNew, IconUndo, IconWand } from './icons';
import { dayLabel, fmtTime } from './format';
import '../solitaire.css';

interface WinInfo {
  score: number; seconds: number; moves: number; daily: boolean;
  bestTime: boolean; bestMoves: boolean; bestScore: boolean;
  reward: Record<string, unknown> | null; rewardDone: boolean;
}

const modeLabel = (m: Mode, s: ReturnType<typeof solStrings>) =>
  isSpiderMode(m) ? `${s.spider} · ${s.suits(Number(m.slice(-1)))}` : `${s.klondike} · ${s.draw(Number(m.slice(-1)))}`;

function useSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize(prev => {
      const w = Math.round(el.clientWidth), h = Math.round(el.clientHeight);
      return prev.w === w && prev.h === h ? prev : { w, h };
    });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export default function Solitaire({ onExit, onAuth }: GameScreenProps) {
  const app = useApp();
  const lang = app.lang;
  const s = solStrings(lang);
  const reduce = !!useReducedMotion();

  const [save, setSave] = useState<SolSave>(() => loadSave());
  const [game, setGame] = useState<Game | null>(() => (save.game && !isWon(save.game) ? save.game : null));
  const [dealKey, setDealKey] = useState('resume');
  const [dealIn, setDealIn] = useState(false);
  const [menu, setMenu] = useState(() => !game);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<HintMark | null>(null);
  const [shake, setShake] = useState<{ id: number; key: number } | null>(null);
  const [stuck, setStuck] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [win, setWin] = useState<WinInfo | null>(null);
  const [phase, setPhase] = useState<'play' | 'cascade' | 'results'>('play');
  const [confirmNew, setConfirmNew] = useState<null | (() => void)>(null);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [clock, setClock] = useState(() => game?.seconds ?? 0);

  const clockRef = useRef(clock);
  const gameRef = useRef(game); gameRef.current = game;
  const saveRef = useRef(save); saveRef.current = save;
  const mid = useRef<HTMLDivElement>(null);
  const size = useSize(mid);
  const today = rigaDay();
  const prefs = save.prefs;

  /* ------------------------------------------------------------------ persistence */
  const persist = useCallback((g: Game | null, patch?: Partial<SolSave>) => {
    const next: SolSave = { ...saveRef.current, ...patch, game: g ? { ...g, seconds: clockRef.current } : null };
    saveRef.current = next;
    setSave(next);
    writeSave(next);
  }, []);

  // flush the clock when the page goes away
  useEffect(() => {
    const flush = () => { if (gameRef.current) writeSave({ ...saveRef.current, game: { ...gameRef.current, seconds: clockRef.current } }); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => { flush(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', flush); };
  }, []);

  /* ------------------------------------------------------------------ clock */
  const running = !!game && game.hist.length > 0 && !isWon(game) && !menu && !confirmNew && phase === 'play';
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      clockRef.current += 1;
      setClock(clockRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const flash = (text: string) => setToast({ text, key: Date.now() });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  /* ------------------------------------------------------------------ results */
  const finishWin = useCallback((g: Game) => {
    const seconds = clockRef.current;
    const done = { ...g, seconds, reported: true };
    const score = finalScore(done);
    const rec = recordResult(saveRef.current, done, true, score);
    persist(null, { stats: rec.save.stats, daily: rec.save.daily });
    setGame(done);
    const info: WinInfo = { score, seconds, moves: g.st.moves, daily: !!g.day, bestTime: rec.bestTime, bestMoves: rec.bestMoves, bestScore: rec.bestScore, reward: null, rewardDone: false };
    setWin(info);
    setPhase('cascade');
    setAutoRun(false);
    sfx.fanfare();
    buzz([20, 40, 30]);
    reportGame({ game: 'solitaire', won: true, score, seconds, level: g.mode, day: g.day, details: { moves: g.st.moves, undos: g.undos, mode: g.mode } })
      .then(r => setWin(w => (w ? { ...w, reward: r, rewardDone: true } : w)));
  }, [persist]);

  /** a started game that is left for a new one counts as a loss */
  const reportAbandon = (g: Game) => {
    if (!g.hist.length || isWon(g) || g.reported) return;
    const seconds = clockRef.current;
    const done = { ...g, seconds };
    const score = finalScore(done);
    const rec = recordResult(saveRef.current, done, false, score);
    saveRef.current = { ...saveRef.current, stats: rec.save.stats, daily: rec.save.daily };
    reportGame({ game: 'solitaire', won: false, score, seconds, level: g.mode, day: g.day, details: { moves: g.st.moves, undos: g.undos, mode: g.mode } });
  };

  /* ------------------------------------------------------------------ new deals */
  const deal = useCallback(async (mode: Mode, daily: boolean) => {
    setBusy(true);
    let seed: number;
    if (daily) {
      seed = saveRef.current.seeds[today] ?? await computeDaily(today);
    } else seed = await computeSeed(mode, randomSeed());
    const g = newGame(daily ? 'klondike-1' : mode, seed, { vegas: saveRef.current.prefs.vegas, day: daily ? today : undefined });
    clockRef.current = 0; setClock(0);
    setGame(g);
    persist(g, daily ? { seeds: { ...saveRef.current.seeds, [today]: seed } } : undefined);
    setDealKey(`${g.mode}:${seed}:${Date.now()}`);
    setDealIn(true);
    setHint(null); setStuck(false); setWin(null); setPhase('play'); setAutoRun(false);
    setMenu(false); setBusy(false);
    sfx.shuffle();
    reportStart('solitaire', { mode: g.mode, daily });
    const n = g.st.tab.reduce((a, t) => a + t.c.length, 0);
    for (let k = 0; k < Math.min(n, 14); k++) setTimeout(() => sfx.deal((k % 5) / 2 - 1), 180 + k * (n > 40 ? 70 : 90));
    if (!saveRef.current.tips) { setTimeout(() => flash(isSpiderMode(g.mode) ? `${s.tipDrag} ${s.spiderNote}` : s.tipTap), 1600); persist(g, { tips: true }); }
    else if (!isSpiderMode(g.mode)) setTimeout(() => flash(`${s.winnable} · ${s.dealNo(seed)}`), 1300);
  }, [persist, today, s]);

  const askNew = (then: () => void) => {
    const g = gameRef.current;
    if (g && g.hist.length && !isWon(g) && !g.reported) setConfirmNew(() => () => { reportAbandon(g); then(); });
    else then();
  };

  /* ------------------------------------------------------------------ moves */
  const doMove = useCallback((m: AnyMove, opts: { quiet?: boolean } = {}): boolean => {
    const g = gameRef.current;
    if (!g) return false;
    const next = play(g, m);
    if (!next) return false;
    const before = g.st, after = next.st;
    if (!opts.quiet) {
      if (m.t === 'draw' || m.t === 'deal') {
        if (m.t === 'draw' && before.game === 'klondike' && before.stock.length === 0) sfx.shuffle(); else sfx.deal(-0.4);
      } else {
        const toFound = before.game === 'klondike' && (m as Extract<KMove, { t: 'move' }>).to.k === 'found';
        if (toFound) sfx.flick(); else sfx.play();
      }
      const downBefore = before.tab.reduce((a, t) => a + t.d, 0), downAfter = after.tab.reduce((a, t) => a + t.d, 0);
      if (downAfter < downBefore) setTimeout(() => sfx.flip(), 140);
      if (after.game === 'spider' && after.done.length > (before as SpState).done.length) setTimeout(() => sfx.good(), 260);
    }
    const ng = { ...next, seconds: clockRef.current };
    gameRef.current = ng;
    setGame(ng);
    setDealIn(false);
    setHint(null);
    setStuck(false);
    if (isWon(ng)) { finishWin(ng); return true; }
    persist(ng);
    return true;
  }, [finishWin, persist]);

  const nope = (pile: PileRef, index: number) => {
    const g = gameRef.current;
    if (!g) return;
    const cards = pileCards(g.st, pile);
    const id = cards[index] ?? cards[cards.length - 1];
    if (id == null) return;
    setShake({ id, key: Date.now() });
    buzz(12);
  };

  const onTap = useCallback((pile: PileRef, index: number) => {
    const g = gameRef.current;
    if (!g || isWon(g) || autoRun) return;
    if (pile.k === 'stock') {
      if (g.st.game === 'klondike' && !kCanDraw(g.st)) { buzz(12); return; }
      if (g.st.game === 'spider' && g.st.stock.length && g.st.tab.some(t => !t.c.length)) { flash(s.spiderNote); buzz(12); return; }
      doMove(g.st.game === 'klondike' ? { t: 'draw' } : { t: 'deal' });
      return;
    }
    if (pile.k === 'found' && g.st.game === 'spider') return;
    const i = index < 0 ? pileCards(g.st, pile).length - 1 : index;
    const m = tapMove(g.st, pile, i);
    if (!m || !doMove(m)) nope(pile, i);
  }, [doMove, autoRun, s]);

  const onDoubleTap = useCallback((pile: PileRef, index: number) => {
    const g = gameRef.current;
    if (!g || autoRun) return;
    const m = homeMove(g.st, pile);
    if (m) doMove(m);
    else onTap(pile, index);
  }, [doMove, onTap, autoRun]);

  /** double tap on the felt: every safe card goes home */
  const collect = useCallback(() => {
    const step = () => {
      const g = gameRef.current;
      if (!g || g.st.game !== 'klondike' || isWon(g)) return;
      const m = kCollectStep(g.st);
      if (m && doMove(m)) setTimeout(step, 120);
    };
    step();
  }, [doMove]);

  const onUndo = () => {
    const g = gameRef.current;
    if (!g || !canUndo(g) || autoRun) return;
    const u = undo(g);
    gameRef.current = u;
    setGame(u); setDealIn(false); setHint(null); setStuck(false);
    persist(u);
    sfx.draw();
    if (g.undos === 0) flash(s.undoCost(undoCost(g)));
  };

  /* ------------------------------------------------------------------ hint */
  const showHint = (m: AnyMove | null, st: Game['st']) => {
    if (!m) { setStuck(true); sfx.alert(); return; }
    const { from, to, n } = movePiles(m, st);
    let cards: number[] = [];
    if (from) {
      const src = pileCards(st, from);
      cards = from.k === 'stock' ? src.slice(-1) : src.slice(src.length - Math.max(1, n));
    }
    setHint({ cards, to: to ? pileKey(to) : from?.k === 'stock' ? 'stock' : null, key: Date.now() });
    sfx.tap();
  };

  const onHint = async () => {
    const g = gameRef.current;
    if (!g || isWon(g) || autoRun) return;
    if (g.st.game === 'spider') { showHint(spHint(g.st), g.st); return; }
    const st = g.st;
    const r = await computeSolve(st, 6000);
    if (gameRef.current?.st !== st) return;
    let m: AnyMove | null = r?.result === 'solved' && r.path?.length ? r.path[0] : null;
    if (m && m.t === 'draw' && !kCanDraw(st)) m = null;
    if (!m) {
      // no winning line found in the budget: the most useful legal move
      const all = kAllMoves(st);
      const score = (x: KMove) => {
        if (x.t === 'draw') return 1;
        const col = x.from.k === 'tab' ? st.tab[x.from.i] : null;
        const reveals = !!col && col.d > 0 && col.c.length - x.n === col.d;
        if (x.to.k === 'found') return 6;
        if (reveals) return 5;
        if (x.from.k === 'waste') return 4;
        if (x.from.k === 'found') return -1;
        if (col && col.c.length - x.n === 0 && x.to.k === 'tab' && st.tab[x.to.i].c.length === 0) return -1;
        return col && col.c.length - x.n === col.d && col.d === 0 ? 0.5 : 0;
      };
      const best = all.map(x => ({ x, v: score(x) })).filter(o => o.v > 0).sort((a, b) => b.v - a.v)[0];
      m = best?.x ?? null;
    }
    showHint(m, st);
  };

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2400);
    return () => clearTimeout(t);
  }, [hint]);

  /* ------------------------------------------------------------------ stuck + auto-complete */
  useEffect(() => {
    if (!game || isWon(game) || game.hist.length === 0) return;
    const t = setTimeout(() => {
      const st = game.st;
      let none: boolean;
      if (st.game === 'klondike') {
        // Vegas with no passes left: only the waste's top card is still in reach
        none = !klondikeHasUsefulMove(kCanDraw(st) ? st : { ...st, stock: [], waste: st.waste.slice(-1) });
      } else none = spHint(st) === null;
      if (none) { setStuck(true); sfx.alert(); }
    }, 700);
    return () => clearTimeout(t);
  }, [game]);

  const canAuto = !!game && game.st.game === 'klondike' && kCanAutoComplete(game.st);
  useEffect(() => {
    if (!autoRun) return;
    const t = setInterval(() => {
      const g = gameRef.current;
      if (!g || g.st.game !== 'klondike' || isWon(g)) { setAutoRun(false); return; }
      const m = kAutoStep(g.st);
      if (!m) { setAutoRun(false); return; }
      doMove(m, { quiet: false });
    }, reduce ? 40 : 105);
    return () => clearInterval(t);
  }, [autoRun, doMove, reduce]);

  /* ------------------------------------------------------------------ keyboard (desktop) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (menu || confirmNew || phase !== 'play') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); onUndo(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'u' || k === 'backspace') onUndo();
      else if (k === 'h') onHint();
      else if (k === ' ' || k === 'd') { e.preventDefault(); onTap({ k: 'stock' }, -1); }
      else if (k === 'a' && canAuto) setAutoRun(true);
      else if (k === 'c') collect();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ------------------------------------------------------------------ celebration */
  const launches = useMemo<Launch[]>(() => {
    if (phase !== 'cascade' || !game || !size.w) return [];
    const st = game.st;
    const lay = st.game === 'klondike' ? klondikeLayout(st, size.w, size.h) : spiderLayout(st, size.w, size.h);
    const rect = mid.current?.getBoundingClientRect();
    const ox = rect?.left ?? 0, oy = rect?.top ?? 0;
    const out: Launch[] = [];
    if (st.game === 'klondike') {
      for (let r = 12; r >= 0; r--) for (let i = 0; i < 4; i++) {
        const id = (st as KState).found[i][r];
        const p = lay.poses.get(id);
        if (p) out.push({ card: kCard(id), x: p.x + ox, y: p.y + oy });
      }
    } else {
      const sp = st as SpState;
      for (let k = 12; k >= 0; k--) sp.done.forEach((run, j) => {
        const id = run[12 - k];
        const p = lay.poses.get(id);
        if (p && (k % 2 === 0 || j % 2 === 0)) out.push({ card: sp.cards[id], x: p.x + ox, y: p.y + oy });
      });
    }
    return out;
  }, [phase, game, size.w, size.h]);
  const cw = useMemo(() => {
    if (!game || !size.w) return { cw: 50, ch: 72 };
    const lay = game.st.game === 'klondike' ? klondikeLayout(game.st, size.w, size.h) : spiderLayout(game.st, size.w, size.h);
    return { cw: lay.cw, ch: lay.ch };
  }, [game, size.w, size.h]);
  const toResults = useCallback(() => setPhase(p => (p === 'cascade' ? 'results' : p)), []);

  /* ------------------------------------------------------------------ menu actions */
  const pickMode = (m: Mode) => { persist(gameRef.current, { prefs: { ...saveRef.current.prefs, mode: m } }); };
  const pickVegas = (v: boolean) => { persist(gameRef.current, { prefs: { ...saveRef.current.prefs, vegas: v } }); };
  const playNew = () => askNew(() => deal(saveRef.current.prefs.mode, false));
  const playDaily = () => askNew(() => deal('klondike-1', true));
  const inProgress = !!game && !isWon(game);
  const exit = () => {
    if (game && !isWon(game)) writeSave({ ...saveRef.current, game: { ...game, seconds: clockRef.current } });
    onExit();
  };

  const score = game ? liveScore({ ...game, seconds: clock }) : 0;
  const moves = game?.st.moves ?? 0;
  const vegasMoney = game?.st.game === 'klondike' && game.st.vegas;
  const locale = intlLocale(lang);
  const dailyRec = save.daily[today];
  const signedIn = !!app.session;

  return (
    <div className={`sol ${game?.st.game ?? 'none'} ${phase !== 'play' ? 'celebrating' : ''}`}>
      <div className="sol-room" />
      <header className="sol-hud">
        <button className="glyph" aria-label={s.exit} title={s.exit} onClick={exit}><IconBack /></button>
        <div className="sol-hudmid">
          <div className="sol-title">
            <span className="serif">{game ? (game.day ? s.daily : modeLabel(game.mode, s)) : s.title}</span>
            {game?.day && <em>{dayLabel(game.day, locale)}</em>}
          </div>
          <div className="sol-nums" aria-live="off">
            <span><small>{s.score}</small><b className="serif">{vegasMoney ? `${score < 0 ? '−' : ''}$${Math.abs(score)}` : score}</b></span>
            <span><small>{s.time}</small><b className="serif">{fmtTime(clock)}</b></span>
            <span><small>{s.moves}</small><b className="serif">{moves}</b></span>
          </div>
        </div>
        <button className="glyph" aria-label={s.menu} title={s.menu} onClick={() => setMenu(true)}><IconMenu /></button>
      </header>

      <div className="sol-mid" ref={mid}>
        {game && size.w > 0 && (
          <Board st={game.st} W={size.w} H={size.h} lang={lang} dealKey={dealKey} dealIn={dealIn && !reduce} hint={hint} shake={shake}
            onDrop={m => { if (doMove(m)) buzz(6); }} onTap={onTap} onDoubleTap={onDoubleTap} onFeltDoubleTap={collect}
            onDragStart={() => setHint(null)} hideCards={phase !== 'play'} />
        )}
        <AnimatePresence>
          {busy && (
            <motion.div key="busy" className="sol-busy" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <span className="dots"><i /><i /><i /></span>{s.shuffling}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="sol-bar">
        <button className="glyph" aria-label={s.newGame} title={s.newGame} onClick={() => askNew(() => deal(game?.mode && !game.day ? game.mode : prefs.mode, false))}><IconNew /></button>
        <button className="glyph" aria-label={s.undo} title={s.undo} disabled={!game || !canUndo(game) || autoRun} onClick={onUndo}><IconUndo /></button>
        <button className="glyph" aria-label={s.hint} title={s.hint} disabled={!game || isWon(game) || autoRun} onClick={onHint}><IconHint /></button>
        <AnimatePresence>
          {canAuto && !autoRun && (
            <motion.button key="auto" className="glyph auto" aria-label={s.auto} title={s.auto} onClick={() => setAutoRun(true)}
              initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}><IconWand /></motion.button>
          )}
        </AnimatePresence>
      </footer>

      <AnimatePresence>
        {canAuto && !autoRun && phase === 'play' && (
          <motion.button key="autocta" className="sol-autocta" onClick={() => setAutoRun(true)}
            initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
            <IconWand /><span>{s.auto}</span>
          </motion.button>
        )}
        {stuck && phase === 'play' && !canAuto && (
          <motion.div key="stuck" className="sol-stuck" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
            <div><b>{s.noMoves}</b><small>{s.noMovesSub}</small></div>
            <button className="btn ghost sm" onClick={onUndo} disabled={!game || !canUndo(game)}>{s.undo}</button>
            <button className="btn acc sm" onClick={playNew}>{s.newGame}</button>
          </motion.div>
        )}
        {toast && phase === 'play' && !stuck && !canAuto && (
          <motion.div key={toast.key} className="sol-toast" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'cascade' && <Cascade launches={launches} cw={cw.cw} ch={cw.ch} reduce={reduce} onDone={toResults} />}
      {phase === 'cascade' && <div className="sol-skip">{s.skip}</div>}

      <AnimatePresence>
        {phase === 'results' && win && (
          <motion.div key="res" className="sol-menu results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SuitConfetti />
            <motion.div className="sol-sheet sol-win" initial={{ y: 60, scale: 0.9, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
              <div className="crown">♠ ♥ ♣ ♦</div>
              <h2 className="serif">{win.daily ? s.wonDaily : s.won}</h2>
              <p className="mute">{game ? (game.day ? `${s.daily} · ${dayLabel(game.day, locale)}` : modeLabel(game.mode, s)) : ''}</p>
              <div className="sol-trio">
                <span className={win.bestTime ? 'best' : ''}><small>{s.time}</small><b className="serif">{fmtTime(win.seconds)}</b>{win.bestTime && <em>{s.newBest}</em>}</span>
                <span className={win.bestMoves ? 'best' : ''}><small>{s.moves}</small><b className="serif">{win.moves}</b>{win.bestMoves && <em>{s.newBest}</em>}</span>
                <span className={win.bestScore ? 'best' : ''}><small>{s.score}</small><b className="serif">{win.score}</b>{win.bestScore && <em>{s.newBest}</em>}</span>
              </div>
              {win.reward && (typeof win.reward.bm === 'number' || typeof win.reward.xp === 'number') && (
                <div className="sol-reward">
                  {typeof win.reward.bm === 'number' && <span>+{win.reward.bm} BM</span>}
                  {typeof win.reward.xp === 'number' && <span>+{win.reward.xp} XP</span>}
                </div>
              )}
              {!signedIn && <button className="sol-signin" onClick={onAuth}>{s.signIn}</button>}
              <div className="sol-actions">
                <button className="btn ghost" onClick={() => { setPhase('play'); setWin(null); setMenu(true); }}>{s.menu}</button>
                <button className="btn acc" onClick={() => deal(game?.day ? prefs.mode : game?.mode ?? prefs.mode, false)}>{s.newGame}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menu && phase === 'play' && (
          <Menu key="menu" s={s} mode={prefs.mode} vegas={prefs.vegas} stats={save.stats} daily={dailyRec} dayLabel={dayLabel(today, locale)}
            canContinue={inProgress} busy={busy} onMode={pickMode} onVegas={pickVegas} onPlay={playNew} onDaily={playDaily}
            onContinue={() => setMenu(false)} onClose={inProgress ? () => setMenu(false) : undefined} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmNew && (
          <motion.div key="confirm" className="sol-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="sol-sheet sol-confirm" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <h3 className="serif">{s.abandonTitle}</h3>
              <p className="mute">{s.abandonSub}</p>
              <div className="sol-actions">
                <button className="btn ghost" onClick={() => setConfirmNew(null)}>{s.keep}</button>
                <button className="btn acc" onClick={() => { const f = confirmNew; setConfirmNew(null); f(); }}>{s.abandonYes}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

