import { useAnimationFrame, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { useEffect, useRef } from 'react';

/**
 * Pointer / device-tilt parallax in −1..1 (springs), with a slow idle drift when nothing moves —
 * the same feel as the home screen's hero.
 */
export function useParallax(strength = 1) {
  const reduce = useReducedMotion();
  const rawX = useMotionValue(0), rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 70, damping: 18, mass: 0.7 });
  const my = useSpring(rawY, { stiffness: 70, damping: 18, mass: 0.7 });
  const last = useRef(0);
  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      last.current = performance.now();
      rawX.set(((e.clientX / window.innerWidth) * 2 - 1) * strength);
      rawY.set(((e.clientY / window.innerHeight) * 2 - 1) * strength);
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      last.current = performance.now();
      rawX.set(Math.max(-1, Math.min(1, e.gamma / 25)) * strength);
      rawY.set(Math.max(-1, Math.min(1, (e.beta - 45) / 25)) * strength);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('deviceorientation', onOrient);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('deviceorientation', onOrient); };
  }, [rawX, rawY, strength, reduce]);
  useAnimationFrame(time => {
    if (reduce || performance.now() - last.current < 2500) return;
    rawX.set(Math.sin(time / 3100) * 0.4 * strength);
    rawY.set(Math.cos(time / 3900) * 0.28 * strength);
  });
  return { mx, my };
}
