import { motion } from 'motion/react';
import { useApp } from '../../store';
import type { Lang } from '../../i18n';
import { sfx } from '../../sound';
import './dock.css';

/**
 * "Games" in every language — the games room's title (src/i18n/games.ts `title`; a unit test keeps them equal).
 * Inlined so Home's first paint does not load the hub's strings for one word.
 */
export const GAMES_WORD: Record<Lang, string> = {
  en: 'Games', lv: 'Spēles', ru: 'Игры', uk: 'Ігри', lt: 'Žaidimai', et: 'Mängud', pl: 'Gry', de: 'Spiele', be: 'Гульні',
  kk: 'Ойындар', uz: 'O‘yinlar', az: 'Oyunlar', ka: 'თამაშები', hy: 'Խաղեր', ro: 'Jocuri', bg: 'Игри', es: 'Juegos',
};

/**
 * Home's one entry to the games room: a frameless brass icon in the dock row (same look as Journey / Trophies / Vault).
 * Deliberately quiet — Bridge's Play button stays the dominant element on Home.
 */
export function GamesDockBtn({ onClick }: { onClick: () => void }) {
  const { lang } = useApp();
  const label = GAMES_WORD[lang] ?? GAMES_WORD.en;
  return (
    <motion.button className="h5-dockbtn gh-dock" onClick={() => { sfx.tap(); onClick(); }} whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }} aria-label={label}>
      <span className="di" aria-hidden><GamesIcon /></span>
      <span className="dl">{label}</span>
    </motion.button>
  );
}

/** A card leaning on a 3×3 puzzle grid: cards and puzzles, in the dock's brass line style. */
export const GamesIcon = () => (
  <svg viewBox="0 0 28 28" aria-hidden>
    <rect x="12.5" y="9.5" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M16.5 9.5v12M20.5 9.5v12M12.5 13.5h12M12.5 17.5h12" stroke="currentColor" strokeWidth="1" strokeOpacity=".7" />
    <g transform="rotate(-14 9 14)">
      <rect x="3.5" y="5" width="11" height="16" rx="2" fill="#0a1a15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 9.2c1.6 1.5 2.9 2.6 2.9 3.9a1.6 1.6 0 0 1-2.9.9 1.6 1.6 0 0 1-2.9-.9c0-1.3 1.3-2.4 2.9-3.9z" fill="currentColor" />
      <path d="M9 14v2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  </svg>
);
