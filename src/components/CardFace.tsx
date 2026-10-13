import { memo } from 'react';
import type { Card, Suit } from '../engine/engine';
import { rankLabel, type Lang } from '../i18n';

// same as the engine's helpers — inlined so Home's hero / intro cards don't pull the whole rules engine into the first paint
const SUIT_GLYPH: Record<Suit, string> = { S: '♠', C: '♣', H: '♥', D: '♦' };
const isRed = (s: Suit) => s === 'H' || s === 'D';
const isQS = (c: Card) => c.r === 'Q' && c.s === 'S';

/** The printed face of a card (static markup). Separate from CardView so Home's hero / intro don't load the table card. */
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

