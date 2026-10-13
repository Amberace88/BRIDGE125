/**
 * The challenge share image: 1080×1350 (4:5) in the Daily share card's style (src/daily/shareCard.ts) — night felt,
 * brass frame, the logo mark, BRIDGE 125 — with the game's name, either one medallion ("the score to beat") or a
 * face-off of two ("You 2:41 · VS · Anna 3:05"), the call to action and the challenge link.
 */
export interface ChallengeCardData {
  game: string;
  kicker: string;
  /** the main side (the sender) */
  a: { name: string; main: string; sub: string; won: boolean };
  /** the other side for a face-off (omit for a fresh challenge) */
  b?: { name: string; main: string; sub: string; won: boolean } | null;
  /** 1: a beat b · 0 tie · -1 b beat a (face-off only) */
  vs?: number;
  headline?: string;
  wonLabel: string; lostLabel: string; vsLabel: string; cta: string;
  url: string;
}

export const CARD_W = 1080, CARD_H = 1350;
const SERIF = '"Cormorant Garamond", Georgia, serif';
const SANS = '"Golos Text", system-ui, sans-serif';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(res => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = src; });
}
async function fontsReady(text: string) {
  if (!document.fonts?.load) return;
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`700 120px ${SERIF}`, text), document.fonts.load(`italic 700 60px ${SERIF}`, text), document.fonts.load(`700 30px ${SANS}`, text)]),
      new Promise(r => setTimeout(r, 1500)),
    ]);
  } catch { /* system fonts */ }
}
function gold(ctx: CanvasRenderingContext2D, y0: number, y1: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#FFF6D8'); g.addColorStop(0.35, '#EBD38E'); g.addColorStop(0.7, '#C9A54C'); g.addColorStop(1, '#8C6E28');
  return g;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, sp: number) {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ('letterSpacing' in c) { c.letterSpacing = `${sp}px`; ctx.fillText(text, x + (ctx.textAlign === 'center' ? sp / 2 : 0), y); c.letterSpacing = '0px'; return; }
  ctx.fillText(text, x, y);
}
function fit(ctx: CanvasRenderingContext2D, text: string, weight: string, family: string, size: number, maxW: number) {
  let s = size; ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxW && s > 12) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; }
}

function medallion(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, label: string, main: string, sub: string, tag: string, won: boolean, glow: boolean) {
  ctx.save();
  if (glow) { ctx.shadowColor = 'rgba(243,222,156,.55)'; ctx.shadowBlur = 70; } else { ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 22; }
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  const ring = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  ring.addColorStop(0, '#FFF2C4'); ring.addColorStop(0.3, '#C9A54C'); ring.addColorStop(0.55, '#8C6E28'); ring.addColorStop(0.8, '#EBD38E'); ring.addColorStop(1, '#8C6E28');
  ctx.fillStyle = ring; ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, R - 13, 0, Math.PI * 2);
  const inner = ctx.createRadialGradient(cx, cy - R * 0.4, 10, cx, cy, R);
  inner.addColorStop(0, '#1e5a4a'); inner.addColorStop(0.6, '#0b2a22'); inner.addColorStop(1, '#04110d');
  ctx.fillStyle = inner; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, R - 24, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(235,211,142,.38)'; ctx.stroke();
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, r1 = R - 30, r2 = R - (i % 4 ? 35 : 42);
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.lineWidth = i % 4 ? 1.5 : 3; ctx.strokeStyle = 'rgba(235,211,142,.28)'; ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(235,211,142,.85)';
  fit(ctx, label.toUpperCase(), '700', SANS, Math.round(R * 0.12), R * 1.3);
  spaced(ctx, label.toUpperCase(), cx, cy - R * 0.38, 5);
  fit(ctx, main, '700', SANS, Math.round(R * 0.56), R * 1.42);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
  ctx.fillStyle = gold(ctx, cy - R * 0.3, cy + R * 0.2); ctx.textBaseline = 'middle'; ctx.fillText(main, cx, cy + R * 0.02);
  ctx.restore(); ctx.textBaseline = 'alphabetic';
  if (sub) { ctx.fillStyle = 'rgba(247,241,227,.75)'; ctx.font = `600 ${Math.round(R * 0.12)}px ${SANS}`; ctx.fillText(sub, cx, cy + R * 0.38); }
  ctx.font = `700 ${Math.round(R * 0.095)}px ${SANS}`;
  const tw = ctx.measureText(tag.toUpperCase()).width + R * 0.24, th = R * 0.19, ty = cy + R * 0.5;
  rr(ctx, cx - tw / 2, ty, tw, th, th / 2);
  ctx.fillStyle = won ? 'rgba(235,211,142,.95)' : 'rgba(163,29,53,.9)'; ctx.fill();
  ctx.fillStyle = won ? '#2B1E03' : '#FFE8EC'; ctx.textBaseline = 'middle';
  spaced(ctx, tag.toUpperCase(), cx, ty + th / 2 + 1, 3);
  ctx.textBaseline = 'alphabetic';
}

export async function drawChallengeCard(d: ChallengeCardData): Promise<HTMLCanvasElement> {
  const cv = document.createElement('canvas');
  cv.width = CARD_W; cv.height = CARD_H;
  const ctx = cv.getContext('2d')!;
  const W = CARD_W, H = CARD_H, cx = W / 2;
  await fontsReady(`${d.game}${d.kicker}${d.a.name}${d.b?.name ?? ''}${d.cta}${d.headline ?? ''}${d.url}0123456789:`);
  const logo = await loadImage('/logo-mark.svg');

  // felt (a touch of claret: it is a duel)
  const felt = ctx.createRadialGradient(cx, H * 0.42, 60, cx, H * 0.5, H * 0.8);
  felt.addColorStop(0, '#1d6e57'); felt.addColorStop(0.45, '#0e4537'); felt.addColorStop(1, '#03110d');
  ctx.fillStyle = felt; ctx.fillRect(0, 0, W, H);
  const cl = ctx.createRadialGradient(cx, H * 1.05, 40, cx, H * 1.05, H * 0.6);
  cl.addColorStop(0, 'rgba(163,29,53,.35)'); cl.addColorStop(1, 'rgba(163,29,53,0)');
  ctx.fillStyle = cl; ctx.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 9000; i++) { ctx.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${0.012 + rnd() * 0.02})` : `rgba(0,0,0,${0.03 + rnd() * 0.04})`; ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6); }
  const lamp = ctx.createRadialGradient(cx, -120, 20, cx, 120, 760);
  lamp.addColorStop(0, 'rgba(255,236,180,.30)'); lamp.addColorStop(1, 'rgba(255,236,180,0)');
  ctx.fillStyle = lamp; ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(cx, H / 2, H * 0.35, cx, H / 2, H * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  // brass frame + corner suits
  rr(ctx, 36, 36, W - 72, H - 72, 44); ctx.lineWidth = 6; ctx.strokeStyle = gold(ctx, 36, H - 36); ctx.stroke();
  rr(ctx, 54, 54, W - 108, H - 108, 32); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(235,211,142,.32)'; ctx.stroke();
  ctx.font = `700 34px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ([['♠', 92, 92], ['♥', W - 92, 92], ['♦', 92, H - 92], ['♣', W - 92, H - 92]] as const).forEach(([s, x, y]) => {
    ctx.fillStyle = s === '♥' || s === '♦' ? 'rgba(210,51,79,.75)' : 'rgba(235,211,142,.7)'; ctx.fillText(s, x, y);
  });

  // header
  if (logo) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.drawImage(logo, cx - 54, 80, 108, 108); ctx.restore(); }
  ctx.textBaseline = 'alphabetic'; ctx.font = `700 32px ${SANS}`;
  const sp = 12, wB = ctx.measureText('BRIDGE').width + sp * 6, wN = ctx.measureText('125').width + sp * 3, gap = 18, x0 = cx - (wB + gap + wN) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F7F1E3'; spaced(ctx, 'BRIDGE', x0, 236, sp);
  ctx.fillStyle = gold(ctx, 206, 238); spaced(ctx, '125', x0 + wB + gap, 236, sp);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#EBD38E'; fit(ctx, d.kicker.toUpperCase(), '700', SANS, 26, W - 260); spaced(ctx, d.kicker.toUpperCase(), cx, 296, 7);
  ctx.fillStyle = '#F7F1E3'; fit(ctx, d.game, 'italic 700', SERIF, 84, W - 240); ctx.fillText(d.game, cx, 378);

  if (d.b) {
    // face-off
    const my = 690, R = 196, dx = 236;
    const aWin = (d.vs ?? 0) > 0, bWin = (d.vs ?? 0) < 0;
    medallion(ctx, cx - dx, my, R, d.a.name, d.a.main, d.a.sub, d.a.won ? d.wonLabel : d.lostLabel, d.a.won, aWin);
    medallion(ctx, cx + dx, my, R, d.b.name, d.b.main, d.b.sub, d.b.won ? d.wonLabel : d.lostLabel, d.b.won, bWin);
    // VS seal
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(cx, my, 64, 0, Math.PI * 2);
    const vs = ctx.createLinearGradient(0, my - 64, 0, my + 64); vs.addColorStop(0, '#c2203a'); vs.addColorStop(1, '#5a0b19');
    ctx.fillStyle = vs; ctx.fill(); ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = gold(ctx, my - 64, my + 64); ctx.stroke();
    ctx.fillStyle = '#FFF2C4'; ctx.font = `italic 700 54px ${SERIF}`; ctx.textBaseline = 'middle'; ctx.fillText(d.vsLabel, cx, my + 2); ctx.textBaseline = 'alphabetic';
    if (d.headline) { ctx.fillStyle = gold(ctx, 960, 1020); fit(ctx, d.headline, 'italic 700', SERIF, 70, W - 200); ctx.fillText(d.headline, cx, 1010); }
  } else {
    const my = 680, R = 226;
    medallion(ctx, cx, my, R, d.a.name, d.a.main, d.a.sub, d.a.won ? d.wonLabel : d.lostLabel, d.a.won, true);
  }

  // call to action + link
  ctx.fillStyle = '#F7F1E3'; fit(ctx, d.cta, 'italic 700', SERIF, 66, W - 200); ctx.fillText(d.cta, cx, 1132);
  ctx.font = `700 32px ${SANS}`;
  const uw = Math.min(W - 160, ctx.measureText(d.url).width + 84);
  rr(ctx, cx - uw / 2, 1176, uw, 62, 31);
  const ub = ctx.createLinearGradient(0, 1176, 0, 1238); ub.addColorStop(0, '#EBD38E'); ub.addColorStop(0.5, '#C9A54C'); ub.addColorStop(1, '#8C6E28');
  ctx.fillStyle = ub; ctx.fill();
  ctx.fillStyle = '#2B1E03'; fit(ctx, d.url, '700', SANS, 32, uw - 50); ctx.fillText(d.url, cx, 1218);
  return cv;
}
