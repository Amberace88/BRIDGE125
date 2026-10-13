// Where every card and pile sits for a given board size. Pure (unit-tested), no DOM.
// Top row: 4 free cells · 4 foundations; below: 8 cascades. Same card proportions as Solitaire.
import type { Pose } from '../../solitaire/ui/layout';
import type { FcState, Loc } from '../engine/rules';
import { cardId } from '../engine/rules';

export type { Pose };
export const locKey = (l: Loc) => `${l.k}${l.i}`;

export interface FcSlot {
  key: string;
  loc: Loc;
  /** the empty-pile marker */
  x: number; y: number;
  /** where the next card would land (drop anchor, top-left) */
  ax: number; ay: number;
  /** drop zone (the whole column for a cascade) */
  zx: number; zy: number; zw: number; zh: number;
  mark: 'cell' | 'suit' | 'col';
  suit?: number;
}

export interface FcLayout {
  cw: number; ch: number;
  poses: Map<number, Pose>;
  where: Map<number, { loc: Loc; index: number }>;
  slots: FcSlot[];
  /** where the deal flies in from */
  deckX: number; deckY: number;
  /** x of the split between the cells and the foundations (the brass divider) */
  midX: number; topY: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ASPECT = 1.43;

export function fcLayout(s: FcState, W: number, H: number): FcLayout {
  const pad = clamp(W * 0.014, 4, 28);
  let gap = clamp(W * 0.01, 3, 16);
  const byW = (W - 2 * pad - 7 * gap) / 8;
  const byH = H / (ASPECT * 5.3);
  let cw = Math.min(byW, byH, 118);
  if (cw < byW) gap = Math.min(cw * 0.2, (W - 2 * pad - 8 * cw) / 7);
  cw = Math.floor(cw * 2) / 2;
  const ch = Math.round(cw * ASPECT);
  const boardW = 8 * cw + 7 * gap;
  const ox = Math.round((W - boardW) / 2);
  const top = Math.round(clamp(H * 0.012, 4, 16));
  const tabY = Math.round(top + ch + clamp(ch * 0.22, 10, 28));
  const colX = (i: number) => ox + i * (cw + gap);

  const poses = new Map<number, Pose>();
  const where = new Map<number, { loc: Loc; index: number }>();
  const slots: FcSlot[] = [];

  // free cells
  for (let i = 0; i < 4; i++) {
    const x = colX(i);
    const c = s.cells[i];
    if (c != null) { poses.set(c, { x, y: top, z: 10, up: true }); where.set(c, { loc: { k: 'cell', i }, index: 0 }); }
    slots.push({ key: `cell${i}`, loc: { k: 'cell', i }, x, y: top, ax: x, ay: top, zx: x - gap / 2, zy: top - 4, zw: cw + gap, zh: ch + 8, mark: 'cell' });
  }
  // foundations (one per suit; a deep pile shows its thickness)
  for (let i = 0; i < 4; i++) {
    const x = colX(4 + i);
    for (let r = 1; r <= s.found[i]; r++) {
      const t = Math.min(2, Math.floor((r - 1) / 5)) * 0.6;
      const id = cardId(i, r);
      poses.set(id, { x: x - t, y: top - t, z: 10 + r, up: true });
      where.set(id, { loc: { k: 'found', i }, index: r - 1 });
    }
    slots.push({ key: `found${i}`, loc: { k: 'found', i }, x, y: top, ax: x, ay: top, zx: x - gap / 2, zy: top - 4, zw: cw + gap, zh: ch + 8, mark: 'suit', suit: i });
  }

  // cascades: face-up steps squeeze to fit the room (never below a readable corner)
  // one step for every cascade (an even, calm board): as open as the longest cascade allows
  const avail = H - tabY - ch - pad * 0.5;
  const longest = Math.max(1, ...s.cols.map(c => c.length));
  const step = longest > 1 ? clamp(avail / (longest - 1), ch * 0.15, ch * 0.34) : ch * 0.34;
  for (let i = 0; i < 8; i++) {
    const col = s.cols[i];
    const x = colX(i);
    col.forEach((id, k) => {
      poses.set(id, { x, y: tabY + k * step, z: 20 + k, up: true });
      where.set(id, { loc: { k: 'col', i }, index: k });
    });
    const ay = col.length ? tabY + col.length * step : tabY;
    slots.push({ key: `col${i}`, loc: { k: 'col', i }, x, y: tabY, ax: x, ay: col.length ? ay : tabY,
      zx: x - gap / 2, zy: tabY - ch * 0.15, zw: cw + gap, zh: Math.max(H - tabY + ch * 0.15, ch), mark: 'col' });
  }
  return { cw, ch, poses, where, slots, deckX: Math.round(W / 2 - cw / 2), deckY: Math.round(H - ch * 0.6), midX: Math.round(colX(4) - gap / 2), topY: top };
}
