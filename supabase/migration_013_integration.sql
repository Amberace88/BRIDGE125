-- Bridge 125 · 013 — integration of 010 (social) + 011 (journey) + 012 (economy). Run after 012; safe to re-run.
--
-- The Journey's finale title `t_grand_tour` (granted by _journey_record in 011) is an earned, never-sold cosmetic.
-- Listing it in shop_items (price_bm null → not buyable, not giftable) makes the ownership trigger from 008 refuse to
-- equip it unless it is owned — exactly like the ach_* items from 012. Admin / god keep equipping anything.
insert into public.shop_items (id, kind, price_bm, price_eur, grants_bm, rarity, active, sort, grants) values
  ('t_grand_tour', 'title', null, null, null, 'legendary', true, 911, null)
on conflict (id) do update set kind = excluded.kind, price_bm = null, rarity = excluded.rarity, active = excluded.active, sort = excluded.sort;
