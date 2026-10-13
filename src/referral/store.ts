import { useEffect, useSyncExternalStore } from 'react';
import { referralCodeRpc, type RefInfo } from '../daily/api';
import { deviceId } from './ref';

/** The signed-in player's invite code + friends, shared by every caller (Profile card, Daily share, ReferralRoot). */
interface RState { uid: string | null; status: 'idle' | 'loading' | 'ready' | 'error'; info: RefInfo | null; at: number }
let state: RState = { uid: null, status: 'idle', info: null, at: 0 };
const subs = new Set<() => void>();
const set = (p: Partial<RState>) => { state = { ...state, ...p }; subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const getState = () => state;

let pending: Promise<RefInfo | null> | null = null;
export async function loadReferral(uid: string | null, force = false): Promise<RefInfo | null> {
  if (!uid) { if (state.uid) set({ uid: null, status: 'idle', info: null, at: 0 }); return null; }
  if (!force && state.uid === uid && state.status === 'ready' && Date.now() - state.at < 60_000) return state.info;
  if (pending && state.uid === uid) return pending;
  set({ uid, status: state.uid === uid && state.info ? 'ready' : 'loading', ...(state.uid === uid ? {} : { info: null }) });
  pending = referralCodeRpc(deviceId()).then(info => {
    pending = null;
    if (state.uid !== uid) return null;
    if (info?.ok) set({ status: 'ready', info, at: Date.now() });
    else set({ status: state.info ? 'ready' : 'error' });
    return info?.ok ? info : null;
  });
  return pending;
}

export function useReferral(uid: string | null | undefined) {
  const st = useSyncExternalStore(subscribe, getState, getState);
  useEffect(() => { void loadReferral(uid ?? null); }, [uid]);
  return { ...st, refresh: () => loadReferral(uid ?? null, true) };
}
