import { useEffect, useMemo, useState } from 'react';
import type { BotLevel } from '../engine/bot';
import { getSupabase } from '../supabase';
import { safeAvatar } from '../media/safeAvatar';
import { BACKS, backFx } from '../theme';
import { FRAMES, NAME_COLORS, TITLES } from './data';

/**
 * What an opponent's seat shows: their equipped public cosmetics (online: the public_cosmetics RPC, migration 015;
 * local games: a fixed set per bot difficulty). Every id is checked against our own catalogue before it is rendered,
 * so an unknown / malformed value simply falls back to the default look.
 */
export interface SeatLook {
  frame?: string; nameColor?: string; title?: string; prestige?: number; level?: number;
  /** emoji avatar */ avatar?: string;
  /** profile photo (only our Supabase avatars bucket, see safeAvatar) */ avatarUrl?: string;
  /** card back: CSS background + optional animated effect ('foil'); undefined = the viewer's own back */
  back?: { id: string; css: string; fx?: string };
}

/** Row of public.public_cosmetics(uids) — migration_015_public_cosmetics.sql. */
export interface PublicCosmeticsRow {
  id: string; frame: string | null; title: string | null; name_color: string | null; card_back: string | null;
  card_face?: string | null; victory?: string | null; banner?: string | null; emotes?: string | null;
  avatar: string | null; avatar_url: string | null; level: number | null; prestige: number | null;
}

const has = (list: { id: string }[], id: unknown): id is string => typeof id === 'string' && list.some(i => i.id === id);
const backOf = (id: unknown): SeatLook['back'] => {
  if (typeof id !== 'string' || id === 'match') return undefined;
  const b = BACKS.find(x => x.id === id);
  return b && b.css ? { id: b.id, css: b.css, fx: backFx(b.id) } : undefined;
};
const int = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : undefined);
/** an emoji / suit-symbol avatar (Profile's picker): a few symbols, never letters, digits or markup */
const emoji = (v: unknown) => (typeof v === 'string' && v.length <= 8 && /^[^\p{L}\p{N}\s<>"'&]{1,4}$/u.test(v) ? v : undefined);

/** RPC row → a safe look. */
export function lookFromRow(r: Partial<PublicCosmeticsRow> | null | undefined): SeatLook | null {
  if (!r) return null;
  return {
    frame: has(FRAMES, r.frame) ? r.frame : undefined,
    nameColor: has(NAME_COLORS, r.name_color) ? r.name_color : undefined,
    title: has(TITLES, r.title) && r.title !== 't_none' ? r.title : undefined,
    prestige: int(r.prestige, 99),
    level: int(r.level, 999),
    avatar: emoji(r.avatar),
    avatarUrl: safeAvatar(r.avatar_url) || undefined,
    back: backOf(r.card_back),
  };
}

/* ------------------------------------------------------------------ bots */

/**
 * Bots dress by difficulty: club regulars at easy / normal, sharper looks at hard, and the full premium wardrobe at
 * expert (crown & diamond frames, legendary foil backs, prestige stars). Fixed per seat, so a table always looks the same.
 */
const BOT_SETS: Record<BotLevel, { frame: string; nameColor?: string; title?: string; back: string; prestige?: number }[]> = {
  easy: [
    { frame: 'fr_none', back: 'crimson' },
    { frame: 'fr_none', back: 'midnight' },
    { frame: 'fr_none', back: 'carbon' },
  ],
  normal: [
    { frame: 'fr_brass', back: 'midnight' },
    { frame: 'fr_brass', nameColor: 'nc_ice', back: 'crimson' },
    { frame: 'fr_brass', back: 'jugend' },
  ],
  hard: [
    { frame: 'fr_laurel', nameColor: 'nc_gold', title: 't_shark', back: 'bk_marble' },
    { frame: 'fr_ice', nameColor: 'nc_ice', title: 't_bluff', back: 'bk_aurora' },
    { frame: 'fr_flames', nameColor: 'nc_ruby', title: 't_queenslayer', back: 'bk_damask' },
  ],
  expert: [
    { frame: 'fr_crown', nameColor: 'nc_gold', title: 't_legend', back: 'bk_onyx', prestige: 3 },
    { frame: 'fr_diamond', nameColor: 'nc_holo', title: 't_master', back: 'bk_holo', prestige: 2 },
    { frame: 'ach_fr_prestige', nameColor: 'ach_nc_aurum', title: 't_highroller', back: 'bk_dragon', prestige: 1 },
  ],
};

/** The look of the bot in `seat` (1-based opponent order is fine: any integer maps onto the set). */
export function botLook(level: BotLevel | string | undefined, seat: number): SeatLook {
  const set = BOT_SETS[(level as BotLevel) in BOT_SETS ? (level as BotLevel) : 'normal'];
  const s = set[((seat - 1) % set.length + set.length) % set.length];
  return { frame: s.frame, nameColor: s.nameColor, title: s.title, prestige: s.prestige, back: backOf(s.back) };
}

/* ------------------------------------------------------------------ online: fetch + cache */

const TTL = 5 * 60_000;
const cache = new Map<string, { look: SeatLook | null; at: number }>();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public looks of up to 8 accounts (cached for 5 minutes; failures are cached briefly as "default look"). */
export async function fetchSeatLooks(uids: string[]): Promise<Map<string, SeatLook | null>> {
  const now = Date.now();
  const want = [...new Set(uids.filter(u => UUID.test(u)))].slice(0, 8);
  const miss = want.filter(u => { const c = cache.get(u); return !c || now - c.at > TTL; });
  if (miss.length) {
    let rows: PublicCosmeticsRow[] | null = null;
    try {
      const sb = await getSupabase();
      const { data, error } = sb ? await sb.rpc('public_cosmetics', { uids: miss }) : { data: null, error: true };
      if (!error && Array.isArray(data)) rows = data as PublicCosmeticsRow[];
    } catch { /* offline / RPC missing → default looks */ }
    const at = rows ? now : now - TTL + 30_000;      // retry a failed fetch after 30 s
    for (const u of miss) cache.set(u, { look: lookFromRow(rows?.find(r => r.id === u)), at });
  }
  return new Map(want.map(u => [u, cache.get(u)?.look ?? null]));
}

/**
 * Looks for an online table, indexed by seat: `seats[i].uid` is the room's token-verified account id (worker/room.ts).
 * Re-fetches only when the set of accounts changes (someone sits down, signs in or leaves); `me` is skipped — the
 * local player's own seat renders from their live equipped cosmetics.
 */
export function useSeatLooks(seats: readonly { uid?: string; bot?: boolean }[] | undefined, me: number): (SeatLook | null)[] {
  const key = (seats ?? []).map((s, i) => (i === me || s.bot ? '' : s.uid ?? '')).join(',');
  const [looks, setLooks] = useState<Map<string, SeatLook | null>>(() => new Map());
  useEffect(() => {
    const uids = key.split(',').filter(Boolean);
    if (!uids.length) return;
    let live = true;
    void fetchSeatLooks(uids).then(m => { if (live) setLooks(m); });
    return () => { live = false; };
  }, [key]);
  return useMemo(() => key.split(',').map(u => (u ? looks.get(u) ?? null : null)), [key, looks]);
}
