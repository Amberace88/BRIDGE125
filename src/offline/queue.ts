/**
 * The offline result queue — pure logic (storage + scheduling + answer classification), no network.
 * ./sync.ts drives it. Every item carries a client nonce (uuid) that the server uses to never pay twice for the same
 * result (RPC `submit_once`, supabase/migration_023_offline_nonces.sql).
 *
 * Ordering: items are sent strictly in the order they were recorded *within a lane*. Lanes are the server's rate
 * limits: Bridge games and stake settlements share record_game's 30-second throttle, quest reports have 20 s,
 * achievement stats 20 s, each mini game its own minimum gap. A waiting lane never blocks another one.
 */

export type QKind = 'game' | 'stake' | 'mini' | 'quest' | 'stats' | 'journey';

export interface QItem {
  /** client nonce (uuid v4) — also the idempotency key on the server */
  id: string;
  kind: QKind;
  /** the account the result belongs to — only ever sent for that account */
  uid: string;
  /** the RPC's own arguments (named exactly like the server function's parameters) */
  args: Record<string, unknown>;
  /** recorded at (ms) */
  at: number;
  /** Riga day the result was earned on (quests only count for the day they were played) */
  day?: string;
  tries: number;
  /** don't send before (ms) */
  notBefore: number;
}

/** The server function each kind calls (directly, or wrapped by submit_once). */
export const RPC: Record<QKind, string> = {
  game: 'record_game_plus', stake: 'stake_finish', mini: 'record_minigame', quest: 'quest_progress', stats: 'report_game_stats', journey: 'journey_complete',
};

export const QUEUE_KEY = 'b125.offq.v1';
export const MAX_ITEMS = 300;
export const MAX_AGE = 10 * 86_400_000;
export const MAX_TRIES = 40;
/** server throttles (ms) — the minimum gap between two sends of the same lane */
export const LANE_GAP: Record<string, number> = { bridge: 31_000, quest: 21_000, stats: 21_000, journey: 41_000 };

export const laneOf = (it: Pick<QItem, 'kind' | 'args'>): string =>
  it.kind === 'game' || it.kind === 'stake' ? 'bridge' : it.kind === 'mini' ? `mini:${String(it.args.p_game ?? '')}` : it.kind;

export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void }

const isItem = (x: unknown): x is QItem => {
  const o = x as QItem;
  return !!o && typeof o.id === 'string' && typeof o.kind === 'string' && o.kind in RPC && typeof o.uid === 'string'
    && typeof o.args === 'object' && o.args !== null && typeof o.at === 'number';
};

export function loadQueue(kv: KV | null, now = Date.now()): QItem[] {
  if (!kv) return [];
  try {
    const raw = JSON.parse(kv.getItem(QUEUE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter(isItem).filter(i => now - i.at < MAX_AGE).map(i => ({ ...i, tries: i.tries ?? 0, notBefore: i.notBefore ?? 0 }));
  } catch { return []; }
}

export function saveQueue(kv: KV | null, items: QItem[]) {
  if (!kv) return;
  try { kv.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_ITEMS))); } catch { /* storage full: the newest results win next time */ }
}

export function uuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function makeItem(kind: QKind, uid: string, args: Record<string, unknown>, opts: { day?: string; now?: number } = {}): QItem {
  return { id: uuid(), kind, uid, args, at: opts.now ?? Date.now(), ...(opts.day ? { day: opts.day } : {}), tries: 0, notBefore: 0 };
}

/**
 * The next item to send for `uid`: the oldest item among the lane heads whose time has come (per-lane FIFO).
 * `lastSent` = when each lane last reached the server (its throttle gap applies).
 */
export function pickNext(items: QItem[], uid: string, now: number, lastSent: Record<string, number> = {}): QItem | null {
  const heads = new Map<string, QItem>();
  for (const it of items) { if (it.uid !== uid) continue; const l = laneOf(it); if (!heads.has(l)) heads.set(l, it); }
  let best: QItem | null = null;
  for (const [lane, it] of heads) {
    const ready = Math.max(it.notBefore, lastSent[lane] != null ? lastSent[lane] + (LANE_GAP[lane] ?? 0) : 0);
    if (ready > now) continue;
    if (!best || it.at < best.at) best = it;
  }
  return best;
}

/** When the next item of `uid` becomes due (ms), or null when nothing is queued for it. */
export function nextWake(items: QItem[], uid: string, lastSent: Record<string, number> = {}): number | null {
  const heads = new Map<string, QItem>();
  for (const it of items) { if (it.uid !== uid) continue; const l = laneOf(it); if (!heads.has(l)) heads.set(l, it); }
  let t: number | null = null;
  for (const [lane, it] of heads) {
    const ready = Math.max(it.notBefore, lastSent[lane] != null ? lastSent[lane] + (LANE_GAP[lane] ?? 0) : 0);
    t = t === null ? ready : Math.min(t, ready);
  }
  return t;
}

/** Retry delay after `tries` failed transport attempts: 5 s, 10 s, 20 s … capped at 5 min. */
export const backoff = (tries: number) => Math.min(300_000, 5_000 * 2 ** Math.max(0, tries - 1));

/** What a send produced — supabase-js `{ data, error, status }`, or a thrown error (status 0). */
export interface SendResult { data: unknown; error: { code?: string; message?: string } | null; status?: number }

export type Verdict =
  | { t: 'done'; data: unknown }
  /** the server said "not now" or the network failed — keep, try again after `ms` */
  | { t: 'retry'; ms: number; transport?: boolean; auth?: boolean }
  /** the server refused it for good (closed day, bad input, banned …) — drop quietly */
  | { t: 'drop'; reason: string }
  /** submit_once is not deployed yet — resend through the plain RPC */
  | { t: 'missing' };

export function isMissingFn(e: { code?: string; message?: string } | null | undefined, status?: number): boolean {
  return !!e && (e.code === 'PGRST202' || (status === 404 && /function/i.test(e.message ?? '')) || /could not find the function/i.test(e.message ?? ''));
}

export function classify(kind: QKind, r: SendResult, tries: number): Verdict {
  const { data, error } = r;
  const status = r.status ?? (error ? 0 : 200);
  if (error) {
    if (isMissingFn(error, status)) return { t: 'missing' };
    if (status === 0 || status === 408 || status === 429 || status >= 500 || (/fetch|network|timeout|abort/i.test(error.message ?? '') && !error.code)) {
      return { t: 'retry', ms: backoff(tries + 1), transport: true };
    }
    if (status === 401 || status === 403 || error.code === 'PGRST301' || error.code === 'PGRST303' || /jwt/i.test(error.message ?? '')) {
      return { t: 'retry', ms: 60_000, auth: true };
    }
    return { t: 'drop', reason: error.code || `http ${status}` };
  }
  if (data == null) return { t: 'drop', reason: 'null' };          // signed out / banned on the server side
  const o = data as { ok?: boolean; error?: string; retry_in?: number; result?: unknown; reward?: { throttled?: boolean } };
  if (o.ok === false) {
    if (o.error === 'dup') return { t: 'done', data: o.result ?? data };    // already recorded: same answer as the first time
    if (o.error === 'slow') return { t: 'retry', ms: Math.max(1, Math.min(600, Number(o.retry_in) || 20)) * 1000 + 500 };
    if (o.error === 'auth') return { t: 'retry', ms: 60_000, auth: true };
    if (o.error === 'network') return { t: 'retry', ms: backoff(tries + 1), transport: true };
    return { t: 'drop', reason: o.error ?? 'refused' };
  }
  // record_game's throttle answers "ok" without counting the game (the plain-RPC path before migration 023)
  if ((kind === 'game' || kind === 'stake') && o.reward?.throttled === true) return { t: 'retry', ms: LANE_GAP.bridge };
  return { t: 'done', data };
}
