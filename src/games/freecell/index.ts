import { lazy } from 'react';
import type { GameModule } from '../types';
import FreeCellEmblem from './Emblem';
import { TAGLINE, TITLE } from './meta';

/** FreeCell — the classic Microsoft deals #1 … #1 000 000, a proven-winnable daily deal, supermoves, solver hints. */
export const freecell: GameModule = {
  id: 'freecell',
  kind: 'cards',
  daily: true,
  players: { min: 1, max: 1 },
  title: TITLE,
  tagline: TAGLINE,
  Emblem: FreeCellEmblem,
  Screen: lazy(() => import('./ui/FreeCell')),
};

export default freecell;
