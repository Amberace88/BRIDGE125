-- Bridge 125: profiles + stats (applied 2026-10-12)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text check (char_length(username) <= 24),
  lang text not null default 'en' check (lang in ('en','lv','ru','uk')),
  accent text not null default 'brass',
  background text not null default 'malachite',
  bm bigint not null default 5000,
  games_played int not null default 0,
  wins int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (username, lang, accent, background) on public.profiles to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $fn$
begin insert into public.profiles (id) values (new.id) on conflict (id) do nothing; return new; end; $fn$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $fn$ begin new.updated_at = now(); return new; end; $fn$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.record_game(won boolean) returns json
language plpgsql security definer set search_path = '' as $fn$
declare r json;
begin
  update public.profiles set games_played = games_played + 1, wins = wins + case when won then 1 else 0 end
   where id = (select auth.uid())
   returning json_build_object('games_played', games_played, 'wins', wins, 'bm', bm) into r;
  return r;
end; $fn$;
revoke execute on function public.record_game(boolean) from public, anon;
grant execute on function public.record_game(boolean) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Public leaderboard (top N + the caller's own row). Exposes nicknames and stats only — never ids or emails.
create or replace function public.leaderboard(lim int default 50)
returns table (rank bigint, username text, wins int, games_played int, bm bigint, is_me boolean)
language sql stable security definer set search_path = '' as $fn$
  with ranked as (
    select row_number() over (order by p.wins desc, p.games_played asc, p.created_at asc) as rk,
           coalesce(nullif(btrim(p.username), ''), 'Player') as uname, p.wins, p.games_played, p.bm,
           p.id = (select auth.uid()) as me
      from public.profiles p
     where p.games_played > 0
  )
  select rk, uname, wins, games_played, bm, me from ranked
   where rk <= least(greatest(lim, 1), 100) or me
   order by rk;
$fn$;
revoke execute on function public.leaderboard(int) from public;
grant execute on function public.leaderboard(int) to anon, authenticated;
