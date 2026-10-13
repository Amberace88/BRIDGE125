import { memo, useEffect, useMemo, useRef } from 'react';
import { RANK_TEXT, SUIT_GLYPH, isRedSuit, type SCard } from '../engine/cards';

/**
 * The win: an homage to the classic bouncing-card cascade, in brass and ivory — cards leap off the foundations and
 * bounce down the felt leaving soft gold-rimmed trails. Canvas (one draw per card per frame), tap to skip.
 */
export interface Launch { card: SCard; x: number; y: number }

interface Props { launches: Launch[]; cw: number; ch: number; onDone: () => void; reduce?: boolean }

function sprite(card: SCard, w: number, h: number, dpr: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  const r = w * 0.09;
  const path = (inset: number) => {
    const x = inset, y = inset, ww = w - inset * 2, hh = h - inset * 2, rr = Math.max(1, r - inset * 0.6);
    g.beginPath();
    g.moveTo(x + rr, y); g.arcTo(x + ww, y, x + ww, y + hh, rr); g.arcTo(x + ww, y + hh, x, y + hh, rr);
    g.arcTo(x, y + hh, x, y, rr); g.arcTo(x, y, x + ww, y, rr); g.closePath();
  };
  const bg = g.createLinearGradient(0, 0, w * 0.3, h);
  bg.addColorStop(0, '#FFFAF0'); bg.addColorStop(0.6, '#F7F1E3'); bg.addColorStop(1, '#E9DFC6');
  path(0.5); g.fillStyle = bg; g.fill();
  g.lineWidth = 1.4; g.strokeStyle = '#C9A54C'; g.stroke();
  path(w * 0.06); g.lineWidth = 0.8; g.strokeStyle = 'rgba(201,165,76,.5)'; g.stroke();
  const ink = isRedSuit(card.s) ? '#A31D35' : '#17181C';
  g.fillStyle = ink; g.textBaseline = 'top';
  g.font = `700 ${w * 0.32}px "Cormorant Garamond", Georgia, serif`;
  g.fillText(RANK_TEXT[card.r], w * 0.1, h * 0.05);
  g.font = `${w * 0.2}px Georgia, serif`;
  g.fillText(SUIT_GLYPH[card.s], w * 0.11, h * 0.05 + w * 0.32);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${w * (card.r > 10 ? 0.4 : 0.52)}px Georgia, serif`;
  if (card.r > 10) {
    g.fillStyle = 'rgba(201,165,76,.18)'; g.fillRect(w * 0.22, h * 0.24, w * 0.56, h * 0.52);
    g.strokeStyle = 'rgba(140,110,40,.5)'; g.lineWidth = 0.8; g.strokeRect(w * 0.22, h * 0.24, w * 0.56, h * 0.52);
    g.fillStyle = ink; g.font = `italic 700 ${w * 0.38}px "Cormorant Garamond", Georgia, serif`;
    g.fillText(RANK_TEXT[card.r], w / 2, h * 0.47);
  } else g.fillText(SUIT_GLYPH[card.s], w / 2, h * 0.54);
  return c;
}

export const Cascade = memo(function Cascade({ launches, cw, ch, onDone, reduce }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone); done.current = onDone;

  useEffect(() => {
    const cv = ref.current;
    if (!cv || reduce || !launches.length) { const t = setTimeout(() => done.current(), reduce ? 400 : 0); return () => clearTimeout(t); }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext('2d')!;
    g.scale(dpr, dpr);
    const sprites = new Map<number, HTMLCanvasElement>();
    for (const l of launches) if (!sprites.has(l.card.id)) sprites.set(l.card.id, sprite(l.card, cw, ch, dpr));
    const k = Math.max(0.7, Math.min(1.8, ch / 80));
    const gap = Math.max(45, Math.min(110, 4200 / launches.length));
    interface P { s: HTMLCanvasElement; x: number; y: number; vx: number; vy: number; bounce: number }
    const live: P[] = [];
    let next = 0, last = performance.now(), start = last, raf = 0;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const floor = H - ch - 6;
    const tick = (now: number) => {
      const dt = Math.min(2.2, (now - last) / 16.67);
      last = now;
      while (next < launches.length && now - start >= next * gap) {
        const l = launches[next++];
        const dir = l.x + cw / 2 < W / 2 ? 1 : -1;
        live.push({ s: sprites.get(l.card.id)!, x: l.x, y: l.y, vx: dir * rnd(2.2, 6.5) * k * (Math.random() < 0.18 ? -1 : 1), vy: rnd(-7, -1) * k, bounce: rnd(0.68, 0.84) });
      }
      // trails fade softly instead of piling up for ever
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = 'rgba(0,0,0,0.05)';
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i];
        p.vy += 0.42 * k * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > floor) { p.y = floor; p.vy = -p.vy * p.bounce; if (Math.abs(p.vy) < 2 * k) p.vy = -rnd(4, 7) * k; }
        g.drawImage(p.s, p.x, p.y, cw, ch);
        if (p.x < -cw - 4 || p.x > W + 4) live.splice(i, 1);
      }
      if (next >= launches.length && !live.length) { done.current(); return; }
      if (now - start > 14000) { done.current(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [launches, cw, ch, reduce]);

  return <canvas ref={ref} className="sol-cascade" onPointerDown={() => done.current()} aria-hidden="true" />;
});

/** Confetti of suit glyphs (CSS only: transform / opacity). */
export const SuitConfetti = memo(function SuitConfetti({ n = 44 }: { n?: number }) {
  const bits = useMemo(() => Array.from({ length: n }, (_, i) => {
    const glyph = ['♠', '♥', '♣', '♦'][i % 4];
    const tone = i % 4 === 1 || i % 4 === 3 ? (i % 3 ? 'claret' : 'gold') : i % 5 ? 'gold' : 'ivory';
    return {
      glyph, tone,
      left: Math.random() * 100,
      size: 12 + Math.random() * 18,
      delay: Math.random() * 1.6,
      dur: 2.8 + Math.random() * 2.4,
      sway: (Math.random() - 0.5) * 120,
      spin: (Math.random() - 0.5) * 720,
    };
  }), [n]);
  return (
    <div className="sol-confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} className={b.tone} style={{
          left: `${b.left}%`, fontSize: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`,
          ['--sway' as string]: `${b.sway}px`, ['--spin' as string]: `${b.spin}deg`,
        }}>{b.glyph}</i>
      ))}
    </div>
  );
});
