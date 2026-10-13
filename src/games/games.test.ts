import { describe, expect, it } from 'vitest';
import { lazy } from 'react';
import sql from '../../supabase/migration_019_minigames.sql?raw';
import sql22a from '../../supabase/migration_022a_thousand.sql?raw';
import sql22b from '../../supabase/migration_022b_mahjong.sql?raw';
import sql22c from '../../supabase/migration_022c_freecell.sql?raw';
import { BRIDGE_WIN, LEVEL_MULT, MINIGAME_DEFS, rewardFor } from './rewards';
import { GAME_QUEST_DEFS, QUEST_DEFS, isGameMetric } from '../campaign/quests';
import { QUEST_STRINGS } from '../i18n/journey';
import { GAMES_STRINGS } from '../i18n/games';
import { ACHIEVEMENTS } from '../progress/achievements';
import { ACH_STRINGS } from '../i18n/achievements';
import { GAMES } from './registry';
import type { GameModule } from './types';
import { clock, fmtNum, hubGames, textOf } from './hub/order';
import { foldResult, liveStats } from './useGameStats';
import { GAMES_WORD } from './hub/GamesDockBtn';
import type { FeaturePack } from '../i18n/locales/types';

const block = (table: string, conflict: string) => {
  const a = sql.indexOf(`insert into public.${table}`);
  return sql.slice(a, sql.indexOf(conflict, a));
};

describe('migration 019 ↔ client mirrors', () => {
  it('minigames seed equals MINIGAME_DEFS', () => {
    const rows = [...block('minigames', 'on conflict (id)').matchAll(
      /\('([a-z0-9-]+)',\s*'(\w+)',\s*(true|false),\s*(true|false),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*\d+\)/g,
    )].map(m => ({
      id: m[1], kind: m[2], hasDaily: m[4] === 'true', winBm: +m[5], winXp: +m[6], lossBm: +m[7], lossXp: +m[8],
      dailyBm: +m[9], dailyXp: +m[10], minSeconds: +m[11], dailyCap: +m[12], maxScore: +m[13],
    }));
    const later = [sql22a, sql22b, sql22c].flatMap(src => [...src.matchAll(
      /\('([a-z0-9-]+)',\s*'(\w+)',\s*(true|false),\s*(true|false),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*\d+\)/g,
    )].map(m => ({
      id: m[1], kind: m[2], hasDaily: m[4] === 'true', winBm: +m[5], winXp: +m[6], lossBm: +m[7], lossXp: +m[8],
      dailyBm: +m[9], dailyXp: +m[10], minSeconds: +m[11], dailyCap: +m[12], maxScore: +m[13],
    })));
    expect([...rows, ...later]).toEqual(MINIGAME_DEFS);
  });

  it('game quest defs equal GAME_QUEST_DEFS and stay out of the Bridge pool', () => {
    const rows = [...block('quest_defs', 'on conflict (id)').matchAll(/\('(\w+)',\s*'(daily|weekly)',\s*'(\w+)',\s*(\d+),\s*(\d+),\s*(\d+),\s*true,\s*\d+,\s*'([\w-]+)'\)/g)]
      .map(m => ({ id: m[1], kind: m[2], metric: m[3], goal: +m[4], bm: +m[5], xp: +m[6], game: m[7] }));
    expect(rows).toEqual(GAME_QUEST_DEFS);
    for (const q of GAME_QUEST_DEFS) {
      expect(isGameMetric(q.metric)).toBe(true);
      expect(QUEST_DEFS.some(b => b.id === q.id)).toBe(false);
      expect(q.game === 'any' || MINIGAME_DEFS.some(d => d.id === q.game), q.id).toBe(true);
      // the server names metrics mg_<game>_win / mg_<game>_daily / mg_games
      expect(q.metric === 'mg_games' || q.metric.startsWith(`mg_${q.game}_`), q.id).toBe(true);
    }
  });

  it('the games medals use counters record_minigame writes', () => {
    const games = ACHIEVEMENTS.filter(a => a.cat === 'games');
    expect(games.length).toBeGreaterThanOrEqual(6);
    for (const a of games) {
      const k = a.goal!.stat;
      const written = ['mg_games', 'mg_dailies', 'mg_daily_streak', 'mg_variety'].includes(k)
        || /^mg_([a-z0-9-]+)_(wins|streak)$/.test(k) && MINIGAME_DEFS.some(d => k === `mg_${d.id}_wins` || k === `mg_${d.id}_streak`);
      expect(written, a.code).toBe(true);
    }
  });
});

describe('Bridge stays the best-paying game', () => {
  it('no mini game pays more than a Bridge game, at any level', () => {
    const top = Math.max(...Object.values(LEVEL_MULT));
    for (const d of MINIGAME_DEFS) {
      expect(Math.round(d.winBm * top), d.id).toBeLessThan(BRIDGE_WIN.bm);
      expect(Math.round(d.winXp * top), d.id).toBeLessThan(BRIDGE_WIN.xp);
      expect(d.lossBm).toBeLessThan(10);
      expect(d.dailyCap).toBeLessThanOrEqual(30);
    }
    // and the database enforces it for games an admin adds later
    expect(sql).toMatch(/win_bm\s+int not null check \(win_bm >= 0 and win_bm \* 3 \/ 2 < 100\)/);
    expect(sql).toMatch(/win_xp\s+int not null check \(win_xp >= 0 and win_xp \* 3 \/ 2 < 85\)/);
  });

  it('rewardFor follows the table in the migration header', () => {
    expect(rewardFor('zole', true)).toEqual({ bm: 40, xp: 30 });
    expect(rewardFor('zole', true, 'expert')).toEqual({ bm: 60, xp: 45 });
    expect(rewardFor('zole', true, 'easy')).toEqual({ bm: 30, xp: 23 });
    expect(rewardFor('durak', true, 'hard')).toEqual({ bm: 44, xp: 31 });
    expect(rewardFor('sudoku', true, 'weird-level')).toEqual({ bm: 30, xp: 20 });
    expect(rewardFor('zole', false, 'expert')).toEqual({ bm: 5, xp: 8 });
    expect(rewardFor('solitaire', false)).toEqual({ bm: 0, xp: 5 });
    expect(rewardFor('chess', true)).toBeNull();
  });
});

describe('strings', () => {
  it('game quests and medals are named in en / lv / ru / uk', () => {
    for (const l of ['en', 'lv', 'ru', 'uk']) {
      const q = QUEST_STRINGS[l]!;
      for (const d of GAME_QUEST_DEFS) {
        expect(q.names[d.id], `${l} ${d.id}`).toBeTruthy();
        for (const n of [1, 2, 3, 5, 21]) expect(q.desc[d.metric](n)).not.toMatch(/undefined|NaN/);
      }
      const a = ACH_STRINGS[l]!;
      expect(a.cats.games).toBeTruthy();
      for (const x of ACHIEVEMENTS.filter(x => x.cat === 'games')) expect(a.list[x.code]?.name, `${l} ${x.code}`).toBeTruthy();
      expect(GAMES_STRINGS[l]!.result.shareText('Zole', '1 250')).toContain('1 250');
    }
  });

  it('Home’s inlined "Games" word is the hub title in every language', async () => {
    const packs = import.meta.glob<{ default: FeaturePack }>(['../i18n/locales/*.ts', '!../i18n/locales/index.ts', '!../i18n/locales/types.ts', '!../i18n/locales/*.test.ts']);
    for (const [lang, word] of Object.entries(GAMES_WORD)) {
      const title = GAMES_STRINGS[lang]?.title ?? (await packs[`../i18n/locales/${lang}.ts`]()).default.games?.title;
      expect(title, lang).toBe(word);
    }
  });
});

/* ------------------------------------------------------------------ hub (demo modules live only here — never in the registry) */

const Emblem = () => null;
const Screen = lazy(async () => ({ default: () => null }));
const demo = (id: string, extra: Partial<GameModule> = {}): GameModule => ({
  id, kind: 'cards', players: { min: 2, max: 4 }, title: { en: id.toUpperCase(), lv: id + ' (lv)' }, tagline: { en: 'demo' }, Emblem, Screen, ...extra,
});

describe('games hub', () => {
  it('the committed registry has no demo games', () => {
    for (const m of GAMES) expect(m.id).not.toMatch(/demo|test/);
  });

  it('hides hidden games and puts the player’s local classics first, else registry order', () => {
    const mods = [demo('durak', { homeLangs: ['ru', 'uk'] }), demo('solitaire'), demo('zole', { homeLangs: ['lv'] }), demo('secret', { hidden: true }), demo('sudoku', { kind: 'puzzle' })];
    expect(hubGames(mods, 'lv').map(m => m.id)).toEqual(['zole', 'durak', 'solitaire', 'sudoku']);
    expect(hubGames(mods, 'ru').map(m => m.id)).toEqual(['durak', 'solitaire', 'zole', 'sudoku']);
    expect(hubGames(mods, 'de').map(m => m.id)).toEqual(['durak', 'solitaire', 'zole', 'sudoku']);
    expect(textOf(mods[2].title, 'lv')).toBe('zole (lv)');
    expect(textOf(mods[2].title, 'de')).toBe('ZOLE');
  });

  it('formats times and numbers', () => {
    expect(clock(75)).toBe('1:15');
    expect(clock(3725)).toBe('1:02:05');
    expect(clock(null)).toBe('–');
    expect(fmtNum(12500).replace(/\s/g, ' ')).toBe('12 500');
  });

  it('keeps a guest’s record like the server does (bests, day streaks, daily puzzles)', () => {
    let s = foldResult(undefined, { game: 'sudoku', won: true, score: 900, seconds: 400, day: '2026-10-12' }, '2026-10-12');
    expect(s).toMatchObject({ played: 1, won: 1, best_score: 900, best_seconds: 400, streak: 1, dailies: 1, daily_streak: 1, daily_done: true });
    s = foldResult(s, { game: 'sudoku', won: true, score: 700, seconds: 300, day: '2026-10-13' }, '2026-10-13');
    expect(s).toMatchObject({ played: 2, best_score: 900, best_seconds: 300, streak: 2, dailies: 2, daily_streak: 2, win_streak: 2 });
    s = foldResult(s, { game: 'sudoku', won: false, seconds: 100 }, '2026-10-13');
    expect(s).toMatchObject({ played: 3, won: 2, win_streak: 0, best_win_streak: 2, streak: 2 });
    expect(liveStats(s, '2026-10-14').streak).toBe(2);
    expect(liveStats(s, '2026-10-16')).toMatchObject({ streak: 0, daily_streak: 0, daily_done: false });
  });
});
