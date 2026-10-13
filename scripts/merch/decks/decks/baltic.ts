/**
 * Baltic Folk — woven-belt geometry (Lielvārde-belt-like diamonds and zigzags), the Auseklis morning star, oak
 * wreaths and amber on linen and deep red. Shared heritage of Latvia, Lithuania and Estonia; no flags, no state
 * symbols. Doubles as the Zolīte deck (all 26 Zolīte cards are in the 36-card edition).
 */
import { wordmark } from '../lib/brand.ts';
import { B, CX, CY, H, TH, TW, W, jokerIndex, textIndex, type DeckTheme, type Rank, type Suit } from '../lib/cards.ts';
import { COURT_FRAME, courtCard, flatPainter } from '../lib/court.ts';
import { figure, type FigureSpec } from '../lib/figure.ts';
import { face } from '../lib/font.ts';
import { CLASSIC, isRed, suitAt } from '../lib/suits.ts';
import { dbl, n, quad, rad, ring, rrect, star } from '../lib/svg.ts';

const RED = '#A3202E', RED_D = '#6E1420', LINEN = '#F3EAD8', LINEN_HI = '#FBF6EA', INK = '#1E1A17';
const AMBER = '#D98A1E', AMBER_HI = '#F4C45C', OAK = '#2F5D3A', WHITE = '#FFFDF7';

/** {8/3} star polygon — the Auseklis morning-star sign, drawn as one interlaced line. */
export function auseklis(cx: number, cy: number, r: number, attrs: string) {
  const ps: string[] = [];
  for (let i = 0; i <= 8; i++) {
    const a = ((i * 3 * 45 - 22.5) * Math.PI) / 180;
    ps.push(`${n(cx + r * Math.sin(a))} ${n(cy - r * Math.cos(a))}`);
  }
  return `<path d="M${ps.join('L')}Z" fill="none" stroke-linejoin="miter" ${attrs}/>`;
}

const tile = (id: string, col: string, bg = 'none') =>
  `<pattern id="${id}" width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="translate(${n(CX - 28)} ${n(CY - 28)})">`
  + (bg !== 'none' ? `<rect width="56" height="56" fill="${bg}"/>` : '')
  + `<path d="M28 6L50 28L28 50L6 28Z" fill="none" stroke="${col}" stroke-width="4"/><path d="M28 18L38 28L28 38L18 28Z" fill="${col}"/>`
  + `<path d="M0 -6L6 0L0 6L-6 0ZM56 -6L62 0L56 6L50 0ZM0 50L6 56L0 62L-6 56ZM56 50L62 56L56 62L50 56Z" fill="${col}"/>`
  + `<path d="M28 0V4M28 52V56M0 28H4M52 28H56" stroke="${col}" stroke-width="3"/></pattern>`;

const defs = tile('beltW', WHITE) + tile('beltR', RED) + tile('beltRbg', WHITE, RED)
  + rad('amberR', [[0, AMBER_HI], [0.6, AMBER], [1, '#9C5A0E']], 0.4, 0.35, 0.7)
  + rad('amberC', [[0, AMBER_HI], [0.6, AMBER], [1, '#9C5A0E']], 0.5, 0.5, 0.7)
  + rad('linenR', [[0, LINEN_HI], [1, LINEN]], 0.5, 0.5, 0.75)
  + rad('redR', [[0, '#C02C3C'], [0.75, RED], [1, RED_D]], 0.5, 0.5, 0.75)
  + `<pattern id="zig" width="24" height="16" patternUnits="userSpaceOnUse"><path d="M0 12L6 4L12 12L18 4L24 12" fill="none" stroke="${RED}" stroke-width="2.6"/></pattern>`;

const sc = (s: Suit) => (isRed(s) ? RED : INK);

/** Linen face with a woven border of small red diamonds between two rules. */
function faceBg() {
  const x = B + 16, y = B + 16, w = TW - 32, h = TH - 32;
  let dots = '';
  for (let i = 0; i < 26; i++) { const yy = y + 60 + (i * (h - 120)) / 25; dots += `M${n(x + 11)} ${n(yy - 6)}l6 6l-6 6l-6 -6Z`; }
  const side = `<path d="${dots}" fill="${RED}"/>`;
  return `<rect width="${W}" height="${H}" fill="url(#linenR)"/>`
    + `<path d="${rrect(x, y, w, h, 22)}" fill="none" stroke="${RED}" stroke-width="2.4"/>`
    + `<path d="${rrect(x + 22, y + 22, w - 44, h - 44, 12)}" fill="none" stroke="${RED}" stroke-width="1.2" opacity=".7"/>`
    + side + `<g transform="matrix(-1 0 0 1 ${W} 0)">${side}</g>`;
}

const index = (rank: Rank, s: Suit) => textIndex({ rank, s, font: 'golos800', size: 98, fill: sc(s), suitFill: sc(s), x: B + 90, y: B + 136, suitSize: 54, gap: 18, tenSqueeze: 0.78 });

/** Pips: solid suit with a tiny linen diamond stitched into it. */
const pip = (s: Suit, x: number, y: number, size: number, flip: boolean) => {
  const dy = (s === 'H' ? -0.06 : s === 'S' ? 0.06 : s === 'C' ? 0.04 : 0) * size * (flip ? -1 : 1);
  return suitAt(CLASSIC, s, x, y, size, `fill="${sc(s)}"`, flip)
    + `<path d="M${n(x)} ${n(y + dy - 9)}l9 9l-9 9l-9 -9Z" fill="${LINEN}"/>`;
};

function ace(s: Suit) {
  let mid: string;
  const ringD = ring(`<path d="M${CX} ${CY - 286}l10 14l-10 14l-10 -14Z" fill="${RED}"/>`, 24, CX, CY);
  if (s === 'S') {
    const g6 = face('golos700');
    mid = `<circle cx="${CX}" cy="${CY}" r="258" fill="url(#redR)"/><circle cx="${CX}" cy="${CY}" r="258" fill="url(#beltW)" opacity=".22"/>`
      + `<circle cx="${CX}" cy="${CY}" r="236" fill="none" stroke="${WHITE}" stroke-width="3"/>`
      + auseklis(CX, CY, 224, `stroke="url(#amberR)" stroke-width="16"`)
      + `<circle cx="${CX}" cy="${CY}" r="104" fill="${RED}"/>`
      + suitAt(CLASSIC, 'S', CX, CY + 4, 150, `fill="${WHITE}"`)
      + wordmark(CX, CY + 352, 36, INK, RED, 'golos700')
      + `<path d="${g6.text('BALTIC FOLK · ZOLĪTE READY', CX, CY - 330, 19, { tracking: 0.32, anchor: 'middle' }).d}" fill="${INK}" opacity=".7"/>`;
  } else {
    const id = `ac${s}`;
    mid = `<defs><clipPath id="${id}"><path transform="translate(${CX - 150} ${CY - 146}) scale(3)" d="${CLASSIC[s]}"/></clipPath></defs>`
      + suitAt(CLASSIC, s, CX, CY + 4, 300, `fill="${sc(s)}"`)
      + `<g clip-path="url(#${id})"><rect x="${CX - 160}" y="${CY - 160}" width="320" height="320" fill="url(#beltW)" opacity=".85"/></g>`
      + suitAt(CLASSIC, s, CX, CY + 4, 300, `fill="none" stroke="${AMBER}" stroke-width="1.6"`);
  }
  return faceBg() + `<circle cx="${CX}" cy="${CY}" r="300" fill="none" stroke="${RED}" stroke-width="1.5"/>` + ringD + mid + dbl(index('A', s), CX, CY);
}

// ------------------------------------------------------------------------------------------------ courts
const SPECS: Record<'J' | 'Q' | 'K', Record<Suit, Omit<FigureSpec, 'uid'>>> = {
  K: {
    S: { headwear: 'wreathOak', hair: 'short', beard: 'full', collar: 'v', item: 'sword', item2: 'amber', fur: true, necklace: 'chain', gaze: 1 },
    H: { headwear: 'crownLeaf', hair: 'curly', beard: 'full', collar: 'square', item: 'oak', item2: 'goblet', fur: true, gaze: -1 },
    D: { headwear: 'wreathOak', hair: 'short', beard: 'pointed', collar: 'high', item: 'axe', item2: 'orb', fur: true, gaze: 1 },
    C: { headwear: 'crownLeaf', hair: 'curly', beard: 'full', collar: 'v', item: 'staff', item2: 'amber', fur: true, necklace: 'chain', gaze: -1 },
  },
  Q: {
    S: { headwear: 'flowerWreath', hair: 'braids', beard: 'none', collar: 'round', item: 'spindle', item2: 'amber', fem: true, necklace: 'beads', gaze: 1 },
    H: { headwear: 'flowerWreath', hair: 'braids', beard: 'none', collar: 'round', item: 'oak', item2: 'flower', fem: true, necklace: 'beads', gaze: -1 },
    D: { headwear: 'tiara', hair: 'braids', beard: 'none', collar: 'v', item: 'key', item2: 'amber', fem: true, necklace: 'beads', gaze: 1 },
    C: { headwear: 'flowerWreath', hair: 'long', beard: 'none', collar: 'round', item: 'mirror', item2: 'flower', fem: true, necklace: 'beads', gaze: -1 },
  },
  J: {
    S: { headwear: 'folkHat', hair: 'short', beard: 'none', collar: 'v', item: 'axe', item2: 'key', gaze: 1 },
    H: { headwear: 'folkHat', hair: 'curly', beard: 'moustache', collar: 'round', item: 'staff', item2: 'flower', gaze: -1 },
    D: { headwear: 'cap', hair: 'curly', beard: 'none', collar: 'v', item: 'oak', item2: 'amber', gaze: 1 },
    C: { headwear: 'folkHat', hair: 'short', beard: 'goatee', collar: 'square', item: 'sword', item2: 'goblet', gaze: -1 },
  },
};

const ROBES: Record<Suit, { robe: string; robe2: string; robe3: string; pat: string }> = {
  S: { robe: WHITE, robe2: RED, robe3: INK, pat: 'url(#beltR)' },
  H: { robe: RED, robe2: WHITE, robe3: AMBER, pat: 'url(#beltW)' },
  D: { robe: OAK, robe2: RED, robe3: WHITE, pat: 'url(#beltW)' },
  C: { robe: '#2B2622', robe2: RED, robe3: WHITE, pat: 'url(#beltW)' },
};

function painter(s: Suit, jok = 0) {
  const r = ROBES[s];
  return flatPainter({
    outline: INK, ow: 2.8, line: INK, lw: 2.6, blush: 0.32,
    fills: {
      skin: '#F4D7B9', hair: s === 'D' || s === 'H' ? '#C9963F' : '#8A5A2B', beard: '#B07A3A', lips: '#B0303C', blush: '#E36F6F', eye: '#FFFFFF', iris: '#2D5A7A',
      crown: AMBER_HI, crown2: AMBER, jewel: RED, jewel2: AMBER, pearl: WHITE,
      robe: jok ? (jok === 1 ? RED : OAK) : r.robe, robe2: jok ? WHITE : r.robe2, robe3: r.robe3, trim: RED, fur: WHITE, lace: WHITE,
      metal: '#D9DEE2', wood: '#7A4A22', flower: RED, flower2: WHITE, leaf: OAK, fruit: AMBER, ribbon: RED,
    },
    strokes: { trim: s === 'H' || jok === 1 ? WHITE : RED },
  });
}

function sunDisc() {
  // the rising sun behind the head: concentric rings + short rays (half-figure local coords)
  let g = `<circle cx="0" cy="-300" r="160" fill="${LINEN_HI}"/>`;
  g += ring(`<path d="M0 -472L7 -458L-7 -458Z" fill="${RED}"/>`, 32, 0, -300);
  g += `<circle cx="0" cy="-300" r="160" fill="none" stroke="${RED}" stroke-width="3"/><circle cx="0" cy="-300" r="146" fill="none" stroke="${RED}" stroke-width="1.2" stroke-dasharray="4 6"/>`;
  return g;
}

function divider(s: Suit | null) {
  const f = COURT_FRAME;
  return `<rect x="${f.x}" y="${CY - 15}" width="${f.w}" height="30" fill="url(#beltRbg)"/>`
    + `<path d="M${f.x} ${CY - 15}H${f.x + f.w}M${f.x} ${CY + 15}H${f.x + f.w}" stroke="${INK}" stroke-width="2"/>`
    + `<circle cx="${CX}" cy="${CY}" r="34" fill="${LINEN}" stroke="${RED}" stroke-width="4"/>`
    + (s ? suitAt(CLASSIC, s, CX, CY + 1, 34, `fill="${sc(s)}"`) : auseklis(CX, CY, 24, `stroke="${RED}" stroke-width="4"`));
}

function court(rank: 'J' | 'Q' | 'K', s: Suit) {
  const half = figure({ ...SPECS[rank][s], uid: `c${rank}${s}`, pattern: ROBES[s].pat, patternOpacity: 0.55 }, painter(s));
  return courtCard({ uid: `k${rank}${s}`, bg: faceBg(), panel: '#EFE3CB', under: sunDisc(), half, divider: divider(s), border: `stroke="${RED}" stroke-width="5"`, index: index(rank, s) });
}

function joker(k: 1 | 2) {
  const half = figure({ headwear: 'jester', hair: 'curly', beard: 'none', collar: 'ruff', item: 'oak', item2: 'amber', gaze: k === 1 ? 1 : -1, uid: `j${k}`, pattern: 'url(#beltW)', patternOpacity: 0.5 },
    painter(k === 1 ? 'H' : 'D', k));
  return courtCard({ uid: `jk${k}`, bg: faceBg(), panel: k === 1 ? '#F1DCC6' : '#E4E8D2', under: sunDisc(), half, divider: divider(null), border: `stroke="${RED}" stroke-width="5"`, index: '' })
    + jokerIndex(k === 1 ? RED : OAK, 'golos800', 38, B + 72);
}

// ------------------------------------------------------------------------------------------------ back
function back() {
  const ix = B + 54, iy = B + 54, iw = TW - 108, ih = TH - 108;
  const inner = rrect(ix, iy, iw, ih, 16);
  const cornerStar = auseklis(ix + 70, iy + 70, 44, `stroke="${AMBER_HI}" stroke-width="7"`) + `<circle cx="${ix + 70}" cy="${iy + 70}" r="9" fill="${WHITE}"/>`;
  const medal = `<circle cx="${CX}" cy="${CY}" r="236" fill="${RED_D}"/>`
    + ring(`<path d="M${CX} ${CY - 232}l9 12l-9 12l-9 -12Z" fill="${WHITE}"/>`, 36, CX, CY)
    + `<circle cx="${CX}" cy="${CY}" r="200" fill="url(#linenR)" stroke="${WHITE}" stroke-width="4"/>`
    + `<circle cx="${CX}" cy="${CY}" r="186" fill="none" stroke="${RED}" stroke-width="2"/>`
    + auseklis(CX, CY, 172, `stroke="${RED}" stroke-width="22"`)
    + auseklis(CX, CY, 172, `stroke="url(#amberC)" stroke-width="10"`)
    + `<path d="${star(CX, CY, 4, 50, 22, 45)}" fill="${RED}"/><circle cx="${CX}" cy="${CY}" r="14" fill="${AMBER_HI}"/>`;
  return `<defs><clipPath id="bkc"><path d="${inner}"/></clipPath></defs>`
    + `<rect width="${W}" height="${H}" fill="url(#redR)"/>`
    + `<g clip-path="url(#bkc)"><rect width="${W}" height="${H}" fill="url(#beltW)" opacity=".34"/>${quad(cornerStar, CX, CY)}</g>`
    + `<path d="${rrect(B + 24, B + 24, TW - 48, TH - 48, 24)}" fill="none" stroke="${WHITE}" stroke-width="4"/>`
    + `<path d="${inner}" fill="none" stroke="${WHITE}" stroke-width="2"/>`
    + medal;
}

export const baltic: DeckTheme = {
  id: 'baltic',
  productId: 'deck-baltic',
  name: 'Baltic Folk',
  boxLine: 'Woven-belt ornament, oak and amber · Zolīte ready',
  markets: ['lv', 'lt', 'et', 'en'],
  edition36: true,
  colours: { primary: RED, secondary: LINEN, accent: AMBER, paper: '#F1E8D4' },
  defs,
  faceBg: () => faceBg(),
  index,
  pip,
  pipField: { dx: 156, top: CY - 334, bottom: CY + 334, size: 118 },
  ace,
  court,
  joker,
  back,
  box: {
    front: () => back(),
    panel: (w, h) => `<rect width="${n(w)}" height="${n(h)}" fill="${RED}"/><rect width="${n(w)}" height="${n(h)}" fill="url(#beltW)" opacity=".18"/>`,
    ink: WHITE,
    accent: AMBER_HI,
    plate: RED_D,
    rule: WHITE,
  },
  scene: { surface: 'linen', base: '#E7DCC4', hi: '#F6EEDB', lo: '#B9A27E', fan: ['AS', 'KH', 'QS', 'JD', 'JK1'], spread: ['AS', 'KS', 'QH', 'JD', 'AH', 'QS', 'KD', 'JK2'] },
};
