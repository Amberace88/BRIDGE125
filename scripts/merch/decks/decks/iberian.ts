/**
 * Iberian Fiesta — cobalt azulejo tiles, a red-and-gold sun, polka-dot flamenco ruffles, the guitar and the fan.
 * Vivid and warm, in the spirit of the ROJO Y GUALDA designs. Original figures, no bullfighting.
 */
import { wordmark } from '../lib/brand.ts';
import { B, CX, CY, H, TH, TW, W, jokerIndex, textIndex, type DeckTheme, type Rank, type Suit } from '../lib/cards.ts';
import { COURT_FRAME, courtCard, flatPainter, rays } from '../lib/court.ts';
import { figure, type FigureSpec } from '../lib/figure.ts';
import { face } from '../lib/font.ts';
import { CLASSIC, isRed, suitAt } from '../lib/suits.ts';
import { dbl, n, quad, rad, ring, rrect, star } from '../lib/svg.ts';

const COBALT = '#1E4FA3', COBALT_D = '#123577', SKY = '#7DB2E6', WHITE = '#FBF7EE', RED = '#D7263D', RED_D = '#9E1528';
const YELLOW = '#F6B911', ORANGE = '#F07A28', GREEN = '#2E8B57', INK = '#1A1A1A';

/** One azulejo tile (s × s, origin top-left): corner quarter-circles that join into rings, a centre flower. */
export function azulejo(s: number, x = 0, y = 0) {
  const k = s / 160;
  let g = `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${WHITE}"/>`;
  for (const [cx, cy] of [[x, y], [x + s, y], [x, y + s], [x + s, y + s]]) {
    g += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(58 * k)}" fill="${COBALT}"/><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(42 * k)}" fill="${YELLOW}"/><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(26 * k)}" fill="${COBALT}"/><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(10 * k)}" fill="${WHITE}"/>`;
  }
  const c = [x + s / 2, y + s / 2];
  for (let i = 0; i < 8; i++) {
    g += `<ellipse cx="${n(c[0])}" cy="${n(c[1] - 30 * k)}" rx="${n(10 * k)}" ry="${n(24 * k)}" fill="${i % 2 ? SKY : COBALT}" transform="rotate(${i * 45} ${n(c[0])} ${n(c[1])})"/>`;
  }
  g += `<circle cx="${n(c[0])}" cy="${n(c[1])}" r="${n(13 * k)}" fill="${ORANGE}"/><circle cx="${n(c[0])}" cy="${n(c[1])}" r="${n(6 * k)}" fill="${WHITE}"/>`;
  for (const [mx, my, r] of [[c[0], y, 0], [x + s, c[1], 90], [c[0], y + s, 180], [x, c[1], 270]]) {
    g += `<path transform="rotate(${r} ${n(mx)} ${n(my)})" d="M${n(mx)} ${n(my + 6 * k)}C${n(mx + 10 * k)} ${n(my + 16 * k)} ${n(mx + 6 * k)} ${n(my + 28 * k)} ${n(mx)} ${n(my + 34 * k)}C${n(mx - 6 * k)} ${n(my + 28 * k)} ${n(mx - 10 * k)} ${n(my + 16 * k)} ${n(mx)} ${n(my + 6 * k)}Z" fill="${COBALT}"/>`;
  }
  return g;
}

const dots = (id: string, col: string, r = 5, step = 26) => `<pattern id="${id}" width="${step}" height="${step}" patternUnits="userSpaceOnUse"><circle cx="${step / 4}" cy="${step / 4}" r="${r}" fill="${col}"/><circle cx="${(step * 3) / 4}" cy="${(step * 3) / 4}" r="${r}" fill="${col}"/></pattern>`;
const defs = `<pattern id="azu" width="160" height="160" patternUnits="userSpaceOnUse" patternTransform="translate(${n(CX - 80)} ${n(CY - 80)})">${azulejo(160)}</pattern>`
  + `<pattern id="azuS" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="translate(${n(CX - 40)} ${n(CY - 40)})">${azulejo(80)}</pattern>`
  + dots('dW', WHITE) + dots('dR', RED) + dots('dY', YELLOW) + dots('dK', INK, 4, 22)
  + `<pattern id="str" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="11" height="22" fill="${YELLOW}"/><rect x="11" width="11" height="22" fill="${RED}"/></pattern>`
  + rad('sunR', [[0, '#FFE27A'], [0.55, YELLOW], [1, ORANGE]], 0.5, 0.5, 0.5)
  + rad('glaze', [[0, '#FFFFFF'], [1, WHITE]], 0.35, 0.3, 0.9)
  + rad('cobR', [[0, '#3A6FC4'], [0.75, COBALT], [1, COBALT_D]], 0.5, 0.5, 0.75);

const sc = (s: Suit) => (isRed(s) ? RED : INK);

function faceBg() {
  const t = 64;
  const corner = `<g transform="translate(${W - B - 34 - t} ${B + 34})">${azulejo(t)}<rect width="${t}" height="${t}" fill="none" stroke="${COBALT}" stroke-width="2"/></g>`;
  return `<rect width="${W}" height="${H}" fill="url(#glaze)"/>` + dbl(corner, CX, CY)
    + `<path d="${rrect(B + 20, B + 20, TW - 40, TH - 40, 20)}" fill="none" stroke="${COBALT}" stroke-width="3"/>`;
}

const index = (rank: Rank, s: Suit) => textIndex({ rank, s, font: 'golos800', size: 100, fill: sc(s), suitFill: sc(s), x: B + 88, y: B + 136, suitSize: 56, gap: 18, tenSqueeze: 0.76 });
const pip = (s: Suit, x: number, y: number, size: number, flip: boolean) => suitAt(CLASSIC, s, x, y, size, `fill="${sc(s)}"`, flip);

function ace(s: Suit) {
  const tile = `<g transform="rotate(45 ${CX} ${CY})"><rect x="${CX - 190}" y="${CY - 190}" width="380" height="380" fill="url(#azu)" stroke="${COBALT}" stroke-width="6"/></g>`;
  let mid: string;
  if (s === 'S') {
    const g8 = face('golos800');
    mid = rays(CX, CY, 24, 330, 7, `fill="${YELLOW}" opacity=".55"`) + tile
      + `<circle cx="${CX}" cy="${CY}" r="150" fill="url(#sunR)" stroke="${RED}" stroke-width="6"/>`
      + suitAt(CLASSIC, 'S', CX, CY + 4, 190, `fill="${RED}" stroke="${INK}" stroke-width="2.5"`)
      + wordmark(CX, CY + 380, 38, INK, RED, 'golos800')
      + `<path d="${g8.text('¡FIESTA!', CX, CY - 340, 32, { tracking: 0.2, anchor: 'middle' }).d}" fill="${COBALT}"/>`;
  } else {
    mid = tile + `<circle cx="${CX}" cy="${CY}" r="140" fill="${WHITE}" stroke="${COBALT}" stroke-width="6"/>`
      + suitAt(CLASSIC, s, CX, CY + 4, 190, `fill="${sc(s)}"`);
  }
  return faceBg() + mid + dbl(index('A', s), CX, CY);
}

// ------------------------------------------------------------------------------------------------ courts
const SPECS: Record<'J' | 'Q' | 'K', Record<Suit, Omit<FigureSpec, 'uid'>>> = {
  K: {
    S: { headwear: 'crown', hair: 'short', beard: 'pointed', collar: 'ruff', item: 'sword', item2: 'orb', fur: true, necklace: 'chain', gaze: 1 },
    H: { headwear: 'crown', hair: 'curly', beard: 'full', collar: 'v', item: 'sceptre', item2: 'goblet', fur: true, gaze: -1 },
    D: { headwear: 'crownLeaf', hair: 'short', beard: 'moustache', collar: 'square', item: 'staff', item2: 'orb', fur: true, gaze: 1 },
    C: { headwear: 'crown', hair: 'curly', beard: 'goatee', collar: 'ruff', item: 'sword', item2: 'goblet', fur: true, necklace: 'chain', gaze: -1 },
  },
  Q: {
    S: { headwear: 'peineta', hair: 'bun', beard: 'none', collar: 'ruff', item: 'fan', item2: 'rose', fem: true, necklace: 'beads', gaze: 1 },
    H: { headwear: 'peineta', hair: 'wavy', beard: 'none', collar: 'v', item: 'fan', item2: 'flower', fem: true, necklace: 'beads', gaze: -1 },
    D: { headwear: 'peineta', hair: 'bun', beard: 'none', collar: 'ruff', item: 'mirror', item2: 'rose', fem: true, necklace: 'beads', gaze: 1 },
    C: { headwear: 'peineta', hair: 'long', beard: 'none', collar: 'round', item: 'fan', item2: 'rose', fem: true, necklace: 'beads', gaze: -1 },
  },
  J: {
    S: { headwear: 'brimHat', hair: 'short', beard: 'none', collar: 'lapel', item: 'guitar', item2: 'rose', gaze: 1 },
    H: { headwear: 'brimHat', hair: 'curly', beard: 'moustache', collar: 'v', item: 'guitar', item2: 'key', gaze: -1 },
    D: { headwear: 'beret', hair: 'curly', beard: 'none', collar: 'lapel', item: 'guitar', item2: 'goblet', gaze: 1 },
    C: { headwear: 'brimHat', hair: 'short', beard: 'goatee', collar: 'v', item: 'guitar', item2: 'rose', gaze: -1 },
  },
};
const ROBES: Record<Suit, { robe: string; robe2: string; robe3: string; pat: string }> = {
  S: { robe: INK, robe2: RED, robe3: YELLOW, pat: 'url(#dR)' },
  H: { robe: RED, robe2: YELLOW, robe3: INK, pat: 'url(#dW)' },
  D: { robe: COBALT, robe2: YELLOW, robe3: RED, pat: "url(#dW)" },
  C: { robe: GREEN, robe2: RED, robe3: WHITE, pat: 'url(#dY)' },
};
function painter(s: Suit, robe?: string) {
  const r = ROBES[s];
  return flatPainter({
    outline: INK, ow: 3, line: INK, lw: 2.8, blush: 0.4,
    fills: {
      skin: '#F1C9A1', hair: '#24160F', beard: '#24160F', lips: RED, blush: '#F0705A', eye: '#FFFFFF', iris: '#3A2414',
      crown: YELLOW, crown2: RED, jewel: RED, jewel2: GREEN, pearl: WHITE,
      robe: robe ?? r.robe, robe2: r.robe2, robe3: r.robe3, trim: YELLOW, fur: WHITE, lace: WHITE,
      metal: '#DDE2E6', wood: '#9A5A24', flower: RED, flower2: YELLOW, leaf: GREEN, fruit: ORANGE, ribbon: RED,
    },
    strokes: { trim: s === 'D' ? RED : YELLOW, crown: INK },
  });
}
function under() {
  return rays(0, -300, 20, 520, 8, `fill="${YELLOW}" opacity=".45"`)
    + `<circle cx="0" cy="-300" r="148" fill="url(#sunR)"/><circle cx="0" cy="-300" r="148" fill="none" stroke="${RED}" stroke-width="5"/>`
    + ring(`<circle cx="0" cy="-460" r="7" fill="${RED}"/>`, 24, 0, -300);
}
function divider(s: Suit | null) {
  const f = COURT_FRAME;
  return `<rect x="${f.x}" y="${CY - 9}" width="${f.w}" height="18" fill="url(#str)"/><path d="M${f.x} ${CY - 9}H${f.x + f.w}M${f.x} ${CY + 9}H${f.x + f.w}" stroke="${INK}" stroke-width="2"/>`
    + `<circle cx="${CX}" cy="${CY}" r="36" fill="${WHITE}" stroke="${COBALT}" stroke-width="5"/>`
    + (s ? suitAt(CLASSIC, s, CX, CY + 1, 36, `fill="${sc(s)}"`) : `<path d="${star(CX, CY, 8, 24, 12)}" fill="${RED}"/>`);
}
const panel = `url(#azuS)`;
function court(rank: 'J' | 'Q' | 'K', s: Suit) {
  const half = figure({ ...SPECS[rank][s], uid: `c${rank}${s}`, pattern: ROBES[s].pat, patternOpacity: 0.9 }, painter(s));
  return courtCard({ uid: `k${rank}${s}`, bg: faceBg(), panel, under: `<rect x="-230" y="-480" width="460" height="480" fill="${WHITE}" opacity=".55"/>` + under(), half, divider: divider(s), border: `stroke="${COBALT}" stroke-width="7"`, index: index(rank, s) });
}
function joker(k: 1 | 2) {
  const half = figure({ headwear: 'jester', hair: 'curly', beard: 'none', collar: 'ruff', item: 'guitar', item2: 'fan', gaze: k === 1 ? 1 : -1, uid: `j${k}`, pattern: k === 1 ? 'url(#dY)' : 'url(#dW)', patternOpacity: 0.9 },
    painter(k === 1 ? 'H' : 'D', k === 1 ? RED : COBALT));
  return courtCard({ uid: `jk${k}`, bg: faceBg(), panel, under: `<rect x="-230" y="-480" width="460" height="480" fill="${WHITE}" opacity=".55"/>` + under(), half, divider: divider(null), border: `stroke="${COBALT}" stroke-width="7"`, index: '' })
    + jokerIndex(k === 1 ? RED : COBALT, 'golos800', 38, B + 74);
}

// ------------------------------------------------------------------------------------------------ back: a tiled wall
function back() {
  const ix = B + 46, iy = B + 46, iw = TW - 92, ih = TH - 92;
  const inner = rrect(ix, iy, iw, ih, 14);
  const flowerSun = rays(CX, CY, 32, 200, 5.5, `fill="${RED}"`) + `<circle cx="${CX}" cy="${CY}" r="150" fill="url(#sunR)" stroke="${RED}" stroke-width="6"/>`
    + `<path d="${star(CX, CY, 12, 120, 84)}" fill="${RED}"/><path d="${star(CX, CY, 12, 84, 58, 15)}" fill="${YELLOW}"/>`
    + `<circle cx="${CX}" cy="${CY}" r="46" fill="${COBALT}"/><circle cx="${CX}" cy="${CY}" r="22" fill="${WHITE}"/>`;
  const corner = `<path d="M${ix} ${iy + 120}L${ix} ${iy}L${ix + 120} ${iy}" fill="none" stroke="${RED}" stroke-width="10"/>`;
  return `<defs><clipPath id="bkc"><path d="${inner}"/></clipPath></defs>`
    + `<rect width="${W}" height="${H}" fill="url(#cobR)"/>`
    + `<g clip-path="url(#bkc)"><rect width="${W}" height="${H}" fill="url(#azu)"/>${quad(corner, CX, CY)}</g>`
    + `<path d="${inner}" fill="none" stroke="${YELLOW}" stroke-width="6"/>`
    + `<path d="${rrect(B + 22, B + 22, TW - 44, TH - 44, 22)}" fill="none" stroke="${WHITE}" stroke-width="3"/>`
    + `<circle cx="${CX}" cy="${CY}" r="236" fill="${COBALT}" stroke="${WHITE}" stroke-width="6"/>` + flowerSun;
}

export const iberian: DeckTheme = {
  id: 'iberian',
  productId: 'deck-iberian',
  name: 'Iberian Fiesta',
  boxLine: 'Azulejo blue, flamenco red and the Spanish sun',
  markets: ['es', 'en'],
  edition36: false,
  colours: { primary: COBALT, secondary: RED, accent: YELLOW, paper: '#F5EFE2' },
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
    panel: (w, h) => `<rect width="${n(w)}" height="${n(h)}" fill="url(#cobR)"/>`,
    ink: WHITE,
    accent: YELLOW,
    plate: RED_D,
    rule: YELLOW,
  },
  scene: { surface: 'tile', base: '#C2552F', hi: '#F3E6D2', lo: '#1E4FA3', fan: ['AS', 'QH', 'KS', 'JD', 'JK1'], spread: ['AS', 'KH', 'QS', 'JC', 'AH', 'QD', 'JH', 'JK2'] },
};
