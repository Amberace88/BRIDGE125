/**
 * Caucasus · Silk Road — carpet geometry (stepped medallions, eight-pointed stars, hooked borders) and the
 * pomegranate, in madder red, indigo, saffron and turquoise. A shared ornamental language from the Caucasus to
 * Central Asia; no national or religious symbols.
 */
import { wordmark } from '../lib/brand.ts';
import { B, CX, CY, H, TH, TW, W, jokerIndex, textIndex, type DeckTheme, type Rank, type Suit } from '../lib/cards.ts';
import { COURT_FRAME, courtCard, flatPainter } from '../lib/court.ts';
import { figure, type FigureSpec } from '../lib/figure.ts';
import { face } from '../lib/font.ts';
import { CLASSIC, isRed, suitAt } from '../lib/suits.ts';
import { dbl, n, poly, quad, rad, rrect, star } from '../lib/svg.ts';

const MADDER = '#8E1F2A', MADDER_HI = '#B03440', INDIGO = '#1D2A5A', INDIGO_D = '#121A3A', SAFFRON = '#E3A72F', TURQ = '#1F9A96';
const IVORY = '#F6EEDC', DARK = '#1A1414', POM = '#C2273A';

/** Stepped (hooked) lozenge — the classic Caucasian rug medallion. */
export function stepped(cx: number, cy: number, rx: number, ry: number, steps = 5) {
  const ps: [number, number][] = [];
  const sx = rx / steps, sy = ry / steps;
  // top → right → bottom → left, stair-stepping
  for (let i = 0; i < steps; i++) { ps.push([cx + i * sx, cy - ry + i * sy]); ps.push([cx + (i + 1) * sx, cy - ry + i * sy]); }
  for (let i = 0; i < steps; i++) { ps.push([cx + rx - i * sx, cy + i * sy]); ps.push([cx + rx - i * sx, cy + (i + 1) * sy]); }
  for (let i = 0; i < steps; i++) { ps.push([cx - i * sx, cy + ry - i * sy]); ps.push([cx - (i + 1) * sx, cy + ry - i * sy]); }
  for (let i = 0; i < steps; i++) { ps.push([cx - rx + i * sx, cy - i * sy]); ps.push([cx - rx + i * sx, cy - (i + 1) * sy]); }
  return poly(ps);
}
/** Eight-pointed carpet star (two overlapping squares) with a centre. */
export function gul(cx: number, cy: number, r: number, a: string, b: string, c: string) {
  return `<path d="${star(cx, cy, 8, r, r * 0.76)}" fill="${a}"/><path d="${star(cx, cy, 8, r * 0.72, r * 0.54, 22.5)}" fill="${b}"/>`
    + `<path d="M${n(cx)} ${n(cy - r * 0.42)}L${n(cx + r * 0.42)} ${n(cy)}L${n(cx)} ${n(cy + r * 0.42)}L${n(cx - r * 0.42)} ${n(cy)}Z" fill="${c}"/>`
    + `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.14)}" fill="${a}"/>`;
}
export function pomegranate(cx: number, cy: number, s: number, deg = 0) {
  return `<g transform="translate(${n(cx)} ${n(cy)}) rotate(${deg}) scale(${n(s / 100)})">`
    + `<path d="M-46 4C-48 -38 -16 -52 0 -48C16 -52 48 -38 46 4C44 40 20 52 0 52C-20 52 -44 40 -46 4Z" fill="${POM}" stroke="${DARK}" stroke-width="3"/>`
    + `<path d="M-14 -46L-18 -66L-6 -56L0 -72L6 -56L18 -66L14 -46Z" fill="${POM}" stroke="${DARK}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path d="M-26 -6C-14 24 14 24 26 -6C14 4 -14 4 -26 -6Z" fill="${SAFFRON}"/>`
    + [[-12, 4], [0, 10], [12, 4], [-6, 16], [6, 16]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${POM}"/>`).join('')
    + `<path d="M-30 -24C-26 -34 -18 -38 -10 -38" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/></g>`;
}

const defs = rad('ivR', [[0, '#FCF6E8'], [1, IVORY]], 0.5, 0.5, 0.75)
  + rad('madR', [[0, MADDER_HI], [0.75, MADDER], [1, '#5E1018']], 0.5, 0.5, 0.75)
  + rad('indR', [[0, '#2C3D7A'], [0.75, INDIGO], [1, INDIGO_D]], 0.5, 0.5, 0.75)
  + `<pattern id="st8" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="translate(${n(CX - 22)} ${n(CY - 22)})"><path d="${star(22, 22, 8, 10, 6)}" fill="${SAFFRON}"/><path d="M0 -4L4 0L0 4L-4 0ZM44 -4L48 0L44 4L40 0ZM0 40L4 44L0 48L-4 44ZM44 40L48 44L44 48L40 44Z" fill="${TURQ}"/></pattern>`
  + `<pattern id="st8m" width="44" height="44" patternUnits="userSpaceOnUse"><path d="${star(22, 22, 8, 10, 6)}" fill="${MADDER}"/><path d="M0 -4L4 0L0 4L-4 0ZM44 -4L48 0L44 4L40 0ZM0 40L4 44L0 48L-4 44ZM44 40L48 44L44 48L40 44Z" fill="${INDIGO}"/></pattern>`
  + `<pattern id="kilim" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="translate(${n(CX - 30)} ${n(CY - 30)})"><path d="${stepped(30, 30, 24, 24, 4)}" fill="none" stroke="${SAFFRON}" stroke-width="3"/><path d="M30 22L38 30L30 38L22 30Z" fill="${TURQ}"/></pattern>`
  + `<pattern id="saw" width="28" height="20" patternUnits="userSpaceOnUse"><path d="M0 20L14 4L28 20Z" fill="${MADDER}"/><path d="M8 20L14 12L20 20Z" fill="${SAFFRON}"/></pattern>`;

const sc = (s: Suit) => (isRed(s) ? MADDER : INDIGO);

function faceBg() {
  const bandW = 380, bx = CX - bandW / 2;
  const band = `<rect x="${bx}" y="${B + 30}" width="${bandW}" height="20" fill="url(#saw)"/>`;
  const st = `<path d="${star(W - B - 74, B + 74, 8, 26, 18)}" fill="${MADDER}"/><path d="${star(W - B - 74, B + 74, 8, 15, 10, 22.5)}" fill="${SAFFRON}"/><circle cx="${W - B - 74}" cy="${B + 74}" r="5" fill="${INDIGO}"/>`;
  return `<rect width="${W}" height="${H}" fill="url(#ivR)"/>`
    + `<path d="${rrect(B + 18, B + 18, TW - 36, TH - 36, 20)}" fill="none" stroke="${INDIGO}" stroke-width="3"/>`
    + `<path d="${rrect(B + 26, B + 26, TW - 52, TH - 52, 14)}" fill="none" stroke="${MADDER}" stroke-width="1.4"/>`
    + dbl(band + st, CX, CY);
}

const index = (rank: Rank, s: Suit) => textIndex({ rank, s, font: 'golos700', size: 100, fill: sc(s), suitFill: sc(s), x: B + 88, y: B + 136, suitSize: 54, gap: 18, tenSqueeze: 0.78 });
const pip = (s: Suit, x: number, y: number, size: number, flip: boolean) => suitAt(CLASSIC, s, x, y, size, `fill="${sc(s)}"`, flip);

function ace(s: Suit) {
  const med = `<path d="${stepped(CX, CY, 270, 330, 6)}" fill="url(#indR)"/><path d="${stepped(CX, CY, 270, 330, 6)}" fill="url(#kilim)" opacity=".5"/>`
    + `<path d="${stepped(CX, CY, 230, 284, 6)}" fill="none" stroke="${SAFFRON}" stroke-width="5"/>`
    + `<path d="${stepped(CX, CY, 200, 248, 5)}" fill="url(#madR)" stroke="${DARK}" stroke-width="3"/>`;
  let mid: string;
  if (s === 'S') {
    const g6 = face('golos600');
    mid = med + gul(CX, CY, 150, IVORY, INDIGO, SAFFRON) + suitAt(CLASSIC, 'S', CX, CY + 2, 110, `fill="${MADDER}" stroke="${IVORY}" stroke-width="3"`)
      + pomegranate(CX, CY - 200, 70) + pomegranate(CX, CY + 200, 70, 180)
      + wordmark(CX, CY + 400, 36, INDIGO, MADDER, 'golos700')
      + `<path d="${g6.text('CAUCASUS · SILK ROAD', CX, CY - 378, 19, { tracking: 0.34, anchor: 'middle' }).d}" fill="${INDIGO}" opacity=".7"/>`;
  } else {
    mid = `<path d="${stepped(CX, CY, 236, 290, 6)}" fill="none" stroke="${sc(s)}" stroke-width="3"/><path d="${stepped(CX, CY, 216, 266, 6)}" fill="url(#st8m)" opacity=".22"/>`
      + suitAt(CLASSIC, s, CX, CY + 4, 330, `fill="${sc(s)}"`)
      + gul(CX, CY + (s === "H" ? -18 : s === "C" ? -30 : 0), 64, SAFFRON, IVORY, TURQ);
  }
  return faceBg() + mid + dbl(index('A', s), CX, CY);
}

// ------------------------------------------------------------------------------------------------ courts
const SPECS: Record<'J' | 'Q' | 'K', Record<Suit, Omit<FigureSpec, 'uid'>>> = {
  K: {
    S: { headwear: 'tallHat', hair: 'short', beard: 'full', collar: 'high', item: 'sword', item2: 'pomegranate', necklace: 'chain', gaze: 1 },
    H: { headwear: 'crown', hair: 'curly', beard: 'pointed', collar: 'v', item: 'staff', item2: 'goblet', fur: true, gaze: -1 },
    D: { headwear: 'tallHat', hair: 'short', beard: 'full', collar: 'square', item: 'sceptre', item2: 'pomegranate', gaze: 1 },
    C: { headwear: 'crown', hair: 'curly', beard: 'full', collar: 'high', item: 'axe', item2: 'orb', fur: true, gaze: -1 },
  },
  Q: {
    S: { headwear: 'coinCap', hair: 'long', beard: 'none', collar: 'round', item: 'mirror', item2: 'pomegranate', fem: true, necklace: 'coins', gaze: 1 },
    H: { headwear: 'veilCrown', hair: 'wavy', beard: 'none', collar: 'v', item: 'fan', item2: 'rose', fem: true, necklace: 'beads', gaze: -1 },
    D: { headwear: 'coinCap', hair: 'braids', beard: 'none', collar: 'round', item: 'spindle', item2: 'pomegranate', fem: true, necklace: 'coins', gaze: 1 },
    C: { headwear: 'veilCrown', hair: 'long', beard: 'none', collar: 'high', item: 'key', item2: 'flower', fem: true, necklace: 'beads', gaze: -1 },
  },
  J: {
    S: { headwear: 'skullcap', hair: 'short', beard: 'moustache', collar: 'high', item: 'lantern', item2: 'key', gaze: 1 },
    H: { headwear: 'skullcap', hair: 'curly', beard: 'none', collar: 'v', item: 'staff', item2: 'pomegranate', gaze: -1 },
    D: { headwear: 'tallHat', hair: 'short', beard: 'moustache', collar: 'lapel', item: 'sword', item2: 'goblet', gaze: 1 },
    C: { headwear: 'skullcap', hair: 'curly', beard: 'goatee', collar: 'v', item: 'key', item2: 'pomegranate', gaze: -1 },
  },
};
const ROBES: Record<Suit, { robe: string; robe2: string; robe3: string; pat: string }> = {
  S: { robe: INDIGO, robe2: MADDER, robe3: SAFFRON, pat: 'url(#st8)' },
  H: { robe: MADDER, robe2: INDIGO, robe3: SAFFRON, pat: 'url(#kilim)' },
  D: { robe: SAFFRON, robe2: MADDER, robe3: INDIGO, pat: 'url(#st8m)' },
  C: { robe: TURQ, robe2: MADDER, robe3: IVORY, pat: 'url(#kilim)' },
};
function painter(s: Suit, robe?: string) {
  const r = ROBES[s];
  return flatPainter({
    outline: DARK, ow: 2.6, line: DARK, lw: 2.6, blush: 0.3,
    fills: {
      skin: '#EDC7A2', hair: '#2A1C16', beard: '#2A1C16', lips: '#A52A35', blush: '#D9604F', eye: '#FFFFFF', iris: '#3A2618',
      crown: SAFFRON, crown2: MADDER, jewel: TURQ, jewel2: POM, pearl: IVORY,
      robe: robe ?? r.robe, robe2: r.robe2, robe3: r.robe3, trim: SAFFRON, fur: '#3B2A22', lace: '#F8F1E2',
      metal: '#D7DCE0', wood: '#7A4A22', flower: POM, flower2: SAFFRON, leaf: '#3E7B4E', fruit: POM, ribbon: TURQ,
    },
    strokes: { trim: s === 'D' ? MADDER : SAFFRON },
  });
}
function under() {
  return `<path d="${stepped(0, -300, 190, 170, 6)}" fill="${MADDER}" opacity=".9"/><path d="${stepped(0, -300, 160, 142, 5)}" fill="none" stroke="${SAFFRON}" stroke-width="4"/>`
    + `<path d="${star(-170, -440, 8, 24, 16)}" fill="${SAFFRON}"/><path d="${star(170, -440, 8, 24, 16)}" fill="${SAFFRON}"/>`
    + `<path d="${star(-180, -120, 8, 20, 13)}" fill="${TURQ}"/><path d="${star(180, -120, 8, 20, 13)}" fill="${TURQ}"/>`;
}
function divider(s: Suit | null) {
  const f = COURT_FRAME;
  return `<rect x="${f.x}" y="${CY - 10}" width="${f.w}" height="20" fill="${SAFFRON}"/><rect x="${f.x}" y="${CY - 10}" width="${f.w}" height="20" fill="url(#saw)"/>`
    + `<path d="${stepped(CX, CY, 44, 44, 3)}" fill="${IVORY}" stroke="${DARK}" stroke-width="3"/>`
    + (s ? suitAt(CLASSIC, s, CX, CY + 1, 34, `fill="${sc(s)}"`) : `<path d="${star(CX, CY, 8, 22, 15)}" fill="${MADDER}"/>`);
}
function court(rank: 'J' | 'Q' | 'K', s: Suit) {
  const half = figure({ ...SPECS[rank][s], uid: `c${rank}${s}`, pattern: ROBES[s].pat, patternOpacity: 0.85 }, painter(s));
  return courtCard({ uid: `k${rank}${s}`, bg: faceBg(), panel: 'url(#indR)', under: under(), half, divider: divider(s), border: `stroke="${SAFFRON}" stroke-width="6"`, index: index(rank, s) });
}
function joker(k: 1 | 2) {
  const half = figure({ headwear: 'jester', hair: 'curly', beard: 'none', collar: 'ruff', item: 'staff', item2: 'pomegranate', gaze: k === 1 ? 1 : -1, uid: `j${k}`, pattern: 'url(#st8)', patternOpacity: 0.85 },
    painter(k === 1 ? 'H' : 'C', k === 1 ? MADDER : TURQ));
  return courtCard({ uid: `jk${k}`, bg: faceBg(), panel: 'url(#indR)', under: under(), half, divider: divider(null), border: `stroke="${SAFFRON}" stroke-width="6"`, index: '' })
    + jokerIndex(k === 1 ? MADDER : INDIGO, 'golos800', 38, B + 74);
}

// ------------------------------------------------------------------------------------------------ back: a little carpet
function back() {
  const ix = B + 70, iy = B + 70, iw = TW - 140, ih = TH - 140;
  const inner = rrect(ix, iy, iw, ih, 6);
  let border = '';
  for (let x = B + 50; x < W - B - 40; x += 40) border += `<path d="${star(x, B + 46, 4, 11, 5, 45)}" fill="${SAFFRON}"/>`;
  for (let y = B + 86; y < H - B - 80; y += 40) border += `<path d="${star(B + 46, y, 4, 11, 5, 45)}" fill="${SAFFRON}"/>`;
  const corner = `<path d="${stepped(ix, iy, 120, 120, 4)}" fill="${INDIGO}"/>` + gul(ix, iy, 70, SAFFRON, MADDER, TURQ);
  const centre = `<path d="${stepped(CX, CY, 250, 340, 7)}" fill="${INDIGO}" stroke="${SAFFRON}" stroke-width="5"/>`
    + `<path d="${stepped(CX, CY, 206, 284, 6)}" fill="${IVORY}"/>`
    + `<path d="${stepped(CX, CY, 186, 258, 6)}" fill="url(#madR)"/>`
    + gul(CX, CY, 120, INDIGO, SAFFRON, TURQ) + pomegranate(CX, CY - 182, 64) + pomegranate(CX, CY + 182, 64, 180)
    + `<path d="${star(CX - 120, CY, 8, 22, 15)}" fill="${SAFFRON}"/><path d="${star(CX + 120, CY, 8, 22, 15)}" fill="${SAFFRON}"/>`;
  return `<defs><clipPath id="bkc"><path d="${inner}"/></clipPath></defs>`
    + `<rect width="${W}" height="${H}" fill="${INDIGO_D}"/>` + dbl(border, CX, CY)
    + `<path d="${inner}" fill="url(#madR)"/>`
    + `<g clip-path="url(#bkc)"><rect width="${W}" height="${H}" fill="url(#st8)" opacity=".35"/>${quad(corner, CX, CY)}</g>`
    + `<path d="${inner}" fill="none" stroke="${SAFFRON}" stroke-width="5"/>`
    + `<path d="${rrect(ix - 14, iy - 14, iw + 28, ih + 28, 10)}" fill="none" stroke="${TURQ}" stroke-width="2.5"/>`
    + centre;
}

export const caucasus: DeckTheme = {
  id: 'caucasus',
  productId: 'deck-caucasus',
  name: 'Silk Road',
  boxLine: 'Carpet medallions & pomegranates of the Caucasus',
  markets: ['ka', 'hy', 'az', 'kk', 'uz'],
  edition36: true,
  colours: { primary: MADDER, secondary: INDIGO, accent: SAFFRON, paper: '#F1E7D2' },
  defs,
  faceBg: () => faceBg(),
  index,
  pip,
  pipField: { dx: 158, top: CY - 334, bottom: CY + 334, size: 120 },
  ace,
  court,
  joker,
  back,
  box: {
    front: () => back(),
    panel: (w, h) => `<rect width="${n(w)}" height="${n(h)}" fill="url(#madR)"/><rect width="${n(w)}" height="${n(h)}" fill="url(#st8)" opacity=".25"/>`,
    ink: IVORY,
    accent: SAFFRON,
    plate: INDIGO_D,
    rule: SAFFRON,
  },
  scene: { surface: 'rug', base: '#6E1A22', hi: '#2A3B78', lo: '#3A0C12', fan: ['AS', 'KD', 'QS', 'JH', 'JK1'], spread: ['AS', 'KS', 'QH', 'JD', 'AH', 'QD', 'KC', 'JK2'] },
};
