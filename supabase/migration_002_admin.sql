-- Bridge 125 · 002 — roles, cosmetics, analytics events, admin RPCs

alter table public.profiles add column if not exists role text not null default 'player';
alter table public.profiles add column if not exists banned boolean not null default false;
alter table public.profiles add column if not exists card_back text not null default 'match';
alter table public.profiles add column if not exists avatar text;
alter table public.profiles add column if not exists owned text[] not null default '{}';
alter table public.profiles add column if not exists last_seen_at timestamptz;
do $$ begin
  alter table public.profiles add constraint profiles_role_chk check (role in ('player', 'admin'));
exception when duplicate_object then null; end $$;
grant update (card_back, avatar) on public.profiles to authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $fn$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$fn$;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------- analytics events
create table if not exists public.events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  name text not null,
  anon_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  props jsonb not null default '{}'::jsonb
);
create index if not exists events_at_idx on public.events (at);
create index if not exists events_name_at_idx on public.events (name, at);
alter table public.events enable row level security;   -- no policies: only security-definer functions touch it
revoke all on public.events from anon, authenticated;

create or replace function public.track(ev text, anon text, props jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid());
begin
  if ev is null or ev !~ '^[a-z_]{2,40}$' or anon is null or char_length(anon) > 64 then return; end if;
  if props is null or pg_column_size(props) > 2000 then props := '{}'::jsonb; end if;
  insert into public.events (name, anon_id, user_id, props) values (ev, anon, uid, props);
  if uid is not null then update public.profiles set last_seen_at = now() where id = uid; end if;
end; $fn$;
revoke execute on function public.track(text, text, jsonb) from public;
grant execute on function public.track(text, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------- bans respected everywhere
create or replace function public.record_game(won boolean) returns json
language plpgsql security definer set search_path = '' as $fn$
declare r json;
begin
  update public.profiles set games_played = games_played + 1, wins = wins + case when won then 1 else 0 end,
         bm = bm + case when won then 100 else 10 end
   where id = (select auth.uid()) and not banned
   returning json_build_object('games_played', games_played, 'wins', wins, 'bm', bm) into r;
  return r;
end; $fn$;

create or replace function public.leaderboard(lim int default 50)
returns table (rank bigint, username text, wins int, games_played int, bm bigint, is_me boolean)
language sql stable security definer set search_path = '' as $fn$
  with ranked as (
    select row_number() over (order by p.wins desc, p.games_played asc, p.created_at asc) as rk,
           coalesce(nullif(btrim(p.username), ''), 'Player') as uname, p.wins, p.games_played, p.bm,
           p.id = (select auth.uid()) as me
      from public.profiles p
     where p.games_played > 0 and not p.banned
  )
  select rk, uname, wins, games_played, bm, me from ranked
   where rk <= least(greatest(lim, 1), 100) or me
   order by rk;
$fn$;

-- ---------------------------------------------------------------- admin
create or replace function public.admin_overview() returns json
language plpgsql stable security definer set search_path = '' as $fn$
declare r json; d0 timestamptz := date_trunc('day', now());
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select json_build_object(
    'users_total',   (select count(*) from public.profiles),
    'users_today',   (select count(*) from public.profiles where created_at >= d0),
    'users_7d',      (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'online_now',    (select count(distinct anon_id) from public.events where at >= now() - interval '6 minutes'),
    'dau',           (select count(distinct anon_id) from public.events where at >= now() - interval '24 hours'),
    'wau',           (select count(distinct anon_id) from public.events where at >= now() - interval '7 days'),
    'mau',           (select count(distinct anon_id) from public.events where at >= now() - interval '30 days'),
    'games_today',   (select count(*) from public.events where name = 'game_end' and at >= d0),
    'games_total',   (select count(*) from public.events where name = 'game_end'),
    'installs',      (select count(distinct anon_id) from public.events where name = 'app_installed'),
    'standalone_30d',(select count(distinct anon_id) from public.events where name = 'app_open' and props->>'standalone' = 'true' and at >= now() - interval '30 days'),
    'bm_total',      (select coalesce(sum(bm), 0) from public.profiles),
    'admins',        (select count(*) from public.profiles where role = 'admin'),
    'banned',        (select count(*) from public.profiles where banned),
    'daily', (select json_agg(x order by x.day) from (
        select g.day::date as day,
          (select count(distinct e.anon_id) from public.events e where e.at >= g.day and e.at < g.day + interval '1 day') as active,
          (select count(*) from public.profiles p where p.created_at >= g.day and p.created_at < g.day + interval '1 day') as signups,
          (select count(*) from public.events e where e.name = 'game_end' and e.at >= g.day and e.at < g.day + interval '1 day') as games
        from generate_series(d0 - interval '29 days', d0, interval '1 day') as g(day)) x),
    'modes',     (select coalesce(json_object_agg(k, c), '{}'::json) from (select coalesce(props->>'mode', '?') k, count(*) c from public.events where name = 'game_end' and at >= now() - interval '30 days' group by 1) x),
    'langs',     (select coalesce(json_object_agg(k, c), '{}'::json) from (select coalesce(props->>'lang', '?') k, count(distinct anon_id) c from public.events where name = 'app_open' and at >= now() - interval '30 days' group by 1) x),
    'platforms', (select coalesce(json_object_agg(k, c), '{}'::json) from (select coalesce(props->>'platform', '?') k, count(distinct anon_id) c from public.events where name = 'app_open' and at >= now() - interval '30 days' group by 1) x),
    'top_events',(select coalesce(json_object_agg(name, c), '{}'::json) from (select name, count(*) c from public.events where at >= now() - interval '7 days' group by 1 order by 2 desc limit 12) x)
  ) into r;
  return r;
end; $fn$;
revoke execute on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

create or replace function public.admin_users(q text default '', lim int default 50, off int default 0)
returns table (id uuid, email text, username text, role text, banned boolean, bm bigint, games_played int, wins int,
               created_at timestamptz, last_sign_in_at timestamptz, last_seen_at timestamptz, total bigint)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.username, p.role, p.banned, p.bm, p.games_played, p.wins,
           p.created_at, u.last_sign_in_at, p.last_seen_at, count(*) over () as total
      from public.profiles p join auth.users u on u.id = p.id
     where coalesce(q, '') = '' or u.email ilike '%' || q || '%' or p.username ilike '%' || q || '%'
     order by p.created_at desc
     limit least(greatest(lim, 1), 500) offset greatest(off, 0);
end; $fn$;
revoke execute on function public.admin_users(text, int, int) from public, anon;
grant execute on function public.admin_users(text, int, int) to authenticated;

create or replace function public.admin_update_user(uid uuid, add_bm bigint default null, set_banned boolean default null, set_role text default null)
returns json language plpgsql security definer set search_path = '' as $fn$
declare r json;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if uid = (select auth.uid()) and (set_banned is true or set_role = 'player') then raise exception 'cannot demote or ban yourself'; end if;
  if set_role is not null and set_role not in ('player', 'admin') then raise exception 'bad role'; end if;
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
revoke execute on function public.admin_update_user(uuid, bigint, boolean, text) from public, anon;
grant execute on function public.admin_update_user(uuid, bigint, boolean, text) to authenticated;

create or replace function public.admin_events(lim int default 100)
returns table (at timestamptz, name text, who text, props jsonb)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select e.at, e.name, coalesce(nullif(p.username, ''), u.email::text, 'guest·' || left(e.anon_id, 6)), e.props
      from public.events e left join public.profiles p on p.id = e.user_id left join auth.users u on u.id = e.user_id
     order by e.id desc limit least(greatest(lim, 1), 500);
end; $fn$;
revoke execute on function public.admin_events(int) from public, anon;
grant execute on function public.admin_events(int) to authenticated;
