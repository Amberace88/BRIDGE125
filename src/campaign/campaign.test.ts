import { describe, expect, it } from 'vitest';
import sql from '../../supabase/migration_011_journey.sql?raw';
import { apply, newGame, nextRound, options, type Card, type GameState } from '../engine/engine';
import {
  CHAPTERS, CHARACTERS, MATCHES, TOTAL_STARS, chapterStars, isUnlocked, matchById, nextMatch, rewardFor, starsFor, totalStars,
} from './data';
import { HANDICAP_POINTS, clockStep, giveCard, roundTwist, setupMatch, twistInfo } from './twists';
import {
  QUEST_CAPS, QUEST_DEFS, addDays, applyEvents, assignQuests, clampEvents, diffRows, gameEvents, newTally, rowOf, stepTally, weekStart,
  type QuestRow,
} from './quests';
import { localBoard } from './questStore';
import { mergeStars } from './journeyStore';
import { JOURNEY_STRINGS, QUEST_STRINGS } from '../i18n/journey';

const C = (id: string): Card => ({ id, r: id.slice(0, -1) as Card['r'], s: id.slice(-1) as Card['s'] });
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const allIds = (g: GameState) => [...g.deck, ...g.pile, ...g.players.flatMap(p => p.hand)].map(c => c.id);

/* ------------------------------------------------------------------------------------------------ catalogue */

describe('journey catalogue', () => {
  it('8 chapters × (3 matches + boss), unique ids, global order 1..32', () => {
    expect(CHAPTERS).toHaveLength(8);
    expect(MATCHES).toHaveLength(32);
    expect(new Set(MATCHES.map(m => m.id)).size).toBe(32);
    expect(MATCHES.map(m => m.ord)).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
    expect(MATCHES.filter(m => m.boss).map(m => m.id)).toEqual(CHAPTERS.map(c => `${c.id}_boss`));
    expect(TOTAL_STARS).toBe(96);
    for (const m of MATCHES) expect(CHARACTERS.some(c => c.id === m.foe), m.foe).toBe(true);
  });

  it('journey_matches seed in migration 011 mirrors MATCHES (rewards + items)', () => {
    const block = sql.slice(sql.indexOf('insert into public.journey_matches'), sql.indexOf('on conflict (id)', sql.indexOf('insert into public.journey_matches')));
    const rows = [...block.matchAll(/\('([a-z_0-9]+)',\s*'([a-z]+)',\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(null|'[a-z_0-9]+')\)/g)].map(r => ({
      id: r[1], chapter: r[2], ord: +r[3], bm: +r[4], xp: +r[5], starBm: +r[6], item: r[7] === 'null' ? null : r[7].slice(1, -1),
    }));
    expect(rows).toEqual(MATCHES.map(m => ({ id: m.id, chapter: m.chapter, ord: m.ord, bm: m.bm, xp: m.xp, starBm: m.starBm, item: m.item })));
  });

  it('rewards grow with the chapter and bosses pay the most', () => {
    for (let c = 1; c < 8; c++) expect(rewardFor(c + 1, 1).bm).toBeGreaterThan(rewardFor(c, 1).bm);
    for (let c = 1; c <= 8; c++) expect(rewardFor(c, 4).bm).toBeGreaterThan(rewardFor(c, 3).bm);
  });

  it('unlocking is sequential and nextMatch follows the stars', () => {
    expect(isUnlocked(MATCHES[0], {})).toBe(true);
    expect(isUnlocked(MATCHES[1], {})).toBe(false);
    expect(isUnlocked(MATCHES[1], { riga_1: 1 })).toBe(true);
    expect(nextMatch({}).id).toBe('riga_1');
    expect(nextMatch({ riga_1: 2, riga_2: 1 }).id).toBe('riga_3');
    const all = Object.fromEntries(MATCHES.map(m => [m.id, 3]));
    expect(nextMatch(all).id).toBe('montecarlo_boss');
    expect(totalStars(all)).toBe(96);
    expect(chapterStars('riga', { riga_1: 3, riga_boss: 1 })).toEqual({ got: 4, max: 12, done: true });
  });

  it('stars: win, never hit by Q♠, under the threshold', () => {
    const m = matchById('riga_1')!;
    expect(starsFor(m, { won: false, queenHits: 0, myScore: 0 })).toBe(0);
    expect(starsFor(m, { won: true, queenHits: 2, myScore: 90 })).toBe(1);
    expect(starsFor(m, { won: true, queenHits: 0, myScore: 90 })).toBe(2);
    expect(starsFor(m, { won: true, queenHits: 1, myScore: m.under - 1 })).toBe(2);
    expect(starsFor(m, { won: true, queenHits: 0, myScore: m.under - 1 })).toBe(3);
    expect(starsFor(m, { won: true, queenHits: 0, myScore: m.under })).toBe(2);
  });

  it('guest/server star maps merge to the best value per match, capped at 3', () => {
    expect(mergeStars({ riga_1: 1, riga_2: 3 }, { riga_1: 2 }, { riga_3: 9 })).toEqual({ riga_1: 2, riga_2: 3, riga_3: 3 });
  });
});

/* ------------------------------------------------------------------------------------------------ twists */

describe('house rules at match setup', () => {
  const names = { me: 'Me', foes: ['Boss', 'Two', 'Three'] };

  it('every match sets up the right table', () => {
    for (const m of MATCHES) {
      const info = twistInfo(m.twist);
      const g = setupMatch(m, names, seeded(m.ord));
      expect(g.players.length, m.id).toBe(info.seats);
      expect(g.players[0].bot).toBe(false);
      expect(g.players.slice(1).every(p => p.bot)).toBe(true);
      expect(!!g.rules?.bluff, m.id).toBe(info.bluff);
      expect(g.rules?.queenDraw).toBe(info.queenDraw);
      expect(g.rules?.gameOverAt).toBe(info.gameOverAt);
      expect(g.rules?.burnSplash).toBe(info.burnSplash);
      expect(g.players[0].score).toBe(info.myStart ?? 0);
      expect(new Set(allIds(g)).size).toBe(36);
      expect(g.phase).toBe('play');
    }
  });

  it('boss twists: Pique 7, Countess +10, Croupier 100, Twins 3 seats, Maestro 4 seats, Baron bluff, Clockmaker 15 s', () => {
    expect(twistInfo('pique').queenDraw).toBe(7);
    expect(twistInfo('countess').burnSplash).toBe(10);
    expect(twistInfo('croupier').gameOverAt).toBe(100);
    expect(twistInfo('twins').seats).toBe(3);
    expect(twistInfo('maestro').seats).toBe(4);
    expect(twistInfo('baron').bluff).toBe(true);
    expect(twistInfo('clock').turnMs).toBe(15000);
    expect(twistInfo('handicap').myStart).toBe(HANDICAP_POINTS);
  });

  it('The Banker holds the 6♠ after every deal, hands stay the same size', () => {
    const m = matchById('riga_boss')!;
    for (let seed = 1; seed <= 60; seed++) {
      const rng = seeded(seed);
      let g = setupMatch(m, names, rng);
      expect(g.players[1].hand.some(c => c.id === '6S'), `seed ${seed}`).toBe(true);
      expect(g.players[0].hand.length).toBe(g.players[1].hand.length);
      expect(new Set(allIds(g)).size).toBe(36);
      // next round: finish the round artificially and deal again
      g = { ...g, phase: 'roundOver' };
      const n = roundTwist(m, nextRound(g, rng), rng);
      expect(n.players[1].hand.some(c => c.id === '6S'), `seed ${seed} round 2`).toBe(true);
      expect(new Set(allIds(n)).size).toBe(36);
    }
  });

  it('giveCard swaps from the deck or another hand, never from the pile, and is a no-op when held', () => {
    const g = newGame([{ name: 'A', bot: false }, { name: 'B', bot: true }], seeded(3));
    g.players[0].hand = ['6S', '7C', '8C', '9C', '10C'].map(C);
    g.players[1].hand = ['JH', 'QH', 'KH', 'AH', '7H'].map(C);
    g.deck = ['8S', '9S', 'KS'].map(C);
    const a = giveCard(g, 1, '6S', () => 0);
    expect(a.players[1].hand.map(c => c.id)).toContain('6S');
    expect(a.players[0].hand.map(c => c.id)).toContain('JH');
    expect(giveCard(a, 1, '6S')).toBe(a);
    const b = structuredClone(g); b.pile = [C('6S')]; b.players[0].hand = ['7C', '8C', '9C', '10C', 'KC'].map(C);
    expect(giveCard(b, 1, '6S')).toBe(b);
  });

  it('other twists leave new deals alone', () => {
    const m = matchById('tallinn_boss')!;
    const g = setupMatch(m, names, seeded(9));
    expect(roundTwist(m, g)).toBe(g);
  });
});

describe('the Clockmaker’s clock', () => {
  const setup = (hands: string[][], top = '10H', deck = ['6C', '7C', '8C', '9C', '10C', 'KC', '7D', '9D']) => {
    const st = newGame(hands.map((_, i) => ({ name: 'P' + i, bot: i > 0 })), seeded(1));
    st.players.forEach((p, i) => { p.hand = hands[i].map(C); });
    st.pile = [C(top)]; st.activeSuit = C(top).s; st.deck = deck.map(C); st.current = 0;
    return st;
  };
  it('time out: draw one card, then pass', () => {
    const st = setup([['KS', 'AC'], ['9S']]);
    const a = clockStep(st, 0);
    expect(a.players[0].hand.length).toBe(3);
    expect(a.current).toBe(0);
    const b = clockStep(a, 0);
    expect(b.current).toBe(1);
  });
  it('time out with a penalty pending: take it', () => {
    const st = setup([['KD', 'AC'], ['8H', '9S']]);
    st.current = 1;
    const s1 = apply(st, 1, { type: 'play', cardIds: ['8H'] });
    expect(s1.current).toBe(0);
    const s2 = clockStep(s1, 0);
    expect(s2.players[0].hand.length).toBe(4);
    expect(s2.current).toBe(1);
  });
  it('time out while choosing a suit picks one', () => {
    const st = setup([['JH', 'AC', 'KC'], ['9S']]);
    const s1 = apply(st, 0, { type: 'play', cardIds: ['JH'] });
    expect(s1.phase).toBe('chooseSuit');
    const s2 = clockStep(s1, 0);
    expect(s2.phase).toBe('play');
    expect(s2.current).toBe(1);
  });
  it('does nothing when it is not that player’s turn', () => {
    const st = setup([['KS'], ['9S']]);
    st.current = 1;
    expect(clockStep(st, 0)).toBe(st);
    expect(options(st, 0).mine).toBe(false);
  });
});

/* ------------------------------------------------------------------------------------------------ quests */

describe('quest catalogue', () => {
  it('quest_defs seed in migration 011 mirrors QUEST_DEFS', () => {
    const block = sql.slice(sql.indexOf('insert into public.quest_defs'), sql.indexOf('on conflict (id)', sql.indexOf('insert into public.quest_defs')));
    const rows = [...block.matchAll(/\('([a-z_0-9]+)',\s*'(daily|weekly)',\s*'([a-z_0-9]+)',\s*(\d+),\s*(\d+),\s*(\d+),\s*true/g)].map(r => ({
      id: r[1], kind: r[2], metric: r[3], goal: +r[4], bm: +r[5], xp: +r[6],
    }));
    expect(rows).toEqual(QUEST_DEFS);
  });
  it('quest_progress caps in SQL mirror QUEST_CAPS', () => {
    const block = sql.slice(sql.indexOf('as caps(metric, cap)') - 400, sql.indexOf('as caps(metric, cap)'));
    const caps = Object.fromEntries([...block.matchAll(/\('([a-z_0-9]+)',\s*(\d+)\)/g)].map(r => [r[1], +r[2]]));
    expect(caps).toEqual(QUEST_CAPS);
  });
  it('every metric used by a quest has a cap, strings in every language', () => {
    for (const q of QUEST_DEFS) expect(QUEST_CAPS[q.metric]).toBeGreaterThan(0);
    expect(QUEST_DEFS.filter(q => q.kind === 'daily').length).toBeGreaterThanOrEqual(3);
    expect(QUEST_DEFS.filter(q => q.kind === 'weekly').length).toBeGreaterThanOrEqual(5);
  });
});

describe('quest assignment', () => {
  it('3 distinct dailies and 5 distinct weeklies, deterministic per seed and period', () => {
    const d = assignQuests('daily', 'seed', '2026-10-13');
    expect(d).toHaveLength(3);
    expect(new Set(d).size).toBe(3);
    expect(d.every(id => id.startsWith('d_'))).toBe(true);
    expect(assignQuests('daily', 'seed', '2026-10-13')).toEqual(d);
    const w = assignQuests('weekly', 'seed', '2026-10-12');
    expect(w).toHaveLength(5);
    expect(new Set(w).size).toBe(5);
    expect(w.every(id => id.startsWith('w_'))).toBe(true);
  });
  it('rotates across days and players', () => {
    const days = Array.from({ length: 14 }, (_, i) => assignQuests('daily', 'seed', addDays('2026-10-01', i)).join());
    expect(new Set(days).size).toBeGreaterThan(5);
    expect(assignQuests('daily', 'a', '2026-10-13').join() === assignQuests('daily', 'b', '2026-10-13').join()
      && assignQuests('daily', 'c', '2026-10-13').join() === assignQuests('daily', 'd', '2026-10-13').join()).toBe(false);
  });
  it('excluded quests are never picked (reroll)', () => {
    const d = assignQuests('daily', 's', '2026-10-13');
    const r = assignQuests('daily', 's', '2026-10-13', 1, d, 'reroll');
    expect(r).toHaveLength(1);
    expect(d).not.toContain(r[0]);
  });
  it('Riga calendar helpers: Monday week start, day arithmetic', () => {
    expect(weekStart('2026-10-13')).toBe('2026-10-12');
    expect(weekStart('2026-10-12')).toBe('2026-10-12');
    expect(weekStart('2026-10-18')).toBe('2026-10-12');
    expect(weekStart('2026-10-19')).toBe('2026-10-19');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('a guest board keeps its quests for the day and resets on a new day', () => {
    const at = new Date('2026-10-13T10:00:00Z');
    const b = localBoard(at, null, 'g1');
    expect(b.daily).toHaveLength(3);
    expect(b.weekly).toHaveLength(5);
    expect(b.local).toBe(true);
    const saved = { day: b.today, week: b.week, daily: b.daily.map(r => ({ id: r.id, progress: 1 })), weekly: b.weekly.map(r => ({ id: r.id, progress: 0 })) };
    expect(localBoard(at, saved, 'g1').daily.every(r => r.progress === Math.min(1, r.goal))).toBe(true);
    const next = localBoard(new Date('2026-10-14T10:00:00Z'), saved, 'g1');
    expect(next.daily.every(r => r.progress === 0)).toBe(true);
    expect(next.weekly.map(r => r.id)).toEqual(b.weekly.map(r => r.id));   // same week
    expect(next.nextDaily).toBeGreaterThan(at.getTime());
  });
});

describe('quest progress', () => {
  const rows = (): QuestRow[] => ['d_play3', 'd_queen2', 'd_burn', 'w_win10'].map(id => rowOf(id)!);
  it('events add up to the goal, never past it; claimed quests are frozen', () => {
    let r = applyEvents(rows(), { games: 1, queen: 5, wins: 1 });
    expect(r.map(x => x.progress)).toEqual([1, 2, 0, 1]);
    r = applyEvents(r, { games: 1 });
    r = applyEvents(r, { games: 1 });
    r = applyEvents(r, { games: 1 });
    expect(r[0].progress).toBe(3);
    const frozen = r.map(x => (x.id === 'w_win10' ? { ...x, claimed: true } : x));
    expect(applyEvents(frozen, { wins: 1 })[3].progress).toBe(1);
  });
  it('per-game caps clamp what a client can report', () => {
    expect(clampEvents({ games: 9, queen: 99, rounds: -3, bogus: 4 } as never)).toEqual({ games: 1, queen: 6 });
  });
  it('diffRows lists only what moved', () => {
    const a = rows();
    const b = applyEvents(a, { queen: 1 });
    expect(diffRows(a, b)).toEqual([{ id: 'd_queen2', from: 0, to: 1, goal: 2, kind: 'daily' }]);
  });
});

describe('game tally (event detection)', () => {
  const two = (hands: string[][], top = '10S', deck = ['6C', '7C', '8C', '9C', '10H', 'KH', '7D', '9D', '10D', 'KD', 'AD', '7H', '8D']) => {
    const st = newGame(hands.map((_, i) => ({ name: 'P' + i, bot: i > 0 })), seeded(5));
    st.players.forEach((p, i) => { p.hand = hands[i].map(C); });
    st.pile = [C(top)]; st.activeSuit = C(top).s; st.deck = deck.map(C); st.current = 0;
    return st;
  };
  it('counts my Q♠ plays and the bot’s Q♠ hits on me', () => {
    const st = two([['QS', 'KC', '9H'], ['QC', 'AH', '7S']]);
    let t = newTally();
    const s1 = apply(st, 0, { type: 'play', cardIds: ['QS'] });
    t = stepTally(t, st, s1, 0);
    expect(t.queen).toBe(1);
    expect(t.queenHits).toBe(0);
    // the bot takes the 5 — not a hit on me
    const s2 = apply(s1, 1, { type: 'accept' });
    t = stepTally(t, s1, s2, 0);
    expect(t.queenHits).toBe(0);
    // same seq twice is ignored
    expect(stepTally(t, s1, s2, 0)).toBe(t);

    const b = two([['KC', '9H'], ['QS', 'AH', '7S']]);
    b.current = 1;
    const b1 = apply(b, 1, { type: 'play', cardIds: ['QS'] });
    const b2 = apply(b1, 0, { type: 'accept' });
    let u = stepTally(newTally(), b, b1, 0);
    u = stepTally(u, b1, b2, 0);
    expect(u.queenHits).toBe(1);
  });
  it('rounds, rounds won, jacks finish, bluff rounds, burns', () => {
    const st = two([['JS', 'JD'], ['KH', 'AH']]);
    st.rules = { bluff: true };
    st.players[1].score = 0;
    const s1 = apply(st, 0, { type: 'play', cardIds: ['JS', 'JD'] });
    expect(s1.lastPlay?.out).toBe(true);
    // bluff mode: the round ends once the next player lets the play stand
    const s2 = s1.phase === 'roundOver' ? s1 : apply(s1, 1, { type: 'pass' });
    let t = stepTally(newTally(), st, s1, 0);
    t = stepTally(t, s1, s2, 0);
    expect(t.rounds).toBe(1);
    expect(t.rounds_won).toBe(1);
    expect(t.jacks).toBe(1);
    expect(t.bluff_rounds).toBe(1);

    const c = two([['9S'], ['KH']]);
    c.current = 1; c.players[0].score = 115; c.players[0].hand = ['KH'].map(C); c.players[1].hand = ['9S'].map(C);
    const c1 = apply(c, 1, { type: 'play', cardIds: ['9S'] });
    expect(stepTally(newTally(), c, c1, 0).burn125).toBe(1);
  });
  it('game events: clamped, quick win only online, journey stars', () => {
    const t = { ...newTally(), queen: 40, rounds: 12 };
    expect(gameEvents(t, true, 'bots')).toEqual({ games: 1, wins: 1, queen: 6, rounds: 12 });
    expect(gameEvents(t, true, 'quick').quick_win).toBe(1);
    expect(gameEvents(t, false, 'quick').quick_win).toBeUndefined();
    expect(gameEvents(t, true, 'journey', { won: true, stars: 3 })).toMatchObject({ journey_win: 1, journey_3star: 1 });
    expect(gameEvents(t, true, 'journey', { won: true, stars: 2 }).journey_3star).toBeUndefined();
  });
});

/* ------------------------------------------------------------------------------------------------ strings */

describe('journey strings', () => {
  const langs = ['en', 'lv', 'ru', 'uk'] as const;
  it('every character, companion, city and twist is named in en / lv / ru / uk', () => {
    for (const l of langs) {
      const s = JOURNEY_STRINGS[l]!;
      for (const c of CHARACTERS) { expect(s.chars[c.id]?.name, `${l} ${c.id}`).toBeTruthy(); expect(s.chars[c.id]?.quote).toBeTruthy(); }
      for (const m of MATCHES) for (const e of m.extra) expect(s.companions[e], `${l} ${e}`).toBeTruthy();
      for (const c of CHAPTERS) { expect(s.cities[c.id].name).toBeTruthy(); expect(s.item[c.item], `${l} item ${c.item}`).toBeTruthy(); }
      for (const m of MATCHES) expect(s.twists[m.twist].name).toBeTruthy();
      expect(Object.keys(s).sort()).toEqual(Object.keys(JOURNEY_STRINGS.en).sort());
    }
  });
  it('quest names and descriptions exist and render for any goal', () => {
    for (const l of langs) {
      const q = QUEST_STRINGS[l]!;
      for (const d of QUEST_DEFS) {
        expect(q.names[d.id], `${l} ${d.id}`).toBeTruthy();
        for (const n of [1, 2, 3, 5, 10, 21, 30]) expect(q.desc[d.metric](n)).not.toMatch(/undefined|NaN/);
      }
      expect(q.resetsIn('5h')).toContain('5h');
    }
  });
});
