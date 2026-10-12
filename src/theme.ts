export interface Accent { id: string; name: string; hi: string; base: string; lo: string; ink: string }
export interface Table { id: string; name: string; css: string; back: string; tone: string }

export const ACCENTS: Accent[] = [
  { id: 'brass', name: 'Brass', hi: '#EBD38E', base: '#C9A54C', lo: '#8C6E28', ink: '#2B1E03' },
  { id: 'ruby', name: 'Ruby', hi: '#FF8FA0', base: '#D2334F', lo: '#8E1529', ink: '#FFFFFF' },
  { id: 'sapphire', name: 'Sapphire', hi: '#9CC4FF', base: '#3F7FE0', lo: '#1F4A93', ink: '#FFFFFF' },
  { id: 'amethyst', name: 'Amethyst', hi: '#D6B6FF', base: '#9B6BDF', lo: '#5D3A99', ink: '#FFFFFF' },
  { id: 'silver', name: 'Silver', hi: '#F2F4F7', base: '#C3C9D2', lo: '#7D8592', ink: '#16181C' },
  { id: 'copper', name: 'Copper', hi: '#FFC29A', base: '#D9804A', lo: '#8F4A21', ink: '#2A1205' },
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
];

export function applyTheme(accentId: string, tableId: string) {
  const a = ACCENTS.find(x => x.id === accentId) ?? ACCENTS[0];
  const t = TABLES.find(x => x.id === tableId) ?? TABLES[0];
  const r = document.documentElement.style;
  r.setProperty('--acc-hi', a.hi); r.setProperty('--acc', a.base); r.setProperty('--acc-lo', a.lo); r.setProperty('--acc-ink', a.ink);
  r.setProperty('--table', t.css); r.setProperty('--back', t.back); r.setProperty('--tone', t.tone);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t.tone);
}
