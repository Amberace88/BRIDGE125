import { describe, expect, it } from 'vitest';
import sql15 from '../../supabase/migration_015_public_cosmetics.sql?raw';
import { BOT_LEVELS } from '../engine/bot';
import { BACKS } from '../theme';
import { FRAME_IDS } from './AvatarFrame';
import { FRAMES, NAME_COLORS, TITLES } from './data';
import { botLook, lookFromRow } from './seatLooks';
import { stripStake, markStakeGame, stakeIdOf } from '../economy/shield';
import { clearSavedStakeGame, savedStakeIdOf } from '../screens/savedGame';
import { newGame } from '../engine/engine';

const UID = '0b7e2c64-6c1e-4c55-9d3e-7d1f3f1f0a11';

describe('opponent looks (public_cosmetics)', () => {
  it('maps a public_cosmetics row onto a safe look', () => {
    const l = lookFromRow({
      id: UID, frame: 'fr_crown', title: 't_shark', name_color: 'nc_gold', card_back: 'bk_onyx', avatar: '🦊',
      avatar_url: `https://x.supabase.co/storage/v1/object/public/avatars/${UID}/a.webp`, level: 14, prestige: 2,
    });
    expect(l).toMatchObject({ frame: 'fr_crown', title: 't_shark', nameColor: 'nc_gold', avatar: '🦊', level: 14, prestige: 2 });
    expect(l?.avatarUrl).toContain(`/avatars/${UID}/`);
    expect(l?.back).toMatchObject({ id: 'bk_onyx', fx: 'foil' });
    expect(l?.back?.css).toBe(BACKS.find(b => b.id === 'bk_onyx')!.css);
  });

  it('drops unknown ids, foreign urls, text avatars and the table-matching back', () => {
    const l = lookFromRow({
      id: UID, frame: 'fr_hacked', title: 't_none', name_color: 'red;}', card_back: 'match', avatar: 'Hello <b>',
      avatar_url: 'https://evil.example/avatars/x.png', level: -5, prestige: 1e9,
    });
    expect(l).toMatchObject({ frame: undefined, title: undefined, nameColor: undefined, back: undefined, avatar: undefined, avatarUrl: undefined, level: 0, prestige: 99 });
    expect(lookFromRow({ id: UID, card_back: 'no-such-back' })?.back).toBeUndefined();
    expect(lookFromRow(null)).toBeNull();
  });

  it('bots dress by difficulty with real catalogue items; expert bots look premium', () => {
    for (const lvl of BOT_LEVELS) {
      for (let seat = 1; seat <= 3; seat++) {
        const l = botLook(lvl, seat);
        expect(FRAMES.some(f => f.id === l.frame), `${lvl} frame ${l.frame}`).toBe(true);
        if (l.frame !== 'fr_none') expect(FRAME_IDS).toContain(l.frame);
        if (l.nameColor) expect(NAME_COLORS.some(c => c.id === l.nameColor)).toBe(true);
        if (l.title) expect(TITLES.some(t => t.id === l.title)).toBe(true);
        expect(l.back?.css, `${lvl} back`).toBeTruthy();
      }
    }
    const expert = [1, 2, 3].map(s => botLook('expert', s));
    expect(expert.every(l => (l.prestige ?? 0) > 0 && l.back?.fx === 'foil' && !!l.title)).toBe(true);
    expect(new Set(expert.map(l => l.frame)).size).toBe(3);          // each seat looks different
    expect(botLook('easy', 1).title).toBeUndefined();
    expect(botLook('unknown-level', 1)).toEqual(botLook('normal', 1));
  });

  it('migration 015 is SECURITY DEFINER, pinned search_path, capped at 8 ids and leaks no private column', () => {
    const fn = sql15.slice(sql15.indexOf('create function public.public_cosmetics'));
    expect(fn).toMatch(/security definer set search_path = ''/);
    expect(fn).toContain('uids[1:8]');
    expect(fn).toContain('not coalesce(p.banned, false)');
    const cols = fn.slice(fn.indexOf('select'), fn.indexOf('from public.profiles'));
    for (const secret of ['email', 'bm', 'diamonds', 'owned', 'role', 'banned', 'shards', 'relics', 'shields', 'xp']) {
      expect(cols, secret).not.toMatch(new RegExp(`\\bp\\.${secret}\\b`));
    }
    expect(sql15).toMatch(/grant execute on function public\.public_cosmetics\(uuid\[\]\) to anon, authenticated/);
  });
});

describe('saved stake games', () => {
  it('a stale stake game can be stripped back to a casual game', () => {
    const g = markStakeGame(newGame([{ name: 'Me', bot: false }, { name: 'Bot', bot: true }]), { id: 41, tier: 2 });
    expect(stakeIdOf(g)).toBe(41);
    const casual = stripStake(g);
    expect(stakeIdOf(casual)).toBeNull();
    expect(casual.players).toEqual(g.players);
  });

  it('clearSavedStakeGame only drops the saved game of that stake', () => {
    const store = new Map<string, string>();
    const ls = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } };
    const prev = (globalThis as { localStorage?: unknown }).localStorage;
    (globalThis as { localStorage?: unknown }).localStorage = ls;
    try {
      const g = markStakeGame(newGame([{ name: 'Me', bot: false }, { name: 'Bot', bot: true }]), { id: 7, tier: 1 });
      ls.setItem('b125.game.v1', JSON.stringify(g));
      expect(savedStakeIdOf(JSON.parse(store.get('b125.game.v1')!))).toBe(7);
      clearSavedStakeGame(8);
      expect(store.has('b125.game.v1')).toBe(true);
      clearSavedStakeGame(7);
      expect(store.has('b125.game.v1')).toBe(false);
    } finally { (globalThis as { localStorage?: unknown }).localStorage = prev; }
  });
});
