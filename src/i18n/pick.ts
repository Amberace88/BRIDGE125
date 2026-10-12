import { useApp } from '../store';

/**
 * Feature-local string modules. Every module MUST provide English; any other language may be missing
 * (it falls back to English), so new languages can be added without breaking feature modules.
 *
 *   const S: Strings<{ title: string }> = { en: { title: 'Shop' }, lv: { title: 'Veikals' } };
 *   const s = useStrings(S);
 */
export type Strings<T> = { en: T } & { [lang: string]: T | undefined };

export function pick<T>(mod: Strings<T>, lang: string): T {
  return mod[lang] ?? mod.en;
}

export function useStrings<T>(mod: Strings<T>): T {
  const { lang } = useApp();
  return pick(mod, lang);
}
