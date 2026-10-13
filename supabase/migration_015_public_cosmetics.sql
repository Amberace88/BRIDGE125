-- Bridge 125 · 015 — opponents' cosmetics at the table
-- Run once in the Supabase SQL editor (after 013). Safe to re-run.
--
-- public_cosmetics(uids) returns, for at most 8 accounts, ONLY what any table seat may show about a player: the equipped
-- public cosmetic ids, the avatar (emoji / photo url — the photo is already public in the `avatars` bucket), level and
-- prestige. Never the email, BM / diamonds, owned items, role, ban state or any other private column.
--
-- Online rooms hand each client the token-verified account id of every signed-in seat (worker/room.ts → seats[i].uid);
-- the client calls this RPC with those ids and renders frames, name colours, titles, prestige stars and card backs.
-- The ids it reads are only displayed, never trusted for anything that matters. Equipped ids are already guarded by
-- the enforce_owned_cosmetics trigger (migration 003/008), so a row can only name items its owner may use.
--
-- Replaces the 008 version (authenticated-only, 12 ids, fewer columns): guests sit at online tables too.

drop function if exists public.public_cosmetics(uuid[]);

create function public.public_cosmetics(uids uuid[])
returns table (
  id uuid,
  frame text, title text, name_color text, card_back text, card_face text, victory text, banner text, emotes text,
  avatar text, avatar_url text, level int, prestige int
)
language sql stable security definer set search_path = '' as $fn$
  select p.id,
         p.frame, p.title, p.name_color, p.card_back, p.card_face, p.victory, p.banner, p.emotes,
         p.avatar, p.avatar_url, p.level, p.prestige
    from public.profiles p
   where uids is not null
     and p.id = any (uids[1:8])
     and not coalesce(p.banned, false);
$fn$;

revoke execute on function public.public_cosmetics(uuid[]) from public;
grant execute on function public.public_cosmetics(uuid[]) to anon, authenticated;

comment on function public.public_cosmetics(uuid[]) is
  'Public table look of up to 8 players (equipped cosmetic ids, avatar, level, prestige). No private fields.';
