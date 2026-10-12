-- Bridge 125 · 009 — admin panel v2: shop analytics
--
-- Run once in the Supabase SQL editor after 003 (purchases), 002 (events, is_admin) and 007. Safe to re-run.
-- Read-only: aggregates public.purchases, public.events and public.profiles for the admin "Veikals" tab.

create or replace function public.admin_shop_stats(days int default 30)
returns json
language plpgsql stable security definer set search_path = '' as $fn$
declare
  n int := least(greatest(coalesce(days, 30), 7), 180);
  since timestamptz := now() - make_interval(days => n);
  today date := (now() at time zone 'Europe/Riga')::date;
  r json;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;

  select json_build_object(
    'days', n,
    -- purchases (admin/god "purchases" are free test grants: counted separately, never in revenue-like totals)
    'purchases_total', (select count(*) from public.purchases where not admin),
    'purchases_period', (select count(*) from public.purchases where not admin and at >= since),
    'purchases_7d', (select count(*) from public.purchases where not admin and at >= now() - interval '7 days'),
    'purchases_today', (select count(*) from public.purchases where not admin and (at at time zone 'Europe/Riga')::date = today),
    'admin_grants', (select count(*) from public.purchases where admin),
    'bm_spent_total', (select coalesce(sum(price_bm), 0) from public.purchases where not admin),
    'bm_spent_period', (select coalesce(sum(price_bm), 0) from public.purchases where not admin and at >= since),
    'buyers_total', (select count(distinct user_id) from public.purchases where not admin),
    'buyers_period', (select count(distinct user_id) from public.purchases where not admin and at >= since),
    'players_total', (select count(*) from public.profiles where not banned),
    'bm_balance_total', (select coalesce(sum(bm), 0) from public.profiles where not banned),
    -- daily rewards: today is exact (profiles.last_daily, Riga date); history comes from the client 'daily_claim' event
    'claims_today', (select count(*) from public.profiles where last_daily = today),
    'claims_7d', (select count(*) from public.events where name = 'daily_claim' and at >= now() - interval '7 days'),
    'claims_period', (select count(*) from public.events where name = 'daily_claim' and at >= since),
    'claim_streak_7', (select count(*) from public.profiles where streak >= 7 and last_daily >= today - 1),
    -- funnel (distinct devices in the period)
    'shop_viewers', (select count(distinct anon_id) from public.events where name = 'shop_view' and at >= since),
    'shop_buyers_ev', (select count(distinct anon_id) from public.events where name = 'shop_buy' and at >= since),
    'notify_clicks', (select count(*) from public.events where name = 'shop_notify' and props->>'on' = 'true' and at >= since),
    'equips', (select count(*) from public.events where name = 'shop_equip' and at >= since),
    'top_items', (select coalesce(json_agg(x order by x.cnt desc, x.bm desc), '[]'::json) from (
        select p.item_id as id, count(*) as cnt, coalesce(sum(p.price_bm), 0) as bm, count(distinct p.user_id) as buyers, max(p.at) as last_at
          from public.purchases p where not p.admin group by p.item_id) x),
    'notify_items', (select coalesce(json_object_agg(k, c), '{}'::json) from (
        select coalesce(props->>'item', '?') k, count(*) c from public.events where name = 'shop_notify' and props->>'on' = 'true' and at >= since group by 1) x),
    'daily', (select coalesce(json_agg(json_build_object('day', g.day::date, 'purchases', coalesce(pp.c, 0), 'bm', coalesce(pp.bm, 0), 'claims', coalesce(cc.c, 0)) order by g.day), '[]'::json)
        from generate_series(today - (n - 1), today, interval '1 day') g(day)
        left join (select (at at time zone 'Europe/Riga')::date d, count(*) c, sum(price_bm) bm from public.purchases where not admin and at >= since - interval '1 day' group by 1) pp on pp.d = g.day::date
        left join (select (at at time zone 'Europe/Riga')::date d, count(*) c from public.events where name = 'daily_claim' and at >= since - interval '1 day' group by 1) cc on cc.d = g.day::date),
    'recent', (select coalesce(json_agg(x order by x.at desc), '[]'::json) from (
        select p.at, p.item_id, p.price_bm, p.admin, coalesce(nullif(pr.username, ''), u.email::text, '?') as who
          from public.purchases p left join public.profiles pr on pr.id = p.user_id left join auth.users u on u.id = p.user_id
         order by p.at desc limit 25) x)
  ) into r;
  return r;
end; $fn$;
revoke execute on function public.admin_shop_stats(int) from public, anon;
grant execute on function public.admin_shop_stats(int) to authenticated;

-- helpful for the per-day purchase series
create index if not exists purchases_at_idx on public.purchases (at desc);
