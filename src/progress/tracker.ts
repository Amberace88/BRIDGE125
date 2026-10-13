import { isQS, type GameState } from '../engine/engine';

/**
 * Per-game achievement tracking for one seat.
 *
 *   const t = new GameTracker(me);
 *   for every new state: const instant = t.step(prev, next);   // codes to report right now (report_achievement)
 *   at game over:        t.stats()                              // counters for report_game_stats (server clamps them)
 *
 * Works from the engine's per-action `events` plus a diff of the previous state, so it never needs engine changes.
 * Deterministic and side-effect free (unit tested in progress.test.ts).
 */
export interface GameStats {
  won: boolean; mode: 'bots' | 'room' | 'quick' | 'online' | 'stake'; host: boolean;
  qs_played: number; qs_taken: number; qs_countered: number; eight3: number; eight4: number; kings: number; kings_high: number;
  jacks_max: number; exact125: number; double_reset: number; comeback: number; zero_win: number; rounds_won: number;
  clean_round: number; big_draw: number; quad: number; triple7: number; queen_finish: number; marathon: number; midnight: number;
  bluff_caught: number; bluff_ok: number; liar: number;
}

/** Hard per-game caps — mirrored by report_game_stats() in migration_012 (the server clamps again). */
export const GAME_STAT_CAPS: Record<Exclude<keyof GameStats, 'won' | 'mode' | 'host'>, number> = {
  qs_played: 8, qs_taken: 8, qs_countered: 6, eight3: 6, eight4: 4, kings: 4, kings_high: 1, jacks_max: 5, exact125: 3,
  double_reset: 1, comeback: 1, zero_win: 1, rounds_won: 30, clean_round: 1, big_draw: 1, quad: 1, triple7: 1,
  queen_finish: 1, marathon: 1, midnight: 1, bluff_caught: 15, bluff_ok: 15, liar: 1,
};

/** A resumed mid-round save: assume the player may have drawn already (no "clean round" for that round). */
const ev0 = (g: GameState) => g.pile.length > 1;
const playKey =(lp: GameState['lastPlay']) => (lp ? `${lp.by}:${lp.cards[0]?.id ?? ''}:${lp.prevTop.id}` : '');

export class GameTracker {
  readonly me: number;
  private s: GameStats;
  private maxScore = 0;
  private resets = 0;
  private drewThisRound = false;
  private round = 0;
  private lastMyPlay: string[] = [];
  private done = false;
  /** codes already handed out by step() this game */
  private sent = new Set<string>();

  constructor(me: number, mode: GameStats['mode'] = 'bots', host = false) {
    this.me = me;
    this.s = {
      won: false, mode, host, qs_played: 0, qs_taken: 0, qs_countered: 0, eight3: 0, eight4: 0, kings: 0, kings_high: 0, jacks_max: 0,
      exact125: 0, double_reset: 0, comeback: 0, zero_win: 0, rounds_won: 0, clean_round: 0, big_draw: 0, quad: 0, triple7: 0,
      queen_finish: 0, marathon: 0, midnight: 0, bluff_caught: 0, bluff_ok: 0, liar: 0,
    };
  }

  get finished() { return this.done; }

  /** Feed the next state (prev may be null for the first one). Returns one-shot codes unlocked by this step. */
  step(prev: GameState | null, g: GameState, now: Date = new Date()): string[] {
    const me = this.me, s = this.s, out: string[] = [];
    if (me < 0 || !g.players[me] || this.done) return out;
    const hit = (code: string) => { if (!this.sent.has(code)) { this.sent.add(code); out.push(code); } };
    if (g.round !== this.round) { this.round = g.round; this.drewThisRound = false; }
    this.maxScore = Math.max(this.maxScore, g.players[me].score, prev?.players[me]?.score ?? 0);
    // first sight of a game (fresh deal or a resumed save): its events were already seen / are just the deal
    if (!prev) { this.drewThisRound = ev0(g); return out; }
    // nothing new (same state or a re-render)
    if (prev.seq === g.seq) return out;
    const ev = g.events ?? [];
    const pend = prev?.pending ?? null;

    for (const e of ev) {
      switch (e.t) {
        case 'play':
          if (e.p !== me) break;
          this.lastMyPlay = e.cards.map(c => c.id);
          if (e.cards.length >= 4) { s.quad = 1; hit('s_quad'); }
          if (e.cards.filter(c => c.r === '7').length >= 3) { s.triple7 = 1; hit('s_lucky7'); }
          if (e.cards.some(isQS) && ev.some(x => x.t === 'queen' || (x.t === 'transfer' && x.p === me))) s.qs_played++;
          break;
        case 'transfer':
          if (e.p === me) { s.qs_countered++; hit('queen_bounce'); }
          break;
        case 'eight': {
          const mine = ev.some(x => x.t === 'play' && x.p === me && x.cards.some(c => c.r === '8'));
          if (mine && e.amount >= 6) { s.eight3++; hit('eight_chain_3'); }
          if (mine && e.amount >= 8) { s.eight4++; hit('eight_chain_4'); }
          break;
        }
        case 'kings':
          if (ev.some(x => x.t === 'play' && x.p === me && x.cards.some(c => c.r === 'K'))) {
            s.kings++; hit('four_kings');
            if ((prev?.players[me]?.score ?? 0) >= 100) { s.kings_high = 1; hit('s_regicide'); }
          }
          break;
        case 'draw':
          if (e.p !== me) break;
          this.drewThisRound = true;
          if (e.forced && pend && (pend.kind === 'queen' || pend.kind === 'queen6') && prev?.current === me) s.qs_taken++;
          if (e.forced && e.n >= 8) { s.big_draw = 1; hit('s_avalanche'); }
          break;
        case 'reset125':
          if (e.p === me) {
            s.exact125++; this.resets++; hit('exact_125');
            if (this.resets >= 2) { s.double_reset = 1; hit('s_phoenix'); }
          }
          break;
        case 'bluffCaught':
          if (e.by === me) s.bluff_caught++;
          break;
        case 'roundEnd':
          if (e.winner !== me) break;
          s.rounds_won++;
          if (e.mult > 1) {
            s.jacks_max = Math.max(s.jacks_max, Math.min(5, e.mult));
            hit('jacks_finish');
            if (e.mult >= 3) hit('jacks_x3');
            if (e.mult >= 4) hit('jacks_x4');
            if (e.mult >= 5) hit('jacks_x5');
          }
          if (!this.drewThisRound) { s.clean_round = 1; hit('s_ghost'); }
          if (this.lastMyPlay.length && this.lastMyPlay[this.lastMyPlay.length - 1] === 'QS') { s.queen_finish = 1; hit('s_queen_finish'); }
          break;
        default: break;
      }
    }

    // bluff mode: my illegal play stood (the window closed without a challenge)
    const lp = prev?.lastPlay;
    if (lp && lp.by === me && !lp.wasLegal && playKey(lp) !== playKey(g.lastPlay) && !ev.some(e => e.t === 'bluffCaught' && e.p === me)) s.bluff_ok++;
    if (s.bluff_ok > 0 && s.bluff_caught > 0) { s.liar = 1; hit('s_liar'); }

    if (g.phase === 'gameOver') {
      this.done = true;
      const won = g.winners.includes(me);
      s.won = won;
      if (g.round >= 15) { s.marathon = 1; hit('s_marathon'); }
      if (won && this.maxScore >= 120) { s.comeback = 1; hit('comeback'); }
      if (won && g.players[me].score === 0) { s.zero_win = 1; hit('zero_win'); }
      const h = now.getHours();
      if (won && h >= 0 && h < 4) { s.midnight = 1; hit('s_midnight'); }
    }
    return out;
  }

  /** Counters for report_game_stats (already clamped to GAME_STAT_CAPS). */
  stats(): GameStats {
    const o = { ...this.s };
    for (const k of Object.keys(GAME_STAT_CAPS) as (keyof typeof GAME_STAT_CAPS)[]) o[k] = Math.max(0, Math.min(GAME_STAT_CAPS[k], o[k]));
    return o;
  }
}
