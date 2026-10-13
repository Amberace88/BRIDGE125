-- Bridge 125 · 023 — idempotent result submission for the offline queue (src/offline)
--
-- Results of games played offline (or whose request failed) are queued on the device and sent later — possibly twice:
-- a request can reach the server and its answer still get lost. record_game_plus, stake_finish, record_minigame,
-- quest_progress and report_game_stats are NOT idempotent, so every queued result carries a client nonce (uuid) and
-- goes through submit_once(), which runs the original function and remembers the nonce in the SAME transaction:
--   * a nonce seen before → {ok:false, error:'dup', result:<the first answer>} — nothing is paid again;
--   * the inner function failing rolls the nonce back too (nothing half-recorded);
--   * a "not now" answer (rate limit 'slow' / record_game's throttle) forgets the nonce so the retry can count.
-- journey_complete is routed here as well (it is idempotent by itself: stars only ever go up).
-- Daily-challenge submissions don't need it (one result per account per day, 'done' on repeat).
--
-- Additive only: no existing function changes. Clients fall back to the plain RPCs while this is not applied.
-- Safe to run more than once. Run after 001–022.

create table if not exists public.client_nonces (
  nonce      uuid primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  result     jsonb,
  created_at timestamptz not null default now()
);
create index if not exists client_nonces_created_idx on public.client_nonces (created_at);
alter table public.client_nonces enable row level security;   -- no policies: only submit_once() touches it
revoke all on public.client_nonces from public, anon, authenticated;

create or replace function public.submit_once(p_nonce uuid, p_kind text, p_args jsonb) returns json
language plpgsql security definer set search_path = '' as $fn$
declare
  uid uuid := (select auth.uid());
  prev public.client_nonces%rowtype;
  last timestamptz;
  r json; j jsonb;
begin
  if uid is null then return json_build_object('ok', false, 'error', 'auth'); end if;
  if p_nonce is null or p_args is null or jsonb_typeof(p_args) <> 'object' or length(p_args::text) > 4096
     or p_kind not in ('game', 'stake', 'mini', 'quest', 'stats', 'journey') then
    return json_build_object('ok', false, 'error', 'bad');
  end if;

  -- claim the nonce first: a concurrent duplicate blocks here until this transaction ends, then sees the conflict
  insert into public.client_nonces (nonce, user_id, kind) values (p_nonce, uid, p_kind) on conflict (nonce) do nothing;
  if not found then
    select * into prev from public.client_nonces where nonce = p_nonce;
    if prev.user_id is distinct from uid then return json_build_object('ok', false, 'error', 'bad'); end if;
    return json_build_object('ok', false, 'error', 'dup', 'result', prev.result);
  end if;

  -- Bridge games: record_game counts at most one game per 30 s and a stake settled inside that window is voided —
  -- ask the client to come back instead (the nonce is released)
  if p_kind in ('game', 'stake') then
    select p.last_game_at into last from public.profiles p where p.id = uid;
    if last is not null and last > now() - interval '30 seconds' then
      delete from public.client_nonces where nonce = p_nonce;
      return json_build_object('ok', false, 'error', 'slow',
        'retry_in', greatest(1, ceil(extract(epoch from (last + interval '30 seconds' - now())))::int));
    end if;
  end if;

  r := case p_kind
    when 'game'    then public.record_game_plus((p_args ->> 'won')::boolean, p_args ->> 'mode')
    when 'stake'   then public.stake_finish((p_args ->> 'won')::boolean)
    when 'mini'    then public.record_minigame(
                          p_game => p_args ->> 'p_game', p_won => (p_args ->> 'p_won')::boolean,
                          p_score => (p_args ->> 'p_score')::numeric, p_seconds => (p_args ->> 'p_seconds')::numeric,
                          p_level => p_args ->> 'p_level', p_day => p_args ->> 'p_day',
                          p_details => coalesce(p_args -> 'p_details', '{}'::jsonb))
    when 'quest'   then public.quest_progress(p_args -> 'events')
    when 'stats'   then public.report_game_stats(p_args -> 'stats')
    when 'journey' then public.journey_complete(p_args ->> 'match_id', (p_args ->> 'stars')::int, p_args ->> 'route')
  end;
  j := r::jsonb;

  -- "not now" answers don't consume the nonce
  if (j ->> 'ok') = 'false' and (j ->> 'error') in ('slow', 'auth')
     or coalesce((j -> 'reward' ->> 'throttled')::boolean, false) then
    delete from public.client_nonces where nonce = p_nonce;
    return r;
  end if;

  update public.client_nonces set result = j where nonce = p_nonce;
  -- housekeeping: a nonce only needs to outlive the queue on the device (10 days)
  delete from public.client_nonces where user_id = uid and created_at < now() - interval '30 days';
  return r;
end; $fn$;
revoke execute on function public.submit_once(uuid, text, jsonb) from public, anon;
grant execute on function public.submit_once(uuid, text, jsonb) to authenticated;
