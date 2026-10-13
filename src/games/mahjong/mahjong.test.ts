import { describe, expect, it } from 'vitest';
import { FACES, FLOWER0, SEASON0, fullPairs, fullSet, matchKey, matches, pairUp, rankOf, suitOf } from './core/tiles';
import { LAYOUT_IDS, DAILY_LAYOUTS, layoutOf, type Pos } from './core/layouts';
import { availablePairs, geoOf, geoOfPositions, isFree } from './core/board';
import { deal, placementOrder, reshuffle } from './core/generate';
import { planWorks, solve } from './core/solver';
import { addDays, dailyLayout, dailyNo, dailySeed, rigaDay, streakOf } from './core/daily';
import { canMatch, giveUp, hintFor, hintMove, isGame, match, newGame, restartGame, shuffleGame, shufflesLeft, takeHint, undo, SHUFFLES } from './core/game';
import { COMBO_MAX, COMBO_MS, finalScore, matchPoints, nextCombo, clearBonus } from './core/score';
import { rng } from './core/rng';
import { MAHJONG_STRINGS } from './strings';
import { TITLE, TAGLINE } from './meta';
import { mahjong } from './index';

const LANGS = ['en', 'lv', 'ru', 'uk', 'lt', 'et', 'pl', 'de', 'be', 'kk', 'uz', 'az', 'ka', 'hy', 'ro', 'bg', 'es'];

/** Play a deal's own solution and check every step was legal. */
function playSolution(id: (typeof LAYOUT_IDS)[number], faces: number[], solution: [number, number][]) {
  const geo = geoOf(id);
  const f = faces.slice();
  for (const [a, b] of solution) {
    expect(isFree(geo, f, a) && isFree(geo, f, b), `${id}: ${a},${b} free`).toBe(true);
    expect(matches(f[a], f[b]), `${id}: ${f[a]} ~ ${f[b]}`).toBe(true);
    f[a] = -1; f[b] = -1;
  }
  expect(f.every(x => x === -1)).toBe(true);
}

describe('tile set', () => {
  it('has 144 tiles of 42 faces: 34 × 4 plus 8 single flowers and seasons', () => {
    const set = fullSet();
    expect(set).toHaveLength(144);
    const count = new Map<number, number>();
    for (const f of set) count.set(f, (count.get(f) ?? 0) + 1);
    expect(count.size).toBe(FACES);
    for (let f = 0; f < FLOWER0; f++) expect(count.get(f)).toBe(4);
    for (let f = FLOWER0; f < FACES; f++) expect(count.get(f)).toBe(1);
    expect(fullPairs()).toHaveLength(72);
    expect(fullPairs().flat().sort((a, b) => a - b)).toEqual(set.slice().sort((a, b) => a - b));
  });

  it('suits and ranks', () => {
    expect([suitOf(0), suitOf(9), suitOf(18), suitOf(27), suitOf(31), suitOf(34), suitOf(38)]).toEqual(['dots', 'bamboo', 'chars', 'wind', 'dragon', 'flower', 'season']);
    expect([rankOf(0), rankOf(8), rankOf(17), rankOf(26), rankOf(30), rankOf(33), rankOf(37), rankOf(41)]).toEqual([1, 9, 9, 9, 4, 3, 4, 4]);
  });

  it('identical faces match; any flower matches any flower, any season any season — never across', () => {
    expect(matches(5, 5)).toBe(true);
    expect(matches(5, 6)).toBe(false);
    expect(matches(5, 14)).toBe(false); // 6 dots vs 6 bamboo
    for (let a = FLOWER0; a < SEASON0; a++) for (let b = FLOWER0; b < SEASON0; b++) expect(matches(a, b)).toBe(true);
    for (let a = SEASON0; a < FACES; a++) for (let b = SEASON0; b < FACES; b++) expect(matches(a, b)).toBe(true);
    expect(matches(FLOWER0, SEASON0)).toBe(false);
    expect(matches(33, FLOWER0)).toBe(false);
    expect(matches(-1, -1)).toBe(false);
    expect(matchKey(FLOWER0 + 3)).toBe(FLOWER0);
    expect(pairUp([FLOWER0, SEASON0 + 2, FLOWER0 + 3, SEASON0, 4, 4])).toHaveLength(3);
    expect(pairUp([1, 2])).toBeNull();
  });
});

describe('free tiles', () => {
  // a row of three, one tile on the middle, one tile beside the row at a half-row offset
  const pos: Pos[] = [
    { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 4, y: 0, z: 0 },
    { x: 2, y: 0, z: 1 },
    { x: 6, y: 1, z: 0 },
  ];
  const geo = geoOfPositions('turtle', pos);

  it('a tile is free when nothing lies on it and its left or right side is open', () => {
    const f = [0, 1, 2, 3, 4];
    expect(isFree(geo, f, 0)).toBe(true);   // left open
    expect(isFree(geo, f, 1)).toBe(false);  // covered (and both sides taken)
    expect(isFree(geo, f, 2)).toBe(false);  // left taken, right taken by the half-offset tile
    expect(isFree(geo, f, 3)).toBe(true);   // on top, nothing beside it
    expect(isFree(geo, f, 4)).toBe(true);   // right open
  });

  it('removing neighbours frees tiles', () => {
    const f = [0, 1, 2, -1, 4];
    expect(isFree(geo, f, 1)).toBe(false);  // uncovered but boxed in left and right
    f[0] = -1;
    expect(isFree(geo, f, 1)).toBe(true);
    f[4] = -1;
    expect(isFree(geo, f, 2)).toBe(true);
    expect(isFree(geo, f, 0)).toBe(false);  // removed tiles are never free
  });

  it('the classic turtle: 144 tiles; at the start only the ends and the top are free', () => {
    const t = geoOf('turtle');
    expect(t.pos).toHaveLength(144);
    const all = new Array(144).fill(0);
    const free = t.pos.map((_, i) => i).filter(i => isFree(t, all, i));
    // the top tile, the far ends, the open sides of the upper layers — never a covered tile
    expect(free.some(i => t.pos[i].z === 4)).toBe(true);
    expect(free.every(i => t.above[i].length === 0)).toBe(true);
    expect(free.length).toBeGreaterThanOrEqual(10);
    expect(free.length).toBeLessThan(40);
  });

  it('every layout: an even number of tiles, every upper tile rests on something, nothing overlaps on a layer', () => {
    for (const id of LAYOUT_IDS) {
      const g = geoOf(id);
      expect(g.pos.length % 2, id).toBe(0);
      expect(g.pos.length, id).toBeLessThanOrEqual(144);
      g.pos.forEach((p, i) => { if (p.z > 0) expect(g.below[i].length, `${id} #${i}`).toBeGreaterThan(0); });
      for (let i = 0; i < g.pos.length; i++) for (let j = i + 1; j < g.pos.length; j++) {
        const a = g.pos[i], b = g.pos[j];
        expect(a.z === b.z && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2, `${id} ${i}/${j}`).toBe(false);
      }
    }
    expect(layoutOf('turtle')).toHaveLength(144);
  });
});

describe('solvable deals', () => {
  it('every layout deals a solvable board, over many seeds (its own solution plays out)', () => {
    for (const id of LAYOUT_IDS) {
      for (let s = 1; s <= 25; s++) {
        const d = deal(id, s * 2654435761);
        const n = layoutOf(id).length;
        expect(d.faces).toHaveLength(n);
        expect(d.faces.every(f => f >= 0 && f < FACES)).toBe(true);
        expect(d.solution).toHaveLength(n / 2);
        playSolution(id, d.faces, d.solution);
      }
    }
  });

  it('a 144-tile layout uses the whole set exactly once', () => {
    const d = deal('turtle', 42);
    expect(d.faces.slice().sort((a, b) => a - b)).toEqual(fullSet().sort((a, b) => a - b));
  });

  it('the solver finds a solution from a fresh deal and proves a dead end', () => {
    for (const id of ['pagoda', 'pyramid'] as const) {
      const d = deal(id, 777);
      const r = solve(geoOf(id), d.faces, 400000);
      expect(r.moves, id).not.toBeNull();
      playSolution(id, d.faces, r.moves!);
    }
    // the last two of a key, one on top of the other: no way out
    const geo = geoOfPositions('pagoda', [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }]);
    expect(solve(geo, [7, 7]).moves).toBeNull();
    expect(solve(geo, [7, 7]).exhausted).toBe(false);
  });

  it('the plan follows the player: hints always point at a move that still clears the board', () => {
    for (const id of LAYOUT_IDS) {
      let g = newGame('free', id, 31337);
      const geo = geoOf(id);
      expect(planWorks(geo, g.faces, g.plan!)).toBe(true);
      // play off-plan: always take the LAST available pair, as long as the plan can be kept
      for (let step = 0; step < 12; step++) {
        const moves = availablePairs(geo, g.faces);
        const [a, b] = moves[moves.length - 1];
        g = match(g, a, b, step * 10000)!.game;
        if (!g.plan) break;
        expect(planWorks(geo, g.faces, g.plan), `${id} step ${step}`).toBe(true);
      }
      const h = hintFor(g, 20000);
      if (h?.plan) {
        expect(canMatch(g, h.pair[0], h.pair[1])).toBe(true);
        expect(planWorks(geo, g.faces, h.plan)).toBe(true);
      }
    }
  });

  it('a mid-game shuffle keeps the same tiles and stays solvable', () => {
    const geo = geoOf('turtle');
    const d = deal('turtle', 9);
    const f = d.faces.slice();
    for (const [a, b] of d.solution.slice(0, 30)) { f[a] = -1; f[b] = -1; }
    const r = reshuffle(geo, f, 1234);
    expect(r.solvable).toBe(true);
    expect(r.faces.map(x => x >= 0)).toEqual(f.map(x => x >= 0));
    expect(r.faces.filter(x => x >= 0).sort((a, b) => a - b)).toEqual(f.filter(x => x >= 0).sort((a, b) => a - b));
    playSolution('turtle', r.faces, r.solution);
  });

  it('a shuffle of an impossible remainder (two stacked tiles) says so', () => {
    const pos: Pos[] = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }];
    const geo = geoOfPositions('pagoda', pos);
    expect(placementOrder(geo, [true, true], rng(1), 5)).toBeNull();
    expect(reshuffle(geo, [3, 3], 1).solvable).toBe(false);
  });
});

describe('daily', () => {
  it('one board per Riga day, the same for everyone', () => {
    const day = '2026-10-13';
    expect(dailySeed(day)).toBe(dailySeed(day));
    expect(DAILY_LAYOUTS).toContain(dailyLayout(day));
    const a = newGame('daily', dailyLayout(day), dailySeed(day), day);
    const b = newGame('daily', dailyLayout(day), dailySeed(day), day);
    expect(a.faces).toEqual(b.faces);
    expect(a.key).toBe('daily:2026-10-13');
    expect(dailySeed(addDays(day, 1))).not.toBe(dailySeed(day));
    const layouts = new Set(Array.from({ length: 30 }, (_, i) => dailyLayout(addDays(day, i))));
    expect(layouts.size).toBeGreaterThan(2);
  });

  it('Riga days, numbers and streaks', () => {
    expect(rigaDay(new Date('2026-10-12T21:30:00Z'))).toBe('2026-10-13'); // 00:30 in Riga (UTC+3)
    expect(rigaDay(new Date('2026-12-31T21:59:00Z'))).toBe('2026-12-31'); // 23:59 in Riga (UTC+2)
    expect(dailyNo('2026-10-13')).toBe(1);
    expect(dailyNo('2026-11-12')).toBe(31);
    expect(streakOf(['2026-10-11', '2026-10-12'], '2026-10-13')).toBe(2);
    expect(streakOf(['2026-10-11', '2026-10-13'], '2026-10-13')).toBe(1);
  });
});

describe('game + scoring', () => {
  it('combos: fast consecutive matches climb, a pause resets', () => {
    expect(nextCombo(0, null)).toBe(1);
    expect(nextCombo(1, 1000)).toBe(2);
    expect(nextCombo(3, COMBO_MS)).toBe(4);
    expect(nextCombo(3, COMBO_MS + 1)).toBe(1);
    expect(nextCombo(COMBO_MAX, 10)).toBe(COMBO_MAX);
    expect(matchPoints(1)).toBe(10);
    expect(matchPoints(3)).toBe(20);
    expect(matchPoints(99)).toBe(matchPoints(COMBO_MAX));
  });

  it('final score: clear bonus + time under par, nothing extra when unsolved', () => {
    expect(finalScore({ score: 900, tiles: 144, seconds: 600, won: true })).toBe(900 + 720 + 240);
    expect(finalScore({ score: 900, tiles: 144, seconds: 2000, won: true })).toBe(900 + 720);
    expect(finalScore({ score: 300, tiles: 144, seconds: 100, won: false })).toBe(300);
    expect(clearBonus({ score: 0, tiles: 90, seconds: 0, won: true })).toEqual({ clear: 450, time: 900 });
  });

  it('matching, combos, undo, hints, shuffles and the win', () => {
    let g = newGame('free', 'pagoda', 5);
    const d = deal('pagoda', 5);
    const [a, b] = d.solution[0];
    expect(canMatch(g, a, a)).toBe(false);
    const r1 = match(g, a, b, 1000)!;
    expect(r1.points).toBe(10);
    g = r1.game;
    const [c, e] = d.solution[1];
    const r2 = match(g, c, e, 3000)!;
    expect(r2.combo).toBe(2);
    expect(r2.game.score).toBe(10 + 15);
    g = undo(r2.game)!;
    expect(g.score).toBe(10);
    expect(g.faces[c]).toBeGreaterThanOrEqual(0);
    expect(g.combo).toBe(0);
    expect(g.undos).toBe(1);
    const h = hintMove(g)!;
    expect(canMatch(g, h[0], h[1])).toBe(true);
    g = takeHint(g);
    expect(g.hints).toBe(1);
    expect(g.score).toBe(0);
    for (let i = 0; i < SHUFFLES; i++) g = shuffleGame(g, 100 + i)!.game;
    expect(shufflesLeft(g)).toBe(0);
    expect(shuffleGame(g, 1)).toBeNull();
    expect(undo(g)).toBeNull(); // no undo across a shuffle
    // clear the rest by solving from here
    const sol = solve(geoOf('pagoda'), g.faces, 200000).moves!;
    let t = 10000;
    for (const [x, y] of sol) { const r = match(g, x, y, (t += 9000))!; expect(r).not.toBeNull(); g = r.game; }
    expect(g.status).toBe('won');
    expect(isGame(JSON.parse(JSON.stringify(g)))).toBe(true);
    expect(restartGame(g).faces).toEqual(g.start);
    expect(giveUp(newGame('free', 'pagoda', 1)).status).toBe('lost');
    expect(isGame({ ...g, faces: [1, 2] })).toBe(false);
  });

  it('no moves: an empty list of available pairs', () => {
    const g = newGame('free', 'pyramid', 3);
    expect(availablePairs(geoOf('pyramid'), g.faces.map(() => -1))).toEqual([]);
  });
});

describe('module + strings', () => {
  it('is a daily solo puzzle with titles in all 17 languages', () => {
    expect(mahjong).toMatchObject({ id: 'mahjong', kind: 'puzzle', daily: true, players: { min: 1, max: 1 } });
    for (const l of LANGS) { expect(TITLE[l as 'en'], l).toBeTruthy(); expect(TAGLINE[l as 'en'], l).toBeTruthy(); }
  });

  it('en / lv / ru / uk are complete; every language has strings for every layout', () => {
    const keys = (o: unknown, p = ''): string[] => (o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => keys(v, p + k + '.')) : [p]);
    const en = keys(MAHJONG_STRINGS.en).sort();
    for (const l of ['lv', 'ru', 'uk']) expect(keys(MAHJONG_STRINGS[l]).sort(), l).toEqual(en);
    for (const l of LANGS) {
      const s = MAHJONG_STRINGS[l]!;
      expect(s.title, l).toBe(TITLE[l as 'en']);
      for (const id of LAYOUT_IDS) expect(s.layouts[id], `${l} ${id}`).toBeTruthy();
      expect(s.combo(3)).toContain('3');
    }
  });
});
