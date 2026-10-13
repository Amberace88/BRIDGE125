import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useApp } from '../../store';
import { useStrings } from '../../i18n/pick';
import { GAMES_STRINGS, type GamesStrings } from '../../i18n/games';
import { QUEST_STRINGS } from '../../i18n/journey';
import { CardFace } from '../../components/CardFace';
import { QuestBar, QuestGlyph } from '../../campaign/QuestTracker';
import { useQuests } from '../../campaign/questStore';
import { isGameMetric, isReady } from '../../campaign/quests';
import { sfx } from '../../sound';
import type { Lang } from '../../i18n';
import { GAMES } from '../registry';
import type { GameModule } from '../types';
import type { MiniStats } from '../api';
import { useGameStats } from '../useGameStats';
import { useProgress } from '../../progress/useProgress';
import { miniDef, rewardFor } from '../rewards';
import { GameBoard } from '../GameBoard';
import { clock, fmtNum, hubGames, textOf } from './order';
import { useArena, type TourUnclaimed } from '../tournament/api';
import { TournamentBanner } from '../tournament/TournamentBanner';
import { ClaimReveal, TournamentSheet } from '../tournament/TournamentSheet';
import { TrophyIcon } from '../tournament/icons';
import { ChallengeCard, ChallengePicker } from '../challenge/ChallengeEntry';
import { newSeed } from '../challenge/compare';
import { Showcase, TodayRow } from './Showcase';
import './games.css';
import './arena.css';

/** How the hub opens a game: plain, or as a fresh challenge (a new seed; the first result opens the share sheet). */
export interface OpenGameOpts { seed?: string; level?: string; mode?: 'create' }

/**
 * The games room (/games): Bridge 125 — the main game — as the hero, then every registered mini game
 * (src/games/registry.ts) as a tile. `modules` is only for tests / stories; the app always shows the registry.
 */
export function GamesHub({ onClose, onPlayBridge, onOpenGame, onAuth, modules = GAMES }: {
  onClose: () => void; onPlayBridge: () => void; onOpenGame: (id: string, opts?: OpenGameOpts) => void; onAuth: () => void; modules?: readonly GameModule[];
}) {
  const app = useApp();
  const s = useStrings(GAMES_STRINGS);
  const list = useMemo(() => hubGames(modules, app.lang), [modules, app.lang]);
  const { stats } = useGameStats();
  const p = useProgress();
  const [board, setBoard] = useState<GameModule | null>(null);
  const arena = useArena();
  const t = arena.data;
  const [tourOpen, setTourOpen] = useState(false);
  const [claim, setClaim] = useState<TourUnclaimed | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const gotd = t?.gotd?.game ?? null;
  const motes = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ l: (i * 61) % 100, t: (i * 37) % 100, d: (i * 1.7) % 11, s: 1.5 + (i % 4) })), []);

  return (
    <motion.div className="gh" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
      role="dialog" aria-modal="true" aria-label={s.title}>
      <div className="gh-bg" aria-hidden>
        <i className="beam" />
        {motes.map((m, i) => <i key={i} className="mote" style={{ left: `${m.l}%`, top: `${m.t}%`, width: m.s, height: m.s, animationDelay: `-${m.d}s` }} />)}
      </div>

      <header className="gh-head">
        <motion.button className="gh-back" onClick={() => { sfx.tap(); onClose(); }} aria-label={s.close} whileTap={{ scale: 0.9 }}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </motion.button>
        <div className="gh-title">
          <span className="gh-kicker">{s.kicker}</span>
          <h1 className="serif">{s.title}</h1>
        </div>
        {p.signedIn && app.profile && <span className="gh-bal"><i className="coin" /><b>{fmtNum(p.bm)}</b></span>}
      </header>

      <div className="gh-body">
        <div className="gh-wrap">
          <BridgeHero s={s} lang={app.lang} level={p.ready ? p.level : undefined}
            wins={app.session && app.profile ? app.profile.wins : undefined} onPlay={() => { sfx.tap(); onPlayBridge(); }} />

          {t && list.length > 0 && (
            <TournamentBanner t={t} signedIn={!!app.session} onPlay={id => onOpenGame(id)} onBoard={() => setTourOpen(true)}
              onClaim={() => setClaim(t.unclaimed?.[0] ?? null)} onAuth={onAuth} />
          )}

          {list.length > 0 && (
            <TodayRow list={list} arena={t} today={arena.today} signedIn={!!app.session} onOpen={id => onOpenGame(id)} onAuth={onAuth} />
          )}

          {app.session && <GameQuest s={s} />}

          <section className="gh-more" aria-labelledby="gh-more-h">
            <div className="gh-sec">
              <h2 id="gh-more-h" className="serif">{s.more}</h2>
              <p>{list.length ? s.moreSub : s.sub}</p>
            </div>
            {list.length > 0 ? (
              <div className="gh-grid">
                {list.map((m, i) => (
                  <GameTile key={m.id} m={m} i={i} s={s} lang={app.lang} st={stats[m.id]} gotd={gotd === m.id} featured={t?.game === m.id}
                    onOpen={() => { sfx.tap(); onOpenGame(m.id); }} onBoard={() => { sfx.tap(); setBoard(m); }} />
                ))}
              </div>
            ) : <EmptyRoom s={s} />}
          </section>

          {list.length > 0 && (
            <div className="ga-pair">
              <Showcase list={list} stats={stats} onOpen={id => { sfx.tap(); onOpenGame(id); }} />
              <ChallengeCard onOpen={() => setPickOpen(true)} />
            </div>
          )}

          {!app.session && app.online && list.length > 0 && (
            <motion.div className="gh-guest" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <span className="gh-guest-ic" aria-hidden>♠</span>
              <div><b>{s.guest.title}</b><span>{s.guest.sub}</span></div>
              <button className="btn acc sm" onClick={onAuth}>{s.guest.signIn}</button>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {board && <GameBoard key="b" m={board} onClose={() => setBoard(null)} onAuth={onAuth} />}
        {tourOpen && t && <TournamentSheet key="t" t={t} onClose={() => setTourOpen(false)} onAuth={onAuth} onPlay={id => { setTourOpen(false); onOpenGame(id); }} />}
        {pickOpen && (
          <ChallengePicker key="p" list={list} onClose={() => setPickOpen(false)}
            onPick={id => { setPickOpen(false); onOpenGame(id, { seed: newSeed(), mode: 'create' }); }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {claim && <ClaimReveal key="c" prize={claim} onClose={() => setClaim(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ pointer tilt (spring, desktop hover + touch drag) */

function useTilt(max = 8) {
  const px = useMotionValue(0), py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 160, damping: 18, mass: 0.5 }), sy = useSpring(py, { stiffness: 160, damping: 18, mass: 0.5 });
  const rotateY = useTransform(sx, [-1, 1], [-max, max]);
  const rotateX = useTransform(sy, [-1, 1], [max * 0.8, -max * 0.8]);
  const glareX = useTransform(sx, [-1, 1], ['10%', '90%']);
  const glareY = useTransform(sy, [-1, 1], ['0%', '100%']);
  const onPointerMove = (e: RPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width) * 2 - 1);
    py.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onPointerLeave = () => { px.set(0); py.set(0); };
  return { rotateX, rotateY, glareX, glareY, sx, sy, handlers: { onPointerMove, onPointerLeave } };
}

/* ------------------------------------------------------------------ Bridge 125: the main game */

const HERO_CARDS = [
  { id: 'h1', r: 'J', s: 'H' }, { id: 'h2', r: 'Q', s: 'S' }, { id: 'h3', r: '6', s: 'S' },
] as const;

function BridgeHero({ s, lang, level, wins, onPlay }: { s: GamesStrings; lang: Lang; level?: number; wins?: number; onPlay: () => void }) {
  const t = useTilt(6);
  const ref = useRef<HTMLElement>(null);
  return (
    <motion.section ref={ref} className="gh-hero" {...t.handlers} style={{ rotateX: t.rotateX, rotateY: t.rotateY }}
      initial={{ opacity: 0, y: 26, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 140, damping: 18, delay: 0.05 }}>
      <div className="gh-hero-felt" aria-hidden />
      <motion.div className="gh-hero-glare" aria-hidden style={{ ['--gx' as string]: t.glareX, ['--gy' as string]: t.glareY }} />
      <HeroFan lang={lang} sx={t.sx} />
      <div className="gh-hero-tx">
        <span className="gh-tag"><i aria-hidden>♠</i>{s.main.tag}</span>
        <h2 className="serif">Bridge <b>125</b></h2>
        <p>{s.main.sub}</p>
        {(level != null || wins != null) && (
          <div className="gh-hero-stats">
            {level != null && <span><small>{s.main.level}</small><b>{level}</b></span>}
            {wins != null && <span><small>{s.main.wins}</small><b>{fmtNum(wins)}</b></span>}
          </div>
        )}
        <motion.button className="btn acc gh-play" onClick={onPlay} whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}>
          <span className="suitspin" aria-hidden>♠</span><span>{s.main.play}</span><span className="arr" aria-hidden>→</span>
        </motion.button>
      </div>
    </motion.section>
  );
}

function HeroFan({ lang, sx }: { lang: Lang; sx: MotionValue<number> }) {
  const shift = useTransform(sx, [-1, 1], [10, -10]);
  return (
    <motion.div className="gh-fan" aria-hidden style={{ x: shift }}>
      {HERO_CARDS.map((c, i) => (
        <motion.div key={c.id} className={`gh-fcard f${i}`} style={{ ['--i' as string]: i - 1 }} initial={{ y: 40, rotate: 0, opacity: 0 }}
          animate={{ y: [0, -4, 0], rotate: (i - 1) * 15, opacity: 1 }}
          transition={{ opacity: { delay: 0.2 + i * 0.08 }, rotate: { type: 'spring', stiffness: 160, damping: 14, delay: 0.2 + i * 0.08 },
            y: { duration: 4.5 + i * 0.6, repeat: Infinity, ease: 'easeInOut', delay: 0.6 + i * 0.3 } }}>
          <CardFace card={c} lang={lang} />
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ a mini game tile */

function GameTile({ m, i, s, lang, st, gotd = false, featured = false, onOpen, onBoard }: {
  m: GameModule; i: number; s: GamesStrings; lang: Lang; st?: MiniStats; gotd?: boolean; featured?: boolean; onOpen: () => void; onBoard: () => void;
}) {
  const t = useTilt(9);
  const E = m.Emblem;
  const title = textOf(m.title, lang);
  const local = !!m.homeLangs?.includes(lang);
  const daily = !!(m.daily ?? miniDef(m.id)?.hasDaily);
  const win = rewardFor(m.id, true);
  const played = (st?.played ?? 0) > 0;
  const solo = m.players.max <= 1;
  return (
    <motion.div className={`gh-tile ${local ? 'local' : ''} ${gotd ? 'gotd' : ''} ${featured ? 'featured' : ''}`} {...t.handlers} style={{ rotateX: t.rotateX, rotateY: t.rotateY }}
      initial={{ opacity: 0, y: 24, rotateX: -14 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ type: 'spring', stiffness: 170, damping: 19, delay: 0.15 + i * 0.06 }}
      whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }}>
      <motion.span className="gh-tile-glare" aria-hidden style={{ ['--gx' as string]: t.glareX, ['--gy' as string]: t.glareY }} />
      <button className="gh-tile-hit" onClick={onOpen} aria-label={`${s.tile.play}: ${title}`} />
      {daily && <span className={`gh-ribbon ${st?.daily_done ? 'done' : ''}`} title={st?.daily_done ? s.tile.dailyDone : undefined}>{st?.daily_done ? `✓ ${s.tile.daily}` : s.tile.daily}</span>}
      <div className="gh-tile-top">
        <span className="gh-medal" aria-hidden><span className="gh-medal-in"><E size={40} /></span></span>
        <button className="gh-lb" onClick={onBoard} aria-label={`${s.tile.board}: ${title}`} title={s.tile.board}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M7.5 4h9v4.5a4.5 4.5 0 0 1-9 0z M7.5 5.5H4.6c0 2.6 1.1 4.1 3.2 4.4 M16.5 5.5h2.9c0 2.6-1.1 4.1-3.2 4.4 M12 13v3.2 M8.8 20h6.4 M9.6 16.2h4.8l.6 3.8H9z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" /></svg>
        </button>
      </div>
      <h3 className="serif">{title}</h3>
      <p className="gh-tagline">{textOf(m.tagline, lang)}</p>
      <div className="gh-chips">
        {local && <span className="gh-chip local">{s.tile.local}</span>}
        <span className="gh-chip">{solo ? s.tile.solo : <><PeopleIcon />{m.players.min === m.players.max ? m.players.min : `${m.players.min}–${m.players.max}`}</>}</span>
        {win && <span className={`gh-chip bm ${gotd ? 'x15' : ''}`}><i className="coin" />+{gotd ? Math.min(99, Math.round(win.bm * 1.5)) : win.bm}<small>{s.tile.perWin}</small></span>}
        {gotd && <span className="gh-chip ga-x15chip" title="×1.5">×1.5</span>}
        {featured && <span className="gh-chip ga-tourchip" aria-label="🏆"><TrophyIcon /></span>}
      </div>
      <div className="gh-foot">
        {played && st ? (
          <>
            <Stat label={st.best_score != null ? s.tile.best : s.tile.fastest} value={st.best_score != null ? fmtNum(st.best_score) : clock(st.best_seconds)} />
            <Stat label={s.tile.streak} value={st.streak > 0 ? `${st.streak}` : '–'} hot={st.streak >= 2} />
            <Stat label={s.tile.wins} value={fmtNum(st.won)} wide />
          </>
        ) : <span className="gh-fresh">{s.tile.fresh}</span>}
      </div>
    </motion.div>
  );
}

function Stat({ label, value, hot = false, wide = false }: { label: string; value: string; hot?: boolean; wide?: boolean }) {
  return <span className={`gh-stat ${hot ? 'hot' : ''} ${wide ? 'wide' : ''}`}><small>{label}</small><b>{hot && <i aria-hidden>🔥</i>}{value}</b></span>;
}

const PeopleIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden><circle cx="6" cy="5.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M1.8 13.5c.5-2.4 2.2-3.6 4.2-3.6s3.7 1.2 4.2 3.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="11.4" cy="6.2" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M11.2 9.9c1.7-.2 3 .7 3.4 2.7" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
);

/* ------------------------------------------------------------------ the day's game quest (migration 019) */

function GameQuest({ s }: { s: GamesStrings }) {
  const q = useQuests();
  const qs = useStrings(QUEST_STRINGS);
  const r = q.board?.daily.find(x => isGameMetric(x.metric));
  if (!r) return null;
  const ready = isReady(r);
  return (
    <motion.div className={`gh-quest ${ready ? 'ready' : ''} ${r.claimed ? 'claimed' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <QuestGlyph metric={r.metric} size={40} />
      <div className="gh-quest-tx">
        <small>{s.quest}</small>
        <b>{qs.names[r.id] ?? r.id}</b>
        <span className="gh-quest-bar"><QuestBar v={r.progress} max={r.goal} /><em>{r.progress}/{r.goal}</em></span>
      </div>
      {r.claimed ? <span className="gh-quest-done" aria-label={qs.claimed}>✓</span>
        : ready ? <button className="btn acc sm" disabled={q.busy === r.id} onClick={() => { sfx.coin(); void q.claim(r.id); }}>{qs.claim}</button>
        : <span className="gh-quest-rw"><i className="coin" />{r.bm}</span>}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ nothing registered yet */

function EmptyRoom({ s }: { s: GamesStrings }) {
  return (
    <motion.div className="gh-empty" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <div className="gh-empty-art" aria-hidden>
        {[0, 1, 2, 3].map(i => (
          <motion.i key={i} className="gh-back-card" initial={{ rotate: 0, x: 0, opacity: 0 }}
            animate={{ rotate: (i - 1.5) * 11, x: (i - 1.5) * 26, y: Math.abs(i - 1.5) * 5, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 13, delay: 0.3 + i * 0.07 }} />
        ))}
        <i className="gh-empty-glow" />
      </div>
      <b className="serif">{s.empty.title}</b>
      <p>{s.empty.sub}</p>
    </motion.div>
  );
}
