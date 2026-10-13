import { lazy } from 'react';
import type { GameModule } from '../types';
import { SudokuEmblem } from './Emblem';
import { TAGLINE, TITLE } from './meta';

/** Sudoku — a solo puzzle: Daily Sudoku (one per Riga day per level, same for everyone) and free play. */
export const sudoku: GameModule = {
  id: 'sudoku',
  kind: 'puzzle',
  daily: true,
  players: { min: 1, max: 1 },
  title: TITLE,
  tagline: TAGLINE,
  Emblem: SudokuEmblem,
  Screen: lazy(() => import('./Screen')),
  seeded: true,
};
