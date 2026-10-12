import { describe, expect, it } from 'vitest';
import sql from '../../supabase/migration_003_progress.sql?raw';
import { ACCENTS, BACKS, TABLES } from '../theme';
import { SHOP_ROWS, COSMETICS } from '../shop/catalog';
import { ACHIEVEMENTS, detectAchievements } from './achievements';
import { levelForXp, levelProgress, levelReward, xpForLevel } from './levels';
import { newGame, type GameState } from '../engine/engine';

describe('level curve (mirrors SQL)', () => {
  it('matches the documented thresholds', () => {
    expect([1, 2, 3, 4, 5, 10, 20].map(xpForLevel)).toEqual([0, 100, 240, 420, 640, 2340, 8740]);
    const pairs: [number, number][] = [[0, 1], [99, 1], [100, 2], [239, 2], [240, 3], [2339, 9], [2340, 10], [8739, 19], [8740, 20], [1e7, 100]];
    for (const [xp, l] of pairs) expect(levelForXp(xp)).toBe(l);
  });
  it('is monotonic and rewards every 5th level double', () => {
    for (let x = 0; x < 20000; x += 37) expect(levelForXp(x + 37)).toBeGreaterThanOrEqual(levelForXp(x));
    expect(levelReward(4)).toBe(200);
    expect(levelReward(5)).toBe(500);
    expect(levelReward(10)).toBe(1000);
  });
  it('reports progress inside a level', () => {
    expect(levelProgress(170, 2)).toMatchObject({ level: 2, into: 70, need: 140 });
  });
});

describe('catalogue is in sync with the SQL seed', () => {
  it('shop_items rows match', () => {
    const block = sql.slice(sql.indexOf('insert into public.shop_items'), sql.indexOf('on conflict (id)'));
    const rows = [...block.matchAll(/\('([a-z0-9_]+)',\s*'(\w+)',\s*(null|\d+),\s*(null|[\d.]+),\s*(null|\d+),\s*'(\w+)'/g)].map(m => ({
      id: m[1], kind: m[2], price_bm: m[3] === 'null' ? null : Number(m[3]), price_eur: m[4] === 'null' ? null : Number(m[4]),
      grants_bm: m[5] === 'null' ? null : Number(m[5]), rarity: m[6],
    }));
    const sort = <T extends { id: string }>(a: T[]) => [...a].sort((x, y) => x.id.localeCompare(y.id));
    expect(rows.length).toBeGreaterThan(10);
    expect(sort(rows)).toEqual(sort(SHOP_ROWS));
  });
  it('achievement_defs rows match', () => {
    const block = sql.slice(sql.indexOf('insert into public.achievement_defs'), sql.indexOf('on conflict (code)'));
    const rows = [...block.matchAll(/\('([a-z0-9_]+)',\s*(\d+),\s*'(server|client)'/g)].map(m => ({ code: m[1], bm: Number(m[2]), source: m[3] }));
    expect(rows).toEqual(ACHIEVEMENTS.map(a => ({ code: a.code, bm: a.bm, source: a.source })));
  });
  it('every premium theme item is sold, in the right slot, and nothing free is', () => {
    const covered = (id: string, slot: 'accent' | 'table' | 'back') => COSMETICS.some(c => c.id === id && c.slots.includes(slot));
    for (const a of ACCENTS.filter(x => x.premium)) expect(covered(a.id, 'accent')).toBe(true);
    for (const t of TABLES.filter(x => x.premium)) expect(covered(t.id, 'table')).toBe(true);
    for (const b of BACKS.filter(x => x.premium)) expect(covered(b.id, 'back')).toBe(true);
    for (const c of COSMETICS) for (const s of c.slots) {
      const list: { id: string; premium?: boolean }[] = s === 'accent' ? ACCENTS : s === 'table' ? TABLES : BACKS;
      expect(list.find(x => x.id === c.id)?.premium).toBe(true);
    }
  });
});

describe('client achievement detection', () => {
  it('finds jacks finish, exact 125, queen bounce, four kings — only for me', () => {
    const g: GameState = newGame([{ name: 'A', bot: false }, { name: 'B', bot: true }], () => 0.3);
    g.events = [{ t: 'roundEnd', winner: 0, mult: 3 }, { t: 'reset125', p: 0 }, { t: 'transfer', p: 0, target: 1 },
      { t: 'play', p: 0, cards: [{ id: 'KS', r: 'K', s: 'S' }] }, { t: 'kings' }];
    expect(detectAchievements(g, 0).sort()).toEqual(['exact_125', 'four_kings', 'jacks_finish', 'queen_bounce']);
    expect(detectAchievements(g, 1)).toEqual([]);
  });
});
