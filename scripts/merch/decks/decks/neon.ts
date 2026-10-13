/**
 * Neon Casino Noir — retro 80s neon: hot-magenta and cyan tubes glowing on black, a striped synthwave sun and a
 * perspective grid. Hearts/diamonds glow magenta, spades/clubs cyan. Made for photos.
 * Print note: RGB neon is brighter than CMYK can reproduce; order a proof (expect ~15 % duller magenta/cyan).
 */
import { wordmark } from '../lib/brand.ts';
import { B, CX, CY, H, TH, TW, W, jokerIndex, textIndex, type DeckTheme, type Rank, type Suit } from '../lib/cards.ts';
import { COURT_FRAME, courtCard, neonPainter } from '../lib/court.ts';
import { figure, type FigureSpec, type Role } from '../lib/figure.ts';
import { face } from '../lib/font.ts';
import { CLASSIC, isRed, suitAt } from '../lib/suits.ts';
import { dbl, lin, n, rad, rrect, star } from '../lib/svg.ts';

const BG = '#0A0612', BG2 = '#1C0B33', MAG = '#FF2BD6', CYAN = '#00E5FF', VIOLET = '#9B5CFF', YEL = '#FFE45E', ORANGE = '#FF7A3D';

const glow = (id: string, sd: number) => `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="${sd}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const defs = glow('gl', 5) + glow('gls', 2.5) + glow('glb', 10)
  + rad('night', [[0, BG2], [0.65, '#120822'], [1, BG]], 0.5, 0.5, 0.75)
  + lin('sun', [[0, YEL], [0.45, ORANGE], [1, MAG]])
  + rad('sunC', [[0, YEL], [0.55, ORANGE], [1, MAG]], 0.5, 0.5, 0.5);

const col = (s: Suit) => (isRed(s) ? MAG : CYAN);

function faceBg() {
  return `<rect width="${W}" height="${H}" fill="url(#night)"/>`
    + `<g filter="url(#gls)"><path d="${rrect(B + 24, B + 24, TW - 48, TH - 48, 24)}" fill="none" stroke="${VIOLET}" stroke-width="3"/></g>`;
}

const index = (rank: Rank, s: Suit) => `<g filter="url(#gls)">${textIndex({ rank, s, font: 'golos800', size: 100, fill: col(s), suitFill: col(s), x: B + 88, y: B + 138, suitSize: 56, gap: 18, tenSqueeze: 0.76 })}</g>`;

/** Neon tube suit: dim fill + bright tube outline + glow. */
const tube = (s: Suit, x: number, y: number, size: number, flip = false, c = col(s), w = 5) =>
  suitAt(CLASSIC, s, x, y, size, `fill="${c}" fill-opacity=".22" stroke="${c}" stroke-width="${n((w * 100) / size)}" stroke-linejoin="round"`, flip);
const pip = (s: Suit, x: number, y: number, size: number, flip: boolean) => `<g filter="url(#gl)">${tube(s, x, y, size, flip)}</g>`;

function sunDisc(cx: number, cy: number, r: number, both = false, grad = 'sun') {
  // striped retro sun: horizontal bands cut out of the lower part (both halves when `both`, for rotation symmetry)
  const id = `sn${Math.round(cx)}${Math.round(cy)}${both ? 'b' : ''}`;
  let cut = '';
  for (let i = 0; i < 6; i++) {
    const y = cy + r * 0.15 + i * r * 0.15, h = 3 + i * 3;
    cut += `<rect x="${n(cx - r)}" y="${n(y)}" width="${n(2 * r)}" height="${n(h)}"/>`;
    if (both) cut += `<rect x="${n(cx - r)}" y="${n(2 * cy - y - h)}" width="${n(2 * r)}" height="${n(h)}"/>`;
  }
  return `<defs><mask id="${id}"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="#fff"/><g fill="#000">${cut}</g></mask></defs>`
    + `<g filter="url(#glb)" opacity=".55"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${MAG}"/></g>`
    + `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="url(#${grad})" mask="url(#${id})"/>`;
}

function grid(cx: number, y0: number, w: number, h: number, colr: string) {
  // perspective floor grid from the horizon y0 downward
  let d = '';
  for (let i = -8; i <= 8; i++) d += `M${n(cx + i * 14)} ${n(y0)}L${n(cx + i * w / 8)} ${n(y0 + h)}`;
  for (let j = 1; j <= 6; j++) { const t = (j / 6) ** 2; const y = y0 + h * t; d += `M${n(cx - w)} ${n(y)}H${n(cx + w)}`; }
  return `<path d="${d}" stroke="${colr}" stroke-width="2" fill="none" opacity=".7"/>`;
}

function ace(s: Suit) {
  let mid: string;
  if (s === 'S') {
    const g8 = face('golos800');
    const t1 = g8.text('CASINO NOIR', CX, CY - 330, 34, { tracking: 0.3, anchor: 'middle' }).d;
    mid = sunDisc(CX, CY - 40, 210)
      + `<g filter="url(#gl)"><circle cx="${CX}" cy="${CY - 40}" r="250" fill="none" stroke="${CYAN}" stroke-width="5"/><circle cx="${CX}" cy="${CY - 40}" r="266" fill="none" stroke="${MAG}" stroke-width="3"/></g>`
      + `<g filter="url(#gl)">${suitAt(CLASSIC, 'S', CX, CY - 30, 230, `fill="${BG}" stroke="${CYAN}" stroke-width="${n(600 / 230)}"`)}</g>`
      + `<g filter="url(#gls)"><path d="${t1}" fill="none" stroke="${MAG}" stroke-width="2.5"/></g>`
      + `<g filter="url(#gl)" transform="translate(0 0)">${wordmark(CX, CY + 330, 46, CYAN, MAG, 'golos800')}</g>`;
  } else {
    mid = `<g filter="url(#glb)" opacity=".5">${suitAt(CLASSIC, s, CX, CY + 4, 300, `fill="${col(s)}"`)}</g>`
      + `<g filter="url(#gl)">${tube(s, CX, CY + 4, 300, false, col(s), 7)}${tube(s, CX, CY + 4, 200, false, s === 'D' ? YEL : s === 'H' ? ORANGE : VIOLET, 4)}</g>`;
  }
  return faceBg() + mid + dbl(index('A', s), CX, CY);
}

// ------------------------------------------------------------------------------------------------ courts
const SPECS: Record<'J' | 'Q' | 'K', Record<Suit, Omit<FigureSpec, 'uid'>>> = {
  K: {
    S: { headwear: 'crown', hair: 'short', beard: 'full', collar: 'lapel', item: 'cards', item2: 'dice', shades: true, necklace: 'chain', gaze: 1 },
    H: { headwear: 'crown', hair: 'curly', beard: 'pointed', collar: 'lapel', item: 'sceptre', item2: 'goblet', gaze: -1 },
    D: { headwear: 'crown', hair: 'short', beard: 'moustache', collar: 'lapel', item: 'mic', item2: 'dice', shades: true, gaze: 1 },
    C: { headwear: 'crownLeaf', hair: 'curly', beard: 'goatee', collar: 'lapel', item: 'staff', item2: 'orb', gaze: -1 },
  },
  Q: {
    S: { headwear: 'diadem', hair: 'wavy', beard: 'none', collar: 'v', item: 'fan', item2: 'rose', fem: true, necklace: 'beads', gaze: 1 },
    H: { headwear: 'tiara', hair: 'bob', beard: 'none', collar: 'v', item: 'mic', item2: 'rose', fem: true, necklace: 'beads', gaze: -1 },
    D: { headwear: 'diadem', hair: 'long', beard: 'none', collar: 'round', item: 'cards', item2: 'flower', fem: true, necklace: 'beads', gaze: 1 },
    C: { headwear: 'tiara', hair: 'wavy', beard: 'none', collar: 'v', item: 'mirror', item2: 'dice', fem: true, necklace: 'beads', gaze: -1 },
  },
  J: {
    S: { headwear: 'fedora', hair: 'short', beard: 'none', collar: 'lapel', item: 'cards', item2: 'key', shades: true, gaze: 1 },
    H: { headwear: 'fedora', hair: 'curly', beard: 'moustache', collar: 'lapel', item: 'mic', item2: 'dice', gaze: -1 },
    D: { headwear: 'beret', hair: 'curly', beard: 'none', collar: 'lapel', item: 'key', item2: 'dice', gaze: 1 },
    C: { headwear: 'fedora', hair: 'short', beard: 'goatee', collar: 'lapel', item: 'lantern', item2: 'key', shades: true, gaze: -1 },
  },
};
const TUBES: Record<Suit, [string, string]> = { S: [CYAN, MAG], H: [MAG, YEL], D: [YEL, MAG], C: [VIOLET, CYAN] };
function painter(s: Suit) {
  const [a, b] = TUBES[s];
  const t: Partial<Record<Role, string>> = {
    skin: '#FFD9F3', hair: a, beard: a, iris: b, eye: '#FFFFFF', lips: MAG, line: '#FFD9F3',
    crown: YEL, crown2: b, jewel: b, jewel2: a, pearl: '#FFFFFF', robe: a, robe2: b, robe3: b, trim: b,
    metal: CYAN, wood: VIOLET, flower: MAG, flower2: YEL, leaf: CYAN, lace: '#FFFFFF', fur: '#FFFFFF',
  };
  return neonPainter(t, a, BG, 4.5);
}
function under() {
  return sunDisc(0, -300, 150) + grid(0, -150, 230, 150, VIOLET)
    + `<path d="M-230 -150H230" stroke="${MAG}" stroke-width="3" filter="url(#gls)"/>`;
}
function divider(s: Suit | null) {
  const f = COURT_FRAME;
  return `<g filter="url(#gls)"><path d="M${f.x} ${CY}H${f.x + f.w}" stroke="${MAG}" stroke-width="4"/>`
    + `<rect x="${CX - 30}" y="${CY - 30}" width="60" height="60" rx="8" fill="${BG}" stroke="${CYAN}" stroke-width="4" transform="rotate(45 ${CX} ${CY})"/></g>`
    + (s ? `<g filter="url(#gls)">${suitAt(CLASSIC, s, CX, CY + 1, 34, `fill="${col(s)}"`)}</g>` : `<path d="${star(CX, CY, 4, 20, 7)}" fill="${YEL}" filter="url(#gls)"/>`);
}
function court(rank: 'J' | 'Q' | 'K', s: Suit) {
  const half = `<g filter="url(#gl)">${figure({ ...SPECS[rank][s], uid: `c${rank}${s}` }, painter(s))}</g>`;
  return courtCard({ uid: `k${rank}${s}`, bg: faceBg(), panel: '#0D0718', under: under(), half, divider: divider(s), border: `stroke="${MAG}" stroke-width="5" filter="url(#gls)"`, index: index(rank, s) });
}
function joker(k: 1 | 2) {
  const half = `<g filter="url(#gl)">${figure({ headwear: 'jester', hair: 'curly', beard: 'none', collar: 'ruff', item: 'cards', item2: 'dice', gaze: k === 1 ? 1 : -1, uid: `j${k}` }, painter(k === 1 ? 'H' : 'C'))}</g>`;
  return courtCard({ uid: `jk${k}`, bg: faceBg(), panel: '#0D0718', under: under(), half, divider: divider(null), border: `stroke="${k === 1 ? MAG : CYAN}" stroke-width="5" filter="url(#gls)"`, index: '' })
    + `<g filter="url(#gls)">${jokerIndex(k === 1 ? MAG : CYAN, 'golos800', 38, B + 74)}</g>`;
}

// ------------------------------------------------------------------------------------------------ back
function back() {
  const ix = B + 50, iy = B + 50, iw = TW - 100, ih = TH - 100;
  const inner = rrect(ix, iy, iw, ih, 20);
  const g = grid(CX, CY + 60, 380, ih / 2 - 60, VIOLET);
  return `<defs><clipPath id="bkc"><path d="${inner}"/></clipPath></defs>`
    + `<rect width="${W}" height="${H}" fill="url(#night)"/>`
    + `<g clip-path="url(#bkc)">${dbl(g, CX, CY)}${dbl(`<path d="M${ix} ${CY + 60}H${ix + iw}" stroke="${MAG}" stroke-width="3"/>`, CX, CY)}</g>`
    + sunDisc(CX, CY, 170, true, "sunC")
    + `<g filter="url(#gl)"><path d="${inner}" fill="none" stroke="${CYAN}" stroke-width="4"/>`
    + `<path d="${rrect(B + 26, B + 26, TW - 52, TH - 52, 28)}" fill="none" stroke="${MAG}" stroke-width="4"/>`
    + `<circle cx="${CX}" cy="${CY}" r="200" fill="none" stroke="${CYAN}" stroke-width="4"/></g>`
    + dbl(`<g filter="url(#gls)">${suitAt(CLASSIC, 'S', CX - 60, B + 140, 40, `fill="none" stroke="${CYAN}" stroke-width="7"`)}${suitAt(CLASSIC, 'H', CX + 60, B + 140, 40, `fill="none" stroke="${MAG}" stroke-width="7"`)}${suitAt(CLASSIC, 'D', CX, B + 140, 36, `fill="${YEL}"`)}</g>`, CX, CY);
}

export const neon: DeckTheme = {
  id: 'neon',
  productId: 'deck-neon',
  name: 'Neon Noir',
  boxLine: 'Hot magenta & cyan tubes on midnight black',
  markets: ['*'],
  edition36: false,
  colours: { primary: BG, secondary: MAG, accent: CYAN, paper: '#1A1024' },
  defs,
  faceBg: () => faceBg(),
  index,
  pip,
  pipField: { dx: 158, top: CY - 336, bottom: CY + 336, size: 118 },
  ace,
  court,
  joker,
  back,
  box: {
    front: () => back(),
    panel: (w, h) => `<rect width="${n(w)}" height="${n(h)}" fill="url(#night)"/>`,
    ink: '#FFFFFF',
    accent: MAG,
    plate: BG,
    rule: CYAN,
  },
  scene: { surface: 'neon', base: '#120A22', hi: '#2A1450', lo: '#05030A', fan: ['AS', 'KS', 'QH', 'JD', 'JK1'], spread: ['AS', 'KD', 'QS', 'JH', 'AH', 'QD', 'JS', 'JK2'] },
};
