import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { useApp } from '../../store';
import { useStrings } from '../../i18n/pick';
import { buzz, sfx } from '../../sound';
import { useCosmetics } from '../../cosmetics/useCosmetics';
import { VictoryEffect } from '../../cosmetics/VictoryEffect';
import { GameResultSheet } from '../GameResultSheet';
import type { GameResult } from '../types';
import { geoOf, isFree, tilesLeft } from './core/board';
import { giveUp, hintFor, match, movesOf, shuffleGame, shufflesLeft, takeHint, undo, type Game } from './core/game';
import { COMBO_MS, finalScore } from './core/score';
import { dailyNo } from './core/daily';
import { randomSeed } from './core/rng';
import { matches } from './core/tiles';
import { layoutOf } from './core/layouts';
import { Board, type Fly } from './Board';
import { Face, TileSprite, type Skin } from './TileArt';
import { dropGame, recordFinished, saveGame, setSettings, useSaved } from './store';
import { MAHJONG_STRINGS, type MahjongStrings } from './strings';
import { IcBack, IcFlag, IcGear, IcHint, IcPause, IcPlay, IcRestart, IcShuffle, IcSound, IcUndo, IcZoomIn, IcZoomOut, IcClose } from './icons';
import { fmtTime } from './time';

interface Props {
  initial: Game;
  onLobby: () => void;
  /** after a game: another deal of the same layout */
  onAgain: (g: Game) => void;
  onRestart: (g: Game) => void;
  onAuth: () => void;
}

interface End { result: GameResult; facts: { label: string; value: string }[] }

export function Play({ initial, onLobby, onAgain, onRestart, onAuth }: Props) {
  const s = useStrings(MAHJONG_STRINGS);
  const app = useApp();
  const st = useSaved().settings;
  const cos = useCosmetics();
  const [g, setG] = useState(initial);
  const gRef = useRef(g);
  const msRef = useRef(initial.ms);
  const [sel, setSel] = useState(-1);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [shake, setShake] = useState<{ i: number; k: number } | null>(null);
  const [flies, setFlies] = useState<Fly[]>([]);
  const [dealKey, setDealKey] = useState(() => `${initial.key}:${initial.seed}:${initial.shuffles}`);
  const [paused, setPaused] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<{ text: string; k: number } | null>(null);
  const [zoomReq, setZoomReq] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [end, setEnd] = useState<End | null>(null);
  const [showEnd, setShowEnd] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const playing = g.status === 'play';
  const geo = geoOf(g.layout);
  const left = tilesLeft(g.faces);
  const moves = useMemo(() => (playing ? movesOf(g).length : 0), [g, playing]);
  const stuck = playing && left > 0 && moves === 0 && !flies.length;
  const active = playing && !paused && !sheet && !stuck;
  const daily = g.mode === 'daily';

  /* ------------------------------------------------------------ persistence */
  const persist = useCallback(() => { const x = gRef.current; if (x.status === 'play') saveGame({ ...x, ms: msRef.current }); }, []);
  useEffect(() => {
    const t = setInterval(persist, 5000);
    const vis = () => { if (document.visibilityState === 'hidden') { setPaused(p => p || gRef.current.status === 'play'); persist(); } };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pagehide', persist);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); window.removeEventListener('pagehide', persist); persist(); };
  }, [persist]);

  const commit = useCallback((next: Game) => {
    const x = { ...next, ms: msRef.current };
    gRef.current = x;
    setG(x);
    saveGame(x);
    return x;
  }, []);

  const flash = useCallback((text: string) => { const k = Date.now(); setToast({ text, k }); setTimeout(() => setToast(t => (t?.k === k ? null : t)), 2200); }, []);

  /* ------------------------------------------------------------ finishing */
  const finish = useCallback((x: Game) => {
    const won = x.status === 'won';
    const seconds = Math.max(1, Math.round(x.ms / 1000));
    const score = finalScore({ score: x.score, tiles: layoutOf(x.layout).length, seconds, won });
    recordFinished(x, seconds, score);
    const result: GameResult = {
      game: 'mahjong', won, score, seconds, level: x.layout, ...(x.mode === 'daily' && x.day ? { day: x.day } : {}),
      details: { hints: x.hints, shuffles: x.shuffles },
    };
    setEnd({
      result,
      facts: [
        { label: s.facts.layout, value: s.layouts[x.layout] },
        ...(won ? [] : [{ label: s.cleared, value: `${Math.round((1 - tilesLeft(x.faces) / x.faces.length) * 100)}%` }]),
        { label: s.facts.combo, value: `×${Math.max(1, x.bestCombo)}` },
        { label: s.facts.hints, value: String(x.hints) },
        { label: s.facts.shuffles, value: String(x.shuffles) },
      ],
    });
    setSel(-1); setHint(null);
    if (won) {
      setTimeout(() => { setCelebrate(true); sfx.big(); buzz([30, 60, 30, 60, 140]); }, 420);
      setTimeout(() => setShowEnd(true), 1900);
    } else {
      setTimeout(() => setShowEnd(true), 500);
    }
  }, [s]);

  /* ------------------------------------------------------------ moves */
  const tap = useCallback((i: number) => {
    const x = gRef.current;
    if (paused || x.status !== 'play' || x.faces[i] < 0) return;
    if (!isFree(geo, x.faces, i)) {
      setShake({ i, k: Date.now() }); sfx.flick(); buzz([12, 30, 12]);
      return;
    }
    if (sel < 0) { setSel(i); sfx.tap(); buzz(6); return; }
    if (sel === i) { setSel(-1); sfx.tap(); return; }
    if (!matches(x.faces[sel], x.faces[i])) { setSel(i); sfx.tap(); buzz(6); return; }
    const r = match(x, sel, i, msRef.current);
    if (!r) return;
    const next = commit(r.game);
    setSel(-1); setHint(null);
    setFlies(f => [...f, { k: Date.now() + Math.random(), a: sel, b: i, fa: x.faces[sel], fb: x.faces[i], combo: r.combo, points: r.points, last: next.status === 'won' }]);
    setTimeout(() => {
      sfx.flip();
      if (r.combo >= 3) sfx.chain(Math.min(4, r.combo - 1)); else if (r.combo === 2) sfx.coin(); else sfx.play();
      buzz(r.combo > 1 ? [10, 30, 16] : 14);
    }, 260);
    if (next.status !== 'play') finish(next);
  }, [commit, finish, geo, paused, sel]);

  const doUndo = useCallback(() => {
    if (paused) return;
    const r = undo(gRef.current);
    if (!r) return;
    commit(r); setSel(-1); setHint(null); setFlies([]); sfx.flick(); buzz(8);
  }, [commit, paused]);

  const doHint = useCallback(() => {
    const x = gRef.current;
    if (paused || x.status !== 'play') return;
    if (hint) { setHint(null); return; }
    const h = hintFor(x);
    if (!h) return;
    commit(takeHint(x, h.plan));
    setSel(-1); setHint(h.pair); sfx.shield(); buzz(10);
  }, [commit, hint, paused]);

  const doShuffle = useCallback(() => {
    const x = gRef.current;
    if (paused || x.status !== 'play') return;
    const r = shuffleGame(x, randomSeed());
    if (!r) return;
    const next = commit(r.game);
    setSel(-1); setHint(null); setFlies([]);
    setDealKey(`${next.key}:${next.seed}:${next.shuffles}`);
    sfx.shuffle(); buzz([10, 20, 10, 20, 10]);
    flash(r.solvable ? s.shuffled : s.unsolvable);
  }, [commit, flash, paused, s]);

  const endGame = useCallback(() => { const x = commit(giveUp(gRef.current)); sfx.alert(); finish(x); }, [commit, finish]);
  const onFlyDone = useCallback((k: number) => setFlies(f => f.filter(x => x.k !== k)), []);

  useEffect(() => { if (stuck) { sfx.alert(); buzz([40, 60, 40]); } }, [stuck]);
  useEffect(() => { if (!hint) return; const t = setTimeout(() => setHint(null), 4500); return () => clearTimeout(t); }, [hint]);

  /* ------------------------------------------------------------ keyboard */
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keys.current = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
      if (sheet) { if (e.key === 'Escape') setSheet(false); return; }
      if (showEnd) return;
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'p') { e.preventDefault(); if (playing) setPaused(p => !p); return; }
      if (paused) return;
      if (k === 'escape') { setSel(-1); setHint(null); return; }
      if (k === 'h') { doHint(); return; }
      if (k === 's') { doShuffle(); return; }
      if (k === 'z' || k === 'u' || k === 'backspace') { e.preventDefault(); doUndo(); }
    };
  });
  useEffect(() => { const f = (e: KeyboardEvent) => keys.current(e); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, []);

  /* ------------------------------------------------------------ view */
  const title = s.layouts[g.layout];
  const sub = daily ? `${s.daily} · ${s.dailyNo(dailyNo(g.day!))}` : s.free;
  const comboLive = g.combo > 1 && g.lastAt != null;

  return (
    <div className={`mj-play ${daily ? 'is-daily' : ''}`}>
      <TileSprite skin={st.skin} />
      <header className="mj-bar">
        <button type="button" className="mj-ib" onClick={() => { sfx.tap(); persist(); onLobby(); }} aria-label={s.back} title={s.back}><IcBack /></button>
        <div className="mj-ttl">
          <small>{sub}</small>
          <b className="serif">{title}</b>
        </div>
        <button type="button" className="mj-ib" onClick={() => { sfx.tap(); setSheet(true); }} aria-label={s.tools.settings} title={s.tools.settings}><IcGear /></button>
      </header>

      <div className="mj-hud">
        <Stat label={s.time} value={<Clock msRef={msRef} initial={initial.ms} active={active} />} />
        <Stat label={s.score} value={<ScoreNum v={g.score} />} gold />
        <Stat label={s.hud.tiles} value={String(left)} />
        <Stat label={s.hud.moves} value={String(moves)} bad={stuck} />
        <AnimatePresence>
          {comboLive && (
            <motion.span key={'c' + g.lastAt} className="mj-combo" initial={{ scale: 0.4, opacity: 0, y: 6 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 520, damping: 20 }}>
              <b>{s.combo(g.combo)}</b>
              <i style={{ animationDuration: `${COMBO_MS}ms` }} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="mj-stage">
        <Board layout={g.layout} faces={g.faces} skin={st.skin} dim={st.dim} sel={sel} hint={hint} shake={shake} flies={flies}
          dealKey={dealKey} paused={paused} zoomReq={zoomReq} onTile={tap} onFlyDone={onFlyDone} onZoom={setZoomed} />
        <AnimatePresence>
          {paused && playing && (
            <motion.button type="button" key="pause" className="mj-pause" onClick={() => { setPaused(false); sfx.tap(); }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <span className="mj-pausebtn"><IcPlay size={30} /></span>
              <b className="serif">{s.paused}</b>
              <small>{s.resume}</small>
            </motion.button>
          )}
          {stuck && !paused && (
            <motion.div key="stuck" className="mj-stuck" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="mj-stuckcard" initial={{ y: 30, scale: 0.92 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
                <span className="mj-stuckic"><IcShuffle /></span>
                <h3 className="serif">{s.noMoves.title}</h3>
                <p>{shufflesLeft(g) ? s.noMoves.sub : s.noMoves.none}</p>
                {shufflesLeft(g) > 0 && (
                  <button type="button" className="btn acc" onClick={doShuffle}><IcShuffle /> {s.noMoves.shuffle(shufflesLeft(g))}</button>
                )}
                <div className="mj-stuckrow">
                  <button type="button" className="btn ghost sm" onClick={doUndo} disabled={!g.history.length}><IcUndo /> {s.noMoves.undo}</button>
                  <button type="button" className="btn ghost sm" onClick={endGame}><IcFlag /> {s.noMoves.end}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {celebrate && !showEnd && <WinBurst key="win" skin={st.skin} title={s.win} score={end?.result.score ?? 0} />}
        </AnimatePresence>
        <AnimatePresence>
          {toast && (
            <motion.div key={toast.k} className="mj-toast" initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}>
              <IcShuffle /> {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="mj-tools">
        <Tool label={s.tools.undo} onClick={doUndo} disabled={!g.history.length || !playing || paused}><IcUndo /></Tool>
        <Tool label={s.tools.hint} onClick={doHint} disabled={!playing || paused || moves === 0} on={!!hint}><IcHint />{g.hints > 0 && <em className="mj-badge">{g.hints}</em>}</Tool>
        <Tool label={s.tools.shuffle} onClick={doShuffle} disabled={!playing || paused || shufflesLeft(g) === 0}><IcShuffle /><em className="mj-badge gold">{shufflesLeft(g)}</em></Tool>
        <Tool label={s.tools.zoom} onClick={() => { setZoomReq(z => z + 1); sfx.tap(); }} on={zoomed}>{zoomed ? <IcZoomOut /> : <IcZoomIn />}</Tool>
        <Tool label={paused ? s.resume : s.tools.pause} onClick={() => { if (playing) { setPaused(p => !p); sfx.tap(); } }} disabled={!playing} on={paused}>{paused ? <IcPlay /> : <IcPause />}</Tool>
      </nav>
      <p className="mj-keys">{s.keys}</p>

      <AnimatePresence>
        {sheet && (
          <Settings key="set" s={s} daily={daily} sound={app.sound}
            onSound={() => app.set({ sound: !app.sound })}
            onClose={() => setSheet(false)}
            onRestart={() => { setSheet(false); onRestart(gRef.current); }}
            onAbandon={() => { setSheet(false); if (daily) endGame(); else { dropGame(gRef.current.key); onLobby(); } }} />
        )}
      </AnimatePresence>

      {celebrate && <VictoryEffect id={cos.equipped.victory} />}
      {celebrate && <TileRain />}
      <AnimatePresence>
        {showEnd && end && (
          <GameResultSheet key="end" result={end.result} facts={end.facts} headline={end.result.won ? s.win : undefined}
            onAgain={() => onAgain(gRef.current)} onExit={onLobby} onAuth={onAuth} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Stat({ label, value, gold, bad }: { label: string; value: ReactNode; gold?: boolean; bad?: boolean }) {
  return <span className={`mj-stat ${gold ? 'gold' : ''} ${bad ? 'bad' : ''}`}><small>{label}</small><b>{value}</b></span>;
}

function ScoreNum({ v }: { v: number }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={v} initial={{ y: -10, opacity: 0, scale: 1.25 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 26 }} style={{ display: 'inline-block' }}>
        {v.toLocaleString('fr-FR')}
      </motion.span>
    </AnimatePresence>
  );
}

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
  return <span className="mj-time">{fmtTime(sec)}</span>;
}

function Tool({ label, onClick, disabled, on, children }: { label: string; onClick: () => void; disabled?: boolean; on?: boolean; children: ReactNode }) {
  return (
    <motion.button type="button" className={`mj-tool ${on ? 'on' : ''}`} onClick={onClick} disabled={disabled} aria-label={label} title={label} aria-pressed={on}
      whileTap={{ scale: 0.84 }} transition={{ type: 'spring', stiffness: 600, damping: 24 }}>
      <span className="mj-toolic">{children}</span>
      <small>{label}</small>
    </motion.button>
  );
}

/** The win moment: a fan of tiles springs open behind the headline and the final score. */
const FAN = [34, 31, 0, 32, 38];
function WinBurst({ skin, title, score }: { skin: Skin; title: string; score: number }) {
  return (
    <motion.div className="mj-win" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.08 }} aria-hidden>
      <i className="mj-winrays" />
      <div className="mj-winfan">
        {FAN.map((f, i) => {
          const a = (i - 2) * 17;
          return (
            <motion.div key={i} className="mj-t free" style={{ left: 0, top: 0, zIndex: i === 2 ? 5 : 5 - Math.abs(i - 2) }}
              initial={{ rotate: 0, x: 0, y: 60, scale: 0.3, opacity: 0 }}
              animate={{ rotate: a, x: (i - 2) * 30, y: Math.abs(i - 2) * 10, scale: i === 2 ? 1.12 : 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.08 + Math.abs(i - 2) * 0.07 }}>
              <div className="mj-in"><div className="mj-tb"><Face skin={skin} face={f} /></div></div>
            </motion.div>
          );
        })}
      </div>
      <motion.b className="serif mj-winttl" initial={{ y: 20, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}>{title}</motion.b>
      <motion.span className="mj-winscore" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>{score.toLocaleString('fr-FR')}</motion.span>
    </motion.div>
  );
}

/** Ivory tiles tumbling down the screen behind the win. */
function TileRain() {
  const bits = useMemo(() => Array.from({ length: 26 }, (_, i) => {
    const r = (k: number) => { const x = Math.sin(i * 91.7 + k * 13.1) * 9999; return x - Math.floor(x); };
    return { l: r(1) * 100, d: r(2) * 0.9, dur: 1.6 + r(3) * 1.2, rot: (r(4) - 0.5) * 540, s: 0.6 + r(5) * 0.7 };
  }), []);
  return (
    <div className="mj-rain" aria-hidden>
      {bits.map((b, i) => (
        <motion.i key={i} style={{ left: `${b.l}%`, scale: b.s }} initial={{ y: '-12vh', rotate: 0, opacity: 0 }}
          animate={{ y: '112vh', rotate: b.rot, opacity: [0, 1, 1, 0] }} transition={{ duration: b.dur, delay: b.d, ease: 'easeIn' }} />
      ))}
    </div>
  );
}

function Settings({ s, daily, sound, onSound, onClose, onRestart, onAbandon }: {
  s: MahjongStrings; daily: boolean; sound: boolean; onSound: () => void; onClose: () => void; onRestart: () => void; onAbandon: () => void;
}) {
  const st = useSaved().settings;
  return (
    <>
      <motion.div className="mj-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div className="mj-sheet" role="dialog" aria-modal="true" aria-label={s.settings.title}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
        <div className="mj-sheethead">
          <b className="serif">{s.settings.title}</b>
          <button type="button" className="mj-ib" onClick={onClose} aria-label={s.settings.close}><IcClose /></button>
        </div>
        <div className="mj-row">
          <span>{s.settings.skin}</span>
          <SkinPicker s={s} />
        </div>
        <label className="mj-row">
          <span>{s.settings.dim}</span>
          <Toggle on={st.dim} onChange={() => { setSettings({ dim: !st.dim }); sfx.tap(); }} />
        </label>
        <label className="mj-row">
          <span><IcSound /> {s.settings.sound}</span>
          <Toggle on={sound} onChange={onSound} />
        </label>
        <div className="mj-sheetbtns">
          {!daily && <button type="button" className="btn ghost" onClick={onRestart}><IcRestart /> {s.settings.restart}</button>}
          <button type="button" className="btn ghost danger-t" onClick={onAbandon}><IcFlag /> {s.settings.abandon}</button>
        </div>
      </motion.div>
    </>
  );
}

export function SkinPicker({ s }: { s: MahjongStrings }) {
  const skin = useSaved().settings.skin;
  return (
    <div className="mj-seg sm" role="tablist">
      {(['classic', 'cards'] as const).map(k => (
        <button type="button" key={k} role="tab" aria-selected={skin === k} className={skin === k ? 'on' : ''} onClick={() => { setSettings({ skin: k }); sfx.tap(); }}>
          {skin === k && <motion.span layoutId="mj-skinpill" className="pill" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
          <span>{k === 'classic' ? s.settings.classic : s.settings.cards}</span>
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={`mj-switch ${on ? 'on' : ''}`} onClick={onChange}>
      <motion.i layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} />
    </button>
  );
}

