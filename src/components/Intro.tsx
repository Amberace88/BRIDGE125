import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card, Rank, Suit } from '../engine/engine';
import { CardFace } from './CardFace';
import { useApp } from '../store';
import { useStrings } from '../i18n/pick';
import { HOME } from '../i18n/home';

const FLAG = 'b125.intro.v1';

/** Once per session, only on the plain home URL, never with reduced motion or a deep link. */
export function shouldShowIntro(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(FLAG)) return false;
  } catch { return false; }
  if (location.pathname !== '/') return false;
  const q = new URLSearchParams(location.search);
  if (q.has('play') || q.has('install') || q.has('nointro')) return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
}

const C = (id: string): Card => ({ id, r: id.slice(0, -1) as Rank, s: id.slice(-1) as Suit });

// timeline (seconds) — whole piece ends at DONE (+ ~0.4s exit fade owned by Home) ≤ 3.5s
const T = { deck: 0.05, riffle: 0.48, deal: 1.0, qflip: 1.42, plus5: 1.56, x5: 1.74, lift: 1.92, count: 1.98, burn: 2.56, zero: 2.74, done: 3.08 };

const DECK = 7;
// fan: jacks around the queen of spades
const FAN = ['JS', 'JH', 'QS', 'JC', 'JD'];
const EMBERS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2 + ((i * 37) % 10) / 20;
  const d = 70 + ((i * 53) % 60);
  return { x: Math.cos(a) * d * 1.5, y: Math.sin(a) * d - 30, s: 0.5 + ((i * 29) % 10) / 12, del: ((i * 17) % 10) / 80 };
});

export function Intro({ onDone }: { onDone: () => void }) {
  const { lang } = useApp();
  const s = useStrings(HOME).intro;
  const done = useRef(false);
  const finish = () => { if (done.current) return; done.current = true; onDone(); };
  const [phase, setPhase] = useState<'cards' | 'count' | 'burn' | 'zero'>('cards');
  const [vw, setVw] = useState(() => window.innerWidth);
  const cw = Math.round(Math.min(118, Math.max(78, vw * 0.22)));
  const ch = Math.round(cw * 1.43);

  const count = useMotionValue(0);
  const shown = useTransform(count, v => String(Math.round(v)));

  useEffect(() => {
    try { sessionStorage.setItem(FLAG, '1'); } catch { /* */ }
    const f = () => setVw(window.innerWidth);
    window.addEventListener('resize', f);
    const key = () => finish();
    window.addEventListener('keydown', key);
    const timers = [
      setTimeout(() => setPhase('count'), T.count * 1000),
      setTimeout(() => setPhase('burn'), T.burn * 1000),
      setTimeout(() => setPhase('zero'), T.zero * 1000),
      setTimeout(finish, T.done * 1000),
    ];
    const ctl = animate(count, 125, { delay: T.count, duration: T.burn - T.count - 0.04, ease: [0.16, 0.8, 0.3, 1] });
    return () => { timers.forEach(clearTimeout); ctl.stop(); window.removeEventListener('resize', f); window.removeEventListener('keydown', key); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const embers = useMemo(() => EMBERS, []);
  const lifted = phase !== 'cards';

  return (
    <motion.div className="intro" role="dialog" aria-label="Bridge 125" onPointerDown={finish}
      initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.42, ease: 'easeOut' } }}>
      <div className="intro-felt" aria-hidden />
      <div className="intro-spot" aria-hidden />

      <motion.div className="intro-word" aria-hidden initial={{ opacity: 0, letterSpacing: '0.6em' }} animate={{ opacity: 0.85, letterSpacing: '0.34em' }} transition={{ delay: 0.1, duration: 1.1, ease: 'easeOut' }}>
        BRIDGE <b>125</b>
      </motion.div>

      <button className="intro-skip" onPointerDown={e => { e.stopPropagation(); finish(); }} onClick={finish} aria-label={s.skip}>
        <span>{s.skip}</span>
        <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden><path d="M4 4l7 6-7 6M11 4l7 6-7 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {/* camera: slow dolly across the whole piece */}
      <motion.div className="intro-cam" aria-hidden
        initial={{ rotateX: 26, rotateY: -14, scale: 0.9 }} animate={{ rotateX: 14, rotateY: 8, scale: 1 }} transition={{ duration: T.done, ease: [0.3, 0.1, 0.2, 1] }}
        exit={{ scale: 1.08, transition: { duration: 0.42 } }}>
        <motion.div className="intro-table" style={{ width: cw, height: ch }}
          animate={lifted ? { y: -ch * 0.72, scale: 0.64, opacity: 0.82 } : { y: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}>
          {/* deck that shuffles, then deals the fan */}
          {Array.from({ length: DECK }, (_, i) => {
            const fanIdx = i < FAN.length ? i : -1;
            const k = fanIdx - 2;
            const side = i % 2 ? 1 : -1;
            const stackY = -i * 2.2;
            const isQ = fanIdx >= 0 && FAN[fanIdx] === 'QS';
            const dealAt = T.deal + (fanIdx >= 0 ? Math.abs(k) * 0.06 : 0.1);
            const spreadMul = 1.18;
            return (
              <motion.div key={i} className="icard" style={{ width: cw, height: ch, ['--cw' as string]: `${cw}px`, zIndex: isQ ? 20 : 10 - Math.abs(k) }}
                initial={{ x: 0, y: 90 + i * 4, z: i * 3, rotate: 0, opacity: 0 }}
                animate={fanIdx >= 0 ? {
                  opacity: [0, 1, 1, 1, 1, 1],
                  x: [0, 0, side * cw * 0.66, 0, k * cw * 0.6, k * cw * 0.6 * spreadMul],
                  y: [90 + i * 4, stackY, stackY - 8, stackY, Math.abs(k) * ch * 0.07, Math.abs(k) * ch * 0.08],
                  z: [i * 3, i * 3, side * 10, i * 3, isQ ? 40 : -Math.abs(k) * 16, isQ ? 46 : -Math.abs(k) * 18],
                  rotate: [0, 0, side * 9, 0, k * 8, k * 10],
                } : {
                  opacity: [0, 1, 1, 1, 0],
                  x: [0, 0, side * cw * 0.66, 0, 0],
                  y: [90 + i * 4, stackY, stackY - 8, stackY, stackY + 20],
                  z: [i * 3, i * 3, side * 10, i * 3, -30],
                  rotate: [0, 0, side * 9, 0, 0],
                }}
                transition={{
                  duration: (fanIdx >= 0 ? T.x5 + 0.2 : dealAt + 0.3) - T.deck,
                  delay: T.deck + i * 0.02,
                  times: fanIdx >= 0
                    ? norm([T.deck, T.deck + 0.42, T.riffle + 0.2 + (i % 3) * 0.03, T.riffle + 0.48, dealAt + 0.36, T.x5 + 0.2])
                    : norm([T.deck, T.deck + 0.42, T.riffle + 0.2 + (i % 3) * 0.03, T.riffle + 0.48, dealAt + 0.3]),
                  ease: 'easeInOut',
                }}>
                <motion.div className="iflip" initial={{ rotateY: 180 }}
                  animate={{ rotateY: fanIdx >= 0 ? 0 : 180 }}
                  transition={{ delay: isQ ? T.qflip : dealAt + 0.18, type: 'spring', stiffness: 170, damping: 17 }}>
                  {fanIdx >= 0 ? <CardFace card={C(FAN[fanIdx])} lang={lang} /> : <div className="face" />}
                  <div className="bk" />
                  {isQ && <span className="iglintwrap"><motion.i className="iglint" initial={{ x: '-130%' }} animate={{ x: '130%' }} transition={{ delay: T.qflip + 0.16, duration: 0.6, ease: 'easeInOut' }} /></span>}
                </motion.div>
              </motion.div>
            );
          })}

          <motion.span className="ibadge bad" style={{ top: -ch * 0.22 }} initial={{ scale: 0, opacity: 0, y: 10, z: 90 }}
            animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ delay: T.plus5, type: 'spring', stiffness: 420, damping: 15 }}>+5</motion.span>
          <motion.span className="ibadge acc" style={{ top: ch * 1.02 }} initial={{ scale: 0, opacity: 0, y: -10, z: 90 }}
            animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ delay: T.x5, type: 'spring', stiffness: 420, damping: 15 }}>×5</motion.span>
        </motion.div>
      </motion.div>

      {/* the famous 125 */}
      <div className="intro-count" aria-hidden style={{ fontSize: Math.round(cw * 1.02), top: `calc(50% + ${Math.round(ch * 0.12)}px)` }}>
        <motion.span className={`n ${phase === 'burn' || phase === 'zero' ? 'hot' : ''}`}
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={phase === 'cards' ? { opacity: 0, y: 24, scale: 0.9 } : phase === 'zero' ? { opacity: 0, y: -10, scale: 1.45 } : phase === 'burn' ? { opacity: 1, y: 0, scale: 1.12 } : { opacity: 1, y: 0, scale: 1 }}
          transition={phase === 'zero' ? { duration: 0.16, ease: 'easeIn' } : { type: 'spring', stiffness: 260, damping: 20 }}>{shown}</motion.span>
        <motion.span className="z"
          initial={{ opacity: 0, scale: 0.4 }} animate={phase === 'zero' ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
          transition={{ delay: phase === 'zero' ? 0.1 : 0, type: 'spring', stiffness: 380, damping: 16 }}>0</motion.span>
        {phase !== 'cards' && phase !== 'count' && embers.map((e, i) => (
          <motion.i key={i} className="ember" initial={{ x: 0, y: 0, opacity: 1, scale: e.s }}
            animate={{ x: e.x, y: e.y, opacity: 0, scale: 0.2 }} transition={{ delay: e.del, duration: 0.7, ease: 'easeOut' }} />
        ))}
        <motion.div className="cap" initial={{ opacity: 0, y: 8 }} animate={phase === 'burn' || phase === 'zero' ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.3 }}>{s.burn}</motion.div>
      </div>

      <motion.i className="intro-bar" aria-hidden initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: T.done, ease: 'linear' }} />
    </motion.div>
  );
}

/** Absolute timestamps → 0..1 keyframe offsets (monotonic). */
function norm(ts: number[]): number[] {
  const a = ts[0], b = ts[ts.length - 1];
  let prev = 0;
  return ts.map(t => { const v = Math.min(1, Math.max(prev, (t - a) / (b - a))); prev = v; return v; });
}
