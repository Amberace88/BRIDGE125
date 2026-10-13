import { describe, expect, it } from 'vitest';
import sql16 from '../../supabase/migration_016_season.sql?raw';
import {
  S1_REWARDS, SEASON_S1, STAR_CAPS, STAR_RULES, claimable, seasonPhase, seasonWeek, skipCost, starsForTier, tierForStars, tierProgress, trackTotals,
} from './data';
import { S1_COSMETIC_IDS, S1_ITEMS } from './cosmetics';
import { BACKS, TABLES, isPremium } from '../theme';
import { COS_LISTS, EARNED_IDS, kindOfCos } from '../cosmetics/data';
import { COS_STRINGS } from '../cosmetics/i18n';
import { FRAME_IDS } from '../cosmetics/AvatarFrame';
import { SEASON_STRINGS } from '../i18n/season';

describe('tier math (mirrors _season_tier in SQL)', () => {
  it('tier 1 at 0 stars, one tier per 100 stars, capped at 40', () => {
    const pairs: [number, number][] = [[0, 1], [99, 1], [100, 2], [199, 2], [3800, 39], [3899, 39], [3900, 40], [1e6, 40], [-5, 1]];
    for (const [stars, t] of pairs) expect(tierForStars(stars), `${stars}`).toBe(t);
    for (let t = 1; t <= 40; t++) expect(tierForStars(starsForTier(t))).toBe(t);
    expect(starsForTier(1)).toBe(0);
    expect(starsForTier(40)).toBe(3900);
  });
  it('reports progress inside a tier and a maxed pass', () => {
    expect(tierProgress(147)).toMatchObject({ tier: 2, into: 47, need: 100, pct: 0.47, maxed: false });
    expect(tierProgress(5000)).toMatchObject({ tier: 40, maxed: true, pct: 1 });
  });
  it('tier skips never go past the last tier', () => {
    expect(skipCost(1, 1)).toBe(150);
    expect(skipCost(5, 37)).toBe(3 * 150);
    expect(skipCost(3, 40)).toBe(0);
  });
});

describe('claimable rewards', () => {
  it('free for everyone up to the tier, premium only with the pass, never twice', () => {
    const free = claimable({ tier: 3, premium: false, claimed: { free: [1], premium: [] } });
    expect(free).toEqual([{ tier: 2, track: 'free' }, { tier: 3, track: 'free' }]);
    const prem = claimable({ tier: 2, premium: true, claimed: { free: [1, 2], premium: [2] } });
    expect(prem).toEqual([{ tier: 1, track: 'premium' }]);
    expect(claimable({ tier: 40, premium: true, claimed: { free: [], premium: [] } })).toHaveLength(80);
  });
});

describe('season calendar', () => {
  it('is 8 weeks from a Monday in Riga, with a claim grace period', () => {
    const a = Date.parse(SEASON_S1.startsAt), b = Date.parse(SEASON_S1.endsAt);
    expect(Math.round((b - a) / 864e5)).toBe(56);
    expect(new Date(a).getUTCDay()).toBe(0);   // Monday 00:00 Riga = Sunday 21:00 UTC
    expect(seasonPhase(SEASON_S1, a - 1)).toBe('upcoming');
    expect(seasonPhase(SEASON_S1, a + 1)).toBe('live');
    expect(seasonPhase(SEASON_S1, b + 864e5)).toBe('grace');
    expect(seasonPhase(SEASON_S1, b + 15 * 864e5)).toBe('over');
    expect(seasonWeek(SEASON_S1, a + 1)).toEqual({ week: 1, weeks: 8 });
    expect(seasonWeek(SEASON_S1, b - 1)).toEqual({ week: 8, weeks: 8 });
  });
  it('a steady daily player finishes the pass inside the season, a light one gets well into it', () => {
    const per = (games: number, winRate: number, dailies: number, challenge: boolean) =>
      games * (winRate * STAR_RULES.win + (1 - winRate) * STAR_RULES.loss) + dailies * STAR_RULES.questDaily + (challenge ? STAR_RULES.challenge : 0)
      + (5 * STAR_RULES.questWeekly + STAR_RULES.chest) / 7;
    const days = 56, need = starsForTier(40);
    expect(per(5, 0.5, 3, true) * days).toBeGreaterThan(need);          // ~5 games + dailies → done in ~7 weeks
    expect(per(5, 0.5, 3, true) * 35).toBeLessThan(need);               // …but not in 5 weeks
    expect(tierForStars(per(3, 0.5, 1, false) * days)).toBeGreaterThan(10);
  });
});

describe('reward table', () => {
  it('has 40 tiers × 2 tracks with sane amounts', () => {
    expect(S1_REWARDS.map(r => r.tier)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    for (const r of S1_REWARDS) for (const x of [r.free, r.premium]) {
      expect(x.amount).toBeGreaterThan(0);
      expect(x.kind === 'item').toBe(!!x.item);
      if (x.kind === 'dm') expect(r.premium).toBe(x);            // Diamonds only on the premium track
    }
  });
  it('every season cosmetic is earned exactly once; premium carries the exclusives', () => {
    const items = S1_REWARDS.flatMap(r => [r.free, r.premium]).filter(x => x.kind === 'item').map(x => x.item);
    expect([...items].sort()).toEqual([...S1_COSMETIC_IDS].sort());
    expect(trackTotals('premium').items).toHaveLength(8);
    expect(trackTotals('free').items).toHaveLength(2);
    expect(S1_REWARDS[0].premium.item).toBe('s1_table');           // instant gratification on purchase
    expect(S1_REWARDS[39].premium.item).toBe('s1_fr_gilded');      // capstone
    expect(trackTotals('premium').dm).toBeLessThan(SEASON_S1.premiumPrice);
  });
});

/** rows of `insert into public.<table> … values … on conflict` in 016 */
const block = (table: string) => {
  const a = sql16.indexOf(`insert into public.${table}`);
  return sql16.slice(a, sql16.indexOf('on conflict', a));
};

describe('migration 016 is in sync with the client', () => {
  it('season_rewards seed equals S1_REWARDS', () => {
    const rows = [...block('season_rewards').matchAll(/\('s1', (\d+), '(free|premium)', '(\w+)', (\d+), (null|'(\w+)')\)/g)]
      .map(m => ({ tier: Number(m[1]), track: m[2], kind: m[3], amount: Number(m[4]), item: m[6] ?? null }));
    const ts = S1_REWARDS.flatMap(r => (['free', 'premium'] as const).map(track => ({ tier: r.tier, track, kind: r[track].kind, amount: r[track].amount, item: r[track].item ?? null })));
    expect(rows).toEqual(ts);
  });
  it('seasons row equals SEASON_S1', () => {
    const m = block('seasons').match(/\('s1', '[^']+', '([^']+)', '([^']+)', (\d+), (\d+), (\d+), (\d+), (\d+)\)/)!;
    expect(m).toBeTruthy();
    expect(Date.parse(m[1].replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'))).toBe(Date.parse(SEASON_S1.startsAt));
    expect(Date.parse(m[2].replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'))).toBe(Date.parse(SEASON_S1.endsAt));
    expect(m.slice(3).map(Number)).toEqual([SEASON_S1.tiers, SEASON_S1.starsPerTier, SEASON_S1.premiumPrice, SEASON_S1.skipPrice, SEASON_S1.graceDays]);
  });
  it('season cosmetics are listed in shop_items as earn-only, same kind and rarity', () => {
    const rows = [...block('shop_items').matchAll(/\('(s1_\w+)',\s*'(\w+)',\s*(null|\d+),\s*(null|[\d.]+),\s*null,\s*'(\w+)'/g)]
      .map(m => ({ id: m[1], kind: m[2], bm: m[3], eur: m[4], rarity: m[5] }));
    expect(rows.map(r => ({ id: r.id, kind: r.kind, rarity: r.rarity }))).toEqual(S1_ITEMS);
    for (const r of rows) { expect(r.bm).toBe('null'); expect(r.eur).toBe('null'); }
    expect(block('shop_items')).toMatch(/\('pass_s1',\s*'pass',\s*null,\s*null/);
  });
  it('star rules and daily caps match the SQL hooks', () => {
    expect(sql16).toContain(`case when new.wins > old.wins then ${STAR_RULES.win} else ${STAR_RULES.loss} end, 'game'`);
    expect(sql16).toContain(`case when new.kind = 'weekly' then ${STAR_RULES.questWeekly} else ${STAR_RULES.questDaily} end, 'quest'`);
    expect(sql16).toContain(`season_add_xp(new.id, ${STAR_RULES.chest}, 'quest')`);
    const a = STAR_RULES.achievement;
    expect(sql16).toContain(`when 'platinum' then ${a.platinum} when 'gold' then ${a.gold} when 'silver' then ${a.silver} else ${a.bronze} end`);
    expect(sql16).toContain(`season_add_xp(uid, ${STAR_RULES.challenge}, 'challenge')`);   // the documented hook for migration 014
    for (const [k, v] of Object.entries(STAR_CAPS)) expect(sql16).toMatch(k === 'other' ? new RegExp(`else ${v} end`) : new RegExp(`when '${k}' then ${v}`));
  });
  it('every RPC is SECURITY DEFINER with an empty search_path and explicit grants', () => {
    const fns = [...sql16.matchAll(/create or replace function public\.(\w+)\(([^)]*)\)[\s\S]*?\$fn\$;/g)];
    expect(fns.length).toBeGreaterThan(10);
    for (const f of fns) {
      expect(f[0], f[1]).toContain(`set search_path = ''`);
      expect(sql16, f[1]).toMatch(new RegExp(`revoke execute on function public\\.${f[1]}\\(`));
    }
    for (const rpc of ['season_state', 'season_claim', 'season_claim_all', 'season_unlock', 'season_skip', 'season_god']) {
      expect(sql16).toMatch(new RegExp(`grant execute on function public\\.${rpc}\\([^)]*\\) to [a-z, ]*authenticated`));
    }
    expect(sql16).toMatch(/revoke execute on function public\.season_add_xp\(uuid, int, text\) from public, anon, authenticated/);
    expect(sql16).not.toMatch(/grant execute on function public\.season_add_xp/);
  });
});

describe('season cosmetics are real, equippable items', () => {
  it('each id lives in its catalogue as premium (ownership required) and earn-only', () => {
    for (const it of S1_ITEMS) {
      if (it.kind === 'table') expect(TABLES.find(t => t.id === it.id)?.premium, it.id).toBe(true);
      else if (it.kind === 'back') expect(BACKS.find(b => b.id === it.id)?.premium, it.id).toBe(true);
      else {
        const k = it.kind;
        expect(kindOfCos(it.id), it.id).toBe(k);
        expect(COS_LISTS[k].find(x => x.id === it.id)?.premium, it.id).toBe(true);
      }
      expect(isPremium(it.id), it.id).toBe(true);
      expect(EARNED_IDS.has(it.id), it.id).toBe(true);
    }
    expect(FRAME_IDS).toContain('s1_fr_gilded');
    const t = TABLES.find(x => x.id === 's1_table')!;
    expect(t.css.length).toBeGreaterThan(100);
    expect(t.back.length).toBeGreaterThan(20);
    expect(t.tone).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
  it('every season item and the season name are translated in en / lv / ru / uk', () => {
    for (const lang of ['en', 'lv', 'ru', 'uk']) {
      for (const id of S1_COSMETIC_IDS) expect(COS_STRINGS[lang]!.names[id], `${lang} ${id}`).toBeTruthy();
      expect(SEASON_STRINGS[lang]!.seasonNames.s1, lang).toBeTruthy();
    }
  });
});
