import { useEffect, useRef } from 'react';
import type { GameState } from '../engine/engine';
import { gameEvents, newTally, stepTally, type GameMode, type Tally } from './quests';
import { submitGameEvents } from './questStore';

/** Accumulates quest-relevant events of the running game, state by state, for seat `me`. Resets on a new game. */
export function useGameTally(g: GameState | null | undefined, me: number, init?: Tally | null) {
  // a resumed game continues its saved tally (the resumed state itself is already counted in it)
  const tally = useRef<Tally>(init ? { ...newTally(), ...init } : newTally());
  const prev = useRef<GameState | null>(init && g ? g : null);
  const seq = g?.seq;
  useEffect(() => {
    if (!g) return;
    // a rematch / new game starts from round 1 with an empty event list
    if (prev.current && (g.round < prev.current.round || g.seq < prev.current.seq)) { tally.current = newTally(); prev.current = null; }
    tally.current = stepTally(tally.current, prev.current, g, me);
    prev.current = g;
  }, [seq, me]); // eslint-disable-line react-hooks/exhaustive-deps
  const reset = () => { tally.current = newTally(); prev.current = null; };
  return { tally, reset };
}

/** Report a finished game to the quest board (progress toast + server). */
export function reportGame(t: Tally, won: boolean, mode: GameMode, journey?: { won: boolean; stars: number }) {
  void submitGameEvents(gameEvents(t, won, mode, journey));
}

/**
 * Drop-in for game screens that do not need the tally themselves (online rooms):
 *   useQuestTracker(r.game, r.you, quickMatch ? 'quick' : 'room')
 * Reports once when the game reaches game over.
 */
export function useQuestTracker(g: GameState | null | undefined, me: number, mode: GameMode) {
  const { tally } = useGameTally(g, me);
  const done = useRef<string | null>(null);
  const over = g?.phase === 'gameOver';
  useEffect(() => {
    if (!g || !over || me < 0) return;
    const key = `${g.round}:${g.seq}:${g.players.map(p => p.score).join(',')}`;
    if (done.current === key) return;
    done.current = key;
    reportGame(tally.current, g.winners.includes(me), mode);
  }, [over]); // eslint-disable-line react-hooks/exhaustive-deps
}
