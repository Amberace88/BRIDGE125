-- Bridge 125 · 020 — the UI language decides the Journey route. Run after 018/019; safe to re-run.
-- Players may switch routes at any time now (the client follows the language, or the city picked for that
-- language). Nothing is lost: stars are stored per match, rewards are paid once per match, and journey_complete
-- still checks that a match is unlocked on the route it is played on.

create or replace function public.journey_set_route(route_id text) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  cur text;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  if not exists (select 1 from public.journey_route_stops s where s.route = journey_set_route.route_id) then
    return json_build_object('ok', false, 'error', 'unknown');
  end if;
  select r.route into cur from public.journey_routes r where r.user_id = uid;
  if cur = journey_set_route.route_id then return json_build_object('ok', true, 'route', cur); end if;
  insert into public.journey_routes as r (user_id, route) values (uid, journey_set_route.route_id)
    on conflict (user_id) do update set route = excluded.route, chosen_at = now();
  return json_build_object('ok', true, 'route', journey_set_route.route_id);
end; $fn$;
revoke execute on function public.journey_set_route(text) from public, anon;
grant execute on function public.journey_set_route(text) to authenticated;

-- any existing route may be taken at any time (used by journey_complete / journey_import when seeding a route)
create or replace function public._journey_route_ok(uid uuid, r text, privileged boolean) returns boolean
language sql stable security definer set search_path = '' as $fn$
  select exists (select 1 from public.journey_route_stops s where s.route = r);
$fn$;
revoke execute on function public._journey_route_ok(uuid, text, boolean) from public, anon, authenticated;
