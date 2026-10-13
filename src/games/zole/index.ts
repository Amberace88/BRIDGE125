import { createElement, lazy } from 'react';
import type { GameModule } from '../types';
import { TAGLINES, TITLES } from './titles';

/**
 * Zolīte — the Latvian national card game (3 players, 26 cards, lielais vs two mazie).
 * Engine: ./engine.ts (pure, seeded, serializable) · bots: ./bot.ts · screen: ./ZoleScreen.tsx (lazy).
 */

/** Hub emblem: three fanned trump queens on brass, drawn inline. */
function Emblem({ size = 56 }: { size?: number }) {
  const card = (rot: number, suit: string, red: boolean, k: number) => createElement('g', { key: k, transform: `rotate(${rot} 32 54)` },
    createElement('rect', { x: 19, y: 10, width: 26, height: 37, rx: 3.6, fill: 'url(#zl-ivory)', stroke: '#8C6E28', strokeWidth: 1 }),
    createElement('text', { x: 23, y: 20, fontSize: 8.5, fontWeight: 700, fontFamily: 'Georgia, serif', fill: red ? '#9e1b32' : '#1b1c22' }, 'Q'),
    createElement('text', { x: 32, y: 37, fontSize: 13, textAnchor: 'middle', fill: red ? '#9e1b32' : '#1b1c22' }, suit),
  );
  return createElement('svg', { width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': true },
    createElement('defs', null,
      createElement('linearGradient', { id: 'zl-ivory', x1: 0, y1: 0, x2: 0, y2: 1 },
        createElement('stop', { offset: 0, stopColor: '#fffaf0' }), createElement('stop', { offset: 1, stopColor: '#e9dfc8' })),
      createElement('radialGradient', { id: 'zl-glow', cx: 0.5, cy: 0.6, r: 0.6 },
        createElement('stop', { offset: 0, stopColor: '#EBD38E', stopOpacity: 0.55 }), createElement('stop', { offset: 1, stopColor: '#EBD38E', stopOpacity: 0 })),
    ),
    createElement('circle', { cx: 32, cy: 36, r: 28, fill: 'url(#zl-glow)' }),
    card(-22, '♠', false, 0), card(22, '♥', true, 1), card(0, '♣', false, 2),
    createElement('path', { d: 'M24 6 L26 1.8 L29 4.6 L32 0.8 L35 4.6 L38 1.8 L40 6 Z', fill: '#EBD38E', stroke: '#8C6E28', strokeWidth: 0.6 }),
  );
}

export const zole: GameModule = {
  id: 'zole',
  kind: 'cards',
  players: { min: 3, max: 3 },
  title: TITLES,
  tagline: TAGLINES,
  Emblem,
  Screen: lazy(() => import('./ZoleScreen')),
  homeLangs: ['lv'],
};
