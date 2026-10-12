-- Bridge 125 · 004 — profile photos (avatar_url + public `avatars` storage bucket)
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------- profiles.avatar_url
alter table public.profiles add column if not exists avatar_url text;

-- only a public URL inside the owner's own avatars/<uid>/ folder is accepted (no hot-linking arbitrary images)
do $$ begin
  alter table public.profiles add constraint profiles_avatar_url_chk check (
    avatar_url is null or (
      char_length(avatar_url) <= 300
      and avatar_url ~ ('^https://[^/]+/storage/v1/object/public/avatars/' || id::text || '/[A-Za-z0-9._-]+$')
    )
  );
exception when duplicate_object then null; end $$;

grant update (avatar_url) on public.profiles to authenticated;

-- ---------------------------------------------------------------- storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket: files are readable by URL without any policy. The policies below only govern the API:
-- a signed-in player may list / upload / replace / delete objects under avatars/<own uid>/ and nothing else.
-- (No public SELECT policy on purpose — that would let anyone enumerate every avatar in the bucket.)
drop policy if exists avatars_select_own on storage.objects;
drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;

create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
