/** Bridge 125 brand marks as outlined vector art. */
import { face } from './font.ts';
import { CLASSIC } from './suits.ts';
import { n } from './svg.ts';

/** "BRIDGE 125" wordmark centred on cx with its baseline at y. */
export function wordmark(cx: number, y: number, size: number, ink: string, accent: string, font: 'golos600' | 'golos700' | 'golos800' = 'golos600') {
  const g = face(font);
  const tr = 0.16;
  const w1 = g.width('BRIDGE ', size, tr) + tr * size, w2 = g.width('125', size, tr);
  const x0 = cx - (w1 + w2) / 2;
  return `<path d="${g.text('BRIDGE', x0, y, size, { tracking: tr }).d}" fill="${ink}"/><path d="${g.text('125', x0 + w1, y, size, { tracking: tr }).d}" fill="${accent}"/>`;
}

export function wordmarkWidth(size: number, font: 'golos600' | 'golos700' | 'golos800' = 'golos600') {
  const g = face(font);
  return g.width('BRIDGE ', size, 0.16) + 0.16 * size + g.width('125', size, 0.16);
}

/** The "Modern Fan" logo mark (public/logo-mark.svg geometry) centred on cx, cy, `size` px wide. */
export function logoMark(cx: number, cy: number, size: number, cardFill: string, stroke: string, spadeFill = stroke) {
  const k = size / 200;
  const cards = [-22, 22, 0].map(a => `<g transform="rotate(${a} 100 182)"><rect x="62" y="28" width="76" height="112" rx="11" fill="${cardFill}" stroke="${stroke}" stroke-width="7"/></g>`).join('');
  const sp = `<g transform="translate(80 64) scale(.4)"><path d="${CLASSIC.S}" fill="${spadeFill}"/></g>`;
  return `<g transform="translate(${n(cx - size / 2)} ${n(cy - size / 2)}) scale(${n(k)})">${cards}${sp}</g>`;
}
