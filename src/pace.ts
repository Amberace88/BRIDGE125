import { useCallback, useSyncExternalStore } from 'react';

/**
 * Game rhythm — one place for every "how fast does the table move" number.
 *
 *   · the deal timeline (Table draws it, LocalGame waits for it before the first bot move / the Journey turn clock)
 *   · bot think time in games against bots (calm by default, ~2× faster in fast mode)
 *   · fast mode: the player's own choice (the » glyph in the table's top bar), remembered per device
 *
 * God mode's `fastBots` (src/god/flags.ts → `botDelay`) multiplies on top of all of this.
 */

/* ------------------------------------------------------------------ fast-mode store */

const KEY = 'b125.pace.v1';
interface PaceState { fast: boolean; hint: number }
const DEFAULT: PaceState = { fast: false, hint: 0 };

let cache: PaceState | null = null;
const subs = new Set<() => void>();

function read(): PaceState {
  if (cache) return cache;
  try {
    const j = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<PaceState> | null;
    cache = { fast: !!j?.fast, hint: Number(j?.hint) || 0 };
  } catch { cache = { ...DEFAULT }; }
  return cache;
}
function write(next: PaceState) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: in-memory only */ }
  for (const f of subs) f();
}
function subscribe(f: () => void) {
  subs.add(f);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; f(); } };
  window.addEventListener('storage', onStorage);
  return () => { subs.delete(f); window.removeEventListener('storage', onStorage); };
}

export const getFastMode = () => read().fast;
export const setFastMode = (fast: boolean) => write({ ...read(), fast });
/** The first-use hint under the » glyph has been shown (it shows once per device). */
export const paceHintSeen = () => read().hint > 0;
export const markPaceHint = () => { if (!paceHintSeen()) write({ ...read(), hint: 1 }); };

/** Fast mode for games against bots: `{ fast, toggle, set }`. */
export function useFastMode() {
  const st = useSyncExternalStore(subscribe, read, () => DEFAULT);
  const set = useCallback((v: boolean) => setFastMode(v), []);
  const toggle = useCallback(() => setFastMode(!read().fast), []);
  return { fast: st.fast, toggle, set };
}

/* ------------------------------------------------------------------ tempo */

/** Animation time multiplier for fast mode (cards in the air, the deal, the pause before the round summary). */
export const FAST_TEMPO = 0.62;
/** While "skip to my turn" runs, everything moves at this tempo. */
export const RUSH_TEMPO = 0.4;

/* ------------------------------------------------------------------ deal timeline (seconds) */

export interface DealTimeline {
  /** cards dealt to hands (not counting the starter) */
  total: number;
  /** the deck glides to the table centre, the first card leaves at t0 */
  t0: number;
  /** interval between two cards leaving the deck (round-robin, one card per seat) */
  iv: number;
  /** time a card spends sliding to its seat */
  fly: number;
  /** last hand card lands */
  lastLand: number;
  /** my cards turn over and fan out, one after another, this far apart */
  fanStep: number;
  /** one card's turn-over + fan */
  fanDur: number;
  /** the starter card leaves the deck / turns over on the pile */
  starterAt: number; starterFlip: number;
  /** the whole show is over (the table goes live) */
  end: number;
}

/**
 * The deal, the same on every table (local, online, Journey, Daily): calm, round-robin, ~1.6–2.4 s.
 * `tempo` < 1 shortens everything (fast mode).
 */
export function dealTimeline(players: number, handSize: number, tempo = 1): DealTimeline {
  const n = Math.max(1, players);
  const total = n * Math.max(0, handSize);
  const k = Math.min(1, Math.max(0.3, tempo));
  const t0 = 0.3 * k;
  // a fixed budget for the round-robin, so 2 and 4 players finish within ~0.25 s of each other
  const iv = Math.max(0.062, Math.min(0.1, 0.98 / Math.max(1, total))) * k;
  const fly = 0.4 * Math.max(0.75, k);
  const lastLand = t0 + Math.max(0, total - 1) * iv + fly;
  const fanStep = 0.065 * k;
  const fanDur = 0.4 * Math.max(0.75, k);
  const starterAt = t0 + total * iv + 0.04 * k;
  const starterFlip = Math.max(starterAt + fly, lastLand + 0.06 * k);
  const fanStart = lastLand + 0.06 * k;
  const fanEnd = fanStart + Math.max(0, handSize - 1) * fanStep + fanDur;
  const end = Math.max(fanEnd, starterFlip + 0.5 * Math.max(0.75, k)) + 0.08;
  return { total, t0, iv, fly, lastLand, fanStep, fanDur, starterAt, starterFlip, end };
}

/** Whole deal in ms for a state's table (0 when the player prefers reduced motion — the table then skips the show). */
export function dealMs(players: number, handSize: number, tempo = 1): number {
  if (prefersReducedMotion()) return 0;
  return Math.round(dealTimeline(players, handSize, tempo).end * 1000);
}

export function prefersReducedMotion(): boolean {
  try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/* ------------------------------------------------------------------ bot think time (ms) */

/** Events after which a bot pauses longer, so the moment can land (Q♠, 6♠ redirect, kings, 125 → 0, an 8 chain). */
const HEAVY = new Set(['queen', 'transfer', 'kings', 'reset125', 'eight']);
/** Smaller beats: a skip, a 7, a suit call, a reshuffle. */
const MEDIUM = new Set(['skip', 'seven', 'suit', 'reshuffle']);

export const BOT_PACE = {
  play: 1080,       // was 820
  chooseSuit: 860,  // was 650
  heavy: 1000,      // was 650
  medium: 280,      // new
  jitter: 450,      // was 350
  fast: 0.5,        // fast mode: ~2× quicker
  rush: 150,        // "skip to my turn": a short beat per bot move
} as const;

/**
 * How long a bot "thinks" before acting. `rand` in [0, 1); `god` = god-mode botDelay (1 or 1/3).
 */
export function botDelayMs(o: { events: readonly { t: string }[]; chooseSuit: boolean; fast: boolean; rush?: boolean; god?: number; rand?: number }): number {
  const god = o.god ?? 1;
  if (o.rush) return BOT_PACE.rush * god;
  const heavy = o.events.some(e => HEAVY.has(e.t));
  const medium = !heavy && o.events.some(e => MEDIUM.has(e.t));
  const base = (o.chooseSuit ? BOT_PACE.chooseSuit : BOT_PACE.play) + (heavy ? BOT_PACE.heavy : medium ? BOT_PACE.medium : 0) + (o.rand ?? 0) * BOT_PACE.jitter;
  return base * (o.fast ? BOT_PACE.fast : 1) * god;
}
