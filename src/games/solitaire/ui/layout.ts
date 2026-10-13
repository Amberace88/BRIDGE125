// Where every card and pile sits for a given board size. Pure (unit-tested), no DOM.
import type { KState } from '../engine/klondike';
import type { SpState } from '../engine/spider';

export type PileRef = { k: 'stock' } | { k: 'waste' } | { k: 'found'; i: number } | { k: 'tab'; i: number };
export const pileKey = (p: PileRef) => (p.k === 'stock' || p.k === 'waste' ? p.k : `${p.k}${p.i}`);

/** Card rest pose: top-left corner in board pixels. */
export interface Pose { x: number; y: number; z: number; up: boolean }

export interface Slot {
  key: string;
  pile: PileRef;
  /** the empty-pile marker */
  x: number; y: number;
  /** where the next card would land (drop anchor, top-left) */
  ax: number; ay: number;
  /** drop zone (whole column for the tableau) */
  zx: number; zy: number; zw: number; zh: number;
  mark?: 'stock' | 'suit' | 'king' | 'done' | 'none';
  suit?: number;
}

export interface Layout {
  cw: number; ch: number;
  poses: Map<number, Pose>;
  where: Map<number, { pile: PileRef; index: number }>;
  slots: Slot[];
  /** vertical step of face-up cards per column (drag fan) */
  upStep: number[];
  /** the stock's position (deal animation source) */
  stockX: number; stockY: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ASPECT = 1.43;

interface Grid { cw: number; ch: number; gap: number; ox: number; top: number; tabY: number; pad: number }

function grid(W: number, H: number, cols: number, rowsTall: number, maxCw: number): Grid {
  const pad = clamp(W * 0.014, 4, 28);
  let gap = clamp(W * 0.009, 3, 16);
  const byW = (W - 2 * pad - (cols - 1) * gap) / cols;
  const byH = H / (ASPECT * rowsTall);
  let cw = Math.min(byW, byH, maxCw);
  if (cw < byW) gap = Math.min(cw * 0.22, (W - 2 * pad - cols * cw) / (cols - 1));
  cw = Math.floor(cw * 2) / 2;
  const ch = Math.round(cw * ASPECT);
  const boardW = cols * cw + (cols - 1) * gap;
  const ox = Math.round((W - boardW) / 2);
  const top = Math.round(clamp(H * 0.012, 4, 16));
  const tabY = Math.round(top + ch + clamp(ch * 0.2, 10, 26));
  return { cw, ch, gap, ox, top, tabY, pad };
}

/** Spreads a column into the room it has: face-down cards squeeze first, face-up cards stay readable. */
function columnSteps(down: number, up: number, ch: number, avail: number, upBase: number) {
  let dStep = ch * 0.13, uStep = ch * upBase;
  const need = () => down * dStep + Math.max(0, up - 1) * uStep;
  if (need() > avail && down > 0) dStep = Math.max(ch * 0.05, (avail - Math.max(0, up - 1) * uStep) / down);
  if (need() > avail && up > 1) uStep = Math.max(ch * 0.14, (avail - down * dStep) / (up - 1));
  return { dStep, uStep };
}

export function klondikeLayout(s: KState, W: number, H: number): Layout {
  const g = grid(W, H, 7, 6.1, 124);
  const { cw, ch, gap, ox, top, tabY } = g;
  const colX = (i: number) => ox + i * (cw + gap);
  const poses = new Map<number, Pose>();
  const where = new Map<number, { pile: PileRef; index: number }>();
  const slots: Slot[] = [];
  const upStep: number[] = [];
  /** a deep pile shows its thickness: a hair up and left every 8 cards */
  const thick = (k: number) => Math.min(3, Math.floor(k / 8)) * 0.7;

  // stock
  const sx = colX(0), sy = top;
  s.stock.forEach((id, k) => {
    const t = thick(k);
    poses.set(id, { x: sx - t, y: sy - t, z: 10 + k, up: false });
    where.set(id, { pile: { k: 'stock' }, index: k });
  });
  slots.push({ key: 'stock', pile: { k: 'stock' }, x: sx, y: sy, ax: sx, ay: sy, zx: sx, zy: sy, zw: cw, zh: ch, mark: 'stock' });

  // waste (a fan of three with draw 3)
  const wx = colX(1);
  const fan = s.draw === 3 ? Math.min(cw * 0.4, (cw + gap) * 0.48) : 0;
  const L = s.waste.length;
  const firstFan = Math.max(0, L - 3);
  s.waste.forEach((id, k) => {
    const f = s.draw === 3 && k >= firstFan ? (k - firstFan) * fan : 0;
    const t = k < firstFan || s.draw === 1 ? Math.min(2, Math.floor(k / 10)) * 0.7 : 0;
    poses.set(id, { x: wx + f - t, y: sy - t, z: 10 + k, up: true });
    where.set(id, { pile: { k: 'waste' }, index: k });
  });
  const wTop = L ? poses.get(s.waste[L - 1])! : { x: wx, y: sy };
  slots.push({ key: 'waste', pile: { k: 'waste' }, x: wx, y: sy, ax: wTop.x, ay: wTop.y, zx: wx, zy: sy, zw: cw + fan * 2, zh: ch, mark: 'none' });

  // foundations
  for (let i = 0; i < 4; i++) {
    const fx = colX(3 + i);
    s.found[i].forEach((id, k) => {
      const t = Math.min(2, Math.floor(k / 5)) * 0.6;
      poses.set(id, { x: fx - t, y: sy - t, z: 10 + k, up: true });
      where.set(id, { pile: { k: 'found', i }, index: k });
    });
    slots.push({ key: `found${i}`, pile: { k: 'found', i }, x: fx, y: sy, ax: fx, ay: sy, zx: fx, zy: sy, zw: cw, zh: ch, mark: 'suit', suit: i });
  }

  // tableau
  const avail = H - tabY - ch - g.pad * 0.5;
  for (let i = 0; i < 7; i++) {
    const col = s.tab[i];
    const x = colX(i);
    const up = col.c.length - col.d;
    const { dStep, uStep } = columnSteps(col.d, up, ch, avail, 0.31);
    upStep.push(uStep);
    let y = tabY;
    col.c.forEach((id, k) => {
      poses.set(id, { x, y, z: 20 + k, up: k >= col.d });
      where.set(id, { pile: { k: 'tab', i }, index: k });
      y += k < col.d ? dStep : uStep;
    });
    const lastY = col.c.length ? y - (col.c.length - 1 < col.d ? dStep : uStep) : tabY;
    const ay = col.c.length ? lastY + uStep : tabY;
    slots.push({ key: `tab${i}`, pile: { k: 'tab', i }, x, y: tabY, ax: x, ay: col.c.length ? ay : tabY,
      zx: x - gap / 2, zy: tabY - ch * 0.15, zw: cw + gap, zh: Math.max(H - tabY + ch * 0.15, ch), mark: 'king' });
  }
  return { cw, ch, poses, where, slots, upStep, stockX: sx, stockY: sy };
}

export function spiderLayout(s: SpState, W: number, H: number): Layout {
  const g = grid(W, H, 10, 6.4, 112);
  const { cw, ch, gap, ox, top, tabY } = g;
  const colX = (i: number) => ox + i * (cw + gap);
  const poses = new Map<number, Pose>();
  const where = new Map<number, { pile: PileRef; index: number }>();
  const slots: Slot[] = [];
  const upStep: number[] = [];

  // stock: one back per remaining deal, fanned to the right (next deal on top)
  const sx = colX(0), sy = top;
  const fanStep = Math.min(cw * 0.2, (cw + gap) / 5);
  s.stock.forEach((id, k) => {
    const grp = Math.floor(k / 10);
    poses.set(id, { x: sx + grp * fanStep, y: sy, z: 10 + k, up: false });
    where.set(id, { pile: { k: 'stock' }, index: k });
  });
  slots.push({ key: 'stock', pile: { k: 'stock' }, x: sx, y: sy, ax: sx, ay: sy, zx: sx, zy: sy, zw: cw + fanStep * 4, zh: ch, mark: 'stock' });

  // completed runs: 8 slots in columns 2 … 9, the king on top
  for (let j = 0; j < 8; j++) {
    const fx = colX(2 + j);
    const run = s.done[j];
    run?.forEach((id, k) => {
      poses.set(id, { x: fx, y: sy, z: 40 - k, up: true });
      where.set(id, { pile: { k: 'found', i: j }, index: k });
    });
    slots.push({ key: `found${j}`, pile: { k: 'found', i: j }, x: fx, y: sy, ax: fx, ay: sy, zx: fx, zy: sy, zw: cw, zh: ch, mark: 'done' });
  }

  const avail = H - tabY - ch - g.pad * 0.5;
  for (let i = 0; i < 10; i++) {
    const col = s.tab[i];
    const x = colX(i);
    const up = col.c.length - col.d;
    const { dStep, uStep } = columnSteps(col.d, up, ch, avail, 0.3);
    upStep.push(uStep);
    let y = tabY;
    col.c.forEach((id, k) => {
      poses.set(id, { x, y, z: 20 + k, up: k >= col.d });
      where.set(id, { pile: { k: 'tab', i }, index: k });
      y += k < col.d ? dStep : uStep;
    });
    const ay = col.c.length ? y - (col.c.length - 1 < col.d ? dStep : uStep) + uStep : tabY;
    slots.push({ key: `tab${i}`, pile: { k: 'tab', i }, x, y: tabY, ax: x, ay,
      zx: x - gap / 2, zy: tabY - ch * 0.15, zw: cw + gap, zh: Math.max(H - tabY + ch * 0.15, ch), mark: 'none' });
  }
  return { cw, ch, poses, where, slots, upStep, stockX: sx, stockY: sy };
}
