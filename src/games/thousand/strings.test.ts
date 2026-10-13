import { describe, expect, it } from 'vitest';
import { LANGS } from '../../i18n';
import { missingKeys } from '../../i18n/pick';
import { DEFAULT_RULES } from './engine';
import { THOUSAND } from './strings';
import { TAGLINES, TITLES } from './titles';
import { thousand } from './index';
import { gameById } from '../registry';

describe('thousand strings', () => {
  it('all 17 languages are complete — no key ever falls back to English', () => {
    expect(LANGS).toHaveLength(17);
    for (const { id } of LANGS) expect(missingKeys(THOUSAND.en, THOUSAND[id]), id).toEqual([]);
  });
  it('every text function renders in every language', () => {
    const kinds = ['barrelOn', 'barrelStay', 'barrelFail', 'barrelOff', 'barrelPush', 'bolt', 'bolt3', 'samosval', 'win'] as const;
    const off = { ...DEFAULT_RULES, marriageToBid: false, step10: false, barrel: false, bolts: false, samosval: false };
    for (const { id } of LANGS) {
      const s = THOUSAND[id]!;
      const out = [
        s.bid.bid(120), s.bid.high(150, 'Ann'), s.said.forced(100), s.said.bid(105), s.give.to('Ann'), s.contract.sub(25), s.contract.play(140),
        s.takes(null, 120), s.takes('Ann', 120), s.plays(null, 140), s.plays('Ann', 140), s.marriageBy(null, 100), s.marriageBy('Ann', 40), s.declare(80),
        s.status.bidding('Ann'), s.status.giving('Ann'), s.status.contracting('Ann'), s.status.thinking('Ann'),
        ...[0, 1, 2, 5, 7].map(s.trickN), s.lastTrickBy('Ann'), s.deal(3), s.of(95, 120),
        s.sheet.made(null, 120), s.sheet.made('Ann', 120), s.sheet.failed(null, 120, 95), s.sheet.failed('Ann', 120, 95),
        s.sheet.breakdown(85, 0), s.sheet.breakdown(85, 100), ...kinds.map(k => s.sheet.note[k]('Ann', 2)), s.sheet.winner('Ann'),
        s.coach.suggest(120), s.coach.defend('Ann', 'Bob'), ...s.rules.variant(DEFAULT_RULES), ...s.rules.variant(off),
      ];
      for (const t of out) expect(t, id).not.toMatch(/undefined|NaN|\[object/);
      expect(s.rules.variant(DEFAULT_RULES), id).toHaveLength(6);
      expect(s.rules.tips, id).toHaveLength(3);
    }
    expect(THOUSAND.pl!.talon).toBe('Musik');
    expect(THOUSAND.pl!.marriage).toBe('Meldunek');
    expect(THOUSAND.pl!.trickN(3)).toBe('3 lewy');
    expect(THOUSAND.de!.talon).toBe('Stock');
    expect(THOUSAND.bg!.marriage).toBe('Женитба');
    expect(THOUSAND.be!.trickN(5)).toBe('5 узяткаў');
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
