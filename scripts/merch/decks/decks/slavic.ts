/**
 * Slavic Tale — red-and-gold lacquer folk ornament on black (rowan berries, curling grass, golden leaves: the
 * painted-woodware tradition shared across Eastern Europe). Folk-tale courts in kokoshnik and fur caps. Purely
 * decorative: no state, church or political symbols. 36-card Durak / Bridge edition.
 */
import { wordmark } from '../lib/brand.ts';
import { B, CX, CY, H, TH, TW, W, jokerIndex, textIndex, type DeckTheme, type Rank, type Suit } from '../lib/cards.ts';
import { COURT_FRAME, courtCard, flatPainter } from '../lib/court.ts';
import { figure, type FigureSpec } from '../lib/figure.ts';
import { face } from '../lib/font.ts';
import { CLASSIC, isRed, suitAt } from '../lib/suits.ts';
import { dbl, lin, n, quad, rad, ring, rng, rrect, star } from '../lib/svg.ts';

const BLACK = '#141210', BLACK2 = '#2A2420', RED = '#C8202B', RED_D = '#8A1019', GOLD = '#E8B53C', GOLD_HI = '#FBE08A', GOLD_LO = '#A9761E';
const PAPER = '#FBF3E2', GREEN = '#2F6B3A';

// ------------------------------------------------------------------------------------------------ ornament kit
export function leaf(x: number, y: number, len: number, deg: number, fill: string, vein = '') {
  const w = len * 0.3;
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(deg)})"><path d="M0 0C${n(len * 0.3)} ${n(-w)} ${n(len * 0.75)} ${n(-w * 0.8)} ${n(len)} 0C${n(len * 0.75)} ${n(w * 0.8)} ${n(len * 0.3)} ${n(w)} 0 0Z" fill="${fill}"/>`
    + (vein ? `<path d="M${n(len * 0.12)} 0H${n(len * 0.8)}" stroke="${vein}" stroke-width="${n(Math.max(1.2, len * 0.04))}" stroke-linecap="round"/>` : '') + '</g>';
}
export function berry(x: number, y: number, r: number) {
  return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${RED}" stroke="${GOLD}" stroke-width="${n(r * 0.16)}"/><circle cx="${n(x - r * 0.35)}" cy="${n(y - r * 0.35)}" r="${n(r * 0.22)}" fill="#FFE9C9"/>`;
}
function curl(x: number, y: number, r: number, deg: number, col: string, w: number) {
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(deg)})"><path d="M0 0C${n(r)} ${n(-r * 1.2)} ${n(r * 2.4)} ${n(-r * 0.2)} ${n(r * 1.8)} ${n(r * 0.6)}C${n(r * 1.4)} ${n(r * 1.1)} ${n(r * 0.9)} ${n(r * 0.7)} ${n(r * 1.1)} ${n(r * 0.35)}" fill="none" stroke="${col}" stroke-width="${n(w)}" stroke-linecap="round"/></g>`;
}
/** A sprig: curved stem with alternating golden leaves, curls of grass, a cluster of berries at the tip. */
export function sprig(x0: number, y0: number, deg: number, len: number, seed: number, scale = 1) {
  const r = rng(seed);
  const a = (deg * Math.PI) / 180, bend = len * 0.35 * (r() > 0.5 ? 1 : -1);
  const ex = x0 + len * Math.sin(a), ey = y0 - len * Math.cos(a);
  const mx = (x0 + ex) / 2 + bend * Math.cos(a), my = (y0 + ey) / 2 + bend * Math.sin(a);
  let g = `<path d="M${n(x0)} ${n(y0)}Q${n(mx)} ${n(my)} ${n(ex)} ${n(ey)}" fill="none" stroke="${GOLD}" stroke-width="${n(5 * scale)}" stroke-linecap="round"/>`;
  const pt = (t: number) => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * ex, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * ey];
  for (let i = 1; i <= 5; i++) {
    const t = i / 6, [px, py] = pt(t), side = i % 2 ? 1 : -1;
    g += leaf(px, py, (40 + r() * 16) * scale * (1 - t * 0.3), deg - 90 + side * (50 + r() * 20), i % 3 ? `url(#gl)` : RED, i % 3 ? GOLD_LO : GOLD);
    if (i % 2 === 0) g += curl(px, py, 9 * scale, deg + side * 60, GOLD, 3 * scale);
  }
  const k = 13 * scale;
  for (const [dx, dy] of [[0, 0], [k * 1.6, -k * 0.6], [-k * 1.2, -k * 1.2], [k * 0.4, -k * 2.1], [k * 1.9, k * 1.1]]) g += berry(ex + dx, ey + dy, k);
  return g;
}
function flower(cx: number, cy: number, r: number) {
  let g = '';
  for (let i = 0; i < 8; i++) g += leaf(cx, cy, r, i * 45 - 90, i % 2 ? RED : 'url(#gl)', i % 2 ? GOLD : GOLD_LO);
  return g + `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.3)}" fill="${GOLD}"/><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.18)}" fill="${RED}"/>`;
}

const defs = lin('gl', [[0, GOLD_HI], [0.5, GOLD], [1, GOLD_LO]], 0, 0, 1, 1)
  + lin('g', [[0, GOLD_HI], [0.5, GOLD], [1, GOLD_LO]])
  + lin('gs', [[0, GOLD_LO], [0.5, GOLD_HI], [1, GOLD_LO]])
  + rad('lac', [[0, BLACK2], [0.7, BLACK], [1, '#090807]']], 0.5, 0.5, 0.75)
  + rad('paperR', [[0, '#FFFAEE'], [1, PAPER]], 0.5, 0.5, 0.75)
  + `<pattern id="khok" width="64" height="64" patternUnits="userSpaceOnUse">${leaf(10, 30, 26, -40, GOLD)}${leaf(10, 30, 22, 30, GOLD)}<circle cx="44" cy="20" r="7" fill="${RED}" stroke="${GOLD}" stroke-width="1.5"/><circle cx="52" cy="30" r="6" fill="${RED}" stroke="${GOLD}" stroke-width="1.5"/>${curl(36, 50, 7, 10, GOLD, 2.4)}</pattern>`
  + `<pattern id="khokR" width="64" height="64" patternUnits="userSpaceOnUse">${leaf(10, 30, 26, -40, RED)}${leaf(10, 30, 22, 30, RED)}<circle cx="44" cy="20" r="7" fill="${BLACK}"/><circle cx="52" cy="30" r="6" fill="${RED}"/>${curl(36, 50, 7, 10, RED_D, 2.4)}</pattern>`;

const sc = (s: Suit) => (isRed(s) ? RED : BLACK);

function faceBg() {
  const corner = `<g transform="translate(${W - B - 60} ${B + 60}) scale(.62)">${sprig(0, 0, 225, 180, 5)}</g>`;
  return `<rect width="${W}" height="${H}" fill="url(#paperR)"/>`
    + `<path d="${rrect(B + 22, B + 22, TW - 44, TH - 44, 22)}" fill="none" stroke="${GOLD}" stroke-width="3"/>`
    + `<path d="${rrect(B + 30, B + 30, TW - 60, TH - 60, 16)}" fill="none" stroke="${RED}" stroke-width="1.2"/>`
    + dbl(corner, CX, CY);
}

const index = (rank: Rank, s: Suit) => textIndex({ rank, s, font: 'corm700', size: 124, fill: sc(s), suitFill: sc(s), x: B + 86, y: B + 138, suitSize: 56 });
const pip = (s: Suit, x: number, y: number, size: number, flip: boolean) => suitAt(CLASSIC, s, x, y, size, `fill="${sc(s)}"`, flip);

function ace(s: Suit) {
  let mid: string;
  if (s === 'S') {
    const g6 = face('golos600');
    mid = `<circle cx="${CX}" cy="${CY}" r="262" fill="url(#lac)" stroke="url(#g)" stroke-width="6"/>`
      + ring(sprig(CX, CY - 120, 0, 110, 9, 0.7), 6, CX, CY)
      + suitAt(CLASSIC, 'S', CX, CY + 4, 200, `fill="url(#g)" stroke="${GOLD_LO}" stroke-width="1.5"`)
      + wordmark(CX, CY + 360, 38, BLACK, RED)
      + `<path d="${g6.text('SLAVIC TALE · DURAK EDITION 36', CX, CY - 338, 18, { tracking: 0.3, anchor: 'middle' }).d}" fill="${BLACK}" opacity=".65"/>`;
  } else {
    const id = `ac${s}`;
    mid = `<defs><clipPath id="${id}"><path transform="translate(${CX - 150} ${CY - 146}) scale(3)" d="${CLASSIC[s]}"/></clipPath></defs>`
      + suitAt(CLASSIC, s, CX, CY + 4, 300, `fill="${s === 'C' ? BLACK : RED}"`)
      + `<g clip-path="url(#${id})">${flower(CX, CY + 10, 70)}${sprig(CX - 40, CY + 120, -40, 120, 3, 0.7)}${sprig(CX + 40, CY + 120, 40, 120, 4, 0.7)}</g>`;
  }
  return faceBg() + mid + dbl(index('A', s), CX, CY);
}

// ------------------------------------------------------------------------------------------------ courts
const SPECS: Record<'J' | 'Q' | 'K', Record<Suit, Omit<FigureSpec, 'uid'>>> = {
  K: {
    S: { headwear: 'crownFur', hair: 'short', beard: 'full', collar: 'high', item: 'sceptre', item2: 'orb', fur: true, necklace: 'chain', gaze: 1 },
    H: { headwear: 'crownFur', hair: 'curly', beard: 'pointed', collar: 'v', item: 'sword', item2: 'goblet', fur: true, gaze: -1 },
    D: { headwear: 'crown', hair: 'short', beard: 'full', collar: 'square', item: 'staff', item2: 'orb', fur: true, gaze: 1 },
    C: { headwear: 'crownFur', hair: 'curly', beard: 'full', collar: 'v', item: 'axe', item2: 'goblet', fur: true, necklace: 'chain', gaze: -1 },
  },
  Q: {
    S: { headwear: 'kokoshnik', hair: 'braids', beard: 'none', collar: 'round', item: 'fan', item2: 'flower', fem: true, necklace: 'beads', gaze: 1 },
    H: { headwear: 'kokoshnik', hair: 'long', beard: 'none', collar: 'high', item: 'mirror', item2: 'rose', fem: true, necklace: 'beads', gaze: -1 },
    D: { headwear: 'kokoshnik', hair: 'braids', beard: 'none', collar: 'round', item: 'spindle', item2: 'flower', fem: true, necklace: 'beads', gaze: 1 },
    C: { headwear: 'kokoshnik', hair: 'bun', beard: 'none', collar: 'v', item: 'key', item2: 'rose', fem: true, necklace: 'beads', gaze: -1 },
  },
  J: {
    S: { headwear: 'cap', hair: 'curly', beard: 'none', collar: 'high', item: 'axe', item2: 'key', gaze: 1 },
    H: { headwear: 'folkHat', hair: 'curly', beard: 'moustache', collar: 'v', item: 'lantern', item2: 'flower', gaze: -1 },
    D: { headwear: 'cap', hair: 'short', beard: 'none', collar: 'high', item: 'staff', item2: 'goblet', gaze: 1 },
    C: { headwear: 'folkHat', hair: 'curly', beard: 'goatee', collar: 'v', item: 'sword', item2: 'key', gaze: -1 },
  },
};
const ROBES: Record<Suit, { robe: string; robe2: string; robe3: string; pat: string }> = {
  S: { robe: BLACK2, robe2: RED, robe3: GOLD, pat: 'url(#khok)' },
  H: { robe: RED, robe2: BLACK2, robe3: GOLD, pat: 'url(#khok)' },
  D: { robe: GOLD, robe2: RED, robe3: BLACK2, pat: 'url(#khokR)' },
  C: { robe: GREEN, robe2: RED, robe3: GOLD, pat: 'url(#khok)' },
};
function painter(s: Suit, robe?: string) {
  const r = ROBES[s];
  return flatPainter({
    outline: BLACK, ow: 2.6, line: BLACK, lw: 2.6, blush: 0.38,
    fills: {
      skin: '#F7D9BF', hair: s === 'D' ? '#C99A4A' : '#5A3620', beard: s === 'D' ? '#B98A3E' : '#4A2E1C', lips: RED, blush: '#E8564F', eye: '#FFFFFF', iris: '#2A3A5A',
      crown: 'url(#g)', crown2: RED, jewel: RED, jewel2: GREEN, pearl: '#FFF6E2',
      robe: robe ?? r.robe, robe2: r.robe2, robe3: r.robe3, trim: GOLD, fur: '#FFF8EC', lace: '#FFF8EC',
      metal: '#E3E6EA', wood: '#8A4B1E', flower: RED, flower2: GOLD, leaf: GREEN, fruit: RED, ribbon: RED,
    },
    strokes: { trim: GOLD, crown: GOLD_LO },
  });
}
function under() {
  // gold sprigs curling up around the figure on black lacquer (half-figure local coords)
  return sprig(-196, -190, 18, 270, 21, 0.85) + sprig(196, -190, -18, 270, 22, 0.85) + sprig(-200, -40, 8, 150, 23, 0.7) + sprig(200, -40, -8, 150, 24, 0.7) + `<circle cx="0" cy="-300" r="150" fill="none" stroke="${GOLD}" stroke-width="2" opacity=".5"/>`;
}
function divider(s: Suit | null) {
  const f = COURT_FRAME;
  return `<path d="M${f.x} ${CY}H${f.x + f.w}" stroke="${GOLD}" stroke-width="6"/>`
    + `<circle cx="${CX}" cy="${CY}" r="36" fill="${PAPER}" stroke="url(#g)" stroke-width="5"/>`
    + (s ? suitAt(CLASSIC, s, CX, CY + 1, 36, `fill="${sc(s)}"`) : berry(CX, CY, 16));
}
function court(rank: 'J' | 'Q' | 'K', s: Suit) {
  const half = figure({ ...SPECS[rank][s], uid: `c${rank}${s}`, pattern: ROBES[s].pat, patternOpacity: 0.9 }, painter(s));
  return courtCard({ uid: `k${rank}${s}`, bg: faceBg(), panel: 'url(#lac)', under: under(), half, divider: divider(s), border: `stroke="url(#g)" stroke-width="6"`, index: index(rank, s) });
}
function joker(k: 1 | 2) {
  const half = figure({ headwear: 'jester', hair: 'curly', beard: 'none', collar: 'ruff', item: 'lantern', item2: 'goblet', gaze: k === 1 ? 1 : -1, uid: `j${k}`, pattern: 'url(#khok)', patternOpacity: 0.9 },
    painter(k === 1 ? 'H' : 'D', k === 1 ? RED : GREEN));
  return courtCard({ uid: `jk${k}`, bg: faceBg(), panel: 'url(#lac)', under: under(), half, divider: divider(null), border: `stroke="url(#g)" stroke-width="6"`, index: '' })
    + jokerIndex(k === 1 ? RED : BLACK, 'golos800', 38, B + 74);
}

// ------------------------------------------------------------------------------------------------ back
function back() {
  const ix = B + 50, iy = B + 50, iw = TW - 100, ih = TH - 100;
  const inner = rrect(ix, iy, iw, ih, 18);
  const branch = sprig(CX - 24, CY - 150, -24, 250, 31, 1) + sprig(CX + 30, CY - 170, 30, 200, 32, 0.85) + sprig(CX - 120, CY - 40, -70, 180, 33, 0.85);
  let berries = '';
  berries = ring(berry(CX, CY - 132, 13), 16, CX, CY);
  const centre = `<circle cx="${CX}" cy="${CY}" r="112" fill="${BLACK}" stroke="url(#gs)" stroke-width="4"/>` + flower(CX, CY, 92) + berries;
  let edge = '';
  for (let i = 0; i < 9; i++) edge += curl(ix + (iw - 8 * 74) / 2 - 12 + i * 74, iy + 26, 12, 0, GOLD, 3.2);
  return `<defs><clipPath id="bkc"><path d="${inner}"/></clipPath></defs>`
    + `<rect width="${W}" height="${H}" fill="url(#lac)"/>`
    + `<g clip-path="url(#bkc)">${quad(branch + flower(ix + 70, iy + 120, 34), CX, CY)}${dbl(edge, CX, CY)}</g>`
    + `<path d="${rrect(B + 22, B + 22, TW - 44, TH - 44, 24)}" fill="none" stroke="url(#gs)" stroke-width="6"/>`
    + `<path d="${inner}" fill="none" stroke="${RED}" stroke-width="3"/>`
    + centre + `<path d="${star(CX, CY, 8, 30, 14)}" fill="${GOLD_HI}"/>`;
}

export const slavic: DeckTheme = {
  id: 'slavic',
  productId: 'deck-slavic',
  name: 'Slavic Tale',
  boxLine: 'Red berries and gold leaves on black lacquer',
  markets: ['ru', 'uk', 'be', 'kk', 'bg'],
  edition36: true,
  colours: { primary: BLACK, secondary: RED, accent: GOLD, paper: '#F6ECD8' },
  defs,
  faceBg: () => faceBg(),
  index,
  pip,
  pipField: { dx: 158, top: CY - 336, bottom: CY + 336, size: 120 },
  ace,
  court,
  joker,
  back,
  box: {
    front: () => back(),
    panel: (w, h) => `<rect width="${n(w)}" height="${n(h)}" fill="url(#lac)"/>`,
    ink: PAPER,
    accent: GOLD,
    plate: BLACK,
    rule: GOLD,
  },
  scene: { surface: 'wood', base: '#5B3A22', hi: '#8A5A33', lo: '#2A170C', fan: ['AS', 'KH', 'QD', 'JS', 'JK1'], spread: ['AS', 'KS', 'QH', 'JD', 'AD', 'QS', 'KC', 'JK2'] },
};
