/**
 * Store mockups for each deck, rendered in code: the real print files mapped in perspective onto cards and a
 * tuck box, lit and shadowed on a deck-themed table surface. 1200 × 1200 WebP.
 *
 *   hero    box standing + a fan of cards on the table
 *   fan     a hand of cards fanned, seen from above, box lying beside
 *   spread  courts, aces and jokers laid out
 *   backs   the back design: box + stack + backs fanned (the "digital twin" back)
 */
import sharp from 'sharp';
import type { CardId, DeckTheme, SceneStyle } from './lib/cards.ts';
import { Camera, Canvas, facing, loadImg, place, type Img, type P2, type Shade, type V3 } from './lib/scene.ts';
import { rng } from './lib/svg.ts';

const S = 1200;
const CARD_W = 63.5, CARD_H = 88.9;
const BOX_W = 64.8, BOX_H = 90.2, BOX_D = 19.05;

// ------------------------------------------------------------------------------------------------ surfaces
function surfaceSvg(sc: SceneStyle, seed: number) {
  const { base, hi, lo } = sc;
  const grad = `<radialGradient id="L" cx=".42" cy=".34" r=".85"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="${lo}"/></radialGradient>`;
  const noise = (freq: string, op: number, oct = 2, type = 'fractalNoise') => `<filter id="n${op}" x="0" y="0" width="100%" height="100%"><feTurbulence type="${type}" baseFrequency="${freq}" numOctaves="${oct}" seed="${seed}"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 ${op} 0"/></filter>`;
  let defs = grad, body = `<rect width="${S}" height="${S}" fill="url(#L)"/>`;
  switch (sc.surface) {
    case 'felt':
      defs += noise('.95', 0.9, 3);
      body += `<rect width="${S}" height="${S}" filter="url(#n0.9)" opacity=".4" style="mix-blend-mode:overlay"/>`;
      break;
    case 'wood': {
      defs += `<filter id="w" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".0035 .055" numOctaves="4" seed="${seed}"/><feColorMatrix values="0 0 0 0 .2  0 0 0 0 .1  0 0 0 0 .02  0 0 0 2.2 -.75"/></filter>`;
      defs += noise('.9', 0.6, 2);
      body += `<rect width="${S}" height="${S}" filter="url(#w)" opacity=".55"/>`;
      for (let x = 0; x < S; x += 230) body += `<rect x="${x}" width="3" height="${S}" fill="#000" opacity=".35"/><rect x="${x + 3}" width="2" height="${S}" fill="#fff" opacity=".06"/>`;
      body += `<rect width="${S}" height="${S}" filter="url(#n0.6)" opacity=".12" style="mix-blend-mode:overlay"/>`;
      break;
    }
    case 'linen': case 'paper':
      defs += `<filter id="lw" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8 .04" numOctaves="2" seed="${seed}" result="a"/><feTurbulence type="fractalNoise" baseFrequency=".04 .8" numOctaves="2" seed="${seed + 1}" result="b"/><feBlend in="a" in2="b" mode="multiply"/><feColorMatrix values="0 0 0 0 .4  0 0 0 0 .35  0 0 0 0 .3  0 0 0 1.4 -.35"/></filter>`;
      body += `<rect width="${S}" height="${S}" filter="url(#lw)" opacity="${sc.surface === 'paper' ? 0.18 : 0.35}"/>`;
      break;
    case 'tile': {
      const t = 120;
      defs += `<pattern id="tp" width="${t}" height="${t}" patternUnits="userSpaceOnUse"><rect width="${t}" height="${t}" fill="${hi}"/>`
        + `<circle cx="${t / 2}" cy="${t / 2}" r="${t * 0.3}" fill="none" stroke="${lo}" stroke-width="10"/><path d="M${t / 2} 10L${t - 10} ${t / 2}L${t / 2} ${t - 10}L10 ${t / 2}Z" fill="none" stroke="${base}" stroke-width="6"/>`
        + `<circle cx="${t / 2}" cy="${t / 2}" r="${t * 0.1}" fill="${base}"/>`
        + [[0, 0], [t, 0], [0, t], [t, t]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${t * 0.22}" fill="${lo}"/><circle cx="${x}" cy="${y}" r="${t * 0.12}" fill="${hi}"/>`).join('')
        + `<rect width="${t}" height="${t}" fill="none" stroke="#E9E3D8" stroke-width="6"/></pattern>`;
      defs += noise('.8', 0.5, 2);
      body = `<rect width="${S}" height="${S}" fill="url(#tp)"/><rect width="${S}" height="${S}" fill="url(#L)" opacity=".6" style="mix-blend-mode:multiply"/>`
        + `<rect width="${S}" height="${S}" filter="url(#n0.5)" opacity=".1" style="mix-blend-mode:overlay"/>`;
      break;
    }
    case 'neon':
      defs += `<radialGradient id="m1" cx=".18" cy=".2" r=".55"><stop offset="0" stop-color="#FF2BD6" stop-opacity=".5"/><stop offset="1" stop-color="#FF2BD6" stop-opacity="0"/></radialGradient>`
        + `<radialGradient id="m2" cx=".88" cy=".85" r=".6"><stop offset="0" stop-color="#00E5FF" stop-opacity=".42"/><stop offset="1" stop-color="#00E5FF" stop-opacity="0"/></radialGradient>`;
      defs += noise('.9', 0.7, 2);
      body += `<rect width="${S}" height="${S}" fill="url(#m1)"/><rect width="${S}" height="${S}" fill="url(#m2)"/>`;
      for (let i = -S; i < S * 2; i += 60) body += `<path d="M${i} ${S}L${i + S * 0.35} 0" stroke="#7A2CFF" stroke-width="1.2" opacity=".18"/>`;
      body += `<rect width="${S}" height="${S}" filter="url(#n0.7)" opacity=".12" style="mix-blend-mode:overlay"/>`;
      break;
    case 'marble':
      defs += `<filter id="mv" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency=".003 .008" numOctaves="5" seed="${seed}"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .5  0 0 0 0 .45  -2.6 0 0 0 .9"/></filter>`;
      body += `<rect width="${S}" height="${S}" filter="url(#mv)" opacity=".55"/>`;
      break;
    case 'lacquer':
      defs += `<radialGradient id="g1" cx=".7" cy=".25" r=".5"><stop offset="0" stop-color="${hi}" stop-opacity=".45"/><stop offset="1" stop-color="${hi}" stop-opacity="0"/></radialGradient>`;
      body += `<rect width="${S}" height="${S}" fill="url(#g1)"/>`;
      { const r = rng(seed); for (let i = 0; i < 260; i++) body += `<circle cx="${(r() * S).toFixed(1)}" cy="${(r() * S).toFixed(1)}" r="${(0.6 + r() * 1.6).toFixed(2)}" fill="#E7C46A" opacity="${(0.15 + r() * 0.4).toFixed(2)}"/>`; }
      break;
    case 'rug': {
      const t = 90;
      defs += `<pattern id="rp" width="${t}" height="${t}" patternUnits="userSpaceOnUse"><rect width="${t}" height="${t}" fill="${base}"/>`
        + `<path d="M${t / 2} 12L${t - 12} ${t / 2}L${t / 2} ${t - 12}L12 ${t / 2}Z" fill="${lo}"/><path d="M${t / 2} 36L${t - 36} ${t / 2}L${t / 2} ${t - 36}L36 ${t / 2}Z" fill="${hi}"/>`
        + `<path d="M${t / 2} 56L${t - 56} ${t / 2}L${t / 2} ${t - 56}L56 ${t / 2}Z" fill="#E3A72F"/>`
        + [[0, 0], [t, 0], [0, t], [t, t]].map(([x, y]) => `<path d="M${x} ${y - 20}L${x + 20} ${y}L${x} ${y + 20}L${x - 20} ${y}Z" fill="#F1E6CF"/>`).join('') + `</pattern>`;
      defs += noise('.9 .45', 0.8, 2);
      body = `<rect width="${S}" height="${S}" fill="url(#rp)"/><rect width="${S}" height="${S}" fill="url(#L)" opacity=".7" style="mix-blend-mode:multiply"/>`
        + `<rect width="${S}" height="${S}" filter="url(#n0.8)" opacity=".28" style="mix-blend-mode:overlay"/>`;
      break;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs>${defs}</defs>${body}</svg>`;
}

const FINISH = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs>`
  + `<radialGradient id="v" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>`
  + `</defs><rect width="${S}" height="${S}" fill="url(#v)"/></svg>`;

// ------------------------------------------------------------------------------------------------ objects
interface Assets { cards: Map<string, Img>; back: Img; edge: Img; box: { front: Img; back: Img; side: Img; top: Img } }

/** Cards lit from the top-left with a soft gloss sweep. */
const cardShade = (gloss = 0.07, tilt = 0): Shade => (u, v) => {
  const mul = 0.86 + 0.16 * (1 - (u * 0.45 + v * 0.55));
  const g = Math.exp(-(((u - v * 0.7 - 0.15 + tilt) ** 2) / 0.012)) * gloss;
  return [mul, g];
};

function cardCorners(cx: number, cy: number, deg: number, z: number): V3[] {
  const w = CARD_W / 2, h = CARD_H / 2;
  return ([[-w, h, 0], [w, h, 0], [w, -h, 0], [-w, -h, 0]] as V3[]).map(p => place(p, deg, [cx, cy, z]));
}

async function drawCard(c: Canvas, cam: Camera, img: Img, edge: Img, cx: number, cy: number, deg: number, z: number, sh = 1, gloss = 0.07) {
  const top = cardCorners(cx, cy, deg, z).map(p => cam.project(p));
  // contact + soft shadow onto what is below
  const low = cardCorners(cx, cy, deg, Math.max(0, z - 0.4)).map(p => cam.project(p));
  if (sh > 0) {
    await c.shadow(low, 16 * sh, 0.5 * sh, 7 * sh, 12 * sh);
    await c.shadow(low, 3, 0.35 * sh, 1, 2);
  }
  c.quad(edge, cardCorners(cx, cy, deg, Math.max(0, z - 0.35)).map(p => cam.project(p)), (_u, v) => [0.8 - 0.1 * v, 0]);
  c.quad(img, top, cardShade(gloss));
}

async function drawStack(c: Canvas, cam: Camera, a: Assets, cx: number, cy: number, deg: number, height = 16, layers = 18) {
  const base = cardCorners(cx, cy, deg, 0).map(p => cam.project(p));
  await c.shadow(base, 22, 0.45, 10, 16);
  await c.shadow(base, 4, 0.5, 2, 3);
  for (let i = 0; i < layers; i++) {
    const z = (height * i) / layers;
    c.quad(a.edge, cardCorners(cx, cy, deg, z).map(p => cam.project(p)), () => [0.72 + (i % 2) * 0.08, 0]);
  }
  c.quad(a.back, cardCorners(cx, cy, deg, height).map(p => cam.project(p)), cardShade(0.08));
}

/** Upright tuck box; front faces -y before rotation by `deg` around z. */
async function drawBox(c: Canvas, cam: Camera, a: Assets, cx: number, cy: number, deg: number, lying = false) {
  const w = BOX_W / 2, d = BOX_D / 2, h = BOX_H;
  const T = (p: V3) => cam.project(place(p, deg, [cx, cy, 0]));
  if (lying) {
    // box lying on its back, front up: x across, y along the height
    const hh = BOX_H / 2, z = BOX_D;
    const front = ([[-w, hh, z], [w, hh, z], [w, -hh, z], [-w, -hh, z]] as V3[]).map(T);
    const base = ([[-w, hh, 0], [w, hh, 0], [w, -hh, 0], [-w, -hh, 0]] as V3[]).map(T);
    await c.shadow(base, 24, 0.5, 14, 18);
    await c.shadow(base, 4, 0.5, 2, 3);
    const sideR = ([[w, hh, z], [w, -hh, z], [w, -hh, 0], [w, hh, 0]] as V3[]).map(T);
    const sideB = ([[-w, -hh, z], [w, -hh, z], [w, -hh, 0], [-w, -hh, 0]] as V3[]).map(T);
    const sideL = ([[-w, -hh, z], [-w, hh, z], [-w, hh, 0], [-w, -hh, 0]] as V3[]).map(T);
    for (const [q, img, m] of [[sideR, a.box.side, 0.55], [sideL, a.box.side, 0.7], [sideB, a.box.top, 0.62]] as [P2[], Img, number][]) {
      if (facing(q)) c.quad(img, q, () => [m, 0]);
    }
    c.quad(a.box.front, front, cardShade(0.06));
    return;
  }
  const base = ([[-w, -d, 0], [w, -d, 0], [w, d, 0], [-w, d, 0]] as V3[]).map(T);
  // long shadow cast away from the light (towards +x, +y)
  const shadowPoly = ([[-w, -d, 0], [w, -d, 0], [w + 30, d + 60, 0], [-w + 30, d + 60, 0]] as V3[]).map(T);
  await c.shadow(shadowPoly, 30, 0.42, 0, 0);
  await c.shadow(base, 10, 0.75, 4, 6);
  await c.shadow(base, 3, 0.6, 1, 2);
  const front = ([[-w, -d, h], [w, -d, h], [w, -d, 0], [-w, -d, 0]] as V3[]).map(T);
  const right = ([[w, -d, h], [w, d, h], [w, d, 0], [w, -d, 0]] as V3[]).map(T);
  const left = ([[-w, d, h], [-w, -d, h], [-w, -d, 0], [-w, d, 0]] as V3[]).map(T);
  const top = ([[-w, d, h], [w, d, h], [w, -d, h], [-w, -d, h]] as V3[]).map(T);
  if (facing(right)) c.quad(a.box.side, right, (u, v) => [0.56 - 0.08 * v, 0.02 * (1 - u)]);
  if (facing(left)) c.quad(a.box.side, left, (_u, v) => [0.78 - 0.08 * v, 0]);
  if (facing(top)) c.quad(a.box.top, top, () => [1.12, 0.03]);
  c.quad(a.box.front, front, (u, v) => {
    const g = Math.exp(-(((u - 0.25 - v * 0.3) ** 2) / 0.01)) * 0.09;
    return [1.02 - 0.12 * v - 0.06 * u, g];
  });
}

// ------------------------------------------------------------------------------------------------ scenes
async function background(t: DeckTheme, seed: number) {
  return Canvas.from(await sharp(Buffer.from(surfaceSvg(t.scene, seed))).png().toBuffer(), S, S);
}

async function finish(c: Canvas): Promise<Buffer> {
  const png = await c.toPng();
  return sharp(png).composite([{ input: Buffer.from(FINISH), blend: 'over' }]).png().toBuffer();
}

const card = (a: Assets, id: CardId) => a.cards.get(id)!;

export async function heroScene(t: DeckTheme, a: Assets) {
  const c = await background(t, 3);
  const cam = new Camera([40, -520, 360], [14, -4, 22], 3550, S / 2, S / 2 + 10);
  const fan = t.scene.fan;
  // fan of cards lying on the table, front-right of the box
  const n = fan.length;
  for (let i = 0; i < n; i++) {
    const ang = -34 + (68 * i) / Math.max(1, n - 1);
    const a0 = (ang * Math.PI) / 180, R = 52;
    const px = 30 + R * Math.sin(a0), py = -40 + R * Math.cos(a0) - R;
    await drawCard(c, cam, card(a, fan[i]), a.edge, px + 4, py + 14, -ang - 8, 0.4 + i * 0.35, 0.9);
  }
  await drawBox(c, cam, a, -46, 24, -24);
  return finish(c);
}

export async function fanScene(t: DeckTheme, a: Assets) {
  const c = await background(t, 5);
  const cam = new Camera([0, -250, 640], [0, 4, 0], 2900, S / 2, S / 2);
  await drawBox(c, cam, a, 50, 66, 24, true);
  const ids = [...t.scene.spread.slice(0, 2), ...t.scene.fan].slice(0, 7);
  const n = ids.length;
  for (let i = 0; i < n; i++) {
    const ang = -42 + (84 * i) / (n - 1);
    const a0 = (ang * Math.PI) / 180, R = 78;
    await drawCard(c, cam, card(a, ids[i]), a.edge, -12 + R * Math.sin(a0), -48 + R * Math.cos(a0) - R + 30, -ang, 0.4 + i * 0.4, 0.85);
  }
  return finish(c);
}

export async function spreadScene(t: DeckTheme, a: Assets) {
  const c = await background(t, 7);
  const cam = new Camera([0, -90, 760], [0, -2, 0], 2850, S / 2, S / 2);
  const ids = t.scene.spread;
  const r = rng(11);
  for (let i = 0; i < ids.length; i++) {
    const col = i % 4, row = Math.floor(i / 4);
    const x = -108 + col * 72 + (r() - 0.5) * 6, y = 50 - row * 98 + (r() - 0.5) * 6;
    await drawCard(c, cam, card(a, ids[i]), a.edge, x, y, (r() - 0.5) * 10, 0.4, 0.8, 0.05);
  }
  return finish(c);
}

export async function backsScene(t: DeckTheme, a: Assets) {
  const c = await background(t, 9);
  const cam = new Camera([-30, -470, 400], [4, 10, 18], 3000, S / 2, S / 2 + 30);
  // backs fanned on the table in front, the stack, then the box standing behind
  await drawStack(c, cam, a, 54, 40, 12, 15);
  for (let i = 0; i < 4; i++) {
    await drawCard(c, cam, a.back, a.edge, -36 + i * 16, -52 + i * 3, 30 - i * 14, 0.4 + i * 0.35, 0.85);
  }
  await drawCard(c, cam, card(a, t.scene.fan[0]), a.edge, 34, -60, -18, 2.2, 0.85);
  await drawBox(c, cam, a, -40, 58, 18);
  return finish(c);
}

export async function makeAssets(cards: Map<string, Buffer>, back: Buffer, box: { front: Buffer; back: Buffer; side: Buffer; top: Buffer }, paperEdge: string): Promise<Assets> {
  const out = new Map<string, Img>();
  for (const [k, v] of cards) out.set(k, await loadImg(v));
  const edgePng = await sharp({ create: { width: 64, height: 88, channels: 4, background: paperEdge } }).png().toBuffer();
  return {
    cards: out, back: await loadImg(back), edge: await loadImg(edgePng),
    box: { front: await loadImg(box.front), back: await loadImg(box.back), side: await loadImg(box.side), top: await loadImg(box.top) },
  };
}

export async function toWebp(png: Buffer) {
  return sharp(png).flatten({ background: '#000' }).webp({ quality: 88, effort: 6, smartSubsample: true }).toBuffer();
}
