/**
 * Journey artwork — all vector, no assets: Art-Deco cameo portraits, city skylines, the engraved night map of Europe,
 * stars and the little house-rule illustrations.
 */
import { memo, useId, type CSSProperties, type ReactNode } from 'react';
import type { Character, ChapterId, RouteId, Silhouette, TwistId } from './data';
import { CHAPTERS, ROUTES } from './data';
import { BORDERS_D, LAND_D } from './mapData';
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
  | { t: 'step'; x: number; w: number; h: number; sp: number } // stepped high-rise with spire
  | { t: 'tv'; x: number; w: number; h: number }               // TV tower: needle + sphere
  | { t: 'mount'; x: number; w: number; h: number; seed?: number } // mountain range
  | { t: 'ararat'; x: number; w: number; h: number }           // a great peak with its little sister
  | { t: 'gate'; x: number; w: number; h: number }             // classical gate: entablature on columns
  | { t: 'arch'; x: number; w: number; h: number }             // triumphal arch
  | { t: 'flame'; x: number; w: number; h: number }            // flame-shaped tower
  | { t: 'cone'; x: number; w: number; h: number }             // Armenian church: drum + cone
  | { t: 'shard'; x: number; w: number; h: number }            // glass shard
  | { t: 'pod'; x: number; w: number; h: number }              // bullet-shaped tower
  | { t: 'minaret'; x: number; w: number; h: number }          // slender tower with balcony + cap
  | { t: 'gem'; x: number; w: number; h: number }              // faceted "diamond" library on a plinth
  | { t: 'cascade'; x: number; w: number; h: number }          // stairs climbing a hill
  | { t: 'palace'; x: number; w: number; h: number };          // vast stepped palace

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
  moscow: [
    { t: 'b', x: 0, w: 40, h: 20 }, { t: 't', x: 6, w: 30, h: 27 }, { t: 's', x: 40, w: 16, h: 62, sp: 30 }, { t: 't', x: 56, w: 44, h: 24 },
    { t: 'o', x: 104, w: 16, h: 40 }, { t: 'o', x: 118, w: 22, h: 58 }, { t: 'o', x: 138, w: 14, h: 44 }, { t: 'o', x: 150, w: 18, h: 50 },
    { t: 's', x: 176, w: 14, h: 54, sp: 22 }, { t: 't', x: 192, w: 42, h: 24 }, { t: 'step', x: 240, w: 56, h: 88, sp: 30 },
    { t: 'b', x: 300, w: 36, h: 30 }, { t: 'd', x: 340, w: 24, h: 46 }, { t: 'b', x: 366, w: 34, h: 22 },
  ],
  berlin: [
    { t: 'b', x: 0, w: 44, h: 28 }, { t: 'gate', x: 50, w: 58, h: 40 }, { t: 'b', x: 112, w: 30, h: 34 },
    { t: 'tv', x: 152, w: 14, h: 102 }, { t: 'b', x: 172, w: 44, h: 26 }, { t: 'd', x: 222, w: 44, h: 38 }, { t: 'b', x: 270, w: 34, h: 46 },
    { t: 's', x: 310, w: 16, h: 58, sp: 28 }, { t: 'b', x: 330, w: 40, h: 30 }, { t: 'b', x: 372, w: 28, h: 20 },
  ],
  minsk: [
    { t: 'b', x: 0, w: 50, h: 26 }, { t: 's', x: 52, w: 16, h: 52, sp: 24 }, { t: 'b', x: 70, w: 40, h: 36 },
    { t: 'gem', x: 116, w: 50, h: 60 }, { t: 'b', x: 170, w: 30, h: 30 }, { t: 'step', x: 206, w: 44, h: 62, sp: 16 },
    { t: 'b', x: 254, w: 36, h: 34 }, { t: 'o', x: 296, w: 18, h: 46 }, { t: 'b', x: 318, w: 40, h: 24 }, { t: 's', x: 362, w: 14, h: 44, sp: 20 }, { t: 'b', x: 378, w: 22, h: 22 },
  ],
  almaty: [
    { t: 'mount', x: -10, w: 420, h: 82, seed: 3 }, { t: 'hill', x: 0, w: 130, h: 30 }, { t: 'tv', x: 52, w: 12, h: 84 },
    { t: 'b', x: 130, w: 26, h: 40 }, { t: 'b', x: 158, w: 30, h: 30 }, { t: 'shard', x: 196, w: 24, h: 78 }, { t: 'b', x: 226, w: 34, h: 46 },
    { t: 'o', x: 268, w: 18, h: 44 }, { t: 'o', x: 290, w: 14, h: 36 }, { t: 'b', x: 310, w: 44, h: 28 }, { t: 'b', x: 358, w: 42, h: 36 },
  ],
  tashkent: [
    { t: 'b', x: 0, w: 40, h: 24 }, { t: 'minaret', x: 44, w: 12, h: 70 }, { t: 'd', x: 62, w: 44, h: 40 }, { t: 'minaret', x: 112, w: 12, h: 70 },
    { t: 'b', x: 128, w: 30, h: 30 }, { t: 'tv', x: 170, w: 14, h: 102 }, { t: 'b', x: 190, w: 36, h: 28 }, { t: 'd', x: 232, w: 30, h: 34 },
    { t: 'b', x: 266, w: 40, h: 26 }, { t: 'minaret', x: 310, w: 10, h: 56 }, { t: 'd', x: 324, w: 28, h: 30 }, { t: 'b', x: 356, w: 44, h: 22 },
  ],
  baku: [
    { t: 'b', x: 0, w: 60, h: 18 }, { t: 't', x: 20, w: 22, h: 44 }, { t: 'b', x: 46, w: 40, h: 24 }, { t: 'minaret', x: 90, w: 10, h: 48 },
    { t: 'b', x: 104, w: 34, h: 22 }, { t: 'flame', x: 148, w: 36, h: 88 }, { t: 'flame', x: 186, w: 32, h: 74 }, { t: 'flame', x: 220, w: 28, h: 62 },
    { t: 'b', x: 254, w: 40, h: 30 }, { t: 'b', x: 298, w: 28, h: 44 }, { t: 'b', x: 330, w: 42, h: 24 }, { t: 'd', x: 376, w: 20, h: 28 },
  ],
  yerevan: [
    { t: 'ararat', x: 120, w: 300, h: 88 },
    { t: 'b', x: 0, w: 34, h: 30 }, { t: 'cone', x: 38, w: 22, h: 46 }, { t: 'b', x: 64, w: 40, h: 26 },
    { t: 'cascade', x: 108, w: 76, h: 46 }, { t: 'b', x: 188, w: 30, h: 38 }, { t: 'cone', x: 222, w: 26, h: 56 }, { t: 'b', x: 252, w: 44, h: 24 },
    { t: 's', x: 300, w: 14, h: 46, sp: 20 }, { t: 'b', x: 318, w: 40, h: 30 }, { t: 'cone', x: 362, w: 18, h: 38 }, { t: 'b', x: 382, w: 18, h: 20 },
  ],
  bucharest: [
    { t: 'b', x: 0, w: 30, h: 26 }, { t: 'arch', x: 34, w: 36, h: 46 }, { t: 'b', x: 74, w: 28, h: 30 },
    { t: 'palace', x: 108, w: 136, h: 58 }, { t: 'b', x: 248, w: 26, h: 34 }, { t: 'd', x: 278, w: 30, h: 46 }, { t: 'b', x: 312, w: 34, h: 28 },
    { t: 's', x: 350, w: 14, h: 50, sp: 24 }, { t: 'b', x: 366, w: 34, h: 22 },
  ],
  sofia: [
    { t: 'mount', x: -20, w: 440, h: 58, seed: 9 },
    { t: 'b', x: 0, w: 40, h: 24 }, { t: 'd', x: 44, w: 20, h: 34 }, { t: 'b', x: 66, w: 34, h: 28 },
    { t: 's', x: 108, w: 16, h: 68, sp: 22 }, { t: 'd', x: 126, w: 24, h: 42 }, { t: 'd', x: 148, w: 42, h: 56 }, { t: 'd', x: 188, w: 24, h: 42 },
    { t: 'b', x: 218, w: 36, h: 30 }, { t: 'd', x: 260, w: 22, h: 36 }, { t: 'b', x: 286, w: 46, h: 26 }, { t: 'minaret', x: 336, w: 10, h: 54 }, { t: 'd', x: 348, w: 28, h: 30 }, { t: 'b', x: 378, w: 22, h: 20 },
  ],
  madrid: [
    { t: 'b', x: 0, w: 30, h: 26 }, { t: 'gate', x: 34, w: 56, h: 34 }, { t: 'b', x: 94, w: 26, h: 32 },
    { t: 'd', x: 124, w: 30, h: 52 }, { t: 'b', x: 158, w: 40, h: 34 }, { t: 'b', x: 204, w: 16, h: 96 }, { t: 'b', x: 224, w: 16, h: 88 },
    { t: 'shard', x: 244, w: 18, h: 94 }, { t: 'b', x: 266, w: 16, h: 84 }, { t: 'b', x: 288, w: 50, h: 30 }, { t: 'd', x: 340, w: 24, h: 44 }, { t: 'b', x: 366, w: 34, h: 24 },
  ],
  london: [
    { t: 'b', x: 0, w: 40, h: 26 }, { t: 's', x: 42, w: 14, h: 78, sp: 22 }, { t: 'g', x: 58, w: 40, h: 34 },
    { t: 'w', x: 132, r: 36 }, { t: 'b', x: 172, w: 30, h: 28 }, { t: 'd', x: 206, w: 34, h: 46 }, { t: 'pod', x: 246, w: 22, h: 72 },
    { t: 'shard', x: 274, w: 30, h: 102 }, { t: 't', x: 310, w: 16, h: 54 }, { t: 'b', x: 326, w: 28, h: 13 }, { t: 't', x: 354, w: 16, h: 54 }, { t: 'b', x: 372, w: 28, h: 22 },
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
    case 'tv': {
      const m = p.x + p.w / 2, top = B - p.h, sh = Math.max(2, p.w * 0.22), r = p.w * 0.55, cy = top + p.h * 0.3;
      return `M${m - sh} ${B}V${cy + r}H${m + sh}V${B}Z M${m - r} ${cy}A${r} ${r} 0 1 1 ${m + r} ${cy}A${r} ${r} 0 1 1 ${m - r} ${cy}Z M${m - 0.8} ${cy - r + 1}V${top}H${m + 0.8}V${cy - r + 1}Z M${m - sh * 1.6} ${B}L${m - sh} ${B - p.h * 0.12}H${m + sh}L${m + sh * 1.6} ${B}Z`;
    }
    case 'mount': {
      const r = prng((p.seed ?? 1) * 7121);
      const n = Math.max(5, Math.round(p.w / 34));
      let d = `M${p.x} ${B}L${p.x} ${B - p.h * 0.35}`;
      for (let i = 0; i < n; i++) {
        const x0 = p.x + (i / n) * p.w, x1 = p.x + ((i + 1) / n) * p.w;
        const peak = B - p.h * (0.55 + r() * 0.45), valley = B - p.h * (0.3 + r() * 0.25);
        d += `L${(x0 + (x1 - x0) * (0.35 + r() * 0.3)).toFixed(1)} ${peak.toFixed(1)}L${x1.toFixed(1)} ${valley.toFixed(1)}`;
      }
      return d + `L${p.x + p.w} ${B}Z`;
    }
    case 'ararat': {
      const x = p.x, w = p.w, top = B - p.h;
      return `M${x} ${B}C${x + w * 0.18} ${B - p.h * 0.18} ${x + w * 0.3} ${top + p.h * 0.2} ${x + w * 0.42} ${top}C${x + w * 0.46} ${top + 4} ${x + w * 0.5} ${top + p.h * 0.12} ${x + w * 0.58} ${top + p.h * 0.34}`
        + `C${x + w * 0.64} ${top + p.h * 0.46} ${x + w * 0.7} ${top + p.h * 0.42} ${x + w * 0.76} ${top + p.h * 0.5}C${x + w * 0.84} ${B - p.h * 0.32} ${x + w * 0.92} ${B - p.h * 0.12} ${x + w} ${B}Z`;
    }
    case 'gate': {
      const top = B - p.h, n = 6, cw = p.w / (n * 2 - 1);
      let d = `M${p.x - 2} ${top + 10}H${p.x + p.w + 2}V${top + 4}H${p.x + p.w * 0.62}L${p.x + p.w / 2} ${top - 6}L${p.x + p.w * 0.38} ${top + 4}H${p.x - 2}Z`;
      for (let i = 0; i < n; i++) { const x = p.x + i * 2 * cw; d += ` M${x} ${B}V${top + 10}H${x + cw}V${B}Z`; }
      return d;
    }
    case 'arch': {
      const top = B - p.h, m = p.x + p.w / 2, r = p.w * 0.2;
      return `M${p.x} ${B}V${top}H${p.x + p.w}V${B}H${m + r}V${B - p.h * 0.45}A${r} ${r} 0 0 0 ${m - r} ${B - p.h * 0.45}V${B}Z M${p.x - 3} ${top}H${p.x + p.w + 3}V${top + 4}H${p.x - 3}Z`;
    }
    case 'flame': {
      const x = p.x, w = p.w, top = B - p.h;
      return `M${x} ${B}C${x - w * 0.05} ${B - p.h * 0.5} ${x + w * 0.2} ${top + p.h * 0.25} ${x + w * 0.62} ${top}C${x + w * 0.7} ${top + p.h * 0.2} ${x + w * 1.06} ${B - p.h * 0.55} ${x + w} ${B}Z`;
    }
    case 'cone': {
      const top = B - p.h, m = p.x + p.w / 2, dw = p.w * 0.32;
      return `M${p.x} ${B}V${top + p.h * 0.5}H${m - dw}V${top + p.h * 0.28}L${m} ${top}L${m + dw} ${top + p.h * 0.28}V${top + p.h * 0.5}H${p.x + p.w}V${B}Z M${m - 0.8} ${top + 1}V${top - 7}H${m + 0.8}V${top + 1}Z M${m - 3} ${top - 4.5}H${m + 3}V${top - 3}H${m - 3}Z`;
    }
    case 'shard': {
      const top = B - p.h;
      return `M${p.x} ${B}L${p.x + p.w * 0.42} ${top + 4}L${p.x + p.w * 0.47} ${top}L${p.x + p.w * 0.5} ${top + 6}L${p.x + p.w * 0.56} ${top + 1}L${p.x + p.w} ${B}Z`;
    }
    case 'pod': {
      const top = B - p.h, m = p.x + p.w / 2;
      return `M${p.x + p.w * 0.12} ${B}C${p.x - p.w * 0.1} ${B - p.h * 0.55} ${m - p.w * 0.3} ${top + 2} ${m} ${top}C${m + p.w * 0.3} ${top + 2} ${p.x + p.w * 1.1} ${B - p.h * 0.55} ${p.x + p.w * 0.88} ${B}Z`;
    }
    case 'minaret': {
      const top = B - p.h, m = p.x + p.w / 2, sw = p.w * 0.3;
      return `M${m - sw} ${B}V${top + p.h * 0.32}H${m - sw * 1.7}V${top + p.h * 0.28}H${m + sw * 1.7}V${top + p.h * 0.32}H${m + sw}V${B}Z M${m - sw * 0.8} ${top + p.h * 0.28}V${top + p.h * 0.12}A${sw * 0.8} ${sw * 1.2} 0 0 1 ${m + sw * 0.8} ${top + p.h * 0.12}V${top + p.h * 0.28}Z M${m - 0.6} ${top + p.h * 0.12 - sw * 1.1}V${top}H${m + 0.6}V${top + p.h * 0.12 - sw * 1.1}Z`;
    }
    case 'gem': {
      const top = B - p.h, x = p.x, w = p.w, base = p.h * 0.22, g = p.h - base, c = w * 0.28;
      return `M${x + w * 0.1} ${B}V${B - base}H${x + w * 0.9}V${B}Z M${x + c} ${B - base}L${x} ${B - base - g * 0.3}V${top + g * 0.3}L${x + c} ${top}H${x + w - c}L${x + w} ${top + g * 0.3}V${B - base - g * 0.3}L${x + w - c} ${B - base}Z`;
    }
    case 'cascade': {
      const n = 6, sw = p.w / n;
      let d = `M${p.x} ${B}`;
      for (let i = 0; i < n; i++) { const y = B - p.h * ((i + 1) / n); d += `V${y.toFixed(1)}H${(p.x + (i + 1) * sw).toFixed(1)}`; }
      return d + `V${B}Z`;
    }
    case 'palace': {
      const top = B - p.h, x = p.x, w = p.w, m = x + w / 2;
      return `M${x} ${B}V${top + p.h * 0.55}H${x + w * 0.12}V${top + p.h * 0.38}H${x + w * 0.26}V${top + p.h * 0.22}H${m - w * 0.07}V${top + 6}H${m - 3}V${top}H${m + 3}V${top + 6}H${m + w * 0.07}V${top + p.h * 0.22}H${x + w * 0.74}V${top + p.h * 0.38}H${x + w * 0.88}V${top + p.h * 0.55}H${x + w}V${B}Z`;
    }
  }
}

/** Part types that get lit windows. */
const LIT = new Set<Part['t']>(['b', 'g', 's', 'd', 'o', 't', 'step', 'gem', 'palace', 'cascade']);

/** City skyline, 400×110 units, baseline at 110. `layer="far"` draws a dimmer, flattened copy. */
export const Skyline = memo(function Skyline({ city, layer = 'near', className = '', lit = 0.22, tile = false }: { city: ChapterId; layer?: 'near' | 'far'; className?: string; lit?: number; tile?: boolean }) {
  const B = 110;
  const parts = SKY[city];
  const r = prng(city.length * 977 + (layer === 'far' ? 5 : 1));
  const windows: { x: number; y: number; w: number; h: number }[] = [];
  if (layer === 'near') {
    for (const p of parts) {
      if (!LIT.has(p.t)) continue;
      const h = 'h' in p ? p.h : 0;
      const w = 'w' in p ? p.w : 0;
      for (let y = B - h + 7; y < B - 6; y += 7) for (let x = p.x + 3; x < p.x + w - 4; x += 6) if (r() < lit) windows.push({ x, y, w: 2.2, h: 3.2 });
    }
  }
  const wheel = parts.find((p): p is Extract<Part, { t: 'w' }> => p.t === 'w');
  const uid = 'sk' + useId().replace(/:/g, '');
  // mountains stand in the distance: only the far layer draws them
  const d = parts.filter(p => layer === 'far' || (p.t !== 'mount' && p.t !== 'ararat')).map(p => partPath(p, B)).join(' ');
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

const RAD = Math.PI / 180;
/**
 * Equal-area conic projection centred on 36°E (standard parallels 40° and 58°) — wide enough for London and Madrid in
 * the west and Almaty in the east, with gently curved parallels like an old engraved sheet. World units, y down.
 * Keep in sync with the generator of mapData.ts.
 */
export const MAP = { lon0: 36, p1: 40, p2: 58, latRef: 50, k: 2000, x0: -0.63, y1: 0.47 };
export const MAP_W = 2420;
export const MAP_H = 1880;
const CN = (Math.sin(MAP.p1 * RAD) + Math.sin(MAP.p2 * RAD)) / 2;
const CC = Math.cos(MAP.p1 * RAD) ** 2 + 2 * CN * Math.sin(MAP.p1 * RAD);
const rho = (lat: number) => Math.sqrt(CC - 2 * CN * Math.sin(lat * RAD)) / CN;
const RHO0 = rho(MAP.latRef);
export const project = (lon: number, lat: number): [number, number] => {
  const t = CN * (lon - MAP.lon0) * RAD, r = rho(lat);
  return [(r * Math.sin(t) - MAP.x0) * MAP.k, (MAP.y1 - (RHO0 - r * Math.cos(t))) * MAP.k];
};

type LL = [number, number];
// a few lakes the 1:50m land layer doesn't cut out (lon, lat)
const LAKES: LL[][] = [
  [[29.9, 60.0], [30.6, 60.3], [31.5, 60.7], [32.6, 61.1], [32.9, 61.3], [32.4, 61.6], [31.3, 61.6], [30.4, 61.2], [29.9, 60.6]],   // Ladoga
  [[34.2, 61.0], [35.6, 61.2], [36.3, 61.9], [36.0, 62.6], [35.2, 62.9], [34.5, 62.4], [34.8, 61.8], [34.3, 61.5]],               // Onega
  [[27.3, 57.9], [27.8, 58.1], [27.7, 58.6], [27.4, 58.95], [27.0, 58.7], [27.2, 58.3]],                                           // Peipus
  [[60.0, 46.0], [61.2, 46.3], [61.6, 46.7], [60.9, 46.9], [60.2, 46.6]],                                                         // North Aral
  [[58.3, 44.2], [58.9, 44.6], [59.2, 45.3], [58.8, 45.9], [58.3, 45.4], [58.1, 44.7]],                                           // Aral
  [[73.4, 46.6], [74.3, 46.3], [75.6, 46.5], [77.0, 46.5], [78.5, 46.4], [79.3, 46.6], [79.0, 46.85], [77.5, 46.9], [76.0, 46.9], [74.8, 46.95], [73.9, 47.1], [73.4, 46.9]], // Balkhash
  [[76.2, 42.35], [77.2, 42.2], [78.4, 42.1], [78.6, 42.4], [77.6, 42.7], [76.6, 42.8], [76.2, 42.6]],                            // Issyk-Kul
  [[45.0, 40.2], [45.5, 40.1], [45.6, 40.3], [45.2, 40.6], [44.95, 40.5]],                                                         // Sevan
  [[45.1, 37.2], [45.9, 37.4], [45.9, 38.0], [45.5, 38.2], [45.2, 37.7]],                                                          // Urmia
];
// mountain ranges, drawn as rows of little engraved peaks
const RANGES: LL[][] = [
  [[5.9, 44.9], [6.9, 45.9], [8.5, 46.4], [10.5, 46.6], [12.5, 47.0], [14.5, 47.2]],                 // Alps
  [[-1.6, 43.0], [0.5, 42.75], [2.6, 42.5]],                                                         // Pyrenees
  [[18.8, 49.4], [21.5, 49.3], [24.0, 48.4], [25.3, 47.4], [25.8, 46.0], [24.5, 45.5], [22.5, 45.4]], // Carpathians
  [[22.4, 43.3], [24.5, 42.9], [26.5, 42.8]],                                                        // Balkan mountains
  [[39.5, 43.6], [42.0, 43.2], [44.5, 42.7], [46.5, 41.9], [48.6, 41.2]],                            // Caucasus
  [[69.5, 42.6], [72.0, 42.2], [74.5, 42.6], [77.0, 43.0], [79.5, 42.4], [81.5, 42.8]],              // Tian Shan
  [[68.5, 39.2], [71.0, 39.6], [73.5, 39.4]],                                                        // Alay / Pamir edge
  [[-6.0, 40.4], [-3.8, 40.9], [-2.0, 41.3]],                                                        // Sierra de Guadarrama
  [[59.2, 51.5], [59.6, 54.0], [59.4, 56.5], [59.6, 59.0], [59.8, 61.5]],                            // Urals
  [[13.5, 42.5], [14.5, 41.8], [15.8, 40.8]],                                                        // Apennines (south)
];
const SEA_LABELS: { t: string; lon: number; lat: number; r?: number; s?: number }[] = [
  { t: 'Mare Balticum', lon: 19.4, lat: 56.7, r: -62 },
  { t: 'Mare Germanicum', lon: 3.6, lat: 56.1, r: -66 },
  { t: 'Pontus Euxinus', lon: 34.2, lat: 43.1, r: -4 },
  { t: 'Mare Caspium', lon: 50.6, lat: 42.4, r: -74 },
  { t: 'Mare Internum', lon: 17.5, lat: 35.6, r: 4, s: 1.25 },
  { t: 'Oceanus Atlanticus', lon: -12.5, lat: 45.5, r: -70, s: 1.25 },
];

const llPath = (pts: LL[], close = true) => pts.map(([lo, la], i) => { const [x, y] = project(lo, la); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join('') + (close ? 'Z' : '');

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

/** A route's path, in chapter order, with a gentle bow between far-apart cities (alternating sides). */
export function routePoints(route: RouteId): [number, number][] {
  const ids = ROUTES[route];
  const pts: [number, number][] = [];
  ids.forEach((id, i) => {
    const p = CITY_XY[id];
    if (i > 0) {
      const q = CITY_XY[ids[i - 1]];
      const dx = p[0] - q[0], dy = p[1] - q[1], len = Math.hypot(dx, dy);
      if (len > 110) {
        const bow = Math.min(90, len * 0.14) * (i % 2 ? 1 : -1);
        pts.push([(p[0] + q[0]) / 2 - (dy / len) * bow, (p[1] + q[1]) / 2 + (dx / len) * bow]);
      }
    }
    pts.push(p);
  });
  return pts;
}
const routeDs = new Map<RouteId, string>();
export function routeD(route: RouteId): string {
  let d = routeDs.get(route);
  if (!d) { d = smoothPath(routePoints(route), 0.85); routeDs.set(route, d); }
  return d;
}

function rangeMarks(): string {
  let d = '';
  for (const r of RANGES) {
    const pts = r.map(([lo, la]) => project(lo, la));
    let carry = 0, k = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay);
      for (let t = carry; t < L; t += 17) {
        const x = ax + ((bx - ax) * t) / L, y = ay + ((by - ay) * t) / L + (k++ % 2 ? 4 : -3), s = 7 + (k % 3);
        d += `M${(x - s).toFixed(1)} ${(y + s * 0.55).toFixed(1)}L${x.toFixed(1)} ${(y - s * 0.75).toFixed(1)}L${(x + s).toFixed(1)} ${(y + s * 0.55).toFixed(1)}`;
        carry = t + 17 - L;
      }
    }
  }
  return d;
}

/** Graticule: meridians are straight rays of the cone, parallels are arcs (sampled). */
function graticule() {
  const lines: string[] = [];
  for (let lon = -20; lon <= 90; lon += 10) lines.push(llPath(Array.from({ length: 31 }, (_, i): LL => [lon, 20 + i * 2]), false));
  for (let lat = 30; lat <= 70; lat += 10) lines.push(llPath(Array.from({ length: 66 }, (_, i): LL => [-30 + i * 2, lat]), false));
  return lines.join('');
}

/** Static engraved layers of the map in world units (memoised — they never change). Rendered inside the camera's <svg>. */
export const MapLayers = memo(function MapLayers() {
  const labels = [40, 50, 60].map(lat => { const [x, y] = project(-6, lat); return <text key={lat} x={x} y={y - 6} className="glab">{lat}°N</text>; });
  const lonLabels = [0, 20, 40, 60, 80].map(lon => { const [x, y] = project(lon, 36.5); return <text key={lon} x={x + 5} y={y} className="glab">{lon === 0 ? '0°' : `${lon}°E`}</text>; });
  return (
    <>
      <defs>
        <pattern id="jm-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <line x1="0" y1="4.5" x2="9" y2="4.5" stroke="#9fc7bb" strokeOpacity="0.1" strokeWidth="1.2" />
        </pattern>
        <radialGradient id="jm-land" gradientUnits="userSpaceOnUse" cx={MAP_W * 0.42} cy={MAP_H * 0.42} r={MAP_W * 0.62}>
          <stop offset="0" stopColor="#16402f" />
          <stop offset="0.55" stopColor="#0c2a22" />
          <stop offset="1" stopColor="#071713" />
        </radialGradient>
        <filter id="jm-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="7" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.8  0 0 0 0 0.75  0 0 0 0 0.55  0 0 0 0.05 0" />
        </filter>
      </defs>
      <rect x={-400} y={-400} width={MAP_W + 800} height={MAP_H + 800} className="sea" />
      <rect x={-400} y={-400} width={MAP_W + 800} height={MAP_H + 800} fill="url(#jm-hatch)" />
      <path d={LAND_D} className="coast2" />
      <path d={LAND_D} fill="url(#jm-land)" />
      <rect width={MAP_W} height={MAP_H} filter="url(#jm-grain)" />
      <path d={graticule()} className="graticule" />
      <path d={BORDERS_D} className="border" />
      <path d={LAKES.map(l => llPath(l)).join('')} className="lake" />
      <path d={rangeMarks()} className="mtn" />
      <path d={LAND_D} className="coast" />
      {SEA_LABELS.map(l => { const [x, y] = project(l.lon, l.lat); return <text key={l.t} x={x} y={y} className="slab" transform={`rotate(${l.r ?? 0} ${x} ${y})`} style={l.s ? { fontSize: `${22 * l.s}px` } : undefined}>{l.t}</text>; })}
      {labels}{lonLabels}
    </>
  );
});

/** The compass rose (drawn over the frame corner, outside the camera). */
export function Compass({ size = 96 }: { size?: number }) {
  return (
    <svg className="jmap-compass" width={size} height={size} viewBox="-50 -58 100 108" aria-hidden>
      <g className="compass">
        <circle r="44" className="c1" />
        <circle r="36" className="c2" />
        {Array.from({ length: 32 }, (_, i) => { const a = (i / 32) * Math.PI * 2; const r0 = i % 8 === 0 ? 30 : i % 2 ? 40 : 37; return <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * 44} y2={Math.sin(a) * 44} />; })}
        <path d="M0 -40L6 -6L40 0L6 6L0 40L-6 6L-40 0L-6 -6Z" className="star" />
        <path d="M0 -40L6 -6L0 0Z M40 0L6 6L0 0Z M0 40L-6 6L0 0Z M-40 0L-6 -6L0 0Z" className="starhi" />
        <text y="-48" textAnchor="middle" className="cn">N</text>
      </g>
    </svg>
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
    case 'matryoshka': return <div className="tart"><Back w={w * 0.86} style={{ transform: 'rotate(-12deg) translateX(14px)' }} /><Mini id="QS" w={w} lang={lang} className="glowc" style={{ transform: 'rotate(6deg)' }} /><b className="tbadge big">+6</b></div>;
    case 'spymaster': return <div className="tart"><Mini id="QS" w={w} lang={lang} className="glowc" /><b className="tbadge big">+6</b></div>;
    case 'cognac': return <div className="tart"><span className="t125 serif">20</span><Mini id="QS" w={w * 0.8} lang={lang} style={{ transform: 'rotate(10deg) translateX(-4px)' }} /><b className="tbadge">+6</b></div>;
    case 'selector': return (
      <div className="tart"><svg className="tclock" viewBox="0 0 60 60" width={w * 1.3} height={w * 1.3}><circle cx="30" cy="32" r="24" /><circle cx="30" cy="32" r="19.5" className="in" />
        {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <line key={i} x1={30 + Math.cos(a) * 16} y1={32 + Math.sin(a) * 16} x2={30 + Math.cos(a) * 19} y2={32 + Math.sin(a) * 19} />; })}
        <path className="wedge" d="M30 32L30 12.5A19.5 19.5 0 0 1 46.9 41.75Z" /><line x1="30" y1="32" x2="30" y2="16" className="hand" /><line x1="30" y1="32" x2="40" y2="38" className="hand" /><rect x="26" y="3" width="8" height="5" rx="1.5" /></svg>
        <b className="tbadge">20s</b></div>
    );
    case 'bison': return <div className="tart"><span className="t125 serif">15</span><b className="tbadge">?</b></div>;
    case 'eagle': return <div className="tart"><Mini id="6S" w={w} lang={lang} className="glowc" style={{ transform: 'rotate(-6deg)' }} /><b className="tbadge">?</b></div>;
    case 'matador': return <div className="tart"><Mini id="6S" w={w} lang={lang} className="glowc" style={{ transform: 'rotate(-6deg)' }} /><b className="tbadge">115</b></div>;
    case 'caravan': return <div className="tart"><Back w={w} style={{ transform: 'rotate(-10deg) translateX(8px)' }} /><Back w={w} style={{ transform: 'rotate(10deg) translateX(-8px)' }} /><b className="tbadge">?</b></div>;
    case 'fire': return <div className="tart"><span className="t125 serif">125</span><b className="tbadge">+15</b></div>;
    case 'thorn': return <div className="tart"><span className="t125 serif">125</span><b className="tbadge">+10</b></div>;
    case 'voivode': return <div className="tart"><span className="t125 serif lim">110</span><b className="tbadge">?</b></div>;
    default: return <div className="tart"><Mini id="AS" w={w} lang={lang} style={{ transform: 'rotate(-8deg) translateX(8px)' }} /><Mini id="JH" w={w} lang={lang} style={{ transform: 'rotate(8deg) translateX(-8px)' }} /></div>;
  }
}
