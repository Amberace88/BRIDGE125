import { memo, type ReactNode } from 'react';
import { FACES, rankOf, suitOf } from './core/tiles';

// Tile faces, drawn in code (no images): one hidden SVG sprite of <symbol>s per skin; every tile on the board is a
// tiny <svg><use href="#mjf-classic-12"/></svg>, so 144 tiles cost 42 drawings.
//
//   classic — dots, bamboo, characters (hand-drawn numerals over 万), compass winds, dragons, flowers, seasons
//   cards   — Bridge 125's suits: ♠ ♥ ♦ ranks 2–10, the four aces as winds, J Q K as dragons, jokers as flowers,
//             bidding cards (1♣ 2♦ 3♥ 4♠) as seasons
// Every face lives in a 60 × 80 box.

export type Skin = 'classic' | 'cards';
export const SKINS: Skin[] = ['classic', 'cards'];
export const faceId = (skin: Skin, face: number) => `mjf-${skin}-${face}`;

const RED = '#b8232f', GREEN = '#1c7a4f', BLUE = '#1f4f93', INK = '#1d1f26', GOLD = '#a8812c', PLUM = '#7a2f8f';

/* ================================================================== classic */

function Dot({ x, y, r, c, c2 }: { x: number; y: number; r: number; c: string; c2?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="url(#mjg-dot)" stroke={c} strokeWidth={r * 0.26} />
      <circle cx={x} cy={y} r={r * 0.52} fill={c2 ?? c} />
      <circle cx={x} cy={y} r={r * 0.2} fill="#fffaf0" />
      <circle cx={x - r * 0.35} cy={y - r * 0.38} r={r * 0.16} fill="#fff" opacity=".55" />
    </g>
  );
}

const DOTS: [number, number, string][][] = [
  [],
  [[30, 24, GREEN], [30, 56, BLUE]],
  [[16, 18, BLUE], [30, 40, RED], [44, 62, GREEN]],
  [[18, 24, BLUE], [42, 24, GREEN], [18, 56, GREEN], [42, 56, BLUE]],
  [[17, 20, BLUE], [43, 20, GREEN], [30, 40, RED], [17, 60, GREEN], [43, 60, BLUE]],
  [[19, 17, GREEN], [41, 17, GREEN], [19, 40, RED], [41, 40, RED], [19, 63, RED], [41, 63, RED]],
  [[14, 12, GREEN], [30, 20, GREEN], [46, 28, GREEN], [19, 46, RED], [41, 46, RED], [19, 65, RED], [41, 65, RED]],
  [[19, 13, BLUE], [41, 13, BLUE], [19, 31, BLUE], [41, 31, BLUE], [19, 49, BLUE], [41, 49, BLUE], [19, 67, BLUE], [41, 67, BLUE]],
  [[14, 17, BLUE], [30, 17, BLUE], [46, 17, BLUE], [14, 40, RED], [30, 40, RED], [46, 40, RED], [14, 63, GREEN], [30, 63, GREEN], [46, 63, GREEN]],
];
const DOT_R = [0, 10.5, 9.2, 9.5, 8.6, 8.4, 7.4, 7.6, 7.3];

function DotsFace({ n }: { n: number }) {
  if (n === 1) {
    return (
      <g>
        <circle cx="30" cy="40" r="22" fill="none" stroke={GREEN} strokeWidth="2.4" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={30 + Math.cos(a) * 17.5} cy={40 + Math.sin(a) * 17.5} r="2.6" fill={i % 2 ? BLUE : GREEN} />;
        })}
        <circle cx="30" cy="40" r="12.5" fill="url(#mjg-dot)" stroke={RED} strokeWidth="3" />
        <path d="M30 31.5l2.3 6.2 6.2 2.3-6.2 2.3L30 48.5l-2.3-6.2-6.2-2.3 6.2-2.3z" fill={RED} />
        <circle cx="30" cy="40" r="2.2" fill="#fffaf0" />
      </g>
    );
  }
  return <g>{DOTS[n - 1].map(([x, y, c], i) => <Dot key={i} x={x} y={y} r={DOT_R[n - 1]} c={c} />)}</g>;
}

function Stick({ x, y, h, c, w = 6.4 }: { x: number; y: number; h: number; c: string; w?: number }) {
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={w / 2} fill={c} />
      <rect x={x - w / 2 + 1.2} y={y - h / 2 + 2} width={w * 0.26} height={h - 4} rx={1} fill="#fff" opacity=".38" />
      <path d={`M${x - w / 2} ${y}h${w}M${x - w / 2} ${y - h / 2 + 3.2}h${w}M${x - w / 2} ${y + h / 2 - 3.2}h${w}`} stroke="#0b2a1c" strokeOpacity=".45" strokeWidth="1.3" />
    </g>
  );
}

const BAMBOO: [number, number, string][][] = [
  [],
  [[30, 22, GREEN], [30, 58, BLUE]],
  [[30, 22, GREEN], [18, 58, GREEN], [42, 58, GREEN]],
  [[18, 22, BLUE], [42, 22, GREEN], [18, 58, GREEN], [42, 58, BLUE]],
  [[16, 22, GREEN], [44, 22, BLUE], [30, 40, RED], [16, 58, BLUE], [44, 58, GREEN]],
  [[14, 22, GREEN], [30, 22, GREEN], [46, 22, GREEN], [14, 58, BLUE], [30, 58, BLUE], [46, 58, BLUE]],
  [[30, 13, RED], [14, 40, GREEN], [30, 40, GREEN], [46, 40, GREEN], [14, 66, GREEN], [30, 66, GREEN], [46, 66, GREEN]],
  [[12, 22, GREEN], [24, 22, GREEN], [36, 22, GREEN], [48, 22, GREEN], [12, 58, BLUE], [24, 58, BLUE], [36, 58, BLUE], [48, 58, BLUE]],
  [[14, 16, GREEN], [30, 16, RED], [46, 16, BLUE], [14, 40, GREEN], [30, 40, RED], [46, 40, BLUE], [14, 64, GREEN], [30, 64, RED], [46, 64, BLUE]],
];
const STICK_H = [0, 26, 26, 26, 22, 26, 20, 26, 19];

function BambooFace({ n }: { n: number }) {
  if (n === 1) {
    // a little sparrow on a bamboo shoot
    return (
      <g>
        <path d="M30 76V46" stroke={GREEN} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M30 62c-8-1-13-6-15-12 7 0 12 4 15 12zM30 56c7-2 11-7 12-13-6 1-10 5-12 13z" fill={GREEN} />
        <path d="M17 34c0-10 7-17 16-17 6 0 10 3 12 7l7 1-6 4c0 9-7 16-17 16-7 0-12-4-12-11z" fill={RED} />
        <path d="M22 35c4 5 11 6 17 2-3 7-12 9-17-2z" fill="#f2c14e" />
        <path d="M17 33c-6 2-10 6-11 11 5-1 9-3 12-7zM19 28c-6-1-11 1-14 5 5 1 10 0 14-2z" fill={BLUE} />
        <circle cx="38" cy="25" r="2.4" fill={INK} />
        <circle cx="38.7" cy="24.3" r=".8" fill="#fff" />
      </g>
    );
  }
  return <g>{BAMBOO[n - 1].map(([x, y, c], i) => <Stick key={i} x={x} y={y} h={STICK_H[n - 1]} c={c} w={n === 8 ? 5.6 : 6.4} />)}</g>;
}

/** Hand-drawn numerals 一 … 九 (top half of a character tile), stroked. */
const NUMERALS = [
  'M13 22H47',
  'M18 14H42M12 30H48',
  'M16 11H44M19 21H41M11 32H49',
  'M13 11H47V33H13ZM25 11C25 21 23 25 18 28M35 11V24C35 27 37 28 41 28',
  'M14 10H46M29 10L25 32M17 21H40L39 32M10 32H50',
  'M29 6L32 11M12 16H48M23 22L14 33M37 22L46 33',
  'M10 22L49 16M25 7V28C25 33 27 34 32 34H47V29',
  'M25 11C25 22 21 29 12 33M35 11C36 22 40 29 48 33',
  'M10 17H33C38 17 37 22 36 27L35 31C35 34 39 34 42 32L48 28M23 7C23 21 20 28 11 34',
];

function CharsFace({ n }: { n: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={NUMERALS[n - 1]} stroke={INK} strokeWidth="4.4" transform="translate(0 2)" />
      {/* 万 */}
      <path d="M12 46H48M29 46C28 60 23 68 14 73M27 56H44C45 64 44 70 39 73L35 71" stroke={RED} strokeWidth="4.8" />
    </g>
  );
}

const WIND_LETTER = ['E', 'S', 'W', 'N'];
const WIND_ANGLE = [90, 180, 270, 0];
function WindFace({ n }: { n: number }) {
  return (
    <g>
      <g transform={`translate(30 22) rotate(${WIND_ANGLE[n - 1]})`}>
        <circle r="13" fill="none" stroke={GOLD} strokeWidth="1.4" opacity=".7" />
        <path d="M0-12L3 0 0 12-3 0Z" fill={INK} opacity=".25" />
        <path d="M-12 0L0 3 12 0 0-3Z" fill={INK} opacity=".25" />
        <path d="M0-14L4.2 0H-4.2Z" fill={RED} />
        <circle r="2" fill={GOLD} />
      </g>
      <text x="30" y="70" textAnchor="middle" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="700" fontSize="34" fill={INK}>{WIND_LETTER[n - 1]}</text>
    </g>
  );
}

function DragonFace({ n }: { n: number }) {
  if (n === 1) {
    // 中, the red dragon
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 27H47V50H13Z" stroke={RED} strokeWidth="5.4" />
        <path d="M30 9V73" stroke={RED} strokeWidth="5.8" />
      </g>
    );
  }
  if (n === 2) {
    // the green dragon: a carved jade disc with a dragon-scale swirl
    return (
      <g>
        <circle cx="30" cy="40" r="21" fill={GREEN} />
        <circle cx="30" cy="40" r="21" fill="url(#mjg-jade)" />
        <circle cx="30" cy="40" r="7" fill="#f6efdc" stroke="#0e4a30" strokeWidth="1.5" />
        <path d="M30 22c9 0 15 7 14 15M12 38c1-9 9-16 18-15M30 58c-9 0-15-7-14-15M48 42c-1 9-9 16-18 15" fill="none" stroke="#bfe8cf" strokeWidth="2" strokeLinecap="round" opacity=".85" />
        <circle cx="30" cy="40" r="21" fill="none" stroke="#0e4a30" strokeWidth="1.6" />
      </g>
    );
  }
  // the white dragon: a double frame
  return (
    <g fill="none">
      <rect x="11" y="10" width="38" height="60" rx="4" stroke={BLUE} strokeWidth="3.6" />
      <rect x="17" y="16" width="26" height="48" rx="2" stroke={BLUE} strokeWidth="1.6" strokeDasharray="5 3" />
    </g>
  );
}

function Petals({ n, r, len, c, w, rot = 0, cx = 30, cy = 44 }: { n: number; r: number; len: number; c: string; w: number; rot?: number; cx?: number; cy?: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <ellipse key={i} cx={cx} cy={cy - r - len / 2} rx={w} ry={len / 2} fill={c} transform={`rotate(${rot + (i * 360) / n} ${cx} ${cy})`} />
      ))}
    </g>
  );
}

function Corner({ n, c }: { n: number; c: string }) {
  return <text x="10" y="18" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="700" fontSize="15" fill={c}>{n}</text>;
}

function FlowerFace({ n }: { n: number }) {
  const stem = <path d="M30 74C30 66 31 60 30 54M30 66c-6 0-9-3-11-7 6 0 9 2 11 7z" stroke={GREEN} strokeWidth="2.4" fill={GREEN} />;
  const art: ReactNode[] = [
    // plum
    <g key="p">{stem}<Petals n={5} r={4} len={13} w={6.5} c="#d2334f" /><circle cx="30" cy="44" r="4.5" fill="#f2c14e" /><Petals n={5} r={4} len={4} w={0.8} c="#7a1020" rot={36} /></g>,
    // orchid
    <g key="o">{stem}<Petals n={3} r={2} len={20} w={6} c={PLUM} /><Petals n={3} r={2} len={11} w={4} c="#c58ad6" rot={60} /><circle cx="30" cy="44" r="3.2" fill="#f2c14e" /></g>,
    // chrysanthemum
    <g key="c">{stem}<Petals n={16} r={3} len={14} w={2.2} c="#e08a1e" /><Petals n={16} r={2} len={8} w={1.8} c="#f2c14e" rot={11} /><circle cx="30" cy="44" r="3.5" fill={RED} /></g>,
    // lotus
    <g key="l"><path d="M14 64c6 6 26 6 32 0" stroke={GREEN} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M30 26c7 9 7 21 0 32-7-11-7-23 0-32z" fill="#e98aa6" />
      <path d="M30 58c-9-3-15-11-16-22 9 3 14 10 16 22zM30 58c9-3 15-11 16-22-9 3-14 10-16 22z" fill="#d2557a" />
      <path d="M30 58c-12 1-19-4-22-10 8-1 16 2 22 10zM30 58c12 1 19-4 22-10-8-1-16 2-22 10z" fill="#b83a62" /></g>,
  ];
  return <g>{art[n - 1]}<Corner n={n} c={RED} /></g>;
}

function SeasonFace({ n }: { n: number }) {
  const art: ReactNode[] = [
    // spring: a sprout
    <g key="sp"><path d="M30 72V40" stroke={GREEN} strokeWidth="3" strokeLinecap="round" />
      <path d="M30 46c-12 0-18-8-18-18 11 0 17 7 18 18zM30 40c10-1 16-8 17-17-10 1-16 7-17 17z" fill={GREEN} />
      <path d="M30 46c-8-2-12-7-14-13M30 40c6-2 10-6 13-11" stroke="#bfe8cf" strokeWidth="1.2" fill="none" />
      <path d="M18 72h24" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" /></g>,
    // summer: the sun
    <g key="su">{Array.from({ length: 12 }, (_, i) => <path key={i} d="M30 20l2.6 8h-5.2z" fill="#e08a1e" transform={`rotate(${i * 30} 30 44)`} />)}
      <circle cx="30" cy="44" r="13" fill={RED} /><circle cx="30" cy="44" r="13" fill="url(#mjg-sun)" /></g>,
    // autumn: a maple leaf
    <g key="au"><path d="M30 18l4 9 7-3-2 9 9 1-7 6 4 6-10-1-3 10-2-10-10 1 4-6-7-6 9-1-2-9 7 3z" fill="#d0611c" stroke="#8f3a0c" strokeWidth="1" strokeLinejoin="round" />
      <path d="M30 56v16" stroke="#8f3a0c" strokeWidth="2.4" strokeLinecap="round" /><path d="M30 30v24" stroke="#f2c14e" strokeWidth="1.2" /></g>,
    // winter: a snowflake
    <g key="wi" stroke={BLUE} strokeWidth="2.6" strokeLinecap="round" fill="none">
      {[0, 60, 120].map(a => <path key={a} d="M30 24V64M30 30l-5-5M30 30l5-5M30 58l-5 5M30 58l5 5" transform={`rotate(${a} 30 44)`} />)}
      <circle cx="30" cy="44" r="3.5" fill="#cfe0f5" /></g>,
  ];
  return <g>{art[n - 1]}<Corner n={n} c={BLUE} /></g>;
}

function classicFace(face: number) {
  const n = rankOf(face);
  switch (suitOf(face)) {
    case 'dots': return <DotsFace n={n} />;
    case 'bamboo': return <BambooFace n={n} />;
    case 'chars': return <CharsFace n={n} />;
    case 'wind': return <WindFace n={n} />;
    case 'dragon': return <DragonFace n={n} />;
    case 'flower': return <FlowerFace n={n} />;
    default: return <SeasonFace n={n} />;
  }
}

/* ================================================================== cards */

export const SUIT_PATH = {
  s: 'M10 1C14 6 19 9 18.4 13.2 17.8 16.6 13.6 17.2 11.2 14.6L12.6 19H7.4L8.8 14.6C6.4 17.2 2.2 16.6 1.6 13.2 1 9 6 6 10 1Z',
  h: 'M10 18.4C2.6 12.8.4 8.6 1.4 5.4 2.6 1.6 7.6 1 10 4.8 12.4 1 17.4 1.6 18.6 5.4 19.6 8.6 17.4 12.8 10 18.4Z',
  d: 'M10 .8L17.6 10 10 19.2 2.4 10Z',
  c: 'M10 1.2A4.4 4.4 0 0 1 13.9 7.6 4.4 4.4 0 1 1 11.6 14.4L12.8 19H7.2L8.4 14.4A4.4 4.4 0 1 1 6.1 7.6 4.4 4.4 0 0 1 10 1.2Z',
} as const;
type SuitKey = keyof typeof SUIT_PATH;
export const SUIT_COLOR: Record<SuitKey, string> = { s: INK, h: '#c0263a', d: '#1d5fb4', c: '#1f7a3f' };

const Pip = ({ k, x, y, s }: { k: SuitKey; x: number; y: number; s: number }) => (
  <path d={SUIT_PATH[k]} fill={SUIT_COLOR[k]} transform={`translate(${x - s / 2} ${y - s / 2}) scale(${s / 20})`} />
);
const serif = "'Cormorant Garamond', Georgia, serif";

function RankSuit({ rank, k, big = false }: { rank: string; k: SuitKey; big?: boolean }) {
  return (
    <g>
      <text x="30" y={big ? 40 : 37} textAnchor="middle" fontFamily={serif} fontWeight="700" fontSize={rank.length > 1 ? 30 : big ? 38 : 34} letterSpacing={rank.length > 1 ? -2 : 0} fill={SUIT_COLOR[k]}>{rank}</text>
      <Pip k={k} x={30} y={big ? 58 : 57} s={big ? 30 : 26} />
    </g>
  );
}

function Crown({ y = 12 }: { y?: number }) {
  return <path d={`M18 ${y + 10}L16 ${y}l7 5 7-8 7 8 7-5-2 10Z`} fill="url(#mjg-gold)" stroke="#7a5a18" strokeWidth=".8" strokeLinejoin="round" />;
}

function cardsFace(face: number) {
  const n = rankOf(face);
  switch (suitOf(face)) {
    case 'dots': return <RankSuit rank={String(n + 1)} k="s" />;
    case 'bamboo': return <RankSuit rank={String(n + 1)} k="h" />;
    case 'chars': return <RankSuit rank={String(n + 1)} k="d" />;
    case 'wind': {
      const k = (['s', 'h', 'd', 'c'] as SuitKey[])[n - 1];
      return (
        <g>
          <circle cx="30" cy="40" r="20" fill="none" stroke={GOLD} strokeWidth="1.2" strokeDasharray="2 3" />
          <Pip k={k} x={30} y={41} s={30} />
          <text x="11" y="18" fontFamily={serif} fontWeight="700" fontSize="15" fill={SUIT_COLOR[k]}>A</text>
        </g>
      );
    }
    case 'dragon': {
      const letter = ['J', 'Q', 'K'][n - 1];
      const c = ['#1d5fb4', '#a31d35', INK][n - 1];
      return (
        <g>
          <Crown y={13} />
          <text x="30" y="63" textAnchor="middle" fontFamily={serif} fontWeight="700" fontSize="40" fill={c}>{letter}</text>
          <path d="M14 70h32" stroke="url(#mjg-gold)" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    }
    case 'flower': {
      // jokers: a jester's star in four colours
      const c = ['#a31d35', '#1d5fb4', '#1f7a3f', PLUM][n - 1];
      return (
        <g>
          <path d="M30 14l5.2 16 16.8.2-13.6 9.9 5.1 16-13.5-9.8-13.5 9.8 5.1-16L8 30.2l16.8-.2z" fill={c} />
          <circle cx="30" cy="38" r="4" fill="url(#mjg-gold)" />
          <text x="30" y="72" textAnchor="middle" fontFamily={serif} fontWeight="700" fontSize="12.5" letterSpacing="1.5" fill={c}>JOKER</text>
        </g>
      );
    }
    default: {
      // bidding cards
      const k = (['c', 'd', 'h', 's'] as SuitKey[])[n - 1];
      return (
        <g>
          <rect x="9" y="12" width="42" height="56" rx="7" fill="none" stroke={GOLD} strokeWidth="1.6" />
          <text x="30" y="44" textAnchor="middle" fontFamily={serif} fontWeight="700" fontSize="30" fill={SUIT_COLOR[k]}>{n}</text>
          <Pip k={k} x={30} y={56} s={18} />
        </g>
      );
    }
  }
}

/* ================================================================== sprite */

/** The shared gradients + the 42 faces of a skin. Render once per screen. */
export const TileSprite = memo(function TileSprite({ skin }: { skin: Skin }) {
  const draw = skin === 'cards' ? cardsFace : classicFace;
  return (
    <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden focusable="false">
      <defs>
        <radialGradient id="mjg-dot" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#fffdf6" /><stop offset="1" stopColor="#efe4c8" /></radialGradient>
        <radialGradient id="mjg-jade" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#7fd6a5" stopOpacity=".9" /><stop offset=".6" stopColor="#1c7a4f" stopOpacity="0" /></radialGradient>
        <radialGradient id="mjg-sun" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#ffd27a" /><stop offset="1" stopColor="#b8232f" stopOpacity="0" /></radialGradient>
        <linearGradient id="mjg-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6e3a6" /><stop offset=".5" stopColor="#d4ac4c" /><stop offset="1" stopColor="#8c6e28" /></linearGradient>
        {Array.from({ length: FACES }, (_, f) => <symbol key={f} id={faceId(skin, f)} viewBox="0 0 60 80">{draw(f)}</symbol>)}
      </defs>
    </svg>
  );
});

/** One face (references the sprite). */
export const Face = memo(function Face({ skin, face }: { skin: Skin; face: number }) {
  return <svg className="mj-face" viewBox="0 0 60 80" aria-hidden focusable="false"><use href={`#${faceId(skin, face)}`} /></svg>;
});

/** Screen-reader name of a face. */
export function faceName(face: number): string {
  const n = rankOf(face);
  switch (suitOf(face)) {
    case 'dots': return `${n} dots`;
    case 'bamboo': return `${n} bamboo`;
    case 'chars': return `${n} characters`;
    case 'wind': return `${['East', 'South', 'West', 'North'][n - 1]} wind`;
    case 'dragon': return `${['Red', 'Green', 'White'][n - 1]} dragon`;
    case 'flower': return `Flower ${n}`;
    default: return `Season ${n}`;
  }
}
