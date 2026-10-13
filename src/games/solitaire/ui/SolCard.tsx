import { animate, motion, useMotionValue, useTransform, type AnimationPlaybackControls, type MotionValue } from 'motion/react';
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { CardFace, type FaceCard } from '../../../components/CardFace';
import type { Lang } from '../../../i18n';
import { rankText, SUIT_GLYPH, type SCard } from '../engine/cards';
import type { Pose } from './layout';

/** What the board drives directly (drag follows the pointer without re-rendering React). */
export interface CardHandle {
  x: MotionValue<number>;
  y: MotionValue<number>;
  z: MotionValue<number>;
  lift: MotionValue<number>;
  tilt: MotionValue<number>;
  pose: Pose;
  dragging: boolean;
  /** the next pose change comes from a drop: snap in instead of flying */
  dropped: boolean;
  /** spring back to the rest pose (invalid drop) */
  settle: () => void;
  stop: () => void;
}
export type Registry = Map<number, CardHandle>;

interface Props {
  card: SCard;
  pose: Pose;
  cw: number;
  ch: number;
  lang: Lang;
  reg: Registry;
  /** dealt in from here, after `delay` seconds */
  enter?: { x: number; y: number; delay: number };
  glow?: boolean;
  /** changes → a small "no" shake */
  shake?: number;
  reduce?: boolean;
}

const FLY = { type: 'spring' as const, stiffness: 380, damping: 33, mass: 0.85 };
const SNAP = { type: 'spring' as const, stiffness: 640, damping: 40, mass: 0.7 };
const EASE_SLIDE = [0.2, 0.7, 0.25, 1] as const;

export const SolCard = memo(function SolCard({ card, pose, cw, ch, lang, reg, enter, glow, shake, reduce }: Props) {
  const x = useMotionValue(enter ? enter.x : pose.x);
  const y = useMotionValue(enter ? enter.y : pose.y);
  const z = useMotionValue(pose.z);
  const flip = useMotionValue(enter || !pose.up ? 180 : 0);
  const lift = useMotionValue(0);
  const tilt = useMotionValue(0);
  const sx = useMotionValue(0);
  const scale = useTransform(lift, v => 1 + v * 0.075);
  const shO = useTransform(lift, v => v * 0.75);
  const shY = useTransform(lift, v => 2 + v * 14);
  const shS = useTransform(lift, v => 0.96 + v * 0.1);

  const anims = useRef<AnimationPlaybackControls[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const run = (a: AnimationPlaybackControls) => { anims.current.push(a); return a; };
  const stop = () => {
    anims.current.forEach(a => a.stop()); anims.current = [];
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };

  const handle = useRef<CardHandle>(null as unknown as CardHandle);
  if (!handle.current) {
    handle.current = {
      x, y, z, lift, tilt, pose, dragging: false, dropped: false,
      settle: () => {
        const p = handle.current.pose;
        stop();
        run(animate(x, p.x, SNAP)); run(animate(y, p.y, SNAP));
        run(animate(lift, 0, { duration: 0.25 })); run(animate(tilt, 0, SNAP));
        timer.current = setTimeout(() => z.set(handle.current.pose.z), 260);
      },
      stop,
    };
  }

  useEffect(() => {
    reg.set(card.id, handle.current);
    return () => { if (reg.get(card.id) === handle.current) reg.delete(card.id); stop(); };
  }, [card.id, reg]); // eslint-disable-line react-hooks/exhaustive-deps

  const first = useRef(true);
  useLayoutEffect(() => {
    const h = handle.current;
    const prev = h.pose;
    h.pose = pose;
    const isFirst = first.current; first.current = false;
    if (h.dragging) return;
    const turn = (up: boolean, delay = 0, dur = 0.42) => {
      const target = up ? 0 : 180;
      if (flip.get() === target) return;
      run(animate(flip, target, { duration: dur, delay, ease: [0.2, 0.7, 0.2, 1] }));
    };
    if (reduce) { stop(); x.set(pose.x); y.set(pose.y); z.set(pose.z); flip.set(pose.up ? 0 : 180); lift.set(0); tilt.set(0); return; }

    if (isFirst) {
      if (!enter) return;
      // the deal: a low glide from the stock, a breath of lift, then the turn-over
      const d = enter.delay;
      z.set(300 + pose.z);
      const t = { duration: 0.42, delay: d, ease: EASE_SLIDE };
      run(animate(x, pose.x, t)); run(animate(y, pose.y, t));
      run(animate(lift, [0, 0.45, 0], { duration: 0.42, delay: d, times: [0, 0.35, 1] }));
      if (pose.up) turn(true, d + 0.34, 0.4);
      timer.current = setTimeout(() => z.set(handle.current.pose.z), (d + 0.44) * 1000);
      return;
    }

    const moved = Math.abs(prev.x - pose.x) > 0.5 || Math.abs(prev.y - pose.y) > 0.5 || Math.abs(x.get() - pose.x) > 0.5 || Math.abs(y.get() - pose.y) > 0.5;
    if (!moved) {
      z.set(pose.z);
      if (prev.up !== pose.up) turn(pose.up, 0.02);
      return;
    }
    stop();
    if (h.dropped) {
      h.dropped = false;
      run(animate(x, pose.x, SNAP)); run(animate(y, pose.y, SNAP));
      run(animate(lift, 0, { type: 'spring', stiffness: 500, damping: 30 })); run(animate(tilt, 0, SNAP));
      turn(pose.up);
      timer.current = setTimeout(() => z.set(handle.current.pose.z), 240);
      return;
    }
    const dist = Math.hypot(x.get() - pose.x, y.get() - pose.y);
    const far = dist > cw * 0.7;
    z.set(far ? 500 + pose.z : Math.max(pose.z, z.get()));
    run(animate(x, pose.x, FLY)); run(animate(y, pose.y, FLY));
    if (far) run(animate(lift, [lift.get(), 0.85, 0], { duration: Math.min(0.55, 0.3 + dist / 2400), times: [0, 0.38, 1], ease: ['easeOut', 'easeIn'] }));
    else run(animate(lift, 0, { duration: 0.2 }));
    run(animate(tilt, 0, FLY));
    turn(pose.up, far ? 0.08 : 0);
    timer.current = setTimeout(() => z.set(handle.current.pose.z), far ? 420 : 200);
  }, [pose.x, pose.y, pose.z, pose.up, cw]); // eslint-disable-line react-hooks/exhaustive-deps

  const shook = useRef(shake);
  useEffect(() => {
    if (shake === shook.current) return;
    shook.current = shake;
    run(animate(sx, [0, -6, 6, -4, 4, -1.5, 0], { duration: 0.42 }));
  }, [shake]); // eslint-disable-line react-hooks/exhaustive-deps

  const face = useMemo<FaceCard>(() => ({ r: rankText(card.r), s: card.s }), [card.r, card.s]);

  return (
    <motion.div className={`sc ${glow ? 'hint' : ''}`} data-cid={card.id}
      style={{ x, y, zIndex: z, width: cw, height: ch, ['--cw' as string]: `${cw}px` }}
      aria-label={pose.up ? `${rankText(card.r)}${SUIT_GLYPH[card.s]}` : undefined}>
      <motion.div className="sc-sh" style={{ opacity: shO, y: shY, scale: shS }} />
      <motion.div className="sc-body" style={{ x: sx, scale, rotate: tilt }}>
        <motion.div className="sc-flip" style={{ rotateY: flip, transformPerspective: 900 }}>
          <CardFace card={face} lang={lang} />
          <div className="bk" />
        </motion.div>
        <div className="sc-glow" />
      </motion.div>
    </motion.div>
  );
});
