import { useEffect, useSyncExternalStore } from 'react';
import { useApp } from '../store';
// the progress store (and its achievement tables) only matters once the server grants something — loaded on demand,
// so Home's star badge doesn't pull it into the first paint
const progressStore = () => import('../progress/store');
import { track } from '../analytics';
import { ALL_MATCH_IDS, defaultRoute, hasAnyStar, isRouteId, type RouteId, type StarMap } from './data';
import { journeyCompleteRpc, journeyImportRpc, journeyProgressRpc, journeySetRouteRpc, type JourneyCompleteResult } from './api';

/**
 * Journey progress (best stars per match) and the player's ROUTE, shared by every useJourney() caller.
 *  - guests: localStorage `b125.journey.guest` (stars) + `b125.journey.route`;
 *  - signed in: the server (journey_progress / journey_complete / journey_set_route) plus a per-account local cache, so
 *    the map keeps working before migration 018 runs or while offline. Guest progress (and its route) is imported once
 *    the player signs in (journey_import).
 *
 * A player without a stored route follows `defaultRoute()`: the original order when they already won something (they
 * started before routes existed), otherwise the home city of their language. The Journey screen stores that choice on
 * first open (`ensureRoute`); after the first star only admin / god accounts may change it.
 */

const GUEST_KEY = 'b125.journey.guest';
const GUEST_ROUTE = 'b125.journey.route';
const userKey = (uid: string) => `b125.journey.u.${uid}`;
const userRouteKey = (uid: string) => `b125.journey.route.u.${uid}`;

function read(key: string): StarMap {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: StarMap = {};
    for (const id of ALL_MATCH_IDS) { const v = Number(o[id]); if (v >= 1) out[id] = Math.min(3, Math.floor(v)); }
    return out;
  } catch { return {}; }
}
function write(key: string, s: StarMap) { try { localStorage.setItem(key, JSON.stringify(s)); } catch { /* */ } }
function clear(key: string) { try { localStorage.removeItem(key); } catch { /* */ } }
function readRoute(key: string): RouteId | null { try { const v = localStorage.getItem(key); return isRouteId(v) ? v : null; } catch { return null; } }
function writeRoute(key: string, r: RouteId) { try { localStorage.setItem(key, r); } catch { /* */ } }

export function mergeStars(...maps: StarMap[]): StarMap {
  const out: StarMap = {};
  for (const m of maps) for (const [k, v] of Object.entries(m)) if (v > 0) out[k] = Math.max(out[k] ?? 0, Math.min(3, v));
  return out;
}

interface JState { uid: string | null; status: 'idle' | 'loading' | 'ready' | 'offline'; stars: StarMap; route: RouteId | null }
let state: JState = { uid: null, status: 'idle', stars: read(GUEST_KEY), route: readRoute(GUEST_ROUTE) };
const subs = new Set<() => void>();
const set = (p: Partial<JState>) => { state = { ...state, ...p }; subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const getState = () => state;

let loading: string | null = null;
export async function loadJourney(uid: string | null) {
  if (!uid) { if (state.uid !== null || state.status === 'idle') set({ uid: null, status: 'ready', stars: read(GUEST_KEY), route: readRoute(GUEST_ROUTE) }); return; }
  if (state.uid === uid && (state.status === 'ready' || loading === uid)) return;
  loading = uid;
  const local = read(userKey(uid));
  const localRoute = readRoute(userRouteKey(uid));
  set({ uid, status: 'loading', stars: mergeStars(local, read(GUEST_KEY)), route: localRoute });
  let server = await journeyProgressRpc();
  if (state.uid !== uid) return;
  const guest = read(GUEST_KEY);
  let route: RouteId | null = server && isRouteId(server.route) ? server.route : null;
  if (server && Object.keys(guest).length) {
    const guestRoute = readRoute(GUEST_ROUTE) ?? defaultRoute(guest, 'en');
    const r = await journeyImportRpc(guest, guestRoute);
    if (r?.ok) {
      clear(GUEST_KEY);
      track('journey_import', { matches: r.imported ?? 0 });
      if (r.stars) server = { stars: r.stars, total: 0, route: r.route ?? server.route };
      if (isRouteId(r.route)) route = r.route;
      if (typeof r.bm === 'number') (await progressStore()).patchData({ bm: r.bm, ...(r.owned ? { owned: r.owned } : {}) });
    }
  }
  if (state.uid !== uid) return;
  loading = null;
  const merged = mergeStars(local, server?.stars ?? {}, read(GUEST_KEY));
  write(userKey(uid), merged);
  // the server's choice wins; offline (or before 018) the local cache stands in
  if (!route && !server) route = localRoute;
  if (route) writeRoute(userRouteKey(uid), route);
  set({ status: server ? 'ready' : 'offline', stars: merged, route });
}

/** The route this player is on (stored, or the default for their progress and language). */
export const effectiveRoute = (s: { stars: StarMap; route: RouteId | null }, lang: string): RouteId => s.route ?? defaultRoute(s.stars, lang);

export type RouteChange = { ok: true; route: RouteId } | { ok: false; error: 'started' | 'network' | 'busy' };

/**
 * Store the route. Players may pick freely until their first star; privileged accounts any time.
 * `init` stores the default on first open (always allowed: it is what the player is already following).
 */
export async function setRoute(r: RouteId, opts: { privileged?: boolean; init?: boolean } = {}): Promise<RouteChange> {
  const { uid, status } = state;
  if (state.route === r) return { ok: true, route: r };
  if (!opts.init && !opts.privileged && hasAnyStar(state.stars)) return { ok: false, error: 'started' };
  if (!uid) { writeRoute(GUEST_ROUTE, r); set({ route: r }); track('journey_route', { route: r, init: !!opts.init }); return { ok: true, route: r }; }
  if (status === 'loading') return { ok: false, error: 'busy' };
  const res = await journeySetRouteRpc(r);
  if (state.uid !== uid) return { ok: false, error: 'network' };
  if (res?.ok) {
    const got = isRouteId(res.route) ? res.route : r;
    writeRoute(userRouteKey(uid), got); set({ route: got });
    track('journey_route', { route: got, init: !!opts.init });
    return { ok: true, route: got };
  }
  if (res && res.error === 'started') {
    if (isRouteId(res.route)) { writeRoute(userRouteKey(uid), res.route); set({ route: res.route }); }
    return { ok: false, error: 'started' };
  }
  // offline / not migrated yet: keep it on this device (the server applies it with the first completed match)
  if (!res && (opts.init || status === 'offline')) { writeRoute(userRouteKey(uid), r); set({ route: r }); return { ok: true, route: r }; }
  return { ok: false, error: 'network' };
}

let ensuring = false;
/** Called by the Journey screen: make sure the player's route is stored (first open). */
export async function ensureRoute(lang: string) {
  if (ensuring || state.route || state.status === 'loading' || state.status === 'idle') return;
  ensuring = true;
  try { await setRoute(defaultRoute(state.stars, lang), { init: true }); } finally { ensuring = false; }
}

export type CompleteResult = JourneyCompleteResult & { guest?: boolean; offline?: boolean };

/** Record a won match (stars 1..3) on `route`. Updates the map at once; the server grants the rewards. */
export async function completeMatch(matchId: string, stars: number, route: RouteId): Promise<CompleteResult> {
  const uid = state.uid;
  const prev = state.stars[matchId] ?? 0;
  const next = mergeStars(state.stars, { [matchId]: stars });
  set({ stars: next });
  write(uid ? userKey(uid) : GUEST_KEY, next);
  if (!state.route) { writeRoute(uid ? userRouteKey(uid) : GUEST_ROUTE, route); set({ route }); }
  track('journey_win', { match: matchId, stars, prev, route });
  if (!uid) return { ok: true, guest: true, stars: Math.max(prev, stars), prev, new_stars: Math.max(0, stars - prev), first: prev === 0 };
  let r = await journeyCompleteRpc(matchId, stars, route);
  if (r && !r.ok && r.error === 'slow') {
    await new Promise(res => setTimeout(res, Math.min(45, Math.max(1, r?.retry_in ?? 10)) * 1000));
    r = await journeyCompleteRpc(matchId, stars, route);
  }
  if (!r) return { ok: true, offline: true, stars: Math.max(prev, stars), prev, new_stars: Math.max(0, stars - prev), first: prev === 0 };
  if (r.ok) {
    const { patchData, pushToast } = await progressStore();
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
  const mine = st.uid === uid;
  const stars = mine ? st.stars : (uid ? {} : read(GUEST_KEY));
  const stored = mine ? st.route : (uid ? null : readRoute(GUEST_ROUTE));
  const route = effectiveRoute({ stars, route: stored }, app.lang);
  return {
    stars, route, routeStored: !!stored, status: st.status, signedIn: !!uid,
    /** may this player pick another starting city now? */
    canChangeRoute: app.isPrivileged || !hasAnyStar(stars),
    complete: (matchId: string, n: number) => completeMatch(matchId, n, route),
    setRoute: (r: RouteId) => setRoute(r, { privileged: app.isPrivileged }),
  };
}
