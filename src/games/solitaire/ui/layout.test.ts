import { describe, expect, it } from 'vitest';
import { dealKlondike } from '../engine/klondike';
import { dealSpider } from '../engine/spider';
import { klondikeLayout, spiderLayout } from './layout';
import { dragGroup, dropTargets, moveOnto, tapMove } from './adapter';
import { solStrings, SOL_LANGS } from '../strings';
import { missingKeys } from '../../../i18n/pick';
import { LANGS } from '../../../i18n';
import { TAGLINE, TITLE } from '../meta';
import { recordResult } from '../store';
import { newGame } from '../engine/game';

describe('layout', () => {
  it.each([[390, 700], [360, 600], [1440, 770], [844, 300]])('Klondike fits %i×%i: 7 columns inside, a pose for every card', (W, H) => {
    const s = dealKlondike(4);
    const l = klondikeLayout(s, W, H);
    expect(l.poses.size).toBe(52);
    for (const p of l.poses.values()) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x + l.cw).toBeLessThanOrEqual(W + 0.5); }
    if (W === 390) expect(l.cw).toBeGreaterThanOrEqual(48);
  });
  it('a very long column is squeezed into the board height', () => {
    const s = dealKlondike(4);
    s.tab[6] = { c: [...s.tab[6].c, ...s.stock.slice(0, 12)], d: 6 };
    const l = klondikeLayout(s, 390, 560);
    const ys = s.tab[6].c.map(id => l.poses.get(id)!.y);
    expect(Math.max(...ys) + l.ch).toBeLessThanOrEqual(560 + 1);
  });
  it('Spider: 10 columns fit 390 px', () => {
    const s = dealSpider(4, 2);
    const l = spiderLayout(s, 390, 700);
    expect(l.poses.size).toBe(104);
    for (const p of l.poses.values()) expect(p.x + l.cw).toBeLessThanOrEqual(390.5);
  });
});

describe('board adapter', () => {
  it('drag picks up face-up runs only and offers legal drops', () => {
    const s = dealKlondike(4);
    expect(dragGroup(s, { k: 'tab', i: 6 }, 0)).toBeNull();          // face down
    expect(dragGroup(s, { k: 'tab', i: 6 }, 6)).toEqual([s.tab[6].c[6]]);
    expect(dragGroup(s, { k: 'stock' }, 0)).toBeNull();
    for (const t of dropTargets(s, { k: 'tab', i: 6 }, 6)) expect(moveOnto(s, { k: 'tab', i: 6 }, 6, t)).not.toBeNull();
    expect(tapMove(s, { k: 'stock' }, -1)).toEqual({ t: 'draw' });
  });
});

describe('strings', () => {
  it('en / lv / ru / uk are complete', () => {
    for (const l of SOL_LANGS.full) expect(missingKeys(solStrings('en'), solStrings(l))).toEqual([]);
    expect(SOL_LANGS.full.sort()).toEqual(['en', 'lv', 'ru', 'uk']);
  });
  it('every app language has a title, tagline and the main buttons', () => {
    for (const { id } of LANGS) {
      expect(TITLE[id]).toBeTruthy();
      expect(TAGLINE[id]).toBeTruthy();
      const s = solStrings(id);
      expect(s.title).toBe(TITLE[id]);
      if (id !== 'en') for (const k of ['play', 'newGame', 'daily', 'undo', 'hint'] as const) expect(s[k]).toBeTruthy();
    }
    expect(solStrings('lv').title).toBe('Pasjanss');
    expect(solStrings('ru').title).toBe('Пасьянс');
    expect(solStrings('de').newGame).toBe('Neues Spiel');
  });
});

describe('stats', () => {
  it('records wins, bests and the daily record', () => {
    const base = { v: 1 as const, game: null, prefs: { mode: 'klondike-1' as const, vegas: false }, stats: {}, daily: {}, seeds: {} };
    const g = { ...newGame('klondike-1', 3, { day: '2026-10-13' }), seconds: 200 };
    const a = recordResult(base, g, true, 4000);
    expect(a.save.stats['klondike-1']).toMatchObject({ played: 1, won: 1, bestTime: 200, streak: 1 });
    expect(a.save.daily['2026-10-13']).toMatchObject({ won: true, bestTime: 200, plays: 1 });
    const b = recordResult(a.save, { ...g, seconds: 150 }, true, 4500);
    expect(b.bestTime).toBe(true);
    expect(b.save.daily['2026-10-13'].bestTime).toBe(150);
    const c = recordResult(b.save, g, false, 0);
    expect(c.save.stats['klondike-1']!.streak).toBe(0);
  });
});
