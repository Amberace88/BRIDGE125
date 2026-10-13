-- Bridge 125 · 022b — Mahjong Solitaire joins the mini games (src/games/mahjong, id 'mahjong').
--
-- Run once in the Supabase SQL editor after 019 (safe to re-run). Nothing new server-side: record_minigame (019)
-- already handles any active `minigames` row, so this only registers the game and its daily quest.
--
--   game       win (normal)   × level                                                   loss     daily puzzle bonus
--   mahjong    30 BM · 20 XP    every layout counts as normal (turtle/fortress/…)        0 · 5    +50 BM · +25 XP
--
-- The client reports level = the layout ('turtle' | 'fortress' | 'pyramid' | 'dragon' | 'pagoda'), none of which is a
-- difficulty, so LEVEL_MULT treats them all as ×1. `day` is set for Daily Mahjong (one board per Riga day).
-- min_seconds 45: even the 90-tile Pagoda takes a human well over 45 s (45 matches).
--
-- Quest metrics follow 019's naming (record_minigame writes them): mg_mahjong_win, mg_mahjong_daily; medals can use
-- the counters mg_mahjong_wins / mg_mahjong_streak.

-- `do nothing`: re-running keeps an admin's tuning (as in 019).
insert into public.minigames (id, kind, active, has_daily, win_bm, win_xp, loss_bm, loss_xp, daily_bm, daily_xp, min_seconds, daily_cap, max_score, sort) values
  ('mahjong',   'puzzle', true, true,  30, 20, 0, 5, 50, 25, 45, 30, 1000000, 5)
on conflict (id) do nothing;

-- The daily game quest: clear today's Daily Mahjong. Registered INACTIVE on purpose — the client's quest list
-- (GAME_QUEST_DEFS in src/campaign/quests.ts) and its names (QUEST_STRINGS) must learn 'g_mahjong_day' first;
-- then flip it on: update public.quest_defs set active = true where id = 'g_mahjong_day';
insert into public.quest_defs (id, kind, metric, goal, bm, xp, active, sort, game) values
  ('g_mahjong_day', 'daily', 'mg_mahjong_daily', 1, 150, 40, false, 45, 'mahjong')
on conflict (id) do update set kind = excluded.kind, metric = excluded.metric, goal = excluded.goal, bm = excluded.bm,
  xp = excluded.xp, sort = excluded.sort, game = excluded.game;
