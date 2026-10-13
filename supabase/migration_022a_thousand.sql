-- Bridge 125 · 022a — Thousand (Тысяча / Tūkstotis) joins the mini games.
--
-- Run once in the Supabase SQL editor after 019 (safe to re-run). It only adds rows to 019's tables; record_minigame
-- (019) already handles any active `minigames` id generically:
--   * medals counters  mg_thousand_wins / mg_thousand_streak (ach_stats) are written on every won game;
--   * quest metrics    mg_thousand_win (and mg_games) progress assigned game quests.
--
-- Rewards like Zole (a long 3-player card game vs bots): 40 BM · 30 XP a win at normal (easy 30/23 · hard 50/38 ·
-- expert 60/45), 5 BM · 8 XP a loss. A full game to 1000 takes 20–40 minutes, so min_seconds is higher than Zole's 40.
-- `do nothing`: re-running keeps an admin's tuning (minigame_set).
insert into public.minigames (id, kind, active, has_daily, win_bm, win_xp, loss_bm, loss_xp, daily_bm, daily_xp, min_seconds, daily_cap, max_score, sort) values
  ('thousand', 'cards', true, false, 40, 30, 5, 8, 0, 0, 90, 30, 1000000, 5)
on conflict (id) do nothing;

-- The game quest "win a game of Thousand" (019 conventions: daily, metric mg_<game>_win, game = the minigames id).
-- Seeded INACTIVE: the client mirrors (GAME_QUEST_DEFS in src/campaign/quests.ts, the quest name / description in
-- src/i18n/journey.ts + locales, the QuestTracker glyph) must ship first, or the quest would show its raw id.
-- After that client release:  update public.quest_defs set active = true where id = 'g_thousand';
insert into public.quest_defs (id, kind, metric, goal, bm, xp, active, sort, game) values
  ('g_thousand', 'daily', 'mg_thousand_win', 1, 150, 40, false, 45, 'thousand')
on conflict (id) do update set kind = excluded.kind, metric = excluded.metric, goal = excluded.goal, bm = excluded.bm,
  xp = excluded.xp, sort = excluded.sort, game = excluded.game;
