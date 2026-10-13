import { createElement, lazy } from 'react';
import type { GameModule } from '../types';
import { TAGLINES, TITLES } from './titles';

/**
 * Тысяча / Thousand / Tūkstotis — 3 players, 24 cards, bidding, the talon, marriages, the race to 1000.
 * Engine: ./engine.ts (pure, seeded, serializable) · bots: ./bot.ts · screen: ./ThousandScreen.tsx (lazy).
 */

/** Hub emblem: the ♥ marriage (K + Q) fanned over a brass "1000". */
function Emblem({ size = 56 }: { size?: number }) {
  const card = (rot: number, r: string, k: number) => createElement('g', { key: k, transform: `rotate(${rot} 32 56)` },
    createElement('rect', { x: 19, y: 9, width: 26, height: 37, rx: 3.6, fill: 'url(#th-ivory)', stroke: '#8C6E28', strokeWidth: 1 }),
    createElement('text', { x: 23, y: 19, fontSize: 8.5, fontWeight: 700, fontFamily: 'Georgia, serif', fill: '#9e1b32' }, r),
    createElement('text', { x: 32, y: 36, fontSize: 13, textAnchor: 'middle', fill: '#9e1b32' }, '♥'),
  );
  return createElement('svg', { width: size, height: size, viewBox: '0 0 64 64', 'aria-hidden': true },
    createElement('defs', null,
      createElement('linearGradient', { id: 'th-ivory', x1: 0, y1: 0, x2: 0, y2: 1 },
        createElement('stop', { offset: 0, stopColor: '#fffaf0' }), createElement('stop', { offset: 1, stopColor: '#e9dfc8' })),
      createElement('linearGradient', { id: 'th-brass', x1: 0, y1: 0, x2: 0, y2: 1 },
        createElement('stop', { offset: 0, stopColor: '#FFF1C4' }), createElement('stop', { offset: 0.5, stopColor: '#EBD38E' }), createElement('stop', { offset: 1, stopColor: '#A9842F' })),
      createElement('radialGradient', { id: 'th-glow', cx: 0.5, cy: 0.55, r: 0.6 },
        createElement('stop', { offset: 0, stopColor: '#ff6b80', stopOpacity: 0.45 }), createElement('stop', { offset: 1, stopColor: '#ff6b80', stopOpacity: 0 })),
    ),
    createElement('circle', { cx: 32, cy: 32, r: 29, fill: 'url(#th-glow)' }),
    card(-14, 'K', 0), card(14, 'Q', 1),
    createElement('rect', { x: 12, y: 44, width: 40, height: 15, rx: 7.5, fill: '#14211d', stroke: 'url(#th-brass)', strokeWidth: 1.2 }),
    createElement('text', { x: 32, y: 55.4, fontSize: 11.5, fontWeight: 700, textAnchor: 'middle', fontFamily: 'Georgia, serif', fill: 'url(#th-brass)', letterSpacing: 0.6 }, '1000'),
  );
}

export const thousand: GameModule = {
  id: 'thousand',
  kind: 'cards',
  players: { min: 3, max: 3 },
  title: TITLES,
  tagline: TAGLINES,
  Emblem,
  Screen: lazy(() => import('./ThousandScreen')),
  homeLangs: ['ru', 'uk', 'be', 'lv', 'lt', 'et', 'pl', 'kk', 'bg'],
};
