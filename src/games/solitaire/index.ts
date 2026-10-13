import { lazy } from 'react';
import type { GameModule } from '../types';
import SolitaireEmblem from './Emblem';
import { TAGLINE, TITLE } from './meta';

/** Pasjanss / Solitaire — Klondike (draw 1 / 3, winnable deals, daily deal) and Spider (1 / 2 / 4 suits). */
export const solitaire: GameModule = {
  id: 'solitaire',
  kind: 'cards',
  daily: true,
  players: { min: 1, max: 1 },
  title: TITLE,
  tagline: TAGLINE,
  Emblem: SolitaireEmblem,
  Screen: lazy(() => import('./ui/Solitaire')),
};

export default solitaire;
