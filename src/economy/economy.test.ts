import { describe, expect, it } from 'vitest';
import sql12 from '../../supabase/migration_012_economy.sql?raw';
import {
  BOOSTS, COLLECTIONS, JACKPOT_IDX, MAX_PAID_SPINS, POT_MULT, SPIN_PRICES, STAKE_DAILY_GAMES, STAKE_DAILY_PROFIT_CAP, STAKE_MIN_SECONDS, STAKE_TIERS,
  WHEEL_PRIZES, WHEEL_TOTAL, collectionCost, potFor, stakePayout, stakeProfit, wheelEvBm,
} from './config';
import { markStakeGame, shieldStep, stakeIdOf, isShielded } from './shield';
import { ECO_STRINGS } from '../i18n/economy';
import { apply, newGame, type GameState } from '../engine/engine';

const block = (table: string) => { const a = sql12.indexOf(`insert into public.${table}`); return sql12.slice(a, sql12.indexOf('on conflict', a)); };

describe('fortune wheel', () => {
  it('odds table sums to exactly 100 % and every prize can be won', () => {
    expect(WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0)).toBe(WHEEL_TOTAL);
    expect(WHEEL_TOTAL).toBe(10000);
    for (const p of WHEEL_PRIZES) { expect(p.weight).toBeGreaterThan(0); expect(p.amount).toBeGreaterThan(0); }
    expect(WHEEL_PRIZES.map(p => p.idx)).toEqual(WHEEL_PRIZES.map((_, i) => i));
  });
  it('matches the SQL seed row for row', () => {
    const rows = [...block('wheel_prizes').matchAll(/\((\d+), '(\w+)', (\d+), (\d+)\)/g)].map(m => ({ idx: +m[1], kind: m[2], amount: +m[3], weight: +m[4] }));
    expect(rows).toEqual(WHEEL_PRIZES);
  });
  it('jackpot is the rarest BM prize and the published numbers hold', () => {
    const jack = WHEEL_PRIZES[JACKPOT_IDX];
    expect(jack).toMatchObject({ kind: 'bm', amount: 5000 });
    expect(Math.min(...WHEEL_PRIZES.map(p => p.weight))).toBe(jack.weight);
    expect(wheelEvBm()).toBeCloseTo(177, 0);
    // a paid spin is a sink in BM terms: even the cheapest paid spin costs more than the BM it returns on average
    expect(SPIN_PRICES[0]).toBeGreaterThan(wheelEvBm());
  });
  it('paid spin prices escalate and match the SQL', () => {
    for (let i = 1; i < SPIN_PRICES.length; i++) expect(SPIN_PRICES[i]).toBeGreaterThan(SPIN_PRICES[i - 1]);
    expect(MAX_PAID_SPINS).toBe(5);
    const arrays = [...sql12.matchAll(/prices int\[\] := array\[([\d, ]+)\]/g)].map(m => m[1].split(',').map(Number));
    expect(arrays.length).toBeGreaterThanOrEqual(2);
    for (const a of arrays) expect(a).toEqual([...SPIN_PRICES]);
  });
  it('a server-side style weighted draw lands every prize at its odds (±10 % relative)', () => {
    let seed = 42;
    const rnd = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
    const hits = new Array(WHEEL_PRIZES.length).fill(0);
    const N = 200000;
    for (let i = 0; i < N; i++) {
      const roll = Math.floor(rnd() * WHEEL_TOTAL);
      let acc = 0;
      for (const p of WHEEL_PRIZES) { acc += p.weight; if (roll < acc) { hits[p.idx]++; break; } }
    }
    WHEEL_PRIZES.forEach(p => { const want = (p.weight / WHEEL_TOTAL) * N; expect(Math.abs(hits[p.idx] - want) / want, `idx ${p.idx}`).toBeLessThan(0.1); });
  });
});

describe('stakes', () => {
  it('pot = entry × 2.5 and the tiers match the SQL', () => {
    expect(POT_MULT).toBe(2.5);
    expect(STAKE_TIERS.map(t => t.entry)).toEqual([250, 1000, 5000]);
    expect(STAKE_TIERS.map(t => potFor(t.entry))).toEqual([625, 2500, 12500]);
    expect(STAKE_TIERS.map(t => stakeProfit(t.entry))).toEqual([375, 1500, 7500]);
    expect(sql12).toMatch(/when 1 then 250 when 2 then 1000 when 3 then 5000/);
    expect(sql12).toMatch(new RegExp(`when 1 then ${STAKE_TIERS[0].minLevel} when 2 then ${STAKE_TIERS[1].minLevel} when 3 then ${STAKE_TIERS[2].minLevel}`));
    expect(sql12).toMatch(/floor\(e \* 2\.5\)/);
    expect(sql12).toMatch(new RegExp(`secs < ${STAKE_MIN_SECONDS}`));
    expect(sql12).toMatch(new RegExp(`cnt >= ${STAKE_DAILY_GAMES}`));
    expect(sql12).toMatch(new RegExp(`${STAKE_DAILY_PROFIT_CAP} - profit_today`));
  });
  it('payout respects Lucky shuffle and the daily profit cap', () => {
    expect(stakePayout(1000, false, 0)).toBe(2500);
    expect(stakePayout(1000, true, 0)).toBe(2750);
    expect(stakePayout(5000, false, 0)).toBe(12500);
    expect(stakePayout(5000, false, 15000)).toBe(10000);      // only 5 000 profit left today
    expect(stakePayout(5000, false, 20000)).toBe(5000);       // cap reached: refund
    expect(stakePayout(5000, true, 19999)).toBe(5001);
  });
  it('is a BM sink at the house edge (1 of 4 seats) and only skill makes it pay', () => {
    const ev = (entry: number, winRate: number) => winRate * potFor(entry) - entry;
    expect(ev(1000, 0.25)).toBeLessThan(0);          // a random player loses on average
    expect(ev(1000, 0.4)).toBe(0);                    // break-even needs a 40 % win rate vs 3 Hard bots
  });
});

describe('boosts & collections', () => {
  it('boost prices match the SQL', () => {
    for (const b of BOOSTS) expect(sql12).toMatch(new RegExp(`when '${b.kind}' then ${b.price}`));
  });
  it('collections match the SQL seed', () => {
    const rows = [...block('collection_defs').matchAll(/\('(\w+)', '(\w+)', array\[([\d, ]+)\], (\d+)\)/g)].map(m => ({ id: m[1], item: m[2], costs: m[3].split(',').map(Number) }));
    expect(rows).toEqual(COLLECTIONS.map(c => ({ id: c.id, item: c.item, costs: c.costs })));
    expect(COLLECTIONS.map(collectionCost)).toEqual([30, 35, 45]);
  });
});

describe('shield (stake games vs bots only)', () => {
  const qsAgainstMe = (): GameState => {
    const g = newGame([{ name: 'Me', bot: false }, { name: 'Bot', bot: true }], () => 0.5);
    return { ...g, pending: { kind: 'queen', amount: 5 }, current: 0, phase: 'play' };
  };
  it('takes 2 cards of a Q♠ penalty back under the deck, once', () => {
    const g = markStakeGame(qsAgainstMe(), { id: 7, tier: 2 });
    expect(stakeIdOf(g)).toBe(7);
    const hand0 = g.players[0].hand.length, deck0 = g.deck.length;
    const raw = apply(g, 0, { type: 'accept' });
    expect(raw.players[0].hand.length).toBe(hand0 + 5);
    const s = shieldStep(g, raw, 0, true);
    expect(s.players[0].hand.length).toBe(hand0 + 3);
    expect(s.deck.length).toBe(deck0 - 3);
    expect(s.events.find(e => e.t === 'draw')).toMatchObject({ n: 3 });
    expect(isShielded(s)).toBe(true);
    expect(stakeIdOf(s)).toBe(7);
    // the shield survives structuredClone in the engine, and never fires twice
    const again = { ...s, pending: { kind: 'queen' as const, amount: 5 }, current: 0 };
    const raw2 = apply(again, 0, { type: 'accept' });
    expect(shieldStep(again, raw2, 0, true)).toBe(raw2);
  });
  it('does nothing when not armed or for other penalties / players', () => {
    const g = qsAgainstMe();
    const raw = apply(g, 0, { type: 'accept' });
    expect(shieldStep(g, raw, 0, false)).toBe(raw);
    const eight = { ...g, pending: { kind: 'eight' as const, amount: 4 } };
    const r8 = apply(eight, 0, { type: 'accept' });
    expect(shieldStep(eight, r8, 0, true)).toBe(r8);
    const other = { ...g, current: 1 };
    const ro = apply(other, 1, { type: 'accept' });
    expect(shieldStep(other, ro, 0, true)).toBe(ro);
  });
});

describe('economy strings', () => {
  it('en/lv/ru/uk have every key and functions return text', () => {
    const walk = (en: unknown, tr: unknown, path: string) => {
      if (typeof en === 'function') { expect(typeof tr, path).toBe('function'); expect(String((tr as (...a: unknown[]) => unknown)(3, 5))).not.toMatch(/undefined|NaN/); return; }
      if (typeof en === 'string') { expect(typeof tr === 'string' && tr.length > 0, path).toBe(true); return; }
      if (Array.isArray(en)) { expect(Array.isArray(tr) && tr.length === en.length, path).toBe(true); return; }
      for (const k of Object.keys(en as object)) walk((en as Record<string, unknown>)[k], (tr as Record<string, unknown>)?.[k], `${path}.${k}`);
    };
    for (const l of ['lv', 'ru', 'uk']) walk(ECO_STRINGS.en, ECO_STRINGS[l], l);
  });
});
