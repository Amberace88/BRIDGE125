/**
 * Tuck box for a 54-card poker deck: panels (with bleed) + a flat dieline with cut / fold guides.
 *
 * Inner size 64.8 × 90.2 × 19 mm (fits 54 poker cards on 300–310 gsm stock). At 300 dpi:
 *   front / back  765 × 1065 px trim   → 840 × 1140 px with 1/8 in bleed
 *   sides         225 × 1065 px trim   → 300 × 1140 px
 *   top / bottom  765 ×  225 px trim   → 840 ×  300 px
 */
import { logoMark, wordmark } from './brand.ts';
import { H as CH, W as CW, type DeckTheme } from './cards.ts';
import { face } from './font.ts';
import { deckUrl, qrPath } from './qr.ts';
import { n, rrect, svgDoc } from './svg.ts';

export const BB = 37.5;
export const BW = 765, BH = 1065, BD = 225;
export const PANEL = {
  front: [BW + 2 * BB, BH + 2 * BB],
  back: [BW + 2 * BB, BH + 2 * BB],
  side: [BD + 2 * BB, BH + 2 * BB],
  top: [BW + 2 * BB, BD + 2 * BB],
} as const;
export type PanelId = 'front' | 'back' | 'side' | 'top';

const g6 = () => face('golos600');
const g8 = () => face('golos800');
const corm = () => face('corm700');

/** Fit `text` to maxW by shrinking the size. */
function fit(f: ReturnType<typeof face>, text: string, size: number, maxW: number, tracking = 0) {
  const w = f.width(text, size, tracking);
  return w > maxW ? (size * maxW) / w : size;
}

function frontPanel(t: DeckTheme) {
  const [w, h] = PANEL.front;
  const cx = w / 2;
  const art = `<g transform="scale(${n(w / CW)} ${n(h / CH)})">${t.box.front(CW, CH)}</g>`;
  if (t.box.ownLabel) return { w, h, body: art + t.box.ownLabel(w, h) };
  const plate = t.box.plate;
  const name = t.name.toUpperCase();
  const ns = fit(corm(), name, 92, w - 200, 0.06);
  const top = (plate ? `<rect x="${cx - 300}" y="${BB + 120}" width="600" height="104" rx="8" fill="${plate}"/>` : '')
    + wordmark(cx, BB + 192, 54, t.box.ink, t.box.accent);
  const bottom = (plate ? `<rect x="70" y="${h - BB - 300}" width="${w - 140}" height="214" rx="10" fill="${plate}"/>` : '')
    + `<path d="${corm().text(name, cx, h - BB - 200, ns, { anchor: 'middle', tracking: 0.06 }).d}" fill="${t.box.ink}"/>`
    + `<path d="M${cx - 200} ${h - BB - 168}H${cx + 200}" stroke="${t.box.rule ?? t.box.accent}" stroke-width="2.5"/>`
    + `<path d="${g6().text('PLAYING CARDS', cx, h - BB - 120, 28, { anchor: 'middle', tracking: 0.42 }).d}" fill="${t.box.accent}"/>`;
  return { w, h, body: art + top + bottom };
}

function backPanel(t: DeckTheme) {
  const [w, h] = PANEL.back;
  const cx = w / 2, ink = t.box.ink;
  const name = t.name.toUpperCase();
  let y = BB + 110;
  let body = t.box.panel(w, h);
  body += `<path d="${rrect(BB + 34, BB + 34, BW - 68, BH - 68, 22)}" fill="none" stroke="${t.box.rule ?? t.box.accent}" stroke-width="3"/>`;
  body += logoMark(cx, y + 50, 120, t.box.plate ?? '#0F1C18', t.box.rule ?? '#C9A85A');
  y += 170;
  body += wordmark(cx, y, 40, ink, t.box.accent);
  y += 80;
  body += `<path d="${corm().text(name + ' DECK', cx, y, fit(corm(), name + ' DECK', 58, w - 180, 0.04), { anchor: 'middle', tracking: 0.04 }).d}" fill="${ink}"/>`;
  y += 48;
  body += `<path d="${face('corm600i').text(t.boxLine, cx, y, fit(face('corm600i'), t.boxLine, 32, w - 200), { anchor: 'middle' }).d}" fill="${ink}" opacity=".85"/>`;
  y += 64;
  const specs = [t.edition36 ? '54 CARDS  ·  52 + 2 JOKERS  ·  36-CARD EDITION AVAILABLE' : '54 CARDS  ·  52 + 2 JOKERS', 'POKER SIZE 63 × 88 MM  ·  ORIGINAL ARTWORK'];
  for (const s of specs) {
    body += `<path d="${g6().text(s, cx, y, fit(g6(), s, 19, w - 200, 0.18), { anchor: 'middle', tracking: 0.18 }).d}" fill="${ink}" opacity=".8"/>`;
    y += 36;
  }
  // digital twin + QR
  const qy = h - BB - 420, qs = 200;
  body += `<rect x="${cx - qs / 2 - 18}" y="${qy - 18}" width="${qs + 36}" height="${qs + 36}" rx="16" fill="#FFFFFF"/>`;
  body += `<path d="${qrPath(deckUrl(t.id), cx - qs / 2, qy, qs).d}" fill="#111111"/>`;
  const tw = 'DIGITAL TWIN', tw2 = 'Play free at bridge125.com and unlock', tw3 = 'this exact card back in the game.';
  body += `<path d="${g8().text(tw, cx, qy - 64, 24, { anchor: 'middle', tracking: 0.3 }).d}" fill="${t.box.accent}"/>`;
  body += `<path d="${g6().text('bridge125.com', cx, qy + qs + 70, 30, { anchor: 'middle', tracking: 0.04 }).d}" fill="${ink}"/>`;
  body += `<path d="${face('golos500').text(tw2, cx, qy + qs + 112, 22, { anchor: 'middle' }).d}" fill="${ink}" opacity=".8"/>`;
  body += `<path d="${face('golos500').text(tw3, cx, qy + qs + 142, 22, { anchor: 'middle' }).d}" fill="${ink}" opacity=".8"/>`;
  return { w, h, body };
}

function sidePanel(t: DeckTheme) {
  const [w, h] = PANEL.side;
  const name = t.name.toUpperCase();
  const label = `<g transform="translate(${n(w / 2 + 16)} ${n(h / 2)}) rotate(-90)">${wordmark(0, -26, 44, t.box.ink, t.box.accent)}`
    + `<path d="${g6().text(name, 0, 34, fit(g6(), name, 26, 640, 0.3), { anchor: 'middle', tracking: 0.3 }).d}" fill="${t.box.accent}"/></g>`;
  return { w, h, body: t.box.panel(w, h) + `<path d="${rrect(BB + 22, BB + 30, BD - 44, BH - 60, 14)}" fill="none" stroke="${t.box.rule ?? t.box.accent}" stroke-width="3"/>` + label };
}

function topPanel(t: DeckTheme) {
  const [w, h] = PANEL.top;
  return { w, h, body: t.box.panel(w, h) + `<path d="${rrect(BB + 30, BB + 22, BW - 60, BD - 44, 14)}" fill="none" stroke="${t.box.rule ?? t.box.accent}" stroke-width="3"/>`
    + logoMark(w / 2 - 170, h / 2, 110, t.box.plate ?? '#0F1C18', t.box.rule ?? '#C9A85A') + wordmark(w / 2 + 70, h / 2 + 16, 40, t.box.ink, t.box.accent) };
}

export function boxPanels(t: DeckTheme): Record<PanelId, string> {
  const out = {} as Record<PanelId, string>;
  const mk: Record<PanelId, (t: DeckTheme) => { w: number; h: number; body: string }> = { front: frontPanel, back: backPanel, side: sidePanel, top: topPanel };
  for (const id of Object.keys(mk) as PanelId[]) {
    const { w, h, body } = mk[id](t);
    out[id] = svgDoc(w, h, body, t.defs, `Bridge 125 ${t.name} — tuck box ${id}`);
  }
  return out;
}

/**
 * Flat dieline: [side | front | side | back | glue], lid + tuck flap above the back, bottom + tuck flap below the
 * front, dust flaps on the sides. Art layer + "cut" (red) and "fold" (blue dashed) guide layers.
 */
export function dieline(t: DeckTheme, guides = true) {
  const M = 60, TUCK = 165, DUST = 150, GLUE = 70;
  const x0 = M + BB, ySide = M + BB + TUCK + BD;
  const xs = { side1: x0, front: x0 + BD, side2: x0 + BD + BW, back: x0 + 2 * BD + BW, glue: x0 + 2 * BD + 2 * BW };
  const W = xs.glue + GLUE + BB + M, H = ySide + BH + BD + TUCK + BB + M;
  const panel = (svg: string, x: number, y: number, w: number, h: number, rot = 0) => {
    const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title>.*?<\/title>/, '').replace(`<defs>${t.defs}</defs>`, '');
    // drop the panel bleed: clip to the trim box
    const id = `p${Math.round(x)}_${Math.round(y)}`;
    const t2 = rot ? `translate(${n(x + w / 2)} ${n(y + h / 2)}) rotate(${rot}) translate(${n(-(rot % 180 ? h : w) / 2 - BB)} ${n(-(rot % 180 ? w : h) / 2 - BB)})` : `translate(${n(x - BB)} ${n(y - BB)})`;
    return `<clipPath id="${id}"><rect x="${n(x - 2)}" y="${n(y - 2)}" width="${n(w + 4)}" height="${n(h + 4)}"/></clipPath><g clip-path="url(#${id})"><g transform="${t2}">${inner}</g></g>`;
  };
  const p = boxPanels(t);
  const bg = t.box.panel(W, H);
  let art = `<g id="background" opacity="1">${bg}</g>`;
  art += panel(p.side, xs.side1, ySide, BD, BH) + panel(p.front, xs.front, ySide, BW, BH) + panel(p.side, xs.side2, ySide, BD, BH) + panel(p.back, xs.back, ySide, BW, BH);
  art += panel(p.top, xs.back, ySide - BD, BW, BD, 180) + panel(p.top, xs.front, ySide + BH, BW, BD);
  // cut outline
  const yLid = ySide - BD, yTuckT = yLid - TUCK, yBot = ySide + BH + BD, yTuckB = yBot + TUCK;
  const cut = [
    `M${xs.side1} ${ySide}`,
    `L${xs.side1 + 10} ${ySide - DUST + 40}Q${xs.side1 + 20} ${ySide - DUST} ${xs.side1 + 70} ${ySide - DUST}L${xs.front - 8} ${ySide - DUST + 30}L${xs.front} ${ySide}`,
    `H${xs.side2}L${xs.side2 + 8} ${ySide - DUST + 30}L${xs.back - 70} ${ySide - DUST}Q${xs.back - 20} ${ySide - DUST} ${xs.back - 10} ${ySide - DUST + 40}L${xs.back} ${ySide}`,
    `V${yLid}L${xs.back + 6} ${yTuckT + 50}Q${xs.back + 14} ${yTuckT} ${xs.back + 80} ${yTuckT}H${xs.glue - 80}Q${xs.glue - 14} ${yTuckT} ${xs.glue - 6} ${yTuckT + 50}L${xs.glue} ${yLid}V${ySide}`,
    `L${xs.glue + GLUE} ${ySide + 40}V${ySide + BH - 40}L${xs.glue} ${ySide + BH}`,
    `H${xs.back}L${xs.back - 10} ${ySide + BH + DUST - 40}Q${xs.back - 20} ${ySide + BH + DUST} ${xs.back - 70} ${ySide + BH + DUST}L${xs.side2 + 8} ${ySide + BH + DUST - 30}L${xs.side2} ${ySide + BH}`,
    `V${yBot}L${xs.side2 - 6} ${yTuckB - 50}Q${xs.side2 - 14} ${yTuckB} ${xs.side2 - 80} ${yTuckB}H${xs.front + 80}Q${xs.front + 14} ${yTuckB} ${xs.front + 6} ${yTuckB - 50}L${xs.front} ${yBot}V${ySide + BH}`,
    `L${xs.front - 8} ${ySide + BH + DUST - 30}L${xs.side1 + 70} ${ySide + BH + DUST}Q${xs.side1 + 20} ${ySide + BH + DUST} ${xs.side1 + 10} ${ySide + BH + DUST - 40}L${xs.side1} ${ySide + BH}Z`,
  ].join('');
  const folds = [
    [xs.front, ySide, xs.front, ySide + BH], [xs.side2, ySide, xs.side2, ySide + BH], [xs.back, ySide, xs.back, ySide + BH], [xs.glue, ySide, xs.glue, ySide + BH],
    [xs.back, ySide, xs.glue, ySide], [xs.back, yLid, xs.glue, yLid], [xs.front, ySide + BH, xs.side2, ySide + BH], [xs.front, yBot, xs.side2, yBot],
    [xs.side1, ySide, xs.front, ySide], [xs.side2, ySide, xs.back, ySide], [xs.side1, ySide + BH, xs.front, ySide + BH], [xs.side2, ySide + BH, xs.back, ySide + BH],
  ].map(([a, b, c, d]) => `M${n(a)} ${n(b)}L${n(c)} ${n(d)}`).join('');
  const guide = guides
    ? `<g id="fold" fill="none" stroke="#1E6FD9" stroke-width="2.5" stroke-dasharray="14 8"><path d="${folds}"/></g><g id="cut" fill="none" stroke="#E5202A" stroke-width="3"><path d="${cut}"/></g>`
    : '';
  // the art covers the whole sheet, so every flap has bleed beyond the cut line
  const body = `<rect width="${W}" height="${H}" fill="#FFFFFF"/>` + art + guide;
  return { svg: svgDoc(W, H, body, t.defs, `Bridge 125 ${t.name} — tuck box dieline${guides ? ' (with cut/fold guides)' : ''}`), w: W, h: H };
}
