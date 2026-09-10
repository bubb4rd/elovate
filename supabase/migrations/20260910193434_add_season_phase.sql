-- Season phase / Ranked Series off-season state machine (Phase 1) — hotfix.
--
-- Context: the S5 Ranked Series window opened 2026-09-10 07:00Z. Until now the
-- platform had no notion of a season ending, so a dead regular season was still
-- presented as "live".
--
-- D1: the freeze pauses WRITES ONLY. The poll-wz-cutoff cron stops inserting
--     snapshots / pinging Discord, but pages keep reading CODMunity so the final
--     Top 250 roster still renders (snapshots has no per-player rows).
-- D2: S5 Ranked Series is open-ended for now — ranked_series_ends_at stays NULL
--     (resolution rule 4). Exit to preseason later via a manual phase_override
--     (see supabase/scripts/set_season_phase.sql).
--
-- Future (NOT built here): Ranked Series = the last ~4-6 days of the CoD content
-- season (distinct from the ranked season). ranked_series_starts_at can later be
-- auto-derived as content_season_end - ~5 days. Phase 1 only adds the columns and
-- the manual/scheduled override.

create type public.season_phase as enum ('regular_season', 'ranked_series', 'preseason');

alter table public.seasons
  add column ranked_series_starts_at timestamptz,
  add column ranked_series_ends_at   timestamptz,
  add column phase_override          public.season_phase,
  add column phase_override_note     text,
  add column phase_updated_at        timestamptz;

comment on column public.seasons.phase_override is
  'Manual pin. When non-null it wins over the schedule in active_season_phase().';

-- Backfill: S5 regular season ended today; the Ranked Series started the same
-- instant. ranked_series_ends_at stays NULL (open-ended, resolution rule 4).
update public.seasons
set ends_at = timestamptz '2026-09-10 07:00:00+00',
    ranked_series_starts_at = timestamptz '2026-09-10 07:00:00+00',
    phase_updated_at = now()
where id = 's5';

-- Resolution order — implemented EXACTLY as specced. Operates on the single
-- is_active = true season.
--   1. phase_override is not null            -> that phase, is_override = true, phase_ends_at = null
--   2. ends_at is null or now() < ends_at    -> regular_season, phase_ends_at = ends_at
--   3. ranked_series_ends_at set and now() < it        -> ranked_series, phase_ends_at = ranked_series_ends_at
--   4. ranked_series_starts_at set, ranked_series_ends_at null, now() >= start -> ranked_series, phase_ends_at = null
--   5. else                                  -> preseason, phase_ends_at = null
create or replace function public.active_season_phase()
returns table (
  season_id text,
  season_name text,
  phase public.season_phase,
  is_override boolean,
  phase_started_at timestamptz,
  phase_ends_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.id,
    s.name,
    case
      when s.phase_override is not null then s.phase_override
      when s.ends_at is null or now() < s.ends_at then 'regular_season'::public.season_phase
      when s.ranked_series_ends_at is not null and now() < s.ranked_series_ends_at then 'ranked_series'::public.season_phase
      when s.ranked_series_starts_at is not null and s.ranked_series_ends_at is null and now() >= s.ranked_series_starts_at then 'ranked_series'::public.season_phase
      else 'preseason'::public.season_phase
    end as phase,
    (s.phase_override is not null) as is_override,
    case
      when s.phase_override is not null then s.phase_updated_at
      when s.ends_at is null or now() < s.ends_at then s.starts_at
      when s.ranked_series_ends_at is not null and now() < s.ranked_series_ends_at then s.ranked_series_starts_at
      when s.ranked_series_starts_at is not null and s.ranked_series_ends_at is null and now() >= s.ranked_series_starts_at then s.ranked_series_starts_at
      else coalesce(s.ranked_series_ends_at, s.ends_at)
    end as phase_started_at,
    case
      when s.phase_override is not null then null::timestamptz
      when s.ends_at is null or now() < s.ends_at then s.ends_at
      when s.ranked_series_ends_at is not null and now() < s.ranked_series_ends_at then s.ranked_series_ends_at
      else null::timestamptz
    end as phase_ends_at
  from public.seasons s
  where s.is_active = true
  limit 1;
$$;

-- seasons has a public read policy; the RPC only reads it.
grant execute on function public.active_season_phase() to anon, authenticated, service_role;

-- seasons stays read-only for the public roles. The base migration already did
-- `revoke all ... from anon, authenticated`; this is a defensive, explicit repeat
-- now that the table carries operator-controlled phase columns.
revoke update on public.seasons from anon, authenticated;

notify pgrst, 'reload schema';
