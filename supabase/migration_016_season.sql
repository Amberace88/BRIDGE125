-- Bridge 125 · 016 — Season Pass ("Sezonas caurlaide"): seasons, 40 tiers × free / premium rewards, season stars,
--   premium unlock and tier skips paid with Diamonds, idempotent claims, season cosmetics.
--
-- Run once in the Supabase SQL editor after 001–015 (only 003, 007, 008, 010, 011 and 012 are required; safe to re-run:
-- "if not exists" / "create or replace" / upserts). Keep in sync with src/season/data.ts (seasons row, season_rewards,
-- star rules) and src/season/cosmetics.ts (season items) — src/season/season.test.ts compares them.
--
-- Same design rules as 003 / 010 / 012
--   * Every write goes through a SECURITY DEFINER function with `set search_path = ''` and `(select auth.uid())`.
--   * The client never sends an amount: rewards, prices and star values live here. It names *which* tier / track.
--   * Premium is bought with Diamonds only (never with BM). Owner ('admin') and co-author / main tester ('god') have
--     premium for free (is_privileged-style role check), pay 0 for tier skips, and are recorded with admin = true.
--   * No randomness for sale: a "wheel spin" reward is a free roll of the published wheel_prizes table (012).
--
-- Where stars come from (one internal entry point: season_add_xp(uid, amount, source)):
--   * games    — trigger on profiles: every *paid* recorded game (record_game's 60-per-Riga-day reward cap) pays
--                5 ★ for a win, 2 ★ for a loss. Covers record_game, record_game_plus, stake_finish and online games.
--   * quests   — trigger on player_quests: a claimed daily quest 10 ★, weekly quest 25 ★; the weekly chest 50 ★
--                (profiles.quest_chest_week).
--   * medals   — trigger on profiles.achievements: bronze 5 · silver 10 · gold 20 · platinum 40 ★ per new achievement.
--   * daily challenge — NOT wired here. The challenge RPC (migration 014) should call, after a successful submission:
--                  if to_regprocedure('public.season_add_xp(uuid,integer,text)') is not null then
--                    perform public.season_add_xp(uid, 15, 'challenge');
--                  end if;
--   The triggers only fire for the signed-in player's own actions (auth.uid() = the row's user), so SQL-editor backfills
--   and admin tools never pay stars, and they swallow every error so a season problem can never break record_game.
--
-- Honest abuse limits
--   * Stars per Riga day are capped per source (game 300 · quest 200 · challenge 30 · achievement 400 · other 100) on
--     top of the limits the sources already have (record_game throttle + 60 paid games, quest caps, one-time medals).
--   * Claims are idempotent: (user, season, tier, track) is a primary key; a second claim returns `already: true`.
--   * Diamonds move only through _dm_move (row lock + diamond_ledger, reason 'season').

-- ======================================================================= ledger reason for Diamonds spent / won here
do $$ declare c record; begin
  for c in select con.conname from pg_constraint con
            where con.conrelid = 'public.diamond_ledger'::regclass and con.contype = 'c' and pg_get_constraintdef(con.oid) ilike '%reason%'
  loop execute format('alter table public.diamond_ledger drop constraint %I', c.conname); end loop;
end $$;
alter table public.diamond_ledger add constraint diamond_ledger_reason_check
  check (reason in ('purchase', 'refund', 'gift', 'gift_item', 'admin_grant', 'correction', 'season'));

-- ======================================================================= catalogue
create table if not exists public.seasons (
  id             text primary key,
  name           text not null,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  tiers          int  not null default 40  check (tiers between 1 and 100),
  stars_per_tier int  not null default 100 check (stars_per_tier > 0),
  premium_price  int  not null default 950 check (premium_price > 0),    -- Diamonds
  skip_price     int  not null default 150 check (skip_price > 0),       -- Diamonds per tier
  grace_days     int  not null default 14  check (grace_days >= 0),      -- claiming stays open after the end
  constraint seasons_dates_chk check (ends_at > starts_at)
);
alter table public.seasons enable row level security;
drop policy if exists seasons_read on public.seasons;
create policy seasons_read on public.seasons for select to anon, authenticated using (true);
revoke all on public.seasons from anon, authenticated;
grant select on public.seasons to anon, authenticated;

-- Season 1: 8 weeks from Monday 19 Oct 2026 00:00 Riga. Change the dates any time (the pass follows the row):
--   update public.seasons set starts_at = '2026-10-26 00:00+02', ends_at = '2026-12-21 00:00+02' where id = 's1';
-- Keep in sync with SEASON_S1 in src/season/data.ts (only the first insert sets the dates — re-running keeps yours).
insert into public.seasons (id, name, starts_at, ends_at, tiers, stars_per_tier, premium_price, skip_price, grace_days) values
  ('s1', 'Jazz Age', '2026-10-19 00:00+03', '2026-12-14 00:00+02', 40, 100, 950, 150, 14)
on conflict (id) do update set name = excluded.name, tiers = excluded.tiers, stars_per_tier = excluded.stars_per_tier,
  premium_price = excluded.premium_price, skip_price = excluded.skip_price, grace_days = excluded.grace_days;

create table if not exists public.season_rewards (
  season_id text not null references public.seasons(id) on delete cascade,
  tier      int  not null check (tier > 0),
  track     text not null check (track in ('free', 'premium')),
  kind      text not null check (kind in ('bm', 'dm', 'shards', 'spin', 'boost_xp', 'item')),
  amount    int  not null check (amount > 0),        -- BM · Diamonds · shards · spins · boost minutes · 1 for items
  item      text,                                    -- cosmetic id for kind = 'item'
  primary key (season_id, tier, track),
  constraint season_rewards_item_chk check ((kind = 'item') = (item is not null))
);
alter table public.season_rewards enable row level security;
drop policy if exists season_rewards_read on public.season_rewards;
create policy season_rewards_read on public.season_rewards for select to anon, authenticated using (true);
revoke all on public.season_rewards from anon, authenticated;
grant select on public.season_rewards to anon, authenticated;

-- Keep in sync with S1_REWARDS in src/season/data.ts (tier, track, kind, amount, item)
insert into public.season_rewards (season_id, tier, track, kind, amount, item) values
  ('s1', 1, 'free', 'bm', 200, null),
  ('s1', 1, 'premium', 'item', 1, 's1_table'),
  ('s1', 2, 'free', 'shards', 1, null),
  ('s1', 2, 'premium', 'bm', 300, null),
  ('s1', 3, 'free', 'bm', 250, null),
  ('s1', 3, 'premium', 'spin', 1, null),
  ('s1', 4, 'free', 'bm', 250, null),
  ('s1', 4, 'premium', 'dm', 25, null),
  ('s1', 5, 'free', 'spin', 1, null),
  ('s1', 5, 'premium', 'item', 1, 's1_em_jazz'),
  ('s1', 6, 'free', 'bm', 300, null),
  ('s1', 6, 'premium', 'shards', 3, null),
  ('s1', 7, 'free', 'shards', 1, null),
  ('s1', 7, 'premium', 'bm', 400, null),
  ('s1', 8, 'free', 'bm', 300, null),
  ('s1', 8, 'premium', 'boost_xp', 60, null),
  ('s1', 9, 'free', 'bm', 350, null),
  ('s1', 9, 'premium', 'dm', 25, null),
  ('s1', 10, 'free', 'item', 1, 's1_t_debut'),
  ('s1', 10, 'premium', 'item', 1, 's1_bk_gilded'),
  ('s1', 11, 'free', 'bm', 350, null),
  ('s1', 11, 'premium', 'bm', 500, null),
  ('s1', 12, 'free', 'boost_xp', 60, null),
  ('s1', 12, 'premium', 'shards', 3, null),
  ('s1', 13, 'free', 'bm', 400, null),
  ('s1', 13, 'premium', 'spin', 1, null),
  ('s1', 14, 'free', 'shards', 2, null),
  ('s1', 14, 'premium', 'dm', 25, null),
  ('s1', 15, 'free', 'spin', 1, null),
  ('s1', 15, 'premium', 'item', 1, 's1_t_maestro'),
  ('s1', 16, 'free', 'bm', 400, null),
  ('s1', 16, 'premium', 'bm', 600, null),
  ('s1', 17, 'free', 'bm', 450, null),
  ('s1', 17, 'premium', 'shards', 4, null),
  ('s1', 18, 'free', 'shards', 2, null),
  ('s1', 18, 'premium', 'spin', 2, null),
  ('s1', 19, 'free', 'bm', 450, null),
  ('s1', 19, 'premium', 'dm', 25, null),
  ('s1', 20, 'free', 'bm', 1000, null),
  ('s1', 20, 'premium', 'item', 1, 's1_nc_champagne'),
  ('s1', 21, 'free', 'bm', 500, null),
  ('s1', 21, 'premium', 'bm', 700, null),
  ('s1', 22, 'free', 'shards', 2, null),
  ('s1', 22, 'premium', 'boost_xp', 120, null),
  ('s1', 23, 'free', 'bm', 500, null),
  ('s1', 23, 'premium', 'spin', 1, null),
  ('s1', 24, 'free', 'bm', 550, null),
  ('s1', 24, 'premium', 'dm', 25, null),
  ('s1', 25, 'free', 'item', 1, 's1_bk_ticket'),
  ('s1', 25, 'premium', 'item', 1, 's1_bn_skyline'),
  ('s1', 26, 'free', 'bm', 550, null),
  ('s1', 26, 'premium', 'bm', 800, null),
  ('s1', 27, 'free', 'shards', 3, null),
  ('s1', 27, 'premium', 'shards', 5, null),
  ('s1', 28, 'free', 'bm', 600, null),
  ('s1', 28, 'premium', 'spin', 2, null),
  ('s1', 29, 'free', 'bm', 600, null),
  ('s1', 29, 'premium', 'dm', 25, null),
  ('s1', 30, 'free', 'spin', 2, null),
  ('s1', 30, 'premium', 'item', 1, 's1_vx_champagne'),
  ('s1', 31, 'free', 'bm', 650, null),
  ('s1', 31, 'premium', 'bm', 900, null),
  ('s1', 32, 'free', 'shards', 3, null),
  ('s1', 32, 'premium', 'shards', 5, null),
  ('s1', 33, 'free', 'bm', 650, null),
  ('s1', 33, 'premium', 'spin', 2, null),
  ('s1', 34, 'free', 'bm', 700, null),
  ('s1', 34, 'premium', 'dm', 25, null),
  ('s1', 35, 'free', 'boost_xp', 120, null),
  ('s1', 35, 'premium', 'bm', 1500, null),
  ('s1', 36, 'free', 'bm', 700, null),
  ('s1', 36, 'premium', 'shards', 6, null),
  ('s1', 37, 'free', 'shards', 3, null),
  ('s1', 37, 'premium', 'spin', 3, null),
  ('s1', 38, 'free', 'bm', 750, null),
  ('s1', 38, 'premium', 'bm', 1200, null),
  ('s1', 39, 'free', 'bm', 800, null),
  ('s1', 39, 'premium', 'dm', 75, null),
  ('s1', 40, 'free', 'bm', 3000, null),
  ('s1', 40, 'premium', 'item', 1, 's1_fr_gilded')
on conflict (season_id, tier, track) do update set kind = excluded.kind, amount = excluded.amount, item = excluded.item;

-- Season cosmetics: earned on the pass, never sold (price_bm null → not buyable, not giftable). Listing them makes the
-- ownership trigger from 008 refuse to equip them unless owned. Art lives in src/season/cosmetics.ts.
-- The pass itself (`pass_s1`, seeded by 003 with a placeholder € price) is bought with Diamonds through season_unlock().
insert into public.shop_items (id, kind, price_bm, price_eur, grants_bm, rarity, active, sort, grants) values
  ('pass_s1',         'pass',      null, null, null, 'legendary', true, 60,  null),
  ('s1_table',        'table',     null, null, null, 'legendary', true, 920, null),
  ('s1_bk_gilded',    'back',      null, null, null, 'legendary', true, 921, null),
  ('s1_bk_ticket',    'back',      null, null, null, 'epic',      true, 922, null),
  ('s1_fr_gilded',    'frame',     null, null, null, 'legendary', true, 923, null),
  ('s1_t_debut',      'title',     null, null, null, 'epic',      true, 924, null),
  ('s1_t_maestro',    'title',     null, null, null, 'legendary', true, 925, null),
  ('s1_nc_champagne', 'namecolor', null, null, null, 'legendary', true, 926, null),
  ('s1_bn_skyline',   'banner',    null, null, null, 'legendary', true, 927, null),
  ('s1_em_jazz',      'emotes',    null, null, null, 'epic',      true, 928, null),
  ('s1_vx_champagne', 'victory',   null, null, null, 'legendary', true, 929, null)
on conflict (id) do update set kind = excluded.kind, price_bm = null, price_eur = null, rarity = excluded.rarity,
  active = excluded.active, sort = excluded.sort;

-- ======================================================================= per player
create table if not exists public.season_players (
  user_id     uuid not null references auth.users(id) on delete cascade,
  season_id   text not null references public.seasons(id) on delete cascade,
  stars       int  not null default 0 check (stars >= 0),
  premium     boolean not null default false,
  premium_at  timestamptz,
  stars_day   date,                                   -- Riga day of stars_today
  stars_today jsonb not null default '{}'::jsonb,     -- { source: stars } for the daily caps
  updated_at  timestamptz not null default now(),
  primary key (user_id, season_id)
);
create index if not exists season_players_rank_idx on public.season_players (season_id, stars desc);
alter table public.season_players enable row level security;
drop policy if exists season_players_select_own on public.season_players;
create policy season_players_select_own on public.season_players for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.season_players from anon, authenticated;
grant select on public.season_players to authenticated;

create table if not exists public.season_claims (
  user_id    uuid not null references auth.users(id) on delete cascade,
  season_id  text not null references public.seasons(id) on delete cascade,
  tier       int  not null,
  track      text not null check (track in ('free', 'premium')),
  claimed_at timestamptz not null default now(),
  reward     jsonb,                                   -- what was paid (spin outcomes included)
  primary key (user_id, season_id, tier, track)
);
alter table public.season_claims enable row level security;
drop policy if exists season_claims_select_own on public.season_claims;
create policy season_claims_select_own on public.season_claims for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.season_claims from anon, authenticated;
grant select on public.season_claims to authenticated;

create table if not exists public.season_log (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  season_id text not null,
  source    text not null,               -- game · quest · challenge · achievement · other · skip · unlock · god
  stars     int  not null default 0,
  detail    jsonb not null default '{}'::jsonb
);
create index if not exists season_log_user_idx on public.season_log (user_id, at desc);
alter table public.season_log enable row level security;
drop policy if exists season_log_select_own on public.season_log;
create policy season_log_select_own on public.season_log for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.season_log from anon, authenticated;
grant select on public.season_log to authenticated;

-- ======================================================================= helpers (not callable by clients)
-- The season players see: live, starting within 30 days, or still in its claim grace period (latest start wins).
create or replace function public._season_pick() returns setof public.seasons
language sql stable security definer set search_path = '' as $fn$
  select s.* from public.seasons s
   where now() >= s.starts_at - interval '30 days' and now() < s.ends_at + make_interval(days => s.grace_days)
   order by s.starts_at desc limit 1;
$fn$;

create or replace function public._season_phase(a timestamptz, b timestamptz, grace int) returns text
language sql stable set search_path = '' as $fn$
  select case when now() < a then 'upcoming' when now() < b then 'live' when now() < b + make_interval(days => grace) then 'grace' else 'over' end;
$fn$;

-- tier = 1 + floor(stars / stars_per_tier), capped (mirrors tierForStars in src/season/data.ts)
create or replace function public._season_tier(stars int, tiers int, per int) returns int
language sql immutable set search_path = '' as $fn$
  select least(tiers, 1 + greatest(coalesce(stars, 0), 0) / per);
$fn$;

-- the player's part of season_state() and of every action's answer
create or replace function public._season_me(uid uuid, sid text) returns json
language sql stable security definer set search_path = '' as $fn$
  select json_build_object(
    'stars', coalesce(sp.stars, 0),
    'tier', public._season_tier(coalesce(sp.stars, 0), s.tiers, s.stars_per_tier),
    'premium', coalesce(sp.premium, false),
    'privileged', p.role in ('admin', 'god'),
    'banned', p.banned,
    'claimed', json_build_object(
      'free', coalesce((select json_agg(c.tier order by c.tier) from public.season_claims c where c.user_id = uid and c.season_id = sid and c.track = 'free'), '[]'::json),
      'premium', coalesce((select json_agg(c.tier order by c.tier) from public.season_claims c where c.user_id = uid and c.season_id = sid and c.track = 'premium'), '[]'::json)),
    'stars_today', case when sp.stars_day = public.riga_today() then sp.stars_today else '{}'::jsonb end,
    'bm', p.bm, 'diamonds', p.diamonds, 'shards', p.shards, 'owned', p.owned, 'xp', p.xp, 'level', p.level)
  from public.profiles p
  join public.seasons s on s.id = sid
  left join public.season_players sp on sp.user_id = uid and sp.season_id = sid
  where p.id = uid;
$fn$;

-- ----------------------------------------------------------------------- season_add_xp (the one way stars are earned)
-- Internal — call it from SECURITY DEFINER code only (e.g. the daily challenge in 014, see the header).
-- Adds `amount` stars (≤ 500 per call, clamped to the source's daily cap) to the live season. Returns
-- { ok, added, stars, tier, tier_from, capped } or { ok: false, error: bad · none (no live season) · banned }.
create or replace function public.season_add_xp(uid uuid, amount int, source text) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  s public.seasons%rowtype; sp public.season_players%rowtype; today date := public.riga_today();
  src text; cap int; used int; v_add int; t0 int; t1 int; st jsonb;
begin
  if uid is null or amount is null or amount <= 0 then return json_build_object('ok', false, 'error', 'bad'); end if;
  select * into s from public._season_pick();
  if not found or public._season_phase(s.starts_at, s.ends_at, s.grace_days) <> 'live' then return json_build_object('ok', false, 'error', 'none'); end if;
  if exists (select 1 from public.profiles p where p.id = uid and p.banned) then return json_build_object('ok', false, 'error', 'banned'); end if;
  if not exists (select 1 from public.profiles p where p.id = uid) then return json_build_object('ok', false, 'error', 'bad'); end if;
  src := case when source in ('game', 'quest', 'challenge', 'achievement') then source else 'other' end;
  cap := case src when 'game' then 300 when 'quest' then 200 when 'challenge' then 30 when 'achievement' then 400 else 100 end;

  insert into public.season_players (user_id, season_id) values (uid, s.id) on conflict do nothing;
  select * into sp from public.season_players where user_id = uid and season_id = s.id for update;
  st := case when sp.stars_day is distinct from today then '{}'::jsonb else sp.stars_today end;
  used := coalesce((st ->> src)::int, 0);
  v_add := least(amount, 500, greatest(0, cap - used));
  t0 := public._season_tier(sp.stars, s.tiers, s.stars_per_tier);
  if v_add <= 0 then
    return json_build_object('ok', true, 'added', 0, 'capped', true, 'stars', sp.stars, 'tier', t0, 'tier_from', t0);
  end if;
  update public.season_players set stars = stars + v_add, stars_day = today, stars_today = jsonb_set(st, array[src], to_jsonb(used + v_add)), updated_at = now()
   where user_id = uid and season_id = s.id returning * into sp;
  t1 := public._season_tier(sp.stars, s.tiers, s.stars_per_tier);
  insert into public.season_log (user_id, season_id, source, stars, detail)
    values (uid, s.id, src, v_add, jsonb_build_object('asked', amount, 'source', source, 'tier_from', t0, 'tier', t1));
  return json_build_object('ok', true, 'added', v_add, 'capped', v_add < amount, 'stars', sp.stars, 'tier', t1, 'tier_from', t0);
end; $fn$;

-- ----------------------------------------------------------------------- hooks (triggers; never break the caller)
create or replace function public._season_profile_hook() returns trigger
language plpgsql security definer set search_path = '' as $fn$
declare n int := 0;
begin
  if (select auth.uid()) is distinct from new.id or new.banned then return null; end if;
  -- a recorded game that paid rewards (record_game counts paid games of the Riga day in reward_games)
  if new.games_played > old.games_played
     and (new.reward_games > old.reward_games or new.reward_day is distinct from old.reward_day) then
    perform public.season_add_xp(new.id, case when new.wins > old.wins then 5 else 2 end, 'game');
  end if;
  -- the weekly quest chest
  if new.quest_chest_week is not null and new.quest_chest_week is distinct from old.quest_chest_week then
    perform public.season_add_xp(new.id, 50, 'quest');
  end if;
  -- new achievements, by medal tier
  if cardinality(new.achievements) > cardinality(old.achievements) then
    select coalesce(sum(case d.tier when 'platinum' then 40 when 'gold' then 20 when 'silver' then 10 else 5 end), 0)::int into n
      from public.achievement_defs d
     where d.code = any(new.achievements) and not (d.code = any(coalesce(old.achievements, '{}')));
    if n > 0 then perform public.season_add_xp(new.id, n, 'achievement'); end if;
  end if;
  return null;
exception when others then
  return null;
end; $fn$;
drop trigger if exists profiles_season_hook on public.profiles;
create trigger profiles_season_hook after update of games_played, achievements, quest_chest_week on public.profiles
  for each row execute function public._season_profile_hook();

create or replace function public._season_quest_hook() returns trigger
language plpgsql security definer set search_path = '' as $fn$
begin
  if (select auth.uid()) is distinct from new.user_id then return null; end if;
  if old.claimed_at is null and new.claimed_at is not null then
    perform public.season_add_xp(new.user_id, case when new.kind = 'weekly' then 25 else 10 end, 'quest');
  end if;
  return null;
exception when others then
  return null;
end; $fn$;
drop trigger if exists player_quests_season_hook on public.player_quests;
create trigger player_quests_season_hook after update of claimed_at on public.player_quests
  for each row execute function public._season_quest_hook();

-- ----------------------------------------------------------------------- paying one reward
-- Caller holds the profile row lock. Returns what was paid: { kind, amount, item?, spins?: [{ idx, kind, amount }] }.
create or replace function public._season_grant(uid uuid, r public.season_rewards) returns jsonb
language plpgsql security definer set search_path = '' as $fn$
declare
  out jsonb := jsonb_build_object('kind', r.kind, 'amount', r.amount, 'tier', r.tier, 'track', r.track);
  bm_delta int := 0; total int; roll int; acc int; w record; prize record; spins jsonb := '[]'::jsonb; lv record; i int;
begin
  if r.kind = 'bm' then
    update public.profiles set bm = bm + r.amount where id = uid;
    bm_delta := r.amount;
  elsif r.kind = 'dm' then
    perform public._dm_move(uid, r.amount, 'season', 'reward:' || r.season_id || ':' || r.tier || ':' || r.track);
  elsif r.kind = 'shards' then
    update public.profiles set shards = shards + r.amount where id = uid;
  elsif r.kind = 'boost_xp' then
    update public.profiles set boost_xp_until = least(greatest(coalesce(boost_xp_until, now()), now()) + make_interval(mins => r.amount),
                                                      now() + interval '360 minutes') where id = uid;
  elsif r.kind = 'item' then
    update public.profiles set owned = case when r.item = any(owned) then owned else owned || r.item end where id = uid;
    out := out || jsonb_build_object('item', r.item);
  elsif r.kind = 'spin' then
    -- free rolls of the published fortune wheel (same table, same odds as wheel_spin in 012)
    for i in 1 .. least(r.amount, 10) loop
      select coalesce(sum(weight), 0) into total from public.wheel_prizes where weight > 0;
      exit when total <= 0;
      roll := floor(random() * total)::int; acc := 0;
      for w in select * from public.wheel_prizes where weight > 0 order by idx loop
        acc := acc + w.weight;
        if roll < acc then prize := w; exit; end if;
      end loop;
      if prize.kind = 'bm' then
        update public.profiles set bm = bm + prize.amount where id = uid; bm_delta := bm_delta + prize.amount;
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
      spins := spins || jsonb_build_object('idx', prize.idx, 'kind', prize.kind, 'amount', prize.amount);
    end loop;
    out := out || jsonb_build_object('spins', spins);
  end if;
  perform public._econ_log(uid, 'season', bm_delta, out || jsonb_build_object('season', r.season_id));
  return out;
end; $fn$;

revoke execute on function public._season_pick() from public, anon, authenticated;
revoke execute on function public._season_me(uuid, text) from public, anon, authenticated;
revoke execute on function public.season_add_xp(uuid, int, text) from public, anon, authenticated;
revoke execute on function public._season_profile_hook() from public, anon, authenticated;
revoke execute on function public._season_quest_hook() from public, anon, authenticated;
revoke execute on function public._season_grant(uuid, public.season_rewards) from public, anon, authenticated;
revoke execute on function public._season_phase(timestamptz, timestamptz, int) from public, anon;
revoke execute on function public._season_tier(int, int, int) from public, anon;
grant execute on function public._season_phase(timestamptz, timestamptz, int), public._season_tier(int, int, int) to authenticated;

-- ======================================================================= RPCs
-- Everything the pass screen needs. Works signed-out (me = null) so guests see a live preview.
-- { ok, now, season: { id, name, starts_at, ends_at, tiers, stars_per_tier, premium_price, skip_price, grace_days, phase },
--   rewards: [{ tier, track, kind, amount, item }], me: { stars, tier, premium, privileged, claimed: { free, premium }, … } }
create or replace function public.season_state() returns json
language plpgsql stable security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); s public.seasons%rowtype;
begin
  select * into s from public._season_pick();
  if not found then return json_build_object('ok', false, 'error', 'none', 'now', now()); end if;
  return json_build_object('ok', true, 'now', now(),
    'season', json_build_object('id', s.id, 'name', s.name, 'starts_at', s.starts_at, 'ends_at', s.ends_at, 'tiers', s.tiers,
      'stars_per_tier', s.stars_per_tier, 'premium_price', s.premium_price, 'skip_price', s.skip_price, 'grace_days', s.grace_days,
      'phase', public._season_phase(s.starts_at, s.ends_at, s.grace_days)),
    'rewards', coalesce((select json_agg(json_build_object('tier', r.tier, 'track', r.track, 'kind', r.kind, 'amount', r.amount, 'item', r.item)
                          order by r.tier, r.track) from public.season_rewards r where r.season_id = s.id), '[]'::json),
    'me', case when uid is null then null else public._season_me(uid, s.id) end);
end; $fn$;
revoke execute on function public.season_state() from public;
grant execute on function public.season_state() to anon, authenticated;

-- Premium track for the season (upcoming or live). Diamonds only; admin / god pay 0 (they have premium anyway).
-- Errors: auth · banned · none (no season on sale) · owned · funds (+ need, diamonds)
create or replace function public.season_unlock() returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); p public.profiles%rowtype; s public.seasons%rowtype; sp public.season_players%rowtype;
  adm boolean; cost int;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  select * into s from public._season_pick();
  if not found or public._season_phase(s.starts_at, s.ends_at, s.grace_days) not in ('upcoming', 'live') then
    return json_build_object('ok', false, 'error', 'none');
  end if;
  insert into public.season_players (user_id, season_id) values (uid, s.id) on conflict do nothing;
  select * into sp from public.season_players where user_id = uid and season_id = s.id for update;
  if sp.premium then return json_build_object('ok', false, 'error', 'owned', 'me', public._season_me(uid, s.id)); end if;
  adm := p.role in ('admin', 'god');
  cost := case when adm then 0 else s.premium_price end;
  if p.diamonds < cost then
    return json_build_object('ok', false, 'error', 'funds', 'need', cost - p.diamonds, 'diamonds', p.diamonds);
  end if;
  if cost > 0 then perform public._dm_move(uid, -cost, 'season', 'pass_' || s.id); end if;
  update public.season_players set premium = true, premium_at = now(), updated_at = now() where user_id = uid and season_id = s.id;
  insert into public.purchases (user_id, item_id, price_bm, admin) values (uid, 'pass_' || s.id, 0, adm);
  insert into public.season_log (user_id, season_id, source, stars, detail) values (uid, s.id, 'unlock', 0, jsonb_build_object('diamonds', cost, 'admin', adm));
  return json_build_object('ok', true, 'price', cost, 'admin', adm, 'me', public._season_me(uid, s.id));
end; $fn$;
revoke execute on function public.season_unlock() from public, anon;
grant execute on function public.season_unlock() to authenticated;

-- Skip `n` tiers (1..39) for skip_price Diamonds each, live season only; free for admin / god.
-- Errors: auth · banned · none · bad · max (already at the last tier) · funds (+ need, diamonds)
create or replace function public.season_skip(n int default 1) returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); p public.profiles%rowtype; s public.seasons%rowtype; sp public.season_players%rowtype;
  adm boolean; t0 int; k int; cost int; target int;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  if n is null or n < 1 or n > 99 then return json_build_object('ok', false, 'error', 'bad'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  select * into s from public._season_pick();
  if not found or public._season_phase(s.starts_at, s.ends_at, s.grace_days) <> 'live' then return json_build_object('ok', false, 'error', 'none'); end if;
  insert into public.season_players (user_id, season_id) values (uid, s.id) on conflict do nothing;
  select * into sp from public.season_players where user_id = uid and season_id = s.id for update;
  t0 := public._season_tier(sp.stars, s.tiers, s.stars_per_tier);
  k := least(n, s.tiers - t0);
  if k <= 0 then return json_build_object('ok', false, 'error', 'max'); end if;
  adm := p.role in ('admin', 'god');
  cost := case when adm then 0 else k * s.skip_price end;
  if p.diamonds < cost then
    return json_build_object('ok', false, 'error', 'funds', 'need', cost - p.diamonds, 'diamonds', p.diamonds);
  end if;
  if cost > 0 then perform public._dm_move(uid, -cost, 'season', 'skip:' || s.id || ':' || k); end if;
  target := (t0 + k - 1) * s.stars_per_tier;                 -- the first star of tier t0 + k
  update public.season_players set stars = greatest(stars, target), updated_at = now() where user_id = uid and season_id = s.id;
  insert into public.season_log (user_id, season_id, source, stars, detail)
    values (uid, s.id, 'skip', greatest(0, target - sp.stars), jsonb_build_object('tiers', k, 'diamonds', cost, 'admin', adm));
  return json_build_object('ok', true, 'skipped', k, 'price', cost, 'tier_from', t0, 'admin', adm, 'me', public._season_me(uid, s.id));
end; $fn$;
revoke execute on function public.season_skip(int) from public, anon;
grant execute on function public.season_skip(int) to authenticated;

-- Claim one reward. Idempotent: claiming twice returns { ok: true, already: true }.
-- Errors: auth · banned · none (no season open for claims) · bad · locked (tier not reached) · premium (track locked)
create or replace function public.season_claim(p_tier int, p_track text) returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); p public.profiles%rowtype; s public.seasons%rowtype; sp public.season_players%rowtype;
  r public.season_rewards%rowtype; v_tier int; ins int; g jsonb; a record;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p_track is null or p_track not in ('free', 'premium') or p_tier is null then return json_build_object('ok', false, 'error', 'bad'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  select * into s from public._season_pick();
  if not found or public._season_phase(s.starts_at, s.ends_at, s.grace_days) not in ('live', 'grace') then return json_build_object('ok', false, 'error', 'none'); end if;
  select * into r from public.season_rewards x where x.season_id = s.id and x.tier = p_tier and x.track = p_track;
  if not found then return json_build_object('ok', false, 'error', 'bad'); end if;
  insert into public.season_players (user_id, season_id) values (uid, s.id) on conflict do nothing;
  select * into sp from public.season_players where user_id = uid and season_id = s.id;
  v_tier := public._season_tier(sp.stars, s.tiers, s.stars_per_tier);
  if p_tier > v_tier then return json_build_object('ok', false, 'error', 'locked', 'tier', v_tier); end if;
  if p_track = 'premium' and not (sp.premium or p.role in ('admin', 'god')) then return json_build_object('ok', false, 'error', 'premium'); end if;

  insert into public.season_claims (user_id, season_id, tier, track) values (uid, s.id, p_tier, p_track)
    on conflict do nothing returning tier into ins;
  if ins is null then return json_build_object('ok', true, 'already', true, 'tier', p_tier, 'track', p_track, 'me', public._season_me(uid, s.id)); end if;
  g := public._season_grant(uid, r);
  update public.season_claims set reward = g where user_id = uid and season_id = s.id and tier = p_tier and track = p_track;
  select * into a from public._ach_sync(uid);
  return json_build_object('ok', true, 'tier', p_tier, 'track', p_track, 'reward', g,
    'granted', coalesce(a.granted, '{}'), 'granted_bm', coalesce(a.granted_bm, 0), 'me', public._season_me(uid, s.id));
end; $fn$;
revoke execute on function public.season_claim(int, text) from public, anon;
grant execute on function public.season_claim(int, text) to authenticated;

-- Claim everything that is ready (both tracks, in tier order). { ok, rewards: [...], me }
create or replace function public.season_claim_all() returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); p public.profiles%rowtype; s public.seasons%rowtype; sp public.season_players%rowtype;
  r public.season_rewards%rowtype; v_tier int; prem boolean; ins int; g jsonb; out jsonb := '[]'::jsonb; a record;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  select * into s from public._season_pick();
  if not found or public._season_phase(s.starts_at, s.ends_at, s.grace_days) not in ('live', 'grace') then return json_build_object('ok', false, 'error', 'none'); end if;
  insert into public.season_players (user_id, season_id) values (uid, s.id) on conflict do nothing;
  select * into sp from public.season_players where user_id = uid and season_id = s.id;
  v_tier := public._season_tier(sp.stars, s.tiers, s.stars_per_tier);
  prem := sp.premium or p.role in ('admin', 'god');
  for r in select x.* from public.season_rewards x
            where x.season_id = s.id and x.tier <= v_tier and (x.track = 'free' or prem)
              and not exists (select 1 from public.season_claims c where c.user_id = uid and c.season_id = s.id and c.tier = x.tier and c.track = x.track)
            order by x.tier, x.track
  loop
    ins := null;
    insert into public.season_claims (user_id, season_id, tier, track) values (uid, s.id, r.tier, r.track)
      on conflict do nothing returning tier into ins;
    continue when ins is null;
    g := public._season_grant(uid, r);
    update public.season_claims set reward = g where user_id = uid and season_id = s.id and tier = r.tier and track = r.track;
    out := out || jsonb_build_array(g);
  end loop;
  select * into a from public._ach_sync(uid);
  return json_build_object('ok', true, 'rewards', out, 'granted', coalesce(a.granted, '{}'), 'granted_bm', coalesce(a.granted_bm, 0),
    'me', public._season_me(uid, s.id));
end; $fn$;
revoke execute on function public.season_claim_all() from public, anon;
grant execute on function public.season_claim_all() to authenticated;

-- Owner / tester tools (admin + god, own account only): 'stars' adds `amount` stars (no caps), 'reset' wipes this
-- season's stars, claims and premium flag.
create or replace function public.season_god(action text, amount int default 0) returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); s public.seasons%rowtype;
begin
  if not public.is_privileged() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into s from public._season_pick();
  if not found then return json_build_object('ok', false, 'error', 'none'); end if;
  if action = 'stars' then
    if amount is null or amount = 0 or abs(amount) > 10000 then return json_build_object('ok', false, 'error', 'bad'); end if;
    insert into public.season_players (user_id, season_id) values (uid, s.id) on conflict do nothing;
    update public.season_players set stars = greatest(0, stars + amount), updated_at = now() where user_id = uid and season_id = s.id;
    insert into public.season_log (user_id, season_id, source, stars) values (uid, s.id, 'god', amount);
  elsif action = 'reset' then
    delete from public.season_claims where user_id = uid and season_id = s.id;
    delete from public.season_players where user_id = uid and season_id = s.id;
  else
    return json_build_object('ok', false, 'error', 'bad');
  end if;
  return json_build_object('ok', true, 'me', public._season_me(uid, s.id));
end; $fn$;
revoke execute on function public.season_god(text, int) from public, anon;
grant execute on function public.season_god(text, int) to authenticated;
