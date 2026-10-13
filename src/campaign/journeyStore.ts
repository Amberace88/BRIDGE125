import { useEffect, useSyncExternalStore } from 'react';
import { useApp } from '../store';
import { patchData, pushToast } from '../progress/store';
import { track } from '../analytics';
import { MATCHES, type StarMap } from './data';
import { journeyCompleteRpc, journeyImportRpc, journeyProgressRpc, type JourneyCompleteResult } from './api';

/**
 * Journey progress (best stars per match), shared by every useJourney() caller.
 *  - guests: localStorage `b125.journey.guest`;
 *  - signed in: the server (journey_progress / journey_complete) plus a per-account local cache, so the map keeps working
 *    before migration 011 runs or while offline. Guest progress is imported once the player signs in (journey_import).
 */

const GUEST_KEY = 'b125.journey.guest';
const userKey = (uid: string) => `b125.journey.u.${uid}`;

function read(key: string): StarMap {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: StarMap = {};
    for (const m of MATCHES) { const v = Number(o[m.id]); if (v >= 1) out[m.id] = Math.min(3, Math.floor(v)); }
    return out;
  } catch { return {}; }
}
function write(key: string, s: StarMap) { try { localStorage.setItem(key, JSON.stringify(s)); } catch { /* */ } }
function clear(key: string) { try { localStorage.removeItem(key); } catch { /* */ } }

export function mergeStars(...maps: StarMap[]): StarMap {
  const out: StarMap = {};
  for (const m of maps) for (const [k, v] of Object.entries(m)) if (v > 0) out[k] = Math.max(out[k] ?? 0, Math.min(3, v));
  return out;
}

interface JState { uid: string | null; status: 'idle' | 'loading' | 'ready' | 'offline'; stars: StarMap }
let state: JState = { uid: null, status: 'idle', stars: read(GUEST_KEY) };
const subs = new Set<() => void>();
const set = (p: Partial<JState>) => { state = { ...state, ...p }; subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const getState = () => state;

let loading: string | null = null;
export async function loadJourney(uid: string | null) {
  if (!uid) { if (state.uid !== null || state.status === 'idle') set({ uid: null, status: 'ready', stars: read(GUEST_KEY) }); return; }
  if (state.uid === uid && (state.status === 'ready' || loading === uid)) return;
  loading = uid;
  const local = read(userKey(uid));
  set({ uid, status: 'loading', stars: mergeStars(local, read(GUEST_KEY)) });
  let server = await journeyProgressRpc();
  if (state.uid !== uid) return;
  const guest = read(GUEST_KEY);
  if (server && Object.keys(guest).length) {
    const r = await journeyImportRpc(guest);
    if (r?.ok) {
      clear(GUEST_KEY);
      track('journey_import', { matches: r.imported ?? 0 });
      if (r.stars) server = { stars: r.stars, total: 0 };
      if (typeof r.bm === 'number') patchData({ bm: r.bm, ...(r.owned ? { owned: r.owned } : {}) });
    }
  }
  if (state.uid !== uid) return;
  loading = null;
  const merged = mergeStars(local, server?.stars ?? {}, read(GUEST_KEY));
  write(userKey(uid), merged);
  set({ status: server ? 'ready' : 'offline', stars: merged });
}

export type CompleteResult = JourneyCompleteResult & { guest?: boolean; offline?: boolean };

/** Record a won match (stars 1..3). Updates the map at once; the server grants the rewards. */
export async function completeMatch(matchId: string, stars: number): Promise<CompleteResult> {
  const uid = state.uid;
  const prev = state.stars[matchId] ?? 0;
  const next = mergeStars(state.stars, { [matchId]: stars });
  set({ stars: next });
  write(uid ? userKey(uid) : GUEST_KEY, next);
  track('journey_win', { match: matchId, stars, prev });
  if (!uid) return { ok: true, guest: true, stars: Math.max(prev, stars), prev, new_stars: Math.max(0, stars - prev), first: prev === 0 };
  let r = await journeyCompleteRpc(matchId, stars);
  if (r && !r.ok && r.error === 'slow') {
    await new Promise(res => setTimeout(res, Math.min(45, Math.max(1, r?.retry_in ?? 10)) * 1000));
    r = await journeyCompleteRpc(matchId, stars);
  }
  if (!r) return { ok: true, offline: true, stars: Math.max(prev, stars), prev, new_stars: Math.max(0, stars - prev), first: prev === 0 };
  if (r.ok) {
    patchData({
      ...(typeof r.bm === 'number' ? { bm: r.bm } : {}), ...(r.owned ? { owned: r.owned } : {}),
      ...(typeof r.xp === 'number' && typeof r.level === 'number' ? { xp: r.xp, level: r.level } : {}),
    });
    const rw = r.reward;
    if (rw && (rw.level ?? 0) > (rw.level_from ?? 0)) setTimeout(() => pushToast({ kind: 'level', level: rw.level!, bm: rw.level_bm ?? 0 }), 2200);
  }
  return r;
}

export function useJourney() {
  const app = useApp();
  const uid = app.session?.user.id ?? null;
  const st = useSyncExternalStore(subscribe, getState, getState);
  useEffect(() => { void loadJourney(uid); }, [uid]);
  return { stars: st.uid === uid ? st.stars : (uid ? {} : read(GUEST_KEY)), status: st.status, signedIn: !!uid, complete: completeMatch };
}
