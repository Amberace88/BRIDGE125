import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect } from 'react';
import type { GameState } from '../engine/engine';
import { useApp } from '../store';
import { sfx } from '../sound';

function Count({ from, to, delay }: { from: number; to: number; delay: number }) {
  const v = useMotionValue(from);
  const r = useTransform(v, x => Math.round(x).toString());
  useEffect(() => { const c = animate(v, to, { duration: 0.9, delay, ease: 'easeOut' }); return () => c.stop(); }, [to, delay, v]);
  return <motion.span>{r}</motion.span>;
}

export function Results({ g, me = 0, onNext, onRematch, onHome }: { g: GameState; me?: number; onNext: () => void; onRematch?: () => void; onHome: () => void }) {
  const { t } = useApp();
  const r = g.lastResult!;
  const over = g.phase === 'gameOver';
  const iWon = over && g.winners.includes(me);
  const name = (i: number) => (i === me ? t.you : g.players[i].name);
  useEffect(() => { if (over) (iWon ? sfx.big : sfx.alert)(); }, [over, iWon]);

  return (
    <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 16px', overflow: 'auto', background: 'radial-gradient(90% 70% at 50% 40%, rgba(4,14,12,.86), rgba(2,8,7,.96))', backdropFilter: 'blur(6px)' }}>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="mute" style={{ fontSize: 13 }}>{t.round(g.round)}</div>
          <div className="serif" style={{ fontSize: over ? 44 : 38, fontWeight: 700, lineHeight: 1.05, marginTop: 6 }}>
            {over ? (iWon ? t.youWin : t.winnerIs(g.winners.map(name).join(', '))) : r.winner === me ? t.roundWonYou : t.roundWon(name(r.winner))}
          </div>
          {over && <div className="mute" style={{ fontSize: 13, marginTop: 6 }}>{t.gameOverSub}</div>}
        </div>

        {r.mult > 1 && (
          <motion.div initial={{ scale: 0.3, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ delay: 0.25, type: 'spring', stiffness: 260, damping: 12 }}
            style={{ textAlign: 'center', marginTop: 10 }}>
            <div className="serif" style={{ fontSize: 76, fontWeight: 700, color: 'var(--acc-hi)', lineHeight: 1, textShadow: '0 0 34px color-mix(in srgb, var(--acc-hi) 60%, transparent)' }}>×{r.mult}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{t.jacksFinish(r.jacks)}</div>
          </motion.div>
        )}

        <div className="panel" style={{ marginTop: 18, padding: '6px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr .8fr .9fr', padding: '8px 14px', fontSize: 12 }} className="mute">
            <span>{t.colPlayer}</span><span>{t.colHand}</span><span style={{ textAlign: 'right' }}>{t.colTotal}</span>
          </div>
          {r.rows.map((row, i) => {
            const isWinner = row.p === r.winner;
            const danger = row.after >= 130;
            return (
              <motion.div key={row.p} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.12 }}
                style={{ borderTop: '1px solid rgba(255,255,255,.06)', background: row.p === me ? 'color-mix(in srgb, var(--acc) 14%, transparent)' : 'transparent' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr .8fr .9fr', padding: '11px 14px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>{name(row.p)}{isWinner ? ' ✓' : ''}</span>
                  <span>{isWinner ? '—' : r.mult > 1 ? `${row.handPoints}×${r.mult}` : row.handPoints}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, fontSize: 18, color: row.reset ? 'var(--acc-hi)' : danger ? '#ff6b80' : 'var(--text)' }}>
                    {row.reset ? <><s className="mute" style={{ fontSize: 13, marginRight: 6 }}>125</s>0</> : <Count from={row.before} to={row.after} delay={0.5 + i * 0.12} />}
                  </span>
                </div>
                {row.reset && <div style={{ padding: '0 14px 9px', fontSize: 12, color: 'var(--acc-hi)' }}>{t.burned}</div>}
              </motion.div>
            );
          })}
        </div>

        <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
          {over ? (
            <>
              {onRematch && <button className="btn acc" onClick={onRematch}>{t.rematch}</button>}
              <button className="btn ghost" onClick={onHome}>{t.home}</button>
            </>
          ) : (
            <button className="btn acc" onClick={onNext}>{t.nextRound}</button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
