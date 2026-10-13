import { CELL_UNITS, PEERS, UNITS, bit, candidatesOf, parse, type Grid, type Level } from './grid';
import type { Puzzle } from './generator';

// The game state is plain JSON (autosaved after every move). Every action returns a NEW state; each user move is one
// undoable patch that also carries its side effects (cleared notes in the peers), so undo/redo restore exactly.

/** [cell, value before, notes before, value after, notes after] */
export type Change = [number, number, number, number, number];
export interface Patch { c: Change[] }

export type Mode = 'daily' | 'classic';
export type Status = 'play' | 'won' | 'lost';

export interface Game {
  v: 1;
  /** 'daily:2026-10-13:hard' | 'classic:hard' */
  key: string;
  mode: Mode;
  level: Level;
  day?: string;
  seed: number;
  puzzle: string;
  solution: string;
  values: number[];
  /** 9-bit pencil marks per cell */
  notes: number[];
  mistakes: number;
  hints: number;
  /** active play time */
  ms: number;
  status: Status;
  undo: Patch[];
  redo: Patch[];
  started: number;
  /** the result went to reportGame */
  reported?: boolean;
  score?: number;
}

export interface Settings {
  /** placing a digit removes it from the notes of its row / column / box */
  autoClear: boolean;
  /** show clashing digits in red */
  conflicts: boolean;
  /** three mistakes and the game is over */
  limit: boolean;
  /** highlight every copy of the selected digit */
  sameDigits: boolean;
}
export const DEFAULT_SETTINGS: Settings = { autoClear: true, conflicts: true, limit: false, sameDigits: true };
export const MISTAKE_LIMIT = 3;
/** effectively unlimited (a whole game is a few hundred moves); the cap only bounds the autosave size */
const UNDO_CAP = 5000;

export interface Events {
  changed: boolean;
  mistake?: boolean;
  /** a correct digit landed */
  placed?: { cell: number; digit: number };
  /** units completed by this move (all nine correct) */
  units?: number[];
  /** every copy of this digit is now placed correctly */
  digitDone?: number;
  solved?: boolean;
  lost?: boolean;
}

export const gameKey = (mode: Mode, level: Level, day?: string) => (mode === 'daily' ? `daily:${day}:${level}` : `classic:${level}`);

export function newGame(p: Puzzle, mode: Mode, day?: string, now = Date.now()): Game {
  const values = parse(p.puzzle);
  return {
    v: 1, key: gameKey(mode, p.level, day), mode, level: p.level, day, seed: p.seed,
    puzzle: p.puzzle, solution: p.solution, values, notes: new Array(81).fill(0),
    mistakes: 0, hints: 0, ms: 0, status: 'play', undo: [], redo: [], started: now,
  };
}

export const isGiven = (g: Game, i: number) => g.puzzle.charCodeAt(i) !== 46; // '.'
export const solutionAt = (g: Game, i: number) => g.solution.charCodeAt(i) - 48;
export const isWrong = (g: Game, i: number) => g.values[i] !== 0 && g.values[i] !== solutionAt(g, i);
export const isSolved = (g: Game) => g.values.every((v, i) => v === solutionAt(g, i));

/** Cells whose digit appears twice in one of their units. */
export function conflicts(values: Grid): Set<number> {
  const out = new Set<number>();
  for (const u of UNITS) {
    const seen = new Map<number, number>();
    for (const i of u) {
      const v = values[i];
      if (!v) continue;
      const j = seen.get(v);
      if (j !== undefined) { out.add(i); out.add(j); } else seen.set(v, i);
    }
  }
  return out;
}

/** How many correct copies of each digit are on the board (index 1–9). */
export function digitCounts(g: Game): number[] {
  const n = new Array(10).fill(0);
  for (let i = 0; i < 81; i++) if (g.values[i] && g.values[i] === solutionAt(g, i)) n[g.values[i]]++;
  return n;
}

const unitDone = (g: Game, values: Grid, u: number) => UNITS[u].every(i => values[i] === solutionAt(g, i));

function commit(g: Game, changes: Change[], extra: Partial<Game> = {}): Game {
  if (!changes.length && !Object.keys(extra).length) return g;
  const values = g.values.slice(), notes = g.notes.slice();
  for (const [i, , , v1, n1] of changes) { values[i] = v1; notes[i] = n1; }
  const undo = changes.length ? [...g.undo, { c: changes }].slice(-UNDO_CAP) : g.undo;
  return { ...g, values, notes, undo, redo: changes.length ? [] : g.redo, ...extra };
}

/** Place `d` (correct or not) with the side effects; shared by enter() and reveal(). */
function placeChanges(g: Game, cell: number, d: number, autoClear: boolean): Change[] {
  const ch: Change[] = [[cell, g.values[cell], g.notes[cell], d, 0]];
  if (autoClear && d === solutionAt(g, cell)) {
    const b = bit(d);
    for (const p of PEERS[cell]) if (!g.values[p] && g.notes[p] & b) ch.push([p, 0, g.notes[p], 0, g.notes[p] & ~b]);
  }
  return ch;
}

function afterPlace(prev: Game, next: Game, cell: number, d: number): Events {
  const ev: Events = { changed: true };
  if (d !== solutionAt(next, cell)) return ev;
  ev.placed = { cell, digit: d };
  ev.units = CELL_UNITS[cell].filter(u => unitDone(next, next.values, u) && !unitDone(prev, prev.values, u));
  if (digitCounts(next)[d] === 9) ev.digitDone = d;
  if (isSolved(next)) ev.solved = true;
  return ev;
}

export function enter(g: Game, cell: number, d: number, st: Settings): [Game, Events] {
  if (g.status !== 'play' || isGiven(g, cell) || d < 1 || d > 9) return [g, { changed: false }];
  const cur = g.values[cell];
  if (cur === d || (cur && cur === solutionAt(g, cell))) return [g, { changed: false }];
  const wrong = d !== solutionAt(g, cell);
  const mistakes = g.mistakes + (wrong ? 1 : 0);
  const lost = wrong && st.limit && mistakes >= MISTAKE_LIMIT;
  let next = commit(g, placeChanges(g, cell, d, st.autoClear), { mistakes });
  const ev = afterPlace(g, next, cell, d);
  if (wrong) ev.mistake = true;
  if (ev.solved) next = { ...next, status: 'won' };
  else if (lost) { next = { ...next, status: 'lost' }; ev.lost = true; }
  return [next, ev];
}

export function toggleNote(g: Game, cell: number, d: number): [Game, Events] {
  if (g.status !== 'play' || isGiven(g, cell) || g.values[cell] || d < 1 || d > 9) return [g, { changed: false }];
  const n0 = g.notes[cell];
  return [commit(g, [[cell, 0, n0, 0, n0 ^ bit(d)]]), { changed: true }];
}

export function erase(g: Game, cell: number): [Game, Events] {
  if (g.status !== 'play' || isGiven(g, cell)) return [g, { changed: false }];
  const v = g.values[cell], n = g.notes[cell];
  if (!v && !n) return [g, { changed: false }];
  return [commit(g, [[cell, v, n, 0, v ? n : 0]]), { changed: true }];
}

/** A hint that fills in a cell (the hint itself is counted by addHint). */
export function reveal(g: Game, cell: number, st: Settings): [Game, Events] {
  if (g.status !== 'play' || isGiven(g, cell)) return [g, { changed: false }];
  const d = solutionAt(g, cell);
  if (g.values[cell] === d) return [g, { changed: false }];
  let next = commit(g, placeChanges(g, cell, d, st.autoClear));
  const ev = afterPlace(g, next, cell, d);
  if (ev.solved) next = { ...next, status: 'won' };
  return [next, ev];
}

export const addHint = (g: Game): Game => ({ ...g, hints: g.hints + 1 });

/** Pencil in every candidate of every empty cell (one undoable step). */
export function fillNotes(g: Game): [Game, Events] {
  if (g.status !== 'play') return [g, { changed: false }];
  // candidates from the correct digits only, so a wrong entry never hides the real candidates
  const clean = g.values.map((v, i) => (v === solutionAt(g, i) ? v : 0));
  const cand = candidatesOf(clean);
  const ch: Change[] = [];
  for (let i = 0; i < 81; i++) if (!g.values[i] && g.notes[i] !== cand[i]) ch.push([i, 0, g.notes[i], 0, cand[i]]);
  return ch.length ? [commit(g, ch), { changed: true }] : [g, { changed: false }];
}

export function undo(g: Game): [Game, Events] {
  const p = g.undo[g.undo.length - 1];
  if (!p || g.status !== 'play') return [g, { changed: false }];
  const values = g.values.slice(), notes = g.notes.slice();
  for (let k = p.c.length - 1; k >= 0; k--) { const [i, v0, n0] = p.c[k]; values[i] = v0; notes[i] = n0; }
  return [{ ...g, values, notes, undo: g.undo.slice(0, -1), redo: [...g.redo, p] }, { changed: true }];
}

export function redo(g: Game): [Game, Events] {
  const p = g.redo[g.redo.length - 1];
  if (!p || g.status !== 'play') return [g, { changed: false }];
  const values = g.values.slice(), notes = g.notes.slice();
  for (const [i, , , v1, n1] of p.c) { values[i] = v1; notes[i] = n1; }
  let next: Game = { ...g, values, notes, undo: [...g.undo, p], redo: g.redo.slice(0, -1) };
  if (isSolved(next)) next = { ...next, status: 'won' };
  return [next, { changed: true, solved: next.status === 'won' }];
}

/** The cell a patch touched first (undo/redo move the selection there). */
export const patchCell = (p: Patch | undefined) => (p ? p.c[0][0] : -1);

/** Shape check for data coming back from localStorage. */
export function isGame(x: unknown): x is Game {
  const g = x as Game;
  return !!g && g.v === 1 && typeof g.key === 'string' && typeof g.puzzle === 'string' && g.puzzle.length === 81
    && typeof g.solution === 'string' && g.solution.length === 81 && Array.isArray(g.values) && g.values.length === 81
    && Array.isArray(g.notes) && g.notes.length === 81 && Array.isArray(g.undo) && Array.isArray(g.redo)
    && (g.status === 'play' || g.status === 'won' || g.status === 'lost');
}
