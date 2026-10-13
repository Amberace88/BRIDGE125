import type { GameId, GameModule } from './types';
import { zole } from './zole';
import { durak } from './durak';
import { solitaire } from './solitaire';
import { sudoku } from './sudoku';
import { freecell } from './freecell';

// One line per game. Keep Bridge out of here: Bridge is the main game and keeps its own home screen.
const MODULES: GameModule[] = [
  zole,
  durak,
  solitaire,
  sudoku,
  freecell,
];

export const GAMES: readonly GameModule[] = MODULES;
export const gameById = (id: GameId): GameModule | undefined => MODULES.find(m => m.id === id);
