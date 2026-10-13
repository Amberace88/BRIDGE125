-- Bridge 125 · 022 — Games hub, social layer: weekly tournaments, challenge-a-friend links, game of the day (+50 %),
-- the daily marathon chest. Bridge stays the main game — and the best-paying one.
--
-- Run once in the Supabase SQL editor after 001–021 (safe to re-run: "if not exists" / "create or replace" / upsert).
-- Nothing in 019 changes: record_minigame keeps its signature and body. Everything here hangs off minigame_results:
--   * BEFORE INSERT trigger  → the game-of-the-day bonus (+50 % of the base reward, capped below Bridge's win);
--   * AFTER  INSERT trigger  → the weekly tournament entry.
-- Client: src/games/tournament/** (banner, board, prizes), src/games/challenge/** (/c/<code>), src/games/hub/**.
-- Same design rules as 003 / 011 / 019: SECURITY DEFINER + `set search_path = ''` + `(select auth.uid())`, the client
-- never sends an amount, banned players get nothing, the calendar is Europe/Riga (weeks Mon–Sun, riga_week()).
--
--   game of the day   one active mini game per Riga day (md5 pick); a PAID result of it pays +50 % of its base
--                     win/loss BM + XP (not of the daily-puzzle bonus). Base + bonus stays < 100 BM / 85 XP (Bridge's win).
--   tournaments       one featured game per Riga week (rotation over every active minigames row, by sort — new games join
--                     automatically; admin / god override with tournament_set). Free entry: every result of the featured
--                     game that week counts. Metric 'wins' (most wins; ties: best score, fastest win) for card games,
--                     'score' (best score of a won game; ties: fastest) for puzzles. Eligible: ≥ 3 games that week + a win.
--                     Closed lazily (any tournament_* call after Monday 00:00 Riga). Prizes, claimed with tournament_claim:
--                       #1  3 000 BM + title “Champion” (tg_t_champion) + frame “Podium Laurel” (tg_fr_podium)
--                       #2  1 800 BM + title “Finalist”  (tg_t_podium)   + frame tg_fr_podium
--                       #3  1 000 BM + title tg_t_podium + frame tg_fr_podium
--                       top 10 % (not podium)  300 BM + the “top 10 %” badge
--                     #N is only awarded with more than N eligible players (you must beat somebody).
--   challenges        mg_challenges: a code (bridge125.com/c/<code>), the game, the seed of the deal, the creator's result.
--                     Anyone (anon) can read one; signed-in players store one result each (first attempt counts).
--   marathon          3 different mini games in one Riga day → a chest once a day: 200 BM + 40 XP.

-- ======================================================================= exclusive tournament cosmetics (never sold)
insert into public.shop_items (id, kind, price_bm, price_eur, grants_bm, rarity, active, sort, grants) values
  ('tg_fr_podium',  'frame', null, null, null, 'legendary', true, 940, null),
  ('tg_t_champion', 'title', null, null, null, 'legendary', true, 941, null),
  ('tg_t_podium',   'title', null, null, null, 'epic',      true, 942, null)
on conflict (id) do update set kind = excluded.kind, price_bm = null, price_eur = null, rarity = excluded.rarity,
  active = excluded.active, sort = excluded.sort;

-- ======================================================================= game of the day
create or replace function public.minigame_of_day(p_day date default null) returns text
language sql stable security definer set search_path = '' as $fn$
  select mg.id from public.minigames mg where mg.active
   order by md5(coalesce(p_day, public.riga_today())::text || ':gotd:' || mg.id) limit 1;
$fn$;
revoke execute on function public.minigame_of_day(date) from public;
grant execute on function public.minigame_of_day(date) to anon, authenticated;

-- BEFORE INSERT on minigame_results (only record_minigame inserts there): +50 % for the game of the day.
create or replace function public._mg_gotd_bonus() returns trigger
language plpgsql security definer set search_path = '' as $fn$
declare g public.minigames%rowtype; v_mult numeric; v_bm int; v_xp int; b_bm int; b_xp int;
begin
  if not new.paid or new.game is distinct from public.minigame_of_day(public.riga_today()) then return new; end if;
  select * into g from public.minigames where id = new.game;
  if not found then return new; end if;
  v_mult := case new.level when 'easy' then 0.75 when 'hard' then 1.25 when 'expert' then 1.5 else 1.0 end;
  if new.won then v_bm := round(g.win_bm * v_mult)::int; v_xp := round(g.win_xp * v_mult)::int;
  else v_bm := g.loss_bm; v_xp := g.loss_xp; end if;
  -- +50 %, and base + bonus never reaches Bridge's 100 BM / 85 XP win
  b_bm := greatest(0, least(round(v_bm * 0.5)::int, 99 - v_bm));
  b_xp := greatest(0, least(round(v_xp * 0.5)::int, 84 - v_xp));
  if b_bm + b_xp = 0 then return new; end if;
  perform public._grant_xp_bm(new.user_id, b_xp, b_bm);
  new.bm := new.bm + b_bm;
  new.xp := new.xp + b_xp;
  new.details := coalesce(new.details, '{}'::jsonb) || jsonb_build_object('gotd_bm', b_bm, 'gotd_xp', b_xp);
  return new;
end; $fn$;
revoke execute on function public._mg_gotd_bonus() from public, anon, authenticated;
drop trigger if exists minigame_results_gotd on public.minigame_results;
create trigger minigame_results_gotd before insert on public.minigame_results
  for each row execute function public._mg_gotd_bonus();

-- ======================================================================= tournaments
create table if not exists public.mg_tournaments (
  week       date primary key check (extract(isodow from week) = 1),   -- Monday (Riga)
  game       text not null references public.minigames(id) on delete cascade,
  metric     text not null default 'wins' check (metric in ('wins', 'score')),
  override   boolean not null default false,                          -- set by admin / god
  closed_at  timestamptz,
  eligible   int not null default 0,                                  -- filled on close
  created_at timestamptz not null default now()
);
alter table public.mg_tournaments enable row level security;
drop policy if exists mg_tournaments_read on public.mg_tournaments;
create policy mg_tournaments_read on public.mg_tournaments for select to anon, authenticated using (true);
revoke all on public.mg_tournaments from anon, authenticated;
grant select on public.mg_tournaments to anon, authenticated;

create table if not exists public.mg_tournament_entries (
  week         date not null references public.mg_tournaments(week) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  played       int  not null default 0,
  won          int  not null default 0,
  best_score   int,                                   -- best score of a won game
  best_seconds int,                                   -- fastest won game
  reached_at   timestamptz not null default now(),    -- when the current points were reached (ties: earlier first)
  final_rank   int,                                   -- on close (eligible players only)
  tier         text check (tier in ('gold', 'silver', 'bronze', 'top10')),
  prize_bm     int  not null default 0,
  prize_items  text[] not null default '{}',
  claimed_at   timestamptz,
  primary key (week, user_id)
);
create index if not exists mg_tournament_entries_user_idx on public.mg_tournament_entries (user_id, week desc);
alter table public.mg_tournament_entries enable row level security;
drop policy if exists mg_tournament_entries_own on public.mg_tournament_entries;
create policy mg_tournament_entries_own on public.mg_tournament_entries for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.mg_tournament_entries from anon, authenticated;
grant select on public.mg_tournament_entries to authenticated;

-- the points of one entry (higher is better) + tie-breaks, as one sortable row
create or replace function public._tg_points(t public.mg_tournaments, e public.mg_tournament_entries) returns bigint
language sql immutable set search_path = '' as $fn$
  select case when t.metric = 'score' then coalesce(e.best_score, -1)::bigint else e.won::bigint end;
$fn$;
revoke execute on function public._tg_points(public.mg_tournaments, public.mg_tournament_entries) from public, anon, authenticated;

-- The week's tournament, created on first use. Rotation: every active game in `sort` order, one per week.
create or replace function public._tournament_ensure(p_week date) returns public.mg_tournaments
language plpgsql security definer set search_path = '' as $fn$
declare t public.mg_tournaments%rowtype; v_n int; v_game text; v_kind text;
begin
  select * into t from public.mg_tournaments where week = p_week;
  if found then return t; end if;
  select count(*)::int into v_n from public.minigames where active;
  if v_n = 0 then return null; end if;
  select mg.id, mg.kind into v_game, v_kind from public.minigames mg where mg.active
   order by mg.sort, mg.id offset (((p_week - date '2026-01-05') / 7) % v_n + v_n) % v_n limit 1;
  insert into public.mg_tournaments (week, game, metric) values (p_week, v_game, case when v_kind = 'puzzle' then 'score' else 'wins' end)
    on conflict (week) do nothing;
  select * into t from public.mg_tournaments where week = p_week;
  return t;
end; $fn$;
revoke execute on function public._tournament_ensure(date) from public, anon, authenticated;

-- Rebuild a week's entries from minigame_results (admin override of the game / metric).
create or replace function public._tournament_rebuild(p_week date) returns void
language plpgsql security definer set search_path = '' as $fn$
declare t public.mg_tournaments%rowtype;
begin
  select * into t from public.mg_tournaments where week = p_week;
  if not found or t.closed_at is not null then return; end if;
  delete from public.mg_tournament_entries where week = p_week;
  insert into public.mg_tournament_entries (week, user_id, played, won, best_score, best_seconds, reached_at)
    select p_week, r.user_id, count(*)::int, (count(*) filter (where r.won))::int,
           max(r.score) filter (where r.won), min(r.seconds) filter (where r.won), max(r.created_at)
      from public.minigame_results r
     where r.game = t.game
       and r.created_at >= (p_week::timestamp at time zone 'Europe/Riga')
       and r.created_at <  ((p_week + 7)::timestamp at time zone 'Europe/Riga')
     group by r.user_id;
end; $fn$;
revoke execute on function public._tournament_rebuild(date) from public, anon, authenticated;

-- AFTER INSERT on minigame_results: count the result in this week's tournament (if it is the featured game).
create or replace function public._mg_tournament_feed() returns trigger
language plpgsql security definer set search_path = '' as $fn$
declare t public.mg_tournaments%rowtype; e public.mg_tournament_entries%rowtype; v_before bigint; v_after bigint;
begin
  begin
    t := public._tournament_ensure(public.riga_week());
    if t.week is null or t.game is distinct from new.game or t.closed_at is not null then return null; end if;
    insert into public.mg_tournament_entries (week, user_id) values (t.week, new.user_id) on conflict do nothing;
    select * into e from public.mg_tournament_entries where week = t.week and user_id = new.user_id for update;
    v_before := public._tg_points(t, e);
    e.played := e.played + 1;
    if new.won then
      e.won := e.won + 1;
      if new.score is not null and (e.best_score is null or new.score > e.best_score) then e.best_score := new.score; end if;
      if e.best_seconds is null or new.seconds < e.best_seconds then e.best_seconds := new.seconds; end if;
    end if;
    v_after := public._tg_points(t, e);
    update public.mg_tournament_entries set played = e.played, won = e.won, best_score = e.best_score, best_seconds = e.best_seconds,
        reached_at = case when v_after <> v_before then now() else reached_at end
     where week = t.week and user_id = new.user_id;
  exception when others then null;   -- a tournament hiccup never breaks the game report
  end;
  return null;
end; $fn$;
revoke execute on function public._mg_tournament_feed() from public, anon, authenticated;
drop trigger if exists minigame_results_tournament on public.minigame_results;
create trigger minigame_results_tournament after insert on public.minigame_results
  for each row execute function public._mg_tournament_feed();

-- Ranked view of one week (eligible + not banned first, in order); used by the board and by close.
create or replace function public._tournament_ranked(p_week date)
returns table (user_id uuid, rk bigint, points bigint, eligible boolean, played int, won int, best_score int, best_seconds int)
language sql stable security definer set search_path = '' as $fn$
  select e.user_id,
         row_number() over (order by (e.played >= 3 and public._tg_points(t, e) > 0) desc, public._tg_points(t, e) desc,
                                     e.best_score desc nulls last, e.best_seconds asc nulls last, e.reached_at asc) as rk,
         greatest(public._tg_points(t, e), 0), e.played >= 3 and public._tg_points(t, e) > 0, e.played, e.won, e.best_score, e.best_seconds
    from public.mg_tournament_entries e
    join public.mg_tournaments t on t.week = e.week
    join public.profiles pr on pr.id = e.user_id
   where e.week = p_week and not pr.banned;
$fn$;
revoke execute on function public._tournament_ranked(date) from public, anon, authenticated;

-- Close every finished week that is still open: ranks, tiers and reserved prizes (paid on tournament_claim).
create or replace function public._tournament_close_due() returns void
language plpgsql security definer set search_path = '' as $fn$
declare t record; n int; top int; r record; v_tier text; v_bm int; v_items text[];
begin
  for t in select * from public.mg_tournaments where week < public.riga_week() and closed_at is null order by week for update skip locked loop
    select count(*)::int into n from public._tournament_ranked(t.week) x where x.eligible;
    top := greatest(1, ceil(n * 0.10)::int);
    for r in select * from public._tournament_ranked(t.week) x where x.eligible order by x.rk loop
      v_tier := null; v_bm := 0; v_items := '{}';
      if r.rk = 1 and n > 1 then v_tier := 'gold'; v_bm := 3000; v_items := array['tg_t_champion', 'tg_fr_podium'];
      elsif r.rk = 2 and n > 2 then v_tier := 'silver'; v_bm := 1800; v_items := array['tg_t_podium', 'tg_fr_podium'];
      elsif r.rk = 3 and n > 3 then v_tier := 'bronze'; v_bm := 1000; v_items := array['tg_t_podium', 'tg_fr_podium'];
      elsif r.rk <= top and n > 1 then v_tier := 'top10'; v_bm := 300;
      end if;
      update public.mg_tournament_entries set final_rank = r.rk, tier = v_tier, prize_bm = v_bm, prize_items = v_items
       where week = t.week and user_id = r.user_id;
    end loop;
    update public.mg_tournaments set closed_at = now(), eligible = n where week = t.week;
  end loop;
end; $fn$;
revoke execute on function public._tournament_close_due() from public, anon, authenticated;

-- ---- marathon claims (one per Riga day)
create table if not exists public.mg_marathon_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null,
  bm      int not null,
  xp      int not null,
  games   text[] not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.mg_marathon_claims enable row level security;
drop policy if exists mg_marathon_claims_own on public.mg_marathon_claims;
create policy mg_marathon_claims_own on public.mg_marathon_claims for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.mg_marathon_claims from anon, authenticated;
grant select on public.mg_marathon_claims to authenticated;

-- ---- the hub's one call: this week's tournament + game of the day + (signed in) my rank, marathon, unclaimed prizes
create or replace function public.tournament_current() returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  w date := public.riga_week();
  t public.mg_tournaments%rowtype;
  v_players int; v_me json := null; v_unclaimed json := '[]'::json; v_last json := null; v_marathon json := null;
  v_gotd text := public.minigame_of_day(public.riga_today()); v_gotd_bm int := 0; v_gotd_xp int := 0;
  v_games text[]; v_claimed boolean;
  lt public.mg_tournaments%rowtype;
begin
  perform public._tournament_close_due();
  t := public._tournament_ensure(w);
  if t.week is null then return json_build_object('ok', false, 'error', 'none'); end if;
  select count(*)::int into v_players from public.mg_tournament_entries e join public.profiles pr on pr.id = e.user_id
   where e.week = w and not pr.banned;

  select * into lt from public.mg_tournaments where week = w - 7 and closed_at is not null;
  if found then
    select json_build_object('week', lt.week, 'game', lt.game, 'metric', lt.metric, 'eligible', lt.eligible,
      'podium', coalesce((select json_agg(json_build_object('rank', e.final_rank, 'username', coalesce(nullif(btrim(pr.username), ''), 'Player'),
                 'avatar', pr.avatar, 'avatar_url', pr.avatar_url, 'tier', e.tier) order by e.final_rank)
            from public.mg_tournament_entries e join public.profiles pr on pr.id = e.user_id
           where e.week = lt.week and e.tier in ('gold', 'silver', 'bronze')), '[]'::json))
      into v_last;
  end if;

  if uid is not null then
    select json_build_object('rank', x.rk, 'points', x.points, 'eligible', x.eligible, 'played', x.played, 'won', x.won,
             'best_score', x.best_score, 'best_seconds', x.best_seconds)
      into v_me from public._tournament_ranked(w) x where x.user_id = uid;
    select coalesce(json_agg(json_build_object('week', e.week, 'game', tt.game, 'rank', e.final_rank, 'tier', e.tier,
             'bm', e.prize_bm, 'items', e.prize_items) order by e.week), '[]'::json)
      into v_unclaimed
      from public.mg_tournament_entries e join public.mg_tournaments tt on tt.week = e.week
     where e.user_id = uid and e.tier is not null and e.claimed_at is null;
    select coalesce(sum((r.details->>'gotd_bm')::int), 0)::int, coalesce(sum((r.details->>'gotd_xp')::int), 0)::int
      into v_gotd_bm, v_gotd_xp from public.minigame_results r
     where r.user_id = uid and r.created_at >= (public.riga_today()::timestamp at time zone 'Europe/Riga') and r.details ? 'gotd_bm';
    select coalesce(array_agg(distinct r.game order by r.game), '{}') into v_games from public.minigame_results r
     where r.user_id = uid and r.created_at >= (public.riga_today()::timestamp at time zone 'Europe/Riga');
    v_claimed := exists (select 1 from public.mg_marathon_claims c where c.user_id = uid and c.day = public.riga_today());
    v_marathon := json_build_object('games', v_games, 'goal', 3, 'claimed', v_claimed, 'bm', 200, 'xp', 40);
  end if;

  return json_build_object('ok', true, 'week', t.week, 'game', t.game, 'metric', t.metric, 'override', t.override,
    'ends_at', ((t.week + 7)::timestamp at time zone 'Europe/Riga'), 'players', v_players,
    'prizes', json_build_array(
      json_build_object('tier', 'gold', 'bm', 3000, 'items', array['tg_t_champion', 'tg_fr_podium']),
      json_build_object('tier', 'silver', 'bm', 1800, 'items', array['tg_t_podium', 'tg_fr_podium']),
      json_build_object('tier', 'bronze', 'bm', 1000, 'items', array['tg_t_podium', 'tg_fr_podium']),
      json_build_object('tier', 'top10', 'bm', 300, 'items', '{}'::text[])),
    'me', v_me, 'unclaimed', v_unclaimed, 'last', v_last,
    'gotd', json_build_object('game', v_gotd, 'day', public.riga_today(), 'mult', 1.5, 'bm_today', v_gotd_bm, 'xp_today', v_gotd_xp),
    'marathon', v_marathon);
end; $fn$;

revoke execute on function public.tournament_current() from public;
grant execute on function public.tournament_current() to anon, authenticated;

-- ---- the board of a week (default: this week). Readable by anon; the caller's own row is always returned.
drop function if exists public.tournament_board(text, int);
create or replace function public.tournament_board(p_week text default null, p_lim int default 50)
returns table (rank bigint, username text, points bigint, eligible boolean, played int, won int, best_score int, best_seconds int,
               level int, avatar text, avatar_url text, role text, frame text, title text, tier text, is_me boolean)
language plpgsql security definer set search_path = '' as $fn$
declare w date;
begin
  w := coalesce(case when p_week ~ '^\d{4}-\d{2}-\d{2}$' then p_week::date end, public.riga_week());
  w := w - (extract(isodow from w)::int - 1);
  perform public._tournament_close_due();
  return query
    select x.rk, coalesce(nullif(btrim(pr.username), ''), 'Player'), x.points, x.eligible, x.played, x.won, x.best_score, x.best_seconds,
           pr.level, pr.avatar, pr.avatar_url, pr.role, pr.frame, pr.title, e.tier, pr.id = (select auth.uid())
      from public._tournament_ranked(w) x
      join public.profiles pr on pr.id = x.user_id
      join public.mg_tournament_entries e on e.week = w and e.user_id = x.user_id
     where x.rk <= least(greatest(coalesce(p_lim, 50), 1), 100) or pr.id = (select auth.uid())
     order by x.rk;
end; $fn$;
revoke execute on function public.tournament_board(text, int) from public;
grant execute on function public.tournament_board(text, int) to anon, authenticated;

-- ---- claim every finished tournament prize of the caller (BM + exclusive items)
create or replace function public.tournament_claim() returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); p public.profiles%rowtype; e record; v_bm int := 0; v_items text[] := '{}'; v_list json;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  perform public._tournament_close_due();
  select coalesce(json_agg(json_build_object('week', x.week, 'game', t.game, 'rank', x.final_rank, 'tier', x.tier, 'bm', x.prize_bm, 'items', x.prize_items)
           order by x.week), '[]'::json)
    into v_list
    from public.mg_tournament_entries x join public.mg_tournaments t on t.week = x.week
   where x.user_id = uid and x.tier is not null and x.claimed_at is null;
  for e in select * from public.mg_tournament_entries x where x.user_id = uid and x.tier is not null and x.claimed_at is null for update loop
    v_bm := v_bm + e.prize_bm;
    v_items := v_items || e.prize_items;
    update public.mg_tournament_entries set claimed_at = now() where week = e.week and user_id = uid;
  end loop;
  if v_bm = 0 and cardinality(v_items) = 0 then
    return json_build_object('ok', false, 'error', 'none', 'bm', p.bm);
  end if;
  update public.profiles set owned = (select coalesce(array_agg(distinct i), '{}') from unnest(owned || v_items) i) where id = uid;
  perform public._grant_xp_bm(uid, 0, v_bm);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'bm_gain', v_bm, 'items', (select coalesce(array_agg(distinct i), '{}') from unnest(v_items) i),
    'prizes', v_list, 'bm', p.bm, 'owned', p.owned);
end; $fn$;
revoke execute on function public.tournament_claim() from public, anon;
grant execute on function public.tournament_claim() to authenticated;

-- ---- admin / god: pick this (or a future) week's game and metric — tournament_set('2026-10-19', 'sudoku', 'score')
create or replace function public.tournament_set(p_week text, p_game text, p_metric text default null) returns json
language plpgsql security definer set search_path = '' as $fn$
declare w date; t public.mg_tournaments%rowtype; v_kind text;
begin
  if not public.is_privileged() then raise exception 'forbidden' using errcode = '42501'; end if;
  w := coalesce(case when p_week ~ '^\d{4}-\d{2}-\d{2}$' then p_week::date end, public.riga_week());
  w := w - (extract(isodow from w)::int - 1);
  if w < public.riga_week() then return json_build_object('ok', false, 'error', 'past'); end if;
  select kind into v_kind from public.minigames where id = p_game and active;
  if not found then return json_build_object('ok', false, 'error', 'unknown'); end if;
  if p_metric is not null and p_metric not in ('wins', 'score') then return json_build_object('ok', false, 'error', 'bad'); end if;
  insert into public.mg_tournaments (week, game, metric, override) values (w, p_game, coalesce(p_metric, case when v_kind = 'puzzle' then 'score' else 'wins' end), true)
    on conflict (week) do update set game = excluded.game, metric = excluded.metric, override = true;
  perform public._tournament_rebuild(w);
  select * into t from public.mg_tournaments where week = w;
  return json_build_object('ok', true, 'week', t.week, 'game', t.game, 'metric', t.metric);
end; $fn$;
revoke execute on function public.tournament_set(text, text, text) from public, anon;
grant execute on function public.tournament_set(text, text, text) to authenticated;

-- ======================================================================= marathon chest
create or replace function public.games_marathon_claim() returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); p public.profiles%rowtype; d date := public.riga_today(); v_games text[]; v_grant json;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  if exists (select 1 from public.mg_marathon_claims c where c.user_id = uid and c.day = d) then
    return json_build_object('ok', false, 'error', 'claimed');
  end if;
  select coalesce(array_agg(distinct r.game order by r.game), '{}') into v_games from public.minigame_results r
   where r.user_id = uid and r.created_at >= (d::timestamp at time zone 'Europe/Riga');
  if cardinality(v_games) < 3 then return json_build_object('ok', false, 'error', 'early', 'games', v_games); end if;
  insert into public.mg_marathon_claims (user_id, day, bm, xp, games) values (uid, d, 200, 40, v_games);
  v_grant := public._grant_xp_bm(uid, 40, 200);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'bm_gain', 200, 'xp_gain', 40, 'games', v_games, 'grant', v_grant,
    'bm', p.bm, 'xp', p.xp, 'level', p.level);
end; $fn$;
revoke execute on function public.games_marathon_claim() from public, anon;
grant execute on function public.games_marathon_claim() to authenticated;

-- ======================================================================= challenges (bridge125.com/c/<code>)
create table if not exists public.mg_challenges (
  code       text primary key check (code ~ '^[A-Za-z0-9]{6,10}$'),
  game       text not null references public.minigames(id) on delete cascade,
  seed       text not null check (seed ~ '^[A-Za-z0-9_-]{1,64}$'),
  level      text check (level is null or level ~ '^[a-z0-9_-]{1,16}$'),
  same_deal  boolean not null default true,           -- false: the creator's own deal was not replayable ("beat my score")
  creator    uuid not null references auth.users(id) on delete cascade,
  won        boolean not null,
  score      int,
  seconds    int not null,
  verified   boolean not null default false,          -- matches a minigame_results row of the creator
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index if not exists mg_challenges_creator_idx on public.mg_challenges (creator, created_at desc);
alter table public.mg_challenges enable row level security;
revoke all on public.mg_challenges from anon, authenticated;

create table if not exists public.mg_challenge_results (
  code       text not null references public.mg_challenges(code) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  won        boolean not null,
  score      int,
  seconds    int not null,
  verified   boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (code, user_id)
);
alter table public.mg_challenge_results enable row level security;
revoke all on public.mg_challenge_results from anon, authenticated;

-- a beats b?  1 / 0 (tie) / -1 — the same rule as compareResults() in src/games/challenge/compare.ts
create or replace function public._mg_cmp(a_won boolean, a_score int, a_secs int, b_won boolean, b_score int, b_secs int) returns int
language sql immutable set search_path = '' as $fn$
  select case
    when a_won and not b_won then 1 when b_won and not a_won then -1
    when a_score is not null and b_score is not null and a_score <> b_score then sign(a_score - b_score)::int
    when a_won and a_secs <> b_secs then sign(b_secs - a_secs)::int
    else 0 end;
$fn$;
grant execute on function public._mg_cmp(boolean, int, int, boolean, int, int) to anon, authenticated;

create or replace function public.challenge_create(p_game text, p_seed text, p_level text, p_won boolean, p_score numeric,
  p_seconds numeric, p_same_deal boolean default true) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid()); p public.profiles%rowtype; g public.minigames%rowtype;
  abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  v_code text; v_secs int; v_score int; v_level text; v_ver boolean; i int; tries int := 0;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  select * into g from public.minigames mg where mg.id = p_game and mg.active;
  if not found then return json_build_object('ok', false, 'error', 'unknown'); end if;
  if p_seed is null or p_seed !~ '^[A-Za-z0-9_-]{1,64}$' then return json_build_object('ok', false, 'error', 'bad', 'field', 'seed'); end if;
  if p_seconds is null or p_seconds < 0 or p_seconds > 43200 then return json_build_object('ok', false, 'error', 'bad', 'field', 'seconds'); end if;
  if p_score is not null and (p_score < 0 or p_score > g.max_score) then return json_build_object('ok', false, 'error', 'bad', 'field', 'score'); end if;
  v_level := nullif(lower(btrim(coalesce(p_level, ''))), '');
  if v_level is not null and v_level !~ '^[a-z0-9_-]{1,16}$' then return json_build_object('ok', false, 'error', 'bad', 'field', 'level'); end if;
  if (select count(*) from public.mg_challenges c where c.creator = uid and c.created_at > now() - interval '1 day') >= 40 then
    return json_build_object('ok', false, 'error', 'limit');
  end if;
  v_secs := round(p_seconds)::int; v_score := round(p_score)::int;
  v_ver := exists (select 1 from public.minigame_results r where r.user_id = uid and r.game = g.id and r.won = coalesce(p_won, false)
                     and r.seconds = v_secs and r.score is not distinct from v_score and r.created_at > now() - interval '2 hours');
  loop
    v_code := '';
    for i in 1 .. 7 loop v_code := v_code || substr(abc, 1 + floor(random() * length(abc))::int, 1); end loop;
    begin
      insert into public.mg_challenges (code, game, seed, level, same_deal, creator, won, score, seconds, verified)
        values (v_code, g.id, p_seed, v_level, coalesce(p_same_deal, true), uid, coalesce(p_won, false), v_score, v_secs, v_ver);
      exit;
    exception when unique_violation then tries := tries + 1; if tries > 6 then raise; end if;
    end;
  end loop;
  return json_build_object('ok', true, 'code', v_code, 'verified', v_ver,
    'expires_at', (select c.expires_at from public.mg_challenges c where c.code = v_code));
end; $fn$;
revoke execute on function public.challenge_create(text, text, text, boolean, numeric, numeric, boolean) from public, anon;
grant execute on function public.challenge_create(text, text, text, boolean, numeric, numeric, boolean) to authenticated;

-- anon + signed in: the challenge, the creator, and the best answers so far (the caller's own always included)
create or replace function public.challenge_get(p_code text) returns json
language plpgsql stable security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); c public.mg_challenges%rowtype; pr public.profiles%rowtype; v_res json; v_me json; v_n int;
begin
  if p_code is null or p_code !~ '^[A-Za-z0-9]{6,10}$' then return json_build_object('ok', false, 'error', 'bad'); end if;
  select * into c from public.mg_challenges where code = p_code;
  if not found then return json_build_object('ok', false, 'error', 'unknown'); end if;
  select * into pr from public.profiles where id = c.creator;
  select count(*)::int into v_n from public.mg_challenge_results r where r.code = c.code;
  select coalesce(json_agg(x order by x.rk), '[]'::json) into v_res from (
    select row_number() over (order by r.won desc, r.score desc nulls last, r.seconds asc, r.created_at asc) as rk,
           coalesce(nullif(btrim(q.username), ''), 'Player') as username, q.avatar, q.avatar_url, r.won, r.score, r.seconds,
           public._mg_cmp(r.won, r.score, r.seconds, c.won, c.score, c.seconds) as vs, r.user_id = uid as is_me
      from public.mg_challenge_results r join public.profiles q on q.id = r.user_id
     where r.code = c.code and not q.banned
     order by rk limit 20) x;
  if uid is not null then
    select json_build_object('won', r.won, 'score', r.score, 'seconds', r.seconds,
             'vs', public._mg_cmp(r.won, r.score, r.seconds, c.won, c.score, c.seconds))
      into v_me from public.mg_challenge_results r where r.code = c.code and r.user_id = uid;
  end if;
  return json_build_object('ok', true, 'code', c.code, 'game', c.game, 'seed', c.seed, 'level', c.level, 'same_deal', c.same_deal,
    'created_at', c.created_at, 'expires_at', c.expires_at, 'expired', c.expires_at < now(), 'mine', c.creator = uid,
    'creator', json_build_object('username', coalesce(nullif(btrim(pr.username), ''), 'Player'), 'avatar', pr.avatar,
      'avatar_url', pr.avatar_url, 'level', pr.level, 'frame', pr.frame, 'title', pr.title),
    'result', json_build_object('won', c.won, 'score', c.score, 'seconds', c.seconds, 'verified', c.verified),
    'answers', v_n, 'results', v_res, 'me', v_me);
end; $fn$;
revoke execute on function public.challenge_get(text) from public;
grant execute on function public.challenge_get(text) to anon, authenticated;

-- signed in: store my answer (the first attempt counts); returns the comparison
create or replace function public.challenge_submit(p_code text, p_won boolean, p_score numeric, p_seconds numeric) returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); p public.profiles%rowtype; c public.mg_challenges%rowtype; g public.minigames%rowtype;
  r public.mg_challenge_results%rowtype; v_secs int; v_score int; v_ver boolean; v_again boolean := false;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  if p_code is null or p_code !~ '^[A-Za-z0-9]{6,10}$' then return json_build_object('ok', false, 'error', 'bad'); end if;
  select * into c from public.mg_challenges where code = p_code;
  if not found then return json_build_object('ok', false, 'error', 'unknown'); end if;
  if c.creator = uid then return json_build_object('ok', false, 'error', 'own'); end if;
  if c.expires_at < now() then return json_build_object('ok', false, 'error', 'expired'); end if;
  select * into g from public.minigames where id = c.game;
  if p_seconds is null or p_seconds < 0 or p_seconds > 43200 then return json_build_object('ok', false, 'error', 'bad', 'field', 'seconds'); end if;
  if p_score is not null and (p_score < 0 or p_score > g.max_score) then return json_build_object('ok', false, 'error', 'bad', 'field', 'score'); end if;
  v_secs := round(p_seconds)::int; v_score := round(p_score)::int;
  v_ver := exists (select 1 from public.minigame_results x where x.user_id = uid and x.game = c.game and x.won = coalesce(p_won, false)
                     and x.seconds = v_secs and x.score is not distinct from v_score and x.created_at > now() - interval '2 hours');
  insert into public.mg_challenge_results (code, user_id, won, score, seconds, verified)
    values (c.code, uid, coalesce(p_won, false), v_score, v_secs, v_ver)
    on conflict (code, user_id) do nothing;
  if not found then v_again := true; end if;
  select * into r from public.mg_challenge_results where code = c.code and user_id = uid;
  return json_build_object('ok', true, 'again', v_again,
    'me', json_build_object('won', r.won, 'score', r.score, 'seconds', r.seconds),
    'them', json_build_object('won', c.won, 'score', c.score, 'seconds', c.seconds),
    'vs', public._mg_cmp(r.won, r.score, r.seconds, c.won, c.score, c.seconds));
end; $fn$;
revoke execute on function public.challenge_submit(text, boolean, numeric, numeric) from public, anon;
grant execute on function public.challenge_submit(text, boolean, numeric, numeric) to authenticated;

-- my recent challenges (hub: "Your challenges" — answers waiting)
create or replace function public.challenge_mine(p_lim int default 10) returns json
language sql stable security definer set search_path = '' as $fn$
  select case when (select auth.uid()) is null then '[]'::json else coalesce((
    select json_agg(x order by x.created_at desc) from (
      select c.code, c.game, c.won, c.score, c.seconds, c.created_at, c.expires_at < now() as expired,
             (select count(*)::int from public.mg_challenge_results r where r.code = c.code) as answers,
             (select count(*)::int from public.mg_challenge_results r where r.code = c.code
                and public._mg_cmp(r.won, r.score, r.seconds, c.won, c.score, c.seconds) > 0) as beaten
        from public.mg_challenges c where c.creator = (select auth.uid())
       order by c.created_at desc limit least(greatest(coalesce(p_lim, 10), 1), 30)) x), '[]'::json) end;
$fn$;
revoke execute on function public.challenge_mine(int) from public, anon;
grant execute on function public.challenge_mine(int) to authenticated;

-- old challenges are only history; keep ~6 months
delete from public.mg_challenges where expires_at < now() - interval '150 days';
