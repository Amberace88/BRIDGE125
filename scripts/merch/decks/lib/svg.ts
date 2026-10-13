/** Small SVG-string toolkit for the deck generator (deterministic output, compact numbers). */

export const n = (v: number) => {
  const s = (Math.round(v * 100) / 100).toString();
  return s === '-0' ? '0' : s;
};

type Stop = [number, string, number?];
const stops = (st: Stop[]) => st.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('');

export function lin(id: string, st: Stop[], x1 = 0, y1 = 0, x2 = 0, y2 = 1, extra = '') {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${extra}>${stops(st)}</linearGradient>`;
}
export function rad(id: string, st: Stop[], cx = 0.5, cy = 0.5, r = 0.5, extra = '') {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${extra}>${stops(st)}</radialGradient>`;
}

export const rot = (g: string, deg: number, cx: number, cy: number) => `<g transform="rotate(${n(deg)} ${n(cx)} ${n(cy)})">${g}</g>`;
export const rot180 = (g: string, cx: number, cy: number) => rot(g, 180, cx, cy);
export const mirrorX = (g: string, cx: number) => `<g transform="matrix(-1 0 0 1 ${n(2 * cx)} 0)">${g}</g>`;
export const mirrorY = (g: string, cy: number) => `<g transform="matrix(1 0 0 -1 0 ${n(2 * cy)})">${g}</g>`;
export const tr = (g: string, x: number, y: number, s = 1) => `<g transform="translate(${n(x)} ${n(y)})${s !== 1 ? ` scale(${n(s)})` : ''}">${g}</g>`;
/** g + its mirror image around x = cx. */
export const both = (g: string, cx: number) => g + mirrorX(g, cx);
/** g + its four-fold (x and y) mirror images around (cx, cy). */
export const quad = (g: string, cx: number, cy: number) => both(g, cx) + mirrorY(both(g, cx), cy);
/** g + its 180° copy — the rotation-proof double-ended layout of courts and backs. */
export const dbl = (g: string, cx: number, cy: number) => g + rot180(g, cx, cy);

export const path = (d: string, attrs: string) => `<path d="${d}" ${attrs}/>`;
export const circle = (cx: number, cy: number, r: number, attrs: string) => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" ${attrs}/>`;
export const rect = (x: number, y: number, w: number, h: number, attrs: string, rx = 0) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${rx ? ` rx="${n(rx)}"` : ''} ${attrs}/>`;

export const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180; // 0° = 12 o'clock, clockwise
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
export const poly = (ps: [number, number][]) => 'M' + ps.map(([x, y]) => `${n(x)} ${n(y)}`).join('L') + 'Z';

/** n-pointed star (points at r1, valleys at r2), first point at `start` degrees (0 = up). */
export function star(cx: number, cy: number, pts: number, r1: number, r2: number, start = 0) {
  const ps: [number, number][] = [];
  for (let i = 0; i < pts * 2; i++) ps.push(polar(cx, cy, i % 2 ? r2 : r1, start + (i * 180) / pts));
  return poly(ps);
}

/** Ring of `count` copies of g (drawn around cx,cy pointing up) rotated around the centre. */
export function ring(g: string, count: number, cx: number, cy: number, start = 0) {
  let out = '';
  for (let i = 0; i < count; i++) out += rot(g, start + (360 * i) / count, cx, cy);
  return out;
}

export function svgDoc(w: number, h: number, body: string, defs = '', title = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${n(w)} ${n(h)}" width="${n(w)}" height="${n(h)}">`
    + (title ? `<title>${esc(title)}</title>` : '') + `<defs>${defs}</defs>${body}</svg>\n`;
}

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rounded-corner rectangle path. */
export const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`;

/** Circle as a path (for compound paths). */
export const circ = (cx: number, cy: number, r: number) =>
  `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)}Z`;
