-- Bridge 125 · 005 — merch store: "notify me / pre-order interest" sign-ups
--
-- The table is locked (RLS on, no policies, no grants): the only way in is merch_interest_add(),
-- the only way out is admin_merch_interest() for admins. Safe to run more than once.

create table if not exists public.merch_interest (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  email text not null check (char_length(email) between 6 and 254),
  product_id text not null check (product_id ~ '^[a-z0-9-]{2,40}$'),
  variant text check (variant is null or char_length(variant) <= 60),
  lang text check (lang is null or lang ~ '^[a-z]{2}$'),
  user_id uuid references auth.users(id) on delete set null
);
create index if not exists merch_interest_email_product_at_idx on public.merch_interest (email, product_id, at desc);
create index if not exists merch_interest_at_idx on public.merch_interest (at desc);
alter table public.merch_interest enable row level security;   -- no policies: only security-definer functions touch it
revoke all on public.merch_interest from anon, authenticated;

-- Register interest in a product. Returns 'ok' | 'invalid' | 'rate_limited' (never raises for bad input).
create or replace function public.merch_interest_add(email text, product_id text, variant text default null, lang text default null)
returns text
language plpgsql security definer set search_path = '' as $fn$
declare
  v_email   text := lower(btrim(merch_interest_add.email));
  v_product text := lower(btrim(merch_interest_add.product_id));
  v_variant text := nullif(btrim(merch_interest_add.variant), '');
  v_lang    text := lower(nullif(btrim(merch_interest_add.lang), ''));
  v_uid     uuid := (select auth.uid());
begin
  if v_email is null or char_length(v_email) < 6 or char_length(v_email) > 254
     or v_email !~ '^[a-z0-9._%+''-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,24}$' then
    return 'invalid';
  end if;
  if v_product is null or v_product !~ '^[a-z0-9-]{2,40}$' then return 'invalid'; end if;
  if v_variant is not null and (char_length(v_variant) > 60 or v_variant ~ '[<>\r\n]') then return 'invalid'; end if;
  if v_lang is not null and v_lang !~ '^[a-z]{2}$' then v_lang := null; end if;

  -- simple rate limits: 3 sign-ups per email per product per day, 20 per email per day overall
  if (select count(*) from public.merch_interest mi
       where mi.email = v_email and mi.product_id = v_product and mi.at > now() - interval '1 day') >= 3
     or (select count(*) from public.merch_interest mi
       where mi.email = v_email and mi.at > now() - interval '1 day') >= 20 then
    return 'rate_limited';
  end if;

  insert into public.merch_interest (email, product_id, variant, lang, user_id)
  values (v_email, v_product, v_variant, v_lang, v_uid);
  return 'ok';
end; $fn$;
revoke execute on function public.merch_interest_add(text, text, text, text) from public;
grant execute on function public.merch_interest_add(text, text, text, text) to anon, authenticated;

-- Admin panel: every sign-up, newest first.
create or replace function public.admin_merch_interest()
returns table (id bigint, at timestamptz, email text, product_id text, variant text, lang text, user_id uuid)
language plpgsql stable security definer set search_path = '' as $fn$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select mi.id, mi.at, mi.email, mi.product_id, mi.variant, mi.lang, mi.user_id
      from public.merch_interest mi
     order by mi.at desc
     limit 5000;
end; $fn$;
revoke execute on function public.admin_merch_interest() from public, anon;  -- Supabase default privileges grant anon directly
grant execute on function public.admin_merch_interest() to authenticated;
