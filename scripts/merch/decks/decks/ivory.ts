/**
 * Minimal Ivory — luxury minimal: warm ivory stock, fine-line courts, one spot gold. Every gold element is a single
 * flat colour (#B8954A), so the gold can be separated as a foil layer by a printer that offers hot-foil.
 */
import { wordmark } from '../lib/brand.ts';
import { B, CX, CY, H, TH, TW, W, jokerIndex, textIndex, type DeckTheme, type Rank, type Suit } from '../lib/cards.ts';
import { COURT_FRAME, courtCard, flatPainter } from '../lib/court.ts';
import { figure, type FigureSpec } from '../lib/figure.ts';
import { face } from '../lib/font.ts';
import { CLASSIC, isRed, suitAt } from '../lib/suits.ts';
import { dbl, n, rad, ring, rrect } from '../lib/svg.ts';

const IVORY = '#F5EFE2', IVORY2 = '#EDE4D2', GOLD = '#B8954A', INK = '#1E1B18', WINE = '#8E2B2B';

const defs = rad('iv', [[0, '#FBF7EE'], [1, IVORY]], 0.5, 0.5, 0.75);
const sc = (s: Suit) => (isRed(s) ? WINE : INK);

function faceBg() {
  return `<rect width="${W}" height="${H}" fill="url(#iv)"/>`
    + `<path d="${rrect(B + 30, B + 30, TW - 60, TH - 60, 20)}" fill="none" stroke="${GOLD}" stroke-width="1.4"/>`;
}
const index = (rank: Rank, s: Suit) => textIndex({ rank, s, font: 'corm600', size: 118, fill: sc(s), suitFill: sc(s), x: B + 88, y: B + 138, suitSize: 48, gap: 22 });
const pip = (s: Suit, x: number, y: number, size: number, flip: boolean) => suitAt(CLASSIC, s, x, y, size, `fill="${sc(s)}"`, flip);

function guilloche(cx: number, cy: number, r: number, count: number, ry: number, w = 0.9, op = 0.8) {
  let g = '';
  for (let i = 0; i < count; i++) g += `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(r)}" ry="${n(ry)}" transform="rotate(${n((180 * i) / count)} ${n(cx)} ${n(cy)})"/>`;
  return `<g fill="none" stroke="${GOLD}" stroke-width="${w}" opacity="${op}">${g}</g>`;
}

function ace(s: Suit) {
  let mid: string;
  if (s === 'S') {
    const g5 = face('golos500');
    mid = guilloche(CX, CY, 210, 36, 64, 0.8, 0.75)
      + `<circle cx="${CX}" cy="${CY}" r="96" fill="${IVORY}" stroke="${GOLD}" stroke-width="1.6"/>`
      + suitAt(CLASSIC, 'S', CX, CY + 2, 120, `fill="${GOLD}"`)
      + wordmark(CX, CY + 340, 30, INK, GOLD, 'golos600')
      + `<path d="${g5.text('IVORY  ·  NO. 125', CX, CY - 318, 17, { tracking: 0.5, anchor: 'middle' }).d}" fill="${INK}" opacity=".7"/>`;
  } else {
    mid = `<circle cx="${CX}" cy="${CY}" r="150" fill="none" stroke="${GOLD}" stroke-width="1.2"/>`
      + ring(`<circle cx="${CX}" cy="${CY - 150}" r="2.4" fill="${GOLD}"/>`, 48, CX, CY)
      + suitAt(CLASSIC, s, CX, CY + 2, 150, `fill="${sc(s)}"`);
  }
  return faceBg() + mid + dbl(index('A', s), CX, CY);
}

const SPECS: Record<'J' | 'Q' | 'K', Record<Suit, Omit<FigureSpec, 'uid'>>> = {
  K: {
    S: { headwear: 'crown', hair: 'short', beard: 'full', collar: 'v', item: 'sword', item2: 'orb', fur: true, gaze: 1 },
    H: { headwear: 'crown', hair: 'curly', beard: 'pointed', collar: 'high', item: 'sceptre', item2: 'goblet', fur: true, gaze: -1 },
    D: { headwear: 'crownLeaf', hair: 'short', beard: 'moustache', collar: 'square', item: 'staff', item2: 'orb', fur: true, gaze: 1 },
    C: { headwear: 'crown', hair: 'curly', beard: 'full', collar: 'v', item: 'axe', item2: 'goblet', fur: true, gaze: -1 },
  },
  Q: {
    S: { headwear: 'diadem', hair: 'bun', beard: 'none', collar: 'round', item: 'fan', item2: 'rose', fem: true, necklace: 'beads', gaze: 1 },
    H: { headwear: 'tiara', hair: 'wavy', beard: 'none', collar: 'v', item: 'mirror', item2: 'flower', fem: true, necklace: 'beads', gaze: -1 },
    D: { headwear: 'tiara', hair: 'bob', beard: 'none', collar: 'round', item: 'sceptre', item2: 'rose', fem: true, necklace: 'beads', gaze: 1 },
    C: { headwear: 'diadem', hair: 'long', beard: 'none', collar: 'high', item: 'key', item2: 'flower', fem: true, necklace: 'beads', gaze: -1 },
  },
  J: {
    S: { headwear: 'cap', hair: 'short', beard: 'none', collar: 'lapel', item: 'sword', item2: 'key', gaze: 1 },
    H: { headwear: 'beret', hair: 'curly', beard: 'moustache', collar: 'v', item: 'staff', item2: 'rose', gaze: -1 },
    D: { headwear: 'brimHat', hair: 'short', beard: 'none', collar: 'lapel', item: 'key', item2: 'goblet', gaze: 1 },
    C: { headwear: 'cap', hair: 'curly', beard: 'goatee', collar: 'v', item: 'lantern', item2: 'key', gaze: -1 },
  },
};
function painter(s: Suit) {
  const accent = isRed(s) ? WINE : GOLD;
  return flatPainter({
    outline: INK, ow: 1.8, line: INK, lw: 1.8, blush: 0,
    fills: {
      skin: IVORY, hair: IVORY2, beard: IVORY2, lips: WINE, blush: IVORY, eye: IVORY, iris: INK,
      crown: GOLD, crown2: GOLD, jewel: accent, jewel2: GOLD, pearl: IVORY,
      robe: IVORY, robe2: IVORY2, robe3: IVORY, trim: GOLD, fur: IVORY, lace: IVORY,
      metal: IVORY, wood: IVORY2, flower: accent, flower2: IVORY, leaf: IVORY2, fruit: accent, ribbon: accent,
    },
    strokes: { trim: GOLD },
  });
}
function under() {
  return `<circle cx="0" cy="-300" r="138" fill="none" stroke="${GOLD}" stroke-width="1.4"/><circle cx="0" cy="-300" r="128" fill="none" stroke="${GOLD}" stroke-width=".8"/>`;
}
function divider(s: Suit | null) {
  const f = COURT_FRAME;
  return `<path d="M${f.x + 30} ${CY}H${CX - 40}M${CX + 40} ${CY}H${f.x + f.w - 30}" stroke="${GOLD}" stroke-width="1.4"/>`
    + (s ? suitAt(CLASSIC, s, CX, CY + 1, 34, `fill="${GOLD}"`) : `<circle cx="${CX}" cy="${CY}" r="8" fill="${GOLD}"/>`);
}
function court(rank: 'J' | 'Q' | 'K', s: Suit) {
  const half = figure({ ...SPECS[rank][s], uid: `c${rank}${s}` }, painter(s));
  return courtCard({ uid: `k${rank}${s}`, bg: faceBg(), panel: '#FAF5EA', under: under(), half, divider: divider(s), border: `stroke="${GOLD}" stroke-width="1.6"`, index: index(rank, s) });
}
function joker(k: 1 | 2) {
  const half = figure({ headwear: 'jester', hair: 'curly', beard: 'none', collar: 'ruff', item: 'cards', item2: 'dice', gaze: k === 1 ? 1 : -1, uid: `j${k}` }, painter(k === 1 ? 'H' : 'S'));
  return courtCard({ uid: `jk${k}`, bg: faceBg(), panel: '#FAF5EA', under: under(), half, divider: divider(null), border: `stroke="${GOLD}" stroke-width="1.6"`, index: '' })
    + jokerIndex(k === 1 ? WINE : INK, 'golos600', 34, B + 74);
}

function back() {
  const inner = rrect(B + 52, B + 52, TW - 104, TH - 104, 14);
  let lattice = '';
  for (let i = -24; i <= 24; i++) lattice += `M${n(CX + i * 36 - 700)} ${n(CY - 700)}L${n(CX + i * 36 + 700)} ${n(CY + 700)}M${n(CX + i * 36 + 700)} ${n(CY - 700)}L${n(CX + i * 36 - 700)} ${n(CY + 700)}`;
  return `<defs><clipPath id="bkc"><path d="${inner}"/></clipPath></defs>`
    + `<rect width="${W}" height="${H}" fill="url(#iv)"/>`
    + `<g clip-path="url(#bkc)"><path d="${lattice}" stroke="${GOLD}" stroke-width=".8" opacity=".35"/></g>`
    + `<path d="${rrect(B + 30, B + 30, TW - 60, TH - 60, 22)}" fill="none" stroke="${GOLD}" stroke-width="2"/>`
    + `<path d="${inner}" fill="none" stroke="${GOLD}" stroke-width="1.2"/>`
    + `<circle cx="${CX}" cy="${CY}" r="250" fill="${IVORY}" stroke="${GOLD}" stroke-width="1.6"/>`
    + guilloche(CX, CY, 230, 48, 78, 0.9, 0.9) + guilloche(CX, CY, 120, 24, 40, 0.9, 0.9)
    + `<circle cx="${CX}" cy="${CY}" r="34" fill="${GOLD}"/><circle cx="${CX}" cy="${CY}" r="24" fill="${IVORY}"/><circle cx="${CX}" cy="${CY}" r="8" fill="${GOLD}"/>`;
}

export const ivory: DeckTheme = {
  id: 'ivory',
  productId: 'deck-ivory',
  name: 'Ivory',
  boxLine: 'Fine line, warm ivory, a single gold',
  markets: ['*'],
  edition36: false,
  colours: { primary: IVORY, secondary: GOLD, accent: INK, paper: '#EFE8DA' },
  defs,
  faceBg: () => faceBg(),
  index,
  pip,
  pipField: { dx: 146, top: CY - 326, bottom: CY + 326, size: 104 },
  ace,
  court,
  joker,
  back,
  box: {
    front: () => back(),
    panel: (w, h) => `<rect width="${n(w)}" height="${n(h)}" fill="url(#iv)"/>`,
    ink: INK,
    accent: GOLD,
    plate: IVORY,
    rule: GOLD,
  },
  scene: { surface: 'felt', base: '#2B2724', hi: '#4A443D', lo: '#0E0D0C', fan: ['AS', 'KH', 'QS', 'JD', 'JK1'], spread: ['AS', 'KS', 'QH', 'JD', 'AH', 'QD', 'KC', 'JK2'] },
};
