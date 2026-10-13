/**
 * The Daily challenge share image: 1080×1350 (4:5, the feed-friendly portrait size), drawn on a canvas in the brand
 * style — night felt, brass frame, the logo mark, the score in gold, "Can you beat me?" and the link.
 */
export interface ShareCardData {
  score: number;
  no: number;
  dateLabel: string;
  won: boolean;
  points: number;
  turns: number;
  queens: number;
  rank?: number | null;
  total?: number | null;
  name?: string;
  practice?: boolean;
  url: string;
  labels: { daily: string; score: string; rank: string; won: string; lost: string; points: string; turns: string; queens: string; cta: string; practice: string };
}

export const CARD_W = 1080, CARD_H = 1350;
const SERIF = '"Cormorant Garamond", Georgia, serif';
const SANS = '"Golos Text", system-ui, sans-serif';
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, '\u2009');

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

async function fontsReady(text: string) {
  if (!document.fonts?.load) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`700 120px ${SERIF}`, text),
        document.fonts.load(`italic 700 60px ${SERIF}`, text),
        document.fonts.load(`600 30px ${SANS}`, text),
        document.fonts.load(`700 30px ${SANS}`, text),
      ]),
      new Promise(r => setTimeout(r, 1500)),
    ]);
  } catch { /* system fonts */ }
}

function goldGrad(ctx: CanvasRenderingContext2D, y0: number, y1: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#FFF6D8'); g.addColorStop(0.35, '#EBD38E'); g.addColorStop(0.7, '#C9A54C'); g.addColorStop(1, '#8C6E28');
  return g;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Spaced capitals (canvas letterSpacing where supported, manual spacing otherwise). */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ('letterSpacing' in c) {
    c.letterSpacing = `${spacing}px`;
    // letterSpacing adds trailing space after the last glyph: shift by half of it to stay centred
    ctx.fillText(text, x + (ctx.textAlign === 'center' ? spacing / 2 : 0), y);
    c.letterSpacing = '0px';
    return;
  }
  const chars = [...text];
  const w = chars.reduce((a, ch) => a + ctx.measureText(ch).width, 0) + spacing * (chars.length - 1);
  let cx = ctx.textAlign === 'center' ? x - w / 2 : x;
  const al = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of chars) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; }
  ctx.textAlign = al;
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: string, family: string, size: number, maxW: number) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxW && s > 12) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; }
  return s;
}

/** A card back like the logo mark: dark lacquer, brass border, a small spade. */
function cardBack(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, rot: number) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
  rr(ctx, -w / 2, -h / 2, w, h, 18);
  const bg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  bg.addColorStop(0, '#16302a'); bg.addColorStop(1, '#0a1714');
  ctx.fillStyle = bg; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 7; ctx.strokeStyle = goldGrad(ctx, -h / 2, h / 2); ctx.stroke();
  rr(ctx, -w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 10);
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(235,211,142,.35)'; ctx.stroke();
  ctx.fillStyle = 'rgba(235,211,142,.5)';
  ctx.font = `700 ${Math.round(w * 0.32)}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('♠', 0, 4);
  ctx.restore();
}

export async function drawShareCard(d: ShareCardData): Promise<HTMLCanvasElement> {
  const cv = document.createElement('canvas');
  cv.width = CARD_W; cv.height = CARD_H;
  const ctx = cv.getContext('2d')!;
  const L = d.labels;
  const rankTxt = d.rank ? `#${fmt(d.rank)}${d.total ? ` / ${fmt(d.total)}` : ''}` : '';
  await fontsReady(`${L.daily}${L.score}${L.rank}${L.won}${L.lost}${L.points}${L.turns}${L.queens}${L.cta}${L.practice}${d.dateLabel}${d.name ?? ''}0123456789#/·♠♥`);
  const logo = await loadImage('/logo-mark.svg');
  const W = CARD_W, H = CARD_H, cx = W / 2;

  // ---- felt
  const felt = ctx.createRadialGradient(cx, H * 0.42, 60, cx, H * 0.5, H * 0.78);
  felt.addColorStop(0, '#1d6e57'); felt.addColorStop(0.45, '#0e4537'); felt.addColorStop(1, '#03110d');
  ctx.fillStyle = felt; ctx.fillRect(0, 0, W, H);
  // cloth grain (deterministic)
  let seed = 125;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${0.012 + rnd() * 0.02})` : `rgba(0,0,0,${0.03 + rnd() * 0.04})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
  }
  // lamp light from above + brass haze
  const lamp = ctx.createRadialGradient(cx, -120, 20, cx, 120, 760);
  lamp.addColorStop(0, 'rgba(255,236,180,.30)'); lamp.addColorStop(1, 'rgba(255,236,180,0)');
  ctx.fillStyle = lamp; ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(cx, H / 2, H * 0.35, cx, H / 2, H * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  // ---- brass frame
  rr(ctx, 36, 36, W - 72, H - 72, 44);
  ctx.lineWidth = 6; ctx.strokeStyle = goldGrad(ctx, 36, H - 36); ctx.stroke();
  rr(ctx, 54, 54, W - 108, H - 108, 32);
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(235,211,142,.32)'; ctx.stroke();
  ctx.font = `700 34px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ([['♠', 92, 92], ['♥', W - 92, 92], ['♦', 92, H - 92], ['♣', W - 92, H - 92]] as const).forEach(([s, x, y]) => {
    ctx.fillStyle = s === '♥' || s === '♦' ? 'rgba(210,51,79,.75)' : 'rgba(235,211,142,.7)';
    ctx.fillText(s, x, y);
  });

  // ---- header: logo + wordmark (numbers are set in Golos: canvas can't switch Cormorant to lining figures)
  if (logo) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.drawImage(logo, cx - 60, 78, 120, 120); ctx.restore(); }
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 34px ${SANS}`;
  const sp = 12;
  const wB = ctx.measureText('BRIDGE').width + sp * 6, wN = ctx.measureText('125').width + sp * 3, gap = 18;
  const x0 = cx - (wB + gap + wN) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#F7F1E3'; spaced(ctx, 'BRIDGE', x0, 252, sp);
  ctx.fillStyle = goldGrad(ctx, 222, 254); spaced(ctx, '125', x0 + wB + gap, 252, sp);
  ctx.textAlign = 'center';

  // kicker + date + player
  ctx.fillStyle = '#EBD38E';
  fitFont(ctx, `${L.daily.toUpperCase()} · #${d.no}`, '700', SANS, 27, W - 260);
  spaced(ctx, `${L.daily.toUpperCase()} · #${d.no}`, cx, 308, 7);
  ctx.fillStyle = 'rgba(247,241,227,.8)';
  fitFont(ctx, d.dateLabel, 'italic 700', SERIF, 42, W - 260);
  ctx.fillText(d.dateLabel, cx, 362);
  if (d.name) {
    ctx.fillStyle = 'rgba(232,240,236,.55)';
    fitFont(ctx, d.name, '600', SANS, 25, W - 300);
    ctx.fillText(d.name, cx, 404);
  }

  // ---- fanned cards behind the medallion
  const my = 660, R = 214;
  cardBack(ctx, cx - 236, my + 26, 176, 252, -0.38);
  cardBack(ctx, cx + 236, my + 26, 176, 252, 0.38);
  cardBack(ctx, cx - 140, my - 24, 176, 252, -0.19);
  cardBack(ctx, cx + 140, my - 24, 176, 252, 0.19);

  // ---- medallion
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
  ctx.beginPath(); ctx.arc(cx, my, R, 0, Math.PI * 2);
  const ring = ctx.createLinearGradient(cx - R, my - R, cx + R, my + R);
  ring.addColorStop(0, '#FFF2C4'); ring.addColorStop(0.3, '#C9A54C'); ring.addColorStop(0.55, '#8C6E28'); ring.addColorStop(0.8, '#EBD38E'); ring.addColorStop(1, '#8C6E28');
  ctx.fillStyle = ring; ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, my, R - 15, 0, Math.PI * 2);
  const inner = ctx.createRadialGradient(cx, my - R * 0.4, 10, cx, my, R);
  inner.addColorStop(0, '#1e5a4a'); inner.addColorStop(0.6, '#0b2a22'); inner.addColorStop(1, '#04110d');
  ctx.fillStyle = inner; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, my, R - 28, 0, Math.PI * 2);
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(235,211,142,.4)'; ctx.stroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, r1 = R - 36, r2 = R - (i % 5 ? 42 : 50);
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, my + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, my + Math.sin(a) * r2);
    ctx.lineWidth = i % 5 ? 1.5 : 3; ctx.strokeStyle = 'rgba(235,211,142,.3)'; ctx.stroke();
  }
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, my, R - 15, 0, Math.PI * 2); ctx.clip();
  const gl = ctx.createLinearGradient(0, my - R, 0, my);
  gl.addColorStop(0, 'rgba(255,255,255,.13)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(cx, my - R * 0.55, R * 0.85, R * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(235,211,142,.85)';
  ctx.font = `700 24px ${SANS}`;
  spaced(ctx, (d.practice ? L.practice : L.score).toUpperCase(), cx, my - 82, 8);
  const scoreTxt = fmt(d.score);
  fitFont(ctx, scoreTxt, '700', SANS, 132, R * 1.5);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
  ctx.fillStyle = goldGrad(ctx, my - 56, my + 44);
  ctx.textBaseline = 'middle';
  ctx.fillText(scoreTxt, cx, my + 2);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
  const tag = (d.won ? L.won : L.lost).toUpperCase();
  ctx.font = `700 22px ${SANS}`;
  const tw = ctx.measureText(tag).width + 56;
  rr(ctx, cx - tw / 2, my + 70, tw, 42, 21);
  ctx.fillStyle = d.won ? 'rgba(235,211,142,.95)' : 'rgba(163,29,53,.88)'; ctx.fill();
  ctx.fillStyle = d.won ? '#2B1E03' : '#FFE8EC';
  spaced(ctx, tag, cx, my + 99, 4);

  // ---- rank ribbon
  if (rankTxt) {
    const ry = 942;
    ctx.font = `700 44px ${SANS}`;
    const rw = Math.max(360, ctx.measureText(rankTxt).width + ctx.measureText(L.rank).width * 0.6 + 140);
    rr(ctx, cx - rw / 2, ry - 38, rw, 76, 38);
    const rb = ctx.createLinearGradient(0, ry - 38, 0, ry + 38);
    rb.addColorStop(0, 'rgba(0,0,0,.55)'); rb.addColorStop(1, 'rgba(0,0,0,.3)');
    ctx.fillStyle = rb; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(235,211,142,.6)'; ctx.stroke();
    ctx.fillStyle = 'rgba(235,211,142,.85)'; ctx.font = `700 20px ${SANS}`; ctx.textAlign = 'left';
    spaced(ctx, L.rank.toUpperCase(), cx - rw / 2 + 32, ry + 8, 4);
    ctx.textAlign = 'right'; ctx.fillStyle = '#F7F1E3'; ctx.font = `700 40px ${SANS}`;
    ctx.fillText(rankTxt, cx + rw / 2 - 34, ry + 14);
    ctx.textAlign = 'center';
  }

  // ---- stats
  const sy = rankTxt ? 1064 : 1000;
  const cols = [[L.points, fmt(d.points)], [L.turns, fmt(d.turns)], [L.queens, fmt(d.queens)]];
  const colW = 270;
  cols.forEach(([label, v], i) => {
    const x = cx + (i - 1) * colW;
    ctx.fillStyle = '#F7F1E3'; ctx.font = `700 54px ${SANS}`; ctx.textAlign = 'center';
    ctx.fillText(v, x, sy);
    ctx.fillStyle = 'rgba(232,240,236,.6)'; fitFont(ctx, label.toUpperCase(), '600', SANS, 21, colW - 40);
    spaced(ctx, label.toUpperCase(), x, sy + 38, 3);
    if (i) { ctx.fillStyle = 'rgba(235,211,142,.25)'; ctx.fillRect(x - colW / 2, sy - 50, 1.5, 98); }
  });

  // ---- call to action
  ctx.fillStyle = '#F7F1E3';
  fitFont(ctx, L.cta, 'italic 700', SERIF, 66, W - 200);
  ctx.fillText(L.cta, cx, 1172);
  ctx.font = `700 33px ${SANS}`;
  const uw = ctx.measureText(d.url).width + 84;
  rr(ctx, cx - uw / 2, 1196, uw, 62, 31);
  const ub = ctx.createLinearGradient(0, 1196, 0, 1258);
  ub.addColorStop(0, '#EBD38E'); ub.addColorStop(0.5, '#C9A54C'); ub.addColorStop(1, '#8C6E28');
  ctx.fillStyle = ub; ctx.fill();
  ctx.fillStyle = '#2B1E03'; ctx.fillText(d.url, cx, 1239);
  return cv;
}

export const canvasBlob = (cv: HTMLCanvasElement) => new Promise<Blob | null>(res => cv.toBlob(b => res(b), 'image/png'));

/**
 * Share the image (Web Share API with files), else download it and copy the link.
 * Resolves to what happened so the UI can say so.
 */
export async function shareImage(blob: Blob, opts: { title: string; text: string; url: string; filename: string }): Promise<'shared' | 'saved' | 'cancelled'> {
  const file = new File([blob], opts.filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: opts.title, text: `${opts.text} ${opts.url}` }); return 'shared'; }
    catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled'; }
  }
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href; a.download = opts.filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 4000);
  try { await navigator.clipboard?.writeText(`${opts.text} ${opts.url}`); } catch { /* */ }
  return 'saved';
}
