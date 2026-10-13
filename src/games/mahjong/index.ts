import { lazy } from 'react';
import type { GameModule } from '../types';
import { MahjongEmblem } from './Emblem';
import { TAGLINE, TITLE } from './meta';

/** Mahjong Solitaire — a solo puzzle: Daily Mahjong (one board per Riga day, same for everyone) and free play. */
export const mahjong: GameModule = {
  id: 'mahjong',
  kind: 'puzzle',
  daily: true,
  players: { min: 1, max: 1 },
  title: TITLE,
  tagline: TAGLINE,
  Emblem: MahjongEmblem,
  Screen: lazy(() => import('./Screen')),
  seeded: true,
};
