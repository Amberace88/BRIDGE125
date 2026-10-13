import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** The live queue against a fake Supabase client: offline → stored; back online → sent in order with nonces. */

type Call = { fn: string; args: Record<string, unknown> };
const calls: Call[] = [];
let answer: (c: Call) => { data: unknown; error: unknown; status?: number } = () => ({ data: { ok: true }, error: null, status: 200 });
const fakeSb = {
  rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => { const c = { fn, args }; calls.push(c); return answer(c); }),
  auth: {
    getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    startAutoRefresh: async () => {}, stopAutoRefresh: async () => {},
  },
};
vi.mock('../supabase', () => ({ getSupabase: async () => fakeSb }));
const applied: unknown[] = [];
vi.mock('../economy/useEconomy', () => ({ applyQueuedGame: (d: unknown) => applied.push(['game', d]), applyQueuedStake: () => {} }));
vi.mock('../games/effects', () => ({ applyMiniResult: (_u: string, d: unknown) => applied.push(['mini', d]) }));
vi.mock('../campaign/questStore', () => ({ applyQueuedQuest: (d: unknown) => applied.push(['quest', d]) }));
vi.mock('../progress/store', () => ({ applyQueuedStats: () => {} }));
vi.mock('../campaign/journeyStore', () => ({ applyQueuedJourney: (d: unknown) => applied.push(['journey', d]) }));

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); },
  key: (i: number) => [...store.keys()][i] ?? null, get length() { return store.size; },
});

const net = await import('./net');
const sync = await import('./sync');

beforeEach(() => { sync.__resetSync(); calls.length = 0; applied.length = 0; store.clear(); answer = () => ({ data: { ok: true }, error: null, status: 200 }); net.__setOnline(true); });
afterEach(() => { vi.useRealTimers(); });

describe('offline sync', () => {
  it('offline: results are stored on the device, nothing is sent', async () => {
    net.__setOnline(false);
    expect(await sync.submitResult('game', 'u1', { won: true, mode: 'bots' })).toBeNull();
    expect(await sync.submitResult('mini', 'u1', { p_game: 'sudoku', p_won: true, p_seconds: 200 })).toBeNull();
    expect(calls).toEqual([]);
    expect(sync.queuedItems().map(i => i.kind)).toEqual(['game', 'mini']);
    expect(sync.pendingCount()).toBe(2);
  });

  it('back online: flushed in order through submit_once with the stored nonce; late answers are applied', async () => {
    net.__setOnline(false);
    await sync.submitResult('journey', 'u1', { match_id: 'riga-1', stars: 3, route: 'lv' });
    await sync.submitResult('mini', 'u1', { p_game: 'durak', p_won: false, p_seconds: 300 });
    const ids = sync.queuedItems().map(i => i.id);
    answer = c => ({ data: { ok: true, echo: c.args.p_kind }, error: null, status: 200 });
    net.__setOnline(true);
    await sync.flushQueue();
    expect(calls.map(c => [c.fn, c.args.p_kind, c.args.p_nonce])).toEqual([
      ['submit_once', 'journey', ids[0]], ['submit_once', 'mini', ids[1]],
    ]);
    expect(calls[0].args.p_args).toEqual({ match_id: 'riga-1', stars: 3, route: 'lv' });
    expect(sync.queuedItems()).toEqual([]);
    expect(applied.map(a => (a as unknown[])[0])).toEqual(['journey', 'mini']);
  });

  it('online: the caller gets the answer itself (no double apply)', async () => {
    answer = () => ({ data: { ok: true, bm: 120 }, error: null, status: 200 });
    const r = await sync.submitResult('mini', 'u1', { p_game: 'zole', p_won: true, p_seconds: 90 });
    expect(r).toEqual({ ok: true, bm: 120 });
    expect(applied).toEqual([]);
    expect(sync.queuedItems()).toEqual([]);
  });

  it('a network failure keeps the result (same nonce next time); a duplicate answer counts as done', async () => {
    answer = () => ({ data: null, error: { message: 'TypeError: Failed to fetch', code: '' }, status: 0 });
    expect(await sync.submitResult('game', 'u1', { won: true })).toBeNull();
    const [it1] = sync.queuedItems();
    expect(it1.tries).toBe(1);
    expect(it1.notBefore).toBeGreaterThan(Date.now());
    // the first request had actually reached the server: the retry is answered 'dup' and nothing is paid twice
    store.set('b125.offq.v1', JSON.stringify([{ ...it1, notBefore: 0 }]));
    answer = () => ({ data: { ok: false, error: 'dup', result: { bm: 500 } }, error: null, status: 200 });
    await sync.flushQueue();
    expect(calls.at(-1)?.args.p_nonce).toBe(it1.id);
    expect(sync.queuedItems()).toEqual([]);
    expect(applied).toEqual([['game', { bm: 500 }]]);
  });

  it('refused for good (e.g. the daily day closed) → dropped quietly', async () => {
    answer = () => ({ data: { ok: false, error: 'bad', field: 'day' }, error: null, status: 200 });
    expect(await sync.submitResult('mini', 'u1', { p_game: 'sudoku', p_day: '2020-01-01', p_won: true, p_seconds: 99 })).toBeNull();
    expect(sync.queuedItems()).toEqual([]);
  });

  it('falls back to the plain RPC while migration 023 is not applied', async () => {
    answer = c => (c.fn === 'submit_once'
      ? { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.submit_once' }, status: 404 }
      : { data: { games_played: 7, reward: { throttled: false } }, error: null, status: 200 });
    const r = await sync.submitResult('game', 'u1', { won: true, mode: 'bots' });
    expect(r).toEqual({ games_played: 7, reward: { throttled: false } });
    expect(calls.map(c => c.fn)).toEqual(['submit_once', 'record_game_plus']);
    expect(calls[1].args).toEqual({ won: true, mode: 'bots' });
  });

  it('results of another account wait for that account', async () => {
    net.__setOnline(false);
    await sync.submitResult('game', 'someone-else', { won: true });
    net.__setOnline(true);
    await sync.flushQueue();
    expect(calls).toEqual([]);
    expect(sync.queuedItems()).toHaveLength(1);
  });
});
