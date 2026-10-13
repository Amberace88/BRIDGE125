import type { OnlineGameId } from '../protocol';
import { durakAdapter } from './durak';
import { thousandAdapter } from './thousand';
import type { GameAdapter } from './types';
import { zoleAdapter } from './zole';

/** Every card mini game that can be played online. Worker-safe (engines + bots only). */
export const ADAPTERS: Record<OnlineGameId, GameAdapter<any, any, any>> = { // eslint-disable-line @typescript-eslint/no-explicit-any
  zole: zoleAdapter,
  durak: durakAdapter,
  thousand: thousandAdapter,
};

export type { GameAdapter, GameOutcome, Pause, SeatPlayer } from './types';
