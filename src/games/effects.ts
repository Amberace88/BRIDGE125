import { announceAchievements, pushProfile, pushToast } from '../progress/store';
import { refreshQuests } from '../campaign/questStore';
import { asMiniResult } from './api';
import { noteServerStats } from './useGameStats';

/**
 * A successful record_minigame answer, applied app-wide (loaded lazily by reportGame, so game chunks stay small):
 * balance / XP / level everywhere, the level-up toast, medal toasts or reveals, the quest-progress toast and the
 * hub's stats. <GameResultSheet/> shows the same numbers in place — it does not toast BM / XP again.
 */
export function applyMiniResult(uid: string, raw: unknown) {
  const r = asMiniResult(raw);
  if (!r?.ok) return;
  noteServerStats(r.stats);
  pushProfile({ bm: r.bm, xp: r.xp, level: r.level, achievements: r.achievements });
  const rw = r.reward;
  if (rw && rw.level > rw.level_from) setTimeout(() => pushToast({ kind: 'level', level: rw.level, bm: rw.level_bm ?? 0 }), 1400);
  if (rw?.achievements?.length) setTimeout(() => announceAchievements(rw.achievements, 'minigame'), 1800);
  void refreshQuests(uid);
}
