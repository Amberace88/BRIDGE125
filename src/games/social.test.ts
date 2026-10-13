import { describe, expect, it } from 'vitest';
import sql22 from '../../supabase/migration_022_games_social.sql?raw';
import { compareResults, newSeed, SEED_RE, CODE_RE, challengeUrl, prettyUrl, resultMain } from './challenge/compare';
import { countdown, hallFloor, hallLevel, hallXp, showcase, HALL_PER } from './hub/hall';
import { emptyStats } from './useGameStats';
import { TG_COSMETIC_IDS, TG_ITEMS } from './tournament/cosmetics';
import { FRAME_IDS } from '../cosmetics/AvatarFrame';
import { EARNED_IDS, FRAMES, TITLES } from '../cosmetics/data';
import { MINIGAME_DEFS, LEVEL_MULT, BRIDGE_WIN } from './rewards';
import { GAMES } from './registry';
import type { GameModule } from './types';

const st = (game: string, p: Partial<ReturnType<typeof emptyStats>>) => ({ ...emptyStats(game), ...p });

describe('challenge compare (mirror of _mg_cmp in migration 022)', () => {
  it('a win beats a loss, then score, then (wins) time', () => {
    expect(compareResults({ won: true, seconds: 999 }, { won: false, score: 900, seconds: 10 })).toBe(1);
    expect(compareResults({ won: false, seconds: 10 }, { won: true, seconds: 999 })).toBe(-1);
    expect(compareResults({ won: true, score: 120, seconds: 300 }, { won: true, score: 100, seconds: 100 })).toBe(1);
    expect(compareResults({ won: true, score: 100, seconds: 90 }, { won: true, score: 100, seconds: 100 })).toBe(1);
    expect(compareResults({ won: true, seconds: 161 }, { won: true, seconds: 185 })).toBe(1);
    expect(compareResults({ won: false, seconds: 50 }, { won: false, seconds: 99 })).toBe(0);
    expect(compareResults({ won: true, seconds: 100.2 }, { won: true, seconds: 100 })).toBe(0);
  });
  it('the SQL helper has the same rule order', () => {
    const fn = sql22.slice(sql22.indexOf('function public._mg_cmp'), sql22.indexOf('$fn$;', sql22.indexOf('function public._mg_cmp')));
    const order = ['a_won and not b_won', 'b_won and not a_won', 'a_score <> b_score', 'a_won and a_secs <> b_secs'].map(x => fn.indexOf(x));
    expect(order.every(i => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it('seeds, codes and links', () => {
    for (let i = 0; i < 50; i++) expect(newSeed()).toMatch(SEED_RE);
    expect(new Set(Array.from({ length: 200 }, () => newSeed())).size).toBe(200);
    expect(sql22).toContain(`seed ~ '^[A-Za-z0-9_-]{1,64}$'`);
    expect(sql22).toContain(`code ~ '^[A-Za-z0-9]{6,10}$'`);
    expect('AbC12xY').toMatch(CODE_RE);
    expect(prettyUrl(challengeUrl('AbC12xY'))).toMatch(/\/c\/AbC12xY$/);
    expect(resultMain({ won: true, seconds: 161 })).toBe('2:41');
    expect(resultMain({ won: true, score: 12500, seconds: 161 })).toBe(Number(12500).toLocaleString('fr-FR'));
  });
});

describe('card-room level', () => {
  it('xp from the per-game records', () => {
    expect(hallXp({})).toBe(0);
    const s = { sudoku: st('sudoku', { played: 10, won: 6, dailies: 2, best_streak: 3 }), durak: st('durak', { played: 2, won: 0 }) };
    expect(hallXp(s)).toBe(6 * HALL_PER.win + 4 * HALL_PER.loss + 2 * HALL_PER.daily + 3 * HALL_PER.streak + HALL_PER.variety + 2 * HALL_PER.loss);
  });
  it('levels: 40·(L−1)·L', () => {
    expect(hallLevel(0)).toMatchObject({ level: 1, floor: 0, next: 80, rank: 0 });
    expect(hallLevel(79).level).toBe(1);
    expect(hallLevel(80).level).toBe(2);
    expect(hallLevel(800).level).toBe(5);
    expect(hallLevel(3600)).toMatchObject({ level: 10, rank: 1 });
    for (let x = 0; x < 30000; x += 37) {
      const l = hallLevel(x);
      expect(x >= hallFloor(l.level) && x < hallFloor(l.level + 1)).toBe(true);
      expect(l.pct).toBeGreaterThanOrEqual(0); expect(l.pct).toBeLessThan(1);
    }
    expect(hallLevel(1e9).rank).toBe(4);
  });
  it('showcase: played games only, most played first, any registered game', () => {
    const mk = (id: string, hidden = false) => ({ ...GAMES[0], id, hidden }) as GameModule;
    const mods = [mk('a'), mk('b'), mk('c', true), mk('thousand')];
    const out = showcase(mods, { a: st('a', { played: 2 }), b: st('b', { played: 5 }), c: st('c', { played: 9 }), thousand: st('thousand', { played: 2 }) });
    expect(out.map(x => x.m.id)).toEqual(['b', 'a', 'thousand']);
  });
  it('countdown', () => {
    expect(countdown(Date.UTC(2026, 0, 2, 1, 2, 3), Date.UTC(2026, 0, 1))).toMatchObject({ d: 1, h: 1, m: 2, s: 3 });
    expect(countdown(0, 1000).total).toBe(0);
  });
});

describe('migration 022 economy', () => {
  it('game of the day: +50 % of the base reward, capped below Bridge’s win', () => {
    expect(sql22).toMatch(/least\(round\(v_bm \* 0\.5\)::int, 99 - v_bm\)/);
    expect(sql22).toMatch(/least\(round\(v_xp \* 0\.5\)::int, 84 - v_xp\)/);
    for (const d of MINIGAME_DEFS) {
      const bm = Math.round(d.winBm * LEVEL_MULT.expert), xp = Math.round(d.winXp * LEVEL_MULT.expert);
      expect(bm + Math.min(Math.round(bm * 0.5), 99 - bm)).toBeLessThan(BRIDGE_WIN.bm);
      expect(xp + Math.min(Math.round(xp * 0.5), 84 - xp)).toBeLessThan(BRIDGE_WIN.xp);
    }
  });
  it('record_minigame is untouched (triggers only)', () => {
    expect(sql22).not.toMatch(/create or replace function public\.record_minigame/);
    expect(sql22).toContain('create trigger minigame_results_gotd before insert on public.minigame_results');
    expect(sql22).toContain('create trigger minigame_results_tournament after insert on public.minigame_results');
  });
  it('tournament cosmetics: seeded not for sale, listed, framed, earned-only', () => {
    for (const it of TG_ITEMS) {
      expect(sql22).toMatch(new RegExp(`\\('${it.id}',\\s*'${it.kind}',\\s*null`));
      expect(sql22).toMatch(new RegExp(`'${it.id}'`));
      expect(EARNED_IDS.has(it.id)).toBe(true);
    }
    expect(FRAMES.some(f => f.id === 'tg_fr_podium')).toBe(true);
    expect(FRAME_IDS).toContain('tg_fr_podium');
    expect(TITLES.filter(t => TG_COSMETIC_IDS.includes(t.id)).length).toBe(2);
  });
  it('the RPCs the client calls exist and are granted', () => {
    for (const [fn, who] of [['tournament_current()', 'anon, authenticated'], ['tournament_board(text, int)', 'anon, authenticated'], ['tournament_claim()', 'authenticated'],
      ['games_marathon_claim()', 'authenticated'], ['challenge_get(text)', 'anon, authenticated'], ['challenge_mine(int)', 'authenticated'],
      ['challenge_create(text, text, text, boolean, numeric, numeric, boolean)', 'authenticated'], ['challenge_submit(text, boolean, numeric, numeric)', 'authenticated']] as const) {
      expect(sql22, fn).toContain(`grant execute on function public.${fn} to ${who};`);
    }
  });
});
