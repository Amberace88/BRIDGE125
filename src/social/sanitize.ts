/**
 * Table chat hygiene — shared by the Worker (authoritative) and the client (instant feedback).
 * Pure functions only: no DOM, no Worker APIs, so `worker/room.ts` and the unit tests import this file directly.
 */

export const CHAT_MAX = 140;
export const CHAT_HISTORY = 50;
/** Rate limit: at most CHAT_BURST messages per CHAT_WINDOW_MS per player. */
export const CHAT_BURST = 5;
export const CHAT_WINDOW_MS = 10_000;

/** One-tap phrases are sent as keys, so every player reads them in their own language. */
export const QUICK_KEYS = ['gl', 'nice', 'oops', 'wp', 'hurry', 'rematch', 'thanks', 'gg'] as const;
export type QuickKey = (typeof QUICK_KEYS)[number];
export const isQuickKey = (k: unknown): k is QuickKey => typeof k === 'string' && (QUICK_KEYS as readonly string[]).includes(k);

/** Chat emoji shortcuts shown in the dock (plain emoji text — any emoji typed by hand also works). */
export const CHAT_EMOJI = ['😂', '😅', '😎', '🤔', '😱', '🔥', '👏', '🍀', '♠️', '♥️', '🥂', '👑'];

// Control + format characters (bidi overrides, zero-width tricks…). ZWJ (U+200D) stays: it glues emoji sequences.
const CONTROL = new RegExp('[\\p{Cc}\\p{Co}\\p{Cs}]|(?!\\u200D)\\p{Cf}', 'gu');
const SPACES = new RegExp('[\\s\\u00A0\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000]+', 'gu');
const LONG_RUN = /(.)\1{7,}/gu;                               // "!!!!!!!!!!!!" → 7 max
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[\p{L}\p{N}-]{2,}\.(?:com|net|org|ru|lv|ua|io|gg|me|xyz|top|link|ly|to|cc|tk|biz|info|site|online|club|shop)(?:\/\S*)?\b/giu;

/*
 * Small multilingual profanity list (en, lv, ru, uk, de, pl). Three kinds, checked on a normalised copy of each word
 * (lower case, ё→е, common leetspeak, punctuation removed); the original word is masked:
 *   INFIX  — masked when the word *contains* it (long, unambiguous stems that appear inside compounds)
 *   PREFIX — masked when the word *starts with* it (inflected languages: ru/uk/pl/lv/de endings)
 *   WORDS  — exact whole words only (short words that would otherwise hit innocent ones: "dick" vs "Dickens")
 * Prefix (not infix) matching keeps "рубля", "Херсон", "fickle", "Fukushima" clean.
 */
const INFIX = ['fuck', 'motherf', 'nigger', 'faggot', 'пизд', 'хуй', 'хуё', 'ебан', 'ебат', 'заеб', 'kurw', 'pierdol', 'jeba', 'scheiß', 'scheiss', 'hurensohn'];
const PREFIX = [
  // en
  'fukk', 'fukin', 'fuking', 'shit', 'bitch', 'cunt', 'asshole', 'nigga', 'retard', 'whore', 'slut', 'dickhead', 'bastard', 'wank',
  // lv
  'pimpi', 'pizd', 'pidar', 'pidor', 'mauka', 'dirsā', 'dirsa', 'sūds', 'sūdu', 'sūdi', 'kuce', 'debil', 'nahuj', 'blet', 'bļaģ',
  // ru / uk
  'хуе', 'хуя', 'нахуй', 'ебал', 'ебну', 'еблан', 'выеб', 'уеб', 'бля', 'сука', 'суки', 'мудак', 'мудил', 'пидор', 'пидар',
  'залуп', 'гандон', 'шлюх', 'дебил', 'курва', 'курви', 'підор', 'підар', 'срака',
  // de
  'arschloch', 'wichser', 'schlampe', 'missgeburt', 'ficken', 'ficker', 'gefickt', 'fotze',
  // pl
  'kurwa', 'chuj', 'huj', 'spierdal', 'skurwy', 'pizda', 'cipa', 'cwel', 'jebać', 'jebac',
];
const WORDS = ['fuk', 'dick', 'cock', 'fag', 'twat', 'fick', 'arsch', 'ass'];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', 'ё': 'е' };
function norm(word: string): string {
  let out = '';
  for (const ch of word.toLowerCase()) out += LEET[ch] ?? ch;
  return out.replace(/[^\p{L}]/gu, '');
}

/** Mask offensive words: every letter becomes "•" except the first. Returns the text and whether anything was masked. */
export function maskProfanity(text: string): { text: string; masked: boolean } {
  let masked = false;
  const out = text.replace(/[\p{L}\p{N}@$*_.'-]+/gu, w => {
    const n = norm(w);
    if (!n) return w;
    const bad = WORDS.includes(n) || INFIX.some(x => n.includes(x)) || PREFIX.some(x => n.startsWith(x));
    if (!bad) return w;
    masked = true;
    const chars = Array.from(w);
    return chars[0] + '•'.repeat(Math.max(2, chars.length - 1));
  });
  return { text: out, masked };
}

export interface CleanChat { text: string; masked: boolean; links: boolean }

/**
 * Normalise one chat line: strip control/format characters, collapse whitespace, cap repeated characters,
 * replace links (scam protection), mask profanity and cut to CHAT_MAX code points. Returns null when nothing is left.
 */
export function sanitizeChat(raw: unknown): CleanChat | null {
  if (typeof raw !== 'string') return null;
  let s = raw.slice(0, CHAT_MAX * 4).normalize('NFC').replace(SPACES, ' ').replace(CONTROL, '').trim();
  s = s.replace(LONG_RUN, (_m, c: string) => c.repeat(7));
  let links = false;
  s = s.replace(URL_RE, () => { links = true; return '🔗'; });
  const cut = Array.from(s);
  if (cut.length > CHAT_MAX) s = cut.slice(0, CHAT_MAX).join('').trim();
  if (!s) return null;
  const m = maskProfanity(s);
  return { text: m.text, masked: m.masked, links };
}

/** Sliding-window limiter keyed by player (works in the Durable Object and in tests). */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  private readonly burst: number;
  private readonly windowMs: number;
  constructor(burst = CHAT_BURST, windowMs = CHAT_WINDOW_MS) { this.burst = burst; this.windowMs = windowMs; }
  /** true = allowed (and counted); false = over the limit. */
  allow(key: string, now = Date.now()): boolean {
    const list = (this.hits.get(key) ?? []).filter(t => now - t < this.windowMs);
    if (list.length >= this.burst) { this.hits.set(key, list); return false; }
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 500) for (const [k, v] of this.hits) if (!v.some(t => now - t < this.windowMs)) this.hits.delete(k);
    return true;
  }
  /** ms until the next message is allowed (0 = now). */
  waitMs(key: string, now = Date.now()): number {
    const list = (this.hits.get(key) ?? []).filter(t => now - t < this.windowMs);
    return list.length < this.burst ? 0 : this.windowMs - (now - list[0]);
  }
}

/** A chat line as the server broadcasts it. `q` = quick phrase key (text is then empty and localised on display). */
export interface ChatMsg { id: number; seat: number; name: string; text: string; q?: QuickKey; at: number; masked?: boolean }
