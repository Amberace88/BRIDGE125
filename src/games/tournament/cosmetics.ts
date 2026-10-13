/**
 * Weekly-tournament cosmetics (migration 022) — earned on the podium, never sold (shop_items rows with price_bm = null,
 * so the ownership trigger from 008 refuses to equip them unless owned). Spread into FRAMES / TITLES / EARNED_IDS in
 * src/cosmetics/data.ts; the frame's decor lives in src/cosmetics/AvatarFrame.tsx (`tg_fr_podium`), its ring CSS here.
 * No imports from cosmetics/data.ts (it imports this file).
 */
import './cosmetics.css';

export const TG_FRAMES = [{ id: 'tg_fr_podium', name: 'Podium Laurel', premium: true }];
export const TG_TITLES = [
  { id: 'tg_t_champion', name: 'Champion', glyph: '♔', premium: true },
  { id: 'tg_t_podium', name: 'Finalist', glyph: '◆', premium: true },
];
export const TG_ITEMS: { id: string; kind: 'frame' | 'title'; rarity: 'epic' | 'legendary' }[] = [
  { id: 'tg_fr_podium', kind: 'frame', rarity: 'legendary' },
  { id: 'tg_t_champion', kind: 'title', rarity: 'legendary' },
  { id: 'tg_t_podium', kind: 'title', rarity: 'epic' },
];
export const TG_COSMETIC_IDS = TG_ITEMS.map(i => i.id);
export const tgItem = (id: string | null | undefined) => TG_ITEMS.find(i => i.id === id);
