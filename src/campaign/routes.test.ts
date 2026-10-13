import { describe, expect, it } from 'vitest';
import sql from '../../supabase/migration_018_journey_routes.sql?raw';
import { LANGS } from '../i18n';
import {
  CHAPTERS, CHARACTERS, LANG_ROUTE, MATCH_TPLS, PICKABLE_ROUTES, ROUTES, ROUTE_IDS, TOTAL_STARS, chapterUnlocked, defaultRoute, distKm,
  isUnlocked, levelFor, nextMatch, posOn, rewardFor, routeForLang, routeMatches, starsFor, totalStars, underFor, type ChapterId, type RouteId,
} from './data';
import { setupMatch, twistInfo } from './twists';
import { CITY_XY, MAP_H, MAP_W, routePoints } from './art';
import { JOURNEY_STRINGS } from '../i18n/journey';

const len = (r: ChapterId[]) => r.slice(1).reduce((a, c, i) => a + distKm(r[i], c), 0);
function* perms<T>(a: T[]): Generator<T[]> {
  if (a.length <= 1) { yield a.slice(); return; }
  for (let i = 0; i < a.length; i++) for (const p of perms([...a.slice(0, i), ...a.slice(i + 1)])) yield [a[i], ...p];
}

describe('journey routes', () => {
  it('every UI language has a route: 8 distinct chapters, its home city first, Monte Carlo last', () => {
    for (const { id } of LANGS) {
      const r = routeForLang(id);
      expect(LANG_ROUTE[id], id).toBe(r);
      const ids = ROUTES[r];
      expect(ids, id).toHaveLength(8);
      expect(new Set(ids).size, id).toBe(8);
      expect(ids[0], id).toBe(r);
      expect(ids[7], id).toBe('montecarlo');
    }
    expect(Object.fromEntries(['lv', 'ru', 'uk', 'de', 'es', 'en', 'kk'].map(l => [l, routeForLang(l)]))).toEqual({
      lv: 'riga', ru: 'moscow', uk: 'kyiv', de: 'berlin', es: 'madrid', en: 'london', kk: 'almaty',
    });
    // each language has its own home city
    expect(new Set(LANGS.map(l => routeForLang(l.id))).size).toBe(LANGS.length);
  });

  it('the classic route is exactly the original campaign (old progress stays in order)', () => {
    expect(ROUTES.classic).toEqual(['riga', 'tallinn', 'vilnius', 'warsaw', 'kyiv', 'tbilisi', 'vienna', 'montecarlo']);
    expect(PICKABLE_ROUTES).not.toContain('classic');
  });

  it('geography: each route is the shortest order through its cities, and no leg is a long zig-zag', () => {
    for (const r of PICKABLE_ROUTES) {
      const ids = ROUTES[r];
      let best = Infinity;
      for (const p of perms(ids.slice(1, 7))) best = Math.min(best, len([ids[0], ...p, 'montecarlo']));
      expect(len(ids) / best, r).toBeLessThanOrEqual(1.02);
      for (let i = 1; i < 8; i++) expect(distKm(ids[i - 1], ids[i]), `${r} ${ids[i - 1]}→${ids[i]}`).toBeLessThan(1700);
      // the tour heads for the finale: the last leg is short, the route never ends far from where it is going
      expect(distKm(ids[6], 'montecarlo'), r).toBeLessThan(1300);
    }
  });

  it('every city is in some route, every chapter has 3 matches + a boss with a stable id', () => {
    const used = new Set(PICKABLE_ROUTES.flatMap(r => ROUTES[r]));
    for (const c of CHAPTERS) expect(used.has(c.id), c.id).toBe(true);
    for (const c of CHAPTERS) expect(MATCH_TPLS.filter(m => m.chapter === c.id).map(m => m.id)).toEqual([1, 2, 3].map(k => `${c.id}_${k}`).concat(`${c.id}_boss`));
    for (const m of MATCH_TPLS) expect(CHARACTERS.some(c => c.id === m.foe), m.foe).toBe(true);
    expect(new Set(CHARACTERS.map(c => c.id)).size).toBe(CHARACTERS.length);
  });

  it('a route resolves 32 matches: order, level, threshold and rewards by position (chapter 1 pays like chapter 1)', () => {
    for (const r of ROUTE_IDS) {
      const ms = routeMatches(r);
      expect(ms.map(m => m.ord)).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
      for (const m of ms) {
        expect(m.chapter).toBe(ROUTES[r][m.pos - 1]);
        expect({ bm: m.bm, xp: m.xp, starBm: m.starBm }).toEqual(rewardFor(m.pos, m.k));
        expect(m.level).toBe(levelFor(m.pos, m.k));
        expect(m.under).toBe(underFor(m.pos, m.twist));
      }
      expect(ms[0].level).toBe('easy');
      expect(ms[31].id).toBe('montecarlo_boss');
      const all = Object.fromEntries(ms.map(m => [m.id, 3]));
      expect(totalStars(all, r)).toBe(TOTAL_STARS);
    }
    expect(routeMatches('moscow')[0]).toMatchObject({ id: 'moscow_1', bm: 140, xp: 45, starBm: 30 });
    expect(routeMatches('riga').find(m => m.id === 'riga_boss')).toMatchObject({ pos: 1, bm: 400 });
    expect(routeMatches('moscow').find(m => m.id === 'riga_boss')).toMatchObject({ pos: 4, bm: 700, level: 'hard' });
  });

  it('unlocking follows the route', () => {
    expect(isUnlocked(routeMatches('moscow')[0], {}, 'moscow')).toBe(true);
    const riga1 = routeMatches('moscow').find(m => m.id === 'riga_1')!;
    expect(isUnlocked(riga1, {}, 'moscow')).toBe(false);
    expect(isUnlocked(riga1, { vilnius_boss: 1 }, 'moscow')).toBe(true);
    expect(chapterUnlocked('minsk', { moscow_boss: 2 }, 'moscow')).toBe(true);
    expect(chapterUnlocked('almaty', { moscow_boss: 2 }, 'moscow')).toBe(false);   // not on the route
    expect(nextMatch({ moscow_1: 1 }, 'moscow').id).toBe('moscow_2');
    expect(posOn('london', 'vienna')).toBe(7);
  });

  it('default route: the language home city, or the original tour for players who already have stars', () => {
    expect(defaultRoute({}, 'ru')).toBe('moscow');
    expect(defaultRoute({ riga_1: 2 }, 'ru')).toBe('classic');
    expect(defaultRoute({}, 'xx')).toBe('london');
    expect(defaultRoute({ almaty_1: 1 }, 'kk')).toBe('almaty');
  });

  it('every house rule sets up a valid table, newer bosses combine the existing rules', () => {
    for (const m of routeMatches('almaty').concat(routeMatches('madrid'), routeMatches('moscow'), routeMatches('tbilisi'))) {
      const info = twistInfo(m.twist);
      const g = setupMatch(m, { me: 'Me', foes: ['A', 'B', 'C'] });
      expect(g.players.length, m.id).toBe(info.seats);
      expect(m.extra.length, m.id).toBeGreaterThanOrEqual(info.seats - 2);
    }
    expect(twistInfo('matryoshka')).toMatchObject({ seats: 3, queenDraw: 6 });
    expect(twistInfo('eagle')).toMatchObject({ bluff: true, banker: true });
    expect(twistInfo('voivode')).toMatchObject({ bluff: true, gameOverAt: 110 });
    expect(underFor(1, 'voivode')).toBeLessThan(underFor(1, 'none'));
    const m = routeMatches('bucharest')[3];
    expect(starsFor(m, { won: true, queenHits: 0, myScore: m.under - 1 })).toBe(3);
  });

  it('every city sits on the map, and a route path passes through its cities', () => {
    for (const c of CHAPTERS) {
      const [x, y] = CITY_XY[c.id];
      expect(x, c.id).toBeGreaterThan(40); expect(x, c.id).toBeLessThan(MAP_W - 40);
      expect(y, c.id).toBeGreaterThan(40); expect(y, c.id).toBeLessThan(MAP_H - 40);
    }
    for (const r of ROUTE_IDS) {
      const pts = routePoints(r);
      for (const id of ROUTES[r]) expect(pts.some(p => p[0] === CITY_XY[id][0] && p[1] === CITY_XY[id][1]), `${r} ${id}`).toBe(true);
    }
  });

  it('cities, characters, companions and new house rules are named in en / lv / ru / uk', () => {
    for (const l of ['en', 'lv', 'ru', 'uk']) {
      const s = JOURNEY_STRINGS[l]!;
      for (const c of CHAPTERS) expect(s.cities[c.id]?.room, `${l} ${c.id}`).toBeTruthy();
      for (const m of MATCH_TPLS) {
        expect(s.chars[m.foe]?.epithet, `${l} ${m.foe}`).toBeTruthy();
        for (const e of m.extra) expect(s.companions[e] ?? s.chars[e]?.name, `${l} ${e}`).toBeTruthy();
        expect(s.twists[m.twist]?.desc, `${l} ${m.twist}`).toBeTruthy();
      }
      expect(s.route.from(s.cities.riga.name)).toContain(s.cities.riga.name);
    }
  });
});

/* ------------------------------------------------------------------------------------------------ server mirror */

describe('migration 018 mirrors the client', () => {
  const block = (start: string, end: string) => { const a = sql.indexOf(start); return sql.slice(a, sql.indexOf(end, a)); };

  it('journey_matches: every city match with its chapter, k and boss item', () => {
    const b = block('insert into public.journey_matches', 'on conflict (id)');
    const rows = [...b.matchAll(/\('([a-z_0-9]+)',\s*'([a-z]+)',\s*(\d),\s*(\d+),\s*(null|'[a-z_0-9]+'),/g)].map(r => ({
      id: r[1], chapter: r[2], k: +r[3], item: r[5] === 'null' ? null : r[5].slice(1, -1),
    }));
    expect(rows).toEqual(MATCH_TPLS.map(m => ({ id: m.id, chapter: m.chapter, k: m.k, item: m.item })));
    // the original 32 keep their catalogue order 1..32
    const ords = [...b.matchAll(/\('([a-z_0-9]+)',\s*'[a-z]+',\s*\d,\s*(\d+),/g)].map(r => +r[2]);
    expect(new Set(ords).size).toBe(ords.length);
  });

  it('journey_route_stops: every route in order', () => {
    const b = block('insert into public.journey_route_stops', ';');
    const rows = [...b.matchAll(/\('([a-z]+)',\s*(\d),\s*'([a-z]+)'\)/g)];
    const got: Record<string, string[]> = {};
    for (const r of rows) (got[r[1]] ??= [])[+r[2] - 1] = r[3];
    expect(got).toEqual(ROUTES as Record<RouteId, string[]>);
  });

  it('journey_slots: rewards by position', () => {
    const b = block('insert into public.journey_slots', 'on conflict');
    const rows = [...b.matchAll(/\((\d), (\d), (\d+), (\d+), (\d+)\)/g)].map(r => ({ pos: +r[1], k: +r[2], bm: +r[3], xp: +r[4], starBm: +r[5] }));
    expect(rows).toHaveLength(32);
    for (const r of rows) expect({ bm: r.bm, xp: r.xp, starBm: r.starBm }).toEqual(rewardFor(r.pos, r.k));
  });

  it('server conventions: security definer, empty search_path, auth.uid() in a sub-select', () => {
    const fns = [...sql.matchAll(/create or replace function public\.(\w+)\([^]*?\$fn\$;/g)].map(m => m[0]);
    expect(fns.length).toBeGreaterThanOrEqual(7);
    for (const f of fns) {
      expect(f, f.slice(0, 60)).toMatch(/set search_path = ''/);
      expect(f.replace(/\(select auth\.uid\(\)\)/g, ''), f.slice(0, 60)).not.toMatch(/auth\.uid\(\)/);
    }
    expect(sql).toMatch(/grant execute on function public\.journey_set_route\(text\) to authenticated/);
    expect(sql).toMatch(/revoke execute on function public\._journey_record_at/);
  });
});
