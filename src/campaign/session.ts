import type { ReactNode } from 'react';
import type { GameState } from '../engine/engine';
import type { MatchDef } from './data';

/** What LocalGame needs to run a Journey match (see screens/Journey.tsx). */
export interface CampaignRun {
  match: MatchDef;
  names: { me: string; foes: string[] };
  /** drawn over the table (the house-rule bookmark) */
  overlay?: ReactNode;
  onEnd: (r: MatchOutcome) => void;
}

export interface MatchOutcome {
  matchId: string;
  won: boolean;
  stars: number;
  queenHits: number;
  myScore: number;
  rounds: number;
  g: GameState;
}
