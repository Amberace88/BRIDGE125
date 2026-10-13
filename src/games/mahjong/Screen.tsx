import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../store';
import { useStrings } from '../../i18n/pick';
import { buzz, sfx } from '../../sound';
import { track } from '../../analytics';
import { reportStart } from '../session';
import type { GameScreenProps } from '../types';
import { gameKey, newGame, restartGame, type Game } from './core/game';
import { LAYOUT_IDS, layoutOf, type LayoutId } from './core/layouts';
import { geoOf, tilesLeft } from './core/board';
import { addDays, dailyLayout, dailyNo, dailySeed, msToRigaMidnight, rigaDay } from './core/daily';
import { randomSeed } from './core/rng';
import { dailyStreak, getSaved, saveGame, setPick, useSaved } from './store';
import { MAHJONG_STRINGS, type MahjongStrings } from './strings';
import { Play, SkinPicker } from './Play';
import { Face, TileSprite, type Skin } from './TileArt';
import { IcBack, IcCheck, IcClock, IcClose, IcFlame, IcLayers, IcPlay } from './icons';
import { fmtLeft, fmtTime } from './time';
import './mahjong.css';

type View = { v: 'lobby' } | { v: 'play'; game: Game; k: number };

export default function MahjongScreen({ onExit, onAuth }: GameScreenProps) {
  const [view, setView] = useState<View>({ v: 'lobby' });
  const skin = useSaved().settings.skin;

  useEffect(() => { track('minigame_open', { game: 'mahjong' }); }, []);

  const open = useCallback((game: Game) => { setView({ v: 'play', game, k: Date.now() }); }, []);

  const startDaily = useCallback(() => {
    const day = rigaDay();
    const cur = getSaved().games[gameKey('daily', dailyLayout(day), day)];
    if (cur) { sfx.whoosh(0.6); open(cur); return; }
    if (getSaved().dailies[day]) return;
    const g = newGame('daily', dailyLayout(day), dailySeed(day), day);
    saveGame(g);
    reportStart('mahjong', { level: g.layout, daily: true });
    sfx.shuffle(); buzz(12);
    open(g);
  }, [open]);

  const startFree = useCallback((layout: LayoutId) => {
    setPick(layout);
    const g = newGame('free', layout, randomSeed());
    saveGame(g);
    reportStart('mahjong', { level: layout, daily: false });
    sfx.shuffle(); buzz(12);
    open(g);
  }, [open]);

  const restart = useCallback((g: Game) => {
    const fresh = restartGame(g);
    saveGame(fresh);
    reportStart('mahjong', { level: g.layout, daily: false, restart: true });
    open(fresh);
  }, [open]);

  return (
    <div className="mj">
      <div className="mj-bg" aria-hidden><i className="g1" /><i className="g2" /></div>
      <AnimatePresence mode="wait">
        {view.v === 'lobby' ? (
          <motion.div key="lobby" className="mj-view" initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(6px)' }} transition={{ duration: 0.28 }}>
            <TileSprite skin={skin} />
            <Lobby onExit={onExit} onDaily={startDaily} onFree={startFree} onResume={k => { const g = getSaved().games[k]; if (g) { sfx.whoosh(0.6); open(g); } }} />
          </motion.div>
        ) : (
          <motion.div key={'play' + view.k} className="mj-view noscroll" initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
            <Play initial={view.game} onLobby={() => setView({ v: 'lobby' })} onAgain={g => startFree(g.layout)} onRestart={restart} onAuth={onAuth} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================ lobby */

function Lobby({ onExit, onDaily, onFree, onResume }: { onExit: () => void; onDaily: () => void; onFree: (l: LayoutId) => void; onResume: (key: string) => void }) {
  const s = useStrings(MAHJONG_STRINGS);
  const app = useApp();
  const saved = useSaved();
  const [day, setDay] = useState(rigaDay);
  const [left, setLeft] = useState(() => msToRigaMidnight());
  const [pick, setPickState] = useState<LayoutId>(saved.pick);
  const streak = dailyStreak(saved, day);

  useEffect(() => {
    const t = setInterval(() => { setLeft(msToRigaMidnight()); const d = rigaDay(); if (d !== day) setDay(d); }, 20_000);
    return () => clearInterval(t);
  }, [day]);

  const dLayout = dailyLayout(day);
  const dDone = saved.dailies[day];
  const dCur = saved.games[gameKey('daily', dLayout, day)];
  const last = saved.last ? saved.games[saved.last] : null;
  const lastOk = last && last.status === 'play' && last.mode === 'free' ? last : null;
  const freeSaved = saved.games[gameKey('free', pick)];
  const dateText = useMemo(() => {
    const [y, m, d] = day.split('-').map(Number);
    try { return new Intl.DateTimeFormat(app.lang === 'uk' ? 'uk-UA' : app.lang, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d))); } catch { return day; }
  }, [day, app.lang]);
  // yesterday's unfinished daily still counts (the server accepts yesterday's day)
  const yCur = saved.games[gameKey('daily', dailyLayout(addDays(day, -1)), addDays(day, -1))];

  return (
    <div className="mj-lobby">
      <header className="mj-bar">
        <button type="button" className="mj-ib" onClick={() => { sfx.tap(); onExit(); }} aria-label={s.back} title={s.back}><IcBack /></button>
        <div className="mj-ttl big"><b className="serif">{s.title}</b></div>
        <span className={`mj-streak ${streak ? 'on' : ''}`} title={streak ? s.streak(streak) : s.streakNone}><IcFlame /><b>{streak}</b></span>
      </header>

      <div className="mj-lobbymain">
        <div className="mj-herocol">
          <Hero skin={saved.settings.skin} />
          <p className="mj-tagline">{s.tagline}</p>
        </div>

        <div className="mj-cards">
          <motion.section className="mj-card daily" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 28 }}>
            <div className="mj-cardhead">
              <div>
                <small>{s.dailyNo(dailyNo(day))} · {cap(dateText)}</small>
                <h2 className="serif">{s.daily}</h2>
              </div>
              <span className="mj-left"><IcClock /> {s.nextIn(fmtLeft(left, s.units))}</span>
            </div>
            <p className="mj-cardsub">{s.dailySub}</p>
            <div className="mj-dailybody">
              <MiniMap id={dLayout} faces={dCur?.faces} big />
              <div className="mj-dailyinfo">
                <b className="serif">{s.layouts[dLayout]}</b>
                <span><IcLayers /> {s.tiles(layoutOf(dLayout).length)}</span>
                {dDone ? (
                  <span className={`mj-dstate ${dDone.won ? 'won' : 'lost'}`}>
                    {dDone.won ? <><IcCheck size={14} /> {s.cleared} · {fmtTime(dDone.seconds)}</> : <><IcClose /> {s.notCleared}</>}
                  </span>
                ) : dCur ? (
                  <span className="mj-dstate cur"><i className="bar"><i style={{ width: `${progress(dCur)}%` }} /></i>{progress(dCur)}%</span>
                ) : null}
                {dDone?.won && <span className="mj-dscore">{s.score} <b>{dDone.score.toLocaleString('fr-FR')}</b></span>}
              </div>
            </div>
            {!dDone && (
              <motion.button type="button" className="btn acc mj-dailygo" onClick={() => { sfx.tap(); onDaily(); }} whileTap={{ scale: 0.97 }}>
                <IcPlay size={20} /> {dCur ? s.continue : s.play}
              </motion.button>
            )}
            <p className={`mj-streakline ${streak ? 'on' : ''}`}><IcFlame /> {streak ? s.streak(streak) : s.streakNone}</p>
          </motion.section>

          {yCur && !saved.dailies[addDays(day, -1)] && (
            <ContinueCard s={s} g={yCur} onClick={() => onResume(yCur.key)} />
          )}
          {lastOk && <ContinueCard s={s} g={lastOk} onClick={() => onResume(lastOk.key)} />}

          <motion.section className="mj-card free" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 28 }}>
            <div className="mj-cardhead">
              <div><small>{s.freeSub}</small><h2 className="serif">{s.free}</h2></div>
            </div>
            <div className="mj-layouts" role="listbox" aria-label={s.free}>
              {LAYOUT_IDS.map(id => (
                <motion.button type="button" key={id} role="option" aria-selected={pick === id} className={`mj-lay ${pick === id ? 'on' : ''}`}
                  onClick={() => { setPickState(id); setPick(id); sfx.tap(); }} whileTap={{ scale: 0.95 }} whileHover={{ y: -3 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}>
                  {pick === id && <motion.span layoutId="mj-laypick" className="mj-layring" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <MiniMap id={id} faces={saved.games[gameKey('free', id)]?.faces} />
                  <b className="serif">{s.layouts[id]}</b>
                  <small>{layoutOf(id).length}</small>
                </motion.button>
              ))}
            </div>
            <div className="mj-levelinfo">
              <span>{s.layoutInfo[pick]} · {s.tiles(layoutOf(pick).length)}</span>
              <span className="sp" />
              {saved.best[pick] ? <span className="best">{s.best} <b>{saved.best[pick]!.score.toLocaleString('fr-FR')}</b> · {fmtTime(saved.best[pick]!.seconds)}</span> : null}
              {saved.cleared[pick] ? <span className="cnt">{s.clearedN(saved.cleared[pick]!)}</span> : null}
            </div>
            <div className="mj-freebtns">
              {freeSaved && (
                <button type="button" className="btn ghost" onClick={() => onResume(freeSaved.key)}>
                  <IcPlay /> {s.continue} <small className="mono">{progress(freeSaved)}%</small>
                </button>
              )}
              <button type="button" className="btn acc" onClick={() => { sfx.tap(); onFree(pick); }}>{s.newGame}</button>
            </div>
          </motion.section>

          <div className="mj-skinrow">
            <span>{s.settings.skin}</span>
            <SkinPicker s={s} />
          </div>
        </div>
      </div>
    </div>
  );
}

const cap = (t: string) => t.charAt(0).toLocaleUpperCase() + t.slice(1);
const progress = (g: Game) => Math.round((1 - tilesLeft(g.faces) / g.faces.length) * 100);

function ContinueCard({ s, g, onClick }: { s: MahjongStrings; g: Game; onClick: () => void }) {
  const p = progress(g);
  const r = 22, c = 2 * Math.PI * r;
  return (
    <motion.button type="button" className="mj-card cont" onClick={onClick}
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 28 }} whileTap={{ scale: 0.98 }}>
      <span className="mj-ring">
        <svg viewBox="0 0 52 52" width="52" height="52" aria-hidden>
          <circle cx="26" cy="26" r={r} stroke="rgba(255,255,255,.1)" strokeWidth="4" fill="none" />
          <circle cx="26" cy="26" r={r} stroke="var(--acc-hi)" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} transform="rotate(-90 26 26)" />
        </svg>
        <b>{p}%</b>
      </span>
      <span className="mj-conttext">
        <small>{g.mode === 'daily' ? `${s.daily} · ${s.dailyNo(dailyNo(g.day!))}` : s.free}</small>
        <b className="serif">{s.layouts[g.layout]}</b>
        <span><IcClock /> {fmtTime(g.ms / 1000)} · {s.score} {g.score.toLocaleString('fr-FR')}</span>
      </span>
      <span className="mj-contgo"><IcPlay /> <em>{s.continue}</em></span>
    </motion.button>
  );
}

/** A small plan of a layout: layers in lighter shades; removed tiles of a game in progress are left out. */
function MiniMap({ id, faces, big = false }: { id: LayoutId; faces?: number[]; big?: boolean }) {
  const geo = geoOf(id);
  const k = 1.3, off = 0.35;
  const w = geo.w + geo.zMax * off + 0.6, h = geo.h * k + geo.zMax * off + 0.6;
  const order = useMemo(() => geo.pos.map((_, i) => i).sort((a, b) => geo.pos[a].z - geo.pos[b].z || geo.pos[a].x + geo.pos[a].y - geo.pos[b].x - geo.pos[b].y), [geo]);
  return (
    <svg className={`mj-map ${big ? 'big' : ''}`} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {order.map(i => {
        if (faces && faces[i] < 0) return null;
        const p = geo.pos[i];
        const x = p.x + (geo.zMax - p.z) * off, y = p.y * k + (geo.zMax - p.z) * off;
        return (
          <g key={i}>
            <rect x={x + 0.28} y={y + 0.28} width={1.86} height={2 * k - 0.14} rx={0.32} fill="var(--acc-lo)" />
            <rect x={x} y={y} width={1.86} height={2 * k - 0.14} rx={0.32} fill={LAYER[Math.min(LAYER.length - 1, p.z)]} />
          </g>
        );
      })}
    </svg>
  );
}
const LAYER = ['#d9ccab', '#e6dbbf', '#efe6cf', '#f6efdd', '#fffaf0'];

/* ================================================================ hero: a little stack of real tiles, tilting */

const HERO: { x: number; y: number; z: number; f: number }[] = [
  { x: 0, y: 1, z: 0, f: 4 }, { x: 1, y: 1, z: 0, f: 13 }, { x: 2, y: 1, z: 0, f: 22 }, { x: 3, y: 1, z: 0, f: 27 },
  { x: 0.5, y: 0.5, z: 1, f: 34 }, { x: 1.5, y: 0.5, z: 1, f: 31 }, { x: 2.5, y: 0.5, z: 1, f: 38 },
  { x: 1, y: 0, z: 2, f: 0 }, { x: 2, y: 0, z: 2, f: 32 },
];

function Hero({ skin }: { skin: Skin }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 18 }), sy = useSpring(my, { stiffness: 120, damping: 18 });
  const rotY = useTransform(sx, v => -10 + v * 18);
  const rotX = useTransform(sy, v => 26 - v * 14);
  return (
    <div className="mj-hero" ref={ref}
      onPointerMove={e => { const r = ref.current?.getBoundingClientRect(); if (!r) return; mx.set((e.clientX - r.left) / r.width - 0.5); my.set((e.clientY - r.top) / r.height - 0.5); }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}>
      <div className="mj-heroglow" aria-hidden />
      <div className="mj-herobob">
        <motion.div className="mj-herostack" style={{ rotateX: rotX, rotateY: rotY, rotateZ: -4 }} aria-hidden>
          {HERO.map((t, i) => (
            <motion.div key={i} className="mj-t free" style={{ left: t.x * 46 - t.z * 6, top: t.y * 60 - t.z * 6, zIndex: t.z * 10 + i }}
              initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 + i * 0.07, type: 'spring', stiffness: 380, damping: 22 }}>
              <div className="mj-in"><div className="mj-tb"><Face skin={skin} face={t.f} /></div></div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
