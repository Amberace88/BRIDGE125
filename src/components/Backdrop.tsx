import { motion, useTransform, type MotionValue } from 'motion/react';
import { useMemo } from 'react';

const GLYPHS = ['♠', '♥', '♣', '♦'];

/** Slowly drifting suit symbols in three depth layers that parallax with the pointer. */
export function Backdrop({ mx, my }: { mx: MotionValue<number>; my: MotionValue<number> }) {
  const items = useMemo(() => Array.from({ length: 26 }, (_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const r = (k: number) => ((seed * (k + 1) * 7919) % 1000) / 1000;
    return { g: GLYPHS[i % 4], left: r(1) * 100, top: r(2) * 100, size: 14 + r(3) * 34, layer: i % 3, dur: 18 + r(4) * 22, delay: -r(5) * 30, rot: r(6) * 60 - 30 };
  }), []);
  const l0x = useTransform(mx, v => v * -10), l0y = useTransform(my, v => v * -8);
  const l1x = useTransform(mx, v => v * -22), l1y = useTransform(my, v => v * -16);
  const l2x = useTransform(mx, v => v * -40), l2y = useTransform(my, v => v * -28);
  const layers = [[l0x, l0y], [l1x, l1y], [l2x, l2y]] as const;
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {layers.map(([x, y], li) => (
        <motion.div key={li} style={{ position: 'absolute', inset: '-60px', x, y }}>
          {items.filter(it => it.layer === li).map((it, k) => (
            <span key={k} className="drift" style={{
              left: `${it.left}%`, top: `${it.top}%`, fontSize: it.size * (0.7 + li * 0.25),
              opacity: 0.05 + li * 0.035, animationDuration: `${it.dur}s`, animationDelay: `${it.delay}s`,
              color: it.g === '♥' || it.g === '♦' ? '#ff8a9a' : 'var(--acc-hi)', ['--rot' as string]: `${it.rot}deg`,
            }}>{it.g}</span>
          ))}
        </motion.div>
      ))}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 30%, transparent 40%, rgba(0,0,0,.45) 100%)' }} />
    </div>
  );
}
