/**
 * Mini-game reward table — a mirror of the `minigames` seed in supabase/migration_019_minigames.sql (a unit test keeps
 * them equal). The server alone pays; the client only uses this to show "+40 BM a win" on the hub tiles.
 *
 * Bridge stays the best-paying game: 100 BM + 85 XP per win (record_game, migration 003). A mini-game win pays
 * `win × level multiplier` (expert ×1.5 at most), and the SQL CHECK constraints keep that below Bridge's numbers.
 */
export interface MiniGameDef {
  id: string; kind: 'cards' | 'puzzle'; hasDaily: boolean;
  winBm: number; winXp: number; lossBm: number; lossXp: number; dailyBm: number; dailyXp: number;
  minSeconds: number; dailyCap: number; maxScore: number;
}

export const MINIGAME_DEFS: MiniGameDef[] = [
  { id: 'zole', kind: 'cards', hasDaily: false, winBm: 40, winXp: 30, lossBm: 5, lossXp: 8, dailyBm: 0, dailyXp: 0, minSeconds: 40, dailyCap: 30, maxScore: 1000000 },
  { id: 'durak', kind: 'cards', hasDaily: false, winBm: 35, winXp: 25, lossBm: 5, lossXp: 8, dailyBm: 0, dailyXp: 0, minSeconds: 30, dailyCap: 30, maxScore: 1000000 },
  { id: 'solitaire', kind: 'cards', hasDaily: false, winBm: 30, winXp: 20, lossBm: 0, lossXp: 5, dailyBm: 0, dailyXp: 0, minSeconds: 45, dailyCap: 30, maxScore: 1000000 },
  { id: 'sudoku', kind: 'puzzle', hasDaily: true, winBm: 30, winXp: 20, lossBm: 0, lossXp: 5, dailyBm: 50, dailyXp: 25, minSeconds: 30, dailyCap: 30, maxScore: 1000000 },
  // 022a/b/c
  { id: 'thousand', kind: 'cards', hasDaily: false, winBm: 40, winXp: 30, lossBm: 5, lossXp: 8, dailyBm: 0, dailyXp: 0, minSeconds: 90, dailyCap: 30, maxScore: 1000000 },
  { id: 'mahjong', kind: 'puzzle', hasDaily: true, winBm: 30, winXp: 20, lossBm: 0, lossXp: 5, dailyBm: 50, dailyXp: 25, minSeconds: 45, dailyCap: 30, maxScore: 1000000 },
  { id: 'freecell', kind: 'cards', hasDaily: true, winBm: 30, winXp: 20, lossBm: 0, lossXp: 5, dailyBm: 50, dailyXp: 25, minSeconds: 40, dailyCap: 30, maxScore: 1000000 },
];

/** Win multipliers by bots' level / puzzle difficulty; anything else counts as normal. */
export const LEVEL_MULT: Record<string, number> = { easy: 0.75, normal: 1, hard: 1.25, expert: 1.5 };
/** What Bridge pays (record_game) — the ceiling every mini game stays under. */
export const BRIDGE_WIN = { bm: 100, xp: 85 } as const;
/** Paid mini games per Riga day across all games (per game: `dailyCap`). */
export const MINI_DAILY_TOTAL = 60;

export const miniDef = (id: string) => MINIGAME_DEFS.find(d => d.id === id);

/** Same rounding as the SQL (`round(win * mult)`): what one game pays before level-ups, medals and quests. */
export function rewardFor(id: string, won: boolean, level?: string | null): { bm: number; xp: number } | null {
  const d = miniDef(id);
  if (!d) return null;
  if (!won) return { bm: d.lossBm, xp: d.lossXp };
  const m = LEVEL_MULT[level ?? 'normal'] ?? 1;
  return { bm: Math.round(d.winBm * m), xp: Math.round(d.winXp * m) };
}
