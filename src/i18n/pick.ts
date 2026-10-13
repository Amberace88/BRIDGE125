import { useApp } from '../store';

/**
 * Feature-local string modules. Every module MUST provide English; any other language may be missing
 * (it falls back to English), so new languages can be added without breaking feature modules.
 *
 *   const S: Strings<{ title: string }> = { en: { title: 'Shop' }, lv: { title: 'Veikals' } };
 *   const s = useStrings(S);
 *
 * The lazily loaded languages (lt, et, pl, de, be, kk, uz, az, ka, hy, ro, bg, es) keep their feature
 * strings in src/i18n/locales/<lang>.ts. Each module registers itself with one line at its end —
 * `registerStrings('home', HOME)` — and the pack is deep-merged over English when the language loads,
 * so a key added to English later simply shows in English until it is translated (never `undefined`).
 */
import type { Strings } from './stringsType';
export type { Strings };

/** Recursively optional: what a translation pack may provide for a module. Functions and arrays are leaves. */
export type DeepPartial<T> =
  T extends (...a: never[]) => unknown ? T
  : T extends readonly unknown[] ? T
  : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export function pick<T>(mod: Strings<T>, lang: string): T {
  return mod[lang] ?? mod.en;
}

export function useStrings<T>(mod: Strings<T>): T {
  const { lang } = useApp();
  return pick(mod, lang);
}

/**
 * Deep-merge a (possibly partial or stale) translation over English, key by key:
 *  - the result always has exactly English's shape — missing keys come from English, unknown keys are dropped;
 *  - a string must be non-empty, a function must be a function;
 *  - arrays are taken whole when their length matches English (items are merged), otherwise English is used.
 */
export function withFallback<T>(en: T, tr: unknown): T {
  if (tr === undefined || tr === null) return en;
  if (typeof en === 'function') return (typeof tr === 'function' ? tr : en) as T;
  if (typeof en === 'string') return (typeof tr === 'string' && tr.trim() ? tr : en) as T;
  if (Array.isArray(en)) {
    return (Array.isArray(tr) && tr.length === en.length ? en.map((v, i) => withFallback(v, tr[i])) : en) as T;
  }
  if (en && typeof en === 'object') {
    if (typeof tr !== 'object' || Array.isArray(tr)) return en;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(en)) out[k] = withFallback((en as Record<string, unknown>)[k], (tr as Record<string, unknown>)[k]);
    return out as T;
  }
  return (typeof tr === typeof en ? tr : en) as T;
}

/** Keys (dot paths) English has but a translation lacks — for tooling/tests, never thrown at runtime. */
export function missingKeys(en: unknown, tr: unknown, path = ''): string[] {
  if (typeof en === 'function') return typeof tr === 'function' ? [] : [path];
  if (typeof en === 'string') return typeof tr === 'string' && tr.trim() ? [] : [path];
  if (Array.isArray(en)) return Array.isArray(tr) && tr.length === en.length ? en.flatMap((v, i) => missingKeys(v, tr[i], `${path}[${i}]`)) : [path];
  if (en && typeof en === 'object') {
    if (!tr || typeof tr !== 'object') return [path || '(all)'];
    return Object.keys(en).flatMap(k => missingKeys((en as Record<string, unknown>)[k], (tr as Record<string, unknown>)[k], path ? `${path}.${k}` : k));
  }
  return [];
}

// ------------------------------------------------------------------------------------------------ registry

const MODULES = new Map<string, Strings<any>>();
const PACKS = new Map<string, Record<string, unknown>>();

function apply(name: string, mod: Strings<any>, lang: string, pack: Record<string, unknown>) {
  // a pack without this module (optional keys in FeaturePack) installs plain English for it
  if (pack[name] !== undefined || mod[lang] === undefined) mod[lang] = withFallback(mod.en, pack[name]);
}

/** Called once at the end of every feature string module. Packs that loaded earlier are applied at once. */
export function registerStrings<T>(name: string, mod: Strings<T>): void {
  MODULES.set(name, mod);
  for (const [lang, pack] of PACKS) apply(name, mod, lang, pack);
}

/** Install a language's feature pack ({ home: {...}, shop: {...}, ... }) into every registered module. */
export function addStringsPack(lang: string, pack: Record<string, unknown>): void {
  PACKS.set(lang, pack);
  for (const [name, mod] of MODULES) apply(name, mod, lang, pack);
}

/** Registered modules by name (tests and tooling). */
export const registeredStrings = (): ReadonlyMap<string, Strings<unknown>> => MODULES;
