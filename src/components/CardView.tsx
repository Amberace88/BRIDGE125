import { animate, motion, useMotionValue, useReducedMotion, useTransform, type AnimationPlaybackControls } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { type Card, SUIT_GLYPH } from '../engine/engine';
import type { Lang } from '../i18n';

export { CardFace } from './CardFace';
import { CardFace } from './CardFace';

/** Where a card rests. x/y are the card centre in stage pixels; rx tilts it back into the table plane. */
export interface Pose { x: number; y: number; rot: number; scale: number; z: number; up: boolean; rx?: number }

/**
 * A choreographed move. The card re-runs it whenever `key` changes.
 * Times are seconds from the moment the flight is handed to the card.
 */
export interface Flight {
  key: string;
  from?: Pose;          // jump here first (e.g. the deck), then fly
  delay?: number;       // take-off
  dur?: number;         // time in the air
  via?: Pose;           // land here first …
  settleAt?: number;    // … then glide to the real pose at this time
  flipAt?: number;      // turn to pose.up at this time
  flourish?: boolean;   // showy turn-over on landing
  spin?: number;        // extra degrees of spin in the air
  instant?: boolean;    // skip the show: go straight to the pose
}

interface Props {
  card: Card; lang: Lang; pose: Pose; w: number; flight?: Flight;
  legal?: boolean; dim?: boolean; sel?: boolean; onTap?: () => void;
  /** Allow dragging (desktop + touch). `onDrop` gets the page point and returns true when the drop was accepted. */
  draggable?: boolean; onDrop?: (pt: { x: number; y: number }) => boolean; onDragMove?: (pt: { x: number; y: number } | null) => void;
  /** Another player's card back (their equipped design) instead of the viewer's own `--back`. */
  back?: { css: string; fx?: string };
}

const EASE_FLY = [0.32, 0.06, 0.24, 1] as const;
const norm = (r: number) => ((((r + 180) % 360) + 360) % 360) - 180;

export function CardView({ card, lang, pose, w, flight, legal, dim, sel, onTap, draggable, onDrop, onDragMove, back }: Props) {
  const h = Math.round(w * 1.43);
  const reduce = useReducedMotion();
  const start = flight?.from ?? pose;

  const x = useMotionValue(start.x - w / 2);
  const y = useMotionValue(start.y - h / 2);
  const rot = useMotionValue(start.rot);
  const sc = useMotionValue(start.scale);
  const rx = useMotionValue(start.rx ?? 0);
  const flip = useMotionValue(start.up ? 0 : 180);
  const hop = useMotionValue(0);
  const squash = useMotionValue(1);
  const z = useMotionValue(start.z);
  const arc = useRef(60);

  const hopY = useTransform(hop, v => -v * arc.current);
  const hopS = useTransform([hop, squash], ([a, b]: number[]) => (1 + a * 0.2) * b);
  const shX = useTransform(hop, v => v * 10);
  const shY = useTransform(hop, v => 3 + v * 30);
  const shO = useTransform(hop, v => 0.5 - v * 0.28);
  const shS = useTransform(hop, v => 0.97 + v * 0.12);

  const anims = useRef<AnimationPlaybackControls[]>([]);
  const timers = useRef<number[]>([]);
  const dragging = useRef(false);
  const poseRef = useRef(pose); poseRef.current = pose;
  const lastKey = useRef<string | undefined>(undefined);
  const lastSig = useRef('');
  const first = useRef(true);
  const busyUntil = useRef(0); // a choreography owns the card until then; pose changes queue behind it

  const run = (a: AnimationPlaybackControls) => { anims.current.push(a); };
  const later = (sec: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, Math.max(0, sec * 1000))); };
  const stopAll = () => {
    anims.current.forEach(a => a.stop()); anims.current = [];
    timers.current.forEach(t => clearTimeout(t)); timers.current = [];
  };
  useEffect(() => () => stopAll(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const jump = (p: Pose) => {
    x.set(p.x - w / 2); y.set(p.y - h / 2); rot.set(p.rot); sc.set(p.scale); rx.set(p.rx ?? 0);
    flip.set(p.up ? 0 : 180); hop.set(0); squash.set(1); z.set(p.z);
  };

  const turn = (up: boolean, at: number, dur = 0.5) => {
    const target = up ? 0 : 180;
    if (flip.get() === target) return;
    later(at, () => run(animate(flip, target, { duration: dur, ease: [0.2, 0.7, 0.2, 1] })));
  };

  const settle = (p: Pose, at = 0) => {
    later(at, () => {
      const sp = { type: 'spring' as const, stiffness: 300, damping: 29, mass: 0.9 };
      rot.set(norm(rot.get()));
      run(animate(x, p.x - w / 2, sp)); run(animate(y, p.y - h / 2, sp));
      run(animate(rot, p.rot, sp)); run(animate(sc, p.scale, sp)); run(animate(rx, p.rx ?? 0, sp));
      if (hop.get() !== 0) run(animate(hop, 0, { duration: 0.2 }));
      z.set(p.z);
    });
  };

  const fly = (p: Pose, o: { delay: number; dur: number; arcH: number; spin?: number; land?: boolean }) => {
    const { delay, dur } = o;
    later(delay, () => {
      rot.set(norm(rot.get()));
      arc.current = o.arcH;
      z.set(400);
      const tx = p.x - w / 2, ty = p.y - h / 2;
      const r0 = rot.get();
      const rEnd = p.rot + (o.spin ?? 0);
      const over = (rEnd - r0 >= 0 ? 1 : -1) * 4;
      const t = { duration: dur, ease: EASE_FLY };
      run(animate(x, tx, t));
      run(animate(y, ty, t));
      run(animate(sc, p.scale, t));
      run(animate(hop, [0, 1, 0], { duration: dur, times: [0, 0.42, 1], ease: ['easeOut', 'easeIn'] }));
      run(animate(rot, [r0, rEnd + over, rEnd], { duration: dur + 0.16, times: [0, 0.82, 1], ease: ['easeOut', 'easeInOut'] }));
      const rxEnd = p.rx ?? 0;
      run(animate(rx, [rx.get(), Math.min(rx.get(), rxEnd) - 16, rxEnd], { duration: dur, times: [0, 0.5, 1] }));
      if (o.land !== false) run(animate(squash, [1, 0.93, 1.035, 1], { delay: dur - 0.02, duration: 0.34, times: [0, 0.3, 0.7, 1] }));
      later(dur, () => { z.set(poseRef.current.z); rot.set(norm(rot.get())); });
    });
  };

  useLayoutEffect(() => {
    const isFirst = first.current; first.current = false;
    const key = flight?.key;
    const newFlight = !!key && key !== lastKey.current;
    lastKey.current = key;
    const sig = `${pose.x}|${pose.y}|${pose.rot}|${pose.scale}|${pose.up}|${pose.rx ?? 0}|${w}`;
    const poseChanged = sig !== lastSig.current;
    lastSig.current = sig;
    if (dragging.current) return;
    const now = performance.now();
    const busy = now < busyUntil.current;
    if (!newFlight && !poseChanged) { if (!busy && z.get() !== pose.z) z.set(pose.z); return; }
    if (!newFlight && isFirst) return; // mounted straight into place
    if (!newFlight && busy) {
      // mid-choreography (e.g. the deal, or a card in the air): glide to the new spot once it lands
      later((busyUntil.current - now) / 1000 + 0.02, () => { const p = poseRef.current; settle(p); turn(p.up, 0, 0.45); });
      return;
    }

    stopAll();
    if (reduce) {
      // reduced motion: short cross-fades in place of flights
      jump(pose);
      return;
    }

    if (newFlight && flight) {
      if (flight.instant) {
        const q = { duration: 0.24, ease: 'easeOut' as const };
        rot.set(norm(rot.get()));
        run(animate(x, pose.x - w / 2, q)); run(animate(y, pose.y - h / 2, q)); run(animate(rot, pose.rot, q));
        run(animate(sc, pose.scale, q)); run(animate(rx, pose.rx ?? 0, q)); run(animate(hop, 0, q)); squash.set(1);
        run(animate(flip, pose.up ? 0 : 180, { duration: 0.3 }));
        z.set(pose.z);
        busyUntil.current = now + 320;
        return;
      }
      if (flight.from && !isFirst) jump(flight.from);
      const target = flight.via ?? pose;
      const dist = Math.hypot(target.x - w / 2 - x.get(), target.y - h / 2 - y.get());
      const dur = flight.dur ?? Math.min(0.72, Math.max(0.44, 0.36 + dist / 2400));
      const delay = flight.delay ?? 0;
      busyUntil.current = now + 1000 * Math.max(delay + dur + 0.36, (flight.settleAt ?? 0) + 0.45, (flight.flipAt ?? 0) + (flight.flourish ? 0.9 : 0.5));
      fly(target, { delay, dur, arcH: Math.min(150, Math.max(36, 26 + dist * 0.22)), spin: flight.spin });
      if (flight.via) settle(pose, flight.settleAt ?? delay + dur + 0.1);
      if (flight.flipAt != null) {
        turn(pose.up, flight.flipAt, flight.flourish ? 0.62 : 0.48);
        if (flight.flourish) {
          later(flight.flipAt, () => {
            arc.current = 46;
            run(animate(hop, [0, 0.8, 0], { duration: 0.62, times: [0, 0.45, 1], ease: ['easeOut', 'easeIn'] }));
            run(animate(squash, [1, 1, 0.94, 1.03, 1], { duration: 0.85, times: [0, 0.7, 0.8, 0.9, 1] }));
          });
        }
      } else if (!flight.via) {
        turn(pose.up, delay + dur * 0.3, dur * 0.6);
      }
      return;
    }

    const dist = Math.hypot(pose.x - w / 2 - x.get(), pose.y - h / 2 - y.get());
    if (dist > w * 0.9) {
      const dur = Math.min(0.7, Math.max(0.42, 0.34 + dist / 2400));
      busyUntil.current = now + 1000 * (dur + 0.3);
      fly(pose, { delay: 0, dur, arcH: Math.min(150, Math.max(36, 26 + dist * 0.22)) });
      turn(pose.up, dur * 0.28, dur * 0.6);
    } else {
      settle(pose);
      turn(pose.up, 0, 0.45);
    }
  });

  const tappable = !!onTap;
  const onKey = (e: KeyboardEvent) => { if (onTap && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onTap(); } };

  return (
    <motion.div
      className={`card ${legal ? 'legal' : ''} ${dim ? 'dim' : ''} ${sel ? 'sel' : ''} ${tappable ? 'can' : ''}`}
      style={{ x, y, rotate: rot, scale: sc, zIndex: z, width: w, height: h, ['--cw' as string]: `${w}px`, pointerEvents: tappable || draggable ? 'auto' : 'none', ...(back ? { ['--back' as string]: back.css } : {}) }}
      data-backfx={back ? back.fx ?? 'none' : undefined}
      onTap={onTap}
      drag={!!draggable}
      dragMomentum={false}
      onDragStart={() => {
        dragging.current = true; busyUntil.current = 0; stopAll(); z.set(600); arc.current = 26;
        run(animate(hop, 0.55, { duration: 0.16 }));
      }}
      onDrag={(_, info) => onDragMove?.(info.point)}
      onDragEnd={(_, info) => {
        dragging.current = false; onDragMove?.(null);
        const ok = onDrop?.(info.point) ?? false;
        run(animate(hop, 0, { duration: 0.22 }));
        if (!ok) settle(poseRef.current);
        else lastSig.current = '';
      }}
      role={tappable ? 'button' : undefined}
      tabIndex={tappable ? 0 : undefined}
      onKeyDown={tappable ? onKey : undefined}
      aria-label={tappable ? `${card.r}${SUIT_GLYPH[card.s]}` : undefined}
    >
      <motion.div className="cshadow" style={{ x: shX, y: shY, opacity: shO, scale: shS }} />
      <motion.div className="hop" style={{ y: hopY, scale: hopS, rotateX: rx, transformPerspective: 820 }}>
        <div className="lift">
          <motion.div className="flip" style={{ rotateY: flip, transition: 'none' }}>
            <CardFace card={card} lang={lang} />
            <div className="bk" />
          </motion.div>
          <div className="glow" />
        </div>
      </motion.div>
    </motion.div>
  );
}
