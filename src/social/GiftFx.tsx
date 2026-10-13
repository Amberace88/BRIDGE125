import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { buzz, sfx } from '../sound';
import { GiftArt, CoinIcon } from './GiftArt';
import { gift as giftOf, type GiftEvent, type SeatGift, type TipEvent } from './gifts';
import { SEAT_COLORS } from './ChatDock';

type P = { x: number; y: number };

/** Sample a quadratic Bézier arc (control point lifted above the midpoint) into motion keyframes. */
function arc(a: P, b: P, lift: number, n = 14) {
  // the apex stays on screen even when a top seat throws to another top seat
  const c = { x: (a.x + b.x) / 2 + (b.x - a.x) * 0.08, y: Math.max(36, Math.min(a.y, b.y) - lift) };
  const xs: number[] = [], ys: number[] = [], times: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    xs.push(u * u * a.x + 2 * u * t * c.x + t * t * b.x);
    ys.push(u * u * a.y + 2 * u * t * c.y + t * t * b.y);
    times.push(t);
  }
  return { xs, ys, times };
}

const rnd = (seed: number) => { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

/**
 * One gift: thrown from the sender's seat in a lit arc (spin + scale swell), lands with a shockwave and a burst
 * themed per gift (petals, fizz, smoke, sparkles, fireworks), then shrinks onto the receiver's seat.
 * Transform/opacity only (compositor friendly) — 60 fps on phones.
 */
export function GiftFlight({ ev, from, to, reduce, label, onDone, W, H }: { ev: GiftEvent; from: P; to: P; reduce: boolean; label: string; onDone: (id: number) => void; W: number; H: number }) {
  const g = giftOf(ev.gift);
  const tier = g?.tier ?? 1;
  const [phase, setPhase] = useState<'fly' | 'land'>(reduce ? 'land' : 'fly');
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const path = useMemo(() => arc(from, to, Math.max(70, Math.min(240, dist * 0.42))), [from.x, from.y, to.x, to.y]); // eslint-disable-line react-hooks/exhaustive-deps
  const dur = 0.95 + tier * 0.09;
  const peak = (1.25 + tier * 0.18) * (W < 520 ? 0.82 : 1);   // a little smaller on phones
  useEffect(() => { if (phase === 'fly') sfx.whoosh(to.x > from.x ? 1 : -1); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase !== 'land') return;
    if (tier >= 4) sfx.fanfare(); else if (tier === 3) sfx.prism(); else sfx.good();
    buzz(tier >= 3 ? [20, 30, 40] : 15);
    const tm = setTimeout(() => onDone(ev.id), reduce ? 1400 : 1900 + tier * 120);
    return () => clearTimeout(tm);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const n = path.xs.length;
  const scales = path.xs.map((_, i) => { const t = i / (n - 1); return 0.35 + Math.sin(t * Math.PI) * (peak - 0.35) + t * 0.65; });
  const rots = path.xs.map((_, i) => -24 + (i / (n - 1)) * (tier >= 3 ? 384 : 24));

  return (
    <>
      {phase === 'fly' && (
        <motion.div className={`gflight t${tier}`} style={{ left: 0, top: 0 }}
          initial={{ x: path.xs[0] - 28, y: path.ys[0] - 28, scale: 0.3, rotate: -24, opacity: 0 }}
          animate={{ x: path.xs.map(x => x - 28), y: path.ys.map(y => y - 28), scale: scales, rotate: rots, opacity: path.xs.map((_, i) => (i === 0 ? 0 : 1)) }}
          transition={{ duration: dur, times: path.times, ease: 'easeInOut' }}
          onAnimationComplete={() => setPhase('land')}>
          <span className="gglow" style={{ ['--gc' as string]: g?.colors[0] ?? '#EBD38E' }} />
          <GiftArt id={ev.gift} size={56} />
        </motion.div>
      )}
      {phase === 'land' && <GiftLanding ev={ev} at={to} reduce={reduce} label={label} W={W} H={H} />}
    </>
  );
}

function GiftLanding({ ev, at, reduce, label, W, H }: { ev: GiftEvent; at: P; reduce: boolean; label: string; W: number; H: number }) {
  const g = giftOf(ev.gift);
  const tier = g?.tier ?? 1;
  const colors = g?.colors ?? ['#EBD38E'];
  const parts = useMemo(() => {
    const r = rnd(ev.id * 7919 + 13);
    const count = reduce ? 0 : 10 + tier * 5;
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + r() * 0.5;
      const d = 34 + r() * (30 + tier * 16);
      return { dx: Math.cos(a) * d, dy: Math.sin(a) * d - (g?.fx === 'fizz' || g?.fx === 'smoke' ? 26 : 0), c: colors[i % colors.length], s: 3 + r() * (3 + tier), delay: r() * 0.12, rot: r() * 360 };
    });
  }, [ev.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const bursts = g?.fx === 'fireworks' && !reduce ? [{ x: -38, y: -46, d: 0.15 }, { x: 40, y: -30, d: 0.38 }, { x: 0, y: -70, d: 0.6 }] : [];
  // keep the caption on screen (it is centred on the seat; seats sit close to the edges on phones)
  const half = Math.min(150, label.length * 3.6 + 16);
  const labelDx = Math.min(Math.max(at.x, half + 8), W - half - 8) - at.x;
  const shape = g?.fx === 'petals' ? 'petal' : g?.fx === 'clover' ? 'leaf' : g?.fx === 'smoke' ? 'puff' : g?.fx === 'fizz' ? 'bubble' : 'spark';

  return (
    <div className="gland" style={{ left: at.x, top: at.y }}>
      {!reduce && <motion.span className="gring" style={{ borderColor: colors[0] }} initial={{ scale: 0.2, opacity: 0.95 }} animate={{ scale: 2.8 + tier * 0.3, opacity: 0 }} transition={{ duration: 0.75, ease: 'easeOut' }} />}
      {!reduce && tier >= 3 && <motion.span className="gflash" style={{ background: `radial-gradient(circle, ${colors[0]}cc, transparent 65%)` }} initial={{ scale: 0.3, opacity: 1 }} animate={{ scale: 3.4, opacity: 0 }} transition={{ duration: 0.6 }} />}
      {parts.map((p, i) => (
        <motion.i key={i} className={`gpart ${shape}`} style={{ background: p.c, width: p.s * (shape === 'puff' ? 2.4 : shape === 'petal' ? 1.6 : 1), height: p.s * (shape === 'puff' ? 2.4 : 1) }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: p.rot }}
          animate={{ x: p.dx, y: p.dy + (shape === 'petal' || shape === 'leaf' ? 30 : 0), opacity: 0, scale: shape === 'puff' ? 1.8 : 0.4, rotate: p.rot + 180 }}
          transition={{ duration: shape === 'puff' ? 1.4 : 0.95, delay: p.delay, ease: [0.15, 0.7, 0.3, 1] }} />
      ))}
      {bursts.map((b, k) => (
        <span key={k} className="gburst" style={{ left: b.x, top: b.y }}>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <motion.i key={i} className="gpart spark" style={{ background: colors[(i + k) % colors.length], width: 4, height: 4 }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }} animate={{ x: Math.cos(a) * 34, y: Math.sin(a) * 34 + 8, opacity: [0, 1, 0], scale: [0.4, 1.2, 0.6] }}
              transition={{ duration: 0.9, delay: b.d, ease: 'easeOut' }} />;
          })}
        </span>
      ))}
      <motion.div className="gsit"
        initial={{ scale: reduce ? 1 : 1.7, y: 0, opacity: 1 }}
        animate={{ scale: [reduce ? 1 : 1.7, 1.15, 1.15, 0.42], y: [0, -6, -6, 16], opacity: [1, 1, 1, 0] }}
        transition={{ duration: 1.7 + tier * 0.12, times: [0, 0.18, 0.78, 1], ease: 'easeInOut' }}>
        <GiftArt id={ev.gift} size={56} />
      </motion.div>
      <motion.div className="glabel" style={{ x: '-50%', left: labelDx, top: at.y > H * 0.6 ? -84 : 40, ['--sc' as string]: SEAT_COLORS[Math.max(0, ev.from) % 4] }}
        initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: [0, 1, 1, 0], y: [8, 0, -4, -14], scale: 1 }}
        transition={{ duration: 1.8 + tier * 0.12, times: [0, 0.12, 0.8, 1] }}>
        {label}
      </motion.div>
    </div>
  );
}

/** BM tip: a short stream of coins flying seat → seat, then "+N BM" rises from the receiver. */
export function TipFlight({ ev, from, to, reduce, label, onDone, W, H }: { ev: TipEvent; from: P; to: P; reduce: boolean; label: string; onDone: (id: number) => void; W: number; H: number }) {
  const coins = reduce ? 0 : Math.min(9, 3 + Math.round(Math.log10(Math.max(10, ev.amount)) * 2));
  const path = useMemo(() => arc(from, to, Math.max(50, Math.hypot(to.x - from.x, to.y - from.y) * 0.3), 10), [from.x, from.y, to.x, to.y]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = 0.75 + coins * 0.07;
  useEffect(() => {
    const t1 = setTimeout(() => sfx.coin(), total * 1000);
    const t2 = setTimeout(() => onDone(ev.id), total * 1000 + 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {Array.from({ length: coins }, (_, i) => (
        <motion.div key={i} className="tcoin" style={{ left: 0, top: 0 }}
          initial={{ x: path.xs[0] - 11, y: path.ys[0] - 11, opacity: 0, rotateY: 0 }}
          animate={{ x: path.xs.map(x => x - 11), y: path.ys.map(y => y - 11), opacity: path.xs.map((_, k) => (k === 0 ? 0 : k === path.xs.length - 1 ? 0 : 1)), rotateY: 720 }}
          transition={{ duration: 0.75, delay: i * 0.07, times: path.times, ease: 'easeIn' }}>
          <CoinIcon size={22} />
        </motion.div>
      ))}
      <motion.div className="tiplabel" style={{ left: Math.min(Math.max(to.x, 70), W - 70), top: to.y > H * 0.6 ? to.y - 40 : to.y + 30, x: '-50%' }}
        initial={{ opacity: 0, y: 0, scale: 0.6 }} animate={{ opacity: [0, 1, 1, 0], y: [0, -26, -34, -50], scale: [0.6, 1.1, 1, 1] }}
        transition={{ duration: 1.6, delay: total - 0.1, times: [0, 0.2, 0.75, 1] }}>
        <CoinIcon size={16} /> {label}
      </motion.div>
    </>
  );
}

/** Small persistent gift icons on a seat for the rest of the game (latest 3 kinds, with a count). */
export function SeatGifts({ list, seat, me, avSize, n }: { list: SeatGift[]; seat: (i: number) => P; me: number; avSize: number; n: number }) {
  const bySeat = useMemo(() => {
    const m = new Map<number, { id: string; count: number }[]>();
    for (const [s, gid] of list) {
      if (s < 0 || s >= n) continue;
      const arr = m.get(s) ?? [];
      const hit = arr.find(x => x.id === gid);
      if (hit) { hit.count++; arr.splice(arr.indexOf(hit), 1); arr.push(hit); } else arr.push({ id: gid, count: 1 });
      m.set(s, arr);
    }
    return m;
  }, [list, n]);
  return (
    <>
      {[...bySeat].map(([s, arr]) => {
        const p = seat(s);
        const mine = s === me;
        const shown = arr.slice(-3);
        const style = mine ? { left: p.x - avSize / 2 - 4, top: p.y - avSize / 2 - 22 } : { left: p.x - avSize / 2 - 20, top: p.y + avSize / 2 - 22 };
        return (
          <div key={s} className={`seatgifts ${mine ? 'mine' : ''}`} style={style}>
            <AnimatePresence initial={false}>
              {shown.map((x, i) => (
                <motion.span key={x.id} className="sgift" style={{ zIndex: i, animationDelay: `${i * 0.4}s` }}
                  initial={{ scale: 0, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }}>
                  <GiftArt id={x.id} size={22} />
                  {x.count > 1 && <b>{x.count}</b>}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        );
      })}
    </>
  );
}
