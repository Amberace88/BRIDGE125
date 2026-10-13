/// <reference types="node" />
/**
 * Deck generator checks: card lists, pip layouts, committed sources = generator output (deterministic),
 * file sizes of every committed raster, 180° symmetry of every back, print PNGs (when generated).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { PANEL, boxPanels } from './lib/box.ts';
import { CX, CY, DECK36, DECK54, H, PIP_LAYOUT, RANKS, SUITS, W, parseCard, pipPositions, type Rank } from './lib/cards.ts';
import { cardSvg, rasterize } from './lib/render.ts';
import { CLASSIC, GEO } from './lib/suits.ts';
import { DECKS } from './decks/index.ts';
import { DECK_INFO } from '../../../src/merch/decks/data.ts';

const ROOT = process.cwd();
const count = (s: string, sub: string) => s.split(sub).length - 1;

describe('card lists', () => {
  it('54 unique cards: 13 ranks × 4 suits + 2 jokers', () => {
    expect(DECK54).toHaveLength(54);
    expect(new Set(DECK54).size).toBe(54);
    for (const s of SUITS) for (const r of RANKS) expect(DECK54).toContain(`${r}${s}`);
    expect(DECK54.filter(id => 'joker' in parseCard(id))).toEqual(['JK1', 'JK2']);
  });
  it('36-card edition: 6 … A in four suits, a subset of the 54', () => {
    expect(DECK36).toHaveLength(36);
    expect(new Set(DECK36).size).toBe(36);
    for (const id of DECK36) expect(DECK54).toContain(id);
    expect(DECK36.some(id => /^[2-5]/.test(id))).toBe(false);
  });
  it('pip layouts: n pips for rank n, point-symmetric (7: one extra pip above the centre), lower pips upside down', () => {
    for (let k = 2; k <= 10; k++) {
      const ps = pipPositions(String(k) as Rank);
      expect(ps, `rank ${k}`).toHaveLength(k);
      expect(PIP_LAYOUT[k]).toHaveLength(k);
      for (const [x, y, flip] of ps) {
        if (k === 7 && x === CX) { expect(y).toBeLessThan(CY); continue; } // the classic 7 has its odd pip in the upper half
        expect(ps.some(([x2, y2]) => Math.abs(x2 - (2 * CX - x)) < 0.01 && Math.abs(y2 - (2 * CY - y)) < 0.01), `rank ${k} pip ${x},${y}`).toBe(true);
        expect(flip).toBe(y > CY + 1);
      }
    }
  });
});

describe.each(DECKS.map(t => [t.id, t] as const))('deck %s', (id, t) => {
  const dir = join(ROOT, 'merch-print', 'decks', id);
  const pub = join(ROOT, 'public', 'merch', 'decks', id);
  const info = DECK_INFO.find(d => d.id === id)!;

  it('is registered in DECK_INFO with the same product id and markets', () => {
    expect(info).toBeTruthy();
    expect(info.productId).toBe(t.productId);
    expect(info.edition36).toBe(t.edition36);
  });

  it('committed SVG sources are exactly what the generator draws (deterministic)', () => {
    for (const c of [...DECK54, 'back'] as const) {
      const file = join(dir, 'svg', `${c}.svg`);
      expect(existsSync(file), file).toBe(true);
      expect(readFileSync(file, 'utf8') === cardSvg(t, c), `${id}/${c} is stale — run npm run merch:decks`).toBe(true);
    }
    const panels = boxPanels(t);
    for (const [p, svg] of Object.entries(panels)) {
      expect(readFileSync(join(dir, 'svg', `box-${p}.svg`), 'utf8') === svg, `${id}/box-${p}`).toBe(true);
      const [w, h] = PANEL[p as keyof typeof PANEL];
      expect(svg).toContain(`viewBox="0 0 ${w} ${h}"`);
    }
    expect(existsSync(join(dir, 'svg', 'box-dieline.svg'))).toBe(true);
  });

  it('every card is 825 × 1125 with outlined text only (no fonts needed)', () => {
    for (const c of [...DECK54, 'back'] as const) {
      const svg = cardSvg(t, c);
      expect(svg).toContain(`viewBox="0 0 ${W} ${H}"`);
      expect(svg).not.toMatch(/<text[\s>]|font-family|<image[\s>]/);
    }
  });

  it('number cards carry exactly n pips (+ the two index suits)', () => {
    for (const s of SUITS) for (const r of ['2', '3', '4', '5', '6', '7', '8', '9', '10'] as Rank[]) {
      const svg = cardSvg(t, `${r}${s}`);
      const n = Math.max(count(svg, `d="${CLASSIC[s]}"`), count(svg, `d="${GEO[s]}"`));
      expect(n, `${id} ${r}${s}`).toBe(Number(r) + 2);
    }
  });

  it('committed rasters exist at their exact pixel sizes', async () => {
    const size = async (f: string) => { const m = await sharp(f).metadata(); return [m.width, m.height]; };
    for (const shot of ['hero', 'fan', 'spread', 'backs']) expect(await size(join(pub, 'mockups', `${shot}.webp`)), shot).toEqual([1200, 1200]);
    for (const f of readdirSync(join(pub, 'web'))) {
      const s = await size(join(pub, 'web', f));
      if (f === 'box-front.webp' || f === 'box-back.webp') expect(s, f).toEqual([420, 585]);
      else if (f === 'box-side.webp') expect(s, f).toEqual([124, 587]);
      else if (f === 'box-top.webp') expect(s, f).toEqual([420, 124]);
      else expect(s, f).toEqual([360, 504]);
    }
    expect(existsSync(join(pub, 'back.svg'))).toBe(true);
    expect(existsSync(join(pub, `${info.heroCard}.svg`))).toBe(true);
    expect(existsSync(join(dir, 'preview.jpg'))).toBe(true);
    const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
    expect(m.cards.order).toEqual(DECK54);
    expect(m.qr).toBe(`https://bridge125.com/?source=deck_${id}`);
  });

  it('print exports (when generated) have exact pixel sizes and 300 dpi', async () => {
    const print = join(dir, 'print', 'cards-825x1125');
    if (!existsSync(print)) return; // generated on demand: npm run merch:decks -- --print
    const files = readdirSync(print).filter(f => f.endsWith('.png'));
    expect(files).toHaveLength(55);
    for (const f of files) {
      const m = await sharp(join(print, f)).metadata();
      expect([m.width, m.height, m.density], f).toEqual([825, 1125, 300]);
    }
    for (const f of (existsSync(join(dir, 'print', 'prodigi-815x1110')) ? readdirSync(join(dir, 'print', 'prodigi-815x1110')) : [])) {
      const m = await sharp(join(dir, 'print', 'prodigi-815x1110', f)).metadata();
      expect([m.width, m.height], f).toEqual([815, 1110]);
    }
    for (const [p, [w, h]] of Object.entries(PANEL)) {
      const m = await sharp(join(dir, 'print', 'box', `box-${p}.png`)).metadata();
      expect([m.width, m.height], p).toEqual([w, h]);
    }
  });

  it('the back is rotation-proof (180° symmetric, pixel compare)', async () => {
    const png = await rasterize(cardSvg(t, 'back'));
    const a = await sharp(png).flatten({ background: '#fff' }).raw().toBuffer();
    const b = await sharp(png).flatten({ background: '#fff' }).rotate(180).raw().toBuffer();
    expect(a.length).toBe(b.length);
    // anti-aliasing of a symmetric drawing is not bit-exact: allow sub-pixel noise, catch any real asymmetry
    // (a non-symmetric gradient or one off-centre motif scores a mean of 1–3 and ≥ 1 % of pixels off)
    let sum = 0, big = 0, huge = 0;
    for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); sum += d; if (d > 24) big++; if (d > 64) huge++; }
    const mean = sum / a.length;
    expect(mean, `${id} mean |Δ|`).toBeLessThan(0.5);
    expect(big / a.length, `${id} share of channels off by > 24`).toBeLessThan(0.003);
    expect(huge / a.length, `${id} share of channels off by > 64`).toBeLessThan(0.001);
  }, 60_000);
});
