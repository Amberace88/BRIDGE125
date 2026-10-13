import { describe, expect, it } from 'vitest';
import { LANGS } from '../../i18n';
import { missingKeys } from '../../i18n/pick';
import { addDays, dailySeed, rigaDay, streakOf } from './core/daily';
import {
  DEFAULT_SETTINGS, MISTAKE_LIMIT, conflicts, enter, erase, fillNotes, newGame, redo, reveal, solutionAt, toggleNote, undo, type Game,
} from './core/game';
import { generate } from './core/generator';
import { LEVELS, UNITS, bit, format, isComplete, parse, type Grid, type Level } from './core/grid';
import { TIER, applyStep, grade, levelFor, logicState, nextPlacement, nextStep } from './core/logic';
import { hashSeed } from './core/rng';
import { BASE, PAR, scoreOf } from './core/score';
import { countSolutions, solve } from './core/solver';
import { describe as describeStep, findHint } from './hint';
import { SUDOKU_STRINGS } from './strings';
import { TAGLINE, TITLE } from './meta';
import { sudoku } from './index';

/** Arto Inkala's "Everest": unique, but far beyond human-style singles/subsets/fish/wings. */
const EVEREST = '8..........36......7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..';
/** A classic easy newspaper puzzle. */
const EASY = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
const EASY_SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

const SEEDS = [1, 2, 3];

describe('solver', () => {
  it('solves a known puzzle exactly', () => {
    expect(format(solve(parse(EASY))!)).toBe(EASY_SOLUTION);
    expect(countSolutions(parse(EASY))).toBe(1);
  });
  it('solves the Everest puzzle and proves it unique', () => {
    const s = solve(parse(EVEREST))!;
    expect(isComplete(s)).toBe(true);
    parse(EVEREST).forEach((v, i) => { if (v) expect(s[i]).toBe(v); });
    expect(countSolutions(parse(EVEREST), 5)).toBe(1);
  });
  it('counts several solutions of an open grid and none of a broken one', () => {
    expect(countSolutions(new Array(81).fill(0), 2)).toBe(2);
    const bad = parse(EASY); bad[2] = 5; // a second 5 in row 1
    expect(countSolutions(bad)).toBe(0);
    expect(solve(bad)).toBeNull();
  });
});

describe('generator', () => {
  for (const level of LEVELS) {
    it(`makes unique, correctly graded ${level} puzzles`, () => {
      for (const seed of SEEDS) {
        const p = generate(level, seed * 1000 + 7);
        const g = parse(p.puzzle), sol = parse(p.solution);
        expect(isComplete(sol)).toBe(true);
        expect(countSolutions(g, 2)).toBe(1);
        expect(format(solve(g)!)).toBe(p.solution);
        g.forEach((v, i) => { if (v) expect(v).toBe(sol[i]); });
        // 180° symmetric clues
        g.forEach((v, i) => expect(!!v).toBe(!!g[80 - i]));
        expect(grade(g).level).toBe(level);
        expect(p.level).toBe(level);
        if (level === 'easy') expect(p.givens).toBeGreaterThanOrEqual(36);
      }
    });
  }
});

describe('difficulty grader', () => {
  it('maps the hardest technique to a level', () => {
    expect(levelFor(1, 38)).toBe('easy');
    expect(levelFor(1, 26)).toBe('medium');
    expect(levelFor(2, 30)).toBe('hard');
    expect(levelFor(3, 24)).toBe('expert');
  });
  it('grades a sparse newspaper puzzle as medium (singles only, 30 givens)', () => {
    const gr = grade(parse(EASY));
    expect(gr.solved).toBe(true);
    expect(gr.maxTier).toBe(1);
    expect(gr.level).toBe('medium');
  });
  it('sees a single gap as a full house', () => {
    const g = parse(EASY_SOLUTION); g[40] = 0;
    const st = nextStep(logicState(g))!;
    expect(st.tech).toBe('fullHouse');
    expect(st.place).toEqual({ cell: 40, digit: 5 });
  });
  it('refuses puzzles beyond its techniques', () => {
    const gr = grade(parse(EVEREST));
    expect(gr.solved).toBe(false);
    expect(gr.level).toBeNull();
  });
  it('only ever takes logically sound steps (never removes the solution)', () => {
    const used = new Set<string>();
    for (const level of ['hard', 'expert'] as Level[]) for (const seed of [11, 12, 13, 14]) {
      const p = generate(level, seed);
      const sol = parse(p.solution);
      const s = logicState(parse(p.puzzle));
      for (let guard = 0; guard < 400; guard++) {
        const st = nextStep(s);
        if (!st) break;
        used.add(st.tech);
        if (st.place) expect(st.place.digit).toBe(sol[st.place.cell]);
        for (const e of st.elims) expect(e.digit).not.toBe(sol[e.cell]);
        applyStep(s, st);
        // the true digit stays a candidate in every empty cell
        s.v.forEach((v, i) => { if (!v) expect(s.c[i] & bit(sol[i])).toBeTruthy(); });
      }
      expect(s.v.join('')).toBe(p.solution);
    }
    // the expert puzzles really need fish / wings
    expect([...used].some(t => TIER[t as keyof typeof TIER] === 3)).toBe(true);
  });
  it('explains the next placement from any position', () => {
    const p = generate('hard', 21);
    const np = nextPlacement(parse(p.puzzle))!;
    expect(np.step.place).toBeTruthy();
    expect(np.step.place!.digit).toBe(parse(p.solution)[np.step.place!.cell]);
  });
});

describe('daily', () => {
  it('is deterministic: the same day and level give the same grid everywhere', () => {
    const day = '2026-10-13';
    for (const level of LEVELS) {
      const a = generate(level, dailySeed(day, level));
      const b = generate(level, dailySeed(day, level));
      expect(a.puzzle).toBe(b.puzzle);
      expect(a.solution).toBe(b.solution);
    }
    expect(generate('medium', dailySeed('2026-10-13', 'medium')).puzzle).not.toBe(generate('medium', dailySeed('2026-10-14', 'medium')).puzzle);
    expect(dailySeed(day, 'easy')).not.toBe(dailySeed(day, 'hard'));
  });
  it('never changes: golden grids for launch day (changing the generator would change every daily)', () => {
    const day = '2026-10-13';
    const hashes = Object.fromEntries(LEVELS.map(l => [l, hashSeed(generate(l, dailySeed(day, l)).puzzle)]));
    expect(hashes).toEqual(GOLDEN);
  });
  it('uses the Riga calendar day', () => {
    expect(rigaDay(new Date('2026-10-13T21:30:00Z'))).toBe('2026-10-14'); // 00:30 in Riga (UTC+3)
    expect(rigaDay(new Date('2026-12-31T21:59:00Z'))).toBe('2026-12-31'); // 23:59 in Riga (UTC+2)
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
  it('counts streaks of consecutive solved days', () => {
    expect(streakOf([], '2026-10-13')).toBe(0);
    expect(streakOf(['2026-10-11', '2026-10-12', '2026-10-13'], '2026-10-13')).toBe(3);
    expect(streakOf(['2026-10-11', '2026-10-12'], '2026-10-13')).toBe(2); // today still open
    expect(streakOf(['2026-10-10', '2026-10-11'], '2026-10-13')).toBe(0); // a missed day breaks it
  });
});

describe('scoring', () => {
  const base = { seconds: 600, hints: 0, mistakes: 0, solved: true };
  it('rewards harder levels', () => {
    const at = (level: Level) => scoreOf({ ...base, level, seconds: PAR[level] });
    expect(at('easy')).toBeLessThan(at('medium'));
    expect(at('medium')).toBeLessThan(at('hard'));
    expect(at('hard')).toBeLessThan(at('expert'));
  });
  it('rewards speed, within bounds', () => {
    expect(scoreOf({ ...base, level: 'hard', seconds: 300 })).toBeGreaterThan(scoreOf({ ...base, level: 'hard', seconds: 1200 }));
    expect(scoreOf({ ...base, level: 'hard', seconds: 1 })).toBe(scoreOf({ ...base, level: 'hard', seconds: 10 }));
    expect(scoreOf({ ...base, level: 'hard', seconds: 10 })).toBeLessThanOrEqual(Math.round(BASE.hard * 1.5 * 1.15));
    expect(scoreOf({ ...base, level: 'hard', seconds: 99999 })).toBeGreaterThan(0);
  });
  it('rewards solving without hints and mistakes', () => {
    const clean = scoreOf({ ...base, level: 'medium' });
    expect(scoreOf({ ...base, level: 'medium', hints: 1 })).toBeLessThan(clean);
    expect(scoreOf({ ...base, level: 'medium', hints: 3 })).toBeLessThan(scoreOf({ ...base, level: 'medium', hints: 1 }));
    expect(scoreOf({ ...base, level: 'medium', mistakes: 2 })).toBeLessThan(clean);
    expect(scoreOf({ ...base, level: 'medium', solved: false })).toBe(0);
  });
  it('matches the formula at par', () => {
    expect(scoreOf({ level: 'easy', seconds: PAR.easy, hints: 0, mistakes: 0, solved: true })).toBe(Math.round(1000 * 1.15));
  });
});

describe('game state', () => {
  const p = { puzzle: EASY.replace(/\./g, '.'), solution: EASY_SOLUTION, level: 'easy' as Level, seed: 1, givens: 30, tier: 1, attempts: 1 };
  const fresh = () => newGame(p, 'classic', undefined, 0);
  const empty = (g: Game) => g.values.findIndex(v => v === 0);
  const st = DEFAULT_SETTINGS;

  it('places digits, counts mistakes and never undoes them', () => {
    let g = fresh();
    const c = empty(g), right = solutionAt(g, c), wrong = right === 9 ? 1 : right + 1;
    let ev; [g, ev] = enter(g, c, wrong, st);
    expect(ev.mistake).toBe(true);
    expect(g.mistakes).toBe(1);
    [g] = undo(g);
    expect(g.values[c]).toBe(0);
    expect(g.mistakes).toBe(1);
    [g, ev] = enter(g, c, right, st);
    expect(ev.placed).toEqual({ cell: c, digit: right });
  });
  it('auto-clears notes in the peers and undo/redo restore them exactly', () => {
    let g = fresh();
    const c = empty(g), d = solutionAt(g, c);
    const peer = UNITS[Math.floor(c / 9)].find(i => i !== c && g.values[i] === 0)!;
    [g] = toggleNote(g, peer, d);
    [g] = toggleNote(g, peer, d === 1 ? 2 : 1);
    const before = g.notes[peer];
    [g] = enter(g, c, d, st);
    expect(g.notes[peer] & bit(d)).toBe(0);
    [g] = undo(g);
    expect(g.notes[peer]).toBe(before);
    [g] = redo(g);
    expect(g.notes[peer] & bit(d)).toBe(0);
    expect(g.values[c]).toBe(d);
  });
  it('erases user digits but never givens', () => {
    let g = fresh();
    const given = g.values.findIndex(v => v > 0);
    let ev; [g, ev] = erase(g, given);
    expect(ev.changed).toBe(false);
    const c = empty(g);
    [g] = enter(g, c, solutionAt(g, c), st);
    [g] = erase(g, c);
    expect(g.values[c]).toBe(0);
  });
  it('ends the game at the mistake limit when it is on', () => {
    let g = fresh();
    const c = empty(g), right = solutionAt(g, c);
    const wrongs = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => d !== right);
    let ev = { lost: false } as { lost?: boolean };
    for (let k = 0; k < MISTAKE_LIMIT; k++) [g, ev] = enter(g, c, wrongs[k], { ...st, limit: true });
    expect(ev.lost).toBe(true);
    expect(g.status).toBe('lost');
  });
  it('wins when the last digit lands, with completed units reported', () => {
    let g = fresh();
    const cells = g.values.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
    let ev;
    for (const c of cells.slice(0, -1)) [g] = enter(g, c, solutionAt(g, c), st);
    const last = cells[cells.length - 1];
    [g, ev] = enter(g, last, solutionAt(g, last), st);
    expect(ev.solved).toBe(true);
    expect(ev.units!.length).toBe(3);
    expect(g.status).toBe('won');
  });
  it('fills candidate notes and flags clashing digits', () => {
    let g = fresh();
    [g] = fillNotes(g);
    const c = empty(g);
    expect(g.notes[c] & bit(solutionAt(g, c))).toBeTruthy();
    const vals: Grid = g.values.slice();
    const c2 = UNITS[0].find(i => vals[i] === 0)!; vals[c2] = vals[0];
    expect(conflicts(vals).has(c2)).toBe(true);
  });
  it('hints point out a wrong digit first, then the next logical step', () => {
    let g = fresh();
    const c = empty(g), right = solutionAt(g, c);
    [g] = enter(g, c, right === 9 ? 1 : right + 1, st);
    expect(findHint(g, -1)).toEqual({ kind: 'wrong', cell: c });
    [g] = erase(g, c);
    const h = findHint(g, -1)!;
    expect(h.kind).toBe('step');
    if (h.kind === 'step') { expect(h.digit).toBe(solutionAt(g, h.cell)); [g] = reveal(g, h.cell, st); expect(g.values[h.cell]).toBe(h.digit); }
  });
});

describe('module + strings', () => {
  it('explains every technique in every complete language', () => {
    const seen = new Set<string>();
    for (const seed of [31, 32, 33, 34, 35, 36]) {
      const s = logicState(parse(generate('expert', seed).puzzle));
      for (let k = 0; k < 400; k++) {
        const st = nextStep(s);
        if (!st) break;
        if (!seen.has(st.tech)) {
          seen.add(st.tech);
          for (const l of ['en', 'lv', 'ru', 'uk']) {
            const d = describeStep(st, SUDOKU_STRINGS[l]!);
            expect(d.title.length, `${l} ${st.tech}`).toBeGreaterThan(2);
            expect(d.text, `${l} ${st.tech}`).not.toMatch(/undefined|NaN|\[object/);
          }
        }
        applyStep(s, st);
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(6);
  });
  it('registers as a 1-player puzzle with titles in every language', () => {
    expect(sudoku.id).toBe('sudoku');
    expect(sudoku.kind).toBe('puzzle');
    expect(sudoku.players).toEqual({ min: 1, max: 1 });
    for (const l of LANGS) { expect(TITLE[l.id]).toBeTruthy(); expect(TAGLINE[l.id]).toBeTruthy(); }
  });
  it('has complete en / lv / ru / uk and the main buttons in all 17 languages', () => {
    for (const l of ['lv', 'ru', 'uk']) expect(missingKeys(SUDOKU_STRINGS.en, SUDOKU_STRINGS[l])).toEqual([]);
    for (const l of LANGS) {
      const s = SUDOKU_STRINGS[l.id]!;
      expect(s, l.id).toBeTruthy();
      expect(s.title).toBe(TITLE[l.id]);
      for (const k of ['play', 'continue', 'newGame', 'daily', 'classic', 'back', 'next'] as const) expect(s[k]).toBeTruthy();
      if (l.id !== 'en') expect(s.newGame, l.id).not.toBe(SUDOKU_STRINGS.en.newGame);
      for (const lv of LEVELS) expect(s.levels[lv]).toBeTruthy();
    }
  });
});

const GOLDEN: Record<Level, number> = { easy: 198425481, medium: 3037874135, hard: 641544082, expert: 767735873 };
