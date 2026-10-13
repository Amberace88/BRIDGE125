-- Bridge 125 · 012 — achievements hall (85 achievements, counters, secrets, showcase, rarity) + Bridge Money economy
--   (fortune wheel, high-stakes tables vs bots, boosts, shard collections, prestige)
--
-- Run once in the Supabase SQL editor after 001–011 (safe to re-run: "if not exists" / "create or replace" / upserts).
-- Keep in sync with src/progress/achievements.ts and src/economy/config.ts (unit tests compare them).
--
-- Design rules (same as 003)
--   * Every write goes through a SECURITY DEFINER function with `set search_path = ''` and `(select auth.uid())`.
--   * The client never sends an amount: prices, prizes, odds and rewards live here. The client names *what* it wants.
--   * BM has no cash value. Nothing here can be paid in or out with real money; the wheel's odds are published in-app.
--   * Does NOT replace record_game / claim_daily (other migrations may own them). It wraps record_game in
--     record_game_plus() (boosts) and stake_finish() (stakes), and re-defines _grant_achievements with the same
--     signature so every existing caller now also pays XP, shards and cosmetic rewards.
--
-- Honest abuse limits
--   * Game stats (report_game_stats) are client-reported like record_game: one report per 20 s, 80 per Riga day, and
--     every counter is clamped per game (see `caps` below). Worst case a script reaches the counter achievements
--     faster — each achievement still pays exactly once per account.
--   * report_achievement: whitelisted 'client' codes, once per account, 1 call / 4 s, at most 8 unlocks per Riga day.
--   * Stakes: one active stake, ≤ 10 started per Riga day, a win only pays when the game lasted ≥ 90 s and record_game
--     was not throttled, and the net stake profit is capped at 20 000 BM per Riga day (then a win refunds the entry).
--   * Wheel: one free spin per Riga day + at most 5 paid spins at escalating prices. Outcome = server-side random().

-- ======================================================================= profile columns
alter table public.profiles add column if not exists ach_stats        jsonb   not null default '{}'::jsonb; -- achievement counters
alter table public.profiles add column if not exists ach_pinned       text[]  not null default '{}';        -- showcase (≤ 3)
alter table public.profiles add column if not exists prestige         int     not null default 0;
alter table public.profiles add column if not exists shards           int     not null default 0;
alter table public.profiles add column if not exists relics           text[]  not null default '{}';        -- 'obsidian:1' …
alter table public.profiles add column if not exists boost_xp_until   timestamptz;
alter table public.profiles add column if not exists boost_luck_until timestamptz;
alter table public.profiles add column if not exists shields          int     not null default 0;
alter table public.profiles add column if not exists wheel_day        date;
alter table public.profiles add column if not exists wheel_free_used  boolean not null default false;
alter table public.profiles add column if not exists wheel_paid       int     not null default 0;
alter table public.profiles add column if not exists stats_day        date;
alter table public.profiles add column if not exists stats_games      int     not null default 0;
alter table public.profiles add column if not exists last_stats_at    timestamptz;
alter table public.profiles add column if not exists report_day       date;
alter table public.profiles add column if not exists report_count     int     not null default 0;
do $$ begin
  alter table public.profiles add constraint profiles_economy_chk check (
    shards >= 0 and shields between 0 and 5 and prestige >= 0 and cardinality(ach_pinned) <= 3 and jsonb_typeof(ach_stats) = 'object');
exception when duplicate_object then null; end $$;
-- none of these columns is client-writable (the column-level UPDATE grants from 001/002/008 are unchanged)

-- ======================================================================= achievement catalogue
alter table public.achievement_defs add column if not exists cat    text    not null default 'firsts';
alter table public.achievement_defs add column if not exists tier   text    not null default 'bronze';
alter table public.achievement_defs add column if not exists xp     int     not null default 0;
alter table public.achievement_defs add column if not exists shards int     not null default 0;
alter table public.achievement_defs add column if not exists secret boolean not null default false;
alter table public.achievement_defs add column if not exists stat   text;          -- key in _ach_stats()
alter table public.achievement_defs add column if not exists goal   int;           -- unlock when stat >= goal
alter table public.achievement_defs add column if not exists item   text;          -- cosmetic id added to `owned`
do $$ begin
  alter table public.achievement_defs add constraint achievement_defs_tier_chk check (tier in ('bronze', 'silver', 'gold', 'platinum'));
exception when duplicate_object then null; end $$;

-- Keep in sync with src/progress/achievements.ts. The first 14 rows are 003's (bm / source unchanged).
insert into public.achievement_defs (code, bm, source, sort, cat, tier, xp, shards, secret, stat, goal, item) values
  ('first_win', 250, 'server', 1, 'firsts', 'bronze', 50, 1, false, 'wins', 1, null),
  ('games_10', 300, 'server', 2, 'mastery', 'bronze', 50, 1, false, 'games_played', 10, null),
  ('wins_10', 500, 'server', 3, 'mastery', 'bronze', 50, 1, false, 'wins', 10, null),
  ('win_streak_3', 750, 'server', 4, 'streaks', 'bronze', 50, 1, false, 'best_win_streak', 3, null),
  ('online_win', 500, 'server', 5, 'social', 'bronze', 50, 1, false, 'online_wins', 1, null),
  ('quick_win', 500, 'server', 6, 'social', 'bronze', 50, 1, false, 'quick_wins', 1, null),
  ('games_50', 1000, 'server', 7, 'mastery', 'silver', 150, 2, false, 'games_played', 50, null),
  ('wins_50', 2000, 'server', 8, 'mastery', 'silver', 150, 2, false, 'wins', 50, null),
  ('level_10', 1000, 'server', 9, 'mastery', 'silver', 150, 2, false, 'level', 10, null),
  ('daily_7', 1000, 'server', 10, 'streaks', 'silver', 150, 2, false, 'streak', 7, null),
  ('jacks_finish', 400, 'client', 11, 'cards', 'bronze', 50, 1, false, 'jacks_max', 2, null),
  ('exact_125', 600, 'client', 12, 'scoring', 'silver', 150, 2, false, 'exact125', 1, null),
  ('queen_bounce', 400, 'client', 13, 'cards', 'bronze', 50, 1, false, 'qs_countered', 1, null),
  ('four_kings', 400, 'client', 14, 'cards', 'silver', 150, 2, false, 'kings', 1, null),
  ('first_game', 100, 'server', 15, 'firsts', 'bronze', 50, 1, false, 'games_played', 1, null),
  ('first_daily', 100, 'server', 16, 'firsts', 'bronze', 50, 1, false, 'daily_any', 1, null),
  ('first_spin', 100, 'server', 17, 'firsts', 'bronze', 50, 1, false, 'spins', 1, null),
  ('first_stake', 200, 'server', 18, 'firsts', 'bronze', 50, 1, false, 'stake_played', 1, null),
  ('first_boost', 100, 'server', 19, 'firsts', 'bronze', 50, 1, false, 'boosts', 1, null),
  ('first_forge', 300, 'server', 20, 'firsts', 'silver', 150, 2, false, 'relics', 1, null),
  ('games_100', 1500, 'server', 21, 'mastery', 'silver', 150, 2, false, 'games_played', 100, null),
  ('games_500', 4000, 'server', 22, 'mastery', 'gold', 400, 3, false, 'games_played', 500, null),
  ('games_1000', 8000, 'server', 23, 'mastery', 'platinum', 1000, 5, false, 'games_played', 1000, 'ach_fr_veteran'),
  ('wins_100', 3000, 'server', 24, 'mastery', 'gold', 400, 3, false, 'wins', 100, null),
  ('wins_500', 10000, 'server', 25, 'mastery', 'platinum', 1000, 5, false, 'wins', 500, 't_legend'),
  ('level_25', 2500, 'server', 26, 'mastery', 'gold', 400, 3, false, 'level', 25, null),
  ('level_50', 5000, 'server', 27, 'mastery', 'platinum', 1000, 5, false, 'level', 50, null),
  ('prestige_1', 3000, 'server', 28, 'mastery', 'gold', 400, 3, false, 'prestige', 1, null),
  ('prestige_3', 8000, 'server', 29, 'mastery', 'platinum', 1000, 5, false, 'prestige', 3, 'ach_t_immortal'),
  ('stake_win_1', 500, 'server', 30, 'mastery', 'silver', 150, 2, false, 'stake_wins', 1, null),
  ('stake_win_10', 2000, 'server', 31, 'mastery', 'gold', 400, 3, false, 'stake_wins', 10, 't_highroller'),
  ('qs_counter_10', 1500, 'server', 32, 'cards', 'gold', 400, 3, false, 'qs_countered', 10, null),
  ('qs_dealt_10', 800, 'server', 33, 'cards', 'silver', 150, 2, false, 'qs_played', 10, 't_queenslayer'),
  ('qs_taken_25', 500, 'server', 34, 'cards', 'silver', 150, 2, false, 'qs_taken', 25, null),
  ('eight_chain_3', 600, 'client', 35, 'cards', 'silver', 150, 2, false, 'eight3', 1, null),
  ('eight_chain_4', 1500, 'client', 36, 'cards', 'gold', 400, 3, false, 'eight4', 1, null),
  ('kings_5', 2000, 'server', 37, 'cards', 'gold', 400, 3, false, 'kings', 5, null),
  ('jacks_x3', 800, 'client', 38, 'cards', 'silver', 150, 2, false, 'jacks_max', 3, null),
  ('jacks_x4', 2000, 'client', 39, 'cards', 'gold', 400, 3, false, 'jacks_max', 4, null),
  ('jacks_x5', 5000, 'client', 40, 'cards', 'platinum', 1000, 5, false, 'jacks_max', 5, null),
  ('exact_125_10', 2500, 'server', 41, 'scoring', 'gold', 400, 3, false, 'exact125', 10, null),
  ('comeback', 1500, 'client', 42, 'scoring', 'gold', 400, 3, false, 'comeback', 1, 'ach_t_phoenix'),
  ('zero_win', 2000, 'client', 43, 'scoring', 'gold', 400, 3, false, 'zero_win', 1, null),
  ('rounds_100', 800, 'server', 44, 'scoring', 'silver', 150, 2, false, 'rounds_won', 100, null),
  ('rounds_500', 2500, 'server', 45, 'scoring', 'gold', 400, 3, false, 'rounds_won', 500, null),
  ('online_wins_10', 1000, 'server', 46, 'social', 'silver', 150, 2, false, 'online_wins', 10, null),
  ('online_wins_50', 3000, 'server', 47, 'social', 'gold', 400, 3, false, 'online_wins', 50, null),
  ('quick_10', 600, 'server', 48, 'social', 'silver', 150, 2, false, 'quick_games', 10, null),
  ('host_5', 600, 'server', 49, 'social', 'silver', 150, 2, false, 'hosted', 5, null),
  ('host_25', 1500, 'server', 50, 'social', 'gold', 400, 3, false, 'hosted', 25, null),
  ('bluff_catch_1', 200, 'server', 51, 'bluff', 'bronze', 50, 1, false, 'bluff_caught', 1, null),
  ('bluff_catch_10', 800, 'server', 52, 'bluff', 'silver', 150, 2, false, 'bluff_caught', 10, null),
  ('bluff_catch_50', 2500, 'server', 53, 'bluff', 'gold', 400, 3, false, 'bluff_caught', 50, 'ach_t_detective'),
  ('bluff_ok_1', 200, 'server', 54, 'bluff', 'bronze', 50, 1, false, 'bluff_ok', 1, null),
  ('bluff_ok_10', 800, 'server', 55, 'bluff', 'silver', 150, 2, false, 'bluff_ok', 10, null),
  ('bluff_ok_50', 2500, 'server', 56, 'bluff', 'gold', 400, 3, false, 'bluff_ok', 50, 't_bluff'),
  ('own_5', 300, 'server', 57, 'collector', 'bronze', 50, 1, false, 'owned', 5, null),
  ('own_15', 1000, 'server', 58, 'collector', 'silver', 150, 2, false, 'owned', 15, null),
  ('own_30', 2500, 'server', 59, 'collector', 'gold', 400, 3, false, 'owned', 30, null),
  ('own_60', 6000, 'server', 60, 'collector', 'platinum', 1000, 5, false, 'owned', 60, 'nc_holo'),
  ('collection_1', 2000, 'server', 61, 'collector', 'gold', 400, 3, false, 'collections', 1, null),
  ('collection_all', 6000, 'server', 62, 'collector', 'platinum', 1000, 5, false, 'collections', 3, 'ach_t_curator'),
  ('spins_30', 600, 'server', 63, 'collector', 'silver', 150, 2, false, 'spins', 30, null),
  ('daily_30', 3000, 'server', 64, 'streaks', 'gold', 400, 3, false, 'streak', 30, 'ach_nc_ember'),
  ('daily_100', 8000, 'server', 65, 'streaks', 'platinum', 1000, 5, false, 'streak', 100, null),
  ('win_streak_5', 1500, 'server', 66, 'streaks', 'silver', 150, 2, false, 'best_win_streak', 5, null),
  ('win_streak_10', 5000, 'server', 67, 'streaks', 'platinum', 1000, 5, false, 'best_win_streak', 10, null),
  ('s_midnight', 700, 'client', 73, 'secret', 'silver', 150, 2, true, 'midnight', 1, null),
  ('s_avalanche', 700, 'client', 74, 'secret', 'silver', 150, 2, true, 'big_draw', 1, null),
  ('s_ghost', 1500, 'client', 75, 'secret', 'gold', 400, 3, true, 'clean_round', 1, null),
  ('s_quad', 800, 'client', 76, 'secret', 'silver', 150, 2, true, 'quad', 1, null),
  ('s_phoenix', 2000, 'client', 77, 'secret', 'gold', 400, 3, true, 'double_reset', 1, null),
  ('s_regicide', 1500, 'client', 78, 'secret', 'gold', 400, 3, true, 'kings_high', 1, null),
  ('s_marathon', 800, 'client', 79, 'secret', 'silver', 150, 2, true, 'marathon', 1, null),
  ('s_lucky7', 777, 'client', 80, 'secret', 'silver', 150, 2, true, 'triple7', 1, null),
  ('s_jackpot', 1000, 'server', 81, 'secret', 'gold', 400, 3, true, 'jackpots', 1, null),
  ('s_all_in', 3000, 'server', 82, 'secret', 'platinum', 1000, 5, true, 'stake_big_wins', 1, null),
  ('s_liar', 1500, 'client', 83, 'secret', 'gold', 400, 3, true, 'liar', 1, null),
  ('s_queen_finish', 1500, 'client', 84, 'secret', 'gold', 400, 3, true, 'queen_finish', 1, null),
  ('s_founder', 1000, 'server', 85, 'secret', 'gold', 400, 3, true, 'founder', 1, 'ach_t_founder')
on conflict (code) do update set bm = excluded.bm, source = excluded.source, sort = excluded.sort, cat = excluded.cat,
  tier = excluded.tier, xp = excluded.xp, shards = excluded.shards, secret = excluded.secret, stat = excluded.stat,
  goal = excluded.goal, item = excluded.item;

-- Journey placeholders: the campaign grants them by code, e.g. `perform public._grant_achievements(uid, array['journey_ch1'])`.
-- `do nothing` so a campaign migration that already defined them keeps its own numbers.
insert into public.achievement_defs (code, bm, source, sort, cat, tier, xp, shards, secret, stat, goal, item) values
  ('journey_ch1', 300, 'server', 68, 'journey', 'bronze', 50, 1, false, null, null, null),
  ('journey_ch2', 600, 'server', 69, 'journey', 'silver', 150, 2, false, null, null, null),
  ('journey_ch3', 900, 'server', 70, 'journey', 'silver', 150, 2, false, null, null, null),
  ('journey_ch4', 1500, 'server', 71, 'journey', 'gold', 400, 3, false, null, null, null),
  ('journey_ch5', 4000, 'server', 72, 'journey', 'platinum', 1000, 5, false, null, null, null)
on conflict (code) do nothing;

-- ======================================================================= economy catalogue tables
create table if not exists public.wheel_prizes (
  idx    int primary key check (idx between 0 and 23),
  kind   text not null check (kind in ('bm', 'xp', 'shards', 'boost_xp', 'boost_luck', 'shield')),
  amount int  not null check (amount > 0),
  weight int  not null check (weight >= 0)          -- out of the table's total (10 000 = 100.00 %)
);
alter table public.wheel_prizes enable row level security;
drop policy if exists wheel_prizes_read on public.wheel_prizes;
create policy wheel_prizes_read on public.wheel_prizes for select to anon, authenticated using (true);
revoke all on public.wheel_prizes from anon, authenticated;
grant select on public.wheel_prizes to anon, authenticated;
-- Keep in sync with WHEEL_PRIZES in src/economy/config.ts (wheel order, clockwise). Weights sum to 10 000.
insert into public.wheel_prizes (idx, kind, amount, weight) values
  (0, 'bm', 100, 2200),
  (1, 'xp', 100, 1500),
  (2, 'bm', 250, 1800),
  (3, 'shards', 2, 1300),
  (4, 'bm', 500, 1000),
  (5, 'boost_xp', 60, 350),
  (6, 'bm', 1000, 400),
  (7, 'xp', 300, 600),
  (8, 'bm', 5000, 40),
  (9, 'shards', 5, 500),
  (10, 'boost_luck', 1440, 210),
  (11, 'shield', 1, 100)
on conflict (idx) do update set kind = excluded.kind, amount = excluded.amount, weight = excluded.weight;

create table if not exists public.collection_defs (
  id    text primary key,
  item  text not null,             -- exclusive cosmetic unlocked when all 4 relics are forged
  costs int[] not null check (cardinality(costs) = 4),
  sort  int not null default 0
);
alter table public.collection_defs enable row level security;
drop policy if exists collection_defs_read on public.collection_defs;
create policy collection_defs_read on public.collection_defs for select to anon, authenticated using (true);
revoke all on public.collection_defs from anon, authenticated;
grant select on public.collection_defs to anon, authenticated;
-- Keep in sync with COLLECTIONS in src/economy/config.ts
insert into public.collection_defs (id, item, costs, sort) values
  ('obsidian', 'ach_fr_obsidian', array[4, 6, 8, 12], 1),
  ('aurum', 'ach_nc_aurum', array[5, 7, 10, 13], 2),
  ('vault', 'ach_bn_vault', array[6, 9, 12, 18], 3)
on conflict (id) do update set item = excluded.item, costs = excluded.costs, sort = excluded.sort;

-- Exclusive cosmetics (not for sale: price_bm null). Listing them in shop_items makes the ownership trigger (008)
-- refuse to equip them unless owned. Art lives in src/cosmetics (see src/economy/cosmetics.ts for the entries).
insert into public.shop_items (id, kind, price_bm, price_eur, grants_bm, rarity, active, sort, grants) values
  ('ach_t_phoenix',   'title',     null, null, null, 'epic',      true, 900, null),
  ('ach_t_detective', 'title',     null, null, null, 'epic',      true, 901, null),
  ('ach_t_immortal',  'title',     null, null, null, 'legendary', true, 902, null),
  ('ach_t_founder',   'title',     null, null, null, 'legendary', true, 903, null),
  ('ach_t_curator',   'title',     null, null, null, 'legendary', true, 904, null),
  ('ach_fr_veteran',  'frame',     null, null, null, 'legendary', true, 905, null),
  ('ach_fr_prestige', 'frame',     null, null, null, 'legendary', true, 906, null),
  ('ach_fr_obsidian', 'frame',     null, null, null, 'legendary', true, 907, null),
  ('ach_nc_ember',    'namecolor', null, null, null, 'epic',      true, 908, null),
  ('ach_nc_aurum',    'namecolor', null, null, null, 'legendary', true, 909, null),
  ('ach_bn_vault',    'banner',    null, null, null, 'legendary', true, 910, null)
on conflict (id) do update set kind = excluded.kind, price_bm = null, rarity = excluded.rarity, active = excluded.active, sort = excluded.sort;

-- ======================================================================= stakes + economy ledger
create table if not exists public.stakes (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  tier        int  not null check (tier between 1 and 3),
  entry       int  not null check (entry > 0),
  pot         int  not null check (pot > 0),
  status      text not null default 'active' check (status in ('active', 'won', 'lost', 'abandoned', 'expired', 'void')),
  payout      int  not null default 0,
  lucky       boolean not null default false,
  shield_used boolean not null default false,
  day         date not null,                       -- Riga day the stake was started (daily limits)
  started_at  timestamptz not null default now(),
  settled_at  timestamptz
);
create unique index if not exists stakes_one_active on public.stakes (user_id) where status = 'active';
create index if not exists stakes_user_day on public.stakes (user_id, day);
alter table public.stakes enable row level security;
drop policy if exists stakes_select_own on public.stakes;
create policy stakes_select_own on public.stakes for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.stakes from anon, authenticated;
grant select on public.stakes to authenticated;

create table if not exists public.economy_log (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  kind     text not null,                 -- spin · boost · stake_start · stake_settle · forge · prestige
  bm_delta bigint not null default 0,     -- negative = BM spent (sink), positive = BM paid out (source)
  detail   jsonb not null default '{}'::jsonb
);
create index if not exists economy_log_user_idx on public.economy_log (user_id, at desc);
create index if not exists economy_log_kind_idx on public.economy_log (kind, at desc);
alter table public.economy_log enable row level security;
drop policy if exists economy_log_select_own on public.economy_log;
create policy economy_log_select_own on public.economy_log for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.economy_log from anon, authenticated;
grant select on public.economy_log to authenticated;

-- ======================================================================= internal helpers (not callable by clients)
-- add XP, level up, pay level rewards (mirrors record_game's level logic)
create or replace function public._add_xp(uid uuid, amount int, out level_from int, out level_to int, out level_bm int)
language plpgsql security definer set search_path = '' as $fn$
declare x int; l int;
begin
  level_bm := 0;
  select p.level, p.xp into level_from, x from public.profiles p where p.id = uid;
  level_to := level_from;
  if level_from is null or amount is null or amount <= 0 then return; end if;
  x := x + amount;
  level_to := greatest(level_from, public.level_for_xp(x));
  for l in level_from + 1 .. level_to loop level_bm := level_bm + public.level_reward(l); end loop;
  update public.profiles set xp = x, level = level_to, bm = bm + level_bm where id = uid;
end; $fn$;

-- add n to a counter in ach_stats ('max' keeps the larger value instead)
create or replace function public._stat_add(uid uuid, k text, n int, how text default 'add') returns void
language sql security definer set search_path = '' as $fn$
  update public.profiles set ach_stats = jsonb_set(ach_stats, array[k],
      to_jsonb(case when how = 'max' then greatest(coalesce((ach_stats ->> k)::int, 0), n) else coalesce((ach_stats ->> k)::int, 0) + n end))
   where id = uid and n > 0;
$fn$;

-- every stat an achievement can test: profile columns + counters (keys = achievement_defs.stat)
create or replace function public._ach_stats(uid uuid) returns jsonb
language sql stable security definer set search_path = '' as $fn$
  select coalesce(p.ach_stats, '{}'::jsonb) || jsonb_build_object(
      'games_played', p.games_played, 'wins', p.wins, 'level', p.level, 'streak', p.streak,
      'best_win_streak', p.best_win_streak, 'prestige', p.prestige, 'shards', p.shards,
      'owned', (select count(*) from unnest(p.owned) o where o not like 'pk\_%' and o not like 'bm\_%'),
      'relics', cardinality(p.relics),
      'collections', (select count(*) from public.collection_defs c
                       where (select count(distinct r) from unnest(p.relics) r where r like c.id || ':%') >= 4),
      'daily_any', case when p.last_daily is not null then 1 else 0 end,
      'founder', case when p.created_at < timestamptz '2027-01-01 00:00+02' then 1 else 0 end)
    from public.profiles p where p.id = uid;
$fn$;

-- codes whose stat goal is met and that the player does not have yet
create or replace function public._ach_check(uid uuid) returns text[]
language sql stable security definer set search_path = '' as $fn$
  with st as (select public._ach_stats(uid) as s), me as (select achievements from public.profiles where id = uid)
  select coalesce(array_agg(d.code order by d.sort), '{}')
    from public.achievement_defs d, st, me
   where d.stat is not null and d.goal is not null
     and coalesce((st.s ->> d.stat)::numeric, 0) >= d.goal
     and not (d.code = any(coalesce(me.achievements, '{}')));
$fn$;

-- Adds the not-yet-owned codes from `codes`, pays BM + XP (level-ups included) + shards and unlocks `item`.
-- Same signature as 003, so record_game / claim_daily / report_achievement pay the new rewards too.
create or replace function public._grant_achievements(uid uuid, codes text[], out granted text[], out granted_bm int)
language plpgsql security definer set search_path = '' as $fn$
declare have text[]; gxp int; gsh int; items text[]; lv record;
begin
  granted := '{}'; granted_bm := 0;
  if codes is null or cardinality(codes) = 0 then return; end if;
  select p.achievements into have from public.profiles p where p.id = uid;
  select coalesce(array_agg(d.code order by d.sort), '{}'), coalesce(sum(d.bm), 0)::int, coalesce(sum(d.xp), 0)::int,
         coalesce(sum(d.shards), 0)::int, coalesce(array_agg(d.item) filter (where d.item is not null), '{}')
    into granted, granted_bm, gxp, gsh, items
    from public.achievement_defs d
   where d.code = any(codes) and not (d.code = any(coalesce(have, '{}')));
  if cardinality(granted) > 0 then
    update public.profiles set achievements = achievements || granted, bm = bm + granted_bm, shards = shards + gsh,
        owned = owned || coalesce((select array_agg(distinct i) from unnest(items) i where not (i = any(owned))), '{}')
     where id = uid;
    select * into lv from public._add_xp(uid, gxp);
  end if;
end; $fn$;

-- grant everything the stats already allow
create or replace function public._ach_sync(uid uuid, out granted text[], out granted_bm int)
language plpgsql security definer set search_path = '' as $fn$
declare g record;
begin
  select * into g from public._grant_achievements(uid, public._ach_check(uid));
  granted := g.granted; granted_bm := g.granted_bm;
end; $fn$;

create or replace function public._econ_log(uid uuid, k text, delta bigint, d jsonb) returns void
language sql security definer set search_path = '' as $fn$
  insert into public.economy_log (user_id, kind, bm_delta, detail) values (uid, k, coalesce(delta, 0), coalesce(d, '{}'::jsonb));
$fn$;

revoke execute on function public._add_xp(uuid, int) from public, anon, authenticated;
revoke execute on function public._stat_add(uuid, text, int, text) from public, anon, authenticated;
revoke execute on function public._ach_stats(uuid) from public, anon, authenticated;
revoke execute on function public._ach_check(uuid) from public, anon, authenticated;
revoke execute on function public._grant_achievements(uuid, text[]) from public, anon, authenticated;
revoke execute on function public._ach_sync(uuid) from public, anon, authenticated;
revoke execute on function public._econ_log(uuid, text, bigint, jsonb) from public, anon, authenticated;

-- ======================================================================= achievements: sync / state, rarity, showcase
-- The hall's loader: grants whatever the stats already allow (e.g. games_100 right after record_game) and returns
-- everything the UI needs. Also called by the client after daily claims and recorded games.
create or replace function public.achievements_sync() returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); p public.profiles%rowtype; g record; lf int;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  lf := p.level;
  if not p.banned then select * into g from public._ach_sync(uid); end if;
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'achievements', p.achievements, 'pinned', p.ach_pinned, 'stats', public._ach_stats(uid),
    'granted', coalesce(g.granted, '{}'), 'granted_bm', coalesce(g.granted_bm, 0), 'level_from', lf, 'level', p.level,
    'xp', p.xp, 'bm', p.bm, 'shards', p.shards, 'owned', p.owned, 'prestige', p.prestige);
end; $fn$;
revoke execute on function public.achievements_sync() from public, anon;
grant execute on function public.achievements_sync() to authenticated;

-- % of players (with at least one game) holding each achievement. Cheap: one pass over profiles.achievements.
create or replace function public.achievement_rarity() returns json
language sql stable security definer set search_path = '' as $fn$
  select json_build_object(
    'players', (select count(*) from public.profiles where not banned and games_played > 0),
    'counts', coalesce((select json_object_agg(c, n) from (
        select c, count(*) as n from public.profiles p, unnest(p.achievements) c
         where not p.banned and p.games_played > 0 group by c) x), '{}'::json));
$fn$;
revoke execute on function public.achievement_rarity() from public;
grant execute on function public.achievement_rarity() to anon, authenticated;

-- pin up to 3 unlocked achievements to the profile showcase (order kept)
create or replace function public.pin_achievements(codes text[]) returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); p public.profiles%rowtype; clean text[];
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found or p.banned then return json_build_object('ok', false, 'error', 'auth'); end if;
  select coalesce(array_agg(c order by o), '{}') into clean
    from (select c, min(o) o from unnest(coalesce(codes, '{}')) with ordinality as t(c, o) group by c) x;
  if cardinality(clean) > 3 then return json_build_object('ok', false, 'error', 'max'); end if;
  if exists (select 1 from unnest(clean) c where not (c = any(p.achievements))) then
    return json_build_object('ok', false, 'error', 'locked');
  end if;
  update public.profiles set ach_pinned = clean where id = uid;
  return json_build_object('ok', true, 'pinned', clean);
end; $fn$;
revoke execute on function public.pin_achievements(text[]) from public, anon;
grant execute on function public.pin_achievements(text[]) to authenticated;

-- other players' showcase (seats, leaderboard, profile cards): pinned medals, prestige, achievement count
create or replace function public.public_showcase(uids uuid[])
returns table (id uuid, pinned text[], prestige int, ach_count int)
language sql stable security definer set search_path = '' as $fn$
  select p.id, p.ach_pinned, p.prestige, cardinality(p.achievements)
    from public.profiles p
   where p.id = any(uids[1:12]) and not p.banned;
$fn$;
revoke execute on function public.public_showcase(uuid[]) from public, anon;
grant execute on function public.public_showcase(uuid[]) to authenticated;

-- ======================================================================= per-game stats (client-reported, clamped)
-- `stats` = GameTracker.stats() from src/progress/tracker.ts: counters + won / mode / host.
create or replace function public.report_game_stats(stats jsonb) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  today date := public.riga_today();
  caps jsonb := '{"qs_played":8,"qs_taken":8,"qs_countered":6,"eight3":6,"eight4":4,"kings":4,"kings_high":1,"jacks_max":5,
                  "exact125":3,"double_reset":1,"comeback":1,"zero_win":1,"rounds_won":30,"clean_round":1,"big_draw":1,"quad":1,
                  "triple7":1,"queen_finish":1,"marathon":1,"midnight":1,"bluff_caught":15,"bluff_ok":15,"liar":1}';
  k text; cap int; v int; st jsonb; md text; won boolean; host boolean; g record; lf int;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  if stats is null or jsonb_typeof(stats) <> 'object' then return json_build_object('ok', false, 'error', 'bad'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  if p.last_stats_at is not null and p.last_stats_at > now() - interval '20 seconds' then
    return json_build_object('ok', false, 'error', 'slow');
  end if;
  if p.stats_day is distinct from today then p.stats_day := today; p.stats_games := 0; end if;
  if p.stats_games >= 80 then
    update public.profiles set last_stats_at = now(), stats_day = p.stats_day where id = uid;
    return json_build_object('ok', true, 'capped', true, 'granted', '{}'::text[], 'granted_bm', 0);
  end if;

  st := coalesce(p.ach_stats, '{}'::jsonb);
  for k, cap in select key, value::text::int from jsonb_each(caps) loop
    v := case when (stats ->> k) ~ '^[0-9]{1,6}$' then least((stats ->> k)::int, cap) else 0 end;
    if v > 0 then
      st := jsonb_set(st, array[k], to_jsonb(case when k = 'jacks_max' then greatest(coalesce((st ->> k)::int, 0), v)
                                                 else coalesce((st ->> k)::int, 0) + v end));
    end if;
  end loop;
  md := stats ->> 'mode';
  won := coalesce(stats ->> 'won', '') = 'true';
  host := coalesce(stats ->> 'host', '') = 'true';
  if won and md in ('room', 'quick', 'online') then st := jsonb_set(st, '{online_wins}', to_jsonb(coalesce((st ->> 'online_wins')::int, 0) + 1)); end if;
  if md = 'quick' then st := jsonb_set(st, '{quick_games}', to_jsonb(coalesce((st ->> 'quick_games')::int, 0) + 1)); end if;
  if won and md = 'quick' then st := jsonb_set(st, '{quick_wins}', to_jsonb(coalesce((st ->> 'quick_wins')::int, 0) + 1)); end if;
  if host and md in ('room', 'online') then st := jsonb_set(st, '{hosted}', to_jsonb(coalesce((st ->> 'hosted')::int, 0) + 1)); end if;

  lf := p.level;
  update public.profiles set ach_stats = st, last_stats_at = now(), stats_day = p.stats_day, stats_games = p.stats_games + 1 where id = uid;
  select * into g from public._ach_sync(uid);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'granted', g.granted, 'granted_bm', g.granted_bm, 'achievements', p.achievements,
    'bm', p.bm, 'xp', p.xp, 'level_from', lf, 'level', p.level, 'shards', p.shards, 'owned', p.owned, 'stats', public._ach_stats(uid));
end; $fn$;
revoke execute on function public.report_game_stats(jsonb) from public, anon;
grant execute on function public.report_game_stats(jsonb) to authenticated;

-- ======================================================================= report_achievement (replaces 003: + daily cap)
create or replace function public.report_achievement(code text) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  today date := public.riga_today();
  g record;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  if not exists (select 1 from public.achievement_defs d where d.code = report_achievement.code and d.source = 'client') then
    return json_build_object('ok', false, 'error', 'unknown');
  end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  if report_achievement.code = any(p.achievements) then
    return json_build_object('ok', true, 'granted', false, 'code', report_achievement.code, 'bm', p.bm);
  end if;
  if p.last_report_at is not null and p.last_report_at > now() - interval '4 seconds' then
    return json_build_object('ok', false, 'error', 'slow');
  end if;
  if p.report_day is distinct from today then p.report_count := 0; end if;
  if p.report_count >= 8 then return json_build_object('ok', false, 'error', 'cap'); end if;
  update public.profiles set last_report_at = now(), report_day = today, report_count = p.report_count + 1 where id = uid;
  select * into g from public._grant_achievements(uid, array[report_achievement.code]);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'granted', cardinality(g.granted) > 0, 'code', report_achievement.code,
    'reward_bm', g.granted_bm, 'bm', p.bm, 'achievements', p.achievements);
end; $fn$;
revoke execute on function public.report_achievement(text) from public, anon;
grant execute on function public.report_achievement(text) to authenticated;

-- ======================================================================= record_game_plus — record_game + boosts
-- Same JSON as record_game; `reward.xp` / `reward.bm` include the boost and `reward.boost_xp` / `reward.boost_bm` say
-- how much of it came from XP ×2 / Lucky shuffle. Boosts only change rewards, never the game.
create or replace function public.record_game_plus(won boolean, mode text default null) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  r jsonb; rw jsonb; p public.profiles%rowtype;
  xp_extra int := 0; bm_extra int := 0; lvl_extra int := 0; lv record; g record;
begin
  if uid is null then return null; end if;
  r := public.record_game(won, mode)::jsonb;
  if r is null then return null; end if;
  rw := coalesce(r -> 'reward', '{}'::jsonb);
  if coalesce((rw ->> 'throttled')::boolean, true) then return r::json; end if;

  select * into p from public.profiles where id = uid for update;
  if p.boost_xp_until > now() and coalesce((rw ->> 'xp')::int, 0) > 0 then
    xp_extra := (rw ->> 'xp')::int;
    select * into lv from public._add_xp(uid, xp_extra);
    lvl_extra := coalesce(lv.level_bm, 0);
  end if;
  if won and p.boost_luck_until > now() and coalesce((rw ->> 'bm')::int, 0) > 0 then
    bm_extra := ceil((rw ->> 'bm')::int * 10 / 100.0)::int;
    update public.profiles set bm = bm + bm_extra where id = uid;
  end if;
  select * into g from public._ach_sync(uid);
  select * into p from public.profiles where id = uid;
  rw := rw || jsonb_build_object(
    'xp', coalesce((rw ->> 'xp')::int, 0) + xp_extra, 'bm', coalesce((rw ->> 'bm')::int, 0) + bm_extra,
    'boost_xp', xp_extra, 'boost_bm', bm_extra, 'level', p.level,
    'level_bm', coalesce((rw ->> 'level_bm')::int, 0) + lvl_extra,
    'achievements', coalesce(rw -> 'achievements', '[]'::jsonb) || to_jsonb(coalesce(g.granted, '{}'::text[])),
    'achievement_bm', coalesce((rw ->> 'achievement_bm')::int, 0) + coalesce(g.granted_bm, 0));
  return (r || jsonb_build_object('bm', p.bm, 'xp', p.xp, 'level', p.level, 'achievements', p.achievements, 'reward', rw))::json;
end; $fn$;
revoke execute on function public.record_game_plus(boolean, text) from public, anon;
grant execute on function public.record_game_plus(boolean, text) to authenticated;

-- ======================================================================= economy snapshot
create or replace function public.economy_state() returns json
language plpgsql stable security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid()); p public.profiles%rowtype; today date := public.riga_today();
  prices int[] := array[300, 600, 1200, 2000, 3000]; paid int; s public.stakes%rowtype;
begin
  if uid is null then return null; end if;
  select * into p from public.profiles where id = uid;
  if not found then return null; end if;
  paid := case when p.wheel_day = today then p.wheel_paid else 0 end;
  select * into s from public.stakes where user_id = uid and status = 'active';
  return json_build_object('ok', true, 'now', now(), 'today', today,
    'next_reset', ((today + 1)::timestamp at time zone 'Europe/Riga'),
    'bm', p.bm, 'xp', p.xp, 'level', p.level, 'prestige', p.prestige, 'shards', p.shards, 'relics', p.relics,
    'shields', p.shields, 'boost_xp_until', p.boost_xp_until, 'boost_luck_until', p.boost_luck_until,
    'wheel', json_build_object('free', p.wheel_day is distinct from today or not p.wheel_free_used, 'paid', paid,
                               'max_paid', cardinality(prices), 'next_price', prices[paid + 1]),
    'stake', case when s.id is null then null else json_build_object('id', s.id, 'tier', s.tier, 'entry', s.entry, 'pot', s.pot,
               'started_at', s.started_at, 'shield_used', s.shield_used,
               'expired', s.started_at < now() - interval '6 hours') end,
    'stake_today', (select json_build_object('games', count(*), 'profit', coalesce(sum(case when st.status = 'won' then st.payout - st.entry else 0 end), 0))
                      from public.stakes st where st.user_id = uid and st.day = today),
    'can_prestige', p.level >= 50, 'banned', p.banned);
end; $fn$;
revoke execute on function public.economy_state() from public, anon;
grant execute on function public.economy_state() to authenticated;

-- ======================================================================= fortune wheel
-- paid = false → the daily free spin; paid = true → next paid spin (300 · 600 · 1 200 · 2 000 · 3 000 BM, max 5/day).
-- Errors: auth · banned · used (free spin taken) · limit (no paid spins left) · funds (+ need). Admin / god spin free.
create or replace function public.wheel_spin(paid boolean default false) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid()); p public.profiles%rowtype; today date := public.riga_today();
  prices int[] := array[300, 600, 1200, 2000, 3000];
  price int := 0; adm boolean; total int; roll int; acc int := 0; w record; prize record; lv record; g record;
  free_used boolean; paid_n int; lf int;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  adm := p.role in ('admin', 'god');
  lf := p.level;
  free_used := case when p.wheel_day = today then p.wheel_free_used else false end;
  paid_n := case when p.wheel_day = today then p.wheel_paid else 0 end;

  if not coalesce(paid, false) then
    if free_used then return json_build_object('ok', false, 'error', 'used'); end if;
    free_used := true;
  else
    if paid_n >= cardinality(prices) then return json_build_object('ok', false, 'error', 'limit'); end if;
    price := case when adm then 0 else prices[paid_n + 1] end;
    if p.bm < price then return json_build_object('ok', false, 'error', 'funds', 'need', price - p.bm, 'bm', p.bm); end if;
    paid_n := paid_n + 1;
  end if;

  select coalesce(sum(weight), 0) into total from public.wheel_prizes where weight > 0;
  if total <= 0 then return json_build_object('ok', false, 'error', 'unknown'); end if;
  roll := floor(random() * total)::int;
  for w in select * from public.wheel_prizes where weight > 0 order by idx loop
    acc := acc + w.weight;
    if roll < acc then prize := w; exit; end if;
  end loop;

  update public.profiles set wheel_day = today, wheel_free_used = free_used, wheel_paid = paid_n, bm = bm - price where id = uid;
  if prize.kind = 'bm' then
    update public.profiles set bm = bm + prize.amount where id = uid;
  elsif prize.kind = 'xp' then
    select * into lv from public._add_xp(uid, prize.amount);
  elsif prize.kind = 'shards' then
    update public.profiles set shards = shards + prize.amount where id = uid;
  elsif prize.kind = 'boost_xp' then
    update public.profiles set boost_xp_until = least(greatest(coalesce(boost_xp_until, now()), now()) + make_interval(mins => prize.amount),
                                                      now() + interval '360 minutes') where id = uid;
  elsif prize.kind = 'boost_luck' then
    update public.profiles set boost_luck_until = least(greatest(coalesce(boost_luck_until, now()), now()) + make_interval(mins => prize.amount),
                                                        now() + interval '4320 minutes') where id = uid;
  elsif prize.kind = 'shield' then
    update public.profiles set shields = least(shields + prize.amount, 5) where id = uid;
  end if;
  perform public._stat_add(uid, 'spins', 1);
  if prize.kind = 'bm' and prize.amount >= 5000 then perform public._stat_add(uid, 'jackpots', 1); end if;
  if coalesce(paid, false) then
    insert into public.purchases (user_id, item_id, price_bm, admin) values (uid, 'wheel_spin', price, adm);
  end if;
  perform public._econ_log(uid, 'spin', (case when prize.kind = 'bm' then prize.amount else 0 end) - price,
    jsonb_build_object('paid', coalesce(paid, false), 'price', price, 'idx', prize.idx, 'kind', prize.kind, 'amount', prize.amount));
  select * into g from public._ach_sync(uid);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'idx', prize.idx, 'kind', prize.kind, 'amount', prize.amount, 'price', price,
    'bm', p.bm, 'xp', p.xp, 'level_from', lf, 'level', p.level, 'shards', p.shards, 'shields', p.shields,
    'boost_xp_until', p.boost_xp_until, 'boost_luck_until', p.boost_luck_until,
    'wheel', json_build_object('free', not free_used, 'paid', paid_n, 'max_paid', cardinality(prices), 'next_price', prices[paid_n + 1]),
    'granted', g.granted, 'granted_bm', g.granted_bm, 'achievements', p.achievements, 'owned', p.owned);
end; $fn$;
revoke execute on function public.wheel_spin(boolean) from public, anon;
grant execute on function public.wheel_spin(boolean) to authenticated;

-- ======================================================================= boosts
-- xp2 = XP ×2 for 60 min (900 BM, stacks to 6 h) · lucky = +10 % BM from wins for 24 h (1 500 BM, stacks to 72 h)
-- shield = next Q♠ penalty in a stake match draws 2 fewer (500 BM, hold ≤ 5). Errors: unknown · max · funds.
create or replace function public.buy_boost(kind text) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid()); p public.profiles%rowtype; price int; adm boolean; g record;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  price := case buy_boost.kind when 'xp2' then 900 when 'lucky' then 1500 when 'shield' then 500 end;
  if price is null then return json_build_object('ok', false, 'error', 'unknown'); end if;
  if (buy_boost.kind = 'shield' and p.shields >= 5)
     or (buy_boost.kind = 'xp2' and p.boost_xp_until > now() + interval '300 minutes')
     or (buy_boost.kind = 'lucky' and p.boost_luck_until > now() + interval '2880 minutes') then
    return json_build_object('ok', false, 'error', 'max');
  end if;
  adm := p.role in ('admin', 'god');
  if adm then price := 0; end if;
  if p.bm < price then return json_build_object('ok', false, 'error', 'funds', 'need', price - p.bm, 'bm', p.bm); end if;

  update public.profiles set bm = bm - price,
      boost_xp_until = case when buy_boost.kind = 'xp2' then greatest(coalesce(boost_xp_until, now()), now()) + interval '60 minutes' else boost_xp_until end,
      boost_luck_until = case when buy_boost.kind = 'lucky' then greatest(coalesce(boost_luck_until, now()), now()) + interval '1440 minutes' else boost_luck_until end,
      shields = case when buy_boost.kind = 'shield' then shields + 1 else shields end
   where id = uid;
  insert into public.purchases (user_id, item_id, price_bm, admin) values (uid, 'boost_' || buy_boost.kind, price, adm);
  perform public._stat_add(uid, 'boosts', 1);
  perform public._econ_log(uid, 'boost', -price, jsonb_build_object('kind', buy_boost.kind));
  select * into g from public._ach_sync(uid);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'kind', buy_boost.kind, 'price', price, 'bm', p.bm, 'shields', p.shields,
    'boost_xp_until', p.boost_xp_until, 'boost_luck_until', p.boost_luck_until,
    'granted', g.granted, 'granted_bm', g.granted_bm, 'achievements', p.achievements);
end; $fn$;
revoke execute on function public.buy_boost(text) from public, anon;
grant execute on function public.buy_boost(text) to authenticated;

-- ======================================================================= high-stakes tables (vs bots)
-- stake_start(tier): pays the entry (250 / 1 000 / 5 000 BM; min level 1 / 5 / 12 or any prestige) and opens THE
-- active stake. An older active stake is forfeited ("abandon = lost"). ≤ 10 stakes per Riga day.
-- Errors: auth · banned · tier · level (+need) · limit · funds (+need).
create or replace function public.stake_start(tier int) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid()); p public.profiles%rowtype; today date := public.riga_today();
  e int; minl int; cnt int; old int := 0; s public.stakes%rowtype; g record;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  e := case stake_start.tier when 1 then 250 when 2 then 1000 when 3 then 5000 end;
  minl := case stake_start.tier when 1 then 1 when 2 then 5 when 3 then 12 end;
  if e is null then return json_build_object('ok', false, 'error', 'tier'); end if;
  if p.level < minl and p.prestige = 0 then return json_build_object('ok', false, 'error', 'level', 'need', minl); end if;
  select count(*) into cnt from public.stakes st where st.user_id = uid and st.day = today;
  if cnt >= 10 then return json_build_object('ok', false, 'error', 'limit'); end if;
  if p.bm < e then return json_build_object('ok', false, 'error', 'funds', 'need', e - p.bm, 'bm', p.bm); end if;

  update public.stakes set status = 'abandoned', settled_at = now() where user_id = uid and status = 'active';
  get diagnostics old = row_count;
  update public.profiles set bm = bm - e where id = uid;
  insert into public.stakes (user_id, tier, entry, pot, day) values (uid, stake_start.tier, e, floor(e * 2.5)::int, today) returning * into s;
  perform public._stat_add(uid, 'stake_played', 1);
  perform public._econ_log(uid, 'stake_start', -e, jsonb_build_object('stake', s.id, 'tier', s.tier, 'abandoned', old));
  select * into g from public._ach_sync(uid);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'stake', json_build_object('id', s.id, 'tier', s.tier, 'entry', s.entry, 'pot', s.pot,
      'started_at', s.started_at, 'shield_used', false, 'expired', false),
    'abandoned', old > 0, 'bm', p.bm, 'granted', g.granted, 'granted_bm', g.granted_bm, 'achievements', p.achievements);
end; $fn$;
revoke execute on function public.stake_start(int) from public, anon;
grant execute on function public.stake_start(int) to authenticated;

-- stake_finish(won): records the game (record_game_plus, mode 'bots') AND settles the active stake in one transaction.
-- Returns record_game's JSON (merge it into the profile like recordGame does) + `stake` { status, payout … }.
-- A win pays the pot (+10 % with Lucky shuffle) only when: the game was not throttled, it lasted ≥ 90 s, the stake is
-- < 6 h old, and today's net stake profit stays ≤ 20 000 BM (over the cap a win refunds the entry).
create or replace function public.stake_finish(won boolean) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid()); r jsonb; s public.stakes%rowtype; p public.profiles%rowtype; today date := public.riga_today();
  thr boolean; secs numeric; st text; v_payout int := 0; v_lucky boolean := false; potx int; profit_today int; g record;
begin
  if uid is null then return null; end if;
  select * into s from public.stakes where user_id = uid and status = 'active' for update;
  r := public.record_game_plus(won, 'bots')::jsonb;
  if r is null then return null; end if;
  if s.id is null then return (r || jsonb_build_object('stake', null))::json; end if;

  thr := coalesce((r -> 'reward' ->> 'throttled')::boolean, true);
  secs := extract(epoch from now() - s.started_at);
  select * into p from public.profiles where id = uid for update;
  if thr or secs < 90 then st := 'void';
  elsif secs > 6 * 3600 then st := 'expired';
  elsif won then
    st := 'won';
    v_lucky := coalesce(p.boost_luck_until > now(), false);
    potx := s.pot + case when v_lucky then ceil(s.pot * 10 / 100.0)::int else 0 end;
    select coalesce(sum(x.payout - x.entry), 0) into profit_today from public.stakes x
     where x.user_id = uid and x.status = 'won' and (x.settled_at at time zone 'Europe/Riga')::date = today;
    v_payout := s.entry + least(potx - s.entry, greatest(0, 20000 - profit_today));
    update public.profiles set bm = bm + v_payout where id = uid;
    perform public._stat_add(uid, 'stake_wins', 1);
    if s.tier = 3 then perform public._stat_add(uid, 'stake_big_wins', 1); end if;
  else st := 'lost';
  end if;
  update public.stakes set status = st, payout = v_payout, lucky = v_lucky, settled_at = now() where id = s.id;
  perform public._econ_log(uid, 'stake_settle', v_payout, jsonb_build_object('stake', s.id, 'tier', s.tier, 'status', st, 'secs', round(secs)));
  select * into g from public._ach_sync(uid);
  select * into p from public.profiles where id = uid;
  return (r || jsonb_build_object('bm', p.bm, 'xp', p.xp, 'level', p.level, 'achievements', p.achievements,
    'reward', coalesce(r -> 'reward', '{}'::jsonb) || jsonb_build_object(
        'stake_payout', v_payout,
        'achievements', coalesce(r -> 'reward' -> 'achievements', '[]'::jsonb) || to_jsonb(coalesce(g.granted, '{}'::text[])),
        'achievement_bm', coalesce((r -> 'reward' ->> 'achievement_bm')::int, 0) + coalesce(g.granted_bm, 0)),
    'stake', jsonb_build_object('id', s.id, 'tier', s.tier, 'entry', s.entry, 'pot', s.pot, 'status', st, 'payout', v_payout, 'lucky', v_lucky)))::json;
end; $fn$;
revoke execute on function public.stake_finish(boolean) from public, anon;
grant execute on function public.stake_finish(boolean) to authenticated;

-- leaving a stake match: the stake is lost
create or replace function public.stake_forfeit() returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); n int;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  update public.stakes set status = 'abandoned', settled_at = now() where user_id = uid and status = 'active';
  get diagnostics n = row_count;
  if n > 0 then perform public._econ_log(uid, 'stake_settle', 0, jsonb_build_object('status', 'abandoned')); end if;
  return json_build_object('ok', true, 'forfeited', n > 0);
end; $fn$;
revoke execute on function public.stake_forfeit() from public, anon;
grant execute on function public.stake_forfeit() to authenticated;

-- spend one Shield on the active stake match (once per match). Errors: none (no active stake) · used · empty.
create or replace function public.use_shield() returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); p public.profiles%rowtype; s public.stakes%rowtype;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found or p.banned then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into s from public.stakes where user_id = uid and status = 'active' for update;
  if s.id is null then return json_build_object('ok', false, 'error', 'none'); end if;
  if s.shield_used then return json_build_object('ok', false, 'error', 'used'); end if;
  if p.shields < 1 then return json_build_object('ok', false, 'error', 'empty'); end if;
  update public.stakes set shield_used = true where id = s.id;
  update public.profiles set shields = shields - 1 where id = uid returning * into p;
  return json_build_object('ok', true, 'shields', p.shields);
end; $fn$;
revoke execute on function public.use_shield() from public, anon;
grant execute on function public.use_shield() to authenticated;

-- ======================================================================= collections: forge a relic with shards
-- Four relics per collection (any order). The fourth unlocks the collection's exclusive cosmetic.
-- Errors: unknown · owned · funds (+need).
create or replace function public.forge_relic(collection text, piece int) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid()); p public.profiles%rowtype; c public.collection_defs%rowtype;
  rid text; cost int; done boolean := false; g record;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  select * into c from public.collection_defs d where d.id = forge_relic.collection;
  if not found or piece is null or piece < 1 or piece > 4 then return json_build_object('ok', false, 'error', 'unknown'); end if;
  rid := c.id || ':' || piece;
  if rid = any(p.relics) then return json_build_object('ok', false, 'error', 'owned'); end if;
  cost := c.costs[piece];
  if p.shards < cost then return json_build_object('ok', false, 'error', 'funds', 'need', cost - p.shards, 'shards', p.shards); end if;
  update public.profiles set shards = shards - cost, relics = relics || rid where id = uid returning * into p;
  if (select count(distinct r) from unnest(p.relics) r where r like c.id || ':%') >= 4 then
    done := true;
    update public.profiles set owned = case when c.item = any(owned) then owned else owned || c.item end where id = uid;
  end if;
  perform public._econ_log(uid, 'forge', 0, jsonb_build_object('relic', rid, 'shards', cost, 'completed', done));
  select * into g from public._ach_sync(uid);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'relic', rid, 'cost', cost, 'completed', done, 'item', case when done then c.item end,
    'shards', p.shards, 'relics', p.relics, 'owned', p.owned, 'bm', p.bm,
    'granted', g.granted, 'granted_bm', g.granted_bm, 'achievements', p.achievements);
end; $fn$;
revoke execute on function public.forge_relic(text, int) from public, anon;
grant execute on function public.forge_relic(text, int) to authenticated;

-- ======================================================================= prestige
-- At level 50: level → 1, XP → 0, prestige + 1, the Prestige frame (once) and 10 shards. Level rewards are paid
-- again on the way back up. Achievements, BM and items are kept. Errors: level.
create or replace function public.do_prestige() returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); p public.profiles%rowtype; g record; g0 record;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  if p.level < 50 then return json_build_object('ok', false, 'error', 'level', 'need', 50); end if;
  select * into g0 from public._ach_sync(uid);        -- bank level_50 & co. before the reset
  update public.profiles set prestige = prestige + 1, xp = 0, level = 1, shards = shards + 10,
      owned = case when 'ach_fr_prestige' = any(owned) then owned else owned || 'ach_fr_prestige'::text end
   where id = uid;
  perform public._econ_log(uid, 'prestige', 0, jsonb_build_object('prestige', p.prestige + 1, 'from_level', p.level));
  select * into g from public._ach_sync(uid);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'prestige', p.prestige, 'level', p.level, 'xp', p.xp, 'shards', p.shards, 'bm', p.bm,
    'owned', p.owned, 'achievements', p.achievements,
    'granted', coalesce(g0.granted, '{}') || coalesce(g.granted, '{}'), 'granted_bm', coalesce(g0.granted_bm, 0) + coalesce(g.granted_bm, 0));
end; $fn$;
revoke execute on function public.do_prestige() from public, anon;
grant execute on function public.do_prestige() to authenticated;

-- ======================================================================= backfill
-- Players get the column-based achievements they already earned (games, wins, level, streaks, owned, first daily) and
-- their cosmetic rewards — silently and without BM / XP / shards, like 003's backfill. Secrets stay to be discovered.
do $$
declare r record; codes text[]; items text[];
begin
  for r in select id from public.profiles loop
    select coalesce(array_agg(d.code order by d.sort), '{}'), coalesce(array_agg(d.item) filter (where d.item is not null), '{}')
      into codes, items
      from public.achievement_defs d, public.profiles p
     where p.id = r.id and not d.secret
       and d.stat in ('games_played', 'wins', 'level', 'streak', 'best_win_streak', 'owned', 'daily_any')
       and coalesce((public._ach_stats(r.id) ->> d.stat)::numeric, 0) >= d.goal
       and not (d.code = any(p.achievements));
    if cardinality(codes) > 0 then
      update public.profiles set achievements = achievements || codes,
          owned = owned || coalesce((select array_agg(distinct i) from unnest(items) i where not (i = any(owned))), '{}')
       where id = r.id;
    end if;
  end loop;
end $$;
