-- Bridge 125 · 021 — merch orders (Stripe Checkout → print-on-demand providers)
--
--   merch_orders       one paid Stripe Checkout session (brand is always 'bridge125')
--   merch_fulfilments  one provider order per order + provider (Printful / Gelato / Prodigi / Printify), with
--                      status, tracking, retries and a "needs attention" flag for the admin
--   merch_order_items  the cart lines, each assigned to a fulfilment
--   merch_events       processed webhook ids (idempotency)
--
-- Writes only through the Worker (service_role). Players read their own orders (RLS), admins read everything and
-- act through admin_merch_action(). Safe to run more than once. Run after 001–020.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------------------------- tables
create table if not exists public.merch_orders (
  id uuid primary key default gen_random_uuid(),
  brand text not null default 'bridge125' check (brand = 'bridge125'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  email text check (email is null or char_length(email) <= 254),
  lang text check (lang is null or lang ~ '^[a-z]{2}$'),
  stripe_session_id text not null unique,
  stripe_payment_intent text,
  stripe_event_id text,
  status text not null default 'paid'
    check (status in ('paid', 'processing', 'partially_shipped', 'shipped', 'delivered', 'canceled', 'refunded')),
  needs_attention boolean not null default false,
  currency text not null default 'eur',
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  ship_zone text,
  ship_country text check (ship_country is null or ship_country ~ '^[A-Z]{2}$'),
  shipping_address jsonb,                      -- snapshot: {name, line1, line2, city, state, postal_code, country, phone}
  refunded_at timestamptz,
  admin_note text
);
create index if not exists merch_orders_user_idx on public.merch_orders (user_id, created_at desc);
create index if not exists merch_orders_created_idx on public.merch_orders (created_at desc);
create index if not exists merch_orders_intent_idx on public.merch_orders (stripe_payment_intent);
create index if not exists merch_orders_attention_idx on public.merch_orders (created_at desc) where needs_attention;

create table if not exists public.merch_fulfilments (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.merch_orders(id) on delete cascade,
  provider text check (provider is null or provider in ('printful', 'gelato', 'prodigi', 'printify')),
  tried text[] not null default '{}',          -- providers already given up on (fallback chain)
  external_id text unique check (external_id is null or external_id like 'b125-%'),
  provider_order_id text,
  status text not null default 'queued'
    check (status in ('queued', 'submitting', 'submitted', 'in_production', 'partially_shipped', 'shipped', 'delivered', 'failed', 'canceled', 'manual')),
  provider_status text,
  attention text,                               -- provider-reported problem (on hold, file issue, refunded after submit …)
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  last_error text,
  tracking jsonb not null default '[]'::jsonb,  -- [{carrier, number, url, shippedAt, deliveredAt}]
  submitted_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  polled_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists merch_fulfilments_order_idx on public.merch_fulfilments (order_id);
create index if not exists merch_fulfilments_due_idx on public.merch_fulfilments (next_attempt_at) where status in ('queued', 'submitting');
create index if not exists merch_fulfilments_poll_idx on public.merch_fulfilments (polled_at nulls first) where status in ('submitted', 'in_production', 'partially_shipped', 'shipped');
create unique index if not exists merch_fulfilments_provider_order_uq on public.merch_fulfilments (provider, provider_order_id) where provider_order_id is not null;

create table if not exists public.merch_order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.merch_orders(id) on delete cascade,
  fulfilment_id bigint references public.merch_fulfilments(id) on delete set null,
  product_id text not null check (product_id ~ '^[a-z0-9-]{2,40}$'),
  colour text check (colour is null or char_length(colour) <= 20),
  size text check (size is null or char_length(size) <= 30),
  qty integer not null check (qty between 1 and 10),
  unit_cents integer not null check (unit_cents >= 0),
  title text check (title is null or char_length(title) <= 120)
);
create index if not exists merch_order_items_order_idx on public.merch_order_items (order_id);
create index if not exists merch_order_items_fulfilment_idx on public.merch_order_items (fulfilment_id);

create table if not exists public.merch_events (
  source text not null,
  event_id text not null,
  at timestamptz not null default now(),
  primary key (source, event_id)
);

-- ---------------------------------------------------------------------------------------------- RLS
alter table public.merch_orders enable row level security;
alter table public.merch_fulfilments enable row level security;
alter table public.merch_order_items enable row level security;
alter table public.merch_events enable row level security;      -- no policies: service_role only

revoke all on public.merch_orders, public.merch_fulfilments, public.merch_order_items, public.merch_events from anon, authenticated;
grant select on public.merch_orders, public.merch_fulfilments, public.merch_order_items to authenticated;
grant select, insert, update, delete on public.merch_orders, public.merch_fulfilments, public.merch_order_items, public.merch_events to service_role;

drop policy if exists merch_orders_read on public.merch_orders;
create policy merch_orders_read on public.merch_orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists merch_fulfilments_read on public.merch_fulfilments;
create policy merch_fulfilments_read on public.merch_fulfilments for select to authenticated
  using (exists (select 1 from public.merch_orders o where o.id = order_id and (o.user_id = (select auth.uid()) or (select public.is_admin()))));

drop policy if exists merch_order_items_read on public.merch_order_items;
create policy merch_order_items_read on public.merch_order_items for select to authenticated
  using (exists (select 1 from public.merch_orders o where o.id = order_id and (o.user_id = (select auth.uid()) or (select public.is_admin()))));

-- ---------------------------------------------------------------------------------------------- order status roll-up
create or replace function public._merch_rollup(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $fn$
declare n int; n_cancel int; n_deliv int; n_done int; n_ship int; n_started int; n_attn int; v_ref timestamptz;
begin
  select count(*),
         count(*) filter (where f.status = 'canceled'),
         count(*) filter (where f.status = 'delivered'),
         count(*) filter (where f.status in ('shipped', 'delivered', 'manual')),
         count(*) filter (where f.status in ('partially_shipped', 'shipped', 'delivered', 'manual')),
         count(*) filter (where f.status in ('submitted', 'in_production', 'partially_shipped', 'shipped', 'delivered', 'manual')),
         count(*) filter (where f.status = 'failed' or f.attention is not null)
    into n, n_cancel, n_deliv, n_done, n_ship, n_started, n_attn
    from public.merch_fulfilments f where f.order_id = p_order;
  select o.refunded_at into v_ref from public.merch_orders o where o.id = p_order;
  update public.merch_orders o set
    needs_attention = n_attn > 0,
    status = case
      when v_ref is not null then 'refunded'
      when n > 0 and n_cancel = n then 'canceled'
      when n - n_cancel > 0 and n_deliv = n - n_cancel then 'delivered'
      when n - n_cancel > 0 and n_done = n - n_cancel then 'shipped'
      when n_ship > 0 then 'partially_shipped'
      when n_started > 0 then 'processing'
      else 'paid' end,
    updated_at = now()
   where o.id = p_order;
end; $fn$;
revoke execute on function public._merch_rollup(uuid) from public, anon, authenticated;

create or replace function public._merch_fulfilment_changed() returns trigger
language plpgsql security definer set search_path = '' as $fn$
begin
  perform public._merch_rollup(coalesce(new.order_id, old.order_id));
  return null;
end; $fn$;
revoke execute on function public._merch_fulfilment_changed() from public, anon, authenticated;

drop trigger if exists merch_fulfilments_rollup on public.merch_fulfilments;
create trigger merch_fulfilments_rollup after insert or update or delete on public.merch_fulfilments
  for each row execute function public._merch_fulfilment_changed();

create or replace function public._merch_touch() returns trigger
language plpgsql set search_path = '' as $fn$
begin new.updated_at := now(); return new; end; $fn$;
drop trigger if exists merch_fulfilments_touch on public.merch_fulfilments;
create trigger merch_fulfilments_touch before update on public.merch_fulfilments for each row execute function public._merch_touch();

-- ---------------------------------------------------------------------------------------------- Worker RPCs (service_role)

-- Record a paid Checkout session with its items and fulfilments. Idempotent on stripe_session_id.
create or replace function public.merch_order_record(p jsonb) returns json
language plpgsql security definer set search_path = '' as $fn$
declare v_id uuid; v_uid uuid; f jsonb; it jsonb; v_fid bigint; v_map jsonb := '{}'::jsonb;
begin
  if coalesce(p->>'brand', '') <> 'bridge125' then raise exception 'brand mismatch'; end if;
  if coalesce(p->>'stripe_session_id', '') = '' then raise exception 'session required'; end if;
  v_uid := case when coalesce(p->>'user_id', '') ~ '^[0-9a-f-]{36}$'
                 and exists (select 1 from auth.users u where u.id = (p->>'user_id')::uuid)
                then (p->>'user_id')::uuid end;

  insert into public.merch_orders (id, user_id, email, lang, stripe_session_id, stripe_payment_intent, stripe_event_id, currency,
                                   subtotal_cents, shipping_cents, tax_cents, total_cents, ship_zone, ship_country, shipping_address)
  values (coalesce(nullif(p->>'id', '')::uuid, gen_random_uuid()), v_uid, nullif(p->>'email', ''),
          case when coalesce(p->>'lang', '') ~ '^[a-z]{2}$' then p->>'lang' end,
          p->>'stripe_session_id', nullif(p->>'stripe_payment_intent', ''), nullif(p->>'stripe_event_id', ''),
          coalesce(nullif(p->>'currency', ''), 'eur'),
          greatest(coalesce((p->>'subtotal_cents')::int, 0), 0), greatest(coalesce((p->>'shipping_cents')::int, 0), 0),
          greatest(coalesce((p->>'tax_cents')::int, 0), 0), greatest(coalesce((p->>'total_cents')::int, 0), 0),
          nullif(p->>'ship_zone', ''),
          case when coalesce(p->>'ship_country', '') ~ '^[A-Z]{2}$' then p->>'ship_country' end,
          p->'shipping_address')
  on conflict (stripe_session_id) do nothing
  returning id into v_id;

  if v_id is null then
    select o.id into v_id from public.merch_orders o where o.stripe_session_id = p->>'stripe_session_id';
    return json_build_object('id', v_id, 'created', false);
  end if;

  for f in select * from jsonb_array_elements(coalesce(p->'fulfilments', '[]'::jsonb)) loop
    insert into public.merch_fulfilments (order_id, provider, external_id, status, last_error)
    values (v_id, nullif(f->>'provider', ''), nullif(f->>'external_id', ''), coalesce(nullif(f->>'status', ''), 'queued'), nullif(f->>'last_error', ''))
    returning id into v_fid;
    v_map := v_map || jsonb_build_object(f->>'key', v_fid);
  end loop;

  for it in select * from jsonb_array_elements(coalesce(p->'items', '[]'::jsonb)) loop
    insert into public.merch_order_items (order_id, fulfilment_id, product_id, colour, size, qty, unit_cents, title)
    values (v_id, (v_map->>(it->>'fkey'))::bigint, it->>'product_id', nullif(it->>'colour', ''), nullif(it->>'size', ''),
            (it->>'qty')::int, (it->>'unit_cents')::int, left(it->>'title', 120));
  end loop;

  perform public._merch_rollup(v_id);
  return json_build_object('id', v_id, 'created', true);
end; $fn$;
revoke execute on function public.merch_order_record(jsonb) from public, anon, authenticated;
grant execute on function public.merch_order_record(jsonb) to service_role;

-- Claim due fulfilments for submission (also re-claims ones whose worker died mid-submit). One worker per row.
create or replace function public.merch_claim(p_id bigint default null, p_limit integer default 5)
returns setof public.merch_fulfilments
language plpgsql security definer set search_path = '' as $fn$
begin
  return query
  update public.merch_fulfilments f
     set status = 'submitting', locked_until = now() + interval '3 minutes', attempts = f.attempts + 1
   where f.id in (
     select x.id from public.merch_fulfilments x
      where (p_id is null or x.id = p_id)
        and ((x.status = 'queued' and (p_id is not null or x.next_attempt_at <= now()))
             or (x.status = 'submitting' and x.locked_until < now()))
      order by x.next_attempt_at
      limit greatest(1, least(coalesce(p_limit, 5), 25))
      for update skip locked)
  returning f.*;
end; $fn$;
revoke execute on function public.merch_claim(bigint, integer) from public, anon, authenticated;
grant execute on function public.merch_claim(bigint, integer) to service_role;

-- Full refund in Stripe: mark the order refunded, cancel what was not sent yet, flag what was.
create or replace function public.merch_mark_refunded(p_intent text, p_event text default null) returns json
language plpgsql security definer set search_path = '' as $fn$
declare v_id uuid; n_sent int;
begin
  update public.merch_orders o set refunded_at = coalesce(o.refunded_at, now())
   where o.stripe_payment_intent = p_intent
   returning o.id into v_id;
  if v_id is null then return json_build_object('ok', true, 'noop', true); end if;
  update public.merch_fulfilments f set status = 'canceled', locked_until = null
   where f.order_id = v_id and f.status in ('queued', 'failed');
  update public.merch_fulfilments f
     set attention = 'Refunded in Stripe after the order was sent to ' || coalesce(f.provider, '?') || ' — cancel it there if it is not printed yet'
   where f.order_id = v_id and f.provider_order_id is not null and f.status in ('submitting', 'submitted', 'in_production');
  get diagnostics n_sent = row_count;
  perform public._merch_rollup(v_id);
  return json_build_object('ok', true, 'order', v_id, 'sent_to_provider', n_sent);
end; $fn$;
revoke execute on function public.merch_mark_refunded(text, text) from public, anon, authenticated;
grant execute on function public.merch_mark_refunded(text, text) to service_role;

-- ---------------------------------------------------------------------------------------------- admin
-- retry   → queue again now (after fixing a mapping / secret / brand-guard problem)
-- resolve → handled by hand (e.g. ordered manually): failed → manual, clears the attention flag
-- cancel  → stop (an order already sent must also be cancelled in the provider dashboard)
-- note    → just store a note
create or replace function public.admin_merch_action(p_fulfilment bigint, p_action text, p_note text default null) returns boolean
language plpgsql security definer set search_path = '' as $fn$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_action = 'retry' then
    update public.merch_fulfilments f
       set status = 'queued', next_attempt_at = now(), attempts = 0, attention = null, last_error = null, locked_until = null,
           admin_note = coalesce(p_note, f.admin_note)
     where f.id = p_fulfilment and f.status in ('failed', 'queued', 'canceled', 'manual') and f.provider is not null;
  elsif p_action = 'resolve' then
    update public.merch_fulfilments f
       set status = case when f.status in ('failed', 'queued', 'submitting') then 'manual' else f.status end,
           attention = null, locked_until = null, admin_note = coalesce(p_note, f.admin_note)
     where f.id = p_fulfilment;
  elsif p_action = 'cancel' then
    update public.merch_fulfilments f
       set status = 'canceled', attention = null, locked_until = null, admin_note = coalesce(p_note, f.admin_note)
     where f.id = p_fulfilment and f.status not in ('shipped', 'delivered');
  elsif p_action = 'note' then
    update public.merch_fulfilments f set admin_note = p_note where f.id = p_fulfilment;
  else
    raise exception 'bad action';
  end if;
  return found;
end; $fn$;
revoke execute on function public.admin_merch_action(bigint, text, text) from public, anon;
grant execute on function public.admin_merch_action(bigint, text, text) to authenticated;
