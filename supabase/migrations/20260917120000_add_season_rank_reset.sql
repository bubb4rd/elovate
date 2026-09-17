-- Season rank reset — one-time SR-tier transform applied when a season's
-- ranked reset happens in-game. See WZ-18 (issue #109) for the full rule
-- and rationale. Mirrors rollover_season()'s shape: a reusable, audited RPC
-- rather than a one-off manual UPDATE, so a future elovate-bot
-- `/season rank-reset` command can call the same function.
--
-- Rule (SCHEDULE_S06 breakpoints, hardcoded — this transform is tied to a
-- specific real-world reset event, not meant to be schedule-agnostic):
--   >= 7500 SR (Crimson/Iridescent/Top 250) -> 5400 (Diamond I)
--   >= 5400 SR (Diamond I/II/III)           -> 3600 (Platinum I)
--   >= 3600 SR (Platinum)                   -> 2100 (Gold I)
--   >= 2100 SR (Gold)                       -> 900  (Silver I)
--   >= 900  SR (Silver)                     -> 0    (Bronze I)
--   <  900  SR (Bronze)                     -> 0    (floors at its own Tier I)
--
-- Only `profiles.current_sr` is touched — never `climb_sessions`/
-- `climb_matches`. A season reset is a discontinuity, not a retroactive
-- correction to real past climb data.

alter table public.profiles
  add column if not exists sr_reset_season_id text;

comment on column public.profiles.sr_reset_season_id is
  'Season id whose rank reset this profile''s current_sr was auto-adjusted for. Read by the profile page to show a one-time "adjusted for the reset" note until the player logs a real match in that season.';

create or replace function public.apply_season_rank_reset(p_season_id text)
returns table (profiles_touched int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_touched int;
begin
  -- Refuse a duplicate run for the same season — the audit log is the guard,
  -- not a flag on profiles (a profile untouched by the first run, because it
  -- was already at floor, should still be eligible if ever re-run by mistake
  -- for a *different* season).
  if exists (
    select 1 from public.season_admin_actions
    where action = 'rank_reset' and payload->>'season_id' = p_season_id
  ) then
    raise exception 'apply_season_rank_reset: already run for season %', p_season_id;
  end if;

  with computed as (
    select
      id,
      current_sr as old_sr,
      case
        when current_sr >= 7500 then 5400
        when current_sr >= 5400 then 3600
        when current_sr >= 3600 then 2100
        when current_sr >= 2100 then 900
        when current_sr >= 900  then 0
        else 0
      end as new_sr
    from public.profiles
  ),
  updated as (
    update public.profiles p
    set current_sr = c.new_sr,
        sr_reset_season_id = p_season_id
    from computed c
    where p.id = c.id and c.new_sr < c.old_sr
    returning 1
  )
  select count(*) into v_touched from updated;

  insert into public.season_admin_actions (action, actor_discord_id, actor_discord_username, payload)
  values (
    'rank_reset',
    'manual-sql',
    null,
    jsonb_build_object('season_id', p_season_id, 'profiles_touched', v_touched)
  );

  return query select v_touched;
end;
$$;

-- Privileged write path — only ever run manually via the service-role
-- connection (see supabase/scripts/apply_season_rank_reset.sql), same as
-- rollover_season(). Not exposed to anon/authenticated.
grant execute on function public.apply_season_rank_reset(text) to service_role;

notify pgrst, 'reload schema';
