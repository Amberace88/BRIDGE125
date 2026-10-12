import { DICTS, type Lang } from '../i18n';
import { EXTRA } from '../i18n2';
import { EXTRA2, LEGAL } from '../i18n3';
import type { LocalePack } from './types';
import { loadFeatureStrings } from '../i18n/locales';

/**
 * Lazily loaded languages. en/lv/ru/uk are bundled in the main chunk; each language below is its
 * own small chunk, fetched on first use. Until it arrives the string maps hold English.
 *
 * To add a language: create src/locales/<code>.ts exporting a default `LocalePack`, add the code
 * to `Lang` + `LANGS` in src/i18n.ts, and add one line here.
 */
const LOADERS: Partial<Record<Lang, () => Promise<{ default: LocalePack }>>> = {
  lt: () => import('./lt'),
  et: () => import('./et'),
  pl: () => import('./pl'),
  de: () => import('./de'),
  be: () => import('./be'),
  kk: () => import('./kk'),
  uz: () => import('./uz'),
  az: () => import('./az'),
  ka: () => import('./ka'),
  hy: () => import('./hy'),
  ro: () => import('./ro'),
  bg: () => import('./bg'),
  es: () => import('./es'),
};

const loaded = new Set<Lang>(['en', 'lv', 'ru', 'uk']);
const pending = new Map<Lang, Promise<void>>();

export function register(lang: Lang, pack: LocalePack) {
  DICTS[lang] = pack.dict;
  EXTRA[lang] = pack.extra;
  EXTRA2[lang] = pack.extra2;
  LEGAL.privacy[lang] = pack.privacy;
  LEGAL.terms[lang] = pack.terms;
  loaded.add(lang);
}

export const isLocaleLoaded = (lang: Lang) => loaded.has(lang) || !LOADERS[lang];

/** Make a language's strings available. Never rejects: on failure the UI simply stays in English. */
export function loadLocale(lang: Lang): Promise<void> {
  if (isLocaleLoaded(lang)) return Promise.resolve();
  let p = pending.get(lang);
  if (!p) {
    // core pack + feature strings (src/i18n/locales) in parallel; the feature loader never rejects
    p = Promise.all([LOADERS[lang]!(), loadFeatureStrings(lang)]).then(([m]) => register(lang, m.default)).catch(() => { pending.delete(lang); });
    pending.set(lang, p);
  }
  return p;
}

/** Warm the chunk (e.g. on hover/focus in the picker) without waiting for it. */
export const preloadLocale = (lang: Lang) => { void loadLocale(lang); };
