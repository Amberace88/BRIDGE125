import { BACK_ART, TABLE_ART } from './cosmetics/art';
import { isCosPremium } from './cosmetics/data';
import { S1_BACKS, S1_TABLES } from './season/cosmetics';
import './styles/cosmetics.css';

export interface Accent { id: string; name: string; hi: string; base: string; lo: string; ink: string; premium?: boolean }
export interface Table { id: string; name: string; css: string; back: string; tone: string; premium?: boolean }
/** fx: 'foil' = animated foil shimmer sweep (legendary backs); see styles/cosmetics.css */
export interface CardBack { id: string; name: string; css: string; premium?: boolean; fx?: 'foil' }

export const ACCENTS: Accent[] = [
  { id: 'brass', name: 'Brass', hi: '#EBD38E', base: '#C9A54C', lo: '#8C6E28', ink: '#2B1E03' },
  { id: 'ruby', name: 'Ruby', hi: '#FF8FA0', base: '#D2334F', lo: '#8E1529', ink: '#FFFFFF' },
  { id: 'sapphire', name: 'Sapphire', hi: '#9CC4FF', base: '#3F7FE0', lo: '#1F4A93', ink: '#FFFFFF' },
  { id: 'amethyst', name: 'Amethyst', hi: '#D6B6FF', base: '#9B6BDF', lo: '#5D3A99', ink: '#FFFFFF' },
  { id: 'silver', name: 'Silver', hi: '#F2F4F7', base: '#C3C9D2', lo: '#7D8592', ink: '#16181C' },
  { id: 'copper', name: 'Copper', hi: '#FFC29A', base: '#D9804A', lo: '#8F4A21', ink: '#2A1205' },
  { id: 'emerald', name: 'Emerald', hi: '#8FF5C8', base: '#2FBF86', lo: '#13724C', ink: '#03251A', premium: true },
  { id: 'rosegold', name: 'Rose Gold', hi: '#FFD3C4', base: '#E2A08E', lo: '#9A5E52', ink: '#2E120C', premium: true },
  { id: 'neon', name: 'Neon', hi: '#FF9BF2', base: '#F23FD8', lo: '#8A1C9E', ink: '#FFFFFF', premium: true },
  { id: 'platinum', name: 'Platinum', hi: '#FFFFFF', base: '#DCE6F2', lo: '#8796AA', ink: '#0E1520', premium: true },
];

const malachite = `
  radial-gradient(130% 90% at 50% 42%, rgba(0,0,0,0) 35%, rgba(0,0,0,.55) 100%),
  repeating-radial-gradient(ellipse 120% 70% at 85% -10%, rgba(26,112,88,0) 0 9px, rgba(26,112,88,.35) 9px 13px, rgba(6,40,33,.25) 13px 17px, rgba(26,112,88,0) 17px 24px),
  repeating-radial-gradient(ellipse 150% 95% at 10% 115%, #0F4F41 0 8px, #135C4B 8px 13px, #0B3E33 13px 16px, #1A7058 16px 19px, #0F4F41 19px 27px, #0B3E33 27px 31px)`;

export const TABLES: Table[] = [
  { id: 'malachite', name: 'Malachite', tone: '#0B3E33', css: malachite,
    back: 'repeating-radial-gradient(ellipse 160% 100% at 0% 100%, #0d4b3e 0 3px,#17705a 3px 5px,#0a3d33 5px 6px,#1f8467 6px 7.5px,#0e5444 7.5px 10px)' },
  { id: 'amber', name: 'Amber', tone: '#3A2006', css: `radial-gradient(130% 90% at 50% 42%, rgba(0,0,0,0) 30%, rgba(0,0,0,.6) 100%),
    repeating-linear-gradient(112deg, #6B3A0C 0 14px, #7F4810 14px 22px, #5A300A 22px 30px, #8A5317 30px 34px, #643509 34px 46px)`,
    back: 'repeating-linear-gradient(115deg,#d79a2b 0 6px,#e9b44c 6px 9px,#b97818 9px 13px,#f0c76a 13px 15px)' },
  { id: 'nights', name: 'White Nights', tone: '#0E1430', css: `radial-gradient(2px 2px at 20% 18%, #fff8 50%, transparent 51%), radial-gradient(1.5px 1.5px at 70% 12%, #fff6 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 85% 40%, #fff5 50%, transparent 51%), radial-gradient(2px 2px at 35% 65%, #fff4 50%, transparent 51%),
    radial-gradient(120% 80% at 50% 0%, #2A3B78 0%, #141C44 45%, #0A0F26 100%)`,
    back: 'radial-gradient(circle at 70% 25%,#f4e7b8 0 2px,transparent 3px),radial-gradient(circle at 30% 60%,#c8d2ff 0 1.5px,transparent 2.5px),linear-gradient(180deg,#1d2b5a,#0e1430)' },
  { id: 'velvet', name: 'Velvet', tone: '#3A0814', css: `radial-gradient(130% 90% at 50% 40%, #7A1428 0%, #4A0B18 55%, #22040A 100%),
    repeating-linear-gradient(90deg, rgba(255,255,255,.025) 0 1px, transparent 1px 3px)`,
    back: 'repeating-conic-gradient(from 0deg at 50% 50%,#8f1326 0 15deg,#b81c34 15deg 30deg)' },
  { id: 'graphite', name: 'Graphite', tone: '#15171B', css: `radial-gradient(120% 90% at 50% 35%, #2C3036 0%, #1A1D22 55%, #0E1013 100%),
    repeating-linear-gradient(45deg, rgba(255,255,255,.018) 0 2px, transparent 2px 6px)`,
    back: 'repeating-linear-gradient(45deg,#2b2f36 0 4px,#3a3f48 4px 6px)' },
  { id: 'baltic', name: 'Baltic Sea', tone: '#06303A', css: `radial-gradient(130% 90% at 50% 42%, rgba(0,0,0,0) 35%, rgba(0,0,0,.5) 100%),
    repeating-radial-gradient(ellipse 200% 60% at 50% 120%, #0A4A57 0 10px, #0E5A68 10px 16px, #083D48 16px 22px)`,
    back: 'repeating-radial-gradient(ellipse 200% 60% at 50% 120%, #0f6b7c 0 3px,#0a4b57 3px 6px)' },
  { id: 'royal', name: 'Royal Purple', tone: '#24103F', premium: true, css: `radial-gradient(130% 90% at 50% 40%, rgba(0,0,0,0) 30%, rgba(0,0,0,.6) 100%),
    radial-gradient(circle at 50% 50%, rgba(235,200,120,.10) 0 2px, transparent 3px) 0 0 / 34px 34px,
    radial-gradient(circle at 50% 50%, rgba(235,200,120,.06) 0 6px, transparent 7px) 17px 17px / 34px 34px,
    radial-gradient(120% 90% at 50% 30%, #4B2386 0%, #2C1356 55%, #150829 100%)`,
    back: 'radial-gradient(circle at 50% 50%, #e9c46a 0 1.5px, transparent 2.5px) 0 0/9px 9px, linear-gradient(160deg,#4b2386,#22104a)' },
  { id: 'montecarlo', name: 'Monte Carlo', tone: '#4A0A0E', premium: true, css: `radial-gradient(130% 90% at 50% 42%, rgba(0,0,0,0) 32%, rgba(0,0,0,.62) 100%),
    repeating-linear-gradient(0deg, rgba(255,255,255,.02) 0 1px, transparent 1px 3px),
    radial-gradient(110% 80% at 50% 35%, #A3161F 0%, #6E0D13 55%, #33060A 100%)`,
    back: 'repeating-linear-gradient(45deg,#7a0e15 0 5px,#a3161f 5px 7px), repeating-linear-gradient(-45deg,transparent 0 5px,rgba(255,215,140,.25) 5px 6px)' },
  { id: 'jugend', name: 'Art Nouveau', tone: '#0D3A3A', premium: true, css: `radial-gradient(130% 90% at 50% 42%, rgba(0,0,0,0) 35%, rgba(0,0,0,.55) 100%),
    repeating-radial-gradient(circle at 0% 0%, rgba(214,180,100,.10) 0 2px, transparent 2px 46px),
    repeating-radial-gradient(circle at 100% 100%, rgba(214,180,100,.08) 0 2px, transparent 2px 46px),
    radial-gradient(120% 90% at 50% 35%, #17625E 0%, #0E4544 55%, #062221 100%)`,
    back: 'repeating-radial-gradient(circle at 0 0, #d6b464 0 1px, transparent 1px 10px), repeating-radial-gradient(circle at 100% 100%, #d6b464 0 1px, transparent 1px 10px), linear-gradient(160deg,#17625e,#0b3a39)' },
  { id: 'synth', name: 'Neon Night', tone: '#120A2A', premium: true, css: `linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(242,63,216,.10) 100%),
    repeating-linear-gradient(90deg, rgba(0,229,255,.10) 0 1px, transparent 1px 48px),
    repeating-linear-gradient(0deg, rgba(242,63,216,.08) 0 1px, transparent 1px 48px),
    radial-gradient(120% 90% at 50% 20%, #2A1660 0%, #160B36 55%, #08041A 100%)`,
    back: 'repeating-linear-gradient(90deg, rgba(0,229,255,.6) 0 1px, transparent 1px 8px), repeating-linear-gradient(0deg, rgba(242,63,216,.55) 0 1px, transparent 1px 8px), linear-gradient(180deg,#24105a,#0c0624)' },
  // ---- wave 2 premium tables (art in src/cosmetics/art.ts)
  { id: 'marble', name: 'Midnight Marble', premium: true, ...TABLE_ART.marble },
  { id: 'emvelvet', name: 'Emerald Chesterfield', premium: true, ...TABLE_ART.emvelvet },
  { id: 'oldriga', name: 'Old Riga Night', premium: true, ...TABLE_ART.oldriga },
  { id: 'yacht', name: 'Monaco Yacht', premium: true, ...TABLE_ART.yacht },
  { id: 'aurora', name: 'Northern Lights', premium: true, ...TABLE_ART.aurora },
  { id: 'damask', name: 'Black Gold Damask', premium: true, ...TABLE_ART.damask },
  { id: 'sakura', name: 'Sakura', premium: true, ...TABLE_ART.sakura },
  { id: 'carbonrace', name: 'Carbon Racing', premium: true, ...TABLE_ART.carbonrace },
  // ---- Season Pass (earned, never sold — migration 016)
  ...S1_TABLES,
];

export const BACKS: CardBack[] = [
  { id: 'match', name: 'Table', css: '' },
  { id: 'crimson', name: 'Crimson', css: 'repeating-linear-gradient(45deg,#8f1326 0 6px,#b81c34 6px 8px), repeating-linear-gradient(-45deg,transparent 0 6px,rgba(255,255,255,.12) 6px 7px), #8f1326' },
  { id: 'midnight', name: 'Midnight', css: 'radial-gradient(circle at 30% 30%, #f4e7b8 0 1px, transparent 2px) 0 0/12px 12px, radial-gradient(circle at 70% 70%, #c8d2ff 0 1px, transparent 2px) 0 0/16px 16px, linear-gradient(180deg,#1d2b5a,#0b1230)' },
  { id: 'carbon', name: 'Carbon', css: 'repeating-linear-gradient(45deg,#1b1d22 0 3px,#2a2d34 3px 6px), repeating-linear-gradient(-45deg,transparent 0 3px,rgba(255,255,255,.04) 3px 6px)' },
  { id: 'gold', name: 'Gold Foil', premium: true, css: 'linear-gradient(115deg,#8c6e28 0%,#f3de9c 22%,#c9a54c 38%,#fff2c4 50%,#b8913a 64%,#f3de9c 80%,#8c6e28 100%)' },
  { id: 'jugend', name: 'Art Nouveau', premium: true, css: 'repeating-radial-gradient(circle at 0 0, #d6b464 0 1px, transparent 1px 10px), repeating-radial-gradient(circle at 100% 100%, #d6b464 0 1px, transparent 1px 10px), linear-gradient(160deg,#17625e,#0b3a39)' },
  { id: 'neon', name: 'Neon Grid', premium: true, css: 'repeating-linear-gradient(90deg, rgba(0,229,255,.7) 0 1px, transparent 1px 8px), repeating-linear-gradient(0deg, rgba(242,63,216,.6) 0 1px, transparent 1px 8px), linear-gradient(180deg,#24105a,#0c0624)' },
  { id: 'royal', name: 'Royal', premium: true, css: 'radial-gradient(circle at 50% 50%, #e9c46a 0 1.5px, transparent 2.5px) 0 0/9px 9px, linear-gradient(160deg,#4b2386,#22104a)' },
  // ---- wave 2 premium backs
  { id: 'bk_onyx', name: 'Onyx Foil', premium: true, fx: 'foil', css: BACK_ART.bk_onyx },
  { id: 'bk_holo', name: 'Holographic', premium: true, fx: 'foil', css: BACK_ART.bk_holo },
  { id: 'bk_dragon', name: 'Dragon Scale', premium: true, fx: 'foil', css: BACK_ART.bk_dragon },
  { id: 'bk_marble', name: 'Marble', premium: true, css: BACK_ART.bk_marble },
  { id: 'bk_damask', name: 'Wine Damask', premium: true, css: BACK_ART.bk_damask },
  { id: 'bk_aurora', name: 'Aurora', premium: true, css: BACK_ART.bk_aurora },
  { id: 'bk_riga', name: 'Riga Spires', premium: true, css: BACK_ART.bk_riga },
  { id: 'bk_deco', name: 'Art Deco Fan', premium: true, css: BACK_ART.bk_deco },
  { id: 'bk_sakura', name: 'Sakura', premium: true, css: BACK_ART.bk_sakura },
  { id: 'bk_racing', name: 'Chequered Flag', premium: true, css: BACK_ART.bk_racing },
  { id: 'bk_teak', name: 'Teak & Brass', premium: true, css: BACK_ART.bk_teak },
  { id: 'bk_studs', name: 'Brass Studs', premium: true, css: BACK_ART.bk_studs },
  { id: 'bk_tartan', name: 'Tartan', premium: true, css: BACK_ART.bk_tartan },
  // ---- Season Pass (earned, never sold — migration 016)
  ...S1_BACKS,
];

export const isPremium = (id: string) =>
  !!(ACCENTS.find(a => a.id === id)?.premium || TABLES.find(t => t.id === id)?.premium || BACKS.find(b => b.id === id)?.premium || isCosPremium(id));

/** Animated effect of the card back that is actually shown ('match' → none). */
export const backFx = (backId: string) => BACKS.find(b => b.id === backId && b.id !== 'match')?.fx;

/** The CSS background used for card backs: an explicit design, or the table's matching back. */
export const backCss = (backId: string, tableId: string) =>
  BACKS.find(b => b.id === backId && b.id !== 'match')?.css || (TABLES.find(t => t.id === tableId) ?? TABLES[0]).back;

export function applyTheme(accentId: string, tableId: string, backId = 'match') {
  const a = ACCENTS.find(x => x.id === accentId) ?? ACCENTS[0];
  const t = TABLES.find(x => x.id === tableId) ?? TABLES[0];
  const r = document.documentElement.style;
  r.setProperty('--acc-hi', a.hi); r.setProperty('--acc', a.base); r.setProperty('--acc-lo', a.lo); r.setProperty('--acc-ink', a.ink);
  r.setProperty('--table', t.css); r.setProperty('--back', backCss(backId, tableId)); r.setProperty('--tone', t.tone);
  const fx = backFx(backId);
  if (fx) document.documentElement.dataset.backfx = fx; else delete document.documentElement.dataset.backfx;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t.tone);
}

/* Card-face style from the device cache (src/cosmetics/useCosmetics.ts → COS_CACHE_KEY) before the first render, so cards
   never flash in the wrong style. <CosmeticsSync /> then keeps it in line with the account (and entitlements). */
try {
  const face = (JSON.parse(localStorage.getItem('b125.cos.v1') ?? '{}') as { face?: unknown }).face;
  document.documentElement.dataset.face = typeof face === 'string' && /^f_[a-z]+$/.test(face) ? face : 'f_classic';
} catch { /* no storage / no DOM (tests) */ }
