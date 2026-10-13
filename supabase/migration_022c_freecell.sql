-- Bridge 125 · 022c — FreeCell joins the mini games (src/games/freecell).
--
-- Run once in the Supabase SQL editor after 019 (safe to re-run: `on conflict do nothing` keeps an admin's tuning).
-- Nothing else changes: record_minigame (019) already handles any active `minigames` row — results, stats, the
-- per-game daily cap, the daily-deal bonus (has_daily), leaderboards, season stars and the counters
-- mg_freecell_wins / mg_freecell_streak, plus the quest metrics mg_freecell_win / mg_freecell_daily.
--
--   game       win (normal)   × level                                                 loss     daily deal bonus
--   freecell   30 BM · 20 XP  the client reports level 'classic' (= normal, ×1)        0 · 5    +50 BM · +25 XP
--
-- Client mirrors to add when this ships (kept out of 019's seed on purpose, the unit test there compares 019 only):
--   src/games/rewards.ts MINIGAME_DEFS, src/campaign/quests.ts GAME_QUEST_DEFS + GameMetric,
--   src/i18n/journey.ts quest names / descriptions, src/campaign/QuestTracker.tsx GLYPH.

insert into public.minigames (id, kind, active, has_daily, win_bm, win_xp, loss_bm, loss_xp, daily_bm, daily_xp, min_seconds, daily_cap, max_score, sort) values
  ('freecell', 'cards', true, true, 30, 20, 0, 5, 50, 25, 40, 30, 1000000, 5)
on conflict (id) do nothing;

-- The FreeCell game quests (019's naming: mg_<game>_win / mg_<game>_daily). Seeded INACTIVE: the games hub prints a
-- quest's name from the client strings, so switch them on once the mirrors above are in:
--   update public.quest_defs set active = true where id in ('g_freecell', 'g_freecell_day');
insert into public.quest_defs (id, kind, metric, goal, bm, xp, active, sort, game) values
  ('g_freecell',     'daily', 'mg_freecell_win',   1, 120, 35, false, 45, 'freecell'),
  ('g_freecell_day', 'daily', 'mg_freecell_daily', 1, 150, 40, false, 46, 'freecell')
on conflict (id) do nothing;
