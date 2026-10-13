import { describe, expect, it } from 'vitest';
import sql14 from '../../supabase/migration_014_daily_referrals.sql?raw';
import { apply, nextRound, type GameState } from '../engine/engine';
import { botAction } from '../engine/bot';
import { DAILY, LIMITS, REWARDS, SCORE, addDays, challengeNo, dailyGame, dailyScore, dailySeed, nextRigaMidnight, rigaDay } from './config';
import { REFERRAL, inviteLink, isRefCode } from '../referral/config';
import { DAILY_STRINGS } from '../i18n/daily';
import { INVITE_STRINGS } from '../i18n/invite';
import { missingKeys } from '../i18n/pick';

const deal = (g: GameState) => g.players.map(p => p.hand.map(c => c.id).join(',')).join('|') + '/' + g.pile[0].id;

describe('daily challenge: rules', () => {
  it('everyone gets the same table on the same day, a new one the next day', () => {
    const a = dailyGame('2026-10-13', 'Anna', ['A', 'B', 'C']);
    const b = dailyGame('2026-10-13', 'Mārtiņš', ['X', 'Y', 'Z']);
    expect(deal(a)).toBe(deal(b));
    expect(a.players).toHaveLength(DAILY.opponents + 1);
    expect(a.rules?.maxRounds).toBe(DAILY.rounds);
    expect(a.rules?.bluff).toBe(DAILY.bluff);
    expect(deal(dailyGame('2026-10-14', 'Anna', ['A', 'B', 'C']))).not.toBe(deal(a));
    expect(dailySeed('2026-10-13')).toBe(dailySeed('2026-10-13'));
  });

  it('two players who make the same moves see the same bot replies (whole challenge)', () => {
    const play = () => {
      let g = dailyGame('2026-10-20', 'Me', ['A', 'B', 'C']);
      const log: string[] = [];
      for (let i = 0; i < 6000 && g.phase !== 'gameOver'; i++) {
        if (g.phase === 'roundOver') { g = nextRound(g); continue; }
        const p = g.current;
        const a = botAction(g, p, DAILY.level);          // "me" plays like a bot here, deterministically too
        let n = apply(g, p, a);
        if (n === g && a.type !== 'pass') n = apply(g, p, { type: 'draw' });
        log.push(`${p}:${JSON.stringify(a)}`);
        g = n;
      }
      return { log, scores: g.players.map(x => x.score), round: g.round };
    };
    const x = play(), y = play();
    expect(x.log).toEqual(y.log);
    expect(x.scores).toEqual(y.scores);
    expect(x.round).toBeLessThanOrEqual(DAILY.rounds);
  });

  it('score formula', () => {
    expect(dailyScore({ won: true, roundsWon: 3, points: 0, turns: 20, queens: 0, rounds: 3 })).toBe(1000 + 500 + 450 - 40);
    expect(dailyScore({ won: false, roundsWon: 0, points: 40, turns: 30, queens: 2, rounds: 3 })).toBe(1000 - 200 - 60 - 80);
    expect(dailyScore({ won: false, roundsWon: 0, points: 400, turns: 100, queens: 9, rounds: 3 })).toBe(0);
  });

  it('SQL mirrors SCORE, REWARDS, LIMITS and REFERRAL', () => {
    const f = sql14.match(/greatest\(0, (\d+) \+ case when won then (\d+) else 0 end \+ (\d+) \* rounds_won - (\d+) \* points - (\d+) \* turns - (\d+) \* queens\)/);
    expect(f, '_daily_score').toBeTruthy();
    expect(f!.slice(1).map(Number)).toEqual([SCORE.base, SCORE.win, SCORE.round, SCORE.point, SCORE.turn, SCORE.queen]);
    const rw = sql14.match(/select '(\{"play"[^']+)'::jsonb/);
    expect(JSON.parse(rw![1])).toEqual(REWARDS);
    const cfg = sql14.match(/select '(\{"bm"[^']+)'::jsonb/);
    expect(JSON.parse(cfg![1])).toEqual(REFERRAL);
    expect(sql14).toContain(`challenge_submit.turns > ${LIMITS.turns}`);
    expect(sql14).toContain(`v_points > ${LIMITS.points}`);
    expect(sql14).toContain(`v_q > ${LIMITS.queens}`);
    expect(sql14).toContain(`v_rounds > ${DAILY.rounds}`);
    expect(sql14).toMatch(new RegExp(`\\('${REFERRAL.item}',\\s*'frame',\\s*null`));
  });

  it('every RPC is SECURITY DEFINER with an empty search_path; internal helpers are revoked from clients', () => {
    const fns = [...sql14.matchAll(/create or replace function public\.(\w+)\(([^)]*)\)[\s\S]*?\$fn\$;/g)];
    expect(fns.length).toBeGreaterThan(8);
    for (const m of fns) {
      expect(m[0], m[1]).toContain("set search_path = ''");
      if (!['_daily_score', '_daily_rewards', '_jint', '_referral_cfg'].includes(m[1])) expect(m[0], m[1]).toContain('security definer');
    }
    for (const name of ['_daily_rank', '_referral_reward', '_referral_on_games', '_referral_cfg', '_daily_score', '_daily_rewards', '_jint']) {
      expect(sql14, name).toMatch(new RegExp(`revoke execute on function public\\.${name}\\([^)]*\\) from public, anon, authenticated`));
    }
    expect(sql14).toContain('grant execute on function public.challenge_board(date, int) to anon, authenticated');
    expect(sql14).toContain('grant execute on function public.referral_peek(text) to anon, authenticated');
    expect(sql14).toMatch(/grant execute on function public\.challenge_submit\([^)]*\) to authenticated;/);
  });

  it('Riga calendar helpers', () => {
    // 21:30 UTC on 13 Oct = 00:30 on 14 Oct in Riga (EEST, UTC+3)
    expect(rigaDay(new Date('2026-10-13T21:30:00Z'))).toBe('2026-10-14');
    expect(rigaDay(new Date('2026-10-13T20:30:00Z'))).toBe('2026-10-13');
    expect(new Date(nextRigaMidnight(new Date('2026-10-13T12:00:00Z'))).toISOString()).toBe('2026-10-13T21:00:00.000Z');
    // across the end of summer time (25 Oct 2026, 04:00 → 03:00 local): midnight of the 26th is 22:00 UTC
    expect(new Date(nextRigaMidnight(new Date('2026-10-25T12:00:00Z'))).toISOString()).toBe('2026-10-25T22:00:00.000Z');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(challengeNo('2026-10-13')).toBe(1);
    expect(challengeNo('2026-11-13')).toBe(32);
  });
});

describe('referral helpers', () => {
  it('codes and links', () => {
    expect(isRefCode('AB23CD')).toBe(true);
    expect(isRefCode('ab23cd')).toBe(false);
    expect(isRefCode('AB0CDE')).toBe(false);
    expect(inviteLink('AB23CD')).toBe('https://bridge125.com/?ref=AB23CD');
  });
});

describe('strings', () => {
  it('lv / ru / uk are complete for daily + invite', () => {
    for (const lang of ['lv', 'ru', 'uk']) {
      expect(missingKeys(DAILY_STRINGS.en, DAILY_STRINGS[lang]), lang).toEqual([]);
      expect(missingKeys(INVITE_STRINGS.en, INVITE_STRINGS[lang]), lang).toEqual([]);
    }
  });
});
