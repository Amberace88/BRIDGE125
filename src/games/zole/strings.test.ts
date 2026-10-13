import { describe, expect, it } from 'vitest';
import { LANGS } from '../../i18n';
import { missingKeys } from '../../i18n/pick';
import { ZOLE } from './strings';
import { TAGLINES, TITLES } from './titles';
import { zole } from './index';
import { gameById } from '../registry';

describe('zole strings', () => {
  it('all 17 languages are complete — no key ever falls back to English', () => {
    expect(LANGS).toHaveLength(17);
    for (const { id } of LANGS) {
      expect(ZOLE[id], id).toBeTruthy();
      expect(missingKeys(ZOLE.en, ZOLE[id]), id).toEqual([]);
      expect(ZOLE[id]!.title, id).toBe(id === 'en' ? 'Zole' : TITLES[id]);
    }
  });
  it('every text function renders in every language', () => {
    const outcomes = ['win', 'jani', 'bezstikis', 'lose', 'loseJani', 'loseBezstikis'] as const;
    const contracts = ['lielais', 'zole', 'maza', 'galdins'] as const;
    for (const { id } of LANGS) {
      const s = ZOLE[id]!;
      const out = [
        ...contracts.flatMap(c => [s.plays('Ann', c), s.playsYou(c)]),
        s.status.bidding('Ann'), s.status.discarding('Ann'), s.status.thinking('Ann'), s.discardBtn(14),
        ...[0, 1, 2, 5, 8].map(s.trickN), s.lastTrickBy('Ann'), s.galdsTo('Ann'), s.deal(2, 12), s.deal(3, 0),
        ...outcomes.flatMap(o => [s.outcomeLine(null, o), s.outcomeLine('Ann', o)]),
        s.mazaLine(null, true), s.mazaLine('Ann', false), s.galdinsLine([null]), s.galdinsLine(['Ann', null]),
        s.sheet.winner('Ann'), s.sheet.pules(1), s.sheet.pules(3),
        ...[1, 2, 5].map(s.coach.bid), s.coach.suggest('Pass'), s.coach.mazie('Ann', 'Bob'),
      ];
      for (const t of out) expect(t, id).not.toMatch(/undefined|NaN|\[object/);
      expect(s.trickN(5), id).toContain('5');
      expect(s.rules.tips, id).toHaveLength(3);
    }
    expect(ZOLE.pl!.trickN(2)).toBe('2 lewy');
    expect(ZOLE.pl!.trickN(5)).toBe('5 lew');
    expect(ZOLE.lt!.trickN(5)).toBe('5 kirčiai');
    expect(ZOLE.de!.outcomeTag.bezstikis).toBe('schwarz');
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
