/**
 * Premium art for tables, card backs and banners — pure CSS gradients + small SVG data-URIs.
 * Everything is static (no per-frame paint); SVG tiles are rasterised once by the browser and repeated.
 * Keep each SVG tiny: they ship in the main bundle.
 */

/** SVG markup → CSS url() value. */
export const svg = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s.replace(/\s{2,}/g, ' ').trim())}")`;

/** Deterministic PRNG (mulberry32) so generated tiles are identical on every load. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VIGNETTE = 'radial-gradient(130% 90% at 50% 42%, rgba(0,0,0,0) 34%, rgba(0,0,0,.6) 100%)';

/* ----------------------------------------------------------------------------- marble */
const marbleTile = (size: number, freq: string, seed: number, vein: string, vein2: string) => {
  // turbulence (|noise|) is ~0 along creases → map small values to opaque veins. Alpha is offset by .02 so it never hits
  // exactly 0 (premultiplied black specks at the noise lattice points).
  const veins = (id: string, sd: number, rgb: string, table: string, blur: number) => `
<filter id='${id}' color-interpolation-filters='sRGB' x='0' y='0' width='100%' height='100%'>
  <feTurbulence type='turbulence' baseFrequency='${freq}' numOctaves='5' seed='${sd}' stitchTiles='stitch'/>
  <feColorMatrix values='0 0 0 0 ${rgb}  .98 0 0 0 .02'/>
  <feComponentTransfer><feFuncA type='table' tableValues='${table}'/></feComponentTransfer>
  <feGaussianBlur stdDeviation='${blur}'/>
</filter>`;
  return svg(`
<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>
<filter id='c' x='0' y='0' width='100%' height='100%'>
  <feTurbulence type='fractalNoise' baseFrequency='.008' numOctaves='3' seed='${seed + 3}' stitchTiles='stitch'/>
  <feColorMatrix values='0 0 0 0 .5  0 0 0 0 .55  0 0 0 0 .66  .35 0 0 0 -.12'/>
</filter>
${veins('b', seed + 9, vein2, '.6 .22 .03 0 0 0 0 0 0 0', 0.45)}
${veins('a', seed, vein, '1 .5 .1 0 0 0 0 0 0 0 0 0', 0.4)}
<rect width='100%' height='100%' filter='url(#c)'/>
<rect width='100%' height='100%' filter='url(#b)'/>
<rect width='100%' height='100%' filter='url(#a)'/>
</svg>`);
};
// vein colours are colour-matrix rows: "r  0 0 0 0 g  0 0 0 0 b"
const GOLD_VEIN = '.98  0 0 0 0 .86  0 0 0 0 .58', WHITE_VEIN = '.85  0 0 0 0 .88  0 0 0 0 .95';
export const marbleBig = marbleTile(560, '.0028 .0065', 11, GOLD_VEIN, WHITE_VEIN);
export const marbleSmall = marbleTile(220, '.007 .016', 4, GOLD_VEIN, WHITE_VEIN);

/* ----------------------------------------------------------------------------- chesterfield (emerald velvet + brass studs) */
const chesterTile = (w: number, h: number, hi: string, stud: number) => svg(`
<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>
<defs>
  <radialGradient id='p' cx='.5' cy='.5' r='.5'><stop offset='0' stop-color='${hi}' stop-opacity='.42'/><stop offset='.7' stop-color='${hi}' stop-opacity='.08'/><stop offset='1' stop-color='${hi}' stop-opacity='0'/></radialGradient>
  <radialGradient id='b' cx='.35' cy='.32' r='.75'><stop offset='0' stop-color='#fff6cf'/><stop offset='.3' stop-color='#e2bd62'/><stop offset='.75' stop-color='#8a6420'/><stop offset='1' stop-color='#3b2a08'/></radialGradient>
  <g id='s'><circle r='${stud + 1.6}' fill='#000' fill-opacity='.45'/><circle r='${stud}' fill='url(#b)'/></g>
</defs>
${[[w / 2, 0], [0, h / 2], [w, h / 2], [w / 2, h]].map(([x, y]) => `<ellipse cx='${x}' cy='${y}' rx='${w * 0.42}' ry='${h * 0.42}' fill='url(#p)'/>`).join('')}
<path d='M0 0L${w} ${h}M${w} 0L0 ${h}' stroke='#010d08' stroke-opacity='.75' stroke-width='2.2'/>
<path d='M0 1.4L${w} ${h + 1.4}M${w} 1.4L0 ${h + 1.4}' stroke='${hi}' stroke-opacity='.18' stroke-width='1'/>
${[[0, 0], [w, 0], [0, h], [w, h], [w / 2, h / 2]].map(([x, y]) => `<use href='#s' x='${x}' y='${y}'/>`).join('')}
</svg>`);
export const chesterBig = chesterTile(84, 58, '#36c68b', 3.4);
export const chesterSmall = chesterTile(30, 21, '#36c68b', 1.6);

/* ----------------------------------------------------------------------------- Old Riga cobblestones */
function cobbleTile(seed: number, size: number) {
  const r = rng(seed);
  const rows = 5, rh = size / rows;
  let out = '';
  for (let y = 0; y < rows; y++) {
    let x = -(r() * rh);
    while (x < size) {
      const w = rh * (0.9 + r() * 0.75);
      const tone = 28 + Math.round(r() * 26), warm = r() < 0.35;
      const fill = warm ? `rgb(${tone + 10},${tone + 4},${tone})` : `rgb(${tone - 4},${tone},${tone + 12})`;
      const g = 2.2;
      const rx = Math.min(w, rh) * 0.34;
      const rect = (ox: number) => `<rect x='${(x + ox + g / 2).toFixed(1)}' y='${(y * rh + g / 2).toFixed(1)}' width='${(w - g).toFixed(1)}' height='${(rh - g).toFixed(1)}' rx='${rx.toFixed(1)}' fill='${fill}'/>` +
        `<rect x='${(x + ox + g / 2 + 2).toFixed(1)}' y='${(y * rh + g / 2 + 1.5).toFixed(1)}' width='${(w - g - 4).toFixed(1)}' height='${((rh - g) * 0.45).toFixed(1)}' rx='${(rx * 0.8).toFixed(1)}' fill='#c9d4ff' fill-opacity='.07'/>`;
      out += rect(0);
      if (x < 0) out += rect(size);          // wrap so the tile is seamless
      if (x + w > size) out += rect(-size);
      x += w;
    }
  }
  return svg(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><rect width='100%' height='100%' fill='#07090f'/>${out}</svg>`);
}
export const cobbles = cobbleTile(12, 150);

/* Riga skyline: St Peter's spire, the Dom tower, gables, the Three Brothers — for card backs & banners. */
const RIGA_PATH = 'M0 120 L0 92 L10 92 L10 84 L16 78 L22 84 L22 92 L30 92 L30 80 L38 72 L46 80 L46 92 L52 92 L52 70 L55 70 L55 52 L58 44 L58 30 L60 22 L61 6 L62 22 L64 30 L64 44 L67 52 L67 70 L70 70 L70 90 L78 90 L78 78 L84 72 L90 78 L90 90 L96 90 L96 66 L99 66 L99 54 L102 48 L105 54 L105 66 L108 66 L108 88 L116 88 L116 76 L121 70 L126 76 L126 88 L134 88 L134 82 L140 82 L140 120 Z';
const rigaWindows = (() => {
  const r = rng(5); let s = '';
  for (let i = 0; i < 22; i++) {
    const x = 4 + r() * 132, y = 88 + r() * 26;
    s += `<rect x='${x.toFixed(1)}' y='${y.toFixed(1)}' width='2' height='2.6' fill='#ffcf7a' fill-opacity='${(0.45 + r() * 0.5).toFixed(2)}'/>`;
  }
  return s;
})();
export const rigaSkyline = svg(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 140 120' preserveAspectRatio='xMidYMax slice'>
<defs><linearGradient id='w' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#101a33'/><stop offset='1' stop-color='#05070f'/></linearGradient></defs>
<path d='${RIGA_PATH}' fill='url(#w)'/><path d='M61 6 L61 0' stroke='#e9c46a' stroke-width='.8'/><circle cx='61' cy='0.5' r='1.1' fill='#e9c46a'/>${rigaWindows}</svg>`);

/* ----------------------------------------------------------------------------- teak deck */
function teakTile() {
  const W = 320, H = 108, ph = 36, r = rng(21);
  const tones = ['#9b5a26', '#a96631', '#8c4f20'];
  let s = '';
  for (let i = 0; i < 3; i++) {
    const y = i * ph;
    s += `<rect x='0' y='${y}' width='${W}' height='${ph}' fill='${tones[i]}'/>`;
    for (let k = 0; k < 7; k++) {
      const yy = y + 4 + r() * (ph - 8), a = (r() * 4 - 2).toFixed(1), b = (r() * 4 - 2).toFixed(1);
      s += `<path d='M0 ${yy.toFixed(1)} C${W * 0.3} ${(yy + +a).toFixed(1)} ${W * 0.6} ${(yy + +b).toFixed(1)} ${W} ${yy.toFixed(1)}' stroke='#3a1c08' stroke-opacity='${(0.12 + r() * 0.18).toFixed(2)}' stroke-width='${(0.6 + r()).toFixed(1)}' fill='none'/>`;
    }
    s += `<rect x='0' y='${y}' width='${W}' height='3' fill='#120904'/>`;
    s += `<rect x='0' y='${y + 3}' width='${W}' height='1' fill='#ffd9a0' fill-opacity='.18'/>`;
    const jx = [40, 230, 135][i];
    s += `<rect x='${jx}' y='${y}' width='2.5' height='${ph}' fill='#120904' fill-opacity='.85'/>`;
  }
  return svg(`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>${s}</svg>`);
}
export const teak = teakTile();

/* ----------------------------------------------------------------------------- damask */
const DAMASK = `
<path d='M40 26 C54 44 54 76 40 94 C26 76 26 44 40 26Z' fill='G' fill-opacity='.26'/>
<path d='M40 40 C47 52 47 68 40 80 C33 68 33 52 40 40Z' fill='none' stroke='G' stroke-opacity='.6' stroke-width='1.2'/>
<path d='M40 58 C52 50 64 40 61 30 C59 22 49 24 52 32' fill='none' stroke='G' stroke-opacity='.55' stroke-width='1.6'/>
<path d='M40 58 C28 50 16 40 19 30 C21 22 31 24 28 32' fill='none' stroke='G' stroke-opacity='.55' stroke-width='1.6'/>
<path d='M40 84 C54 88 64 98 60 106 C56 113 47 107 52 101' fill='none' stroke='G' stroke-opacity='.5' stroke-width='1.6'/>
<path d='M40 84 C26 88 16 98 20 106 C24 113 33 107 28 101' fill='none' stroke='G' stroke-opacity='.5' stroke-width='1.6'/>
<path d='M40 24 C35 16 35 10 40 3 C45 10 45 16 40 24Z' fill='G' fill-opacity='.45'/>
<circle cx='40' cy='60' r='2.6' fill='G' fill-opacity='.7'/>
<circle cx='61' cy='68' r='1.6' fill='G' fill-opacity='.45'/><circle cx='19' cy='68' r='1.6' fill='G' fill-opacity='.45'/>
<path d='M40 96 L37 104 L40 112 L43 104Z' fill='G' fill-opacity='.4'/>`;
const damaskTile = (w: number, color: string) => {
  const k = w / 80;
  const motif = DAMASK.replace(/'G'/g, `'${color}'`);
  const at = (x: number, y: number) => `<g transform='translate(${x * k} ${y * k}) scale(${k})'>${motif}</g>`;
  return svg(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${120 * k}'>${at(0, 0)}${at(-40, -60)}${at(40, -60)}${at(-40, 60)}${at(40, 60)}</svg>`);
};
export const damaskBig = damaskTile(96, '#e2bd62');
export const damaskSmall = damaskTile(34, '#e2bd62');

/* ----------------------------------------------------------------------------- sakura */
const PETAL = `M0 0 C-6 -5 -7 -14 -2.4 -18 L0 -15.5 L2.4 -18 C7 -14 6 -5 0 0Z`;
function sakuraTile(size: number, seed: number, n: number) {
  const r = rng(seed);
  let s = `<defs><radialGradient id='p' cx='.5' cy='.85' r='.9'><stop offset='0' stop-color='#ffffff'/><stop offset='.55' stop-color='#ffc7da'/><stop offset='1' stop-color='#f08fb3'/></radialGradient>
  <g id='f'>${[0, 72, 144, 216, 288].map(a => `<path d='${PETAL}' transform='rotate(${a})' fill='url(#p)'/>`).join('')}<circle r='2.6' fill='#ffd36b'/>
  ${[0, 72, 144, 216, 288].map(a => `<circle cx='0' cy='-5.5' r='.9' fill='#c23a6a' transform='rotate(${a + 36})'/>`).join('')}</g>
  <path id='l' d='${PETAL}' fill='url(#p)'/></defs>`;
  const place = (x: number, y: number, sc: number, rot: number, op: number, id: string) => {
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      const X = x + dx, Y = y + dy;
      if (X < -30 || X > size + 30 || Y < -30 || Y > size + 30) continue;
      s += `<use href='#${id}' transform='translate(${X.toFixed(1)} ${Y.toFixed(1)}) rotate(${rot.toFixed(0)}) scale(${sc.toFixed(2)})' opacity='${op.toFixed(2)}'/>`;
    }
  };
  for (let i = 0; i < n; i++) place(r() * size, r() * size, 0.55 + r() * 0.75, r() * 72, 0.55 + r() * 0.4, 'f');
  for (let i = 0; i < n * 1.6; i++) place(r() * size, r() * size, 0.35 + r() * 0.35, r() * 360, 0.35 + r() * 0.4, 'l');
  return svg(`<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>${s}</svg>`);
}
export const sakuraBig = sakuraTile(220, 9, 6);
export const sakuraSmall = sakuraTile(90, 3, 3);

/* ----------------------------------------------------------------------------- aurora */
const auroraRays = svg(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' preserveAspectRatio='none'>
<filter id='r' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.018 .0018' numOctaves='3' seed='4'/>
<feColorMatrix values='0 0 0 0 .45  0 0 0 0 1  0 0 0 0 .78  1.6 0 0 0 -.62'/></filter>
<linearGradient id='f' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='.2'/><stop offset='.3' stop-color='#fff'/><stop offset='.62' stop-color='#fff' stop-opacity='.55'/><stop offset='1' stop-color='#fff' stop-opacity='0'/></linearGradient>
<mask id='m'><rect width='100%' height='100%' fill='url(#f)'/></mask>
<rect width='100%' height='100%' filter='url(#r)' mask='url(#m)'/></svg>`);
const STARS = ['8% 12%', '22% 30%', '35% 8%', '48% 22%', '63% 10%', '77% 28%', '90% 14%', '14% 46%', '86% 50%', '56% 4%', '70% 44%', '28% 58%']
  .map((p, i) => `radial-gradient(${i % 3 ? 1.2 : 1.8}px ${i % 3 ? 1.2 : 1.8}px at ${p}, rgba(255,255,255,${i % 2 ? 0.55 : 0.85}) 50%, transparent 51%)`).join(',');
export const auroraSky = `${STARS},
  radial-gradient(70% 34% at 28% 26%, rgba(64,255,170,.42), transparent 70%),
  radial-gradient(60% 26% at 72% 18%, rgba(70,200,255,.32), transparent 70%),
  radial-gradient(50% 30% at 56% 40%, rgba(176,92,255,.30), transparent 72%),
  ${auroraRays} 0 0 / 100% 70% no-repeat,
  linear-gradient(180deg, #071226 0%, #0a1d33 40%, #062224 75%, #031012 100%)`;

/* ----------------------------------------------------------------------------- carbon */
const carbon = (u: number) => {
  const t = u * 4, h = u * 2;
  return `
  linear-gradient(27deg, #0f0f10 ${u}px, transparent ${u}px) 0 ${u}px / ${t}px ${t}px,
  linear-gradient(207deg, #0f0f10 ${u}px, transparent ${u}px) ${h}px 0 / ${t}px ${t}px,
  linear-gradient(27deg, #1e1f22 ${u}px, transparent ${u}px) 0 ${h}px / ${t}px ${t}px,
  linear-gradient(207deg, #1e1f22 ${u}px, transparent ${u}px) ${h}px ${u}px / ${t}px ${t}px,
  linear-gradient(90deg, #17181a ${h}px, transparent ${h}px) 0 0 / ${t}px ${t}px,
  linear-gradient(#1a1b1d 25%, #141516 25%, #141516 50%, transparent 50%, transparent 75%, #232427 75%, #232427) 0 0 / ${t}px ${t}px`;
};
export const carbonWeave = carbon(5);

/* ============================================================================= TABLE FELTS */
export const TABLE_ART = {
  marble: {
    tone: '#0B0C10',
    css: `${VIGNETTE},
      radial-gradient(90% 70% at 50% 40%, rgba(255,240,200,.06), transparent 70%),
      ${marbleBig} 0 0 / 560px 560px,
      radial-gradient(120% 90% at 50% 35%, #1f2229 0%, #121419 55%, #08090c 100%)`,
    back: `${marbleSmall} 0 0 / 220px 220px, linear-gradient(160deg, #1d2027, #0b0c10)`,
  },
  emvelvet: {
    tone: '#06301F',
    css: `${VIGNETTE},
      ${chesterBig} 0 0 / 84px 58px,
      radial-gradient(120% 90% at 50% 38%, #12704a 0%, #0a4a31 55%, #04241a 100%)`,
    back: `${chesterSmall} 0 0 / 30px 21px, radial-gradient(120% 100% at 50% 40%, #12704a, #06301f)`,
  },
  oldriga: {
    tone: '#090C16',
    css: `radial-gradient(70% 55% at 50% 4%, rgba(255,176,84,.55), rgba(255,150,60,.16) 48%, transparent 74%),
      radial-gradient(26% 18% at 50% 2%, rgba(255,232,180,.7), transparent 70%),
      radial-gradient(40% 30% at 8% 100%, rgba(255,170,80,.22), transparent 70%),
      radial-gradient(40% 30% at 92% 100%, rgba(255,170,80,.18), transparent 70%),
      radial-gradient(70% 40% at 50% 110%, rgba(110,140,255,.18), transparent 70%),
      radial-gradient(140% 95% at 50% 40%, rgba(0,0,0,0) 30%, rgba(3,4,10,.78) 100%),
      linear-gradient(180deg, rgba(255,190,110,.10), rgba(20,30,70,.25)),
      ${cobbles} 0 0 / 150px 150px, #0b0e18`,
    back: `radial-gradient(60% 30% at 70% 26%, rgba(255,214,140,.5) 0 6%, transparent 7%),
      ${rigaSkyline} 50% 100% / 100% 62% no-repeat,
      radial-gradient(1px 1px at 20% 18%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 40% 30%, #fffa 50%, transparent 51%),
      radial-gradient(1px 1px at 85% 12%, #fffa 50%, transparent 51%),
      linear-gradient(180deg, #1c2b55 0%, #2b2a52 45%, #4a2f4a 70%, #0b0e18 100%)`,
  },
  yacht: {
    tone: '#2A1407',
    css: `linear-gradient(118deg, rgba(255,250,230,0) 30%, rgba(255,246,220,.16) 46%, rgba(255,250,230,0) 62%),
      radial-gradient(130% 90% at 50% 42%, rgba(0,0,0,0) 36%, rgba(20,8,0,.62) 100%),
      ${teak} 0 0 / 320px 108px, #8c4f20`,
    back: `linear-gradient(90deg, transparent 0 46%, #e2bd62 46% 48%, transparent 48% 52%, #e2bd62 52% 54%, transparent 54%),
      ${teak} 0 0 / 160px 54px, #8c4f20`,
  },
  aurora: {
    tone: '#04141C',
    css: `radial-gradient(130% 90% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,4,8,.6) 100%), ${auroraSky}`,
    back: auroraSky,
  },
  damask: {
    tone: '#0A0806',
    css: `${VIGNETTE},
      radial-gradient(80% 60% at 50% 40%, rgba(226,189,98,.08), transparent 70%),
      ${damaskBig} 0 0 / 96px 144px,
      radial-gradient(120% 90% at 50% 35%, #1d1812 0%, #110e0a 55%, #060504 100%)`,
    back: `${damaskSmall} 0 0 / 34px 51px, linear-gradient(160deg, #1d1812, #060504)`,
  },
  sakura: {
    tone: '#2A0C1E',
    css: `radial-gradient(130% 90% at 50% 42%, rgba(0,0,0,0) 34%, rgba(20,2,12,.6) 100%),
      ${sakuraBig} 0 0 / 220px 220px,
      radial-gradient(120% 90% at 50% 30%, #6b2a4c 0%, #45173a 50%, #220819 100%)`,
    back: `${sakuraSmall} 0 0 / 90px 90px, linear-gradient(170deg, #7a3358, #3a1030)`,
  },
  carbonrace: {
    tone: '#101113',
    css: `radial-gradient(70% 50% at 50% 115%, rgba(225,30,45,.30), transparent 70%),
      linear-gradient(90deg, transparent 0 7%, rgba(225,30,45,.85) 7% 9.5%, rgba(255,255,255,.75) 9.5% 10.2%, transparent 10.2% 89.8%, rgba(255,255,255,.75) 89.8% 90.5%, rgba(225,30,45,.85) 90.5% 93%, transparent 93%),
      radial-gradient(130% 90% at 50% 42%, rgba(0,0,0,0) 30%, rgba(0,0,0,.66) 100%),
      linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,255,255,.05) 48%, rgba(255,255,255,0) 60%),
      ${carbonWeave}`,
    back: `linear-gradient(90deg, transparent 0 40%, #e11e2d 40% 46%, #fff 46% 48%, #e11e2d 48% 54%, transparent 54%),
      linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(255,255,255,.07) 50%, rgba(255,255,255,0) 66%),
      ${carbon(2.5)}`,
  },
} as const;

/* ============================================================================= CARD BACKS */
const goldDiamonds = (step: number, a = 0.55) => `repeating-linear-gradient(45deg, rgba(232,196,106,${a}) 0 1px, transparent 1px ${step}px), repeating-linear-gradient(-45deg, rgba(232,196,106,${a}) 0 1px, transparent 1px ${step}px)`;

export const BACK_ART: Record<string, string> = {
  bk_onyx: `radial-gradient(circle at 50% 50%, transparent 0 22%, rgba(232,196,106,.7) 22% 23%, transparent 23% 27%, rgba(232,196,106,.45) 27% 27.6%, transparent 28%),
    ${goldDiamonds(10)}, radial-gradient(circle at 50% 45%, #2b2519, #0a0907 72%)`,
  bk_holo: `repeating-linear-gradient(60deg, rgba(255,255,255,.28) 0 1px, transparent 1px 9px), repeating-linear-gradient(-60deg, rgba(255,255,255,.28) 0 1px, transparent 1px 9px),
    radial-gradient(circle at 30% 20%, rgba(255,255,255,.5), transparent 40%),
    linear-gradient(125deg, #ff9bd2 0%, #ffd28a 20%, #9cf5c8 40%, #8ad0ff 60%, #c69bff 80%, #ff9bd2 100%)`,
  bk_dragon: `radial-gradient(circle at 50% 0%, transparent 0 56%, rgba(232,196,106,.55) 58%, rgba(0,0,0,.6) 62%, transparent 70%) 0 0 / 14px 12px,
    radial-gradient(circle at 50% 0%, transparent 0 56%, rgba(232,196,106,.55) 58%, rgba(0,0,0,.6) 62%, transparent 70%) 7px 6px / 14px 12px,
    linear-gradient(160deg, #2a9466 0%, #0f4a33 45%, #06261a 70%, #1d6b4a 100%)`,
  bk_marble: TABLE_ART.marble.back,
  bk_damask: `${damaskSmall} 0 0 / 34px 51px, linear-gradient(160deg, #3a0e1c, #12050a)`,
  bk_aurora: `${auroraSky}`,
  bk_riga: TABLE_ART.oldriga.back,
  bk_deco: `radial-gradient(circle at 50% 100%, transparent 0 7px, #e2bd62 7px 8px, transparent 8px 11px, #e2bd62 11px 12px, transparent 12px 13.5px) 0 0 / 28px 14px,
    radial-gradient(circle at 50% 100%, transparent 0 7px, #e2bd62 7px 8px, transparent 8px 11px, #e2bd62 11px 12px, transparent 12px 13.5px) 14px 7px / 28px 14px,
    linear-gradient(170deg, #17305a, #0a1530)`,
  bk_sakura: TABLE_ART.sakura.back,
  bk_racing: `linear-gradient(115deg, transparent 0 40%, #e11e2d 40% 48%, #fff 48% 50.5%, #e11e2d 50.5% 58.5%, transparent 58.5%),
    conic-gradient(#ececec 25%, #141414 0 50%, #ececec 0 75%, #141414 0) 0 0 / 12px 12px`,
  bk_teak: TABLE_ART.yacht.back,
  bk_studs: TABLE_ART.emvelvet.back,
  bk_tartan: `repeating-linear-gradient(90deg, rgba(170,24,36,.62) 0 7px, transparent 7px 13px, rgba(18,70,48,.55) 13px 24px, transparent 24px 27px, rgba(240,200,90,.4) 27px 28px, transparent 28px 34px),
    repeating-linear-gradient(0deg, rgba(170,24,36,.62) 0 7px, transparent 7px 13px, rgba(18,70,48,.55) 13px 24px, transparent 24px 27px, rgba(240,200,90,.4) 27px 28px, transparent 28px 34px),
    #142a20`,
};

/* ============================================================================= BANNERS (profile header backdrop) */
export const BANNER_ART: Record<string, string> = {
  bn_felt: `radial-gradient(80% 120% at 0% 0%, color-mix(in srgb, var(--acc) 26%, transparent), transparent 60%), linear-gradient(160deg, var(--tone), #050c0a)`,
  bn_bokeh: `radial-gradient(circle at 12% 30%, rgba(255,190,90,.55) 0 10px, rgba(255,190,90,.15) 15px, transparent 17px), radial-gradient(circle at 30% 72%, rgba(255,90,120,.42) 0 15px, rgba(255,90,120,.12) 21px, transparent 23px),
    radial-gradient(circle at 52% 24%, rgba(120,190,255,.38) 0 8px, rgba(120,190,255,.1) 12px, transparent 14px), radial-gradient(circle at 70% 64%, rgba(255,214,140,.48) 0 18px, rgba(255,214,140,.12) 25px, transparent 27px),
    radial-gradient(circle at 88% 30%, rgba(200,120,255,.42) 0 12px, rgba(200,120,255,.12) 17px, transparent 19px), radial-gradient(circle at 96% 80%, rgba(255,150,80,.38) 0 7px, transparent 11px),
    radial-gradient(circle at 42% 52%, rgba(255,240,200,.25) 0 5px, transparent 8px), radial-gradient(circle at 62% 12%, rgba(255,120,160,.3) 0 6px, transparent 9px),
    radial-gradient(120% 120% at 50% 120%, rgba(255,170,80,.18), transparent 60%),
    linear-gradient(160deg, #1a0f24, #0a0710)`,
  bn_sunburst: `radial-gradient(circle at 50% 120%, rgba(255,236,180,.55), transparent 45%),
    repeating-conic-gradient(from 0deg at 50% 120%, rgba(232,196,106,.36) 0 4deg, transparent 4deg 9deg),
    linear-gradient(180deg, #120e07, #050403)`,
  bn_aurora: auroraSky,
  bn_riga: `radial-gradient(40% 50% at 82% 26%, rgba(255,214,140,.55) 0 7%, rgba(255,214,140,.12) 8%, transparent 30%),
    ${rigaSkyline} 50% 100% / auto 96% repeat-x,
    linear-gradient(180deg, #1c2b55 0%, #3a2b55 55%, #6a3a48 100%)`,
  bn_suits: `${svg(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
    <g fill='#e2bd62' fill-opacity='.22'>
    <path d='M16 6 C20 12 26 14 26 19 C26 23 21 24 18 21 L19 26 L13 26 L14 21 C11 24 6 23 6 19 C6 14 12 12 16 6Z'/>
    <path d='M48 38 C44 34 38 35 38 40 C38 45 46 49 48 54 C50 49 58 45 58 40 C58 35 52 34 48 38Z' fill='#d2334f' fill-opacity='.3'/>
    <path d='M48 6 L56 16 L48 26 L40 16Z' fill='#d2334f' fill-opacity='.3'/>
    <path d='M16 38 a4.5 4.5 0 1 1 1 0 a4.5 4.5 0 1 1 3 6 a4.5 4.5 0 1 1 -8 0 a4.5 4.5 0 1 1 4 -6Z M15 46 L13 54 L19 54 L17 46Z'/>
    </g></svg>`)} 0 0 / 64px 64px,
    linear-gradient(110deg, rgba(255,255,255,0) 30%, rgba(255,240,200,.12) 50%, rgba(255,255,255,0) 70%),
    radial-gradient(120% 140% at 0% 0%, #2a1a40, #0c0814 70%)`,
};
