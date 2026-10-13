/**
 * Deutsch Bauhaus — circles, triangles and squares in red, yellow, blue and black on off-white. Court figures are
 * built from pure geometry (a nod to 1920s stage-costume figures), suits are constructed from circles + triangles.
 */
import { wordmark } from '../lib/brand.ts';
import { B, CX, CY, H, TH, TW, W, jokerIndex, textIndex, type DeckTheme, type Rank, type Suit } from '../lib/cards.ts';
import { COURT_FRAME, courtCard } from '../lib/court.ts';
import { face } from '../lib/font.ts';
import { GEO, isRed, suitAt } from '../lib/suits.ts';
import { circ, dbl, n, quad, rrect } from '../lib/svg.ts';

const PAPER = '#F2EDE3', RED = '#E1251B', YELLOW = '#F6C700', BLUE = '#1F4E9E', BLACK = '#111111', GREY = '#B9B3A8';

const defs = `<pattern id="gridB" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="translate(${n(CX)} ${n(CY)})"><path d="M0 0H40M0 0V40" stroke="${BLACK}" stroke-width="1" opacity=".12"/></pattern>`
  + `<pattern id="checker" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="${BLACK}"/><rect x="20" y="20" width="20" height="20" fill="${BLACK}"/></pattern>`
  + `<pattern id="stripes" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="12" height="24" fill="${BLACK}"/></pattern>`;

const sc = (s: Suit) => (isRed(s) ? RED : BLACK);

function faceBg() {
  const deco = `<path d="M${W - B - 30} ${B + 30}V${B + 150}A120 120 0 0 1 ${W - B - 150} ${B + 30}Z" fill="${YELLOW}"/>`
    + `<rect x="${W - B - 64}" y="${B + 150}" width="34" height="34" fill="${RED}"/><rect x="${W - B - 210}" y="${B + 30}" width="12" height="70" fill="${BLUE}"/>`;
  return `<rect width="${W}" height="${H}" fill="${PAPER}"/>` + dbl(deco, CX, CY)
    + `<path d="M${B + 30} ${B + 30}H${W - B - 30}V${H - B - 30}H${B + 30}Z" fill="none" stroke="${BLACK}" stroke-width="3"/>`;
}

const index = (rank: Rank, s: Suit) => textIndex({ rank, s, font: 'golos900', size: 104, fill: sc(s), suitFill: sc(s), set: GEO, x: B + 92, y: B + 140, suitSize: 56, gap: 18, tenSqueeze: 0.74 });
const pip = (s: Suit, x: number, y: number, size: number, flip: boolean) => suitAt(GEO, s, x, y, size, `fill="${sc(s)}"`, flip);

function ace(s: Suit) {
  let mid: string;
  if (s === 'S') {
    const g8 = face('golos800');
    mid = `<circle cx="${CX + 40}" cy="${CY - 60}" r="230" fill="${RED}"/><rect x="${B + 80}" y="${CY + 150}" width="${TW - 160}" height="56" fill="${BLUE}"/>`
      + `<circle cx="${CX - 170}" cy="${CY - 250}" r="54" fill="${YELLOW}"/>`
      + suitAt(GEO, 'S', CX, CY - 20, 340, `fill="${BLACK}"`)
      + `<g transform="translate(${CX} ${CY + 270})">${wordmark(0, 0, 40, BLACK, RED, 'golos800')}</g>`
      + `<path d="${g8.text('BAUHAUS', CX, CY + 191, 28, { tracking: 0.6, anchor: 'middle' }).d}" fill="${PAPER}"/>`;
  } else {
    const accent = s === 'H' ? BLUE : s === 'D' ? YELLOW : RED;
    mid = `<rect x="${CX - 210}" y="${CY - 210}" width="420" height="420" fill="none" stroke="${BLACK}" stroke-width="3"/>`
      + `<circle cx="${CX + 120}" cy="${CY - 120}" r="110" fill="${accent}"/>`
      + suitAt(GEO, s, CX, CY + 10, 300, `fill="${sc(s)}"`)
      + `<rect x="${CX - 210}" y="${CY + 180}" width="140" height="30" fill="${BLACK}"/>`;
  }
  return faceBg() + mid + dbl(index('A', s), CX, CY);
}

// ------------------------------------------------------------------------------------------------ geometric courts
const PAL: Record<Suit, [string, string, string]> = {
  S: [BLACK, BLUE, YELLOW],
  H: [RED, YELLOW, BLUE],
  D: [YELLOW, RED, BLACK],
  C: [BLUE, BLACK, RED],
};

/** Half figure from primitives (local coords: card centre at 0,0, figure up to y = -470). */
function geoFigure(rank: 'J' | 'Q' | 'K' | 'X', s: Suit, alt = false) {
  const [a, b, c] = PAL[s];
  const hy = -318, hr = 68;
  const flip = alt ? -1 : 1;
  let g = '';
  // backdrop blocks
  g += `<circle cx="${60 * flip}" cy="${hy - 10}" r="150" fill="${c}"/>`;
  g += `<rect x="${flip > 0 ? -215 : 135}" y="-470" width="80" height="250" fill="${b}" opacity=".9"/>`;
  // body: two-tone trapezoid + black spine
  g += `<path d="M-176 -196L0 -196L0 0L-210 0Z" fill="${a}"/><path d="M176 -196L0 -196L0 0L210 0Z" fill="${b}"/>`;
  g += `<rect x="-16" y="-196" width="32" height="196" fill="${BLACK}"/>`;
  // shoulders as half circles
  g += `<path d="M-176 -196A40 40 0 0 1 -96 -196Z" fill="${b}"/><path d="M96 -196A40 40 0 0 1 176 -196Z" fill="${a}"/>`;
  // chest medallion with the suit
  g += `<circle cx="${-96 * flip}" cy="-96" r="44" fill="${PAPER}" stroke="${BLACK}" stroke-width="4"/>` + suitAt(GEO, s, -96 * flip, -94, 46, `fill="${sc(s)}"`);
  // neck + head
  g += `<rect x="-20" y="${hy + hr - 10}" width="40" height="72" fill="${BLACK}"/>`;
  if (rank === 'Q') g += `<rect x="-88" y="${hy - 20}" width="176" height="150" fill="${YELLOW === a ? BLACK : YELLOW}"/>`;
  g += `<circle cx="0" cy="${hy}" r="${hr}" fill="${PAPER}" stroke="${BLACK}" stroke-width="4"/>`;
  // hair cap (half circle)
  g += `<path d="M${-hr} ${hy}A${hr} ${hr} 0 0 1 ${hr} ${hy}Z" fill="${rank === 'Q' ? (YELLOW === a ? BLACK : YELLOW) : BLACK}"/>`;
  // face: eyes, brows, mouth
  g += `<circle cx="-24" cy="${hy + 14}" r="7" fill="${BLACK}"/><circle cx="24" cy="${hy + 14}" r="7" fill="${BLACK}"/>`;
  g += `<rect x="-14" y="${hy + 40}" width="28" height="8" fill="${RED}"/>`;
  g += `<path d="M0 ${hy + 10}V${hy + 30}H8" fill="none" stroke="${BLACK}" stroke-width="3"/>`;
  if (rank === 'K') g += `<path d="M-46 ${hy + 52}L46 ${hy + 52}L0 ${hy + 120}Z" fill="${BLACK}"/>`;
  if (rank === 'J') g += `<rect x="-30" y="${hy + 52}" width="60" height="10" fill="${BLACK}"/>`;
  // headwear
  const top = hy - hr;
  if (rank === 'K') {
    g += `<rect x="-76" y="${top - 30}" width="152" height="30" fill="${YELLOW}" stroke="${BLACK}" stroke-width="4"/>`;
    for (const x of [-76, -24, 28]) g += `<path d="M${x} ${top - 30}L${x + 24} ${top - 96}L${x + 48} ${top - 30}Z" fill="${x === -24 ? RED : YELLOW}" stroke="${BLACK}" stroke-width="4"/>`;
    g += `<circle cx="0" cy="${top - 104}" r="11" fill="${BLUE}"/>`;
  } else if (rank === 'Q') {
    g += `<path d="M-96 ${top + 6}A96 96 0 0 1 96 ${top + 6}" fill="none" stroke="${BLUE}" stroke-width="16"/>`;
    for (const x of [-60, 0, 60]) g += `<circle cx="${x}" cy="${top - (x ? 48 : 70)}" r="${x ? 12 : 16}" fill="${x ? RED : YELLOW}" stroke="${BLACK}" stroke-width="3"/>`;
  } else if (rank === 'J') {
    g += `<rect x="-80" y="${top - 18}" width="160" height="22" fill="${BLACK}"/><rect x="-56" y="${top - 78}" width="112" height="62" fill="${RED}" stroke="${BLACK}" stroke-width="4"/>`;
    g += `<circle cx="${40 * flip}" cy="${top - 92}" r="16" fill="${YELLOW}" stroke="${BLACK}" stroke-width="3"/>`;
  } else {
    // jester: three triangles with bells
    for (const [x0, x1, tipx, tipy, col] of [[-80, 0, -140, top - 70, RED], [-30, 30, 0, top - 130, YELLOW], [0, 80, 140, top - 70, BLUE]] as const) {
      g += `<path d="M${x0} ${top + 6}L${tipx} ${tipy}L${x1} ${top + 6}Z" fill="${col}" stroke="${BLACK}" stroke-width="4"/><circle cx="${tipx}" cy="${tipy}" r="12" fill="${BLACK}"/>`;
    }
  }
  // the attribute: a long bar held diagonally, topped by a primitive
  const ax = 120 * flip, ay = -40;
  const tx = 170 * flip, ty = -420;
  g += `<path d="M${ax} ${ay}L${tx} ${ty}" stroke="${BLACK}" stroke-width="12" stroke-linecap="square"/>`;
  if (rank === 'K') g += `<circle cx="${tx}" cy="${ty}" r="26" fill="${RED}" stroke="${BLACK}" stroke-width="4"/>`;
  else if (rank === 'Q') g += `<path d="M${tx - 26} ${ty + 8}A26 26 0 0 1 ${tx + 26} ${ty + 8}Z" fill="${BLUE}" stroke="${BLACK}" stroke-width="4"/><circle cx="${tx}" cy="${ty - 26}" r="10" fill="${YELLOW}" stroke="${BLACK}" stroke-width="3"/>`;
  else if (rank === 'J') g += `<path d="M${tx} ${ty - 10}L${tx + 60 * flip} ${ty + 16}L${tx} ${ty + 42}Z" fill="${YELLOW}" stroke="${BLACK}" stroke-width="4"/>`;
  else g += `<rect x="${tx - 22}" y="${ty - 22}" width="44" height="44" fill="${RED}" stroke="${BLACK}" stroke-width="4" transform="rotate(45 ${tx} ${ty})"/>`;
  // hand: a circle on the bar
  g += `<circle cx="${n(ax + (tx - ax) * 0.18)}" cy="${n(ay + (ty - ay) * 0.18)}" r="20" fill="${PAPER}" stroke="${BLACK}" stroke-width="4"/>`;
  return g;
}

function divider(s: Suit | null) {
  const f = COURT_FRAME;
  return `<rect x="${f.x}" y="${CY - 7}" width="${f.w}" height="14" fill="${BLACK}"/>`
    + `<rect x="${CX - 34}" y="${CY - 34}" width="68" height="68" fill="${PAPER}" stroke="${BLACK}" stroke-width="5"/>`
    + (s ? suitAt(GEO, s, CX, CY + 1, 38, `fill="${sc(s)}"`) : `<circle cx="${CX}" cy="${CY}" r="18" fill="${RED}"/>`);
}

function court(rank: 'J' | 'Q' | 'K', s: Suit) {
  return courtCard({ uid: `k${rank}${s}`, bg: faceBg(), panel: PAPER, under: `<rect x="-230" y="-480" width="460" height="480" fill="url(#gridB)"/>`, half: geoFigure(rank, s, s === 'H' || s === 'C'), divider: divider(s), border: `stroke="${BLACK}" stroke-width="6"`, index: index(rank, s), scale: 0.95 });
}
function joker(k: 1 | 2) {
  return courtCard({ uid: `jk${k}`, bg: faceBg(), panel: k === 1 ? PAPER : '#EDE3CE', under: `<rect x="-230" y="-480" width="460" height="480" fill="url(#gridB)"/>`, half: geoFigure('X', k === 1 ? 'H' : 'C', k === 2), divider: divider(null), border: `stroke="${BLACK}" stroke-width="6"`, index: '', scale: 0.95 })
    + jokerIndex(k === 1 ? RED : BLACK, 'golos900', 40, B + 76);
}

// ------------------------------------------------------------------------------------------------ back
function back() {
  const x0 = B + 40, y0 = B + 40, w = TW - 80, h = TH - 80;
  const cw = w / 4, ch = h / 6;
  // top-left quadrant (2 × 3 cells), mirrored four ways
  const cols = [[RED, YELLOW, BLUE], [BLUE, BLACK, YELLOW]];
  let q = '';
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
    const x = x0 + i * cw, y = y0 + j * ch, col = cols[i][j];
    const kind = (i + j) % 3;
    if (kind === 0) q += `<path d="M${x} ${y + ch}A${cw} ${ch} 0 0 1 ${x + cw} ${y}V${y + ch}Z" fill="${col}"/>`;
    else if (kind === 1) q += `<circle cx="${n(x + cw / 2)}" cy="${n(y + ch / 2)}" r="${n(Math.min(cw, ch) * 0.36)}" fill="${col}"/>`;
    else q += `<path d="M${x} ${y}L${x + cw} ${y + ch}H${x}Z" fill="${col}"/>`;
    q += `<rect x="${n(x)}" y="${n(y)}" width="${n(cw)}" height="${n(ch)}" fill="none" stroke="${BLACK}" stroke-width="2.5"/>`;
  }
  const centre = `<circle cx="${CX}" cy="${CY}" r="150" fill="${PAPER}" stroke="${BLACK}" stroke-width="6"/>`
    + `<path d="${circ(CX, CY, 110)}" fill="${RED}"/><rect x="${CX - 150}" y="${CY - 14}" width="300" height="28" fill="${BLACK}"/>`
    + `<circle cx="${CX}" cy="${CY}" r="38" fill="${YELLOW}" stroke="${BLACK}" stroke-width="5"/>`;
  return `<rect width="${W}" height="${H}" fill="${PAPER}"/>` + quad(q, CX, CY)
    + `<path d="M${x0} ${y0}H${x0 + w}V${y0 + h}H${x0}Z" fill="none" stroke="${BLACK}" stroke-width="6"/>` + centre;
}

export const bauhaus: DeckTheme = {
  id: 'bauhaus',
  productId: 'deck-bauhaus',
  name: 'Bauhaus',
  boxLine: 'Kreis, Dreieck, Quadrat — primary colours, pure form',
  markets: ['de', 'pl', 'ro', 'en'],
  edition36: false,
  colours: { primary: RED, secondary: BLUE, accent: YELLOW, paper: '#EEE8DC' },
  defs,
  faceBg: () => faceBg(),
  index,
  pip,
  pipField: { dx: 160, top: CY - 336, bottom: CY + 336, size: 118 },
  ace,
  court,
  joker,
  back,
  box: {
    front: () => back(),
    panel: (w, h) => `<rect width="${n(w)}" height="${n(h)}" fill="${PAPER}"/><rect width="${n(w)}" height="${n(Math.min(h, 60))}" fill="${RED}"/><rect y="${n(h - Math.min(h, 60))}" width="${n(w)}" height="${n(Math.min(h, 60))}" fill="${BLUE}"/>`,
    ink: BLACK,
    accent: RED,
    plate: PAPER,
    rule: BLACK,
  },
  scene: { surface: 'paper', base: '#8F8B84', hi: '#B8B3AA', lo: '#4A4742', fan: ['AS', 'KC', 'QH', 'JD', 'JK1'], spread: ['AS', 'KS', 'QH', 'JC', 'AD', 'QD', 'KH', 'JK2'] },
};

export { rrect, GREY };
