/** Court-card composition shared by the decks + the painter factories (flat print / neon). */
import { B, CX, CY, H, corners } from './cards.ts';
import type { Painter, Role } from './figure.ts';
import { n, rrect } from './svg.ts';

export interface FlatPaint {
  fills: Partial<Record<Role, string>>;
  outline: string;
  ow: number;
  line?: string;
  lw?: number;
  blush?: number;
  /** Per-role stroke override (e.g. gold outlines on crowns). */
  strokes?: Partial<Record<Role, string>>;
}

export function flatPainter(o: FlatPaint): Painter {
  const fill = (r: Role) => o.fills[r] ?? o.fills.robe ?? '#888';
  return {
    f: r => r === 'blush'
      ? `fill="${fill('blush')}" opacity="${o.blush ?? 0.35}"`
      : `fill="${fill(r)}" stroke="${o.strokes?.[r] ?? o.outline}" stroke-width="${o.ow}" stroke-linejoin="round"`,
    s: (r, w) => `fill="none" stroke="${r === 'line' ? (o.line ?? o.outline) : (o.strokes?.[r] ?? fill(r))}" stroke-width="${n(w ?? (r === 'line' ? (o.lw ?? o.ow) : o.ow * 2))}" stroke-linecap="round" stroke-linejoin="round"`,
  };
}

/** Neon sign: dark fills, glowing tubes as outlines (glow filter is applied to the whole figure group). */
export function neonPainter(tube: Partial<Record<Role, string>>, base: string, dark = '#0B0716', w = 5): Painter {
  const col = (r: Role) => tube[r] ?? base;
  return {
    f: r => r === 'blush' ? 'fill="none"' : `fill="${dark}" fill-opacity=".72" stroke="${col(r)}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`,
    s: (r, sw) => `fill="none" stroke="${col(r)}" stroke-width="${n(sw ? Math.min(sw, w * 1.4) : w)}" stroke-linecap="round" stroke-linejoin="round"`,
  };
}

export interface FrameBox { x: number; y: number; w: number; h: number; r: number }
export const COURT_FRAME: FrameBox = { x: CX - 222, y: B + 48, w: 444, h: H - 2 * (B + 48), r: 22 };

export interface CourtLayout {
  uid: string;
  /** Full-bleed card background. */
  bg: string;
  /** Fill of the court panel. */
  panel: string;
  /** Drawn inside the panel under the figure, in half-figure local coords (repeated 180°). */
  under?: string;
  /** The half figure (local coords). */
  half: string;
  /** Drawn over the figures (full card coords, inside the panel clip): centre divider etc. */
  divider?: string;
  /** Attributes for the panel border stroke ('' = none). */
  border: string;
  /** Extra art outside the panel (full card coords). */
  outer?: string;
  index: string;
  frame?: FrameBox;
  /** Figure scale (default .92 so crowns clear the panel edge). */
  scale?: number;
}

export function courtCard(o: CourtLayout) {
  const f = o.frame ?? COURT_FRAME;
  const d = rrect(f.x, f.y, f.w, f.h, f.r);
  const k = o.scale ?? 0.92;
  // `under` art is clipped to its own half, so the 180° copy never paints over the other figure
  const under = o.under ? `<g clip-path="url(#${o.uid}u)">${o.under}</g>` : '';
  const half = `<g id="${o.uid}h" transform="translate(${n(CX)} ${n(CY)})">${under}<g transform="scale(${k})">${o.half}</g></g>`;
  return `<defs><clipPath id="${o.uid}f"><path d="${d}"/></clipPath><clipPath id="${o.uid}u"><rect x="-500" y="-700" width="1000" height="700"/></clipPath>${half}</defs>`
    + o.bg + (o.outer ?? '')
    + `<path d="${d}" fill="${o.panel}"/>`
    + `<g clip-path="url(#${o.uid}f)"><use href="#${o.uid}h" xlink:href="#${o.uid}h"/><use href="#${o.uid}h" xlink:href="#${o.uid}h" transform="rotate(180 ${n(CX)} ${n(CY)})"/>${o.divider ?? ''}</g>`
    + (o.border ? `<path d="${d}" fill="none" ${o.border}/>` : '')
    + corners(o.index);
}

/** Sunburst rays (half-figure local coords) radiating from a point. */
export function rays(cx: number, cy: number, count: number, len: number, width: number, attrs: string, start = 0) {
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = ((start + (360 * i) / count) * Math.PI) / 180;
    const a1 = a - (width * Math.PI) / 360, a2 = a + (width * Math.PI) / 360;
    d += `M${n(cx)} ${n(cy)}L${n(cx + len * Math.sin(a1))} ${n(cy - len * Math.cos(a1))}L${n(cx + len * Math.sin(a2))} ${n(cy - len * Math.cos(a2))}Z`;
  }
  return `<path d="${d}" ${attrs}/>`;
}

export { CY, CX };
