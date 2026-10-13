-- Bridge 125 · 011 — Journey campaign (single player) + daily / weekly quests
--
-- Run once in the Supabase SQL editor after 001–010 (safe to re-run: "if not exists" / "create or replace" / upsert).
-- Keep in sync with src/campaign/data.ts (journey_matches) and src/campaign/quests.ts (quest_defs, caps) — unit tests
-- in src/campaign/campaign.test.ts compare them.
--
-- Same design rules as 003: every write is a SECURITY DEFINER function with `set search_path = ''` and
-- `(select auth.uid())`; the client never sends an amount; banned players get nothing; the day is Europe/Riga.
--
-- Honest abuse limits (games run in the browser, so results are client-reported)
--   * journey_complete(match_id, stars): stars 1..3, the previous match (global order) must already be won, one call
--     per 40 s. Rewards: BM + XP once per match (first win) and star_bm per *newly* earned star (best-stars upsert,
--     idempotent). The whole journey pays a bounded, one-time total (~13 000 BM + stars), so there is nothing to farm.
--   * journey_import(progress): merges guest (localStorage) progress after sign-in. Only a valid chain from match 1 is
--     taken; rewards are paid on the first import of an account only, later imports just sync stars.
--   * quest_progress(events): one report per 20 s, every metric clamped per call (see caps below), progress capped at
--     the quest goal. Worst case a script completes the day's 3 dailies + the week's 5 weeklies: bounded rewards.
--   * claim_quest / reroll_quest / claim_quest_chest are fully server-side and atomic (row lock on the profile).

-- ======================================================================= profile columns (server-written only)
alter table public.profiles add column if not exists journey_at       timestamptz;           -- journey_complete throttle
alter table public.profiles add column if not exists journey_imported boolean not null default false;
alter table public.profiles add column if not exists quest_event_at   timestamptz;           -- quest_progress throttle
alter table public.profiles add column if not exists quest_reroll_day date;                  -- Riga date of the last reroll
alter table public.profiles add column if not exists quest_chest_week date;                  -- Monday of the last chest claim

-- ======================================================================= shared helpers
create or replace function public.riga_week() returns date
language sql stable set search_path = '' as $fn$
  select public.riga_today() - (extract(isodow from public.riga_today())::int - 1);   -- Monday (ISO week), Riga calendar
$fn$;
revoke execute on function public.riga_week() from public, anon;
grant execute on function public.riga_week() to authenticated;

-- Pays XP and BM, levels up (+ level rewards, like record_game). Internal: not callable by clients.
create or replace function public._grant_xp_bm(uid uuid, xp_gain int, bm_gain int) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  p public.profiles%rowtype;
  v_from int; v_lvl_bm int := 0; l int;
begin
  select * into p from public.profiles where id = uid for update;
  if not found then return null; end if;
  v_from := p.level;
  p.xp := p.xp + greatest(coalesce(xp_gain, 0), 0);
  p.level := greatest(p.level, public.level_for_xp(p.xp));
  for l in v_from + 1 .. p.level loop v_lvl_bm := v_lvl_bm + public.level_reward(l); end loop;
  update public.profiles set xp = p.xp, level = p.level, bm = bm + greatest(coalesce(bm_gain, 0), 0) + v_lvl_bm where id = uid;
  if p.level >= 10 then perform public._grant_achievements(uid, array['level_10']); end if;
  return json_build_object('xp', greatest(coalesce(xp_gain, 0), 0), 'bm', greatest(coalesce(bm_gain, 0), 0),
    'level_from', v_from, 'level', p.level, 'level_bm', v_lvl_bm);
end; $fn$;
revoke execute on function public._grant_xp_bm(uuid, int, int) from public, anon, authenticated;

-- ======================================================================= JOURNEY: catalogue
create table if not exists public.journey_matches (
  id      text primary key,
  chapter text not null,
  ord     int  not null unique check (ord > 0),
  bm      int  not null check (bm >= 0),        -- first win
  xp      int  not null check (xp >= 0),        -- first win
  star_bm int  not null check (star_bm >= 0),   -- per newly earned star
  item    text                                   -- cosmetic unlocked by the first win (bosses)
);
alter table public.journey_matches enable row level security;
drop policy if exists journey_matches_read on public.journey_matches;
create policy journey_matches_read on public.journey_matches for select to anon, authenticated using (true);
revoke all on public.journey_matches from anon, authenticated;
grant select on public.journey_matches to anon, authenticated;

-- Keep in sync with MATCHES in src/campaign/data.ts (rewardFor + CHAPTERS[].item)
insert into public.journey_matches (id, chapter, ord, bm, xp, star_bm, item) values
  ('riga_1',         'riga', 1, 140, 45, 30, null),
  ('riga_2',         'riga', 2, 160, 50, 30, null),
  ('riga_3',         'riga', 3, 180, 55, 30, null),
  ('riga_boss',      'riga', 4, 400, 120, 60, 'bk_riga'),
  ('tallinn_1',      'tallinn', 5, 180, 55, 40, null),
  ('tallinn_2',      'tallinn', 6, 200, 60, 40, null),
  ('tallinn_3',      'tallinn', 7, 220, 65, 40, null),
  ('tallinn_boss',   'tallinn', 8, 500, 140, 80, 'fr_ice'),
  ('vilnius_1',      'vilnius', 9, 220, 65, 50, null),
  ('vilnius_2',      'vilnius', 10, 240, 70, 50, null),
  ('vilnius_3',      'vilnius', 11, 260, 75, 50, null),
  ('vilnius_boss',   'vilnius', 12, 600, 160, 100, 'bk_damask'),
  ('warsaw_1',       'warsaw', 13, 260, 75, 60, null),
  ('warsaw_2',       'warsaw', 14, 280, 80, 60, null),
  ('warsaw_3',       'warsaw', 15, 300, 85, 60, null),
  ('warsaw_boss',    'warsaw', 16, 700, 180, 120, 't_bluff'),
  ('kyiv_1',         'kyiv', 17, 300, 85, 70, null),
  ('kyiv_2',         'kyiv', 18, 320, 90, 70, null),
  ('kyiv_3',         'kyiv', 19, 340, 95, 70, null),
  ('kyiv_boss',      'kyiv', 20, 800, 200, 140, 'bn_sunburst'),
  ('tbilisi_1',      'tbilisi', 21, 340, 95, 80, null),
  ('tbilisi_2',      'tbilisi', 22, 360, 100, 80, null),
  ('tbilisi_3',      'tbilisi', 23, 380, 105, 80, null),
  ('tbilisi_boss',   'tbilisi', 24, 900, 220, 160, 't_master'),
  ('vienna_1',       'vienna', 25, 380, 105, 90, null),
  ('vienna_2',       'vienna', 26, 400, 110, 90, null),
  ('vienna_3',       'vienna', 27, 420, 115, 90, null),
  ('vienna_boss',    'vienna', 28, 1000, 240, 180, 'jugend'),
  ('montecarlo_1',   'montecarlo', 29, 420, 115, 100, null),
  ('montecarlo_2',   'montecarlo', 30, 440, 120, 100, null),
  ('montecarlo_3',   'montecarlo', 31, 460, 125, 100, null),
  ('montecarlo_boss','montecarlo', 32, 1100, 260, 200, 'montecarlo')
on conflict (id) do update set chapter = excluded.chapter, ord = excluded.ord, bm = excluded.bm, xp = excluded.xp,
  star_bm = excluded.star_bm, item = excluded.item;

-- ======================================================================= JOURNEY: progress (best stars per match)
create table if not exists public.journey_stars (
  user_id  uuid not null references auth.users(id) on delete cascade,
  match_id text not null references public.journey_matches(id) on delete cascade,
  stars    int  not null check (stars between 1 and 3),
  first_at timestamptz not null default now(),
  best_at  timestamptz not null default now(),
  primary key (user_id, match_id)
);
alter table public.journey_stars enable row level security;
drop policy if exists journey_stars_select_own on public.journey_stars;
create policy journey_stars_select_own on public.journey_stars for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.journey_stars from anon, authenticated;
grant select on public.journey_stars to authenticated;

-- Exclusive title for finishing the whole journey (add it to the cosmetics catalogue on the client).
-- { stars: { match_id: n }, total }
create or replace function public.journey_progress() returns json
language sql stable security definer set search_path = '' as $fn$
  select case when (select auth.uid()) is null then null else json_build_object(
    'stars', coalesce((select json_object_agg(s.match_id, s.stars) from public.journey_stars s where s.user_id = (select auth.uid())), '{}'::json),
    'total', coalesce((select sum(s.stars) from public.journey_stars s where s.user_id = (select auth.uid())), 0)) end;
$fn$;
revoke execute on function public.journey_progress() from public, anon;
grant execute on function public.journey_progress() to authenticated;

-- Internal: record `v_stars` for one match and say what it pays (no throttle, no chain check — callers do that).
create or replace function public._journey_record(uid uuid, m public.journey_matches, v_stars int, pay boolean,
  out prev int, out gain int, out bm_gain int, out xp_gain int, out v_item text, out v_title text)
language plpgsql security definer set search_path = '' as $fn$
declare v_owned text[]; v_last int;
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
  if prev = 0 then bm_gain := m.bm; xp_gain := m.xp; end if;
  bm_gain := bm_gain + gain * m.star_bm;
  if prev = 0 then
    select p.owned into v_owned from public.profiles p where p.id = uid;
    if m.item is not null and not (m.item = any(coalesce(v_owned, '{}'))) then
      v_item := m.item;
      update public.profiles set owned = array_append(owned, m.item) where id = uid;
    end if;
    select max(jm.ord) into v_last from public.journey_matches jm;
    if m.ord = v_last and not ('t_grand_tour' = any(coalesce(v_owned, '{}'))) then
      v_title := 't_grand_tour';
      update public.profiles set owned = array_append(owned, 't_grand_tour') where id = uid;
    end if;
  end if;
end; $fn$;
revoke execute on function public._journey_record(uuid, public.journey_matches, int, boolean) from public, anon, authenticated;

-- Errors: auth · banned · stars · unknown · locked (previous match not won) · slow (+ retry_in seconds)
create or replace function public.journey_complete(match_id text, stars int) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  m public.journey_matches%rowtype;
  r record; g json;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  if journey_complete.stars is null or journey_complete.stars < 1 or journey_complete.stars > 3 then
    return json_build_object('ok', false, 'error', 'stars');
  end if;
  select * into m from public.journey_matches jm where jm.id = journey_complete.match_id;
  if not found then return json_build_object('ok', false, 'error', 'unknown'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  if m.ord > 1 and not exists (
      select 1 from public.journey_stars s join public.journey_matches pm on pm.id = s.match_id
       where s.user_id = uid and pm.ord = m.ord - 1) then
    return json_build_object('ok', false, 'error', 'locked');
  end if;
  if p.journey_at is not null and p.journey_at > now() - interval '40 seconds' then
    return json_build_object('ok', false, 'error', 'slow',
      'retry_in', ceil(extract(epoch from (p.journey_at + interval '40 seconds' - now())))::int);
  end if;
  update public.profiles set journey_at = now() where id = uid;

  select * into r from public._journey_record(uid, m, journey_complete.stars, true);
  g := public._grant_xp_bm(uid, r.xp_gain, r.bm_gain);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'match', m.id, 'stars', greatest(r.prev, journey_complete.stars), 'prev', r.prev,
    'new_stars', r.gain, 'first', r.prev = 0,
    'reward', json_build_object('bm', r.bm_gain, 'xp', r.xp_gain, 'item', r.v_item, 'title', r.v_title,
      'level_from', g->'level_from', 'level', g->'level', 'level_bm', g->'level_bm'),
    'bm', p.bm, 'xp', p.xp, 'level', p.level, 'owned', p.owned);
end; $fn$;
revoke execute on function public.journey_complete(text, int) from public, anon;
grant execute on function public.journey_complete(text, int) to authenticated;

-- Guest progress → account. `progress` = { match_id: stars }. Walks the matches in order and stops at the first one
-- that is won neither locally nor on the server. Rewards only on the account's first import.
create or replace function public.journey_import(progress jsonb) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  m public.journey_matches%rowtype;
  r record; g json;
  v int; have int; pay boolean; n int := 0; tot_bm int := 0; tot_xp int := 0;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  if progress is null or jsonb_typeof(progress) <> 'object' then return json_build_object('ok', false, 'error', 'bad'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  pay := not p.journey_imported;

  for m in select * from public.journey_matches order by ord loop
    v := case when jsonb_typeof(progress -> m.id) = 'number' then least(3, greatest(0, floor((progress ->> m.id)::numeric)::int)) else 0 end;
    select s.stars into have from public.journey_stars s where s.user_id = uid and s.match_id = m.id;
    have := coalesce(have, 0);
    if greatest(v, have) = 0 then exit; end if;     -- the chain ends here
    if v > have then
      select * into r from public._journey_record(uid, m, v, pay);
      n := n + 1; tot_bm := tot_bm + coalesce(r.bm_gain, 0); tot_xp := tot_xp + coalesce(r.xp_gain, 0);
    end if;
  end loop;

  update public.profiles set journey_imported = true where id = uid;
  g := public._grant_xp_bm(uid, tot_xp, tot_bm);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'imported', n,
    'stars', coalesce((select json_object_agg(s.match_id, s.stars) from public.journey_stars s where s.user_id = uid), '{}'::json),
    'reward', json_build_object('bm', tot_bm, 'xp', tot_xp, 'level_from', g->'level_from', 'level', g->'level', 'level_bm', g->'level_bm'),
    'bm', p.bm, 'xp', p.xp, 'level', p.level, 'owned', p.owned);
end; $fn$;
revoke execute on function public.journey_import(jsonb) from public, anon;
grant execute on function public.journey_import(jsonb) to authenticated;

-- ======================================================================= QUESTS: catalogue
create table if not exists public.quest_defs (
  id     text primary key,
  kind   text not null check (kind in ('daily', 'weekly')),
  metric text not null,
  goal   int  not null check (goal > 0),
  bm     int  not null check (bm >= 0),
  xp     int  not null check (xp >= 0),
  active boolean not null default true,
  sort   int  not null default 0
);
alter table public.quest_defs enable row level security;
drop policy if exists quest_defs_read on public.quest_defs;
create policy quest_defs_read on public.quest_defs for select to anon, authenticated using (true);
revoke all on public.quest_defs from anon, authenticated;
grant select on public.quest_defs to anon, authenticated;

-- Keep in sync with QUEST_DEFS in src/campaign/quests.ts
insert into public.quest_defs (id, kind, metric, goal, bm, xp, active, sort) values
  ('d_play3',    'daily',  'games',         3,  150, 40,  true, 1),
  ('d_win2',     'daily',  'wins',          2,  200, 60,  true, 2),
  ('d_queen2',   'daily',  'queen',         2,  150, 40,  true, 3),
  ('d_burn',     'daily',  'burn125',       1,  250, 80,  true, 4),
  ('d_jacks',    'daily',  'jacks',         1,  250, 80,  true, 5),
  ('d_rounds10', 'daily',  'rounds',        10, 120, 40,  true, 6),
  ('d_out5',     'daily',  'rounds_won',    5,  180, 50,  true, 7),
  ('d_bounce',   'daily',  'bounce',        1,  200, 60,  true, 8),
  ('d_journey',  'daily',  'journey_win',   1,  200, 60,  true, 9),
  ('d_bluff10',  'daily',  'bluff_rounds',  10, 180, 50,  true, 10),
  ('w_win10',    'weekly', 'wins',          10, 600, 200, true, 20),
  ('w_play20',   'weekly', 'games',         20, 500, 150, true, 21),
  ('w_quick',    'weekly', 'quick_win',     1,  600, 200, true, 22),
  ('w_queen10',  'weekly', 'queen',         10, 500, 150, true, 23),
  ('w_burn3',    'weekly', 'burn125',       3,  700, 220, true, 24),
  ('w_jacks3',   'weekly', 'jacks',         3,  700, 220, true, 25),
  ('w_bluff30',  'weekly', 'bluff_rounds',  30, 500, 150, true, 26),
  ('w_star3',    'weekly', 'journey_3star', 1,  600, 200, true, 27),
  ('w_kings',    'weekly', 'kings',         1,  800, 250, true, 28)
on conflict (id) do update set kind = excluded.kind, metric = excluded.metric, goal = excluded.goal, bm = excluded.bm,
  xp = excluded.xp, active = excluded.active, sort = excluded.sort;

-- ======================================================================= QUESTS: per player, per period
create table if not exists public.player_quests (
  user_id     uuid not null references auth.users(id) on delete cascade,
  period      date not null,                         -- Riga day (daily) or Monday of the Riga week (weekly)
  quest_id    text not null references public.quest_defs(id) on delete cascade,
  kind        text not null check (kind in ('daily', 'weekly')),
  progress    int  not null default 0 check (progress >= 0),
  claimed_at  timestamptz,
  assigned_at timestamptz not null default now(),
  primary key (user_id, period, quest_id)
);
create index if not exists player_quests_user_idx on public.player_quests (user_id, kind, period desc);
alter table public.player_quests enable row level security;
drop policy if exists player_quests_select_own on public.player_quests;
create policy player_quests_select_own on public.player_quests for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.player_quests from anon, authenticated;
grant select on public.player_quests to authenticated;

-- Internal: give the player today's 3 dailies and this week's 5 weeklies (deterministic pick per player and period).
create or replace function public._assign_quests(uid uuid) returns void
language plpgsql security definer set search_path = '' as $fn$
declare d date := public.riga_today(); w date := public.riga_week();
begin
  if not exists (select 1 from public.player_quests pq where pq.user_id = uid and pq.kind = 'daily' and pq.period = d) then
    insert into public.player_quests (user_id, period, quest_id, kind)
      select uid, d, q.id, 'daily' from public.quest_defs q where q.kind = 'daily' and q.active
       order by md5(uid::text || d::text || q.id) limit 3
    on conflict do nothing;
  end if;
  if not exists (select 1 from public.player_quests pq where pq.user_id = uid and pq.kind = 'weekly' and pq.period = w) then
    insert into public.player_quests (user_id, period, quest_id, kind)
      select uid, w, q.id, 'weekly' from public.quest_defs q where q.kind = 'weekly' and q.active
       order by md5(uid::text || w::text || q.id) limit 5
    on conflict do nothing;
  end if;
end; $fn$;
revoke execute on function public._assign_quests(uuid) from public, anon, authenticated;

-- Internal: the board JSON the client renders.
create or replace function public._quest_board(uid uuid) returns json
language plpgsql stable security definer set search_path = '' as $fn$
declare d date := public.riga_today(); w date := public.riga_week(); p public.profiles%rowtype;
begin
  select * into p from public.profiles where id = uid;
  return json_build_object(
    'today', d, 'week', w,
    'next_daily', ((d + 1)::timestamp at time zone 'Europe/Riga'),
    'next_weekly', ((w + 7)::timestamp at time zone 'Europe/Riga'),
    'reroll_available', p.quest_reroll_day is distinct from d,
    'reroll_cost', 100,
    'chest', json_build_object('claimed', p.quest_chest_week is not distinct from w, 'bm', 1500, 'xp', 400),
    'daily', (select coalesce(json_agg(json_build_object('id', q.id, 'kind', q.kind, 'metric', q.metric, 'goal', q.goal,
                'progress', least(pq.progress, q.goal), 'bm', q.bm, 'xp', q.xp, 'claimed', pq.claimed_at is not null)
                order by pq.assigned_at, q.sort), '[]'::json)
                from public.player_quests pq join public.quest_defs q on q.id = pq.quest_id
               where pq.user_id = uid and pq.kind = 'daily' and pq.period = d),
    'weekly', (select coalesce(json_agg(json_build_object('id', q.id, 'kind', q.kind, 'metric', q.metric, 'goal', q.goal,
                'progress', least(pq.progress, q.goal), 'bm', q.bm, 'xp', q.xp, 'claimed', pq.claimed_at is not null)
                order by q.sort), '[]'::json)
                from public.player_quests pq join public.quest_defs q on q.id = pq.quest_id
               where pq.user_id = uid and pq.kind = 'weekly' and pq.period = w));
end; $fn$;
revoke execute on function public._quest_board(uuid) from public, anon, authenticated;

create or replace function public.quests() returns json
language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid());
begin
  if uid is null then return null; end if;
  if not exists (select 1 from public.profiles p where p.id = uid) then return null; end if;
  perform public._assign_quests(uid);
  return public._quest_board(uid);
end; $fn$;
revoke execute on function public.quests() from public, anon;
grant execute on function public.quests() to authenticated;

-- events = { metric: count } for ONE finished game. Unknown metrics are ignored, each one is clamped to its cap.
-- Keep the caps in sync with QUEST_CAPS in src/campaign/quests.ts
create or replace function public.quest_progress(events jsonb) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  d date := public.riga_today(); w date := public.riga_week();
  c record; v int;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  if events is null or jsonb_typeof(events) <> 'object' then return json_build_object('ok', false, 'error', 'bad'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  if p.quest_event_at is not null and p.quest_event_at > now() - interval '20 seconds' then
    return json_build_object('ok', false, 'error', 'slow',
      'retry_in', ceil(extract(epoch from (p.quest_event_at + interval '20 seconds' - now())))::int);
  end if;
  update public.profiles set quest_event_at = now() where id = uid;
  perform public._assign_quests(uid);

  for c in select * from (values
      ('games', 1), ('wins', 1), ('queen', 6), ('burn125', 3), ('jacks', 3), ('rounds', 30), ('rounds_won', 20),
      ('bluff_rounds', 30), ('bounce', 4), ('kings', 2), ('quick_win', 1), ('journey_win', 1), ('journey_3star', 1)
    ) as caps(metric, cap)
  loop
    v := case when jsonb_typeof(events -> c.metric) = 'number'
              then least(c.cap, greatest(0, floor((events ->> c.metric)::numeric)::int)) else 0 end;
    if v > 0 then
      update public.player_quests pq set progress = least(q.goal, pq.progress + v)
        from public.quest_defs q
       where q.id = pq.quest_id and q.metric = c.metric and pq.user_id = uid and pq.claimed_at is null
         and ((pq.kind = 'daily' and pq.period = d) or (pq.kind = 'weekly' and pq.period = w));
    end if;
  end loop;
  return json_build_object('ok', true, 'board', public._quest_board(uid));
end; $fn$;
revoke execute on function public.quest_progress(jsonb) from public, anon;
grant execute on function public.quest_progress(jsonb) to authenticated;

-- Errors: auth · banned · unknown (not one of the current quests) · claimed · incomplete
create or replace function public.claim_quest(quest_id text) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  d date := public.riga_today(); w date := public.riga_week();
  rq record; g json;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  perform public._assign_quests(uid);
  select pq.period, pq.progress, pq.claimed_at, q.goal, q.bm, q.xp, q.id into rq
    from public.player_quests pq join public.quest_defs q on q.id = pq.quest_id
   where pq.user_id = uid and pq.quest_id = claim_quest.quest_id
     and ((pq.kind = 'daily' and pq.period = d) or (pq.kind = 'weekly' and pq.period = w))
   for update of pq;
  if not found then return json_build_object('ok', false, 'error', 'unknown'); end if;
  if rq.claimed_at is not null then return json_build_object('ok', false, 'error', 'claimed', 'board', public._quest_board(uid)); end if;
  if rq.progress < rq.goal then return json_build_object('ok', false, 'error', 'incomplete', 'board', public._quest_board(uid)); end if;
  update public.player_quests pq set claimed_at = now()
   where pq.user_id = uid and pq.quest_id = rq.id and pq.period = rq.period;
  g := public._grant_xp_bm(uid, rq.xp, rq.bm);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'id', rq.id,
    'reward', json_build_object('bm', rq.bm, 'xp', rq.xp, 'level_from', g->'level_from', 'level', g->'level', 'level_bm', g->'level_bm'),
    'bm', p.bm, 'xp', p.xp, 'level', p.level, 'board', public._quest_board(uid));
end; $fn$;
revoke execute on function public.claim_quest(text) from public, anon;
grant execute on function public.claim_quest(text) to authenticated;

-- One daily reroll per Riga day for 100 BM (free for admin / god). Errors: used · unknown · claimed · ready · funds · none
create or replace function public.reroll_quest(quest_id text) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  d date := public.riga_today();
  v_cost int; v_new text; v_claimed timestamptz; v_ready boolean;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  perform public._assign_quests(uid);
  if p.quest_reroll_day = d then return json_build_object('ok', false, 'error', 'used', 'board', public._quest_board(uid)); end if;
  select pq.claimed_at, pq.progress >= q.goal into v_claimed, v_ready
    from public.player_quests pq join public.quest_defs q on q.id = pq.quest_id
   where pq.user_id = uid and pq.kind = 'daily' and pq.period = d and pq.quest_id = reroll_quest.quest_id;
  if not found then return json_build_object('ok', false, 'error', 'unknown'); end if;
  if v_claimed is not null then return json_build_object('ok', false, 'error', 'claimed'); end if;
  if v_ready then return json_build_object('ok', false, 'error', 'ready'); end if;   -- never throw away a finished quest
  v_cost := case when p.role in ('admin', 'god') then 0 else 100 end;
  if p.bm < v_cost then return json_build_object('ok', false, 'error', 'funds', 'bm', p.bm); end if;
  select q.id into v_new from public.quest_defs q
   where q.kind = 'daily' and q.active
     and q.id not in (select pq.quest_id from public.player_quests pq where pq.user_id = uid and pq.period = d and pq.kind = 'daily')
   order by md5(uid::text || d::text || q.id || 'reroll') limit 1;
  if v_new is null then return json_build_object('ok', false, 'error', 'none'); end if;
  delete from public.player_quests pq where pq.user_id = uid and pq.kind = 'daily' and pq.period = d and pq.quest_id = reroll_quest.quest_id;
  insert into public.player_quests (user_id, period, quest_id, kind) values (uid, d, v_new, 'daily');
  update public.profiles set bm = bm - v_cost, quest_reroll_day = d where id = uid returning * into p;
  return json_build_object('ok', true, 'id', v_new, 'replaced', reroll_quest.quest_id, 'cost', v_cost, 'bm', p.bm,
    'board', public._quest_board(uid));
end; $fn$;
revoke execute on function public.reroll_quest(text) from public, anon;
grant execute on function public.reroll_quest(text) to authenticated;

-- Weekly chest: all five weekly quests claimed → 1 500 BM + 400 XP, once per week. Errors: claimed · incomplete
create or replace function public.claim_quest_chest() returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  w date := public.riga_week();
  v_total int; v_done int; g json;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  perform public._assign_quests(uid);
  if p.quest_chest_week is not distinct from w then return json_build_object('ok', false, 'error', 'claimed', 'board', public._quest_board(uid)); end if;
  select count(*), count(pq.claimed_at) into v_total, v_done from public.player_quests pq
   where pq.user_id = uid and pq.kind = 'weekly' and pq.period = w;
  if v_total < 5 or v_done < v_total then return json_build_object('ok', false, 'error', 'incomplete', 'board', public._quest_board(uid)); end if;
  update public.profiles set quest_chest_week = w where id = uid;
  g := public._grant_xp_bm(uid, 400, 1500);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'id', 'chest',
    'reward', json_build_object('bm', 1500, 'xp', 400, 'level_from', g->'level_from', 'level', g->'level', 'level_bm', g->'level_bm'),
    'bm', p.bm, 'xp', p.xp, 'level', p.level, 'board', public._quest_board(uid));
end; $fn$;
revoke execute on function public.claim_quest_chest() from public, anon;
grant execute on function public.claim_quest_chest() to authenticated;

-- old quest rows are only history; keep ~5 weeks
delete from public.player_quests where period < public.riga_today() - 35;
