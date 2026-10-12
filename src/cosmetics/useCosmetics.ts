import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useApp } from '../store';
import { getSupabase } from '../supabase';
import { track } from '../analytics';
import { COS_COLUMN, COS_DEFAULTS, COS_KINDS, COS_LISTS, emotesOf, type CosKind } from './data';

export type Equipped = Record<CosKind, string>;

/**
 * Equipped cosmetics beyond the theme (face, frame, victory, emotes, title, name colour, banner).
 *
 * Source of truth: the signed-in player's `profiles` row (migration_008 columns). A device cache in localStorage keeps
 * guests' free choices (e.g. Large Print) and makes the look appear instantly on the next start (src/theme.ts applies
 * the cached face before React renders). Anything the player is not entitled to (store.canUse) falls back to the
 * free default — so signing out never leaves a premium look behind.
 */
export const COS_CACHE_KEY = 'b125.cos.v1';

function readCache(): Partial<Equipped> {
  try { const v = JSON.parse(localStorage.getItem(COS_CACHE_KEY) ?? '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
let cache: Partial<Equipped> = typeof localStorage === 'undefined' ? {} : readCache();
const subs = new Set<() => void>();
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
function writeCache(patch: Partial<Equipped>) {
  cache = { ...cache, ...patch };
  try { localStorage.setItem(COS_CACHE_KEY, JSON.stringify(cache)); } catch { /* private mode */ }
  subs.forEach(f => f());
}

/** Puts the global hooks on <html>: data-face (card face style). */
export function applyCosmeticsToDocument(eq: Pick<Equipped, 'face'>) {
  const el = document.documentElement;
  if (el.dataset.face !== eq.face) el.dataset.face = eq.face;
}

const known = (kind: CosKind, id: unknown): id is string => typeof id === 'string' && COS_LISTS[kind].some(i => i.id === id);

export function useCosmetics() {
  const app = useApp();
  const local = useSyncExternalStore(subscribe, () => cache, () => cache);
  const row = app.profile as unknown as Record<string, unknown> | null;
  const { canUse } = app;

  const equipped = useMemo(() => {
    const out = {} as Equipped;
    for (const k of COS_KINDS) {
      const fromRow = row?.[COS_COLUMN[k]];
      const pick = known(k, fromRow) ? fromRow : known(k, local[k]) ? local[k] : COS_DEFAULTS[k];
      out[k] = canUse(pick) ? pick : COS_DEFAULTS[k];
    }
    return out;
  }, [row, local, canUse]);

  /** Equip one item (no-op + false when the player may not use it). Optimistic: the UI updates instantly. */
  const equip = useCallback(async (kind: CosKind, id: string): Promise<boolean> => {
    if (!known(kind, id) || !canUse(id)) return false;
    writeCache({ [kind]: id });
    if (kind === 'face') applyCosmeticsToDocument({ face: id });
    track('cos_equip', { kind, item: id });
    if (!app.session) return true;
    app.patchProfile({ [COS_COLUMN[kind]]: id } as never);
    const sb = await getSupabase();
    if (!sb) return true;
    const { error } = await sb.from('profiles').update({ [COS_COLUMN[kind]]: id }).eq('id', app.session.user.id);
    return !error;
  }, [app, canUse]);

  return { equipped, equip, emotes: emotesOf(equipped.emotes) };
}

/** Mount once near the root (App) so <html data-face> follows the player's equipped deck style everywhere. */
export function CosmeticsSync() {
  const { equipped } = useCosmetics();
  useEffect(() => { applyCosmeticsToDocument(equipped); }, [equipped]);
  return null;
}

/** The table's emote list for the local player (falls back to the Classic six). */
export const useEquippedEmotes = () => useCosmetics().emotes;
