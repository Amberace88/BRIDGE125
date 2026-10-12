-- Bridge 125 · 003 — 13 more UI languages (lt, et, pl, de, be, kk, uz, az, ka, hy, ro, bg, es)
-- schema.sql created profiles.lang with an inline check that only allowed en/lv/ru/uk, so saving any
-- new language to a signed-in profile was rejected (and the old value came back on the next sign-in).

alter table public.profiles drop constraint if exists profiles_lang_check;
alter table public.profiles add constraint profiles_lang_check
  check (lang in ('en','lv','ru','uk','lt','et','pl','de','be','kk','uz','az','ka','hy','ro','bg','es'));
