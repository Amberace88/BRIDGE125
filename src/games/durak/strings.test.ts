import { describe, expect, it } from 'vitest';
import { LANGS } from '../../i18n';
import { missingKeys } from '../../i18n/pick';
import { DURAK_STRINGS } from './strings';
import { TITLE } from './meta';

describe('durak strings', () => {
  it('all 17 languages are complete — no key ever falls back to English', () => {
    expect(LANGS).toHaveLength(17);
    for (const { id } of LANGS) {
      expect(DURAK_STRINGS[id], id).toBeTruthy();
      expect(missingKeys(DURAK_STRINGS.en, DURAK_STRINGS[id]), id).toEqual([]);
      expect(DURAK_STRINGS[id]!.title, id).toBe(TITLE[id]);
    }
  });
  it('every text function renders in every language', () => {
    for (const { id } of LANGS) {
      const s = DURAK_STRINGS[id]!;
      const out = [
        s.cards(24), s.cards(36), s.talon(1), s.talon(22), s.st.waiting('Ann'), s.ev.lowTrump('Ann', '6♠'), s.ev.lowTrumpYou('6♠'),
        s.ev.firstMove('Ann'), s.ev.took('Ann'), s.ev.transfer('Ann'), s.ev.out('Ann'), s.end.durakIs('Ann'),
        ...[1, 2, 3, 4, 5, 6].map(s.end.place),
      ];
      for (const t of out) expect(t, id).not.toMatch(/undefined|NaN|\[object/);
      expect(s.cards(36), id).toContain('36');
      expect(s.end.place(3), id).toContain('3');
    }
  });
  it('uses the local plural forms and terms', () => {
    expect(DURAK_STRINGS.pl!.cards(24)).toBe('24 karty');
    expect(DURAK_STRINGS.pl!.cards(36)).toBe('36 kart');
    expect(DURAK_STRINGS.be!.cards(24)).toBe('24 карты');
    expect(DURAK_STRINGS.lt!.cards(36)).toBe('36 kortos');
    expect(DURAK_STRINGS.ro!.cards(24)).toBe('24 de cărți');
    expect(DURAK_STRINGS.de!.trump).toBe('Trumpf');
    expect(DURAK_STRINGS.bg!.trump).toBe('Коз');
  });
});
