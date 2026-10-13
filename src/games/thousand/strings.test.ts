import { describe, expect, it } from 'vitest';
import { LANGS } from '../../i18n';
import { missingKeys } from '../../i18n/pick';
import { DEFAULT_RULES } from './engine';
import { THOUSAND } from './strings';
import { TAGLINES, TITLES } from './titles';
import { thousand } from './index';
import { gameById } from '../registry';

describe('thousand strings', () => {
  it('en, lv, ru, uk are complete', () => {
    for (const l of ['lv', 'ru', 'uk']) expect(missingKeys(THOUSAND.en, THOUSAND[l]), l).toEqual([]);
  });
  it('title and tagline exist in all 17 languages; the other languages get their main buttons', () => {
    for (const l of LANGS) {
      expect(TITLES[l.id], l.id).toBeTruthy();
      expect(TAGLINES[l.id], l.id).toBeTruthy();
      const s = THOUSAND[l.id];
      expect(s, l.id).toBeTruthy();
      expect(s!.title).toBe(TITLES[l.id]);
      expect(s!.bid.bid(120)).toContain('120');
    }
    expect(TITLES.ru).toBe('Тысяча');
    expect(TITLES.lv).toBe('Tūkstotis');
    expect(THOUSAND.pl!.lobby.start).toBe('Do stołu');
  });
  it('Russian uses the native terms', () => {
    const ru = THOUSAND.ru!;
    expect(ru.talon).toBe('Прикуп');
    expect(ru.marriage).toBe('Марьяж');
    expect(ru.barrel).toBe('Бочка');
    expect(ru.sheet.title).toBe('Пулька');
    expect(ru.trickN(5)).toBe('5 взяток');
    expect(ru.rules.variant(DEFAULT_RULES)).toHaveLength(6);
  });
  it('is registered as a 3-player card game at /g/thousand, home for the ex-USSR + Baltic + Polish players', () => {
    expect(gameById('thousand')).toBe(thousand);
    expect(thousand.kind).toBe('cards');
    expect(thousand.players).toEqual({ min: 3, max: 3 });
    expect(thousand.homeLangs).toEqual(['ru', 'uk', 'be', 'lv', 'lt', 'et', 'pl', 'kk', 'bg']);
  });
});
