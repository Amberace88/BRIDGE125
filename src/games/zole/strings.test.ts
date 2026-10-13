import { describe, expect, it } from 'vitest';
import { LANGS } from '../../i18n';
import { missingKeys } from '../../i18n/pick';
import { ZOLE } from './strings';
import { TAGLINES, TITLES } from './titles';
import { zole } from './index';
import { gameById } from '../registry';

describe('zole strings', () => {
  it('en, lv, ru, uk are complete', () => {
    for (const l of ['lv', 'ru', 'uk']) expect(missingKeys(ZOLE.en, ZOLE[l]), l).toEqual([]);
  });
  it('title and tagline exist in all 17 languages', () => {
    for (const l of LANGS) {
      expect(TITLES[l.id], l.id).toBeTruthy();
      expect(TAGLINES[l.id], l.id).toBeTruthy();
    }
    expect(TITLES.lv).toBe('Zolīte');
    expect(TITLES.ru).toBe('Золе');
  });
  it('Latvian uses the native Zole terms', () => {
    const lv = ZOLE.lv!;
    expect(lv.bid.pass).toBe('Garām');
    expect(lv.bid.take).toBe('Ņemt galdu');
    expect(lv.contract.galdins).toBe('Galdiņš');
    expect(lv.sheet.title).toBe('Pieraksts');
    expect(lv.outcomeLine(null, 'jani')).toContain('jaņos');
    expect(lv.galdinsLine([null])).toBe('Tu zaudēji galdiņu');
  });
  it('is registered as a card game for 3 at /g/zole, Latvian first', () => {
    expect(gameById('zole')).toBe(zole);
    expect(zole.kind).toBe('cards');
    expect(zole.players).toEqual({ min: 3, max: 3 });
    expect(zole.homeLangs).toEqual(['lv']);
  });
});
