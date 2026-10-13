-- Bridge 125 · 017 — wire the Daily challenge (014) into the Season Pass (016). Run after 016; safe to re-run.
-- The first scored attempt of a day (one row per player per day) earns season stars; season_add_xp caps the
-- 'challenge' source per day and does nothing outside a live season. Errors never block the submission.

create or replace function public._season_challenge_hook() returns trigger
language plpgsql security definer set search_path = '' as $fn$
begin
  begin
    perform public.season_add_xp(new.user_id, 15, 'challenge');
  exception when others then null;
  end;
  return new;
end; $fn$;
revoke execute on function public._season_challenge_hook() from public, anon, authenticated;

drop trigger if exists daily_challenge_season on public.daily_challenge_results;
create trigger daily_challenge_season after insert on public.daily_challenge_results
  for each row execute function public._season_challenge_hook();
