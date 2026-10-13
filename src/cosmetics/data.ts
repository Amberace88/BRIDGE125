/**
 * Personalization items beyond the theme (tables / card backs / accents live in src/theme.ts).
 * Ids are globally unique across every category because `profile.owned` is a flat list of ids.
 *
 * `premium` items must be bought (shop_items in supabase/migration_008_cosmetics.sql); the rest are free for everyone.
 * Admin ('admin') and co-author / main tester ('god') get every item free (store.canUse, buy_item, enforce trigger).
 */
import { BANNER_ART } from './art';
import { ACH_BANNERS, ACH_FRAMES, ACH_NAME_COLORS, ACH_TITLES } from '../economy/cosmetics';
import { S1_BANNERS, S1_COSMETIC_IDS, S1_EMOTES, S1_FRAMES, S1_NAME_COLORS, S1_TITLES, S1_VICTORIES } from '../season/cosmetics';

export type CosKind = 'face' | 'frame' | 'victory' | 'emotes' | 'title' | 'namecolor' | 'banner';
export const COS_KINDS: CosKind[] = ['face', 'frame', 'victory', 'emotes', 'title', 'namecolor', 'banner'];

export interface CosItem { id: string; name: string; premium?: boolean }
export interface FaceStyle extends CosItem { /** accessibility style — always free */ a11y?: boolean }
export type FrameStyle = CosItem;
export type VictoryStyle = CosItem;
export interface EmotePack extends CosItem { emotes: string[] }
export interface TitleBadge extends CosItem { glyph: string }
export interface NameColor extends CosItem { swatch: string }
export interface Banner extends CosItem { css: string }

/** Deck styles: implemented in styles/cosmetics.css as `[data-face="<id>"]` variable sets on the card face. */
export const FACES: FaceStyle[] = [
  { id: 'f_classic', name: 'Classic' },
  { id: 'f_large', name: 'Large Print', a11y: true },
  { id: 'f_minimal', name: 'Minimal Modern', premium: true },
  { id: 'f_deco', name: 'Art Deco', premium: true },
  { id: 'f_neon', name: 'Neon Night', premium: true },
  { id: 'f_royal', name: 'Royal Gold', premium: true },
];

/** Avatar frames: `<AvatarFrame id>` (src/cosmetics/AvatarFrame.tsx). */
export const FRAMES: FrameStyle[] = [
  { id: 'fr_none', name: 'No frame' },
  { id: 'fr_brass', name: 'Brass Ring' },
  { id: 'fr_neon', name: 'Neon Pulse', premium: true },
  { id: 'fr_laurel', name: 'Gold Laurel', premium: true },
  { id: 'fr_flames', name: 'Inferno', premium: true },
  { id: 'fr_ice', name: 'Ice Crystal', premium: true },
  { id: 'fr_crown', name: 'Royal Crown', premium: true },
  { id: 'fr_diamond', name: 'Diamond', premium: true },
  // earned, never sold (achievements, collections, prestige — migration 012)
  ...ACH_FRAMES,
  // invite-only: both players get it when an invited friend finishes 3 games (migration 014)
  { id: 'ach_fr_envoy', name: "Envoy's Ring", premium: true },
  // Season Pass (migration 016)
  ...S1_FRAMES,
];

/** Win celebrations: `<VictoryEffect id>` (src/cosmetics/VictoryEffect.tsx). */
export const VICTORIES: VictoryStyle[] = [
  { id: 'vx_classic', name: 'Gold Sparkle' },
  { id: 'vx_confetti', name: 'Gold Confetti', premium: true },
  { id: 'vx_fireworks', name: 'Fireworks', premium: true },
  { id: 'vx_waterfall', name: 'Card Waterfall', premium: true },
  { id: 'vx_crowns', name: 'Crown Rain', premium: true },
  ...S1_VICTORIES,
];

/** Emote packs: the table's emote picker shows the equipped pack (emotes are sent as plain emoji strings). */
export const EMOTE_PACKS: EmotePack[] = [
  { id: 'em_classic', name: 'Classic', emotes: ['👍', '😂', '😮', '😡', '🔥', '🙏'] },
  { id: 'em_cheeky', name: 'Cheeky', premium: true, emotes: ['😏', '🤡', '🙈', '😜', '💅', '🥱', '🤭', '👀'] },
  { id: 'em_animals', name: 'Animals', premium: true, emotes: ['🦊', '🐺', '🦉', '🐻', '🐸', '🦈', '🐙', '🐒'] },
  { id: 'em_casino', name: 'High Roller', premium: true, emotes: ['🃏', '🎰', '💰', '🎲', '🍀', '💸', '🤑', '♠️'] },
  { id: 'em_royal', name: 'Royal', premium: true, emotes: ['👑', '🎩', '🍷', '💎', '🥂', '🏰', '⚜️', '🦚'] },
  ...S1_EMOTES,
];

/** Title badges shown next to the player's name. */
export const TITLES: TitleBadge[] = [
  { id: 't_none', name: 'No title', glyph: '' },
  { id: 't_lucky', name: 'Lucky Charm', glyph: '🍀', premium: true },
  { id: 't_shark', name: 'Shark', glyph: '🦈', premium: true },
  { id: 't_bluff', name: 'Bluff King', glyph: '🎭', premium: true },
  { id: 't_queenslayer', name: 'Queen Slayer', glyph: '♛', premium: true },
  { id: 't_highroller', name: 'High Roller', glyph: '💰', premium: true },
  { id: 't_master', name: '125 Master', glyph: '✦', premium: true },
  { id: 't_legend', name: 'Legend', glyph: '★', premium: true },
  // earned, never sold: the Journey finale (migration 011) and achievements (migration 012)
  { id: 't_grand_tour', name: 'Grand Tourist', glyph: '⚜', premium: true },
  ...ACH_TITLES,
  ...S1_TITLES,
];

/** Name colours (CSS classes `.nc-<id>` in styles/cosmetics.css). */
export const NAME_COLORS: NameColor[] = [
  { id: 'nc_default', name: 'Default', swatch: '#EEF3EF' },
  { id: 'nc_gold', name: 'Gold', swatch: 'linear-gradient(180deg,#fff2c4,#e2bd62 55%,#a37a26)', premium: true },
  { id: 'nc_ruby', name: 'Ruby', swatch: 'linear-gradient(180deg,#ffb3c0,#e8344f 60%,#8e1529)', premium: true },
  { id: 'nc_ice', name: 'Ice', swatch: 'linear-gradient(180deg,#ffffff,#9fdcff 55%,#4b8fd6)', premium: true },
  { id: 'nc_emerald', name: 'Emerald', swatch: 'linear-gradient(180deg,#d4ffe9,#3fd896 55%,#13724c)', premium: true },
  { id: 'nc_neon', name: 'Neon', swatch: 'linear-gradient(90deg,#ff5ce6,#00e5ff)', premium: true },
  { id: 'nc_fire', name: 'Fire', swatch: 'linear-gradient(90deg,#ffe066,#ff8a2a,#ff2e4d)', premium: true },
  { id: 'nc_holo', name: 'Holographic', swatch: 'linear-gradient(90deg,#ff9bd2,#ffd28a,#9cf5c8,#8ad0ff,#c69bff)', premium: true },
  ...ACH_NAME_COLORS,
  ...S1_NAME_COLORS,
];

/** Profile banners (the backdrop of the profile header / player card). */
export const BANNERS: Banner[] = [
  { id: 'bn_felt', name: 'Felt', css: BANNER_ART.bn_felt },
  { id: 'bn_bokeh', name: 'Casino Lights', css: BANNER_ART.bn_bokeh, premium: true },
  { id: 'bn_sunburst', name: 'Gold Sunburst', css: BANNER_ART.bn_sunburst, premium: true },
  { id: 'bn_aurora', name: 'Aurora Sky', css: BANNER_ART.bn_aurora, premium: true },
  { id: 'bn_riga', name: 'Riga Rooftops', css: BANNER_ART.bn_riga, premium: true },
  { id: 'bn_suits', name: 'Royal Suits', css: BANNER_ART.bn_suits, premium: true },
  ...ACH_BANNERS,
  ...S1_BANNERS,
];

export const COS_LISTS: Record<CosKind, CosItem[]> = {
  face: FACES, frame: FRAMES, victory: VICTORIES, emotes: EMOTE_PACKS, title: TITLES, namecolor: NAME_COLORS, banner: BANNERS,
};

/** Default (free) item of every category. */
export const COS_DEFAULTS: Record<CosKind, string> = {
  face: 'f_classic', frame: 'fr_brass', victory: 'vx_classic', emotes: 'em_classic', title: 't_none', namecolor: 'nc_default', banner: 'bn_felt',
};

/** profiles column for each category (migration_008). */
export const COS_COLUMN: Record<CosKind, string> = {
  face: 'card_face', frame: 'frame', victory: 'victory', emotes: 'emotes', title: 'title', namecolor: 'name_color', banner: 'banner',
};

/** Earned-only items (never in the shop): shown in the wardrobe as locked until unlocked by play. */
export const EARNED_IDS = new Set(['t_grand_tour', 'ach_fr_envoy', ...[...ACH_TITLES, ...ACH_FRAMES, ...ACH_NAME_COLORS, ...ACH_BANNERS].map(x => x.id), ...S1_COSMETIC_IDS]);

const PREMIUM = new Set(COS_KINDS.flatMap(k => COS_LISTS[k].filter(i => i.premium).map(i => i.id)));
export const isCosPremium = (id: string) => PREMIUM.has(id);
export const cosItem = (kind: CosKind, id: string | null | undefined) => COS_LISTS[kind].find(i => i.id === id);
export const kindOfCos = (id: string): CosKind | undefined => COS_KINDS.find(k => COS_LISTS[k].some(i => i.id === id));

export const emotesOf = (packId: string | null | undefined) => (EMOTE_PACKS.find(p => p.id === packId) ?? EMOTE_PACKS[0]).emotes;
export const titleOf = (id: string | null | undefined) => TITLES.find(t => t.id === id && t.id !== 't_none');
export const bannerCss = (id: string | null | undefined) => (BANNERS.find(b => b.id === id) ?? BANNERS[0]).css;
