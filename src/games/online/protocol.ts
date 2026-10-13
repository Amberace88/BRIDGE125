// Online mini games — the wire protocol shared by the Worker (worker/gameroom*.ts) and the client
// (src/games/online/useGameRoom.ts). Pure data + tiny helpers only: no DOM, no Worker APIs.

export const ONLINE_GAMES = ['zole', 'durak', 'thousand'] as const;
export type OnlineGameId = (typeof ONLINE_GAMES)[number];
export const isOnlineGame = (id: unknown): id is OnlineGameId => typeof id === 'string' && (ONLINE_GAMES as readonly string[]).includes(id);

/** Quick-match codes: 6 characters starting with Q; private rooms: 5 characters (the two never collide). */
export const isQuickCode = (code: string) => code.length === 6 && code[0] === 'Q';
export const CODE_RE = /^[A-Z0-9]{4,6}$/;
const ALPHA = 'ABCDEFGHJKLMNPRSTUVWXYZ23456789';
export function randomCode(len: number, prefix = ''): string {
  const a = new Uint32Array(len); crypto.getRandomValues(a);
  return prefix + [...a].map(n => ALPHA[n % ALPHA.length]).join('');
}

/* ------------------------------------------------------------------ timings + limits */

/** a human's turn */
export const TURN_MS = 30_000;
/** a disconnected human's turn: a bot plays for them after this */
export const OFFLINE_MS = 8_000;
/** a seat that let the clock run out this many times in a row is played by a bot until its owner acts again */
export const AWAY_AFTER = 2;
/** how long a quick-match table waits for strangers before bots fill the empty seats */
export const QUICK_WAIT_MS = 20_000;
/** a client message longer than this is ignored (a card game action is < 200 bytes) */
export const MSG_MAX = 4096;
/** game messages per player per window (chat has its own, stricter limiter) */
export const ACT_BURST = 24;
export const ACT_WINDOW_MS = 5_000;
/** sockets per room (players + spectators) */
export const MAX_SOCKETS = 24;

/* ------------------------------------------------------------------ messages */

export interface SeatInfo {
  name: string;
  bot: boolean;
  /** a human seat currently played by the server's bot (timed out / disconnected) */
  away: boolean;
  online: boolean;
  host: boolean;
}

export interface RoomInfo {
  game: OnlineGameId;
  code: string;
  status: 'lobby' | 'playing';
  quick: boolean;
  minSeats: number;
  maxSeats: number;
  seats: SeatInfo[];
  /** sanitized rules of this room (the host may change them in the lobby) */
  rules: unknown;
  /** increases with every new game (rematch) */
  gameNo: number;
  /** seats that are ready for the next deal / bout */
  ready: number[];
  /** seats that asked for a rematch */
  rematch: number[];
  /** quick tables: when bots fill the empty seats */
  startAt: number | null;
}

/** Server → client: the full state for one socket (its own seat's view only). */
export interface StateMsg {
  t: 'state';
  /** my seat (−1: spectator) */
  you: number;
  isHost: boolean;
  room: RoomInfo;
  /** the game as my seat may see it (other hands hidden), null in the lobby */
  view: unknown | null;
  /** whose move the server waits for (null: nobody / automatic step) */
  actor: number | null;
  /** server time of the next automatic step (turn timeout, bot move, next deal), client clock corrected */
  deadline: number | null;
  turnMs: number;
  /** server clock, for skew correction */
  now: number;
}

export type ClientMsg =
  | { t: 'ping' }
  | { t: 'act'; a: unknown }
  | { t: 'next' }
  | { t: 'rematch' }
  | { t: 'start' }
  | { t: 'addBot' }
  | { t: 'removeBot' }
  | { t: 'rules'; rules: unknown }
  | { t: 'rename'; name: string }
  | { t: 'sit'; seat: number }
  | { t: 'leave' }
  | { t: 'emote'; e: string }
  | { t: 'chat'; text?: string; q?: string }
  | { t: 'report'; id: number; token?: string; rid?: string };

/** Display names: trimmed, no control characters, ≤ 20 characters. */
export function cleanName(raw: unknown, fallback = 'Player'): string {
  if (typeof raw !== 'string') return fallback;
  // eslint-disable-next-line no-control-regex
  const v = raw.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 20);
  return v || fallback;
}
