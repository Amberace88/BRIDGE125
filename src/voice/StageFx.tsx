// Cinematic one-shot effects for strong cards — drawn in a pointer-transparent layer above the table.
// Every effect is ≤ 1.25 s, animates only transform / opacity, and degrades to a plain fade with reduced motion.

import { AnimatePresence, motion } from 'motion/react';
import { memo, useEffect, type CSSProperties, type ReactNode } from 'react';
import { SUIT_GLYPH, isRed, type Suit } from '../engine/engine';
import './voice.css';

export interface P { x: number; y: number }
export type Fx =
  | { k: 'queen'; at: P; target: P }
  | { k: 'transfer'; at: P; from: P; target: P }
  | { k: 'eight'; at: P; target: P; amount: number; level: number }
  | { k: 'seven'; from: P; target: P; amount: number }
  | { k: 'ace'; from: P; targets: P[] }
  | { k: 'wild'; at: P; suit: Suit }
  | { k: 'bloom'; at: P; suit: Suit }
  | { k: 'six'; at: P }
  | { k: 'kings'; at: P; seats: P[] }
  | { k: 'burn'; at: P }
  | { k: 'mult'; at: P; mult: number }
  | { k: 'bluff'; at: P; good: boolean };
export type FxItem = Fx & { id: number };

/** How long each effect stays mounted (ms). */
export const FX_MS = 1300;

const pos = (p: P): CSSProperties => ({ left: p.x, top: p.y });
const R = (i: number, k: number) => (((i + 1) * 9301 * (k + 7) + 49297) % 233280) / 233280;   // deterministic jitter

/* ------------------------------------------------------------------ primitives */
function Ring({ at, color = 'var(--acc-hi)', size = 120, delay = 0, to = 2.8, width = 3, dur = 0.75 }: { at: P; color?: string; size?: number; delay?: number; to?: number; width?: number; dur?: number }) {
  return (
    <motion.i className="fx-ring" style={{ ...pos(at), width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderColor: color, borderWidth: width }}
      initial={{ scale: 0.15, opacity: 0.95 }} animate={{ scale: to, opacity: 0 }} transition={{ duration: dur, delay, ease: [0.15, 0.7, 0.3, 1] }} />
  );
}

function Stamp({ at, text, tone, delay = 0, reduce, size = 46 }: { at: P; text: string; tone: 'bad' | 'gold' | 'good' | 'fire'; delay?: number; reduce?: boolean; size?: number }) {
  return (
    <motion.div className={`fx-stamp ${tone}`} style={{ ...pos(at), fontSize: size }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 2.8, rotate: -22 }}
      animate={reduce ? { opacity: [0, 1, 1, 0] } : { opacity: [0, 1, 1, 0], scale: [2.8, 0.88, 1.04, 1], rotate: [-22, -7, -9, -9] }}
      transition={{ duration: 1.05, delay, times: reduce ? [0, 0.15, 0.75, 1] : [0, 0.22, 0.32, 1], ease: 'easeOut' }}>
      <span>{text}</span>
    </motion.div>
  );
}

function Particles({ at, n = 10, spread = 70, rise = 60, cls = 'ember', delay = 0 }: { at: P; n?: number; spread?: number; rise?: number; cls?: string; delay?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={`fx-pt ${cls}`} style={{
          ...pos(at),
          ['--dx' as string]: `${(R(i, 1) - 0.5) * spread * 2}px`, ['--dy' as string]: `${-rise - R(i, 2) * rise}px`,
          ['--s' as string]: (0.6 + R(i, 3) * 0.9).toFixed(2), animationDelay: `${(delay + R(i, 4) * 0.25).toFixed(2)}s`,
        }} />
      ))}
    </>
  );
}

const Crown = ({ size = 56 }: { size?: number }) => (
  <svg viewBox="0 0 64 48" width={size} height={size * 0.75} aria-hidden>
    <defs>
      <linearGradient id="fxcg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fff3c4" /><stop offset=".45" stopColor="#f2c14e" /><stop offset="1" stopColor="#9a6a12" /></linearGradient>
    </defs>
    <path d="M6 40 L3 12 L18 24 L32 4 L46 24 L61 12 L58 40 Z" fill="url(#fxcg)" stroke="#5a3a06" strokeWidth="1.2" strokeLinejoin="round" />
    <rect x="6" y="38" width="52" height="7" rx="2" fill="url(#fxcg)" stroke="#5a3a06" strokeWidth="1.2" />
    <circle cx="32" cy="4.5" r="3.4" fill="#ff5d73" /><circle cx="3.5" cy="12" r="2.6" fill="#7cf0b8" /><circle cx="60.5" cy="12" r="2.6" fill="#7cf0b8" />
    <circle cx="32" cy="31" r="4" fill="#5ac8ff" stroke="#fff6" />
  </svg>
);

/** Curved streak from one point to another, drawn on, with a glowing head (ace skip, 6♠ redirect). */
function Streak({ from, to, color, bend = -0.35, delay = 0, w, h }: { from: P; to: P; color: string; bend?: number; delay?: number; w: number; h: number }) {
  const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
  const dx = to.x - from.x, dy = to.y - from.y;
  // bow the arc toward the middle of the table, and keep its control point on screen
  const a = { x: mx - dy * bend, y: my + dx * bend }, b = { x: mx + dy * bend, y: my - dx * bend };
  const d2 = (p: P) => (p.x - w / 2) ** 2 + (p.y - h / 2) ** 2;
  const k = d2(a) <= d2(b) ? a : b;
  const cx = Math.max(24, Math.min(w - 24, k.x)), cy = Math.max(24, Math.min(h - 24, k.y));
  const d = `M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`;
  const ang = (Math.atan2(to.y - cy, to.x - cx) * 180) / Math.PI;
  return (
    <svg className="fx-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <motion.path d={d} fill="none" stroke={color} strokeOpacity={0.28} strokeWidth={16} strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: [1, 1, 0] }} transition={{ duration: 0.7, delay, times: [0, 0.6, 1], ease: "easeOut" }} />
      <motion.path d={d} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1, opacity: [1, 1, 0] }} transition={{ duration: 0.7, delay, times: [0, 0.6, 1], ease: "easeOut" }} />
      <motion.g initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.2, 1, 1] }} transition={{ duration: 0.95, delay: delay + 0.3, times: [0, 0.25, 0.7, 1] }}
        style={{ transformOrigin: `${to.x}px ${to.y}px` }}>
        <path d="M-14,-11 L6,0 L-14,11 Z" fill={color} transform={`translate(${to.x},${to.y}) rotate(${ang})`} />
      </motion.g>
    </svg>
  );
}

const SuitG = ({ s, size }: { s: Suit; size: number }) => (
  <span className={`fx-suit ${isRed(s) ? 'red' : ''}`} style={{ fontSize: size }}>{SUIT_GLYPH[s]}</span>
);

/* ------------------------------------------------------------------ effects */
function Effect({ fx, reduce, cw, w, h }: { fx: FxItem; reduce: boolean; cw: number; w: number; h: number }): ReactNode {
  /** keep stamps fully on screen (seats sit close to the edges on phones) */
  const inb = (p: P, m = 46): P => ({ x: Math.max(m, Math.min(w - m, p.x)), y: Math.max(m, Math.min(h - m, p.y)) });
  switch (fx.k) {
    case 'queen': return (
      <>
        <motion.div className="fx-dim" style={{ ['--fx' as string]: `${fx.at.x}px`, ['--fy' as string]: `${fx.at.y}px` }}
          initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 1.2, times: [0, 0.12, 0.62, 1] }} />
        {!reduce && <><Ring at={fx.at} color="#fff" size={cw * 1.4} width={4} /><Ring at={fx.at} color="#ff5d73" size={cw * 1.4} delay={0.12} to={3.4} /><Particles at={fx.at} n={12} spread={cw} rise={cw * 0.5} cls="shard" /></>}
        <motion.div className="fx-crown" style={pos({ x: fx.at.x, y: fx.at.y - cw * 0.95 })}
          initial={{ opacity: 0, scale: reduce ? 1 : 0.2, y: 14 }} animate={{ opacity: [0, 1, 1, 0], scale: reduce ? 1 : [0.2, 1.25, 1, 1], y: 0 }} transition={{ duration: 1.15, times: [0, 0.22, 0.4, 1], delay: 0.05 }}>
          <Crown size={cw * 0.62} />
          {!reduce && <motion.i className="fx-glint" initial={{ x: '-140%' }} animate={{ x: '160%' }} transition={{ duration: 0.55, delay: 0.32, ease: 'easeInOut' }} />}
        </motion.div>
        <Stamp at={inb(fx.target)} text="+5" tone="bad" delay={0.22} reduce={reduce} />
      </>
    );
    case 'transfer': return (
      <>
        {!reduce && <motion.i className="fx-mirror" style={{ ...pos(fx.at), width: cw * 2.4, height: cw * 2.4, marginLeft: -cw * 1.2, marginTop: -cw * 1.2 }}
          initial={{ x: -cw * 1.2, opacity: 0 }} animate={{ x: cw * 1.2, opacity: [0, 1, 0] }} transition={{ duration: 0.5, ease: 'easeInOut' }} />}
        <Ring at={fx.at} color="#c9a7ff" size={cw * 1.3} />
        {!reduce && <Streak from={fx.at} to={fx.target} color="#c9a7ff" bend={0.3} w={w} h={h} delay={0.12} />}
        <Stamp at={inb(fx.target)} text="+6" tone="bad" delay={0.38} reduce={reduce} />
      </>
    );
    case 'eight': {
      const k = Math.min(4, Math.max(1, fx.level));
      return (
        <>
          <motion.div className={`fx-chain l${k}`} style={pos({ x: fx.at.x, y: fx.at.y - cw * 1.02 })}
            initial={{ opacity: 0, scale: reduce ? 1 : 0.3 }} animate={{ opacity: [0, 1, 1, 0], scale: reduce ? 1 : [0.3, 1 + k * 0.12, 1 + k * 0.08, 1 + k * 0.08] }}
            transition={{ duration: 1.2, times: [0, 0.2, 0.75, 1] }}>
            <i className="fx-flame" />
            <b>+{fx.amount}</b>
            <span className="links">{Array.from({ length: k }, (_, i) => <i key={i} />)}</span>
          </motion.div>
          {!reduce && <Particles at={{ x: fx.at.x, y: fx.at.y - cw * 0.8 }} n={6 + k * 4} spread={cw * 0.7} rise={cw * (0.6 + k * 0.15)} />}
          <Stamp at={inb(fx.target)} text={`+${fx.amount}`} tone="fire" delay={0.3} reduce={reduce} size={38} />
        </>
      );
    }
    case 'seven': return (
      <>
        {!reduce && <motion.i className="fx-flick" style={{ ...pos(fx.from), width: cw * 0.42, height: cw * 0.6, marginLeft: -cw * 0.21, marginTop: -cw * 0.3 }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
          animate={{ x: fx.target.x - fx.from.x, y: fx.target.y - fx.from.y, rotate: 540, opacity: [1, 1, 0], scale: [1, 0.9, 0.6] }}
          transition={{ duration: 0.55, ease: [0.3, 0.1, 0.3, 1] }} />}
        <Stamp at={inb(fx.target)} text={`+${fx.amount}`} tone="gold" delay={0.42} reduce={reduce} size={34} />
      </>
    );
    case 'ace': return (
      <>
        {fx.targets.map((t, i) => (
          <span key={i}>
            {!reduce && <Streak from={fx.from} to={t} color="#7cd8ff" bend={-0.38} delay={i * 0.12} w={w} h={h} />}
            <motion.div className="fx-skip" style={pos(t)} initial={{ opacity: 0, scale: reduce ? 1 : 2.2, rotate: -90 }}
              animate={{ opacity: [0, 1, 1, 0], scale: reduce ? 1 : [2.2, 0.9, 1, 1], rotate: reduce ? 0 : [-90, 0, 0, 0] }} transition={{ duration: 1, delay: 0.32 + i * 0.12, times: [0, 0.25, 0.75, 1] }}>
              <svg viewBox="0 0 40 40" aria-hidden><circle cx="20" cy="20" r="16" /><path d="M9 31 L31 9" /></svg>
            </motion.div>
          </span>
        ))}
      </>
    );
    case 'wild': return (
      <>
        {!reduce && <motion.i className="fx-prism" style={{ ...pos(fx.at), width: cw * 2.2, height: cw * 2.2, marginLeft: -cw * 1.1, marginTop: -cw * 1.1 }}
          initial={{ scale: 0.3, opacity: 0, rotate: 0 }} animate={{ scale: [0.3, 1.1, 1.5], opacity: [0, 0.9, 0], rotate: 220 }} transition={{ duration: 1.05, ease: 'easeOut' }} />}
        <motion.div className="fx-orbit" style={pos(fx.at)} initial={{ rotate: 0, scale: 1.25, opacity: 0 }}
          animate={reduce ? { opacity: [0, 1, 0] } : { rotate: 540, scale: [1.25, 1, 0.15], opacity: [0, 1, 1, 0] }} transition={{ duration: 1, ease: 'easeInOut' }}>
          {(['S', 'H', 'C', 'D'] as Suit[]).map((s, i) => (
            <i key={s} style={{ transform: `rotate(${i * 90}deg) translateY(${-cw * 0.85}px) rotate(${-i * 90}deg)` }}><SuitG s={s} size={cw * 0.34} /></i>
          ))}
        </motion.div>
      </>
    );
    case 'bloom': return (
      <>
        <motion.div className="fx-bloom" style={pos(fx.at)} initial={{ opacity: 0, scale: 0.2 }}
          animate={reduce ? { opacity: [0, 1, 0] } : { opacity: [0, 1, 1, 0], scale: [0.2, 2.6, 2.3, 3] }} transition={{ duration: 1.1, times: [0, 0.3, 0.7, 1] }}>
          <SuitG s={fx.suit} size={40} />
        </motion.div>
        <Ring at={fx.at} color={isRed(fx.suit) ? '#ff6b80' : '#f4f1e6'} size={60} to={3.2} />
        {!reduce && <Ring at={fx.at} color="var(--acc-hi)" size={60} to={2.4} delay={0.15} />}
      </>
    );
    case 'six': return (
      <motion.div className="fx-shield" style={pos(fx.at)} initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0.95, 0.4, 0.9, 0], scale: reduce ? 1 : [0.6, 1.08, 1, 1.06, 1.12] }} transition={{ duration: 1.15, times: [0, 0.2, 0.45, 0.65, 1] }}>
        <svg viewBox="0 0 60 70" width={cw * 0.95} height={cw * 1.1} aria-hidden>
          <path d="M30 4 L54 13 V33 C54 50 43 61 30 66 C17 61 6 50 6 33 V13 Z" />
          <path d="M30 14 L45 20 V33 C45 44 39 51 30 55 C21 51 15 44 15 33 V20 Z" className="in" />
        </svg>
      </motion.div>
    );
    case 'kings': return (
      <>
        <motion.i className="fx-rays" style={{ ...pos(fx.at), width: cw * 4, height: cw * 4, marginLeft: -cw * 2, marginTop: -cw * 2 }}
          initial={{ opacity: 0, scale: 0.3, rotate: 0 }} animate={{ opacity: [0, 1, 0], scale: reduce ? 1 : [0.3, 1.2, 1.6], rotate: reduce ? 0 : 70 }} transition={{ duration: 1.25, ease: 'easeOut' }} />
        <Ring at={fx.at} color="#f2c14e" size={cw * 1.4} width={5} />
        {fx.seats.map((s, i) => (
          <motion.div key={i} className="fx-crown" style={pos(fx.at)} initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
            animate={reduce ? { opacity: [0, 1, 0] } : { x: s.x - fx.at.x, y: s.y - fx.at.y, scale: [0.3, 1.3, 0.9], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.05, delay: 0.15 + i * 0.06, ease: [0.2, 0.7, 0.3, 1] }}>
            <Crown size={cw * 0.45} />
          </motion.div>
        ))}
        {!reduce && <Particles at={fx.at} n={16} spread={cw * 1.4} rise={cw * 0.8} cls="gold" />}
      </>
    );
    case 'burn': return (
      <>
        <motion.i className="fx-heat" style={pos(fx.at)} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: [0, 1, 0.8, 0], scale: reduce ? 1 : [0.4, 1.3, 1.1, 1.5] }} transition={{ duration: 1.2 }} />
        {!reduce && <Particles at={fx.at} n={18} spread={34} rise={70} />}
        {!reduce && Array.from({ length: 7 }, (_, i) => (
          <i key={i} className="fx-tongue" style={{ ...pos({ x: fx.at.x + (i - 3) * 9, y: fx.at.y + 8 }), animationDelay: `${(i % 3) * 0.08}s`, ['--h' as string]: (0.7 + R(i, 9) * 0.6).toFixed(2) }} />
        ))}
        <Stamp at={inb({ x: fx.at.x, y: fx.at.y - 30 })} text="0" tone="fire" delay={0.5} reduce={reduce} size={40} />
      </>
    );
    case 'mult': return (
      <>
        <Ring at={fx.at} color="var(--acc-hi)" size={160} width={5} to={3} />
        {!reduce && <Ring at={fx.at} color="#fff" size={160} delay={0.12} to={2.2} />}
        <motion.div className="fx-mult serif" style={pos(fx.at)} initial={{ opacity: 0, scale: reduce ? 1 : 3.4, rotate: -14 }}
          animate={{ opacity: [0, 1, 1, 0], scale: reduce ? 1 : [3.4, 0.9, 1.05, 1], rotate: [-14, -4, -6, -6] }} transition={{ duration: 1.25, times: [0, 0.16, 0.7, 1] }}>
          ×{fx.mult}
        </motion.div>
        {!reduce && <Particles at={fx.at} n={14} spread={120} rise={60} cls="gold" />}
      </>
    );
    case 'bluff': return (
      <>
        <motion.div className={`fx-edge ${fx.good ? 'good' : 'bad'}`} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.7, 0] }} transition={{ duration: 1.1 }} />
        <Ring at={fx.at} color={fx.good ? '#7cf0b8' : '#ff5d73'} size={cw * 1.5} width={5} to={3.2} />
        {!reduce && <Ring at={fx.at} color={fx.good ? '#7cf0b8' : '#ff5d73'} size={cw * 1.5} delay={0.15} to={2.4} />}
      </>
    );
  }
}

const Item = memo(function Item({ fx, reduce, cw, w, h, onDone }: { fx: FxItem; reduce: boolean; cw: number; w: number; h: number; onDone: (id: number) => void }) {
  useEffect(() => { const t = setTimeout(() => onDone(fx.id), FX_MS); return () => clearTimeout(t); }, [fx.id, onDone]);
  return <motion.div className="fx-one" exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>{Effect({ fx, reduce, cw, w, h })}</motion.div>;
});

export function StageFx({ items, reduce, cw, w, h, onDone }: { items: FxItem[]; reduce: boolean; cw: number; w: number; h: number; onDone: (id: number) => void }) {
  return (
    <div className="fxlayer" aria-hidden>
      <AnimatePresence>
        {items.map(fx => <Item key={fx.id} fx={fx} reduce={reduce} cw={cw} w={w} h={h} onDone={onDone} />)}
      </AnimatePresence>
    </div>
  );
}
