/**
 * Season 1 ("Jazz Age") cosmetics — earned on the Season Pass, never sold.
 *
 * They are spread into the normal catalogues (TABLES / BACKS in src/theme.ts, FRAMES / TITLES / NAME_COLORS / BANNERS /
 * EMOTE_PACKS / VICTORIES in src/cosmetics/data.ts) as `premium: true`, so store.canUse() requires ownership. The server
 * lists them in shop_items with price_bm = null (migration 016), so the ownership trigger from 008 refuses to equip them
 * unless they are owned — admin / god equip anything, like every other item.
 *
 * Art: pure CSS gradients + tiny SVG data-URIs (same rules as src/cosmetics/art.ts). The animated parts (frame, name
 * colour, victory) live in src/styles/season-cosmetics.css, loaded globally through this module.
 * No imports from theme.ts / cosmetics/data.ts here — they import this file.
 */
import { svg } from '../cosmetics/art';
import '../styles/season-cosmetics.css';

/** shop_items.kind of every season item (the SQL seed uses the same) */
export type SeasonItemKind = 'table' | 'back' | 'frame' | 'title' | 'namecolor' | 'banner' | 'emotes' | 'victory';

const VIGNETTE = 'radial-gradient(130% 90% at 50% 42%, rgba(0,0,0,0) 34%, rgba(0,0,0,.62) 100%)';

/* ----------------------------------------------------------------------------- table: Jazz Club */
// midnight-teal lacquer under a brass art-deco sunburst rising from the dealer's edge, one warm spotlight
const decoRays = 'repeating-conic-gradient(from -90deg at 50% 116%, rgba(226,189,98,.11) 0 1.1deg, transparent 1.1deg 7.5deg)';
const decoArcs = `radial-gradient(circle at 50% 116%, transparent 0 34%, rgba(243,222,156,.22) 34% 34.35%, transparent 34.35% 46%,
  rgba(226,189,98,.16) 46% 46.3%, transparent 46.3% 47.4%, rgba(226,189,98,.12) 47.4% 47.65%, transparent 47.65% 66%, rgba(226,189,98,.08) 66% 66.25%, transparent 66.25%)`;
const pinstripe = 'repeating-linear-gradient(90deg, rgba(255,255,255,.018) 0 1px, transparent 1px 5px)';
const jazzTable = {
  tone: '#0A1E26',
  css: `${VIGNETTE},
    radial-gradient(48% 38% at 50% 34%, rgba(255,226,160,.13), rgba(255,226,160,0) 70%),
    ${decoArcs}, ${decoRays}, ${pinstripe},
    radial-gradient(120% 90% at 50% 28%, #14363F 0%, #0B222B 52%, #050E13 100%)`,
  back: `radial-gradient(circle at 50% 100%, transparent 0 7px, #e2bd62 7px 8px, transparent 8px 11px, #c9a54c 11px 12px, transparent 12px) 0 0 / 24px 13px,
    linear-gradient(180deg, #14363f, #071419)`,
};

/* ----------------------------------------------------------------------------- card backs */
// Gilded Deco: black lacquer, brass sunburst medallion, diamond lattice, foil sweep (fx 'foil')
const gildedBack = `radial-gradient(circle at 50% 50%, #fff2c4 0 2px, #c9a54c 2.4px 3.4px, transparent 3.8px),
  radial-gradient(circle at 50% 50%, transparent 0 21%, rgba(243,222,156,.95) 21% 22.5%, transparent 22.5% 27%, rgba(201,165,76,.85) 27% 28%, transparent 28%),
  repeating-conic-gradient(from 0deg at 50% 50%, rgba(243,222,156,.5) 0 2.5deg, transparent 2.5deg 15deg),
  linear-gradient(45deg, transparent 46%, rgba(226,189,98,.32) 46% 54%, transparent 54%) 0 0 / 11px 11px,
  linear-gradient(-45deg, transparent 46%, rgba(226,189,98,.32) 46% 54%, transparent 54%) 0 0 / 11px 11px,
  linear-gradient(160deg, #1d1609, #08070b 55%, #151005)`;
// Jazz Ticket (free track): claret ticket stock, brass pinstripes, an ivory admit band with a perforation
const ticketBack = `radial-gradient(circle, rgba(247,241,227,.9) 0 1.15px, transparent 1.6px) 50% 0 / 100% 7px repeat-y,
  linear-gradient(90deg, transparent 0 33%, rgba(247,241,227,.88) 33% 34.5%, transparent 34.5% 65.5%, rgba(247,241,227,.88) 65.5% 67%, transparent 67%),
  linear-gradient(180deg, transparent 0 46%, rgba(226,189,98,.55) 46% 47%, transparent 47% 53%, rgba(226,189,98,.55) 53% 54%, transparent 54%),
  repeating-linear-gradient(135deg, rgba(226,189,98,.2) 0 1px, transparent 1px 7px),
  linear-gradient(180deg, #9a1d31, #5a0b19)`;

/* ----------------------------------------------------------------------------- banner: Jazz Skyline */
const skyline = svg(`
<svg xmlns='http://www.w3.org/2000/svg' width='400' height='120' viewBox='0 0 400 120' preserveAspectRatio='none'>
<defs><linearGradient id='w' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#ffe7a8'/><stop offset='1' stop-color='#c9a54c'/></linearGradient></defs>
<g fill='#05090c'>
<path d='M0 120V86h18V72h10v14h14V60l8-8 8 8v60z'/>
<path d='M64 120V44h6V30h4V18h3v12h4v14h6v76z'/>
<path d='M96 120V66h22v-8h16v62z'/>
<path d='M140 120V52l10-10h16l10 10v68z'/>
<path d='M182 120V24h4V8h2V0h2v8h2v16h4v96z'/>
<path d='M204 120V58h26v62z'/>
<path d='M236 120V40l6-6 6 6v-6l6-6 6 6v86z'/>
<path d='M266 120V70h12V56h18v64z'/>
<path d='M302 120V36h20v84z'/>
<path d='M328 120V62l12-12 12 12v58z'/>
<path d='M358 120V76h16V64h10v12h16v44z'/>
</g>
<g fill='url(#w)' opacity='.85'>
<rect x='68' y='52' width='3' height='4'/><rect x='76' y='60' width='3' height='4'/><rect x='68' y='76' width='3' height='4'/><rect x='80' y='88' width='3' height='4'/>
<rect x='146' y='60' width='4' height='4'/><rect x='158' y='72' width='4' height='4'/><rect x='146' y='92' width='4' height='4'/>
<rect x='186' y='40' width='2' height='4'/><rect x='191' y='58' width='2' height='4'/><rect x='186' y='80' width='2' height='4'/>
<rect x='306' y='46' width='3' height='4'/><rect x='314' y='62' width='3' height='4'/><rect x='306' y='84' width='3' height='4'/>
<rect x='242' y='54' width='3' height='4'/><rect x='254' y='70' width='3' height='4'/><rect x='336' y='74' width='3' height='4'/>
</g>
</svg>`);
const skylineBanner = `${skyline} 50% 100% / 100% 62% no-repeat,
  linear-gradient(104deg, transparent 30%, rgba(255,236,180,.14) 34%, transparent 38%),
  linear-gradient(76deg, transparent 58%, rgba(255,236,180,.11) 62%, transparent 66%),
  repeating-conic-gradient(from -90deg at 50% 110%, rgba(226,189,98,.08) 0 2deg, transparent 2deg 12deg),
  radial-gradient(90% 70% at 50% 108%, rgba(235,200,120,.35), transparent 60%),
  linear-gradient(180deg, #0b1a2b, #142b3b 55%, #2a2030)`;

/* ----------------------------------------------------------------------------- catalogue */

export const S1_TABLES = [{ id: 's1_table', name: 'Jazz Club', premium: true, ...jazzTable }];
export const S1_BACKS = [
  { id: 's1_bk_gilded', name: 'Gilded Deco', premium: true, fx: 'foil' as const, css: gildedBack },
  { id: 's1_bk_ticket', name: 'Jazz Ticket', premium: true, css: ticketBack },
];
export const S1_FRAMES = [{ id: 's1_fr_gilded', name: 'Jazz Age Halo', premium: true }];
export const S1_TITLES = [
  { id: 's1_t_debut', name: 'Debutant', glyph: '♪', premium: true },
  { id: 's1_t_maestro', name: 'Maestro', glyph: '♫', premium: true },
];
export const S1_NAME_COLORS = [
  { id: 's1_nc_champagne', name: 'Champagne', swatch: 'linear-gradient(100deg,#fffaf0,#f6e2a6 35%,#e9c977 60%,#fff6d8)', premium: true },
];
export const S1_BANNERS = [{ id: 's1_bn_skyline', name: 'Jazz Skyline', premium: true, css: skylineBanner }];
export const S1_EMOTES = [{ id: 's1_em_jazz', name: 'Jazz Band', premium: true, emotes: ['🎷', '🎺', '🎹', '🥂', '🎩', '🕺', '💃', '🍸'] }];
export const S1_VICTORIES = [{ id: 's1_vx_champagne', name: 'Champagne Shower', premium: true }];

/** Every season item with its shop_items kind (migration 016 seeds the same rows). */
export const S1_ITEMS: { id: string; kind: SeasonItemKind; rarity: 'epic' | 'legendary' }[] = [
  { id: 's1_table', kind: 'table', rarity: 'legendary' },
  { id: 's1_bk_gilded', kind: 'back', rarity: 'legendary' },
  { id: 's1_bk_ticket', kind: 'back', rarity: 'epic' },
  { id: 's1_fr_gilded', kind: 'frame', rarity: 'legendary' },
  { id: 's1_t_debut', kind: 'title', rarity: 'epic' },
  { id: 's1_t_maestro', kind: 'title', rarity: 'legendary' },
  { id: 's1_nc_champagne', kind: 'namecolor', rarity: 'legendary' },
  { id: 's1_bn_skyline', kind: 'banner', rarity: 'legendary' },
  { id: 's1_em_jazz', kind: 'emotes', rarity: 'epic' },
  { id: 's1_vx_champagne', kind: 'victory', rarity: 'legendary' },
];
export const S1_COSMETIC_IDS = S1_ITEMS.map(i => i.id);
export const seasonItem = (id: string | undefined) => S1_ITEMS.find(i => i.id === id);
