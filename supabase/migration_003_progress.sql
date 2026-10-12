-- Bridge 125 · 003 — progression (XP / levels), daily rewards, achievements, BM shop
--
-- Run once in the Supabase SQL editor (safe to re-run: everything is "if not exists" / "create or replace" / upsert).
--
-- Design rules
--   * Every write goes through a SECURITY DEFINER function with `set search_path = ''` and `(select auth.uid())`.
--   * The client never sends an amount. Prices, rewards and XP live here; the client only names *what* it wants.
--   * Calendar day for daily rewards = Europe/Riga (the game's home market; lv/ru/uk players). The day flips at
--     00:00 Riga time (22:00/21:00 UTC). `progress()` returns `next_reset` so the UI never guesses.
--   * Banned players get nothing (functions return an error / null).
--
-- Honest abuse limits (what the server can and cannot verify)
--   * `record_game(won, mode)` is still client-reported (games run in the browser / a P2P room, not on the server).
--     Limits: at most one recorded game per 30 s (faster calls are ignored and return `throttled`), and XP/BM are paid
--     for at most 60 games per Riga day (more games still count for stats, with 0 XP/BM).
--     A cheater can therefore farm at most ~60 × (85 XP + 100 BM) per day. Mode-based achievements (online/quick win)
--     inherit that trust level.
--   * Client-reported achievements (`report_achievement`) are a fixed whitelist, each pays once per account, and calls
--     are rate-limited to one per 4 s. Worst case a script unlocks all four for 1 800 BM, once per account.
--   * Purchases, daily claims and level-up rewards are fully server-side and atomic (row lock on the profile).

-- ======================================================================= profile columns
alter table public.profiles add column if not exists xp            int     not null default 0;
alter table public.profiles add column if not exists level         int     not null default 1;
alter table public.profiles add column if not exists streak        int     not null default 0;   -- daily-claim streak
alter table public.profiles add column if not exists last_daily    date;                          -- Riga date of last claim
alter table public.profiles add column if not exists achievements  text[]  not null default '{}';
alter table public.profiles add column if not exists win_streak    int     not null default 0;   -- consecutive wins
alter table public.profiles add column if not exists best_win_streak int   not null default 0;
alter table public.profiles add column if not exists last_game_at  timestamptz;                   -- record_game throttle
alter table public.profiles add column if not exists reward_day    date;                          -- daily XP/BM cap bucket
alter table public.profiles add column if not exists reward_games  int     not null default 0;
alter table public.profiles add column if not exists last_report_at timestamptz;                  -- report_achievement throttle
-- no new column is client-writable: the column-level UPDATE grant from 001/002 stays (username, lang, accent, background, card_back, avatar)

-- ======================================================================= catalogue tables
create table if not exists public.shop_items (
  id        text primary key,
  kind      text not null check (kind in ('accent', 'table', 'back', 'set', 'bundle', 'pass')),
  price_bm  int  check (price_bm is null or price_bm > 0),          -- null = not buyable with BM
  price_eur numeric(6, 2) check (price_eur is null or price_eur > 0), -- real money (future, via a payment provider)
  grants_bm int,                                                     -- BM bundles: how much BM the bundle gives
  rarity    text not null default 'rare' check (rarity in ('common', 'rare', 'epic', 'legendary')),
  active    boolean not null default true,
  sort      int not null default 0
);
alter table public.shop_items enable row level security;
drop policy if exists shop_items_read on public.shop_items;
create policy shop_items_read on public.shop_items for select to anon, authenticated using (true);
revoke all on public.shop_items from anon, authenticated;
grant select on public.shop_items to anon, authenticated;

-- Item ids are the theme ids (src/theme.ts) because `owned` is checked by id on the client (store.canUse).
-- Some ids are shared by two theme slots, so those are sold as sets:
--   neon   = Neon accent + Neon Grid card back
--   royal  = Royal Purple table + Royal card back
--   jugend = Art Nouveau table + Art Nouveau card back
-- Keep in sync with src/shop/catalog.ts (a unit test compares the two).
insert into public.shop_items (id, kind, price_bm, price_eur, grants_bm, rarity, active, sort) values
  ('emerald',    'accent', 1500, null, null, 'rare',      true, 10),
  ('rosegold',   'accent', 2500, null, null, 'epic',      true, 11),
  ('platinum',   'accent', 4000, null, null, 'legendary', true, 12),
  ('neon',       'set',    3500, null, null, 'epic',      true, 13),
  ('gold',       'back',   3000, null, null, 'epic',      true, 20),
  ('royal',      'set',    6000, null, null, 'epic',      true, 30),
  ('synth',      'table',  5000, null, null, 'epic',      true, 31),
  ('jugend',     'set',    7500, null, null, 'legendary', true, 32),
  ('montecarlo', 'table',  8000, null, null, 'legendary', true, 33),
  ('bm_5k',      'bundle', null, 1.99,  5000, 'rare',      true, 50),
  ('bm_12k',     'bundle', null, 3.99, 12000, 'epic',      true, 51),
  ('bm_30k',     'bundle', null, 7.99, 30000, 'epic',      true, 52),
  ('bm_80k',     'bundle', null, 17.99, 80000, 'legendary', true, 53),
  ('pass_s1',    'pass',   null, 4.99,  null, 'legendary', true, 60)
on conflict (id) do update set kind = excluded.kind, price_bm = excluded.price_bm, price_eur = excluded.price_eur,
  grants_bm = excluded.grants_bm, rarity = excluded.rarity, active = excluded.active, sort = excluded.sort;

-- purchase ledger (audit / refunds / analytics)
create table if not exists public.purchases (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  item_id  text not null,
  price_bm int not null,
  admin    boolean not null default false
);
create index if not exists purchases_user_idx on public.purchases (user_id, at desc);
alter table public.purchases enable row level security;
drop policy if exists purchases_select_own on public.purchases;
create policy purchases_select_own on public.purchases for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.purchases from anon, authenticated;
grant select on public.purchases to authenticated;

create table if not exists public.achievement_defs (
  code   text primary key,
  bm     int  not null check (bm >= 0),
  source text not null check (source in ('server', 'client')),  -- client = may be unlocked via report_achievement()
  sort   int  not null default 0
);
alter table public.achievement_defs enable row level security;
drop policy if exists achievement_defs_read on public.achievement_defs;
create policy achievement_defs_read on public.achievement_defs for select to anon, authenticated using (true);
revoke all on public.achievement_defs from anon, authenticated;
grant select on public.achievement_defs to anon, authenticated;

-- Keep in sync with src/progress/achievements.ts
insert into public.achievement_defs (code, bm, source, sort) values
  ('first_win',    250,  'server', 1),
  ('games_10',     300,  'server', 2),
  ('wins_10',      500,  'server', 3),
  ('win_streak_3', 750,  'server', 4),
  ('online_win',   500,  'server', 5),
  ('quick_win',    500,  'server', 6),
  ('games_50',     1000, 'server', 7),
  ('wins_50',      2000, 'server', 8),
  ('level_10',     1000, 'server', 9),
  ('daily_7',      1000, 'server', 10),
  ('jacks_finish', 400,  'client', 11),
  ('exact_125',    600,  'client', 12),
  ('queen_bounce', 400,  'client', 13),
  ('four_kings',   400,  'client', 14)
on conflict (code) do update set bm = excluded.bm, source = excluded.source, sort = excluded.sort;

-- ======================================================================= level curve
-- XP needed to *reach* level L:  T(L) = 20·L² + 40·L − 60   (L ≥ 1)
--   L2 = 100 · L3 = 240 · L4 = 420 · L5 = 640 · L10 = 2 340 · L20 = 8 740
-- Each level costs 40 XP more than the previous one (100, 140, 180 …): a first level after ~2 games, level 10 after
-- ~45 games, then a gentle slope. A game pays 25 XP, a win 60 XP on top (85 total).
create or replace function public.xp_for_level(l int) returns int
language sql immutable set search_path = '' as $fn$
  select 20 * greatest(l, 1) * greatest(l, 1) + 40 * greatest(l, 1) - 60;
$fn$;

create or replace function public.level_for_xp(x int) returns int
language plpgsql immutable set search_path = '' as $fn$
declare l int;
begin
  l := greatest(1, floor(sqrt((greatest(x, 0) + 80) / 20.0))::int - 1);
  while l < 100 and public.xp_for_level(l + 1) <= x loop l := l + 1; end loop;
  while l > 1 and public.xp_for_level(l) > x loop l := l - 1; end loop;
  return least(l, 100);
end; $fn$;

-- BM paid when reaching level L: 50·L, doubled on every 5th level (L5 = 500, L10 = 1 000)
create or replace function public.level_reward(l int) returns int
language sql immutable set search_path = '' as $fn$
  select 50 * l * case when l % 5 = 0 then 2 else 1 end;
$fn$;

create or replace function public.riga_today() returns date
language sql stable set search_path = '' as $fn$
  select (now() at time zone 'Europe/Riga')::date;
$fn$;

-- ======================================================================= internal: grant achievements
-- Adds the not-yet-owned codes from `codes` to the profile and pays their BM. Returns what was newly granted.
-- Not callable by clients.
create or replace function public._grant_achievements(uid uuid, codes text[], out granted text[], out granted_bm int)
language plpgsql security definer set search_path = '' as $fn$
declare have text[];
begin
  granted := '{}'; granted_bm := 0;
  if codes is null or cardinality(codes) = 0 then return; end if;
  select p.achievements into have from public.profiles p where p.id = uid;
  select coalesce(array_agg(d.code order by d.sort), '{}'), coalesce(sum(d.bm), 0)::int into granted, granted_bm
    from public.achievement_defs d
   where d.code = any(codes) and not (d.code = any(coalesce(have, '{}')));
  if cardinality(granted) > 0 then
    update public.profiles set achievements = achievements || granted, bm = bm + granted_bm where id = uid;
  end if;
end; $fn$;
revoke execute on function public._grant_achievements(uuid, text[]) from public, anon, authenticated;

-- ======================================================================= record_game (replaces 001/002)
-- Same JSON keys as before (games_played, wins, bm) + xp, level, win_streak, achievements and a `reward` object
-- describing what this game paid. The store merges the JSON into `profile`, so `profile.reward` is how the UI
-- learns about level-ups and new achievements.
drop function if exists public.record_game(boolean);
create or replace function public.record_game(won boolean, mode text default null) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  today date := public.riga_today();
  paid boolean;
  xp_gain int := 0; bm_gain int := 0; lvl_from int; lvl_bm int := 0; l int;
  codes text[] := '{}';
  g record;
begin
  if uid is null then return null; end if;
  select * into p from public.profiles where id = uid for update;
  if not found or p.banned then return null; end if;

  if p.last_game_at is not null and p.last_game_at > now() - interval '30 seconds' then
    return json_build_object('games_played', p.games_played, 'wins', p.wins, 'bm', p.bm, 'xp', p.xp, 'level', p.level,
      'win_streak', p.win_streak, 'achievements', p.achievements,
      'reward', json_build_object('games_played', p.games_played, 'throttled', true));
  end if;

  if p.reward_day is distinct from today then p.reward_day := today; p.reward_games := 0; end if;
  paid := p.reward_games < 60;

  p.games_played := p.games_played + 1;
  if won then p.wins := p.wins + 1; p.win_streak := p.win_streak + 1; else p.win_streak := 0; end if;
  p.best_win_streak := greatest(p.best_win_streak, p.win_streak);
  if paid then
    xp_gain := 25 + case when won then 60 else 0 end;
    bm_gain := case when won then 100 else 10 end;
    p.reward_games := p.reward_games + 1;
  end if;

  lvl_from := p.level;
  p.xp := p.xp + xp_gain;
  p.level := greatest(p.level, public.level_for_xp(p.xp));
  for l in lvl_from + 1 .. p.level loop lvl_bm := lvl_bm + public.level_reward(l); end loop;

  update public.profiles set
      games_played = p.games_played, wins = p.wins, win_streak = p.win_streak, best_win_streak = p.best_win_streak,
      xp = p.xp, level = p.level, bm = bm + bm_gain + lvl_bm,
      reward_day = p.reward_day, reward_games = p.reward_games, last_game_at = now()
   where id = uid;

  if p.wins >= 1 then codes := array_append(codes, 'first_win'); end if;
  if p.games_played >= 10 then codes := array_append(codes, 'games_10'); end if;
  if p.wins >= 10 then codes := array_append(codes, 'wins_10'); end if;
  if p.win_streak >= 3 then codes := array_append(codes, 'win_streak_3'); end if;
  if won and mode in ('room', 'quick') then codes := array_append(codes, 'online_win'); end if;
  if won and mode = 'quick' then codes := array_append(codes, 'quick_win'); end if;
  if p.games_played >= 50 then codes := array_append(codes, 'games_50'); end if;
  if p.wins >= 50 then codes := array_append(codes, 'wins_50'); end if;
  if p.level >= 10 then codes := array_append(codes, 'level_10'); end if;
  select * into g from public._grant_achievements(uid, codes);

  select * into p from public.profiles where id = uid;
  return json_build_object(
    'games_played', p.games_played, 'wins', p.wins, 'bm', p.bm,
    'xp', p.xp, 'level', p.level, 'win_streak', p.win_streak, 'achievements', p.achievements,
    'reward', json_build_object(
      'games_played', p.games_played, 'won', won, 'throttled', false, 'capped', not paid,
      'xp', xp_gain, 'bm', bm_gain, 'level_from', lvl_from, 'level', p.level, 'level_bm', lvl_bm,
      'achievements', g.granted, 'achievement_bm', g.granted_bm));
end; $fn$;
revoke execute on function public.record_game(boolean, text) from public, anon;
grant execute on function public.record_game(boolean, text) to authenticated;

-- ======================================================================= progress snapshot
create or replace function public.progress() returns json
language plpgsql stable security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  today date := public.riga_today();
  can boolean; s int;
begin
  if uid is null then return null; end if;
  select * into p from public.profiles where id = uid;
  if not found then return null; end if;
  can := not p.banned and p.last_daily is distinct from today;
  -- streak the next claim would produce (or the current one when already claimed today)
  s := case when not can then greatest(p.streak, 1)
            when p.last_daily = today - 1 then p.streak + 1
            else 1 end;
  return json_build_object(
    'xp', p.xp, 'level', p.level,
    'level_floor', public.xp_for_level(p.level), 'level_next', public.xp_for_level(p.level + 1),
    'bm', p.bm, 'owned', p.owned, 'achievements', p.achievements,
    'games_played', p.games_played, 'wins', p.wins, 'win_streak', p.win_streak, 'best_win_streak', p.best_win_streak,
    'streak', case when can and p.last_daily is distinct from today - 1 then 0 else p.streak end,
    'last_daily', p.last_daily, 'can_claim', can, 'claim_day', ((s - 1) % 7) + 1, 'claim_streak', s,
    'today', today, 'next_reset', ((today + 1)::timestamp at time zone 'Europe/Riga'),
    'banned', p.banned);
end; $fn$;
revoke execute on function public.progress() from public, anon;
grant execute on function public.progress() to authenticated;

-- ======================================================================= daily reward
-- 7-day cycle: 100, 150, 200, 300, 400, 500, 1000 BM. Day 7 of the *first* cycle (streak = 7) also unlocks the
-- Emerald accent (if not owned yet). Missing a day restarts at day 1. Idempotent: a second call the same day returns
-- `claimed: false, already: true` and pays nothing.
create or replace function public.claim_daily() returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  today date := public.riga_today();
  rewards int[] := array[100, 150, 200, 300, 400, 500, 1000];
  s int; d int; amount int; item text := null; g record;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;

  if p.last_daily = today then
    return json_build_object('ok', true, 'claimed', false, 'already', true, 'streak', p.streak,
      'day', ((greatest(p.streak, 1) - 1) % 7) + 1, 'bm', p.bm, 'owned', p.owned,
      'next_reset', ((today + 1)::timestamp at time zone 'Europe/Riga'));
  end if;

  s := case when p.last_daily = today - 1 then p.streak + 1 else 1 end;
  d := ((s - 1) % 7) + 1;
  amount := rewards[d];
  if s = 7 and not ('emerald' = any(p.owned)) then item := 'emerald'; end if;

  update public.profiles set
      streak = s, last_daily = today, bm = bm + amount,
      owned = case when item is null then owned else array_append(owned, item) end
   where id = uid;

  select * into g from public._grant_achievements(uid, case when s >= 7 then array['daily_7'] else '{}'::text[] end);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'claimed', true, 'already', false, 'streak', s, 'day', d,
    'reward_bm', amount, 'item', item, 'bm', p.bm, 'owned', p.owned,
    'achievements', g.granted, 'achievement_bm', g.granted_bm,
    'next_reset', ((today + 1)::timestamp at time zone 'Europe/Riga'));
end; $fn$;
revoke execute on function public.claim_daily() from public, anon;
grant execute on function public.claim_daily() to authenticated;

-- ======================================================================= client-reported achievements
create or replace function public.report_achievement(code text) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
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
  update public.profiles set last_report_at = now() where id = uid;
  select * into g from public._grant_achievements(uid, array[report_achievement.code]);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'granted', cardinality(g.granted) > 0, 'code', report_achievement.code,
    'reward_bm', g.granted_bm, 'bm', p.bm, 'achievements', p.achievements);
end; $fn$;
revoke execute on function public.report_achievement(text) from public, anon;
grant execute on function public.report_achievement(text) to authenticated;

-- ======================================================================= shop: buy with BM
-- Errors come back as { ok: false, error } so the UI can explain them:
--   auth · banned · unknown (no such BM item / not for sale) · owned · funds (+ need)
-- Admins: nothing is charged (the item is simply added to `owned`; canUse() already treats admins as owning all).
create or replace function public.buy_item(item_id text) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  it public.shop_items%rowtype;
  adm boolean;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;

  select * into it from public.shop_items s where s.id = buy_item.item_id and s.active;
  if not found or it.price_bm is null or it.kind not in ('accent', 'table', 'back', 'set') then
    return json_build_object('ok', false, 'error', 'unknown');
  end if;
  if it.id = any(p.owned) then
    return json_build_object('ok', false, 'error', 'owned', 'bm', p.bm, 'owned', p.owned);
  end if;

  adm := p.role in ('admin', 'god');
  if not adm and p.bm < it.price_bm then
    return json_build_object('ok', false, 'error', 'funds', 'need', it.price_bm - p.bm, 'bm', p.bm);
  end if;

  update public.profiles set
      bm = bm - case when adm then 0 else it.price_bm end,
      owned = array_append(owned, it.id)
   where id = uid
   returning * into p;
  insert into public.purchases (user_id, item_id, price_bm, admin) values (uid, it.id, case when adm then 0 else it.price_bm end, adm);

  return json_build_object('ok', true, 'item', it.id, 'price', case when adm then 0 else it.price_bm end,
    'admin', adm, 'bm', p.bm, 'owned', p.owned);
end; $fn$;
revoke execute on function public.buy_item(text) from public, anon;
grant execute on function public.buy_item(text) to authenticated;

-- ======================================================================= ownership is enforced on equip too
-- Players can update accent / background / card_back directly (column grants from 001/002). This trigger makes
-- sure a premium id only sticks when it is owned (or the player is an admin); otherwise the old value is kept.
create or replace function public.enforce_owned_cosmetics() returns trigger
language plpgsql security definer set search_path = '' as $fn$
begin
  if new.role in ('admin', 'god') then return new; end if;
  if new.accent is distinct from old.accent and not (new.accent = any(new.owned))
     and exists (select 1 from public.shop_items s where s.id = new.accent and s.kind in ('accent', 'set')) then
    new.accent := old.accent;
  end if;
  if new.background is distinct from old.background and not (new.background = any(new.owned))
     and exists (select 1 from public.shop_items s where s.id = new.background and s.kind in ('table', 'set')) then
    new.background := old.background;
  end if;
  if new.card_back is distinct from old.card_back and not (new.card_back = any(new.owned))
     and exists (select 1 from public.shop_items s where s.id = new.card_back and s.kind in ('back', 'set')) then
    new.card_back := old.card_back;
  end if;
  return new;
end; $fn$;
revoke execute on function public.enforce_owned_cosmetics() from public, anon, authenticated;
drop trigger if exists profiles_owned_cosmetics on public.profiles;
create trigger profiles_owned_cosmetics before update of accent, background, card_back on public.profiles
  for each row execute function public.enforce_owned_cosmetics();

-- helpers are pure but keep them off the public API surface
revoke execute on function public.xp_for_level(int) from public, anon;
revoke execute on function public.level_for_xp(int) from public, anon;
revoke execute on function public.level_reward(int) from public, anon;
revoke execute on function public.riga_today() from public, anon;
grant execute on function public.xp_for_level(int), public.level_for_xp(int), public.level_reward(int), public.riga_today() to authenticated;

-- backfill: existing players get the level that matches their XP (0 for everyone today) and server-verifiable
-- achievements for what they already did (no BM is paid for the backfill)
update public.profiles p set
  level = greatest(p.level, public.level_for_xp(p.xp)),
  achievements = (select coalesce(array_agg(distinct c), '{}') from unnest(p.achievements || array_remove(array[
      case when p.wins >= 1 then 'first_win' end,
      case when p.games_played >= 10 then 'games_10' end,
      case when p.wins >= 10 then 'wins_10' end,
      case when p.games_played >= 50 then 'games_50' end,
      case when p.wins >= 50 then 'wins_50' end], null)) as c);
