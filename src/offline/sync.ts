import { getSupabase } from '../supabase';
import { isOnline, onNetChange } from './net';
import {
  QUEUE_KEY, RPC, MAX_TRIES, classify, laneOf, loadQueue, makeItem, nextWake, pickNext, saveQueue,
  type KV, type QItem, type QKind, type SendResult,
} from './queue';

/**
 * The offline result queue, live: results of local games are written to the device first, then sent — at once when
 * online, otherwise as soon as the connection (and the account's session) is back. In order per lane, respecting the
 * server's rate limits, each with its nonce (see ./queue.ts and migration 023).
 *
 *   const r = await submitResult('game', uid, { won, mode });   // server answer, or null = queued for later
 *
 * A result that is answered later is applied app-wide by its kind's applier (balance, level, quest board …) —
 * the screen that recorded it is long gone by then.
 */

type Applier = (data: unknown, item: QItem) => void | Promise<void>;
const appliers: Partial<Record<QKind, () => Promise<Applier>>> = {
  game: () => import('../economy/useEconomy').then(m => m.applyQueuedGame),
  stake: () => import('../economy/useEconomy').then(m => m.applyQueuedStake),
  mini: () => import('../games/effects').then(m => ((d: unknown, it: QItem) => {
    const out = d as Record<string, unknown> | null;
    if (out?.ok) m.applyMiniResult(it.uid, out);
  })),
  quest: () => import('../campaign/questStore').then(m => m.applyQueuedQuest),
  stats: () => import('../progress/store').then(m => m.applyQueuedStats),
  journey: () => import('../campaign/journeyStore').then(m => m.applyQueuedJourney),
};

const kv = (): KV | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

/* ------------------------------------------------------------------ pending count (for the offline pill) */
const subs = new Set<() => void>();
let count = loadQueue(kv()).length;
function changed() { const n = loadQueue(kv()).length; if (n !== count) { count = n; subs.forEach(f => f()); } }
export const pendingCount = () => count;
export const onPending = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

function mutate(fn: (items: QItem[]) => QItem[]) {
  const store = kv();
  saveQueue(store, fn(loadQueue(store)));
  changed();
}

/* ------------------------------------------------------------------ sending */

/** submit_once is not deployed (pre-023 database): send the plain RPCs instead, for this session. */
let plain = false;
/** last time each lane reached the server (its throttle gap starts there) */
const lastSent: Record<string, number> = {};
const waiters = new Map<string, (data: unknown) => void>();

type SB = NonNullable<Awaited<ReturnType<typeof getSupabase>>>;

async function send(sb: SB, it: QItem): Promise<SendResult> {
  try {
    if (!plain) {
      const r = await sb.rpc('submit_once', { p_nonce: it.id, p_kind: it.kind, p_args: it.args });
      const v = classify(it.kind, r, it.tries);
      if (v.t !== 'missing') return r;
      plain = true;
    }
    return await sb.rpc(RPC[it.kind], it.args);
  } catch (e) {
    return { data: null, error: { message: String((e as Error)?.message ?? e) }, status: 0 };
  }
}

const riga = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

let running: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let currentUid: string | null = null;

function schedule(at: number | null) {
  if (timer) { clearTimeout(timer); timer = null; }
  if (at == null) return;
  timer = setTimeout(() => { timer = null; void flushQueue(); }, Math.max(250, at - Date.now()));
}

async function finish(it: QItem, data: unknown) {
  const w = waiters.get(it.id);
  if (w) { waiters.delete(it.id); w(data); return; }
  try { const apply = await appliers[it.kind]?.(); await apply?.(data, it); } catch { /* the result is on the server; the UI catches up on next load */ }
}
function release(it: QItem) {
  const w = waiters.get(it.id);
  if (w) { waiters.delete(it.id); w(null); }
}

async function run(): Promise<void> {
  if (!isOnline()) return;
  const sb = await getSupabase().catch(() => null);
  if (!sb) return;
  let uid: string | null = null;
  try { uid = (await sb.auth.getSession()).data.session?.user.id ?? null; } catch { uid = null; }
  currentUid = uid;
  if (!uid) { loadQueue(kv()).forEach(release); return; }
  for (let guard = 0; guard < 500; guard++) {
    if (!isOnline()) return;
    const items = loadQueue(kv());
    const now = Date.now();
    const it = pickNext(items, uid, now, lastSent);
    if (!it) { items.filter(i => i.uid !== uid).forEach(release); schedule(nextWake(items, uid, lastSent)); return; }
    // quest progress only counts for the Riga day it was played on
    if (it.kind === 'quest' && it.day && it.day !== riga()) { mutate(xs => xs.filter(x => x.id !== it.id)); release(it); continue; }
    const r = await send(sb, it);
    const v = classify(it.kind, r, it.tries);
    const lane = laneOf(it);
    if (v.t === 'done') {
      lastSent[lane] = Date.now();
      mutate(xs => xs.filter(x => x.id !== it.id));
      await finish(it, v.data);
    } else if (v.t === 'drop') {
      lastSent[lane] = Date.now();
      mutate(xs => xs.filter(x => x.id !== it.id));
      release(it);
    } else if (v.t === 'retry') {
      const tries = it.tries + 1;
      if (tries > MAX_TRIES) { mutate(xs => xs.filter(x => x.id !== it.id)); release(it); continue; }
      mutate(xs => xs.map(x => (x.id === it.id ? { ...x, tries: v.transport ? tries : x.tries, notBefore: Date.now() + v.ms } : x)));
      release(it);   // the caller stops waiting; the applier takes over when it goes through
      if (v.transport && !isOnline()) return;
    } else {
      // 'missing' can't come back from send() — treat like a transport error
      mutate(xs => xs.map(x => (x.id === it.id ? { ...x, notBefore: Date.now() + 30_000 } : x)));
      release(it);
    }
  }
}

/** Send whatever is due now (one runner per tab; tabs coordinate through a Web Lock when available). */
let again = false;
export function flushQueue(): Promise<void> {
  // a flush asked for while one runs: that one goes round once more (it may have looked at the queue already)
  if (running) { again = true; return running; }
  const locks = (typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined);
  const go = async () => { do { again = false; await run().catch(() => {}); } while (again); };
  running = (locks ? locks.request('b125-offq', go).then(() => {}) : go())
    .finally(() => { running = null; });
  return running;
}

/**
 * Record a result: stored on the device first, then sent. Resolves to the server's answer, or null when it is
 * queued for later (offline, network error, rate-limited) or the server refused it for good.
 * `waitMs`: how long the caller is willing to wait for the answer before it is handed to the applier instead.
 */
export async function submitResult(kind: QKind, uid: string, args: Record<string, unknown>, opts: { day?: string; waitMs?: number } = {}): Promise<unknown> {
  const it = makeItem(kind, uid, args, { day: opts.day ?? (kind === 'quest' ? riga() : undefined) });
  mutate(xs => [...xs, it]);
  if (!isOnline()) return null;
  const answer = new Promise<unknown>(res => {
    waiters.set(it.id, res);
    setTimeout(() => { if (waiters.get(it.id) === res) { waiters.delete(it.id); res(null); } }, opts.waitMs ?? 12_000);
  });
  void flushQueue();
  return answer;
}

/** Tests: forget lane throttles and the plain-RPC fallback. */
export function __resetSync() { plain = false; for (const k of Object.keys(lastSent)) delete lastSent[k]; schedule(null); }

/** Results waiting on this device (all accounts). */
export const queuedItems = (): QItem[] => loadQueue(kv());

/* ------------------------------------------------------------------ reconnect hooks */

type Hook = () => void | Promise<void>;
const hooks: Hook[] = [];
/** Run `f` whenever the connection comes back (and once at start when online). */
export function onReconnect(f: Hook) { hooks.push(f); }

/** Things that live in their own stores (Daily results keep their own local record and are idempotent server-side). */
let reconnecting: Promise<void> | null = null;
let reconnectedAt = 0;
function reconnectStores(): Promise<void> {
  // several triggers fire together (online event, session refresh): one pass is enough
  if (reconnecting) return reconnecting;
  if (Date.now() - reconnectedAt < 10_000) return Promise.resolve();
  reconnecting = syncStores().then(done => { if (done) reconnectedAt = Date.now(); }).finally(() => { reconnecting = null; });
  return reconnecting;
}
async function syncStores(): Promise<boolean> {
  if (!currentUid) return false;   // guests (or no session yet): nothing on the server to sync
  try {
    const daily = JSON.parse(localStorage.getItem('b125.daily.v1') ?? '{}') as Record<string, { submitted?: boolean; rejected?: string }>;
    if (Object.values(daily).some(e => e && !e.submitted && !e.rejected)) await (await import('../daily/store')).resubmitPendingDaily();
  } catch { /* */ }
  for (const h of hooks) { try { await h(); } catch { /* */ } }
  return true;
}

let started = false;
/** Wire the queue to the connection and the session. Called once by the app (src/offline/OfflineLayer). */
export function startOfflineSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const sync = () => { void flushQueue().then(reconnectStores); };
  onNetChange(() => {
    void getSupabase().then(sb => {
      if (!sb) return;
      // no token refresh attempts while offline (they could only fail); resume when back
      try { if (isOnline()) void sb.auth.startAutoRefresh(); else void sb.auth.stopAutoRefresh(); } catch { /* */ }
    });
    if (isOnline()) sync(); else schedule(null);
  });
  window.addEventListener('storage', e => { if (e.key === QUEUE_KEY) changed(); });
  void getSupabase().then(sb => {
    sb?.auth.onAuthStateChange((ev, s) => {
      const uid = s?.user.id ?? null;
      if (uid && (ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION' || ev === 'TOKEN_REFRESHED') && uid !== currentUid) setTimeout(sync, 1500);
    });
  });
  if (isOnline()) setTimeout(sync, 3000);
}
