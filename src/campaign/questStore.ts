import { useEffect, useSyncExternalStore } from 'react';
import { useApp } from '../store';
import { patchData, pushToast } from '../progress/store';
import { track } from '../analytics';
import {
  CHEST, REROLL_COST, addDays, applyEvents, assignQuests, clampEvents, diffRows, rigaDay, rigaMidnight, rowOf, weekStart,
  type QuestChange, type QuestEvents, type QuestRow,
} from './quests';
import { claimChestRpc, claimQuestRpc, questProgressRpc, questsRpc, rerollQuestRpc, type QuestActionResult, type QuestBoardData } from './api';

/**
 * Quest board shared by Quests.tsx, <QuestTracker/> and the end-of-game toast.
 * Signed in → the server board (quests() RPC). Guest (or before migration 011) → a local board with the same quests,
 * tracked on this device; rewards need an account.
 */

export interface Board {
  daily: QuestRow[]; weekly: QuestRow[];
  today: string; week: string;
  nextDaily: number; nextWeekly: number;
  rerollAvailable: boolean; rerollCost: number;
  chest: { claimed: boolean; bm: number; xp: number };
  /** true = local board (guest or server unavailable): claim / reroll need an account */
  local: boolean;
}

export interface QuestToast { id: number; changes: QuestChange[] }

interface QState { uid: string | null; status: 'idle' | 'loading' | 'ready'; board: Board | null; toasts: QuestToast[]; busy: string | null }
let state: QState = { uid: null, status: 'idle', board: null, toasts: [], busy: null };
const subs = new Set<() => void>();
const set = (p: Partial<QState>) => { state = { ...state, ...p }; subs.forEach(f => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const getState = () => state;

/* ------------------------------------------------------------------ local (guest) board */

const LOCAL_KEY = 'b125.quests.local.v1';
const SEED_KEY = 'b125.quests.seed';
interface LocalSave { day: string; week: string; daily: { id: string; progress: number }[]; weekly: { id: string; progress: number }[] }

function seed(): string {
  try {
    let s = localStorage.getItem(SEED_KEY);
    if (!s) { s = Math.random().toString(36).slice(2, 10); localStorage.setItem(SEED_KEY, s); }
    return s;
  } catch { return 'guest'; }
}

export function localBoard(now = new Date(), save?: LocalSave | null, sd = seed()): Board {
  const today = rigaDay(now), week = weekStart(today);
  let s = save;
  if (s === undefined) { try { s = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? 'null') as LocalSave | null; } catch { s = null; } }
  const daily = s?.day === today ? s.daily : assignQuests('daily', sd, today).map(id => ({ id, progress: 0 }));
  const weekly = s?.week === week ? s.weekly : assignQuests('weekly', sd, week).map(id => ({ id, progress: 0 }));
  return {
    daily: daily.map(x => rowOf(x.id, x.progress)).filter(Boolean) as QuestRow[],
    weekly: weekly.map(x => rowOf(x.id, x.progress)).filter(Boolean) as QuestRow[],
    today, week, nextDaily: rigaMidnight(addDays(today, 1)), nextWeekly: rigaMidnight(addDays(week, 7)),
    rerollAvailable: false, rerollCost: REROLL_COST, chest: { claimed: false, ...CHEST }, local: true,
  };
}
function saveLocal(b: Board) {
  const s: LocalSave = { day: b.today, week: b.week, daily: b.daily.map(r => ({ id: r.id, progress: r.progress })), weekly: b.weekly.map(r => ({ id: r.id, progress: r.progress })) };
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(s)); } catch { /* */ }
}

function fromServer(d: QuestBoardData): Board {
  const rows = (xs: QuestBoardData['daily']): QuestRow[] => (xs ?? []).map(r => ({ ...r, progress: Math.min(r.goal, r.progress), claimed: !!r.claimed }));
  return {
    daily: rows(d.daily), weekly: rows(d.weekly), today: d.today, week: d.week,
    nextDaily: Date.parse(d.next_daily) || rigaMidnight(addDays(d.today, 1)),
    nextWeekly: Date.parse(d.next_weekly) || rigaMidnight(addDays(d.week, 7)),
    rerollAvailable: !!d.reroll_available, rerollCost: d.reroll_cost ?? REROLL_COST,
    chest: d.chest ?? { claimed: false, ...CHEST }, local: false,
  };
}

/* ------------------------------------------------------------------ loading */

let inflight: Promise<void> | null = null;
export function loadQuests(uid: string | null, force = false): Promise<void> {
  if (uid !== state.uid) { set({ uid, status: 'idle', board: null }); inflight = null; }
  if (!force && (state.status === 'ready' || inflight)) {
    // a new Riga day/week rolls the local board over
    const b = state.board;
    if (b && Date.now() >= b.nextDaily) return loadQuests(uid, true);
    return inflight ?? Promise.resolve();
  }
  if (!uid) { set({ status: 'ready', board: localBoard() }); return Promise.resolve(); }
  set({ status: state.board ? state.status : 'loading' });
  const p = questsRpc().then(d => {
    if (state.uid !== uid) return;
    set({ status: 'ready', board: d ? fromServer(d) : localBoard() });
  }).finally(() => { if (inflight === p) inflight = null; });
  inflight = p;
  return p;
}

/* ------------------------------------------------------------------ game results */

let tid = 1;
function toast(changes: QuestChange[]) {
  if (!changes.length) return;
  set({ toasts: [...state.toasts, { id: tid++, changes }].slice(-3) });
}
export const dismissQuestToast = (id: number) => set({ toasts: state.toasts.filter(t => t.id !== id) });

let pending: QuestEvents = {};
let timer: ReturnType<typeof setTimeout> | null = null;

/** Report one finished game's events (call once per game). Shows the progress toast; the server clamps everything. */
export async function submitGameEvents(events: QuestEvents): Promise<void> {
  const ev = clampEvents(events);
  if (!Object.keys(ev).length) return;
  if (!state.board) await loadQuests(state.uid);
  const before = state.board;
  if (!before) return;
  if (before.local) {
    const b = { ...before, daily: applyEvents(before.daily, ev), weekly: applyEvents(before.weekly, ev) };
    saveLocal(b);
    set({ board: b });
    toast(diffRows([...before.daily, ...before.weekly], [...b.daily, ...b.weekly]));
    return;
  }
  // signed in: queue (merging) and flush; the server throttles to one report per 20 s
  for (const [k, v] of Object.entries(ev)) pending[k as keyof QuestEvents] = (pending[k as keyof QuestEvents] ?? 0) + (v ?? 0);
  // optimistic local view so the toast is instant
  const optimistic = { ...before, daily: applyEvents(before.daily, ev), weekly: applyEvents(before.weekly, ev) };
  set({ board: optimistic });
  toast(diffRows([...before.daily, ...before.weekly], [...optimistic.daily, ...optimistic.weekly]));
  await flush();
}

async function flush(): Promise<void> {
  if (timer) { clearTimeout(timer); timer = null; }
  const ev = pending;
  if (!Object.keys(ev).length) return;
  pending = {};
  const uid = state.uid;
  const r = await questProgressRpc(clampEvents(ev));
  if (state.uid !== uid) return;
  if (r?.ok && r.board) { set({ board: fromServer(r.board) }); return; }
  if (r && !r.ok && r.error === 'slow') {
    for (const [k, v] of Object.entries(ev)) pending[k as keyof QuestEvents] = (pending[k as keyof QuestEvents] ?? 0) + (v ?? 0);
    timer = setTimeout(() => { void flush(); }, Math.min(60, Math.max(2, r.retry_in ?? 20)) * 1000);
  }
}

/* ------------------------------------------------------------------ actions */

function afterAction(r: QuestActionResult | null, what: string): QuestActionResult {
  if (!r) return { ok: false, error: 'network' };
  if (r.board) set({ board: fromServer(r.board) });
  if (r.ok) {
    patchData({ ...(typeof r.bm === 'number' ? { bm: r.bm } : {}), ...(typeof r.xp === 'number' && typeof r.level === 'number' ? { xp: r.xp, level: r.level } : {}) });
    const rw = r.reward;
    if (rw) {
      if (rw.xp > 0 || rw.bm > 0) pushToast({ kind: 'xp', xp: rw.xp, bm: rw.bm, won: false });
      if ((rw.level ?? 0) > (rw.level_from ?? 0)) setTimeout(() => pushToast({ kind: 'level', level: rw.level!, bm: rw.level_bm ?? 0 }), 900);
    }
    track(what, { id: r.id ?? r.replaced ?? null });
  }
  return r;
}

async function busy<T>(key: string, fn: () => Promise<T>): Promise<T> {
  set({ busy: key });
  try { return await fn(); } finally { set({ busy: null }); }
}

export const claimQuest = (id: string) => busy(id, async () => afterAction(await claimQuestRpc(id), 'quest_claim'));
export const rerollQuest = (id: string) => busy('reroll:' + id, async () => afterAction(await rerollQuestRpc(id), 'quest_reroll'));
export const claimChest = () => busy('chest', async () => afterAction(await claimChestRpc(), 'quest_chest'));

/* ------------------------------------------------------------------ hook */

export function useQuests() {
  const app = useApp();
  const uid = app.session?.user.id ?? null;
  const st = useSyncExternalStore(subscribe, getState, getState);
  useEffect(() => { void loadQuests(uid); }, [uid]);
  const b = st.uid === uid ? st.board : null;
  const all = b ? [...b.daily, ...b.weekly] : [];
  return {
    board: b,
    loading: st.status !== 'ready',
    signedIn: !!uid,
    busy: st.busy,
    ready: all.filter(r => !r.claimed && r.progress >= r.goal).length,
    toasts: st.toasts,
    refresh: () => loadQuests(uid, true),
    claim: claimQuest, reroll: rerollQuest, claimChest,
  };
}
