import { motion } from 'motion/react';
import { memo } from 'react';
import { type Card, SUIT_GLYPH, isQS, isRed } from '../engine/engine';
import { rankLabel, type Lang } from '../i18n';

const Crown = () => (
  <svg viewBox="0 0 34 18" aria-hidden="true"><path d="M2 16 L4 4 L11 10 L17 2 L23 10 L30 4 L32 16 Z" fill="currentColor" /><rect x="2" y="15" width="30" height="3" rx="1" fill="currentColor" /></svg>
);

export const CardFace = memo(function CardFace({ card, lang }: { card: Card; lang: Lang }) {
  const g = SUIT_GLYPH[card.s];
  const lab = rankLabel(card.r, lang);
  const court = card.r === 'J' || card.r === 'Q' || card.r === 'K';
  return (
    <div className={`face ${isRed(card.s) ? 'red' : ''} ${isQS(card) ? 'qs' : ''}`}>
      <div className="ix"><span className="rk">{lab}</span><span className="st">{g}</span></div>
      <div className="ix b"><span className="rk">{lab}</span><span className="st">{g}</span></div>
      {court ? (
        <div className="court"><Crown /><span className="mono">{lab}</span><span className="s2">{g}</span></div>
      ) : (
        <div className={`ctr ${card.r === 'A' ? 'ace' : ''}`}>{g}</div>
      )}
    </div>
  );
});

export interface Pose { x: number; y: number; rot: number; scale: number; z: number; up: boolean }

interface Props {
  card: Card; lang: Lang; pose: Pose; w: number; from?: Pose;
  legal?: boolean; dim?: boolean; sel?: boolean; onTap?: () => void;
}

export function CardView({ card, lang, pose, w, from, legal, dim, sel, onTap }: Props) {
  const h = Math.round(w * 1.43);
  return (
    <motion.div
      className={`card ${pose.up ? '' : 'down'} ${legal ? 'legal' : ''} ${dim ? 'dim' : ''} ${sel ? 'sel' : ''}`}
      style={{ width: w, height: h, zIndex: pose.z, ['--cw' as string]: `${w}px`, cursor: onTap ? 'pointer' : 'default', touchAction: 'manipulation' }}
      initial={from ? { x: from.x - w / 2, y: from.y - h / 2, rotate: from.rot, scale: from.scale } : false}
      animate={{ x: pose.x - w / 2, y: pose.y - h / 2 - (sel ? 22 : legal ? 10 : 0), rotate: pose.rot, scale: pose.scale }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.9 }}
      whileTap={onTap ? { scale: pose.scale * 0.96 } : undefined}
      onClick={onTap}
      role={onTap ? 'button' : undefined}
      aria-label={onTap ? `${card.r}${SUIT_GLYPH[card.s]}` : undefined}
    >
      <div className="flip">
        <CardFace card={card} lang={lang} />
        <div className="bk" />
      </div>
      <div className="glow" />
    </motion.div>
  );
}
