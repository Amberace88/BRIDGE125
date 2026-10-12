-- Bridge 125 · 007 — "god" role (co-author / main tester), owner test tools, admin email confirm, real leaderboard

-- roles: player | admin (super admin, owner) | god (co-author & main tester)
alter table public.profiles drop constraint if exists profiles_role_chk;
alter table public.profiles add constraint profiles_role_chk check (role in ('player', 'admin', 'god'));

create or replace function public.is_privileged() returns boolean
language sql stable security definer set search_path = '' as $fn$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'god'));
$fn$;
grant execute on function public.is_privileged() to authenticated;

-- ---------------------------------------------------------------- god / owner test tools
-- All of these only ever touch the CALLER's own profile and only for admin/god.
create or replace function public.god_tools(action text, amount bigint default 0) returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); r json; all_items text[];
begin
  if not public.is_privileged() then raise exception 'forbidden' using errcode = '42501'; end if;
  if action = 'topup' then
    if amount is null or amount < 1 or amount > 1000000 then raise exception 'amount 1..1000000'; end if;
    update public.profiles set bm = least(bm + amount, 999999999) where id = uid;
  elsif action = 'set_bm' then
    if amount is null or amount < 0 or amount > 999999999 then raise exception 'bad amount'; end if;
    update public.profiles set bm = amount where id = uid;
  elsif action = 'unlock_all' then
    select coalesce(array_agg(id), '{}') into all_items from public.shop_items;
    update public.profiles set owned = (select array(select distinct unnest(owned || all_items))) where id = uid;
  elsif action = 'reset_owned' then
    update public.profiles set owned = '{}' where id = uid;
  elsif action = 'add_xp' then
    if amount is null or amount < 1 or amount > 1000000 then raise exception 'amount 1..1000000'; end if;
    update public.profiles set xp = xp + amount::int, level = public.level_for_xp(xp + amount::int) where id = uid;
  elsif action = 'reset_daily' then
    update public.profiles set last_daily = null where id = uid;
  elsif action = 'reset_progress' then
    update public.profiles set xp = 0, level = 1, streak = 0, last_daily = null, achievements = '{}', win_streak = 0,
           best_win_streak = 0, games_played = 0, wins = 0, reward_games = 0, last_game_at = null where id = uid;
  elsif action = 'unlock_achievements' then
    update public.profiles set achievements = (select coalesce(array_agg(code), '{}') from public.achievement_defs) where id = uid;
  else
    raise exception 'unknown action';
  end if;
  insert into public.events (name, anon_id, user_id, props)
    values ('god_tool', 'god', uid, json_build_object('action', action, 'amount', amount)::jsonb);
  select json_build_object('bm', bm, 'xp', xp, 'level', level, 'owned', owned, 'achievements', achievements, 'streak', streak)
    into r from public.profiles where id = uid;
  return r;
end; $fn$;
revoke execute on function public.god_tools(text, bigint) from public, anon;
grant execute on function public.god_tools(text, bigint) to authenticated;

-- ---------------------------------------------------------------- admin: confirm a stuck sign-up, users list with more info
create or replace function public.admin_confirm_email(uid uuid) returns boolean
language plpgsql security definer set search_path = '' as $fn$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = uid;
  insert into public.events (name, anon_id, user_id, props)
    values ('admin_action', 'admin', (select auth.uid()), json_build_object('target', uid, 'confirm_email', true)::jsonb);
  return found;
end; $fn$;
revoke execute on function public.admin_confirm_email(uuid) from public, anon;
grant execute on function public.admin_confirm_email(uuid) to authenticated;

drop function if exists public.admin_users(text, int, int);
create or replace function public.admin_users(q text default '', lim int default 50, off int default 0)
returns table (id uuid, email text, username text, role text, banned boolean, bm bigint, games_played int, wins int,
               created_at timestamptz, last_sign_in_at timestamptz, last_seen_at timestamptz, confirmed boolean,
               level int, avatar text, avatar_url text, total bigint)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.username, p.role, p.banned, p.bm, p.games_played, p.wins,
           p.created_at, u.last_sign_in_at, p.last_seen_at, u.email_confirmed_at is not null,
           p.level, p.avatar, p.avatar_url, count(*) over () as total
      from public.profiles p join auth.users u on u.id = p.id
     where coalesce(q, '') = '' or u.email ilike '%' || q || '%' or p.username ilike '%' || q || '%'
     order by p.created_at desc
     limit least(greatest(lim, 1), 500) offset greatest(off, 0);
end; $fn$;
revoke execute on function public.admin_users(text, int, int) from public, anon;
grant execute on function public.admin_users(text, int, int) to authenticated;

-- admins may also grant the god role
create or replace function public.admin_update_user(uid uuid, add_bm bigint default null, set_banned boolean default null, set_role text default null)
returns json language plpgsql security definer set search_path = '' as $fn$
declare r json;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if uid = (select auth.uid()) and (set_banned is true or (set_role is not null and set_role <> 'admin')) then raise exception 'cannot demote or ban yourself'; end if;
  if set_role is not null and set_role not in ('player', 'admin', 'god') then raise exception 'bad role'; end if;
  update public.profiles set
      bm = greatest(0, bm + coalesce(add_bm, 0)),
      banned = coalesce(set_banned, banned),
      role = coalesce(set_role, role)
   where id = uid
   returning json_build_object('bm', bm, 'banned', banned, 'role', role) into r;
  insert into public.events (name, anon_id, user_id, props)
    values ('admin_action', 'admin', (select auth.uid()), json_build_object('target', uid, 'add_bm', add_bm, 'banned', set_banned, 'role', set_role)::jsonb);
  return r;
end; $fn$;

-- ---------------------------------------------------------------- real leaderboard
-- kind: 'wins' (all time) | 'week' (wins in the last 7 days) | 'bm' | 'level'
-- Every registered, non-banned player is ranked (players with no games appear after those with games).
drop function if exists public.leaderboard2(text, int);
create or replace function public.leaderboard2(kind text default 'wins', lim int default 50)
returns table (rank bigint, username text, wins int, games_played int, bm bigint, level int, week_wins int,
               avatar text, avatar_url text, role text, is_me boolean)
language sql stable security definer set search_path = '' as $fn$
  with wk as (
    select e.user_id, count(*)::int as w
      from public.events e
     where e.name = 'game_end' and e.at >= now() - interval '7 days' and e.user_id is not null and (e.props->>'won') = 'true'
     group by e.user_id
  ), base as (
    select p.id, coalesce(nullif(btrim(p.username), ''), 'Player') as uname, p.wins, p.games_played, p.bm, p.level,
           coalesce(wk.w, 0) as week_wins, p.avatar, p.avatar_url, p.role, p.created_at,
           p.id = (select auth.uid()) as me
      from public.profiles p left join wk on wk.user_id = p.id
     where not p.banned
  ), ranked as (
    select row_number() over (order by
             case kind when 'bm' then b.bm when 'level' then b.level when 'week' then b.week_wins else b.wins end desc,
             case kind when 'level' then b.bm else b.wins end desc,
             b.games_played desc, b.created_at asc) as rk, b.*
      from base b
  )
  select rk, uname, wins, games_played, bm, level, week_wins, avatar, avatar_url, role, me from ranked
   where rk <= least(greatest(lim, 1), 100) or me
   order by rk;
$fn$;
revoke execute on function public.leaderboard2(text, int) from public;
grant execute on function public.leaderboard2(text, int) to anon, authenticated;
