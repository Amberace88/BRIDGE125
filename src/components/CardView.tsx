import { animate, motion, useMotionValue, useReducedMotion, useTransform, type AnimationPlaybackControls } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { type Card, SUIT_GLYPH } from '../engine/engine';
import type { Lang } from '../i18n';

export { CardFace } from './CardFace';
import { CardFace } from './CardFace';
import { after } from './stageClock';

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
  /**
   * The dealer's slide (the deal): a straight, eased glide low over the felt — no arc, no spin — with a small
   * shadow lift in the air and a soft landing. `via` / `settleAt` / `flipAt` then turn it over and fan it in.
   */
  glide?: boolean;
  lift?: number;        // glide: px the card rises off the felt mid-slide
  settleDur?: number;   // glide + via: time to slide from `via` into the real pose
  flipDur?: number;     // glide: length of the turn-over at `flipAt`
  flipLift?: number;    // glide: px the card rises while it turns over (a crisp "pick up and turn")
}

interface Props {
  card: Card; lang: Lang; pose: Pose; w: number; flight?: Flight;
  legal?: boolean; dim?: boolean; sel?: boolean; onTap?: () => void;
  /** Allow dragging (desktop + touch). `onDrop` gets the page point and returns true when the drop was accepted. */
  draggable?: boolean; onDrop?: (pt: { x: number; y: number }) => boolean; onDragMove?: (pt: { x: number; y: number } | null) => void;
  /** Another player's card back (their equipped design) instead of the viewer's own `--back`. */
  back?: { css: string; fx?: string };
  /** Animation time multiplier for ordinary moves (fast mode < 1). The deal brings its own timing. */
  tempo?: number;
}

const EASE_FLY = [0.32, 0.06, 0.24, 1] as const;
/** The dealer's release: quick off the deck, a long soft deceleration onto the seat. */
const EASE_SLIDE = [0.2, 0.7, 0.25, 1] as const;
/** Turn-over: crisp through the edge, eased onto the face. */
const EASE_TURN = [0.45, 0.05, 0.2, 1] as const;
/** Hop styles: a played card's arc (grows, throws a long shadow) vs the dealer's slide (barely leaves the felt). */
const SHOWY = { s: 0.2, sx: 10, sy: 30, so: 0.28 };
const SUBTLE = { s: 0.05, sx: 4, sy: 14, so: 0.18 };
const norm = (r: number) => ((((r + 180) % 360) + 360) % 360) - 180;

export function CardView({ card, lang, pose, w, flight, legal, dim, sel, onTap, draggable, onDrop, onDragMove, back, tempo = 1 }: Props) {
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
  /** how much the hop grows the card and throws its shadow (a flight is showy; the dealer's slide is subtle) */
  const lk = useRef(SHOWY);

  const hopY = useTransform(hop, v => -v * arc.current);
  const hopS = useTransform([hop, squash], ([a, b]: number[]) => (1 + a * lk.current.s) * b);
  const shX = useTransform(hop, v => v * lk.current.sx);
  const shY = useTransform(hop, v => 3 + v * lk.current.sy);
  const shO = useTransform(hop, v => 0.5 - v * lk.current.so);
  const shS = useTransform(hop, v => 0.97 + v * 0.12);

  const anims = useRef<AnimationPlaybackControls[]>([]);
  const timers = useRef<(() => void)[]>([]);
  const dragging = useRef(false);
  const poseRef = useRef(pose); poseRef.current = pose;
  const lastKey = useRef<string | undefined>(undefined);
  const lastSig = useRef('');
  const first = useRef(true);
  const busyUntil = useRef(0); // a choreography owns the card until then; pose changes queue behind it

  const run = (a: AnimationPlaybackControls) => { anims.current.push(a); };
  const later = (sec: number, fn: () => void) => { timers.current.push(after(Math.max(0, sec * 1000), fn)); };
  const stopAll = () => {
    anims.current.forEach(a => a.stop()); anims.current = [];
    timers.current.forEach(cancel => cancel()); timers.current = [];
  };
  useEffect(() => () => stopAll(), []); // eslint-disable-line react-hooks/exhaustive-deps
  // a dealt card leaves the dealer's deck in the deck's back; the seat's own design shows once it lands there
  const [dealtIn, setDealtIn] = useState(true);
  const seatBack = dealtIn ? back : undefined;

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
      arc.current = o.arcH; lk.current = SHOWY;
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

  /** The dealer's slide: straight and low, rotation easing onto the seat angle, a breath of lift, a soft landing. */
  const glide = (p: Pose, o: { delay: number; dur: number; lift: number }) => {
    later(o.delay, () => {
      rot.set(norm(rot.get()));
      arc.current = o.lift; lk.current = SUBTLE;
      z.set(400);
      const t = { duration: o.dur, ease: EASE_SLIDE };
      run(animate(x, p.x - w / 2, t));
      run(animate(y, p.y - h / 2, t));
      run(animate(sc, p.scale, t));
      run(animate(rx, p.rx ?? 0, t));
      // a small, consistent turn that settles onto the seat's angle (never a spin)
      const r0 = rot.get(), r1 = r0 + norm(p.rot - r0);
      run(animate(rot, [r0, r0 + (r1 - r0) * 1.1, r1], { duration: o.dur, times: [0, 0.75, 1], ease: [EASE_SLIDE, 'easeInOut'] }));
      if (o.lift > 0) run(animate(hop, [0, 1, 0], { duration: o.dur, times: [0, 0.32, 1], ease: ['easeOut', [0.4, 0, 0.3, 1]] }));
      run(animate(squash, [1, 0.985, 1], { delay: o.dur - 0.04, duration: 0.2, times: [0, 0.4, 1] }));
      later(o.dur, () => { z.set(poseRef.current.z); rot.set(norm(rot.get())); });
    });
  };
  /** Slide (no lift) from wherever the card is into `p`, as a tween — the fan-in after the deal. */
  const slideTo = (p: Pose, at: number, dur: number) => {
    later(at, () => {
      const t = { duration: dur, ease: EASE_SLIDE };
      rot.set(norm(rot.get()));
      run(animate(x, p.x - w / 2, t)); run(animate(y, p.y - h / 2, t));
      run(animate(rot, p.rot, t)); run(animate(sc, p.scale, t)); run(animate(rx, p.rx ?? 0, t));
      z.set(p.z);
    });
  };
  /** Turn over while rising a little off the felt, then set it down. */
  const liftTurn = (up: boolean, at: number, dur: number, liftPx: number) => {
    const target = up ? 0 : 180;
    later(at, () => {
      if (flip.get() !== target) run(animate(flip, target, { duration: dur, ease: EASE_TURN }));
      if (liftPx > 0) {
        arc.current = liftPx; lk.current = SUBTLE;
        run(animate(hop, [0, 1, 0], { duration: dur * 1.1, times: [0, 0.45, 1], ease: ['easeOut', 'easeInOut'] }));
      }
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
    if (!dealtIn && !(newFlight && flight?.glide && flight.from && back)) setDealtIn(true);
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
      if (flight.glide) {
        const delay = flight.delay ?? 0;
        const dur = flight.dur ?? 0.4;
        const settleAt = flight.settleAt ?? delay + dur;
        const settleDur = flight.settleDur ?? 0.4;
        const flipDur = flight.flipDur ?? 0.42;
        busyUntil.current = now + 1000 * Math.max(delay + dur + 0.22, flight.via ? settleAt + settleDur + 0.04 : 0, flight.flipAt != null ? flight.flipAt + flipDur * 1.1 + 0.04 : 0);
        glide(target, { delay, dur, lift: flight.lift ?? 0 });
        if (back && flight.from) { setDealtIn(false); later(delay + dur * 0.9, () => setDealtIn(true)); }
        if (flight.via) slideTo(pose, settleAt, settleDur);
        if (flight.flipAt != null) liftTurn(pose.up, flight.flipAt, flipDur, flight.flipLift ?? 0);
        else if (!flight.via) turn(pose.up, delay + dur * 0.3, dur * 0.6);
        return;
      }
      const dist = Math.hypot(target.x - w / 2 - x.get(), target.y - h / 2 - y.get());
      const dur = flight.dur ?? Math.min(0.72, Math.max(0.44, 0.36 + dist / 2400)) * tempo;
      const delay = flight.delay ?? 0;
      busyUntil.current = now + 1000 * Math.max(delay + dur + 0.36, (flight.settleAt ?? 0) + 0.45, (flight.flipAt ?? 0) + (flight.flourish ? 0.9 : 0.5));
      fly(target, { delay, dur, arcH: Math.min(150, Math.max(36, 26 + dist * 0.22)), spin: flight.spin });
      if (flight.via) settle(pose, flight.settleAt ?? delay + dur + 0.1);
      if (flight.flipAt != null) {
        turn(pose.up, flight.flipAt, flight.flourish ? 0.62 : 0.48);
        if (flight.flourish) {
          later(flight.flipAt, () => {
            arc.current = 46; lk.current = SHOWY;
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
      const dur = Math.min(0.7, Math.max(0.42, 0.34 + dist / 2400)) * tempo;
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
      style={{ x, y, rotate: rot, scale: sc, zIndex: z, width: w, height: h, ['--cw' as string]: `${w}px`, pointerEvents: tappable || draggable ? 'auto' : 'none', ...(seatBack ? { ['--back' as string]: seatBack.css } : {}) }}
      data-backfx={seatBack ? seatBack.fx ?? 'none' : undefined}
      onTap={onTap}
      drag={!!draggable}
      dragMomentum={false}
      onDragStart={() => {
        dragging.current = true; busyUntil.current = 0; stopAll(); z.set(600); arc.current = 26; lk.current = SHOWY;
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
