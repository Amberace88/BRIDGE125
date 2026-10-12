import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { type GameState, GAME_OVER_AT, RESET_AT } from '../engine/engine';
import { useApp } from '../store';
import { sfx } from '../sound';
import { useStrings } from '../i18n/pick';
import { TABLE_STRINGS } from '../i18n/table';
import '../styles/table.css';

const SCORE_MAX = GAME_OVER_AT + 5;

/** Counts a number up (or down) once it mounts or the target changes. */
export function CountUp({ from, value, delay = 0, duration = 0.9 }: { from?: number; value: number; delay?: number; duration?: number }) {
  const mv = useMotionValue(from ?? value);
  const txt = useTransform(mv, v => String(Math.round(v)));
  useEffect(() => { const c = animate(mv, value, { duration, delay, ease: 'easeOut' }); return () => c.stop(); }, [value, mv, duration, delay]);
  return <motion.span>{txt}</motion.span>;
}

export const scoreTone = (s: number) => (s >= 115 ? 'danger' : s >= 95 ? 'warn' : 'ok');

/** Progress toward the end of the game, with the magic 125 (gold) and the 130 limit (red) marked. */
export function ScoreBar({ score, from, via, delay = 0, duration = 0.9 }: { score: number; from?: number; via?: number; delay?: number; duration?: number }) {
  const f = (v: number) => Math.max(0, Math.min(1, v / SCORE_MAX));
  const target = via != null ? [f(from ?? 0), f(via), f(score)] : f(score);
  return (
    <div className={`sbar ${scoreTone(via ?? score)}`} aria-hidden>
      <motion.i className="fill" initial={from != null ? { scaleX: f(from) } : false} animate={{ scaleX: target }}
        transition={{ duration: via != null ? duration * 1.8 : duration, delay, ease: [0.25, 0.8, 0.25, 1], times: via != null ? [0, 0.55, 1] : undefined }} />
      <b className="mk m125" style={{ left: `${(RESET_AT / SCORE_MAX) * 100}%` }} />
      <b className="mk m130" style={{ left: `${(GAME_OVER_AT / SCORE_MAX) * 100}%` }} />
    </div>
  );
}

const Trophy = () => (
  <svg className="trophy" viewBox="0 0 64 64" aria-hidden>
    <defs>
      <linearGradient id="tg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="var(--acc-hi)" /><stop offset=".55" stopColor="var(--acc)" /><stop offset="1" stopColor="var(--acc-lo)" /></linearGradient>
    </defs>
    <path d="M18 8h28v10c0 9-6 16-14 16S18 27 18 18V8z" fill="url(#tg)" />
    <path d="M18 12H9c0 8 4 13 10 14M46 12h9c0 8-4 13-10 14" fill="none" stroke="url(#tg)" strokeWidth="3.2" strokeLinecap="round" />
    <path d="M28 34h8v8h-8z" fill="url(#tg)" /><path d="M21 44h22l2 8H19z" fill="url(#tg)" />
    <path d="M24 12c0 7 2 12 6 15" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 46 }, (_, i) => {
    const r = (k: number) => (((i + 1) * 9301 * (k + 3) + 49297) % 233280) / 233280;
    return { left: r(1) * 100, delay: r(2) * 2.2, dur: 2.6 + r(3) * 2.2, rot: r(4) * 720 - 360, drift: (r(5) - 0.5) * 120, c: ['var(--acc-hi)', 'var(--acc)', '#ff6b80', '#ffffff', '#7cf0b8'][i % 5], w: 6 + r(6) * 6 };
  }), []);
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b, i) => (
        <motion.i key={i} style={{ left: `${b.left}%`, background: b.c, width: b.w }}
          initial={{ y: -30, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', x: b.drift, rotate: b.rot, opacity: [1, 1, 0.7] }}
          transition={{ duration: b.dur, delay: b.delay, ease: 'easeIn', repeat: Infinity, repeatDelay: 0.4 }} />
      ))}
    </div>
  );
}

export function Results({ g, me = 0, onNext, onRematch, onHome }: { g: GameState; me?: number; onNext: () => void; onRematch?: () => void; onHome: () => void }) {
  const { t } = useApp();
  const s = useStrings(TABLE_STRINGS);
  const r = g.lastResult!;
  const over = g.phase === 'gameOver';
  const iWon = over && g.winners.includes(me);
  const name = (i: number) => (i === me ? t.you : g.players[i].name);
  useEffect(() => { if (over) (iWon ? sfx.big : sfx.alert)(); }, [over, iWon]);

  const rows = over ? [...r.rows].sort((a, b) => a.after - b.after) : r.rows;
  const afters = r.rows.map(x => x.after);
  const hi = Math.max(...afters), lo = Math.min(...afters);
  const many = r.rows.length > 1 && hi !== lo;

  const tagsFor = (row: (typeof r.rows)[number]) => {
    const out: { cls: string; text: string }[] = [];
    if (over) {
      if (g.winners.includes(row.p)) out.push({ cls: 'win', text: s.winnerLabel });
      else if (row.after >= GAME_OVER_AT) out.push({ cls: 'out', text: s.over });
      return out;
    }
    if (row.p === r.winner) out.push({ cls: 'went', text: s.wentOut });
    if (row.reset) out.push({ cls: 'burn', text: s.burnTitle });
    else if (many && row.after === hi && hi >= 80) out.push({ cls: 'close', text: s.closest });
    else if (many && row.after === lo) out.push({ cls: 'lead', text: s.leading });
    return out;
  };

  const title = over
    ? (iWon ? t.youWin : t.winnerIs(g.winners.map(name).join(', ')))
    : r.winner === me ? t.roundWonYou : t.roundWon(name(r.winner));

  return (
    <motion.div className="rsum" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={title}>
      {iWon && <Confetti />}
      <motion.div className="rsum-in" initial={{ y: 40, opacity: 0, rotateX: 12 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        style={{ transformPerspective: 900 }}>
        {over && iWon && (
          <motion.div initial={{ scale: 0.2, rotate: -20, y: 20 }} animate={{ scale: 1, rotate: 0, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 11, delay: 0.15 }}>
            <Trophy />
          </motion.div>
        )}
        <div className="kicker">{over ? s.standings : t.round(g.round)}</div>
        <div className={`title serif ${over ? 'big' : ''}`}>{title}</div>
        {over && <div className="subt">{t.gameOverSub}</div>}

        {r.mult > 1 && (
          <motion.div className="mult" initial={{ scale: 0.3, opacity: 0, rotate: -14 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 11 }}>
            <b>×{r.mult}</b>
            <span>{t.jacksFinish(r.jacks)}</span>
          </motion.div>
        )}

        <div className="rows">
          {rows.map((row, i) => {
            const isWinner = row.p === r.winner;
            const tags = tagsFor(row);
            const tone = row.reset ? 'gold' : scoreTone(row.after);
            const d = 0.35 + i * 0.12;
            return (
              <motion.div key={row.p} className={`row ${row.p === me ? 'me' : ''} ${row.reset ? 'burn' : ''} ${row.after >= GAME_OVER_AT ? 'out' : ''}`}
                initial={{ opacity: 0, x: -24, rotateY: -12 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} transition={{ delay: d, type: 'spring', stiffness: 260, damping: 24 }}>
                <div className="rav">{g.players[row.p].bot ? '🤖' : g.players[row.p].name.slice(0, 1).toUpperCase()}</div>
                <div className="rname">
                  <b>{name(row.p)}</b>
                  {tags.map(tg => <span key={tg.cls} className={`tag ${tg.cls}`}>{tg.text}</span>)}
                </div>
                <div className="rtot">
                  <div className={`n ${tone}`}>
                    {row.reset ? <CountUp from={row.before} value={0} delay={d + 0.9} duration={0.6} /> : <CountUp from={row.before} value={row.after} delay={d + 0.15} />}
                  </div>
                  <div className="was">{row.added > 0 || row.reset ? `${row.before} →` : ' '}</div>
                </div>
                <div className="rcalc">
                  {isWinner ? (
                    <span className="zero">{s.inHand} 0</span>
                  ) : (
                    <>
                      <span>{s.inHand} {row.handPoints}</span>
                      {r.mult > 1 && <span className="x">×{r.mult}</span>}
                      <span className="plus">+{row.added}</span>
                      {row.reset && <span className="x">{RESET_AT} → 0</span>}
                    </>
                  )}
                </div>
                <div className="rbar">
                  <ScoreBar from={row.before} score={row.after} via={row.reset ? RESET_AT : undefined} delay={d + 0.15} />
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="legend" aria-hidden>
          <span><i style={{ background: 'var(--acc-hi)', boxShadow: '0 0 6px var(--acc-hi)' }} />{s.rule125}</span>
          <span><i style={{ background: '#ff5d73' }} />{s.rule130}</span>
        </div>

        <div className="cta">
          {over ? (
            <>
              {onRematch && <button className="btn acc big" onClick={onRematch}>{t.rematch}</button>}
              <button className="textbtn" onClick={onHome}>{t.home}</button>
            </>
          ) : (
            <button className="btn acc big" onClick={onNext}>{t.nextRound}</button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
