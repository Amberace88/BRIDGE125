import { useEffect, useRef, useState } from 'react';
import { type GameState, apply, newGame, nextRound } from '../engine/engine';
import { botAction } from '../engine/bot';
import { useApp } from '../store';
import { Table } from './Table';

const SAVE_KEY = 'b125.game.v1';
export function loadSavedGame(): GameState | null {
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null; const g = JSON.parse(raw) as GameState; return g.phase === 'gameOver' ? null : g; } catch { return null; }
}
export function clearSavedGame() { try { localStorage.removeItem(SAVE_KEY); } catch { /* */ } }

export function LocalGame({ resume, onExit }: { resume: GameState | null; onExit: () => void }) {
  const app = useApp();
  const { t } = app;
  const fresh = () => newGame([
    { name: app.name || t.you, bot: false },
    ...t.botNames.slice(0, app.opponents).map(n => ({ name: n, bot: true })),
  ]);
  const [g, setG] = useState<GameState>(() => resume ?? fresh());
  const recorded = useRef(false);

  useEffect(() => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(g)); } catch { /* */ } }, [g]);

  useEffect(() => {
    if (g.phase === 'gameOver' && !recorded.current) {
      recorded.current = true; app.recordGame(g.winners.includes(0)); clearSavedGame();
    }
  }, [g.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (g.phase !== 'play' && g.phase !== 'chooseSuit') return;
    if (!g.players[g.current].bot) return;
    const heavy = g.events.some(e => ['queen', 'transfer', 'kings', 'reset125', 'eight'].includes(e.t));
    const delay = (g.phase === 'chooseSuit' ? 650 : 820) + (heavy ? 650 : 0) + Math.random() * 350;
    const seq = g.seq;
    const tm = setTimeout(() => {
      setG(cur => {
        if (cur.seq !== seq) return cur;
        const a = botAction(cur, cur.current, app.level);
        const n = apply(cur, cur.current, a);
        return n === cur && a.type !== 'pass' ? apply(cur, cur.current, { type: 'draw' }) : n;
      });
    }, delay);
    return () => clearTimeout(tm);
  }, [g.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Table g={g} me={0}
      onAct={a => setG(cur => apply(cur, 0, a))}
      onNextRound={() => setG(cur => nextRound(cur))}
      onRematch={() => { recorded.current = false; setG(newGame(g.players.map(p => ({ name: p.name, bot: p.bot })))); }}
      onExit={() => { clearSavedGame(); onExit(); }} />
  );
}
