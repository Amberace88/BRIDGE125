-- Bridge 125 · 008 — premium personalization wave 2
--   * 8 tables, 13 card backs, card faces (deck styles), avatar frames, victory effects, emote packs, title badges,
--     name colours and profile banners — all sold for BM in the shop (€ prices are informational until payments exist)
--   * packs: discounted sets of other items (shop_items.grants); buy_item() unlocks every missing item at once
--   * new equipped-cosmetic columns on profiles, client-writable, guarded by the ownership trigger
--
-- Run once in the Supabase SQL editor after 001–007 (safe to re-run).
-- Keep in sync with src/shop/catalog.ts and src/cosmetics/data.ts (unit tests compare them).
-- Owner ('admin') and co-author / main tester ('god') get everything free: buy_item() charges them 0 and the
-- trigger lets them equip anything without owning it.

-- ======================================================================= profile columns (equipped cosmetics)
-- null = the free default (Classic face, Brass ring, Gold sparkle, Classic emotes, no title, default name colour, Felt banner)
alter table public.profiles add column if not exists card_face  text;
alter table public.profiles add column if not exists frame      text;
alter table public.profiles add column if not exists victory    text;
alter table public.profiles add column if not exists emotes     text;
alter table public.profiles add column if not exists title      text;
alter table public.profiles add column if not exists name_color text;
alter table public.profiles add column if not exists banner     text;
do $$ begin
  alter table public.profiles add constraint profiles_cosmetic_ids_chk check (
        coalesce(card_face, '')  ~ '^[a-z0-9_]{0,32}$' and coalesce(frame, '')      ~ '^[a-z0-9_]{0,32}$'
    and coalesce(victory, '')    ~ '^[a-z0-9_]{0,32}$' and coalesce(emotes, '')     ~ '^[a-z0-9_]{0,32}$'
    and coalesce(title, '')      ~ '^[a-z0-9_]{0,32}$' and coalesce(name_color, '') ~ '^[a-z0-9_]{0,32}$'
    and coalesce(banner, '')     ~ '^[a-z0-9_]{0,32}$');
exception when duplicate_object then null; end $$;
grant update (card_face, frame, victory, emotes, title, name_color, banner) on public.profiles to authenticated;

-- ======================================================================= catalogue: new kinds + pack contents
alter table public.shop_items add column if not exists grants text[];
do $$ declare c record; begin
  for c in select con.conname from pg_constraint con
            where con.conrelid = 'public.shop_items'::regclass and con.contype = 'c' and pg_get_constraintdef(con.oid) ilike '%kind%'
  loop execute format('alter table public.shop_items drop constraint %I', c.conname); end loop;
end $$;
alter table public.shop_items add constraint shop_items_kind_check check (kind in (
  'accent', 'table', 'back', 'set', 'face', 'frame', 'victory', 'emotes', 'title', 'namecolor', 'banner', 'pack', 'bundle', 'pass'));
alter table public.shop_items drop constraint if exists shop_items_pack_grants_chk;
alter table public.shop_items add constraint shop_items_pack_grants_chk check ((kind = 'pack') = (grants is not null));

-- Item ids are globally unique (profile.owned is one flat list). Prefixes: bk_ back · f_ face · fr_ frame ·
-- vx_ victory · em_ emotes · t_ title · nc_ name colour · bn_ banner · pk_ pack. New tables use plain ids like 003.
insert into public.shop_items (id, kind, price_bm, price_eur, grants_bm, rarity, active, sort, grants) values
  ('marble',        'table',      6000, null, null, 'epic',      true, 100, null),
  ('emvelvet',      'table',      5500, null, null, 'epic',      true, 101, null),
  ('oldriga',       'table',      9000, null, null, 'legendary', true, 102, null),
  ('yacht',         'table',      8500, null, null, 'legendary', true, 103, null),
  ('aurora',        'table',      9500, null, null, 'legendary', true, 104, null),
  ('damask',        'table',      6500, null, null, 'epic',      true, 105, null),
  ('sakura',        'table',      3500, null, null, 'rare',      true, 106, null),
  ('carbonrace',    'table',      4000, null, null, 'rare',      true, 107, null),
  ('bk_onyx',       'back',       6000, null, null, 'legendary', true, 108, null),
  ('bk_holo',       'back',       7000, null, null, 'legendary', true, 109, null),
  ('bk_dragon',     'back',       6500, null, null, 'legendary', true, 110, null),
  ('bk_marble',     'back',       3500, null, null, 'epic',      true, 111, null),
  ('bk_damask',     'back',       3500, null, null, 'epic',      true, 112, null),
  ('bk_aurora',     'back',       4000, null, null, 'epic',      true, 113, null),
  ('bk_riga',       'back',       4000, null, null, 'epic',      true, 114, null),
  ('bk_deco',       'back',       3500, null, null, 'epic',      true, 115, null),
  ('bk_sakura',     'back',       2000, null, null, 'rare',      true, 116, null),
  ('bk_racing',     'back',       2000, null, null, 'rare',      true, 117, null),
  ('bk_teak',       'back',       2200, null, null, 'rare',      true, 118, null),
  ('bk_studs',      'back',       2200, null, null, 'rare',      true, 119, null),
  ('bk_tartan',     'back',        900, null, null, 'common',    true, 120, null),
  ('f_minimal',     'face',       2500, null, null, 'rare',      true, 121, null),
  ('f_deco',        'face',       4500, null, null, 'epic',      true, 122, null),
  ('f_neon',        'face',       5000, null, null, 'epic',      true, 123, null),
  ('f_royal',       'face',       8000, null, null, 'legendary', true, 124, null),
  ('fr_neon',       'frame',      2500, null, null, 'rare',      true, 125, null),
  ('fr_laurel',     'frame',      4500, null, null, 'epic',      true, 126, null),
  ('fr_flames',     'frame',      5000, null, null, 'epic',      true, 127, null),
  ('fr_ice',        'frame',      5000, null, null, 'epic',      true, 128, null),
  ('fr_crown',      'frame',      8000, null, null, 'legendary', true, 129, null),
  ('fr_diamond',    'frame',     10000, null, null, 'legendary', true, 130, null),
  ('vx_confetti',   'victory',    3000, null, null, 'rare',      true, 131, null),
  ('vx_fireworks',  'victory',    5000, null, null, 'epic',      true, 132, null),
  ('vx_waterfall',  'victory',    5500, null, null, 'epic',      true, 133, null),
  ('vx_crowns',     'victory',    8000, null, null, 'legendary', true, 134, null),
  ('em_cheeky',     'emotes',     1800, null, null, 'rare',      true, 135, null),
  ('em_animals',    'emotes',     1800, null, null, 'rare',      true, 136, null),
  ('em_casino',     'emotes',     3000, null, null, 'epic',      true, 137, null),
  ('em_royal',      'emotes',     3500, null, null, 'epic',      true, 138, null),
  ('t_lucky',       'title',      1500, null, null, 'common',    true, 139, null),
  ('t_shark',       'title',      2500, null, null, 'rare',      true, 140, null),
  ('t_bluff',       'title',      3500, null, null, 'epic',      true, 141, null),
  ('t_queenslayer', 'title',      4500, null, null, 'epic',      true, 142, null),
  ('t_highroller',  'title',      5000, null, null, 'epic',      true, 143, null),
  ('t_master',      'title',      9000, null, null, 'legendary', true, 144, null),
  ('t_legend',      'title',     12000, null, null, 'legendary', true, 145, null),
  ('nc_gold',       'namecolor',  1500, null, null, 'rare',      true, 146, null),
  ('nc_ruby',       'namecolor',  1500, null, null, 'rare',      true, 147, null),
  ('nc_ice',        'namecolor',  1500, null, null, 'rare',      true, 148, null),
  ('nc_emerald',    'namecolor',  1500, null, null, 'rare',      true, 149, null),
  ('nc_neon',       'namecolor',  3000, null, null, 'epic',      true, 150, null),
  ('nc_fire',       'namecolor',  3500, null, null, 'epic',      true, 151, null),
  ('nc_holo',       'namecolor',  6000, null, null, 'legendary', true, 152, null),
  ('bn_bokeh',      'banner',     2000, null, null, 'rare',      true, 153, null),
  ('bn_sunburst',   'banner',     3500, null, null, 'epic',      true, 154, null),
  ('bn_aurora',     'banner',     3500, null, null, 'epic',      true, 155, null),
  ('bn_riga',       'banner',     4000, null, null, 'epic',      true, 156, null),
  ('bn_suits',      'banner',     6000, null, null, 'legendary', true, 157, null),
  ('pk_starter',    'pack',       3500, 0.99, null, 'rare',      true, 158, array['emerald', 'bk_tartan', 'fr_neon', 'em_cheeky']),
  ('pk_sakura',     'pack',       5900, 1.99, null, 'rare',      true, 159, array['sakura', 'bk_sakura', 'em_animals', 'nc_ruby']),
  ('pk_racing',     'pack',      10900, 2.99, null, 'epic',      true, 160, array['carbonrace', 'bk_racing', 'fr_flames', 'vx_fireworks']),
  ('pk_neon',       'pack',      12900, 3.99, null, 'epic',      true, 161, array['synth', 'neon', 'f_neon', 'fr_neon', 'nc_neon']),
  ('pk_aurora',     'pack',      12900, 3.99, null, 'epic',      true, 162, array['aurora', 'bk_aurora', 'nc_ice', 'bn_aurora']),
  ('pk_montecarlo', 'pack',      14900, 4.99, null, 'legendary', true, 163, array['montecarlo', 'gold', 'fr_laurel', 't_highroller']),
  ('pk_riga',       'pack',      15900, 4.99, null, 'legendary', true, 164, array['oldriga', 'bk_riga', 'fr_ice', 'bn_riga']),
  ('pk_royal',      'pack',      27900, 7.99, null, 'legendary', true, 165, array['royal', 'f_royal', 'fr_crown', 'vx_crowns', 't_legend'])
on conflict (id) do update set kind = excluded.kind, price_bm = excluded.price_bm, price_eur = excluded.price_eur,
  grants_bm = excluded.grants_bm, rarity = excluded.rarity, active = excluded.active, sort = excluded.sort, grants = excluded.grants;

-- ======================================================================= shop: buy with BM (replaces 003)
-- Errors: auth · banned · unknown · owned · funds (+ need). Packs: every not-yet-owned item of the pack is added; when
-- some are owned already the price shrinks proportionally (rounded to 10 BM, min 10) — mirrors packPrice() in
-- src/shop/catalog.ts. Privileged roles (admin, god) pay 0.
create or replace function public.buy_item(item_id text) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  p public.profiles%rowtype;
  it public.shop_items%rowtype;
  adm boolean;
  missing text[];
  full_worth int; miss_worth int;
  price int;
  add_ids text[];
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  select * into p from public.profiles where id = uid for update;
  if not found then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p.banned then return json_build_object('ok', false, 'error', 'banned'); end if;

  select * into it from public.shop_items s where s.id = buy_item.item_id and s.active;
  if not found or it.price_bm is null
     or it.kind not in ('accent', 'table', 'back', 'set', 'face', 'frame', 'victory', 'emotes', 'title', 'namecolor', 'banner', 'pack') then
    return json_build_object('ok', false, 'error', 'unknown');
  end if;
  adm := p.role in ('admin', 'god');

  if it.kind = 'pack' then
    select coalesce(array_agg(g), '{}') into missing from unnest(coalesce(it.grants, '{}')) as g where not (g = any(p.owned));
    if cardinality(missing) = 0 then
      return json_build_object('ok', false, 'error', 'owned', 'bm', p.bm, 'owned', p.owned);
    end if;
    select coalesce(sum(s.price_bm), 0)::int into full_worth from public.shop_items s where s.id = any(it.grants);
    select coalesce(sum(s.price_bm), 0)::int into miss_worth from public.shop_items s where s.id = any(missing);
    price := case when full_worth = 0 or miss_worth >= full_worth then it.price_bm
                  else greatest(10, (round(it.price_bm::numeric * miss_worth / full_worth / 10) * 10)::int) end;
    add_ids := missing || case when it.id = any(p.owned) then '{}'::text[] else array[it.id] end;
  else
    if it.id = any(p.owned) then
      return json_build_object('ok', false, 'error', 'owned', 'bm', p.bm, 'owned', p.owned);
    end if;
    price := it.price_bm;
    add_ids := array[it.id];
  end if;

  if not adm and p.bm < price then
    return json_build_object('ok', false, 'error', 'funds', 'need', price - p.bm, 'bm', p.bm);
  end if;

  update public.profiles set
      bm = bm - case when adm then 0 else price end,
      owned = owned || add_ids
   where id = uid
   returning * into p;
  insert into public.purchases (user_id, item_id, price_bm, admin) values (uid, it.id, case when adm then 0 else price end, adm);

  return json_build_object('ok', true, 'item', it.id, 'price', case when adm then 0 else price end,
    'admin', adm, 'bm', p.bm, 'owned', p.owned, 'granted', add_ids);
end; $fn$;
revoke execute on function public.buy_item(text) from public, anon;
grant execute on function public.buy_item(text) to authenticated;

-- ======================================================================= ownership is enforced on equip (replaces 003)
-- A premium id only sticks when it is owned (or the player is admin / god); otherwise the old value is kept.
-- Free ids (not in shop_items) always pass.
create or replace function public.enforce_owned_cosmetics() returns trigger
language plpgsql security definer set search_path = '' as $fn$
begin
  if new.role in ('admin', 'god') then return new; end if;
  if new.accent is distinct from old.accent and not (new.accent = any(new.owned))
     and exists (select 1 from public.shop_items s where s.id = new.accent and s.kind in ('accent', 'set')) then
    new.accent := old.accent;
  end if;
  if new.background is distinct from old.background and not (new.background = any(new.owned))
     and exists (select 1 from public.shop_items s where s.id = new.background and s.kind in ('table', 'set')) then
    new.background := old.background;
  end if;
  if new.card_back is distinct from old.card_back and not (new.card_back = any(new.owned))
     and exists (select 1 from public.shop_items s where s.id = new.card_back and s.kind in ('back', 'set')) then
    new.card_back := old.card_back;
  end if;
  if new.card_face is distinct from old.card_face and not (coalesce(new.card_face, '') = any(new.owned))
     and exists (select 1 from public.shop_items s where s.id = new.card_face and s.kind = 'face') then
    new.card_face := old.card_face;
  end if;
  if new.frame is distinct from old.frame and not (coalesce(new.frame, '') = any(new.owned))
     and exists (select 1 from public.shop_items s where s.id = new.frame and s.kind = 'frame') then
    new.frame := old.frame;
  end if;
  if new.victory is distinct from old.victory and not (coalesce(new.victory, '') = any(new.owned))
     and exists (select 1 from public.shop_items s where s.id = new.victory and s.kind = 'victory') then
    new.victory := old.victory;
  end if;
  if new.emotes is distinct from old.emotes and not (coalesce(new.emotes, '') = any(new.owned))
     and exists (select 1 from public.shop_items s where s.id = new.emotes and s.kind = 'emotes') then
    new.emotes := old.emotes;
  end if;
  if new.title is distinct from old.title and not (coalesce(new.title, '') = any(new.owned))
     and exists (select 1 from public.shop_items s where s.id = new.title and s.kind = 'title') then
    new.title := old.title;
  end if;
  if new.name_color is distinct from old.name_color and not (coalesce(new.name_color, '') = any(new.owned))
     and exists (select 1 from public.shop_items s where s.id = new.name_color and s.kind = 'namecolor') then
    new.name_color := old.name_color;
  end if;
  if new.banner is distinct from old.banner and not (coalesce(new.banner, '') = any(new.owned))
     and exists (select 1 from public.shop_items s where s.id = new.banner and s.kind = 'banner') then
    new.banner := old.banner;
  end if;
  return new;
end; $fn$;
revoke execute on function public.enforce_owned_cosmetics() from public, anon, authenticated;
drop trigger if exists profiles_owned_cosmetics on public.profiles;
create trigger profiles_owned_cosmetics
  before update of accent, background, card_back, card_face, frame, victory, emotes, title, name_color, banner on public.profiles
  for each row execute function public.enforce_owned_cosmetics();

-- ======================================================================= other players' look (seats, leaderboard)
-- profiles are select-own only; this returns just the public cosmetic columns of up to 12 players (no email / BM).
create or replace function public.public_cosmetics(uids uuid[])
returns table (id uuid, frame text, title text, name_color text, banner text, card_face text, victory text)
language sql stable security definer set search_path = '' as $fn$
  select p.id, p.frame, p.title, p.name_color, p.banner, p.card_face, p.victory
    from public.profiles p
   where p.id = any(uids[1:12]) and not p.banned;
$fn$;
revoke execute on function public.public_cosmetics(uuid[]) from public, anon;
grant execute on function public.public_cosmetics(uuid[]) to authenticated;
