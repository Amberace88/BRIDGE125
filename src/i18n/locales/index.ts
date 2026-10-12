import { addStringsPack } from '../pick';
import type { FeaturePack } from './types';

/**
 * Feature-module strings (home, table, shop, media, merch) for the lazily loaded languages.
 * en/lv/ru/uk live inline in the modules; every language below is one chunk, loaded alongside the
 * core locale by `loadLocale()` in src/locales/index.ts.
 *
 * To add a language: create ./<code>.ts exporting a default `FeaturePack` and add one line here.
 */
const LOADERS: Record<string, () => Promise<{ default: FeaturePack }>> = {
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

export const FEATURE_LANGS = Object.keys(LOADERS);

const pending = new Map<string, Promise<void>>();

/** Fetch and install a language's feature strings. Never rejects — on failure those screens stay in English. */
export function loadFeatureStrings(lang: string): Promise<void> {
  const load = LOADERS[lang];
  if (!load) return Promise.resolve();
  let p = pending.get(lang);
  if (!p) {
    p = load().then(m => addStringsPack(lang, m.default as unknown as Record<string, unknown>)).catch(() => { pending.delete(lang); });
    pending.set(lang, p);
  }
  return p;
}
