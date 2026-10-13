/**
 * Journey artwork — all vector, no assets: Art-Deco cameo portraits, city skylines, the engraved night map of Europe,
 * stars and the little house-rule illustrations.
 */
import { memo, useId, type CSSProperties, type ReactNode } from 'react';
import type { Character, ChapterId, Silhouette, TwistId } from './data';
import { CHAPTERS } from './data';
import { CardFace } from '../components/CardView';
import type { Card } from '../engine/engine';
import type { Lang } from '../i18n';

/* ================================================================================== small utils */

/** Deterministic PRNG (mulberry32). */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mix two #rrggbb colours (t = share of b). */
export function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), Bc = p(b);
  return '#' + A.map((v, i) => Math.round(v + (Bc[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

export const ROMAN =['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/* ================================================================================== cameo */

// profile busts facing right, drawn in a 100×120 box (bust bottom at y = 120)
const BUST_M = 'M30 120C30 104 38 97 50 94C47 88 44 82 43 74C36 70 33 60 34 50C35 34 47 24 60 24C74 24 84 33 85 46C86 50 86 53 88 57C90 61 92 64 93 67C91 69 89 70 87 70C88 72 88 74 86 75C87 77 86 79 84 80C84 83 83 86 80 88C76 90 71 90 68 89C67 92 67 95 69 98C80 101 92 106 96 120Z';
const BUST_F = 'M33 120C34 106 43 99 53 96C50 90 48 84 47 76C40 71 37 61 38 51C39 36 50 26 62 26C74 26 83 35 84 47C85 51 85 54 87 58C89 61 90 64 91 66C89 68 87 68 86 68.5C87 70.5 87 72 85.5 73C86.5 75 85.5 77 83.5 78C83.5 81 82 84 78.5 85.5C75 87 71 87 68.5 86C68 90 69 94 71.5 98C82 101 92 107 95 120Z';

const HEAD: Record<NonNullable<Silhouette['head']>, (f: boolean) => ReactNode> = {
  tophat: () => (<g className="hw"><path d="M43 28L45 3Q61 0 77 3L79 28Z" /><path className="band" d="M43.6 21L78.4 21L78.9 27L43.1 27Z" /><ellipse cx="61" cy="28.5" rx="30" ry="4.2" /></g>),
  bowler: () => (<g className="hw"><path d="M37 34C36 13 85 12 85 33Z" /><path className="band" d="M37.2 29.5L84.8 29.2L85 33.6L37 34Z" /><ellipse cx="61" cy="34" rx="29" ry="3.6" /></g>),
  cap: () => (<g className="hw"><path d="M37 37C36 22 79 19 83 32L83 37Z" /><path className="band" d="M37.2 31.5L83 31.5L83 37L37 37Z" /><path d="M79 34Q92 35 97 40Q86 42 76 38Z" /><circle className="band" cx="66" cy="27" r="2.2" /></g>),
  veil: () => (<g className="hw"><path d="M50 30C49 21 62 15 76 19C80 21 81 26 80 30Z" /><path d="M52 23C40 10 30 12 22 20C33 15 42 18 50 26Z" className="feather" /><path className="net" d="M58 30L92 66M64 30L93 58M70 30L92 50M76 31L90 44M56 36L90 38M56 44L92 46M58 52L93 56" /><circle className="band" cx="77" cy="24" r="2.5" /></g>),
  tiara: f => (<g className="hw">{f && <><path d="M38 47C36 33 48 25 60 25C50 28 43 36 42 48Z" className="hair" /><circle cx="40" cy="44" r="9.5" className="hair" /></>}<path className="band" d="M45 29L49 20L53 27L58 15L63 26L68 19L72 30L69 31L58 28.5L47 31Z" /><circle className="gem" cx="58" cy="17.5" r="1.8" /><circle className="gem" cx="49" cy="22" r="1.1" /><circle className="gem" cx="68" cy="21" r="1.1" /></g>),
  bun: () => (<g className="hw"><circle cx="38" cy="42" r="10" className="hair" /><path d="M37 52C36 35 48 26 62 26C72 26 80 31 83 40C74 33 60 32 48 38C43 41 40 46 41 54Z" className="hair" /><path className="band" d="M33 37Q38 33 44 36" fill="none" /></g>),
  curls: () => (<g className="hw back"><path d="M61 22C42 20 29 35 30 55C31 69 25 80 29 92C33 101 42 100 47 93C44 85 46 78 47 72C40 64 40 50 46 41C51 33 60 31 70 32C76 33 81 36 84 40C80 29 72 22 61 22Z" className="hair" /><path className="curl" d="M33 64C30 70 35 72 33 78M31 84C30 89 35 90 34 95M38 52C35 57 39 60 37 64" fill="none" /></g>),
  wild: () => (<g className="hw back"><path d="M33 55C24 50 27 42 31 38C24 32 30 24 37 25C35 17 45 13 51 18C53 10 64 10 67 17C73 12 83 16 82 24C89 25 91 33 86 38C80 33 72 31 62 31C50 31 40 39 38 52Z" className="hair" /></g>),
  short: () => (<g className="hw"><path d="M36 50C34 33 47 24 60 24C72 24 82 31 85 43C79 36 69 32 58 33C48 34 41 41 40 51Z" className="hair" /></g>),
};

const ACC: Record<NonNullable<Silhouette['acc']>, (f: boolean) => ReactNode> = {
  monocle: () => (<g className="acc"><circle cx="81.5" cy="56" r="5.2" className="lens" /><path d="M79 61C76 74 72 86 70 99" className="chain" fill="none" /></g>),
  beard: () => (<path className="beardp" d="M66 79C72 80 80 81 86 77C87 84 84 92 76 95C68 97 61 91 60 84C61 81 63 79 66 79Z" />),
  moustache: () => (<path className="beardp" d="M80.5 71C84 69.5 88.5 70 90 72.5C86.5 73.5 83 73.2 80 72.5Z" />),
  bowtie: f => (<g className="acc tie" transform={f ? 'translate(1 0)' : undefined}><path d="M64 101L72 97L72 105Z" /><path d="M80 101L72 97L72 105Z" /><circle cx="72" cy="101" r="1.8" /></g>),
  pearls: () => (<g className="acc pearls">{[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => { const t = i / 8; const x = 52 + t * 26; const y = 98.5 + Math.sin(t * Math.PI) * 4; return <circle key={i} cx={x} cy={y} r="1.5" />; })}</g>),
};

function Bust({ sil, uid }: { sil: Silhouette; uid: string }) {
  const f = sil.base === 'f';
  const head = sil.head ? HEAD[sil.head] : null;
  const back = sil.head === 'curls' || sil.head === 'wild';
  return (
    <g className="bust" style={{ ['--ivory-grad' as string]: `url(#${uid}-iv)` }}>
      {back && head?.(f)}
      <path d={f ? BUST_F : BUST_M} className="skin" fill={`url(#${uid}-iv)`} />
      {!back && head?.(f)}
      {sil.acc && ACC[sil.acc](f)}
    </g>
  );
}

/**
 * An Art-Deco cameo: brass oval frame with sunburst, a carved ivory profile on a tinted ground and a monogram plaque.
 * `boss` adds laurels and a warm halo; `locked` renders it as a dark silhouette.
 */
export const Cameo = memo(function Cameo({ c, size = 96, boss = false, locked = false, className = '', style }: {
  c: Character; size?: number; boss?: boolean; locked?: boolean; className?: string; style?: CSSProperties;
}) {
  const raw = useId().replace(/:/g, '');
  const uid = 'cm' + raw;
  const rays = Array.from({ length: 36 }, (_, i) => i * 10);
  return (
    <svg className={`cameo ${boss ? 'boss' : ''} ${locked ? 'locked' : ''} ${className}`} style={style} width={size} height={size * 1.25} viewBox="0 0 120 150" aria-hidden>
      <defs>
        <radialGradient id={`${uid}-bg`} cx="0.5" cy="0.38" r="0.75">
          <stop offset="0" stopColor={mixHex(c.tint, '#f3dfae', 0.32)} />
          <stop offset="0.55" stopColor={c.tint} />
          <stop offset="1" stopColor="#050a08" />
        </radialGradient>
        <linearGradient id={`${uid}-iv`} x1="0.15" y1="0" x2="0.95" y2="0.9">
          <stop offset="0" stopColor="#b7a27a" />
          <stop offset="0.45" stopColor="#efe3c6" />
          <stop offset="0.8" stopColor="#fbf5e6" />
          <stop offset="1" stopColor="#d9c8a2" />
        </linearGradient>
        <linearGradient id={`${uid}-br`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff2c4" />
          <stop offset="0.3" stopColor="#d9b25c" />
          <stop offset="0.55" stopColor="#8a6420" />
          <stop offset="0.78" stopColor="#e9c977" />
          <stop offset="1" stopColor="#6f4f16" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}><ellipse cx="60" cy="70" rx="43" ry="55" /></clipPath>
        <filter id={`${uid}-relief`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="-1.2" dy="1.6" stdDeviation="1.2" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>
      {boss && (
        <g className="laurel" fill={`url(#${uid}-br)`}>
          {[-1, 1].map(s => (
            <g key={s} transform={`translate(60 0) scale(${s} 1) translate(-60 0)`}>
              {[0, 1, 2, 3, 4, 5].map(i => {
                const a = (200 - i * 17) * Math.PI / 180;
                const x = 60 + Math.cos(a) * 57, y = 76 - Math.sin(a) * 67;
                return <ellipse key={i} cx={x} cy={y} rx="3.2" ry="7.5" transform={`rotate(${-(200 - i * 17) + 90 - 25} ${x} ${y})`} />;
              })}
            </g>
          ))}
        </g>
      )}
      <ellipse cx="60" cy="70" rx="51" ry="63" fill="#050806" />
      <ellipse cx="60" cy="70" rx="49.5" ry="61.5" fill="none" stroke={`url(#${uid}-br)`} strokeWidth="5" />
      <ellipse cx="60" cy="70" rx="45.5" ry="57.5" fill={`url(#${uid}-bg)`} />
      <g clipPath={`url(#${uid}-clip)`}>
        <g className="rays" stroke="#f3dc9a" strokeOpacity="0.09" strokeWidth="1.1">
          {rays.map(a => <line key={a} x1="60" y1="58" x2={60 + Math.cos(a * Math.PI / 180) * 90} y2={58 + Math.sin(a * Math.PI / 180) * 90} />)}
        </g>
        <ellipse cx="60" cy="52" rx="34" ry="30" fill="#fff6d8" opacity="0.07" />
        <g filter={`url(#${uid}-relief)`} transform={c.sil.double ? undefined : 'translate(8 13) scale(0.92)'}>
          {c.sil.double ? (
            <>
              <g transform="translate(-6 18) scale(0.82)" opacity="0.72"><Bust sil={c.sil} uid={uid} /></g>
              <g transform="translate(22 22) scale(0.86)"><Bust sil={c.sil} uid={uid} /></g>
            </>
          ) : <Bust sil={c.sil} uid={uid} />}
        </g>
      </g>
      <ellipse cx="60" cy="70" rx="45.5" ry="57.5" fill="none" stroke="#000" strokeOpacity="0.55" strokeWidth="1.2" />
      <ellipse cx="60" cy="70" rx="53.6" ry="65.6" fill="none" stroke={`url(#${uid}-br)`} strokeWidth="1" opacity="0.7" />
      {/* deco fan crest */}
      <g transform="translate(60 7)">
        <path d="M-13 3A13 13 0 0 1 13 3Z" fill={`url(#${uid}-br)`} />
        {[-60, -30, 0, 30, 60].map(a => <line key={a} x1="0" y1="3" x2={Math.sin(a * Math.PI / 180) * 11} y2={3 - Math.cos(a * Math.PI / 180) * 11} stroke="#3b2a08" strokeWidth="0.9" />)}
        <circle cx="0" cy="3" r="2.4" fill="#3b2a08" />
      </g>
      {/* monogram plaque */}
      <g transform="translate(60 136)">
        <path d="M-22 -8H22L27 0L22 8H-22L-27 0Z" fill="#0a0f0c" stroke={`url(#${uid}-br)`} strokeWidth="1.6" />
        <text x="0" y="4.2" textAnchor="middle" className="mono">{c.mono}</text>
      </g>
      {locked && (
        <g className="lockmark" transform="translate(60 70)">
          <circle r="15" fill="rgba(0,0,0,.6)" stroke={`url(#${uid}-br)`} strokeWidth="1.4" />
          <rect x="-6" y="-2" width="12" height="9" rx="1.6" fill="#d9b25c" />
          <path d="M-4 -2V-5A4 4 0 0 1 4 -5V-2" fill="none" stroke="#d9b25c" strokeWidth="1.8" />
        </g>
      )}
    </svg>
  );
});

/* ================================================================================== stars */

export function StarIcon({ on, size = 18, className = '' }: { on: boolean; size?: number; className?: string }) {
  return (
    <svg className={`jstar ${on ? 'on' : ''} ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 1.8l2.9 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.3 5.7 21l1.6-7.1L1.9 9.1l7.2-.7z" />
    </svg>
  );
}

export function StarRow({ n, size = 16, className = '' }: { n: number; size?: number; className?: string }) {
  return (
    <span className={`jstars ${className}`} aria-label={`${n} / 3`}>
      {[0, 1, 2].map(i => <StarIcon key={i} on={i < n} size={size} />)}
    </span>
  );
}

/* ================================================================================== skylines */

type Part =
  | { t: 'b'; x: number; w: number; h: number }               // block
  | { t: 'g'; x: number; w: number; h: number }               // gabled house (stepped gable)
  | { t: 's'; x: number; w: number; h: number; sp: number }   // tower + spire
  | { t: 'd'; x: number; w: number; h: number }               // tower + round dome + lantern
  | { t: 'o'; x: number; w: number; h: number }               // tower + onion dome
  | { t: 't'; x: number; w: number; h: number }               // crenellated tower
  | { t: 'w'; x: number; r: number }                           // ferris wheel
  | { t: 'hill'; x: number; w: number; h: number }            // hill
  | { t: 'step'; x: number; w: number; h: number; sp: number }; // stepped high-rise with spire

const SKY: Record<ChapterId, Part[]> = {
  riga: [
    { t: 'g', x: 8, w: 26, h: 34 }, { t: 'g', x: 34, w: 20, h: 40 }, { t: 'b', x: 54, w: 30, h: 26 },
    { t: 's', x: 86, w: 18, h: 62, sp: 68 }, { t: 'g', x: 106, w: 22, h: 36 }, { t: 'g', x: 128, w: 18, h: 44 }, { t: 'g', x: 146, w: 24, h: 30 },
    { t: 'd', x: 176, w: 22, h: 52 }, { t: 'b', x: 200, w: 40, h: 28 }, { t: 's', x: 244, w: 14, h: 50, sp: 46 },
    { t: 'g', x: 260, w: 24, h: 38 }, { t: 'b', x: 286, w: 34, h: 24 }, { t: 's', x: 324, w: 16, h: 44, sp: 34 }, { t: 'g', x: 342, w: 26, h: 32 }, { t: 'b', x: 368, w: 32, h: 22 },
  ],
  tallinn: [
    { t: 'b', x: 0, w: 60, h: 16 }, { t: 't', x: 18, w: 16, h: 42 }, { t: 'g', x: 40, w: 22, h: 34 }, { t: 's', x: 66, w: 16, h: 58, sp: 74 },
    { t: 'b', x: 84, w: 44, h: 20 }, { t: 't', x: 104, w: 18, h: 50 }, { t: 'g', x: 126, w: 22, h: 30 }, { t: 'd', x: 150, w: 18, h: 40 },
    { t: 'b', x: 170, w: 50, h: 18 }, { t: 't', x: 196, w: 26, h: 36 }, { t: 's', x: 232, w: 14, h: 44, sp: 40 }, { t: 'g', x: 250, w: 24, h: 34 },
    { t: 't', x: 284, w: 16, h: 46 }, { t: 'b', x: 300, w: 60, h: 18 }, { t: 's', x: 344, w: 14, h: 40, sp: 30 }, { t: 'g', x: 362, w: 30, h: 28 },
  ],
  vilnius: [
    { t: 'hill', x: 0, w: 110, h: 30 }, { t: 't', x: 44, w: 16, h: 52 }, { t: 'b', x: 104, w: 40, h: 24 }, { t: 'd', x: 120, w: 16, h: 48 },
    { t: 'd', x: 150, w: 20, h: 58 }, { t: 'b', x: 172, w: 36, h: 30 }, { t: 's', x: 212, w: 16, h: 56, sp: 30 }, { t: 'd', x: 236, w: 16, h: 46 },
    { t: 'b', x: 256, w: 40, h: 26 }, { t: 'd', x: 300, w: 22, h: 50 }, { t: 'g', x: 326, w: 24, h: 32 }, { t: 'b', x: 350, w: 50, h: 22 },
  ],
  warsaw: [
    { t: 'g', x: 0, w: 22, h: 36 }, { t: 'g', x: 22, w: 20, h: 42 }, { t: 'g', x: 42, w: 22, h: 34 }, { t: 's', x: 70, w: 18, h: 56, sp: 26 },
    { t: 'b', x: 92, w: 40, h: 28 }, { t: 'b', x: 140, w: 30, h: 40 }, { t: 'step', x: 176, w: 56, h: 92, sp: 34 }, { t: 'b', x: 236, w: 30, h: 46 },
    { t: 'b', x: 270, w: 26, h: 30 }, { t: 'd', x: 300, w: 22, h: 44 }, { t: 'b', x: 326, w: 44, h: 26 }, { t: 's', x: 372, w: 14, h: 42, sp: 24 },
  ],
  kyiv: [
    { t: 'hill', x: 0, w: 160, h: 22 }, { t: 'o', x: 20, w: 18, h: 44 }, { t: 'o', x: 42, w: 24, h: 56 }, { t: 'o', x: 70, w: 18, h: 44 },
    { t: 's', x: 100, w: 18, h: 74, sp: 30 }, { t: 'b', x: 124, w: 36, h: 26 }, { t: 't', x: 166, w: 40, h: 34 }, { t: 'b', x: 210, w: 40, h: 30 },
    { t: 'o', x: 256, w: 22, h: 52 }, { t: 'b', x: 282, w: 36, h: 24 }, { t: 'o', x: 322, w: 16, h: 40 }, { t: 'b', x: 342, w: 58, h: 28 },
  ],
  tbilisi: [
    { t: 'hill', x: 0, w: 200, h: 52 }, { t: 't', x: 40, w: 22, h: 72 }, { t: 'b', x: 64, w: 34, h: 60 }, { t: 't', x: 104, w: 14, h: 66 },
    { t: 'd', x: 160, w: 22, h: 40 }, { t: 'b', x: 186, w: 40, h: 26 }, { t: 'd', x: 230, w: 18, h: 36 }, { t: 'b', x: 250, w: 34, h: 30 },
    { t: 's', x: 290, w: 14, h: 52, sp: 26 }, { t: 'b', x: 308, w: 42, h: 24 }, { t: 'd', x: 354, w: 18, h: 34 }, { t: 'b', x: 374, w: 26, h: 20 },
  ],
  vienna: [
    { t: 'b', x: 0, w: 46, h: 30 }, { t: 'd', x: 50, w: 30, h: 50 }, { t: 'b', x: 84, w: 40, h: 34 }, { t: 's', x: 130, w: 22, h: 70, sp: 72 },
    { t: 'b', x: 156, w: 44, h: 32 }, { t: 'd', x: 204, w: 22, h: 44 }, { t: 'b', x: 228, w: 36, h: 28 }, { t: 'w', x: 312, r: 44 },
    { t: 'b', x: 264, w: 20, h: 22 }, { t: 'b', x: 360, w: 40, h: 24 },
  ],
  montecarlo: [
    { t: 'hill', x: 0, w: 400, h: 34 }, { t: 'b', x: 20, w: 34, h: 54 }, { t: 'b', x: 56, w: 26, h: 70 }, { t: 'b', x: 86, w: 30, h: 48 },
    { t: 's', x: 130, w: 14, h: 52, sp: 20 }, { t: 'd', x: 150, w: 44, h: 46 }, { t: 's', x: 200, w: 14, h: 52, sp: 20 }, { t: 'b', x: 222, w: 40, h: 36 },
    { t: 'b', x: 266, w: 26, h: 62 }, { t: 'b', x: 296, w: 34, h: 44 }, { t: 'd', x: 336, w: 22, h: 40 }, { t: 'b', x: 362, w: 38, h: 30 },
  ],
};

function partPath(p: Part, B: number): string {
  switch (p.t) {
    case 'b': return `M${p.x} ${B}V${B - p.h}H${p.x + p.w}V${B}Z`;
    case 'g': {
      const top = B - p.h, s = p.w / 6, x = p.x;
      return `M${x} ${B}V${top}H${x + s}V${top - s}H${x + 2 * s}V${top - 2 * s}H${x + 2.5 * s}L${x + 3 * s} ${top - 3.2 * s}L${x + 3.5 * s} ${top - 2 * s}H${x + 4 * s}V${top - s}H${x + 5 * s}V${top}H${x + p.w}V${B}Z`;
    }
    case 's': {
      const top = B - p.h, m = p.x + p.w / 2;
      return `M${p.x} ${B}V${top}H${p.x + p.w * 0.12}L${m} ${top - p.sp}L${p.x + p.w * 0.88} ${top}H${p.x + p.w}V${B}Z`;
    }
    case 'd': {
      const top = B - p.h, m = p.x + p.w / 2, r = p.w / 2;
      return `M${p.x} ${B}V${top}A${r} ${r * 1.1} 0 0 1 ${p.x + p.w} ${top}V${B}Z M${m - 1.6} ${top - r * 1.1 + 1}V${top - r * 1.1 - 9}H${m + 1.6}V${top - r * 1.1 + 1}Z`;
    }
    case 'o': {
      const top = B - p.h, m = p.x + p.w / 2, w = p.w;
      return `M${p.x} ${B}V${top}C${p.x - w * 0.1} ${top - w * 0.45} ${m - w * 0.05} ${top - w * 0.7} ${m} ${top - w * 1.05}C${m + w * 0.05} ${top - w * 0.7} ${p.x + w * 1.1} ${top - w * 0.45} ${p.x + w} ${top}V${B}Z M${m - 0.8} ${top - w * 1.0}V${top - w * 1.0 - 8}H${m + 0.8}V${top - w * 1.0}Z`;
    }
    case 't': {
      const top = B - p.h, n = Math.max(2, Math.round(p.w / 6)), cw = p.w / (n * 2 - 1);
      let d = `M${p.x} ${B}V${top}`;
      for (let i = 0; i < n * 2 - 1; i++) { const x = p.x + (i + 1) * cw; d += i % 2 === 0 ? `V${top - 5}H${x}V${top}` : `H${x}`; }
      return d + `V${B}Z`;
    }
    case 'hill': return `M${p.x} ${B}C${p.x + p.w * 0.25} ${B - p.h * 1.3} ${p.x + p.w * 0.6} ${B - p.h * 1.1} ${p.x + p.w} ${B}Z`;
    case 'step': {
      const top = B - p.h, m = p.x + p.w / 2;
      return `M${p.x} ${B}V${top + 40}H${p.x + p.w * 0.14}V${top + 18}H${p.x + p.w * 0.28}V${top}H${p.x + p.w * 0.42}V${top - 12}H${m - 2}L${m} ${top - 12 - p.sp}L${m + 2} ${top - 12}H${p.x + p.w * 0.58}V${top}H${p.x + p.w * 0.72}V${top + 18}H${p.x + p.w * 0.86}V${top + 40}H${p.x + p.w}V${B}Z`;
    }
    case 'w': return '';
  }
}

/** City skyline, 400×110 units, baseline at 110. `layer="far"` draws a dimmer, flattened copy. */
export const Skyline = memo(function Skyline({ city, layer = 'near', className = '', lit = 0.22, tile = false }: { city: ChapterId; layer?: 'near' | 'far'; className?: string; lit?: number; tile?: boolean }) {
  const B = 110;
  const parts = SKY[city];
  const r = prng(city.length * 977 + (layer === 'far' ? 5 : 1));
  const windows: { x: number; y: number; w: number; h: number }[] = [];
  if (layer === 'near') {
    for (const p of parts) {
      if (p.t === 'w' || p.t === 'hill') continue;
      const h = 'h' in p ? p.h : 0;
      const w = 'w' in p ? p.w : 0;
      for (let y = B - h + 7; y < B - 6; y += 7) for (let x = p.x + 3; x < p.x + w - 4; x += 6) if (r() < lit) windows.push({ x, y, w: 2.2, h: 3.2 });
    }
  }
  const wheel = parts.find((p): p is Extract<Part, { t: 'w' }> => p.t === 'w');
  const uid = 'sk' + useId().replace(/:/g, '');
  const d = parts.map(p => partPath(p, B)).join(' ');
  return (
    <svg className={`skyline ${layer} ${className}`} viewBox={tile ? '-400 0 1200 110' : '0 0 400 110'} preserveAspectRatio="xMidYMax slice" aria-hidden>
      {tile && <use href={`#${uid}`} transform="translate(0 0) scale(-1 1)" />}
      {tile && <use href={`#${uid}`} transform="translate(800 0) scale(-1 1)" />}
      <g id={uid} transform={layer === 'far' ? 'translate(400 0) scale(-1 1) translate(0 10)' : undefined}>
        <path d={d} className="mass" />
        {wheel && (
          <g className="wheel" transform={`translate(${wheel.x} ${B - wheel.r - 8})`}>
            <circle r={wheel.r} fill="none" strokeWidth="2.2" />
            <circle r={wheel.r * 0.2} fill="none" strokeWidth="1.4" />
            {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <line key={i} x1={0} y1={0} x2={Math.cos(a) * wheel.r} y2={Math.sin(a) * wheel.r} strokeWidth="0.8" />; })}
            {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2 + 0.26; return <rect key={i} x={Math.cos(a) * wheel.r - 2.5} y={Math.sin(a) * wheel.r - 2} width="5" height="4" rx="1" className="cabin" />; })}
            <path d={`M-14 ${wheel.r + 8}L0 0L14 ${wheel.r + 8}`} fill="none" strokeWidth="2.4" />
          </g>
        )}
        {windows.map((w, i) => <rect key={i} className="win" x={w.x} y={w.y} width={w.w} height={w.h} style={{ animationDelay: `${(i * 0.37) % 6}s` }} />)}
      </g>
    </svg>
  );
});

/* ================================================================================== the night map of Europe */

export const MAP = { lon0: 3.6, lon1: 48.6, lat0: 40, lat1: 61.5, k: 40, cos: Math.cos(51 * Math.PI / 180) };
export const MAP_W = Math.round((MAP.lon1 - MAP.lon0) * MAP.cos * MAP.k);
export const MAP_H = Math.round((MAP.lat1 - MAP.lat0) * MAP.k);
export const project = (lon: number, lat: number): [number, number] => [(lon - MAP.lon0) * MAP.cos * MAP.k, (MAP.lat1 - lat) * MAP.k];

type LL = [number, number];
// simplified coastlines (lon, lat) — seas are filled polygons
const SEAS: LL[][] = [
  // North Sea + Kattegat + Baltic (Scandinavia carved out)
  [[4, 51.6], [4, 52.2], [4.7, 52.9], [5.5, 53.4], [7, 53.6], [8.5, 53.6], [8.9, 54.1], [8.6, 55.4], [8.1, 56.5], [8.6, 57.1], [9.9, 57.6], [10.6, 57.75],
    [10.4, 57.2], [10.3, 56.5], [10.9, 56.4], [10.6, 55.7], [10.0, 55.2], [10.0, 54.5], [11.0, 54.0], [12.5, 54.4], [13.8, 54.1], [14.3, 53.9], [16.0, 54.3],
    [17.5, 54.75], [18.6, 54.75], [19.4, 54.4], [19.9, 54.9], [21.1, 55.3], [21.1, 56.1], [21.05, 56.8], [21.6, 57.4], [22.6, 57.75], [23.3, 57.1], [24.1, 57.0],
    [24.4, 57.6], [24.3, 58.3], [23.6, 58.5], [23.5, 59.2], [24.1, 59.45], [25.5, 59.6], [26.9, 59.5], [28.0, 59.5], [29.0, 59.9], [30.2, 59.95], [29.0, 60.2],
    [27.0, 60.5], [25.5, 60.3], [24.0, 60.0], [22.9, 59.85], [21.4, 60.6], [21.3, 61.5], [17.5, 61.5], [17.3, 61.3], [18.4, 60.3], [18.8, 59.6], [18.0, 59.0],
    [16.9, 58.4], [16.6, 57.5], [16.2, 56.5], [15.6, 56.15], [14.3, 55.6], [12.9, 55.5], [12.6, 56.0], [12.4, 56.6], [11.8, 57.6], [11.2, 58.4], [11.0, 59.0],
    [10.5, 59.5], [9.5, 59.0], [8.0, 58.1], [6.5, 58.1], [5.5, 58.8], [5.3, 59.3], [5.0, 60.4], [4.9, 61.0], [5.0, 61.5], [4, 61.5]],
  // Black Sea + Azov
  [[27.9, 42.0], [28.6, 43.4], [28.7, 44.3], [29.7, 45.2], [30.7, 46.5], [31.8, 46.6], [32.6, 46.1], [33.6, 46.0], [33.4, 45.2], [32.5, 45.4], [33.6, 44.5],
    [34.5, 44.6], [35.5, 45.0], [36.5, 45.3], [35.4, 45.4], [35.0, 45.8], [35.5, 46.4], [36.8, 46.7], [38.4, 47.1], [39.2, 47.2], [38.2, 46.3], [37.8, 45.8],
    [37.4, 45.0], [38.6, 44.4], [39.7, 43.6], [40.5, 43.0], [41.6, 42.0], [41.6, 41.6], [40.5, 41.0], [39.0, 41.0], [37.0, 41.2], [35.0, 42.0], [33.3, 42.0],
    [31.5, 41.3], [29.1, 41.2], [28.0, 41.6]],
  // Ligurian + Tyrrhenian
  [[4, 43.5], [5.0, 43.35], [6.0, 43.1], [6.9, 43.45], [7.4, 43.73], [8.0, 43.9], [8.8, 44.4], [9.5, 44.1], [10.2, 43.9], [10.5, 43.3], [11.1, 42.4],
    [12.0, 41.9], [12.6, 41.45], [13.6, 41.25], [14.4, 40.8], [15.0, 40.3], [15.6, 40.0], [4, 40]],
  // Adriatic + Ionian opening
  [[12.3, 44.3], [12.4, 45.4], [13.0, 45.65], [13.7, 45.7], [13.6, 45.1], [14.3, 45.25], [14.9, 44.7], [15.4, 44.0], [16.4, 43.5], [17.4, 43.0], [18.5, 42.45],
    [19.4, 41.9], [19.5, 41.0], [19.4, 40.4], [19.6, 40.0], [18.6, 40.0], [18.5, 40.1], [18.0, 40.6], [17.0, 41.0], [16.0, 41.4], [15.9, 41.9], [14.7, 42.1],
    [14.0, 42.6], [13.6, 43.5], [12.6, 44.0]],
  // north Aegean + Marmara hint
  [[22.6, 40.0], [22.6, 40.5], [23.4, 40.3], [24.0, 40.8], [25.2, 40.95], [26.0, 40.7], [26.5, 40.4], [26.2, 40.0]],
  // Caspian edge
  [[46.5, 44.5], [47.2, 44.0], [47.6, 43.2], [47.5, 42.3], [48.6, 41.8], [49.5, 40.0], [46.5, 40.0]],
];
const ISLANDS: LL[][] = [
  [[18.1, 56.9], [18.7, 57.2], [19.3, 57.95], [18.8, 57.9], [18.2, 57.5]],       // Gotland
  [[21.8, 58.3], [22.6, 58.0], [23.3, 58.3], [22.9, 58.6], [22.1, 58.55]],       // Saaremaa
  [[22.4, 58.75], [23.0, 58.7], [23.0, 59.05], [22.5, 59.05]],                   // Hiiumaa
  [[11.1, 55.7], [12.1, 55.4], [12.6, 55.7], [12.3, 56.1], [11.5, 56.0]],       // Zealand
  [[9.7, 55.5], [10.4, 55.1], [10.85, 55.3], [10.5, 55.6]],                       // Funen
  [[16.4, 56.2], [16.7, 56.7], [16.9, 57.3], [16.6, 56.9]],                       // Öland
  [[8.6, 41.4], [9.6, 41.4], [9.5, 42.6], [9.4, 43.0], [8.6, 42.1]],             // Corsica
  [[8.4, 40.0], [9.8, 40.0], [9.7, 40.9], [9.2, 41.2], [8.3, 40.9]],             // Sardinia
  [[33.6, 46.0], [33.4, 45.2], [32.5, 45.4], [33.6, 44.5], [34.5, 44.6], [35.5, 45.0], [35.4, 45.4], [35.0, 45.8], [34.5, 46.1]], // Crimea
];

const toPath = (pts: LL[], close = true) => pts.map(([lo, la], i) => { const [x, y] = project(lo, la); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join('') + (close ? 'Z' : '');

/** Smooth curve through points (Catmull-Rom → cubic Bézier). */
export function smoothPath(pts: [number, number][], tension = 0.5): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3];
    const c2 = [p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export const CITY_XY = Object.fromEntries(CHAPTERS.map(c => [c.id, project(c.lon, c.lat)])) as Record<ChapterId, [number, number]>;
/** The night route, in chapter order, with a gentle bow between far-apart cities. */
export function routePoints(): [number, number][] {
  const pts: [number, number][] = [];
  CHAPTERS.forEach((c, i) => {
    const p = CITY_XY[c.id];
    if (i > 0) {
      const q = CITY_XY[CHAPTERS[i - 1].id];
      const dx = p[0] - q[0], dy = p[1] - q[1], len = Math.hypot(dx, dy);
      if (len > 160) {
        const bow = Math.min(90, len * 0.16) * (i % 2 ? 1 : -1);
        pts.push([(p[0] + q[0]) / 2 - (dy / len) * bow, (p[1] + q[1]) / 2 + (dx / len) * bow]);
      }
    }
    pts.push(p);
  });
  return pts;
}
export const ROUTE_D = smoothPath(routePoints(), 0.85);

/** Static engraved layers of the map (memoised — they never change). */
export const MapEngraving = memo(function MapEngraving() {
  const grat: ReactNode[] = [];
  for (let lon = 5; lon <= 45; lon += 5) { const [x] = project(lon, 0); grat.push(<line key={'o' + lon} x1={x} y1={0} x2={x} y2={MAP_H} />); }
  for (let lat = 45; lat <= 60; lat += 5) { const [, y] = project(0, lat); grat.push(<line key={'a' + lat} x1={0} y1={y} x2={MAP_W} y2={y} />); }
  const labels = [45, 50, 55, 60].map(lat => { const [, y] = project(0, lat); return <text key={lat} x={8} y={y - 4} className="glab">{lat}°N</text>; });
  const lonLabels = [10, 20, 30, 40].map(lon => { const [x] = project(lon, 0); return <text key={lon} x={x + 4} y={MAP_H - 8} className="glab">{lon}°E</text>; });
  const seaD = SEAS.map(s => toPath(s)).join(' ');
  return (
    <svg className="jmap-engr" viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <pattern id="jm-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <line x1="0" y1="3.5" x2="7" y2="3.5" stroke="#9fc7bb" strokeOpacity="0.09" strokeWidth="1" />
        </pattern>
        <radialGradient id="jm-land" cx="0.45" cy="0.42" r="0.75">
          <stop offset="0" stopColor="#14382d" />
          <stop offset="0.6" stopColor="#0b2620" />
          <stop offset="1" stopColor="#061512" />
        </radialGradient>
        <filter id="jm-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.8  0 0 0 0 0.75  0 0 0 0 0.55  0 0 0 0.05 0" />
        </filter>
      </defs>
      <rect width={MAP_W} height={MAP_H} fill="url(#jm-land)" />
      <rect width={MAP_W} height={MAP_H} filter="url(#jm-grain)" />
      <g className="graticule">{grat}</g>
      <path d={seaD} className="sea" />
      <path d={seaD} fill="url(#jm-hatch)" />
      <path d={seaD} className="coast2" />
      <path d={seaD} className="coast" />
      <path d={ISLANDS.map(s => toPath(s)).join(' ')} className="island" />
      {labels}{lonLabels}
      <Compass x={MAP_W - 92} y={MAP_H - 104} />
    </svg>
  );
});

function Compass({ x, y }: { x: number; y: number }) {
  return (
    <g className="compass" transform={`translate(${x} ${y})`}>
      <circle r="44" className="c1" />
      <circle r="36" className="c2" />
      {Array.from({ length: 32 }, (_, i) => { const a = (i / 32) * Math.PI * 2; const r0 = i % 8 === 0 ? 30 : i % 2 ? 40 : 37; return <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * 44} y2={Math.sin(a) * 44} />; })}
      <path d="M0 -40L6 -6L40 0L6 6L0 40L-6 6L-40 0L-6 -6Z" className="star" />
      <path d="M0 -40L6 -6L0 0Z M40 0L6 6L0 0Z M0 40L-6 6L0 0Z M-40 0L-6 -6L0 0Z" className="starhi" />
      <text y="-50" textAnchor="middle" className="cn">N</text>
    </g>
  );
}

/* ================================================================================== house-rule illustrations */

const card = (id: string): Card => ({ id, r: id.slice(0, -1) as Card['r'], s: id.slice(-1) as Card['s'] });

function Mini({ id, w = 46, lang, style, className = '' }: { id: string; w?: number; lang: Lang; style?: CSSProperties; className?: string }) {
  return (
    <div className={`card jmini ${className}`} style={{ position: 'relative', width: w, height: Math.round(w * 1.43), ['--cw' as string]: `${w}px`, ...style }}>
      <CardFace card={card(id)} lang={lang} />
    </div>
  );
}
function Back({ w = 46, style }: { w?: number; style?: CSSProperties }) {
  return <div className="jcback" style={{ width: w, height: Math.round(w * 1.43), ['--cw' as string]: `${w}px`, ...style }} />;
}

/** A small, precise illustration of a house rule (cards + a badge). */
export function TwistArt({ twist, lang, w = 46 }: { twist: TwistId; lang: Lang; w?: number }) {
  switch (twist) {
    case 'banker': return <div className="tart"><Back w={w} style={{ transform: 'rotate(-10deg) translateX(10px)' }} /><Mini id="6S" w={w} lang={lang} style={{ transform: 'rotate(6deg)' }} className="glowc" /><b className="tbadge">♠</b></div>;
    case 'pique': return <div className="tart"><Mini id="QS" w={w} lang={lang} className="glowc" /><b className="tbadge big">+7</b></div>;
    case 'twins': return <div className="tart"><Back w={w} style={{ transform: 'rotate(-12deg) translateX(8px)' }} /><Back w={w} style={{ transform: 'rotate(10deg) translateX(-8px)' }} /><b className="tbadge">×2</b></div>;
    case 'baron': case 'bluff': return <div className="tart"><Mini id="KH" w={w} lang={lang} style={{ transform: 'rotate(-8deg) translateX(8px)' }} /><Mini id="7C" w={w} lang={lang} style={{ transform: 'rotate(8deg) translateX(-8px)' }} className="dimc" /><b className="tbadge">?</b></div>;
    case 'clock': return (
      <div className="tart"><svg className="tclock" viewBox="0 0 60 60" width={w * 1.3} height={w * 1.3}><circle cx="30" cy="32" r="24" /><circle cx="30" cy="32" r="19.5" className="in" />
        {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <line key={i} x1={30 + Math.cos(a) * 16} y1={32 + Math.sin(a) * 16} x2={30 + Math.cos(a) * 19} y2={32 + Math.sin(a) * 19} />; })}
        <path className="wedge" d="M30 32L30 12.5A19.5 19.5 0 0 1 49.5 32Z" /><line x1="30" y1="32" x2="30" y2="16" className="hand" /><line x1="30" y1="32" x2="41" y2="32" className="hand" /><rect x="26" y="3" width="8" height="5" rx="1.5" /></svg>
        <b className="tbadge">15s</b></div>
    );
    case 'countess': return <div className="tart"><span className="t125 serif">125</span><b className="tbadge">+10</b></div>;
    case 'maestro': return <div className="tart"><Back w={w * 0.86} style={{ transform: 'rotate(-16deg) translate(18px, 6px)' }} /><Back w={w * 0.86} style={{ transform: 'translateY(-4px)' }} /><Back w={w * 0.86} style={{ transform: 'rotate(16deg) translate(-18px, 6px)' }} /><b className="tbadge">×3</b></div>;
    case 'croupier': return <div className="tart"><span className="t125 serif lim">100</span><b className="tbadge">≠130</b></div>;
    case 'trio': return <div className="tart"><Back w={w} style={{ transform: 'rotate(-10deg) translateX(8px)' }} /><Back w={w} style={{ transform: 'rotate(10deg) translateX(-8px)' }} /><b className="tbadge">3</b></div>;
    case 'handicap': return <div className="tart"><span className="t125 serif">20</span><b className="tbadge">+</b></div>;
    default: return <div className="tart"><Mini id="AS" w={w} lang={lang} style={{ transform: 'rotate(-8deg) translateX(8px)' }} /><Mini id="JH" w={w} lang={lang} style={{ transform: 'rotate(8deg) translateX(-8px)' }} /></div>;
  }
}
