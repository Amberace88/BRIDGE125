-- Bridge 125 · 010 — social layer: table gifts, BM tips, gifting styles, chat reports, Diamonds (premium currency)
--
-- Run once in the Supabase SQL editor after 001–009 (safe to re-run: "if not exists" / "create or replace" / upsert).
--
-- Design rules (same as 003/008)
--   * Every write goes through a SECURITY DEFINER function with `set search_path = ''` and `(select auth.uid())`.
--   * The client never sends a price. Gift and pack prices live in gift_catalog / diamond_packs (mirrors of
--     src/social/gifts.ts — a unit test compares them).
--   * profiles.diamonds is NOT client-writable (the column-level UPDATE grant from 001/002/008 is unchanged).
--     Diamonds only move through: credit_diamonds() (Stripe webhook, service_role), refund_payment() (service_role),
--     send_gift() / gift_item() (spend), admin_grant_diamonds() (admin). Every change is written to diamond_ledger.
--   * Owner ('admin') and co-author / main tester ('god') send gifts and gift styles for free (recorded with admin = true,
--     never counted as revenue) and may tip without the games-played requirement.
--   * No loot boxes: every purchase names exactly what it gives.
--
-- Abuse limits
--   * Table gifts: one per 1.5 s per sender (also rate-limited in the Room), price charged server-side.
--   * BM tips: both players signed in; sender finished ≥ 3 games; 10–1 000 BM per tip; ≤ 1 000 BM per recipient per
--     Riga day and ≤ 3 000 BM per sender per Riga day; one tip per 3 s; no self-tips; banned accounts can't send/receive.
--   * Chat reports: signed-in reporters only, ≤ 20 per hour; the Room attaches the stored message text.

-- ======================================================================= profile column
alter table public.profiles add column if not exists diamonds bigint not null default 0;
do $$ begin
  alter table public.profiles add constraint profiles_diamonds_nonneg check (diamonds >= 0);
exception when duplicate_object then null; end $$;

-- ======================================================================= catalogues
create table if not exists public.diamond_packs (
  id          text primary key,
  diamonds    int  not null check (diamonds > 0),
  bonus_pct   int  not null default 0,
  price_cents int  not null check (price_cents > 0),   -- VAT included
  currency    text not null default 'eur',
  active      boolean not null default true,
  sort        int  not null default 0
);
alter table public.diamond_packs enable row level security;
drop policy if exists diamond_packs_read on public.diamond_packs;
create policy diamond_packs_read on public.diamond_packs for select to anon, authenticated using (true);
revoke all on public.diamond_packs from anon, authenticated;
grant select on public.diamond_packs to anon, authenticated;

-- Keep in sync with DIAMOND_PACKS in src/social/gifts.ts
insert into public.diamond_packs (id, diamonds, bonus_pct, price_cents, currency, active, sort) values
  ('dm_100',   100,  0,  99,   'eur', true, 1),
  ('dm_550',   550,  10, 499,  'eur', true, 2),
  ('dm_1200',  1200, 20, 999,  'eur', true, 3),
  ('dm_2600',  2600, 30, 1999, 'eur', true, 4),
  ('dm_7000',  7000, 40, 4999, 'eur', true, 5)
on conflict (id) do update set diamonds = excluded.diamonds, bonus_pct = excluded.bonus_pct, price_cents = excluded.price_cents,
  currency = excluded.currency, active = excluded.active, sort = excluded.sort;

create table if not exists public.gift_catalog (
  id             text primary key,
  price_bm       int check (price_bm is null or price_bm > 0),
  price_diamonds int check (price_diamonds is null or price_diamonds > 0),
  active         boolean not null default true,
  sort           int not null default 0,
  constraint gift_catalog_one_price check ((price_bm is null) <> (price_diamonds is null))
);
alter table public.gift_catalog enable row level security;
drop policy if exists gift_catalog_read on public.gift_catalog;
create policy gift_catalog_read on public.gift_catalog for select to anon, authenticated using (true);
revoke all on public.gift_catalog from anon, authenticated;
grant select on public.gift_catalog to anon, authenticated;

-- Keep in sync with GIFTS in src/social/gifts.ts
insert into public.gift_catalog (id, price_bm, price_diamonds, active, sort) values
  ('clover',    150,  null, true, 1),
  ('rose',      400,  null, true, 2),
  ('cigar',     null, 20,   true, 3),
  ('champagne', null, 40,   true, 4),
  ('trophy',    null, 60,   true, 5),
  ('fireworks', null, 90,   true, 6),
  ('crown',     null, 150,  true, 7),
  ('ring',      null, 300,  true, 8)
on conflict (id) do update set price_bm = excluded.price_bm, price_diamonds = excluded.price_diamonds, active = excluded.active, sort = excluded.sort;

-- A shop style bought as a gift costs 1 💎 per 25 BM of its shop price, rounded up to 10 (min 10). Mirrors itemDiamondPrice().
create or replace function public.item_diamonds(price_bm int) returns int
language sql immutable set search_path = '' as $fn$
  select greatest(10, (ceil(greatest(price_bm, 0) / 250.0) * 10)::int);
$fn$;

-- ======================================================================= ledgers
-- Real-money purchases (one row per Stripe Checkout session — the idempotency key).
create table if not exists public.payments (
  id             bigint generated always as identity primary key,
  at             timestamptz not null default now(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  provider       text not null default 'stripe',
  session_id     text not null unique,
  payment_intent text,
  event_id       text,
  pack_id        text not null,
  diamonds       int  not null,
  amount_cents   int  not null,
  currency       text not null,
  status         text not null default 'paid' check (status in ('paid', 'refunded')),
  refunded_at    timestamptz
);
create index if not exists payments_user_idx on public.payments (user_id, at desc);
create index if not exists payments_intent_idx on public.payments (payment_intent);
alter table public.payments enable row level security;
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

-- Every Diamond movement, with the balance after it.
create table if not exists public.diamond_ledger (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  delta    bigint not null,
  balance  bigint not null,
  reason   text not null check (reason in ('purchase', 'refund', 'gift', 'gift_item', 'admin_grant', 'correction')),
  ref      text
);
create index if not exists diamond_ledger_user_idx on public.diamond_ledger (user_id, at desc);
alter table public.diamond_ledger enable row level security;
drop policy if exists diamond_ledger_select_own on public.diamond_ledger;
create policy diamond_ledger_select_own on public.diamond_ledger for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.diamond_ledger from anon, authenticated;
grant select on public.diamond_ledger to authenticated;

-- Table gifts, tips and gifted styles (sender + receiver can read their rows).
create table if not exists public.gifts (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  kind       text not null check (kind in ('table', 'tip', 'item')),
  from_user  uuid not null references auth.users(id) on delete cascade,
  from_name  text,
  to_user    uuid references auth.users(id) on delete set null,   -- null = a guest / bot seat (table gifts only)
  to_name    text,
  gift_id    text,                       -- table gift id or shop item id
  amount_bm  int  not null default 0,    -- tip amount, or the BM price paid for a table gift
  diamonds   int  not null default 0,    -- Diamonds paid
  room       text,
  admin      boolean not null default false,
  seen       boolean not null default false
);
create index if not exists gifts_to_idx on public.gifts (to_user, seen, at desc);
create index if not exists gifts_from_idx on public.gifts (from_user, kind, at desc);
create index if not exists gifts_pair_idx on public.gifts (from_user, to_user, kind, at desc);
alter table public.gifts enable row level security;
drop policy if exists gifts_select_own on public.gifts;
create policy gifts_select_own on public.gifts for select to authenticated
  using ((select auth.uid()) = from_user or (select auth.uid()) = to_user);
revoke all on public.gifts from anon, authenticated;
grant select on public.gifts to authenticated;

-- Chat reports for the admin (no client access at all; read through admin_chat_reports()).
create table if not exists public.chat_reports (
  id            bigint generated always as identity primary key,
  at            timestamptz not null default now(),
  reporter      uuid not null references auth.users(id) on delete cascade,
  room          text not null,
  seat          int,
  name          text,
  text          text not null,
  reported_user uuid references auth.users(id) on delete set null,
  msg_id        int,
  status        text not null default 'open' check (status in ('open', 'dismissed', 'actioned'))
);
create index if not exists chat_reports_status_idx on public.chat_reports (status, at desc);
create index if not exists chat_reports_reporter_idx on public.chat_reports (reporter, at desc);
alter table public.chat_reports enable row level security;
revoke all on public.chat_reports from anon, authenticated;

-- ======================================================================= internal helpers
create or replace function public._riga_day_start() returns timestamptz
language sql stable set search_path = '' as $fn$
  select (public.riga_today()::timestamp at time zone 'Europe/Riga');
$fn$;

create or replace function public._display_name(u text) returns text
language sql immutable set search_path = '' as $fn$
  select coalesce(nullif(btrim(u), ''), 'Player');
$fn$;

-- Move Diamonds and log it. Caller must hold the profile row lock. Raises if the balance would go negative.
create or replace function public._dm_move(uid uuid, delta bigint, why text, ref text) returns bigint
language plpgsql security definer set search_path = '' as $fn$
declare bal bigint;
begin
  update public.profiles set diamonds = diamonds + delta where id = uid returning diamonds into bal;
  if bal is null then raise exception 'no profile'; end if;
  insert into public.diamond_ledger (user_id, delta, balance, reason, ref) values (uid, delta, bal, why, ref);
  return bal;
end; $fn$;
revoke execute on function public._dm_move(uuid, bigint, text, text) from public, anon, authenticated;

-- ======================================================================= send_gift: a table gift thrown to a seat
-- p_to = the receiver's account (null for a guest or bot seat — the gift is still shown, nobody receives a record).
-- Errors: auth · banned · unknown · self · target · throttle · funds (+ need, cur)
create or replace function public.send_gift(p_gift text, p_to uuid default null, p_room text default null, p_to_name text default null)
returns json language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  g public.gift_catalog%rowtype;
  adm boolean;
  cost_bm int := 0; cost_dm int := 0;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  select * into g from public.gift_catalog c where c.id = p_gift and c.active;
  if not found then return json_build_object('ok', false, 'error', 'unknown'); end if;
  if p_to = uid then return json_build_object('ok', false, 'error', 'self'); end if;
  if p_to is not null and not exists (select 1 from public.profiles t where t.id = p_to and not t.banned) then
    return json_build_object('ok', false, 'error', 'target');
  end if;
  if exists (select 1 from public.gifts x where x.from_user = uid and x.kind = 'table' and x.at > now() - interval '1.5 seconds') then
    return json_build_object('ok', false, 'error', 'throttle');
  end if;
  adm := p.role in ('admin', 'god');
  if not adm then cost_bm := coalesce(g.price_bm, 0); cost_dm := coalesce(g.price_diamonds, 0); end if;
  if p.bm < cost_bm then
    return json_build_object('ok', false, 'error', 'funds', 'cur', 'bm', 'need', cost_bm - p.bm, 'bm', p.bm, 'diamonds', p.diamonds);
  end if;
  if p.diamonds < cost_dm then
    return json_build_object('ok', false, 'error', 'funds', 'cur', 'dm', 'need', cost_dm - p.diamonds, 'bm', p.bm, 'diamonds', p.diamonds);
  end if;

  if cost_bm > 0 then update public.profiles set bm = bm - cost_bm where id = uid; end if;
  if cost_dm > 0 then perform public._dm_move(uid, -cost_dm, 'gift', 'gift:' || g.id); end if;
  insert into public.gifts (kind, from_user, from_name, to_user, to_name, gift_id, amount_bm, diamonds, room, admin)
    values ('table', uid, public._display_name(p.username), p_to, left(p_to_name, 24), g.id, cost_bm, cost_dm, left(p_room, 8), adm);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'gift', g.id, 'admin', adm, 'bm', p.bm, 'diamonds', p.diamonds);
end; $fn$;
revoke execute on function public.send_gift(text, uuid, text, text) from public, anon;
grant execute on function public.send_gift(text, uuid, text, text) to authenticated;

-- ======================================================================= tip_bm: send Bridge Money to another player
-- Errors: auth · banned · self · target · limit · games · throttle · funds. `left` = what may still go to this recipient today.
create or replace function public.tip_bm(p_to uuid, p_amount int, p_room text default null)
returns json language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  t public.profiles%rowtype;
  adm boolean;
  d0 timestamptz := public._riga_day_start();
  to_them int; total int;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p_to is null then return json_build_object('ok', false, 'error', 'target'); end if;
  if p_to = uid then return json_build_object('ok', false, 'error', 'self'); end if;
  if p_amount is null or p_amount < 10 or p_amount > 1000 then return json_build_object('ok', false, 'error', 'limit'); end if;
  -- lock both rows in id order (no deadlocks between two players tipping each other)
  perform 1 from public.profiles where id in (uid, p_to) order by id for update;
  select * into p from public.profiles where id = uid;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  select * into t from public.profiles where id = p_to;
  if not found or t.banned then return json_build_object('ok', false, 'error', 'target'); end if;
  adm := p.role in ('admin', 'god');
  if not adm and p.games_played < 3 then return json_build_object('ok', false, 'error', 'games', 'need', 3 - p.games_played); end if;
  if exists (select 1 from public.gifts x where x.from_user = uid and x.kind = 'tip' and x.at > now() - interval '3 seconds') then
    return json_build_object('ok', false, 'error', 'throttle');
  end if;
  select coalesce(sum(x.amount_bm) filter (where x.to_user = p_to), 0)::int, coalesce(sum(x.amount_bm), 0)::int into to_them, total
    from public.gifts x where x.from_user = uid and x.kind = 'tip' and x.at >= d0;
  if to_them + p_amount > 1000 or total + p_amount > 3000 then
    return json_build_object('ok', false, 'error', 'limit', 'left', greatest(0, least(1000 - to_them, 3000 - total)));
  end if;
  if not adm and p.bm < p_amount then return json_build_object('ok', false, 'error', 'funds', 'cur', 'bm', 'need', p_amount - p.bm, 'bm', p.bm); end if;

  if not adm then update public.profiles set bm = bm - p_amount where id = uid; end if;
  update public.profiles set bm = bm + p_amount where id = p_to;
  insert into public.gifts (kind, from_user, from_name, to_user, to_name, amount_bm, room, admin)
    values ('tip', uid, public._display_name(p.username), p_to, public._display_name(t.username), p_amount, left(p_room, 8), adm);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'bm', p.bm, 'left', greatest(0, least(1000 - to_them - p_amount, 3000 - total - p_amount)), 'admin', adm);
end; $fn$;
revoke execute on function public.tip_bm(uuid, int, text) from public, anon;
grant execute on function public.tip_bm(uuid, int, text) to authenticated;

-- ======================================================================= gift_item: buy a shop style for a friend (Diamonds)
-- Recipient by id (from a table seat, via the Room) or by exact nickname (must be unique).
-- Single items and sets only (no packs, bundles or passes). Errors: auth · banned · unknown · self · notFound · ambiguous ·
-- owned · funds (+ need) · throttle
create or replace function public.gift_item(p_item text, p_to uuid default null, p_to_name text default null)
returns json language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  t public.profiles%rowtype;
  it public.shop_items%rowtype;
  adm boolean;
  target uuid := p_to;
  n int;
  cost int;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into it from public.shop_items s where s.id = p_item and s.active and s.price_bm is not null
     and s.kind in ('accent', 'table', 'back', 'set', 'face', 'frame', 'victory', 'emotes', 'title', 'namecolor', 'banner');
  if not found then return json_build_object('ok', false, 'error', 'unknown'); end if;
  if target is null then
    if p_to_name is null or btrim(p_to_name) = '' then return json_build_object('ok', false, 'error', 'notFound'); end if;
    select count(*)::int into n from public.profiles x where lower(btrim(x.username)) = lower(btrim(p_to_name)) and not x.banned;
    if n = 0 then return json_build_object('ok', false, 'error', 'notFound'); end if;
    if n > 1 then return json_build_object('ok', false, 'error', 'ambiguous'); end if;
    select x.id into target from public.profiles x where lower(btrim(x.username)) = lower(btrim(p_to_name)) and not x.banned;
  end if;
  if target = uid then return json_build_object('ok', false, 'error', 'self'); end if;

  perform 1 from public.profiles where id in (uid, target) order by id for update;
  select * into p from public.profiles where id = uid;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;
  select * into t from public.profiles where id = target;
  if not found or t.banned then return json_build_object('ok', false, 'error', 'notFound'); end if;
  if it.id = any(t.owned) then return json_build_object('ok', false, 'error', 'owned'); end if;
  if exists (select 1 from public.gifts x where x.from_user = uid and x.kind = 'item' and x.at > now() - interval '3 seconds') then
    return json_build_object('ok', false, 'error', 'throttle');
  end if;
  adm := p.role in ('admin', 'god');
  cost := case when adm then 0 else public.item_diamonds(it.price_bm) end;
  if p.diamonds < cost then
    return json_build_object('ok', false, 'error', 'funds', 'cur', 'dm', 'need', cost - p.diamonds, 'diamonds', p.diamonds);
  end if;

  if cost > 0 then perform public._dm_move(uid, -cost, 'gift_item', 'item:' || it.id); end if;
  update public.profiles set owned = owned || array[it.id] where id = target;
  insert into public.gifts (kind, from_user, from_name, to_user, to_name, gift_id, diamonds, admin)
    values ('item', uid, public._display_name(p.username), target, public._display_name(t.username), it.id, cost, adm);
  select * into p from public.profiles where id = uid;
  return json_build_object('ok', true, 'item', it.id, 'to_name', public._display_name(t.username), 'price', cost, 'admin', adm, 'diamonds', p.diamonds);
end; $fn$;
revoke execute on function public.gift_item(text, uuid, text) from public, anon;
grant execute on function public.gift_item(text, uuid, text) to authenticated;

-- ======================================================================= gift inbox ("Anna sent you Monte Carlo")
create or replace function public.gift_inbox() returns json
language sql stable security definer set search_path = '' as $fn$
  select coalesce(json_agg(json_build_object('id', x.id, 'at', x.at, 'kind', x.kind, 'from', x.from_name, 'gift', x.gift_id,
           'bm', case when x.kind = 'tip' then x.amount_bm else 0 end) order by x.at desc), '[]'::json)
    from (select * from public.gifts g where g.to_user = (select auth.uid()) and not g.seen and g.kind in ('item', 'tip')
           order by g.at desc limit 20) x;
$fn$;
revoke execute on function public.gift_inbox() from public, anon;
grant execute on function public.gift_inbox() to authenticated;

create or replace function public.gifts_seen(ids bigint[]) returns void
language sql security definer set search_path = '' as $fn$
  update public.gifts set seen = true where to_user = (select auth.uid()) and id = any(ids[1:50]);
$fn$;
revoke execute on function public.gifts_seen(bigint[]) from public, anon;
grant execute on function public.gifts_seen(bigint[]) to authenticated;

-- ======================================================================= wallet + purchase history (Profile)
create or replace function public.my_wallet() returns json
language plpgsql stable security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid()); p public.profiles%rowtype;
begin
  if uid is null then return null; end if;
  select * into p from public.profiles where id = uid;
  return json_build_object(
    'diamonds', p.diamonds, 'bm', p.bm,
    'payments', (select coalesce(json_agg(json_build_object('at', y.at, 'pack', y.pack_id, 'diamonds', y.diamonds, 'amount_cents', y.amount_cents,
                   'currency', y.currency, 'status', y.status) order by y.at desc), '[]'::json)
                   from (select * from public.payments where user_id = uid order by at desc limit 50) y),
    'ledger', (select coalesce(json_agg(json_build_object('at', l.at, 'delta', l.delta, 'balance', l.balance, 'reason', l.reason, 'ref', l.ref) order by l.at desc), '[]'::json)
                 from (select * from public.diamond_ledger where user_id = uid order by at desc limit 50) l),
    'sent', (select coalesce(json_agg(json_build_object('at', g.at, 'kind', g.kind, 'to', g.to_name, 'gift', g.gift_id, 'bm', g.amount_bm, 'diamonds', g.diamonds) order by g.at desc), '[]'::json)
               from (select * from public.gifts where from_user = uid order by at desc limit 30) g),
    'received', (select coalesce(json_agg(json_build_object('at', g.at, 'kind', g.kind, 'from', g.from_name, 'gift', g.gift_id, 'bm', case when g.kind = 'tip' then g.amount_bm else 0 end) order by g.at desc), '[]'::json)
                   from (select * from public.gifts where to_user = uid order by at desc limit 30) g));
end; $fn$;
revoke execute on function public.my_wallet() from public, anon;
grant execute on function public.my_wallet() to authenticated;

-- ======================================================================= chat reports
create or replace function public.report_chat(p_room text, p_seat int, p_name text, p_text text, p_reported uuid default null, p_msg_id int default null)
returns json language plpgsql security definer set search_path = '' as $fn$
declare uid uuid := (select auth.uid());
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p_reported = uid then return json_build_object('ok', false, 'error', 'self'); end if;
  if (select count(*) from public.chat_reports r where r.reporter = uid and r.at > now() - interval '1 hour') >= 20 then
    return json_build_object('ok', false, 'error', 'throttle');
  end if;
  if exists (select 1 from public.chat_reports r where r.reporter = uid and r.room = p_room and r.msg_id = p_msg_id) then
    return json_build_object('ok', true, 'duplicate', true);
  end if;
  insert into public.chat_reports (reporter, room, seat, name, text, reported_user, msg_id)
    values (uid, left(coalesce(p_room, '?'), 8), p_seat, left(p_name, 24), left(coalesce(p_text, ''), 400), p_reported, p_msg_id);
  return json_build_object('ok', true);
end; $fn$;
revoke execute on function public.report_chat(text, int, text, text, uuid, int) from public, anon;
grant execute on function public.report_chat(text, int, text, text, uuid, int) to authenticated;

-- ======================================================================= payments (Worker webhook, service_role only)
-- Idempotent on the Checkout session id: Stripe retries and duplicate events never credit twice.
-- The Diamonds come from diamond_packs (never from request metadata); the paid amount must cover the pack price.
create or replace function public.credit_diamonds(p_session text, p_intent text, p_event text, p_user uuid, p_pack text, p_amount_cents int, p_currency text)
returns json language plpgsql security definer set search_path = '' as $fn$
declare pk public.diamond_packs%rowtype; pid bigint; bal bigint;
begin
  if p_session is null or p_user is null then return json_build_object('ok', false, 'error', 'bad'); end if;
  select * into pk from public.diamond_packs where id = p_pack;
  if not found then return json_build_object('ok', false, 'error', 'pack'); end if;
  if coalesce(p_amount_cents, 0) < pk.price_cents or lower(coalesce(p_currency, '')) <> pk.currency then
    return json_build_object('ok', false, 'error', 'amount');
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then return json_build_object('ok', false, 'error', 'user'); end if;
  insert into public.payments (user_id, session_id, payment_intent, event_id, pack_id, diamonds, amount_cents, currency)
    values (p_user, p_session, p_intent, p_event, pk.id, pk.diamonds, p_amount_cents, lower(p_currency))
    on conflict (session_id) do nothing
    returning id into pid;
  if pid is null then return json_build_object('ok', true, 'duplicate', true); end if;
  perform 1 from public.profiles where id = p_user for update;
  bal := public._dm_move(p_user, pk.diamonds, 'purchase', 'stripe:' || p_session);
  return json_build_object('ok', true, 'credited', pk.diamonds, 'diamonds', bal);
end; $fn$;
revoke execute on function public.credit_diamonds(text, text, text, uuid, text, int, text) from public, anon, authenticated;
grant execute on function public.credit_diamonds(text, text, text, uuid, text, int, text) to service_role;

-- Full refund (charge.refunded): removes the pack's Diamonds (down to 0 if some were already spent).
create or replace function public.refund_payment(p_intent text, p_event text default null)
returns json language plpgsql security definer set search_path = '' as $fn$
declare pay public.payments%rowtype; cur bigint; take bigint;
begin
  update public.payments set status = 'refunded', refunded_at = now()
   where payment_intent = p_intent and status = 'paid'
   returning * into pay;
  if not found then return json_build_object('ok', true, 'noop', true); end if;
  select diamonds into cur from public.profiles where id = pay.user_id for update;
  take := least(coalesce(cur, 0), pay.diamonds);
  if take > 0 then perform public._dm_move(pay.user_id, -take, 'refund', 'stripe:' || pay.session_id); end if;
  return json_build_object('ok', true, 'removed', take, 'shortfall', pay.diamonds - take);
end; $fn$;
revoke execute on function public.refund_payment(text, text) from public, anon, authenticated;
grant execute on function public.refund_payment(text, text) to service_role;

-- ======================================================================= admin
create or replace function public.admin_chat_reports(lim int default 100, only_open boolean default true)
returns table (id bigint, at timestamptz, room text, seat int, name text, text text, status text, reporter_name text, reported_name text, reported_user uuid)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not public.is_privileged() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select r.id, r.at, r.room, r.seat, r.name, r.text, r.status,
           public._display_name(a.username), public._display_name(b.username), r.reported_user
      from public.chat_reports r
      left join public.profiles a on a.id = r.reporter
      left join public.profiles b on b.id = r.reported_user
     where not only_open or r.status = 'open'
     order by r.at desc
     limit least(greatest(lim, 1), 500);
end; $fn$;
revoke execute on function public.admin_chat_reports(int, boolean) from public, anon;
grant execute on function public.admin_chat_reports(int, boolean) to authenticated;

create or replace function public.admin_resolve_report(report_id bigint, new_status text) returns boolean
language plpgsql security definer set search_path = '' as $fn$
begin
  if not public.is_privileged() then raise exception 'forbidden' using errcode = '42501'; end if;
  if new_status not in ('open', 'dismissed', 'actioned') then raise exception 'bad status'; end if;
  update public.chat_reports set status = new_status where id = report_id;
  return found;
end; $fn$;
revoke execute on function public.admin_resolve_report(bigint, text) from public, anon;
grant execute on function public.admin_resolve_report(bigint, text) to authenticated;

-- Test Diamonds for the owner / testers (admin may grant to anyone, god only to themselves). Logged as admin_grant.
create or replace function public.admin_grant_diamonds(uid uuid, amount bigint) returns json
language plpgsql security definer set search_path = '' as $fn$
declare me uuid := (select auth.uid()); r text; bal bigint;
begin
  select role into r from public.profiles where id = me;
  if r is null or r not in ('admin', 'god') then raise exception 'forbidden' using errcode = '42501'; end if;
  if r = 'god' and uid <> me then raise exception 'forbidden' using errcode = '42501'; end if;
  if amount is null or amount = 0 or abs(amount) > 1000000 then raise exception 'bad amount'; end if;
  perform 1 from public.profiles where id = uid for update;
  if not found then raise exception 'no such user'; end if;
  bal := public._dm_move(uid, greatest(amount, -(select diamonds from public.profiles where id = uid)), 'admin_grant', 'by:' || me);
  return json_build_object('ok', true, 'diamonds', bal);
end; $fn$;
revoke execute on function public.admin_grant_diamonds(uuid, bigint) from public, anon;
grant execute on function public.admin_grant_diamonds(uuid, bigint) to authenticated;
