import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { GAMES_STRINGS } from '../i18n/games';
import { QUEST_STRINGS } from '../i18n/journey';
import { ACH_STRINGS } from '../i18n/achievements';
import { TierMedal } from '../progress/Medal';
import { buzz, sfx } from '../sound';
import { gameById } from './registry';
import { reportGame } from './session';
import { asMiniResult, type MiniResult } from './api';
import type { GameModule, GameResult } from './types';
import { clock, fmtNum, textOf } from './hub/order';
import '../styles/achievements.css';
import './result.css';

/**
 * The shared game-over sheet. A game renders it once its game is over:
 *
 *   const result = useMemo<GameResult>(() => ({ game: 'zole', won, score, seconds, level: 'hard' }), [over]);
 *   {over && <GameResultSheet result={result} onAgain={newGame} onExit={onExit} onAuth={onAuth} />}
 *
 * It reports the result itself (reportGame, once per result object), or shows the answer of a report the game already
 * made: `report={reportGame(result)}`. While the server counts, the rewards panel shimmers; then BM / XP count up, the
 * daily bonus, level-up, medals, the game quest and season stars fly in. Guests get a sign-in nudge (their record is
 * still kept on the device). `facts` adds game-specific lines (e.g. "Tricks 7"); `headline` replaces "You won!".
 */
export interface GameResultSheetProps {
  result: GameResult;
  /** a pending/finished `reportGame(result)` — omit it and the sheet reports the result itself */
  report?: Promise<Record<string, unknown> | null> | null;
  onAgain?: () => void;
  onExit: () => void;
  onAuth?: () => void;
  headline?: string;
  facts?: { label: string; value: string }[];
  /** the share sheet text; default: "I scored N in <game> on Bridge 125…" */
  shareText?: string;
  /** the module (default: looked up in the registry by result.game) — for the emblem and the title */
  module?: GameModule;
}

/** one report per result object, even if the sheet re-mounts (React StrictMode, a parent re-render) */
const reports = new WeakMap<GameResult, Promise<Record<string, unknown> | null>>();
const reportOnce = (r: GameResult) => { let p = reports.get(r); if (!p) { p = reportGame(r); reports.set(r, p); } return p; };

type Phase = 'sending' | 'done' | 'guest' | 'offline';

export function GameResultSheet({ result, report, onAgain, onExit, onAuth, headline, facts = [], shareText, module }: GameResultSheetProps) {
  const app = useApp();
  const s = useStrings(GAMES_STRINGS);
  const m = module ?? gameById(result.game);
  const title = m ? textOf(m.title, app.lang) : result.game;
  const puzzle = m?.kind === 'puzzle';
  const [phase, setPhase] = useState<Phase>(app.session ? 'sending' : 'guest');
  const [res, setRes] = useState<MiniResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    const p = report ?? reportOnce(result);
    void p.then(x => {
      if (!live) return;
      const r = asMiniResult(x);
      setRes(r);
      setPhase(r ? 'done' : app.session ? 'offline' : 'guest');
    });
    return () => { live = false; };
  }, [result, report]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => { if (result.won) { sfx.fanfare(); buzz([20, 40, 20]); } else sfx.alert(); }, 250);
    return () => clearTimeout(t);
  }, [result.won]);

  const head = headline ?? (result.won ? (puzzle ? s.result.solved : s.result.won) : (puzzle ? s.result.unsolved : s.result.lost));
  const lvl = result.level && (s.levels as Record<string, string>)[result.level];
  const newBest = !!res?.ok && !!res.best;
  const streak = res?.stats?.streak ?? 0;

  const share = async () => {
    sfx.tap();
    const text = shareText ?? s.result.shareText(title, result.score != null ? fmtNum(result.score) : clock(result.seconds));
    const url = typeof location !== 'undefined' ? location.origin : 'https://bridge125.com';
    try {
      if (navigator.share) { await navigator.share({ text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { /* dismissed */ }
  };

  return (
    <>
      <motion.div className="grs-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <div className="grs-pos">
        <motion.div className={`grs ${result.won ? 'won' : 'lost'}`} role="dialog" aria-modal="true" aria-label={head}
          initial={{ y: 60, opacity: 0, scale: 0.94, rotateX: 18 }} animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }} exit={{ y: 40, opacity: 0, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 210, damping: 22 }}>
          {result.won && <Sparks />}
          <div className="grs-crest" aria-hidden>
            {result.won && <i className="grs-rays" />}
            <motion.span className="grs-medal" initial={{ scale: 0.3, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 13, delay: 0.15 }}>
              <span className="grs-medal-in">{m ? <m.Emblem size={46} /> : <span className="serif">♠</span>}</span>
            </motion.span>
          </div>
          <span className="grs-game">{title}{lvl ? ` · ${lvl}` : ''}</span>
          <motion.h2 className="serif grs-head" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>{head}</motion.h2>

          <div className="grs-facts">
            {result.score != null && (
              <Fact label={s.result.score} delay={0.35} badge={newBest ? s.result.newBest : undefined}><Counter to={result.score} delay={0.45} /></Fact>
            )}
            <Fact label={s.result.time} delay={0.42}>{clock(result.seconds)}</Fact>
            {facts.map((f, i) => <Fact key={f.label} label={f.label} delay={0.48 + i * 0.06}>{f.value}</Fact>)}
            {streak >= 2 && <Fact label={s.result.streak} delay={0.55} hot>🔥 {streak}</Fact>}
          </div>

          <div className="grs-panel">
            <span className="grs-panel-h">{s.result.rewards}</span>
            <AnimatePresence mode="wait" initial={false}>
              {phase === 'sending' && (
                <motion.div key="send" className="grs-sending" exit={{ opacity: 0 }}>
                  <i className="shimmerbar" /><i className="shimmerbar" /><span>{s.result.sending}</span>
                </motion.div>
              )}
              {phase === 'guest' && (
                <motion.div key="guest" className="grs-note guest" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <span>{s.result.guest}</span>
                  {onAuth && <button className="btn acc sm" onClick={onAuth}>{s.result.signIn}</button>}
                </motion.div>
              )}
              {phase === 'offline' && <motion.div key="off" className="grs-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{s.result.offline}</motion.div>}
              {phase === 'done' && res && <Rewards key="done" r={res} />}
            </AnimatePresence>
          </div>

          <div className="grs-cta">
            {onAgain && (
              <motion.button className="btn acc grs-again" onClick={() => { sfx.tap(); onAgain(); }} whileTap={{ scale: 0.96 }}>
                <span aria-hidden>↻</span>{s.result.again}
              </motion.button>
            )}
            <div className="grs-row">
              <button className="btn ghost" onClick={() => { sfx.tap(); onExit(); }}><span aria-hidden>‹</span>{s.result.back}</button>
              <button className="btn ghost grs-share" onClick={share} aria-label={s.result.share} title={s.result.share}>
                {copied ? <span className="grs-copied">{s.result.copied}</span> : (
                  <svg viewBox="0 0 24 24" aria-hidden><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ pieces */

function Counter({ to, delay = 0, from = 0, dur = 0.9 }: { to: number; delay?: number; from?: number; dur?: number }) {
  const mv = useMotionValue(from);
  const txt = useTransform(mv, v => fmtNum(v));
  useEffect(() => { const c = animate(mv, to, { duration: dur, delay, ease: [0.2, 0.8, 0.2, 1] }); return () => c.stop(); }, [to, delay, mv, dur]);
  return <motion.span>{txt}</motion.span>;
}

function Fact({ label, children, delay, hot = false, badge }: { label: string; children: ReactNode; delay: number; hot?: boolean; badge?: string }) {
  return (
    <motion.span className={`grs-fact ${hot ? 'hot' : ''} ${badge ? 'best' : ''}`} initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay, type: 'spring', stiffness: 260, damping: 20 }}>
      <small>{label}</small><b>{children}</b>
      <AnimatePresence>
        {badge && (
          <motion.em className="grs-best" initial={{ scale: 0, rotate: -14 }} animate={{ scale: 1, rotate: -5 }} transition={{ type: 'spring', stiffness: 320, damping: 12, delay: 0.3 }}>{badge}</motion.em>
        )}
      </AnimatePresence>
    </motion.span>
  );
}

function Rewards({ r }: { r: MiniResult }) {
  const s = useStrings(GAMES_STRINGS);
  const qs = useStrings(QUEST_STRINGS);
  const as = useStrings(ACH_STRINGS);
  if (!r.ok) {
    const msg = r.error === 'fast' ? s.result.fast : r.error === 'slow' ? s.result.slow : s.result.error;
    return <motion.div className="grs-note warn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{msg}</motion.div>;
  }
  const rw = r.reward;
  const rows: { key: string; node: ReactNode }[] = [];
  if (rw && (rw.bm > 0 || rw.xp > 0)) rows.push({ key: 'base', node: <><span className="grs-rl"><i className="coin" /><b>+<Counter to={rw.bm} delay={0.35} /></b> BM</span><span className="grs-xp">+<Counter to={rw.xp} delay={0.45} /> XP</span></> });
  if (rw && (rw.daily_bm > 0 || rw.daily_xp > 0)) rows.push({ key: 'daily', node: <><span className="grs-rl"><i className="grs-ic">☀</i>{s.result.dailyBonus}</span><span className="grs-xp">+{rw.daily_bm} BM · +{rw.daily_xp} XP</span></> });
  if (rw && rw.level > rw.level_from) rows.push({ key: 'lvl', node: <><span className="grs-rl"><i className="grs-ic lvl">{rw.level}</i>{s.result.levelUp}</span>{rw.level_bm > 0 && <span className="grs-xp">+{fmtNum(rw.level_bm)} BM</span>}</> });
  for (const c of rw?.achievements ?? []) rows.push({ key: 'a' + c, node: <><span className="grs-rl"><TierMedal code={c} size={26} />{as.list[c]?.name ?? c}</span><span className="grs-xp">{s.result.medal}</span></> });
  for (const q of r.quests ?? []) rows.push({ key: 'q' + q.id, node: <><span className="grs-rl"><i className="grs-ic">✦</i>{qs.names[q.id] ?? q.id}</span><span className={`grs-xp ${q.progress >= q.goal ? 'ok' : ''}`}>{q.progress >= q.goal ? '✓' : `${q.progress}/${q.goal}`}</span></> });
  if (rw && rw.stars > 0) rows.push({ key: 'stars', node: <><span className="grs-rl"><i className="grs-ic star">★</i>{s.result.stars}</span><span className="grs-xp">+{rw.stars}</span></> });
  return (
    <motion.ul className="grs-rewards" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }}>
      {rows.map((x, i) => (
        <motion.li key={x.key} className={i === 0 && x.key === 'base' ? 'lead' : ''} onAnimationComplete={() => { if (i === 0) sfx.coin(); }}
          variants={{ h: { opacity: 0, x: 34, scale: 0.92 }, s: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 22 } } }}>
          {x.node}
        </motion.li>
      ))}
      {r.capped && <motion.li className="grs-capped" variants={{ h: { opacity: 0 }, s: { opacity: 1 } }}>{s.result.capped}</motion.li>}
    </motion.ul>
  );
}

/** Brass sparks rising behind a win (transform-only, no canvas). */
function Sparks() {
  const bits = useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const r = (k: number) => (((i + 1) * 9301 * (k + 3) + 49297) % 233280) / 233280;
    return { l: 6 + r(1) * 88, d: r(2) * 1.6, dur: 2.2 + r(3) * 1.8, s: 3 + r(4) * 5, x: (r(5) - 0.5) * 60 };
  }), []);
  return (
    <div className="grs-sparks" aria-hidden>
      {bits.map((b, i) => (
        <motion.i key={i} style={{ left: `${b.l}%`, width: b.s, height: b.s }} initial={{ y: 40, opacity: 0, x: 0 }}
          animate={{ y: -260, opacity: [0, 1, 0], x: b.x }} transition={{ duration: b.dur, delay: b.d, repeat: Infinity, repeatDelay: 0.6, ease: 'easeOut' }} />
      ))}
    </div>
  );
}
