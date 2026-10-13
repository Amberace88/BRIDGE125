-- Bridge 125 · 014 — Daily challenge ("Dienas izaicinājums") + Invite friends (referrals)
--
-- Run once in the Supabase SQL editor after 001–013 (safe to re-run: "if not exists" / "create or replace" / upserts).
-- Keep in sync with src/daily/config.ts (SCORE, REWARDS, LIMITS) and src/referral/config.ts (REFERRAL) — unit tests in
-- src/daily/daily.test.ts compare them.
--
-- Design rules (same as 003/011/012)
--   * Every write is a SECURITY DEFINER function with `set search_path = ''` and `(select auth.uid())`.
--   * The client never sends an amount: rewards live here. Banned players get nothing. The day is Europe/Riga.
--   * Does NOT redefine record_game / record_game_plus: the referral reward hooks in with an AFTER UPDATE OF
--     games_played trigger on profiles, so it fires from every recording path (bots, rooms, stakes, journey) and
--     cannot clash with other migrations that wrap record_game.
--
-- DAILY CHALLENGE
--   Everyone plays the same seeded deal (3 rounds, 3 hard bots). The game runs in the browser, so the result is
--   client-reported; the server validates what it can:
--   * challenge_submit(day, score, turns, won, details): day = today (Riga) — or yesterday during the first 20 min after
--     midnight for a game that started before it; one scored row per player per day (admin/god may overwrite theirs for
--     testing, rewards still once); every value in range; impossible combinations rejected (0 points but lost, every
--     round won but points left, more rounds won than played…); the score is recomputed here and must match.
--   * Rewards: REWARDS.play on the first scored attempt of the day; once the day is closed, challenge_claim() pays the
--     final-rank bonus (1st / top 10 / top 10 %) exactly once per row. Bounded per player per day.
--   * challenge_board(day, lim): top N + the caller's own row (is_me) + total — readable by anon.
--
-- REFERRALS
--   * referral_code(device): the caller's stable invite code (6 chars, created once, stored) + stats.
--   * referral_claim(code, device): called by a NEW account (≤ 7 days old, < 3 games) right after sign-up. Rejected:
--     own code, already claimed, unknown code, a device id already used by another referral or by another account's
--     invite code (one device = one invited account), more than 20 claims per referrer per day.
--   * Reward: when the invitee's games_played reaches 3, both get 2 000 BM + the invite-only frame `ach_fr_envoy`
--     (earn-only: shop_items price null). The referrer's BM is capped at 50 rewarded friends (the frame always).
--   * referral_peek(code): the referrer's display name for the "your friend X invited you" welcome (anon-readable).

-- ======================================================================= DAILY: results
create table if not exists public.daily_challenge_results (
  user_id       uuid not null references auth.users(id) on delete cascade,
  day           date not null,
  score         int  not null check (score between 0 and 5000),
  turns         int  not null check (turns between 1 and 300),
  won           boolean not null,
  details       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  play_bm       int  not null default 0,
  play_xp       int  not null default 0,
  final_claimed boolean not null default false,
  final_rank    int,
  final_bm      int  not null default 0,
  final_xp      int  not null default 0,
  primary key (user_id, day)
);
create index if not exists daily_challenge_board_idx on public.daily_challenge_results (day, score desc, turns asc, created_at asc);
alter table public.daily_challenge_results enable row level security;
drop policy if exists daily_challenge_select_own on public.daily_challenge_results;
create policy daily_challenge_select_own on public.daily_challenge_results for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.daily_challenge_results from anon, authenticated;
grant select on public.daily_challenge_results to authenticated;

-- ======================================================================= DAILY: rules (keep in sync with src/daily/config.ts)
-- score = 1000 + 500 if won + 150 per round won − 5 per point − 2 per turn − 40 per Q♠ taken, never below 0
create or replace function public._daily_score(won boolean, rounds_won int, points int, turns int, queens int) returns int
language sql immutable set search_path = '' as $fn$
  select greatest(0, 1000 + case when won then 500 else 0 end + 150 * rounds_won - 5 * points - 2 * turns - 40 * queens);
$fn$;

-- REWARDS: play = first scored attempt of the day; top1 / top10 / top10pct = final rank once the day is closed
create or replace function public._daily_rewards() returns jsonb
language sql immutable set search_path = '' as $fn$
  select '{"play":{"bm":150,"xp":50},"top1":{"bm":2500,"xp":400},"top10":{"bm":800,"xp":150},"top10pct":{"bm":300,"xp":80}}'::jsonb;
$fn$;

-- a whole number from a jsonb object, or null
create or replace function public._jint(j jsonb, k text) returns int
language sql immutable set search_path = '' as $fn$
  select case when jsonb_typeof(j -> k) = 'number' and (j ->> k)::numeric = floor((j ->> k)::numeric)
              and abs((j ->> k)::numeric) < 100000 then (j ->> k)::int end;
$fn$;

-- rank of one row within its day (score ↓, turns ↑, earlier first); banned players are not ranked
create or replace function public._daily_rank(v_day date, uid uuid, out rk int, out total int)
language sql stable security definer set search_path = '' as $fn$
  with b as (
    select r.user_id, row_number() over (order by r.score desc, r.turns asc, r.created_at asc) as n
      from public.daily_challenge_results r join public.profiles p on p.id = r.user_id
     where r.day = v_day and not p.banned
  )
  select (select n::int from b where b.user_id = uid), (select count(*)::int from b);
$fn$;

revoke execute on function public._daily_score(boolean, int, int, int, int) from public, anon, authenticated;
revoke execute on function public._daily_rewards() from public, anon, authenticated;
revoke execute on function public._jint(jsonb, text) from public, anon, authenticated;
revoke execute on function public._daily_rank(date, uuid) from public, anon, authenticated;

-- ======================================================================= DAILY: submit
create or replace function public.challenge_submit(day date, score int, turns int, won boolean, details jsonb) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  today date := public.riga_today();
  riga_now timestamp := now() at time zone 'Europe/Riga';
  rw jsonb := public._daily_rewards();
  v_points int; v_rw int; v_rounds int; v_q int; v_score int;
  inserted boolean := false; g json; rk record; prev public.daily_challenge_results%rowtype;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;

  if challenge_submit.day is null or not (challenge_submit.day = today
      or (challenge_submit.day = today - 1 and riga_now < today + interval '20 minutes')) then
    return json_build_object('ok', false, 'error', 'day', 'today', today);
  end if;
  if details is null or jsonb_typeof(details) <> 'object' or pg_column_size(details) > 1000 then
    return json_build_object('ok', false, 'error', 'bad');
  end if;
  v_points := public._jint(details, 'points'); v_rw := public._jint(details, 'roundsWon');
  v_rounds := public._jint(details, 'rounds');  v_q  := public._jint(details, 'queens');
  if challenge_submit.won is null or challenge_submit.turns is null or challenge_submit.score is null
     or v_points is null or v_rw is null or v_rounds is null or v_q is null then
    return json_build_object('ok', false, 'error', 'bad');
  end if;
  -- ranges (LIMITS in src/daily/config.ts) and impossible combinations
  if challenge_submit.turns < 1 or challenge_submit.turns > 300 or v_points < 0 or v_points > 600
     or v_rounds < 1 or v_rounds > 3 or v_rw < 0 or v_rw > v_rounds or v_q < 0 or v_q > 20
     or challenge_submit.turns < v_rw                                  -- going out takes at least one turn per round
     or (v_points = 0 and not challenge_submit.won)                    -- 0 points is always the lowest total
     or (v_rw = v_rounds and v_points > 0) then                        -- went out every round → nothing ever added
    return json_build_object('ok', false, 'error', 'impossible');
  end if;
  v_score := public._daily_score(challenge_submit.won, v_rw, v_points, challenge_submit.turns, v_q);
  if v_score <> challenge_submit.score then return json_build_object('ok', false, 'error', 'mismatch', 'score', v_score); end if;

  insert into public.daily_challenge_results (user_id, day, score, turns, won, details)
  values (uid, challenge_submit.day, v_score, challenge_submit.turns, challenge_submit.won,
          jsonb_build_object('points', v_points, 'roundsWon', v_rw, 'rounds', v_rounds, 'queens', v_q))
  on conflict on constraint daily_challenge_results_pkey do nothing
  returning true into inserted;
  inserted := coalesce(inserted, false);

  if not inserted then
    select * into prev from public.daily_challenge_results r where r.user_id = uid and r.day = challenge_submit.day;
    if not public.is_privileged() or prev.final_claimed then
      select * into rk from public._daily_rank(challenge_submit.day, uid);
      return json_build_object('ok', false, 'error', 'done', 'score', prev.score, 'turns', prev.turns, 'won', prev.won,
        'rank', rk.rk, 'total', rk.total);
    end if;
    -- owner / co-author testing: overwrite today's row, never pay twice
    update public.daily_challenge_results r set score = v_score, turns = challenge_submit.turns, won = challenge_submit.won,
        details = jsonb_build_object('points', v_points, 'roundsWon', v_rw, 'rounds', v_rounds, 'queens', v_q), created_at = now()
     where r.user_id = uid and r.day = challenge_submit.day;
  else
    update public.daily_challenge_results r set play_bm = (rw #>> '{play,bm}')::int, play_xp = (rw #>> '{play,xp}')::int
     where r.user_id = uid and r.day = challenge_submit.day;
    g := public._grant_xp_bm(uid, (rw #>> '{play,xp}')::int, (rw #>> '{play,bm}')::int);
    perform public._econ_log(uid, 'daily_play', (rw #>> '{play,bm}')::bigint, jsonb_build_object('day', challenge_submit.day, 'score', v_score));
  end if;

  select * into rk from public._daily_rank(challenge_submit.day, uid);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'first', inserted, 'day', challenge_submit.day, 'score', v_score, 'rank', rk.rk, 'total', rk.total,
    'reward', case when inserted then json_build_object('bm', (rw #>> '{play,bm}')::int, 'xp', (rw #>> '{play,xp}')::int,
      'level_from', g -> 'level_from', 'level', g -> 'level', 'level_bm', g -> 'level_bm') end,
    'bm', p.bm, 'xp', p.xp, 'level', p.level);
end; $fn$;
revoke execute on function public.challenge_submit(date, int, int, boolean, jsonb) from public, anon;
grant execute on function public.challenge_submit(date, int, int, boolean, jsonb) to authenticated;

-- ======================================================================= DAILY: leaderboard (anon-readable)
create or replace function public.challenge_board(day date default null, lim int default 50)
returns table (rank bigint, username text, score int, turns int, won boolean, avatar text, avatar_url text, frame text,
               role text, is_me boolean, total bigint)
language sql stable security definer set search_path = '' as $fn$
  with d as (select coalesce(challenge_board.day, public.riga_today()) as v),
  b as (
    select row_number() over (order by r.score desc, r.turns asc, r.created_at asc) as rk,
           coalesce(nullif(btrim(p.username), ''), 'Player') as uname, r.score, r.turns, r.won,
           p.avatar, p.avatar_url, p.frame, p.role, p.id = (select auth.uid()) as me
      from public.daily_challenge_results r join public.profiles p on p.id = r.user_id, d
     where r.day = d.v and not p.banned
  ), n as (select count(*) as c from b)
  select b.rk, b.uname, b.score, b.turns, b.won, b.avatar, b.avatar_url, b.frame, b.role, b.me, n.c
    from b, n
   where b.rk <= least(greatest(coalesce(lim, 50), 1), 100) or b.me
   order by b.rk;
$fn$;
revoke execute on function public.challenge_board(date, int) from public;
grant execute on function public.challenge_board(date, int) to anon, authenticated;

-- ======================================================================= DAILY: final-rank rewards for closed days
-- Pays every unclaimed closed day of the last 14 (1st → top1, rank ≤ 10 → top10, rank ≤ ceil(10 %) → top10pct).
create or replace function public.challenge_claim() returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  today date := public.riga_today();
  riga_now timestamp := now() at time zone 'Europe/Riga';
  rw jsonb := public._daily_rewards();
  r public.daily_challenge_results%rowtype; rk record; tier text; v_bm int; v_xp int;
  tot_bm int := 0; tot_xp int := 0; items jsonb := '[]'::jsonb; g json;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  for r in select * from public.daily_challenge_results x
            where x.user_id = uid and not x.final_claimed and x.day >= today - 14
              and (x.day < today - 1 or (x.day = today - 1 and riga_now >= today + interval '20 minutes'))
            order by x.day for update loop
    select * into rk from public._daily_rank(r.day, uid);
    tier := case when rk.rk = 1 then 'top1' when rk.rk <= 10 then 'top10'
                 when rk.rk <= ceil(rk.total * 0.10) then 'top10pct' end;
    v_bm := coalesce((rw -> tier ->> 'bm')::int, 0); v_xp := coalesce((rw -> tier ->> 'xp')::int, 0);
    update public.daily_challenge_results x set final_claimed = true, final_rank = rk.rk, final_bm = v_bm, final_xp = v_xp
     where x.user_id = uid and x.day = r.day;
    if v_bm > 0 or v_xp > 0 then
      tot_bm := tot_bm + v_bm; tot_xp := tot_xp + v_xp;
      perform public._econ_log(uid, 'daily_rank', v_bm, jsonb_build_object('day', r.day, 'rank', rk.rk, 'total', rk.total, 'tier', tier));
    end if;
    items := items || jsonb_build_object('day', r.day, 'rank', rk.rk, 'total', rk.total, 'tier', tier, 'bm', v_bm, 'xp', v_xp, 'score', r.score);
  end loop;
  if tot_bm > 0 or tot_xp > 0 then g := public._grant_xp_bm(uid, tot_xp, tot_bm); end if;
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'days', items, 'reward', json_build_object('bm', tot_bm, 'xp', tot_xp,
      'level_from', g -> 'level_from', 'level', g -> 'level', 'level_bm', g -> 'level_bm'),
    'bm', p.bm, 'xp', p.xp, 'level', p.level);
end; $fn$;
revoke execute on function public.challenge_claim() from public, anon;
grant execute on function public.challenge_claim() to authenticated;

-- ======================================================================= REFERRALS: tables
create table if not exists public.referral_codes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  code       text not null unique check (code ~ '^[A-Z2-9]{6,8}$'),
  device     text check (device is null or char_length(device) <= 64),
  created_at timestamptz not null default now()
);
create index if not exists referral_codes_device_idx on public.referral_codes (device) where device is not null;
alter table public.referral_codes enable row level security;   -- no policies: only the functions below touch it
revoke all on public.referral_codes from anon, authenticated;

create table if not exists public.referrals (
  invitee     uuid primary key references auth.users(id) on delete cascade,
  referrer    uuid not null references auth.users(id) on delete cascade,
  code        text not null,
  device      text check (device is null or char_length(device) <= 64),
  status      text not null default 'pending' check (status in ('pending', 'rewarded')),
  claimed_at  timestamptz not null default now(),
  rewarded_at timestamptz,
  check (invitee <> referrer)
);
create index if not exists referrals_referrer_idx on public.referrals (referrer, claimed_at desc);
create index if not exists referrals_device_idx on public.referrals (device) where device is not null;
alter table public.referrals enable row level security;
revoke all on public.referrals from anon, authenticated;

-- The invite-only frame (earned, never sold). price_bm null → the 008 ownership trigger refuses to equip it unless owned.
insert into public.shop_items (id, kind, price_bm, price_eur, grants_bm, rarity, active, sort, grants) values
  ('ach_fr_envoy', 'frame', null, null, null, 'legendary', true, 912, null)
on conflict (id) do update set kind = excluded.kind, price_bm = null, rarity = excluded.rarity, active = excluded.active, sort = excluded.sort;

-- REFERRAL (keep in sync with src/referral/config.ts)
create or replace function public._referral_cfg() returns jsonb
language sql immutable set search_path = '' as $fn$
  select '{"bm":2000,"games":3,"item":"ach_fr_envoy","max_age_days":7,"cap":50,"daily_claims":20}'::jsonb;
$fn$;
revoke execute on function public._referral_cfg() from public, anon, authenticated;

-- ======================================================================= REFERRALS: reward (internal)
create or replace function public._referral_reward(uid uuid) returns void
language plpgsql security definer set search_path = '' as $fn$
declare
  cfg jsonb := public._referral_cfg();
  r public.referrals%rowtype; gp int; v_bm int := (cfg ->> 'bm')::int; v_item text := cfg ->> 'item'; n int;
begin
  select * into r from public.referrals x where x.invitee = uid and x.status = 'pending' for update;
  if not found then return; end if;
  select p.games_played into gp from public.profiles p where p.id = uid and not p.banned;
  if gp is null or gp < (cfg ->> 'games')::int then return; end if;
  update public.referrals x set status = 'rewarded', rewarded_at = now() where x.invitee = uid;
  -- the new player
  update public.profiles set bm = bm + v_bm, owned = case when v_item = any(owned) then owned else owned || v_item end where id = uid;
  perform public._econ_log(uid, 'referral', v_bm, jsonb_build_object('role', 'invitee', 'friend', r.referrer));
  -- the friend who invited them (BM capped, the frame always)
  select count(*) into n from public.referrals x where x.referrer = r.referrer and x.status = 'rewarded';
  update public.profiles set bm = bm + case when n <= (cfg ->> 'cap')::int then v_bm else 0 end,
         owned = case when v_item = any(owned) then owned else owned || v_item end
   where id = r.referrer and not banned;
  perform public._econ_log(r.referrer, 'referral', case when n <= (cfg ->> 'cap')::int then v_bm else 0 end,
    jsonb_build_object('role', 'referrer', 'friend', uid));
end; $fn$;
revoke execute on function public._referral_reward(uuid) from public, anon, authenticated;

-- fires from every recording path (record_game and everything wrapping it); _referral_reward only acts on a pending
-- referral whose invitee has reached the game target (a primary-key lookup otherwise)
create or replace function public._referral_on_games() returns trigger
language plpgsql security definer set search_path = '' as $fn$
begin
  perform public._referral_reward(new.id);
  return null;
end; $fn$;
revoke execute on function public._referral_on_games() from public, anon, authenticated;
drop trigger if exists profiles_referral_reward on public.profiles;
create trigger profiles_referral_reward after update of games_played on public.profiles
  for each row when (new.games_played > old.games_played) execute function public._referral_on_games();

-- ======================================================================= REFERRALS: client RPCs
-- The caller's invite code (created once, stable) + who joined with it + who invited the caller.
create or replace function public.referral_code(device text default null) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  cfg jsonb := public._referral_cfg();
  abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c public.referral_codes%rowtype; v_code text; i int; tries int := 0; v_dev text;
  me public.profiles%rowtype; inv json;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into me from public.profiles where id = uid;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  v_dev := nullif(left(btrim(coalesce(referral_code.device, '')), 64), '');
  select * into c from public.referral_codes x where x.user_id = uid;
  while not found and tries < 8 loop
    v_code := '';
    for i in 1 .. 6 loop v_code := v_code || substr(abc, 1 + floor(random() * 32)::int, 1); end loop;
    begin
      insert into public.referral_codes (user_id, code, device) values (uid, v_code, v_dev);
    exception when unique_violation then null;
    end;
    select * into c from public.referral_codes x where x.user_id = uid;
    tries := tries + 1;
  end loop;
  if c.user_id is null then return json_build_object('ok', false, 'error', 'busy'); end if;
  if c.device is null and v_dev is not null then update public.referral_codes x set device = v_dev where x.user_id = uid; end if;

  select json_build_object('name', coalesce(nullif(btrim(p.username), ''), 'Player'), 'status', r.status,
           'games', least(me.games_played, (cfg ->> 'games')::int), 'target', (cfg ->> 'games')::int)
    into inv
    from public.referrals r join public.profiles p on p.id = r.referrer where r.invitee = uid;

  return json_build_object('ok', true, 'code', c.code,
    'joined', (select count(*) from public.referrals r where r.referrer = uid),
    'rewarded', (select count(*) from public.referrals r where r.referrer = uid and r.status = 'rewarded'),
    'bm_earned', (select coalesce(sum(l.bm_delta), 0) from public.economy_log l where l.user_id = uid and l.kind = 'referral'
                    and l.detail ->> 'role' = 'referrer'),
    'friends', coalesce((select json_agg(f order by f.at desc) from (
        select coalesce(nullif(btrim(p.username), ''), 'Player') as name, p.avatar, p.avatar_url, r.status,
               least(p.games_played, (cfg ->> 'games')::int) as games, r.claimed_at as at
          from public.referrals r join public.profiles p on p.id = r.invitee
         where r.referrer = uid order by r.claimed_at desc limit 20) f), '[]'::json),
    'invited_by', inv,
    'reward', json_build_object('bm', (cfg ->> 'bm')::int, 'games', (cfg ->> 'games')::int, 'item', cfg ->> 'item'));
end; $fn$;
revoke execute on function public.referral_code(text) from public, anon;
grant execute on function public.referral_code(text) to authenticated;

-- Who owns this code (for the welcome card before sign-up). Only the display name is revealed.
create or replace function public.referral_peek(code text) returns json
language sql stable security definer set search_path = '' as $fn$
  select case when p.id is null then json_build_object('ok', false)
              else json_build_object('ok', true, 'name', coalesce(nullif(btrim(p.username), ''), 'Player'),
                     'reward', json_build_object('bm', (public._referral_cfg() ->> 'bm')::int, 'games', (public._referral_cfg() ->> 'games')::int,
                                                 'item', public._referral_cfg() ->> 'item')) end
    from (select 1) one
    left join public.referral_codes c on c.code = upper(btrim(coalesce(referral_peek.code, '')))
    left join public.profiles p on p.id = c.user_id and not p.banned;
$fn$;
revoke execute on function public.referral_peek(text) from public;
grant execute on function public.referral_peek(text) to anon, authenticated;

-- A new account says who invited it. Idempotent: a second call answers 'claimed' with the existing link.
create or replace function public.referral_claim(code text, device text default null) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  cfg jsonb := public._referral_cfg();
  me public.profiles%rowtype; c public.referral_codes%rowtype; v_code text; v_dev text; v_name text;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into me from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if me.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  if exists (select 1 from public.referrals r where r.invitee = uid) then return json_build_object('ok', false, 'error', 'claimed'); end if;

  v_code := upper(btrim(coalesce(referral_claim.code, '')));
  v_dev := nullif(left(btrim(coalesce(referral_claim.device, '')), 64), '');
  select * into c from public.referral_codes x where x.code = v_code;
  if not found then return json_build_object('ok', false, 'error', 'unknown'); end if;
  if c.user_id = uid then return json_build_object('ok', false, 'error', 'self'); end if;
  select coalesce(nullif(btrim(p.username), ''), 'Player') into v_name from public.profiles p where p.id = c.user_id and not p.banned;
  if v_name is null then return json_build_object('ok', false, 'error', 'unknown'); end if;
  -- only brand-new players can be invited
  if me.created_at < now() - make_interval(days => (cfg ->> 'max_age_days')::int) or me.games_played >= (cfg ->> 'games')::int then
    return json_build_object('ok', false, 'error', 'old');
  end if;
  -- one device = one invited account; the inviter's own device / another account's device can't be invited
  if v_dev is not null and (
       exists (select 1 from public.referrals r where r.device = v_dev)
    or exists (select 1 from public.referral_codes x where x.device = v_dev and x.user_id <> uid)) then
    return json_build_object('ok', false, 'error', 'device');
  end if;
  if (select count(*) from public.referrals r where r.referrer = c.user_id and r.claimed_at > now() - interval '1 day')
       >= (cfg ->> 'daily_claims')::int then
    return json_build_object('ok', false, 'error', 'limit');
  end if;

  insert into public.referrals (invitee, referrer, code, device) values (uid, c.user_id, c.code, v_dev);
  return json_build_object('ok', true, 'name', v_name, 'games', me.games_played, 'target', (cfg ->> 'games')::int,
    'reward', json_build_object('bm', (cfg ->> 'bm')::int, 'games', (cfg ->> 'games')::int, 'item', cfg ->> 'item'));
end; $fn$;
revoke execute on function public.referral_claim(text, text) from public, anon;
grant execute on function public.referral_claim(text, text) to authenticated;
