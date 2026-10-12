import { memo, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { rng } from './art';

/**
 * Win celebration overlay. Pure CSS particles (transform/opacity only), unmounts itself.
 *   Results screen:  {won && <VictoryEffect id={cos.equipped.victory} />}            → full-screen, plays once
 *   Previews:        <VictoryEffect id="vx_fireworks" contained loop />               → fills the nearest positioned parent
 */
export const VictoryEffect = memo(function VictoryEffect({ id, contained = false, loop = false, onDone }: {
  id: string | null | undefined; contained?: boolean; loop?: boolean; onDone?: () => void;
}) {
  const [run, setRun] = useState(0);
  const [alive, setAlive] = useState(true);
  const kind = (id ?? 'vx_classic').replace(/^vx_/, '');
  const total = DURATION[kind] ?? 3200;
  useEffect(() => {
    const t = setTimeout(() => { if (loop) setRun(r => r + 1); else { setAlive(false); onDone?.(); } }, total + (loop ? 500 : 0));
    return () => clearTimeout(t);
  }, [run, loop, total, onDone]);
  const parts = useMemo(() => (BUILD[kind] ?? BUILD.classic)(contained, 1 + run * 7), [kind, contained, run]);
  if (!alive) return null;
  return <div key={run} className={`vfx vfx-${kind} ${contained ? 'contained' : ''}`} aria-hidden data-victory={id}>{parts}</div>;
});

const DURATION: Record<string, number> = { classic: 2200, confetti: 4200, fireworks: 3600, waterfall: 4000, crowns: 4200 };
const v = (o: Record<string, string | number>) => Object.fromEntries(Object.entries(o).map(([k, x]) => [`--${k}`, typeof x === 'number' ? `${x}` : x])) as CSSProperties;
const GOLDS = ['#fff2c4', '#f3de9c', '#e2bd62', '#c9a54c', '#fffaf0', '#b38a33'];

const BUILD: Record<string, (small: boolean, seed: number) => ReactNode> = {
  classic(small, seed) {
    const r = rng(seed), n = small ? 22 : 40, out: ReactNode[] = [<b key="f" className="flash" />];
    for (let i = 0; i < n; i++) {
      out.push(<i key={i} className="sp" style={v({ a: `${(i / n) * 360 + r() * 12}deg`, r: small ? `${60 + r() * 90}px` : `${18 + r() * 26}vmin`, s: `${(small ? 5 : 7) + r() * 8}px`, d: `${1.1 + r() * 0.8}s`, dl: `${r() * 0.25}s` })} />);
    }
    return out;
  },
  confetti(small, seed) {
    const r = rng(seed), n = small ? 34 : 90, out: ReactNode[] = [];
    for (let i = 0; i < n; i++) {
      const c = i % 7 === 0 ? '#ffffff' : i % 5 === 0 ? '#d2334f' : GOLDS[i % GOLDS.length];
      out.push(<i key={i} className="cf" style={v({ x: `${r() * 100}%`, w: `${(small ? 5 : 7) + r() * 5}px`, c, d: `${(small ? 1.8 : 2.8) + r() * 1.4}s`, dl: `${r() * 1.2}s`, sway: `${(r() - 0.5) * 120}px`, rz: `${r() * 360}deg` })} />);
    }
    return out;
  },
  fireworks(small, seed) {
    const r = rng(seed), bursts = small ? 3 : 6, out: ReactNode[] = [];
    const cols = [['#ffd36b', '#fff2c4'], ['#ff5c7a', '#ffc2cc'], ['#62f3ff', '#ffffff'], ['#b57bff', '#e8d6ff'], ['#4fe0a0', '#e0fff0']];
    for (let b = 0; b < bursts; b++) {
      const [c1, c2] = cols[(b + seed) % cols.length];
      const n = small ? 16 : 26, dl = 0.55 + b * (small ? 0.65 : 0.45) + r() * 0.2, R = small ? 50 + r() * 30 : 90 + r() * 90;
      const sparks: ReactNode[] = [<b key="t" />];
      for (let i = 0; i < n; i++) sparks.push(<i key={i} style={v({ a: `${(i / n) * 360}deg`, r: `${R * (0.75 + r() * 0.35)}px`, c: i % 3 ? c1 : c2, d: `${1.1 + r() * 0.5}s`, dl: `${dl}s`, s: `${3 + r() * 3}px` })} />);
      out.push(<span key={b} className="fw" style={v({ x: `${15 + r() * 70}%`, y: `${small ? 22 + r() * 30 : 14 + r() * 34}%`, dl: `${dl}s` })}>{sparks}</span>);
    }
    return out;
  },
  waterfall(small, seed) {
    const r = rng(seed), n = small ? 16 : 42, out: ReactNode[] = [];
    const suits = ['♠', '♥', '♦', '♣'];
    for (let i = 0; i < n; i++) {
      const face = i % 3 !== 0, s = suits[i % 4];
      out.push(
        <i key={i} className={`wc ${face ? `fc ${s === '♥' || s === '♦' ? 'red' : ''}` : 'bkside'}`}
          style={v({ x: `${(i % 8) * 12.5 + r() * 6}%`, w: `${small ? 26 + r() * 8 : 40 + r() * 18}px`, d: `${(small ? 1.8 : 2.6) + r() * 1}s`, dl: `${Math.floor(i / 8) * 0.32 + r() * 0.3}s`, sway: `${(r() - 0.5) * 90}px`, rz: `${(r() - 0.5) * 40}deg`, spin: `${(r() - 0.5) * 520}deg` })}>
          {face ? s : null}
        </i>,
      );
    }
    return out;
  },
  crowns(small, seed) {
    const r = rng(seed), n = small ? 12 : 28, out: ReactNode[] = [<b key="g" className="glowtop" />];
    for (let i = 0; i < n; i++) {
      out.push(<i key={i} className="cr" style={v({ x: `${r() * 92}%`, w: `${small ? 22 + r() * 14 : 34 + r() * 30}px`, d: `${(small ? 2 : 3) + r() * 1.2}s`, dl: `${r() * 1.4}s`, sway: `${(r() - 0.5) * 80}px`, rz: `${(r() - 0.5) * 30}deg` })}><CrownSvg /></i>);
    }
    return out;
  },
};

const CrownSvg = () => (
  <svg viewBox="0 0 62 44">
    <path d="M5 38 L2 10 L17 22 L31 3 L45 22 L60 10 L57 38Z" fill="#e9c46a" stroke="#8c6e28" strokeWidth="2" strokeLinejoin="round" />
    <path d="M8 34 L6 16 L17 25 L31 9 L45 25 L56 16 L54 34Z" fill="#fff2c4" opacity=".35" />
    <rect x="5" y="35" width="52" height="7" rx="2" fill="#c9a54c" stroke="#8c6e28" strokeWidth="1.5" />
    <circle cx="31" cy="26" r="4" fill="#e8344f" />
  </svg>
);
