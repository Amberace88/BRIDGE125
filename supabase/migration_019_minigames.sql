-- Bridge 125 · 019 — Mini games (Zole, Durak, Solitaire, Sudoku …): catalogue, results, stats, rewards, quests,
-- medals and leaderboards. Bridge stays the main game — and the best-paying one.
--
-- Run once in the Supabase SQL editor after 001–018 (safe to re-run: "if not exists" / "create or replace" / upsert).
-- Client mirrors: src/games/rewards.ts (catalogue + reward table), src/campaign/quests.ts (game quest metrics),
-- src/progress/achievements.ts (the 'games' medals). Unit tests compare them with this file.
--
-- Same design rules as 003 / 011 / 012: every write is a SECURITY DEFINER function with `set search_path = ''` and
-- `(select auth.uid())`; the client never sends an amount; banned players get nothing; the day is Europe/Riga.
--
-- One entry point: record_minigame(p_game, p_won, p_score, p_seconds, p_level, p_day, p_details) — called by
-- src/games/session.ts `reportGame()` once per finished game. Honest abuse limits (games run in the browser):
--   * the game id must be an active row of `minigames` (admin / god add or tune games with minigame_set);
--   * seconds ≥ the game's min_seconds ('fast' → nothing is recorded), ≤ 12 h; score 0 … max_score; level a short slug;
--     day (daily puzzles / seeded deals) only today or yesterday (Riga); details a small JSON object;
--   * one result per game per min_seconds ('slow' + retry_in) — nobody finishes two games faster than one;
--   * rewards for the first `daily_cap` (30) games per game per Riga day and 60 mini games per day in total — after
--     that games still count for stats, quests and leaderboards but pay nothing (`capped`);
--   * the daily-puzzle bonus once per game per puzzle day.
-- Admin / god (is_privileged) skip the 'fast' / 'slow' checks so they can test quickly; they are paid like everybody.
--
-- Reward table (BM / XP). Bridge pays 100 BM + 85 XP per win and 10 BM + 25 XP per loss (record_game, 003);
-- the CHECK constraints below keep every mini game strictly below that, whatever an admin sets.
--
--   game       win (normal)   × level: easy 0.75 · normal 1 · hard 1.25 · expert 1.5   loss     daily puzzle bonus
--   zole       40 BM · 30 XP    30/40/50/60 BM · 23/30/38/45 XP                         5 · 8    —
--   durak      35 BM · 25 XP    26/35/44/53 BM · 19/25/31/38 XP                         5 · 8    —
--   solitaire  30 BM · 20 XP    23/30/38/45 BM · 15/20/25/30 XP                         0 · 5    —
--   sudoku     30 BM · 20 XP    23/30/38/45 BM · 15/20/25/30 XP                         0 · 5    +50 BM · +25 XP
--   (an unknown or missing level counts as normal; level-ups pay level_reward() as everywhere else)
-- Season Pass: a paid mini game adds 3 ★ (win) / 1 ★ (loss) through season_add_xp(uid, n, 'game') — the same daily
-- 'game' cap (300 ★) as Bridge, so mini games never out-earn it there either.

-- ======================================================================= catalogue
create table if not exists public.minigames (
  id          text primary key check (id ~ '^[a-z0-9-]{2,24}$'),
  kind        text not null default 'cards' check (kind in ('cards', 'puzzle')),
  active      boolean not null default true,
  has_daily   boolean not null default false,
  win_bm      int not null check (win_bm >= 0 and win_bm * 3 / 2 < 100),   -- expert ×1.5 stays below Bridge's 100 BM
  win_xp      int not null check (win_xp >= 0 and win_xp * 3 / 2 < 85),    -- … and below Bridge's 85 XP
  loss_bm     int not null default 5 check (loss_bm between 0 and 9),
  loss_xp     int not null default 8 check (loss_xp between 0 and 24),
  daily_bm    int not null default 0 check (daily_bm between 0 and 100),
  daily_xp    int not null default 0 check (daily_xp between 0 and 50),
  min_seconds int not null default 30 check (min_seconds between 5 and 3600),
  daily_cap   int not null default 30 check (daily_cap between 0 and 60),
  max_score   int not null default 1000000 check (max_score > 0),
  sort        int not null default 0
);
alter table public.minigames enable row level security;
drop policy if exists minigames_read on public.minigames;
create policy minigames_read on public.minigames for select to anon, authenticated using (true);
revoke all on public.minigames from anon, authenticated;
grant select on public.minigames to anon, authenticated;

-- Keep in sync with MINIGAME_DEFS in src/games/rewards.ts. `do nothing`: re-running keeps an admin's tuning.
insert into public.minigames (id, kind, active, has_daily, win_bm, win_xp, loss_bm, loss_xp, daily_bm, daily_xp, min_seconds, daily_cap, max_score, sort) values
  ('zole',      'cards',  true, false, 40, 30, 5, 8, 0,  0,  40, 30, 1000000, 1),
  ('durak',     'cards',  true, false, 35, 25, 5, 8, 0,  0,  30, 30, 1000000, 2),
  ('solitaire', 'cards',  true, false, 30, 20, 0, 5, 0,  0,  45, 30, 1000000, 3),
  ('sudoku',    'puzzle', true, true,  30, 20, 0, 5, 50, 25, 30, 30, 1000000, 4)
on conflict (id) do nothing;

-- ======================================================================= results (one row per finished game)
create table if not exists public.minigame_results (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  game       text not null references public.minigames(id) on delete cascade,
  won        boolean not null,
  score      int,
  seconds    int  not null,
  level      text,
  day        date,                                   -- daily puzzle / seeded deal day (Riga)
  details    jsonb not null default '{}'::jsonb,
  paid       boolean not null default false,
  bm         int not null default 0,                 -- what this game paid (incl. the daily bonus)
  xp         int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists minigame_results_user_idx on public.minigame_results (user_id, game, created_at desc);
create index if not exists minigame_results_game_idx on public.minigame_results (game, created_at desc);
create index if not exists minigame_results_day_idx  on public.minigame_results (game, day) where day is not null;
alter table public.minigame_results enable row level security;
drop policy if exists minigame_results_select_own on public.minigame_results;
create policy minigame_results_select_own on public.minigame_results for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.minigame_results from anon, authenticated;
grant select on public.minigame_results to authenticated;

-- ======================================================================= stats (per player per game)
create table if not exists public.minigame_stats (
  user_id         uuid not null references auth.users(id) on delete cascade,
  game            text not null references public.minigames(id) on delete cascade,
  played          int  not null default 0,
  won             int  not null default 0,
  best_score      int,                              -- highest score of a won game
  best_seconds    int,                              -- fastest won game
  streak          int  not null default 0,          -- Riga days in a row with a win
  best_streak     int  not null default 0,
  last_day        date,                             -- last Riga day with a win
  win_streak      int  not null default 0,          -- wins in a row
  best_win_streak int  not null default 0,
  dailies         int  not null default 0,          -- daily puzzles solved
  daily_streak    int  not null default 0,
  last_daily      date,
  reward_day      date,                             -- per-game daily reward cap
  reward_games    int  not null default 0,
  last_played     timestamptz,
  primary key (user_id, game)
);
alter table public.minigame_stats enable row level security;
drop policy if exists minigame_stats_select_own on public.minigame_stats;
create policy minigame_stats_select_own on public.minigame_stats for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.minigame_stats from anon, authenticated;
grant select on public.minigame_stats to authenticated;

-- ======================================================================= quests: game quests (011's model)
-- quest_defs.game: null = Bridge (the regular pool), a minigames id, or 'any' (any mini game).
-- Game quests are never part of Bridge's daily three / weekly five: a player who played a mini game in the last
-- 14 days gets ONE extra daily game quest (deterministic pick, like the Bridge ones). The weekly chest is untouched.
alter table public.quest_defs add column if not exists game text;

-- Keep in sync with GAME_QUEST_DEFS in src/campaign/quests.ts. Metric = 'mg_games' | 'mg_<game>_win' | 'mg_<game>_daily'.
insert into public.quest_defs (id, kind, metric, goal, bm, xp, active, sort, game) values
  ('g_zole2',      'daily', 'mg_zole_win',      2, 150, 40, true, 40, 'zole'),
  ('g_durak2',     'daily', 'mg_durak_win',     2, 150, 40, true, 41, 'durak'),
  ('g_solitaire',  'daily', 'mg_solitaire_win', 1, 120, 35, true, 42, 'solitaire'),
  ('g_sudoku_day', 'daily', 'mg_sudoku_daily',  1, 150, 40, true, 43, 'sudoku'),
  ('g_any3',       'daily', 'mg_games',         3, 120, 30, true, 44, 'any')
on conflict (id) do update set kind = excluded.kind, metric = excluded.metric, goal = excluded.goal, bm = excluded.bm,
  xp = excluded.xp, active = excluded.active, sort = excluded.sort, game = excluded.game;

-- Internal: the extra daily game quest (only for players who played a mini game in the last 14 days).
create or replace function public._assign_game_quest(uid uuid) returns void
language plpgsql security definer set search_path = '' as $fn$
declare d date := public.riga_today(); v_new text;
begin
  if exists (select 1 from public.player_quests pq join public.quest_defs q on q.id = pq.quest_id
              where pq.user_id = uid and pq.kind = 'daily' and pq.period = d and q.game is not null) then return; end if;
  select q.id into v_new from public.quest_defs q
   where q.kind = 'daily' and q.active and q.game is not null
     and exists (select 1 from public.minigame_stats s join public.minigames m on m.id = s.game
                  where s.user_id = uid and m.active and s.last_played >= now() - interval '14 days'
                    and (q.game = 'any' or s.game = q.game))
   order by md5(uid::text || d::text || q.id) limit 1;
  if v_new is not null then
    insert into public.player_quests (user_id, period, quest_id, kind) values (uid, d, v_new, 'daily') on conflict do nothing;
  end if;
end; $fn$;
revoke execute on function public._assign_game_quest(uuid) from public, anon, authenticated;

-- 011's _assign_quests with one change: the Bridge picks only look at Bridge quests (game is null), so they stay
-- exactly what they were; then the game quest is added.
create or replace function public._assign_quests(uid uuid) returns void
language plpgsql security definer set search_path = '' as $fn$
declare d date := public.riga_today(); w date := public.riga_week();
begin
  if not exists (select 1 from public.player_quests pq join public.quest_defs q on q.id = pq.quest_id
                  where pq.user_id = uid and pq.kind = 'daily' and pq.period = d and q.game is null) then
    insert into public.player_quests (user_id, period, quest_id, kind)
      select uid, d, q.id, 'daily' from public.quest_defs q where q.kind = 'daily' and q.active and q.game is null
       order by md5(uid::text || d::text || q.id) limit 3
    on conflict do nothing;
  end if;
  if not exists (select 1 from public.player_quests pq join public.quest_defs q on q.id = pq.quest_id
                  where pq.user_id = uid and pq.kind = 'weekly' and pq.period = w and q.game is null) then
    insert into public.player_quests (user_id, period, quest_id, kind)
      select uid, w, q.id, 'weekly' from public.quest_defs q where q.kind = 'weekly' and q.active and q.game is null
       order by md5(uid::text || w::text || q.id) limit 5
    on conflict do nothing;
  end if;
  perform public._assign_game_quest(uid);
end; $fn$;
revoke execute on function public._assign_quests(uuid) from public, anon, authenticated;

-- 011's reroll_quest with one change: a Bridge quest is swapped for a Bridge quest, a game quest for another game
-- quest the player can do (never across the two pools).
create or replace function public.reroll_quest(quest_id text) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  d date := public.riga_today();
  v_cost int; v_new text; v_claimed timestamptz; v_ready boolean; v_game text;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  perform public._assign_quests(uid);
  if p.quest_reroll_day = d then return json_build_object('ok', false, 'error', 'used', 'board', public._quest_board(uid)); end if;
  select pq.claimed_at, pq.progress >= q.goal, q.game into v_claimed, v_ready, v_game
    from public.player_quests pq join public.quest_defs q on q.id = pq.quest_id
   where pq.user_id = uid and pq.kind = 'daily' and pq.period = d and pq.quest_id = reroll_quest.quest_id;
  if not found then return json_build_object('ok', false, 'error', 'unknown'); end if;
  if v_claimed is not null then return json_build_object('ok', false, 'error', 'claimed'); end if;
  if v_ready then return json_build_object('ok', false, 'error', 'ready'); end if;   -- never throw away a finished quest
  v_cost := case when p.role in ('admin', 'god') then 0 else 100 end;
  if p.bm < v_cost then return json_build_object('ok', false, 'error', 'funds', 'bm', p.bm); end if;
  select q.id into v_new from public.quest_defs q
   where q.kind = 'daily' and q.active
     and ((v_game is null and q.game is null)
       or (v_game is not null and q.game is not null and exists (
             select 1 from public.minigame_stats s join public.minigames m on m.id = s.game
              where s.user_id = uid and m.active and s.last_played >= now() - interval '14 days' and (q.game = 'any' or s.game = q.game))))
     and q.id not in (select pq.quest_id from public.player_quests pq where pq.user_id = uid and pq.period = d and pq.kind = 'daily')
   order by md5(uid::text || d::text || q.id || 'reroll') limit 1;
  if v_new is null then return json_build_object('ok', false, 'error', 'none'); end if;
  delete from public.player_quests pq where pq.user_id = uid and pq.kind = 'daily' and pq.period = d and pq.quest_id = reroll_quest.quest_id;
  insert into public.player_quests (user_id, period, quest_id, kind) values (uid, d, v_new, 'daily');
  update public.profiles set bm = bm - v_cost, quest_reroll_day = d where id = uid returning * into p;
  return json_build_object('ok', true, 'id', v_new, 'replaced', reroll_quest.quest_id, 'cost', v_cost, 'bm', p.bm,
    'board', public._quest_board(uid));
end; $fn$;
revoke execute on function public.reroll_quest(text) from public, anon;
grant execute on function public.reroll_quest(text) to authenticated;

-- ======================================================================= medals (012's model, category 'games')
-- Keep in sync with the 'games' rows of ACHIEVEMENTS in src/progress/achievements.ts (sort = position there).
-- Stats are counters in profiles.ach_stats, written only by record_minigame.
insert into public.achievement_defs (code, bm, source, sort, cat, tier, xp, shards, secret, stat, goal, item) values
  ('mg_first', 100, 'server', 86, 'games', 'bronze', 50, 1, false, 'mg_games', 1, null),
  ('mg_games_100', 1200, 'server', 87, 'games', 'silver', 150, 2, false, 'mg_games', 100, null),
  ('mg_zole_master', 1500, 'server', 88, 'games', 'gold', 400, 3, false, 'mg_zole_wins', 25, null),
  ('mg_never_durak', 800, 'server', 89, 'games', 'silver', 150, 2, false, 'mg_durak_streak', 5, null),
  ('mg_patience', 600, 'server', 90, 'games', 'silver', 150, 2, false, 'mg_solitaire_wins', 10, null),
  ('mg_sudoku_25', 800, 'server', 91, 'games', 'silver', 150, 2, false, 'mg_sudoku_wins', 25, null),
  ('mg_daily_solver', 700, 'server', 92, 'games', 'silver', 150, 2, false, 'mg_dailies', 7, null),
  ('mg_clockwork', 1500, 'server', 93, 'games', 'gold', 400, 3, false, 'mg_daily_streak', 7, null),
  ('mg_all_rounder', 1500, 'server', 94, 'games', 'gold', 400, 3, false, 'mg_variety', 4, null)
on conflict (code) do update set bm = excluded.bm, source = excluded.source, sort = excluded.sort, cat = excluded.cat,
  tier = excluded.tier, xp = excluded.xp, shards = excluded.shards, secret = excluded.secret, stat = excluded.stat,
  goal = excluded.goal, item = excluded.item;

-- ======================================================================= helpers
-- One stats row as JSON (the streak reads 0 once a day has been missed).
create or replace function public._minigame_stats_json(s public.minigame_stats) returns json
language sql stable set search_path = '' as $fn$
  select json_build_object('game', s.game, 'played', s.played, 'won', s.won, 'best_score', s.best_score,
    'best_seconds', s.best_seconds,
    'streak', case when s.last_day >= public.riga_today() - 1 then s.streak else 0 end, 'best_streak', s.best_streak,
    'last_day', s.last_day, 'win_streak', s.win_streak, 'best_win_streak', s.best_win_streak,
    'dailies', s.dailies, 'daily_streak', case when s.last_daily >= public.riga_today() - 1 then s.daily_streak else 0 end,
    'last_daily', s.last_daily, 'daily_done', s.last_daily = public.riga_today());
$fn$;
revoke execute on function public._minigame_stats_json(public.minigame_stats) from public, anon, authenticated;

-- ======================================================================= record_minigame
-- Errors: auth · banned · unknown (game) · bad (input) · fast (shorter than min_seconds) · slow (+ retry_in)
create or replace function public.record_minigame(p_game text, p_won boolean, p_score numeric default null,
  p_seconds numeric default null, p_level text default null, p_day text default null, p_details jsonb default '{}'::jsonb)
returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  g public.minigames%rowtype;
  s public.minigame_stats%rowtype;
  today date := public.riga_today();
  v_won boolean := coalesce(p_won, false);
  v_score int; v_secs int; v_level text; v_day date; v_details jsonb;
  v_priv boolean; v_last timestamptz; v_paid_today int;
  v_paid boolean; v_mult numeric; v_bm int := 0; v_xp int := 0; v_dbm int := 0; v_dxp int := 0;
  v_daily boolean := false; v_best boolean := false; v_stars int := 0;
  v_grant json; v_ach record; v_variety int; v_quests json; v_lvl_from int; v_lvl_bm int := 0;
  m record; l int;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  select * into g from public.minigames mg where mg.id = p_game and mg.active;
  if not found then return json_build_object('ok', false, 'error', 'unknown'); end if;
  v_priv := p.role in ('admin', 'god');
  v_lvl_from := p.level;

  -- ---- sane inputs
  if p_seconds is null or p_seconds < 0 or p_seconds > 43200 then return json_build_object('ok', false, 'error', 'bad', 'field', 'seconds'); end if;
  v_secs := round(p_seconds)::int;
  if p_score is not null and (p_score < 0 or p_score > g.max_score) then return json_build_object('ok', false, 'error', 'bad', 'field', 'score'); end if;
  v_score := round(p_score)::int;
  v_level := nullif(lower(btrim(coalesce(p_level, ''))), '');
  if v_level is not null and v_level !~ '^[a-z0-9_-]{1,16}$' then return json_build_object('ok', false, 'error', 'bad', 'field', 'level'); end if;
  if p_day is not null and btrim(p_day) <> '' then
    if p_day !~ '^\d{4}-\d{2}-\d{2}$' then return json_build_object('ok', false, 'error', 'bad', 'field', 'day'); end if;
    begin v_day := p_day::date; exception when others then return json_build_object('ok', false, 'error', 'bad', 'field', 'day'); end;
    if v_day < today - 1 or v_day > today then return json_build_object('ok', false, 'error', 'bad', 'field', 'day'); end if;
  end if;
  v_details := case when p_details is not null and jsonb_typeof(p_details) = 'object' and length(p_details::text) <= 2048
                    then p_details else '{}'::jsonb end;

  -- ---- rate limits
  if v_secs < g.min_seconds and not v_priv then
    return json_build_object('ok', false, 'error', 'fast', 'min_seconds', g.min_seconds);
  end if;
  select max(r.created_at) into v_last from public.minigame_results r where r.user_id = uid and r.game = g.id;
  if v_last is not null and v_last > now() - make_interval(secs => g.min_seconds) and not v_priv then
    return json_build_object('ok', false, 'error', 'slow',
      'retry_in', greatest(1, ceil(extract(epoch from (v_last + make_interval(secs => g.min_seconds) - now())))::int));
  end if;

  -- ---- stats row (locked)
  insert into public.minigame_stats (user_id, game) values (uid, g.id) on conflict do nothing;
  select * into s from public.minigame_stats ms where ms.user_id = uid and ms.game = g.id for update;
  if s.reward_day is distinct from today then s.reward_day := today; s.reward_games := 0; end if;
  select count(*)::int into v_paid_today from public.minigame_results r
   where r.user_id = uid and r.paid and r.created_at >= (today::timestamp at time zone 'Europe/Riga');
  v_paid := s.reward_games < g.daily_cap and v_paid_today < 60;

  -- ---- rewards (the server decides; see the table at the top)
  if v_paid then
    v_mult := case v_level when 'easy' then 0.75 when 'hard' then 1.25 when 'expert' then 1.5 else 1.0 end;
    if v_won then v_bm := round(g.win_bm * v_mult)::int; v_xp := round(g.win_xp * v_mult)::int;
    else v_bm := g.loss_bm; v_xp := g.loss_xp; end if;
    s.reward_games := s.reward_games + 1;
    v_stars := case when v_won then 3 else 1 end;
  end if;
  -- the daily puzzle: once per puzzle day, solved
  if v_won and g.has_daily and v_day is not null and not exists (
       select 1 from public.minigame_results r where r.user_id = uid and r.game = g.id and r.day = v_day and r.won) then
    v_daily := true;
    if v_paid then v_dbm := g.daily_bm; v_dxp := g.daily_xp; end if;
    s.dailies := s.dailies + 1;
    s.daily_streak := case when s.last_daily = v_day - 1 then s.daily_streak + 1 when s.last_daily = v_day then s.daily_streak else 1 end;
    s.last_daily := greatest(coalesce(s.last_daily, v_day), v_day);
  end if;

  -- ---- stats
  s.played := s.played + 1;
  if v_won then
    s.won := s.won + 1;
    s.win_streak := s.win_streak + 1;
    if v_score is not null and (s.best_score is null or v_score > s.best_score) then v_best := s.best_score is not null; s.best_score := v_score; end if;
    if s.best_seconds is null or v_secs < s.best_seconds then s.best_seconds := v_secs; end if;
    s.streak := case when s.last_day = today then s.streak when s.last_day = today - 1 then s.streak + 1 else 1 end;
    s.last_day := today;
  else
    s.win_streak := 0;
  end if;
  s.best_win_streak := greatest(s.best_win_streak, s.win_streak);
  s.best_streak := greatest(s.best_streak, s.streak);
  s.last_played := now();
  update public.minigame_stats ms set played = s.played, won = s.won, best_score = s.best_score, best_seconds = s.best_seconds,
      streak = s.streak, best_streak = s.best_streak, last_day = s.last_day, win_streak = s.win_streak,
      best_win_streak = s.best_win_streak, dailies = s.dailies, daily_streak = s.daily_streak, last_daily = s.last_daily,
      reward_day = s.reward_day, reward_games = s.reward_games, last_played = s.last_played
   where ms.user_id = uid and ms.game = g.id;

  insert into public.minigame_results (user_id, game, won, score, seconds, level, day, details, paid, bm, xp)
    values (uid, g.id, v_won, v_score, v_secs, v_level, v_day, v_details, v_paid, v_bm + v_dbm, v_xp + v_dxp);

  -- ---- pay (XP → level-ups, like every other reward)
  v_grant := public._grant_xp_bm(uid, v_xp + v_dxp, v_bm + v_dbm);

  -- ---- medals: counters in ach_stats, then everything the stats now allow
  perform public._stat_add(uid, 'mg_games', 1);
  if v_won then
    perform public._stat_add(uid, 'mg_' || g.id || '_wins', 1);
    perform public._stat_add(uid, 'mg_' || g.id || '_streak', s.win_streak, 'max');
  end if;
  if v_daily then
    perform public._stat_add(uid, 'mg_dailies', 1);
    perform public._stat_add(uid, 'mg_daily_streak', s.daily_streak, 'max');
  end if;
  select count(*)::int into v_variety from public.minigame_stats ms where ms.user_id = uid and ms.won > 0;
  perform public._stat_add(uid, 'mg_variety', v_variety, 'max');
  select * into v_ach from public._ach_sync(uid);

  -- ---- quests: assign the game quest if due, then progress it
  perform public._assign_quests(uid);
  for m in select * from (values ('mg_games', 1), ('mg_' || g.id || '_win', case when v_won then 1 else 0 end),
                                 ('mg_' || g.id || '_daily', case when v_daily then 1 else 0 end)) as x(metric, n)
  loop
    if m.n > 0 then
      update public.player_quests pq set progress = least(q.goal, pq.progress + m.n)
        from public.quest_defs q
       where q.id = pq.quest_id and q.metric = m.metric and pq.user_id = uid and pq.claimed_at is null
         and pq.kind = 'daily' and pq.period = today;
    end if;
  end loop;
  select coalesce(json_agg(json_build_object('id', q.id, 'metric', q.metric, 'goal', q.goal, 'progress', least(pq.progress, q.goal),
           'claimed', pq.claimed_at is not null) order by q.sort), '[]'::json) into v_quests
    from public.player_quests pq join public.quest_defs q on q.id = pq.quest_id
   where pq.user_id = uid and pq.kind = 'daily' and pq.period = today and q.game is not null;

  -- ---- season stars (016), never breaks the game report
  if v_stars > 0 and to_regprocedure('public.season_add_xp(uuid,integer,text)') is not null then
    begin perform public.season_add_xp(uid, v_stars, 'game'); exception when others then v_stars := 0; end;
  end if;

  select * into p from public.profiles where id = uid;
  select * into s from public.minigame_stats ms where ms.user_id = uid and ms.game = g.id;
  -- level-ups from the game XP and from medal XP together
  for l in v_lvl_from + 1 .. p.level loop v_lvl_bm := v_lvl_bm + public.level_reward(l); end loop;
  return json_build_object('ok', true, 'game', g.id, 'won', v_won, 'paid', v_paid, 'capped', not v_paid,
    'daily', v_daily, 'best', v_best,
    'reward', json_build_object('bm', v_bm, 'xp', v_xp, 'daily_bm', v_dbm, 'daily_xp', v_dxp, 'stars', v_stars,
      'level_from', v_lvl_from, 'level', p.level, 'level_bm', v_lvl_bm,
      'achievements', coalesce(v_ach.granted, '{}'), 'achievement_bm', coalesce(v_ach.granted_bm, 0)),
    'bm', p.bm, 'xp', p.xp, 'level', p.level, 'achievements', p.achievements,
    'stats', public._minigame_stats_json(s), 'quests', v_quests);
end; $fn$;
revoke execute on function public.record_minigame(text, boolean, numeric, numeric, text, text, jsonb) from public, anon;
grant execute on function public.record_minigame(text, boolean, numeric, numeric, text, text, jsonb) to authenticated;

-- ======================================================================= my stats (hub tiles)
-- { "<game>": { played, won, best_score, best_seconds, streak, … }, … } — null for guests.
create or replace function public.minigame_my_stats() returns json
language sql stable security definer set search_path = '' as $fn$
  select case when (select auth.uid()) is null then null else coalesce(
    (select json_object_agg(s.game, public._minigame_stats_json(s)) from public.minigame_stats s where s.user_id = (select auth.uid())),
    '{}'::json) end;
$fn$;
revoke execute on function public.minigame_my_stats() from public, anon;
grant execute on function public.minigame_my_stats() to authenticated;

-- ======================================================================= leaderboards (readable by anon)
-- p_kind: 'best'  — best score of a won game (ties: faster first); games without a score rank by the fastest win
--         'week'  — wins in the last 7 days
--         'daily' — best solved daily puzzle of p_day (default today, Riga); ties: faster first
-- The caller's own row is always returned (is_me), even beyond p_lim (max 100).
drop function if exists public.minigame_board(text, text, text, int);
create or replace function public.minigame_board(p_game text, p_kind text default 'best', p_day text default null, p_lim int default 50)
returns table (rank bigint, username text, value bigint, seconds int, played int, won int, level int,
               avatar text, avatar_url text, role text, is_me boolean)
language sql stable security definer set search_path = '' as $fn$
  with d as (
    select coalesce(case when p_day ~ '^\d{4}-\d{2}-\d{2}$' then p_day::date end, public.riga_today()) as day
  ), best as (
    select s.user_id, s.best_score::bigint as v, s.best_seconds as secs, s.played, s.won
      from public.minigame_stats s
     where p_kind = 'best' and s.game = p_game and s.won > 0
  ), week as (
    select r.user_id, (count(*) filter (where r.won))::bigint as v, null::int as secs, count(*)::int as played, (count(*) filter (where r.won))::int as won
      from public.minigame_results r
     where p_kind = 'week' and r.game = p_game and r.created_at >= now() - interval '7 days'
     group by r.user_id having count(*) filter (where r.won) > 0
  ), daily as (
    select distinct on (r.user_id) r.user_id, r.score::bigint as v, r.seconds as secs, 1 as played, 1 as won
      from public.minigame_results r, d
     where p_kind = 'daily' and r.game = p_game and r.day = d.day and r.won
     order by r.user_id, r.score desc nulls last, r.seconds asc
  ), src as (
    select * from best union all select * from week union all select * from daily
  ), ranked as (
    select row_number() over (order by x.v desc nulls last, x.secs asc nulls last, x.played desc, pr.created_at asc) as rk,
           coalesce(nullif(btrim(pr.username), ''), 'Player') as uname, x.v, x.secs, x.played, x.won, pr.level,
           pr.avatar, pr.avatar_url, pr.role, pr.id = (select auth.uid()) as me
      from src x join public.profiles pr on pr.id = x.user_id
     where not pr.banned
  )
  select rk, uname, v, secs, played, won, level, avatar, avatar_url, role, me from ranked
   where rk <= least(greatest(coalesce(p_lim, 50), 1), 100) or me
   order by rk;
$fn$;
revoke execute on function public.minigame_board(text, text, text, int) from public;
grant execute on function public.minigame_board(text, text, text, int) to anon, authenticated;

-- ======================================================================= admin / god: add or tune a game
-- minigame_set('zole', '{"win_bm": 45, "daily_cap": 20}') — missing keys keep their value (or the defaults for a new game).
create or replace function public.minigame_set(p_id text, p_def jsonb) returns json
language plpgsql security definer set search_path = '' as $fn$
declare r public.minigames%rowtype; j jsonb := coalesce(p_def, '{}'::jsonb);
begin
  if not public.is_privileged() then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.minigames (id, kind, win_bm, win_xp) values (p_id, coalesce(j->>'kind', 'cards'), 30, 20)
    on conflict (id) do nothing;
  update public.minigames mg set
      kind        = coalesce(j->>'kind', mg.kind),
      active      = coalesce((j->>'active')::boolean, mg.active),
      has_daily   = coalesce((j->>'has_daily')::boolean, mg.has_daily),
      win_bm      = coalesce((j->>'win_bm')::int, mg.win_bm),
      win_xp      = coalesce((j->>'win_xp')::int, mg.win_xp),
      loss_bm     = coalesce((j->>'loss_bm')::int, mg.loss_bm),
      loss_xp     = coalesce((j->>'loss_xp')::int, mg.loss_xp),
      daily_bm    = coalesce((j->>'daily_bm')::int, mg.daily_bm),
      daily_xp    = coalesce((j->>'daily_xp')::int, mg.daily_xp),
      min_seconds = coalesce((j->>'min_seconds')::int, mg.min_seconds),
      daily_cap   = coalesce((j->>'daily_cap')::int, mg.daily_cap),
      max_score   = coalesce((j->>'max_score')::int, mg.max_score),
      sort        = coalesce((j->>'sort')::int, mg.sort)
   where mg.id = p_id returning * into r;
  return row_to_json(r);
end; $fn$;
revoke execute on function public.minigame_set(text, jsonb) from public, anon;
grant execute on function public.minigame_set(text, jsonb) to authenticated;

-- old results are only history (stats keep the bests); keep ~6 months
delete from public.minigame_results where created_at < now() - interval '180 days';
