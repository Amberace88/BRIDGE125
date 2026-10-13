/** QR code → compact SVG path (horizontal runs of dark modules). */
import qrcode from 'qrcode-generator';
import { n } from './svg.ts';

export function qrPath(text: string, x: number, y: number, size: number, ecc: 'L' | 'M' | 'Q' | 'H' = 'M') {
  const q = qrcode(0, ecc);
  q.addData(text);
  q.make();
  const count = q.getModuleCount();
  const m = size / count;
  let d = '';
  for (let r = 0; r < count; r++) {
    let c = 0;
    while (c < count) {
      if (!q.isDark(r, c)) { c++; continue; }
      const s = c;
      while (c < count && q.isDark(r, c)) c++;
      d += `M${n(x + s * m)} ${n(y + r * m)}h${n((c - s) * m)}v${n(m)}h${n(-(c - s) * m)}Z`;
    }
  }
  return { d, modules: count };
}

export const deckUrl = (id: string) => `https://bridge125.com/?source=deck_${id}`;
