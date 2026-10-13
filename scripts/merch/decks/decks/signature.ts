/**
 * Bridge 125 Signature — the brand deck: ivory faces, ruby & ink suits, art-deco courts on felt green with brass-gold
 * sunbursts, and the felt-and-brass back the app uses. The Queen of Spades is the dark special card.
 */
import { logoMark, wordmark } from '../lib/brand.ts';
import { B, CX, CY, H, TH, TW, W, jokerIndex, textIndex, type CardId, type DeckTheme, type Rank, type Suit } from '../lib/cards.ts';
import { COURT_FRAME, courtCard, flatPainter, rays } from '../lib/court.ts';
import { figure, type FigureSpec } from '../lib/figure.ts';
import { face } from '../lib/font.ts';
import { CLASSIC, isRed, suitAt } from '../lib/suits.ts';
import { dbl, lin, n, quad, rad, ring, rrect, star } from '../lib/svg.ts';

const FELT = '#0B3B30', FELT2 = '#17614D', FELT_D = '#062A21';
const GOLD = '#C9A85A', GOLD_HI = '#F3DE9C', GOLD_LO = '#A27E2C';
const IVORY = '#F4EEDF', INK = '#15161B', RUBY = '#C23347', RUBY_D = '#7E1626';

const defs = lin('g', [[0, GOLD_HI], [0.5, GOLD], [1, GOLD_LO]])
  // symmetric gold for the back (a top-lit gradient would break the 180° symmetry)
  + lin('gs', [[0, GOLD_LO], [0.5, GOLD_HI], [1, GOLD_LO]])
  + lin('gh', [[0, GOLD_LO], [0.5, GOLD_HI], [1, GOLD_LO]], 0, 0, 1, 0)
  + lin('paper', [[0, '#FFFBF1'], [0.5, '#F8F1E2'], [1, '#FFFBF1']])
  + rad('feltR', [[0, FELT2], [0.7, FELT], [1, FELT_D]], 0.5, 0.5, 0.7)
  + rad('rubyR', [[0, '#D8455A'], [0.7, RUBY], [1, RUBY_D]], 0.5, 0.5, 0.7)
  + rad('inkR', [[0, '#2A2C35'], [0.7, '#17181E'], [1, '#0B0C10']], 0.5, 0.5, 0.7)
  + `<pattern id="deco" width="40" height="34" patternUnits="userSpaceOnUse"><path d="M0 34A20 20 0 0 1 40 34M8 34A12 12 0 0 1 32 34M16 34A4 4 0 0 1 24 34M-20 17A20 20 0 0 1 20 17M20 17A20 20 0 0 1 60 17" fill="none" stroke="${GOLD}" stroke-width="2" opacity=".55"/></pattern>`
  + `<pattern id="chev" width="28" height="22" patternUnits="userSpaceOnUse"><path d="M0 16L14 4L28 16" fill="none" stroke="${GOLD}" stroke-width="3" opacity=".7"/></pattern>`
  + `<pattern id="lattice" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="translate(${n(CX)} ${n(CY)}) rotate(45) translate(-22 -22)"><path d="M0 22H44M22 0V44" stroke="${GOLD}" stroke-width="1.4" opacity=".28"/><circle cx="22" cy="22" r="2.6" fill="${GOLD}" opacity=".45"/></pattern>`;

const sc = (s: Suit) => (isRed(s) ? RUBY : INK);

/** Ivory face with a fine double gold rule and stepped deco corners. */
function faceBg() {
  const x = B + 26, y = B + 26, w = TW - 52, h = TH - 52;
  const corner = `<path d="M${x + 14} ${y + 46}V${y + 14}H${x + 46}M${x + 24} ${y + 56}V${y + 24}H${x + 56}" fill="none" stroke="url(#g)" stroke-width="2.2"/>`;
  // only the two corners without an index (top-right, bottom-left)
  const cs = `<g transform="matrix(-1 0 0 1 ${W} 0)">${corner + dbl(corner, CX, CY)}</g>`;
  return `<rect width="${W}" height="${H}" fill="url(#paper)"/>`
    + `<path d="${rrect(x, y, w, h, 24)}" fill="none" stroke="${GOLD}" stroke-width="1.6" opacity=".7"/>` + cs;
}

const index = (rank: Rank, s: Suit) => textIndex({ rank, s, font: 'corm700', size: 124, fill: sc(s), suitFill: sc(s), x: B + 84, y: B + 136, suitSize: 58 });

const pip = (s: Suit, x: number, y: number, size: number, flip: boolean) => suitAt(CLASSIC, s, x, y, size, `fill="${sc(s)}"`, flip);

function ace(s: Suit) {
  const r = 250;
  const tick = (a: number) => `M${n(CX + 262 * Math.sin(a))} ${n(CY - 262 * Math.cos(a))}L${n(CX + (a % (Math.PI / 6) < 0.01 ? 304 : 284) * Math.sin(a))} ${n(CY - (a % (Math.PI / 6) < 0.01 ? 304 : 284) * Math.cos(a))}`;
  let ticks = '';
  for (let i = 0; i < 36; i++) ticks += tick((i * Math.PI) / 18);
  const halo = `<path d="${ticks}" stroke="url(#g)" stroke-width="3.2" stroke-linecap="round"/>`
    + `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="url(#g)" stroke-width="4"/>`
    + `<circle cx="${CX}" cy="${CY}" r="${r - 16}" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-dasharray="2 9" stroke-linecap="round"/>`;
  let mid: string;
  if (s === 'S') {
    const g6 = face('golos600');
    mid = `<circle cx="${CX}" cy="${CY}" r="${r - 26}" fill="url(#feltR)"/>`
      + `<circle cx="${CX}" cy="${CY}" r="${r - 26}" fill="url(#lattice)"/>`
      + suitAt(CLASSIC, 'S', CX, CY + 4, 300, `fill="url(#g)" stroke="${GOLD_LO}" stroke-width="1.5"`)
      + wordmark(CX, CY + 390, 40, INK, GOLD_LO)
      + `<path d="${g6.text('SIGNATURE DECK', CX, CY - 352, 20, { tracking: 0.42, anchor: 'middle' }).d}" fill="${INK}" opacity=".62"/>`;
  } else {
    mid = `<circle cx="${CX}" cy="${CY}" r="${r - 26}" fill="${isRed(s) ? 'url(#rubyR)' : 'url(#inkR)'}" opacity=".08"/>`
      + suitAt(CLASSIC, s, CX, CY + 4, 280, `fill="${sc(s)}"`)
      + suitAt(CLASSIC, s, CX, CY + 4, 280, `fill="none" stroke="url(#g)" stroke-width="${n(3 / 2.8)}"`);
  }
  return faceBg() + halo + mid + dbl(index('A', s), CX, CY);
}

// ------------------------------------------------------------------------------------------------ courts
const SKIN = '#F2D7BB';
const ROBES: Record<Suit, { robe: string; robe2: string; robe3: string; panel: string; pat: string }> = {
  S: { robe: '#1E2029', robe2: RUBY, robe3: IVORY, panel: 'url(#feltR)', pat: 'url(#deco)' },
  H: { robe: RUBY, robe2: '#1E2029', robe3: IVORY, panel: 'url(#feltR)', pat: 'url(#chev)' },
  D: { robe: '#EDE3CC', robe2: RUBY, robe3: '#1E2029', panel: 'url(#feltR)', pat: 'url(#deco)' },
  C: { robe: '#0F5443', robe2: '#1E2029', robe3: IVORY, panel: 'url(#inkR)', pat: 'url(#chev)' },
};

const SPECS: Record<'J' | 'Q' | 'K', Record<Suit, Omit<FigureSpec, 'uid'>>> = {
  K: {
    S: { headwear: 'crown', hair: 'short', beard: 'full', collar: 'v', item: 'sword', item2: 'orb', fur: true, necklace: 'chain', gaze: 1 },
    H: { headwear: 'crown', hair: 'curly', beard: 'pointed', collar: 'square', item: 'sceptre', item2: 'goblet', fur: true, gaze: -1 },
    D: { headwear: 'crownLeaf', hair: 'short', beard: 'moustache', collar: 'high', item: 'axe', item2: 'key', fur: true, necklace: 'chain', gaze: 1 },
    C: { headwear: 'crown', hair: 'curly', beard: 'full', collar: 'v', item: 'staff', item2: 'orb', fur: true, gaze: -1 },
  },
  Q: {
    S: { headwear: 'diadem', hair: 'wavy', beard: 'none', collar: 'round', item: 'fan', item2: 'rose', fem: true, necklace: 'beads', gaze: 1 },
    H: { headwear: 'tiara', hair: 'long', beard: 'none', collar: 'ruff', item: 'mirror', item2: 'flower', fem: true, necklace: 'beads', gaze: -1 },
    D: { headwear: 'tiara', hair: 'bob', beard: 'none', collar: 'round', item: 'sceptre', item2: 'rose', fem: true, necklace: 'beads', gaze: 1 },
    C: { headwear: 'diadem', hair: 'bun', beard: 'none', collar: 'v', item: 'fan', item2: 'flower', fem: true, necklace: 'beads', gaze: -1 },
  },
  J: {
    S: { headwear: 'cap', hair: 'short', beard: 'none', collar: 'lapel', item: 'sword', item2: 'key', gaze: 1 },
    H: { headwear: 'beret', hair: 'curly', beard: 'moustache', collar: 'v', item: 'staff', item2: 'flower', gaze: -1 },
    D: { headwear: 'cap', hair: 'curly', beard: 'none', collar: 'lapel', item: 'key', item2: 'dice', gaze: 1 },
    C: { headwear: 'brimHat', hair: 'short', beard: 'goatee', collar: 'v', item: 'cards', gaze: -1 },
  },
};

function painter(s: Suit, dark = false) {
  const r = ROBES[s];
  return flatPainter({
    outline: dark ? '#0B0C10' : INK, ow: 2.6, line: '#3B2A20', lw: 2.6, blush: 0.28,
    fills: {
      skin: dark ? '#E9CBA8' : SKIN, hair: '#2C2018', beard: '#3A2C22', lips: '#B8394A', blush: '#E07A7A', eye: '#FFFDF6', iris: '#1C2A26',
      crown: 'url(#g)', crown2: GOLD_LO, jewel: RUBY, jewel2: '#2E8B6E', pearl: '#FFF8E6',
      robe: dark ? '#14151B' : r.robe, robe2: dark ? RUBY : r.robe2, robe3: dark ? '#2A2C35' : r.robe3, trim: GOLD, fur: '#F7F1E4', lace: '#FFFBF1',
      metal: '#DCE1E6', wood: '#6B4423', flower: RUBY, flower2: '#F2C4C8', leaf: '#2E7D5B', fruit: RUBY, ribbon: RUBY,
    },
    strokes: { crown: GOLD_LO, trim: GOLD },
  });
}

function court(rank: 'J' | 'Q' | 'K', s: Suit) {
  const qs = rank === 'Q' && s === 'S';
  const r = ROBES[s];
  const spec: FigureSpec = { ...SPECS[rank][s], uid: `c${rank}${s}`, pattern: qs ? 'url(#deco)' : r.pat, patternOpacity: 0.9 };
  const half = figure(spec, painter(s, qs));
  const under = rays(0, -300, 36, 640, 4.2, `fill="${GOLD}" opacity="${qs ? 0.22 : 0.16}"`)
    + `<circle cx="0" cy="-300" r="150" fill="none" stroke="${GOLD}" stroke-width="2" opacity=".35"/>`;
  const f = COURT_FRAME;
  const divider = `<path d="M${f.x} ${CY}H${f.x + f.w}" stroke="url(#gh)" stroke-width="5"/>`
    + `<path d="M${CX} ${CY - 34}L${CX + 34} ${CY}L${CX} ${CY + 34}L${CX - 34} ${CY}Z" fill="${qs ? '#14151B' : IVORY}" stroke="url(#g)" stroke-width="4"/>`
    + suitAt(CLASSIC, s, CX, CY + 1, 30, `fill="${qs ? GOLD : sc(s)}"`);
  const bg = qs
    ? `<rect width="${W}" height="${H}" fill="url(#inkR)"/><path d="${rrect(B + 26, B + 26, TW - 52, TH - 52, 24)}" fill="none" stroke="url(#g)" stroke-width="2"/>`
    : faceBg();
  const ix = qs
    ? textIndex({ rank, s, font: 'corm700', size: 124, fill: 'url(#g)', suitFill: 'url(#g)', x: B + 84, y: B + 136, suitSize: 58 })
    : index(rank, s);
  return courtCard({ uid: `k${rank}${s}`, bg, panel: qs ? '#101116' : r.panel, under, half, divider, border: `stroke="url(#g)" stroke-width="5"`, index: ix });
}

function joker(k: 1 | 2) {
  const red = k === 2;
  const p = flatPainter({
    outline: INK, ow: 2.6, line: '#3B2A20', lw: 2.6, blush: 0.3,
    fills: {
      skin: SKIN, hair: '#2C2018', lips: '#B8394A', blush: '#E07A7A', eye: '#FFFDF6', iris: '#1C2A26',
      crown: red ? RUBY : '#1E2029', crown2: red ? '#1E2029' : RUBY, pearl: 'url(#g)', trim: GOLD, robe: red ? RUBY : '#1E2029', robe2: red ? '#1E2029' : '#0F5443', robe3: IVORY,
      lace: '#FFFBF1', jewel: RUBY, jewel2: '#2E8B6E',
    },
    strokes: { trim: GOLD },
  });
  const half = figure({ headwear: 'jester', hair: 'curly', beard: 'none', collar: 'ruff', item: 'cards', item2: 'dice', gaze: red ? -1 : 1, uid: `j${k}`, pattern: 'url(#chev)', patternOpacity: 0.8 }, p);
  const under = rays(0, -300, 24, 640, 7, `fill="${GOLD}" opacity=".2"`);
  const f = COURT_FRAME;
  const g8 = face('golos800');
  const divider = `<path d="M${f.x} ${CY}H${f.x + f.w}" stroke="url(#gh)" stroke-width="5"/>`
    + `<rect x="${CX - 92}" y="${CY - 26}" width="184" height="52" rx="26" fill="${INK}" stroke="url(#g)" stroke-width="4"/>`
    + `<path d="${g8.text('JOKER', CX, CY + 12, 32, { tracking: 0.3, anchor: 'middle' }).d}" fill="url(#g)"/>`;
  return courtCard({ uid: `jk${k}`, bg: faceBg(), panel: red ? 'url(#rubyR)' : 'url(#feltR)', under, half, divider, border: 'stroke="url(#g)" stroke-width="5"', index: '' })
    + jokerIndex(red ? RUBY : INK, 'golos800', 38);
}

// ------------------------------------------------------------------------------------------------ back
function back() {
  const ix = B + 58, iy = B + 58, iw = TW - 116, ih = TH - 116;
  const inner = rrect(ix, iy, iw, ih, 18);
  let fan = '';
  for (let r = 40; r <= 160; r += 30) fan += `<path d="M${n(ix + r)} ${n(iy)}A${r} ${r} 0 0 1 ${n(ix)} ${n(iy + r)}" fill="none" stroke="${GOLD}" stroke-width="${r === 160 ? 3 : 1.5}" opacity="${r === 160 ? 0.9 : 0.6}"/>`;
  for (let a = 0; a <= 90; a += 15) fan += `<path d="M${ix} ${iy}L${n(ix + 160 * Math.cos((a * Math.PI) / 180))} ${n(iy + 160 * Math.sin((a * Math.PI) / 180))}" stroke="${GOLD}" stroke-width="1.2" opacity=".55"/>`;
  fan = `<path d="M${ix} ${iy}H${ix + 160}A160 160 0 0 1 ${ix} ${iy + 160}Z" fill="${FELT_D}" opacity=".7"/>` + fan;
  const raysG = `<g clip-path="url(#bkc)" opacity=".22">${rays(CX, CY, 96, 900, 0.9, `fill="${GOLD}"`)}</g>`;
  const medal = `<circle cx="${CX}" cy="${CY}" r="252" fill="${FELT_D}"/>`
    + ring(`<path d="M${CX} ${CY - 196}L${CX} ${CY - 238}" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`, 36, CX, CY)
    + `<circle cx="${CX}" cy="${CY}" r="186" fill="url(#feltR)" stroke="url(#gs)" stroke-width="5"/>`
    + `<circle cx="${CX}" cy="${CY}" r="252" fill="none" stroke="url(#gs)" stroke-width="3"/>`
    + `<path d="${star(CX, CY, 8, 170, 150, 22.5)}" fill="none" stroke="${GOLD}" stroke-width="1.5" opacity=".6"/>`
    + suitAt(CLASSIC, 'S', CX, CY - 62, 118, 'fill="url(#gs)"') + suitAt(CLASSIC, 'S', CX, CY + 62, 118, 'fill="url(#gs)"', true)
    + `<path d="M${CX - 120} ${CY}H${CX - 40}M${CX + 40} ${CY}H${CX + 120}" stroke="url(#gh)" stroke-width="3"/>`
    + `<circle cx="${CX}" cy="${CY}" r="7" fill="${GOLD}"/>`;
  const ends = `<path d="M${CX} ${B + 96}L${CX + 34} ${B + 130}L${CX} ${B + 164}L${CX - 34} ${B + 130}Z" fill="${FELT_D}" stroke="url(#gs)" stroke-width="3"/>`
    + suitAt(CLASSIC, 'S', CX, B + 131, 30, 'fill="url(#gs)"');
  return `<defs><clipPath id="bkc"><path d="${inner}"/></clipPath></defs><rect width="${W}" height="${H}" fill="url(#feltR)"/>`
    + `<path d="${inner}" fill="url(#lattice)"/>` + raysG
    + `<g clip-path="url(#bkc)">${quad(fan, CX, CY)}</g>`
    + `<path d="${rrect(B + 30, B + 30, TW - 60, TH - 60, 26)}" fill="none" stroke="url(#gs)" stroke-width="5"/>`
    + `<path d="${inner}" fill="none" stroke="${GOLD}" stroke-width="2"/>`
    + medal + dbl(ends, CX, CY);
}

export const signature: DeckTheme = {
  id: 'signature',
  productId: 'deck',
  name: 'Signature',
  boxLine: 'Felt green & brass — the house deck',
  markets: ['*'],
  edition36: true,
  colours: { primary: FELT, secondary: GOLD, accent: RUBY, paper: IVORY },
  defs,
  faceBg: (_id: CardId) => faceBg(),
  index,
  pip,
  pipField: { dx: 158, top: CY - 338, bottom: CY + 338, size: 122 },
  ace,
  court,
  joker,
  back,
  box: {
    front: () => back(),
    panel: (w, h) => `<rect width="${n(w)}" height="${n(h)}" fill="url(#feltR)"/><rect width="${n(w)}" height="${n(h)}" fill="url(#lattice)"/>`,
    ink: IVORY,
    accent: 'url(#g)',
    plate: FELT_D,
    rule: GOLD,
  },
  scene: { surface: 'felt', base: '#0E4436', hi: '#1B6B54', lo: '#04221B', fan: ['AS', 'KH', 'QS', 'JD', 'JK1'], spread: ['AS', 'KS', 'QH', 'JD', 'AH', '10C', 'QS', 'JK2'] },
};

export { logoMark };
