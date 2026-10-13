import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect } from 'react';

/** A number that counts to its new value (kept local so Zole does not pull Bridge's results screen into its chunk). */
export function CountUp({ from, value, delay = 0, duration = 0.9 }: { from?: number; value: number; delay?: number; duration?: number }) {
  const mv = useMotionValue(from ?? value);
  const txt = useTransform(mv, v => String(Math.round(v)));
  useEffect(() => { const c = animate(mv, value, { duration, delay, ease: 'easeOut' }); return () => c.stop(); }, [value, mv, duration, delay]);
  return <motion.span>{txt}</motion.span>;
}
