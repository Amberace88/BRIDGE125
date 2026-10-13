import { describe, expect, it } from 'vitest';
import { apply, mixSeed, mulberry32, newGame, nextRound, seedFrom, type GameState } from './engine';
import { BOT_LEVELS, botAction, type BotLevel } from './bot';

const SEATS = [{ name: 'Me', bot: false }, { name: 'A', bot: true }, { name: 'B', bot: true }, { name: 'C', bot: true }];
const hands = (g: GameState) => g.players.map(p => p.hand.map(c => c.id).join(',')).join(' | ') + ' / ' + g.pile[0].id;

/** Every seat played by a bot of `level` until game over; returns the move log + final scores. */
function autoplay(seed: number, level: BotLevel, maxRounds = 3) {
  let g = newGame(SEATS, { seed, maxRounds });
  const log: string[] = [];
  for (let i = 0; i < 6000 && g.phase !== 'gameOver'; i++) {
    if (g.phase === 'roundOver') { g = nextRound(g); log.push('deal ' + hands(g)); continue; }
    const p = g.current;
    const a = botAction(g, p, level);
    let n = apply(g, p, a);
    if (n === g && a.type !== 'pass') n = apply(g, p, { type: 'draw' });
    log.push(`${p}:${JSON.stringify(a)}`);
    g = n;
  }
  return { log, scores: g.players.map(p => p.score), rounds: g.round, phase: g.phase };
}

describe('seeded games (Daily challenge)', () => {
  it('the same seed gives the same deal, different seeds different deals', () => {
    const s = seedFrom('daily:2026-10-13');
    expect(hands(newGame(SEATS, { seed: s }))).toBe(hands(newGame(SEATS, { seed: s })));
    expect(hands(newGame(SEATS, { seed: s }))).not.toBe(hands(newGame(SEATS, { seed: seedFrom('daily:2026-10-14') })));
    // a seeded game ignores any rng passed in
    expect(hands(newGame(SEATS, () => 0.42, { seed: s }))).toBe(hands(newGame(SEATS, { seed: s })));
  });

  it('later rounds are dealt from (seed, round) — independent of how the earlier rounds went', () => {
    const s = seedFrom('daily:2026-10-13');
    const a = newGame(SEATS, { seed: s, maxRounds: 3 });
    // two different ways to finish round 1: whoever goes out, the round-2 deal is the same
    const end = (g: GameState, w: number) => {
      const st = structuredClone(g);
      st.players.forEach((p, i) => { p.hand = i === w ? [st.players[w].hand[0]] : p.hand; });
      st.current = w;
      st.pile = [{ id: st.players[w].hand[0].r + 'X', r: st.players[w].hand[0].r, s: st.players[w].hand[0].s }];
      st.activeSuit = st.players[w].hand[0].s;
      return apply(st, w, { type: 'play', cardIds: [st.players[w].hand[0].id] });
    };
    const r1 = end(a, 0), r2 = end(a, 2);
    expect(r1.phase).toBe('roundOver');
    expect(r2.phase).toBe('roundOver');
    expect(hands(nextRound(r1))).toBe(hands(nextRound(r2)));
    expect(nextRound(r1).round).toBe(2);
  });

  it('bot decisions are deterministic for a seeded game (every level), and a whole game replays identically', () => {
    const s = seedFrom('daily:2026-11-02');
    for (const level of BOT_LEVELS) {
      const x = autoplay(s, level), y = autoplay(s, level);
      expect(x.phase).toBe('gameOver');
      expect(x.log).toEqual(y.log);
      expect(x.scores).toEqual(y.scores);
    }
  });

  it('maxRounds ends the game after that many rounds; lowest total wins', () => {
    const r = autoplay(seedFrom('daily:2026-12-24'), 'hard', 2);
    expect(r.phase).toBe('gameOver');
    expect(r.rounds).toBeLessThanOrEqual(2);
  });

  it('normal games are untouched: no seed, no maxRounds, Math.random still drives them', () => {
    const g = newGame(SEATS);
    expect(g.seed).toBeUndefined();
    expect(g.rs).toBeUndefined();
    expect(g.rules?.maxRounds).toBeUndefined();
    const deals = new Set(Array.from({ length: 6 }, () => hands(newGame(SEATS))));
    expect(deals.size).toBeGreaterThan(1);
    // rng-driven games stay reproducible exactly as before
    expect(hands(newGame(SEATS, mulberry32(7)))).toBe(hands(newGame(SEATS, mulberry32(7))));
  });

  it('seed helpers are stable', () => {
    expect(mixSeed(1, 2, 3)).toBe(mixSeed(1, 2, 3));
    expect(mixSeed(1, 2, 3)).not.toBe(mixSeed(3, 2, 1));
    const r = mulberry32(123);
    const v = Array.from({ length: 1000 }, r);
    expect(v.every(x => x >= 0 && x < 1)).toBe(true);
    expect(seedFrom('a')).not.toBe(seedFrom('b'));
  });
});
