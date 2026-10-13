-- Bridge 125 · 024 — the game quests of Thousand, Mahjong and FreeCell go live, plus their medals.
--
-- 022a / 022b / 022c seeded four game quests INACTIVE, waiting for the client mirrors. The client release with this
-- migration ships them (GAME_QUEST_DEFS in src/campaign/quests.ts, names + descriptions in src/i18n/journey.ts and
-- the 13 locale packs, the QuestTracker glyphs), so they are switched on here:
--   g_thousand      win a game of Thousand          mg_thousand_win    150 BM · 40 XP
--   g_mahjong_day   clear today's Mahjong           mg_mahjong_daily   150 BM · 40 XP
--   g_freecell      win a game of FreeCell          mg_freecell_win    120 BM · 35 XP
--   g_freecell_day  solve today's FreeCell deal     mg_freecell_daily  150 BM · 40 XP
-- `do update set active = true` only: the rows keep whatever an admin tuned since 022 (bm, xp, sort …); the values
-- below are 022's and apply only when a row is missing (022a–c not run). Assignment (019's _assign_game_quest)
-- already picks any active game quest of a game the player played in the last 14 days — no function changes.
--
-- Medals (019's model, category 'games', sort continues after mg_all_rounder = 94). The counters are written by
-- record_minigame (019) for every active minigames id, so they already count:
--   mg_thousand_master  "Thousand Master"   10 wins of Thousand          mg_thousand_wins     gold    1500 BM
--   mg_mahjong_zen      "Mahjong Zen"       25 Mahjong boards cleared    mg_mahjong_wins      silver   800 BM
--   mg_freecell_purist  "FreeCell Purist"   5 FreeCell wins in a row     mg_freecell_streak   silver   800 BM
-- Players who already reached a goal get the medal on their next achievements sync / mini game (_ach_sync).
-- Keep in sync with ACHIEVEMENTS in src/progress/achievements.ts (sort = position there) — unit tests compare them.
--
-- Additive and safe to run more than once. Run after 001–023.

-- Keep in sync with GAME_QUEST_DEFS in src/campaign/quests.ts.
insert into public.quest_defs (id, kind, metric, goal, bm, xp, active, sort, game) values
  ('g_thousand',     'daily', 'mg_thousand_win',   1, 150, 40, true, 45, 'thousand'),
  ('g_mahjong_day',  'daily', 'mg_mahjong_daily',  1, 150, 40, true, 45, 'mahjong'),
  ('g_freecell',     'daily', 'mg_freecell_win',   1, 120, 35, true, 45, 'freecell'),
  ('g_freecell_day', 'daily', 'mg_freecell_daily', 1, 150, 40, true, 46, 'freecell')
on conflict (id) do update set active = true;

insert into public.achievement_defs (code, bm, source, sort, cat, tier, xp, shards, secret, stat, goal, item) values
  ('mg_thousand_master', 1500, 'server', 95, 'games', 'gold', 400, 3, false, 'mg_thousand_wins', 10, null),
  ('mg_mahjong_zen', 800, 'server', 96, 'games', 'silver', 150, 2, false, 'mg_mahjong_wins', 25, null),
  ('mg_freecell_purist', 800, 'server', 97, 'games', 'silver', 150, 2, false, 'mg_freecell_streak', 5, null)
on conflict (code) do update set bm = excluded.bm, source = excluded.source, sort = excluded.sort, cat = excluded.cat,
  tier = excluded.tier, xp = excluded.xp, shards = excluded.shards, secret = excluded.secret, stat = excluded.stat,
  goal = excluded.goal, item = excluded.item;
