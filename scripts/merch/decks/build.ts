/**
 * Bridge 125 deck collection generator — deterministic, everything drawn in code.
 *
 *   npm run merch:decks                         # SVG sources + previews + store mockups + web faces (all decks)
 *   npm run merch:decks -- --print              # … + the full 300-dpi print exports (merch-print/decks/<id>/print/)
 *   npm run merch:decks -- --decks=baltic,neon  # only some decks
 *   npm run merch:decks -- --print --no-web     # print files only
 *
 * Outputs (per deck <id>):
 *   merch-print/decks/<id>/svg/*.svg            vector masters, text outlined (54 cards, back, box panels, dieline)   [committed]
 *   merch-print/decks/<id>/preview.jpg          contact sheet of every card + box                                    [committed]
 *   merch-print/decks/<id>/manifest.json        file list, sizes, card order, 36-card edition, QR target              [committed]
 *   merch-print/decks/<id>/print/…              PNG exports per provider (see README)                                 [generated, git-ignored]
 *   public/merch/decks/<id>/mockups/*.webp      store photos 1200 × 1200                                             [committed]
 *   public/merch/decks/<id>/web/*.webp          small faces for the 3D box viewer + the in-game twin back            [committed]
 *   public/merch/decks/<id>/back.svg, <card>.svg   vector back (cosmetic) + the product's design card               [committed]
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { DECK_INFO } from '../../../src/merch/decks/data.ts';
import { BB, PANEL, boxPanels, dieline, type PanelId } from './lib/box.ts';
import { B, DECK36, DECK54, H, W, type CardId, type DeckTheme } from './lib/cards.ts';
import { deckUrl } from './lib/qr.ts';
import { cardSvg, printPng, rasterize, sheet, trimmed } from './lib/render.ts';
import { DECKS } from './decks/index.ts';
import { backsScene, fanScene, heroScene, makeAssets, spreadScene, toWebp } from './mockups.ts';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const only = args.find(a => a.startsWith('--decks='))?.slice(8).split(',');
const PRINT = flag('--print'), WEB = !flag('--no-web'), SRC = !flag('--no-svg');

const write = (p: string, data: string | Buffer) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, data); };

/** Web faces / mockups: the trim box of a panel, rounded or square. */
async function panelTrim(svg: string, outW: number) {
  const vw = +/viewBox="0 0 ([\d.]+)/.exec(svg)![1];
  const png = await rasterize(svg, vw * 2);
  const m = await sharp(png).metadata();
  return sharp(png).extract({ left: 2 * BB, top: 2 * BB, width: m.width! - 4 * BB, height: m.height! - 4 * BB }).resize({ width: outW, kernel: 'lanczos3' }).png().toBuffer();
}

/** A card cut at the trim line (square corners), `w` × `h` px. */
async function trimCard(svg: string, w: number, h: number) {
  const png = await rasterize(svg, W * 2);
  return sharp(png).extract({ left: 2 * B, top: 2 * B, width: 1500, height: 2100 }).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
}

const order = (i: number) => String(i + 1).padStart(2, '0');

async function buildDeck(t: DeckTheme) {
  const info = DECK_INFO.find(d => d.id === t.id)!;
  const printDir = join(ROOT, 'merch-print', 'decks', t.id);
  const pubDir = join(ROOT, 'public', 'merch', 'decks', t.id);
  const t0 = Date.now();

  // ---------------------------------------------------------------- vector sources
  const svgs = new Map<string, string>();
  for (const id of DECK54) svgs.set(id, cardSvg(t, id));
  svgs.set('back', cardSvg(t, 'back'));
  const panels = boxPanels(t);
  const die = dieline(t, true);
  const dieClean = dieline(t, false);
  if (SRC) {
    rmSync(join(printDir, 'svg'), { recursive: true, force: true });
    for (const [id, s] of svgs) write(join(printDir, 'svg', `${id}.svg`), s);
    for (const [id, s] of Object.entries(panels)) write(join(printDir, 'svg', `box-${id}.svg`), s);
    write(join(printDir, 'svg', 'box-dieline.svg'), die.svg);
  }

  // ---------------------------------------------------------------- full-size rasters (needed by every output)
  const full = new Map<string, Buffer>();
  for (const [id, s] of svgs) full.set(id, await rasterize(s));

  // ---------------------------------------------------------------- print exports
  if (PRINT) {
    const out = join(printDir, 'print');
    rmSync(out, { recursive: true, force: true });
    for (const [i, id] of [...DECK54, 'back'].entries()) {
      const s = svgs.get(id)!;
      const name = id === 'back' ? '55-back' : `${order(i)}-${id}`;
      write(join(out, 'cards-825x1125', `${name}.png`), await printPng(s, W, H));
      // Prodigi-style 63 × 88 mm + 3 mm bleed = 69 × 94 mm → 815 × 1110 px: centre crop of the 1/8 in bleed
      const png = await printPng(s, W, H);
      write(join(out, 'prodigi-815x1110', `${name}.png`), await sharp(png).extract({ left: 5, top: 7, width: 815, height: 1110 }).withMetadata({ density: 300 }).png().toBuffer());
    }
    // back only, at trim size, for back-only products (e.g. Printful's poker deck)
    write(join(out, 'back-only-750x1050', 'back.png'),
      await sharp(await trimCard(svgs.get('back')!, 750, 1050)).flatten({ background: '#fff' }).withMetadata({ density: 300 }).png({ compressionLevel: 9 }).toBuffer());
    for (const id of Object.keys(panels) as PanelId[]) {
      const [w, h] = PANEL[id];
      write(join(out, 'box', `box-${id}.png`), await printPng(panels[id], w, h));
    }
    write(join(out, 'box', 'box-dieline-print.png'), await printPng(dieClean.svg, die.w, die.h));
    write(join(out, 'box', 'box-dieline-guides.png'), await printPng(die.svg, die.w, die.h));
    if (t.edition36) write(join(out, 'edition36.txt'), `36-card edition (Bridge 125 · Durak · Zolīte): print these files from cards-825x1125/ + 55-back.png\n`
      + DECK36.map(id => `${order(DECK54.indexOf(id))}-${id}.png`).join('\n') + '\n');
  }

  // ---------------------------------------------------------------- previews + manifest
  if (SRC) {
    const thumbs = [...DECK54, 'back'].map(id => full.get(id)!);
    const box = await Promise.all((['front', 'back', 'side', 'top'] as PanelId[]).map(id => rasterize(panels[id], id === 'side' ? 130 : id === 'top' ? 430 : 430)));
    const cards = await sheet(thumbs, 11, 210, 18, '#26272B', 36);
    const cm = await sharp(cards).metadata();
    const boxRow = await sheet([await rasterize(die.svg, 1400)], 1, 1400, 0, '#26272B', 36);
    const bm = await sharp(boxRow).metadata();
    const prev = await sharp({ create: { width: Math.max(cm.width!, bm.width!), height: cm.height! + bm.height!, channels: 3, background: '#26272B' } })
      .composite([{ input: cards, left: 0, top: 0 }, { input: boxRow, left: Math.round((cm.width! - bm.width!) / 2), top: cm.height! }])
      .jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    void box;
    write(join(printDir, 'preview.jpg'), prev);
    const manifest = {
      deck: t.id, product: t.productId, name: t.name, generator: 'scripts/merch/decks/build.ts',
      cards: { count: DECK54.length, order: DECK54, file: 'svg/<id>.svg', print: 'print/cards-825x1125/<NN>-<id>.png' },
      edition36: t.edition36 ? DECK36 : null,
      card: { trim: '63.5 × 88.9 mm (2.5 × 3.5 in)', bleed: '3.175 mm (1/8 in) each side', canvas: `${W} × ${H} px @ 300 dpi`, safe: '1/8 in inside the trim' },
      box: { inner: '64.8 × 90.2 × 19 mm', panels: Object.fromEntries(Object.entries(PANEL).map(([k, v]) => [k, `${v[0]} × ${v[1]} px incl. bleed`])), dieline: `${die.w} × ${die.h} px` },
      qr: deckUrl(t.id),
      markets: info.markets,
      cosmetic: `dk_${t.id}`,
    };
    write(join(printDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  }

  // ---------------------------------------------------------------- web: mockups, 3D box faces, twin back
  if (WEB) {
    const trimmedCards = new Map<string, Buffer>();
    const need = new Set<string>([...t.scene.fan, ...t.scene.spread]);
    for (const id of need) trimmedCards.set(id, await trimmed(full.get(id)!, 520));
    const backT = await trimmed(full.get('back')!, 520);
    const boxT = { front: await panelTrim(panels.front, 520), back: await panelTrim(panels.back, 520), side: await panelTrim(panels.side, 160), top: await panelTrim(panels.top, 520) };
    const a = await makeAssets(trimmedCards, backT, boxT, t.colours.paper);
    const scenes = { hero: heroScene, fan: fanScene, spread: spreadScene, backs: backsScene };
    rmSync(pubDir, { recursive: true, force: true });
    for (const [k, fn] of Object.entries(scenes)) write(join(pubDir, 'mockups', `${k}.webp`), await toWebp(await fn(t, a)));
    // 3D viewer faces (same naming as public/merch/web/deck): cards 360 × 504 (trim, square corners — the CSS rounds them)
    for (const id of new Set(['back', 'AS', 'KH', 'QS', 'JD', 'KC', 'QH', 'JS', '10C', 'JK1', info.heroCard])) {
      write(join(pubDir, 'web', `${id}.webp`), await sharp(await trimCard(svgs.get(id)!, 360, 504)).webp({ quality: 86 }).toBuffer());
    }
    write(join(pubDir, 'web', 'box-front.webp'), await sharp(await panelTrim(panels.front, 420)).webp({ quality: 86 }).toBuffer());
    write(join(pubDir, 'web', 'box-back.webp'), await sharp(await panelTrim(panels.back, 420)).webp({ quality: 86 }).toBuffer());
    write(join(pubDir, 'web', 'box-side.webp'), await sharp(await panelTrim(panels.side, 124)).webp({ quality: 86 }).toBuffer());
    write(join(pubDir, 'web', 'box-top.webp'), await sharp(await panelTrim(panels.top, 420)).webp({ quality: 86 }).toBuffer());
    write(join(pubDir, 'back.svg'), svgs.get('back')!);
    write(join(pubDir, `${info.heroCard}.svg`), svgs.get(info.heroCard)!);
  }
  console.log(`${t.id}: done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

for (const t of DECKS) {
  if (only && !only.includes(t.id)) continue;
  await buildDeck(t);
}
export type { CardId };
