-- Ops runbook: inspect and control the active season phase (Phase 1).
--
-- Service-role / SQL editor only — there is no admin auth UI. Each numbered block
-- is standalone; run the one you need. Schema + resolution rules live in
-- supabase/migrations/20260910193434_add_season_phase.sql.
--
-- Propagation: home (`/`) and `/wz` set `export const revalidate = 900`, so a
-- phase change can take up to ~15 min to show publicly. The 60s cache on
-- getActiveSeasonPhase() is separate and shorter.
--
-- One-statement rollback to "nothing happened, season is live":
--   update public.seasons set phase_override = 'regular_season' where id = 's5';

-- 1. PREVIEW — what the site resolves right now, and the raw inputs.
select * from public.active_season_phase();

select id, name, starts_at, ends_at,
       ranked_series_starts_at, ranked_series_ends_at,
       phase_override, phase_override_note, phase_updated_at
from public.seasons
where is_active;

-- 2. PIN a phase (manual override — wins over the schedule until cleared).
--    phase = 'regular_season' | 'ranked_series' | 'preseason'
update public.seasons
set phase_override = 'preseason',
    phase_override_note = 'S5 content season ended; manually moved to preseason',
    phase_updated_at = now()
where is_active;

-- 3. SCHEDULE a Ranked Series window (no override; the schedule resolves it).
--    Leave ranked_series_ends_at NULL for an open-ended series (resolution rule 4).
update public.seasons
set ends_at = timestamptz '2026-09-10 07:00:00+00',
    ranked_series_starts_at = timestamptz '2026-09-10 07:00:00+00',
    ranked_series_ends_at = null,
    phase_updated_at = now()
where is_active;

-- 4. CLEAR the override (fall back to the schedule).
update public.seasons
set phase_override = null,
    phase_override_note = null,
    phase_updated_at = now()
where is_active;

-- 5. CONFIRM.
select * from public.active_season_phase();
