/**
 * Exclusive cosmetics introduced by migration 012 — earned, never sold (shop_items rows with price_bm = null).
 * They are not in src/cosmetics/data.ts yet (owned by the cosmetics module). To make them equippable, spread these
 * entries into the lists there and give the frames a DECOR entry in AvatarFrame.tsx (`{}` is enough — the ring CSS
 * for `.afr-ach_fr_*` and the `.nc-ach_nc_*` name colours already live in src/styles/economy.css):
 *
 *   TITLES.push(...ACH_TITLES); FRAMES.push(...ACH_FRAMES); NAME_COLORS.push(...ACH_NAME_COLORS); BANNERS.push(...ACH_BANNERS);
 *   DECOR.ach_fr_prestige = {}; DECOR.ach_fr_obsidian = {}; DECOR.ach_fr_veteran = {};
 *
 * Mark them `premium: true` so store.canUse() requires ownership (the server trigger already enforces it).
 */
export const ACH_TITLES = [
  { id: 'ach_t_phoenix', name: 'Phoenix', glyph: '✶', premium: true },
  { id: 'ach_t_detective', name: 'Lie Detector', glyph: '◉', premium: true },
  { id: 'ach_t_immortal', name: 'Immortal', glyph: '✵', premium: true },
  { id: 'ach_t_founder', name: 'Founder', glyph: 'F', premium: true },
  { id: 'ach_t_curator', name: 'Curator', glyph: '❖', premium: true },
];
export const ACH_FRAMES = [
  { id: 'ach_fr_veteran', name: "Veteran's Wreath", premium: true },
  { id: 'ach_fr_prestige', name: 'Prestige Halo', premium: true },
  { id: 'ach_fr_obsidian', name: 'Obsidian Ring', premium: true },
];
export const ACH_NAME_COLORS = [
  { id: 'ach_nc_ember', name: 'Ember', swatch: 'linear-gradient(90deg,#ffd27a,#ff7a3d 45%,#c2203a)', premium: true },
  { id: 'ach_nc_aurum', name: 'Aurum', swatch: 'linear-gradient(100deg,#8c6e28,#fff2c4 35%,#e2bd62 60%,#a37a26)', premium: true },
];
export const ACH_BANNERS = [
  {
    id: 'ach_bn_vault', name: 'The Vault', premium: true,
    css: 'radial-gradient(120% 90% at 50% 120%, rgba(235,200,120,.35), transparent 60%), repeating-conic-gradient(from 0deg at 50% 110%, rgba(255,242,196,.08) 0 6deg, transparent 6deg 14deg), linear-gradient(180deg, #2a0910, #120407)',
  },
];
/** Every new id (also listed in the 012 seed). */
export const ACH_COSMETIC_IDS = [...ACH_TITLES, ...ACH_FRAMES, ...ACH_NAME_COLORS, ...ACH_BANNERS].map(x => x.id);
