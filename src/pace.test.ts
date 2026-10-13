import { describe, expect, it } from 'vitest';
import { BOT_PACE, FAST_TEMPO, botDelayMs, dealTimeline } from './pace';
import { PACE } from './i18n/pace';
import { LANGS } from './i18n';

describe('deal timeline', () => {
  // the engine deals 5 cards each to 2 players, 4 each to 3–4 players
  const tables: [number, number][] = [[2, 5], [3, 4], [4, 4]];

  it('lasts ~1.6–2.4 s at normal tempo, whatever the table', () => {
    for (const [n, h] of tables) {
      const t = dealTimeline(n, h);
      expect(t.end).toBeGreaterThanOrEqual(1.6);
      expect(t.end).toBeLessThanOrEqual(2.45);
      expect(t.total).toBe(n * h);
    }
  });

  it('is ordered: deck in → cards out → starter → turn-over → end', () => {
    for (const [n, h] of tables) {
      const t = dealTimeline(n, h);
      expect(t.t0).toBeGreaterThan(0);
      expect(t.iv).toBeGreaterThan(0.05); // never a blur: cards leave at least 50 ms apart
      expect(t.lastLand).toBeGreaterThan(t.t0 + (t.total - 1) * t.iv);
      expect(t.starterAt).toBeGreaterThan(t.t0 + (t.total - 1) * t.iv);
      expect(t.starterFlip).toBeGreaterThanOrEqual(t.starterAt + t.fly);
      expect(t.end).toBeGreaterThan(t.starterFlip);
      expect(t.end).toBeGreaterThan(t.lastLand + (h - 1) * t.fanStep + t.fanDur);
    }
  });

  it('fast mode deals quicker', () => {
    for (const [n, h] of tables) expect(dealTimeline(n, h, FAST_TEMPO).end).toBeLessThan(dealTimeline(n, h).end * 0.8);
  });
});

describe('bot pace', () => {
  const base = { events: [], chooseSuit: false, fast: false, rand: 0.5 };

  it('is calmer than before (820 ms + up to 350 ms) and pauses longer after big moments', () => {
    const calm = botDelayMs(base);
    expect(calm).toBeGreaterThan((820 + 175) * 1.25);
    const heavy = botDelayMs({ ...base, events: [{ t: 'queen' }] });
    expect(heavy - calm).toBeGreaterThanOrEqual(900);
    const medium = botDelayMs({ ...base, events: [{ t: 'skip' }] });
    expect(medium).toBeGreaterThan(calm);
    expect(medium).toBeLessThan(heavy);
  });

  it('fast mode is ~2× quicker; god mode stacks on top; rush is a short beat', () => {
    expect(botDelayMs({ ...base, fast: true })).toBeCloseTo(botDelayMs(base) * BOT_PACE.fast);
    expect(botDelayMs({ ...base, fast: true, god: 1 / 3 })).toBeCloseTo(botDelayMs(base) * BOT_PACE.fast / 3);
    expect(botDelayMs({ ...base, rush: true })).toBe(BOT_PACE.rush);
    expect(botDelayMs({ ...base, rush: true, god: 1 / 3 })).toBeCloseTo(BOT_PACE.rush / 3);
  });
});

describe('fast-mode strings', () => {
  it('exist in every language', () => {
    for (const l of LANGS) {
      const s = PACE[l.id];
      expect(s, l.id).toBeDefined();
      for (const v of Object.values(s!)) expect(typeof v === 'string' && v.trim().length > 0, l.id).toBe(true);
    }
  });
});
