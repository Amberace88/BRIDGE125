import type { ReactNode } from 'react';
import type { GameState } from '../engine/engine';

/** What LocalGame needs to run the Daily challenge (see src/daily/Daily.tsx). */
export interface DailyRun {
  day: string;
  /** false = an unscored practice replay of today's deal */
  scored: boolean;
  /** my turns so far when resuming a scored game */
  turns?: number;
  /** drawn over the table (the "Daily · round n/3" plaque) */
  overlay?: ReactNode;
  /** every state change (the scored game is saved so leaving resumes it) */
  onState?: (g: GameState, turns: number) => void;
  onEnd: (o: DailyOutcome) => void;
}

export interface DailyOutcome {
  won: boolean;
  points: number;
  roundsWon: number;
  rounds: number;
  queens: number;
  turns: number;
  g: GameState;
}
