import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { GameResult, GameScreenProps } from '../../types';
import { reportGame, reportStart } from '../../session';
import { GameResultSheet } from '../../GameResultSheet';
import { useApp } from '../../../store';
import { intlLocale } from '../../../i18n';
import { buzz, sfx } from '../../../sound';
import { rigaDay } from '../../solitaire/engine/cards';
import { Cascade, type Launch } from '../../solitaire/ui/Celebration';
import { IconBack, IconHint, IconMenu, IconNew, IconUndo, IconWand } from '../../solitaire/ui/icons';
import { dayLabel, fmtTime } from '../../solitaire/ui/format';
import { fcStrings } from '../strings';
import { loadSave, recordResult, writeSave, type FcSave } from '../store';
import { canUndo, dealFromSeed, isWon, newGame, play, playAuto, randomDeal, scoreOf, undo, type FcGame } from '../engine/game';
import { isSeed } from '../../seed';
import { UNSOLVABLE } from '../engine/deal';
import {
  allMoves, autoStep, canFinish, cardId, fcCard, finishStep, foundCount, maxMovable, movingCards, noMoves, runLength,
  sendMove, stacks, tapMove, type FcMove, type FcState, type Loc,
} from '../engine/rules';
import { computeDaily, computeSolve } from '../compute';
import { FcBoard, type HintMark } from './FcBoard';
import { fcLayout, locKey } from './layout';
import { FcMenu } from './Menu';
import '../../solitaire/solitaire.css';
import '../freecell.css';

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

const cardsAt = (st: FcState, loc: Loc): number[] =>
  loc.k === 'col' ? st.cols[loc.i] : loc.k === 'cell' ? (st.cells[loc.i] == null ? [] : [st.cells[loc.i]!]) : Array.from({ length: st.found[loc.i] }, (_, r) => cardId(loc.i, r + 1));

export default function FreeCell({ onExit, onAuth, seed }: GameScreenProps) {
  const app = useApp();
  const lang = app.lang;
  const s = fcStrings(lang);
  const reduce = !!useReducedMotion();

  const [save, setSave] = useState<FcSave>(() => loadSave());
  // a challenge seed (../../types.ts): no menu and no resume — its deal is dealt on mount
  const seeded = isSeed(seed) ? seed : null;
  const [game, setGame] = useState<FcGame | null>(() => (!seeded && save.game && !isWon(save.game) ? save.game : null));
  const [dealKey, setDealKey] = useState('resume');
  const [dealIn, setDealIn] = useState(false);
  const [menu, setMenu] = useState(() => !game && !seeded);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<HintMark | null>(null);
  const [thinking, setThinking] = useState(false);
  const [shake, setShake] = useState<{ id: number; key: number } | null>(null);
  const [stuck, setStuck] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [phase, setPhase] = useState<'play' | 'cascade' | 'results'>('play');
  const [result, setResult] = useState<{ r: GameResult; report: Promise<Record<string, unknown> | null> } | null>(null);
  const [confirmNew, setConfirmNew] = useState<null | (() => void)>(null);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [clock, setClock] = useState(() => game?.seconds ?? 0);

  const clockRef = useRef(clock);
  const gameRef = useRef(game); gameRef.current = game;
  const saveRef = useRef(save); saveRef.current = save;
  const mid = useRef<HTMLDivElement>(null);
  const size = useSize(mid);
  const today = rigaDay();

  /* ------------------------------------------------------------------ persistence */
  const persist = useCallback((g: FcGame | null, patch?: Partial<FcSave>) => {
    const next: FcSave = { ...saveRef.current, ...patch, game: g ? { ...g, seconds: clockRef.current } : null };
    saveRef.current = next;
    setSave(next);
    writeSave(next);
  }, []);

  // flush the clock when the page goes away
  useEffect(() => {
    const flush = () => { const g = gameRef.current; if (g && !isWon(g)) writeSave({ ...saveRef.current, game: { ...g, seconds: clockRef.current } }); };
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
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  /* ------------------------------------------------------------------ results */
  const resultOf = (g: FcGame, won: boolean, seconds: number): GameResult => ({
    game: 'freecell', won, score: scoreOf({ ...g, seconds }, won), seconds, level: 'classic', day: g.day,
    details: { moves: g.moves, undos: g.undos, deal: g.deal },
    // the deal number is the seed (dealFromSeed): any game can be sent to a friend as the very same deal
    seed: String(g.deal),
  });

  const finishWin = useCallback((g: FcGame) => {
    const seconds = clockRef.current;
    const done: FcGame = { ...g, seconds, reported: true };
    const r = resultOf(done, true, seconds);
    const rec = recordResult(saveRef.current, done, true, r.score ?? 0);
    persist(null, { stats: rec.save.stats, daily: rec.save.daily });
    setGame(done);
    setResult({ r, report: reportGame(r) });
    setPhase('cascade');
    setFinishing(false);
    sfx.fanfare();
    buzz([20, 40, 30]);
  }, [persist]); // eslint-disable-line react-hooks/exhaustive-deps

  /** a started game that is left for a new one counts as a loss */
  const reportAbandon = (g: FcGame) => {
    if (!g.hist.length || isWon(g) || g.reported) return;
    const seconds = clockRef.current;
    const r = resultOf(g, false, seconds);
    const rec = recordResult(saveRef.current, { ...g, seconds }, false, r.score ?? 0);
    saveRef.current = { ...saveRef.current, stats: rec.save.stats, daily: rec.save.daily };
    void reportGame(r);
  };

  /* ------------------------------------------------------------------ new deals */
  const deal = useCallback(async (kind: 'random' | 'daily' | number) => {
    setBusy(true);
    let n: number, day: string | undefined;
    if (kind === 'daily') {
      day = today;
      n = saveRef.current.deals[today] ?? await computeDaily(today);
    } else n = kind === 'random' ? randomDeal() : kind;
    const g = newGame(n, day);
    clockRef.current = 0; setClock(0);
    gameRef.current = g;
    setGame(g);
    persist(g, day ? { deals: { ...saveRef.current.deals, [day]: n } } : undefined);
    setDealKey(`${n}:${Date.now()}`);
    setDealIn(true);
    setHint(null); setStuck(false); setResult(null); setPhase('play'); setFinishing(false);
    setMenu(false); setBusy(false);
    sfx.shuffle();
    reportStart('freecell', { deal: n, daily: !!day });
    for (let k = 0; k < 14; k++) setTimeout(() => sfx.deal((k % 5) / 2 - 1), 160 + k * 80);
    if (!saveRef.current.tips) { setTimeout(() => flash(s.tipTap), 1700); persist(g, { tips: true }); }
    else if (UNSOLVABLE.includes(n)) setTimeout(() => flash(s.unsolvable(n)), 1400);
    else setTimeout(() => flash(day ? `${s.daily} · ${s.dealNo(n)}` : s.dealNo(n)), 1400);
  }, [persist, today, s]);

  const seededOnce = useRef(false);
  useEffect(() => {
    if (!seeded || seededOnce.current) return;
    seededOnce.current = true;
    void deal(dealFromSeed(seeded));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const askNew = (then: () => void) => {
    const g = gameRef.current;
    if (g && g.hist.length && !isWon(g) && !g.reported) setConfirmNew(() => () => { reportAbandon(g); then(); });
    else then();
  };

  /* ------------------------------------------------------------------ moves */
  const commit = useCallback((ng: FcGame) => {
    gameRef.current = ng;
    setGame(ng);
    setHint(null);
    setStuck(false);
    if (isWon(ng)) { finishWin(ng); return; }
    persist(ng);
  }, [finishWin, persist]);

  const doMove = useCallback((m: FcMove): boolean => {
    const g = gameRef.current;
    if (!g) return false;
    const next = play(g, m);
    if (!next) return false;
    if (m.to.k === 'found') sfx.flick(); else sfx.play();
    setDealIn(false);
    commit({ ...next, seconds: clockRef.current });
    return true;
  }, [commit]);

  const nope = (loc: Loc, index: number) => {
    const g = gameRef.current;
    if (!g) return;
    const cards = cardsAt(g.st, loc);
    const id = cards[index] ?? cards[cards.length - 1];
    if (id == null) return;
    setShake({ id, key: Date.now() });
    buzz(12);
  };

  /** tap could not move a run only because it is too long for a supermove right now */
  const explainTooMany = (st: FcState, loc: Loc, index: number): boolean => {
    if (loc.k !== 'col') return false;
    const col = st.cols[loc.i];
    const n = col.length - index;
    if (n < 2 || n > runLength(col)) return false;
    const fits = st.cols.some((c, j) => j !== loc.i && (c.length ? stacks(c[c.length - 1], col[index]) : n < col.length));
    if (!fits || !movingCards(st, loc, n)) return false;
    flash(s.tooMany(maxMovable(st, false)));
    return true;
  };

  const onTap = useCallback((loc: Loc, index: number) => {
    const g = gameRef.current;
    if (!g || isWon(g) || finishing) return;
    if (loc.k === 'found') return;
    const m = tapMove(g.st, loc, index);
    if (m && doMove(m)) return;
    if (!explainTooMany(g.st, loc, index)) nope(loc, index);
  }, [doMove, finishing]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDoubleTap = useCallback((loc: Loc, index: number) => {
    const g = gameRef.current;
    if (!g || finishing) return;
    const m = sendMove(g.st, loc);
    if (!m || !doMove(m)) nope(loc, index);
  }, [doMove, finishing]); // eslint-disable-line react-hooks/exhaustive-deps

  const onUndo = () => {
    const g = gameRef.current;
    if (!g || !canUndo(g) || finishing) return;
    const u = undo(g);
    gameRef.current = u;
    setGame(u); setDealIn(false); setHint(null); setStuck(false);
    persist(u);
    sfx.draw();
  };

  /* ------------------------------------------------------------------ safe cards home, gathering at the end */
  useEffect(() => {
    if (!game || isWon(game) || phase !== 'play' || menu) return;
    const m = finishing ? finishStep(game.st) : autoStep(game.st);
    if (!m) { if (finishing) setFinishing(false); return; }
    const delay = dealIn && game.hist.length === 0 ? 1900 : reduce ? 30 : finishing ? 85 : 120;
    const t = setTimeout(() => {
      const g = gameRef.current;
      if (!g || g !== game) return;
      const next = playAuto(g, m);
      if (!next) return;
      sfx.flick();
      commit({ ...next, seconds: clockRef.current });
    }, delay);
    return () => clearTimeout(t);
  }, [game, phase, menu, finishing, dealIn, reduce, commit]);

  // offered only once the safe sends are done (otherwise it would flash up while the cards are already flying home)
  const canAuto = !!game && !isWon(game) && canFinish(game.st) && !autoStep(game.st) && !finishing && phase === 'play';

  /* ------------------------------------------------------------------ stuck */
  useEffect(() => {
    if (!game || isWon(game) || game.hist.length === 0) return;
    const t = setTimeout(() => {
      if (!autoStep(game.st) && noMoves(game.st)) { setStuck(true); sfx.alert(); }
    }, 700);
    return () => clearTimeout(t);
  }, [game]);

  /* ------------------------------------------------------------------ hint (the solver's next move) */
  const showHint = (m: FcMove, st: FcState) => {
    const src = cardsAt(st, m.from);
    setHint({ cards: src.slice(src.length - m.n), to: locKey(m.to), key: Date.now() });
    sfx.tap();
  };

  const onHint = async () => {
    const g = gameRef.current;
    if (!g || isWon(g) || finishing || thinking) return;
    const st = g.st;
    setThinking(true);
    const r = await computeSolve(st, 40_000);
    setThinking(false);
    if (gameRef.current?.st !== st) return;
    if (r?.result === 'solved' && r.path?.length) { showHint(r.path[0], st); return; }
    if (r?.result === 'unsolvable') { flash(s.noLine); sfx.alert(); return; }
    // no line found within the budget: the most useful legal move
    const score = (m: FcMove) => (m.to.k === 'found' ? 5 : m.to.k === 'col' && st.cols[m.to.i].length ? 3 + m.n * 0.1 : m.to.k === 'col' ? 1 : 0.5);
    const best = allMoves(st).sort((a, b) => score(b) - score(a))[0];
    if (best) showHint(best, st); else { setStuck(true); sfx.alert(); }
  };

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2600);
    return () => clearTimeout(t);
  }, [hint]);

  /* ------------------------------------------------------------------ keyboard (desktop) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (menu || confirmNew || phase !== 'play') return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); onUndo(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'u' || k === 'backspace') onUndo();
      else if (k === 'h') void onHint();
      else if (k === 'a' && canAuto) setFinishing(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ------------------------------------------------------------------ celebration */
  const launches = useMemo<Launch[]>(() => {
    if (phase !== 'cascade' || !game || !size.w) return [];
    const lay = fcLayout(game.st, size.w, size.h);
    const rect = mid.current?.getBoundingClientRect();
    const ox = rect?.left ?? 0, oy = rect?.top ?? 0;
    const out: Launch[] = [];
    for (let r = 13; r >= 1; r--) for (let i = 0; i < 4; i++) {
      const id = cardId(i, r);
      const p = lay.poses.get(id);
      if (p) out.push({ card: fcCard(id), x: p.x + ox, y: p.y + oy });
    }
    return out;
  }, [phase, game, size.w, size.h]);
  const cwh = useMemo(() => {
    if (!game || !size.w) return { cw: 50, ch: 72 };
    const lay = fcLayout(game.st, size.w, size.h);
    return { cw: lay.cw, ch: lay.ch };
  }, [game, size.w, size.h]);
  const toResults = useCallback(() => setPhase(p => (p === 'cascade' ? 'results' : p)), []);

  /* ------------------------------------------------------------------ menu actions */
  const playNew = () => askNew(() => void deal('random'));
  const playDaily = () => askNew(() => void deal('daily'));
  const playNo = (n: number) => askNew(() => void deal(n));
  const inProgress = !!game && !isWon(game);
  const exit = () => {
    if (game && !isWon(game)) writeSave({ ...saveRef.current, game: { ...game, seconds: clockRef.current } });
    onExit();
  };

  const moves = game?.moves ?? 0;
  const home = game ? foundCount(game.st) : 0;
  const locale = intlLocale(lang);
  const dailyRec = save.daily[today];
  const facts = result && game ? [
    { label: s.moves, value: String(game.moves) },
    { label: s.deal, value: `#${game.deal}` },
  ] : [];

  return (
    <div className={`sol fc ${phase !== 'play' ? 'celebrating' : ''}`}>
      <div className="sol-room" />
      <header className="sol-hud">
        <button className="glyph" aria-label={s.exit} title={s.exit} onClick={exit}><IconBack /></button>
        <div className="sol-hudmid">
          <div className="sol-title">
            <span className="serif">{game ? (game.day ? s.daily : s.title) : s.title}</span>
            {game && <em>{game.day ? `${dayLabel(game.day, locale)} · #${game.deal}` : `#${game.deal}`}</em>}
          </div>
          <div className="sol-nums" aria-live="off">
            <span><small>{s.time}</small><b className="serif">{fmtTime(clock)}</b></span>
            <span><small>{s.moves}</small><b className="serif">{moves}</b></span>
            <span className="fc-home"><small>♠♥♣♦</small><b className="serif">{home}<i>/52</i></b></span>
          </div>
        </div>
        <button className="glyph" aria-label={s.menu} title={s.menu} onClick={() => setMenu(true)}><IconMenu /></button>
      </header>

      <div className="sol-mid" ref={mid}>
        {game && size.w > 0 && (
          <FcBoard st={game.st} W={size.w} H={size.h} lang={lang} dealKey={dealKey} dealIn={dealIn && !reduce} hint={hint} shake={shake}
            onDrop={m => { if (doMove(m)) buzz(6); }} onTooMany={n => { flash(s.tooMany(n)); buzz(12); }}
            onTap={onTap} onDoubleTap={onDoubleTap} onDragStart={() => setHint(null)} hideCards={phase !== 'play'} />
        )}
        <AnimatePresence>
          {(busy || thinking) && (
            <motion.div key="busy" className="sol-busy" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <span className="dots"><i /><i /><i /></span>{busy ? s.shuffling : s.thinking}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="sol-bar">
        <button className="glyph" aria-label={s.newGame} title={s.newGame} onClick={playNew}><IconNew /></button>
        <button className="glyph" aria-label={s.undo} title={s.undo} disabled={!game || !canUndo(game) || finishing} onClick={onUndo}><IconUndo /></button>
        <button className="glyph" aria-label={s.hint} title={s.hint} disabled={!game || isWon(game) || finishing || thinking} onClick={() => void onHint()}><IconHint /></button>
        <AnimatePresence>
          {canAuto && (
            <motion.button key="auto" className="glyph auto" aria-label={s.auto} title={s.auto} onClick={() => setFinishing(true)}
              initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}><IconWand /></motion.button>
          )}
        </AnimatePresence>
      </footer>

      <AnimatePresence>
        {canAuto && (
          <motion.button key="autocta" className="sol-autocta" onClick={() => setFinishing(true)}
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

      {phase === 'cascade' && <Cascade launches={launches} cw={cwh.cw} ch={cwh.ch} reduce={reduce} onDone={toResults} />}
      {phase === 'cascade' && <div className="sol-skip">{s.skip}</div>}

      <AnimatePresence>
        {phase === 'results' && result && (
          <GameResultSheet key="res" result={result.r} report={result.report} headline={result.r.day ? s.wonDaily : s.won} facts={facts}
            onAgain={() => void deal('random')} onExit={() => { setPhase('play'); setResult(null); onExit(); }} onAuth={onAuth} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menu && phase === 'play' && (
          <FcMenu key="menu" s={s} stats={save.stats} daily={dailyRec} dayLabel={dayLabel(today, locale)}
            canContinue={inProgress} busy={busy} onPlay={playNew} onDaily={playDaily} onDeal={playNo}
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
