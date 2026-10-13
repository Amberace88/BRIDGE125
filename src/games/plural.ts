// Plural agreement for the mini games' translations (src/games/<id>/lang/*.ts) — the same rules the feature packs in
// src/i18n/locales/*.ts use (be3 / pl3 / lt3 / roN), shared here so every game picks the right form after a number.

/** East Slavic (ru, uk, be): 1, 21… one · 2–4, 22–24… few · 0, 5–20, 25… many. */
export const slav3 = (n: number, one: string, few: string, many: string): string => {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
};

/** Polish: 1 partię · 2–4 partie (22, 34…) · 5+ partii (12–14 too). */
export const pl3 = (n: number, one: string, few: string, many: string): string => {
  const a = Math.abs(n);
  return a === 1 ? one : a % 10 >= 2 && a % 10 <= 4 && (a % 100 < 12 || a % 100 > 14) ? few : many;
};

/** Lithuanian: 1, 21, 31… partija · 2–9, 22–29… partijos · 0, 10–20, 30… partijų. */
export const lt3 = (n: number, one: string, few: string, many: string): string => {
  const a = Math.abs(n);
  return a % 10 === 1 && a % 100 !== 11 ? one : a % 10 >= 2 && (a % 100 < 10 || a % 100 >= 20) ? few : many;
};

/** Romanian: "1 carte" · "3 cărți" · "20 de cărți" (the number is included). */
export const roN = (n: number, one: string, many: string): string => {
  const a = Math.abs(n);
  return a === 1 ? `${n} ${one}` : `${n} ${a !== 0 && (a % 100 === 0 || a % 100 >= 20) ? 'de ' : ''}${many}`;
};

/** One / other (de, es, bg, et, …). */
export const two = (n: number, one: string, many: string): string => (Math.abs(n) === 1 ? one : many);

/** "a, b and c" with the language's own "and". */
export const listAnd = (and: string) => (xs: (string | number)[]): string =>
  xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ` ${and} ` + xs[xs.length - 1];
