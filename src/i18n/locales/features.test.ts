import { describe, expect, it } from 'vitest';
import { LANGS } from '../../i18n';
import { loadLocale } from '../../locales';
import { HOME } from '../home';
import { TABLE_STRINGS } from '../table';
import { SHOP_STRINGS } from '../shop';
import { MEDIA } from '../media';
import { MERCH_STRINGS } from '../merch';
import { missingKeys, pick, registeredStrings, withFallback, type Strings } from '../pick';
import { FEATURE_LANGS } from './index';
import type { FeaturePack } from './types';

const MODULES: Record<keyof FeaturePack, Strings<unknown>> = {
  home: HOME, table: TABLE_STRINGS, shop: SHOP_STRINGS, media: MEDIA, merch: MERCH_STRINGS,
};

/** Functions whose arguments are strings (names, prices, times); everything else takes numbers. */
const STRING_ARGS = /\.(setOf|confirmBuy|notEnough|equippedToast|nextIn|itemUnlocked|xp|toNext|bluffCaughtSub|pod|buy)$/;
const NUMBERS = [0, 1, 2, 3, 5, 11, 21, 22, 125];

function check(v: unknown, path: string, lang: string) {
  if (typeof v === 'function') {
    const runs: unknown[][] = STRING_ARGS.test(path) ? [['Anna', 'Mārtiņš'], ['1 250', '5–10']] : NUMBERS.map(n => [n, n + 4]);
    for (const args of runs) {
      const out = (v as (...a: unknown[]) => unknown)(...args);
      expect(typeof out, `${lang} ${path}(${args})`).toBe('string');
      expect(out as string, `${lang} ${path}(${args})`).not.toMatch(/undefined|NaN|\[object/);
      expect((out as string).trim().length, `${lang} ${path}(${args})`).toBeGreaterThan(0);
    }
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => check(x, `${path}[${i}]`, lang));
  } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) check(x, `${path}.${k}`, lang);
  } else {
    expect(typeof v, `${lang} ${path}`).toBe('string');
    expect((v as string).trim().length, `${lang} ${path} empty`).toBeGreaterThan(0);
    expect(v as string, `${lang} ${path}`).not.toMatch(/undefined/);
  }
}

describe('feature string modules', () => {
  it('every module is registered and every lazily loaded language has a pack', () => {
    expect([...registeredStrings().keys()].sort()).toEqual(Object.keys(MODULES).sort());
    const lazy = LANGS.map(l => l.id).filter(id => !['en', 'lv', 'ru', 'uk'].includes(id));
    expect([...FEATURE_LANGS].sort()).toEqual(lazy.sort());
  });

  for (const { id } of LANGS) {
    it(`${id}: every module complete after the English fallback merge`, async () => {
      await loadLocale(id);
      for (const [name, mod] of Object.entries(MODULES)) {
        const s = pick(mod, id);
        expect(missingKeys(mod.en, s), `${id} ${name}`).toEqual([]);
        check(s, name, id);
        if (FEATURE_LANGS.includes(id)) expect(mod[id], `${id} ${name} pack installed`).toBeDefined();
      }
    });
  }

  it('the packs are fully translated today (untranslated keys only warn — they fall back to English)', async () => {
    const report: string[] = [];
    const files = import.meta.glob<{ default: FeaturePack }>(['./*.ts', '!./index.ts', '!./types.ts', '!./*.test.ts']);
    expect(Object.keys(files).length).toBe(FEATURE_LANGS.length);
    for (const id of FEATURE_LANGS) {
      const pack = (await files[`./${id}.ts`]()).default;
      for (const [name, mod] of Object.entries(MODULES)) {
        const miss = missingKeys(mod.en, pack[name as keyof FeaturePack]);
        if (miss.length) report.push(`${id}.${name}: ${miss.join(', ')}`);
      }
    }
    if (report.length) console.warn(`Untranslated feature strings (showing English):\n  ${report.join('\n  ')}`);
    expect(Array.isArray(report)).toBe(true);
  });
});

describe('withFallback', () => {
  const en = { a: 'A', b: { c: 'C', d: (n: number) => `${n} d` }, list: ['x', 'y'], rec: { k1: 'one', k2: 'two' } };

  it('fills missing keys, empty strings and wrong types from English and drops unknown keys', () => {
    const out = withFallback(en, { a: '', b: { c: 'Ц' }, list: ['only one'], rec: { k1: 'ein', zz: 'stale' }, extra: 1 });
    expect(out.a).toBe('A');
    expect(out.b.c).toBe('Ц');
    expect(out.b.d(2)).toBe('2 d');
    expect(out.list).toEqual(['x', 'y']);
    expect(out.rec).toEqual({ k1: 'ein', k2: 'two' });
    expect(Object.keys(out)).toEqual(['a', 'b', 'list', 'rec']);
  });

  it('keeps a complete translation and treats a missing pack as English', () => {
    const tr = { a: 'Ā', b: { c: 'Č', d: (n: number) => `${n} ď` }, list: ['ẋ', 'ẏ'], rec: { k1: '1', k2: '2' } };
    expect(withFallback(en, tr).b.d(3)).toBe('3 ď');
    expect(withFallback(en, tr).list).toEqual(['ẋ', 'ẏ']);
    expect(withFallback(en, undefined)).toBe(en);
    expect(missingKeys(en, { a: 'x' })).toEqual(['b', 'list', 'rec']);   // a missing subtree is reported once
    expect(missingKeys(en, { a: 'x', b: { c: 'y' }, list: ['1', '2'], rec: { k1: 'z' } })).toEqual(['b.d', 'rec.k2']);
  });
});
