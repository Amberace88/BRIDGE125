/**
 * Deck "digital twin" codes: B125-<DECK>-XXXX-XXXX-C
 *
 * Print-on-demand decks are identical copies, so a unique code cannot be printed in the box. The box carries a QR
 * (bridge125.com/?source=deck_<id>) and the line "unlock this exact card back in the game"; the unique code is
 * issued per order by fulfilment (order e-mail / packing slip) with `makeTwinCode(deck, random bytes)` and stored
 * server-side as a hash. The trailing check character only catches typos — validity is decided by the server.
 * Alphabet: Crockford base32 (no I, L, O, U), case-insensitive; O→0, I/L→1 are accepted on input.
 */
export const TWIN_PREFIX: Record<string, string> = {
  signature: 'SIG', baltic: 'BAL', slavic: 'SLV', caucasus: 'SLK', iberian: 'IBR', bauhaus: 'BAU', neon: 'NEO', ivory: 'IVO',
};
const A = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function check(body: string): string {
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum = (sum * 7 + (A.indexOf(body[i]) + 1) * (i + 3)) % 32;
  return A[sum];
}

/** 8 random base32 characters (from ≥ 5 random bytes) → a printable code. */
export function makeTwinCode(deckId: string, random: Uint8Array): string {
  const p = TWIN_PREFIX[deckId];
  if (!p) throw new Error(`unknown deck ${deckId}`);
  if (random.length < 5) throw new Error('need ≥ 5 random bytes');
  let bits = 0n;
  for (let i = 0; i < 5; i++) bits = (bits << 8n) | BigInt(random[i]);
  let r = '';
  for (let i = 0; i < 8; i++) { r = A[Number(bits & 31n)] + r; bits >>= 5n; }
  const body = p + r;
  return `B125-${p}-${r.slice(0, 4)}-${r.slice(4)}-${check(body)}`;
}

/** Normalise user input and check the format + check character. → deck id or null. */
export function parseTwinCode(input: string): { deckId: string; code: string } | null {
  const s = input.toUpperCase().replace(/[\s_]+/g, '');
  const m = /^B125-?([A-Z]{3})-?([0-9A-Z]{4})-?([0-9A-Z]{4})-?([0-9A-Z])$/.exec(s);
  if (!m) return null;
  const fix = (x: string) => x.replace(/O/g, '0').replace(/[IL]/g, '1');   // only the random part is base32
  const [a, b, c] = [fix(m[2]), fix(m[3]), fix(m[4])];
  const deckId = Object.keys(TWIN_PREFIX).find(k => TWIN_PREFIX[k] === m[1]);
  const r = a + b;
  if (!deckId || [...r + c].some(ch => !A.includes(ch)) || check(m[1] + r) !== c) return null;
  return { deckId, code: `B125-${m[1]}-${a}-${b}-${c}` };
}
