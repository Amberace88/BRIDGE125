import type { GameId, GameModule } from './types';
import { durak } from './durak';

// One line per game. Keep Bridge out of here: Bridge is the main game and keeps its own home screen.
const MODULES: GameModule[] = [
  durak,
];

export const GAMES: readonly GameModule[] = MODULES;
export const gameById = (id: GameId): GameModule | undefined => MODULES.find(m => m.id === id);
