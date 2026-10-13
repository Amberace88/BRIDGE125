import { describe, expect, it } from 'vitest';
import sql from '../../supabase/migration_003_progress.sql?raw';
import sql8 from '../../supabase/migration_008_cosmetics.sql?raw';
import sql12 from '../../supabase/migration_012_economy.sql?raw';
import sql13 from '../../supabase/migration_013_integration.sql?raw';
import sql14 from '../../supabase/migration_014_daily_referrals.sql?raw';
import sql16 from '../../supabase/migration_016_season.sql?raw';
import sql19 from '../../supabase/migration_019_minigames.sql?raw';
import { SHOP_ROWS, COSMETICS, ALL_SLOTS, slotOptions } from '../shop/catalog';
import { ACHIEVEMENTS, ACH_CATEGORIES, ACH_ITEMS, CLIENT_CODES, COLUMN_STATS, COUNTER_STATS, achProgress, detectAchievements } from './achievements';
import { GAME_STAT_CAPS, GameTracker } from './tracker';
import { levelForXp, levelProgress, levelReward, xpForLevel } from './levels';
import { ACH_STRINGS } from '../i18n/achievements';
import { ACH_COSMETIC_IDS } from '../economy/cosmetics';
import { EARNED_IDS } from '../cosmetics/data';
import { newGame, type Card, type GameEvent, type GameState } from '../engine/engine';

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

/** rows of `insert into public.<table> (...) values ... on conflict` blocks (all of them, in order) */
function insertBlocks(src: string, table: string): string[] {
  const out: string[] = [];
  let i = 0;
  for (;;) {
    const a = src.indexOf(`insert into public.${table}`, i);
    if (a < 0) return out;
    const b = src.indexOf('on conflict', a);
    out.push(src.slice(a, b));
    i = b;
  }
}

describe('catalogue is in sync with the SQL seed', () => {
  it('shop_items rows match (003 seed + 008 seed)', () => {
    const parse = (src: string) => {
      const block = src.slice(src.indexOf('insert into public.shop_items'), src.indexOf('on conflict (id)', src.indexOf('insert into public.shop_items')));
      return [...block.matchAll(/\('([a-z0-9_]+)',\s*'(\w+)',\s*(null|\d+),\s*(null|[\d.]+),\s*(null|\d+),\s*'(\w+)'/g)].map(m => ({
        id: m[1], kind: m[2], price_bm: m[3] === 'null' ? null : Number(m[3]), price_eur: m[4] === 'null' ? null : Number(m[4]),
        grants_bm: m[5] === 'null' ? null : Number(m[5]), rarity: m[6],
      }));
    };
    // 008 upserts over 003; 016 re-prices pass_s1 (Diamonds only) — its season cosmetics are earn-only (src/season tests)
    const merged = new Map([...parse(sql), ...parse(sql8), ...parse(sql16).filter(r => !r.id.startsWith('s1_'))].map(r => [r.id, r]));
    const rows = [...merged.values()];
    const sort = <T extends { id: string }>(a: T[]) => [...a].sort((x, y) => x.id.localeCompare(y.id));
    expect(parse(sql8).length).toBeGreaterThan(50);
    expect(sort(rows)).toEqual(sort(SHOP_ROWS));
  });

  it('achievement_defs: 003 rows keep their BM and source', () => {
    const block = sql.slice(sql.indexOf('insert into public.achievement_defs'), sql.indexOf('on conflict (code)'));
    const rows = [...block.matchAll(/\('([a-z0-9_]+)',\s*(\d+),\s*'(server|client)'/g)].map(m => ({ code: m[1], bm: Number(m[2]), source: m[3] }));
    expect(rows).toHaveLength(14);
    for (const r of rows) expect(ACHIEVEMENTS.find(a => a.code === r.code), r.code).toMatchObject({ bm: r.bm, source: r.source });
  });

  it('achievement_defs: 012 + 019 seeds equal the TS catalogue, field by field', () => {
    const rows = [...insertBlocks(sql12, 'achievement_defs'), ...insertBlocks(sql19, 'achievement_defs')].flatMap(b => [...b.matchAll(
      /\('([a-z0-9_]+)', (\d+), '(server|client)', (\d+), '(\w+)', '(\w+)', (\d+), (\d+), (true|false), (null|'\w+'), (null|\d+), (null|'\w+')\)/g,
    )].map(m => ({
      code: m[1], bm: Number(m[2]), source: m[3], sort: Number(m[4]), cat: m[5], tier: m[6], xp: Number(m[7]), shards: Number(m[8]),
      secret: m[9] === 'true', stat: m[10] === 'null' ? undefined : m[10].slice(1, -1), goal: m[11] === 'null' ? undefined : Number(m[11]),
      item: m[12] === 'null' ? undefined : m[12].slice(1, -1),
    })));
    const ts = ACHIEVEMENTS.map((a, i) => ({ code: a.code, bm: a.bm, source: a.source, sort: i + 1, cat: a.cat, tier: a.tier, xp: a.xp, shards: a.shards,
      secret: !!a.secret, stat: a.goal?.stat, goal: a.goal?.n, item: a.item }));
    expect(rows.sort((x, y) => x.sort - y.sort)).toEqual(ts);
  });

  it('has 60+ achievements, ~12 secrets, every category used, unique codes, valid stats', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(60);
    expect(ACHIEVEMENTS.filter(a => a.secret).length).toBeGreaterThanOrEqual(12);
    expect(new Set(ACHIEVEMENTS.map(a => a.code)).size).toBe(ACHIEVEMENTS.length);
    for (const c of ACH_CATEGORIES) expect(ACHIEVEMENTS.some(a => a.cat === c), c).toBe(true);
    const stats = new Set<string>([...COLUMN_STATS, ...COUNTER_STATS]);
    for (const a of ACHIEVEMENTS) {
      if (a.cat !== 'journey') expect(a.goal && stats.has(a.goal.stat), a.code).toBe(true);
      expect(a.code.startsWith('journey_')).toBe(a.cat === 'journey');
    }
    // every per-game counter the tracker sends is clamped the same way server-side
    for (const [k, cap] of Object.entries(GAME_STAT_CAPS)) expect(sql12, k).toMatch(new RegExp(`"${k}":${cap}[,}]`));
  });

  it('new cosmetic rewards are seeded in shop_items (not for sale) and listed for the cosmetics module', () => {
    for (const id of ACH_ITEMS) {
      expect(sql12, id).toMatch(new RegExp(`\\('${id}',\\s*'\\w+',\\s*null`));
      expect(ACH_COSMETIC_IDS, id).toContain(id);
    }
  });

  it('every premium item is sold, in the right slot, and nothing free is', () => {
    for (const slot of ALL_SLOTS) for (const o of slotOptions(slot).filter(x => x.premium && !EARNED_IDS.has(x.id))) {
      expect(COSMETICS.some(c => c.id === o.id && c.slots.includes(slot)), `${slot}:${o.id}`).toBe(true);
    }
    for (const c of COSMETICS) for (const s of c.slots) expect(slotOptions(s).find(x => x.id === c.id)?.premium, `${s}:${c.id}`).toBe(true);
  });

  it('earned-only cosmetics are premium, never sold, and guarded by shop_items (price_bm null)', () => {
    for (const id of EARNED_IDS) {
      const slot = ALL_SLOTS.find(sl => slotOptions(sl).some(o => o.id === id));
      expect(slot, id).toBeTruthy();
      expect(slotOptions(slot!).find(o => o.id === id)?.premium, id).toBe(true);
      expect(COSMETICS.some(c => c.id === id), id).toBe(false);
      expect(sql12 + sql13 + sql14 + sql16, id).toMatch(new RegExp(`\\('${id}',\\s*'\\w+',\\s*null`));
    }
    for (const id of ACH_COSMETIC_IDS) expect(EARNED_IDS.has(id), id).toBe(true);
  });
});

describe('achievement strings', () => {
  it('every language names every achievement; secrets have hints', () => {
    for (const lang of ['en', 'lv', 'ru', 'uk']) {
      const S = ACH_STRINGS[lang]!;
      for (const a of ACHIEVEMENTS) {
        expect(S.list[a.code]?.name, `${lang} ${a.code}`).toBeTruthy();
        expect(S.list[a.code]?.desc, `${lang} ${a.code}`).toBeTruthy();
        if (a.secret) expect(S.list[a.code]?.hint, `${lang} ${a.code} hint`).toBeTruthy();
      }
      for (const id of ACH_COSMETIC_IDS) expect(S.items[id], `${lang} ${id}`).toBeTruthy();
      for (const c of ACH_CATEGORIES) expect(S.cats[c]).toBeTruthy();
    }
  });
});

describe('progress helper', () => {
  it('reports 7/10 style progress and caps at the goal', () => {
    const a = ACHIEVEMENTS.find(x => x.code === 'games_10')!;
    expect(achProgress(a, { games_played: 7 }, false)).toEqual({ cur: 7, n: 10, pct: 0.7 });
    expect(achProgress(a, { games_played: 70 }, false).cur).toBe(10);
    expect(achProgress(a, null, true).pct).toBe(1);
  });
});

/* ------------------------------------------------------------------ detection */

const C = (id: string): Card => ({ id, r: id.slice(0, -1) as Card['r'], s: id.slice(-1) as Card['s'] });
/** a synthetic successor state: same game, next seq, given events (+ patch) */
function next(prev: GameState, events: GameEvent[], patch: Partial<GameState> = {}): GameState {
  return { ...structuredClone(prev), ...patch, events, seq: prev.seq + 1 };
}

describe('client achievement detection', () => {
  it('one-state detector: jacks finish, exact 125, queen bounce, four kings — only for me', () => {
    const g: GameState = newGame([{ name: 'A', bot: false }, { name: 'B', bot: true }], () => 0.3);
    g.events = [{ t: 'roundEnd', winner: 0, mult: 3 }, { t: 'reset125', p: 0 }, { t: 'transfer', p: 0, target: 1 },
      { t: 'play', p: 0, cards: [{ id: 'KS', r: 'K', s: 'S' }] }, { t: 'kings' }];
    expect(detectAchievements(g, 0).sort()).toEqual(['exact_125', 'four_kings', 'jacks_finish', 'queen_bounce']);
    expect(detectAchievements(g, 1)).toEqual([]);
  });

  it('only reports whitelisted client codes', () => {
    const t = new GameTracker(0);
    const g0 = newGame([{ name: 'A', bot: false }, { name: 'B', bot: true }], () => 0.4);
    t.step(null, g0);
    let g = g0, all: string[] = [];
    const evs: GameEvent[][] = [
      [{ t: 'play', p: 0, cards: [C('8S')] }, { t: 'eight', target: 1, amount: 8 }],
      [{ t: 'play', p: 0, cards: [C('7S'), C('7C'), C('7H'), C('7D')] }],
      [{ t: 'draw', p: 0, n: 10, forced: true }],
      [{ t: 'roundEnd', winner: 0, mult: 5 }],
    ];
    for (const e of evs) { const n = next(g, e); all = all.concat(t.step(g, n)); g = n; }
    for (const c of all) expect(CLIENT_CODES, c).toContain(c);
    expect(all).toEqual(expect.arrayContaining(['eight_chain_3', 'eight_chain_4', 's_quad', 's_lucky7', 's_avalanche', 'jacks_finish', 'jacks_x3', 'jacks_x4', 'jacks_x5']));
  });

  it('GameTracker counts a whole game and clamps the counters', () => {
    const t = new GameTracker(0, 'bots');
    const g0 = newGame([{ name: 'Me', bot: false }, { name: 'Bot', bot: true }], () => 0.2);
    expect(t.step(null, g0)).toEqual([]);
    let g = g0;
    const go = (events: GameEvent[], patch: Partial<GameState> = {}) => { const n = next(g, events, patch); const out = t.step(g, n); g = n; return out; };

    // I hit the bot with Q♠ (counts once), then the bot passes one back with 6♠ and I take 6
    expect(go([{ t: 'play', p: 0, cards: [C('QS')] }, { t: 'queen', target: 1 }])).toEqual([]);
    go([{ t: 'play', p: 1, cards: [C('6S')] }, { t: 'transfer', p: 1, target: 0 }], { pending: { kind: 'queen6', amount: 6 }, current: 0 });
    go([{ t: 'draw', p: 0, n: 6, forced: true }, { t: 'mustCover', p: 0 }], { pending: null });
    // I counter a Q♠ myself
    g = { ...g, pending: { kind: 'queen', amount: 5 }, current: 0 };
    expect(go([{ t: 'play', p: 0, cards: [C('6S')] }, { t: 'transfer', p: 0, target: 1 }])).toEqual(['queen_bounce']);
    // four kings while I sit on 100+
    g = { ...g, players: g.players.map((p, i) => (i === 0 ? { ...p, score: 110 } : p)) };
    expect(go([{ t: 'play', p: 0, cards: [C('KS')] }, { t: 'kings' }]).sort()).toEqual(['four_kings', 's_regicide']);
    // burned to zero twice
    go([{ t: 'reset125', p: 0 }, { t: 'roundEnd', winner: 1, mult: 1 }]);
    expect(go([{ t: 'reset125', p: 0 }, { t: 'roundEnd', winner: 1, mult: 1 }])).toEqual(['s_phoenix']);
    // a new round I win without drawing, going out with the Q♠
    g = { ...g, round: g.round + 1 };
    expect(go([{ t: 'play', p: 0, cards: [C('QS')] }, { t: 'roundEnd', winner: 0, mult: 1 }]).sort()).toEqual(['s_ghost', 's_queen_finish']);
    // a comeback (I had 120+), game over with 0 points, at 1 a.m.
    g = { ...g, players: g.players.map((p, i) => (i === 0 ? { ...p, score: 122 } : p)) };
    const over = next(g, [{ t: 'gameOver', winners: [0] }], { phase: 'gameOver', winners: [0], players: g.players.map((p, i) => (i === 0 ? { ...p, score: 0 } : { ...p, score: 131 })) });
    const fin = t.step(g, over, new Date(2026, 9, 13, 1, 0));
    expect(fin.sort()).toEqual(['comeback', 's_midnight', 'zero_win']);
    expect(t.finished).toBe(true);
    const s = t.stats();
    expect(s).toMatchObject({ won: true, mode: 'bots', qs_played: 1, qs_taken: 1, qs_countered: 1, kings: 1, kings_high: 1, exact125: 2, double_reset: 1,
      rounds_won: 1, clean_round: 1, queen_finish: 1, comeback: 1, zero_win: 1, midnight: 1 });
    // nothing after game over, and never twice
    expect(t.step(over, next(over, [{ t: 'reset125', p: 0 }]))).toEqual([]);
  });

  it('counts bluffs: caught by me, and my own bluff standing', () => {
    const t = new GameTracker(0, 'online');
    const g0 = newGame([{ name: 'Me', bot: false }, { name: 'Ann', bot: false }], () => 0.6, { bluff: true });
    t.step(null, g0);
    const prevTop = g0.pile[0];
    // my illegal play is open for a challenge …
    const open = next(g0, [{ t: 'play', p: 0, cards: [C('9H')] }], { lastPlay: { by: 0, cards: [C('9H')], final: [C('9H')], wasLegal: false, prevTop, prevSuit: 'S' } });
    t.step(g0, open);
    // … and the window closes without one
    const closed = next(open, [{ t: 'play', p: 1, cards: [C('9D')] }], { lastPlay: { by: 1, cards: [C('9D')], final: [C('9D')], wasLegal: false, prevTop: C('9H'), prevSuit: 'H' } });
    t.step(open, closed);
    // I catch Ann
    const caught = next(closed, [{ t: 'bluffCaught', p: 1, by: 0, cards: [C('9D')] }], { lastPlay: null });
    expect(t.step(closed, caught)).toEqual(['s_liar']);
    expect(t.stats()).toMatchObject({ bluff_ok: 1, bluff_caught: 1, liar: 1 });
  });

  it("a caught bluff is not a successful one, and other players' events never count", () => {
    const t = new GameTracker(1);
    const g0 = newGame([{ name: 'A', bot: true }, { name: 'Me', bot: false }], () => 0.6, { bluff: true });
    t.step(null, g0);
    const open = next(g0, [{ t: 'play', p: 1, cards: [C('9H')] }], { lastPlay: { by: 1, cards: [C('9H')], final: [C('9H')], wasLegal: false, prevTop: g0.pile[0], prevSuit: 'S' } });
    t.step(g0, open);
    const caught = next(open, [{ t: 'bluffCaught', p: 1, by: 0, cards: [C('9H')] }, { t: 'kings' }, { t: 'play', p: 0, cards: [C('KS')] }, { t: 'reset125', p: 0 }], { lastPlay: null });
    expect(t.step(open, caught)).toEqual([]);
    expect(t.stats()).toMatchObject({ bluff_ok: 0, bluff_caught: 0, kings: 0, exact125: 0 });
  });

  it('runs over real engine games without throwing and respects the caps', async () => {
    const { apply } = await import('../engine/engine');
    const { botAction } = await import('../engine/bot');
    let seed = 7;
    const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let n = 0; n < 6; n++) {
      let g = newGame([{ name: 'Me', bot: true }, { name: 'B', bot: true }, { name: 'C', bot: true }], rng, { bluff: n % 2 === 1 });
      const t = new GameTracker(0);
      t.step(null, g);
      for (let i = 0; i < 4000 && g.phase !== 'gameOver'; i++) {
        let nx: GameState;
        if (g.phase === 'roundOver') { const { nextRound } = await import('../engine/engine'); nx = nextRound(g, rng); }
        else { const a = botAction(g, g.current, 'normal'); nx = apply(g, g.current, a, rng); if (nx === g) nx = apply(g, g.current, { type: 'draw' }, rng); if (nx === g) nx = apply(g, g.current, { type: 'pass' }, rng); }
        if (nx === g) break;
        for (const c of t.step(g, nx)) expect(CLIENT_CODES).toContain(c);
        g = nx;
      }
      const s = t.stats();
      for (const [k, cap] of Object.entries(GAME_STAT_CAPS)) expect((s as unknown as Record<string, number>)[k]).toBeLessThanOrEqual(cap);
    }
  });
});
