-- Bridge 125 · 018 — Journey routes: a home city per UI language, eight chapters per route, finale in Monte Carlo.
--
-- Run once in the Supabase SQL editor after 001–017 (safe to re-run: "if not exists" / "create or replace" / upsert).
-- Keep in sync with src/campaign/data.ts (MATCH_TPLS, ROUTES, rewardFor) — unit tests in src/campaign/routes.test.ts
-- compare the seeds below with the client.
--
-- What changes
--   * 11 new cities (Moscow, Berlin, Minsk, Almaty, Tashkent, Baku, Yerevan, Bucharest, Sofia, Madrid, London) with
--     4 matches each. The original 32 match ids are untouched, so existing stars and rewards stay valid.
--   * journey_route_stops: route id (= its home city, or 'classic' = the original order of 011) → 8 chapters in order.
--   * journey_slots: BM / XP / star BM by POSITION on the route (chapter 1..8 × match 1..4) — the old reward curve, so
--     chapter 1 always pays like the old chapter 1 whatever the city. journey_matches.bm/xp/star_bm are no longer read.
--     A boss still grants its city's cosmetic (journey_matches.item); the Monte Carlo boss grants t_grand_tour.
--   * journey_routes: the player's route (one row per player). Players without a row are on 'classic' — exactly the
--     old global order, so older clients and players who started before 018 keep working unchanged.
--   * journey_set_route(route_id): pick a route. Allowed while the player has no star at all (any route), always for
--     'classic' when no route is stored yet (players who started before routes), and any time for admin / god.
--   * journey_complete(match_id, stars, route default null): the match must be on the player's route and the previous
--     match ON THAT ROUTE must have a star. `route` only seeds the choice when none is stored (same rule as above).
--   * journey_import(progress, route default null): walks the player's route in order (adopting the guest's route
--     first when the account has no route and no stars), rewards per position, first import only.
--
-- Same design rules as 003 / 011: SECURITY DEFINER, `set search_path = ''`, `(select auth.uid())`, server-side amounts,
-- banned players get nothing, writes go through functions only.

-- ======================================================================= catalogue: matches of every city
alter table public.journey_matches add column if not exists k int;

-- id, chapter, k (1..3, 4 = boss), ord (catalogue order only — unlocking follows the route), boss item
insert into public.journey_matches (id, chapter, k, ord, item, bm, xp, star_bm) values
  ('riga_1',          'riga',       1,  1, null, 0, 0, 0),
  ('riga_2',          'riga',       2,  2, null, 0, 0, 0),
  ('riga_3',          'riga',       3,  3, null, 0, 0, 0),
  ('riga_boss',       'riga',       4,  4, 'bk_riga', 0, 0, 0),
  ('tallinn_1',       'tallinn',    1,  5, null, 0, 0, 0),
  ('tallinn_2',       'tallinn',    2,  6, null, 0, 0, 0),
  ('tallinn_3',       'tallinn',    3,  7, null, 0, 0, 0),
  ('tallinn_boss',    'tallinn',    4,  8, 'fr_ice', 0, 0, 0),
  ('vilnius_1',       'vilnius',    1,  9, null, 0, 0, 0),
  ('vilnius_2',       'vilnius',    2, 10, null, 0, 0, 0),
  ('vilnius_3',       'vilnius',    3, 11, null, 0, 0, 0),
  ('vilnius_boss',    'vilnius',    4, 12, 'bk_damask', 0, 0, 0),
  ('warsaw_1',        'warsaw',     1, 13, null, 0, 0, 0),
  ('warsaw_2',        'warsaw',     2, 14, null, 0, 0, 0),
  ('warsaw_3',        'warsaw',     3, 15, null, 0, 0, 0),
  ('warsaw_boss',     'warsaw',     4, 16, 't_bluff', 0, 0, 0),
  ('kyiv_1',          'kyiv',       1, 17, null, 0, 0, 0),
  ('kyiv_2',          'kyiv',       2, 18, null, 0, 0, 0),
  ('kyiv_3',          'kyiv',       3, 19, null, 0, 0, 0),
  ('kyiv_boss',       'kyiv',       4, 20, 'bn_sunburst', 0, 0, 0),
  ('tbilisi_1',       'tbilisi',    1, 21, null, 0, 0, 0),
  ('tbilisi_2',       'tbilisi',    2, 22, null, 0, 0, 0),
  ('tbilisi_3',       'tbilisi',    3, 23, null, 0, 0, 0),
  ('tbilisi_boss',    'tbilisi',    4, 24, 't_master', 0, 0, 0),
  ('vienna_1',        'vienna',     1, 25, null, 0, 0, 0),
  ('vienna_2',        'vienna',     2, 26, null, 0, 0, 0),
  ('vienna_3',        'vienna',     3, 27, null, 0, 0, 0),
  ('vienna_boss',     'vienna',     4, 28, 'jugend', 0, 0, 0),
  ('montecarlo_1',    'montecarlo', 1, 29, null, 0, 0, 0),
  ('montecarlo_2',    'montecarlo', 2, 30, null, 0, 0, 0),
  ('montecarlo_3',    'montecarlo', 3, 31, null, 0, 0, 0),
  ('montecarlo_boss', 'montecarlo', 4, 32, 'montecarlo', 0, 0, 0),
  ('moscow_1',        'moscow',     1, 33, null, 0, 0, 0),
  ('moscow_2',        'moscow',     2, 34, null, 0, 0, 0),
  ('moscow_3',        'moscow',     3, 35, null, 0, 0, 0),
  ('moscow_boss',     'moscow',     4, 36, 'fr_laurel', 0, 0, 0),
  ('berlin_1',        'berlin',     1, 37, null, 0, 0, 0),
  ('berlin_2',        'berlin',     2, 38, null, 0, 0, 0),
  ('berlin_3',        'berlin',     3, 39, null, 0, 0, 0),
  ('berlin_boss',     'berlin',     4, 40, 'bk_deco', 0, 0, 0),
  ('minsk_1',         'minsk',      1, 41, null, 0, 0, 0),
  ('minsk_2',         'minsk',      2, 42, null, 0, 0, 0),
  ('minsk_3',         'minsk',      3, 43, null, 0, 0, 0),
  ('minsk_boss',      'minsk',      4, 44, 'bk_marble', 0, 0, 0),
  ('almaty_1',        'almaty',     1, 45, null, 0, 0, 0),
  ('almaty_2',        'almaty',     2, 46, null, 0, 0, 0),
  ('almaty_3',        'almaty',     3, 47, null, 0, 0, 0),
  ('almaty_boss',     'almaty',     4, 48, 'bn_aurora', 0, 0, 0),
  ('tashkent_1',      'tashkent',   1, 49, null, 0, 0, 0),
  ('tashkent_2',      'tashkent',   2, 50, null, 0, 0, 0),
  ('tashkent_3',      'tashkent',   3, 51, null, 0, 0, 0),
  ('tashkent_boss',   'tashkent',   4, 52, 'bk_dragon', 0, 0, 0),
  ('baku_1',          'baku',       1, 53, null, 0, 0, 0),
  ('baku_2',          'baku',       2, 54, null, 0, 0, 0),
  ('baku_3',          'baku',       3, 55, null, 0, 0, 0),
  ('baku_boss',       'baku',       4, 56, 'fr_flames', 0, 0, 0),
  ('yerevan_1',       'yerevan',    1, 57, null, 0, 0, 0),
  ('yerevan_2',       'yerevan',    2, 58, null, 0, 0, 0),
  ('yerevan_3',       'yerevan',    3, 59, null, 0, 0, 0),
  ('yerevan_boss',    'yerevan',    4, 60, 'nc_ruby', 0, 0, 0),
  ('bucharest_1',     'bucharest',  1, 61, null, 0, 0, 0),
  ('bucharest_2',     'bucharest',  2, 62, null, 0, 0, 0),
  ('bucharest_3',     'bucharest',  3, 63, null, 0, 0, 0),
  ('bucharest_boss',  'bucharest',  4, 64, 't_highroller', 0, 0, 0),
  ('sofia_1',         'sofia',      1, 65, null, 0, 0, 0),
  ('sofia_2',         'sofia',      2, 66, null, 0, 0, 0),
  ('sofia_3',         'sofia',      3, 67, null, 0, 0, 0),
  ('sofia_boss',      'sofia',      4, 68, 'vx_confetti', 0, 0, 0),
  ('madrid_1',        'madrid',     1, 69, null, 0, 0, 0),
  ('madrid_2',        'madrid',     2, 70, null, 0, 0, 0),
  ('madrid_3',        'madrid',     3, 71, null, 0, 0, 0),
  ('madrid_boss',     'madrid',     4, 72, 'nc_fire', 0, 0, 0),
  ('london_1',        'london',     1, 73, null, 0, 0, 0),
  ('london_2',        'london',     2, 74, null, 0, 0, 0),
  ('london_3',        'london',     3, 75, null, 0, 0, 0),
  ('london_boss',     'london',     4, 76, 'fr_crown', 0, 0, 0)
on conflict (id) do update set chapter = excluded.chapter, k = excluded.k, item = excluded.item;
-- the k column is filled for every row now
update public.journey_matches set k = case when id like '%\_boss' then 4 else right(id, 1)::int end where k is null;

-- ======================================================================= catalogue: routes
create table if not exists public.journey_route_stops (
  route   text not null,
  pos     int  not null check (pos between 1 and 8),
  chapter text not null,
  primary key (route, pos),
  unique (route, chapter)
);
alter table public.journey_route_stops enable row level security;
drop policy if exists journey_route_stops_read on public.journey_route_stops;
create policy journey_route_stops_read on public.journey_route_stops for select to anon, authenticated using (true);
revoke all on public.journey_route_stops from anon, authenticated;
grant select on public.journey_route_stops to anon, authenticated;

-- Keep in sync with ROUTES in src/campaign/data.ts (a re-run replaces the whole set)
delete from public.journey_route_stops;
insert into public.journey_route_stops (route, pos, chapter) values
  ('riga', 1, 'riga'), ('riga', 2, 'tallinn'), ('riga', 3, 'vilnius'), ('riga', 4, 'warsaw'),
  ('riga', 5, 'kyiv'), ('riga', 6, 'bucharest'), ('riga', 7, 'vienna'), ('riga', 8, 'montecarlo'),
  ('tallinn', 1, 'tallinn'), ('tallinn', 2, 'riga'), ('tallinn', 3, 'vilnius'), ('tallinn', 4, 'warsaw'),
  ('tallinn', 5, 'berlin'), ('tallinn', 6, 'london'), ('tallinn', 7, 'madrid'), ('tallinn', 8, 'montecarlo'),
  ('vilnius', 1, 'vilnius'), ('vilnius', 2, 'riga'), ('vilnius', 3, 'warsaw'), ('vilnius', 4, 'kyiv'),
  ('vilnius', 5, 'bucharest'), ('vilnius', 6, 'sofia'), ('vilnius', 7, 'vienna'), ('vilnius', 8, 'montecarlo'),
  ('warsaw', 1, 'warsaw'), ('warsaw', 2, 'kyiv'), ('warsaw', 3, 'bucharest'), ('warsaw', 4, 'sofia'),
  ('warsaw', 5, 'vienna'), ('warsaw', 6, 'berlin'), ('warsaw', 7, 'london'), ('warsaw', 8, 'montecarlo'),
  ('kyiv', 1, 'kyiv'), ('kyiv', 2, 'bucharest'), ('kyiv', 3, 'sofia'), ('kyiv', 4, 'vienna'),
  ('kyiv', 5, 'berlin'), ('kyiv', 6, 'london'), ('kyiv', 7, 'madrid'), ('kyiv', 8, 'montecarlo'),
  ('berlin', 1, 'berlin'), ('berlin', 2, 'warsaw'), ('berlin', 3, 'vilnius'), ('berlin', 4, 'kyiv'),
  ('berlin', 5, 'bucharest'), ('berlin', 6, 'sofia'), ('berlin', 7, 'vienna'), ('berlin', 8, 'montecarlo'),
  ('moscow', 1, 'moscow'), ('moscow', 2, 'minsk'), ('moscow', 3, 'vilnius'), ('moscow', 4, 'riga'),
  ('moscow', 5, 'warsaw'), ('moscow', 6, 'berlin'), ('moscow', 7, 'vienna'), ('moscow', 8, 'montecarlo'),
  ('minsk', 1, 'minsk'), ('minsk', 2, 'vilnius'), ('minsk', 3, 'riga'), ('minsk', 4, 'warsaw'),
  ('minsk', 5, 'berlin'), ('minsk', 6, 'london'), ('minsk', 7, 'madrid'), ('minsk', 8, 'montecarlo'),
  ('tbilisi', 1, 'tbilisi'), ('tbilisi', 2, 'baku'), ('tbilisi', 3, 'yerevan'), ('tbilisi', 4, 'kyiv'),
  ('tbilisi', 5, 'bucharest'), ('tbilisi', 6, 'sofia'), ('tbilisi', 7, 'vienna'), ('tbilisi', 8, 'montecarlo'),
  ('yerevan', 1, 'yerevan'), ('yerevan', 2, 'tbilisi'), ('yerevan', 3, 'kyiv'), ('yerevan', 4, 'vilnius'),
  ('yerevan', 5, 'warsaw'), ('yerevan', 6, 'berlin'), ('yerevan', 7, 'vienna'), ('yerevan', 8, 'montecarlo'),
  ('baku', 1, 'baku'), ('baku', 2, 'tbilisi'), ('baku', 3, 'moscow'), ('baku', 4, 'minsk'),
  ('baku', 5, 'vilnius'), ('baku', 6, 'warsaw'), ('baku', 7, 'vienna'), ('baku', 8, 'montecarlo'),
  ('almaty', 1, 'almaty'), ('almaty', 2, 'tashkent'), ('almaty', 3, 'baku'), ('almaty', 4, 'tbilisi'),
  ('almaty', 5, 'bucharest'), ('almaty', 6, 'sofia'), ('almaty', 7, 'vienna'), ('almaty', 8, 'montecarlo'),
  ('tashkent', 1, 'tashkent'), ('tashkent', 2, 'baku'), ('tashkent', 3, 'yerevan'), ('tashkent', 4, 'tbilisi'),
  ('tashkent', 5, 'kyiv'), ('tashkent', 6, 'warsaw'), ('tashkent', 7, 'vienna'), ('tashkent', 8, 'montecarlo'),
  ('bucharest', 1, 'bucharest'), ('bucharest', 2, 'sofia'), ('bucharest', 3, 'vienna'), ('bucharest', 4, 'warsaw'),
  ('bucharest', 5, 'berlin'), ('bucharest', 6, 'london'), ('bucharest', 7, 'madrid'), ('bucharest', 8, 'montecarlo'),
  ('sofia', 1, 'sofia'), ('sofia', 2, 'bucharest'), ('sofia', 3, 'kyiv'), ('sofia', 4, 'vilnius'),
  ('sofia', 5, 'warsaw'), ('sofia', 6, 'berlin'), ('sofia', 7, 'vienna'), ('sofia', 8, 'montecarlo'),
  ('madrid', 1, 'madrid'), ('madrid', 2, 'london'), ('madrid', 3, 'berlin'), ('madrid', 4, 'warsaw'),
  ('madrid', 5, 'kyiv'), ('madrid', 6, 'bucharest'), ('madrid', 7, 'vienna'), ('madrid', 8, 'montecarlo'),
  ('london', 1, 'london'), ('london', 2, 'berlin'), ('london', 3, 'warsaw'), ('london', 4, 'kyiv'),
  ('london', 5, 'bucharest'), ('london', 6, 'sofia'), ('london', 7, 'vienna'), ('london', 8, 'montecarlo'),
  ('classic', 1, 'riga'), ('classic', 2, 'tallinn'), ('classic', 3, 'vilnius'), ('classic', 4, 'warsaw'),
  ('classic', 5, 'kyiv'), ('classic', 6, 'tbilisi'), ('classic', 7, 'vienna'), ('classic', 8, 'montecarlo');

-- ======================================================================= catalogue: rewards by position
create table if not exists public.journey_slots (
  pos     int not null check (pos between 1 and 8),
  k       int not null check (k between 1 and 4),
  bm      int not null check (bm >= 0),        -- first win
  xp      int not null check (xp >= 0),        -- first win
  star_bm int not null check (star_bm >= 0),   -- per newly earned star
  primary key (pos, k)
);
alter table public.journey_slots enable row level security;
drop policy if exists journey_slots_read on public.journey_slots;
create policy journey_slots_read on public.journey_slots for select to anon, authenticated using (true);
revoke all on public.journey_slots from anon, authenticated;
grant select on public.journey_slots to anon, authenticated;

-- Keep in sync with rewardFor() in src/campaign/data.ts
insert into public.journey_slots (pos, k, bm, xp, star_bm) values
  (1, 1, 140, 45, 30), (1, 2, 160, 50, 30), (1, 3, 180, 55, 30), (1, 4, 400, 120, 60),
  (2, 1, 180, 55, 40), (2, 2, 200, 60, 40), (2, 3, 220, 65, 40), (2, 4, 500, 140, 80),
  (3, 1, 220, 65, 50), (3, 2, 240, 70, 50), (3, 3, 260, 75, 50), (3, 4, 600, 160, 100),
  (4, 1, 260, 75, 60), (4, 2, 280, 80, 60), (4, 3, 300, 85, 60), (4, 4, 700, 180, 120),
  (5, 1, 300, 85, 70), (5, 2, 320, 90, 70), (5, 3, 340, 95, 70), (5, 4, 800, 200, 140),
  (6, 1, 340, 95, 80), (6, 2, 360, 100, 80), (6, 3, 380, 105, 80), (6, 4, 900, 220, 160),
  (7, 1, 380, 105, 90), (7, 2, 400, 110, 90), (7, 3, 420, 115, 90), (7, 4, 1000, 240, 180),
  (8, 1, 420, 115, 100), (8, 2, 440, 120, 100), (8, 3, 460, 125, 100), (8, 4, 1100, 260, 200)
on conflict (pos, k) do update set bm = excluded.bm, xp = excluded.xp, star_bm = excluded.star_bm;

-- ======================================================================= the player's route
create table if not exists public.journey_routes (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  route     text not null,
  chosen_at timestamptz not null default now()
);
alter table public.journey_routes enable row level security;
drop policy if exists journey_routes_select_own on public.journey_routes;
create policy journey_routes_select_own on public.journey_routes for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.journey_routes from anon, authenticated;
grant select on public.journey_routes to authenticated;

-- Internal: the route a player is on ('classic' until they pick one).
create or replace function public._journey_route_of(uid uuid) returns text
language sql stable security definer set search_path = '' as $fn$
  select coalesce((select r.route from public.journey_routes r where r.user_id = uid), 'classic');
$fn$;
revoke execute on function public._journey_route_of(uuid) from public, anon, authenticated;

-- Internal: may `uid` take route `r` now? (route must exist; free before the first star; 'classic' while none is
-- stored; admin / god always). Callers hold the profile row lock.
create or replace function public._journey_route_ok(uid uuid, r text, privileged boolean) returns boolean
language sql stable security definer set search_path = '' as $fn$
  select exists (select 1 from public.journey_route_stops s where s.route = r)
     and (privileged
          or not exists (select 1 from public.journey_stars js where js.user_id = uid)
          or (r = 'classic' and not exists (select 1 from public.journey_routes jr where jr.user_id = uid)));
$fn$;
revoke execute on function public._journey_route_ok(uuid, text, boolean) from public, anon, authenticated;

-- Errors: auth · banned · unknown (no such route) · started (route is fixed after the first star; + current route)
create or replace function public.journey_set_route(route_id text) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  cur text;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  if not exists (select 1 from public.journey_route_stops s where s.route = journey_set_route.route_id) then
    return json_build_object('ok', false, 'error', 'unknown');
  end if;
  select r.route into cur from public.journey_routes r where r.user_id = uid;
  if cur = journey_set_route.route_id then return json_build_object('ok', true, 'route', cur); end if;
  if not public._journey_route_ok(uid, journey_set_route.route_id, p.role in ('admin', 'god')) then
    return json_build_object('ok', false, 'error', 'started', 'route', coalesce(cur, 'classic'));
  end if;
  insert into public.journey_routes as r (user_id, route) values (uid, journey_set_route.route_id)
    on conflict (user_id) do update set route = excluded.route, chosen_at = now();
  return json_build_object('ok', true, 'route', journey_set_route.route_id);
end; $fn$;
revoke execute on function public.journey_set_route(text) from public, anon;
grant execute on function public.journey_set_route(text) to authenticated;

-- { stars: { match_id: n }, total, route } — route is null while the player has not stored one
create or replace function public.journey_progress() returns json
language sql stable security definer set search_path = '' as $fn$
  select case when (select auth.uid()) is null then null else json_build_object(
    'stars', coalesce((select json_object_agg(s.match_id, s.stars) from public.journey_stars s where s.user_id = (select auth.uid())), '{}'::json),
    'total', coalesce((select sum(s.stars) from public.journey_stars s where s.user_id = (select auth.uid())), 0),
    'route', (select r.route from public.journey_routes r where r.user_id = (select auth.uid()))) end;
$fn$;
revoke execute on function public.journey_progress() from public, anon;
grant execute on function public.journey_progress() to authenticated;

-- Internal: record `v_stars` for one match and say what it pays at its position (no throttle, no chain check).
create or replace function public._journey_record_at(uid uuid, m public.journey_matches, sl public.journey_slots, v_stars int, pay boolean,
  out prev int, out gain int, out bm_gain int, out xp_gain int, out v_item text, out v_title text)
language plpgsql security definer set search_path = '' as $fn$
declare v_owned text[];
begin
  select s.stars into prev from public.journey_stars s where s.user_id = uid and s.match_id = m.id;
  prev := coalesce(prev, 0);
  gain := greatest(v_stars - prev, 0);
  bm_gain := 0; xp_gain := 0; v_item := null; v_title := null;
  insert into public.journey_stars as s (user_id, match_id, stars) values (uid, m.id, v_stars)
    on conflict (user_id, match_id) do update
      set stars = greatest(s.stars, excluded.stars),
          best_at = case when excluded.stars > s.stars then now() else s.best_at end;
  if not pay then return; end if;
  if prev = 0 then bm_gain := sl.bm; xp_gain := sl.xp; end if;
  bm_gain := bm_gain + gain * sl.star_bm;
  if prev = 0 then
    select p.owned into v_owned from public.profiles p where p.id = uid;
    if m.item is not null and not (m.item = any(coalesce(v_owned, '{}'))) then
      v_item := m.item;
      update public.profiles set owned = array_append(owned, m.item) where id = uid;
      v_owned := array_append(coalesce(v_owned, '{}'), m.item);
    end if;
    if m.id = 'montecarlo_boss' and not ('t_grand_tour' = any(coalesce(v_owned, '{}'))) then
      v_title := 't_grand_tour';
      update public.profiles set owned = array_append(owned, 't_grand_tour') where id = uid;
    end if;
  end if;
end; $fn$;
revoke execute on function public._journey_record_at(uuid, public.journey_matches, public.journey_slots, int, boolean) from public, anon, authenticated;

-- the old signatures (011) are replaced by versions with an optional route
drop function if exists public.journey_complete(text, int);
drop function if exists public.journey_import(jsonb);

-- Errors: auth · banned · stars · unknown · locked (not on the route, or the previous match on it is not won) · slow
create or replace function public.journey_complete(match_id text, stars int, route text default null) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  m public.journey_matches%rowtype;
  sl public.journey_slots%rowtype;
  r record; g json;
  v_route text; v_pos int; v_prev text;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  if journey_complete.stars is null or journey_complete.stars < 1 or journey_complete.stars > 3 then
    return json_build_object('ok', false, 'error', 'stars');
  end if;
  select * into m from public.journey_matches jm where jm.id = journey_complete.match_id;
  if not found or m.k is null then return json_build_object('ok', false, 'error', 'unknown'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;

  -- a client that already plays a route seeds the choice with its first result
  if journey_complete.route is not null and not exists (select 1 from public.journey_routes jr where jr.user_id = uid)
     and public._journey_route_ok(uid, journey_complete.route, p.role in ('admin', 'god')) then
    insert into public.journey_routes (user_id, route) values (uid, journey_complete.route) on conflict (user_id) do nothing;
  end if;
  v_route := public._journey_route_of(uid);

  select s.pos into v_pos from public.journey_route_stops s where s.route = v_route and s.chapter = m.chapter;
  if v_pos is null then return json_build_object('ok', false, 'error', 'locked', 'route', v_route); end if;
  -- previous match on the route: same city k-1, or the boss of the previous chapter
  if m.k > 1 then
    select jm.id into v_prev from public.journey_matches jm where jm.chapter = m.chapter and jm.k = m.k - 1;
  elsif v_pos > 1 then
    select jm.id into v_prev from public.journey_matches jm join public.journey_route_stops s on s.chapter = jm.chapter
     where s.route = v_route and s.pos = v_pos - 1 and jm.k = 4;
  end if;
  if (m.k > 1 or v_pos > 1) and not exists (select 1 from public.journey_stars s where s.user_id = uid and s.match_id = v_prev) then
    return json_build_object('ok', false, 'error', 'locked', 'route', v_route);
  end if;
  if p.journey_at is not null and p.journey_at > now() - interval '40 seconds' then
    return json_build_object('ok', false, 'error', 'slow',
      'retry_in', ceil(extract(epoch from (p.journey_at + interval '40 seconds' - now())))::int);
  end if;
  update public.profiles set journey_at = now() where id = uid;

  select * into sl from public.journey_slots js where js.pos = v_pos and js.k = m.k;
  select * into r from public._journey_record_at(uid, m, sl, journey_complete.stars, true);
  g := public._grant_xp_bm(uid, r.xp_gain, r.bm_gain);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'match', m.id, 'route', v_route, 'stars', greatest(r.prev, journey_complete.stars), 'prev', r.prev,
    'new_stars', r.gain, 'first', r.prev = 0,
    'reward', json_build_object('bm', r.bm_gain, 'xp', r.xp_gain, 'item', r.v_item, 'title', r.v_title,
      'level_from', g->'level_from', 'level', g->'level', 'level_bm', g->'level_bm'),
    'bm', p.bm, 'xp', p.xp, 'level', p.level, 'owned', p.owned);
end; $fn$;
revoke execute on function public.journey_complete(text, int, text) from public, anon;
grant execute on function public.journey_complete(text, int, text) to authenticated;

-- Guest progress → account. `progress` = { match_id: stars }, `route` = the guest's route (adopted when the account
-- has no route and no stars yet). Walks the account's route in order and stops at the first match won neither locally
-- nor on the server. Rewards (by position) only on the account's first import.
create or replace function public.journey_import(progress jsonb, route text default null) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  m public.journey_matches%rowtype;
  sl public.journey_slots%rowtype;
  st record; r record; g json;
  v_route text; v int; have int; pay boolean; n int := 0; tot_bm int := 0; tot_xp int := 0; stop boolean := false;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  if progress is null or jsonb_typeof(progress) <> 'object' then return json_build_object('ok', false, 'error', 'bad'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  pay := not p.journey_imported;

  if journey_import.route is not null and not exists (select 1 from public.journey_routes jr where jr.user_id = uid)
     and public._journey_route_ok(uid, journey_import.route, p.role in ('admin', 'god')) then
    insert into public.journey_routes (user_id, route) values (uid, journey_import.route) on conflict (user_id) do nothing;
  end if;
  v_route := public._journey_route_of(uid);

  for st in select s.pos, s.chapter from public.journey_route_stops s where s.route = v_route order by s.pos loop
    for m in select * from public.journey_matches jm where jm.chapter = st.chapter and jm.k is not null order by jm.k loop
      v := case when jsonb_typeof(progress -> m.id) = 'number' then least(3, greatest(0, floor((progress ->> m.id)::numeric)::int)) else 0 end;
      select s.stars into have from public.journey_stars s where s.user_id = uid and s.match_id = m.id;
      have := coalesce(have, 0);
      if greatest(v, have) = 0 then stop := true; exit; end if;     -- the chain ends here
      if v > have then
        select * into sl from public.journey_slots js where js.pos = st.pos and js.k = m.k;
        select * into r from public._journey_record_at(uid, m, sl, v, pay);
        n := n + 1; tot_bm := tot_bm + coalesce(r.bm_gain, 0); tot_xp := tot_xp + coalesce(r.xp_gain, 0);
      end if;
    end loop;
    exit when stop;
  end loop;

  update public.profiles set journey_imported = true where id = uid;
  g := public._grant_xp_bm(uid, tot_xp, tot_bm);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'imported', n, 'route', v_route,
    'stars', coalesce((select json_object_agg(s.match_id, s.stars) from public.journey_stars s where s.user_id = uid), '{}'::json),
    'reward', json_build_object('bm', tot_bm, 'xp', tot_xp, 'level_from', g->'level_from', 'level', g->'level', 'level_bm', g->'level_bm'),
    'bm', p.bm, 'xp', p.xp, 'level', p.level, 'owned', p.owned);
end; $fn$;
revoke execute on function public.journey_import(jsonb, text) from public, anon;
grant execute on function public.journey_import(jsonb, text) to authenticated;
