import { describe, expect, it } from 'vitest';
import { DICTS, LANGS, matchLang, rankLabel } from '../i18n';
import { EXTRA } from '../i18n2';
import { EXTRA2, LEGAL } from '../i18n3';
import { isLocaleLoaded, loadLocale } from './index';

/** Call every function-valued string with plausible arguments. */
function call(fn: (...a: unknown[]) => unknown, path: string): unknown {
  const args = fn.length === 2 ? (/seatsOf/.test(path) ? [2, 4] : ['Anna', 3]) : [/\.(take|deckLeft|points|playN|round|jacksFinish|youTake|startsIn|resendIn)$/.test(path) ? 2 : 'Anna'];
  return fn(...args);
}

/** Walk `en` and the translation in parallel: same keys, same array lengths, non-empty strings, callable functions. */
function compare(en: unknown, tr: unknown, path: string, lang: string) {
  if (typeof en === 'function') {
    expect(typeof tr, `${lang} ${path}`).toBe('function');
    const out = call(tr as (...a: unknown[]) => unknown, path);
    expect(typeof out, `${lang} ${path}()`).toBe('string');
    expect(out as string, `${lang} ${path}()`).not.toMatch(/undefined|NaN|\[object/);
    expect((out as string).length, `${lang} ${path}()`).toBeGreaterThan(0);
  } else if (Array.isArray(en)) {
    expect(Array.isArray(tr), `${lang} ${path}`).toBe(true);
    expect((tr as unknown[]).length, `${lang} ${path} length`).toBe(en.length);
    en.forEach((v, i) => compare(v, (tr as unknown[])[i], `${path}[${i}]`, lang));
  } else if (en && typeof en === 'object') {
    expect(Object.keys(tr as object).sort(), `${lang} ${path} keys`).toEqual(Object.keys(en).sort());
    for (const k of Object.keys(en)) compare((en as Record<string, unknown>)[k], (tr as Record<string, unknown>)[k], `${path}.${k}`, lang);
  } else {
    expect(typeof tr, `${lang} ${path}`).toBe('string');
    expect((tr as string).trim().length, `${lang} ${path} empty`).toBeGreaterThan(0);
  }
}

describe('locales', () => {
  for (const { id } of LANGS) {
    it(`${id}: complete and structurally identical to English`, async () => {
      await loadLocale(id);
      expect(isLocaleLoaded(id)).toBe(true);
      if (id !== 'en') {
        // a lazily loaded pack must replace the English placeholder
        expect(DICTS[id]).not.toBe(DICTS.en);
        expect(LEGAL.privacy[id]).not.toBe(LEGAL.privacy.en);
      }
      compare(DICTS.en, DICTS[id], 'dict', id);
      compare(EXTRA.en, EXTRA[id], 'extra', id);
      compare(EXTRA2.en, EXTRA2[id], 'extra2', id);
      compare(LEGAL.privacy.en, LEGAL.privacy[id], 'privacy', id);
      compare(LEGAL.terms.en, LEGAL.terms[id], 'terms', id);
      // the contact address must survive translation
      expect(LEGAL.privacy[id].sections.some(s => s.p.some(p => p.includes('@')))).toBe(true);
    });
  }

  it('card letters exist for every language and keep number ranks', () => {
    for (const { id } of LANGS) {
      for (const r of ['J', 'Q', 'K', 'A'] as const) expect(rankLabel(r, id)).toMatch(/^\S$/u);
      expect(rankLabel('10', id)).toBe('10');
    }
    expect(['J', 'Q', 'K', 'A'].map(r => rankLabel(r as 'J', 'ru')).join('')).toBe('ВДКТ');
    expect(['J', 'Q', 'K', 'A'].map(r => rankLabel(r as 'J', 'de')).join('')).toBe('BDKA');
    expect(['J', 'Q', 'K', 'A'].map(r => rankLabel(r as 'J', 'bg')).join('')).toBe('ВДПА');
    expect(['J', 'Q', 'K', 'A'].map(r => rankLabel(r as 'J', 'ka')).join('')).toBe('JQKA');
  });

  it('matches browser language tags', () => {
    expect(matchLang('de-AT')).toBe('de');
    expect(matchLang('ro-MD')).toBe('ro');
    expect(matchLang('mo')).toBe('ro');
    expect(matchLang('uz-Latn-UZ')).toBe('uz');
    expect(matchLang('pt-BR')).toBeNull();
  });
});
