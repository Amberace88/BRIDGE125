import { useEffect, useRef, useState } from 'react';
import { type GameState, apply, newGame, nextRound } from '../engine/engine';
import { botAction } from '../engine/bot';
import { useApp } from '../store';
import { Table } from './Table';
import { track } from '../analytics';
import { useGodFlags } from '../god/flags';
import { useGameAchievements } from '../progress/useProgress';
import { sfx } from '../sound';
import { starsFor } from '../campaign/data';
import { clockStep, roundTwist, setupMatch, twistInfo } from '../campaign/twists';
import { reportGame, useGameTally } from '../campaign/useGameQuests';
import type { CampaignRun } from '../campaign/session';
import type { ActiveStake } from '../economy/api';
import { STAKE_TABLE } from '../economy/config';
import { markStakeGame } from '../economy/shield';
import { StakeHud } from '../economy/StakePicker';
import { finishStakeGame, recordGamePlus, useStakeGame } from '../economy/useEconomy';

const SAVE_KEY = 'b125.game.v1';
export function loadSavedGame(): GameState | null {
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null; const g = JSON.parse(raw) as GameState; return g.phase === 'gameOver' ? null : g; } catch { return null; }
}
export function clearSavedGame() { try { localStorage.removeItem(SAVE_KEY); } catch { /* */ } }

/** A fresh deal: nothing has happened yet in this round. */
const freshDeal = (g: GameState) => g.events.length === 0 && g.pile.length === 1;

/**
 * Local game against bots. With `campaign` it runs a Journey match instead: the match decides seats, bot level and the
 * house rule; the game is not saved for "continue"; the result goes to `campaign.onEnd` (stars) instead of a rematch.
 * With `stake` (entry already paid via StakePicker) it is a high-stakes table: 3 hard bots, no bluff, the stake id rides
 * on the GameState (so "continue" resumes it), the Shield boost may soften one Q♠ penalty, game over settles the pot.
 */
export function LocalGame({ resume, onExit, campaign, stake }: { resume: GameState | null; onExit: () => void; campaign?: CampaignRun; stake?: ActiveStake }) {
  const app = useApp();
  const { t } = app;
  const fresh = () => campaign
    ? setupMatch(campaign.match, campaign.names)
    : stake
    ? markStakeGame(newGame([
      { name: app.name || t.you, bot: false },
      ...t.botNames.slice(0, STAKE_TABLE.opponents).map(n => ({ name: n, bot: true })),
    ], { bluff: STAKE_TABLE.bluff }), stake)
    : newGame([
      { name: app.name || t.you, bot: false },
      ...t.botNames.slice(0, app.opponents).map(n => ({ name: n, bot: true })),
    ], { bluff: !!app.bluff });
  const [g, setG] = useState<GameState>(() => resume ?? fresh());
  const st = useStakeGame(g, 0);
  const isStake = st.isStake && !campaign;
  useGameAchievements(g, 0, { mode: isStake ? 'stake' : 'bots' });
  const { tally, reset: resetTally } = useGameTally(g, 0);
  const god = useGodFlags();
  const recorded = useRef(false);
  const level = campaign?.match.level ?? (isStake ? STAKE_TABLE.level : app.level);
  const turnMs = campaign ? twistInfo(campaign.match.twist).turnMs : undefined;
  const mode = campaign ? 'journey' : isStake ? 'stake' : 'bots';

  useEffect(() => { if (campaign) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(g)); } catch { /* */ } }, [g, campaign]);
  useEffect(() => {
    if (!resume) track('game_start', { mode, players: g.players.length, level, ...(campaign ? { match: campaign.match.id } : {}) });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (g.phase === 'gameOver' && !recorded.current) {
      recorded.current = true;
      const won = g.winners.includes(0);
      // stake tables record the game AND settle the pot; everything else goes through record_game_plus (boosts)
      if (isStake) void finishStakeGame(app, won);
      else void recordGamePlus(app, won, 'bots');
      track('game_end', { mode, won, rounds: g.round, players: g.players.length, ...(campaign ? { match: campaign.match.id } : {}) });
      if (campaign) {
        const myScore = g.players[0].score;
        const stars = starsFor(campaign.match, { won, queenHits: tally.current.queenHits, myScore });
        reportGame(tally.current, won, 'journey', { won, stars });
        campaign.onEnd({ matchId: campaign.match.id, won, stars, queenHits: tally.current.queenHits, myScore, rounds: g.round, g });
      } else {
        clearSavedGame();
        reportGame(tally.current, won, 'bots');
      }
    }
  }, [g.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (g.phase !== 'play' && g.phase !== 'chooseSuit') return;
    if (!g.players[g.current].bot) return;
    const heavy = g.events.some(e => ['queen', 'transfer', 'kings', 'reset125', 'eight'].includes(e.t));
    const delay = ((g.phase === 'chooseSuit' ? 650 : 820) + (heavy ? 650 : 0) + Math.random() * 350) * god.botDelay;
    const seq = g.seq;
    const tm = setTimeout(() => {
      setG(cur => {
        if (cur.seq !== seq) return cur;
        const a = botAction(cur, cur.current, level);
        const n = apply(cur, cur.current, a);
        return n === cur && a.type !== 'pass' ? apply(cur, cur.current, { type: 'draw' }) : n;
      });
    }, delay);
    return () => clearTimeout(tm);
  }, [g.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Journey: the Clockmaker's turn clock (my turns only) ---------- */
  const [deadline, setDeadline] = useState<number | null>(null);
  const lastTurn = useRef(-1);
  useEffect(() => {
    if (!turnMs) return;
    const mine = g.current === 0 && (g.phase === 'play' || g.phase === 'chooseSuit');
    if (!mine) { lastTurn.current = g.phase === 'play' || g.phase === 'chooseSuit' ? g.current : -1; setDeadline(null); return; }
    // a new turn: it just came to me, a new deal, or an ace skipped everyone else
    const newTurn = lastTurn.current !== 0 || freshDeal(g) || g.events.some(e => e.t === 'skip' && e.p !== 0);
    lastTurn.current = 0;
    if (newTurn || deadline === null) setDeadline(Date.now() + turnMs + (freshDeal(g) ? 2600 : 0));
  }, [g.seq, g.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!turnMs || deadline === null) return;
    const left = deadline - Date.now();
    const tm = setTimeout(() => setG(cur => clockStep(cur, 0)), left > 0 ? left : 520);
    // the last five seconds tick
    const ticks: ReturnType<typeof setTimeout>[] = [];
    for (let s = 5; s >= 1; s--) { const at = left - s * 1000; if (at > 0) ticks.push(setTimeout(() => sfx.tap(), at)); }
    return () => { clearTimeout(tm); ticks.forEach(clearTimeout); };
  }, [deadline, g.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = (cur: GameState) => { const n = nextRound(cur); return campaign && n !== cur ? roundTwist(campaign.match, n) : n; };

  return (
    <>
    <Table g={g} me={0} xray={god.xray}
      deadline={turnMs ? deadline : undefined} turnMs={turnMs}
      onAct={a => setG(cur => (isStake ? st.step(cur, apply(cur, 0, a)) : apply(cur, 0, a)))}
      onNextRound={() => setG(cur => advance(cur))}
      onRematch={campaign || isStake ? undefined : () => {
        recorded.current = false; resetTally();
        track('game_start', { mode: 'bots', players: g.players.length, rematch: true });
        setG(newGame(g.players.map(p => ({ name: p.name, bot: p.bot })), { bluff: !!g.rules?.bluff }));
      }}
      onExit={() => { if (!campaign) clearSavedGame(); onExit(); }} />
    {campaign?.overlay}
    {isStake && <StakeHud pot={st.active?.pot} shield={st.armed} shielded={st.shielded} />}
    </>
  );
}
