// Seed contract helpers (see `GameScreenProps.seed` in ./types.ts): a challenge seed is a short URL-safe string; every
// game turns it into the number its own seeded generator starts from — the same on every device and build.

/** A valid challenge seed (the same rule as SEED_RE in ./challenge/compare.ts and the server). */
export const isSeed = (x: unknown): x is string => typeof x === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(x);

/** FNV-1a 32-bit + a final avalanche (so seeds that differ by one letter land far apart). */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * The number a game deals from for `seed`. A seed of plain digits within `min` … `max` IS that number — so a game
 * can report its own numeric deal seed (`String(n)`) and a friend's device replays exactly it. Anything else is
 * hashed with the game's `salt` (different games get unrelated deals from the same seed) into 1 … `max`.
 */
export function seedNumber(seed: string, salt: string, max = 0xffffffff, min = 1): number {
  if (/^\d{1,10}$/.test(seed)) {
    const n = Number(seed);
    if (n >= min && n <= max) return n;
  }
  return (hash32(`${salt}:${seed}`) % max) + 1;
}

/** The challenge's level when this game knows it, else the player's own choice. */
export const pickLevel = <T extends string>(level: string | undefined, allowed: readonly T[], fallback: T): T =>
  level && (allowed as readonly string[]).includes(level) ? (level as T) : fallback;
