import { lazy, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { AppProvider } from '../../store';
import { GamesHub } from '../hub/GamesHub';
import { GameResultSheet } from '../GameResultSheet';
import type { GameModule, GameResult } from '../types';
import type { MiniResult } from '../api';

/**
 * Stories for the games room and the game-over sheet — demo modules live ONLY here and in tests, never in
 * src/games/registry.ts. Not imported by the app. To look at them: serve a page that renders <GamesStories/>
 * (e.g. `vite` with a scratch html entry) and open ?view=hub | empty | won | lost | guest | capped.
 */

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const ZoleEmblem = ({ size = 40 }: { size?: number }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden><path d="M8 27 10 13l6 6 4-9 4 9 6-6 2 14z" {...stroke} /><path d="M8 31h24" {...stroke} /><circle cx="20" cy="22" r="2.2" fill="currentColor" /></svg>
);
const DurakEmblem = ({ size = 40 }: { size?: number }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden><path d="M11 30c0-9 3-15 9-18 6 3 9 9 9 18z" {...stroke} /><path d="M11 30h18M15 18l-4-6M25 18l4-6" {...stroke} /><circle cx="11" cy="11" r="1.8" fill="currentColor" /><circle cx="29" cy="11" r="1.8" fill="currentColor" /></svg>
);
const SolitaireEmblem = ({ size = 40 }: { size?: number }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden><rect x="9" y="8" width="15" height="21" rx="2.5" {...stroke} /><rect x="16" y="12" width="15" height="21" rx="2.5" fill="#0a2620" stroke="currentColor" strokeWidth="1.6" /><path d="M23.5 18.5c1.6 1.5 3 2.6 3 4a1.7 1.7 0 0 1-3 1 1.7 1.7 0 0 1-3-1c0-1.4 1.4-2.5 3-4z" fill="currentColor" /></svg>
);
const SudokuEmblem = ({ size = 40 }: { size?: number }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden><rect x="8" y="8" width="24" height="24" rx="3" {...stroke} /><path d="M16 8v24M24 8v24M8 16h24M8 24h24" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity=".6" /><text x="12" y="14.6" fontSize="6" fill="currentColor" fontWeight="700">5</text><text x="20" y="22.6" fontSize="6" fill="currentColor" fontWeight="700">9</text><text x="28" y="30.6" fontSize="6" fill="currentColor" fontWeight="700">3</text></svg>
);

const Screen = lazy(async () => ({ default: () => null }));
export const DEMO_MODULES: GameModule[] = [
  { id: 'durak', kind: 'cards', players: { min: 2, max: 4 }, homeLangs: ['ru', 'uk', 'be', 'kk'], Emblem: DurakEmblem, Screen,
    title: { en: 'Durak', lv: 'Durņos', ru: 'Дурак' }, tagline: { en: 'Attack, defend — don’t be the last one holding cards.', lv: 'Uzbrūc, atsities — nepaliec pēdējais ar kārtīm.' } },
  { id: 'solitaire', kind: 'cards', players: { min: 1, max: 1 }, Emblem: SolitaireEmblem, Screen,
    title: { en: 'Solitaire', lv: 'Pasjanss' }, tagline: { en: 'Klondike, one card or three.', lv: 'Klondaika — pa vienai vai trim kārtīm.' } },
  { id: 'zole', kind: 'cards', players: { min: 3, max: 3 }, homeLangs: ['lv'], Emblem: ZoleEmblem, Screen,
    title: { en: 'Zole', lv: 'Zole' }, tagline: { en: 'Latvia’s own trick-taking classic.', lv: 'Latvijas leģendārā kāršu spēle.' } },
  { id: 'sudoku', kind: 'puzzle', players: { min: 1, max: 1 }, daily: true, Emblem: SudokuEmblem, Screen,
    title: { en: 'Sudoku', lv: 'Sudoku' }, tagline: { en: 'A fresh grid every day.', lv: 'Katru dienu jauns režģis.' } },
];

const RESULT_WON: MiniResult = {
  ok: true, game: 'zole', won: true, paid: true, capped: false, daily: false, best: true,
  reward: { bm: 50, xp: 38, daily_bm: 0, daily_xp: 0, stars: 3, level_from: 6, level: 7, level_bm: 350, achievements: ['mg_first'], achievement_bm: 100 },
  bm: 12840, xp: 1900, level: 7, stats: { game: 'zole', played: 12, won: 8, best_score: 186, best_seconds: 412, streak: 3, best_streak: 4, last_day: null, win_streak: 2, best_win_streak: 4, dailies: 0, daily_streak: 0, last_daily: null, daily_done: false },
  quests: [{ id: 'g_zole2', metric: 'mg_zole_win', goal: 2, progress: 1, claimed: false }],
};
const RESULT_LOST: MiniResult = { ...RESULT_WON, won: false, best: false, reward: { ...RESULT_WON.reward!, bm: 5, xp: 8, stars: 1, level: 6, achievements: [] }, quests: [] };
const RESULT_CAPPED: MiniResult = { ...RESULT_WON, best: false, capped: true, paid: false, reward: { ...RESULT_WON.reward!, bm: 0, xp: 0, stars: 0, level: 6, achievements: [] } };

function Story() {
  const view = new URLSearchParams(location.search).get('view') ?? 'hub';
  const [open, setOpen] = useState(true);
  const result = useMemo<GameResult>(() => ({ game: 'zole', won: view !== 'lost', score: view === 'lost' ? 42 : 186, seconds: 412, level: 'hard' }), [view]);
  const answer = view === 'lost' ? RESULT_LOST : view === 'capped' ? RESULT_CAPPED : view === 'guest' ? null : RESULT_WON;
  const report = useMemo(() => new Promise<Record<string, unknown> | null>(r => setTimeout(() => r(answer as Record<string, unknown> | null), 900)), [answer]);
  const noop = () => {};
  if (view === 'hub' || view === 'empty') {
    return <GamesHub modules={view === 'empty' ? [] : DEMO_MODULES} onClose={noop} onPlayBridge={noop} onOpenGame={noop} onAuth={noop} />;
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(120% 80% at 50% 20%, #1c7a5f, #06241d)' }}>
      <AnimatePresence>
        {open && <GameResultSheet key="r" module={DEMO_MODULES[2]} result={result} report={report} onAgain={() => setOpen(false)} onExit={() => setOpen(false)} onAuth={noop}
          facts={[{ label: 'Stiķi', value: '7' }]} />}
      </AnimatePresence>
    </div>
  );
}

export function GamesStories() {
  return <MotionConfig reducedMotion="user"><AppProvider><Story /></AppProvider></MotionConfig>;
}
