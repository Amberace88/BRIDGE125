import { lazy } from 'react';
import type { GameModule } from '../types';
import { DurakEmblem } from './Emblem';
import { TAGLINE, TITLE } from './meta';

/** Durak (Дурак): classic 36-card throw-in / transfer durak against bots. Everything heavy loads with the Screen. */
export const durak: GameModule = {
  id: 'durak',
  kind: 'cards',
  players: { min: 2, max: 6 },
  title: TITLE,
  tagline: TAGLINE,
  Emblem: DurakEmblem,
  Screen: lazy(() => import('./DurakScreen')),
  seeded: true,
  homeLangs: ['ru', 'uk', 'be', 'kk', 'uz', 'az', 'ka', 'hy', 'bg', 'lv', 'lt', 'et'],
};
