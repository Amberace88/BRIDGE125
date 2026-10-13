/** Rasterising (sharp / librsvg) + contact sheets. */
import sharp from 'sharp';
import { B, H, W, cardBody, cardTitle, type CardId, type DeckTheme } from './cards.ts';
import { svgDoc } from './svg.ts';

sharp.cache(false);
sharp.concurrency(2);

export function cardSvg(t: DeckTheme, id: CardId | 'back') {
  const body = id === 'back' ? t.back() : cardBody(t, id);
  const title = `Bridge 125 ${t.name} — ${id === 'back' ? 'card back' : cardTitle(id)}`;
  return svgDoc(W, H, body, t.defs, title);
}

/** SVG string → PNG buffer `width` px wide (height from the viewBox). */
export async function rasterize(svg: string, width?: number): Promise<Buffer> {
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg.slice(0, 400));
  const vw = m ? +m[1] : W;
  const density = width ? (72 * width) / vw : 72;
  let img = sharp(Buffer.from(svg), { density, limitInputPixels: false, unlimited: true });
  if (width) img = img.resize({ width, kernel: 'lanczos3', fastShrinkOnLoad: false });
  return img.png().toBuffer();
}

/** PNG for print: exact pixel size, sRGB, 300 dpi tag, no alpha (white under any transparency). */
export async function printPng(svg: string, w: number, h: number): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 72, unlimited: true })
    .resize(w, h, { fit: 'fill' })
    .flatten({ background: '#ffffff' })
    .withMetadata({ density: 300 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

/** Grid contact sheet of equally sized images. */
export async function sheet(imgs: Buffer[], cols: number, cellW: number, gap = 24, bg = '#2b2b2b', pad = 40): Promise<Buffer> {
  const metas = await Promise.all(imgs.map(i => sharp(i).resize({ width: cellW }).png().toBuffer({ resolveWithObject: true })));
  const cellH = Math.max(...metas.map(m => m.info.height));
  const rows = Math.ceil(imgs.length / cols);
  const width = pad * 2 + cols * cellW + (cols - 1) * gap, height = pad * 2 + rows * cellH + (rows - 1) * gap;
  return sharp({ create: { width, height, channels: 4, background: bg } })
    .composite(metas.map((m, i) => ({ input: m.data, left: pad + (i % cols) * (cellW + gap), top: pad + Math.floor(i / cols) * (cellH + gap) })))
    .png().toBuffer();
}

/** Trim a full-bleed card PNG to the cut line with rounded corners (for web faces / mockups). */
export async function trimmed(png: Buffer, outW: number): Promise<Buffer> {
  const meta = await sharp(png).metadata();
  const k = meta.width! / W;
  const x = Math.round(B * k), w = Math.round((W - 2 * B) * k), h = Math.round((H - 2 * B) * k);
  const r = 37.5 * k;
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`);
  const cut = await sharp(png).extract({ left: x, top: x, width: w, height: h }).png().toBuffer();
  const masked = await sharp(cut).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  return sharp(masked).resize({ width: outW, kernel: 'lanczos3' }).png().toBuffer();
}
