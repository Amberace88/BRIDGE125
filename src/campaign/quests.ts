/**
 * Daily / weekly quests — definitions, per-game event detection and the pure progress logic.
 *
 * The server (supabase/migration_011_journey.sql: quest_defs, player_quests, quest_progress …) is the source of truth
 * for signed-in players; guests get the same quests assigned and tracked locally (rewards need an account).
 * A unit test keeps QUEST_DEFS / QUEST_CAPS in sync with the SQL seed.
 */
import type { GameState } from '../engine/engine';
import { isQS } from '../engine/engine';

export type Metric =
  | 'games' | 'wins' | 'queen' | 'burn125' | 'jacks' | 'rounds' | 'rounds_won' | 'bluff_rounds' | 'bounce' | 'kings'
  | 'quick_win' | 'journey_win' | 'journey_3star';

export type QuestKind = 'daily' | 'weekly';

export interface QuestDef { id: string; kind: QuestKind; metric: Metric; goal: number; bm: number; xp: number }

export const QUEST_DEFS: QuestDef[] = [
  { id: 'd_play3', kind: 'daily', metric: 'games', goal: 3, bm: 150, xp: 40 },
  { id: 'd_win2', kind: 'daily', metric: 'wins', goal: 2, bm: 200, xp: 60 },
  { id: 'd_queen2', kind: 'daily', metric: 'queen', goal: 2, bm: 150, xp: 40 },
  { id: 'd_burn', kind: 'daily', metric: 'burn125', goal: 1, bm: 250, xp: 80 },
  { id: 'd_jacks', kind: 'daily', metric: 'jacks', goal: 1, bm: 250, xp: 80 },
  { id: 'd_rounds10', kind: 'daily', metric: 'rounds', goal: 10, bm: 120, xp: 40 },
  { id: 'd_out5', kind: 'daily', metric: 'rounds_won', goal: 5, bm: 180, xp: 50 },
  { id: 'd_bounce', kind: 'daily', metric: 'bounce', goal: 1, bm: 200, xp: 60 },
  { id: 'd_journey', kind: 'daily', metric: 'journey_win', goal: 1, bm: 200, xp: 60 },
  { id: 'd_bluff10', kind: 'daily', metric: 'bluff_rounds', goal: 10, bm: 180, xp: 50 },
  { id: 'w_win10', kind: 'weekly', metric: 'wins', goal: 10, bm: 600, xp: 200 },
  { id: 'w_play20', kind: 'weekly', metric: 'games', goal: 20, bm: 500, xp: 150 },
  { id: 'w_quick', kind: 'weekly', metric: 'quick_win', goal: 1, bm: 600, xp: 200 },
  { id: 'w_queen10', kind: 'weekly', metric: 'queen', goal: 10, bm: 500, xp: 150 },
  { id: 'w_burn3', kind: 'weekly', metric: 'burn125', goal: 3, bm: 700, xp: 220 },
  { id: 'w_jacks3', kind: 'weekly', metric: 'jacks', goal: 3, bm: 700, xp: 220 },
  { id: 'w_bluff30', kind: 'weekly', metric: 'bluff_rounds', goal: 30, bm: 500, xp: 150 },
  { id: 'w_star3', kind: 'weekly', metric: 'journey_3star', goal: 1, bm: 600, xp: 200 },
  { id: 'w_kings', kind: 'weekly', metric: 'kings', goal: 1, bm: 800, xp: 250 },
];

export const questDef = (id: string) => QUEST_DEFS.find(q => q.id === id);
export const DAILY_COUNT = 3;
export const WEEKLY_COUNT = 5;
export const REROLL_COST = 100;
export const CHEST = { bm: 1500, xp: 400 } as const;

/** Most a single finished game may add to each metric (the server clamps with the same numbers). */
export const QUEST_CAPS: Record<Metric, number> = {
  games: 1, wins: 1, queen: 6, burn125: 3, jacks: 3, rounds: 30, rounds_won: 20, bluff_rounds: 30, bounce: 4, kings: 2,
  quick_win: 1, journey_win: 1, journey_3star: 1,
};

export type QuestEvents = Partial<Record<Metric, number>>;

/* ------------------------------------------------------------------------------------------------ game tally */

/** What happened in one game from one seat's point of view (accumulated state by state). */
export interface Tally {
  queen: number; burn125: number; jacks: number; rounds: number; rounds_won: number; bluff_rounds: number;
  bounce: number; kings: number;
  /** times this seat had to take a Q♠ penalty (Journey star) */
  queenHits: number;
  lastSeq: number;
}

export const newTally = (): Tally => ({ queen: 0, burn125: 0, jacks: 0, rounds: 0, rounds_won: 0, bluff_rounds: 0, bounce: 0, kings: 0, queenHits: 0, lastSeq: -1 });

/**
 * Fold one state transition into the tally. `g.events` are the events of the action that produced `g`;
 * `prev` is the state before it (used to tell a Q♠ penalty from other forced draws). Same seq twice → no-op.
 */
export function stepTally(t: Tally, prev: GameState | null, g: GameState, me: number): Tally {
  if (g.seq === t.lastSeq || me < 0) return t;
  const n = { ...t, lastSeq: g.seq };
  const ev = g.events ?? [];
  const forcedMe = ev.some(e => e.t === 'draw' && e.p === me && e.forced);
  for (const e of ev) {
    if (e.t === 'play' && e.p === me && e.cards.some(isQS)) n.queen += 1;
    else if (e.t === 'reset125' && e.p === me) n.burn125 += 1;
    else if (e.t === 'transfer' && e.p === me) n.bounce += 1;
    else if (e.t === 'roundEnd') {
      n.rounds += 1;
      if (g.rules?.bluff) n.bluff_rounds += 1;
      if (e.winner === me) { n.rounds_won += 1; if (e.mult > 1) n.jacks += 1; }
    }
  }
  if (ev.some(e => e.t === 'kings') && ev.some(e => e.t === 'play' && e.p === me && e.cards.some(c => c.r === 'K'))) n.kings += 1;
  // hit by the queen: I drew a pending Q♠ penalty, or someone went out on a Q♠ right before me
  const pendQ = prev?.pending && (prev.pending.kind === 'queen' || prev.pending.kind === 'queen6') && prev.current === me;
  const finalQ = ev.some(e => e.t === 'roundEnd') && ev.some(e => e.t === 'play' && e.p !== me && e.cards.some(isQS));
  if (forcedMe && (pendQ || finalQ)) n.queenHits += 1;
  return n;
}

export type GameMode = 'bots' | 'room' | 'quick' | 'journey';

/** Quest events for a finished game (clamped to the per-game caps). */
export function gameEvents(t: Tally, won: boolean, mode: GameMode, journey?: { won: boolean; stars: number }): QuestEvents {
  const raw: QuestEvents = {
    games: 1, wins: won ? 1 : 0,
    queen: t.queen, burn125: t.burn125, jacks: t.jacks, rounds: t.rounds, rounds_won: t.rounds_won,
    bluff_rounds: t.bluff_rounds, bounce: t.bounce, kings: t.kings,
    quick_win: won && mode === 'quick' ? 1 : 0,
    journey_win: journey?.won ? 1 : 0,
    journey_3star: journey?.won && journey.stars >= 3 ? 1 : 0,
  };
  return clampEvents(raw);
}

export function clampEvents(ev: QuestEvents): QuestEvents {
  const out: QuestEvents = {};
  for (const [k, v] of Object.entries(ev) as [Metric, number][]) {
    if (!(k in QUEST_CAPS)) continue;
    const n = Math.max(0, Math.min(QUEST_CAPS[k], Math.floor(Number(v) || 0)));
    if (n > 0) out[k] = n;
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------ assignment */

/** FNV-1a 32-bit — stable across browsers. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** Deterministic pick of `n` quests of a kind for (seed, period), skipping `exclude`. */
export function assignQuests(kind: QuestKind, seed: string, period: string, n = kind === 'daily' ? DAILY_COUNT : WEEKLY_COUNT, exclude: string[] = [], salt = ''): string[] {
  return QUEST_DEFS.filter(q => q.kind === kind && !exclude.includes(q.id))
    .map(q => ({ id: q.id, h: hash32(`${seed}|${period}|${q.id}|${salt}`) }))
    .sort((a, b) => a.h - b.h || a.id.localeCompare(b.id))
    .slice(0, n)
    .map(x => x.id);
}

export interface QuestRow { id: string; kind: QuestKind; metric: Metric; goal: number; progress: number; bm: number; xp: number; claimed: boolean }

export const rowOf = (id: string, progress = 0, claimed = false): QuestRow | null => {
  const d = questDef(id);
  return d ? { ...d, progress: Math.min(d.goal, Math.max(0, progress)), claimed } : null;
};

/** Apply clamped game events to quest rows (claimed ones are frozen). Returns new rows. */
export function applyEvents(rows: QuestRow[], events: QuestEvents): QuestRow[] {
  const ev = clampEvents(events);
  return rows.map(r => {
    const v = ev[r.metric] ?? 0;
    if (!v || r.claimed || r.progress >= r.goal) return r;
    return { ...r, progress: Math.min(r.goal, r.progress + v) };
  });
}

export interface QuestChange { id: string; from: number; to: number; goal: number; kind: QuestKind }

export function diffRows(before: QuestRow[], after: QuestRow[]): QuestChange[] {
  const out: QuestChange[] = [];
  for (const a of after) {
    const b = before.find(x => x.id === a.id && x.kind === a.kind);
    if (b && a.progress > b.progress) out.push({ id: a.id, from: b.progress, to: a.progress, goal: a.goal, kind: a.kind });
  }
  return out;
}

export const isReady = (r: QuestRow) => !r.claimed && r.progress >= r.goal;

/* ------------------------------------------------------------------------------------------------ calendar */

/** YYYY-MM-DD in Europe/Riga (the game's day, same as the daily reward). */
export function rigaDay(d = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch { return d.toISOString().slice(0, 10); }
}

/** Monday of the week containing the given YYYY-MM-DD. */
export function weekStart(day: string): string {
  const [y, m, dd] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd));
  const dow = (t.getUTCDay() + 6) % 7;   // Monday = 0
  t.setUTCDate(t.getUTCDate() - dow);
  return t.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const [y, m, dd] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd + n));
  return t.toISOString().slice(0, 10);
}

/** Riga's UTC offset in minutes at the given moment. */
function rigaOffset(at: Date): number {
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Riga', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    const p = Object.fromEntries(f.formatToParts(at).map(x => [x.type, x.value]));
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    return Math.round((asUtc - at.getTime()) / 60000);
  } catch { return 180; }
}

/** Epoch ms of 00:00 Riga time on the given YYYY-MM-DD. */
export function rigaMidnight(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const off = rigaOffset(new Date(guess));
  return guess - off * 60000;
}
