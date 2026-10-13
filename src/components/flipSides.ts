import { useTransform, type MotionValue } from 'motion/react';

/** Is the back of a card turned to the viewer at this rotateY angle (degrees)? */
export const backShown = (deg: number) => { const a = ((deg % 360) + 360) % 360; return a > 90 && a < 270; };

/**
 * iOS Safari ignores `backface-visibility: hidden` as soon as a 3D parent gets flattened (opacity, filter, overflow…
 * on a flying card), and the face then shows through the back. Drive each side's visibility from the angle instead.
 */
export function useFlipSides(flip: MotionValue<number>) {
  const face = useTransform(flip, v => (backShown(v) ? 'hidden' : 'visible'));
  const back = useTransform(flip, v => (backShown(v) ? 'visible' : 'hidden'));
  return { face, back };
}
