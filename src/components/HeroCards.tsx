import { motion, useMotionTemplate, useTransform, type MotionValue } from 'motion/react';
import { useState } from 'react';
import type { Card } from '../engine/engine';
import type { Lang } from '../i18n';
import { CardFace } from './CardView';

const FAN: { c: Card; x: number; r: number; y: number; z: number; spreadX: number; spreadR: number; d: number }[] = [
  { c: { id: 'AD', r: 'A', s: 'D' }, x: -1.05, r: -22, y: 0.16, z: -40, spreadX: -1.55, spreadR: -30, d: 0.1 },
  { c: { id: '10H', r: '10', s: 'H' }, x: -0.56, r: -11, y: 0.05, z: -10, spreadX: -0.82, spreadR: -15, d: 0.18 },
  { c: { id: 'JC', r: 'J', s: 'C' }, x: 0.56, r: 11, y: 0.05, z: -10, spreadX: 0.82, spreadR: 15, d: 0.26 },
  { c: { id: '6S', r: '6', s: 'S' }, x: 1.05, r: 22, y: 0.16, z: -40, spreadX: 1.55, spreadR: 30, d: 0.34 },
  { c: { id: 'QS', r: 'Q', s: 'S' }, x: 0, r: 0, y: -0.04, z: 60, spreadX: 0, spreadR: 0, d: 0.44 },
];

interface Props { cw: number; lang: Lang; mx: MotionValue<number>; my: MotionValue<number>; spread: boolean }

/** 3D fan of cards that tilts toward the pointer, with a moving glare and depth parallax. */
export function HeroCards({ cw, lang, mx, my, spread }: Props) {
  const ch = cw * 1.43;
  const rotY = useTransform(mx, [-1, 1], [-20, 20]);
  const rotX = useTransform(my, [-1, 1], [16, -16]);
  const gx = useTransform(mx, [-1, 1], [15, 85]);
  const gy = useTransform(my, [-1, 1], [10, 90]);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,.55), rgba(255,255,255,0) 48%)`;
  const shX = useTransform(mx, [-1, 1], [30, -30]);
  const shY = useTransform(my, [-1, 1], [40, 10]);
  const [flipped, setFlipped] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', height: ch * 1.5, perspective: 1100 }}>
      {/* floor shadow */}
      <motion.div aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', width: cw * 3.4, height: cw * 0.7, marginLeft: -cw * 1.7, marginTop: ch * 0.48, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,.55), rgba(0,0,0,0))', x: shX, y: shY, filter: 'blur(6px)' }} />
      <motion.div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', rotateX: rotX, rotateY: rotY }}>
        {FAN.map(({ c, x, r, y, z, spreadX, spreadR, d }) => {
          const isQ = c.id === 'QS';
          return (
            <motion.div key={c.id} className="card" style={{ width: cw, height: ch, left: '50%', top: '50%', marginLeft: -cw / 2, marginTop: -ch / 2, ['--cw' as string]: `${cw}px`, transformStyle: 'preserve-3d', cursor: isQ ? 'pointer' : 'default' }}
              initial={{ y: ch * 1.2, opacity: 0, rotate: 0, x: 0, z: 0 }}
              animate={{ x: (spread ? spreadX : x) * cw, y: y * ch + (spread && !isQ ? ch * 0.04 : 0), rotate: spread ? spreadR : r, opacity: 1, z: spread && isQ ? z + 40 : z }}
              transition={{ delay: spread ? 0 : d, type: 'spring', stiffness: spread ? 220 : 110, damping: spread ? 20 : 15 }}
              onClick={isQ ? () => setFlipped(f => !f) : undefined}>
              <motion.div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}
                animate={isQ ? { rotateY: flipped ? 180 : 0, y: [0, -8, 0] } : {}}
                transition={isQ ? { rotateY: { type: 'spring', stiffness: 140, damping: 16 }, y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.4 } } : {}}>
                <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                  <CardFace card={c} lang={lang} />
                  <motion.div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '9%/6.3%', background: glare, mixBlendMode: 'soft-light', pointerEvents: 'none' }} />
                  {isQ && <div aria-hidden className="foil" />}
                </div>
                <div className="bk" style={{ transform: 'rotateY(180deg)' }} />
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
