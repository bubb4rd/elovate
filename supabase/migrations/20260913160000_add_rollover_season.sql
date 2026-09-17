-- Season rollover — atomic is_active handoff between seasons.
--
-- Context: today the is_active handoff between seasons is done by hand via raw
-- insert/update statements (see the base migration's s4/s5 seeding). Nothing
-- enforces that exactly one season is is_active, and a half-done handoff would
-- be visible to concurrent readers of active_season_phase(). This function
-- fixes both: it's the single call path for a rollover, wraps deactivate-old +
-- activate-new in one implicit transaction, and refuses rather than guesses
-- when the starting state isn't exactly one active season.
--
-- Called by elovate-bot's /season rollover command (a separate Discord bot
-- project) and available as a SQL-only fallback in
-- supabase/scripts/set_season_phase.sql.
--
-- Not enforced here (explicitly out of scope): a DB-level uniqueness
-- constraint on is_active (e.g. a unique partial index) that would stop any
-- write path, not just this function, from creating two actives. Worth doing
-- as a follow-up hardening step.

create or replace function public.rollover_season(
  p_new_season_id text,
  p_new_season_name text,
  p_starts_at timestamptz,
  p_ends_at timestamptz default null
)
returns table (
  old_season_id text,
  old_season_name text,
  new_season_id text,
  new_season_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_count int;
  v_old_id text;
  v_old_name text;
begin
  -- Safety check 1: exactly one active season must exist, or we refuse rather
  -- than guess which one to deactivate.
  select count(*) into v_active_count from public.seasons where is_active = true;
  if v_active_count <> 1 then
    raise exception 'rollover_season: expected exactly one active season, found %', v_active_count;
  end if;

  select id, name into v_old_id, v_old_name from public.seasons where is_active = true;

  -- Safety check 2: refuse a no-op / self-rollover.
  if v_old_id = p_new_season_id then
    raise exception 'rollover_season: new_season_id (%) matches the currently active season', p_new_season_id;
  end if;

  if exists (select 1 from public.seasons where id = p_new_season_id) then
    -- Safety check 3: the new id already exists and is already active — two
    -- actives would otherwise result, or this masks a duplicate command retry.
    if exists (select 1 from public.seasons where id = p_new_season_id and is_active = true) then
      raise exception 'rollover_season: season % already exists and is already active', p_new_season_id;
    end if;
    -- Exists but inactive (e.g. rolling back to a prior season id): reactivate
    -- it and reset to a clean slate rather than inserting a duplicate row.
    update public.seasons
    set is_active = true,
        name = p_new_season_name,
        starts_at = p_starts_at,
        ends_at = p_ends_at,
        ranked_series_starts_at = null,
        ranked_series_ends_at = null,
        phase_override = null,
        phase_override_note = null,
        phase_updated_at = now()
    where id = p_new_season_id;
  else
    insert into public.seasons (
      id, name, starts_at, ends_at, is_active,
      ranked_series_starts_at, ranked_series_ends_at,
      phase_override, phase_override_note, phase_updated_at
    ) values (
      p_new_season_id, p_new_season_name, p_starts_at, p_ends_at, true,
      null, null, null, null, now()
    );
  end if;

  update public.seasons
  set is_active = false,
      phase_updated_at = now()
  where id = v_old_id;

  return query select v_old_id, v_old_name, p_new_season_id, p_new_season_name;
end;
$$;

-- Privileged write path — only ever called via elovate-bot's service-role
-- Supabase client, never directly by anon/authenticated.
grant execute on function public.rollover_season(text, text, timestamptz, timestamptz) to service_role;

notify pgrst, 'reload schema';
