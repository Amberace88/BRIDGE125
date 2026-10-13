/**
 * The court-card figure builder: an original, stylised half-length figure (head, headwear, robe, hands, attribute)
 * drawn in the upper half of the card and repeated upside down — the classic double-ended court layout.
 *
 * Local coordinates: (0, 0) is the card centre, the half-figure lives in x ∈ [-215, 215], y ∈ [-470, 0].
 * Every shape is painted through a role → attributes function, so one drawing becomes a folk print, an art-deco
 * engraving or a neon sign depending on the deck's painter.
 */
import { circ, n, poly, star } from './svg.ts';

export type Role =
  | 'skin' | 'hair' | 'beard' | 'lips' | 'blush' | 'eye' | 'iris' | 'line'
  | 'crown' | 'crown2' | 'jewel' | 'jewel2' | 'pearl'
  | 'robe' | 'robe2' | 'robe3' | 'trim' | 'fur' | 'lace'
  | 'metal' | 'wood' | 'flower' | 'flower2' | 'leaf' | 'fruit' | 'ribbon';

/** f(role): filled shape attributes · s(role, width?): stroke-only line attributes. */
export interface Painter { f: (role: Role) => string; s: (role: Role, width?: number) => string }

export type Headwear =
  | 'crown' | 'crownLeaf' | 'crownFur' | 'tallHat' | 'wreathOak'
  | 'tiara' | 'kokoshnik' | 'flowerWreath' | 'peineta' | 'coinCap' | 'veilCrown' | 'diadem'
  | 'cap' | 'brimHat' | 'skullcap' | 'folkHat' | 'fedora' | 'jester' | 'beret' | 'turbanless' | 'none';

export type Item =
  | 'sword' | 'sceptre' | 'axe' | 'orb' | 'flower' | 'fan' | 'staff' | 'key' | 'pomegranate' | 'goblet'
  | 'guitar' | 'oak' | 'amber' | 'mirror' | 'cards' | 'dice' | 'rose' | 'spindle' | 'lantern' | 'mic' | 'none';

export type HairStyle = 'short' | 'curly' | 'long' | 'braids' | 'bun' | 'bob' | 'wavy';
export type Beard = 'none' | 'full' | 'pointed' | 'moustache' | 'goatee';
export type Collar = 'v' | 'round' | 'high' | 'ruff' | 'square' | 'lapel';

export interface FigureSpec {
  headwear: Headwear;
  hair: HairStyle;
  beard: Beard;
  collar: Collar;
  item: Item;
  /** Small attribute in the other hand. */
  item2?: Item;
  /** Gaze: -1 looks left, 1 looks right. */
  gaze?: number;
  /** Fur trim on the shoulders (kings). */
  fur?: boolean;
  necklace?: 'beads' | 'chain' | 'coins' | 'none';
  /** Feminine features (lashes, lips). */
  fem?: boolean;
  /** Robe pattern fill (e.g. url(#pat-folk)) laid over the robe, clipped to it. */
  pattern?: string;
  patternOpacity?: number;
  /** Second pattern used on the central panel. */
  panelPattern?: string;
  /** Unique id prefix (clip paths). */
  uid: string;
  /** Eyes closed / sunglasses for the neon deck. */
  shades?: boolean;
}

const HY = -300, FRX = 52, FRY = 66;

// ------------------------------------------------------------------------------------------------ body
const BODY = 'M-24 -224C-62 -216 -146 -206 -176 -174C-199 -148 -205 -92 -208 0L208 0C205 -92 199 -148 176 -174C146 -206 62 -216 24 -224Z';

function collar(c: Collar, p: Painter) {
  switch (c) {
    case 'v': return `<path d="M-46 -222L0 -138L46 -222Z" ${p.f('robe3')}/><path d="M-60 -220L0 -122L60 -220" ${p.s('trim')}/>`;
    case 'round': return `<path d="M-58 -220C-50 -180 -26 -164 0 -164C26 -164 50 -180 58 -220Z" ${p.f('robe3')}/><path d="M-66 -218C-56 -168 -28 -152 0 -152C28 -152 56 -168 66 -218" ${p.s('trim')}/>`;
    case 'high': return `<path d="M-40 -240L-46 -196C-30 -186 30 -186 46 -196L40 -240C24 -232 -24 -232 -40 -240Z" ${p.f('robe2')}/>`;
    case 'square': return `<path d="M-62 -220L-62 -168L62 -168L62 -220Z" ${p.f('robe3')}/><path d="M-70 -222V-160H70V-222" ${p.s('trim')}/>`;
    case 'lapel': return `<path d="M-38 -224L0 -120L38 -224Z" ${p.f('robe3')}/><path d="M-38 -224L-78 -206L-30 -96L0 -120Z" ${p.f('robe2')}/><path d="M38 -224L78 -206L30 -96L0 -120Z" ${p.f('robe2')}/>`;
    case 'ruff': {
      let g = '';
      for (let i = 0; i < 13; i++) {
        const a = -150 + i * 25, x = 112 * Math.sin((a * Math.PI) / 180), y = -214 + 26 * Math.cos((a * Math.PI) / 180) * 0.4;
        g += `<ellipse cx="${n(x * 0.62)}" cy="${n(y)}" rx="18" ry="16" ${p.f('lace')}/>`;
      }
      return g;
    }
  }
}

function necklace(kind: FigureSpec['necklace'], p: Painter) {
  if (!kind || kind === 'none') return '';
  if (kind === 'beads') {
    let g = '';
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, x = -58 + 116 * t, y = -214 + 52 * Math.sin(Math.PI * t);
      g += `<circle cx="${n(x)}" cy="${n(y)}" r="${i === 5 ? 11 : 7.5}" ${p.f(i === 5 ? 'jewel' : 'jewel2')}/>`;
    }
    return g;
  }
  if (kind === 'coins') {
    let g = `<path d="M-62 -216C-40 -170 40 -170 62 -216" ${p.s('line')}/>`;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, x = -60 + 120 * t, y = -214 + 44 * Math.sin(Math.PI * t);
      g += `<circle cx="${n(x)}" cy="${n(y + 10)}" r="9" ${p.f('crown')}/>`;
    }
    return g;
  }
  // chain with a medallion
  return `<path d="M-64 -214C-46 -150 46 -150 64 -214" ${p.s('crown')} stroke-dasharray="7 4"/>`
    + `<circle cx="0" cy="-150" r="20" ${p.f('crown')}/><circle cx="0" cy="-150" r="9" ${p.f('jewel')}/>`;
}

// ------------------------------------------------------------------------------------------------ head
function hairBack(h: HairStyle, p: Painter) {
  switch (h) {
    case 'long': return `<path d="M-64 ${HY - 40}C-92 ${HY + 30} -100 ${HY + 120} -118 ${HY + 168}C-70 ${HY + 150} -60 ${HY + 110} -50 ${HY + 60}L50 ${HY + 60}C60 ${HY + 110} 70 ${HY + 150} 118 ${HY + 168}C100 ${HY + 120} 92 ${HY + 30} 64 ${HY - 40}Z" ${p.f('hair')}/>`;
    case 'wavy': return `<path d="M-64 ${HY - 40}C-96 ${HY + 20} -80 ${HY + 70} -104 ${HY + 110}C-86 ${HY + 140} -110 ${HY + 160} -96 ${HY + 182}C-70 ${HY + 160} -58 ${HY + 110} -48 ${HY + 60}L48 ${HY + 60}C58 ${HY + 110} 70 ${HY + 160} 96 ${HY + 182}C110 ${HY + 160} 86 ${HY + 140} 104 ${HY + 110}C80 ${HY + 70} 96 ${HY + 20} 64 ${HY - 40}Z" ${p.f('hair')}/>`;
    case 'braids': {
      let g = '';
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          const y = HY + 40 + i * 30, x = sx * (66 + i * 5);
          g += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="17" ry="20" ${p.f('hair')}/>`;
        }
        g += `<path d="M${sx * 88} ${HY + 214}l${sx * -10} 20l${sx * 22} 0Z" ${p.f('ribbon')}/>`;
      }
      return g;
    }
    case 'bun': return `<circle cx="0" cy="${HY - 70}" r="34" ${p.f('hair')}/>`;
    case 'bob': return `<path d="M-66 ${HY - 30}C-80 ${HY + 20} -78 ${HY + 56} -64 ${HY + 66}L64 ${HY + 66}C78 ${HY + 56} 80 ${HY + 20} 66 ${HY - 30}Z" ${p.f('hair')}/>`;
    default: return '';
  }
}

function hairFront(h: HairStyle, p: Painter, fem: boolean) {
  // hair cap over the forehead (headwear sits on top), side locks by the ears
  const cap = `<path d="M${-FRX - 4} ${HY + 6}C${-FRX - 6} ${HY - 50} -30 ${HY - FRY - 8} 0 ${HY - FRY - 8}C30 ${HY - FRY - 8} ${FRX + 6} ${HY - 50} ${FRX + 4} ${HY + 6}C${FRX - 6} ${HY - 22} 30 ${HY - 44} 0 ${HY - 46}C-30 ${HY - 44} ${-FRX + 6} ${HY - 22} ${-FRX - 4} ${HY + 6}Z" ${p.f('hair')}/>`;
  if (h === 'curly') {
    let g = cap;
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) g += `<circle cx="${n(sx * (FRX + 6))}" cy="${n(HY - 10 + i * 22)}" r="13" ${p.f('hair')}/>`;
    return g;
  }
  if (h === 'short') return cap + `<path d="M${-FRX - 4} ${HY + 6}L${-FRX - 2} ${HY + 26}L${-FRX + 8} ${HY + 4}Z" ${p.f('hair')}/><path d="M${FRX + 4} ${HY + 6}L${FRX + 2} ${HY + 26}L${FRX - 8} ${HY + 4}Z" ${p.f('hair')}/>`;
  if (fem) return cap + `<path d="M-10 ${HY - 46}C-30 ${HY - 40} -46 ${HY - 20} -54 ${HY + 10}C-58 ${HY - 30} -40 ${HY - 60} -10 ${HY - 60}Z" ${p.f('hair')}/>`;
  return cap;
}

function features(spec: FigureSpec, p: Painter) {
  const gz = spec.gaze ?? 0;
  let g = '';
  const ey = HY - 6;
  for (const sx of [-1, 1]) {
    const ex = sx * 22;
    if (spec.shades) continue;
    g += `<path d="M${ex - 14} ${ey}C${ex - 8} ${ey - 9} ${ex + 8} ${ey - 9} ${ex + 14} ${ey}C${ex + 8} ${ey + 7} ${ex - 8} ${ey + 7} ${ex - 14} ${ey}Z" ${p.f('eye')}/>`;
    g += `<circle cx="${n(ex + gz * 4)}" cy="${ey}" r="5.4" ${p.f('iris')}/>`;
    g += `<path d="M${ex - 14} ${ey}C${ex - 8} ${ey - 9} ${ex + 8} ${ey - 9} ${ex + 14} ${ey}" ${p.s('line')}/>`;
    if (spec.fem) g += `<path d="M${ex + sx * 14} ${ey}l${sx * 7} -6" ${p.s('line')}/>`;
    // brow
    g += `<path d="M${ex - 15} ${ey - 16}C${ex - 6} ${ey - (spec.fem ? 24 : 22)} ${ex + 8} ${ey - 22} ${ex + 16} ${ey - 15}" ${p.s('line')}/>`;
  }
  if (spec.shades) {
    g += `<path d="M-46 ${ey - 12}H46L42 ${ey + 6}C38 ${ey + 14} 12 ${ey + 14} 8 ${ey + 4}H-8C-12 ${ey + 14} -38 ${ey + 14} -42 ${ey + 6}Z" ${p.f('iris')}/>`;
  }
  // nose (follows the gaze a little)
  const nx = gz * 5;
  g += `<path d="M${n(nx - 4)} ${ey - 8}C${n(nx - 2)} ${ey + 8} ${n(nx + 8)} ${ey + 18} ${n(nx + 8)} ${ey + 26}C${n(nx + 4)} ${ey + 31} ${n(nx - 6)} ${ey + 30} ${n(nx - 8)} ${ey + 27}" ${p.s('line')}/>`;
  // blush + mouth
  g += `<circle cx="-30" cy="${HY + 22}" r="11" ${p.f('blush')}/><circle cx="30" cy="${HY + 22}" r="11" ${p.f('blush')}/>`;
  const my = HY + 38;
  g += `<path d="M-15 ${my}C-8 ${my - 6} -3 ${my - 4} 0 ${my - 2}C3 ${my - 4} 8 ${my - 6} 15 ${my}C8 ${my + 8} -8 ${my + 8} -15 ${my}Z" ${p.f('lips')}/>`;
  return g;
}

function beard(b: Beard, p: Painter) {
  const by = HY;
  const mous = `<path d="M0 ${by + 28}C-10 ${by + 22} -30 ${by + 24} -42 ${by + 40}C-30 ${by + 34} -14 ${by + 36} 0 ${by + 34}C14 ${by + 36} 30 ${by + 34} 42 ${by + 40}C30 ${by + 24} 10 ${by + 22} 0 ${by + 28}Z" ${p.f('beard')}/>`;
  switch (b) {
    case 'full': return `<path d="M${-FRX - 2} ${by + 2}C${-FRX} ${by + 60} -34 ${by + 110} 0 ${by + 120}C34 ${by + 110} ${FRX} ${by + 60} ${FRX + 2} ${by + 2}C40 ${by + 30} 30 ${by + 50} 0 ${by + 52}C-30 ${by + 50} -40 ${by + 30} ${-FRX - 2} ${by + 2}Z" ${p.f('beard')}/>` + mous;
    case 'pointed': return `<path d="M${-FRX + 2} ${by + 16}C${-FRX + 4} ${by + 70} -20 ${by + 104} 0 ${by + 138}C20 ${by + 104} ${FRX - 4} ${by + 70} ${FRX - 2} ${by + 16}C36 ${by + 40} 26 ${by + 54} 0 ${by + 56}C-26 ${by + 54} -36 ${by + 40} ${-FRX + 2} ${by + 16}Z" ${p.f('beard')}/>` + mous;
    case 'goatee': return `<path d="M-14 ${by + 52}C-14 ${by + 70} -6 ${by + 84} 0 ${by + 90}C6 ${by + 84} 14 ${by + 70} 14 ${by + 52}C8 ${by + 56} -8 ${by + 56} -14 ${by + 52}Z" ${p.f('beard')}/>` + mous;
    case 'moustache': return mous;
    default: return '';
  }
}

// ------------------------------------------------------------------------------------------------ headwear
const TOP = HY - FRY + 6; // where headwear sits (≈ -360)

function crownPoints(pts: number, w: number, h: number, base: number) {
  const ps: [number, number][] = [[-w, base]];
  for (let i = 0; i <= pts * 2; i++) {
    const t = i / (pts * 2), x = -w + 2 * w * t;
    ps.push([x, i % 2 === 0 ? base - h : base - h * 0.42]);
  }
  ps.push([w, base]);
  return poly(ps);
}

function headwear(hw: Headwear, p: Painter) {
  const b = TOP;
  switch (hw) {
    case 'crown': {
      let g = `<path d="${crownPoints(3, 66, 92, b - 20)}" ${p.f('crown')}/>`;
      for (let i = 0; i <= 6; i += 2) { const x = -66 + 132 * (i / 6); g += `<circle cx="${n(x)}" cy="${n(b - 20 - 92)}" r="9" ${p.f('pearl')}/>`; }
      g += `<rect x="-70" y="${b - 34}" width="140" height="32" rx="6" ${p.f('crown2')}/>`;
      for (const x of [-44, 0, 44]) g += `<path d="${star(x, b - 18, 4, 11, 5)}" ${p.f(x ? 'jewel2' : 'jewel')}/>`;
      return g;
    }
    case 'crownLeaf': {
      let g = '';
      for (let i = -2; i <= 2; i++) {
        const x = i * 28, h = 76 - Math.abs(i) * 12;
        g += `<path d="M${x} ${b - 26 - h}C${x + 20} ${b - 40 - h * 0.5} ${x + 14} ${b - 30} ${x} ${b - 24}C${x - 14} ${b - 30} ${x - 20} ${b - 40 - h * 0.5} ${x} ${b - 26 - h}Z" ${p.f('crown')}/>`;
      }
      g += `<rect x="-72" y="${b - 34}" width="144" height="30" rx="8" ${p.f('crown2')}/>`;
      for (const x of [-48, -16, 16, 48]) g += `<circle cx="${x}" cy="${b - 19}" r="8" ${p.f(x === -16 || x === 16 ? 'jewel' : 'jewel2')}/>`;
      return g;
    }
    case 'crownFur': {
      return `<path d="M-60 ${b - 26}C-62 ${b - 110} 62 ${b - 110} 60 ${b - 26}Z" ${p.f('crown')}/>`
        + `<path d="M-30 ${b - 96}C-26 ${b - 60} 26 ${b - 60} 30 ${b - 96}" ${p.s('line')}/><path d="M0 ${b - 104}V${b - 34}" ${p.s('line')}/>`
        + `<circle cx="0" cy="${b - 116}" r="12" ${p.f('jewel')}/>`
        + `<path d="M-78 ${b - 40}C-78 ${b - 58} 78 ${b - 58} 78 ${b - 40}L80 ${b - 6}C40 ${b + 4} -40 ${b + 4} -80 ${b - 6}Z" ${p.f('fur')}/>`;
    }
    case 'tallHat': {
      return `<path d="M-62 ${b - 6}L-70 ${b - 128}C-30 ${b - 146} 30 ${b - 146} 70 ${b - 128}L62 ${b - 6}C30 ${b + 4} -30 ${b + 4} -62 ${b - 6}Z" ${p.f('fur')}/>`
        + `<path d="M-60 ${b - 40}C-20 ${b - 30} 20 ${b - 30} 60 ${b - 40}" ${p.s('trim')}/>`
        + `<path d="M-40 ${b - 140}C-20 ${b - 112} 20 ${b - 112} 40 ${b - 140}" ${p.f('crown')}/>`
        + `<circle cx="0" cy="${b - 72}" r="11" ${p.f('jewel')}/>`;
    }
    case 'wreathOak': {
      let g = '';
      for (let i = 0; i < 9; i++) {
        const a = -80 + i * 20, r = 74, x = r * Math.sin((a * Math.PI) / 180), y = b - 6 - r * 0.5 * Math.cos((a * Math.PI) / 180);
        g += `<g transform="translate(${n(x)} ${n(y)}) rotate(${a})"><path d="M0 -30C14 -24 8 -14 14 -8C6 -4 10 6 0 12C-10 6 -6 -4 -14 -8C-8 -14 -14 -24 0 -30Z" ${p.f('leaf')}/></g>`;
      }
      return `<path d="${crownPoints(3, 58, 62, b - 26)}" ${p.f('crown')}/><rect x="-62" y="${b - 36}" width="124" height="22" rx="6" ${p.f('crown2')}/>` + g
        + `<circle cx="0" cy="${b - 26}" r="10" ${p.f('jewel')}/>`;
    }
    case 'tiara': {
      return `<path d="M-60 ${b - 14}C-48 ${b - 66} -22 ${b - 92} 0 ${b - 98}C22 ${b - 92} 48 ${b - 66} 60 ${b - 14}C30 ${b - 30} -30 ${b - 30} -60 ${b - 14}Z" ${p.f('crown')}/>`
        + `<path d="${star(0, b - 62, 4, 22, 9)}" ${p.f('jewel')}/>`
        + `<circle cx="-34" cy="${b - 40}" r="7" ${p.f('pearl')}/><circle cx="34" cy="${b - 40}" r="7" ${p.f('pearl')}/>`;
    }
    case 'diadem': {
      return `<path d="M-62 ${b - 18}L-44 ${b - 70}L-22 ${b - 44}L0 ${b - 96}L22 ${b - 44}L44 ${b - 70}L62 ${b - 18}C30 ${b - 32} -30 ${b - 32} -62 ${b - 18}Z" ${p.f('crown')}/>`
        + `<circle cx="0" cy="${b - 50}" r="11" ${p.f('jewel')}/><circle cx="-44" cy="${b - 62}" r="6" ${p.f('pearl')}/><circle cx="44" cy="${b - 62}" r="6" ${p.f('pearl')}/><circle cx="0" cy="${b - 98}" r="7" ${p.f('pearl')}/>`;
    }
    case 'kokoshnik': {
      let g = `<path d="M-84 ${b - 4}C-96 ${b - 90} -50 ${b - 150} 0 ${b - 156}C50 ${b - 150} 96 ${b - 90} 84 ${b - 4}C40 ${b - 22} -40 ${b - 22} -84 ${b - 4}Z" ${p.f('crown')}/>`;
      g += `<path d="M-62 ${b - 20}C-70 ${b - 84} -36 ${b - 126} 0 ${b - 130}C36 ${b - 126} 70 ${b - 84} 62 ${b - 20}C30 ${b - 34} -30 ${b - 34} -62 ${b - 20}Z" ${p.f('crown2')}/>`;
      g += `<path d="M0 ${b - 118}C18 ${b - 98} 18 ${b - 74} 0 ${b - 54}C-18 ${b - 74} -18 ${b - 98} 0 ${b - 118}Z" ${p.f('jewel')}/>`;
      for (let i = 0; i < 9; i++) { const a = -64 + i * 16; const [x, y] = [92 * Math.sin((a * Math.PI) / 180), b - 6 - 140 * Math.cos((a * Math.PI) / 180) * 0.98]; g += `<circle cx="${n(x * 0.95)}" cy="${n(y + 8)}" r="6" ${p.f('pearl')}/>`; }
      for (let i = 0; i < 7; i++) g += `<circle cx="${-48 + i * 16}" cy="${b + 4}" r="5" ${p.f('pearl')}/>`;
      return g;
    }
    case 'flowerWreath': {
      let g = '';
      for (let i = 0; i < 7; i++) {
        const a = -72 + i * 24, x = 70 * Math.sin((a * Math.PI) / 180), y = b - 18 - 34 * Math.cos((a * Math.PI) / 180);
        g += `<g transform="translate(${n(x)} ${n(y)}) rotate(${a})"><path d="M0 -26C10 -20 12 -6 0 0C-12 -6 -10 -20 0 -26Z" ${p.f('leaf')}/></g>`;
      }
      for (let i = 0; i < 5; i++) {
        const a = -60 + i * 30, x = 66 * Math.sin((a * Math.PI) / 180), y = b - 22 - 34 * Math.cos((a * Math.PI) / 180);
        const role: Role = i % 2 ? 'flower2' : 'flower';
        g += `<path d="${star(x, y, 6, 19, 11, 15 * i)}" ${p.f(role)}/><circle cx="${n(x)}" cy="${n(y)}" r="6" ${p.f('jewel2')}/>`;
      }
      // ribbons behind (drawn last but thin, falling to the shoulders)
      g += `<path d="M-60 ${b + 4}C-90 ${b + 60} -86 ${b + 120} -110 ${b + 170}L-96 ${b + 172}C-74 ${b + 120} -72 ${b + 66} -50 ${b + 10}Z" ${p.f('ribbon')}/>`;
      g += `<path d="M60 ${b + 4}C90 ${b + 60} 86 ${b + 120} 110 ${b + 170}L96 ${b + 172}C74 ${b + 120} 72 ${b + 66} 50 ${b + 10}Z" ${p.f('ribbon')}/>`;
      return g;
    }
    case 'peineta': {
      let g = `<path d="M-74 ${b - 6}C-76 ${b - 70} -50 ${b - 132} 0 ${b - 144}C50 ${b - 132} 76 ${b - 70} 74 ${b - 6}Z" ${p.f('crown')}/>`;
      for (let i = -3; i <= 3; i++) g += `<path d="M${i * 18} ${b - 10}L${i * 22} ${b - 112 + Math.abs(i) * 12}" ${p.s('line')}/>`;
      g += `<path d="M-40 ${b - 74}C-20 ${b - 90} 20 ${b - 90} 40 ${b - 74}" ${p.s('line')}/>`;
      // the flower behind the ear
      g += `<path d="${star(-62, HY - 20, 8, 26, 16)}" ${p.f('flower')}/><path d="${star(-62, HY - 20, 8, 16, 9, 22)}" ${p.f('flower2')}/><circle cx="-62" cy="${HY - 20}" r="6" ${p.f('jewel2')}/>`;
      return g;
    }
    case 'coinCap': {
      let g = `<path d="M-56 ${b - 6}C-58 ${b - 74} 58 ${b - 74} 56 ${b - 6}Z" ${p.f('crown')}/>`;
      g += `<path d="M-50 ${b - 40}C-20 ${b - 52} 20 ${b - 52} 50 ${b - 40}" ${p.s('trim')}/>`;
      for (let i = 0; i < 9; i++) g += `<circle cx="${-56 + i * 14}" cy="${b + 4 + (i % 2) * 4}" r="7" ${p.f('crown2')}/>`;
      g += `<circle cx="0" cy="${b - 66}" r="10" ${p.f('jewel')}/>`;
      return g;
    }
    case 'veilCrown': {
      return `<path d="M-64 ${b - 10}C-110 ${b + 60} -120 ${b + 150} -132 ${b + 210}L132 ${b + 210}C120 ${b + 150} 110 ${b + 60} 64 ${b - 10}Z" ${p.f('lace')} opacity=".85"/>`
        + `<path d="M-56 ${b - 14}L-40 ${b - 60}L-18 ${b - 40}L0 ${b - 78}L18 ${b - 40}L40 ${b - 60}L56 ${b - 14}Z" ${p.f('crown')}/><circle cx="0" cy="${b - 36}" r="8" ${p.f('jewel')}/>`;
    }
    case 'cap': {
      return `<path d="M-64 ${b - 4}C-70 ${b - 70} 40 ${b - 96} 74 ${b - 46}C82 ${b - 34} 70 ${b - 10} 64 ${b - 4}Z" ${p.f('crown')}/>`
        + `<path d="M-66 ${b - 8}C-30 ${b - 22} 30 ${b - 22} 68 ${b - 8}L68 ${b + 6}C30 ${b - 8} -30 ${b - 8} -66 ${b + 6}Z" ${p.f('crown2')}/>`
        + `<path d="M40 ${b - 60}C80 ${b - 120} 120 ${b - 120} 136 ${b - 150}C120 ${b - 100} 90 ${b - 70} 52 ${b - 50}Z" ${p.f('flower')}/>`;
    }
    case 'beret': {
      return `<path d="M-70 ${b - 6}C-100 ${b - 50} -40 ${b - 96} 30 ${b - 86}C96 ${b - 76} 100 ${b - 30} 70 ${b - 6}C30 ${b - 18} -30 ${b - 18} -70 ${b - 6}Z" ${p.f('crown')}/>`
        + `<path d="M24 ${b - 86}l8 -16" ${p.s('line')}/>`;
    }
    case 'brimHat': {
      return `<path d="M-116 ${b - 10}C-116 ${b - 26} 116 ${b - 26} 116 ${b - 10}C116 ${b + 4} -116 ${b + 4} -116 ${b - 10}Z" ${p.f('crown')}/>`
        + `<path d="M-60 ${b - 14}L-56 ${b - 76}C-20 ${b - 84} 20 ${b - 84} 56 ${b - 76}L60 ${b - 14}Z" ${p.f('crown')}/>`
        + `<path d="M-58 ${b - 34}C-20 ${b - 40} 20 ${b - 40} 58 ${b - 34}L59 ${b - 18}C20 ${b - 24} -20 ${b - 24} -59 ${b - 18}Z" ${p.f('crown2')}/>`;
    }
    case 'fedora': {
      return `<path d="M-108 ${b - 4}C-90 ${b - 30} 90 ${b - 30} 108 ${b - 4}C80 ${b - 12} -80 ${b - 12} -108 ${b - 4}Z" ${p.f('crown')}/>`
        + `<path d="M-58 ${b - 16}C-66 ${b - 70} -40 ${b - 96} 0 ${b - 84}C40 ${b - 96} 66 ${b - 70} 58 ${b - 16}Z" ${p.f('crown')}/>`
        + `<path d="M-60 ${b - 36}C-20 ${b - 44} 20 ${b - 44} 60 ${b - 36}L60 ${b - 20}C20 ${b - 28} -20 ${b - 28} -60 ${b - 20}Z" ${p.f('crown2')}/>`;
    }
    case 'skullcap': {
      let g = `<path d="M-58 ${b - 4}L-56 ${b - 56}C-20 ${b - 68} 20 ${b - 68} 56 ${b - 56}L58 ${b - 4}Z" ${p.f('crown')}/>`;
      for (const x of [-34, 0, 34]) g += `<path d="${star(x, b - 30, 4, 14, 6)}" ${p.f('crown2')}/>`;
      return g;
    }
    case 'folkHat': {
      return `<path d="M-96 ${b - 6}C-96 ${b - 22} 96 ${b - 22} 96 ${b - 6}C96 ${b + 6} -96 ${b + 6} -96 ${b - 6}Z" ${p.f('crown')}/>`
        + `<path d="M-56 ${b - 12}C-60 ${b - 66} -30 ${b - 84} 0 ${b - 84}C30 ${b - 84} 60 ${b - 66} 56 ${b - 12}Z" ${p.f('crown')}/>`
        + `<path d="M-57 ${b - 30}C-20 ${b - 36} 20 ${b - 36} 57 ${b - 30}L57 ${b - 16}C20 ${b - 22} -20 ${b - 22} -57 ${b - 16}Z" ${p.f('crown2')}/>`
        + `<path d="M40 ${b - 34}C60 ${b - 90} 84 ${b - 104} 96 ${b - 128}C84 ${b - 84} 70 ${b - 60} 48 ${b - 30}Z" ${p.f('leaf')}/>`;
    }
    case 'jester': {
      let g = `<path d="M-62 ${b - 4}C-100 ${b - 60} -140 ${b - 70} -150 ${b - 20}C-120 ${b - 120} -40 ${b - 120} 0 ${b - 150}C40 ${b - 120} 120 ${b - 120} 150 ${b - 20}C140 ${b - 70} 100 ${b - 60} 62 ${b - 4}Z" ${p.f('crown')}/>`;
      g += `<path d="M-30 ${b - 10}C-20 ${b - 80} -6 ${b - 120} 0 ${b - 150}C6 ${b - 120} 20 ${b - 80} 30 ${b - 10}Z" ${p.f('crown2')}/>`;
      for (const [x, y] of [[-150, b - 20], [0, b - 150], [150, b - 20]] as const) g += `<circle cx="${x}" cy="${y}" r="13" ${p.f('pearl')}/>`;
      g += `<path d="M-66 ${b - 12}C-30 ${b - 26} 30 ${b - 26} 66 ${b - 12}L66 ${b + 4}C30 ${b - 10} -30 ${b - 10} -66 ${b + 4}Z" ${p.f('trim')}/>`;
      return g;
    }
    case 'turbanless':
    case 'none':
    default: return '';
  }
}

// ------------------------------------------------------------------------------------------------ items
/** Main attribute, held at (gx, gy) in the figure's right hand (viewer's left), leaning up-left. */
function item(it: Item, p: Painter, gx: number, gy: number): { back: string; front: string } {
  const lean = (g: string, deg = -24) => `<g transform="translate(${gx} ${gy}) rotate(${deg})">${g}</g>`;
  switch (it) {
    case 'sword': return {
      back: lean(`<path d="M-11 -40L-11 -300L0 -330L11 -300L11 -40Z" ${p.f('metal')}/><path d="M0 -300V-50" ${p.s('line')}/>`),
      front: lean(`<rect x="-46" y="-52" width="92" height="16" rx="8" ${p.f('crown')}/><rect x="-9" y="-38" width="18" height="70" rx="6" ${p.f('wood')}/><circle cx="0" cy="40" r="13" ${p.f('crown')}/>`),
    };
    case 'sceptre': return {
      back: lean(`<rect x="-8" y="-260" width="16" height="300" rx="7" ${p.f('crown')}/>`),
      front: lean(`<path d="${star(0, -282, 8, 34, 16)}" ${p.f('crown')}/><circle cx="0" cy="-282" r="13" ${p.f('jewel')}/><circle cx="0" cy="40" r="11" ${p.f('crown')}/>`),
    };
    case 'staff': return {
      back: lean(`<rect x="-8" y="-300" width="16" height="340" rx="7" ${p.f('wood')}/>`),
      front: lean(`<path d="M0 -330C26 -316 26 -282 0 -270C-26 -282 -26 -316 0 -330Z" ${p.f('crown')}/><circle cx="0" cy="-300" r="9" ${p.f('jewel')}/>`),
    };
    case 'axe': return {
      back: lean(`<rect x="-8" y="-280" width="16" height="320" rx="7" ${p.f('wood')}/>`),
      front: lean(`<path d="M6 -276C60 -300 82 -250 76 -200C60 -224 30 -226 6 -212Z" ${p.f('metal')}/><path d="M-6 -262L-36 -246L-6 -228Z" ${p.f('metal')}/>`),
    };
    case 'oak': return {
      back: lean(`<path d="M0 30C-4 -60 4 -160 -2 -250" ${p.s('wood', 12)}/>`),
      front: lean([[-2, -250, 0], [-10, -200, -40], [6, -180, 38], [-6, -130, -44], [4, -100, 40]].map(([x, y, a]) =>
        `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 -40C18 -32 10 -20 18 -12C8 -6 14 6 0 14C-14 6 -8 -6 -18 -12C-10 -20 -18 -32 0 -40Z" ${p.f('leaf')}/></g>`).join('')
        + `<circle cx="16" cy="-150" r="11" ${p.f('fruit')}/><circle cx="-18" cy="-230" r="10" ${p.f('fruit')}/>`),
    };
    case 'key': return {
      back: lean(`<rect x="-8" y="-220" width="16" height="250" rx="6" ${p.f('crown')}/>`),
      front: lean(`<circle cx="0" cy="-246" r="34" ${p.f('crown')}/><circle cx="0" cy="-246" r="15" ${p.f('robe3')}/><path d="M8 -40H40V-24H8ZM8 -10H32V6H8Z" ${p.f('crown')}/>`),
    };
    case 'fan': return {
      back: '',
      front: lean(`${[...Array(9)].map((_, i) => { const a = -60 + i * 15; return `<g transform="rotate(${a})"><path d="M-12 -8L-20 -150C-6 -158 6 -158 20 -150L12 -8Z" ${p.f(i % 2 ? 'flower' : 'flower2')}/></g>`; }).join('')}<circle cx="0" cy="0" r="12" ${p.f('crown')}/>`, -30),
    };
    case 'guitar': return {
      back: lean(`<rect x="-10" y="-300" width="20" height="200" rx="4" ${p.f('wood')}/><path d="M-16 -330H16V-290H-16Z" ${p.f('wood')}/>`, -32),
      front: lean(`<path d="M0 -110C40 -110 52 -80 44 -56C40 -44 58 -30 58 0C58 44 26 70 0 70C-26 70 -58 44 -58 0C-58 -30 -40 -44 -44 -56C-52 -80 -40 -110 0 -110Z" ${p.f('robe2')}/><circle cx="0" cy="-30" r="16" ${p.f('iris')}/><rect x="-22" y="20" width="44" height="10" ${p.f('wood')}/>`, -32),
    };
    case 'mirror': return {
      back: lean(`<rect x="-8" y="-120" width="16" height="150" rx="6" ${p.f('crown')}/>`),
      front: lean(`<ellipse cx="0" cy="-180" rx="50" ry="64" ${p.f('crown')}/><ellipse cx="0" cy="-180" rx="36" ry="50" ${p.f('pearl')}/>`),
    };
    case 'spindle': return {
      back: lean(`<path d="M0 30L-6 -260L0 -290L6 -260Z" ${p.f('wood')}/>`),
      front: lean(`<ellipse cx="0" cy="-160" rx="30" ry="56" ${p.f('ribbon')}/><path d="M-28 -180C-10 -170 10 -170 28 -180M-28 -150C-10 -140 10 -140 28 -150" ${p.s('line')}/>`),
    };
    case 'lantern': return {
      back: lean(`<path d="M0 30V-200" ${p.s('line')}/>`),
      front: lean(`<path d="M-30 -260H30L40 -200L30 -140H-30L-40 -200Z" ${p.f('crown')}/><path d="M-18 -246H18L26 -200L18 -154H-18L-26 -200Z" ${p.f('flower')}/>`),
    };
    case 'mic': return {
      back: lean(`<rect x="-9" y="-150" width="18" height="180" rx="8" ${p.f('metal')}/>`),
      front: lean(`<rect x="-26" y="-230" width="52" height="86" rx="26" ${p.f('crown')}/><path d="M-26 -200H26M-26 -180H26" ${p.s('line')}/>`),
    };
    case 'cards': return {
      back: '',
      front: lean([-24, -8, 8, 24].map((a, i) => `<g transform="rotate(${a} 0 20)"><rect x="-34" y="-110" width="68" height="96" rx="8" ${p.f(i === 3 ? 'pearl' : 'lace')}/></g>`).join('')
        + `<path transform="translate(23 -76) rotate(24) scale(.34)" d="M50 4C38 22 8 38 8 60C8 74 19 84 32 84C40 84 46 80 49 75C48 86 44 94 34 98L66 98C56 94 52 86 51 75C54 80 60 84 68 84C81 84 92 74 92 60C92 38 62 22 50 4Z" ${p.f('iris')}/>`, -10),
    };
    default: return { back: '', front: '' };
  }
}

/** Small attribute in the left hand (viewer's right), roughly at (hx, hy). */
function smallItem(it: Item, p: Painter, hx: number, hy: number) {
  switch (it) {
    case 'orb': return `<circle cx="${hx}" cy="${hy - 34}" r="34" ${p.f('crown')}/><path d="M${hx - 34} ${hy - 34}H${hx + 34}M${hx} ${hy - 68}V${hy}" ${p.s('line')}/><circle cx="${hx}" cy="${hy - 74}" r="8" ${p.f('jewel')}/>`;
    case 'flower': case 'rose': return `<path d="M${hx} ${hy}C${hx + 4} ${hy - 40} ${hx - 6} ${hy - 70} ${hx + 2} ${hy - 96}" ${p.s('leaf', 7)}/>`
      + `<path d="M${hx + 2} ${hy - 50}C${hx + 30} ${hy - 70} ${hx + 40} ${hy - 50} ${hx + 36} ${hy - 40}C${hx + 24} ${hy - 36} ${hx + 12} ${hy - 40} ${hx + 2} ${hy - 50}Z" ${p.f('leaf')}/>`
      + `<path d="${star(hx + 2, hy - 110, it === 'rose' ? 5 : 8, 30, 18)}" ${p.f('flower')}/><circle cx="${hx + 2}" cy="${hy - 110}" r="13" ${p.f(it === 'rose' ? 'flower2' : 'jewel2')}/>`;
    case 'pomegranate': return `<path d="M${hx - 38} ${hy - 40}C${hx - 40} ${hy - 80} ${hx - 10} ${hy - 96} ${hx} ${hy - 92}C${hx + 10} ${hy - 96} ${hx + 40} ${hy - 80} ${hx + 38} ${hy - 40}C${hx + 36} ${hy - 4} ${hx + 14} ${hy + 6} ${hx} ${hy + 6}C${hx - 14} ${hy + 6} ${hx - 36} ${hy - 4} ${hx - 38} ${hy - 40}Z" ${p.f('fruit')}/>`
      + `<path d="M${hx - 12} ${hy - 90}L${hx - 14} ${hy - 108}L${hx - 4} ${hy - 98}L${hx} ${hy - 112}L${hx + 4} ${hy - 98}L${hx + 14} ${hy - 108}L${hx + 12} ${hy - 90}Z" ${p.f('fruit')}/>`
      + `<path d="M${hx - 20} ${hy - 50}C${hx - 10} ${hy - 30} ${hx + 10} ${hy - 30} ${hx + 20} ${hy - 50}" ${p.s('line')}/>`;
    case 'goblet': return `<path d="M${hx - 30} ${hy - 90}H${hx + 30}C${hx + 30} ${hy - 50} ${hx + 12} ${hy - 40} ${hx + 6} ${hy - 36}V${hy - 8}H${hx + 22}V${hy + 4}H${hx - 22}V${hy - 8}H${hx - 6}V${hy - 36}C${hx - 12} ${hy - 40} ${hx - 30} ${hy - 50} ${hx - 30} ${hy - 90}Z" ${p.f('crown')}/><circle cx="${hx}" cy="${hy - 62}" r="7" ${p.f('jewel')}/>`;
    case 'amber': return `<path d="M${hx} ${hy - 80}C${hx + 30} ${hy - 70} ${hx + 36} ${hy - 30} ${hx + 20} ${hy - 6}C${hx + 4} ${hy + 6} ${hx - 26} ${hy} ${hx - 32} ${hy - 26}C${hx - 38} ${hy - 54} ${hx - 22} ${hy - 76} ${hx} ${hy - 80}Z" ${p.f('jewel')}/><path d="M${hx - 12} ${hy - 58}C${hx - 2} ${hy - 64} ${hx + 10} ${hy - 58} ${hx + 14} ${hy - 48}" ${p.s('pearl')}/>`;
    case 'dice': return `<g transform="rotate(-12 ${hx} ${hy - 40})"><rect x="${hx - 32}" y="${hy - 72}" width="64" height="64" rx="12" ${p.f('pearl')}/>${[[-16, -56], [16, -24], [0, -40], [-16, -24], [16, -56]].map(([x, y]) => `<circle cx="${hx + x}" cy="${hy + y}" r="6" ${p.f('iris')}/>`).join('')}</g>`;
    case 'fan': return `<g transform="translate(${hx} ${hy}) rotate(20)">${[...Array(7)].map((_, i) => `<g transform="rotate(${-54 + i * 18})"><path d="M-8 -6L-14 -96C-4 -102 4 -102 14 -96L8 -6Z" ${p.f(i % 2 ? 'flower' : 'flower2')}/></g>`).join('')}</g>`;
    case 'key': return `<g transform="translate(${hx} ${hy}) rotate(20)"><circle cx="0" cy="-90" r="20" ${p.f('crown')}/><rect x="-6" y="-72" width="12" height="80" ${p.f('crown')}/><path d="M6 -10H24V0H6Z" ${p.f('crown')}/></g>`;
    default: return '';
  }
}

function hand(x: number, y: number, p: Painter, deg = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${deg})"><path d="M-22 -14C-22 -30 22 -30 22 -14L22 12C22 26 -22 26 -22 12Z" ${p.f('skin')}/><path d="M-22 -2H22M-22 8H22" ${p.s('line')} opacity=".5"/></g>`;
}

/** The upper half of a court figure (local coords, see top of file). */
export function figure(spec: FigureSpec, p: Painter): string {
  const gx = -66, gy = -112;          // main grip
  const hx = 78, hy = -62;            // other hand
  const it = item(spec.item, p, gx, gy);
  const clip = `<clipPath id="${spec.uid}b"><path d="${BODY}"/></clipPath>`;
  let g = `<defs>${clip}</defs>`;
  if (spec.hair !== 'braids') g += hairBack(spec.hair, p);
  g += `<path d="${BODY}" ${p.f('robe')}/>`;
  if (spec.pattern) g += `<g clip-path="url(#${spec.uid}b)"><rect x="-210" y="-230" width="420" height="232" fill="${spec.pattern}" opacity="${spec.patternOpacity ?? 1}"/></g>`;
  // central panel + trims
  g += `<path d="M-46 -200L-58 0H58L46 -200Z" ${p.f('robe2')}/>`;
  if (spec.panelPattern) g += `<path d="M-46 -200L-58 0H58L46 -200Z" fill="${spec.panelPattern}"/>`;
  g += `<path d="M-46 -200L-58 0M46 -200L58 0" ${p.s('trim')}/>`;
  g += `<path d="M-176 -174C-199 -148 -205 -92 -208 0M176 -174C199 -148 205 -92 208 0" ${p.s('trim')}/>`;
  if (spec.fur) {
    g += `<path d="M-24 -226C-80 -214 -160 -204 -184 -164C-150 -140 -100 -150 -60 -170C-40 -180 -30 -200 -24 -226Z" ${p.f('fur')}/>`;
    g += `<path d="M24 -226C80 -214 160 -204 184 -164C150 -140 100 -150 60 -170C40 -180 30 -200 24 -226Z" ${p.f('fur')}/>`;
  }
  // neck, collar, jewellery, braids, then the attribute's shaft (in front of the robe, behind the hand)
  g += `<path d="M-20 ${HY + 46}L-22 -214C-10 -206 10 -206 22 -214L20 ${HY + 46}Z" ${p.f('skin')}/>`;
  g += collar(spec.collar, p);
  g += necklace(spec.necklace, p);
  if (spec.hair === 'braids') g += hairBack('braids', p);
  g += it.back;
  g += `<ellipse cx="${-FRX + 2}" cy="${HY + 4}" rx="10" ry="16" ${p.f('skin')}/><ellipse cx="${FRX - 2}" cy="${HY + 4}" rx="10" ry="16" ${p.f('skin')}/>`;
  g += `<ellipse cx="0" cy="${HY}" rx="${FRX}" ry="${FRY}" ${p.f('skin')}/>`;
  g += features(spec, p);
  g += beard(spec.beard, p);
  g += hairFront(spec.hair, p, !!spec.fem);
  g += headwear(spec.headwear, p);
  // sleeves to the hands
  g += `<path d="M-150 -178C-150 -140 -120 -110 -90 -96L-60 -128C-90 -140 -110 -160 -116 -190Z" ${p.f('robe')}/>`;
  g += `<path d="M150 -178C156 -120 130 -80 100 -48L64 -76C90 -100 110 -140 116 -190Z" ${p.f('robe')}/>`;
  g += `<path d="M-90 -96L-60 -128M100 -48L64 -76" ${p.s('trim')}/>`;
  g += hand(gx, gy, p, -24);
  g += it.front;
  if (spec.item2) g += smallItem(spec.item2, p, hx, hy);
  g += hand(hx, hy, p, 30);
  return g;
}

export { circ };
