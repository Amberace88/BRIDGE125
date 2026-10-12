import { useId, type ReactNode } from 'react';
import type { Lang } from '../i18n';
import '../styles/lang.css';

/**
 * Inline SVG country flags for the UI languages (emoji flags don't render on Windows).
 * Each flag is drawn in its own official proportions and cropped (`slice`) into a 3:2 rounded
 * rectangle or a circle; `align` keeps hoist-side emblems (Belarus, Uzbekistan) in view.
 * A CSS overlay (.flag::after in styles/lang.css) adds the hairline border and sheen.
 */

type Align = 'xMinYMid' | 'xMidYMid';
interface Def { country: string; vb: string; align?: Align; body: (id: string) => ReactNode }

/** 5-point star path. */
function star(cx: number, cy: number, r: number, inner = 0.382) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * inner : r;
    d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }
  return `${d}Z`;
}
/** n-point star polygon (for Azerbaijan's 8-point star and the Kazakh sun rays). */
function nstar(cx: number, cy: number, n: number, ro: number, ri: number, rot = -Math.PI / 2) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, rr = i % 2 ? ri : ro;
    d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }
  return `${d}Z`;
}

const hstripes = (w: number, colors: [string, number][]) => {
  let y = 0;
  return colors.map(([c, h], i) => { const r = <rect key={i} y={y} width={w} height={h} fill={c} />; y += h; return r; });
};

// Uzbekistan: 12 stars in rows of 3, 4, 5 next to the crescent.
const UZ_STARS = [[3, 20], [4, 42], [5, 64]].map(([n, y]) => Array.from({ length: n }, (_, i) => star(176 - i * 21, y, 7.5)).join('')).join('');
// Georgia: four bolnur-katskhuri crosses (simplified cross pattée).
const PATTEE = 'M-3.2 0Q-4 -13 -11 -22L11 -22Q4 -13 3.2 0Z';
const GE_CROSS = (cx: number, cy: number) => (
  <g key={`${cx}${cy}`} transform={`translate(${cx} ${cy})`} fill="#DA291C">
    {[0, 90, 180, 270].map(r => <path key={r} d={PATTEE} transform={`rotate(${r})`} />)}
  </g>
);
// Belarus: hoist ornament — a column of red rhombi on white (simplified rushnyk pattern).
const BY_ORN = Array.from({ length: 4 }, (_, i) => {
  const c = 5.625 + i * 11.25;
  return `M5 ${c - 5.2}L9.2 ${c}L5 ${c + 5.2}L0.8 ${c}ZM5 ${c - 2}L3 ${c}L5 ${c + 2}L7 ${c}Z`;
}).join('');
const BY_TICKS = Array.from({ length: 5 }, (_, i) => { const y = i * 11.25; return `M0 ${y - 1.6}L1.6 ${y}L0 ${y + 1.6}ZM10 ${y - 1.6}L8.4 ${y}L10 ${y + 1.6}Z`; }).join('');
// Kazakhstan (3:2 adaptation): 32-ray sun, steppe eagle, gold ornament at the hoist.
const KZ_RAYS = nstar(240, 118, 32, 74, 52);
const KZ_ORN = Array.from({ length: 9 }, (_, i) => {
  const y = 17 + i * 33;
  return `M36 ${y - 12}C46 ${y - 12} 46 ${y} 36 ${y}C26 ${y} 26 ${y + 12} 36 ${y + 12}M36 ${y}H22M36 ${y}H50`;
}).join('');

const FLAGS: Record<Lang, Def> = {
  en: {
    country: 'United Kingdom', vb: '0 0 60 30',
    body: id => (
      <>
        <clipPath id={`${id}t`}><path d="M30 15h30v15zv15H0zH0V0zV0h30z" /></clipPath>
        <rect width="60" height="30" fill="#012169" />
        <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
        <path d="M0 0l60 30m0-30L0 30" clipPath={`url(#${id}t)`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
        <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
      </>
    ),
  },
  lv: { country: 'Latvia', vb: '0 0 20 10', body: () => <><rect width="20" height="10" fill="#9E3039" /><rect y="4" width="20" height="2" fill="#fff" /></> },
  ru: { country: 'Russia', vb: '0 0 9 6', body: () => <>{hstripes(9, [['#fff', 2], ['#0039A6', 2], ['#D52B1E', 2]])}</> },
  uk: { country: 'Ukraine', vb: '0 0 3 2', body: () => <>{hstripes(3, [['#0057B7', 1], ['#FFD700', 1]])}</> },
  lt: { country: 'Lithuania', vb: '0 0 5 3', body: () => <>{hstripes(5, [['#FDB913', 1], ['#006A44', 1], ['#C1272D', 1]])}</> },
  et: { country: 'Estonia', vb: '0 0 33 21', body: () => <>{hstripes(33, [['#0072CE', 7], ['#000', 7], ['#fff', 7]])}</> },
  pl: { country: 'Poland', vb: '0 0 8 5', body: () => <>{hstripes(8, [['#fff', 2.5], ['#DC143C', 2.5]])}</> },
  de: { country: 'Germany', vb: '0 0 5 3', body: () => <>{hstripes(5, [['#000', 1], ['#DD0000', 1], ['#FFCE00', 1]])}</> },
  be: {
    country: 'Belarus', vb: '0 0 90 45', align: 'xMinYMid',
    body: () => (
      <>
        <rect width="90" height="30" fill="#C8313E" /><rect y="30" width="90" height="15" fill="#4AA657" />
        <rect width="10" height="45" fill="#fff" /><path d={BY_ORN + BY_TICKS} fill="#C8313E" />
      </>
    ),
  },
  kk: {
    country: 'Kazakhstan', vb: '0 0 450 300',
    body: () => (
      <>
        <rect width="450" height="300" fill="#00AFCA" />
        <path d={KZ_ORN} fill="none" stroke="#FEC50C" strokeWidth="5" strokeLinecap="round" />
        <path d={KZ_RAYS} fill="#FEC50C" />
        <circle cx="240" cy="118" r="44" fill="#FEC50C" />
        <path d="M150 214C186 196 212 204 240 226C268 204 294 196 330 214C298 214 270 222 248 246L240 254L232 246C210 222 182 214 150 214Z" fill="#FEC50C" />
      </>
    ),
  },
  uz: {
    country: 'Uzbekistan', vb: '0 0 500 250', align: 'xMinYMid',
    body: () => (
      <>
        {hstripes(500, [['#0099B5', 85], ['#CE1126', 5.7], ['#fff', 68.6], ['#CE1126', 5.7], ['#1EB53A', 85]])}
        <circle cx="62" cy="42" r="30" fill="#fff" /><circle cx="73" cy="42" r="28" fill="#0099B5" />
        <path d={UZ_STARS} fill="#fff" />
      </>
    ),
  },
  az: {
    country: 'Azerbaijan', vb: '0 0 1200 600',
    body: () => (
      <>
        {hstripes(1200, [['#00B5E2', 200], ['#EF3340', 200], ['#509E2F', 200]])}
        <circle cx="570" cy="300" r="90" fill="#fff" /><circle cx="592" cy="300" r="75" fill="#EF3340" />
        <path d={nstar(665, 300, 8, 50, 22, 0)} fill="#fff" />
      </>
    ),
  },
  ka: {
    country: 'Georgia', vb: '0 0 300 200',
    body: () => (
      <>
        <rect width="300" height="200" fill="#fff" />
        <path d="M132 0h36v200h-36zM0 82h300v36H0z" fill="#DA291C" />
        {GE_CROSS(66, 41)}{GE_CROSS(234, 41)}{GE_CROSS(66, 159)}{GE_CROSS(234, 159)}
      </>
    ),
  },
  hy: { country: 'Armenia', vb: '0 0 6 3', body: () => <>{hstripes(6, [['#D90012', 1], ['#0033A0', 1], ['#F2A800', 1]])}</> },
  ro: { country: 'Romania', vb: '0 0 3 2', body: () => <><rect width="1" height="2" fill="#002B7F" /><rect x="1" width="1" height="2" fill="#FCD116" /><rect x="2" width="1" height="2" fill="#CE1126" /></> },
  bg: { country: 'Bulgaria', vb: '0 0 5 3', body: () => <>{hstripes(5, [['#fff', 1], ['#00966E', 1], ['#D62612', 1]])}</> },
  es: {
    country: 'Spain', vb: '0 0 750 500',
    body: () => (
      <>
        {hstripes(750, [['#AA151B', 125], ['#F1BF00', 250], ['#AA151B', 125]])}
        {/* simplified emblem: Pillars of Hercules, crowned shield */}
        <g>
          <rect x="176" y="196" width="18" height="104" rx="2" fill="#C7C7C7" /><rect x="170" y="188" width="30" height="10" rx="2" fill="#AD1519" /><rect x="170" y="298" width="30" height="10" rx="2" fill="#AD1519" />
          <rect x="306" y="196" width="18" height="104" rx="2" fill="#C7C7C7" /><rect x="300" y="188" width="30" height="10" rx="2" fill="#AD1519" /><rect x="300" y="298" width="30" height="10" rx="2" fill="#AD1519" />
          <path d="M210 186h80v74a40 40 0 0 1-80 0z" fill="#AD1519" />
          <path d="M250 186h40v74a40 40 0 0 1-40 40z" fill="#E8B100" opacity=".9" />
          <path d="M210 186h80v74a40 40 0 0 1-80 0z" fill="none" stroke="#7a0e12" strokeWidth="4" />
          <path d="M214 178l-6-28 22 14 20-24 20 24 22-14-6 28z" fill="#C8A200" stroke="#7a5d00" strokeWidth="3" strokeLinejoin="round" />
        </g>
      </>
    ),
  },
};


export interface FlagProps {
  lang: Lang;
  /** Height in px. A rectangle is 1.5× as wide; a circle is size × size. */
  size?: number;
  shape?: 'rect' | 'circle';
  className?: string;
  /** Accessible label; omit for decorative use next to a visible language name. */
  title?: string;
}

export function Flag({ lang, size = 16, shape = 'rect', className = '', title }: FlagProps) {
  const id = useId().replace(/:/g, '');
  const f = FLAGS[lang] ?? FLAGS.en;
  const w = shape === 'circle' ? size : Math.round(size * 1.5);
  return (
    <span className={`flag ${shape === 'circle' ? 'circle' : ''} ${className}`} style={{ width: w, height: size }}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} data-flag={lang} data-country={f.country}>
      <svg viewBox={f.vb} preserveAspectRatio={`${f.align ?? 'xMidYMid'} slice`} width={w} height={size} focusable="false">
        {f.body(`f${id}`)}
      </svg>
    </span>
  );
}
