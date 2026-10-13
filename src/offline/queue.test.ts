import { describe, expect, it } from 'vitest';
import { LANE_GAP, MAX_AGE, QUEUE_KEY, backoff, classify, laneOf, loadQueue, makeItem, nextWake, pickNext, saveQueue, uuid, type KV, type QItem } from './queue';

const mem = (): KV & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); } };
};
const U = 'u1';

describe('offline queue · storage', () => {
  it('round-trips items and drops junk and expired ones', () => {
    const kv = mem();
    const a = makeItem('game', U, { won: true, mode: 'bots' }, { now: 1000 });
    const b = makeItem('mini', U, { p_game: 'sudoku', p_won: true }, { now: 2000 });
    saveQueue(kv, [a, b]);
    expect(loadQueue(kv, 3000).map(i => i.id)).toEqual([a.id, b.id]);
    // expired
    expect(loadQueue(kv, 1000 + MAX_AGE + 1).map(i => i.id)).toEqual([b.id]);
    // junk
    kv.setItem(QUEUE_KEY, JSON.stringify([{ nope: 1 }, a, { ...b, kind: 'hack' }]));
    expect(loadQueue(kv, 3000).map(i => i.id)).toEqual([a.id]);
    kv.setItem(QUEUE_KEY, '{not json');
    expect(loadQueue(kv)).toEqual([]);
    expect(loadQueue(null)).toEqual([]);
  });

  it('makes v4 uuids (the nonce)', () => {
    const ids = new Set(Array.from({ length: 50 }, uuid));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('offline queue · order and lanes', () => {
  const items: QItem[] = [
    makeItem('game', U, { won: true }, { now: 1 }),
    makeItem('game', U, { won: false }, { now: 2 }),
    makeItem('mini', U, { p_game: 'durak' }, { now: 3 }),
    makeItem('quest', 'other', { events: {} }, { now: 0 }),
  ];
  it('is FIFO per lane, oldest lane head first, only for the signed-in account', () => {
    expect(pickNext(items, U, 100)?.args).toEqual({ won: true });
    expect(pickNext(items, 'nobody', 100)).toBeNull();
    expect(pickNext(items, 'other', 100)?.kind).toBe('quest');
  });
  it('a throttled lane waits without blocking the others', () => {
    const now = 50_000;
    const last = { bridge: now - 5_000 };   // a Bridge game just went out
    expect(pickNext(items, U, now, last)?.kind).toBe('mini');
    expect(nextWake(items.filter(i => i.kind === 'game'), U, last)).toBe(now - 5_000 + LANE_GAP.bridge);
    expect(nextWake(items, U, last)).toBe(0);
    // second game never overtakes the first
    const later = items.map((i, k) => (k === 0 ? { ...i, notBefore: now + 60_000 } : i));
    const n = pickNext(later, U, now + 1, {});
    expect(n?.kind).toBe('mini');
  });
  it('lanes: Bridge games and stakes share record_game\'s throttle, mini games are per game', () => {
    expect(laneOf({ kind: 'stake', args: {} })).toBe('bridge');
    expect(laneOf({ kind: 'game', args: {} })).toBe('bridge');
    expect(laneOf({ kind: 'mini', args: { p_game: 'zole' } })).toBe('mini:zole');
  });
  it('backs off exponentially, capped', () => {
    expect(backoff(1)).toBe(5_000);
    expect(backoff(2)).toBe(10_000);
    expect(backoff(30)).toBe(300_000);
  });
});

describe('offline queue · server answers', () => {
  it('done / dup → done (dup returns the first answer)', () => {
    expect(classify('mini', { data: { ok: true, bm: 5 }, error: null, status: 200 }, 0)).toEqual({ t: 'done', data: { ok: true, bm: 5 } });
    expect(classify('game', { data: { ok: false, error: 'dup', result: { bm: 9 } }, error: null, status: 200 }, 0)).toEqual({ t: 'done', data: { bm: 9 } });
  });
  it('rate limits and network errors are retried', () => {
    expect(classify('quest', { data: { ok: false, error: 'slow', retry_in: 12 }, error: null }, 0)).toEqual({ t: 'retry', ms: 12_500 });
    const net = classify('game', { data: null, error: { message: 'TypeError: Failed to fetch', code: '' }, status: 0 }, 2);
    expect(net).toMatchObject({ t: 'retry', transport: true, ms: backoff(3) });
    expect(classify('game', { data: null, error: { message: 'bad gateway' }, status: 502 }, 0)).toMatchObject({ t: 'retry', transport: true });
    expect(classify('game', { data: null, error: { message: 'JWT expired', code: 'PGRST301' }, status: 401 }, 0)).toMatchObject({ t: 'retry', auth: true });
    // record_game's throttle (plain RPC path) did not count the game → try again after the gap
    expect(classify('game', { data: { games_played: 3, reward: { throttled: true } }, error: null }, 0)).toEqual({ t: 'retry', ms: LANE_GAP.bridge });
  });
  it('final refusals (closed day, bad input, banned) are dropped', () => {
    expect(classify('mini', { data: { ok: false, error: 'bad', field: 'day' }, error: null }, 0)).toEqual({ t: 'drop', reason: 'bad' });
    expect(classify('journey', { data: { ok: false, error: 'locked' }, error: null }, 0)).toEqual({ t: 'drop', reason: 'locked' });
    expect(classify('game', { data: null, error: null, status: 200 }, 0)).toEqual({ t: 'drop', reason: 'null' });
    expect(classify('game', { data: null, error: { code: '22P02', message: 'invalid input' }, status: 400 }, 0)).toEqual({ t: 'drop', reason: '22P02' });
  });
  it('a database without submit_once is detected', () => {
    expect(classify('game', { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.submit_once' }, status: 404 }, 0)).toEqual({ t: 'missing' });
  });
});
