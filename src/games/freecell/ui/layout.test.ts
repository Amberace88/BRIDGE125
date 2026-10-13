import { describe, expect, it } from 'vitest';
import { msDeal } from '../engine/deal';
import { fcLayout } from './layout';
import { FC_LANGS, fcStrings } from '../strings';
import { TAGLINE, TITLE } from '../meta';
import { missingKeys } from '../../../i18n/pick';
import { freecell } from '../index';

const LANGS = ['en', 'lv', 'ru', 'uk', 'lt', 'et', 'pl', 'de', 'be', 'kk', 'uz', 'az', 'ka', 'hy', 'ro', 'bg', 'es'] as const;

describe('layout', () => {
  it('fits a 390 px phone: every card and pile inside the board, the cascades readable', () => {
    const s = msDeal(1);
    const L = fcLayout(s, 390, 640);
    expect(L.cw).toBeGreaterThanOrEqual(40);
    expect(L.poses.size).toBe(52);
    for (const p of L.poses.values()) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x + L.cw).toBeLessThanOrEqual(390); }
    for (const sl of L.slots) { expect(sl.x).toBeGreaterThanOrEqual(0); expect(sl.x + L.cw).toBeLessThanOrEqual(390); }
    expect(L.slots).toHaveLength(16);
  });

  it('a long cascade squeezes into the room it has', () => {
    const s = msDeal(1);
    const all = s.cols.flat();
    const tall = { ...s, cols: [all.slice(0, 20), all.slice(20, 52), [], [], [], [], [], []] };
    const L = fcLayout(tall, 390, 600);
    for (const p of L.poses.values()) expect(p.y + L.ch).toBeLessThanOrEqual(600 + 1);
  });

  it('desktop: cards grow but stay elegant', () => {
    const L = fcLayout(msDeal(1), 1440, 780);
    expect(L.cw).toBeGreaterThan(90);
    expect(L.cw).toBeLessThanOrEqual(118);
  });
});

describe('strings', () => {
  it('all 17 languages are complete — no key ever falls back to English', () => {
    expect(FC_LANGS.full.sort()).toEqual([...LANGS].sort());
    for (const l of LANGS) expect(missingKeys(FC_LANGS.en, fcStrings(l)), l).toEqual([]);
  });

  it('every language has a title, a tagline and the main buttons', () => {
    for (const l of LANGS) {
      expect(TITLE[l], l).toBeTruthy();
      expect(TAGLINE[l], l).toBeTruthy();
      expect(freecell.title[l], l).toBeTruthy();
      const s = fcStrings(l);
      expect(s.title).toBe(TITLE[l]);
      if (l !== 'en') expect(s.newGame, l).not.toBe(FC_LANGS.en.newGame);
    }
    for (const l of LANGS) {
      const s = fcStrings(l);
      for (const t of [s.dealNo(617), s.tooMany(1), s.tooMany(3), s.tooMany(12), s.dailyBest('2:10', 1), s.dailyBest('2:10', 84), s.unsolvable(11982)]) {
        expect(t, l).not.toMatch(/undefined|NaN|\[object/);
      }
    }
    expect(fcStrings('lv').tooMany(1)).toContain('kārti');
    expect(fcStrings('pl').tooMany(3)).toContain('3 karty');
    expect(fcStrings('pl').dailyBest('1:00', 22)).toContain('22 ruchy');
    expect(fcStrings('ro').dailyBest('1:00', 20)).toContain('20 de mutări');
    expect(fcStrings('es').title).toBe('Carta Blanca');
    expect(fcStrings('xx')).toBe(FC_LANGS.en);
    expect(fcStrings('ru').dailyBest('1:00', 3)).toContain('хода');
  });

  it('is registered as a daily card game for one player', () => {
    expect(freecell).toMatchObject({ id: 'freecell', kind: 'cards', daily: true, players: { min: 1, max: 1 } });
  });
});
